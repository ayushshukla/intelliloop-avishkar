import { randomUUID } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  parseUtcTimestamp,
  type Clock,
  type ProjectId,
  type StableId,
  type StableIdGenerator,
  type UtcTimestamp
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";

export type RepositoryRegistrationId = StableId<"REPOSITORY_REGISTRATION">;

export interface RegisteredRepository {
  readonly registrationId: RepositoryRegistrationId;
  readonly projectId: ProjectId;
  readonly canonicalRoot: string;
  readonly accessMode: "READ_ONLY";
  readonly registeredAtUtc: UtcTimestamp;
}

export interface RepositoryRegistrationDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

export const REPOSITORY_REGISTRATION_ERROR_CODES = [
  "REPOSITORY_PROJECT_NOT_FOUND",
  "REPOSITORY_NOT_REGISTERED",
  "REPOSITORY_PROJECT_ARCHIVED",
  "REPOSITORY_PATH_INVALID",
  "REPOSITORY_PATH_NOT_FOUND",
  "REPOSITORY_NOT_GIT",
  "REPOSITORY_SYMLINK_REJECTED",
  "REPOSITORY_DATABASE_CONFLICT",
  "REPOSITORY_ALREADY_REGISTERED",
  "REPOSITORY_STORAGE_SCHEMA_INVALID",
  "REPOSITORY_STORAGE_FAILED"
] as const;

export type RepositoryRegistrationErrorCode =
  (typeof REPOSITORY_REGISTRATION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<RepositoryRegistrationErrorCode, string>> =
  Object.freeze({
    REPOSITORY_PROJECT_NOT_FOUND: "Repository project was not found.",
    REPOSITORY_NOT_REGISTERED: "Repository is not registered.",
    REPOSITORY_PROJECT_ARCHIVED: "Archived projects cannot register repositories.",
    REPOSITORY_PATH_INVALID: "Repository path is invalid.",
    REPOSITORY_PATH_NOT_FOUND: "Repository path was not found.",
    REPOSITORY_NOT_GIT: "Repository path is not a supported Git root.",
    REPOSITORY_SYMLINK_REJECTED: "Repository path contains an unsafe symbolic link.",
    REPOSITORY_DATABASE_CONFLICT: "Database must remain outside the repository.",
    REPOSITORY_ALREADY_REGISTERED: "Repository binding already exists.",
    REPOSITORY_STORAGE_SCHEMA_INVALID: "Repository storage schema is invalid.",
    REPOSITORY_STORAGE_FAILED: "Repository storage could not complete the operation."
  });

export class RepositoryRegistrationError extends Error {
  readonly code: RepositoryRegistrationErrorCode;

  constructor(code: RepositoryRegistrationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "RepositoryRegistrationError";
    this.code = code;
  }
}

interface RepositoryRow {
  readonly registration_id: string;
  readonly project_id: string;
  readonly canonical_root: string;
  readonly access_mode: string;
  readonly registered_at_utc: string;
}

function errorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "";
}

function pathFailure(error: unknown): RepositoryRegistrationError {
  const code = errorCode(error);
  if (code === "ENOENT" || code === "ENOTDIR") {
    return new RepositoryRegistrationError("REPOSITORY_PATH_NOT_FOUND");
  }
  if (code === "ELOOP") {
    return new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
  }
  return new RepositoryRegistrationError("REPOSITORY_PATH_INVALID");
}

function storageFailure(error: unknown): RepositoryRegistrationError {
  const code = errorCode(error);
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new RepositoryRegistrationError("REPOSITORY_ALREADY_REGISTERED");
  }
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB"
  ) {
    return new RepositoryRegistrationError("REPOSITORY_STORAGE_SCHEMA_INVALID");
  }
  return new RepositoryRegistrationError("REPOSITORY_STORAGE_FAILED");
}

