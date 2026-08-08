import type {
  ReadinessAssessmentListResponse,
  ReadinessAssessmentResource,
  ReadinessAssessmentResponse,
  ReadinessAssessmentSummaryResource,
  ReleasePassportExportResponse,
  ReleasePassportListResponse,
  ReleasePassportResource,
  ReleasePassportResponse,
  ReleasePassportSummaryResource
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client.js";

type JsonRecord = Readonly<Record<string, unknown>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER_PATTERN =
  /^(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[a-z0-9][a-z0-9._:/-]{2,255}$/u;
const PRIVATE_PATH_PATTERN =
  /(?:\b[A-Za-z]:[\\/]|\\\\[^\\\s]+[\\/][^\\\s]+|\/(?:Users|home|private|var\/folders|tmp)\/)/u;
const STATUSES = new Set(["BLOCKED", "READY", "STALE"]);
const STALE_REASONS = new Set([
  "READINESS_POLICY_CHANGED", "RECONCILIATION_CHANGED", "SNAPSHOT_CHANGED",
  "FINDINGS_CHANGED", "VALIDATION_CATALOG_CHANGED", "VALIDATION_EVIDENCE_CHANGED",
  "REVIEW_CHANGED", "INTEGRITY_CHANGED", "INPUT_AUTHORITY_CHANGED",
  "PERSISTENCE_BINDING_CHANGED", "DEPENDENCY_FRESHNESS_CHANGED",
  "INPUT_FINGERPRINT_CHANGED"
]);
const OBLIGATIONS = [
  "INTEGRITY_VALID", "SCOPE_EXACT", "SNAPSHOT_CURRENT", "CRITICAL_FINDINGS_CLEAR",
  "REQUIRED_VALIDATIONS_PASS", "EXPLICIT_HUMAN_REVIEW", "DEPENDENCIES_CURRENT",
  "CANONICAL_INPUTS_ONLY", "INPUTS_PERSISTED"
] as const;
const CATEGORIES = new Set([
  "INTEGRITY", "SCOPE", "SNAPSHOT", "FINDINGS", "VALIDATIONS", "REVIEW",
  "FRESHNESS", "AUTHORITY", "PERSISTENCE"
]);
const BLOCKER_TO_OBLIGATION = Object.freeze({
  INTEGRITY_UNVERIFIED: "INTEGRITY_VALID",
  SCOPE_MISMATCH: "SCOPE_EXACT",
  SNAPSHOT_CHANGED: "SNAPSHOT_CURRENT",
  OPEN_CONFLICT: "CRITICAL_FINDINGS_CLEAR",
  OPEN_AMBIGUITY: "CRITICAL_FINDINGS_CLEAR",
  MISSING_SUPPORT: "CRITICAL_FINDINGS_CLEAR",
  OPEN_IMPACT_GAP: "CRITICAL_FINDINGS_CLEAR",
  VALIDATION_CATALOG_EMPTY: "REQUIRED_VALIDATIONS_PASS",
  VALIDATION_MISSING: "REQUIRED_VALIDATIONS_PASS",
  VALIDATION_FAILED: "REQUIRED_VALIDATIONS_PASS",
  VALIDATION_INCONCLUSIVE: "REQUIRED_VALIDATIONS_PASS",
  VALIDATION_SCOPE_UNKNOWN: "REQUIRED_VALIDATIONS_PASS",
  VALIDATION_STALE: "REQUIRED_VALIDATIONS_PASS",
  VALIDATION_AUTHORITY_INVALID: "REQUIRED_VALIDATIONS_PASS",
  REVIEW_MISSING: "EXPLICIT_HUMAN_REVIEW",
  REVIEW_NOT_HUMAN: "EXPLICIT_HUMAN_REVIEW",
  REVIEW_SCOPE_MISMATCH: "EXPLICIT_HUMAN_REVIEW",
  REVIEW_STALE: "EXPLICIT_HUMAN_REVIEW",
  DEPENDENCY_FRESHNESS_UNKNOWN: "DEPENDENCIES_CURRENT",
  DEPENDENCY_CHANGED: "DEPENDENCIES_CURRENT",
  SAMPLE_INPUT: "CANONICAL_INPUTS_ONLY",
  FALLBACK_INPUT: "CANONICAL_INPUTS_ONLY",
  AI_ADVISORY_INPUT: "CANONICAL_INPUTS_ONLY",
  INCOMPLETE_CODE_MAP: "CANONICAL_INPUTS_ONLY",
  RECONCILIATION_UNPERSISTED: "INPUTS_PERSISTED",
  VALIDATION_UNPERSISTED: "INPUTS_PERSISTED",
  REVIEW_UNPERSISTED: "INPUTS_PERSISTED"
});
const BLOCKERS = new Set(Object.keys(BLOCKER_TO_OBLIGATION));
const VALIDATION_STATUSES = new Set(["PASSED", "FAILED", "INCONCLUSIVE"]);
const ORIGINS = new Set([
  "USER_INPUT", "REPOSITORY_OBSERVATION", "VALIDATION_RESULT",
  "SYSTEM_DERIVATION", "SYNTHETIC_FIXTURE", "AI_ADVISORY"
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

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER_PATTERN.test(value);
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

function isStatus(value: unknown): boolean {
  return typeof value === "string" && STATUSES.has(value);
}

function isStaleReasons(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length <= STALE_REASONS.size &&
    value.every((entry) => typeof entry === "string" && STALE_REASONS.has(entry)) &&
    new Set(value).size === value.length;
}

function isFindingCounts(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP", "total"
  ])) return false;
  const parts = [value.CONFLICT, value.AMBIGUOUS, value.MISSING, value.STALE, value.IMPACT_GAP];
  return parts.every(isNonnegativeInteger) && isNonnegativeInteger(value.total) &&
    parts.reduce<number>((sum, part) => sum + (part as number), 0) === value.total;
}

function isObligations(value: unknown): value is readonly JsonRecord[] {
  if (!Array.isArray(value) || value.length !== OBLIGATIONS.length) return false;
  return value.every((entry, index) => {
    if (!isRecord(entry) || !hasOnlyKeys(entry, [
      "obligationId", "category", "requirement", "status", "blockerCodes"
    ]) || entry.obligationId !== OBLIGATIONS[index] || typeof entry.category !== "string" ||
      !CATEGORIES.has(entry.category) || typeof entry.requirement !== "string" ||
      entry.requirement.length < 1 || entry.requirement.length > 512 ||
      (entry.status !== "SATISFIED" && entry.status !== "UNSATISFIED") ||
      !Array.isArray(entry.blockerCodes) || entry.blockerCodes.length > BLOCKERS.size ||
      !entry.blockerCodes.every((code) => typeof code === "string" && BLOCKERS.has(code) &&
        BLOCKER_TO_OBLIGATION[code as keyof typeof BLOCKER_TO_OBLIGATION] === entry.obligationId) ||
      new Set(entry.blockerCodes).size !== entry.blockerCodes.length) return false;
    return entry.status === (entry.blockerCodes.length === 0 ? "SATISFIED" : "UNSATISFIED");
  });
}

function isBlockers(value: unknown, obligations: readonly JsonRecord[]): boolean {
  if (!Array.isArray(value) || value.length > BLOCKERS.size) return false;
  const expected = obligations.flatMap((entry) => entry.blockerCodes as readonly string[]);
  return value.length === expected.length && value.every((entry, index) =>
    isRecord(entry) && hasOnlyKeys(entry, ["code", "obligationId"]) &&
    entry.code === expected[index] && typeof entry.code === "string" && BLOCKERS.has(entry.code) &&
    entry.obligationId === BLOCKER_TO_OBLIGATION[entry.code as keyof typeof BLOCKER_TO_OBLIGATION]
  );
}

function isValidations(value: unknown, projectId: string, missionId: string): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ["requirements", "evidence"]) ||
    !Array.isArray(value.requirements) || value.requirements.length > 256 ||
    !Array.isArray(value.evidence) || value.evidence.length > 256) return false;
  const requirements = value.requirements;
  if (!requirements.every((entry) => isRecord(entry) &&
    hasOnlyKeys(entry, ["requirementId", "validationKey"]) &&
    isIdentifier(entry.requirementId) && isIdentifier(entry.validationKey))) return false;
  const byId = new Map(requirements.map((entry) => [entry.requirementId, entry.validationKey]));
  if (byId.size !== requirements.length ||
    new Set(requirements.map((entry) => entry.validationKey)).size !== requirements.length) return false;
  return value.evidence.every((entry) => isRecord(entry) && hasOnlyKeys(entry, [
    "validationResultId", "requirementId", "validationKey", "projectId", "missionId",
    "snapshotId", "status", "origin", "resultDigest", "persistence"
  ]) && isUuid(entry.validationResultId) && isIdentifier(entry.requirementId) &&
    isIdentifier(entry.validationKey) && byId.get(entry.requirementId) === entry.validationKey &&
    entry.projectId === projectId && entry.missionId === missionId && isUuid(entry.snapshotId) &&
    typeof entry.status === "string" && VALIDATION_STATUSES.has(entry.status) &&
    typeof entry.origin === "string" && ORIGINS.has(entry.origin) && isDigest(entry.resultDigest) &&
    entry.persistence === "PERSISTED");
}

