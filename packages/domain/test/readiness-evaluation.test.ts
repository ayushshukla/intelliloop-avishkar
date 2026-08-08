import { describe, expect, it } from "vitest";

import {
  MAXIMUM_READINESS_VALIDATION_REQUIREMENTS,
  READINESS_OBLIGATION_CATALOG,
  READINESS_POLICY_VERSION,
  READINESS_STATUSES,
  ReadinessEvaluationError,
  analyzeChangeImpact,
  assertReadinessEvaluationInvariant,
  createChangeMission,
  createClock,
  createCodeMapProjectionRevision,
  createGitSnapshot,
  createProject,
  createReconciliationImpactRevision,
  createStableIdGenerator,
  evaluateReadiness,
  parseUtcTimestamp,
  projectTwinRevision,
  reassessReconciliation,
  sha256TextDigest,
  type EvaluateReadinessInput,
  type ReadinessBlockerCode,
  type ReadinessEvaluation,
  type ReadinessEvaluationErrorCode,
  type ReconciliationImpactRevision
} from "../src/index.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_PROJECT_ID = "00000000-0000-4000-8000-000000000002";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const OTHER_MISSION_ID = "00000000-0000-4000-8000-000000000012";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000031";
const OTHER_SNAPSHOT_ID = "00000000-0000-4000-8000-000000000032";
const VALIDATION_ID = "00000000-0000-4000-8000-000000000041";
const VALIDATION_ID_2 = "00000000-0000-4000-8000-000000000042";
const REVIEW_ID = "00000000-0000-4000-8000-000000000051";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

function ids(...values: string[]) {
  let index = 0;
  return createStableIdGenerator(() => {
    const value = values[index++];
    if (value === undefined) throw new Error("Fixture ID source exhausted.");
    return value;
  });
}

function clock(value: string) {
  return createClock(() => new Date(value));
}

async function reconciliationFixture(): Promise<ReconciliationImpactRevision> {
  const project = createProject(
    { name: "Readiness truth table" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-06T06:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Evaluate release obligations" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-06T06:01:00.000Z") }
  );
  const snapshot = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
      changes: []
    },
    { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-06T06:02:00.000Z") }
  );
  const sourceDigest = await sha256TextDigest("export const cancellation = true;");
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-06T06:03:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: await sha256TextDigest("readiness-source-v1")
    },
    assets: [{
      memberKey: "module:src/cancellation.ts",
      kind: "FILE",
      label: "src/cancellation.ts",
      sourcePath: "src/cancellation.ts",
      sourceDigest
    }],
    edges: []
  });
  const twin = await projectTwinRevision({
    project,
    mission,
    evidenceSources: [],
    claims: [],
    claimSupersessions: [],
    snapshots: [snapshot],
    validationResults: [],
    codeMap
  });
  const reassessment = await reassessReconciliation({
    twin,
    evidenceSources: [],
    claims: [],
    claimSupersessions: [],
    targetSnapshot: snapshot,
    validationResults: [],
    requirements: []
  });
  const impact = await analyzeChangeImpact({
    twin,
    reassessment,
    codeMap,
    targetSnapshot: snapshot,
    validationResults: [],
    roots: [],
    requirements: []
  });
  return createReconciliationImpactRevision({ reassessment, impact });
}

