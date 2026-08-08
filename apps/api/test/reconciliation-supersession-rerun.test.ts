import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  Claim,
  ClaimSupersession,
  CodeMapProjectionRevision,
  GitSnapshot,
  ReconciliationImpactRevision,
  ReconciliationReassessmentResult,
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
const PREDECESSOR_ID = "00000000-0000-4000-8000-000000000051";
const SUCCESSOR_ID = "00000000-0000-4000-8000-000000000052";
const UNRELATED_ID = "00000000-0000-4000-8000-000000000053";
const PREDECESSOR_NODE_ID = "00000000-0000-4000-8000-000000000061";
const SUCCESSOR_NODE_ID = "00000000-0000-4000-8000-000000000062";
const SUPERSESSION_ID = "00000000-0000-4000-8000-000000000071";
const UNRELATED_SUPERSESSION_ID = "00000000-0000-4000-8000-000000000072";
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const PROJECT = parseStableId<"PROJECT">(PROJECT_ID);
const MISSION = parseStableId<"MISSION">(MISSION_ID);
const SNAPSHOT = parseStableId<"GIT_SNAPSHOT">(SNAPSHOT_ID);

function twin(revision: 1 | 2): TwinProjectionRevision {
  const successor = revision === 2;
  return {
    projectionId: TWIN_ID,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    revision,
    codeMapBinding: {
      projectionId: CODE_MAP_ID,
      revision: 1,
      projectionDigest: DIGEST_A
    },
    nodeSources: [
      {
        nodeId: PREDECESSOR_NODE_ID,
        nodeRevision: 1,
        sourceType: "Claim",
        sourceId: PREDECESSOR_ID,
        sourceDigest: DIGEST_A
      },
      ...(successor
        ? [
            {
              nodeId: SUCCESSOR_NODE_ID,
              nodeRevision: 1,
              sourceType: "Claim" as const,
              sourceId: SUCCESSOR_ID,
              sourceDigest: DIGEST_B
            }
          ]
        : [])
    ],
    relationships: successor
      ? [
          {
            relationshipType: "SUPERSEDES",
            from: { nodeId: SUCCESSOR_NODE_ID, revision: 1 },
            to: { nodeId: PREDECESSOR_NODE_ID, revision: 1 },
            metadata: { sourceReference: "claim-supersession:exact" }
          }
        ]
      : [],
    nodes: []
  } as unknown as TwinProjectionRevision;
}