function isReview(value: unknown, projectId: string, missionId: string): boolean {
  if (!isRecord(value)) return false;
  if (value.status === "MISSING") return hasOnlyKeys(value, ["status"]);
  return hasOnlyKeys(value, [
    "status", "reviewId", "actorKind", "projectId", "missionId", "snapshotId",
    "reconciliationResultDigest", "reviewDigest", "persistence"
  ]) && value.status === "RECORDED" && isUuid(value.reviewId) &&
    (value.actorKind === "HUMAN" || value.actorKind === "AI_ADVISORY") &&
    value.projectId === projectId && value.missionId === missionId && isUuid(value.snapshotId) &&
    isDigest(value.reconciliationResultDigest) && isDigest(value.reviewDigest) &&
    value.persistence === "PERSISTED";
}

function isAssessmentSummary(value: unknown): value is ReadinessAssessmentSummaryResource {
  return isRecord(value) && hasOnlyKeys(value, [
    "assessmentId", "revision", "recordedAtUtc", "evaluatedStatus", "currentStatus",
    "staleReasons", "assessmentDigest", "stateDigest"
  ]) && isUuid(value.assessmentId) && isPositiveInteger(value.revision) &&
    isTimestamp(value.recordedAtUtc) && isStatus(value.evaluatedStatus) &&
    isStatus(value.currentStatus) && isStaleReasons(value.staleReasons) &&
    (value.currentStatus === "STALE" || value.staleReasons.length === 0) &&
    isDigest(value.assessmentDigest) && isDigest(value.stateDigest);
}

