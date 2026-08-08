import { describe, expect, it } from "vitest";

import {
  ReadinessAssessmentError,
  ReadinessReviewError,
  ReleasePassportError,
  analyzeChangeImpact,
  assertReadinessAssessmentInvariant,
  canonicalizeJson,
  createChangeMission,
  createClock,
  createCodeMapProjectionRevision,
  createGitSnapshot,
  createProject,
  createReadinessAssessment,
  createReadinessReviewRecord,
  createReconciliationImpactRevision,
  createReleasePassport,
  createStableIdGenerator,
  deriveReadinessAssessmentState,
  deriveReleasePassportState,
  deserializeReadinessAssessment,
  deserializeReadinessReview,
  deserializeReleasePassport,
  evaluateReadiness,
  parseUtcTimestamp,
  projectTwinRevision,
  reassessReconciliation,
  serializeReadinessAssessment,
  serializeReadinessReview,
  serializeReleasePassport,
  sha256TextDigest,
  type EvaluateReadinessInput,
  type GitSnapshot,
  type ReconciliationImpactRevision
} from "../src/index.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000031";
const OTHER_SNAPSHOT_ID = "00000000-0000-4000-8000-000000000032";
const VALIDATION_ID = "00000000-0000-4000-8000-000000000041";
const REVIEW_ID = "00000000-0000-4000-8000-000000000051";
const ASSESSMENT_ID_1 = "00000000-0000-4000-8000-000000000061";
const ASSESSMENT_ID_2 = "00000000-0000-4000-8000-000000000062";
const PASSPORT_ID = "00000000-0000-4000-8000-000000000071";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

function ids(...values: string[]) {
  let index = 0;
  return createStableIdGenerator(() => values[index++] ?? "fixture-exhausted");
}

function clock(value: string) {
  return createClock(() => new Date(value));
}

