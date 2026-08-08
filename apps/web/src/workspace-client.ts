import type {
  GitSnapshotListResponse,
  GitSnapshotResource,
  GitSnapshotResponse,
  MissionListResponse,
  MissionResource,
  MissionResponse,
  ProjectListResponse,
  ProjectResource,
  ProjectResponse,
  RepositoryResource,
  RepositoryResponse
} from "@intelliloop/contracts";
import { isApiErrorResponse } from "@intelliloop/contracts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isPage(value: unknown): boolean {
  return (
    isRecord(value) &&
    isPositiveInteger(value.limit) &&
    value.limit <= 100 &&
    (value.nextCursor === null || isUuid(value.nextCursor))
  );
}

export function isProjectResource(value: unknown): value is ProjectResource {
  if (!isRecord(value)) return false;
  const archived = value.archivedAtUtc;
  return (
    isUuid(value.projectId) &&
    typeof value.name === "string" &&
    value.name.length >= 1 &&
    value.name.length <= 120 &&
    (value.status === "ACTIVE" || value.status === "ARCHIVED") &&
    isPositiveInteger(value.revision) &&
    isTimestamp(value.createdAtUtc) &&
    isTimestamp(value.updatedAtUtc) &&
    (archived === undefined || isTimestamp(archived))
  );
}

export function isMissionResource(value: unknown): value is MissionResource {
  if (!isRecord(value)) return false;
  const archived = value.archivedAtUtc;
  return (
    isUuid(value.missionId) &&
    isUuid(value.projectId) &&
    typeof value.title === "string" &&
    value.title.length >= 1 &&
    value.title.length <= 160 &&
    (value.status === "CURRENT" || value.status === "ARCHIVED") &&
    isPositiveInteger(value.revision) &&
    isTimestamp(value.createdAtUtc) &&
    isTimestamp(value.updatedAtUtc) &&
    (archived === undefined || isTimestamp(archived))
  );
}

export function isRepositoryResource(
  value: unknown
): value is RepositoryResource {
  return (
    isRecord(value) &&
    isUuid(value.registrationId) &&
    isUuid(value.projectId) &&
    value.repositoryKind === "LOCAL_GIT" &&
    value.accessMode === "READ_ONLY" &&
    isTimestamp(value.registeredAtUtc)
  );
}

export function isGitSnapshotResource(
  value: unknown
): value is GitSnapshotResource {
  if (!isRecord(value)) return false;
  const common =
    isUuid(value.snapshotId) &&
    isUuid(value.projectId) &&
    isUuid(value.missionId) &&
    isUuid(value.registrationId) &&
    isTimestamp(value.capturedAtUtc) &&
    typeof value.dirty === "boolean" &&
    isNonnegativeInteger(value.indexChangeCount) &&
    isNonnegativeInteger(value.worktreeChangeCount) &&
    isNonnegativeInteger(value.untrackedFileCount) &&
    isNonnegativeInteger(value.changedFileCount) &&
    typeof value.changedFilesDigest === "string" &&
    DIGEST_PATTERN.test(value.changedFilesDigest);
  if (!common) return false;

  if (value.headState === "ATTACHED") {
    return (
      typeof value.branchName === "string" &&
      value.branchName.length >= 1 &&
      typeof value.headCommit === "string" &&
      COMMIT_PATTERN.test(value.headCommit)
    );
  }
  if (value.headState === "DETACHED") {
    return (
      value.branchName === undefined &&
      typeof value.headCommit === "string" &&
      COMMIT_PATTERN.test(value.headCommit)
    );
  }
  return (
    value.headState === "UNBORN" &&
    typeof value.branchName === "string" &&
    value.branchName.length >= 1 &&
    value.headCommit === undefined
  );
}

function isProjectResponse(value: unknown): value is ProjectResponse {
  return isRecord(value) && value.apiVersion === "v1" && isProjectResource(value.project);
}

function isProjectListResponse(value: unknown): value is ProjectListResponse {
  return (
    isRecord(value) &&
    value.apiVersion === "v1" &&
    Array.isArray(value.projects) &&
    value.projects.every(isProjectResource) &&
    isPage(value.page)
  );
}

function isMissionResponse(value: unknown): value is MissionResponse {
  return isRecord(value) && value.apiVersion === "v1" && isMissionResource(value.mission);
}

function isMissionListResponse(value: unknown): value is MissionListResponse {
  return (
    isRecord(value) &&
    value.apiVersion === "v1" &&
    isUuid(value.projectId) &&
    Array.isArray(value.missions) &&
    value.missions.every(isMissionResource) &&
    isPage(value.page)
  );
}

function isRepositoryResponse(value: unknown): value is RepositoryResponse {
  return (
    isRecord(value) &&
    value.apiVersion === "v1" &&
    isRepositoryResource(value.repository)
  );
}

function isGitSnapshotResponse(value: unknown): value is GitSnapshotResponse {
  return (
    isRecord(value) &&
    value.apiVersion === "v1" &&
    isGitSnapshotResource(value.snapshot)
  );
}