function codeMap(): CodeMapProjectionRevision {
  return {
    projectionId: CODE_MAP_ID,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    registrationId: REGISTRATION_ID,
    revision: 1,
    snapshotId: SNAPSHOT_ID,
    projectionDigest: DIGEST_A,
    assets: [],
    edges: []
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

const EXACT_SUPERSESSION = {
  claimSupersessionId: SUPERSESSION_ID,
  predecessorClaimId: PREDECESSOR_ID,
  successorClaimId: SUCCESSOR_ID
} as unknown as ClaimSupersession;

const UNRELATED_SUPERSESSION = {
  claimSupersessionId: UNRELATED_SUPERSESSION_ID,
  predecessorClaimId: PREDECESSOR_ID,
  successorClaimId: UNRELATED_ID
} as unknown as ClaimSupersession;

const REASSESSMENT_A = {
  revision: 1,
  resultDigest: DIGEST_A
} as unknown as ReconciliationReassessmentResult;
const REASSESSMENT_B = {
  revision: 2,
  resultDigest: DIGEST_B
} as unknown as ReconciliationReassessmentResult;
const AGGREGATE_A = {
  revision: 1,
  reassessment: REASSESSMENT_A,
  resultDigest: DIGEST_A
} as unknown as ReconciliationImpactRevision;
const AGGREGATE_B = {
  revision: 2,
  reassessment: REASSESSMENT_B,
  resultDigest: DIGEST_B
} as unknown as ReconciliationImpactRevision;

describe("reconciliation supersession rerun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconstructs the exact SUPERSEDES edge, appends once, then replays exactly", async () => {
    let latest: ReconciliationImpactRevision | undefined;
    domainMocks.reassess.mockImplementation(
      async (
        input: { readonly claimSupersessions: readonly ClaimSupersession[] },
        previous?: ReconciliationReassessmentResult
      ) => {
        if (input.claimSupersessions.length === 0) return REASSESSMENT_A;
        return previous === REASSESSMENT_B ? previous : REASSESSMENT_B;
      }
    );
    domainMocks.analyze.mockImplementation(
      async (input: { readonly reassessment: ReconciliationReassessmentResult }) => ({
        resultDigest:
          input.reassessment === REASSESSMENT_A ? DIGEST_A : DIGEST_B
      })
    );
    domainMocks.aggregate.mockImplementation(
      async (
        input: { readonly reassessment: ReconciliationReassessmentResult },
        previous?: ReconciliationImpactRevision
      ) => {
        if (previous?.reassessment === input.reassessment) return previous;
        return input.reassessment === REASSESSMENT_A
          ? AGGREGATE_A
          : AGGREGATE_B;
      }
    );

    const getClaim = vi.fn(async (_projectId, _missionId, claimId) => ({
      claimId
    }) as unknown as Claim);
    const listSupersessions = vi.fn(async () => ({
      items: [UNRELATED_SUPERSESSION, EXACT_SUPERSESSION],
      nextCursor: null
    }));
    const persist = vi.fn(async (candidate: ReconciliationImpactRevision) => {
      const created = candidate !== latest;
      if (created) latest = candidate;
      return { created, revision: latest ?? candidate };
    });
    const service = new ReconciliationExecutionService({
      twins: {
        get: vi.fn(async (_projectId, _missionId, revision) =>
          twin(revision === 1 ? 1 : 2)
        )
      },
      codeMaps: { get: vi.fn(async () => codeMap()) },
      evidence: { getEvidenceSource: vi.fn() },
      claims: { getClaim, listSupersessions },
      snapshots: { get: vi.fn(() => snapshot()) },
      reconciliations: {
        latest: vi.fn(async () => latest),
        get: vi.fn(),
        list: vi.fn(),
        listFindings: vi.fn(),
        listImpactPaths: vi.fn(),
        persist
      }
    });
    const request = {
      codeMapRevision: 1,
      targetSnapshotId: SNAPSHOT,
      supportRequirements: [],
      roots: [],
      impactRequirements: []
    } as const;

    const before = await service.execute(PROJECT, MISSION, {
      ...request,
      twinRevision: 1
    });
    const after = await service.execute(PROJECT, MISSION, {
      ...request,
      twinRevision: 2
    });
    const replay = await service.execute(PROJECT, MISSION, {
      ...request,
      twinRevision: 2
    });

    expect(before).toEqual({ created: true, revision: AGGREGATE_A });
    expect(after).toEqual({ created: true, revision: AGGREGATE_B });
    expect(replay).toEqual({ created: false, revision: AGGREGATE_B });
    expect(domainMocks.reassess.mock.calls[0]?.[0].claimSupersessions).toEqual(
      []
    );
    expect(domainMocks.reassess.mock.calls[1]?.[0].claimSupersessions).toEqual([
      EXACT_SUPERSESSION
    ]);
    expect(domainMocks.reassess.mock.calls[2]?.[0].claimSupersessions).toEqual([
      EXACT_SUPERSESSION
    ]);
    expect(domainMocks.reassess.mock.calls[1]?.[1]).toBe(REASSESSMENT_A);
    expect(domainMocks.reassess.mock.calls[2]?.[1]).toBe(REASSESSMENT_B);
    expect(domainMocks.aggregate.mock.calls[1]?.[1]).toBe(AGGREGATE_A);
    expect(domainMocks.aggregate.mock.calls[2]?.[1]).toBe(AGGREGATE_B);
    expect(persist.mock.calls.map((call) => call[0])).toEqual([
      AGGREGATE_A,
      AGGREGATE_B,
      AGGREGATE_B
    ]);
    expect(getClaim.mock.calls.map((call) => call[2])).toEqual([
      PREDECESSOR_ID,
      PREDECESSOR_ID,
      SUCCESSOR_ID,
      PREDECESSOR_ID,
      SUCCESSOR_ID
    ]);
  });
});
