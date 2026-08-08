import { describe, expect, it } from "vitest";

import {
  IMPACT_TRAVERSAL_POLICY,
  MAXIMUM_IMPACT_ROOTS,
  ImpactAnalysisError,
  analyzeChangeImpact,
  createChangeMission,
  createClaim,
  createClock,
  createCodeMapProjectionRevision,
  createEvidenceSource,
  createGitSnapshot,
  createProject,
  createStableIdGenerator,
  createValidationResult,
  deserializeImpactAnalysisResult,
  impactTraversalPolicyIdentity,
  parseSha256Digest,
  parseUtcTimestamp,
  prepareEvidenceImport,
  projectTwinRevision,
  reassessReconciliation,
  serializeImpactAnalysisResult,
  serializeTwinNode,
  sha256TextDigest,
  type AnalyzeChangeImpactInput,
  type CodeMapAsset,
  type CodeMapProjectionRevision,
  type EvidenceSource,
  type GitSnapshot,
  type ImpactAnalysisErrorCode,
  type ImpactRequirementInput,
  type ReconciliationReassessmentResult,
  type TwinNode,
  type TwinProjectionMemberReference,
  type TwinProjectionRevision,
  type ValidationResult,
  type ValidationResultStatus
} from "../src/index.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const REQUIREMENT_SOURCE_ID = "00000000-0000-4000-8000-000000000021";
const VALIDATION_SOURCE_ID = "00000000-0000-4000-8000-000000000022";
const CLAIM_ID = "00000000-0000-4000-8000-000000000031";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000041";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000042";
const VALIDATION_ID = "00000000-0000-4000-8000-000000000051";
const ABSENT_ASSET_ID = "00000000-0000-4000-8000-000000000061";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const SOURCE_DIGEST =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const INVENTORY_VALIDATION_KEY = "test:retail/inventory-release";

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

interface FixtureOptions {
  readonly validationStatus?: ValidationResultStatus;
  readonly includeValidationRelationship?: boolean;
  readonly includeCycle?: boolean;
  readonly declaredFallback?: boolean;
  readonly claimOrigin?: "USER_INPUT" | "AI_ADVISORY";
}

interface Fixture {
  readonly twin: TwinProjectionRevision;
  readonly codeMap: CodeMapProjectionRevision;
  readonly snapshot: GitSnapshot;
  readonly reassessment: ReconciliationReassessmentResult;
  readonly validationResults: readonly ValidationResult[];
  readonly claimNode: TwinNode;
  readonly assets: ReadonlyMap<string, CodeMapAsset>;
  readonly basis: TwinProjectionMemberReference;
}

