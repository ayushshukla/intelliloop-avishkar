import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { TextDecoder } from "node:util";

import {
  assertGitSnapshotInvariant,
  createClock,
  createGitSnapshot,
  createStableIdGenerator,
  parseSha256Digest,
  parseStableId,
  parseUtcTimestamp,
  type GitChangeEntry,
  type GitHeadInput,
  type GitSnapshot,
  type GitSnapshotId,
  type MissionId,
  type ProjectDomainDependencies
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";
import {
  FixedGitCommandRunner,
  GitCommandError,
  type GitCommandResult,
  type GitReadCommandRunner
} from "./git-command-runner.js";
import {
  RepositoryRegistrationError,
  type RegisteredRepository,
  type RepositoryRegistrationService
} from "./repository-registration.js";

export const GIT_SNAPSHOT_ERROR_CODES = [
  "GIT_MISSION_NOT_FOUND",
  "GIT_MISSION_ARCHIVED",
  "GIT_REPOSITORY_NOT_REGISTERED",
  "GIT_EXECUTABLE_UNAVAILABLE",
  "GIT_CAPTURE_TIMEOUT",
  "GIT_OUTPUT_LIMIT",
  "GIT_CAPTURE_FAILED",
  "GIT_STATUS_INVALID",
  "GIT_REPOSITORY_CHANGED",
  "GIT_SNAPSHOT_NOT_FOUND",
  "GIT_STORAGE_SCHEMA_INVALID",
  "GIT_STORAGE_FAILED"
] as const;

export type GitSnapshotErrorCode =
  (typeof GIT_SNAPSHOT_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<GitSnapshotErrorCode, string>> =
  Object.freeze({
    GIT_MISSION_NOT_FOUND: "Git snapshot mission was not found.",
    GIT_MISSION_ARCHIVED: "Archived missions cannot capture Git snapshots.",
    GIT_REPOSITORY_NOT_REGISTERED: "A repository is not registered for this mission.",
    GIT_EXECUTABLE_UNAVAILABLE: "Git snapshot capture is unavailable.",
    GIT_CAPTURE_TIMEOUT: "Git snapshot capture exceeded its time limit.",
    GIT_OUTPUT_LIMIT: "Git snapshot capture exceeded its output limit.",
    GIT_CAPTURE_FAILED: "Git snapshot capture could not be completed.",
    GIT_STATUS_INVALID: "Git returned an unsupported snapshot status.",
    GIT_REPOSITORY_CHANGED: "Repository identity changed during snapshot capture.",
    GIT_SNAPSHOT_NOT_FOUND: "Git snapshot was not found.",
    GIT_STORAGE_SCHEMA_INVALID: "Git snapshot storage schema is invalid.",
    GIT_STORAGE_FAILED: "Git snapshot storage could not complete the operation."
  });

export class GitSnapshotError extends Error {
  readonly code: GitSnapshotErrorCode;

  constructor(code: GitSnapshotErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "GitSnapshotError";
    this.code = code;
  }
}

export interface GitSnapshotPage {
  readonly items: readonly GitSnapshot[];
  readonly nextCursor: string | null;
}

export interface GitSnapshotServiceDependencies
  extends ProjectDomainDependencies {
  readonly runner: GitReadCommandRunner;
}

interface MissionRow {
  readonly project_id: string;
  readonly mission_status: string;
  readonly project_status: string;
}

interface GitSnapshotRow {
  readonly snapshot_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly registration_id: string;
  readonly captured_at_utc: string;
  readonly head_state: string;
  readonly branch_name: string | null;
  readonly head_commit: string | null;
  readonly is_dirty: number;
  readonly index_change_count: number;
  readonly worktree_change_count: number;
  readonly untracked_file_count: number;
  readonly changed_file_count: number;
  readonly changed_files_digest: string;
}

interface IdentityEvidence {
  readonly symbolic: GitCommandResult;
  readonly commit: GitCommandResult;
}

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const STATUS_PATTERN = /^[ MADRCUT?]$/u;

function storageFailure(error: unknown): GitSnapshotError {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB" ||
    code.startsWith("SQLITE_CONSTRAINT")
  ) {
    return new GitSnapshotError("GIT_STORAGE_SCHEMA_INVALID");
  }
  return new GitSnapshotError("GIT_STORAGE_FAILED");
}

function mapCommandError(error: GitCommandError): GitSnapshotError {
  switch (error.code) {
    case "GIT_EXECUTABLE_UNAVAILABLE":
      return new GitSnapshotError("GIT_EXECUTABLE_UNAVAILABLE");
    case "GIT_COMMAND_TIMEOUT":
      return new GitSnapshotError("GIT_CAPTURE_TIMEOUT");
    case "GIT_COMMAND_OUTPUT_LIMIT":
      return new GitSnapshotError("GIT_OUTPUT_LIMIT");
    case "GIT_COMMAND_FAILED":
      return new GitSnapshotError("GIT_CAPTURE_FAILED");
  }
}

function decode(buffer: Buffer): string {
  try {
    return UTF8_DECODER.decode(buffer);
  } catch {
    throw new GitSnapshotError("GIT_STATUS_INVALID");
  }
}

function decodeLine(result: GitCommandResult): string {
  const raw = decode(result.stdout);
  const value = raw.endsWith("\r\n")
    ? raw.slice(0, -2)
    : raw.endsWith("\n")
      ? raw.slice(0, -1)
      : raw;
  if (
    value.length < 1 ||
    value.length > 255 ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new GitSnapshotError("GIT_STATUS_INVALID");
  }
  return value;
}

function isExpectedNonzero(exitCode: number): boolean {
  return exitCode === 1 || exitCode === 128;
}

function classifyHead(evidence: IdentityEvidence): GitHeadInput {
  if (evidence.symbolic.exitCode === 0 && evidence.commit.exitCode === 0) {
    const branchName = decodeLine(evidence.symbolic);
    const headCommit = decodeLine(evidence.commit).toLowerCase();
    if (!COMMIT_PATTERN.test(headCommit)) {
      throw new GitSnapshotError("GIT_STATUS_INVALID");
    }
    return { state: "ATTACHED", branchName, headCommit };
  }
  if (
    evidence.symbolic.exitCode === 0 &&
    isExpectedNonzero(evidence.commit.exitCode)
  ) {
    return { state: "UNBORN", branchName: decodeLine(evidence.symbolic) };
  }
  if (
    evidence.symbolic.exitCode === 1 &&
    evidence.commit.exitCode === 0
  ) {
    const headCommit = decodeLine(evidence.commit).toLowerCase();
    if (!COMMIT_PATTERN.test(headCommit)) {
      throw new GitSnapshotError("GIT_STATUS_INVALID");
    }
    return { state: "DETACHED", headCommit };
  }
  throw new GitSnapshotError("GIT_CAPTURE_FAILED");
}

function safeRelativePath(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 4096 &&
    !isAbsolute(value) &&
    !value.split(/[\\/]+/u).some((segment) => segment === "..")
  );
}

