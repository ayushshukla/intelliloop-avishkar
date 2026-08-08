import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import { canonicalJsonDigest, parseSha256Digest, type Sha256Digest } from "./digest.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  READINESS_POLICY_VERSION,
  assertReadinessEvaluationInvariant,
  type EvaluateReadinessInput,
  type ReadinessEvaluation,
  type ReadinessStatus
} from "./readiness-evaluation.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";

export const READINESS_ASSESSMENT_VERSION = "release-assessment.v1" as const;
export const READINESS_ASSESSMENT_DIGEST_VERSION = "release-assessment-digest.v1" as const;
export const READINESS_ASSESSMENT_KEY_VERSION = "release-assessment-key.v1" as const;
export const READINESS_ASSESSMENT_STATE_VERSION = "release-assessment-state.v1" as const;
export const READINESS_ASSESSMENT_STATE_DIGEST_VERSION = "release-assessment-state-digest.v1" as const;
export const MAXIMUM_READINESS_ASSESSMENT_SERIALIZED_BYTES = 1_048_576;

export const READINESS_ASSESSMENT_STALE_REASONS = [
  "READINESS_POLICY_CHANGED",
  "RECONCILIATION_CHANGED",
  "SNAPSHOT_CHANGED",
  "FINDINGS_CHANGED",
  "VALIDATION_CATALOG_CHANGED",
  "VALIDATION_EVIDENCE_CHANGED",
  "REVIEW_CHANGED",
  "INTEGRITY_CHANGED",
  "INPUT_AUTHORITY_CHANGED",
  "PERSISTENCE_BINDING_CHANGED",
  "DEPENDENCY_FRESHNESS_CHANGED",
  "INPUT_FINGERPRINT_CHANGED"
] as const;

export type ReadinessAssessmentId = StableId<"READINESS_ASSESSMENT">;
export type ReadinessAssessmentStaleReason =
  (typeof READINESS_ASSESSMENT_STALE_REASONS)[number];

export const READINESS_ASSESSMENT_ERROR_CODES = [
  "READINESS_ASSESSMENT_INPUT_INVALID",
  "READINESS_ASSESSMENT_PREDECESSOR_INVALID",
  "READINESS_ASSESSMENT_SERIALIZATION_INVALID",
  "READINESS_ASSESSMENT_INTEGRITY_INVALID"
] as const;

export type ReadinessAssessmentErrorCode =
  (typeof READINESS_ASSESSMENT_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<ReadinessAssessmentErrorCode, string>> =
  Object.freeze({
    READINESS_ASSESSMENT_INPUT_INVALID: "Readiness assessment input is invalid.",
    READINESS_ASSESSMENT_PREDECESSOR_INVALID: "Readiness assessment predecessor is invalid.",
    READINESS_ASSESSMENT_SERIALIZATION_INVALID: "Readiness assessment serialization is invalid.",
    READINESS_ASSESSMENT_INTEGRITY_INVALID: "Readiness assessment integrity is invalid."
  });

export class ReadinessAssessmentError extends Error {
  readonly code: ReadinessAssessmentErrorCode;

  constructor(code: ReadinessAssessmentErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReadinessAssessmentError";
    this.code = code;
  }
}

export interface ReadinessAssessmentPredecessor {
  readonly assessmentId: ReadinessAssessmentId;
  readonly revision: number;
  readonly assessmentDigest: Sha256Digest;
}

export interface ReadinessAssessment {
  readonly version: typeof READINESS_ASSESSMENT_VERSION;
  readonly digestVersion: typeof READINESS_ASSESSMENT_DIGEST_VERSION;
  readonly keyVersion: typeof READINESS_ASSESSMENT_KEY_VERSION;
  readonly assessmentKey: Sha256Digest;
  readonly assessmentId: ReadinessAssessmentId;
  readonly revision: number;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly recordedAtUtc: UtcTimestamp;
  readonly inputFingerprintDigest: Sha256Digest;
  readonly evaluatedStatus: ReadinessStatus;
  readonly evaluation: ReadinessEvaluation;
  readonly predecessor?: ReadinessAssessmentPredecessor;
  readonly authority: {
    readonly assessmentPersistence: "PERSISTED_IMMUTABLE";
    readonly readinessStatusAuthority: "DETERMINISTIC_ASSESSMENT";
    readonly releaseApproval: false;
    readonly releasePassport: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
  readonly assessmentDigest: Sha256Digest;
}

export interface ReadinessAssessmentState {
  readonly version: typeof READINESS_ASSESSMENT_STATE_VERSION;
  readonly digestVersion: typeof READINESS_ASSESSMENT_STATE_DIGEST_VERSION;
  readonly assessmentId: ReadinessAssessmentId;
  readonly assessmentRevision: number;
  readonly assessmentDigest: Sha256Digest;
  readonly evaluatedStatus: ReadinessStatus;
  readonly status: ReadinessStatus;
  readonly evaluatedInputFingerprintDigest: Sha256Digest;
  readonly currentInputFingerprintDigest: Sha256Digest;
  readonly staleReasons: readonly ReadinessAssessmentStaleReason[];
  readonly storedAssessmentChanged: false;
  readonly authority: {
    readonly derivation: "EXACT_DEPENDENCY_COMPARISON";
    readonly persistenceMutation: false;
    readonly releaseApproval: false;
    readonly releasePassport: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
  readonly stateDigest: Sha256Digest;
}

export interface ReadinessAssessmentDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

function fail(code: ReadinessAssessmentErrorCode): never {
  throw new ReadinessAssessmentError(code);
}

function positiveRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return fail("READINESS_ASSESSMENT_PREDECESSOR_INVALID");
  }
  return value as number;
}

async function assessmentKey(projectId: ProjectId, missionId: MissionId): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: READINESS_ASSESSMENT_KEY_VERSION,
    projectId,
    missionId
  });
}

