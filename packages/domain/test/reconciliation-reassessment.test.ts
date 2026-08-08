import { describe, expect, it } from "vitest";

import {
  MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS,
  RECONCILIATION_SUPPORT_POLICY,
  ReassessmentError,
  createChangeMission,
  createClaim,
  createClock,
  createEvidenceSource,
  createGitSnapshot,
  createProject,
  createStableIdGenerator,
  createValidationResult,
  deserializeTwinProjectionRevision,
  diffReconciliationDependencies,
  prepareEvidenceImport,
  projectTwinRevision,
  reassessReconciliation,
  reconciliationSupportPolicyIdentity,
  serializeTwinProjectionRevision,
  type ChangeMission,
  type Claim,
  type ClaimSupersession,
  type EvidenceSource,
  type GitSnapshot,
  type Project,
  type ProjectTwinRevisionInput,
  type ReassessmentErrorCode,
  type ReconciliationDependency,
  type ReconciliationReassessmentResult,
  type ReconciliationSupportRequirementInput,
  type TwinProjectionRevision,
  type ValidationResult
} from "../src/index.js";
import {
  assertReconciliationReassessmentInvariant,
  deserializeReconciliationReassessmentResult,
  serializeReconciliationReassessmentResult
} from "../src/reconciliation-reassessment.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const REQUIREMENT_SOURCE_ID = "00000000-0000-4000-8000-000000000021";
const VALIDATION_SOURCE_ID = "00000000-0000-4000-8000-000000000022";
const UNRELATED_SOURCE_ID = "00000000-0000-4000-8000-000000000023";
const CLAIM_1_ID = "00000000-0000-4000-8000-000000000031";
const CLAIM_2_ID = "00000000-0000-4000-8000-000000000032";
const CLAIM_3_ID = "00000000-0000-4000-8000-000000000033";
const SUPERSESSION_ID = "00000000-0000-4000-8000-000000000034";
const SNAPSHOT_1_ID = "00000000-0000-4000-8000-000000000041";
const SNAPSHOT_2_ID = "00000000-0000-4000-8000-000000000042";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000043";
const VALIDATION_ID = "00000000-0000-4000-8000-000000000051";
const COMMIT_1 = "0123456789abcdef0123456789abcdef01234567";
const COMMIT_2 = "1123456789abcdef0123456789abcdef01234567";
const REQUIREMENT_LOCATOR = "requirement:checkout/timeout";
const VALIDATION_KEY = "test:checkout/timeout";

const REQUIRED_SUPPORT = Object.freeze([
  {
    requirementId: "required:evidence:checkout-timeout",
    supportKind: "EVIDENCE_SOURCE",
    sourceLocator: REQUIREMENT_LOCATOR
  },
  {
    requirementId: "required:validation:checkout-timeout",
    supportKind: "VALIDATION_RESULT",
    validationKey: VALIDATION_KEY
  }
] as const satisfies readonly ReconciliationSupportRequirementInput[]);

function ids(...values: string[]) {
  let index = 0;
  return createStableIdGenerator(() => {
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error("Fixture ID source exhausted.");
    return value;
  });
}

function clock(value: string) {
  return createClock(() => new Date(value));
}

interface Fixture {
  readonly project: Project;
  readonly mission: ChangeMission;
  readonly requirementSource: EvidenceSource;
  readonly validationSource: EvidenceSource;
  readonly unrelatedSource: EvidenceSource;
  readonly claims: readonly [Claim, Claim, Claim];
  readonly supersession: ClaimSupersession;
  readonly snapshot1: GitSnapshot;
  readonly snapshot2: GitSnapshot;
  readonly validationResult: ValidationResult;
  readonly baseInput: ProjectTwinRevisionInput;
  readonly baseTwin: TwinProjectionRevision;
}

