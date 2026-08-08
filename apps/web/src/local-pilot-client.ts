import type {
  LocalProjectContextResponse,
  LocalProjectPilotCapabilityResponse,
  LocalProjectPreflightResponse,
  LocalProjectSafeRepository
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

type JsonRecord = Readonly<Record<string, unknown>>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const FAILURE_REASONS = new Set([
  "FEATURE_DISABLED", "CONFIGURATION_REQUIRED", "PATH_NOT_AUTHORIZED",
  "PATH_INVALID", "REPOSITORY_NOT_FOUND", "REPOSITORY_NOT_GIT", "UNSAFE_LINK",
  "COMMIT_UNAVAILABLE", "GIT_TIMEOUT", "GIT_UNAVAILABLE", "INTEGRITY_CHECK_FAILED"
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: JsonRecord,
  required: readonly string[]
): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => required.includes(key));
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isSafeRepository(value: unknown): value is LocalProjectSafeRepository {
  return isRecord(value) && hasOnlyKeys(value, [
    "displayName", "repositoryState", "headState", "ref", "exactCommit",
    "commitTimestampUtc", "uncommittedChanges", "excludedChangeCount",
    "captureReady", "accessMode", "sourcePersistence"
  ]) &&
    typeof value.displayName === "string" && value.displayName.length >= 1 && value.displayName.length <= 120 &&
    value.repositoryState === "RECOGNIZED_GIT" &&
    (value.headState === "ATTACHED" || value.headState === "DETACHED") &&
    typeof value.ref === "string" && value.ref.length >= 1 && value.ref.length <= 255 &&
    typeof value.exactCommit === "string" && COMMIT_PATTERN.test(value.exactCommit) &&
    isTimestamp(value.commitTimestampUtc) &&
    (value.uncommittedChanges === "NONE" || value.uncommittedChanges === "EXCLUDED") &&
    typeof value.excludedChangeCount === "number" && Number.isSafeInteger(value.excludedChangeCount) && value.excludedChangeCount >= 0 &&
    value.captureReady === true && value.accessMode === "READ_ONLY" &&
    value.sourcePersistence === "SOURCE_FREE";
}

function isCapability(value: unknown): value is LocalProjectPilotCapabilityResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ["apiVersion", "capability"]) ||
    value.apiVersion !== "v1" || !isRecord(value.capability) ||
    !hasOnlyKeys(value.capability, ["state", "enabled", "configured", "localOnly", "accessMode", "externalAi"])) return false;
  const capability = value.capability;
  return (capability.state === "READY" || capability.state === "DISABLED" || capability.state === "CONFIGURATION_REQUIRED") &&
    typeof capability.enabled === "boolean" && typeof capability.configured === "boolean" &&
    capability.localOnly === true && capability.accessMode === "READ_ONLY" && capability.externalAi === "OFF";
}

function isPreflight(value: unknown): value is LocalProjectPreflightResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ["apiVersion", "preflight"]) ||
    value.apiVersion !== "v1" || !isRecord(value.preflight)) return false;
  if (value.preflight.status === "READY") return hasOnlyKeys(value.preflight, ["status", "repository"]) &&
    isSafeRepository(value.preflight.repository);
  return value.preflight.status === "REJECTED" && hasOnlyKeys(value.preflight, ["status", "reason", "recovery"]) &&
    typeof value.preflight.reason === "string" && FAILURE_REASONS.has(value.preflight.reason) &&
    typeof value.preflight.recovery === "string" && value.preflight.recovery.length >= 1 && value.preflight.recovery.length <= 240;
}

function isContext(value: unknown): value is LocalProjectContextResponse {
  return isRecord(value) && hasOnlyKeys(value, ["apiVersion", "projectId", "repository"]) && value.apiVersion === "v1" &&
    typeof value.projectId === "string" && UUID_PATTERN.test(value.projectId) &&
    isSafeRepository(value.repository);
}

export async function getLocalProjectPilotCapability(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<LocalProjectPilotCapabilityResponse> {
  return requestJson(fetcher, "/api/v1/local-project-pilot/capability", isCapability,
    signal === undefined ? {} : { signal });
}

export async function preflightLocalProject(
  rootPath: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<LocalProjectPreflightResponse> {
  return requestJson(fetcher, "/api/v1/local-project-pilot/preflight", isPreflight, {
    method: "POST",
    body: JSON.stringify({ rootPath })
  });
}

export async function getLocalProjectContext(
  projectId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<LocalProjectContextResponse> {
  return requestJson(
    fetcher,
    `/api/v1/projects/${encodeURIComponent(projectId)}/local-project-pilot-context`,
    isContext,
    signal === undefined ? {} : { signal }
  );
}