export async function createReadinessAssessment(
  evaluation: ReadinessEvaluation,
  evaluationInput: EvaluateReadinessInput,
  previous: ReadinessAssessment | undefined,
  dependencies: ReadinessAssessmentDependencies
): Promise<ReadinessAssessment> {
  try {
    await assertReadinessEvaluationInvariant(evaluation, evaluationInput);
  } catch {
    return fail("READINESS_ASSESSMENT_INTEGRITY_INVALID");
  }
  if (
    evaluation.projectId !== evaluationInput.projectId ||
    evaluation.missionId !== evaluationInput.missionId
  ) return fail("READINESS_ASSESSMENT_INPUT_INVALID");

  const key = await assessmentKey(evaluation.projectId, evaluation.missionId);
  if (previous !== undefined) {
    if (
      previous.assessmentKey !== key ||
      previous.projectId !== evaluation.projectId ||
      previous.missionId !== evaluation.missionId
    ) return fail("READINESS_ASSESSMENT_PREDECESSOR_INVALID");
    if (previous.inputFingerprintDigest === evaluation.inputDigest) return previous;
  }

  let assessmentId: ReadinessAssessmentId;
  let recordedAtUtc: UtcTimestamp;
  try {
    assessmentId = dependencies.ids<"READINESS_ASSESSMENT">();
    recordedAtUtc = dependencies.clock.now();
  } catch {
    return fail("READINESS_ASSESSMENT_INPUT_INVALID");
  }
  const revision = previous === undefined ? 1 : previous.revision + 1;
  const withoutDigest = Object.freeze({
    version: READINESS_ASSESSMENT_VERSION,
    digestVersion: READINESS_ASSESSMENT_DIGEST_VERSION,
    keyVersion: READINESS_ASSESSMENT_KEY_VERSION,
    assessmentKey: key,
    assessmentId,
    revision,
    projectId: evaluation.projectId,
    missionId: evaluation.missionId,
    recordedAtUtc,
    inputFingerprintDigest: evaluation.inputDigest,
    evaluatedStatus: evaluation.status,
    evaluation,
    ...(previous === undefined
      ? {}
      : {
          predecessor: Object.freeze({
            assessmentId: previous.assessmentId,
            revision: previous.revision,
            assessmentDigest: previous.assessmentDigest
          })
        }),
    authority: Object.freeze({
      assessmentPersistence: "PERSISTED_IMMUTABLE" as const,
      readinessStatusAuthority: "DETERMINISTIC_ASSESSMENT" as const,
      releaseApproval: false as const,
      releasePassport: false as const,
      deploymentAuthority: false as const,
      aiAuthority: "NONE" as const
    })
  });
  return Object.freeze({
    ...withoutDigest,
    assessmentDigest: await canonicalJsonDigest(withoutDigest as unknown as JsonValue)
  });
}