async function fixture(): Promise<Fixture> {
  const project = createProject(
    { name: "Checkout modernization" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-05T01:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Reconcile checkout timeout" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-05T01:01:00.000Z") }
  );
  const registrationId = ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">();
  const snapshot1 = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId,
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT_1 },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/timeout.ts" }]
    },
    { ids: ids(SNAPSHOT_1_ID), clock: clock("2026-08-05T01:02:00.000Z") }
  );
  const snapshot2 = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId,
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT_2 },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/timeout.ts" }]
    },
    { ids: ids(SNAPSHOT_2_ID), clock: clock("2026-08-05T01:09:00.000Z") }
  );
  const requirementSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "USER_INPUT",
      sourceLocator: REQUIREMENT_LOCATOR,
      sourceRevision: "rev:1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "TEXT",
        content: new TextEncoder().encode(
          [
            "checkout timeout is 30 seconds",
            "checkout timeout is 45 seconds",
            "checkout timeout is 60 seconds"
          ].join("\n")
        )
      })
    },
    {
      ids: ids(REQUIREMENT_SOURCE_ID),
      clock: clock("2026-08-05T01:03:00.000Z")
    }
  );
  const predecessor = await createClaim(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      evidenceSourceId: requirementSource.evidenceSourceId,
      rawText: "checkout timeout is 30 seconds",
      subject: "checkout timeout",
      predicate: "equals",
      value: 30,
      extractionMethod: "MANUAL_STRUCTURED_INTAKE",
      epistemicLabel: "FACT"
    },
    requirementSource,
    undefined,
    { ids: ids(CLAIM_1_ID), clock: clock("2026-08-05T01:04:00.000Z") }
  );
  const successor = await createClaim(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      evidenceSourceId: requirementSource.evidenceSourceId,
      rawText: "checkout timeout is 45 seconds",
      subject: "checkout timeout",
      predicate: "equals",
      value: 45,
      extractionMethod: "MANUAL_STRUCTURED_INTAKE",
      epistemicLabel: "FACT",
      supersedesClaimId: predecessor.claim.claimId
    },
    requirementSource,
    predecessor.claim,
    {
      ids: ids(CLAIM_2_ID, SUPERSESSION_ID),
      clock: clock("2026-08-05T01:05:00.000Z")
    }
  );
  if (successor.supersession === undefined) {
    throw new Error("Fixture supersession missing.");
  }
  const conflicting = await createClaim(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      evidenceSourceId: requirementSource.evidenceSourceId,
      rawText: "checkout timeout is 60 seconds",
      subject: "checkout timeout",
      predicate: "equals",
      value: 60,
      extractionMethod: "MANUAL_STRUCTURED_INTAKE",
      epistemicLabel: "FACT"
    },
    requirementSource,
    undefined,
    { ids: ids(CLAIM_3_ID), clock: clock("2026-08-05T01:06:00.000Z") }
  );
  const validationSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "VALIDATION_RESULT",
      sourceLocator: "validation:checkout/timeout",
      sourceRevision: "run:1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "JSON",
        content: new TextEncoder().encode(
          '{"suite":"checkout-timeout","status":"failed"}'
        )
      })
    },
    {
      ids: ids(VALIDATION_SOURCE_ID),
      clock: clock("2026-08-05T01:07:00.000Z")
    }
  );
  const validationResult = await createValidationResult(
    {
      validationKey: VALIDATION_KEY,
      status: "FAILED",
      epistemicLabel: "FACT"
    },
    validationSource,
    snapshot1,
    { ids: ids(VALIDATION_ID), clock: clock("2026-08-05T01:08:00.000Z") }
  );
  const unrelatedSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "USER_INPUT",
      sourceLocator: "note:unrelated/accessibility",
      sourceRevision: "rev:1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "TEXT",
        content: new TextEncoder().encode("Accessibility review is scheduled.")
      })
    },
    {
      ids: ids(UNRELATED_SOURCE_ID),
      clock: clock("2026-08-05T01:08:30.000Z")
    }
  );
  const claims = [
    predecessor.claim,
    successor.claim,
    conflicting.claim
  ] as const;
  const baseInput = {
    project,
    mission,
    evidenceSources: [requirementSource],
    claims,
    claimSupersessions: [successor.supersession],
    snapshots: [snapshot1],
    validationResults: []
  } satisfies ProjectTwinRevisionInput;
  return {
    project,
    mission,
    requirementSource,
    validationSource,
    unrelatedSource,
    claims,
    supersession: successor.supersession,
    snapshot1,
    snapshot2,
    validationResult,
    baseInput,
    baseTwin: await projectTwinRevision(baseInput)
  };
}

function reassessmentInput(
  value: Fixture,
  overrides: Partial<Parameters<typeof reassessReconciliation>[0]> = {}
): Parameters<typeof reassessReconciliation>[0] {
  return {
    twin: value.baseTwin,
    evidenceSources: [value.requirementSource],
    claims: value.claims,
    claimSupersessions: [value.supersession],
    targetSnapshot: value.snapshot1,
    validationResults: [],
    requirements: REQUIRED_SUPPORT,
    ...overrides
  };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: ReassessmentErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected reassessment to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ReassessmentError);
    if (!(error instanceof ReassessmentError)) throw error;
    expect(error.code).toBe(code);
    expect(error.message).not.toContain(PROJECT_ID);
  }
}

