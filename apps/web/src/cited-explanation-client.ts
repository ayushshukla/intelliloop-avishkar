import {
  CITED_EXPLANATION_PROVIDER_OUTCOMES,
  CITED_EXPLANATION_QUESTIONS,
  type CitedExplanationQuestion,
  type CitedExplanationResponse
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

type JsonRecord = Readonly<Record<string, unknown>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const CITATION_PATTERN = /^cite:[0-9a-f]{64}$/u;
const PRIVATE_PATH_PATTERN =
  /(?:\b[A-Za-z]:[\\/]|\\\\[^\\\s]+[\\/][^\\\s]+|\/(?:Users|home|private|var\/folders|tmp)\/)/u;
const ITEM_KINDS = new Set([
  "ASSESSMENT",
  "EVIDENCE_SOURCE",
  "CLAIM",
  "CLAIM_SUPERSESSION",
  "RECONCILIATION_FINDING",
  "IMPACT_PATH"
]);
const STATEMENT_CATEGORIES = new Set([
  "ANSWER",
  "FACT",
  "INFERENCE",
  "CONFLICT",
  "GAP",
  "NEXT_ACTION"
]);
const QUESTION_KINDS = new Set([
  "RELEASE",
  "CONFLICTS",
  "IMPACT",
  "MISSING_VALIDATION",
  "NEXT_ACTIONS",
  "POST_CORRECTION"
]);
const SYNTHETIC_EDGE_CASE_KINDS = new Set([
  "CONFLICT_BOUNDARY",
  "INTERPRETATION_VARIANT",
  "MISSING_EVIDENCE_PAIR",
  "MISSING_VALIDATION_PAIR",
  "DEPENDENCY_CHANGE_REPLAY",
  "IMPLEMENTATION_GAP_VARIANT",
  "VALIDATION_GAP_VARIANT",
  "IMPACT_PATH_INTERRUPTION"
]);
const FAILURE_CODES = new Set([
  "PROVIDER_DISABLED",
  "PROVIDER_CONCURRENCY_LIMIT",
  "PROVIDER_SESSION_BUDGET_EXCEEDED",
  "PROVIDER_INPUT_LIMIT_EXCEEDED",
  "PROVIDER_TRANSPORT_FAILED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_RESPONSE_LIMIT_EXCEEDED",
  "PROVIDER_RESPONSE_SCHEMA_INVALID",
  "PROVIDER_REQUEST_ID_MISMATCH",
  "PROVIDER_PACK_DIGEST_MISMATCH",
  "PROVIDER_OUTPUT_SCHEMA_MISMATCH",
  "PROVIDER_CITATION_INVALID",
  "PROVIDER_RESPONSE_CONTENT_UNSAFE",
  "PROVIDER_READINESS_AUTHORITY_INVALID",
  "PROVIDER_USAGE_LIMIT_EXCEEDED"
]);

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

function isCitationId(value: unknown): value is string {
  return typeof value === "string" && CITATION_PATTERN.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function uniqueCitationIds(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 64 &&
    value.every(isCitationId) && new Set(value).size === value.length;
}

function statement(
  value: unknown,
  category: string | undefined,
  allowed: ReadonlySet<string>,
  offline: boolean
): value is JsonRecord {
  if (!isRecord(value)) return false;
  const required = offline
    ? ["statementVersion", "category", "text", "citationIds", "statementId"]
    : ["text", "citationIds"];
  if (!hasOnlyKeys(value, required)) return false;
  if (
    typeof value.text !== "string" ||
    value.text.length < 1 ||
    value.text.length > 4096 ||
    PRIVATE_PATH_PATTERN.test(value.text) ||
    !uniqueCitationIds(value.citationIds) ||
    !(value.citationIds as readonly string[]).every((id) => allowed.has(id))
  ) {
    return false;
  }
  if (!offline) return true;
  return value.statementVersion === "offline-explanation-statement.v1" &&
    typeof value.category === "string" &&
    STATEMENT_CATEGORIES.has(value.category) &&
    (category === undefined || value.category === category) &&
    isDigest(value.statementId);
}

function statementArray(
  value: unknown,
  category: string,
  allowed: ReadonlySet<string>,
  offline: boolean
): value is readonly JsonRecord[] {
  return Array.isArray(value) && value.length <= 256 &&
    value.every((entry) => statement(entry, category, allowed, offline));
}

function disclosure(value: unknown): value is JsonRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "disclosureVersion", "transferStatus", "evidencePackDigest", "questionDigest",
    "itemCount", "citationCount", "serializedBytes", "inputTokenUpperBound",
    "redaction", "exactRedactedPackJson"
  ]) || value.disclosureVersion !== "cited-explanation-disclosure.v1" ||
    value.transferStatus !== "NOT_SENT" || !isDigest(value.evidencePackDigest) ||
    !isDigest(value.questionDigest) || !isPositiveInteger(value.itemCount) ||
    value.itemCount > 256 || !isPositiveInteger(value.citationCount) ||
    value.citationCount > 256 || !isPositiveInteger(value.serializedBytes) ||
    value.serializedBytes > 65536 || !isPositiveInteger(value.inputTokenUpperBound) ||
    value.inputTokenUpperBound > 12000 || typeof value.exactRedactedPackJson !== "string" ||
    value.exactRedactedPackJson.length < 1 || value.exactRedactedPackJson.length > 65536 ||
    PRIVATE_PATH_PATTERN.test(value.exactRedactedPackJson) || !isRecord(value.redaction) ||
    !hasOnlyKeys(value.redaction, ["applied", "totalReplacements", "ruleCounts"]) ||
    typeof value.redaction.applied !== "boolean" ||
    !isNonnegativeInteger(value.redaction.totalReplacements) ||
    !Array.isArray(value.redaction.ruleCounts)) return false;
  const ruleCounts = value.redaction.ruleCounts;
  if (!ruleCounts.every((entry) => isRecord(entry) &&
    hasOnlyKeys(entry, ["rule", "replacements"]) &&
    typeof entry.rule === "string" && entry.rule.length >= 1 && entry.rule.length <= 64 &&
    isPositiveInteger(entry.replacements))) return false;
  const total = ruleCounts.reduce<number>(
    (sum, entry) => sum + ((entry as JsonRecord).replacements as number),
    0
  );
  if (total !== value.redaction.totalReplacements || value.redaction.applied !== (total > 0)) {
    return false;
  }
  let pack: unknown;
  try {
    pack = JSON.parse(value.exactRedactedPackJson);
  } catch {
    return false;
  }
  return isRecord(pack) && pack.version === "evidence-pack.v1" &&
    pack.packDigest === value.evidencePackDigest &&
    pack.questionDigest === value.questionDigest &&
    Array.isArray(pack.items) && pack.items.length === value.itemCount &&
    Array.isArray(pack.citations) && pack.citations.length === value.citationCount &&
    Array.isArray(pack.allowedCitationIds) &&
    pack.allowedCitationIds.length === value.citationCount &&
    pack.allowedCitationIds.every(isCitationId);
}

