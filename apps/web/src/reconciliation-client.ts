import type {
  ReconciliationFindingListResponse,
  ReconciliationFindingResource,
  ReconciliationImpactPathListResponse,
  ReconciliationImpactPathResource,
  ReconciliationRevisionListResponse,
  ReconciliationRevisionResponse,
  ReconciliationRevisionSummaryResource,
  ReconciliationRunResponse,
  RunReconciliationRequest
} from "@intelliloop/contracts";

import { requestJson } from "./workspace-client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER_PATTERN =
  /^(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[a-z0-9][a-z0-9._:/-]*$/u;

const CONFLICT_REASONS = new Set(["SCALAR_VALUES_DIFFER"]);
const AMBIGUOUS_REASONS = new Set([
  "UNKNOWN_VALUE_PRESENT",
  "VALUE_TYPES_DIFFER_NO_COERCION",
  "STRUCTURED_VALUE_POLICY_REQUIRED"
]);
const DEPENDENCY_KINDS = new Set([
  "SOURCE",
  "SNAPSHOT",
  "RELATIONSHIP",
  "VALIDATION",
  "RULE_SET",
  "DECISION_POLICY",
  "REQUIREMENT_SET",
  "CLAIM_RECONCILIATION"
]);
const IMPACT_GAP_REASONS = new Set([
  "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
  "CRITICAL_IMPLEMENTATION_PATH_ABSENT",
  "REQUIRED_VALIDATION_RESULT_ABSENT",
  "REQUIRED_VALIDATION_PATH_ABSENT",
  "IMPLEMENTATION_SUPPORT_UNAVAILABLE"
]);
const ORIGINS = new Set([
  "USER_INPUT",
  "REPOSITORY_OBSERVATION",
  "VALIDATION_RESULT",
  "SYSTEM_DERIVATION",
  "SYNTHETIC_FIXTURE"
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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 3 && value.length <= 256 && IDENTIFIER_PATTERN.test(value);
}

function isBinding(value: unknown): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, ["projectionId", "revision", "projectionDigest"]) &&
    isUuid(value.projectionId) && isPositiveInteger(value.revision) &&
    isDigest(value.projectionDigest);
}

function isCodeMapBinding(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "projectionId", "revision", "projectionDigest", "evidenceKind",
    "inferenceStatus", "completeness"
  ]) || !isUuid(value.projectionId) || !isPositiveInteger(value.revision) ||
    !isDigest(value.projectionDigest)) return false;
  if (value.evidenceKind === "STATIC_INFERENCE") {
    return value.inferenceStatus === "AVAILABLE" &&
      (value.completeness === "COMPLETE" || value.completeness === "PARTIAL");
  }
  return value.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE" &&
    value.inferenceStatus === "UNAVAILABLE_SAFE_FAILURE" &&
    value.completeness === "UNAVAILABLE";
}

function isFindingCounts(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP", "total"
  ])) return false;
  const counts = [
    value.CONFLICT, value.AMBIGUOUS, value.MISSING, value.STALE, value.IMPACT_GAP
  ];
  return counts.every(isNonnegativeInteger) && isNonnegativeInteger(value.total) &&
    counts.reduce<number>((total, count) => total + (count as number), 0) === value.total;
}

export function isReconciliationRevisionSummaryResource(
  value: unknown
): value is ReconciliationRevisionSummaryResource {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "revisionKey", "version", "projectId", "missionId", "revision",
    "inputDigest", "resultDigest", "twinBinding", "targetSnapshotId",
    "codeMapBinding", "reassessmentDigest", "impactDigest", "findingCounts",
    "impactPathCount"
  ], ["predecessor"]) || !isDigest(value.revisionKey) ||
    typeof value.version !== "string" || value.version.length < 1 || value.version.length > 128 ||
    !isUuid(value.projectId) || !isUuid(value.missionId) ||
    !isPositiveInteger(value.revision) || !isDigest(value.inputDigest) ||
    !isDigest(value.resultDigest) || !isBinding(value.twinBinding) ||
    !isUuid(value.targetSnapshotId) || !isCodeMapBinding(value.codeMapBinding) ||
    !isDigest(value.reassessmentDigest) || !isDigest(value.impactDigest) ||
    !isFindingCounts(value.findingCounts) || !isNonnegativeInteger(value.impactPathCount) ||
    value.impactPathCount > 1_000) return false;
  if (value.revision === 1) return value.predecessor === undefined;
  return isRecord(value.predecessor) &&
    hasOnlyKeys(value.predecessor, ["revision", "resultDigest"]) &&
    value.predecessor.revision === value.revision - 1 &&
    isDigest(value.predecessor.resultDigest);
}