describe("reconciliation support policy", () => {
  it("pins explicit requirements and exact dependency staleness without AI authority", async () => {
    const first = await reconciliationSupportPolicyIdentity();
    const second = await reconciliationSupportPolicyIdentity();

    expect(second).toEqual(first);
    expect(first).toEqual({
      version: "reconciliation-support-policy.v1",
      digest:
        "sha256:0d5ad6676eab452678e82340c043f8397ab8fa3660b55a287b00398d77f888d7"
    });
    expect(RECONCILIATION_SUPPORT_POLICY).toMatchObject({
      requirementAuthority: "EXPLICIT_DECLARATION_ONLY",
      validationMatch: "EXACT_VALIDATION_KEY_AND_TARGET_SNAPSHOT",
      dependencyStaleness: "EXACT_DEPENDENCY_DIFF_ONLY",
      unrelatedTwinChange: "REASSESS_WITHOUT_STALING_PREDECESSOR",
      historyMutation: "NONE",
      aiAuthority: "NONE"
    });
  });
});

describe("missing support and claim finding composition", () => {
  it("emits only explicitly required absent support and preserves claim findings", async () => {
    const value = await fixture();
    const result = await reassessReconciliation(reassessmentInput(value));

    expect(result.revision).toBe(1);
    expect(result.claimFindings.map((finding) => finding.findingKind)).toEqual([
      "CONFLICT"
    ]);
    expect(result.missingFindings).toHaveLength(1);
    expect(result.missingFindings[0]).toMatchObject({
      entityType: "ReconciliationFinding",
      findingKind: "MISSING",
      status: "OPEN",
      reason: "REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT",
      targetSnapshotId: SNAPSHOT_1_ID,
      requirement: {
        requirementId: "required:validation:checkout-timeout",
        validationKey: VALIDATION_KEY
      }
    });
    expect(result.dependencies.some((item) => item.dependencyKind === "RELATIONSHIP")).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dependencies)).toBe(true);
    expect(Object.isFrozen(result.missingFindings)).toBe(true);
  });

  it("treats an exact failed validation as present while leaving status interpretation downstream", async () => {
    const value = await fixture();
    const twin = await projectTwinRevision({
      ...value.baseInput,
      evidenceSources: [value.requirementSource, value.validationSource],
      validationResults: [value.validationResult]
    });
    const result = await reassessReconciliation(
      reassessmentInput(value, {
        twin,
        evidenceSources: [value.requirementSource, value.validationSource],
        validationResults: [value.validationResult]
      })
    );

    expect(value.validationResult.status).toBe("FAILED");
    expect(result.missingFindings).toEqual([]);
    expect(
      result.dependencies.some(
        (item) => item.dependencyKind === "VALIDATION"
      )
    ).toBe(true);
  });

  it("does not invent missing obligations when no requirements are declared", async () => {
    const value = await fixture();
    const result = await reassessReconciliation(
      reassessmentInput(value, { requirements: [] })
    );

    expect(result.missingFindings).toEqual([]);
  });

  it("reports an exact absent evidence locator", async () => {
    const value = await fixture();
    const result = await reassessReconciliation(
      reassessmentInput(value, {
        requirements: [
          {
            requirementId: "required:evidence:security-review",
            supportKind: "EVIDENCE_SOURCE",
            sourceLocator: "requirement:security/review"
          }
        ]
      })
    );

    expect(result.missingFindings).toHaveLength(1);
    expect(result.missingFindings[0]?.reason).toBe(
      "REQUIRED_EVIDENCE_ABSENT"
    );
  });
});

