import { describe, expect, it } from "vitest";

import {
  CodeMapProjectionError,
  codeMapSnapshotDigest,
  createClock,
  createCodeMapProjectionRevision,
  createGitSnapshot,
  createStableIdGenerator,
  deserializeCodeMapProjectionRevision,
  parseSha256Digest,
  parseStableId,
  parseUtcTimestamp,
  serializeCodeMapProjectionRevision,
  type CodeMapProjectionRevision,
  type GitSnapshot
} from "../src/index.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000021";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000031";
const SOURCE_DIGEST =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

async function snapshot(): Promise<GitSnapshot> {
  return createGitSnapshot(
    {
      projectId: parseStableId<"PROJECT">(PROJECT_ID),
      missionId: parseStableId<"MISSION">(MISSION_ID),
      registrationId: parseStableId<"REPOSITORY_REGISTRATION">(REGISTRATION_ID),
      head: {
        state: "ATTACHED",
        branchName: "main",
        headCommit: "0123456789abcdef0123456789abcdef01234567"
      },
      changes: []
    },
    {
      ids: createStableIdGenerator(() => SNAPSHOT_ID),
      clock: createClock(() => new Date("2026-08-05T08:00:00.000Z"))
    }
  );
}

function assets() {
  return [
    {
      memberKey: "file:src/a.ts",
      kind: "FILE" as const,
      label: "src/a.ts",
      sourcePath: "src/a.ts",
      sourceDigest: parseSha256Digest(SOURCE_DIGEST)
    },
    {
      memberKey: "contract:src/a.ts:Policy",
      kind: "CONTRACT" as const,
      label: "Policy",
      sourcePath: "src/a.ts",
      sourceDigest: parseSha256Digest(
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      )
    }
  ];
}

function edges() {
  return [
    {
      memberKey: "declares:Policy",
      kind: "DECLARES_CONTRACT" as const,
      fromMemberKey: "contract:src/a.ts:Policy",
      toMemberKey: "file:src/a.ts"
    }
  ];
}

async function inferred(): Promise<CodeMapProjectionRevision> {
  return createCodeMapProjectionRevision({
    snapshot: await snapshot(),
    recordedAtUtc: parseUtcTimestamp("2026-08-05T08:01:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: parseSha256Digest(SOURCE_DIGEST)
    },
    assets: assets(),
    edges: edges()
  });
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: CodeMapProjectionError["code"]
): Promise<void> {
  await expect(operation()).rejects.toMatchObject({ code });
}

describe("snapshot-bound code-map projection", () => {
  it("creates deterministic inferred evidence bound to one exact snapshot", async () => {
    const first = await inferred();
    const second = await inferred();
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      evidenceKind: "STATIC_INFERENCE",
      inferenceStatus: "AVAILABLE",
      completeness: "COMPLETE",
      snapshotId: SNAPSHOT_ID
    });
    expect(first.assets.every((asset) => asset.evidenceKind === "STATIC_INFERENCE")).toBe(true);
    expect(first.edges.every((edge) => edge.evidenceKind === "STATIC_INFERENCE")).toBe(true);
    expect(first.snapshotDigest).toBe(await codeMapSnapshotDigest(await snapshot()));
    const serialized = await serializeCodeMapProjectionRevision(first);
    await expect(deserializeCodeMapProjectionRevision(serialized)).resolves.toEqual(first);
  });

  it("keeps declared fallback visibly non-equivalent to inferred output", async () => {
    const observed = await inferred();
    const declared = await createCodeMapProjectionRevision({
      snapshot: await snapshot(),
      recordedAtUtc: parseUtcTimestamp("2026-08-05T08:02:00.000Z"),
      mode: {
        evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
        completeness: "UNAVAILABLE",
        sourceDigest: parseSha256Digest(SOURCE_DIGEST),
        declaredManifestId: "controlled-fixture-v1",
        fallbackReason: "EXTRACTION_LIMIT_OR_SAFE_FAILURE"
      },
      assets: assets(),
      edges: edges()
    }, observed);
    expect(declared).toMatchObject({
      revision: 2,
      evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
      inferenceStatus: "UNAVAILABLE_SAFE_FAILURE",
      completeness: "UNAVAILABLE",
      declaredManifestId: "controlled-fixture-v1",
      fallbackReason: "EXTRACTION_LIMIT_OR_SAFE_FAILURE"
    });
    expect(declared.assets[0]?.assetId).not.toBe(observed.assets[0]?.assetId);
    expect(declared.projectionDigest).not.toBe(observed.projectionDigest);
  });

  it("rejects silent parser-equivalence mode combinations", async () => {
    const exactSnapshot = await snapshot();
    await expectCode(
      () => createCodeMapProjectionRevision({
        snapshot: exactSnapshot,
        recordedAtUtc: parseUtcTimestamp("2026-08-05T08:01:00.000Z"),
        mode: {
          evidenceKind: "STATIC_INFERENCE",
          completeness: "UNAVAILABLE",
          sourceDigest: parseSha256Digest(SOURCE_DIGEST)
        } as never,
        assets: [],
        edges: []
      }),
      "CODE_MAP_PROJECTION_MODE_INVALID"
    );
  });

  it("fails closed on canonical history tampering", async () => {
    const serialized = await serializeCodeMapProjectionRevision(await inferred());
    const tampered = serialized.replace(
      '"inferenceStatus":"AVAILABLE"',
      '"inferenceStatus":"UNAVAILABLE_SAFE_FAILURE"'
    );
    await expectCode(
      () => deserializeCodeMapProjectionRevision(tampered),
      "CODE_MAP_PROJECTION_MODE_INVALID"
    );
  });
});