async function makeFixture(options: FixtureOptions = {}): Promise<Fixture> {
  const project = createProject(
    { name: "Retail cancellation" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-05T01:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Expand cancellation before dispatch" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-05T01:01:00.000Z") }
  );
  const snapshot = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/cancel.ts" }]
    },
    { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-05T01:02:00.000Z") }
  );
  const requirementSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: options.claimOrigin ?? "USER_INPUT",
      sourceLocator: "requirement:retail/cancellation-v2",
      sourceRevision: "rev:2",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "TEXT",
        content: new TextEncoder().encode(
          "Cancellation before dispatch affects order, inventory, refund, fulfilment and notification."
        )
      })
    },
    { ids: ids(REQUIREMENT_SOURCE_ID), clock: clock("2026-08-05T01:03:00.000Z") }
  );
  const claim = await createClaim(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      evidenceSourceId: requirementSource.evidenceSourceId,
      rawText:
        "Cancellation before dispatch affects order, inventory, refund, fulfilment and notification.",
      subject: "retail cancellation",
      predicate: "eligible until",
      value: "before dispatch",
      extractionMethod: "MANUAL_STRUCTURED_INTAKE",
      epistemicLabel: "FACT"
    },
    requirementSource,
    undefined,
    { ids: ids(CLAIM_ID), clock: clock("2026-08-05T01:04:00.000Z") }
  );
  const validationSource = await createEvidenceSource(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "VALIDATION_RESULT",
      sourceLocator: "validation:retail/inventory-release",
      sourceRevision: "run:1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "JSON",
        content: new TextEncoder().encode('{"suite":"inventory-release"}')
      })
    },
    { ids: ids(VALIDATION_SOURCE_ID), clock: clock("2026-08-05T01:05:00.000Z") }
  );
  const validation = await createValidationResult(
    {
      validationKey: INVENTORY_VALIDATION_KEY,
      status: options.validationStatus ?? "FAILED",
      epistemicLabel: "FACT"
    },
    validationSource,
    snapshot,
    { ids: ids(VALIDATION_ID), clock: clock("2026-08-05T01:06:00.000Z") }
  );
  const assetInputs = [
    "cancellation",
    "order-state",
    "inventory",
    "refund",
    "fulfilment",
    "notification",
    "inventory-test",
    ...Array.from({ length: 9 }, (_, index) => `depth-${index}`)
  ].map((name) => ({
    memberKey: `file:src/${name}.ts`,
    kind: "FILE" as const,
    label: `src/${name}.ts`,
    sourcePath: `src/${name}.ts`,
    sourceDigest: parseSha256Digest(SOURCE_DIGEST)
  }));
  const dependencyEdges = [
    "order-state",
    "inventory",
    "refund",
    "fulfilment",
    "notification"
  ].map((name) => ({
    memberKey: `imports:${name}:cancellation`,
    kind: "IMPORTS" as const,
    fromMemberKey: `file:src/${name}.ts`,
    toMemberKey: "file:src/cancellation.ts"
  }));
  const edges = [
    ...dependencyEdges,
    ...Array.from({ length: 8 }, (_, index) => ({
      memberKey: `imports:depth-${index + 1}:depth-${index}`,
      kind: "IMPORTS" as const,
      fromMemberKey: `file:src/depth-${index + 1}.ts`,
      toMemberKey: `file:src/depth-${index}.ts`
    })),
    {
      memberKey: "test-imports:inventory",
      kind: "TEST_IMPORTS" as const,
      fromMemberKey: "file:src/inventory-test.ts",
      toMemberKey: "file:src/inventory.ts"
    },
    ...(options.includeCycle === true
      ? [{
          memberKey: "imports:cancellation:inventory",
          kind: "IMPORTS" as const,
          fromMemberKey: "file:src/cancellation.ts",
          toMemberKey: "file:src/inventory.ts"
        }]
      : [])
  ];
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-05T01:07:00.000Z"),
    mode: options.declaredFallback === true
      ? {
          evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
          completeness: "UNAVAILABLE",
          sourceDigest: parseSha256Digest(SOURCE_DIGEST),
          declaredManifestId: "controlled-retail-fixture-v1",
          fallbackReason: "EXTRACTION_LIMIT_OR_SAFE_FAILURE"
        }
      : {
          evidenceKind: "STATIC_INFERENCE",
          completeness: "COMPLETE",
          sourceDigest: parseSha256Digest(SOURCE_DIGEST)
        },
    assets: assetInputs,
    edges
  });
  const assets = new Map(codeMap.assets.map((asset) => [asset.memberKey, asset]));
  const cancellation = assets.get("file:src/cancellation.ts");
  const inventory = assets.get("file:src/inventory.ts");
  const depthZero = assets.get("file:src/depth-0.ts");
  if (cancellation === undefined || inventory === undefined || depthZero === undefined) {
    throw new Error("Fixture assets missing.");
  }
  const semanticRelationships = [
    {
      relationshipKey: "requirement-affects-cancellation",
      relationshipType: "AFFECTS" as const,
      from: { sourceType: "Claim" as const, sourceId: claim.claim.claimId },
      to: { sourceType: "SoftwareAsset" as const, sourceId: cancellation.assetId },
      attribution: {
        origin: "USER_INPUT" as const,
        sourceReference: requirementSource.sourceLocator,
        recordedAtUtc: requirementSource.recordedAtUtc,
        extractionMethod: "MANUAL_STRUCTURED_INTAKE",
        epistemicLabel: "FACT" as const
      }
    },
    {
      relationshipKey: "requirement-affects-depth-zero",
      relationshipType: "AFFECTS" as const,
      from: { sourceType: "Claim" as const, sourceId: claim.claim.claimId },
      to: { sourceType: "SoftwareAsset" as const, sourceId: depthZero.assetId },
      attribution: {
        origin: "USER_INPUT" as const,
        sourceReference: requirementSource.sourceLocator,
        recordedAtUtc: requirementSource.recordedAtUtc,
        extractionMethod: "MANUAL_STRUCTURED_INTAKE",
        epistemicLabel: "FACT" as const
      }
    },
    ...(options.includeValidationRelationship === false
      ? []
      : [{
          relationshipKey: "inventory-validated-by-inventory-release",
          relationshipType: "VALIDATED_BY" as const,
          from: { sourceType: "SoftwareAsset" as const, sourceId: inventory.assetId },
          to: {
            sourceType: "ValidationResult" as const,
            sourceId: validation.validationResultId
          },
          attribution: {
            origin: "VALIDATION_RESULT" as const,
            sourceReference: validationSource.sourceLocator,
            recordedAtUtc: validation.recordedAtUtc,
            extractionMethod: "STRUCTURED_VALIDATION_INTAKE",
            epistemicLabel: "FACT" as const
          }
        }])
  ];
  const evidenceSources: EvidenceSource[] = [requirementSource, validationSource];
  const twin = await projectTwinRevision({
    project,
    mission,
    evidenceSources,
    claims: [claim.claim],
    claimSupersessions: [],
    snapshots: [snapshot],
    validationResults: [validation],
    codeMap,
    semanticRelationships
  });
  const reassessment = await reassessReconciliation({
    twin,
    evidenceSources,
    claims: [claim.claim],
    claimSupersessions: [],
    targetSnapshot: snapshot,
    validationResults: [validation],
    requirements: [
      {
        requirementId: "required:validation:inventory-release",
        supportKind: "VALIDATION_RESULT",
        validationKey: INVENTORY_VALIDATION_KEY
      }
    ]
  });
  const claimNode = twin.nodes.find((node) => node.nodeType === "Claim");
  if (claimNode === undefined) throw new Error("Fixture claim node missing.");
  return {
    twin,
    codeMap,
    snapshot,
    reassessment,
    validationResults: [validation],
    claimNode,
    assets,
    basis: Object.freeze({
      kind: "NODE",
      memberId: claimNode.nodeId,
      revision: claimNode.revision,
      digest: await sha256TextDigest(serializeTwinNode(claimNode))
    })
  };
}