function comparisonPath(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function samePath(left: string, right: string): boolean {
  return comparisonPath(left) === comparisonPath(right);
}

function containsPath(root: string, candidate: string): boolean {
  if (samePath(root, candidate)) return true;
  const relation = relative(root, candidate);
  return relation !== "" && !relation.startsWith("..") && !isAbsolute(relation);
}

function hasTraversal(value: string): boolean {
  return value.split(/[\\/]+/u).some((segment) => segment === "..");
}

function assertDirectGitDirectory(gitRoot: string, name: string): void {
  const candidate = join(gitRoot, name);
  const stat = lstatSync(candidate);
  if (stat.isSymbolicLink()) {
    throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
  }
  if (!stat.isDirectory()) {
    throw new RepositoryRegistrationError("REPOSITORY_NOT_GIT");
  }
  const canonical = realpathSync.native(candidate);
  if (!samePath(canonical, candidate) || !containsPath(gitRoot, canonical)) {
    throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
  }
}

function assertGitHead(gitRoot: string): void {
  const headPath = join(gitRoot, "HEAD");
  const stat = lstatSync(headPath);
  if (stat.isSymbolicLink()) {
    throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
  }
  if (!stat.isFile() || stat.size < 1 || stat.size > 512) {
    throw new RepositoryRegistrationError("REPOSITORY_NOT_GIT");
  }
  const canonical = realpathSync.native(headPath);
  if (!samePath(canonical, headPath) || !containsPath(gitRoot, canonical)) {
    throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
  }
  const value = readFileSync(headPath, "utf8");
  if (
    !/^(?:ref: refs\/[A-Za-z0-9._\/-]+|[0-9a-fA-F]{40}|[0-9a-fA-F]{64})\r?\n?$/u.test(
      value
    )
  ) {
    throw new RepositoryRegistrationError("REPOSITORY_NOT_GIT");
  }
}

export function canonicalRepositoryRoot(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 4096 ||
    value !== value.trim() ||
    value.includes("\0") ||
    !isAbsolute(value) ||
    hasTraversal(value)
  ) {
    throw new RepositoryRegistrationError("REPOSITORY_PATH_INVALID");
  }

  const normalized = resolve(value);
  try {
    const rootStat = lstatSync(normalized);
    if (rootStat.isSymbolicLink()) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }
    if (!rootStat.isDirectory()) {
      throw new RepositoryRegistrationError("REPOSITORY_PATH_INVALID");
    }
    const canonical = realpathSync.native(normalized);
    if (!samePath(canonical, normalized)) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }

    const gitMarker = join(canonical, ".git");
    let gitStat;
    try {
      gitStat = lstatSync(gitMarker);
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        throw new RepositoryRegistrationError("REPOSITORY_NOT_GIT");
      }
      throw error;
    }
    if (gitStat.isSymbolicLink()) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }
    if (!gitStat.isDirectory()) {
      throw new RepositoryRegistrationError("REPOSITORY_NOT_GIT");
    }
    const canonicalGitMarker = realpathSync.native(gitMarker);
    if (
      !samePath(canonicalGitMarker, gitMarker) ||
      !containsPath(canonical, canonicalGitMarker)
    ) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }
    try {
      assertGitHead(canonicalGitMarker);
      assertDirectGitDirectory(canonicalGitMarker, "objects");
      assertDirectGitDirectory(canonicalGitMarker, "refs");
    } catch (error) {
      if (error instanceof RepositoryRegistrationError) throw error;
      if (errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR") {
        throw new RepositoryRegistrationError("REPOSITORY_NOT_GIT");
      }
      throw error;
    }
    return canonical;
  } catch (error) {
    if (error instanceof RepositoryRegistrationError) throw error;
    throw pathFailure(error);
  }
}

function hydrateRepository(row: RepositoryRow): RegisteredRepository {
  try {
    if (row.access_mode !== "READ_ONLY" || !isAbsolute(row.canonical_root)) {
      throw new TypeError("Invalid repository row.");
    }
    return Object.freeze({
      registrationId: parseStableId<"REPOSITORY_REGISTRATION">(
        row.registration_id
      ),
      projectId: parseStableId<"PROJECT">(row.project_id),
      canonicalRoot: row.canonical_root,
      accessMode: "READ_ONLY" as const,
      registeredAtUtc: parseUtcTimestamp(row.registered_at_utc)
    });
  } catch {
    throw new RepositoryRegistrationError("REPOSITORY_STORAGE_SCHEMA_INVALID");
  }
}

