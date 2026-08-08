import { describe, expect, it } from "vitest";

import {
  createChangeMission,
  createClock,
  createCodeMapProjectionRevision,
  createGitSnapshot,
  createProject,
  createStableIdGenerator,
  parseUtcTimestamp,
  projectTwinRevision,
  reassessReconciliation,
  sha256TextDigest,
  serializeTwinNode,
  type CodeMapProjectionRevision,
  type GitSnapshot,
  type ReconciliationReassessmentResult,
  type TwinProjectionRevision
} from "../src/index.js";
import {
  analyzeChangeImpact,
  type ImpactAnalysisResult
} from "../src/impact-analysis.js";
import {
  ReconciliationImpactRevisionError,
  assertReconciliationImpactRevisionInvariant,
  createReconciliationImpactRevision,
  deserializeReconciliationImpactRevision,
  serializeReconciliationImpactRevision,
  type ReconciliationImpactRevision,
  type ReconciliationImpactRevisionErrorCode
} from "../src/reconciliation-impact-revision.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000031";
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

interface Fixture {
  readonly snapshot: GitSnapshot;
  readonly twin: TwinProjectionRevision;
  readonly reassessment: ReconciliationReassessmentResult;
  readonly codeMap: CodeMapProjectionRevision;
  readonly impact: ImpactAnalysisResult;
  readonly assetNode: TwinProjectionRevision["nodes"][number];
}

async function fixture(): Promise<Fixture> {
  const project = createProject(
    { name: "Impact persistence fixture" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-05T01:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Persist exact reconciliation impact" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-05T01:01:00.000Z") }
  );
  const snapshot = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/a.ts" }]
    },
    { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-05T01:02:00.000Z") }
  );
  const assetSourceDigest = await sha256TextDigest("export const a = 1;");
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-05T01:03:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: await sha256TextDigest("source-v1")
    },
    assets: [
      {
        memberKey: "module:src/a.ts",
        kind: "FILE",
        label: "src/a.ts",
        sourcePath: "src/a.ts",
        sourceDigest: assetSourceDigest
      }
    ],
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
  const asset = codeMap.assets[0];
  if (asset === undefined) throw new Error("Fixture asset is absent.");
  const assetNode = twin.nodes.find(
    (node) =>
      node.nodeType === "SoftwareAsset" &&
      node.metadata.sourceReference === `code-map-asset:${asset.assetId}`
  );
  if (assetNode === undefined) throw new Error("Fixture asset node is absent.");
  const impact = await analyzeChangeImpact({
    twin,
    reassessment,
    codeMap,
    targetSnapshot: snapshot,
    validationResults: [],
    roots: [{ rootId: "impact:asset", nodeId: assetNode.nodeId }],
    requirements: []
  });
  return { snapshot, twin, reassessment, codeMap, impact, assetNode };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: ReconciliationImpactRevisionErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected reconciliation impact revision to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ReconciliationImpactRevisionError);
    if (!(error instanceof ReconciliationImpactRevisionError)) throw error;
    expect(error.code).toBe(code);
  }
}

describe("reconciliation impact revision", () => {
  it("binds complete exact results, replays identically and survives restart", async () => {
    const value = await fixture();
    const revision = await createReconciliationImpactRevision(value);
    const replay = await createReconciliationImpactRevision(value, revision);
    const serialized = await serializeReconciliationImpactRevision(revision);
    const restarted = await deserializeReconciliationImpactRevision(serialized);

    expect(revision).toMatchObject({
      revision: 1,
      projectId: PROJECT_ID,
      missionId: MISSION_ID,
      targetSnapshotId: SNAPSHOT_ID,
      findingCounts: {
        CONFLICT: 0,
        AMBIGUOUS: 0,
        MISSING: 0,
        STALE: 0,
        IMPACT_GAP: 0,
        total: 0
      },
      impactPathCount: 0
    });
    expect(revision.reassessment).toBe(value.reassessment);
    expect(revision.impact).toBe(value.impact);
    expect(replay).toBe(revision);
    expect(restarted).toEqual(revision);
    expect(Object.isFrozen(restarted)).toBe(true);
    expect(Object.isFrozen(restarted.impact.dependencies)).toBe(true);
    await assertReconciliationImpactRevisionInvariant(restarted);
  });

  it("advances its own lineage when impact changes without a reassessment revision", async () => {
    const value = await fixture();
    const first = await createReconciliationImpactRevision(value);
    const asset = value.codeMap.assets[0];
    if (asset === undefined) throw new Error("Fixture asset is absent.");
    const assetReference = {
      kind: "NODE" as const,
      memberId: value.assetNode.nodeId,
      revision: value.assetNode.revision,
      digest: await sha256TextDigest(serializeTwinNode(value.assetNode))
    };
    const impact = await analyzeChangeImpact({
      twin: value.twin,
      reassessment: value.reassessment,
      codeMap: value.codeMap,
      targetSnapshot: value.snapshot,
      validationResults: [],
      roots: [{ rootId: "impact:asset", nodeId: value.assetNode.nodeId }],
      requirements: [
        {
          requirementId: "impact:implementation",
          rootId: "impact:asset",
          criticalAssetId: asset.assetId,
          supportKind: "IMPLEMENTATION",
          basisCitations: [assetReference]
        }
      ]
    });
    const second = await createReconciliationImpactRevision(
      { reassessment: value.reassessment, impact },
      first
    );

    expect(second.revision).toBe(2);
    expect(second.reassessment.revision).toBe(first.reassessment.revision);
    expect(second.impact.resultDigest).not.toBe(first.impact.resultDigest);
    expect(second.predecessor).toEqual({
      revisionKey: first.revisionKey,
      revision: first.revision,
      resultDigest: first.resultDigest
    });
  });

  it("rejects forged component bindings and aggregate bytes", async () => {
    const value = await fixture();
    const revision = await createReconciliationImpactRevision(value);
    const forgedImpact = {
      ...value.impact,
      targetSnapshotId: "00000000-0000-4000-8000-000000000099"
    } as ImpactAnalysisResult;
    await expectCode(
      () =>
        createReconciliationImpactRevision({
          reassessment: value.reassessment,
          impact: forgedImpact
        }),
      "RECONCILIATION_IMPACT_REVISION_INPUT_INVALID"
    );

    const forged = {
      ...revision,
      resultDigest: `sha256:${"f".repeat(64)}`
    } as ReconciliationImpactRevision;
    await expectCode(
      () => assertReconciliationImpactRevisionInvariant(forged),
      "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
    );
    await expectCode(
      () => deserializeReconciliationImpactRevision(JSON.stringify(forged)),
      "RECONCILIATION_IMPACT_REVISION_SERIALIZATION_INVALID"
    );
  });
});
