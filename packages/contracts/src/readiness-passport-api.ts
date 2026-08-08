import type {
  ReadinessAssessment,
  ReadinessAssessmentState,
  ReadinessBlocker,
  ReadinessObligationResult,
  ReadinessReviewInput,
  ReadinessValidationEvidence,
  ReadinessValidationRequirement,
  ReconciliationImpactFindingCounts,
  ReleasePassport,
  ReleasePassportCitation,
  ReleasePassportState,
  Sha256Digest
} from "@intelliloop/domain";

export const READINESS_PASSPORT_API_VERSION = "v1" as const;
export const RELEASE_PASSPORT_EXPORT_VERSION = "release-passport-export.v1" as const;

export interface ReadinessAssessmentSummaryResource {
  readonly assessmentId: string;
  readonly revision: number;
  readonly recordedAtUtc: string;
  readonly evaluatedStatus: ReadinessAssessment["evaluatedStatus"];
  readonly currentStatus: ReadinessAssessmentState["status"];
  readonly staleReasons: ReadinessAssessmentState["staleReasons"];
  readonly assessmentDigest: Sha256Digest;
  readonly stateDigest: Sha256Digest;
}

export interface ReadinessAssessmentResource
  extends ReadinessAssessmentSummaryResource {
  readonly version: ReadinessAssessment["version"];
  readonly projectId: string;
  readonly missionId: string;
  readonly inputFingerprint: {
    readonly evaluatedDigest: Sha256Digest;
    readonly currentDigest: Sha256Digest;
  };
  readonly snapshot: {
    readonly targetSnapshotId: string;
    readonly currentSnapshotIdAtAssessment: string;
  };
  readonly reconciliation: {
    readonly revision: number;
    readonly revisionKey: Sha256Digest;
    readonly resultDigest: Sha256Digest;
  };
  readonly rule: {
    readonly policyVersion: string;
    readonly policyDigest: Sha256Digest;
  };
  readonly obligations: readonly ReadinessObligationResult[];
  readonly blockers: readonly ReadinessBlocker[];
  readonly findings: ReconciliationImpactFindingCounts;
  readonly validations: {
    readonly requirements: readonly ReadinessValidationRequirement[];
    readonly evidence: readonly ReadinessValidationEvidence[];
  };
  readonly review: ReadinessReviewInput;
  readonly predecessor?: ReadinessAssessment["predecessor"];
  readonly authority: {
    readonly assessmentPersistence: "PERSISTED_IMMUTABLE";
    readonly readinessStatusAuthority: "DETERMINISTIC_ASSESSMENT";
    readonly currentStateDerivation: "EXACT_DEPENDENCY_COMPARISON";
    readonly storedAssessmentChanged: false;
    readonly releaseApproval: false;
    readonly releasePassport: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
}

export interface ReadinessAssessmentResponse {
  readonly apiVersion: typeof READINESS_PASSPORT_API_VERSION;
  readonly created?: boolean;
  readonly assessment: ReadinessAssessmentResource;
}

export interface ReadinessAssessmentListResponse {
  readonly apiVersion: typeof READINESS_PASSPORT_API_VERSION;
  readonly missionId: string;
  readonly assessments: readonly ReadinessAssessmentSummaryResource[];
  readonly page: {
    readonly limit: number;
    readonly nextCursor: number | null;
  };
}

export interface ReleasePassportSummaryResource {
  readonly passportId: string;
  readonly assessmentId: string;
  readonly assessmentRevision: number;
  readonly recordedAtUtc: string;
  readonly statusAtProjection: ReleasePassport["status"];
  readonly currentStatus: ReleasePassportState["status"];
  readonly staleReasons: ReleasePassportState["staleReasons"];
  readonly passportDigest: Sha256Digest;
  readonly stateDigest: Sha256Digest;
}

export interface ReleasePassportResource extends ReleasePassportSummaryResource {
  readonly version: ReleasePassport["version"];
  readonly projectionVersion: ReleasePassport["projectionVersion"];
  readonly passportKey: Sha256Digest;
  readonly projectId: string;
  readonly missionId: string;
  readonly assessment: ReleasePassport["assessment"];
  readonly snapshot: ReleasePassport["snapshot"];
  readonly rule: ReleasePassport["rule"];
  readonly evidenceDigest: Sha256Digest;
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
    readonly stateAssociation: "ASSESSMENT_STATE_REFERENCE";
    readonly passportChanged: false;
    readonly readinessRecomputed: false;
    readonly signed: false;
    readonly releaseApproval: false;
    readonly deploymentAuthority: false;
    readonly aiAuthority: "NONE";
  };
}