export function isReadinessAssessmentResource(
  value: unknown,
  expectedMissionId?: string
): value is ReadinessAssessmentResource {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "assessmentId", "revision", "recordedAtUtc", "evaluatedStatus", "currentStatus",
    "staleReasons", "assessmentDigest", "stateDigest", "version", "projectId", "missionId",
    "inputFingerprint", "snapshot", "reconciliation", "rule", "obligations", "blockers",
    "findings", "validations", "review", "authority"
  ], ["predecessor"]) || !isAssessmentSummary({
    assessmentId: value.assessmentId, revision: value.revision, recordedAtUtc: value.recordedAtUtc,
    evaluatedStatus: value.evaluatedStatus, currentStatus: value.currentStatus,
    staleReasons: value.staleReasons, assessmentDigest: value.assessmentDigest,
    stateDigest: value.stateDigest
  }) || value.version !== "release-assessment.v1" || !isUuid(value.projectId) ||
    !isUuid(value.missionId) || (expectedMissionId !== undefined && value.missionId !== expectedMissionId) ||
    !isRecord(value.inputFingerprint) || !hasOnlyKeys(value.inputFingerprint, ["evaluatedDigest", "currentDigest"]) ||
    !isDigest(value.inputFingerprint.evaluatedDigest) || !isDigest(value.inputFingerprint.currentDigest) ||
    !isRecord(value.snapshot) || !hasOnlyKeys(value.snapshot, ["targetSnapshotId", "currentSnapshotIdAtAssessment"]) ||
    !isUuid(value.snapshot.targetSnapshotId) || !isUuid(value.snapshot.currentSnapshotIdAtAssessment) ||
    !isRecord(value.reconciliation) || !hasOnlyKeys(value.reconciliation, ["revision", "revisionKey", "resultDigest"]) ||
    !isPositiveInteger(value.reconciliation.revision) || !isDigest(value.reconciliation.revisionKey) ||
    !isDigest(value.reconciliation.resultDigest) || !isRecord(value.rule) ||
    !hasOnlyKeys(value.rule, ["policyVersion", "policyDigest"]) || value.rule.policyVersion !== "readiness.v1" ||
    !isDigest(value.rule.policyDigest) || !isObligations(value.obligations) ||
    !isBlockers(value.blockers, value.obligations) || !isFindingCounts(value.findings) ||
    !isValidations(value.validations, value.projectId, value.missionId) ||
    !isReview(value.review, value.projectId, value.missionId) || !isRecord(value.authority) ||
    !hasOnlyKeys(value.authority, [
      "assessmentPersistence", "readinessStatusAuthority", "currentStateDerivation",
      "storedAssessmentChanged", "releaseApproval", "releasePassport", "deploymentAuthority", "aiAuthority"
    ]) || value.authority.assessmentPersistence !== "PERSISTED_IMMUTABLE" ||
    value.authority.readinessStatusAuthority !== "DETERMINISTIC_ASSESSMENT" ||
    value.authority.currentStateDerivation !== "EXACT_DEPENDENCY_COMPARISON" ||
    value.authority.storedAssessmentChanged !== false || value.authority.releaseApproval !== false ||
    value.authority.releasePassport !== false || value.authority.deploymentAuthority !== false ||
    value.authority.aiAuthority !== "NONE") return false;
  const resourceRevision = value.revision as number;
  if (value.predecessor !== undefined && (!isRecord(value.predecessor) ||
    !hasOnlyKeys(value.predecessor, ["assessmentId", "revision", "assessmentDigest"]) ||
    !isUuid(value.predecessor.assessmentId) || !isPositiveInteger(value.predecessor.revision) ||
    value.predecessor.revision !== resourceRevision - 1 || !isDigest(value.predecessor.assessmentDigest))) return false;
  return !PRIVATE_PATH_PATTERN.test(JSON.stringify(value));
}