function citationDetail(value: unknown): value is JsonRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "citationId", "itemKind", "itemKey", "itemDigest", "payloadJson"
  ]) || !isCitationId(value.citationId) || typeof value.itemKind !== "string" ||
    !ITEM_KINDS.has(value.itemKind) || typeof value.itemKey !== "string" ||
    value.itemKey.length < 1 || value.itemKey.length > 256 ||
    !isDigest(value.itemDigest) || typeof value.payloadJson !== "string" ||
    value.payloadJson.length < 1 || value.payloadJson.length > 4096 ||
    PRIVATE_PATH_PATTERN.test(value.payloadJson)) return false;
  try {
    JSON.parse(value.payloadJson);
    return true;
  } catch {
    return false;
  }
}

function offlineExplanation(
  value: unknown,
  missionId: string,
  question: string,
  disclosureValue: JsonRecord,
  allowed: ReadonlySet<string>
): value is JsonRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "version", "digestVersion", "rendererPolicyVersion", "rendererPolicyDigest",
    "projectId", "missionId", "evidencePackDigest", "questionDigest", "question",
    "questionKind", "engine", "answer", "facts", "inferences", "conflicts", "gaps",
    "nextActions", "citations", "limitations", "explanationDigest"
  ]) || value.version !== "offline-explanation.v1" ||
    value.digestVersion !== "offline-explanation-digest.v1" ||
    value.rendererPolicyVersion !== "offline-explanation-renderer-policy.v1" ||
    !isDigest(value.rendererPolicyDigest) || !isUuid(value.projectId) ||
    value.missionId !== missionId || value.question !== question ||
    value.evidencePackDigest !== disclosureValue.evidencePackDigest ||
    value.questionDigest !== disclosureValue.questionDigest ||
    typeof value.questionKind !== "string" || !QUESTION_KINDS.has(value.questionKind) ||
    !isRecord(value.engine) || !hasOnlyKeys(value.engine, [
      "explanationType", "aiStatus", "provider", "externalCallMade"
    ]) || value.engine.explanationType !== "DETERMINISTIC_EXPLANATION" ||
    value.engine.aiStatus !== "AI_OFF" || value.engine.provider !== "NONE" ||
    value.engine.externalCallMade !== false ||
    !statement(value.answer, "ANSWER", allowed, true) ||
    !statementArray(value.facts, "FACT", allowed, true) ||
    !statementArray(value.inferences, "INFERENCE", allowed, true) ||
    !statementArray(value.conflicts, "CONFLICT", allowed, true) ||
    !statementArray(value.gaps, "GAP", allowed, true) ||
    !statementArray(value.nextActions, "NEXT_ACTION", allowed, true) ||
    !Array.isArray(value.citations) || value.citations.length < 1 ||
    !Array.isArray(value.limitations) || value.limitations.length < 1 ||
    !value.limitations.every((entry) => typeof entry === "string" && entry.length >= 1) ||
    !isDigest(value.explanationDigest)) return false;
  const cited = new Set<string>();
  const sections = [value.answer, ...value.facts, ...value.inferences,
    ...value.conflicts, ...value.gaps, ...value.nextActions] as JsonRecord[];
  for (const entry of sections) {
    for (const id of entry.citationIds as readonly string[]) cited.add(id);
  }
  const registryIds: string[] = [];
  for (const entry of value.citations) {
    if (!isRecord(entry) || !hasOnlyKeys(entry, ["citationId", "locator", "itemDigest"]) ||
      !isCitationId(entry.citationId) || !allowed.has(entry.citationId) ||
      !isDigest(entry.itemDigest) || !isRecord(entry.locator) ||
      !hasOnlyKeys(entry.locator, ["locatorVersion", "itemKind", "itemKey"]) ||
      entry.locator.locatorVersion !== "evidence-pack-citation-locator.v1" ||
      typeof entry.locator.itemKind !== "string" || !ITEM_KINDS.has(entry.locator.itemKind) ||
      typeof entry.locator.itemKey !== "string") return false;
    registryIds.push(entry.citationId);
  }
  return registryIds.length === cited.size && registryIds.every((id) => cited.has(id)) &&
    new Set(registryIds).size === registryIds.length;
}

