import { describe, expect, it } from "vitest";

import {
  TwinProjectionError,
  archiveChangeMission,
  assertTwinProjectionRevisionInvariant,
  assertValidationResultInvariant,
  createChangeMission,
  createClaim,
  createClock,
  createCodeMapProjectionRevision,
  createEvidenceSource,
  createGitSnapshot,
  createProject,
  createStableIdGenerator,
  createValidationResult,
  deserializeTwinProjectionRevision,
  prepareEvidenceImport,
  parseSha256Digest,
  parseUtcTimestamp,
  projectTwinRevision,
  serializeTwinProjectionRevision,
  type ChangeMission,
  type EvidenceSource,
  type GitSnapshot,
  type Project,
  type ProjectTwinRevisionInput,
  type ValidationResult
} from "../src/index.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const REQUIREMENT_SOURCE_ID = "00000000-0000-4000-8000-000000000021";
const VALIDATION_SOURCE_ID = "00000000-0000-4000-8000-000000000022";
const CLAIM_ID = "00000000-0000-4000-8000-000000000031";
const SUCCESSOR_CLAIM_ID = "00000000-0000-4000-8000-000000000032";
const SUPERSESSION_ID = "00000000-0000-4000-8000-000000000033";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000041";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000042";
const VALIDATION_ID = "00000000-0000-4000-8000-000000000051";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

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
  readonly input: ProjectTwinRevisionInput;
  readonly project: Project;
  readonly mission: ChangeMission;
  readonly requirementSource: EvidenceSource;
  readonly validationSource: EvidenceSource;
  readonly snapshot: GitSnapshot;
  readonly validationResult: ValidationResult;
}

async function fixture(): Promise<Fixture> {
  const project = createProject(
    { name: "Checkout modernization" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-05T01:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Change timeout behavior" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-05T01:01:00.000Z") }
  );
  const snapshot = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/timeout.ts" }]
    },
    { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-05T01:02:00.000Z") }
  );
  const requirementPrepared = await prepareEvidenceImport({
    format: "TEXT",
    content: new TextEncoder().encode(
      "checkout timeout is 30 seconds\ncheckout timeout is 45 seconds"
    )
  });
  const requirementSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "USER_INPUT",
      sourceLocator: "requirement:checkout/timeout",
      sourceRevision: "rev:1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: requirementPrepared
    },
    {
      ids: ids(REQUIREMENT_SOURCE_ID),
      clock: clock("2026-08-05T01:03:00.000Z")
    }
  );
  const first = await createClaim(
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
    { ids: ids(CLAIM_ID), clock: clock("2026-08-05T01:04:00.000Z") }
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
      supersedesClaimId: first.claim.claimId
    },
    requirementSource,
    first.claim,
    {
      ids: ids(SUCCESSOR_CLAIM_ID, SUPERSESSION_ID),
      clock: clock("2026-08-05T01:05:00.000Z")
    }
  );
  if (successor.supersession === undefined) {
    throw new Error("Fixture supersession missing.");
  }

  const validationPrepared = await prepareEvidenceImport({
    format: "JSON",
    content: new TextEncoder().encode(
      '{"suite":"checkout-timeout","status":"passed"}'
    )
  });
  const validationSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "VALIDATION_RESULT",
      sourceLocator: "validation:checkout/timeout",
      sourceRevision: "run:1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: validationPrepared
    },
    {
      ids: ids(VALIDATION_SOURCE_ID),
      clock: clock("2026-08-05T01:06:00.000Z")
    }
  );
  const validationResult = await createValidationResult(
    {
      validationKey: "test:checkout/timeout",
      status: "PASSED",
      epistemicLabel: "FACT"
    },
    validationSource,
    snapshot,
    {
      ids: ids(VALIDATION_ID),
      clock: clock("2026-08-05T01:07:00.000Z")
    }
  );
  return {
    project,
    mission,
    requirementSource,
    validationSource,
    snapshot,
    validationResult,
    input: {
      project,
      mission,
      evidenceSources: [requirementSource, validationSource],
      claims: [first.claim, successor.claim],
      claimSupersessions: [successor.supersession],
      snapshots: [snapshot],
      validationResults: [validationResult]
    }
  };
}

function expectCode(operation: () => Promise<unknown>, code: string): Promise<void> {
  return operation().then(
    () => {
      throw new Error("Expected operation to fail.");
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(TwinProjectionError);
      expect((error as TwinProjectionError).code).toBe(code);
    }
  );
}