function isReference(value: unknown): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, ["kind", "memberId", "revision", "digest"]) &&
    (value.kind === "NODE" || value.kind === "RELATIONSHIP") &&
    isUuid(value.memberId) && isPositiveInteger(value.revision) && isDigest(value.digest);
}

function referenceKey(value: JsonRecord): string {
  return `${String(value.kind)}:${String(value.memberId)}:${String(value.revision)}:${String(value.digest)}`;
}

function hasReferenceIdentity(value: unknown): value is JsonRecord {
  return isRecord(value) && (value.kind === "NODE" || value.kind === "RELATIONSHIP") &&
    isUuid(value.memberId) && isPositiveInteger(value.revision) && isDigest(value.digest);
}

function referencesMatch(left: unknown, right: unknown): boolean {
  return hasReferenceIdentity(left) && hasReferenceIdentity(right) &&
    referenceKey(left) === referenceKey(right);
}

function isOrderedUniqueReferences(value: readonly unknown[]): boolean {
  return value.every((entry, index) => {
    if (!isRecord(entry) || !isReference(entry)) return false;
    if (index === 0) return true;
    const previous = value[index - 1];
    return isRecord(previous) && referenceKey(previous) < referenceKey(entry);
  });
}

function referenceArraysMatch(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((entry, index) =>
    referencesMatch(entry, right[index]));
}

function isSourceRevision(value: unknown): boolean {
  return isRecord(value) && hasOnlyKeys(value, ["kind", "value"]) &&
    ((value.kind === "CONTENT_DIGEST" && isDigest(value.value)) ||
      (value.kind === "SOURCE_REVISION" && typeof value.value === "string" &&
        value.value.length >= 1 && value.value.length <= 256));
}

function isImpactCitation(value: unknown): boolean {
  return isRecord(value) && hasOnlyKeys(value, [
    "kind", "memberId", "revision", "digest", "sourceReference",
    "sourceRevisionOrDigest", "origin", "extractionMethod", "epistemicLabel"
  ]) && (value.kind === "NODE" || value.kind === "RELATIONSHIP") &&
    isUuid(value.memberId) && isPositiveInteger(value.revision) && isDigest(value.digest) &&
    typeof value.sourceReference === "string" && value.sourceReference.length >= 1 &&
    value.sourceReference.length <= 2048 && isSourceRevision(value.sourceRevisionOrDigest) &&
    typeof value.origin === "string" && ORIGINS.has(value.origin) &&
    typeof value.extractionMethod === "string" && value.extractionMethod.length >= 1 &&
    value.extractionMethod.length <= 256 &&
    (value.epistemicLabel === "FACT" || value.epistemicLabel === "INFERENCE");
}

function isSupportRequirement(value: unknown): boolean {
  if (!isRecord(value) || !isIdentifier(value.requirementId)) return false;
  if (value.supportKind === "EVIDENCE_SOURCE") {
    return hasOnlyKeys(value, ["requirementId", "supportKind", "sourceLocator"]) &&
      typeof value.sourceLocator === "string" && value.sourceLocator.length >= 1 &&
      value.sourceLocator.length <= 512;
  }
  return value.supportKind === "VALIDATION_RESULT" &&
    hasOnlyKeys(value, ["requirementId", "supportKind", "validationKey"]) &&
    isIdentifier(value.validationKey);
}