export interface ReleasePassportResponse {
  readonly apiVersion: typeof READINESS_PASSPORT_API_VERSION;
  readonly created?: boolean;
  readonly passport: ReleasePassportResource;
}

export interface ReleasePassportListResponse {
  readonly apiVersion: typeof READINESS_PASSPORT_API_VERSION;
  readonly missionId: string;
  readonly passports: readonly ReleasePassportSummaryResource[];
  readonly page: {
    readonly limit: number;
    readonly nextCursor: number | null;
  };
}

export interface ReleasePassportExportResponse {
  readonly apiVersion: typeof READINESS_PASSPORT_API_VERSION;
  readonly exportVersion: typeof RELEASE_PASSPORT_EXPORT_VERSION;
  readonly contentClassification: "CONTROLLED_STRUCTURAL_METADATA";
  readonly passport: ReleasePassportResource;
  readonly safety: {
    readonly containsSourceBodies: false;
    readonly containsAbsolutePaths: false;
    readonly containsCredentials: false;
    readonly signed: false;
    readonly releaseApproval: false;
    readonly deploymentAuthority: false;
  };
  readonly warnings: readonly [
    "UNSIGNED_LOCAL_RECORD",
    "NOT_RELEASE_APPROVAL",
    "VERIFY_CURRENT_STATUS_BEFORE_USE"
  ];
}

export function toReadinessAssessmentResource(
  assessment: ReadinessAssessment,
  state: ReadinessAssessmentState
): ReadinessAssessmentResource {
  if (
    assessment.assessmentId !== state.assessmentId ||
    assessment.revision !== state.assessmentRevision ||
    assessment.assessmentDigest !== state.assessmentDigest ||
    assessment.evaluatedStatus !== state.evaluatedStatus
  ) throw new TypeError("Readiness assessment and state do not match.");
  const evaluation = assessment.evaluation;
  return Object.freeze({
    version: assessment.version,
    assessmentId: assessment.assessmentId,
    revision: assessment.revision,
    projectId: assessment.projectId,
    missionId: assessment.missionId,
    recordedAtUtc: assessment.recordedAtUtc,
    evaluatedStatus: assessment.evaluatedStatus,
    currentStatus: state.status,
    staleReasons: state.staleReasons,
    assessmentDigest: assessment.assessmentDigest,
    stateDigest: state.stateDigest,
    inputFingerprint: Object.freeze({
      evaluatedDigest: state.evaluatedInputFingerprintDigest,
      currentDigest: state.currentInputFingerprintDigest
    }),
    snapshot: Object.freeze({
      targetSnapshotId: evaluation.targetSnapshotId,
      currentSnapshotIdAtAssessment: evaluation.currentSnapshotId
    }),
    reconciliation: Object.freeze({
      revision: evaluation.reconciliationBinding.revision,
      revisionKey: evaluation.reconciliationBinding.revisionKey,
      resultDigest: evaluation.reconciliationBinding.resultDigest
    }),
    rule: Object.freeze({
      policyVersion: evaluation.policyVersion,
      policyDigest: evaluation.policyDigest
    }),
    obligations: evaluation.obligations,
    blockers: evaluation.blockers,
    findings: evaluation.findingCounts,
    validations: Object.freeze({
      requirements: evaluation.validationRequirements,
      evidence: evaluation.validationEvidence
    }),
    review: evaluation.review,
    ...(assessment.predecessor === undefined ? {} : { predecessor: assessment.predecessor }),
    authority: Object.freeze({
      assessmentPersistence: "PERSISTED_IMMUTABLE" as const,
      readinessStatusAuthority: "DETERMINISTIC_ASSESSMENT" as const,
      currentStateDerivation: "EXACT_DEPENDENCY_COMPARISON" as const,
      storedAssessmentChanged: false as const,
      releaseApproval: false as const,
      releasePassport: false as const,
      deploymentAuthority: false as const,
      aiAuthority: "NONE" as const
    })
  });
}