async function fixture(): Promise<{
  readonly reconciliation: ReconciliationImpactRevision;
  readonly snapshot: GitSnapshot;
  readonly input: EvaluateReadinessInput;
}> {
  const project = createProject(
    { name: "Immutable readiness" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-06T06:00:00.000Z") }
  );
  const mission = createChangeMission(
    project, [], { title: "Persist readiness assessment" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-06T06:01:00.000Z") }
  );
  const snapshot = await createGitSnapshot({
    projectId: project.projectId,
    missionId: mission.missionId,
    registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
    head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
    changes: []
  }, { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-06T06:02:00.000Z") });
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-06T06:03:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: await sha256TextDigest("readiness-assessment-source")
    },
    assets: [{
      memberKey: "module:src/release.ts",
      kind: "FILE",
      label: "src/release.ts",
      sourcePath: "src/release.ts",
      sourceDigest: await sha256TextDigest("export const release = true;")
    }],
    edges: []
  });
  const twin = await projectTwinRevision({
    project, mission, evidenceSources: [], claims: [], claimSupersessions: [],
    snapshots: [snapshot], validationResults: [], codeMap
  });
  const reassessment = await reassessReconciliation({
    twin, evidenceSources: [], claims: [], claimSupersessions: [],
    targetSnapshot: snapshot, validationResults: [], requirements: []
  });
  const impact = await analyzeChangeImpact({
    twin, reassessment, codeMap, targetSnapshot: snapshot,
    validationResults: [], roots: [], requirements: []
  });
  const reconciliation = await createReconciliationImpactRevision({ reassessment, impact });
  const input: EvaluateReadinessInput = {
    projectId: project.projectId,
    missionId: mission.missionId,
    reconciliation,
    integrity: "VERIFIED",
    currentSnapshotId: snapshot.snapshotId,
    inputAuthority: "ATTRIBUTED_CANONICAL",
    reconciliationPersistence: "PERSISTED",
    validationRequirements: [{
      requirementId: "release:core",
      validationKey: "test:release/core"
    }],
    validationEvidence: [{
      validationResultId: VALIDATION_ID as EvaluateReadinessInput["validationEvidence"][number]["validationResultId"],
      requirementId: "release:core",
      validationKey: "test:release/core",
      projectId: project.projectId,
      missionId: mission.missionId,
      snapshotId: snapshot.snapshotId,
      status: "PASSED",
      origin: "VALIDATION_RESULT",
      resultDigest: await sha256TextDigest("validation:passed"),
      persistence: "PERSISTED"
    }],
    review: {
      status: "RECORDED",
      reviewId: REVIEW_ID as Extract<EvaluateReadinessInput["review"], { status: "RECORDED" }>["reviewId"],
      actorKind: "HUMAN",
      projectId: project.projectId,
      missionId: mission.missionId,
      snapshotId: snapshot.snapshotId,
      reconciliationResultDigest: reconciliation.resultDigest,
      reviewDigest: await sha256TextDigest("review:human"),
      persistence: "PERSISTED"
    },
    freshness: {
      status: "CURRENT",
      evaluatedInputDigest: reconciliation.inputDigest,
      currentInputDigest: reconciliation.inputDigest
    }
  };
  return { reconciliation, snapshot, input };
}

describe("immutable release assessment", () => {
  it("persists a deterministic evaluation without granting release, Passport or deployment authority", async () => {
    const { input } = await fixture();
    const evaluation = await evaluateReadiness(input);
    const assessment = await createReadinessAssessment(
      evaluation, input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );

    expect(assessment).toMatchObject({
      version: "release-assessment.v1",
      revision: 1,
      evaluatedStatus: "READY",
      inputFingerprintDigest: evaluation.inputDigest,
      authority: {
        assessmentPersistence: "PERSISTED_IMMUTABLE",
        readinessStatusAuthority: "DETERMINISTIC_ASSESSMENT",
        releaseApproval: false,
        releasePassport: false,
        deploymentAuthority: false,
        aiAuthority: "NONE"
      }
    });
    await assertReadinessAssessmentInvariant(assessment, input);
    expect(Object.isFrozen(assessment)).toBe(true);
  });

  it("is idempotent for an exact input and chains a changed input to its predecessor", async () => {
    const { input } = await fixture();
    const firstEvaluation = await evaluateReadiness(input);
    const first = await createReadinessAssessment(
      firstEvaluation, input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const repeated = await createReadinessAssessment(
      firstEvaluation, input, first,
      { ids: ids("not-consumed"), clock: clock("2026-08-06T06:11:00.000Z") }
    );
    expect(repeated).toBe(first);

    const changedInput: EvaluateReadinessInput = {
      ...input,
      validationEvidence: [{
        ...input.validationEvidence[0]!,
        status: "FAILED",
        resultDigest: await sha256TextDigest("validation:failed")
      }]
    };
    const secondEvaluation = await evaluateReadiness(changedInput);
    const second = await createReadinessAssessment(
      secondEvaluation, changedInput, first,
      { ids: ids(ASSESSMENT_ID_2), clock: clock("2026-08-06T06:12:00.000Z") }
    );
    expect(second).toMatchObject({
      revision: 2,
      evaluatedStatus: "BLOCKED",
      predecessor: {
        assessmentId: first.assessmentId,
        revision: 1,
        assessmentDigest: first.assessmentDigest
      }
    });
    await assertReadinessAssessmentInvariant(second, changedInput, first);
  });

  it("derives historical STALE across snapshot and validation changes without rewriting stored bytes", async () => {
    const { input } = await fixture();
    const evaluation = await evaluateReadiness(input);
    const assessment = await createReadinessAssessment(
      evaluation, input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const before = await serializeReadinessAssessment(assessment);
    const changedInput: EvaluateReadinessInput = {
      ...input,
      currentSnapshotId: OTHER_SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"],
      validationEvidence: [{
        ...input.validationEvidence[0]!,
        status: "FAILED",
        resultDigest: await sha256TextDigest("validation:new-failure")
      }]
    };
    const state = await deriveReadinessAssessmentState(
      assessment, await evaluateReadiness(changedInput)
    );

    expect(state.status).toBe("STALE");
    expect(state.staleReasons).toEqual(expect.arrayContaining([
      "SNAPSHOT_CHANGED",
      "VALIDATION_EVIDENCE_CHANGED",
      "INPUT_FINGERPRINT_CHANGED"
    ]));
    expect(state.storedAssessmentChanged).toBe(false);
    expect(await serializeReadinessAssessment(assessment)).toBe(before);
  });

  it("round-trips canonical assessment and review bytes and rejects tampering", async () => {
    const { input, reconciliation, snapshot } = await fixture();
    const evaluation = await evaluateReadiness(input);
    const assessment = await createReadinessAssessment(
      evaluation, input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const serialized = await serializeReadinessAssessment(assessment);
    expect(await deserializeReadinessAssessment(serialized, input)).toEqual(assessment);

    const tampered = JSON.parse(serialized) as Record<string, unknown>;
    tampered.evaluatedStatus = "BLOCKED";
    await expect(
      deserializeReadinessAssessment(canonicalizeJson(tampered), input)
    ).rejects.toBeInstanceOf(ReadinessAssessmentError);

    const review = await createReadinessReviewRecord(
      { actorKind: "HUMAN" }, reconciliation, snapshot,
      { ids: ids(REVIEW_ID), clock: clock("2026-08-06T06:09:00.000Z") }
    );
    const reviewBytes = await serializeReadinessReview(review);
    expect(await deserializeReadinessReview(reviewBytes, reconciliation, snapshot)).toEqual(review);
    await expect(
      deserializeReadinessReview(reviewBytes.replace("HUMAN", "AI_ADVISORY"), reconciliation, snapshot)
    ).rejects.toBeInstanceOf(ReadinessReviewError);
  });
});

describe("thin Release Passport projection", () => {
  it("reproduces exactly one persisted assessment without recomputing readiness", async () => {
    const { input } = await fixture();
    const evaluation = await evaluateReadiness(input);
    const assessment = await createReadinessAssessment(
      evaluation, input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const passport = await createReleasePassport(assessment, {
      ids: ids(PASSPORT_ID),
      clock: clock("2026-08-06T06:11:00.000Z")
    });

    expect(passport).toMatchObject({
      version: "release-passport.v1",
      projectId: assessment.projectId,
      missionId: assessment.missionId,
      assessment: {
        assessmentId: assessment.assessmentId,
        revision: assessment.revision,
        assessmentDigest: assessment.assessmentDigest,
        inputFingerprintDigest: assessment.inputFingerprintDigest
      },
      snapshot: {
        targetSnapshotId: evaluation.targetSnapshotId,
        currentSnapshotId: evaluation.currentSnapshotId
      },
      rule: {
        policyVersion: evaluation.policyVersion,
        policyDigest: evaluation.policyDigest
      },
      evidenceDigest: assessment.inputFingerprintDigest,
      status: assessment.evaluatedStatus,
      obligations: evaluation.obligations,
      blockers: evaluation.blockers,
      findings: evaluation.findingCounts,
      validations: {
        requirements: evaluation.validationRequirements,
        evidence: evaluation.validationEvidence
      },
      review: evaluation.review,
      authority: {
        source: "ONE_PERSISTED_RELEASE_ASSESSMENT",
        projection: "REPRODUCED_NOT_RECOMPUTED",
        historicalRecord: "IMMUTABLE",
        signed: false,
        releaseApproval: false,
        deploymentAuthority: false,
        aiAuthority: "NONE"
      }
    });
    expect(passport.citations.map((entry) => entry.kind)).toEqual([
      "ASSESSMENT", "RECONCILIATION", "TARGET_SNAPSHOT", "CURRENT_SNAPSHOT",
      "VALIDATION_RESULT", "READINESS_REVIEW"
    ]);
  });

  it("has canonical equality and rejects changed projection content or digest", async () => {
    const { input } = await fixture();
    const assessment = await createReadinessAssessment(
      await evaluateReadiness(input), input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const dependencies = {
      ids: ids(PASSPORT_ID),
      clock: clock("2026-08-06T06:11:00.000Z")
    };
    const first = await createReleasePassport(assessment, dependencies);
    const second = await createReleasePassport(assessment, {
      ids: ids(PASSPORT_ID), clock: clock("2026-08-06T06:11:00.000Z")
    });
    expect(second).toEqual(first);
    const serialized = await serializeReleasePassport(first);
    expect(await deserializeReleasePassport(serialized, assessment)).toEqual(first);

    const tampered = JSON.parse(serialized) as Record<string, unknown>;
    tampered.status = "BLOCKED";
    await expect(
      deserializeReleasePassport(canonicalizeJson(tampered), assessment)
    ).rejects.toBeInstanceOf(ReleasePassportError);
  });

  it("shows a stale association while preserving the original Passport bytes", async () => {
    const { input } = await fixture();
    const assessment = await createReadinessAssessment(
      await evaluateReadiness(input), input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const passport = await createReleasePassport(assessment, {
      ids: ids(PASSPORT_ID), clock: clock("2026-08-06T06:11:00.000Z")
    });
    const before = await serializeReleasePassport(passport);
    const changedInput: EvaluateReadinessInput = {
      ...input,
      currentSnapshotId: OTHER_SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"]
    };
    const assessmentState = await deriveReadinessAssessmentState(
      assessment, await evaluateReadiness(changedInput)
    );
    const state = await deriveReleasePassportState(passport, assessmentState);

    expect(state).toMatchObject({
      statusAtProjection: "READY",
      status: "STALE",
      staleReasons: expect.arrayContaining(["SNAPSHOT_CHANGED", "INPUT_FINGERPRINT_CHANGED"]),
      passportChanged: false,
      authority: { readinessRecomputed: false, persistenceMutation: false }
    });
    expect(await serializeReleasePassport(passport)).toBe(before);
  });

  it("rejects a Passport state associated with a different assessment", async () => {
    const { input } = await fixture();
    const assessment = await createReadinessAssessment(
      await evaluateReadiness(input), input, undefined,
      { ids: ids(ASSESSMENT_ID_1), clock: clock("2026-08-06T06:10:00.000Z") }
    );
    const passport = await createReleasePassport(assessment, {
      ids: ids(PASSPORT_ID), clock: clock("2026-08-06T06:11:00.000Z")
    });
    const assessmentState = await deriveReadinessAssessmentState(
      assessment, await evaluateReadiness(input)
    );
    await expect(deriveReleasePassportState(passport, {
      ...assessmentState,
      assessmentId: ASSESSMENT_ID_2 as typeof assessmentState.assessmentId
    })).rejects.toBeInstanceOf(ReleasePassportError);
  });
});
