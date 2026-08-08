import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CodeMapProjectionRevision,
  EvidenceSource,
  GitSnapshot,
  ReconciliationImpactRevision,
  TwinProjectionRevision
} from "@intelliloop/domain";
import { parseStableId } from "@intelliloop/domain";

const domainMocks = vi.hoisted(() => ({
  assertCodeMap: vi.fn(async () => undefined),
  reassess: vi.fn(),
  analyze: vi.fn(),
  aggregate: vi.fn()
}));

vi.mock("@intelliloop/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@intelliloop/domain")>();
  return {
    ...actual,
    assertCodeMapProjectionRevisionInvariant: domainMocks.assertCodeMap,
    reassessReconciliation: domainMocks.reassess,
    analyzeChangeImpact: domainMocks.analyze,
    createReconciliationImpactRevision: domainMocks.aggregate
  };
});

import { ReconciliationExecutionService } from "../src/reconciliation/reconciliation-service.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const TWIN_ID = "00000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000031";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000032";
const CODE_MAP_ID = "00000000-0000-4000-8000-000000000041";
const ASSET_ID = "00000000-0000-4000-8000-000000000042";
const ASSET_NODE_ID = "00000000-0000-4000-8000-000000000043";
const SECOND_ASSET_ID = "00000000-0000-4000-8000-000000000044";
const SECOND_ASSET_NODE_ID = "00000000-0000-4000-8000-000000000045";
const CODE_EDGE_ID = "00000000-0000-4000-8000-000000000046";
const CODE_EDGE_RELATIONSHIP_ID = "00000000-0000-4000-8000-000000000047";
const LEGACY_ASSET_RELATIONSHIP_ID = "00000000-0000-4000-8000-000000000048";
const EVIDENCE_ID = "00000000-0000-4000-8000-000000000051";
const EVIDENCE_NODE_ID = "00000000-0000-4000-8000-000000000052";
const CLAIM_ID = "00000000-0000-4000-8000-000000000061";
const CLAIM_NODE_ID = "00000000-0000-4000-8000-000000000062";
const VALIDATION_ID = "00000000-0000-4000-8000-000000000071";
const VALIDATION_NODE_ID = "00000000-0000-4000-8000-000000000072";
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const PROJECT = parseStableId<"PROJECT">(PROJECT_ID);
const MISSION = parseStableId<"MISSION">(MISSION_ID);
const SNAPSHOT = parseStableId<"GIT_SNAPSHOT">(SNAPSHOT_ID);

function twin(includeValidation = false): TwinProjectionRevision {
  return {
    projectionId: TWIN_ID,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    revision: 1,
    codeMapBinding: {
      projectionId: CODE_MAP_ID,
      revision: 1,
      projectionDigest: DIGEST_A
    },
    nodeSources: [
      {
        nodeId: EVIDENCE_NODE_ID,
        nodeRevision: 1,
        sourceType: "EvidenceSource",
        sourceId: EVIDENCE_ID,
        sourceDigest: DIGEST_A
      },
      {
        nodeId: CLAIM_NODE_ID,
        nodeRevision: 1,
        sourceType: "Claim",
        sourceId: CLAIM_ID,
        sourceDigest: DIGEST_A
      },
      {
        nodeId: ASSET_NODE_ID,
        nodeRevision: 1,
        sourceType: "SoftwareAsset",
        sourceId: ASSET_ID,
        sourceDigest: DIGEST_A
      },
      ...(includeValidation
        ? [
            {
              nodeId: VALIDATION_NODE_ID,
              nodeRevision: 1,
              sourceType: "ValidationResult" as const,
              sourceId: VALIDATION_ID,
              sourceDigest: DIGEST_A
            }
          ]
        : [])
    ],
    nodes: [],
    relationships: []
  } as unknown as TwinProjectionRevision;
}

function codeMap(assetDigest = DIGEST_A): CodeMapProjectionRevision {
  return {
    projectionId: CODE_MAP_ID,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    registrationId: REGISTRATION_ID,
    revision: 1,
    snapshotId: SNAPSHOT_ID,
    projectionDigest: DIGEST_A,
    assets: [{ assetId: ASSET_ID, assetDigest }],
    edges: []
  } as unknown as CodeMapProjectionRevision;
}

function twinWithCodeEdge(): TwinProjectionRevision {
  return {
    ...twin(),
    nodeSources: [
      ...twin().nodeSources,
      {
        nodeId: SECOND_ASSET_NODE_ID,
        nodeRevision: 1,
        sourceType: "SoftwareAsset",
        sourceId: SECOND_ASSET_ID,
        sourceDigest: DIGEST_B
      }
    ],
    relationships: [
      {
        relationshipId: LEGACY_ASSET_RELATIONSHIP_ID,
        relationshipType: "SCOPED_TO",
        from: { nodeId: ASSET_NODE_ID, revision: 1 },
        to: { nodeId: EVIDENCE_NODE_ID, revision: 1 },
        metadata: { sourceReference: `code-map-edge:${ASSET_ID}` }
      },
      {
        relationshipId: CODE_EDGE_RELATIONSHIP_ID,
        relationshipType: "DEPENDS_ON",
        from: { nodeId: ASSET_NODE_ID, revision: 1 },
        to: { nodeId: SECOND_ASSET_NODE_ID, revision: 1 },
        metadata: { sourceReference: `code-map-edge:${CODE_EDGE_ID}` }
      }
    ]
  } as unknown as TwinProjectionRevision;
}