function advisory(value: unknown, allowed: ReadonlySet<string>, packDigest: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "validationVersion", "response", "responseDigest"
  ]) || value.validationVersion !== "provider-advisory-validation.v1" ||
    !isDigest(value.responseDigest) || !isRecord(value.response) ||
    !hasOnlyKeys(value.response, [
      "responseVersion", "requestId", "providerRequestDigest", "evidencePackDigest",
      "outputSchemaVersion", "answer", "facts", "inferences", "conflicts", "gaps",
      "nextActions", "citations", "providerMetadata", "usageMetadata"
    ]) || value.response.responseVersion !== "provider-advisory-response.v1" ||
    !isUuid(value.response.requestId) || !isDigest(value.response.providerRequestDigest) ||
    value.response.evidencePackDigest !== packDigest ||
    value.response.outputSchemaVersion !== "provider-advisory-output-schema.v1" ||
    !statement(value.response.answer, undefined, allowed, false) ||
    !statementArray(value.response.facts, "", allowed, false) ||
    !statementArray(value.response.inferences, "", allowed, false) ||
    !statementArray(value.response.conflicts, "", allowed, false) ||
    !statementArray(value.response.gaps, "", allowed, false) ||
    !statementArray(value.response.nextActions, "", allowed, false) ||
    !uniqueCitationIds(value.response.citations) ||
    !(value.response.citations as readonly string[]).every((id) => allowed.has(id)) ||
    !isRecord(value.response.providerMetadata) || !hasOnlyKeys(value.response.providerMetadata, [
      "providerId", "modelId", "responseId", "executionKind"
    ]) || value.response.providerMetadata.executionKind !== "MOCK_VALIDATION" ||
    !isRecord(value.response.usageMetadata) || !hasOnlyKeys(value.response.usageMetadata, [
      "inputTokens", "outputTokens", "totalTokens", "source"
    ]) || !isNonnegativeInteger(value.response.usageMetadata.inputTokens) ||
    !isNonnegativeInteger(value.response.usageMetadata.outputTokens) ||
    !isNonnegativeInteger(value.response.usageMetadata.totalTokens) ||
    value.response.usageMetadata.totalTokens !==
      value.response.usageMetadata.inputTokens + value.response.usageMetadata.outputTokens ||
    value.response.usageMetadata.source !== "PROVIDER_REPORTED") return false;
  const response = value.response as JsonRecord;
  const metadata = response.providerMetadata;
  return isRecord(metadata) && ["providerId", "modelId", "responseId"].every((key) =>
    typeof metadata[key] === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(metadata[key] as string)
  );
}

