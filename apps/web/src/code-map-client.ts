import type {
  CodeMapAssetListResponse,
  CodeMapAssetResource,
  CodeMapEdgeListResponse,
  CodeMapEdgeResource,
  CodeMapFallbackMode,
  CodeMapRevisionListResponse,
  CodeMapRevisionSummaryResource,
  CodeMapRunResponse
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const ASSET_KINDS = new Set(["FILE", "PACKAGE", "CONTRACT", "ROUTE"]);
const EDGE_KINDS = new Set([
  "IMPORTS",
  "REEXPORTS",
  "DECLARES_PACKAGE",
  "DECLARES_CONTRACT",
  "DECLARES_ROUTE",
  "TEST_IMPORTS"
]);

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: JsonRecord,
  required: readonly string[],
  optional: readonly string[] = []
): boolean {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isEvidenceMode(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      ["evidenceKind", "inferenceStatus", "completeness", "sourceDigest"],
      ["declaredManifestId", "fallbackReason"]
    ) ||
    !isDigest(value.sourceDigest)
  ) {
    return false;
  }
  if (value.evidenceKind === "STATIC_INFERENCE") {
    return value.inferenceStatus === "AVAILABLE" &&
      (value.completeness === "COMPLETE" || value.completeness === "PARTIAL") &&
      value.declaredManifestId === undefined &&
      value.fallbackReason === undefined;
  }
  return value.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE" &&
    value.inferenceStatus === "UNAVAILABLE_SAFE_FAILURE" &&
    value.completeness === "UNAVAILABLE" &&
    typeof value.declaredManifestId === "string" &&
    value.declaredManifestId.length >= 1 &&
    value.declaredManifestId.length <= 128 &&
    (value.fallbackReason === "SCAN_LIMIT_OR_SAFE_FAILURE" ||
      value.fallbackReason === "EXTRACTION_LIMIT_OR_SAFE_FAILURE");
}

export function isCodeMapRevisionSummaryResource(
  value: unknown
): value is CodeMapRevisionSummaryResource {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      [
        "projectionId",
        "projectId",
        "missionId",
        "registrationId",
        "revision",
        "inputDigest",
        "projectionDigest",
        "recordedAtUtc",
        "snapshot",
        "evidence",
        "assetCount",
        "edgeCount"
      ],
      ["predecessor"]
    ) ||
    !isUuid(value.projectionId) ||
    !isUuid(value.projectId) ||
    !isUuid(value.missionId) ||
    !isUuid(value.registrationId) ||
    !isPositiveInteger(value.revision) ||
    !isDigest(value.inputDigest) ||
    !isDigest(value.projectionDigest) ||
    !isTimestamp(value.recordedAtUtc) ||
    !isRecord(value.snapshot) ||
    !hasOnlyKeys(value.snapshot, ["snapshotId", "capturedAtUtc", "snapshotDigest"]) ||
    !isUuid(value.snapshot.snapshotId) ||
    !isTimestamp(value.snapshot.capturedAtUtc) ||
    !isDigest(value.snapshot.snapshotDigest) ||
    !isEvidenceMode(value.evidence) ||
    !isNonnegativeInteger(value.assetCount) ||
    value.assetCount > 10_000 ||
    !isNonnegativeInteger(value.edgeCount) ||
    value.edgeCount > 50_000
  ) {
    return false;
  }
  if (value.revision === 1) return value.predecessor === undefined;
  return isRecord(value.predecessor) &&
    hasOnlyKeys(value.predecessor, ["revision", "projectionDigest"]) &&
    value.predecessor.revision === value.revision - 1 &&
    isDigest(value.predecessor.projectionDigest);
}

