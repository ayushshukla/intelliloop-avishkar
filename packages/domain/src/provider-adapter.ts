import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import {
  assertEvidencePackInvariant,
  evidencePackTokenUpperBound,
  parseEvidencePackCitationId,
  resolveEvidencePackCitation,
  type EvidencePack,
  type EvidencePackCitationId
} from "./evidence-pack.js";
import { prepareEvidenceImport } from "./evidence-import.js";
import {
  renderOfflineExplanation,
  type OfflineExplanation
} from "./offline-explanation.js";
import type { MissionId, ProjectId } from "./project.js";
import { parseStableId, type StableId } from "./stable-id.js";

export const PROVIDER_ADAPTER_POLICY_VERSION =
  "provider-adapter-policy.v1" as const;
export const PROVIDER_ADAPTER_REQUEST_VERSION =
  "provider-adapter-request.v1" as const;
export const PROVIDER_ADVISORY_RESPONSE_VERSION =
  "provider-advisory-response.v1" as const;
export const PROVIDER_ADVISORY_VALIDATION_VERSION =
  "provider-advisory-validation.v1" as const;
export const PROVIDER_ADAPTER_EXECUTION_VERSION =
  "provider-adapter-execution.v1" as const;
export const PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION =
  "provider-advisory-output-schema.v1" as const;

export const MAXIMUM_PROVIDER_ADVISORY_RESPONSE_BYTES = 16_384;
export const MAXIMUM_PROVIDER_ADVISORY_STATEMENTS = 256;
export const MAXIMUM_PROVIDER_ADVISORY_STATEMENT_BYTES = 4_096;
export const MAXIMUM_PROVIDER_ADVISORY_CITATIONS_PER_STATEMENT = 64;

export const DEFAULT_PROVIDER_ADAPTER_LIMITS = Object.freeze({
  timeoutMs: 20_000,
  maxRetries: 1,
  maxConcurrentRequests: 1,
  maxInputTokens: 12_000,
  maxOutputTokens: 1_200,
  sessionTokenBudget: 50_000
});

export const PROVIDER_ADAPTER_MODES = [
  "DISABLED",
  "MOCK_VALIDATION"
] as const;

export const PROVIDER_ADAPTER_FAILURE_CODES = [
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
] as const;

export const PROVIDER_ADAPTER_ERROR_CODES = [
  "PROVIDER_ADAPTER_INPUT_INVALID",
  "PROVIDER_ADAPTER_POLICY_INVALID"
] as const;

export type ProviderAdapterMode = (typeof PROVIDER_ADAPTER_MODES)[number];
export type ProviderAdapterFailureCode =
  (typeof PROVIDER_ADAPTER_FAILURE_CODES)[number];
export type ProviderAdapterErrorCode =
  (typeof PROVIDER_ADAPTER_ERROR_CODES)[number];
export type ProviderRequestId = StableId<"PROVIDER_REQUEST">;

export interface ProviderAdapterLimits {
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly maxConcurrentRequests: 1;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly sessionTokenBudget: number;
}

export interface ProviderAdapterRequest {
  readonly requestVersion: typeof PROVIDER_ADAPTER_REQUEST_VERSION;
  readonly policyVersion: typeof PROVIDER_ADAPTER_POLICY_VERSION;
  readonly policyDigest: Sha256Digest;
  readonly requestId: ProviderRequestId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly question: string;
  readonly questionDigest: Sha256Digest;
  readonly redactedEvidencePack: EvidencePack;
  readonly evidencePackDigest: Sha256Digest;
  readonly allowedCitationIds: readonly EvidencePackCitationId[];
  readonly outputSchemaVersion: typeof PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION;
  readonly outputSchemaDigest: Sha256Digest;
  readonly outputSchema: JsonValue;
  readonly limits: ProviderAdapterLimits;
  readonly requestDigest: Sha256Digest;
}

export interface ProviderAdvisoryStatement {
  readonly text: string;
  readonly citationIds: readonly EvidencePackCitationId[];
}

export interface ProviderMetadata {
  readonly providerId: string;
  readonly modelId: string;
  readonly responseId: string;
  readonly executionKind: "MOCK_VALIDATION";
}

export interface ProviderUsageMetadata {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly source: "PROVIDER_REPORTED";
}