function syntheticEdgeCases(
  value: unknown,
  missionId: unknown,
  disclosureValue: unknown,
  pack: JsonRecord,
  allowed: ReadonlySet<string>
): boolean {
  if (!isRecord(disclosureValue)) return false;
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "version", "digestVersion", "policyVersion", "policyDigest", "projectId",
    "missionId", "evidencePackDigest", "questionDigest", "generation", "authority",
    "suggestions", "citations", "limitations", "setDigest"
  ]) || value.version !== "synthetic-edge-case-set.v1" ||
    value.digestVersion !== "synthetic-edge-case-set-digest.v1" ||
    value.policyVersion !== "synthetic-edge-case-policy.v1" ||
    !isDigest(value.policyDigest) || !isUuid(value.projectId) ||
    value.projectId !== pack.projectId ||
    value.missionId !== missionId ||
    value.evidencePackDigest !== disclosureValue.evidencePackDigest ||
    value.questionDigest !== disclosureValue.questionDigest ||
    !isRecord(value.generation) || !hasOnlyKeys(value.generation, [
      "mode", "provider", "externalCallMade"
    ]) || value.generation.mode !== "DETERMINISTIC_RULES" ||
    value.generation.provider !== "NONE" || value.generation.externalCallMade !== false ||
    !isRecord(value.authority) || !hasOnlyKeys(value.authority, [
      "canonicalStateChanged", "findingMutationAvailable", "readinessAuthority",
      "releasePassportAuthority"
    ]) || value.authority.canonicalStateChanged !== false ||
    value.authority.findingMutationAvailable !== false ||
    value.authority.readinessAuthority !== false ||
    value.authority.releasePassportAuthority !== false ||
    !Array.isArray(value.suggestions) || value.suggestions.length > 32 ||
    !Array.isArray(value.citations) || value.citations.length > 32 ||
    !Array.isArray(value.limitations) || value.limitations.length < 1 ||
    value.limitations.length > 8 ||
    !value.limitations.every((entry) => typeof entry === "string" && entry.length >= 1) ||
    !isDigest(value.setDigest)) return false;

  const used = new Set<string>();
  for (const entry of value.suggestions) {
    if (!isRecord(entry) || !hasOnlyKeys(entry, [
      "suggestionVersion", "suggestionId", "kind", "title", "scenario",
      "expectedObservation", "syntheticLabel", "authorityLabel", "evidenceStatus",
      "citationIds"
    ]) || entry.suggestionVersion !== "synthetic-edge-case-suggestion.v1" ||
      !isDigest(entry.suggestionId) || typeof entry.kind !== "string" ||
      !SYNTHETIC_EDGE_CASE_KINDS.has(entry.kind) ||
      ![entry.title, entry.scenario, entry.expectedObservation].every(
        (text) => typeof text === "string" && text.length >= 1 && text.length <= 2048 &&
          !PRIVATE_PATH_PATTERN.test(text)
      ) || entry.syntheticLabel !== "SYNTHETIC" ||
      entry.authorityLabel !== "ADVISORY_ONLY" ||
      entry.evidenceStatus !== "NOT_EVIDENCE" ||
      !uniqueCitationIds(entry.citationIds) ||
      (entry.citationIds as readonly string[]).length > 16 ||
      !(entry.citationIds as readonly string[]).every((id) => allowed.has(id))) {
      return false;
    }
    for (const id of entry.citationIds as readonly string[]) used.add(id);
  }

  const registryIds: string[] = [];
  for (const entry of value.citations) {
    if (!isRecord(entry) || !hasOnlyKeys(entry, ["citationId", "locator", "itemDigest"]) ||
      !isCitationId(entry.citationId) || !allowed.has(entry.citationId) ||
      !isDigest(entry.itemDigest) || !isRecord(entry.locator) ||
      !hasOnlyKeys(entry.locator, ["locatorVersion", "itemKind", "itemKey"]) ||
      entry.locator.locatorVersion !== "evidence-pack-citation-locator.v1" ||
      typeof entry.locator.itemKind !== "string" ||
      !ITEM_KINDS.has(entry.locator.itemKind) ||
      typeof entry.locator.itemKey !== "string") return false;
    registryIds.push(entry.citationId);
  }
  return registryIds.length === used.size &&
    new Set(registryIds).size === registryIds.length &&
    registryIds.every((id) => used.has(id));
}

