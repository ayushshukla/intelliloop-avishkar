import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import type { GitSnapshotId } from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  assertReconciliationImpactRevisionInvariant,
  type ReconciliationImpactFindingCounts,
  type ReconciliationImpactRevision
} from "./reconciliation-impact-revision.js";
import { isOriginKind, type OriginKind } from "./record-metadata.js";
import {
  READINESS_REVIEW_ACTOR_KINDS,
  type ReadinessReviewActorKind,
  type ReadinessReviewId
} from "./readiness-review.js";
import { parseStableId } from "./stable-id.js";
import {
  parseValidationKey,
  VALIDATION_RESULT_STATUSES,
  type ValidationKey,
  type ValidationResultId,
  type ValidationResultStatus
} from "./validation-result.js";

export const READINESS_POLICY_VERSION = "readiness.v1" as const;
export const READINESS_POLICY_DIGEST_VERSION =
  "readiness-policy-digest.v1" as const;
export const READINESS_EVALUATION_VERSION =
  "readiness-evaluation.v1" as const;
export const READINESS_EVALUATION_DIGEST_VERSION =
  "readiness-evaluation-digest.v1" as const;
export const READINESS_EVALUATION_KEY_VERSION =
  "readiness-evaluation-key.v1" as const;

export const READINESS_STATUSES = ["BLOCKED", "READY", "STALE"] as const;
export const READINESS_INTEGRITY_STATUSES = ["VERIFIED", "UNVERIFIED"] as const;
export const READINESS_INPUT_AUTHORITIES = [
  "ATTRIBUTED_CANONICAL",
  "SAMPLE_PLACEHOLDER",
  "AI_ADVISORY"
] as const;
export const READINESS_PERSISTENCE_STATUSES = [
  "PERSISTED",
  "UNPERSISTED"
] as const;
export const READINESS_FRESHNESS_STATUSES = [
  "CURRENT",
  "STALE",
  "UNKNOWN"
] as const;
export const READINESS_OBLIGATION_IDS = [
  "INTEGRITY_VALID",
  "SCOPE_EXACT",
  "SNAPSHOT_CURRENT",
  "CRITICAL_FINDINGS_CLEAR",
  "REQUIRED_VALIDATIONS_PASS",
  "EXPLICIT_HUMAN_REVIEW",
  "DEPENDENCIES_CURRENT",
  "CANONICAL_INPUTS_ONLY",
  "INPUTS_PERSISTED"
] as const;

export const READINESS_BLOCKER_CODES = [
  "INTEGRITY_UNVERIFIED",
  "SCOPE_MISMATCH",
  "SNAPSHOT_CHANGED",
  "OPEN_CONFLICT",
  "OPEN_AMBIGUITY",
  "MISSING_SUPPORT",
  "OPEN_IMPACT_GAP",
  "VALIDATION_CATALOG_EMPTY",
  "VALIDATION_MISSING",
  "VALIDATION_FAILED",
  "VALIDATION_INCONCLUSIVE",
  "VALIDATION_SCOPE_UNKNOWN",
  "VALIDATION_STALE",
  "VALIDATION_AUTHORITY_INVALID",
  "REVIEW_MISSING",
  "REVIEW_NOT_HUMAN",
  "REVIEW_SCOPE_MISMATCH",
  "REVIEW_STALE",
  "DEPENDENCY_FRESHNESS_UNKNOWN",
  "DEPENDENCY_CHANGED",
  "SAMPLE_INPUT",
  "FALLBACK_INPUT",
  "AI_ADVISORY_INPUT",
  "INCOMPLETE_CODE_MAP",
  "RECONCILIATION_UNPERSISTED",
  "VALIDATION_UNPERSISTED",
  "REVIEW_UNPERSISTED"
] as const;

export const READINESS_EVALUATION_ERROR_CODES = [
  "READINESS_INPUT_INVALID",
  "READINESS_LIMIT_EXCEEDED",
  "READINESS_INTEGRITY_INVALID"
] as const;

export type ReadinessStatus = (typeof READINESS_STATUSES)[number];
export type ReadinessIntegrityStatus =
  (typeof READINESS_INTEGRITY_STATUSES)[number];
export type ReadinessInputAuthority =
  (typeof READINESS_INPUT_AUTHORITIES)[number];