function asset(value: Fixture, name: string): CodeMapAsset {
  return value.assets.get(`file:src/${name}.ts`) ?? (() => {
    throw new Error(`Missing ${name} fixture asset.`);
  })();
}

function requirement(
  value: Fixture,
  requirementId: string,
  criticalAssetId: CodeMapAsset["assetId"],
  supportKind: "IMPLEMENTATION" | "VALIDATION",
  validationKey?: string,
  rootId = "root:cancellation-claim"
): ImpactRequirementInput {
  return {
    requirementId,
    rootId,
    criticalAssetId,
    supportKind,
    ...(validationKey === undefined ? {} : { validationKey }),
    basisCitations: [value.basis]
  };
}

function input(
  value: Fixture,
  requirements: readonly ImpactRequirementInput[],
  overrides: Partial<AnalyzeChangeImpactInput> = {}
): AnalyzeChangeImpactInput {
  return {
    twin: value.twin,
    reassessment: value.reassessment,
    codeMap: value.codeMap,
    targetSnapshot: value.snapshot,
    validationResults: value.validationResults,
    roots: [{ rootId: "root:cancellation-claim", nodeId: value.claimNode.nodeId }],
    requirements,
    ...overrides
  };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: ImpactAnalysisErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected impact analysis to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ImpactAnalysisError);
    if (!(error instanceof ImpactAnalysisError)) throw error;
    expect(error.code).toBe(code);
    expect(error.message).not.toContain(PROJECT_ID);
  }
}