describe("deterministic reassessment revisions", () => {
  it("is input-order independent and returns the exact prior object for a replay", async () => {
    const value = await fixture();
    const twin = await projectTwinRevision({
      ...value.baseInput,
      evidenceSources: [value.requirementSource, value.validationSource],
      validationResults: [value.validationResult]
    });
    const forwardInput = reassessmentInput(value, {
      twin,
      evidenceSources: [value.requirementSource, value.validationSource],
      validationResults: [value.validationResult]
    });
    const forward = await reassessReconciliation(forwardInput);
    const reordered = await reassessReconciliation({
      ...forwardInput,
      evidenceSources: [...forwardInput.evidenceSources].reverse(),
      claims: [...forwardInput.claims].reverse(),
      claimSupersessions: [...forwardInput.claimSupersessions].reverse(),
      validationResults: [...forwardInput.validationResults].reverse(),
      requirements: [...forwardInput.requirements].reverse()
    });
    const replay = await reassessReconciliation(forwardInput, forward);

    expect(reordered).toEqual(forward);
    expect(replay).toBe(forward);
  });

  it("survives a serialized Twin and predecessor restart without changing bytes", async () => {
    const value = await fixture();
    const original = await reassessReconciliation(reassessmentInput(value));
    const twinBytes = await serializeTwinProjectionRevision(value.baseTwin);
    const restartedTwin = await deserializeTwinProjectionRevision(twinBytes);
    const resultBytes = JSON.stringify(original);
    const restartedResult = JSON.parse(
      resultBytes
    ) as ReconciliationReassessmentResult;
    const replay = await reassessReconciliation(
      reassessmentInput(value, { twin: restartedTwin }),
      restartedResult
    );

    expect(replay).toBe(restartedResult);
    expect(JSON.stringify(replay)).toBe(resultBytes);
  });

  it("appends a stale successor when an exact missing validation dependency arrives", async () => {
    const value = await fixture();
    const first = await reassessReconciliation(reassessmentInput(value));
    const historicalBytes = JSON.stringify(first);
    const successorTwin = await projectTwinRevision(
      {
        ...value.baseInput,
        evidenceSources: [value.requirementSource, value.validationSource],
        validationResults: [value.validationResult]
      },
      value.baseTwin
    );
    const second = await reassessReconciliation(
      reassessmentInput(value, {
        twin: successorTwin,
        evidenceSources: [value.requirementSource, value.validationSource],
        validationResults: [value.validationResult]
      }),
      first
    );

    expect(second.revision).toBe(2);
    expect(second.predecessor).toEqual({
      reassessmentKey: first.reassessmentKey,
      revision: 1,
      resultDigest: first.resultDigest
    });
    expect(second.missingFindings).toEqual([]);
    expect(second.stalePredecessorFinding).toMatchObject({
      findingKind: "STALE",
      status: "OPEN",
      predecessorRevision: 1,
      predecessorDigest: first.resultDigest,
      reason: "EXACT_DEPENDENCY_CHANGED"
    });
    expect(
      second.stalePredecessorFinding?.dependencyChanges.map((change) => [
        change.changeType,
        change.dependencyKind
      ])
    ).toEqual(expect.arrayContaining([["ADDED", "VALIDATION"]]));
    expect(JSON.stringify(first)).toBe(historicalBytes);
  });

  it("reassesses an unrelated Twin change without marking the predecessor stale", async () => {
    const value = await fixture();
    const requirements = [REQUIRED_SUPPORT[0]];
    const first = await reassessReconciliation(
      reassessmentInput(value, { requirements })
    );
    const successorTwin = await projectTwinRevision(
      {
        ...value.baseInput,
        evidenceSources: [value.requirementSource, value.unrelatedSource]
      },
      value.baseTwin
    );
    const second = await reassessReconciliation(
      reassessmentInput(value, {
        twin: successorTwin,
        evidenceSources: [value.requirementSource, value.unrelatedSource],
        requirements
      }),
      first
    );

    expect(second.revision).toBe(2);
    expect(second.twinBinding.revision).toBe(2);
    expect(second.predecessor?.resultDigest).toBe(first.resultDigest);
    expect(second.stalePredecessorFinding).toBeUndefined();
    expect(second.dependencies).toEqual(first.dependencies);
  });

  it("marks a changed target snapshot as an exact snapshot dependency change", async () => {
    const value = await fixture();
    const requirements = [REQUIRED_SUPPORT[0]];
    const first = await reassessReconciliation(
      reassessmentInput(value, { requirements })
    );
    const successorTwin = await projectTwinRevision(
      { ...value.baseInput, snapshots: [value.snapshot1, value.snapshot2] },
      value.baseTwin
    );
    const second = await reassessReconciliation(
      reassessmentInput(value, {
        twin: successorTwin,
        targetSnapshot: value.snapshot2,
        requirements
      }),
      first
    );
    const snapshotChanges =
      second.stalePredecessorFinding?.dependencyChanges.filter(
        (change) => change.dependencyKind === "SNAPSHOT"
      );

    expect(second.targetSnapshotId).toBe(SNAPSHOT_2_ID);
    expect(snapshotChanges?.map((change) => change.changeType).sort()).toEqual([
      "ADDED",
      "REMOVED"
    ]);
  });
});