export type ReadinessPersistenceStatus =
  (typeof READINESS_PERSISTENCE_STATUSES)[number];
export type ReadinessFreshnessStatus =
  (typeof READINESS_FRESHNESS_STATUSES)[number];
export type ReadinessObligationId =
  (typeof READINESS_OBLIGATION_IDS)[number];
export type ReadinessBlockerCode =
  (typeof READINESS_BLOCKER_CODES)[number];
export type ReadinessEvaluationErrorCode =
  (typeof READINESS_EVALUATION_ERROR_CODES)[number];
export const MAXIMUM_READINESS_VALIDATION_REQUIREMENTS = 256;
export const MAXIMUM_READINESS_VALIDATION_EVIDENCE = 256;
export const MAXIMUM_READINESS_EVALUATION_SERIALIZED_BYTES = 262_144;

export interface ReadinessObligationCatalogEntry {
  readonly obligationId: ReadinessObligationId;
  readonly category:
    | "INTEGRITY"
    | "SCOPE"
    | "SNAPSHOT"
    | "FINDINGS"
    | "VALIDATIONS"
    | "REVIEW"
    | "FRESHNESS"
    | "AUTHORITY"
    | "PERSISTENCE";
  readonly requirement: string;
}

export const READINESS_OBLIGATION_CATALOG: readonly ReadinessObligationCatalogEntry[] =
  Object.freeze([
    Object.freeze({ obligationId: "INTEGRITY_VALID", category: "INTEGRITY", requirement: "The exact reconciliation/impact aggregate has verified canonical integrity." }),
    Object.freeze({ obligationId: "SCOPE_EXACT", category: "SCOPE", requirement: "All inputs bind to the exact Project and Change Mission." }),
    Object.freeze({ obligationId: "SNAPSHOT_CURRENT", category: "SNAPSHOT", requirement: "The evaluated and current Git snapshot identities are equal." }),
    Object.freeze({ obligationId: "CRITICAL_FINDINGS_CLEAR", category: "FINDINGS", requirement: "No current conflict, ambiguity, missing support or impact gap remains open." }),
    Object.freeze({ obligationId: "REQUIRED_VALIDATIONS_PASS", category: "VALIDATIONS", requirement: "Every explicitly required validation has one exact current passing result." }),
    Object.freeze({ obligationId: "EXPLICIT_HUMAN_REVIEW", category: "REVIEW", requirement: "A persisted human review binds the exact scope, snapshot and reconciliation result." }),
    Object.freeze({ obligationId: "DEPENDENCIES_CURRENT", category: "FRESHNESS", requirement: "The exact assessed dependency input remains current." }),
    Object.freeze({ obligationId: "CANONICAL_INPUTS_ONLY", category: "AUTHORITY", requirement: "No placeholder sample, fallback, AI advice or incomplete map supplies readiness authority." }),
    Object.freeze({ obligationId: "INPUTS_PERSISTED", category: "PERSISTENCE", requirement: "Reconciliation, validation and review inputs are persisted authoritative records." })
  ]);