function isImpactRequirement(value: unknown): boolean {
  if (!isRecord(value) || !isIdentifier(value.requirementId) ||
    !isIdentifier(value.rootId) || !isUuid(value.criticalAssetId) ||
    !Array.isArray(value.basisCitations) || value.basisCitations.length < 1 ||
    value.basisCitations.length > 50 || !isOrderedUniqueReferences(value.basisCitations)) return false;
  if (value.supportKind === "IMPLEMENTATION") {
    return hasOnlyKeys(value, [
      "requirementId", "rootId", "criticalAssetId", "supportKind", "basisCitations"
    ]);
  }
  return value.supportKind === "VALIDATION" && hasOnlyKeys(value, [
    "requirementId", "rootId", "criticalAssetId", "supportKind", "validationKey",
    "basisCitations"
  ]) && isIdentifier(value.validationKey);
}

function isClaimFinding(value: JsonRecord): boolean {
  return hasOnlyKeys(value, [
    "entityType", "findingKeyVersion", "findingKey", "findingKind", "status",
    "projectId", "missionId", "claimIds", "claimDigests", "comparisonKey", "reason",
    "comparisonRuleSetVersion", "comparisonRuleSetDigest", "decisionPolicyVersion",
    "decisionPolicyDigest"
  ]) && value.entityType === "ReconciliationFinding" &&
    value.findingKeyVersion === "reconciliation-finding-key.v1" && isDigest(value.findingKey) &&
    (value.findingKind === "CONFLICT" || value.findingKind === "AMBIGUOUS") &&
    value.status === "OPEN" && isUuid(value.projectId) && isUuid(value.missionId) &&
    Array.isArray(value.claimIds) && value.claimIds.length === 2 && value.claimIds.every(isUuid) &&
    (value.claimIds[0] as string) < (value.claimIds[1] as string) &&
    Array.isArray(value.claimDigests) && value.claimDigests.length === 2 &&
    value.claimDigests.every(isDigest) && isDigest(value.comparisonKey) &&
    typeof value.reason === "string" &&
    (value.findingKind === "CONFLICT"
      ? CONFLICT_REASONS.has(value.reason)
      : AMBIGUOUS_REASONS.has(value.reason)) &&
    typeof value.comparisonRuleSetVersion === "string" &&
    value.comparisonRuleSetVersion.length >= 1 && value.comparisonRuleSetVersion.length <= 128 &&
    isDigest(value.comparisonRuleSetDigest) &&
    typeof value.decisionPolicyVersion === "string" &&
    value.decisionPolicyVersion.length >= 1 && value.decisionPolicyVersion.length <= 128 &&
    isDigest(value.decisionPolicyDigest);
}

function isMissingFinding(value: JsonRecord): boolean {
  return hasOnlyKeys(value, [
    "entityType", "findingKind", "status", "findingKeyVersion", "findingKey",
    "projectId", "missionId", "requirement", "reason", "targetSnapshotId",
    "requirementsDigest", "supportPolicyVersion", "supportPolicyDigest"
  ]) && value.entityType === "ReconciliationFinding" && value.findingKind === "MISSING" &&
    value.status === "OPEN" && value.findingKeyVersion === "reconciliation-missing-finding-key.v1" &&
    isDigest(value.findingKey) && isUuid(value.projectId) && isUuid(value.missionId) &&
    isSupportRequirement(value.requirement) &&
    ((value.requirement as JsonRecord).supportKind === "EVIDENCE_SOURCE"
      ? value.reason === "REQUIRED_EVIDENCE_ABSENT"
      : value.reason === "REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT") &&
    isUuid(value.targetSnapshotId) && isDigest(value.requirementsDigest) &&
    typeof value.supportPolicyVersion === "string" && value.supportPolicyVersion.length >= 1 &&
    value.supportPolicyVersion.length <= 128 && isDigest(value.supportPolicyDigest);
}

function isDependencyChange(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "changeType", "dependencyKind", "dependencyKey"
  ], ["beforeDigest", "afterDigest"]) ||
    (value.changeType !== "ADDED" && value.changeType !== "CHANGED" &&
      value.changeType !== "REMOVED") || typeof value.dependencyKind !== "string" ||
    !DEPENDENCY_KINDS.has(value.dependencyKind) || typeof value.dependencyKey !== "string" ||
    value.dependencyKey.length < 1 || value.dependencyKey.length > 1024 ||
    (value.beforeDigest !== undefined && !isDigest(value.beforeDigest)) ||
    (value.afterDigest !== undefined && !isDigest(value.afterDigest))) return false;
  if (value.changeType === "ADDED") return value.beforeDigest === undefined && value.afterDigest !== undefined;
  if (value.changeType === "REMOVED") return value.beforeDigest !== undefined && value.afterDigest === undefined;
  return value.beforeDigest !== undefined && value.afterDigest !== undefined &&
    value.beforeDigest !== value.afterDigest;
}