export interface ProviderAdvisoryResponse {
  readonly responseVersion: typeof PROVIDER_ADVISORY_RESPONSE_VERSION;
  readonly requestId: ProviderRequestId;
  readonly providerRequestDigest: Sha256Digest;
  readonly evidencePackDigest: Sha256Digest;
  readonly outputSchemaVersion: typeof PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION;
  readonly answer: ProviderAdvisoryStatement;
  readonly facts: readonly ProviderAdvisoryStatement[];
  readonly inferences: readonly ProviderAdvisoryStatement[];
  readonly conflicts: readonly ProviderAdvisoryStatement[];
  readonly gaps: readonly ProviderAdvisoryStatement[];
  readonly nextActions: readonly ProviderAdvisoryStatement[];
  readonly citations: readonly EvidencePackCitationId[];
  readonly providerMetadata: ProviderMetadata;
  readonly usageMetadata: ProviderUsageMetadata;
}

export interface ValidatedProviderAdvisoryResponse {
  readonly validationVersion: typeof PROVIDER_ADVISORY_VALIDATION_VERSION;
  readonly response: ProviderAdvisoryResponse;
  readonly responseDigest: Sha256Digest;
}

export interface MockProviderTransport {
  readonly transportKind: "MOCK_VALIDATION";
  readonly providerId: string;
  readonly modelId: string;
  execute(request: ProviderAdapterRequest, signal: AbortSignal): Promise<unknown>;
}

export interface ProviderAdapterFailure {
  readonly code: ProviderAdapterFailureCode;
  readonly retryable: false;
}

export interface ProviderAdapterBudgetSnapshot {
  readonly limit: number;
  readonly consumed: number;
  readonly remaining: number;
}

export interface ProviderAdapterExecutionMetrics {
  readonly attempts: number;
  readonly retries: number;
  readonly elapsedMs: number;
  readonly chargedSessionTokenUnits: number;
  readonly budgetBefore: ProviderAdapterBudgetSnapshot;
  readonly budgetAfter: ProviderAdapterBudgetSnapshot;
}

export interface ProviderAdapterExecution {
  readonly executionVersion: typeof PROVIDER_ADAPTER_EXECUTION_VERSION;
  readonly status: "OFFLINE_FALLBACK" | "MOCK_ADVISORY_ACCEPTED";
  readonly execution: {
    readonly adapterMode: ProviderAdapterMode;
    readonly transportKind: "NONE" | "MOCK_VALIDATION";
    readonly externalCallMade: false;
  };
  readonly request: ProviderAdapterRequest;
  readonly offlineExplanation: OfflineExplanation;
  readonly advisory?: ValidatedProviderAdvisoryResponse;
  readonly failure?: ProviderAdapterFailure;
  readonly metrics: ProviderAdapterExecutionMetrics;
}

export interface ProviderAdapterSession {
  execute(input: {
    readonly requestId: string;
    readonly evidencePack: EvidencePack;
  }): Promise<ProviderAdapterExecution>;
  budget(): ProviderAdapterBudgetSnapshot;
}

export interface CreateProviderAdapterOptions {
  readonly mode?: ProviderAdapterMode;
  readonly transport?: MockProviderTransport;
  readonly limits?: Partial<ProviderAdapterLimits>;
  readonly nowMilliseconds?: () => number;
}

const ERROR_MESSAGES: Readonly<Record<ProviderAdapterErrorCode, string>> =
  Object.freeze({
    PROVIDER_ADAPTER_INPUT_INVALID: "Provider-adapter input is invalid.",
    PROVIDER_ADAPTER_POLICY_INVALID: "Provider-adapter policy is invalid."
  });

export class ProviderAdapterError extends Error {
  readonly code: ProviderAdapterErrorCode;

  constructor(code: ProviderAdapterErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}

class ResponseValidationError extends Error {
  readonly code: ProviderAdapterFailureCode;

