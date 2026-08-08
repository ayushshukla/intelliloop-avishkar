import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import { canonicalJsonDigest, parseSha256Digest, type Sha256Digest } from "./digest.js";
import type { GitSnapshotId } from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  type ReadinessAssessment,
  type ReadinessAssessmentId,
  type ReadinessAssessmentState,
  type ReadinessAssessmentStaleReason
} from "./readiness-assessment.js";
import type {
  ReadinessBlocker,
  ReadinessObligationResult,
  ReadinessReviewInput,
  ReadinessStatus,
  ReadinessValidationEvidence,
  ReadinessValidationRequirement
} from "./readiness-evaluation.js";
import type { ReconciliationImpactFindingCounts } from "./reconciliation-impact-revision.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";

export const RELEASE_PASSPORT_VERSION = "release-passport.v1" as const;
export const RELEASE_PASSPORT_DIGEST_VERSION = "release-passport-digest.v1" as const;
export const RELEASE_PASSPORT_PROJECTION_VERSION = "release-passport-projection.v1" as const;
export const RELEASE_PASSPORT_KEY_VERSION = "release-passport-key.v1" as const;
export const RELEASE_PASSPORT_STATE_VERSION = "release-passport-state.v1" as const;
export const RELEASE_PASSPORT_STATE_DIGEST_VERSION = "release-passport-state-digest.v1" as const;
export const MAXIMUM_RELEASE_PASSPORT_SERIALIZED_BYTES = 1_048_576;

export type ReleasePassportId = StableId<"RELEASE_PASSPORT">;

export type ReleasePassportCitation =
  | {
      readonly kind: "ASSESSMENT";
      readonly referenceId: ReadinessAssessmentId;
      readonly referenceDigest: Sha256Digest;
    }
  | {
      readonly kind: "RECONCILIATION";
      readonly referenceId: Sha256Digest;
      readonly referenceRevision: number;
      readonly referenceDigest: Sha256Digest;
    }
  | {
      readonly kind: "TARGET_SNAPSHOT" | "CURRENT_SNAPSHOT";
      readonly referenceId: GitSnapshotId;
    }
  | {
      readonly kind: "VALIDATION_RESULT";
      readonly referenceId: ReadinessValidationEvidence["validationResultId"];
      readonly referenceDigest: Sha256Digest;
    }
  | {
      readonly kind: "READINESS_REVIEW";
      readonly referenceId: Exclude<ReadinessReviewInput, { readonly status: "MISSING" }>["reviewId"];
      readonly referenceDigest: Sha256Digest;
    };

export interface ReleasePassport {
  readonly version: typeof RELEASE_PASSPORT_VERSION;
  readonly digestVersion: typeof RELEASE_PASSPORT_DIGEST_VERSION;
  readonly projectionVersion: typeof RELEASE_PASSPORT_PROJECTION_VERSION;
  readonly keyVersion: typeof RELEASE_PASSPORT_KEY_VERSION;
  readonly passportKey: Sha256Digest;
  readonly passportId: ReleasePassportId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly recordedAtUtc: UtcTimestamp;
  readonly assessment: {
    readonly assessmentId: ReadinessAssessmentId;
    readonly revision: number;
    readonly assessmentDigest: Sha256Digest;
    readonly inputFingerprintDigest: Sha256Digest;
  };
  readonly snapshot: {
    readonly targetSnapshotId: GitSnapshotId;
    readonly currentSnapshotId: GitSnapshotId;
  };
  readonly rule: {
    readonly policyVersion: string;
    readonly policyDigest: Sha256Digest;
  };
  readonly evidenceDigest: Sha256Digest;
  readonly status: ReadinessStatus;
  readonly obligations: readonly ReadinessObligationResult[];
  readonly blockers: readonly ReadinessBlocker[];
  readonly findings: ReconciliationImpactFindingCounts;
  readonly validations: {
    readonly requirements: readonly ReadinessValidationRequirement[];
    readonly evidence: readonly ReadinessValidationEvidence[];
  };
  readonly review: ReadinessReviewInput;
  readonly citations: readonly ReleasePassportCitation[];
  readonly authority: {
    readonly source: "ONE_PERSISTED_RELEASE_ASSESSMENT";
    readonly projection: "REPRODUCED_NOT_RECOMPUTED";
    readonly historicalRecord: "IMMUTABLE";
    readonly signed: false;
    readonly releaseApproval: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
  readonly passportDigest: Sha256Digest;
}

export interface ReleasePassportState {
  readonly version: typeof RELEASE_PASSPORT_STATE_VERSION;
  readonly digestVersion: typeof RELEASE_PASSPORT_STATE_DIGEST_VERSION;
  readonly passportId: ReleasePassportId;
  readonly passportDigest: Sha256Digest;
  readonly assessmentId: ReadinessAssessmentId;
  readonly assessmentRevision: number;
  readonly statusAtProjection: ReadinessStatus;
  readonly status: ReadinessStatus;
  readonly staleReasons: readonly ReadinessAssessmentStaleReason[];
  readonly passportChanged: false;
  readonly authority: {
    readonly association: "ASSESSMENT_STATE_REFERENCE";
    readonly readinessRecomputed: false;
    readonly persistenceMutation: false;
    readonly releaseApproval: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
  readonly stateDigest: Sha256Digest;
}

export interface ReleasePassportDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

export const RELEASE_PASSPORT_ERROR_CODES = [
  "RELEASE_PASSPORT_INPUT_INVALID",
  "RELEASE_PASSPORT_ASSESSMENT_INVALID",
  "RELEASE_PASSPORT_SERIALIZATION_INVALID",
  "RELEASE_PASSPORT_INTEGRITY_INVALID"
] as const;

export type ReleasePassportErrorCode = (typeof RELEASE_PASSPORT_ERROR_CODES)[number];

export class ReleasePassportError extends Error {
  readonly code: ReleasePassportErrorCode;