function isStaleFinding(value: JsonRecord): boolean {
  return hasOnlyKeys(value, [
    "entityType", "findingKind", "status", "findingKeyVersion", "findingKey",
    "projectId", "missionId", "predecessorRevision", "predecessorDigest",
    "dependencyChanges", "reason"
  ]) && value.entityType === "ReconciliationFinding" && value.findingKind === "STALE" &&
    value.status === "OPEN" && value.findingKeyVersion === "reconciliation-stale-finding-key.v1" &&
    isDigest(value.findingKey) && isUuid(value.projectId) && isUuid(value.missionId) &&
    isPositiveInteger(value.predecessorRevision) && isDigest(value.predecessorDigest) &&
    Array.isArray(value.dependencyChanges) && value.dependencyChanges.length >= 1 &&
    value.dependencyChanges.length <= 1_000 && value.dependencyChanges.every(isDependencyChange) &&
    value.reason === "EXACT_DEPENDENCY_CHANGED";
}

function isImpactGapFinding(value: JsonRecord): boolean {
  if (!(hasOnlyKeys(value, [
    "entityType", "findingKind", "status", "findingKeyVersion", "findingKey",
    "projectId", "missionId", "requirement", "reason", "basisCitations",
    "targetSnapshotId", "traversalPolicyVersion", "traversalPolicyDigest",
    "requirementsDigest"
  ], ["criticalAsset", "supportingPathKey"]) &&
    value.entityType === "ReconciliationFinding" && value.findingKind === "IMPACT_GAP" &&
    value.status === "OPEN" && value.findingKeyVersion === "impact-gap-finding-key.v1" &&
    isDigest(value.findingKey) && isUuid(value.projectId) && isUuid(value.missionId) &&
    isImpactRequirement(value.requirement) && typeof value.reason === "string" &&
    IMPACT_GAP_REASONS.has(value.reason) && Array.isArray(value.basisCitations) &&
    value.basisCitations.length >= 1 && value.basisCitations.length <= 50 &&
    isOrderedUniqueReferences(value.basisCitations) &&
    referenceArraysMatch(
      value.basisCitations,
      (value.requirement as JsonRecord).basisCitations as readonly unknown[]
    ) &&
    (value.criticalAsset === undefined || isImpactCitation(value.criticalAsset)) &&
    (value.supportingPathKey === undefined || isDigest(value.supportingPathKey)) &&
    isUuid(value.targetSnapshotId) && typeof value.traversalPolicyVersion === "string" &&
    value.traversalPolicyVersion.length >= 1 && value.traversalPolicyVersion.length <= 128 &&
    isDigest(value.traversalPolicyDigest) && isDigest(value.requirementsDigest))) return false;
  const requirement = value.requirement as JsonRecord;
  const hasCriticalAsset = value.criticalAsset !== undefined;
  const hasSupportingPath = value.supportingPathKey !== undefined;
  if ((value.reason === "REQUIRED_VALIDATION_RESULT_ABSENT" ||
      value.reason === "REQUIRED_VALIDATION_PATH_ABSENT") &&
    requirement.supportKind !== "VALIDATION") return false;
  if (value.reason === "CRITICAL_IMPLEMENTATION_ASSET_ABSENT") {
    return !hasCriticalAsset && !hasSupportingPath;
  }
  if (value.reason === "CRITICAL_IMPLEMENTATION_PATH_ABSENT") {
    return hasCriticalAsset && !hasSupportingPath;
  }
  return hasCriticalAsset && hasSupportingPath;
}