export function parsePorcelainStatus(output: Buffer): readonly GitChangeEntry[] {
  if (output.length === 0) return Object.freeze([]);
  const fields = decode(output).split("\0");
  if (fields.pop() !== "") {
    throw new GitSnapshotError("GIT_STATUS_INVALID");
  }

  const changes: GitChangeEntry[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (field === undefined || field.length < 4 || field[2] !== " ") {
      throw new GitSnapshotError("GIT_STATUS_INVALID");
    }
    const indexStatus = field[0] ?? "";
    const worktreeStatus = field[1] ?? "";
    const path = field.slice(3);
    if (
      !STATUS_PATTERN.test(indexStatus) ||
      !STATUS_PATTERN.test(worktreeStatus) ||
      !safeRelativePath(path)
    ) {
      throw new GitSnapshotError("GIT_STATUS_INVALID");
    }

    if (/[RC]/u.test(indexStatus) || /[RC]/u.test(worktreeStatus)) {
      index += 1;
      const originalPath = fields[index];
      if (originalPath === undefined || !safeRelativePath(originalPath)) {
        throw new GitSnapshotError("GIT_STATUS_INVALID");
      }
      changes.push({ indexStatus, worktreeStatus, path, originalPath });
    } else {
      changes.push({ indexStatus, worktreeStatus, path });
    }
  }
  if (changes.length > 100_000) {
    throw new GitSnapshotError("GIT_OUTPUT_LIMIT");
  }
  return Object.freeze(changes);
}

function sameEvidence(left: IdentityEvidence, right: IdentityEvidence): boolean {
  return (
    left.symbolic.exitCode === right.symbolic.exitCode &&
    left.commit.exitCode === right.commit.exitCode &&
    left.symbolic.stdout.equals(right.symbolic.stdout) &&
    left.commit.stdout.equals(right.commit.stdout)
  );
}

