import type {
  DemoResetResponse,
  DemoSetupResponse,
  DemoTransitionResponse,
  DemoWorkspaceResource
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function isDemoWorkspaceResource(value: unknown): value is DemoWorkspaceResource {
  if (!isRecord(value) || value.apiVersion !== "v1" ||
    value.fixtureId !== "loopmart-expanded-cancellation-v1" ||
    value.fixtureVersion !== "intelliloop-retail-cancellation-fixture.v1" ||
    value.ownership !== "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY" ||
    value.synthetic !== true || value.repositoryExecution !== false ||
    (value.status !== "EMPTY" && value.status !== "READY")) return false;
  if (value.status === "EMPTY") return value.projectId === undefined && value.missionId === undefined;
  if (!isUuid(value.projectId) || !isUuid(value.missionId) || !isUuid(value.initialSnapshotId) ||
    !isRevision(value.codeMapRevision) || !isRevision(value.twinRevision) ||
    !isRevision(value.reconciliationRevision) || !isRevision(value.readinessRevision) ||
    !["INITIAL_BLOCKED", "CORRECTED_READY", "READY_STALE"].includes(String(value.workflowStage)) ||
    !["BLOCKED", "READY", "STALE"].includes(String(value.readinessStatus))) return false;
  if (value.workflowStage === "INITIAL_BLOCKED") return value.readinessStatus === "BLOCKED";
  return isUuid(value.correctedSnapshotId) && isRevision(value.correctedCodeMapRevision) &&
    isRevision(value.correctedTwinRevision) && isRevision(value.correctedReconciliationRevision) &&
    isRevision(value.readyAssessmentRevision) && isRevision(value.passportAssessmentRevision) &&
    (value.workflowStage !== "READY_STALE" || isUuid(value.staleSnapshotId));
}

function emptyMutation(): RequestInit {
  return { method: "POST" };
}

export function getDemoWorkspace(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<DemoWorkspaceResource> {
  return requestJson(fetcher, "/api/v1/demo", isDemoWorkspaceResource,
    signal === undefined ? {} : { signal });
}

export function setupDemoWorkspace(fetcher: typeof fetch = globalThis.fetch): Promise<DemoSetupResponse> {
  return requestJson(fetcher, "/api/v1/demo/setup", (value): value is DemoSetupResponse =>
    isDemoWorkspaceResource(value) && isRecord(value) && typeof value.created === "boolean", emptyMutation());
}

export function applyDemoCorrection(fetcher: typeof fetch = globalThis.fetch): Promise<DemoTransitionResponse> {
  return requestJson(fetcher, "/api/v1/demo/correction", (value): value is DemoTransitionResponse =>
    isDemoWorkspaceResource(value) && isRecord(value) && typeof value.changed === "boolean", emptyMutation());
}

export function demonstrateDemoStaleness(fetcher: typeof fetch = globalThis.fetch): Promise<DemoTransitionResponse> {
  return requestJson(fetcher, "/api/v1/demo/staleness", (value): value is DemoTransitionResponse =>
    isDemoWorkspaceResource(value) && isRecord(value) && typeof value.changed === "boolean", emptyMutation());
}

export function resetDemoWorkspace(fetcher: typeof fetch = globalThis.fetch): Promise<DemoResetResponse> {
  return requestJson(fetcher, "/api/v1/demo/reset", (value): value is DemoResetResponse =>
    isDemoWorkspaceResource(value) && isRecord(value) && typeof value.reset === "boolean", emptyMutation());
}