const BLOCKER_OBLIGATIONS: Readonly<Record<ReadinessBlockerCode, ReadinessObligationId>> =
  Object.freeze({
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

const STALE_BLOCKERS = new Set<ReadinessBlockerCode>([
  "SNAPSHOT_CHANGED",
  "VALIDATION_STALE",
  "REVIEW_STALE",
  "DEPENDENCY_CHANGED"
]);

const ERROR_MESSAGES: Readonly<Record<ReadinessEvaluationErrorCode, string>> =
  Object.freeze({
    READINESS_INPUT_INVALID: "Readiness evaluation input is invalid.",
    READINESS_LIMIT_EXCEEDED: "Readiness evaluation limit is exceeded.",
    READINESS_INTEGRITY_INVALID: "Readiness evaluation integrity is invalid."
  });

export class ReadinessEvaluationError extends Error {
  readonly code: ReadinessEvaluationErrorCode;

  constructor(code: ReadinessEvaluationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReadinessEvaluationError";
    this.code = code;
  }
}

export interface ReadinessValidationRequirementInput {
  readonly requirementId: string;
  readonly validationKey: string;
}

export interface ReadinessValidationEvidenceInput {
  readonly validationResultId: ValidationResultId;
  readonly requirementId: string;
  readonly validationKey: string;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly snapshotId: GitSnapshotId;
  readonly status: ValidationResultStatus;
  readonly origin: OriginKind;
  readonly resultDigest: Sha256Digest;
  readonly persistence: ReadinessPersistenceStatus;
}

export type ReadinessReviewInput =
  | { readonly status: "MISSING" }
  | {
      readonly status: "RECORDED";
      readonly reviewId: ReadinessReviewId;
      readonly actorKind: ReadinessReviewActorKind;
      readonly projectId: ProjectId;
      readonly missionId: MissionId;
      readonly snapshotId: GitSnapshotId;
      readonly reconciliationResultDigest: Sha256Digest;
      readonly reviewDigest: Sha256Digest;
      readonly persistence: ReadinessPersistenceStatus;
    };

export type ReadinessFreshnessInput =
  | {
      readonly status: "CURRENT";
      readonly evaluatedInputDigest: Sha256Digest;
      readonly currentInputDigest: Sha256Digest;
    }
  | {
      readonly status: "STALE";
      readonly evaluatedInputDigest: Sha256Digest;
      readonly currentInputDigest: Sha256Digest;
    }
  | {
      readonly status: "UNKNOWN";
      readonly evaluatedInputDigest: Sha256Digest;
    };

export interface EvaluateReadinessInput {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly reconciliation: ReconciliationImpactRevision;
  readonly integrity: ReadinessIntegrityStatus;
  readonly currentSnapshotId: GitSnapshotId;
  readonly inputAuthority: ReadinessInputAuthority;
  readonly reconciliationPersistence: ReadinessPersistenceStatus;
  readonly validationRequirements: readonly ReadinessValidationRequirementInput[];
  readonly validationEvidence: readonly ReadinessValidationEvidenceInput[];
  readonly review: ReadinessReviewInput;
  readonly freshness: ReadinessFreshnessInput;
}

export interface ReadinessValidationRequirement {
  readonly requirementId: ValidationKey;
  readonly validationKey: ValidationKey;
}

export interface ReadinessValidationEvidence {
  readonly validationResultId: ValidationResultId;
  readonly requirementId: ValidationKey;
  readonly validationKey: ValidationKey;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly snapshotId: GitSnapshotId;
  readonly status: ValidationResultStatus;
  readonly origin: OriginKind;
  readonly resultDigest: Sha256Digest;
  readonly persistence: ReadinessPersistenceStatus;
}

export interface ReadinessBlocker {
  readonly code: ReadinessBlockerCode;
  readonly obligationId: ReadinessObligationId;
}

export interface ReadinessObligationResult extends ReadinessObligationCatalogEntry {
  readonly status: "SATISFIED" | "UNSATISFIED";
  readonly blockerCodes: readonly ReadinessBlockerCode[];
}

export interface ReadinessEvaluation {
  readonly version: typeof READINESS_EVALUATION_VERSION;
  readonly digestVersion: typeof READINESS_EVALUATION_DIGEST_VERSION;
  readonly policyVersion: typeof READINESS_POLICY_VERSION;
  readonly policyDigestVersion: typeof READINESS_POLICY_DIGEST_VERSION;
  readonly policyDigest: Sha256Digest;
  readonly evaluationKey: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly targetSnapshotId: GitSnapshotId;
  readonly currentSnapshotId: GitSnapshotId;
  readonly reconciliationBinding: {
    readonly revisionKey: Sha256Digest;
    readonly revision: number;
    readonly inputDigest: Sha256Digest;
    readonly resultDigest: Sha256Digest;
  };
  readonly integrity: ReadinessIntegrityStatus;
  readonly inputAuthority: ReadinessInputAuthority;
  readonly reconciliationPersistence: ReadinessPersistenceStatus;
  readonly findingCounts: ReconciliationImpactFindingCounts;
  readonly validationRequirements: readonly ReadinessValidationRequirement[];
  readonly validationEvidence: readonly ReadinessValidationEvidence[];
  readonly review: ReadinessReviewInput;
  readonly freshness: ReadinessFreshnessInput;
  readonly obligations: readonly ReadinessObligationResult[];
  readonly blockers: readonly ReadinessBlocker[];
  readonly status: ReadinessStatus;
  readonly inputDigest: Sha256Digest;
  readonly authority: {
    readonly evaluationPersistence: "NOT_PERSISTED";
    readonly readinessAuthority: "EVALUATION_ONLY_UNTIL_PERSISTED";
    readonly releaseDecision: false;
    readonly releasePassport: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
  readonly resultDigest: Sha256Digest;
}

function fail(code: ReadinessEvaluationErrorCode): never {
  throw new ReadinessEvaluationError(code);
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.some((entry) => entry === value);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = []
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    return fail("READINESS_INPUT_INVALID");
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(record, key)) ||
    Object.keys(record).some((key) => !allowed.has(key))) return fail("READINESS_INPUT_INVALID");
  return record;
}

function nonnegative(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    return fail("READINESS_INPUT_INVALID");
  }
  return value as number;
}