function hydrateSnapshot(row: GitSnapshotRow): GitSnapshot {
  try {
    if (
      !Number.isSafeInteger(row.is_dirty) ||
      (row.is_dirty !== 0 && row.is_dirty !== 1) ||
      !["ATTACHED", "DETACHED", "UNBORN"].includes(row.head_state)
    ) {
      throw new TypeError("Invalid Git snapshot row.");
    }
    const base = {
      entityType: "GitSnapshot" as const,
      snapshotId: parseStableId<"GIT_SNAPSHOT">(row.snapshot_id),
      projectId: parseStableId<"PROJECT">(row.project_id),
      missionId: parseStableId<"MISSION">(row.mission_id),
      registrationId:
        parseStableId<"REPOSITORY_REGISTRATION">(row.registration_id),
      capturedAtUtc: parseUtcTimestamp(row.captured_at_utc),
      headState: row.head_state as GitSnapshot["headState"],
      dirty: row.is_dirty === 1,
      indexChangeCount: row.index_change_count,
      worktreeChangeCount: row.worktree_change_count,
      untrackedFileCount: row.untracked_file_count,
      changedFileCount: row.changed_file_count,
      changedFilesDigest: parseSha256Digest(row.changed_files_digest)
    };
    const snapshot = Object.freeze({
      ...base,
      ...(row.branch_name === null ? {} : { branchName: row.branch_name }),
      ...(row.head_commit === null ? {} : { headCommit: row.head_commit })
    });
    assertGitSnapshotInvariant(snapshot);
    return snapshot;
  } catch {
    throw new GitSnapshotError("GIT_STORAGE_SCHEMA_INVALID");
  }
}

const SNAPSHOT_SELECT = `
SELECT snapshot_id, project_id, mission_id, registration_id,
       captured_at_utc, head_state, branch_name, head_commit,
       is_dirty, index_change_count, worktree_change_count,
       untracked_file_count, changed_file_count, changed_files_digest
FROM git_snapshots
`.trim();

export class GitSnapshotService {
  readonly #connection: SqliteConnection;
  readonly #registrations: RepositoryRegistrationService;
  readonly #dependencies: GitSnapshotServiceDependencies;

  constructor(
    connection: SqliteConnection,
    registrations: RepositoryRegistrationService,
    dependencies: GitSnapshotServiceDependencies = {
      ids: createStableIdGenerator(() => randomUUID()),
      clock: createClock(() => new Date()),
      runner: new FixedGitCommandRunner()
    }
  ) {
    this.#connection = connection;
    this.#registrations = registrations;
    this.#dependencies = dependencies;
  }