export function isCitedExplanationResponse(
  value: unknown
): value is CitedExplanationResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "apiVersion", "missionId", "question", "execution", "disclosure",
    "offlineExplanation", "syntheticEdgeCases", "citationDetails"
  ], ["advisory"]) || value.apiVersion !== "v2" || !isUuid(value.missionId) ||
    typeof value.question !== "string" ||
    !(CITED_EXPLANATION_QUESTIONS as readonly string[]).includes(value.question) ||
    !isRecord(value.execution) || !hasOnlyKeys(value.execution, [
      "primaryExplanation", "externalAiStatus", "providerOutcome", "externalCallMade",
      "canonicalStateChanged", "authority"
    ], ["failureCode"]) ||
    value.execution.primaryExplanation !== "DETERMINISTIC_EXPLANATION" ||
    value.execution.externalAiStatus !== "OFF" ||
    typeof value.execution.providerOutcome !== "string" ||
    !(CITED_EXPLANATION_PROVIDER_OUTCOMES as readonly string[]).includes(
      value.execution.providerOutcome
    ) || value.execution.externalCallMade !== false ||
    value.execution.canonicalStateChanged !== false ||
    value.execution.authority !== "ADVISORY_ONLY_NO_RELEASE_DECISION" ||
    !disclosure(value.disclosure) || !Array.isArray(value.citationDetails) ||
    value.citationDetails.length < 1 || value.citationDetails.length > 256 ||
    !value.citationDetails.every(citationDetail)) return false;

  const detailIds = value.citationDetails.map((entry) => entry.citationId as string);
  if (new Set(detailIds).size !== detailIds.length) return false;
  const allowed = new Set(detailIds);
  let pack: JsonRecord;
  try {
    const parsed = JSON.parse(value.disclosure.exactRedactedPackJson as string);
    if (!isRecord(parsed)) return false;
    pack = parsed;
  } catch {
    return false;
  }
  const packAllowed = new Set(pack.allowedCitationIds as readonly string[]);
  if (!detailIds.every((id) => packAllowed.has(id)) ||
    !offlineExplanation(
      value.offlineExplanation,
      value.missionId,
      value.question,
      value.disclosure,
      allowed
    ) || !syntheticEdgeCases(
      value.syntheticEdgeCases,
      value.missionId,
      value.disclosure,
      pack,
      allowed
    )) return false;

  const outcome = value.execution.providerOutcome;
  const failureCode = value.execution.failureCode;
  if (outcome === "ADVISORY_ACCEPTED") {
    return failureCode === undefined && value.advisory !== undefined &&
      advisory(value.advisory, allowed, value.disclosure.evidencePackDigest);
  }
  if (value.advisory !== undefined || typeof failureCode !== "string" ||
    !FAILURE_CODES.has(failureCode)) return false;
  if (outcome === "DISABLED") return failureCode === "PROVIDER_DISABLED";
  return outcome === "ADVISORY_REJECTED" || outcome === "ADVISORY_UNAVAILABLE";
}

export async function createCitedExplanation(
  missionId: string,
  question: CitedExplanationQuestion,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<CitedExplanationResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/cited-explanations`,
    isCitedExplanationResponse,
    {
      method: "POST",
      body: JSON.stringify({ question }),
      ...(signal === undefined ? {} : { signal })
    }
  );
}