async function readyInput(): Promise<EvaluateReadinessInput> {
  const reconciliation = await reconciliationFixture();
  const validationDigest = await sha256TextDigest("validation:cancel:passed");
  const reviewDigest = await sha256TextDigest("human-review:approved-for-evaluation");
  return {
    projectId: PROJECT_ID as EvaluateReadinessInput["projectId"],
    missionId: MISSION_ID as EvaluateReadinessInput["missionId"],
    reconciliation,
    integrity: "VERIFIED",
    currentSnapshotId: SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"],
    inputAuthority: "ATTRIBUTED_CANONICAL",
    reconciliationPersistence: "PERSISTED",
    validationRequirements: [{
      requirementId: "release:cancellation",
      validationKey: "test:cancellation"
    }],
    validationEvidence: [{
      validationResultId: VALIDATION_ID as EvaluateReadinessInput["validationEvidence"][number]["validationResultId"],
      requirementId: "release:cancellation",
      validationKey: "test:cancellation",
      projectId: PROJECT_ID as EvaluateReadinessInput["projectId"],
      missionId: MISSION_ID as EvaluateReadinessInput["missionId"],
      snapshotId: SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"],
      status: "PASSED",
      origin: "VALIDATION_RESULT",
      resultDigest: validationDigest,
      persistence: "PERSISTED"
    }],
    review: {
      status: "RECORDED",
      reviewId: REVIEW_ID as Extract<EvaluateReadinessInput["review"], { status: "RECORDED" }>["reviewId"],
      actorKind: "HUMAN",
      projectId: PROJECT_ID as EvaluateReadinessInput["projectId"],
      missionId: MISSION_ID as EvaluateReadinessInput["missionId"],
      snapshotId: SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"],
      reconciliationResultDigest: reconciliation.resultDigest,
      reviewDigest,
      persistence: "PERSISTED"
    },
    freshness: {
      status: "CURRENT",
      evaluatedInputDigest: reconciliation.inputDigest,
      currentInputDigest: reconciliation.inputDigest
    }
  };
}

function codes(value: ReadinessEvaluation): readonly ReadinessBlockerCode[] {
  return value.blockers.map((entry) => entry.code);
}

function findings(
  input: EvaluateReadinessInput,
  key: "CONFLICT" | "AMBIGUOUS" | "MISSING" | "STALE" | "IMPACT_GAP"
): EvaluateReadinessInput {
  const findingCounts = {
    CONFLICT: 0,
    AMBIGUOUS: 0,
    MISSING: 0,
    STALE: 0,
    IMPACT_GAP: 0,
    total: 1,
    [key]: 1
  };
  return {
    ...input,
    integrity: "UNVERIFIED",
    reconciliation: { ...input.reconciliation, findingCounts } as ReconciliationImpactRevision
  };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: ReadinessEvaluationErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected readiness evaluation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ReadinessEvaluationError);
    if (!(error instanceof ReadinessEvaluationError)) throw error;
    expect(error.code).toBe(code);
  }
}

