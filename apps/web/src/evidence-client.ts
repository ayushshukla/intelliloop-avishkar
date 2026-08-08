import type {
  ClaimListResponse,
  ClaimResource,
  ClaimSupersessionListResponse,
  ClaimSupersessionResource,
  CommitEvidenceRequest,
  EvidencePreviewRequest,
  EvidencePreviewResponse,
  EvidenceSourceListResponse,
  EvidenceSourceResource,
  EvidenceSourceResponse,
  EvidenceTimelineEventResource,
  EvidenceTimelineResponse,
  PreparedEvidenceResource
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MAXIMUM_EVIDENCE_BYTES = 262_144;
const REDACTION_RULES = new Set([
  "JSON_SECRET_KEY",
  "PRIVATE_KEY",
  "OPENAI_TOKEN",
  "GITHUB_TOKEN",
  "SERVICE_TOKEN",
  "SLACK_TOKEN",
  "AWS_ACCESS_KEY",
  "JWT",
  "AUTHORIZATION",
  "URI_CREDENTIAL",
  "GENERIC_SECRET_ASSIGNMENT"
]);

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
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

function isIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isOrigin(value: unknown): boolean {
  return (
    value === "USER_INPUT" ||
    value === "REPOSITORY_OBSERVATION" ||
    value === "VALIDATION_RESULT" ||
    value === "SYSTEM_DERIVATION" ||
    value === "SYNTHETIC_FIXTURE" ||
    value === "AI_ADVISORY"
  );
}

function isEpistemicLabel(value: unknown): boolean {
  return value === "FACT" || value === "INFERENCE";
}

function isFormat(value: unknown): boolean {
  return value === "MARKDOWN" || value === "TEXT" || value === "JSON";
}

function isIdentityPage(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["limit", "nextCursor"]) &&
    isIntegerBetween(value.limit, 1, 100) &&
    (value.nextCursor === null || isUuid(value.nextCursor))
  );
}

function isTimelinePage(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["limit", "nextCursor"]) &&
    isIntegerBetween(value.limit, 1, 100) &&
    (value.nextCursor === null ||
      isIntegerBetween(value.nextCursor, 1, Number.MAX_SAFE_INTEGER))
  );
}

function isRedaction(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["applied", "totalReplacements", "ruleCounts"]) ||
    typeof value.applied !== "boolean" ||
    !isIntegerBetween(value.totalReplacements, 0, Number.MAX_SAFE_INTEGER) ||
    !Array.isArray(value.ruleCounts)
  ) {
    return false;
  }

  const seenRules = new Set<string>();
  let countedReplacements = 0;
  for (const entry of value.ruleCounts) {
    if (
      !isRecord(entry) ||
      !hasOnlyKeys(entry, ["rule", "replacements"]) ||
      typeof entry.rule !== "string" ||
      !REDACTION_RULES.has(entry.rule) ||
      seenRules.has(entry.rule) ||
      !isIntegerBetween(entry.replacements, 1, Number.MAX_SAFE_INTEGER)
    ) {
      return false;
    }
    seenRules.add(entry.rule);
    countedReplacements += entry.replacements;
    if (!Number.isSafeInteger(countedReplacements)) return false;
  }

  return (
    countedReplacements === value.totalReplacements &&
    value.applied === (value.totalReplacements > 0)
  );
}

export function isPreparedEvidenceResource(
  value: unknown
): value is PreparedEvidenceResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "normalizationVersion",
      "format",
      "inputByteCount",
      "normalizedByteCount",
      "normalizedContent",
      "contentDigest",
      "redaction"
    ]) &&
    value.normalizationVersion === "evidence-normalization.v1" &&
    isFormat(value.format) &&
    isIntegerBetween(value.inputByteCount, 1, MAXIMUM_EVIDENCE_BYTES) &&
    isIntegerBetween(value.normalizedByteCount, 1, MAXIMUM_EVIDENCE_BYTES) &&
    typeof value.normalizedContent === "string" &&
    value.normalizedContent.length >= 1 &&
    new TextEncoder().encode(value.normalizedContent).byteLength ===
      value.normalizedByteCount &&
    isDigest(value.contentDigest) &&
    isRedaction(value.redaction)
  );
}