function isPassportSummary(value: unknown): value is ReleasePassportSummaryResource {
  return isRecord(value) && hasOnlyKeys(value, [
    "passportId", "assessmentId", "assessmentRevision", "recordedAtUtc", "statusAtProjection",
    "currentStatus", "staleReasons", "passportDigest", "stateDigest"
  ]) && isUuid(value.passportId) && isUuid(value.assessmentId) &&
    isPositiveInteger(value.assessmentRevision) && isTimestamp(value.recordedAtUtc) &&
    isStatus(value.statusAtProjection) && isStatus(value.currentStatus) &&
    isStaleReasons(value.staleReasons) &&
    (value.currentStatus === "STALE" || value.staleReasons.length === 0) &&
    isDigest(value.passportDigest) && isDigest(value.stateDigest);
}

function isCitation(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "ASSESSMENT" || value.kind === "VALIDATION_RESULT" || value.kind === "READINESS_REVIEW") {
    return hasOnlyKeys(value, ["kind", "referenceId", "referenceDigest"]) &&
      isUuid(value.referenceId) && isDigest(value.referenceDigest);
  }
  if (value.kind === "RECONCILIATION") {
    return hasOnlyKeys(value, ["kind", "referenceId", "referenceRevision", "referenceDigest"]) &&
      isDigest(value.referenceId) && isPositiveInteger(value.referenceRevision) && isDigest(value.referenceDigest);
  }
  return (value.kind === "TARGET_SNAPSHOT" || value.kind === "CURRENT_SNAPSHOT") &&
    hasOnlyKeys(value, ["kind", "referenceId"]) && isUuid(value.referenceId);
}