describe("readiness.v1 fail-closed evaluator", () => {
  it("records the frozen catalog and returns READY only for every satisfied obligation", async () => {
    const input = await readyInput();
    const result = await evaluateReadiness(input);

    expect(READINESS_POLICY_VERSION).toBe("readiness.v1");
    expect(READINESS_STATUSES).toEqual(["BLOCKED", "READY", "STALE"]);
    expect(READINESS_OBLIGATION_CATALOG).toHaveLength(9);
    expect(result).toMatchObject({
      status: "READY",
      blockers: [],
      policyVersion: "readiness.v1",
      authority: {
        evaluationPersistence: "NOT_PERSISTED",
        readinessAuthority: "EVALUATION_ONLY_UNTIL_PERSISTED",
        releaseDecision: false,
        releasePassport: false,
        deploymentAuthority: false,
        aiAuthority: "NONE"
      }
    });
    expect(result.obligations.every((entry) => entry.status === "SATISFIED")).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    await assertReadinessEvaluationInvariant(result, input);
  });

  it.each([
    ["unverified integrity", (value: EvaluateReadinessInput) => ({ ...value, integrity: "UNVERIFIED" as const }), "BLOCKED", "INTEGRITY_UNVERIFIED"],
    ["wrong scope", (value: EvaluateReadinessInput) => ({ ...value, projectId: OTHER_PROJECT_ID as EvaluateReadinessInput["projectId"] }), "BLOCKED", "SCOPE_MISMATCH"],
    ["changed snapshot", (value: EvaluateReadinessInput) => ({ ...value, currentSnapshotId: OTHER_SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"] }), "STALE", "SNAPSHOT_CHANGED"],
    ["empty validation catalog", (value: EvaluateReadinessInput) => ({ ...value, validationRequirements: [], validationEvidence: [] }), "BLOCKED", "VALIDATION_CATALOG_EMPTY"],
    ["missing validation", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [] }), "BLOCKED", "VALIDATION_MISSING"],
    ["failed validation", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [{ ...value.validationEvidence[0]!, status: "FAILED" as const }] }), "BLOCKED", "VALIDATION_FAILED"],
    ["inconclusive validation", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [{ ...value.validationEvidence[0]!, status: "INCONCLUSIVE" as const }] }), "BLOCKED", "VALIDATION_INCONCLUSIVE"],
    ["unknown validation scope", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [{ ...value.validationEvidence[0]!, missionId: OTHER_MISSION_ID as EvaluateReadinessInput["missionId"] }] }), "BLOCKED", "VALIDATION_SCOPE_UNKNOWN"],
    ["stale validation", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [{ ...value.validationEvidence[0]!, snapshotId: OTHER_SNAPSHOT_ID as EvaluateReadinessInput["currentSnapshotId"] }] }), "STALE", "VALIDATION_STALE"],
    ["AI validation", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [{ ...value.validationEvidence[0]!, origin: "AI_ADVISORY" as const }] }), "BLOCKED", "AI_ADVISORY_INPUT"],
    ["unpersisted validation", (value: EvaluateReadinessInput) => ({ ...value, validationEvidence: [{ ...value.validationEvidence[0]!, persistence: "UNPERSISTED" as const }] }), "BLOCKED", "VALIDATION_UNPERSISTED"],
    ["missing review", (value: EvaluateReadinessInput) => ({ ...value, review: { status: "MISSING" as const } }), "BLOCKED", "REVIEW_MISSING"],
    ["AI review", (value: EvaluateReadinessInput) => ({ ...value, review: { ...value.review, actorKind: "AI_ADVISORY" as const } as EvaluateReadinessInput["review"] }), "BLOCKED", "REVIEW_NOT_HUMAN"],
    ["review scope mismatch", (value: EvaluateReadinessInput) => ({ ...value, review: { ...value.review, missionId: OTHER_MISSION_ID } as EvaluateReadinessInput["review"] }), "BLOCKED", "REVIEW_SCOPE_MISMATCH"],
    ["stale review", (value: EvaluateReadinessInput) => ({ ...value, review: { ...value.review, snapshotId: OTHER_SNAPSHOT_ID } as EvaluateReadinessInput["review"] }), "STALE", "REVIEW_STALE"],
    ["unpersisted review", (value: EvaluateReadinessInput) => ({ ...value, review: { ...value.review, persistence: "UNPERSISTED" as const } as EvaluateReadinessInput["review"] }), "BLOCKED", "REVIEW_UNPERSISTED"],
    ["unknown freshness", (value: EvaluateReadinessInput) => ({ ...value, freshness: { status: "UNKNOWN" as const, evaluatedInputDigest: value.reconciliation.inputDigest } }), "BLOCKED", "DEPENDENCY_FRESHNESS_UNKNOWN"],
    ["changed dependency", (value: EvaluateReadinessInput) => ({ ...value, freshness: { status: "STALE" as const, evaluatedInputDigest: value.reconciliation.inputDigest, currentInputDigest: `sha256:${"f".repeat(64)}` as EvaluateReadinessInput["freshness"] extends { currentInputDigest: infer T } ? T : never } }), "STALE", "DEPENDENCY_CHANGED"],
    ["sample placeholder", (value: EvaluateReadinessInput) => ({ ...value, inputAuthority: "SAMPLE_PLACEHOLDER" as const }), "BLOCKED", "SAMPLE_INPUT"],
    ["AI authority", (value: EvaluateReadinessInput) => ({ ...value, inputAuthority: "AI_ADVISORY" as const }), "BLOCKED", "AI_ADVISORY_INPUT"],
    ["unpersisted reconciliation", (value: EvaluateReadinessInput) => ({ ...value, reconciliationPersistence: "UNPERSISTED" as const }), "BLOCKED", "RECONCILIATION_UNPERSISTED"]
  ] as const)("fails closed for %s", async (_name, mutate, expectedStatus, expectedCode) => {
    const result = await evaluateReadiness(mutate(await readyInput()));
    expect(result.status).toBe(expectedStatus);
    expect(codes(result)).toContain(expectedCode);
    expect(result.status).not.toBe("READY");
  });

  it.each([
    ["CONFLICT", "OPEN_CONFLICT"],
    ["AMBIGUOUS", "OPEN_AMBIGUITY"],
    ["MISSING", "MISSING_SUPPORT"],
    ["IMPACT_GAP", "OPEN_IMPACT_GAP"]
  ] as const)("maps open %s findings without trusting an unverified aggregate", async (kind, code) => {
    const result = await evaluateReadiness(findings(await readyInput(), kind));
    expect(result.status).toBe("BLOCKED");
    expect(codes(result)).toEqual(expect.arrayContaining(["INTEGRITY_UNVERIFIED", code]));
  });

  it("does not stale a current evaluation merely because it records a stale predecessor", async () => {
    const result = await evaluateReadiness(findings(await readyInput(), "STALE"));
    expect(result.status).toBe("BLOCKED");
    expect(codes(result)).toEqual(["INTEGRITY_UNVERIFIED"]);
    expect(codes(result)).not.toContain("DEPENDENCY_CHANGED");
  });

  it("rejects fallback and incomplete code maps as readiness authority", async () => {
    const input = await readyInput();
    const reconciliation = {
      ...input.reconciliation,
      codeMapBinding: {
        ...input.reconciliation.codeMapBinding,
        evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
        inferenceStatus: "UNAVAILABLE_SAFE_FAILURE",
        completeness: "UNAVAILABLE"
      }
    } as ReconciliationImpactRevision;
    const result = await evaluateReadiness({ ...input, integrity: "UNVERIFIED", reconciliation });
    expect(result.status).toBe("BLOCKED");
    expect(codes(result)).toEqual(expect.arrayContaining([
      "INTEGRITY_UNVERIFIED", "FALLBACK_INPUT", "INCOMPLETE_CODE_MAP"
    ]));
  });

  it("canonicalizes validation ordering and produces identical policy/input/result digests", async () => {
    const first = await readyInput();
    const secondDigest = await sha256TextDigest("validation:refund:passed");
    const requirement = { requirementId: "release:refund", validationKey: "test:refund" };
    const evidence = {
      ...first.validationEvidence[0]!,
      validationResultId: VALIDATION_ID_2 as EvaluateReadinessInput["validationEvidence"][number]["validationResultId"],
      requirementId: requirement.requirementId,
      validationKey: requirement.validationKey,
      resultDigest: secondDigest
    };
    const forward = await evaluateReadiness({
      ...first,
      validationRequirements: [...first.validationRequirements, requirement],
      validationEvidence: [...first.validationEvidence, evidence]
    });
    const reversed = await evaluateReadiness({
      ...first,
      validationRequirements: [requirement, ...first.validationRequirements],
      validationEvidence: [evidence, ...first.validationEvidence]
    });
    expect(reversed).toEqual(forward);
  });

  it("rejects malformed coherence, oversized catalogs, unknown members and tampered results", async () => {
    const input = await readyInput();
    await expectCode(
      () => evaluateReadiness({
        ...input,
        freshness: {
          status: "CURRENT",
          evaluatedInputDigest: input.reconciliation.inputDigest,
          currentInputDigest: `sha256:${"e".repeat(64)}`
        }
      } as EvaluateReadinessInput),
      "READINESS_INPUT_INVALID"
    );
    await expectCode(
      () => evaluateReadiness({
        ...input,
        validationRequirements: Array.from(
          { length: MAXIMUM_READINESS_VALIDATION_REQUIREMENTS + 1 },
          (_, index) => ({ requirementId: `release:${index}`, validationKey: `test:${index}` })
        )
      }),
      "READINESS_LIMIT_EXCEEDED"
    );
    await expectCode(
      () => evaluateReadiness({ ...input, readinessOverride: "READY" } as unknown as EvaluateReadinessInput),
      "READINESS_INPUT_INVALID"
    );
    const value = await evaluateReadiness(input);
    await expectCode(
      () => assertReadinessEvaluationInvariant({ ...value, status: "BLOCKED" }, input),
      "READINESS_INTEGRITY_INVALID"
    );
  });

  it("rejects a tampered aggregate when the caller claims verified integrity", async () => {
    const input = await readyInput();
    const reconciliation = {
      ...input.reconciliation,
      resultDigest: `sha256:${"a".repeat(64)}`
    } as ReconciliationImpactRevision;
    await expectCode(
      () => evaluateReadiness({ ...input, reconciliation }),
      "READINESS_INTEGRITY_INVALID"
    );
  });
});