function parseCounts(value: ReconciliationImpactFindingCounts): ReconciliationImpactFindingCounts {
  const counts = Object.freeze({
    CONFLICT: nonnegative(value.CONFLICT),
    AMBIGUOUS: nonnegative(value.AMBIGUOUS),
    MISSING: nonnegative(value.MISSING),
    STALE: nonnegative(value.STALE),
    IMPACT_GAP: nonnegative(value.IMPACT_GAP),
    total: nonnegative(value.total)
  });
  if (counts.total !== counts.CONFLICT + counts.AMBIGUOUS + counts.MISSING + counts.STALE + counts.IMPACT_GAP) {
    return fail("READINESS_INPUT_INVALID");
  }
  return counts;
}

async function policyDigest(): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: READINESS_POLICY_VERSION,
    digestVersion: READINESS_POLICY_DIGEST_VERSION,
    statuses: READINESS_STATUSES,
    obligations: READINESS_OBLIGATION_CATALOG,
    readyRule: "EVERY_OBLIGATION_SATISFIED",
    statusPrecedence: ["STALE", "BLOCKED", "READY"],
    historicalPredecessorStaleFindingAuthority: "NONE_FOR_CURRENT_EVALUATION",
    exclusions: ["SAMPLE_PLACEHOLDER", "DECLARED_FALLBACK", "AI_ADVISORY", "UNPERSISTED_INPUT", "UNKNOWN_SCOPE_VALIDATION", "STALE_EVIDENCE"],
    authority: { releaseDecision: false, releasePassport: false, deployment: false, ai: "NONE" }
  });
}

function normalizedRequirements(values: readonly ReadinessValidationRequirementInput[]): readonly ReadinessValidationRequirement[] {
  if (values.length > MAXIMUM_READINESS_VALIDATION_REQUIREMENTS) return fail("READINESS_LIMIT_EXCEEDED");
  const result = values.map((entry) => {
    exactObject(entry, ["requirementId", "validationKey"]);
    return Object.freeze({
      requirementId: parseValidationKey(entry.requirementId),
      validationKey: parseValidationKey(entry.validationKey)
    });
  });
  result.sort((left, right) => left.requirementId.localeCompare(right.requirementId, "en-US"));
  if (new Set(result.map((entry) => entry.requirementId)).size !== result.length ||
    new Set(result.map((entry) => entry.validationKey)).size !== result.length) return fail("READINESS_INPUT_INVALID");
  return Object.freeze(result);
}

function normalizedValidationEvidence(
  values: readonly ReadinessValidationEvidenceInput[],
  requirements: readonly ReadinessValidationRequirement[]
): readonly ReadinessValidationEvidence[] {
  if (values.length > MAXIMUM_READINESS_VALIDATION_EVIDENCE) return fail("READINESS_LIMIT_EXCEEDED");
  const required = new Map(requirements.map((entry) => [entry.requirementId, entry]));
  const result = values.map((entry) => {
    exactObject(entry, [
      "validationResultId", "requirementId", "validationKey", "projectId",
      "missionId", "snapshotId", "status", "origin", "resultDigest", "persistence"
    ]);
    const requirementId = parseValidationKey(entry.requirementId);
    const validationKey = parseValidationKey(entry.validationKey);
    const requirement = required.get(requirementId);
    if (requirement === undefined || requirement.validationKey !== validationKey ||
      !includes(VALIDATION_RESULT_STATUSES, entry.status) || !isOriginKind(entry.origin) ||
      !includes(READINESS_PERSISTENCE_STATUSES, entry.persistence)) return fail("READINESS_INPUT_INVALID");
    return Object.freeze({
      validationResultId: parseStableId<"VALIDATION_RESULT">(entry.validationResultId),
      requirementId,
      validationKey,
      projectId: parseStableId<"PROJECT">(entry.projectId),
      missionId: parseStableId<"MISSION">(entry.missionId),
      snapshotId: parseStableId<"GIT_SNAPSHOT">(entry.snapshotId),
      status: entry.status,
      origin: entry.origin,
      resultDigest: parseSha256Digest(entry.resultDigest),
      persistence: entry.persistence
    });
  });
  result.sort((left, right) => left.requirementId.localeCompare(right.requirementId, "en-US"));
  if (new Set(result.map((entry) => entry.requirementId)).size !== result.length ||
    new Set(result.map((entry) => entry.validationResultId)).size !== result.length) return fail("READINESS_INPUT_INVALID");
  return Object.freeze(result);
}

