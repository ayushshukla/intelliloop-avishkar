import {
  analyzeChangeImpact,
  compileEvidencePack,
  createChangeMission,
  createClaim,
  createClock,
  createCodeMapProjectionRevision,
  createEvidenceSource,
  createGitSnapshot,
  createProject,
  createReconciliationImpactRevision,
  createStableIdGenerator,
  parseUtcTimestamp,
  prepareEvidenceImport,
  projectTwinRevision,
  reassessReconciliation,
  serializeTwinNode,
  sha256TextDigest,
  type Claim,
  type ClaimSupersession,
  type EvidencePack,
  type EvidenceSource,
  type JsonValue,
  type MissionId,
  type ProjectId,
  type ReconciliationImpactRevision,
  type TwinProjectionRevision
} from "../../src/index.js";

export type OfflineExplanationScenario =
  | "CLEAR"
  | "CONFLICT"
  | "MISSING_VALIDATION"
  | "IMPACT"
  | "CORRECTION";

export interface OfflineExplanationFixture {
  readonly pack: EvidencePack;
  readonly assessment: ReconciliationImpactRevision;
  readonly twin: TwinProjectionRevision;
  readonly evidenceSources: readonly EvidenceSource[];
  readonly claims: readonly Claim[];
  readonly claimSupersessions: readonly ClaimSupersession[];
}

const PROJECT_ID = "10000000-0000-4000-8000-000000000001";
const MISSION_ID = "10000000-0000-4000-8000-000000000011";
const SOURCE_1 = "10000000-0000-4000-8000-000000000041";
const SOURCE_2 = "10000000-0000-4000-8000-000000000042";
const CLAIM_1 = "10000000-0000-4000-8000-000000000061";
const CLAIM_2 = "10000000-0000-4000-8000-000000000062";
const SUPERSESSION_ID = "10000000-0000-4000-8000-000000000081";
const REGISTRATION_ID = "10000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "10000000-0000-4000-8000-000000000031";
const COMMIT = "1123456789abcdef0123456789abcdef01234567";
const encoder = new TextEncoder();

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

async function createSource(
  projectId: ProjectId,
  missionId: MissionId,
  id: string,
  locator: string,
  content: string,
  recordedAtUtc: string
): Promise<EvidenceSource> {
  return createEvidenceSource(
    {
      projectId,
      missionId,
      origin: "SYNTHETIC_FIXTURE",
      sourceLocator: locator,
      sourceRevision: "offline-explanation-v1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "TEXT",
        content: encoder.encode(content)
      })
    },
    { ids: ids(id), clock: clock(recordedAtUtc) }
  );
}

async function createFixtureClaim(
  source: EvidenceSource,
  id: string,
  rawText: string,
  value: JsonValue,
  epistemicLabel: "FACT" | "INFERENCE",
  recordedAtUtc: string
): Promise<Claim> {
  const created = await createClaim(
    {
      projectId: source.projectId,
      missionId: source.missionId,
      evidenceSourceId: source.evidenceSourceId,
      rawText,
      subject: "Release decision",
      predicate: "is approved",
      value,
      applicability: {
        dimensions: [{ dimension: "region", value: "global" }]
      },
      extractionMethod: "MANUAL_STRUCTURED_INTAKE",
      epistemicLabel
    },
    source,
    undefined,
    { ids: ids(id), clock: clock(recordedAtUtc) }
  );
  return created.claim;
}