export function isReleasePassportResource(
  value: unknown,
  expectedMissionId?: string
): value is ReleasePassportResource {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "passportId", "assessmentId", "assessmentRevision", "recordedAtUtc", "statusAtProjection",
    "currentStatus", "staleReasons", "passportDigest", "stateDigest", "version",
    "projectionVersion", "passportKey", "projectId", "missionId", "assessment", "snapshot",
    "rule", "evidenceDigest", "obligations", "blockers", "findings", "validations", "review",
    "citations", "authority"
  ]) || !isPassportSummary({
    passportId: value.passportId, assessmentId: value.assessmentId,
    assessmentRevision: value.assessmentRevision, recordedAtUtc: value.recordedAtUtc,
    statusAtProjection: value.statusAtProjection, currentStatus: value.currentStatus,
    staleReasons: value.staleReasons, passportDigest: value.passportDigest, stateDigest: value.stateDigest
  }) || value.version !== "release-passport.v1" ||
    value.projectionVersion !== "release-passport-projection.v1" || !isDigest(value.passportKey) ||
    !isUuid(value.projectId) || !isUuid(value.missionId) ||
    (expectedMissionId !== undefined && value.missionId !== expectedMissionId) ||
    !isRecord(value.assessment) || !hasOnlyKeys(value.assessment, [
      "assessmentId", "revision", "assessmentDigest", "inputFingerprintDigest"
    ]) || value.assessment.assessmentId !== value.assessmentId ||
    value.assessment.revision !== value.assessmentRevision || !isDigest(value.assessment.assessmentDigest) ||
    !isDigest(value.assessment.inputFingerprintDigest) || !isRecord(value.snapshot) ||
    !hasOnlyKeys(value.snapshot, ["targetSnapshotId", "currentSnapshotId"]) ||
    !isUuid(value.snapshot.targetSnapshotId) || !isUuid(value.snapshot.currentSnapshotId) ||
    !isRecord(value.rule) || !hasOnlyKeys(value.rule, ["policyVersion", "policyDigest"]) ||
    value.rule.policyVersion !== "readiness.v1" || !isDigest(value.rule.policyDigest) ||
    value.evidenceDigest !== value.assessment.inputFingerprintDigest || !isObligations(value.obligations) ||
    !isBlockers(value.blockers, value.obligations) || !isFindingCounts(value.findings) ||
    !isValidations(value.validations, value.projectId, value.missionId) ||
    !isReview(value.review, value.projectId, value.missionId) || !Array.isArray(value.citations) ||
    value.citations.length < 4 || value.citations.length > 262 || !value.citations.every(isCitation) ||
    !isRecord(value.authority) || !hasOnlyKeys(value.authority, [
      "source", "projection", "historicalRecord", "stateAssociation", "passportChanged",
      "readinessRecomputed", "signed", "releaseApproval", "deploymentAuthority", "aiAuthority"
    ]) || value.authority.source !== "ONE_PERSISTED_RELEASE_ASSESSMENT" ||
    value.authority.projection !== "REPRODUCED_NOT_RECOMPUTED" ||
    value.authority.historicalRecord !== "IMMUTABLE" ||
    value.authority.stateAssociation !== "ASSESSMENT_STATE_REFERENCE" ||
    value.authority.passportChanged !== false || value.authority.readinessRecomputed !== false ||
    value.authority.signed !== false || value.authority.releaseApproval !== false ||
    value.authority.deploymentAuthority !== false || value.authority.aiAuthority !== "NONE") return false;
  const assessmentCitation = value.citations[0];
  return isRecord(assessmentCitation) && assessmentCitation.kind === "ASSESSMENT" &&
    assessmentCitation.referenceId === value.assessmentId &&
    assessmentCitation.referenceDigest === value.assessment.assessmentDigest &&
    !PRIVATE_PATH_PATTERN.test(JSON.stringify(value));
}

export function isReadinessAssessmentResponse(value: unknown): value is ReadinessAssessmentResponse {
  return isRecord(value) && hasOnlyKeys(value, ["apiVersion", "assessment"], ["created"]) &&
    value.apiVersion === "v1" && (value.created === undefined || typeof value.created === "boolean") &&
    isReadinessAssessmentResource(value.assessment);
}

export function isReadinessAssessmentListResponse(value: unknown): value is ReadinessAssessmentListResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ["apiVersion", "missionId", "assessments", "page"]) ||
    value.apiVersion !== "v1" || !isUuid(value.missionId) || !Array.isArray(value.assessments) ||
    value.assessments.length > 100 || !value.assessments.every(isAssessmentSummary) ||
    !isRecord(value.page) || !hasOnlyKeys(value.page, ["limit", "nextCursor"]) ||
    !isPositiveInteger(value.page.limit) || value.page.limit > 100 ||
    !(value.page.nextCursor === null || isPositiveInteger(value.page.nextCursor))) return false;
  const assessments = value.assessments as readonly ReadinessAssessmentSummaryResource[];
  return assessments.every((item, index) => index === 0 ||
    item.revision < (assessments[index - 1] as ReadinessAssessmentSummaryResource).revision);
}

export function isReleasePassportResponse(value: unknown): value is ReleasePassportResponse {
  return isRecord(value) && hasOnlyKeys(value, ["apiVersion", "passport"], ["created"]) &&
    value.apiVersion === "v1" && (value.created === undefined || typeof value.created === "boolean") &&
    isReleasePassportResource(value.passport);
}

