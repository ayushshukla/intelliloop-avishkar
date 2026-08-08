import { describe, expect, it } from "vitest";

import {
  EVIDENCE_PACK_ITEM_KINDS,
  EvidencePackError,
  MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES,
  MAXIMUM_EVIDENCE_PACK_SERIALIZED_BYTES,
  MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND,
  assertEvidencePackInvariant,
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
  evidencePackSerializedByteCount,
  evidencePackTokenUpperBound,
  parseUtcTimestamp,
  prepareEvidenceImport,
  projectTwinRevision,
  reassessReconciliation,
  resolveEvidencePackCitation,
  type Claim,
  type EvidencePack,
  type EvidencePackErrorCode,
  type EvidenceSource,
  type ReconciliationImpactRevision,
  type TwinProjectionRevision
} from "../src/index.js";
import { analyzeChangeImpact } from "../src/impact-analysis.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const SOURCE_1 = "00000000-0000-4000-8000-000000000041";
const SOURCE_2 = "00000000-0000-4000-8000-000000000042";
const CLAIM_1 = "00000000-0000-4000-8000-000000000061";
const CLAIM_2 = "00000000-0000-4000-8000-000000000062";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000031";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const TOKEN_SENTINEL = "sk-proj-ABCDEFGHIJKLMNOPQRSTUV";
const PASSWORD_SENTINEL = "pack-password-sentinel";
const PRIVATE_PATH = "C:\\Users\\fixture\\private\\result.json";
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

interface Fixture {
  readonly assessment: ReconciliationImpactRevision;
  readonly twin: TwinProjectionRevision;
  readonly sources: readonly [EvidenceSource, EvidenceSource];
  readonly claims: readonly [Claim, Claim];
}

async function source(
  projectId: EvidenceSource["projectId"],
  missionId: EvidenceSource["missionId"],
  id: string,
  locator: string,
  content: string,
  recordedAt: string
): Promise<EvidenceSource> {
  return createEvidenceSource(
    {
      projectId,
      missionId,
      origin: "SYNTHETIC_FIXTURE",
      sourceLocator: locator,
      sourceRevision: "fixture-v1",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "TEXT",
        content: encoder.encode(content)
      })
    },
    { ids: ids(id), clock: clock(recordedAt) }
  );
}

async function claim(
  evidence: EvidenceSource,
  id: string,
  rawText: string,
  value: unknown,
  recordedAt: string
): Promise<Claim> {
  const created = await createClaim(
    {
      projectId: evidence.projectId,
      missionId: evidence.missionId,
      evidenceSourceId: evidence.evidenceSourceId,
      rawText,
      subject: "Release decision",
      predicate: "is approved",
      value,
      applicability: { dimensions: [{ dimension: "region", value: "global" }] },
      extractionMethod: "MANUAL_STRUCTURED_INTAKE",
      epistemicLabel: "FACT"
    },
    evidence,
    undefined,
    { ids: ids(id), clock: clock(recordedAt) }
  );
  return created.claim;
}

async function fixture(): Promise<Fixture> {
  const project = createProject(
    { name: "Evidence pack fixture" },
    { ids: ids(PROJECT_ID), clock: clock("2026-08-06T01:00:00.000Z") }
  );
  const mission = createChangeMission(
    project,
    [],
    { title: "Explain the release decision" },
    { ids: ids(MISSION_ID), clock: clock("2026-08-06T01:01:00.000Z") }
  );
  const firstSource = await source(
    project.projectId,
    mission.missionId,
    SOURCE_1,
    "fixture:approval",
    `Release is approved at ${PRIVATE_PATH}.`,
    "2026-08-06T01:02:00.000Z"
  );
  const secondSource = await source(
    project.projectId,
    mission.missionId,
    SOURCE_2,
    "fixture:block",
    `Release is blocked by token ${TOKEN_SENTINEL}.`,
    "2026-08-06T01:03:00.000Z"
  );
  const firstClaim = await claim(
    firstSource,
    CLAIM_1,
    `Release is approved at ${PRIVATE_PATH}.`,
    { password: PASSWORD_SENTINEL, status: true },
    "2026-08-06T01:04:00.000Z"
  );
  const secondClaim = await claim(
    secondSource,
    CLAIM_2,
    "Release is blocked by token [REDACTED:OPENAI_TOKEN].",
    false,
    "2026-08-06T01:05:00.000Z"
  );
  const snapshot = await createGitSnapshot(
    {
      projectId: project.projectId,
      missionId: mission.missionId,
      registrationId: ids(REGISTRATION_ID)<"REPOSITORY_REGISTRATION">(),
      head: { state: "ATTACHED", branchName: "main", headCommit: COMMIT },
      changes: [{ indexStatus: " ", worktreeStatus: "M", path: "src/a.ts" }]
    },
    { ids: ids(SNAPSHOT_ID), clock: clock("2026-08-06T01:06:00.000Z") }
  );
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-06T01:07:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: firstSource.prepared.contentDigest
    },
    assets: [
      {
        memberKey: "module:src/a.ts",
        kind: "FILE",
        label: "src/a.ts",
        sourcePath: "src/a.ts",
        sourceDigest: firstSource.prepared.contentDigest
      }
    ],
    edges: []
  });
  const sources = [firstSource, secondSource] as const;
  const claims = [firstClaim, secondClaim] as const;
  const twin = await projectTwinRevision({
    project,
    mission,
    evidenceSources: sources,
    claims,
    claimSupersessions: [],
    snapshots: [snapshot],
    validationResults: [],
    codeMap
  });
  const reassessment = await reassessReconciliation({
    twin,
    evidenceSources: sources,
    claims,
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
    roots: [{ rootId: "release:asset", nodeId: assetNode.nodeId }],
    requirements: []
  });
  return {
    assessment: await createReconciliationImpactRevision({ reassessment, impact }),
    twin,
    sources,
    claims
  };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: EvidencePackErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected evidence-pack operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(EvidencePackError);
    if (!(error instanceof EvidencePackError)) throw error;
    expect(error.code).toBe(code);
  }
}