export function toReadinessAssessmentSummaryResource(
  resource: ReadinessAssessmentResource
): ReadinessAssessmentSummaryResource {
  return Object.freeze({
    assessmentId: resource.assessmentId,
    revision: resource.revision,
    recordedAtUtc: resource.recordedAtUtc,
    evaluatedStatus: resource.evaluatedStatus,
    currentStatus: resource.currentStatus,
    staleReasons: resource.staleReasons,
    assessmentDigest: resource.assessmentDigest,
    stateDigest: resource.stateDigest
  });
}

export function toReleasePassportResource(
  passport: ReleasePassport,
  state: ReleasePassportState
): ReleasePassportResource {
  if (
    passport.passportId !== state.passportId ||
    passport.passportDigest !== state.passportDigest ||
    passport.assessment.assessmentId !== state.assessmentId ||
    passport.assessment.revision !== state.assessmentRevision ||
    passport.status !== state.statusAtProjection
  ) throw new TypeError("Release Passport and state do not match.");
  return Object.freeze({
    version: passport.version,
    projectionVersion: passport.projectionVersion,
    passportKey: passport.passportKey,
    passportId: passport.passportId,
    projectId: passport.projectId,
    missionId: passport.missionId,
    recordedAtUtc: passport.recordedAtUtc,
    assessmentId: passport.assessment.assessmentId,
    assessmentRevision: passport.assessment.revision,
    assessment: passport.assessment,
    snapshot: passport.snapshot,
    rule: passport.rule,
    evidenceDigest: passport.evidenceDigest,
    statusAtProjection: passport.status,
    currentStatus: state.status,
    staleReasons: state.staleReasons,
    obligations: passport.obligations,
    blockers: passport.blockers,
    findings: passport.findings,
    validations: passport.validations,
    review: passport.review,
    citations: passport.citations,
    passportDigest: passport.passportDigest,
    stateDigest: state.stateDigest,
    authority: Object.freeze({
      source: "ONE_PERSISTED_RELEASE_ASSESSMENT" as const,
      projection: "REPRODUCED_NOT_RECOMPUTED" as const,
      historicalRecord: "IMMUTABLE" as const,
      stateAssociation: "ASSESSMENT_STATE_REFERENCE" as const,
      passportChanged: false as const,
      readinessRecomputed: false as const,
      signed: false as const,
      releaseApproval: false as const,
      deploymentAuthority: false as const,
      aiAuthority: "NONE" as const
    })
  });
}

export function toReleasePassportSummaryResource(
  resource: ReleasePassportResource
): ReleasePassportSummaryResource {
  return Object.freeze({
    passportId: resource.passportId,
    assessmentId: resource.assessmentId,
    assessmentRevision: resource.assessmentRevision,
    recordedAtUtc: resource.recordedAtUtc,
    statusAtProjection: resource.statusAtProjection,
    currentStatus: resource.currentStatus,
    staleReasons: resource.staleReasons,
    passportDigest: resource.passportDigest,
    stateDigest: resource.stateDigest
  });
}

export function createReleasePassportExportResponse(
  passport: ReleasePassportResource
): ReleasePassportExportResponse {
  return Object.freeze({
    apiVersion: READINESS_PASSPORT_API_VERSION,
    exportVersion: RELEASE_PASSPORT_EXPORT_VERSION,
    contentClassification: "CONTROLLED_STRUCTURAL_METADATA" as const,
    passport,
    safety: Object.freeze({
      containsSourceBodies: false as const,
      containsAbsolutePaths: false as const,
      containsCredentials: false as const,
      signed: false as const,
      releaseApproval: false as const,
      deploymentAuthority: false as const
    }),
    warnings: Object.freeze([
      "UNSIGNED_LOCAL_RECORD",
      "NOT_RELEASE_APPROVAL",
      "VERIFY_CURRENT_STATUS_BEFORE_USE"
    ] as const)
  });
}
