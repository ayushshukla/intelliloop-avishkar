import type {
  TwinMaterializeResponse,
  TwinNodeListResponse,
  TwinNodeResource,
  TwinRelationshipListResponse,
  TwinRelationshipResource,
  TwinRevisionListResponse,
  TwinRevisionSummaryResource
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const NODE_TYPES = new Set([
  "Project",
  "ChangeMission",
  "EvidenceSource",
  "Claim",
  "SoftwareAsset",
  "GitSnapshot",
  "ValidationResult",
  "ReconciliationFinding",
  "ReleaseAssessment",
  "ReleasePassport"
]);
const PROJECTED_SOURCE_TYPES = new Set([
  "Project",
  "ChangeMission",
  "EvidenceSource",
  "Claim",
  "SoftwareAsset",
  "GitSnapshot",
  "ValidationResult"
]);
const RELATIONSHIP_TYPES = new Set([
  "SCOPED_TO",
  "EXTRACTED_FROM",
  "ASSERTS",
  "CONCERNS",
  "IMPLEMENTS",
  "AFFECTS",
  "DEPENDS_ON",
  "VALIDATED_BY",
  "CONTRADICTS",
  "SUPERSEDES",
  "DERIVED_FROM",
  "BOUND_TO",
  "BLOCKS"
]);
const ORIGINS = new Set([
  "USER_INPUT",
  "REPOSITORY_OBSERVATION",
  "VALIDATION_RESULT",
  "SYSTEM_DERIVATION",
  "SYNTHETIC_FIXTURE",
  "AI_ADVISORY"
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
  return (
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key))
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isDigest(value: unknown): boolean {
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

function isCodeMapBinding(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["projectionId", "revision", "projectionDigest"]) &&
    isUuid(value.projectionId) &&
    isPositiveInteger(value.revision) &&
    isDigest(value.projectionDigest)
  );
}

function isAttribution(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      [
        "origin",
        "pathCitation",
        "sourceVersion",
        "recordedAtUtc",
        "extractionMethod",
        "epistemicLabel"
      ],
      ["effectiveAtUtc"]
    ) ||
    typeof value.origin !== "string" ||
    !ORIGINS.has(value.origin) ||
    typeof value.pathCitation !== "string" ||
    value.pathCitation.length < 1 ||
    value.pathCitation.length > 512 ||
    !isRecord(value.sourceVersion) ||
    !hasOnlyKeys(value.sourceVersion, ["kind", "value"]) ||
    !isTimestamp(value.recordedAtUtc) ||
    (value.effectiveAtUtc !== undefined && !isTimestamp(value.effectiveAtUtc)) ||
    typeof value.extractionMethod !== "string" ||
    value.extractionMethod.length < 1 ||
    value.extractionMethod.length > 128 ||
    (value.epistemicLabel !== "FACT" && value.epistemicLabel !== "INFERENCE")
  ) {
    return false;
  }
  const version = value.sourceVersion;
  return (
    (version.kind === "CONTENT_DIGEST" && isDigest(version.value)) ||
    (version.kind === "SOURCE_REVISION" &&
      typeof version.value === "string" &&
      version.value.length >= 1 &&
      version.value.length <= 256)
  );
}

export function isTwinRevisionSummaryResource(
  value: unknown
): value is TwinRevisionSummaryResource {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      [
        "projectionId",
        "projectId",
        "missionId",
        "revision",
        "inputDigest",
        "projectionDigest",
        "recordedAtUtc",
        "nodeCount",
        "relationshipCount",
        "invalidationCount"
      ],
      ["codeMapBinding", "predecessor"]
    ) ||
    !isUuid(value.projectionId) ||
    !isUuid(value.projectId) ||
    !isUuid(value.missionId) ||
    !isPositiveInteger(value.revision) ||
    !isDigest(value.inputDigest) ||
    !isDigest(value.projectionDigest) ||
    !isTimestamp(value.recordedAtUtc) ||
    (value.codeMapBinding !== undefined &&
      !isCodeMapBinding(value.codeMapBinding)) ||
    !isPositiveInteger(value.nodeCount) ||
    value.nodeCount > 10_000 ||
    !isPositiveInteger(value.relationshipCount) ||
    value.relationshipCount > 50_000 ||
    !isNonnegativeInteger(value.invalidationCount) ||
    value.invalidationCount > 100_000
  ) {
    return false;
  }
  if (value.revision === 1) return value.predecessor === undefined;
  return (
    isRecord(value.predecessor) &&
    hasOnlyKeys(value.predecessor, ["revision", "projectionDigest"]) &&
    value.predecessor.revision === value.revision - 1 &&
    isDigest(value.predecessor.projectionDigest)
  );
}