  constructor(code: ReleasePassportErrorCode) {
    super({
      RELEASE_PASSPORT_INPUT_INVALID: "Release Passport input is invalid.",
      RELEASE_PASSPORT_ASSESSMENT_INVALID: "Release Passport assessment binding is invalid.",
      RELEASE_PASSPORT_SERIALIZATION_INVALID: "Release Passport serialization is invalid.",
      RELEASE_PASSPORT_INTEGRITY_INVALID: "Release Passport integrity is invalid."
    }[code]);
    this.name = "ReleasePassportError";
    this.code = code;
  }
}

function fail(code: ReleasePassportErrorCode): never {
  throw new ReleasePassportError(code);
}

async function passportKey(assessment: ReadinessAssessment): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: RELEASE_PASSPORT_KEY_VERSION,
    projectId: assessment.projectId,
    missionId: assessment.missionId,
    assessmentId: assessment.assessmentId,
    assessmentRevision: assessment.revision,
    assessmentDigest: assessment.assessmentDigest
  });
}

function citationsFor(assessment: ReadinessAssessment): readonly ReleasePassportCitation[] {
  const evaluation = assessment.evaluation;
  const citations: ReleasePassportCitation[] = [
    Object.freeze({
      kind: "ASSESSMENT" as const,
      referenceId: assessment.assessmentId,
      referenceDigest: assessment.assessmentDigest
    }),
    Object.freeze({
      kind: "RECONCILIATION" as const,
      referenceId: evaluation.reconciliationBinding.revisionKey,
      referenceRevision: evaluation.reconciliationBinding.revision,
      referenceDigest: evaluation.reconciliationBinding.resultDigest
    }),
    Object.freeze({
      kind: "TARGET_SNAPSHOT" as const,
      referenceId: evaluation.targetSnapshotId
    }),
    Object.freeze({
      kind: "CURRENT_SNAPSHOT" as const,
      referenceId: evaluation.currentSnapshotId
    }),
    ...evaluation.validationEvidence.map((entry) => Object.freeze({
      kind: "VALIDATION_RESULT" as const,
      referenceId: entry.validationResultId,
      referenceDigest: entry.resultDigest
    }))
  ];
  if (evaluation.review.status === "RECORDED") {
    citations.push(Object.freeze({
      kind: "READINESS_REVIEW" as const,
      referenceId: evaluation.review.reviewId,
      referenceDigest: evaluation.review.reviewDigest
    }));
  }
  return Object.freeze(citations);
}

export async function createReleasePassport(
  assessment: ReadinessAssessment,
  dependencies: ReleasePassportDependencies
): Promise<ReleasePassport> {
  let passportId: ReleasePassportId;
  let recordedAtUtc: UtcTimestamp;
  try {
    passportId = dependencies.ids<"RELEASE_PASSPORT">();
    recordedAtUtc = dependencies.clock.now();
    parseSha256Digest(assessment.assessmentDigest);
  } catch {
    return fail("RELEASE_PASSPORT_INPUT_INVALID");
  }
  if (recordedAtUtc < assessment.recordedAtUtc) {
    return fail("RELEASE_PASSPORT_INPUT_INVALID");
  }
  const evaluation = assessment.evaluation;
  const withoutDigest = Object.freeze({
    version: RELEASE_PASSPORT_VERSION,
    digestVersion: RELEASE_PASSPORT_DIGEST_VERSION,
    projectionVersion: RELEASE_PASSPORT_PROJECTION_VERSION,
    keyVersion: RELEASE_PASSPORT_KEY_VERSION,
    passportKey: await passportKey(assessment),
    passportId,
    projectId: assessment.projectId,
    missionId: assessment.missionId,
    recordedAtUtc,
    assessment: Object.freeze({
      assessmentId: assessment.assessmentId,
      revision: assessment.revision,
      assessmentDigest: assessment.assessmentDigest,
      inputFingerprintDigest: assessment.inputFingerprintDigest
    }),
    snapshot: Object.freeze({
      targetSnapshotId: evaluation.targetSnapshotId,
      currentSnapshotId: evaluation.currentSnapshotId
    }),
    rule: Object.freeze({
      policyVersion: evaluation.policyVersion,
      policyDigest: evaluation.policyDigest
    }),
    evidenceDigest: assessment.inputFingerprintDigest,
    status: assessment.evaluatedStatus,
    obligations: evaluation.obligations,
    blockers: evaluation.blockers,
    findings: evaluation.findingCounts,
    validations: Object.freeze({
      requirements: evaluation.validationRequirements,
      evidence: evaluation.validationEvidence
    }),
    review: evaluation.review,
    citations: citationsFor(assessment),
    authority: Object.freeze({
      source: "ONE_PERSISTED_RELEASE_ASSESSMENT" as const,
      projection: "REPRODUCED_NOT_RECOMPUTED" as const,
      historicalRecord: "IMMUTABLE" as const,
      signed: false as const,
      releaseApproval: false as const,
      deploymentAuthority: false as const,
      aiAuthority: "NONE" as const
    })
  });
  return Object.freeze({
    ...withoutDigest,
    passportDigest: await canonicalJsonDigest(withoutDigest as unknown as JsonValue)
  });
}