  constructor(code: ProviderAdapterFailureCode) {
    super(code);
    this.name = "ResponseValidationError";
    this.code = code;
  }
}

const UTF8_ENCODER = new TextEncoder();
const SAFE_METADATA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const PRIVATE_ABSOLUTE_PATH_PATTERN =
  /(?:\b[A-Za-z]:[\\/]|\\\\[^\\\s]+[\\/][^\\\s]+|\/(?:Users|home|private|var\/folders|tmp)\/)/u;
const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "approval",
  "approved",
  "findingmutation",
  "passport",
  "readiness",
  "readinessstatus",
  "releaseapproval",
  "releaseverdict",
  "waived",
  "waiver"
]);

function deepFreezeJson<T extends JsonValue>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      deepFreezeJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

const CITATION_SCHEMA = {
  type: "array",
  minItems: 1,
  maxItems: MAXIMUM_PROVIDER_ADVISORY_CITATIONS_PER_STATEMENT,
  uniqueItems: true,
  items: { type: "string", pattern: "^cite:[0-9a-f]{64}$" }
} as const;

const STATEMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["text", "citationIds"],
  properties: {
    text: { type: "string", minLength: 1 },
    citationIds: CITATION_SCHEMA
  }
} as const;

export const PROVIDER_ADVISORY_OUTPUT_SCHEMA = deepFreezeJson({
  title: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
  type: "object",
  additionalProperties: false,
  required: [
    "responseVersion",
    "requestId",
    "providerRequestDigest",
    "evidencePackDigest",
    "outputSchemaVersion",
    "answer",
    "facts",
    "inferences",
    "conflicts",
    "gaps",
    "nextActions",
    "citations",
    "providerMetadata",
    "usageMetadata"
  ],
  properties: {
    responseVersion: { const: PROVIDER_ADVISORY_RESPONSE_VERSION },
    requestId: {
      type: "string",
      pattern:
        "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    providerRequestDigest: {
      type: "string",
      pattern: "^sha256:[0-9a-f]{64}$"
    },
    evidencePackDigest: {
      type: "string",
      pattern: "^sha256:[0-9a-f]{64}$"
    },
    outputSchemaVersion: { const: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION },
    answer: STATEMENT_SCHEMA,
    facts: {
      type: "array",
      maxItems: MAXIMUM_PROVIDER_ADVISORY_STATEMENTS,
      items: STATEMENT_SCHEMA
    },
    inferences: {
      type: "array",
      maxItems: MAXIMUM_PROVIDER_ADVISORY_STATEMENTS,
      items: STATEMENT_SCHEMA
    },
    conflicts: {
      type: "array",
      maxItems: MAXIMUM_PROVIDER_ADVISORY_STATEMENTS,
      items: STATEMENT_SCHEMA
    },
    gaps: {
      type: "array",
      maxItems: MAXIMUM_PROVIDER_ADVISORY_STATEMENTS,
      items: STATEMENT_SCHEMA
    },
    nextActions: {
      type: "array",
      maxItems: MAXIMUM_PROVIDER_ADVISORY_STATEMENTS,
      items: STATEMENT_SCHEMA
    },
    citations: CITATION_SCHEMA,
    providerMetadata: {
      type: "object",
      additionalProperties: false,
      required: ["providerId", "modelId", "responseId", "executionKind"],
      properties: {
        providerId: {
          type: "string",
          pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"
        },
        modelId: {
          type: "string",
          pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"
        },
        responseId: {
          type: "string",
          pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"
        },
        executionKind: { const: "MOCK_VALIDATION" }
      }
    },
    usageMetadata: {
      type: "object",
      additionalProperties: false,
      required: ["inputTokens", "outputTokens", "totalTokens", "source"],
      properties: {
        inputTokens: { type: "integer", minimum: 0 },
        outputTokens: { type: "integer", minimum: 0 },
        totalTokens: { type: "integer", minimum: 0 },
        source: { const: "PROVIDER_REPORTED" }
      }
    }
  }
} as unknown as JsonValue);

function inputFail(code: ProviderAdapterErrorCode): never {
  throw new ProviderAdapterError(code);
}

function responseFail(code: ProviderAdapterFailureCode): never {
  throw new ResponseValidationError(code);
}

function utf8Bytes(value: string): number {
  return UTF8_ENCODER.encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  code: ProviderAdapterFailureCode = "PROVIDER_RESPONSE_SCHEMA_INVALID"
): Record<string, unknown> {
  if (!isRecord(value)) return responseFail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    return responseFail(code);
  }
  return value;
}

function containsForbiddenAuthorityKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenAuthorityKey);
  }
  if (!isRecord(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/gu, "");
    if (FORBIDDEN_AUTHORITY_KEYS.has(normalized)) return true;
    if (containsForbiddenAuthorityKey(child)) return true;
  }
  return false;
}

function safeMetadata(value: unknown): string {
  if (typeof value !== "string" || !SAFE_METADATA_PATTERN.test(value)) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  return value;
}

function safeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  return value as number;
}

async function safeText(value: unknown): Promise<string> {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value !== value.normalize("NFC").trim() ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) ||
    utf8Bytes(value) > MAXIMUM_PROVIDER_ADVISORY_STATEMENT_BYTES
  ) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  if (PRIVATE_ABSOLUTE_PATH_PATTERN.test(value)) {
    return responseFail("PROVIDER_RESPONSE_CONTENT_UNSAFE");
  }
  try {
    const prepared = await prepareEvidenceImport({
      format: "TEXT",
      content: UTF8_ENCODER.encode(value)
    });
    if (prepared.redaction.applied || prepared.normalizedContent !== value) {
      return responseFail("PROVIDER_RESPONSE_CONTENT_UNSAFE");
    }
  } catch (error) {
    if (error instanceof ResponseValidationError) throw error;
    return responseFail("PROVIDER_RESPONSE_CONTENT_UNSAFE");
  }
  return value;
}

function adapterLimits(
  overrides: Partial<ProviderAdapterLimits> | undefined
): ProviderAdapterLimits {
  if (overrides !== undefined) {
    const allowed = new Set(Object.keys(DEFAULT_PROVIDER_ADAPTER_LIMITS));
    if (Object.keys(overrides).some((key) => !allowed.has(key))) {
      return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
    }
  }
  const limits = {
    ...DEFAULT_PROVIDER_ADAPTER_LIMITS,
    ...overrides
  };
  if (
    !Number.isSafeInteger(limits.timeoutMs) ||
    limits.timeoutMs < 1 ||
    limits.timeoutMs > DEFAULT_PROVIDER_ADAPTER_LIMITS.timeoutMs ||
    !Number.isSafeInteger(limits.maxRetries) ||
    limits.maxRetries < 0 ||
    limits.maxRetries > DEFAULT_PROVIDER_ADAPTER_LIMITS.maxRetries ||
    limits.maxConcurrentRequests !== 1 ||
    !Number.isSafeInteger(limits.maxInputTokens) ||
    limits.maxInputTokens < 1 ||
    limits.maxInputTokens > DEFAULT_PROVIDER_ADAPTER_LIMITS.maxInputTokens ||
    !Number.isSafeInteger(limits.maxOutputTokens) ||
    limits.maxOutputTokens < 1 ||
    limits.maxOutputTokens > DEFAULT_PROVIDER_ADAPTER_LIMITS.maxOutputTokens ||
    !Number.isSafeInteger(limits.sessionTokenBudget) ||
    limits.sessionTokenBudget < 1 ||
    limits.sessionTokenBudget > DEFAULT_PROVIDER_ADAPTER_LIMITS.sessionTokenBudget
  ) {
    return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
  }
  return Object.freeze(limits as ProviderAdapterLimits);
}

function transportMetadata(value: MockProviderTransport): void {
  if (
    value.transportKind !== "MOCK_VALIDATION" ||
    !SAFE_METADATA_PATTERN.test(value.providerId) ||
    !SAFE_METADATA_PATTERN.test(value.modelId) ||
    typeof value.execute !== "function"
  ) {
    return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
  }
}

async function outputSchemaDigest(): Promise<Sha256Digest> {
  return canonicalJsonDigest(PROVIDER_ADVISORY_OUTPUT_SCHEMA);
}