function codeMapWithEdge(): CodeMapProjectionRevision {
  return {
    ...codeMap(),
    assets: [
      { assetId: ASSET_ID, assetDigest: DIGEST_A },
      { assetId: SECOND_ASSET_ID, assetDigest: DIGEST_B }
    ],
    edges: [{
      edgeId: CODE_EDGE_ID,
      kind: "IMPORTS",
      fromAssetId: ASSET_ID,
      toAssetId: SECOND_ASSET_ID
    }]
  } as unknown as CodeMapProjectionRevision;
}

function snapshot(): GitSnapshot {
  return {
    snapshotId: SNAPSHOT_ID,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    registrationId: REGISTRATION_ID
  } as unknown as GitSnapshot;
}

function candidate(): ReconciliationImpactRevision {
  return { projectId: PROJECT_ID, missionId: MISSION_ID } as unknown as ReconciliationImpactRevision;
}

describe("reconciliation execution source reconstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    domainMocks.reassess.mockResolvedValue({ resultDigest: DIGEST_A });
    domainMocks.analyze.mockResolvedValue({ resultDigest: DIGEST_B });
    domainMocks.aggregate.mockResolvedValue(candidate());
  });

  function serviceFor(selectedTwin: TwinProjectionRevision, selectedCodeMap = codeMap()) {
    const getEvidenceSource = vi.fn(async () => ({
      evidenceSourceId: EVIDENCE_ID
    }) as unknown as EvidenceSource);
    const getClaim = vi.fn(async () => ({ claimId: CLAIM_ID }));
    const persist = vi.fn(async (revision: ReconciliationImpactRevision) => ({
      created: true,
      revision
    }));
    const service = new ReconciliationExecutionService({
      twins: { get: vi.fn(async () => selectedTwin) },
      codeMaps: { get: vi.fn(async () => selectedCodeMap) },
      evidence: { getEvidenceSource },
      claims: {
        getClaim: getClaim as never,
        listSupersessions: vi.fn(async () => ({ items: [], nextCursor: null }))
      },
      snapshots: { get: vi.fn(() => snapshot()) },
      reconciliations: {
        latest: vi.fn(async () => undefined),
        get: vi.fn(),
        list: vi.fn(),
        listFindings: vi.fn(),
        listImpactPaths: vi.fn(),
        persist
      }
    });
    return { service, getEvidenceSource, getClaim, persist };
  }

  it("loads only exact Twin-bound historical sources and sends no invented validations", async () => {
    const value = serviceFor(twin());
    const result = await value.service.execute(PROJECT, MISSION, {
      twinRevision: 1,
      codeMapRevision: 1,
      targetSnapshotId: SNAPSHOT,
      supportRequirements: [],
      roots: [],
      impactRequirements: []
    });

    expect(result.created).toBe(true);
    expect(value.getEvidenceSource).toHaveBeenCalledWith(
      PROJECT_ID,
      MISSION_ID,
      EVIDENCE_ID
    );
    expect(value.getClaim).toHaveBeenCalledWith(
      PROJECT_ID,
      MISSION_ID,
      CLAIM_ID
    );
    expect(domainMocks.reassess.mock.calls[0]?.[0]).toMatchObject({
      validationResults: [],
      requirements: []
    });
    expect(domainMocks.analyze.mock.calls[0]?.[0]).toMatchObject({
      validationResults: [],
      roots: [],
      requirements: []
    });
    expect(value.persist).toHaveBeenCalledWith(candidate());
  });

  it("fails closed when a selected Twin contains validation state the persistence layer cannot reconstruct", async () => {
    const value = serviceFor(twin(true));
    await expect(
      value.service.execute(PROJECT, MISSION, {
        twinRevision: 1,
        codeMapRevision: 1,
        targetSnapshotId: SNAPSHOT,
        supportRequirements: [],
        roots: [],
        impactRequirements: []
      })
    ).rejects.toMatchObject({
      code: "RECONCILIATION_EXECUTION_VALIDATION_UNAVAILABLE"
    });
    expect(domainMocks.reassess).not.toHaveBeenCalled();
  });

  it("rejects a code-map revision whose exact asset digest is not projected by the Twin", async () => {
    const value = serviceFor(twin(), codeMap(DIGEST_B));
    await expect(
      value.service.execute(PROJECT, MISSION, {
        twinRevision: 1,
        codeMapRevision: 1,
        targetSnapshotId: SNAPSHOT,
        supportRequirements: [],
        roots: [],
        impactRequirements: []
      })
    ).rejects.toMatchObject({
      code: "RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH"
    });
    expect(domainMocks.reassess).not.toHaveBeenCalled();
  });

  it("accepts exact real edges without mistaking legacy asset citations for extra edges", async () => {
    const value = serviceFor(twinWithCodeEdge(), codeMapWithEdge());
    await expect(value.service.execute(PROJECT, MISSION, {
      twinRevision: 1,
      codeMapRevision: 1,
      targetSnapshotId: SNAPSHOT,
      supportRequirements: [],
      roots: [],
      impactRequirements: []
    })).resolves.toMatchObject({ created: true });
    expect(domainMocks.reassess).toHaveBeenCalledTimes(1);
  });
});