export function isEvidenceSourceResource(
  value: unknown
): value is EvidenceSourceResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "evidenceSourceId",
      "projectId",
      "missionId",
      "importKey",
      "origin",
      "sourceLocator",
      "sourceRevision",
      "recordedAtUtc",
      "effectiveAtUtc",
      "extractionMethod",
      "epistemicLabel",
      "prepared"
    ]) &&
    isUuid(value.evidenceSourceId) &&
    isUuid(value.projectId) &&
    isUuid(value.missionId) &&
    isDigest(value.importKey) &&
    isOrigin(value.origin) &&
    typeof value.sourceLocator === "string" &&
    value.sourceLocator.length >= 4 &&
    value.sourceLocator.length <= 512 &&
    (value.sourceRevision === undefined ||
      (typeof value.sourceRevision === "string" &&
        value.sourceRevision.length >= 1 &&
        value.sourceRevision.length <= 256)) &&
    isTimestamp(value.recordedAtUtc) &&
    (value.effectiveAtUtc === undefined || isTimestamp(value.effectiveAtUtc)) &&
    value.extractionMethod === "DIRECT_IMPORT" &&
    isEpistemicLabel(value.epistemicLabel) &&
    isPreparedEvidenceResource(value.prepared)
  );
}

export function isEvidenceTimelineEventResource(
  value: unknown
): value is EvidenceTimelineEventResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "timelineEventId",
      "projectId",
      "missionId",
      "sequence",
      "eventType",
      "evidenceSourceId",
      "occurredAtUtc"
    ]) &&
    isUuid(value.timelineEventId) &&
    isUuid(value.projectId) &&
    isUuid(value.missionId) &&
    isIntegerBetween(value.sequence, 1, Number.MAX_SAFE_INTEGER) &&
    value.eventType === "EVIDENCE_IMPORTED" &&
    isUuid(value.evidenceSourceId) &&
    isTimestamp(value.occurredAtUtc)
  );
}

function isEvidencePreviewResponse(value: unknown): value is EvidencePreviewResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "preview"]) &&
    value.apiVersion === "v1" &&
    isPreparedEvidenceResource(value.preview)
  );
}

function isEvidenceSourceResponse(value: unknown): value is EvidenceSourceResponse {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "apiVersion",
      "created",
      "evidenceSource",
      "timelineEvent"
    ]) ||
    value.apiVersion !== "v1" ||
    typeof value.created !== "boolean" ||
    !isEvidenceSourceResource(value.evidenceSource) ||
    !isEvidenceTimelineEventResource(value.timelineEvent)
  ) {
    return false;
  }
  return (
    value.timelineEvent.projectId === value.evidenceSource.projectId &&
    value.timelineEvent.missionId === value.evidenceSource.missionId &&
    value.timelineEvent.evidenceSourceId === value.evidenceSource.evidenceSourceId
  );
}

function isEvidenceSourceListResponse(
  value: unknown
): value is EvidenceSourceListResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "evidenceSources", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    Array.isArray(value.evidenceSources) &&
    value.evidenceSources.every(isEvidenceSourceResource) &&
    isIdentityPage(value.page)
  );
}

function isEvidenceTimelineResponse(value: unknown): value is EvidenceTimelineResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "timelineEvents", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    Array.isArray(value.timelineEvents) &&
    value.timelineEvents.every(isEvidenceTimelineEventResource) &&
    isTimelinePage(value.page)
  );
}

function isBoundedJsonValue(value: unknown): boolean {
  const state = { nodes: 0 };
  function visit(current: unknown, depth: number): boolean {
    state.nodes += 1;
    if (state.nodes > 256 || depth > 16) return false;
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    ) {
      return true;
    }
    if (typeof current === "number") return Number.isFinite(current);
    if (Array.isArray(current)) {
      return current.every((entry) => visit(entry, depth + 1));
    }
    if (!isRecord(current)) return false;
    return Object.values(current).every((entry) => visit(entry, depth + 1));
  }
  return visit(value, 0);
}

function isApplicability(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["dimensions", "effectiveFromUtc", "effectiveUntilUtc"]) &&
    Array.isArray(value.dimensions) &&
    value.dimensions.length <= 16 &&
    value.dimensions.every(
      (entry) =>
        isRecord(entry) &&
        hasOnlyKeys(entry, ["dimension", "value"]) &&
        typeof entry.dimension === "string" &&
        entry.dimension.length >= 1 &&
        typeof entry.value === "string" &&
        entry.value.length >= 1
    ) &&
    (value.effectiveFromUtc === undefined || isTimestamp(value.effectiveFromUtc)) &&
    (value.effectiveUntilUtc === undefined || isTimestamp(value.effectiveUntilUtc))
  );
}