export async function createOfflineExplanationFixture(
  question: string,
  scenario: OfflineExplanationScenario
): Promise<OfflineExplanationFixture> {
  const project = createProject(
    { name: "Offline explanation fixture" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-06T03:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Explain release evidence without AI" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-06T03:01:00.000Z") }
  );
  const evidenceSources: EvidenceSource[] = [];
  const claims: Claim[] = [];
  const claimSupersessions: ClaimSupersession[] = [];
  if (scenario === "CONFLICT") {
    const approvedText = "Release is approved for the global region.";
    const blockedText = "Release is blocked for the global region.";
    const approved = await createSource(
      project.projectId,
      mission.missionId,
      SOURCE_1,
      "fixture:release-approved",
      approvedText,
      "2026-08-06T03:02:00.000Z"
    );
    const blocked = await createSource(
      project.projectId,
      mission.missionId,
      SOURCE_2,
      "fixture:release-blocked",
      blockedText,
      "2026-08-06T03:03:00.000Z"
    );
    evidenceSources.push(approved, blocked);
    claims.push(
      await createFixtureClaim(
        approved,
        CLAIM_1,
        approvedText,
        true,
        "FACT",
        "2026-08-06T03:04:00.000Z"
      ),
      await createFixtureClaim(
        blocked,
        CLAIM_2,
        blockedText,
        false,
        "INFERENCE",
        "2026-08-06T03:05:00.000Z"
      )
    );
  }
  if (scenario === "CORRECTION") {
    const blockedText = "Release was blocked for the global region.";
    const approvedText = "Release is approved for the global region.";
    const correctionSource = await createSource(
      project.projectId,
      mission.missionId,
      SOURCE_1,
      "fixture:release-correction",
      `${blockedText}\n${approvedText}`,
      "2026-08-06T03:02:00.000Z"
    );
    const predecessor = await createClaim(
      {
        projectId: project.projectId,
        missionId: mission.missionId,
        evidenceSourceId: correctionSource.evidenceSourceId,
        rawText: blockedText,
        subject: "Release decision",
        predicate: "is approved",
        value: false,
        applicability: {
          dimensions: [{ dimension: "region", value: "global" }]
        },
        extractionMethod: "MANUAL_STRUCTURED_INTAKE",
        epistemicLabel: "FACT"
      },
      correctionSource,
      undefined,
      { ids: ids(CLAIM_1), clock: clock("2026-08-06T03:04:00.000Z") }
    );
    const successor = await createClaim(
      {
        projectId: project.projectId,
        missionId: mission.missionId,
        evidenceSourceId: correctionSource.evidenceSourceId,
        rawText: approvedText,
        subject: "Release decision",
        predicate: "is approved",
        value: true,
        applicability: {
          dimensions: [{ dimension: "region", value: "global" }]
        },
        extractionMethod: "MANUAL_STRUCTURED_INTAKE",
        epistemicLabel: "FACT",
        supersedesClaimId: predecessor.claim.claimId
      },
      correctionSource,
      predecessor.claim,
      {
        ids: ids(CLAIM_2, SUPERSESSION_ID),
        clock: clock("2026-08-06T03:05:00.000Z")
      }
    );
    if (successor.supersession === undefined) {
      throw new Error("Fixture correction supersession is absent.");
    }
    evidenceSources.push(correctionSource);
    claims.push(predecessor.claim, successor.claim);
    claimSupersessions.push(successor.supersession);
  }
  const snapshot = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/a.ts" }]
    },
    { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-06T03:06:00.000Z") }
  );
  const codeMapSourceDigest = await sha256TextDigest("offline-explanation-source");
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-06T03:07:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: codeMapSourceDigest
    },
    assets: [
      {
        memberKey: "module:src/a.ts",
        kind: "FILE",
        label: "src/a.ts",
        sourcePath: "src/a.ts",
        sourceDigest: codeMapSourceDigest
      }
    ],
    edges: []
  });
  const twin = await projectTwinRevision({
    project,
    mission,
    evidenceSources,
    claims,
    claimSupersessions,
    snapshots: [snapshot],
    validationResults: [],
    codeMap
  });
  const validationKey = "validation:release";
  const reassessment = await reassessReconciliation({
    twin,
    evidenceSources,
    claims,
    claimSupersessions,
    targetSnapshot: snapshot,
    validationResults: [],
    requirements:
      scenario === "MISSING_VALIDATION"
        ? [
            {
              requirementId: "support:release-validation",
              supportKind: "VALIDATION_RESULT",
              validationKey
            }
          ]
        : []
  });
  const asset = codeMap.assets[0];
  if (asset === undefined) throw new Error("Fixture asset is absent.");
  const assetNode = twin.nodes.find(
    (node) =>
      node.nodeType === "SoftwareAsset" &&
      node.metadata.sourceReference === `code-map-asset:${asset.assetId}`
  );
  if (assetNode === undefined) throw new Error("Fixture asset node is absent.");
  const assetReference = {
    kind: "NODE" as const,
    memberId: assetNode.nodeId,
    revision: assetNode.revision,
    digest: await sha256TextDigest(serializeTwinNode(assetNode))
  };
  const impactRequirements =
    scenario === "MISSING_VALIDATION"
      ? [
          {
            requirementId: "impact:release-validation",
            rootId: "release:asset",
            criticalAssetId: asset.assetId,
            supportKind: "VALIDATION" as const,
            validationKey,
            basisCitations: [assetReference]
          }
        ]
      : scenario === "IMPACT"
        ? [
            {
              requirementId: "impact:implementation",
              rootId: "release:asset",
              criticalAssetId: asset.assetId,
              supportKind: "IMPLEMENTATION" as const,
              basisCitations: [assetReference]
            }
          ]
        : [];
  const impact = await analyzeChangeImpact({
    twin,
    reassessment,
    codeMap,
    targetSnapshot: snapshot,
    validationResults: [],
    roots: [{ rootId: "release:asset", nodeId: assetNode.nodeId }],
    requirements: impactRequirements
  });
  const assessment = await createReconciliationImpactRevision({
    reassessment,
    impact
  });
  const pack = await compileEvidencePack({
    question,
    assessment,
    twin,
    evidenceSources,
    claims,
    claimSupersessions
  });
  return Object.freeze({
    pack,
    assessment,
    twin,
    evidenceSources: Object.freeze(evidenceSources),
    claims: Object.freeze(claims),
    claimSupersessions: Object.freeze(claimSupersessions)
  });
}

export async function compileOfflineExplanationFixture(
  question: string,
  scenario: OfflineExplanationScenario
): Promise<EvidencePack> {
  return (await createOfflineExplanationFixture(question, scenario)).pack;
}