async function compile(value: Fixture, question = "Why is release blocked?") {
  return compileEvidencePack({
    question,
    assessment: value.assessment,
    twin: value.twin,
    evidenceSources: value.sources,
    claims: value.claims,
    claimSupersessions: []
  });
}

describe("redacted deterministic evidence pack", () => {
  it("compiles the same digest, ordering and citations from reordered exact inputs", async () => {
    const value = await fixture();
    const first = await compile(value);
    const second = await compileEvidencePack({
      question: "Why is release blocked?",
      assessment: value.assessment,
      twin: value.twin,
      evidenceSources: [...value.sources].reverse(),
      claims: [...value.claims].reverse(),
      claimSupersessions: []
    });

    expect(second).toEqual(first);
    expect(first.compilerPolicyVersion).toBe(
      "evidence-pack-compiler-policy.v2"
    );
    expect(first.packDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.items.map((item) => item.itemKind)).toEqual(
      [...first.items]
        .sort(
          (left, right) =>
            EVIDENCE_PACK_ITEM_KINDS.indexOf(left.itemKind) -
              EVIDENCE_PACK_ITEM_KINDS.indexOf(right.itemKind) ||
            left.itemKey.localeCompare(right.itemKey, "en")
        )
        .map((item) => item.itemKind)
    );
    expect(first.allowedCitationIds).toEqual(
      first.citations.map((citation) => citation.citationId)
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.items)).toBe(true);
    await assertEvidencePackInvariant(first);
  });

  it("re-redacts the question and selected claim fields without copying source content", async () => {
    const value = await fixture();
    const pack = await compile(
      value,
      `Explain ${PRIVATE_PATH} with Authorization: Bearer abcdefghijklmnop.`
    );
    const serialized = JSON.stringify(pack);

    expect(pack.question).toContain("[REDACTED:PRIVATE_PATH]");
    expect(pack.question).toContain("[REDACTED:AUTHORIZATION]");
    expect(serialized).not.toContain(PRIVATE_PATH);
    expect(serialized).not.toContain(TOKEN_SENTINEL);
    expect(serialized).not.toContain(PASSWORD_SENTINEL);
    expect(serialized).not.toContain('"normalizedContent"');
    expect(serialized).toContain("[REDACTED:JSON_SECRET_KEY]");
    expect(pack.redaction.applied).toBe(true);
    expect(pack.redaction.ruleCounts.map((entry) => entry.rule)).toContain(
      "PRIVATE_PATH"
    );
  });

  it("keeps stable allowlisted citation IDs while the question and pack digest change", async () => {
    const value = await fixture();
    const first = await compile(value, "What blocks release?");
    const second = await compile(value, "Which evidence conflicts?");

    expect(second.packDigest).not.toBe(first.packDigest);
    expect(second.questionDigest).not.toBe(first.questionDigest);
    expect(second.allowedCitationIds).toEqual(first.allowedCitationIds);
    const resolved = await resolveEvidencePackCitation(
      first,
      first.allowedCitationIds[0]
    );
    expect(resolved.item.itemDigest).toBe(resolved.citation.itemDigest);
    expect(resolved.citation.locator.itemKey).toBe(resolved.item.itemKey);
    await expectCode(
      () => resolveEvidencePackCitation(first, `cite:${"f".repeat(64)}`),
      "EVIDENCE_PACK_CITATION_NOT_FOUND"
    );
  });

  it("enforces the conservative provider-neutral byte/token boundary", async () => {
    const value = await fixture();
    const pack = await compile(value);

    expect(evidencePackSerializedByteCount(pack)).toBeLessThanOrEqual(
      MAXIMUM_EVIDENCE_PACK_SERIALIZED_BYTES
    );
    expect(evidencePackTokenUpperBound(pack)).toBeLessThanOrEqual(
      MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND
    );
    expect(evidencePackTokenUpperBound(pack)).toBe(
      evidencePackSerializedByteCount(pack)
    );
    await expectCode(
      () => compile(value, "q".repeat(MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES + 1)),
      "EVIDENCE_PACK_INPUT_INVALID"
    );
  });

  it("fails closed for incomplete Twin inputs and tampered pack bytes", async () => {
    const value = await fixture();
    await expectCode(
      () =>
        compileEvidencePack({
          question: "Why?",
          assessment: value.assessment,
          twin: value.twin,
          evidenceSources: [value.sources[0]],
          claims: value.claims,
          claimSupersessions: []
        }),
      "EVIDENCE_PACK_INPUT_INVALID"
    );

    const pack = await compile(value);
    const forged = {
      ...pack,
      question: "password=unredacted-secret"
    } as EvidencePack;
    await expectCode(
      () => assertEvidencePackInvariant(forged),
      "EVIDENCE_PACK_INTEGRITY_INVALID"
    );
  });
});