function isGitSnapshotListResponse(
  value: unknown
): value is GitSnapshotListResponse {
  return (
    isRecord(value) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    Array.isArray(value.snapshots) &&
    value.snapshots.every(isGitSnapshotResource) &&
    isPage(value.page)
  );
}

export type WorkspaceClientErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTEGRITY_ERROR"
  | "UNAVAILABLE"
  | "INVALID_RESPONSE";

const ERROR_MESSAGES: Readonly<Record<WorkspaceClientErrorCode, string>> =
  Object.freeze({
    INVALID_REQUEST: "The local API could not accept that request.",
    NOT_FOUND: "The requested local workspace record was not found.",
    CONFLICT: "The request conflicts with the current workspace state.",
    INTEGRITY_ERROR:
      "Stored local history failed integrity verification. No partial result is shown.",
    UNAVAILABLE: "The local API is unavailable. Start it and try again.",
    INVALID_RESPONSE: "The local API returned an invalid workspace response."
  });

export class WorkspaceClientError extends Error {
  readonly code: WorkspaceClientErrorCode;
  readonly status: number | undefined;

  constructor(code: WorkspaceClientErrorCode, status?: number) {
    super(ERROR_MESSAGES[code]);
    this.name = "WorkspaceClientError";
    this.code = code;
    this.status = status;
  }
}

function errorForStatus(status: number): WorkspaceClientError {
  if (status === 400 || status === 413) {
    return new WorkspaceClientError("INVALID_REQUEST", status);
  }
  if (status === 404) return new WorkspaceClientError("NOT_FOUND", status);
  if (status === 409) return new WorkspaceClientError("CONFLICT", status);
  return new WorkspaceClientError("UNAVAILABLE", status);
}

function errorForResponse(
  status: number,
  value: unknown
): WorkspaceClientError {
  if (isApiErrorResponse(value)) {
    if (value.error.code === "INTEGRITY_ERROR") {
      return new WorkspaceClientError("INTEGRITY_ERROR", status);
    }
    if (value.error.code === "INVALID_REQUEST") {
      return new WorkspaceClientError("INVALID_REQUEST", status);
    }
    if (value.error.code === "NOT_FOUND") {
      return new WorkspaceClientError("NOT_FOUND", status);
    }
    if (value.error.code === "CONFLICT") {
      return new WorkspaceClientError("CONFLICT", status);
    }
  }
  return errorForStatus(status);
}

export async function requestJson<T>(
  fetcher: typeof fetch,
  path: string,
  validate: (value: unknown) => value is T,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" })
      }
    });
  } catch {
    throw new WorkspaceClientError("UNAVAILABLE");
  }
  if (!response.ok) {
    let errorValue: unknown;
    try {
      errorValue = await response.json();
    } catch {
      errorValue = undefined;
    }
    throw errorForResponse(response.status, errorValue);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new WorkspaceClientError("INVALID_RESPONSE", response.status);
  }
  if (!validate(value)) {
    throw new WorkspaceClientError("INVALID_RESPONSE", response.status);
  }
  return value;
}

function withSignal(signal?: AbortSignal): RequestInit {
  return signal === undefined ? {} : { signal };
}

export async function listProjects(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ProjectListResponse> {
  return requestJson(
    fetcher,
    "/api/v1/projects?limit=100",
    isProjectListResponse,
    withSignal(signal)
  );
}

export async function createProject(
  name: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<ProjectResponse> {
  return requestJson(fetcher, "/api/v1/projects", isProjectResponse, {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export async function getProject(
  projectId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ProjectResponse> {
  return requestJson(
    fetcher,
    `/api/v1/projects/${encodeURIComponent(projectId)}`,
    isProjectResponse,
    withSignal(signal)
  );
}

export async function listMissions(
  projectId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<MissionListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/projects/${encodeURIComponent(projectId)}/missions?limit=100`,
    isMissionListResponse,
    withSignal(signal)
  );
}

export async function createMission(
  projectId: string,
  title: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<MissionResponse> {
  return requestJson(
    fetcher,
    `/api/v1/projects/${encodeURIComponent(projectId)}/missions`,
    isMissionResponse,
    { method: "POST", body: JSON.stringify({ title }) }
  );
}

export async function getMission(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<MissionResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}`,
    isMissionResponse,
    withSignal(signal)
  );
}

export async function getRepository(
  projectId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<RepositoryResponse> {
  return requestJson(
    fetcher,
    `/api/v1/projects/${encodeURIComponent(projectId)}/repository`,
    isRepositoryResponse,
    withSignal(signal)
  );
}

export async function registerRepository(
  projectId: string,
  rootPath: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<RepositoryResponse> {
  return requestJson(
    fetcher,
    `/api/v1/projects/${encodeURIComponent(projectId)}/repository`,
    isRepositoryResponse,
    { method: "PUT", body: JSON.stringify({ rootPath }) }
  );
}

export async function listGitSnapshots(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<GitSnapshotListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/git-snapshots?limit=100`,
    isGitSnapshotListResponse,
    withSignal(signal)
  );
}

export async function captureGitSnapshot(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<GitSnapshotResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/git-snapshots`,
    isGitSnapshotResponse,
    { method: "POST" }
  );
}