async function policyDigest(limits: ProviderAdapterLimits): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    policyVersion: PROVIDER_ADAPTER_POLICY_VERSION,
    outputSchemaVersion: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
    outputSchemaDigest: await outputSchemaDigest(),
    transportAuthority: "MOCK_VALIDATION_ONLY",
    externalCallsDefault: false,
    retryableFailures: ["PROVIDER_TRANSPORT_FAILED", "PROVIDER_TIMEOUT"],
    limits,
    responseBounds: {
      serializedBytes: MAXIMUM_PROVIDER_ADVISORY_RESPONSE_BYTES,
      statements: MAXIMUM_PROVIDER_ADVISORY_STATEMENTS,
      statementBytes: MAXIMUM_PROVIDER_ADVISORY_STATEMENT_BYTES,
      citationsPerStatement:
        MAXIMUM_PROVIDER_ADVISORY_CITATIONS_PER_STATEMENT
    },
    responseContent: "REJECT_SECRET_PATTERN_OR_PRIVATE_ABSOLUTE_PATH",
    readinessAuthority: "NONE"
  });
}

async function prepareRequest(
  requestIdValue: string,
  pack: EvidencePack,
  limits: ProviderAdapterLimits
): Promise<ProviderAdapterRequest> {
  try {
    await assertEvidencePackInvariant(pack);
    const requestId = parseStableId<"PROVIDER_REQUEST">(requestIdValue);
    const schemaDigest = await outputSchemaDigest();
    const withoutDigest = Object.freeze({
      requestVersion: PROVIDER_ADAPTER_REQUEST_VERSION,
      policyVersion: PROVIDER_ADAPTER_POLICY_VERSION,
      policyDigest: await policyDigest(limits),
      requestId,
      projectId: pack.projectId,
      missionId: pack.missionId,
      question: pack.question,
      questionDigest: pack.questionDigest,
      redactedEvidencePack: pack,
      evidencePackDigest: pack.packDigest,
      allowedCitationIds: pack.allowedCitationIds,
      outputSchemaVersion: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
      outputSchemaDigest: schemaDigest,
      outputSchema: PROVIDER_ADVISORY_OUTPUT_SCHEMA,
      limits
    });
    return Object.freeze({
      ...withoutDigest,
      requestDigest: await canonicalJsonDigest(withoutDigest)
    });
  } catch (error) {
    if (error instanceof ProviderAdapterError) throw error;
    return inputFail("PROVIDER_ADAPTER_INPUT_INVALID");
  }
}

async function assertPreparedRequestInvariant(
  request: ProviderAdapterRequest,
  pack: EvidencePack
): Promise<void> {
  const expected = await prepareRequest(request.requestId, pack, request.limits);
  if (canonicalizeJson(request) !== canonicalizeJson(expected)) {
    return inputFail("PROVIDER_ADAPTER_INPUT_INVALID");
  }
}

async function parseCitationIds(
  value: unknown,
  pack: EvidencePack
): Promise<readonly EvidencePackCitationId[]> {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAXIMUM_PROVIDER_ADVISORY_CITATIONS_PER_STATEMENT
  ) {
    return responseFail("PROVIDER_CITATION_INVALID");
  }
  const parsed: EvidencePackCitationId[] = [];
  const unique = new Set<string>();
  for (const citationIdValue of value) {
    try {
      const citationId = parseEvidencePackCitationId(citationIdValue);
      if (unique.has(citationId)) {
        return responseFail("PROVIDER_CITATION_INVALID");
      }
      await resolveEvidencePackCitation(pack, citationId);
      unique.add(citationId);
      parsed.push(citationId);
    } catch (error) {
      if (error instanceof ResponseValidationError) throw error;
      return responseFail("PROVIDER_CITATION_INVALID");
    }
  }
  return Object.freeze(parsed);
}

async function parseStatement(
  value: unknown,
  pack: EvidencePack
): Promise<ProviderAdvisoryStatement> {
  const record = exactRecord(value, ["text", "citationIds"]);
  return Object.freeze({
    text: await safeText(record.text),
    citationIds: await parseCitationIds(record.citationIds, pack)
  });
}

async function parseStatementArray(
  value: unknown,
  pack: EvidencePack
): Promise<readonly ProviderAdvisoryStatement[]> {
  if (!Array.isArray(value) || value.length > MAXIMUM_PROVIDER_ADVISORY_STATEMENTS) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  return Object.freeze(
    await Promise.all(value.map((entry) => parseStatement(entry, pack)))
  );
}