export async function assertReleasePassportInvariant(
  passport: ReleasePassport,
  assessment: ReadinessAssessment
): Promise<void> {
  try {
    const expected = await createReleasePassport(assessment, {
      ids: (() => parseStableId<"RELEASE_PASSPORT">(passport.passportId)) as StableIdGenerator,
      clock: { now: () => parseUtcTimestamp(passport.recordedAtUtc) }
    });
    if (
      canonicalizeJson(passport as unknown as JsonValue) !==
      canonicalizeJson(expected as unknown as JsonValue)
    ) return fail("RELEASE_PASSPORT_INTEGRITY_INVALID");
    parseSha256Digest(passport.passportDigest);
  } catch (error) {
    if (error instanceof ReleasePassportError) throw error;
    return fail("RELEASE_PASSPORT_INTEGRITY_INVALID");
  }
}

export async function serializeReleasePassport(passport: ReleasePassport): Promise<string> {
  const serialized = canonicalizeJson(passport as unknown as JsonValue);
  if (new TextEncoder().encode(serialized).byteLength > MAXIMUM_RELEASE_PASSPORT_SERIALIZED_BYTES) {
    return fail("RELEASE_PASSPORT_SERIALIZATION_INVALID");
  }
  return serialized;
}

export async function deserializeReleasePassport(
  serialized: string,
  assessment: ReadinessAssessment
): Promise<ReleasePassport> {
  try {
    if (
      typeof serialized !== "string" ||
      new TextEncoder().encode(serialized).byteLength > MAXIMUM_RELEASE_PASSPORT_SERIALIZED_BYTES
    ) return fail("RELEASE_PASSPORT_SERIALIZATION_INVALID");
    const passport = Object.freeze(JSON.parse(serialized) as ReleasePassport);
    await assertReleasePassportInvariant(passport, assessment);
    if (canonicalizeJson(passport as unknown as JsonValue) !== serialized) {
      return fail("RELEASE_PASSPORT_SERIALIZATION_INVALID");
    }
    return passport;
  } catch (error) {
    if (error instanceof ReleasePassportError) throw error;
    return fail("RELEASE_PASSPORT_SERIALIZATION_INVALID");
  }
}

export async function deriveReleasePassportState(
  passport: ReleasePassport,
  assessmentState: ReadinessAssessmentState
): Promise<ReleasePassportState> {
  if (
    passport.assessment.assessmentId !== assessmentState.assessmentId ||
    passport.assessment.revision !== assessmentState.assessmentRevision ||
    passport.assessment.assessmentDigest !== assessmentState.assessmentDigest ||
    passport.status !== assessmentState.evaluatedStatus
  ) return fail("RELEASE_PASSPORT_ASSESSMENT_INVALID");
  const withoutDigest = Object.freeze({
    version: RELEASE_PASSPORT_STATE_VERSION,
    digestVersion: RELEASE_PASSPORT_STATE_DIGEST_VERSION,
    passportId: passport.passportId,
    passportDigest: passport.passportDigest,
    assessmentId: passport.assessment.assessmentId,
    assessmentRevision: passport.assessment.revision,
    statusAtProjection: passport.status,
    status: assessmentState.status,
    staleReasons: assessmentState.staleReasons,
    passportChanged: false as const,
    authority: Object.freeze({
      association: "ASSESSMENT_STATE_REFERENCE" as const,
      readinessRecomputed: false as const,
      persistenceMutation: false as const,
      releaseApproval: false as const,
      deploymentAuthority: false as const,
      aiAuthority: "NONE" as const
    })
  });
  return Object.freeze({
    ...withoutDigest,
    stateDigest: await canonicalJsonDigest(withoutDigest as unknown as JsonValue)
  });
}