function isAsset(value: unknown): value is CodeMapAssetResource {
  return isRecord(value) &&
    hasOnlyKeys(
      value,
      ["assetId", "kind", "label", "sourceDigest", "evidenceKind", "assetDigest"],
      ["sourcePath"]
    ) &&
    isUuid(value.assetId) &&
    typeof value.kind === "string" && ASSET_KINDS.has(value.kind) &&
    typeof value.label === "string" && value.label.length >= 1 && value.label.length <= 256 &&
    (value.sourcePath === undefined ||
      (typeof value.sourcePath === "string" && value.sourcePath.length >= 1 && value.sourcePath.length <= 1024)) &&
    isDigest(value.sourceDigest) &&
    (value.evidenceKind === "STATIC_INFERENCE" ||
      value.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE") &&
    isDigest(value.assetDigest);
}

function isEdge(value: unknown): value is CodeMapEdgeResource {
  return isRecord(value) &&
    hasOnlyKeys(
      value,
      ["edgeId", "kind", "fromAssetId", "toAssetId", "evidenceKind", "edgeDigest"]
    ) &&
    isUuid(value.edgeId) &&
    typeof value.kind === "string" && EDGE_KINDS.has(value.kind) &&
    isUuid(value.fromAssetId) &&
    isUuid(value.toAssetId) &&
    value.fromAssetId !== value.toAssetId &&
    (value.evidenceKind === "STATIC_INFERENCE" ||
      value.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE") &&
    isDigest(value.edgeDigest);
}

function isPage(value: unknown): value is { readonly limit: number; readonly nextCursor: string | null } {
  return isRecord(value) &&
    hasOnlyKeys(value, ["limit", "nextCursor"]) &&
    isPositiveInteger(value.limit) && value.limit <= 100 &&
    (value.nextCursor === null || isUuid(value.nextCursor));
}

function isRevisionList(value: unknown): value is CodeMapRevisionListResponse {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["apiVersion", "missionId", "revisions", "page"]) ||
    value.apiVersion !== "v1" ||
    !isUuid(value.missionId) ||
    !Array.isArray(value.revisions) ||
    !value.revisions.every(isCodeMapRevisionSummaryResource) ||
    !isRecord(value.page) ||
    !hasOnlyKeys(value.page, ["limit", "nextCursor"]) ||
    !isPositiveInteger(value.page.limit) || value.page.limit > 100 ||
    (value.page.nextCursor !== null && !isPositiveInteger(value.page.nextCursor))
  ) {
    return false;
  }
  const revisions = value.revisions;
  return revisions.every(
    (revision, index) => revision.missionId === value.missionId &&
      (index === 0 || revision.revision < (revisions[index - 1]?.revision ?? 0))
  );
}

function isRunResponse(value: unknown): value is CodeMapRunResponse {
  return isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "created", "codeMapRevision"]) &&
    value.apiVersion === "v1" &&
    typeof value.created === "boolean" &&
    isCodeMapRevisionSummaryResource(value.codeMapRevision);
}

function isAssetList(value: unknown): value is CodeMapAssetListResponse {
  return isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "projectionRevision", "assets", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    isPositiveInteger(value.projectionRevision) &&
    Array.isArray(value.assets) && value.assets.every(isAsset) &&
    isPage(value.page);
}

function isEdgeList(value: unknown): value is CodeMapEdgeListResponse {
  return isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "projectionRevision", "edges", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    isPositiveInteger(value.projectionRevision) &&
    Array.isArray(value.edges) && value.edges.every(isEdge) &&
    isPage(value.page);
}

function signalInit(signal?: AbortSignal): RequestInit {
  return signal === undefined ? {} : { signal };
}

export async function listCodeMapRevisions(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<CodeMapRevisionListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/code-map/revisions?limit=100`,
    isRevisionList,
    signalInit(signal)
  );
}

export async function runCodeMapRevision(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  fallbackMode: CodeMapFallbackMode = "DISABLED"
): Promise<CodeMapRunResponse> {
  const fallbackRequest = fallbackMode === "DISABLED"
    ? {}
    : {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fallbackMode })
      };
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/code-map/revisions`,
    isRunResponse,
    { method: "POST", ...fallbackRequest }
  );
}

export async function listCodeMapAssets(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<CodeMapAssetListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/code-map/revisions/${revision}/assets?limit=100`,
    isAssetList,
    signalInit(signal)
  );
}

export async function listCodeMapEdges(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<CodeMapEdgeListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/code-map/revisions/${revision}/edges?limit=100`,
    isEdgeList,
    signalInit(signal)
  );
}