describe("exact dependency invalidation matrix", () => {
  it("classifies source, snapshot, relationship, validation and rule changes by exact key", () => {
    const beforeDigest = `sha256:${"a".repeat(64)}` as never;
    const afterDigest = `sha256:${"b".repeat(64)}` as never;
    const kinds = [
      "SOURCE",
      "SNAPSHOT",
      "RELATIONSHIP",
      "VALIDATION",
      "RULE_SET"
    ] as const;
    const before = kinds.map((dependencyKind) => ({
      dependencyKind,
      dependencyKey: `matrix:${dependencyKind}`,
      digest: beforeDigest
    })) satisfies readonly ReconciliationDependency[];
    const after = kinds.map((dependencyKind) => ({
      dependencyKind,
      dependencyKey: `matrix:${dependencyKind}`,
      digest: afterDigest
    })) satisfies readonly ReconciliationDependency[];
    const changes = diffReconciliationDependencies(before, after);

    expect(changes).toHaveLength(kinds.length);
    expect(new Set(changes.map((change) => change.dependencyKind))).toEqual(
      new Set(kinds)
    );
    expect(changes.every((change) => change.changeType === "CHANGED")).toBe(
      true
    );
  });

  it("classifies exact additions and removals without widening invalidation", () => {
    const digest = `sha256:${"c".repeat(64)}` as never;
    const changes = diffReconciliationDependencies(
      [
        {
          dependencyKind: "SOURCE",
          dependencyKey: "removed:source",
          digest
        }
      ],
      [
        {
          dependencyKind: "VALIDATION",
          dependencyKey: "added:validation",
          digest
        }
      ]
    );

    expect(changes).toEqual([
      {
        changeType: "ADDED",
        dependencyKind: "VALIDATION",
        dependencyKey: "added:validation",
        afterDigest: digest
      },
      {
        changeType: "REMOVED",
        dependencyKind: "SOURCE",
        dependencyKey: "removed:source",
        beforeDigest: digest
      }
    ]);
  });
});

describe("reassessment rejection boundaries", () => {
  it("round-trips canonical persisted bytes and rejects structural tampering", async () => {
    const value = await fixture();
    const result = await reassessReconciliation(reassessmentInput(value));
    await expect(
      assertReconciliationReassessmentInvariant(result)
    ).resolves.toBeUndefined();

    const serialized = await serializeReconciliationReassessmentResult(result);
    const hydrated = await deserializeReconciliationReassessmentResult(
      serialized
    );
    expect(await serializeReconciliationReassessmentResult(hydrated)).toBe(
      serialized
    );

    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    await expect(
      deserializeReconciliationReassessmentResult(
        JSON.stringify({ ...parsed, unexpectedAuthority: true })
      )
    ).rejects.toMatchObject({
      code: "REASSESSMENT_SERIALIZATION_INVALID"
    });
    await expect(
      assertReconciliationReassessmentInvariant({
        ...result,
        resultDigest: `sha256:${"0".repeat(64)}` as never
      })
    ).rejects.toMatchObject({ code: "REASSESSMENT_INTEGRITY_INVALID" });
  });

  it("rejects malformed, duplicate and over-limit support declarations", async () => {
    const value = await fixture();
    await expectCode(
      () =>
        reassessReconciliation(
          reassessmentInput(value, {
            requirements: [
              {
                requirementId: "INVALID KEY",
                supportKind: "EVIDENCE_SOURCE",
                sourceLocator: REQUIREMENT_LOCATOR
              }
            ]
          })
        ),
      "REASSESSMENT_REQUIREMENT_INVALID"
    );
    await expectCode(
      () =>
        reassessReconciliation(
          reassessmentInput(value, {
            requirements: [REQUIRED_SUPPORT[0], REQUIRED_SUPPORT[0]]
          })
        ),
      "REASSESSMENT_REQUIREMENT_INVALID"
    );
    const excessive = Array.from(
      { length: MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS + 1 },
      (_, index) => ({
        requirementId: `required:evidence:${index}`,
        supportKind: "EVIDENCE_SOURCE" as const,
        sourceLocator: REQUIREMENT_LOCATOR
      })
    );
    await expectCode(
      () =>
        reassessReconciliation(
          reassessmentInput(value, { requirements: excessive })
        ),
      "REASSESSMENT_LIMIT_EXCEEDED"
    );
  });

  it("rejects a valid snapshot not present in the supplied Twin", async () => {
    const value = await fixture();
    await expectCode(
      () =>
        reassessReconciliation(
          reassessmentInput(value, {
            targetSnapshot: value.snapshot2,
            requirements: []
          })
        ),
      "REASSESSMENT_TWIN_INVALID"
    );
  });

  it("rejects a forged predecessor instead of extending mutable history", async () => {
    const value = await fixture();
    const first = await reassessReconciliation(reassessmentInput(value));
    const forged = {
      ...first,
      resultDigest: `sha256:${"f".repeat(64)}`
    } as ReconciliationReassessmentResult;

    await expectCode(
      () => reassessReconciliation(reassessmentInput(value), forged),
      "REASSESSMENT_PREDECESSOR_INVALID"
    );
  });
});