describe("impact traversal policy", () => {
  it("pins explicit authority, traversal directions, depth and AI exclusion", async () => {
    const first = await impactTraversalPolicyIdentity();
    const second = await impactTraversalPolicyIdentity();
    expect(second).toEqual(first);
    expect(first.version).toBe("impact-traversal-policy.v1");
    expect(first.digest).toBe(
      "sha256:d70f19d09f5adecf5fd0cab8d703bf67df3b2530fa6384fa6553cddd965ff6f2"
    );
    expect(IMPACT_TRAVERSAL_POLICY).toMatchObject({
      requirementAuthority: "EXPLICIT_DECLARATION_ONLY",
      maximumDepth: 8,
      aiAuthority: "NONE",
      directions: {
        AFFECTS: "FORWARD",
        DEPENDS_ON: "REVERSE",
        IMPLEMENTS: "TOWARD_SOFTWARE_ASSET",
        VALIDATED_BY: "FORWARD_TERMINAL"
      }
    });
  });
});

describe("deterministic impact analysis", () => {
  it("traces expected retail assets by reverse dependency and emits only exact validation gaps", async () => {
    const value = await makeFixture({ validationStatus: "FAILED" });
    const requirements = [
      requirement(value, "impact:inventory:implementation", asset(value, "inventory").assetId, "IMPLEMENTATION"),
      requirement(value, "impact:refund:implementation", asset(value, "refund").assetId, "IMPLEMENTATION"),
      requirement(value, "impact:fulfilment:implementation", asset(value, "fulfilment").assetId, "IMPLEMENTATION"),
      requirement(value, "impact:notification:implementation", asset(value, "notification").assetId, "IMPLEMENTATION"),
      requirement(
        value,
        "impact:inventory:validation",
        asset(value, "inventory").assetId,
        "VALIDATION",
        INVENTORY_VALIDATION_KEY
      ),
      requirement(
        value,
        "impact:fulfilment:validation",
        asset(value, "fulfilment").assetId,
        "VALIDATION",
        "test:retail/fulfilment-stop"
      )
    ];
    const result = await analyzeChangeImpact(input(value, requirements));

    expect(result.paths).toHaveLength(6);
    expect(result.impactGapFindings).toHaveLength(1);
    expect(result.impactGapFindings[0]).toMatchObject({
      findingKind: "IMPACT_GAP",
      status: "OPEN",
      reason: "REQUIRED_VALIDATION_RESULT_ABSENT",
      requirement: { requirementId: "impact:fulfilment:validation" }
    });
    const inventory = result.paths.find(
      (path) => path.requirementId === "impact:inventory:implementation"
    );
    expect(inventory?.steps.map((step) => [step.relationshipType, step.direction])).toEqual([
      ["AFFECTS", "FORWARD"],
      ["DEPENDS_ON", "REVERSE"]
    ]);
    const validation = result.paths.find(
      (path) => path.requirementId === "impact:inventory:validation"
    );
    expect(validation).toMatchObject({
      validationStatus: "FAILED",
      depth: 3
    });
    expect(validation?.steps.at(-1)?.relationshipType).toBe("VALIDATED_BY");
    expect(result.dependencies.every((dependency, index) =>
      index === 0 || result.dependencies[index - 1]!.dependencyKey < dependency.dependencyKey
    )).toBe(true);
  });

  it.each(["FAILED", "INCONCLUSIVE"] as const)(
    "treats %s validation as structurally present without readiness authority",
    async (status) => {
      const value = await makeFixture({ validationStatus: status });
      const result = await analyzeChangeImpact(input(value, [
        requirement(
          value,
          "impact:inventory:validation",
          asset(value, "inventory").assetId,
          "VALIDATION",
          INVENTORY_VALIDATION_KEY
        )
      ]));
      expect(result.impactGapFindings).toEqual([]);
      expect(result.paths[0]?.validationStatus).toBe(status);
    }
  );

  it("distinguishes an existing result from a missing validation relationship", async () => {
    const value = await makeFixture({ includeValidationRelationship: false });
    const result = await analyzeChangeImpact(input(value, [
      requirement(
        value,
        "impact:inventory:validation",
        asset(value, "inventory").assetId,
        "VALIDATION",
        INVENTORY_VALIDATION_KEY
      )
    ]));
    expect(result.impactGapFindings).toHaveLength(1);
    expect(result.impactGapFindings[0]?.reason).toBe("REQUIRED_VALIDATION_PATH_ABSENT");
    expect(result.paths[0]?.terminalValidation).toBeUndefined();
  });

  it("emits an implementation gap for an explicitly expected absent critical asset", async () => {
    const value = await makeFixture();
    const result = await analyzeChangeImpact(input(value, [
      requirement(
        value,
        "impact:shipment:implementation",
        ABSENT_ASSET_ID as CodeMapAsset["assetId"],
        "IMPLEMENTATION"
      )
    ]));
    expect(result.paths).toEqual([]);
    expect(result.impactGapFindings[0]?.reason).toBe(
      "CRITICAL_IMPLEMENTATION_ASSET_ABSENT"
    );
    expect(result.impactGapFindings[0]).not.toHaveProperty("criticalAsset");
    expect(result.impactGapFindings[0]).not.toHaveProperty("supportingPathKey");
  });

  it("excludes CONCERNS and other irrelevant relationships", async () => {
    const value = await makeFixture();
    const testAsset = asset(value, "inventory-test");
    const testBinding = value.twin.nodeSources.find(
      (binding) => binding.sourceType === "SoftwareAsset" && binding.sourceId === testAsset.assetId
    );
    if (testBinding === undefined) throw new Error("Test asset binding missing.");
    const result = await analyzeChangeImpact(input(
      value,
      [requirement(
        value,
        "impact:test-to-inventory",
        asset(value, "inventory").assetId,
        "IMPLEMENTATION",
        undefined,
        "root:test-asset"
      )],
      { roots: [{ rootId: "root:test-asset", nodeId: testBinding.nodeId }] }
    ));
    expect(result.paths).toEqual([]);
    expect(result.impactGapFindings[0]?.reason).toBe("CRITICAL_IMPLEMENTATION_PATH_ABSENT");
  });

  it("terminates cycles and returns the canonical shortest path", async () => {
    const value = await makeFixture({ includeCycle: true });
    const result = await analyzeChangeImpact(input(value, [
      requirement(value, "impact:inventory:implementation", asset(value, "inventory").assetId, "IMPLEMENTATION")
    ]));
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.depth).toBe(2);
    expect(result.paths[0]?.steps.map((step) => step.relationshipType)).toEqual([
      "AFFECTS",
      "DEPENDS_ON"
    ]);
  });

  it("includes depth eight and excludes a target beyond the fixed bound", async () => {
    const value = await makeFixture();
    const result = await analyzeChangeImpact(input(value, [
      requirement(value, "impact:depth-seven", asset(value, "depth-7").assetId, "IMPLEMENTATION"),
      requirement(value, "impact:depth-eight", asset(value, "depth-8").assetId, "IMPLEMENTATION")
    ]));
    expect(result.paths.find((path) => path.requirementId === "impact:depth-seven")?.depth).toBe(8);
    expect(result.paths.some((path) => path.requirementId === "impact:depth-eight")).toBe(false);
    expect(result.impactGapFindings.find(
      (finding) => finding.requirement.requirementId === "impact:depth-eight"
    )?.reason).toBe("CRITICAL_IMPLEMENTATION_PATH_ABSENT");
  });

  it("keeps declared fallback visible and unable to close implementation support", async () => {
    const value = await makeFixture({ declaredFallback: true });
    const result = await analyzeChangeImpact(input(value, [
      requirement(value, "impact:inventory:implementation", asset(value, "inventory").assetId, "IMPLEMENTATION")
    ]));
    expect(result.paths).toHaveLength(1);
    expect(result.codeMapBinding).toMatchObject({
      evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
      inferenceStatus: "UNAVAILABLE_SAFE_FAILURE",
      completeness: "UNAVAILABLE"
    });
    expect(result.impactGapFindings[0]?.reason).toBe("IMPLEMENTATION_SUPPORT_UNAVAILABLE");
  });

  it("is independent of caller ordering and canonically restarts", async () => {
    const value = await makeFixture();
    const requirements = [
      requirement(value, "impact:inventory:implementation", asset(value, "inventory").assetId, "IMPLEMENTATION"),
      requirement(value, "impact:refund:implementation", asset(value, "refund").assetId, "IMPLEMENTATION")
    ];
    const first = await analyzeChangeImpact(input(value, requirements));
    const reordered = await analyzeChangeImpact(input(value, [...requirements].reverse(), {
      validationResults: [...value.validationResults].reverse()
    }));
    expect(reordered).toEqual(first);
    const serialized = await serializeImpactAnalysisResult(first);
    await expect(deserializeImpactAnalysisResult(serialized)).resolves.toEqual(first);
    expect(await serializeImpactAnalysisResult(await deserializeImpactAnalysisResult(serialized)))
      .toBe(serialized);
  });

  it("fails closed on tampering, duplicate obligations and fixed limits", async () => {
    const value = await makeFixture();
    const expected = requirement(
      value,
      "impact:inventory:implementation",
      asset(value, "inventory").assetId,
      "IMPLEMENTATION"
    );
    const result = await analyzeChangeImpact(input(value, [expected]));
    const serialized = await serializeImpactAnalysisResult(result);
    await expectCode(
      () => deserializeImpactAnalysisResult(
        serialized.replace('"supportKind":"IMPLEMENTATION"', '"supportKind":"VALIDATION"')
      ),
      "IMPACT_SERIALIZATION_INVALID"
    );
    await expectCode(
      () => analyzeChangeImpact(input(value, [expected, { ...expected, requirementId: "impact:duplicate" }])),
      "IMPACT_REQUIREMENT_INVALID"
    );
    await expectCode(
      () => analyzeChangeImpact(input(value, [], {
        roots: Array.from({ length: MAXIMUM_IMPACT_ROOTS + 1 }, (_, index) => ({
          rootId: `root:overflow-${index}`,
          nodeId: value.claimNode.nodeId
        }))
      })),
      "IMPACT_LIMIT_EXCEEDED"
    );
  });

  it("rejects AI-advisory roots even without an AI semantic edge", async () => {
    const value = await makeFixture({ claimOrigin: "AI_ADVISORY" });
    await expectCode(
      () => analyzeChangeImpact(input(value, [])),
      "IMPACT_REQUIREMENT_INVALID"
    );
  });

  it("requires exact Twin, code-map, reassessment and target-snapshot bindings", async () => {
    const value = await makeFixture();
    await expectCode(
      () => analyzeChangeImpact(input(value, [], {
        codeMap: {
          ...value.codeMap,
          projectionDigest: parseSha256Digest(
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
          )
        }
      })),
      "IMPACT_INPUT_INVALID"
    );
    await expectCode(
      () => analyzeChangeImpact(input(value, [], {
        reassessment: {
          ...value.reassessment,
          resultDigest: parseSha256Digest(
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
          )
        }
      })),
      "IMPACT_INPUT_INVALID"
    );
  });
});