export function isClaimResource(value: unknown): value is ClaimResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "claimId",
      "projectId",
      "missionId",
      "evidenceSourceId",
      "importKey",
      "claimDigest",
      "normalizationVersion",
      "origin",
      "sourceLocator",
      "sourceRevision",
      "sourceContentDigest",
      "recordedAtUtc",
      "effectiveAtUtc",
      "extractionMethod",
      "epistemicLabel",
      "rawText",
      "subject",
      "predicate",
      "comparisonKey",
      "value",
      "applicability",
      "applicabilityKey",
      "supersedesClaimId"
    ]) &&
    isUuid(value.claimId) &&
    isUuid(value.projectId) &&
    isUuid(value.missionId) &&
    isUuid(value.evidenceSourceId) &&
    isDigest(value.importKey) &&
    isDigest(value.claimDigest) &&
    value.normalizationVersion === "claim-normalization.v1" &&
    isOrigin(value.origin) &&
    typeof value.sourceLocator === "string" &&
    value.sourceLocator.length >= 4 &&
    (value.sourceRevision === undefined || typeof value.sourceRevision === "string") &&
    isDigest(value.sourceContentDigest) &&
    isTimestamp(value.recordedAtUtc) &&
    (value.effectiveAtUtc === undefined || isTimestamp(value.effectiveAtUtc)) &&
    value.extractionMethod === "MANUAL_STRUCTURED_INTAKE" &&
    isEpistemicLabel(value.epistemicLabel) &&
    typeof value.rawText === "string" &&
    value.rawText.length >= 1 &&
    typeof value.subject === "string" &&
    value.subject.length >= 1 &&
    typeof value.predicate === "string" &&
    value.predicate.length >= 1 &&
    isDigest(value.comparisonKey) &&
    isBoundedJsonValue(value.value) &&
    isApplicability(value.applicability) &&
    isDigest(value.applicabilityKey) &&
    (value.supersedesClaimId === undefined || isUuid(value.supersedesClaimId))
  );
}

export function isClaimSupersessionResource(
  value: unknown
): value is ClaimSupersessionResource {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "claimSupersessionId",
      "relationshipType",
      "projectId",
      "missionId",
      "predecessorClaimId",
      "successorClaimId",
      "evidenceSourceId",
      "comparisonKey",
      "applicabilityKey",
      "origin",
      "sourceLocator",
      "sourceRevision",
      "sourceContentDigest",
      "recordedAtUtc",
      "effectiveAtUtc",
      "extractionMethod",
      "epistemicLabel",
      "linkDigest"
    ]) &&
    isUuid(value.claimSupersessionId) &&
    value.relationshipType === "SUPERSEDES" &&
    isUuid(value.projectId) &&
    isUuid(value.missionId) &&
    isUuid(value.predecessorClaimId) &&
    isUuid(value.successorClaimId) &&
    isUuid(value.evidenceSourceId) &&
    isDigest(value.comparisonKey) &&
    isDigest(value.applicabilityKey) &&
    isOrigin(value.origin) &&
    typeof value.sourceLocator === "string" &&
    value.sourceLocator.length >= 4 &&
    (value.sourceRevision === undefined || typeof value.sourceRevision === "string") &&
    isDigest(value.sourceContentDigest) &&
    isTimestamp(value.recordedAtUtc) &&
    (value.effectiveAtUtc === undefined || isTimestamp(value.effectiveAtUtc)) &&
    value.extractionMethod === "MANUAL_STRUCTURED_INTAKE" &&
    isEpistemicLabel(value.epistemicLabel) &&
    isDigest(value.linkDigest)
  );
}

function isClaimListResponse(value: unknown): value is ClaimListResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "claims", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    Array.isArray(value.claims) &&
    value.claims.every(isClaimResource) &&
    isIdentityPage(value.page)
  );
}

function isClaimSupersessionListResponse(
  value: unknown
): value is ClaimSupersessionListResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["apiVersion", "missionId", "supersessions", "page"]) &&
    value.apiVersion === "v1" &&
    isUuid(value.missionId) &&
    Array.isArray(value.supersessions) &&
    value.supersessions.every(isClaimSupersessionResource) &&
    isIdentityPage(value.page)
  );
}

function withSignal(signal?: AbortSignal): RequestInit {
  return signal === undefined ? {} : { signal };
}

export function previewEvidence(
  missionId: string,
  body: EvidencePreviewRequest,
  fetcher: typeof fetch = globalThis.fetch
): Promise<EvidencePreviewResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/evidence/preview`,
    isEvidencePreviewResponse,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function commitEvidence(
  missionId: string,
  body: CommitEvidenceRequest,
  fetcher: typeof fetch = globalThis.fetch
): Promise<EvidenceSourceResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/evidence-sources`,
    isEvidenceSourceResponse,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function listEvidenceSources(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<EvidenceSourceListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/evidence-sources?limit=100`,
    isEvidenceSourceListResponse,
    withSignal(signal)
  );
}

export function listEvidenceTimeline(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<EvidenceTimelineResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/timeline-events?limit=100`,
    isEvidenceTimelineResponse,
    withSignal(signal)
  );
}

export function listClaims(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ClaimListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/claims?limit=100`,
    isClaimListResponse,
    withSignal(signal)
  );
}

export function listClaimSupersessions(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ClaimSupersessionListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/claim-supersessions?limit=100`,
    isClaimSupersessionListResponse,
    withSignal(signal)
  );
}
