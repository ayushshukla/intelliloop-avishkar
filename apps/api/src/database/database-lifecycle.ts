import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

import Database from "better-sqlite3";

import {
  createClock,
  parseUtcTimestamp,
  type Clock
} from "@intelliloop/domain";

import type { SqlMigration } from "./migration.js";
import { FOUNDATION_MIGRATIONS } from "./migrations/index.js";

export type SqliteConnection = Database.Database;

export type DatabaseLifecycleErrorCode =
  | "DATABASE_PATH_INVALID"
  | "DATABASE_OPEN_FAILED"
  | "DATABASE_MIGRATION_FAILED"
  | "DATABASE_SCHEMA_INVALID"
  | "DATABASE_SCHEMA_NEWER";

const ERROR_MESSAGES: Readonly<Record<DatabaseLifecycleErrorCode, string>> = {
  DATABASE_PATH_INVALID: "Database path configuration is invalid.",
  DATABASE_OPEN_FAILED: "Database could not be opened safely.",
  DATABASE_MIGRATION_FAILED: "Database migration failed and was rolled back.",
  DATABASE_SCHEMA_INVALID: "Database schema history is invalid.",
  DATABASE_SCHEMA_NEWER:
    "Database schema is newer than this application supports."
};

interface MigrationRow {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly applied_at_utc: string;
}

export class DatabaseLifecycleError extends Error {
  readonly code: DatabaseLifecycleErrorCode;

  constructor(code: DatabaseLifecycleErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "DatabaseLifecycleError";
    this.code = code;
  }
}

export interface OpenFoundationDatabaseOptions {
  readonly filePath: string;
  readonly migrations?: readonly SqlMigration[];
  readonly clock?: Clock;
}

export interface FoundationDatabase {
  readonly connection: SqliteConnection;
  readonly schemaVersion: number;
  close(): void;
}

export function migrationChecksum(sql: string): string {
  return `sha256:${createHash("sha256").update(sql, "utf8").digest("hex")}`;
}

function assertMigrationPlan(
  migrations: readonly SqlMigration[]
): readonly SqlMigration[] {
  if (migrations.length === 0) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
  }

  for (let index = 0; index < migrations.length; index += 1) {
    const migration = migrations[index];
    if (
      migration === undefined ||
      migration.version !== index + 1 ||
      !/^[a-z][a-z0-9_]{0,127}$/.test(migration.name) ||
      migration.sql.trim().length === 0
    ) {
      throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
    }
  }
  return migrations;
}

function readUserVersion(database: Database.Database): number {
  const version = database.pragma("user_version", { simple: true });
  if (
    typeof version !== "number" ||
    !Number.isSafeInteger(version) ||
    version < 0
  ) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
  }
  return version;
}

function schemaHistoryExists(database: Database.Database): boolean {
  const row = database
    .prepare(
      "SELECT 1 AS present FROM sqlite_schema WHERE type = 'table' AND name = 'schema_migrations'"
    )
    .get() as { readonly present: number } | undefined;
  return row?.present === 1;
}

function assertEmptyUnversionedDatabase(database: Database.Database): void {
  const row = database
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'"
    )
    .get() as { readonly count: number };
  if (row.count !== 0) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
  }
}

function readHistory(database: Database.Database): readonly MigrationRow[] {
  return database
    .prepare(
      "SELECT version, name, checksum, applied_at_utc FROM schema_migrations ORDER BY version"
    )
    .all() as MigrationRow[];
}

function validateCurrentSchema(
  database: Database.Database,
  migrations: readonly SqlMigration[],
  userVersion: number
): void {
  const latestVersion = migrations.length;
  if (userVersion > latestVersion) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_NEWER");
  }

  if (userVersion === 0) {
    assertEmptyUnversionedDatabase(database);
    return;
  }

  if (!schemaHistoryExists(database)) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
  }

  const rows = readHistory(database);
  if (rows.some((row) => row.version > latestVersion)) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_NEWER");
  }
  if (rows.length !== userVersion) {
    throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const migration = migrations[index];
    if (
      row === undefined ||
      migration === undefined ||
      row.version !== migration.version ||
      row.name !== migration.name ||
      row.checksum !== migrationChecksum(migration.sql)
    ) {
      throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
    }
    try {
      parseUtcTimestamp(row.applied_at_utc);
    } catch {
      throw new DatabaseLifecycleError("DATABASE_SCHEMA_INVALID");
    }
  }
}

function applyPendingMigrations(
  database: Database.Database,
  migrations: readonly SqlMigration[],
  clock: Clock
): number {
  database.exec("BEGIN IMMEDIATE");
  try {
    const currentVersion = readUserVersion(database);
    validateCurrentSchema(database, migrations, currentVersion);

    for (const migration of migrations.slice(currentVersion)) {
      database.exec(migration.sql);
      database
        .prepare(
          "INSERT INTO schema_migrations (version, name, checksum, applied_at_utc) VALUES (?, ?, ?, ?)"
        )
        .run(
          migration.version,
          migration.name,
          migrationChecksum(migration.sql),
          clock.now()
        );
      database.pragma(`user_version = ${migration.version}`);
    }

    const finalVersion = readUserVersion(database);
    validateCurrentSchema(database, migrations, finalVersion);
    database.exec("COMMIT");
    return finalVersion;
  } catch (error) {
    if (database.inTransaction) {
      try {
        database.exec("ROLLBACK");
      } catch {
        // Preserve the original safe lifecycle failure.
      }
    }
    throw error;
  }
}

function configureConnection(database: Database.Database): void {
  database.pragma("busy_timeout = 5000");
  database.pragma("foreign_keys = ON");
  const retrySignal = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      database.pragma("journal_mode = WAL");
      break;
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "";
      if (
        (code !== "SQLITE_BUSY" && code !== "SQLITE_LOCKED") ||
        Date.now() >= deadline
      ) {
        throw error;
      }
      Atomics.wait(retrySignal, 0, 0, 25);
    }
  }
  database.pragma("synchronous = FULL");
}

export function openFoundationDatabase(
  options: OpenFoundationDatabaseOptions
): FoundationDatabase {
  if (!isAbsolute(options.filePath)) {
    throw new DatabaseLifecycleError("DATABASE_PATH_INVALID");
  }

  const migrations = assertMigrationPlan(
    options.migrations ?? FOUNDATION_MIGRATIONS
  );
  const clock = options.clock ?? createClock(() => new Date());

  let database: Database.Database;
  try {
    mkdirSync(dirname(options.filePath), { recursive: true });
    database = new Database(options.filePath, { timeout: 5_000 });
  } catch {
    throw new DatabaseLifecycleError("DATABASE_OPEN_FAILED");
  }

  try {
    configureConnection(database);
    const schemaVersion = applyPendingMigrations(database, migrations, clock);
    let open = true;
    return {
      connection: database,
      schemaVersion,
      close: () => {
        if (!open) return;
        open = false;
        database.close();
      }
    };
  } catch (error) {
    if (database.open) {
      database.close();
    }
    if (error instanceof DatabaseLifecycleError) {
      throw error;
    }
    throw new DatabaseLifecycleError("DATABASE_MIGRATION_FAILED");
  }
}