function parseProviderMetadata(
  value: unknown,
  expected: Pick<MockProviderTransport, "providerId" | "modelId">
): ProviderMetadata {
  const record = exactRecord(value, [
    "providerId",
    "modelId",
    "responseId",
    "executionKind"
  ]);
  const providerId = safeMetadata(record.providerId);
  const modelId = safeMetadata(record.modelId);
  if (
    providerId !== expected.providerId ||
    modelId !== expected.modelId ||
    record.executionKind !== "MOCK_VALIDATION"
  ) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  return Object.freeze({
    providerId,
    modelId,
    responseId: safeMetadata(record.responseId),
    executionKind: "MOCK_VALIDATION" as const
  });
}

function parseUsageMetadata(
  value: unknown,
  limits: ProviderAdapterLimits
): ProviderUsageMetadata {
  const record = exactRecord(value, [
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "source"
  ]);
  const inputTokens = safeInteger(record.inputTokens);
  const outputTokens = safeInteger(record.outputTokens);
  const totalTokens = safeInteger(record.totalTokens);
  if (
    record.source !== "PROVIDER_REPORTED" ||
    totalTokens !== inputTokens + outputTokens
  ) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  if (
    inputTokens > limits.maxInputTokens ||
    outputTokens > limits.maxOutputTokens ||
    totalTokens > limits.maxInputTokens + limits.maxOutputTokens
  ) {
    return responseFail("PROVIDER_USAGE_LIMIT_EXCEEDED");
  }
  return Object.freeze({
    inputTokens,
    outputTokens,
    totalTokens,
    source: "PROVIDER_REPORTED" as const
  });
}

