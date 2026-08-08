import type { GitSnapshot } from "@intelliloop/domain";

import { PROJECT_API_VERSION, type PageMetadata } from "./project-api.js";

export interface GitSnapshotResource {
  readonly snapshotId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly registrationId: string;
  readonly capturedAtUtc: string;
  readonly headState: GitSnapshot["headState"];
  readonly branchName?: string;
  readonly headCommit?: string;
  readonly dirty: boolean;
  readonly indexChangeCount: number;
  readonly worktreeChangeCount: number;
  readonly untrackedFileCount: number;
  readonly changedFileCount: number;
  readonly changedFilesDigest: string;
}

export interface GitSnapshotResponse {
  readonly apiVersion: typeof PROJECT_API_VERSION;
  readonly snapshot: GitSnapshotResource;
}

export interface GitSnapshotListResponse {
  readonly apiVersion: typeof PROJECT_API_VERSION;
  readonly missionId: string;
  readonly snapshots: readonly GitSnapshotResource[];
  readonly page: PageMetadata;
}

export function toGitSnapshotResource(
  snapshot: GitSnapshot
): GitSnapshotResource {
  const resource = {
    snapshotId: snapshot.snapshotId,
    projectId: snapshot.projectId,
    missionId: snapshot.missionId,
    registrationId: snapshot.registrationId,
    capturedAtUtc: snapshot.capturedAtUtc,
    headState: snapshot.headState,
    dirty: snapshot.dirty,
    indexChangeCount: snapshot.indexChangeCount,
    worktreeChangeCount: snapshot.worktreeChangeCount,
    untrackedFileCount: snapshot.untrackedFileCount,
    changedFileCount: snapshot.changedFileCount,
    changedFilesDigest: snapshot.changedFilesDigest
  };
  return {
    ...resource,
    ...(snapshot.branchName === undefined
      ? {}
      : { branchName: snapshot.branchName }),
    ...(snapshot.headCommit === undefined
      ? {}
      : { headCommit: snapshot.headCommit })
  };
}

export function createGitSnapshotResponse(
  snapshot: GitSnapshot
): GitSnapshotResponse {
  return {
    apiVersion: PROJECT_API_VERSION,
    snapshot: toGitSnapshotResource(snapshot)
  };
}