  #mission(missionId: MissionId): MissionRow | undefined {
    return this.#connection
      .prepare(
        `SELECT m.project_id, m.lifecycle_status AS mission_status,
                p.lifecycle_status AS project_status
         FROM missions m
         JOIN projects p ON p.project_id = m.project_id
         WHERE m.mission_id = ?`
      )
      .get(missionId) as MissionRow | undefined;
  }

  #activeMission(missionId: MissionId): MissionRow {
    const mission = this.#mission(missionId);
    if (mission === undefined) {
      throw new GitSnapshotError("GIT_MISSION_NOT_FOUND");
    }
    if (mission.mission_status !== "CURRENT" || mission.project_status !== "ACTIVE") {
      throw new GitSnapshotError("GIT_MISSION_ARCHIVED");
    }
    return mission;
  }

  async #identity(repositoryRoot: string): Promise<IdentityEvidence> {
    try {
      const symbolic = await this.#dependencies.runner.run(
        "SYMBOLIC_HEAD",
        repositoryRoot
      );
      const commit = await this.#dependencies.runner.run(
        "HEAD_COMMIT",
        repositoryRoot
      );
      return { symbolic, commit };
    } catch (error) {
      if (error instanceof GitCommandError) throw mapCommandError(error);
      if (error instanceof GitSnapshotError) throw error;
      throw new GitSnapshotError("GIT_CAPTURE_FAILED");
    }
  }

  async capture(missionId: MissionId): Promise<GitSnapshot> {
    let mission: MissionRow;
    try {
      mission = this.#activeMission(missionId);
    } catch (error) {
      if (error instanceof GitSnapshotError) throw error;
      throw storageFailure(error);
    }
    const projectId = parseStableId<"PROJECT">(mission.project_id);

    let registration: RegisteredRepository;
    let repositoryRoot: string;
    try {
      registration = this.#registrations.get(projectId);
      repositoryRoot = this.#registrations.resolveRootForRead(projectId);
    } catch (error) {
      if (
        error instanceof RepositoryRegistrationError &&
        error.code === "REPOSITORY_NOT_REGISTERED"
      ) {
        throw new GitSnapshotError("GIT_REPOSITORY_NOT_REGISTERED");
      }
      throw error;
    }

    const before = await this.#identity(repositoryRoot);
    const head = classifyHead(before);
    let status: GitCommandResult;
    try {
      status = await this.#dependencies.runner.run("STATUS", repositoryRoot);
    } catch (error) {
      if (error instanceof GitCommandError) throw mapCommandError(error);
      throw new GitSnapshotError("GIT_CAPTURE_FAILED");
    }
    if (status.exitCode !== 0) {
      throw new GitSnapshotError("GIT_CAPTURE_FAILED");
    }
    const changes = parsePorcelainStatus(status.stdout);
    const after = await this.#identity(repositoryRoot);
    if (!sameEvidence(before, after)) {
      throw new GitSnapshotError("GIT_REPOSITORY_CHANGED");
    }

    let snapshot: GitSnapshot;
    try {
      snapshot = await createGitSnapshot(
        {
          projectId,
          missionId,
          registrationId: registration.registrationId,
          head,
          changes
        },
        this.#dependencies
      );
    } catch {
      throw new GitSnapshotError("GIT_STATUS_INVALID");
    }

    try {
      return this.#connection.transaction(() => {
        const currentMission = this.#activeMission(missionId);
        const currentRegistration = this.#connection
          .prepare(
            `SELECT registration_id FROM repositories
             WHERE project_id = ? AND registration_id = ?`
          )
          .get(projectId, registration.registrationId);
        if (
          currentMission.project_id !== projectId ||
          currentRegistration === undefined
        ) {
          throw new GitSnapshotError("GIT_REPOSITORY_CHANGED");
        }
        this.#connection
          .prepare(
            `INSERT INTO git_snapshots (
              snapshot_id, project_id, mission_id, registration_id,
              captured_at_utc, head_state, branch_name, head_commit,
              is_dirty, index_change_count, worktree_change_count,
              untracked_file_count, changed_file_count, changed_files_digest
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            snapshot.snapshotId,
            snapshot.projectId,
            snapshot.missionId,
            snapshot.registrationId,
            snapshot.capturedAtUtc,
            snapshot.headState,
            snapshot.branchName ?? null,
            snapshot.headCommit ?? null,
            snapshot.dirty ? 1 : 0,
            snapshot.indexChangeCount,
            snapshot.worktreeChangeCount,
            snapshot.untrackedFileCount,
            snapshot.changedFileCount,
            snapshot.changedFilesDigest
          );
        return snapshot;
      }).immediate();
    } catch (error) {
      if (error instanceof GitSnapshotError) throw error;
      throw storageFailure(error);
    }
  }

  get(snapshotId: GitSnapshotId): GitSnapshot {
    try {
      const row = this.#connection
        .prepare(`${SNAPSHOT_SELECT} WHERE snapshot_id = ?`)
        .get(snapshotId) as GitSnapshotRow | undefined;
      if (row === undefined) {
        throw new GitSnapshotError("GIT_SNAPSHOT_NOT_FOUND");
      }
      return hydrateSnapshot(row);
    } catch (error) {
      if (error instanceof GitSnapshotError) throw error;
      throw storageFailure(error);
    }
  }

  list(
    missionId: MissionId,
    limit: number,
    cursor?: GitSnapshotId
  ): GitSnapshotPage {
    try {
      if (this.#mission(missionId) === undefined) {
        throw new GitSnapshotError("GIT_MISSION_NOT_FOUND");
      }
      const rows = this.#connection
        .prepare(
          `${SNAPSHOT_SELECT}
           WHERE mission_id = ? AND (? IS NULL OR snapshot_id > ?)
           ORDER BY snapshot_id
           LIMIT ?`
        )
        .all(missionId, cursor ?? null, cursor ?? null, limit + 1) as GitSnapshotRow[];
      const hasNext = rows.length > limit;
      const snapshots = rows.slice(0, limit).map(hydrateSnapshot);
      return {
        items: Object.freeze(snapshots),
        nextCursor:
          hasNext && snapshots.length > 0
            ? (snapshots[snapshots.length - 1]?.snapshotId ?? null)
            : null
      };
    } catch (error) {
      if (error instanceof GitSnapshotError) throw error;
      throw storageFailure(error);
    }
  }
}