export function isReconciliationFindingResource(
  value: unknown
): value is ReconciliationFindingResource {
  if (!isRecord(value)) return false;
  if (value.findingKind === "CONFLICT" || value.findingKind === "AMBIGUOUS") {
    return isClaimFinding(value);
  }
  if (value.findingKind === "MISSING") return isMissingFinding(value);
  if (value.findingKind === "STALE") return isStaleFinding(value);
  if (value.findingKind === "IMPACT_GAP") return isImpactGapFinding(value);
  return false;
}

function isPathStep(value: unknown): boolean {
  return isRecord(value) && hasOnlyKeys(value, [
    "stepIndex", "direction", "relationshipType", "from", "relationship", "to"
  ]) && isNonnegativeInteger(value.stepIndex) &&
    (value.direction === "FORWARD" || value.direction === "REVERSE") &&
    (value.relationshipType === "AFFECTS" || value.relationshipType === "DEPENDS_ON" ||
      value.relationshipType === "IMPLEMENTS" || value.relationshipType === "VALIDATED_BY") &&
    isImpactCitation(value.from) && isImpactCitation(value.relationship) &&
    isImpactCitation(value.to) &&
    (value.relationship as JsonRecord).kind === "RELATIONSHIP";
}

export function isReconciliationImpactPathResource(
  value: unknown
): value is ReconciliationImpactPathResource {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "pathKeyVersion", "pathDigestVersion", "pathKey", "pathDigest", "rootId",
    "requirementId", "supportKind", "root", "criticalAsset", "depth", "steps"
  ], ["terminalValidation", "validationStatus"]) ||
    value.pathKeyVersion !== "impact-path-key.v1" ||
    value.pathDigestVersion !== "impact-path-digest.v1" || !isDigest(value.pathKey) ||
    !isDigest(value.pathDigest) || !isIdentifier(value.rootId) ||
    !isIdentifier(value.requirementId) ||
    (value.supportKind !== "IMPLEMENTATION" && value.supportKind !== "VALIDATION") ||
    !isImpactCitation(value.root) || (value.root as JsonRecord).kind !== "NODE" ||
    !isImpactCitation(value.criticalAsset) ||
    (value.criticalAsset as JsonRecord).kind !== "NODE" ||
    !isNonnegativeInteger(value.depth) || value.depth > 8 || !Array.isArray(value.steps) ||
    value.steps.length !== value.depth || !value.steps.every(isPathStep) ||
    !value.steps.every((step, index) => (step as JsonRecord).stepIndex === index)) return false;
  const steps = value.steps as readonly JsonRecord[];
  const root = value.root as JsonRecord;
  const criticalAsset = value.criticalAsset as JsonRecord;
  if ((steps[0] === undefined
      ? !referencesMatch(root, criticalAsset)
      : !referencesMatch(steps[0].from, root)) ||
    steps.some((step, index) =>
      index > 0 && !referencesMatch(steps[index - 1]?.to, step.from))) return false;
  const visitsCriticalAsset = referencesMatch(root, criticalAsset) ||
    steps.some((step) => referencesMatch(step.to, criticalAsset));
  if (!visitsCriticalAsset) return false;
  if (value.supportKind === "IMPLEMENTATION") {
    return value.terminalValidation === undefined && value.validationStatus === undefined &&
      referencesMatch(steps.at(-1)?.to ?? root, criticalAsset);
  }
  if ((value.terminalValidation === undefined) !== (value.validationStatus === undefined)) {
    return false;
  }
  if (value.terminalValidation === undefined) {
    return referencesMatch(steps.at(-1)?.to ?? root, criticalAsset);
  }
  return isImpactCitation(value.terminalValidation) &&
    (value.terminalValidation as JsonRecord).kind === "NODE" &&
    (value.validationStatus === "PASSED" || value.validationStatus === "FAILED" ||
      value.validationStatus === "INCONCLUSIVE") &&
    referencesMatch(steps.at(-1)?.to, value.terminalValidation);
}