export async function assertReadinessAssessmentInvariant(
  assessment: ReadinessAssessment,
  evaluationInput: EvaluateReadinessInput,
  previous?: ReadinessAssessment
): Promise<void> {
  try {
    const expected = await createReadinessAssessment(
      assessment.evaluation,
      evaluationInput,
      previous,
      {
        ids: (() => parseStableId<"READINESS_ASSESSMENT">(assessment.assessmentId)) as StableIdGenerator,
        clock: { now: () => parseUtcTimestamp(assessment.recordedAtUtc) }
      }
    );
    if (
      canonicalizeJson(assessment as unknown as JsonValue) !==
      canonicalizeJson(expected as unknown as JsonValue)
    ) return fail("READINESS_ASSESSMENT_INTEGRITY_INVALID");
    parseSha256Digest(assessment.assessmentDigest);
    positiveRevision(assessment.revision);
  } catch (error) {
    if (error instanceof ReadinessAssessmentError) throw error;
    return fail("READINESS_ASSESSMENT_INTEGRITY_INVALID");
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalizeJson(left as JsonValue) === canonicalizeJson(right as JsonValue);
}

function staleReasons(
  evaluated: ReadinessEvaluation,
  current: ReadinessEvaluation
): readonly ReadinessAssessmentStaleReason[] {
  const reasons = new Set<ReadinessAssessmentStaleReason>();
  if (
    evaluated.policyVersion !== current.policyVersion ||
    evaluated.policyDigest !== current.policyDigest
  ) reasons.add("READINESS_POLICY_CHANGED");
  if (!sameJson(evaluated.reconciliationBinding, current.reconciliationBinding)) {
    reasons.add("RECONCILIATION_CHANGED");
  }
  if (
    evaluated.targetSnapshotId !== current.targetSnapshotId ||
    evaluated.currentSnapshotId !== current.currentSnapshotId
  ) reasons.add("SNAPSHOT_CHANGED");
  if (!sameJson(evaluated.findingCounts, current.findingCounts)) {
    reasons.add("FINDINGS_CHANGED");
  }
  if (!sameJson(evaluated.validationRequirements, current.validationRequirements)) {
    reasons.add("VALIDATION_CATALOG_CHANGED");
  }
  if (!sameJson(evaluated.validationEvidence, current.validationEvidence)) {
    reasons.add("VALIDATION_EVIDENCE_CHANGED");
  }
  if (!sameJson(evaluated.review, current.review)) reasons.add("REVIEW_CHANGED");
  if (evaluated.integrity !== current.integrity) reasons.add("INTEGRITY_CHANGED");
  if (evaluated.inputAuthority !== current.inputAuthority) {
    reasons.add("INPUT_AUTHORITY_CHANGED");
  }
  if (evaluated.reconciliationPersistence !== current.reconciliationPersistence) {
    reasons.add("PERSISTENCE_BINDING_CHANGED");
  }
  if (!sameJson(evaluated.freshness, current.freshness)) {
    reasons.add("DEPENDENCY_FRESHNESS_CHANGED");
  }
  if (evaluated.inputDigest !== current.inputDigest) {
    reasons.add("INPUT_FINGERPRINT_CHANGED");
  }
  return Object.freeze(
    READINESS_ASSESSMENT_STALE_REASONS.filter((reason) => reasons.has(reason))
  );
}

export async function deriveReadinessAssessmentState(
  assessment: ReadinessAssessment,
  currentEvaluation: ReadinessEvaluation
): Promise<ReadinessAssessmentState> {
  if (
    assessment.projectId !== currentEvaluation.projectId ||
    assessment.missionId !== currentEvaluation.missionId ||
    assessment.evaluation.policyVersion !== READINESS_POLICY_VERSION
  ) return fail("READINESS_ASSESSMENT_INPUT_INVALID");
  const reasons = staleReasons(assessment.evaluation, currentEvaluation);
  const status: ReadinessStatus = reasons.length > 0 ? "STALE" : assessment.evaluatedStatus;
  const withoutDigest = Object.freeze({
    version: READINESS_ASSESSMENT_STATE_VERSION,
    digestVersion: READINESS_ASSESSMENT_STATE_DIGEST_VERSION,
    assessmentId: assessment.assessmentId,
    assessmentRevision: assessment.revision,
    assessmentDigest: assessment.assessmentDigest,
    evaluatedStatus: assessment.evaluatedStatus,
    status,
    evaluatedInputFingerprintDigest: assessment.inputFingerprintDigest,
    currentInputFingerprintDigest: currentEvaluation.inputDigest,
    staleReasons: reasons,
    storedAssessmentChanged: false as const,
    authority: Object.freeze({
      derivation: "EXACT_DEPENDENCY_COMPARISON" as const,
      persistenceMutation: false as const,
      releaseApproval: false as const,
      releasePassport: false as const,
      deploymentAuthority: false as const,
      aiAuthority: "NONE" as const
    })
  });
  return Object.freeze({
    ...withoutDigest,
    stateDigest: await canonicalJsonDigest(withoutDigest as unknown as JsonValue)
  });
}

export async function serializeReadinessAssessment(
  assessment: ReadinessAssessment
): Promise<string> {
  const serialized = canonicalizeJson(assessment as unknown as JsonValue);
  if (
    new TextEncoder().encode(serialized).byteLength >
    MAXIMUM_READINESS_ASSESSMENT_SERIALIZED_BYTES
  ) return fail("READINESS_ASSESSMENT_SERIALIZATION_INVALID");
  return serialized;
}

export async function deserializeReadinessAssessment(
  serialized: string,
  evaluationInput: EvaluateReadinessInput,
  previous?: ReadinessAssessment
): Promise<ReadinessAssessment> {
  try {
    if (
      typeof serialized !== "string" ||
      new TextEncoder().encode(serialized).byteLength >
        MAXIMUM_READINESS_ASSESSMENT_SERIALIZED_BYTES
    ) return fail("READINESS_ASSESSMENT_SERIALIZATION_INVALID");
    const parsed = JSON.parse(serialized) as ReadinessAssessment;
    await assertReadinessAssessmentInvariant(parsed, evaluationInput, previous);
    if (canonicalizeJson(parsed as unknown as JsonValue) !== serialized) {
      return fail("READINESS_ASSESSMENT_SERIALIZATION_INVALID");
    }
    return Object.freeze(parsed);
  } catch (error) {
    if (error instanceof ReadinessAssessmentError) throw error;
    return fail("READINESS_ASSESSMENT_SERIALIZATION_INVALID");
  }
}