export function isReleasePassportListResponse(value: unknown): value is ReleasePassportListResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ["apiVersion", "missionId", "passports", "page"]) ||
    value.apiVersion !== "v1" || !isUuid(value.missionId) || !Array.isArray(value.passports) ||
    value.passports.length > 100 || !value.passports.every(isPassportSummary) ||
    !isRecord(value.page) || !hasOnlyKeys(value.page, ["limit", "nextCursor"]) ||
    !isPositiveInteger(value.page.limit) || value.page.limit > 100 ||
    !(value.page.nextCursor === null || isPositiveInteger(value.page.nextCursor))) return false;
  const passports = value.passports as readonly ReleasePassportSummaryResource[];
  return passports.every((item, index) => index === 0 ||
    item.assessmentRevision < (passports[index - 1] as ReleasePassportSummaryResource).assessmentRevision);
}

export function isReleasePassportExportResponse(value: unknown): value is ReleasePassportExportResponse {
  return isRecord(value) && hasOnlyKeys(value, [
    "apiVersion", "exportVersion", "contentClassification", "passport", "safety", "warnings"
  ]) && value.apiVersion === "v1" && value.exportVersion === "release-passport-export.v1" &&
    value.contentClassification === "CONTROLLED_STRUCTURAL_METADATA" &&
    isReleasePassportResource(value.passport) && isRecord(value.safety) &&
    hasOnlyKeys(value.safety, [
      "containsSourceBodies", "containsAbsolutePaths", "containsCredentials",
      "signed", "releaseApproval", "deploymentAuthority"
    ]) && Object.values(value.safety).every((entry) => entry === false) &&
    Array.isArray(value.warnings) && value.warnings.length === 3 &&
    value.warnings[0] === "UNSIGNED_LOCAL_RECORD" &&
    value.warnings[1] === "NOT_RELEASE_APPROVAL" &&
    value.warnings[2] === "VERIFY_CURRENT_STATUS_BEFORE_USE" &&
    !PRIVATE_PATH_PATTERN.test(JSON.stringify(value));
}

function withSignal(signal?: AbortSignal): RequestInit {
  return signal === undefined ? {} : { signal };
}

export async function listReadinessAssessments(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReadinessAssessmentListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/assessments?limit=100`,
    (value): value is ReadinessAssessmentListResponse =>
      isReadinessAssessmentListResponse(value) && value.missionId === missionId,
    withSignal(signal)
  );
}

export async function getReadinessAssessment(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReadinessAssessmentResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/assessments/${revision}`,
    (value): value is ReadinessAssessmentResponse =>
      isReadinessAssessmentResponse(value) && value.assessment.missionId === missionId &&
      value.assessment.revision === revision,
    withSignal(signal)
  );
}

export async function createReadinessAssessment(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<ReadinessAssessmentResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/assessments`,
    (value): value is ReadinessAssessmentResponse =>
      isReadinessAssessmentResponse(value) && value.assessment.missionId === missionId &&
      typeof value.created === "boolean",
    { method: "POST", body: "{}" }
  );
}

export async function listReleasePassports(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReleasePassportListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/passports?limit=100`,
    (value): value is ReleasePassportListResponse =>
      isReleasePassportListResponse(value) && value.missionId === missionId,
    withSignal(signal)
  );
}

export async function getReleasePassport(
  missionId: string,
  assessmentRevision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReleasePassportResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/passports/${assessmentRevision}`,
    (value): value is ReleasePassportResponse => isReleasePassportResponse(value) &&
      value.passport.missionId === missionId && value.passport.assessmentRevision === assessmentRevision,
    withSignal(signal)
  );
}

export async function createReleasePassport(
  missionId: string,
  assessmentRevision: number,
  fetcher: typeof fetch = globalThis.fetch
): Promise<ReleasePassportResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/assessments/${assessmentRevision}/passport`,
    (value): value is ReleasePassportResponse => isReleasePassportResponse(value) &&
      value.passport.missionId === missionId && value.passport.assessmentRevision === assessmentRevision &&
      typeof value.created === "boolean",
    { method: "POST", body: "{}" }
  );
}

export async function getReleasePassportExport(
  missionId: string,
  assessmentRevision: number,
  fetcher: typeof fetch = globalThis.fetch
): Promise<ReleasePassportExportResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${missionId}/readiness/passports/${assessmentRevision}/export`,
    (value): value is ReleasePassportExportResponse => isReleasePassportExportResponse(value) &&
      value.passport.missionId === missionId && value.passport.assessmentRevision === assessmentRevision
  );
}