function isRevisionList(value: unknown): value is ReconciliationRevisionListResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ["apiVersion", "missionId", "revisions", "page"]) ||
    value.apiVersion !== "v1" || !isUuid(value.missionId) || !Array.isArray(value.revisions) ||
    !value.revisions.every(isReconciliationRevisionSummaryResource) || !isRecord(value.page) ||
    !hasOnlyKeys(value.page, ["limit", "nextCursor"]) || !isPositiveInteger(value.page.limit) ||
    value.page.limit > 100 || (value.page.nextCursor !== null &&
      !isPositiveInteger(value.page.nextCursor))) return false;
  const revisions = value.revisions;
  return revisions.every((revision, index) =>
    revision.missionId === value.missionId &&
    (index === 0 || revision.revision < (revisions[index - 1]?.revision ?? 0))
  );
}

function isRunResponse(value: unknown): value is ReconciliationRunResponse {
  return isRecord(value) && hasOnlyKeys(value, [
    "apiVersion", "created", "reconciliationRevision"
  ]) && value.apiVersion === "v1" && typeof value.created === "boolean" &&
    isReconciliationRevisionSummaryResource(value.reconciliationRevision);
}

function isRevisionResponse(value: unknown): value is ReconciliationRevisionResponse {
  return isRecord(value) && hasOnlyKeys(value, [
    "apiVersion", "reconciliationRevision"
  ]) && value.apiVersion === "v1" &&
    isReconciliationRevisionSummaryResource(value.reconciliationRevision);
}

function isMemberPage(value: unknown): boolean {
  return isRecord(value) && hasOnlyKeys(value, ["limit", "nextCursor"]) &&
    isPositiveInteger(value.limit) && value.limit <= 100 &&
    (value.nextCursor === null || isDigest(value.nextCursor));
}

function isFindingList(value: unknown): value is ReconciliationFindingListResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "apiVersion", "missionId", "reconciliationRevision", "findings", "page"
  ]) || value.apiVersion !== "v1" || !isUuid(value.missionId) ||
    !isPositiveInteger(value.reconciliationRevision) || !Array.isArray(value.findings) ||
    !value.findings.every(isReconciliationFindingResource) || !isMemberPage(value.page)) return false;
  const findings = value.findings;
  return findings.every((finding, index) =>
    finding.missionId === value.missionId &&
    (index === 0 || finding.findingKey > (findings[index - 1]?.findingKey ?? ""))
  );
}

function isPathList(value: unknown): value is ReconciliationImpactPathListResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "apiVersion", "missionId", "reconciliationRevision", "impactPaths", "page"
  ]) || value.apiVersion !== "v1" || !isUuid(value.missionId) ||
    !isPositiveInteger(value.reconciliationRevision) || !Array.isArray(value.impactPaths) ||
    !value.impactPaths.every(isReconciliationImpactPathResource) || !isMemberPage(value.page)) return false;
  const impactPaths = value.impactPaths;
  return impactPaths.every((path, index) =>
    index === 0 || path.pathKey > (impactPaths[index - 1]?.pathKey ?? "")
  );
}

function signalInit(signal?: AbortSignal): RequestInit {
  return signal === undefined ? {} : { signal };
}

export async function listReconciliationRevisions(
  missionId: string,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReconciliationRevisionListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/reconciliation/revisions?limit=100`,
    isRevisionList,
    signalInit(signal)
  );
}

export async function getReconciliationRevision(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReconciliationRevisionResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/reconciliation/revisions/${revision}`,
    isRevisionResponse,
    signalInit(signal)
  );
}

export async function runReconciliation(
  missionId: string,
  request: RunReconciliationRequest,
  fetcher: typeof fetch = globalThis.fetch
): Promise<ReconciliationRunResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/reconciliation/revisions`,
    isRunResponse,
    { method: "POST", body: JSON.stringify(request) }
  );
}

export async function listReconciliationFindings(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReconciliationFindingListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/reconciliation/revisions/${revision}/findings?limit=100`,
    isFindingList,
    signalInit(signal)
  );
}

export async function listReconciliationImpactPaths(
  missionId: string,
  revision: number,
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<ReconciliationImpactPathListResponse> {
  return requestJson(
    fetcher,
    `/api/v1/missions/${encodeURIComponent(missionId)}/reconciliation/revisions/${revision}/impact-paths?limit=100`,
    isPathList,
    signalInit(signal)
  );
}