export async function validateProviderAdvisoryResponse(
  rawResponse: unknown,
  request: ProviderAdapterRequest,
  pack: EvidencePack,
  expectedProvider: Pick<MockProviderTransport, "providerId" | "modelId">
): Promise<ValidatedProviderAdvisoryResponse> {
  await assertPreparedRequestInvariant(request, pack);
  let detached: unknown;
  try {
    const canonical = canonicalizeJson(rawResponse);
    if (utf8Bytes(canonical) > MAXIMUM_PROVIDER_ADVISORY_RESPONSE_BYTES) {
      return responseFail("PROVIDER_RESPONSE_LIMIT_EXCEEDED");
    }
    detached = JSON.parse(canonical) as unknown;
  } catch (error) {
    if (error instanceof ResponseValidationError) throw error;
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  if (containsForbiddenAuthorityKey(detached)) {
    return responseFail("PROVIDER_READINESS_AUTHORITY_INVALID");
  }
  const record = exactRecord(detached, [
    "responseVersion",
    "requestId",
    "providerRequestDigest",
    "evidencePackDigest",
    "outputSchemaVersion",
    "answer",
    "facts",
    "inferences",
    "conflicts",
    "gaps",
    "nextActions",
    "citations",
    "providerMetadata",
    "usageMetadata"
  ]);
  if (record.responseVersion !== PROVIDER_ADVISORY_RESPONSE_VERSION) {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  let responseRequestId: ProviderRequestId;
  try {
    responseRequestId = parseStableId<"PROVIDER_REQUEST">(record.requestId);
  } catch {
    return responseFail("PROVIDER_REQUEST_ID_MISMATCH");
  }
  if (responseRequestId !== request.requestId) {
    return responseFail("PROVIDER_REQUEST_ID_MISMATCH");
  }
  let providerRequestDigest: Sha256Digest;
  let evidencePackDigest: Sha256Digest;
  try {
    providerRequestDigest = parseSha256Digest(record.providerRequestDigest);
    evidencePackDigest = parseSha256Digest(record.evidencePackDigest);
  } catch {
    return responseFail("PROVIDER_RESPONSE_SCHEMA_INVALID");
  }
  if (providerRequestDigest !== request.requestDigest) {
    return responseFail("PROVIDER_REQUEST_ID_MISMATCH");
  }
  if (
    evidencePackDigest !== request.evidencePackDigest ||
    evidencePackDigest !== pack.packDigest
  ) {
    return responseFail("PROVIDER_PACK_DIGEST_MISMATCH");
  }
  if (record.outputSchemaVersion !== request.outputSchemaVersion) {
    return responseFail("PROVIDER_OUTPUT_SCHEMA_MISMATCH");
  }
  const answer = await parseStatement(record.answer, pack);
  const facts = await parseStatementArray(record.facts, pack);
  const inferences = await parseStatementArray(record.inferences, pack);
  const conflicts = await parseStatementArray(record.conflicts, pack);
  const gaps = await parseStatementArray(record.gaps, pack);
  const nextActions = await parseStatementArray(record.nextActions, pack);
  if (
    1 +
      facts.length +
      inferences.length +
      conflicts.length +
      gaps.length +
      nextActions.length >
    MAXIMUM_PROVIDER_ADVISORY_STATEMENTS
  ) {
    return responseFail("PROVIDER_RESPONSE_LIMIT_EXCEEDED");
  }
  const citations = await parseCitationIds(record.citations, pack);
  const used = new Set([
    ...answer.citationIds,
    ...facts.flatMap((value) => value.citationIds),
    ...inferences.flatMap((value) => value.citationIds),
    ...conflicts.flatMap((value) => value.citationIds),
    ...gaps.flatMap((value) => value.citationIds),
    ...nextActions.flatMap((value) => value.citationIds)
  ]);
  const expectedCitations = pack.allowedCitationIds.filter((citationId) =>
    used.has(citationId)
  );
  if (
    citations.length !== expectedCitations.length ||
    citations.some((citationId, index) => citationId !== expectedCitations[index])
  ) {
    return responseFail("PROVIDER_CITATION_INVALID");
  }
  const response = Object.freeze({
    responseVersion: PROVIDER_ADVISORY_RESPONSE_VERSION,
    requestId: responseRequestId,
    providerRequestDigest,
    evidencePackDigest,
    outputSchemaVersion: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
    answer,
    facts,
    inferences,
    conflicts,
    gaps,
    nextActions,
    citations,
    providerMetadata: parseProviderMetadata(record.providerMetadata, expectedProvider),
    usageMetadata: parseUsageMetadata(record.usageMetadata, request.limits)
  });
  return Object.freeze({
    validationVersion: PROVIDER_ADVISORY_VALIDATION_VERSION,
    response,
    responseDigest: await canonicalJsonDigest(response)
  });
}

type TransportOutcome =
  | { readonly kind: "RESPONSE"; readonly response: unknown }
  | { readonly kind: "FAILED" }
  | { readonly kind: "TIMEOUT" };

async function invokeTransport(
  transport: MockProviderTransport,
  request: ProviderAdapterRequest,
  timeoutMs: number
): Promise<TransportOutcome> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const operation: Promise<TransportOutcome> = Promise.resolve()
    .then(() => transport.execute(request, controller.signal))
    .then((response): TransportOutcome => ({ kind: "RESPONSE", response }))
    .catch((): TransportOutcome => ({ kind: "FAILED" }));
  const timeout = new Promise<TransportOutcome>((resolve) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      resolve({ kind: "TIMEOUT" });
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

function snapshotBudget(limit: number, consumed: number): ProviderAdapterBudgetSnapshot {
  return Object.freeze({
    limit,
    consumed,
    remaining: Math.max(0, limit - consumed)
  });
}

function failure(code: ProviderAdapterFailureCode): ProviderAdapterFailure {
  return Object.freeze({ code, retryable: false as const });
}

function elapsed(now: () => number, startedAt: number): number {
  const value = now() - startedAt;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function createProviderNeutralAdapter(
  options: CreateProviderAdapterOptions = {}
): ProviderAdapterSession {
  const mode = options.mode ?? "DISABLED";
  if (!PROVIDER_ADAPTER_MODES.includes(mode)) {
    return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
  }
  const limits = adapterLimits(options.limits);
  const transport = options.transport;
  if (transport !== undefined) transportMetadata(transport);
  if (mode === "MOCK_VALIDATION" && transport === undefined) {
    return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
  }
  const now = options.nowMilliseconds ?? Date.now;
  if (typeof now !== "function") {
    return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
  }
  let activeRequests = 0;
  let consumedSessionTokenUnits = 0;

  function budget(): ProviderAdapterBudgetSnapshot {
    return snapshotBudget(limits.sessionTokenBudget, consumedSessionTokenUnits);
  }

  async function execute(input: {
    readonly requestId: string;
    readonly evidencePack: EvidencePack;
  }): Promise<ProviderAdapterExecution> {
    const startedAt = now();
    const request = await prepareRequest(
      input.requestId,
      input.evidencePack,
      limits
    );
    let offlineExplanation: OfflineExplanation;
    try {
      offlineExplanation = await renderOfflineExplanation(input.evidencePack);
    } catch {
      return inputFail("PROVIDER_ADAPTER_INPUT_INVALID");
    }
    const budgetBefore = budget();
    let attempts = 0;
    let chargedSessionTokenUnits = 0;

    const complete = (
      status: ProviderAdapterExecution["status"],
      values: {
        readonly advisory?: ValidatedProviderAdvisoryResponse;
        readonly failure?: ProviderAdapterFailure;
      }
    ): ProviderAdapterExecution =>
      Object.freeze({
        executionVersion: PROVIDER_ADAPTER_EXECUTION_VERSION,
        status,
        execution: Object.freeze({
          adapterMode: mode,
          transportKind:
            mode === "MOCK_VALIDATION" ? "MOCK_VALIDATION" : "NONE",
          externalCallMade: false as const
        }),
        request,
        offlineExplanation,
        ...(values.advisory === undefined ? {} : { advisory: values.advisory }),
        ...(values.failure === undefined ? {} : { failure: values.failure }),
        metrics: Object.freeze({
          attempts,
          retries: Math.max(0, attempts - 1),
          elapsedMs: elapsed(now, startedAt),
          chargedSessionTokenUnits,
          budgetBefore,
          budgetAfter: budget()
        })
      });

    if (mode === "DISABLED") {
      return complete("OFFLINE_FALLBACK", {
        failure: failure("PROVIDER_DISABLED")
      });
    }
    if (activeRequests >= limits.maxConcurrentRequests) {
      return complete("OFFLINE_FALLBACK", {
        failure: failure("PROVIDER_CONCURRENCY_LIMIT")
      });
    }
    const inputTokenUnits = evidencePackTokenUpperBound(input.evidencePack);
    if (inputTokenUnits > limits.maxInputTokens) {
      return complete("OFFLINE_FALLBACK", {
        failure: failure("PROVIDER_INPUT_LIMIT_EXCEEDED")
      });
    }
    if (transport === undefined) {
      return inputFail("PROVIDER_ADAPTER_POLICY_INVALID");
    }

    activeRequests += 1;
    try {
      for (let attemptIndex = 0; attemptIndex <= limits.maxRetries; attemptIndex += 1) {
        const reservation = inputTokenUnits + limits.maxOutputTokens;
        if (
          consumedSessionTokenUnits + reservation >
          limits.sessionTokenBudget
        ) {
          return complete("OFFLINE_FALLBACK", {
            failure: failure("PROVIDER_SESSION_BUDGET_EXCEEDED")
          });
        }
        consumedSessionTokenUnits += reservation;
        chargedSessionTokenUnits += reservation;
        attempts += 1;
        const outcome = await invokeTransport(
          transport,
          request,
          limits.timeoutMs
        );
        if (outcome.kind === "TIMEOUT") {
          if (attemptIndex < limits.maxRetries) continue;
          return complete("OFFLINE_FALLBACK", {
            failure: failure("PROVIDER_TIMEOUT")
          });
        }
        if (outcome.kind === "FAILED") {
          if (attemptIndex < limits.maxRetries) continue;
          return complete("OFFLINE_FALLBACK", {
            failure: failure("PROVIDER_TRANSPORT_FAILED")
          });
        }
        try {
          const advisory = await validateProviderAdvisoryResponse(
            outcome.response,
            request,
            input.evidencePack,
            transport
          );
          return complete("MOCK_ADVISORY_ACCEPTED", { advisory });
        } catch (error) {
          if (error instanceof ResponseValidationError) {
            return complete("OFFLINE_FALLBACK", {
              failure: failure(error.code)
            });
          }
          return complete("OFFLINE_FALLBACK", {
            failure: failure("PROVIDER_RESPONSE_SCHEMA_INVALID")
          });
        }
      }
      return complete("OFFLINE_FALLBACK", {
        failure: failure("PROVIDER_TRANSPORT_FAILED")
      });
    } finally {
      activeRequests -= 1;
    }
  }

  return Object.freeze({ execute, budget });
}
