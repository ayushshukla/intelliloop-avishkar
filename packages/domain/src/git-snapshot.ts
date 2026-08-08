import {
  canonicalJsonDigest,
  isSha256Digest,
  type Sha256Digest
} from "./digest.js";
import type { MissionId, ProjectDomainDependencies, ProjectId } from "./project.js";
import { parseStableId, type StableId } from "./stable-id.js";
import { parseUtcTimestamp, type UtcTimestamp } from "./time.js";

export type GitSnapshotId = StableId<"GIT_SNAPSHOT">;
export type RepositoryRegistrationId = StableId<"REPOSITORY_REGISTRATION">;
export type GitHeadState = "ATTACHED" | "DETACHED" | "UNBORN";

export interface GitChangeEntry {
  readonly indexStatus: string;
  readonly worktreeStatus: string;
  readonly path: string;
  readonly originalPath?: string;
}

export interface GitSnapshot {
  readonly entityType: "GitSnapshot";
  readonly snapshotId: GitSnapshotId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly registrationId: RepositoryRegistrationId;
  readonly capturedAtUtc: UtcTimestamp;
  readonly headState: GitHeadState;
  readonly branchName?: string;
  readonly headCommit?: string;
  readonly dirty: boolean;
  readonly indexChangeCount: number;
  readonly worktreeChangeCount: number;
  readonly untrackedFileCount: number;
  readonly changedFileCount: number;
  readonly changedFilesDigest: Sha256Digest;
}

export type GitHeadInput =
  | { readonly state: "ATTACHED"; readonly branchName: string; readonly headCommit: string }
  | { readonly state: "DETACHED"; readonly headCommit: string }
  | { readonly state: "UNBORN"; readonly branchName: string };

export interface CreateGitSnapshotInput {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly registrationId: RepositoryRegistrationId;
  readonly head: GitHeadInput;
  readonly changes: readonly GitChangeEntry[];
}

const STATUS_PATTERN = /^[ MADRCUT?]$/u;
const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

function fail(): never {
  throw new TypeError("A valid Git snapshot input is required.");
}

function validBranch(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 255 &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function validPath(value: string): boolean {
  return value.length >= 1 && value.length <= 4096 && !value.includes("\0");
}

function validCount(value: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

export function assertGitSnapshotInvariant(snapshot: GitSnapshot): void {
  if (
    snapshot.entityType !== "GitSnapshot" ||
    parseStableId<"GIT_SNAPSHOT">(snapshot.snapshotId) !== snapshot.snapshotId ||
    parseStableId<"PROJECT">(snapshot.projectId) !== snapshot.projectId ||
    parseStableId<"MISSION">(snapshot.missionId) !== snapshot.missionId ||
    parseStableId<"REPOSITORY_REGISTRATION">(snapshot.registrationId) !==
      snapshot.registrationId ||
    parseUtcTimestamp(snapshot.capturedAtUtc) !== snapshot.capturedAtUtc ||
    !isSha256Digest(snapshot.changedFilesDigest) ||
    !validCount(snapshot.changedFileCount, 100_000) ||
    !validCount(snapshot.indexChangeCount, snapshot.changedFileCount) ||
    !validCount(snapshot.worktreeChangeCount, snapshot.changedFileCount) ||
    !validCount(snapshot.untrackedFileCount, snapshot.changedFileCount) ||
    snapshot.dirty !== (snapshot.changedFileCount > 0)
  ) {
    fail();
  }

  if (
    (snapshot.headState === "ATTACHED" &&
      (!validBranch(snapshot.branchName ?? "") ||
        !COMMIT_PATTERN.test(snapshot.headCommit ?? ""))) ||
    (snapshot.headState === "DETACHED" &&
      (snapshot.branchName !== undefined ||
        !COMMIT_PATTERN.test(snapshot.headCommit ?? ""))) ||
    (snapshot.headState === "UNBORN" &&
      (!validBranch(snapshot.branchName ?? "") ||
        snapshot.headCommit !== undefined)) ||
    !["ATTACHED", "DETACHED", "UNBORN"].includes(snapshot.headState)
  ) {
    fail();
  }
}

function normalizeChanges(
  changes: readonly GitChangeEntry[]
): readonly GitChangeEntry[] {
  if (!Array.isArray(changes) || changes.length > 100_000) fail();
  const normalized = changes.map((change) => {
    if (
      typeof change !== "object" ||
      change === null ||
      !STATUS_PATTERN.test(change.indexStatus) ||
      !STATUS_PATTERN.test(change.worktreeStatus) ||
      !validPath(change.path) ||
      (change.originalPath !== undefined && !validPath(change.originalPath))
    ) {
      return fail();
    }
    return Object.freeze(
      change.originalPath === undefined
        ? {
            indexStatus: change.indexStatus,
            worktreeStatus: change.worktreeStatus,
            path: change.path
          }
        : {
            indexStatus: change.indexStatus,
            worktreeStatus: change.worktreeStatus,
            path: change.path,
            originalPath: change.originalPath
          }
    );
  });
  normalized.sort((left, right) => {
    const leftKey = `${left.path}\0${left.originalPath ?? ""}\0${left.indexStatus}${left.worktreeStatus}`;
    const rightKey = `${right.path}\0${right.originalPath ?? ""}\0${right.indexStatus}${right.worktreeStatus}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return Object.freeze(normalized);
}

export async function createGitSnapshot(
  input: CreateGitSnapshotInput,
  dependencies: ProjectDomainDependencies
): Promise<GitSnapshot> {
  const changes = normalizeChanges(input.changes);
  const head = input.head;
  if (
    (head.state === "ATTACHED" &&
      (!validBranch(head.branchName) || !COMMIT_PATTERN.test(head.headCommit))) ||
    (head.state === "DETACHED" && !COMMIT_PATTERN.test(head.headCommit)) ||
    (head.state === "UNBORN" && !validBranch(head.branchName))
  ) {
    fail();
  }

  const indexChangeCount = changes.filter(
    ({ indexStatus }) => indexStatus !== " " && indexStatus !== "?"
  ).length;
  const worktreeChangeCount = changes.filter(
    ({ worktreeStatus }) => worktreeStatus !== " " && worktreeStatus !== "?"
  ).length;
  const untrackedFileCount = changes.filter(
    ({ indexStatus, worktreeStatus }) =>
      indexStatus === "?" && worktreeStatus === "?"
  ).length;
  const base = {
    entityType: "GitSnapshot" as const,
    snapshotId: dependencies.ids<"GIT_SNAPSHOT">(),
    projectId: input.projectId,
    missionId: input.missionId,
    registrationId: input.registrationId,
    capturedAtUtc: dependencies.clock.now(),
    headState: head.state,
    dirty: changes.length > 0,
    indexChangeCount,
    worktreeChangeCount,
    untrackedFileCount,
    changedFileCount: changes.length,
    changedFilesDigest: await canonicalJsonDigest(changes)
  };

  if (head.state === "ATTACHED") {
    const snapshot = Object.freeze({
      ...base,
      branchName: head.branchName,
      headCommit: head.headCommit
    });
    assertGitSnapshotInvariant(snapshot);
    return snapshot;
  }
  if (head.state === "DETACHED") {
    const snapshot = Object.freeze({ ...base, headCommit: head.headCommit });
    assertGitSnapshotInvariant(snapshot);
    return snapshot;
  }
  const snapshot = Object.freeze({ ...base, branchName: head.branchName });
  assertGitSnapshotInvariant(snapshot);
  return snapshot;
}