function normalizedReview(value: ReadinessReviewInput): ReadinessReviewInput {
  if (value.status === "MISSING") {
    exactObject(value, ["status"]);
    return Object.freeze({ status: "MISSING" });
  }
  exactObject(value, [
    "status", "reviewId", "actorKind", "projectId", "missionId", "snapshotId",
    "reconciliationResultDigest", "reviewDigest", "persistence"
  ]);
  if (value.status !== "RECORDED" || !includes(READINESS_REVIEW_ACTOR_KINDS, value.actorKind) ||
    !includes(READINESS_PERSISTENCE_STATUSES, value.persistence)) return fail("READINESS_INPUT_INVALID");
  return Object.freeze({
    status: "RECORDED",
    reviewId: parseStableId<"READINESS_REVIEW">(value.reviewId),
    actorKind: value.actorKind,
    projectId: parseStableId<"PROJECT">(value.projectId),
    missionId: parseStableId<"MISSION">(value.missionId),
    snapshotId: parseStableId<"GIT_SNAPSHOT">(value.snapshotId),
    reconciliationResultDigest: parseSha256Digest(value.reconciliationResultDigest),
    reviewDigest: parseSha256Digest(value.reviewDigest),
    persistence: value.persistence
  });
}

function normalizedFreshness(value: ReadinessFreshnessInput, evaluatedInputDigest: Sha256Digest): ReadinessFreshnessInput {
  if (!includes(READINESS_FRESHNESS_STATUSES, value.status) ||
    parseSha256Digest(value.evaluatedInputDigest) !== evaluatedInputDigest) return fail("READINESS_INPUT_INVALID");
  if (value.status === "UNKNOWN") {
    exactObject(value, ["status", "evaluatedInputDigest"]);
    return Object.freeze({ status: "UNKNOWN", evaluatedInputDigest });
  }
  exactObject(value, ["status", "evaluatedInputDigest", "currentInputDigest"]);
  const currentInputDigest = parseSha256Digest(value.currentInputDigest);
  if ((value.status === "CURRENT") !== (currentInputDigest === evaluatedInputDigest)) return fail("READINESS_INPUT_INVALID");
  return Object.freeze({ status: value.status, evaluatedInputDigest, currentInputDigest });
}

function add(blockers: Set<ReadinessBlockerCode>, code: ReadinessBlockerCode): void {
  blockers.add(code);
}

