import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { createClock } from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import {
  DatabaseLifecycleError,
  migrationChecksum,
  openFoundationDatabase
} from "../src/database/database-lifecycle.js";
import type { SqlMigration } from "../src/database/migration.js";
import { MIGRATION_001_SCHEMA_HISTORY } from "../src/database/migrations/001-schema-history.js";
import { FOUNDATION_MIGRATIONS } from "../src/database/migrations/index.js";

const temporaryDirectories: string[] = [];

function temporaryDatabase(label: string): {
  readonly directory: string;
  readonly filePath: string;
} {
  const directory = mkdtempSync(join(tmpdir(), `intelliloop-${label}-`));
  temporaryDirectories.push(directory);
  return { directory, filePath: join(directory, "intelliloop.sqlite3") };
}

function expectLifecycleError(
  operation: () => unknown,
  code: DatabaseLifecycleError["code"]
): DatabaseLifecycleError {
  try {
    operation();
    throw new Error("Expected database lifecycle failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(DatabaseLifecycleError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof DatabaseLifecycleError)) throw error;
    return error;
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("SQLite lifecycle and migration baseline", () => {
  it("bootstraps an empty database through all transactional migrations", () => {
    const { filePath } = temporaryDatabase("bootstrap");
    const database = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });

    expect(existsSync(filePath)).toBe(true);
    expect(database.schemaVersion).toBe(14);
    expect(database.connection.pragma("user_version", { simple: true })).toBe(14);
    expect(database.connection.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(database.connection.pragma("journal_mode", { simple: true })).toBe(
      "wal"
    );
    expect(
      database.connection
        .prepare("SELECT version, name, checksum, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual(
      FOUNDATION_MIGRATIONS.map((migration) => ({
        version: migration.version,
        name: migration.name,
        checksum: migrationChecksum(migration.sql),
        applied_at_utc: "2026-08-04T07:00:00.000Z"
      }))
    );
    expect(
      database.connection
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('projects', 'project_revisions', 'missions', 'mission_revisions', 'repositories', 'git_snapshots', 'evidence_sources', 'timeline_events', 'claims', 'claim_supersessions', 'runtime_observations', 'twin_revisions', 'code_map_revisions', 'reconciliation_impact_revisions', 'validation_results', 'readiness_reviews', 'release_assessments', 'release_passports', 'demo_workspaces', 'demo_reset_authorizations') ORDER BY name"
        )
        .all()
    ).toEqual([
      { name: "claim_supersessions" },
      { name: "claims" },
      { name: "code_map_revisions" },
      { name: "demo_reset_authorizations" },
      { name: "demo_workspaces" },
      { name: "evidence_sources" },
      { name: "git_snapshots" },
      { name: "mission_revisions" },
      { name: "missions" },
      { name: "project_revisions" },
      { name: "projects" },
      { name: "readiness_reviews" },
      { name: "reconciliation_impact_revisions" },
      { name: "release_assessments" },
      { name: "release_passports" },
      { name: "repositories" },
      { name: "runtime_observations" },
      { name: "timeline_events" },
      { name: "twin_revisions" },
      { name: "validation_results" }
    ]);

    database.close();
  });

  it("reopens without reapplying or rewriting migration history", () => {
    const { filePath } = temporaryDatabase("restart");
    const first = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    first.close();

    const restarted = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T08:00:00.000Z"))
    });
    const row = restarted.connection
      .prepare(
        "SELECT COUNT(*) AS count, MIN(applied_at_utc) AS applied_at_utc FROM schema_migrations"
      )
      .get();

    expect(restarted.schemaVersion).toBe(14);
    expect(row).toEqual({
      count: 14,
      applied_at_utc: "2026-08-04T07:00:00.000Z"
    });
    restarted.close();
  });

  it("upgrades a retained version-001 database through version 014", () => {
    const { filePath } = temporaryDatabase("upgrade");
    openFoundationDatabase({
      filePath,
      migrations: [MIGRATION_001_SCHEMA_HISTORY],
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual([
      { version: 1, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 2, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 3, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 4, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 5, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 6, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 7, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 8, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-002 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-002");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 2),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual([
      { version: 1, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 2, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 3, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 4, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 5, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 6, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 7, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 8, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-003 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-003");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 3),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual([
      { version: 1, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 2, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 3, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 4, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 5, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 6, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 7, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 8, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-004 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-004");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 4),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual([
      { version: 1, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 2, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 3, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 4, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 5, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 6, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 7, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 8, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-005 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-005");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 5),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual([
      { version: 1, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 2, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 3, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 4, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 5, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 6, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 7, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 8, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-006 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-006");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 6),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations ORDER BY version")
        .all()
    ).toEqual([
      { version: 1, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 2, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 3, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 4, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 5, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 6, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 7, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 8, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-008 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-008");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 8),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare("SELECT version, applied_at_utc FROM schema_migrations WHERE version >= 8 ORDER BY version")
        .all()
    ).toEqual([
      { version: 8, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 9, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("upgrades a retained version-009 database without rewriting history", () => {
    const { filePath } = temporaryDatabase("upgrade-009");
    openFoundationDatabase({
      filePath,
      migrations: FOUNDATION_MIGRATIONS.slice(0, 9),
      clock: createClock(() => new Date("2026-08-04T06:00:00.000Z"))
    }).close();

    const upgraded = openFoundationDatabase({
      filePath,
      clock: createClock(() => new Date("2026-08-04T07:00:00.000Z"))
    });
    expect(upgraded.schemaVersion).toBe(14);
    expect(
      upgraded.connection
        .prepare(
          "SELECT version, applied_at_utc FROM schema_migrations WHERE version >= 9 ORDER BY version"
        )
        .all()
    ).toEqual([
      { version: 9, applied_at_utc: "2026-08-04T06:00:00.000Z" },
      { version: 10, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 11, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 12, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 13, applied_at_utc: "2026-08-04T07:00:00.000Z" },
      { version: 14, applied_at_utc: "2026-08-04T07:00:00.000Z" }
    ]);
    upgraded.close();
  });

  it("rolls back a failed forward migration and preserves version 014", () => {
    const { filePath } = temporaryDatabase("rollback");
    openFoundationDatabase({ filePath }).close();

    const failingMigration: SqlMigration = {
      version: 15,
      name: "forced_failure_probe",
      sql: `
CREATE TABLE rollback_probe (id INTEGER PRIMARY KEY) STRICT;
INSERT INTO table_that_does_not_exist (id) VALUES (1);
`.trim()
    };

    expectLifecycleError(
      () =>
        openFoundationDatabase({
          filePath,
          migrations: [...FOUNDATION_MIGRATIONS, failingMigration]
        }),
      "DATABASE_MIGRATION_FAILED"
    );

    const inspector = new Database(filePath, { readonly: true });
    expect(inspector.pragma("user_version", { simple: true })).toBe(14);
    expect(
      inspector
        .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
        .get()
    ).toEqual({ count: 14 });
    expect(
      inspector
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_schema WHERE name = 'rollback_probe'"
        )
        .get()
    ).toEqual({ count: 0 });
    inspector.close();
  });

  it("refuses a database with an unknown newer user version", () => {
    const { filePath } = temporaryDatabase("newer");
    openFoundationDatabase({ filePath }).close();
    const newer = new Database(filePath);
    newer.pragma("user_version = 15");
    newer.close();

    expectLifecycleError(
      () => openFoundationDatabase({ filePath }),
      "DATABASE_SCHEMA_NEWER"
    );
  });

  it("refuses unversioned data and altered migration history", () => {
    const unversioned = temporaryDatabase("unversioned");
    const unrelated = new Database(unversioned.filePath);
    unrelated.exec("CREATE TABLE unrelated (id INTEGER PRIMARY KEY) STRICT;");
    unrelated.close();
    expectLifecycleError(
      () => openFoundationDatabase({ filePath: unversioned.filePath }),
      "DATABASE_SCHEMA_INVALID"
    );

    const altered = temporaryDatabase("altered");
    openFoundationDatabase({ filePath: altered.filePath }).close();
    const changed = new Database(altered.filePath);
    changed
      .prepare("UPDATE schema_migrations SET checksum = ? WHERE version = 1")
      .run(`sha256:${"0".repeat(64)}`);
    changed.close();
    expectLifecycleError(
      () => openFoundationDatabase({ filePath: altered.filePath }),
      "DATABASE_SCHEMA_INVALID"
    );
  });

  it("rejects a relative database path without echoing it", () => {
    const value = "INTELLILOOP_SECRET_SENTINEL.sqlite3";
    const error = expectLifecycleError(
      () => openFoundationDatabase({ filePath: value }),
      "DATABASE_PATH_INVALID"
    );
    expect(String(error)).not.toContain(value);
  });

  it(
    "serializes concurrent empty-database startup into one migration record",
    async () => {
      const { directory, filePath } = temporaryDatabase("concurrent");
      const barrierPath = join(directory, "start.barrier");
      const fixturePath = fileURLToPath(
        new URL("./fixtures/open-database-process.ts", import.meta.url)
      );

      const completions = Array.from({ length: 4 }, () =>
        new Promise<{ status: number | null; output: string }>((resolve) => {
          const child = spawn(
            process.execPath,
            ["--import", "tsx", fixturePath, filePath, barrierPath],
            { stdio: ["ignore", "pipe", "pipe"] }
          );
          let output = "";
          child.stdout.on("data", (chunk: Buffer) => {
            output += chunk.toString("utf8");
          });
          child.stderr.on("data", (chunk: Buffer) => {
            output += chunk.toString("utf8");
          });
          child.once("close", (status) => resolve({ status, output }));
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 1_000));
      writeFileSync(barrierPath, "start", { encoding: "utf8" });
      const results = await Promise.all(completions);

      expect(results).toEqual(
        Array.from({ length: 4 }, () => ({ status: 0, output: "14" }))
      );
      const database = openFoundationDatabase({ filePath });
      expect(
        database.connection
          .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
          .get()
      ).toEqual({ count: 14 });
      database.close();
    },
    30_000
  );
});