export function isTwinNodeResource(value: unknown): value is TwinNodeResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "nodeId",
      "nodeRevision",
      "memberDigest",
      "nodeType",
      "attribution",
      "source"
    ]) &&
    isUuid(value.nodeId) &&
    isPositiveInteger(value.nodeRevision) &&
    isDigest(value.memberDigest) &&
    typeof value.nodeType === "string" &&
    NODE_TYPES.has(value.nodeType) &&
    isAttribution(value.attribution) &&
    isRecord(value.source) &&
    hasOnlyKeys(value.source, ["sourceType", "sourceId", "sourceDigest"]) &&
    typeof value.source.sourceType === "string" &&
    PROJECTED_SOURCE_TYPES.has(value.source.sourceType) &&
    isUuid(value.source.sourceId) &&
    isDigest(value.source.sourceDigest)
  );
}

function isEndpoint(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["nodeId", "nodeRevision"]) &&
    isUuid(value.nodeId) &&
    isPositiveInteger(value.nodeRevision)
  );
}

export function isTwinRelationshipResource(
  value: unknown
): value is TwinRelationshipResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "relationshipId",
      "relationshipRevision",
      "memberDigest",
      "relationshipType",
      "from",
      "to",
      "attribution"
    ]) &&
    isUuid(value.relationshipId) &&
    isPositiveInteger(value.relationshipRevision) &&
    isDigest(value.memberDigest) &&
    typeof value.relationshipType === "string" &&
    RELATIONSHIP_TYPES.has(value.relationshipType) &&
    isEndpoint(value.from) &&
    isEndpoint(value.to) &&
    isAttribution(value.attribution)
  );
}

function isRevisionList(value: unknown): value is TwinRevisionListResponse {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["apiVersion", "missionId", "revisions", "page"]) ||
    value.apiVersion !== "v1" ||
    !isUuid(value.missionId) ||
    !Array.isArray(value.revisions) ||
    !value.revisions.every(isTwinRevisionSummaryResource) ||
    !isRecord(value.page) ||
    !hasOnlyKeys(value.page, ["limit", "nextCursor"]) ||
    !isPositiveInteger(value.page.limit) ||
    value.page.limit > 100 ||
    (value.page.nextCursor !== null && !isPositiveInteger(value.page.nextCursor))
  ) {
    return false;
  }
  const revisions = value.revisions;
  return revisions.every(
    (revision, index) =>
      revision.missionId === value.missionId &&
      (index === 0 || revision.revision < (revisions[index - 1]?.revision ?? 0))
  );
}

function isMaterializeResponse(value: unknown): value is TwinMaterializeResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "created", "twinRevision"]) &&
    value.apiVersion === "v1" &&
    typeof value.created === "boolean" &&
    isTwinRevisionSummaryResource(value.twinRevision)
  );
}

function isNodeList(value: unknown): value is TwinNodeListResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "projectionRevision", "nodes", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    isPositiveInteger(value.projectionRevision) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isTwinNodeResource) &&
    isRecord(value.page) &&
    hasOnlyKeys(value.page, ["limit", "nextCursor"]) &&
    isPositiveInteger(value.page.limit) &&
    value.page.limit <= 100 &&
    (value.page.nextCursor === null || isUuid(value.page.nextCursor))
  );
}

function isRelationshipList(
  value: unknown
): value is TwinRelationshipListResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "apiVersion",
      "missionId",
      "projectionRevision",
      "relationships",
      "page"
    ]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    isPositiveInteger(value.projectionRevision) &&
    Array.isArray(value.relationships) &&
    value.relationships.every(isTwinRelationshipResource) &&
    isRecord(value.page) &&
    hasOnlyKeys(value.page, ["limit", "nextCursor"]) &&
    isPositiveInteger(value.page.limit) &&
    value.page.limit <= 100 &&
    (value.page.nextCursor === null || isUuid(value.page.nextCursor))
  );
}

function signalInit(signal?: AbortSignal): RequestInit {
  return signal === undefined ? {} : { signal };
}

export async function listTwinRevisions(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<TwinRevisionListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/twin/revisions?limit=100`,
    isRevisionList,
    signalInit(signal)
  );
}

export async function materializeTwinRevision(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<TwinMaterializeResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/twin/revisions`,
    isMaterializeResponse,
    { method: "POST" }
  );
}

export async function listTwinNodes(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<TwinNodeListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/twin/revisions/${revision}/nodes?limit=100`,
    isNodeList,
    signalInit(signal)
  );
}

export async function listTwinRelationships(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<TwinRelationshipListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/twin/revisions/${revision}/relationships?limit=100`,
    isRelationshipList,
    signalInit(signal)
  );
}