export async function evaluateReadiness(input: EvaluateReadinessInput): Promise<ReadinessEvaluation> {
  try {
    exactObject(input, [
      "projectId", "missionId", "reconciliation", "integrity", "currentSnapshotId",
      "inputAuthority", "reconciliationPersistence", "validationRequirements",
      "validationEvidence", "review", "freshness"
    ]);
    const projectId = parseStableId<"PROJECT">(input.projectId);
    const missionId = parseStableId<"MISSION">(input.missionId);
    const currentSnapshotId = parseStableId<"GIT_SNAPSHOT">(input.currentSnapshotId);
    if (!includes(READINESS_INTEGRITY_STATUSES, input.integrity) ||
      !includes(READINESS_INPUT_AUTHORITIES, input.inputAuthority) ||
      !includes(READINESS_PERSISTENCE_STATUSES, input.reconciliationPersistence)) return fail("READINESS_INPUT_INVALID");
    if (input.integrity === "VERIFIED") {
      try { await assertReconciliationImpactRevisionInvariant(input.reconciliation); }
      catch { return fail("READINESS_INTEGRITY_INVALID"); }
    }
    const reconciliation = input.reconciliation;
    const targetSnapshotId = parseStableId<"GIT_SNAPSHOT">(reconciliation.targetSnapshotId);
    const reconciliationProjectId = parseStableId<"PROJECT">(reconciliation.projectId);
    const reconciliationMissionId = parseStableId<"MISSION">(reconciliation.missionId);
    const findingCounts = parseCounts(reconciliation.findingCounts);
    const revisionKey = parseSha256Digest(reconciliation.revisionKey);
    const revision = nonnegative(reconciliation.revision);
    if (revision < 1) return fail("READINESS_INPUT_INVALID");
    const reconciliationInputDigest = parseSha256Digest(reconciliation.inputDigest);
    const reconciliationResultDigest = parseSha256Digest(reconciliation.resultDigest);
    const requirements = normalizedRequirements(input.validationRequirements);
    const evidence = normalizedValidationEvidence(input.validationEvidence, requirements);
    const review = normalizedReview(input.review);
    const freshness = normalizedFreshness(input.freshness, reconciliationInputDigest);
    const blockers = new Set<ReadinessBlockerCode>();

    if (input.integrity !== "VERIFIED") add(blockers, "INTEGRITY_UNVERIFIED");
    if (projectId !== reconciliationProjectId || missionId !== reconciliationMissionId) add(blockers, "SCOPE_MISMATCH");
    if (currentSnapshotId !== targetSnapshotId) add(blockers, "SNAPSHOT_CHANGED");
    if (findingCounts.CONFLICT > 0) add(blockers, "OPEN_CONFLICT");
    if (findingCounts.AMBIGUOUS > 0) add(blockers, "OPEN_AMBIGUITY");
    if (findingCounts.MISSING > 0) add(blockers, "MISSING_SUPPORT");
    if (findingCounts.IMPACT_GAP > 0) add(blockers, "OPEN_IMPACT_GAP");

    if (requirements.length === 0) add(blockers, "VALIDATION_CATALOG_EMPTY");
    const evidenceByRequirement = new Map(evidence.map((entry) => [entry.requirementId, entry]));
    for (const requirement of requirements) {
      const entry = evidenceByRequirement.get(requirement.requirementId);
      if (entry === undefined) { add(blockers, "VALIDATION_MISSING"); continue; }
      if (entry.status === "FAILED") add(blockers, "VALIDATION_FAILED");
      if (entry.status === "INCONCLUSIVE") add(blockers, "VALIDATION_INCONCLUSIVE");
      if (entry.projectId !== projectId || entry.missionId !== missionId) add(blockers, "VALIDATION_SCOPE_UNKNOWN");
      if (entry.snapshotId !== targetSnapshotId || entry.snapshotId !== currentSnapshotId) add(blockers, "VALIDATION_STALE");
      if (entry.origin === "AI_ADVISORY") {
        add(blockers, "AI_ADVISORY_INPUT");
        add(blockers, "VALIDATION_AUTHORITY_INVALID");
      } else if (entry.origin !== "VALIDATION_RESULT" && entry.origin !== "SYNTHETIC_FIXTURE") add(blockers, "VALIDATION_AUTHORITY_INVALID");
      if (entry.persistence !== "PERSISTED") add(blockers, "VALIDATION_UNPERSISTED");
    }

    if (review.status === "MISSING") add(blockers, "REVIEW_MISSING");
    else {
      if (review.actorKind !== "HUMAN") { add(blockers, "REVIEW_NOT_HUMAN"); add(blockers, "AI_ADVISORY_INPUT"); }
      if (review.projectId !== projectId || review.missionId !== missionId ||
        review.reconciliationResultDigest !== reconciliationResultDigest) add(blockers, "REVIEW_SCOPE_MISMATCH");
      if (review.snapshotId !== targetSnapshotId || review.snapshotId !== currentSnapshotId) add(blockers, "REVIEW_STALE");
      if (review.persistence !== "PERSISTED") add(blockers, "REVIEW_UNPERSISTED");
    }

    if (freshness.status === "UNKNOWN") add(blockers, "DEPENDENCY_FRESHNESS_UNKNOWN");
    if (freshness.status === "STALE") add(blockers, "DEPENDENCY_CHANGED");
    if (input.inputAuthority === "SAMPLE_PLACEHOLDER") add(blockers, "SAMPLE_INPUT");
    if (input.inputAuthority === "AI_ADVISORY") add(blockers, "AI_ADVISORY_INPUT");
    const codeMap = reconciliation.codeMapBinding;
    if (codeMap.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE" || codeMap.inferenceStatus === "UNAVAILABLE_SAFE_FAILURE") add(blockers, "FALLBACK_INPUT");
    if (codeMap.completeness !== "COMPLETE") add(blockers, "INCOMPLETE_CODE_MAP");
    if (input.reconciliationPersistence !== "PERSISTED") add(blockers, "RECONCILIATION_UNPERSISTED");

    const sortedCodes = READINESS_BLOCKER_CODES.filter((code) => blockers.has(code));
    const blockerResults = Object.freeze(sortedCodes.map((code) => Object.freeze({ code, obligationId: BLOCKER_OBLIGATIONS[code] })));
    const obligationResults = Object.freeze(READINESS_OBLIGATION_CATALOG.map((entry) => {
      const codes = Object.freeze(sortedCodes.filter((code) => BLOCKER_OBLIGATIONS[code] === entry.obligationId));
      return Object.freeze({ ...entry, status: codes.length === 0 ? "SATISFIED" as const : "UNSATISFIED" as const, blockerCodes: codes });
    }));
    const status: ReadinessStatus = sortedCodes.some((code) => STALE_BLOCKERS.has(code))
      ? "STALE" : sortedCodes.length > 0 ? "BLOCKED" : "READY";
    const evaluationKey = await canonicalJsonDigest({ version: READINESS_EVALUATION_KEY_VERSION, projectId, missionId, targetSnapshotId });
    const normalizedInput = {
      projectId,
      missionId,
      targetSnapshotId,
      currentSnapshotId,
      reconciliationBinding: { revisionKey, revision, inputDigest: reconciliationInputDigest, resultDigest: reconciliationResultDigest },
      integrity: input.integrity,
      inputAuthority: input.inputAuthority,
      reconciliationPersistence: input.reconciliationPersistence,
      findingCounts,
      validationRequirements: requirements,
      validationEvidence: evidence,
      review,
      freshness
    };
    const inputDigest = await canonicalJsonDigest(normalizedInput as unknown as JsonValue);
    const withoutDigest = Object.freeze({
      version: READINESS_EVALUATION_VERSION,
      digestVersion: READINESS_EVALUATION_DIGEST_VERSION,
      policyVersion: READINESS_POLICY_VERSION,
      policyDigestVersion: READINESS_POLICY_DIGEST_VERSION,
      policyDigest: await policyDigest(),
      evaluationKey,
      ...normalizedInput,
      obligations: obligationResults,
      blockers: blockerResults,
      status,
      inputDigest,
      authority: Object.freeze({
        evaluationPersistence: "NOT_PERSISTED" as const,
        readinessAuthority: "EVALUATION_ONLY_UNTIL_PERSISTED" as const,
        releaseDecision: false as const,
        releasePassport: false as const,
        deploymentAuthority: false as const,
        aiAuthority: "NONE" as const
      })
    });
    const result = Object.freeze({ ...withoutDigest, resultDigest: await canonicalJsonDigest(withoutDigest as unknown as JsonValue) });
    if (byteLength(canonicalizeJson(result as unknown as JsonValue)) > MAXIMUM_READINESS_EVALUATION_SERIALIZED_BYTES) return fail("READINESS_LIMIT_EXCEEDED");
    return result;
  } catch (error) {
    if (error instanceof ReadinessEvaluationError) throw error;
    return fail("READINESS_INPUT_INVALID");
  }
}

export async function assertReadinessEvaluationInvariant(
  value: ReadinessEvaluation,
  input: EvaluateReadinessInput
): Promise<void> {
  try {
    const expected = await evaluateReadiness(input);
    if (canonicalizeJson(value as unknown as JsonValue) !== canonicalizeJson(expected as unknown as JsonValue)) {
      return fail("READINESS_INTEGRITY_INVALID");
    }
    parseSha256Digest(value.policyDigest);
    parseSha256Digest(value.inputDigest);
    parseSha256Digest(value.resultDigest);
  } catch (error) {
    if (error instanceof ReadinessEvaluationError) throw error;
    return fail("READINESS_INTEGRITY_INVALID");
  }
}