export class RepositoryRegistrationService {
  readonly #connection: SqliteConnection;
  readonly #databaseFilePath: string;
  readonly #dependencies: RepositoryRegistrationDependencies;

  constructor(
    connection: SqliteConnection,
    databaseFilePath: string,
    dependencies: RepositoryRegistrationDependencies = {
      ids: createStableIdGenerator(() => randomUUID()),
      clock: createClock(() => new Date())
    }
  ) {
    this.#connection = connection;
    this.#databaseFilePath = realpathSync.native(resolve(databaseFilePath));
    this.#dependencies = dependencies;
  }

  register(projectId: ProjectId, rootPath: string): RegisteredRepository {
    const canonicalRoot = canonicalRepositoryRoot(rootPath);
    if (containsPath(canonicalRoot, this.#databaseFilePath)) {
      throw new RepositoryRegistrationError("REPOSITORY_DATABASE_CONFLICT");
    }
    try {
      return this.#connection.transaction(() => {
        const project = this.#connection
          .prepare("SELECT lifecycle_status FROM projects WHERE project_id = ?")
          .get(projectId) as { lifecycle_status: string } | undefined;
        if (project === undefined) {
          throw new RepositoryRegistrationError("REPOSITORY_PROJECT_NOT_FOUND");
        }
        if (project.lifecycle_status !== "ACTIVE") {
          throw new RepositoryRegistrationError("REPOSITORY_PROJECT_ARCHIVED");
        }
        const existing = this.#connection
          .prepare(
            "SELECT 1 FROM repositories WHERE project_id = ? OR canonical_root = ?"
          )
          .get(projectId, canonicalRoot);
        if (existing !== undefined) {
          throw new RepositoryRegistrationError("REPOSITORY_ALREADY_REGISTERED");
        }
        const registration: RegisteredRepository = Object.freeze({
          registrationId:
            this.#dependencies.ids<"REPOSITORY_REGISTRATION">(),
          projectId,
          canonicalRoot,
          accessMode: "READ_ONLY",
          registeredAtUtc: this.#dependencies.clock.now()
        });
        this.#connection
          .prepare(
            `INSERT INTO repositories (
              registration_id, project_id, canonical_root, access_mode, registered_at_utc
            ) VALUES (?, ?, ?, ?, ?)`
          )
          .run(
            registration.registrationId,
            registration.projectId,
            registration.canonicalRoot,
            registration.accessMode,
            registration.registeredAtUtc
          );
        return registration;
      }).immediate();
    } catch (error) {
      if (error instanceof RepositoryRegistrationError) throw error;
      throw storageFailure(error);
    }
  }

  get(projectId: ProjectId): RegisteredRepository {
    try {
      const row = this.#connection
        .prepare(
          `SELECT registration_id, project_id, canonical_root,
                  access_mode, registered_at_utc
           FROM repositories WHERE project_id = ?`
        )
        .get(projectId) as RepositoryRow | undefined;
      if (row === undefined) {
        const project = this.#connection
          .prepare("SELECT 1 FROM projects WHERE project_id = ?")
          .get(projectId);
        throw new RepositoryRegistrationError(
          project === undefined
            ? "REPOSITORY_PROJECT_NOT_FOUND"
            : "REPOSITORY_NOT_REGISTERED"
        );
      }
      return hydrateRepository(row);
    } catch (error) {
      if (error instanceof RepositoryRegistrationError) throw error;
      throw storageFailure(error);
    }
  }

  resolveRootForRead(projectId: ProjectId): string {
    const registration = this.get(projectId);
    const currentCanonicalRoot = canonicalRepositoryRoot(
      registration.canonicalRoot
    );
    if (!samePath(currentCanonicalRoot, registration.canonicalRoot)) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }
    if (containsPath(currentCanonicalRoot, this.#databaseFilePath)) {
      throw new RepositoryRegistrationError("REPOSITORY_DATABASE_CONFLICT");
    }
    return currentCanonicalRoot;
  }
}