describe("ValidationResult projection source", () => {
  it("binds one immutable attributed result to exact evidence and snapshot", async () => {
    const value = await fixture();
    await expect(
      assertValidationResultInvariant(
        value.validationResult,
        value.validationSource,
        value.snapshot
      )
    ).resolves.toBeUndefined();
    expect(value.validationResult).toMatchObject({
      status: "PASSED",
      extractionMethod: "STRUCTURED_VALIDATION_INTAKE",
      snapshotId: SNAPSHOT_ID,
      evidenceSourceId: VALIDATION_SOURCE_ID
    });
    expect(value.validationResult.resultDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(value.validationResult)).toBe(true);
  });
});

describe("immutable Twin projection revisions", () => {
  it("materializes the actual scoped entity graph with source bindings", async () => {
    const value = await fixture();
    const projection = await projectTwinRevision(value.input);
    expect(projection.revision).toBe(1);
    expect(projection.nodes).toHaveLength(8);
    expect(projection.relationships).toHaveLength(14);
    expect(projection.nodeSources).toHaveLength(projection.nodes.length);
    expect(new Set(projection.nodes.map((node) => node.nodeType))).toEqual(
      new Set([
        "Project",
        "ChangeMission",
        "EvidenceSource",
        "Claim",
        "GitSnapshot",
        "ValidationResult"
      ])
    );
    expect(
      projection.relationships.some(
        (relationship) => relationship.relationshipType === "SUPERSEDES"
      )
    ).toBe(true);
    expect(
      projection.relationships.some(
        (relationship) => relationship.relationshipType === "BOUND_TO"
      )
    ).toBe(true);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.nodes)).toBe(true);
  });

  it("is deterministic across input order and independent first projection calls", async () => {
    const value = await fixture();
    const first = await projectTwinRevision(value.input);
    const reordered = await projectTwinRevision({
      ...value.input,
      evidenceSources: [...value.input.evidenceSources].reverse(),
      claims: [...value.input.claims].reverse(),
      claimSupersessions: [...value.input.claimSupersessions].reverse(),
      snapshots: [...value.input.snapshots].reverse(),
      validationResults: [...value.input.validationResults].reverse()
    });
    expect(reordered).toEqual(first);
    expect(await serializeTwinProjectionRevision(reordered)).toBe(
      await serializeTwinProjectionRevision(first)
    );
    expect(await projectTwinRevision(value.input, first)).toBe(first);
  });

  it("projects inferred code assets with exact snapshot bindings and distinct declared labels", async () => {
    const value = await fixture();
    const sourceDigest = parseSha256Digest(
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    const memberInputs = {
      assets: [
        {
          memberKey: "file:src/timeout.ts",
          kind: "FILE" as const,
          label: "src/timeout.ts",
          sourcePath: "src/timeout.ts",
          sourceDigest
        },
        {
          memberKey: "contract:src/timeout.ts:TimeoutPolicy",
          kind: "CONTRACT" as const,
          label: "TimeoutPolicy",
          sourcePath: "src/timeout.ts",
          sourceDigest
        }
      ],
      edges: [
        {
          memberKey: "declares:TimeoutPolicy",
          kind: "DECLARES_CONTRACT" as const,
          fromMemberKey: "contract:src/timeout.ts:TimeoutPolicy",
          toMemberKey: "file:src/timeout.ts"
        }
      ]
    };
    const inferred = await createCodeMapProjectionRevision({
      snapshot: value.snapshot,
      recordedAtUtc: parseUtcTimestamp("2026-08-05T01:08:00.000Z"),
      mode: {
        evidenceKind: "STATIC_INFERENCE",
        completeness: "COMPLETE",
        sourceDigest
      },
      ...memberInputs
    });
    const inferredTwin = await projectTwinRevision({
      ...value.input,
      codeMap: inferred
    });
    expect(inferredTwin.codeMapBinding).toEqual({
      projectionId: inferred.projectionId,
      revision: inferred.revision,
      projectionDigest: inferred.projectionDigest
    });
    const softwareNodes = inferredTwin.nodes.filter(
      (node) => node.nodeType === "SoftwareAsset"
    );
    expect(softwareNodes).toHaveLength(2);
    expect(
      softwareNodes.every(
        (node) =>
          node.metadata.origin.kind === "REPOSITORY_OBSERVATION" &&
          node.metadata.extractionMethod === "STATIC_CODE_EXTRACTION" &&
          node.metadata.epistemicLabel === "INFERENCE"
      )
    ).toBe(true);
    expect(
      inferredTwin.relationships.filter(
        (relationship) =>
          relationship.relationshipType === "BOUND_TO" &&
          softwareNodes.some((node) => node.nodeId === relationship.from.nodeId)
      )
    ).toHaveLength(2);
    expect(
      inferredTwin.relationships.some(
        (relationship) => relationship.relationshipType === "EXTRACTED_FROM"
      )
    ).toBe(true);

    const firstAsset = inferred.assets[0];
    const secondAsset = inferred.assets[1];
    const currentClaim = value.input.claims.at(-1);
    if (
      firstAsset === undefined ||
      secondAsset === undefined ||
      currentClaim === undefined
    ) {
      throw new Error("Semantic relationship fixture is incomplete.");
    }
    const attribution = {
      origin: "USER_INPUT" as const,
      sourceReference: "impact-declaration:checkout-timeout",
      recordedAtUtc: "2026-08-05T01:08:30.000Z",
      extractionMethod: "REVIEWED_SEMANTIC_DECLARATION",
      epistemicLabel: "FACT" as const
    };
    const semanticRelationships = [
      {
        relationshipKey: "implements:timeout-policy",
        relationshipType: "IMPLEMENTS" as const,
        from: { sourceType: "Claim" as const, sourceId: currentClaim.claimId },
        to: {
          sourceType: "SoftwareAsset" as const,
          sourceId: firstAsset.assetId
        },
        attribution
      },
      {
        relationshipKey: "affects:timeout-contract",
        relationshipType: "AFFECTS" as const,
        from: {
          sourceType: "SoftwareAsset" as const,
          sourceId: firstAsset.assetId
        },
        to: {
          sourceType: "SoftwareAsset" as const,
          sourceId: secondAsset.assetId
        },
        attribution
      },
      {
        relationshipKey: "validated-by:timeout-contract",
        relationshipType: "VALIDATED_BY" as const,
        from: {
          sourceType: "SoftwareAsset" as const,
          sourceId: secondAsset.assetId
        },
        to: {
          sourceType: "ValidationResult" as const,
          sourceId: value.validationResult.validationResultId
        },
        attribution
      }
    ];
    const semanticTwin = await projectTwinRevision({
      ...value.input,
      codeMap: inferred,
      semanticRelationships
    });
    expect(
      semanticTwin.relationships
        .filter((relationship) =>
          ["AFFECTS", "IMPLEMENTS", "VALIDATED_BY"].includes(
            relationship.relationshipType
          )
        )
        .map((relationship) => relationship.relationshipType)
        .sort()
    ).toEqual(["AFFECTS", "IMPLEMENTS", "VALIDATED_BY"]);
    expect(
      semanticTwin.relationships
        .filter((relationship) =>
          ["AFFECTS", "IMPLEMENTS", "VALIDATED_BY"].includes(
            relationship.relationshipType
          )
        )
        .every(
          (relationship) =>
            relationship.metadata.origin.kind === "USER_INPUT" &&
            relationship.metadata.sourceReference ===
              attribution.sourceReference
        )
    ).toBe(true);
    const reorderedSemanticTwin = await projectTwinRevision({
      ...value.input,
      codeMap: inferred,
      semanticRelationships: [...semanticRelationships].reverse()
    });
    expect(reorderedSemanticTwin).toEqual(semanticTwin);
    const reviewedRelationship = semanticRelationships[0];
    if (reviewedRelationship === undefined) {
      throw new Error("Reviewed semantic relationship fixture is missing.");
    }
    await expectCode(
      () =>
        projectTwinRevision({
          ...value.input,
          codeMap: inferred,
          semanticRelationships: [
            {
              ...reviewedRelationship,
              attribution: {
                ...attribution,
                origin: "AI_ADVISORY"
              }
            }
          ]
        }),
      "TWIN_PROJECTION_INPUT_INVALID"
    );

    const declared = await createCodeMapProjectionRevision({
      snapshot: value.snapshot,
      recordedAtUtc: parseUtcTimestamp("2026-08-05T01:08:00.000Z"),
      mode: {
        evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
        completeness: "UNAVAILABLE",
        sourceDigest,
        declaredManifestId: "controlled-fixture-v1",
        fallbackReason: "SCAN_LIMIT_OR_SAFE_FAILURE"
      },
      ...memberInputs
    });
    const declaredTwin = await projectTwinRevision({
      ...value.input,
      codeMap: declared
    });
    const declaredNodes = declaredTwin.nodes.filter(
      (node) => node.nodeType === "SoftwareAsset"
    );
    expect(
      declaredNodes.every(
        (node) =>
          node.metadata.origin.kind === "SYNTHETIC_FIXTURE" &&
          node.metadata.extractionMethod === "DECLARED_FIXTURE_MANIFEST" &&
          node.metadata.epistemicLabel === "INFERENCE"
      )
    ).toBe(true);
    expect(declaredNodes.map((node) => node.nodeId)).not.toEqual(
      softwareNodes.map((node) => node.nodeId)
    );
  });

  it("creates an immutable successor and invalidates exact transitive dependents", async () => {
    const value = await fixture();
    const first = await projectTwinRevision(value.input);
    const historicalBytes = await serializeTwinProjectionRevision(first);
    const archivedMission = archiveChangeMission(
      value.project,
      value.mission,
      clock("2026-08-05T01:08:00.000Z")
    );
    const successor = await projectTwinRevision(
      { ...value.input, mission: archivedMission },
      first
    );
    expect(successor.revision).toBe(2);
    expect(successor.predecessor).toEqual({
      projectionId: first.projectionId,
      revision: 1,
      projectionDigest: first.projectionDigest
    });
    expect(successor.projectionId).toBe(first.projectionId);
    const missionBefore = first.nodes.find(
      (node) => node.nodeType === "ChangeMission"
    );
    const missionAfter = successor.nodes.find(
      (node) => node.nodeType === "ChangeMission"
    );
    expect(missionBefore?.revision).toBe(1);
    expect(missionAfter?.revision).toBe(2);
    const missionInvalidation = successor.invalidations.find(
      (invalidation) =>
        invalidation.dependencyBefore.memberId === missionBefore?.nodeId
    );
    expect(missionInvalidation?.changeType).toBe("CHANGED");
    expect(missionInvalidation?.exactDependents.length).toBeGreaterThan(0);
    expect(
      missionInvalidation?.exactDependents.some(
        (dependent) => dependent.memberId === first.nodes[0]?.nodeId
      )
    ).toBe(false);
    expect(await serializeTwinProjectionRevision(first)).toBe(historicalBytes);
  });

  it("does not invalidate unrelated validation when one evidence branch is removed", async () => {
    const value = await fixture();
    const first = await projectTwinRevision(value.input);
    const successor = await projectTwinRevision(
      {
        ...value.input,
        evidenceSources: [value.validationSource],
        claims: [],
        claimSupersessions: []
      },
      first
    );
    const requirementNode = first.nodeSources.find(
      (source) => source.sourceId === value.requirementSource.evidenceSourceId
    );
    const validationNode = first.nodeSources.find(
      (source) => source.sourceId === value.validationResult.validationResultId
    );
    const invalidation = successor.invalidations.find(
      (entry) => entry.dependencyBefore.memberId === requirementNode?.nodeId
    );
    expect(invalidation?.changeType).toBe("REMOVED");
    expect(
      invalidation?.exactDependents.some(
        (dependent) => dependent.memberId === validationNode?.nodeId
      )
    ).toBe(false);
  });

  it("round-trips exactly for restart and rejects integrity tampering", async () => {
    const value = await fixture();
    const projection = await projectTwinRevision(value.input);
    const serialized = await serializeTwinProjectionRevision(projection);
    const restarted = await deserializeTwinProjectionRevision(serialized);
    expect(restarted).toEqual(projection);
    expect(await serializeTwinProjectionRevision(restarted)).toBe(serialized);
    await expect(
      assertTwinProjectionRevisionInvariant(restarted)
    ).resolves.toBeUndefined();

    const tampered = JSON.parse(serialized) as Record<string, unknown>;
    tampered["recordedAtUtc"] = "2026-08-05T01:09:00.000Z";
    await expectCode(
      () => deserializeTwinProjectionRevision(JSON.stringify(tampered)),
      "TWIN_PROJECTION_INTEGRITY_INVALID"
    );
  });

  it("rejects cross-scope records before materialization", async () => {
    const value = await fixture();
    const crossScope = {
      ...value.validationResult,
      projectId: "00000000-0000-4000-8000-000000000099"
    } as ValidationResult;
    await expectCode(
      () =>
        projectTwinRevision({
          ...value.input,
          validationResults: [crossScope]
        }),
      "TWIN_PROJECTION_SCOPE_INVALID"
    );
  });
});
