import { describe, expect, it, vi } from "vitest";

import {
  listCodeMapAssets,
  listCodeMapEdges,
  listCodeMapRevisions,
  runCodeMapRevision
} from "../src/code-map-client";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";
const C1 = "00000000-0000-4000-8000-000000000041";
const A1 = "00000000-0000-4000-8000-000000000051";
const A2 = "00000000-0000-4000-8000-000000000052";
const E1 = "00000000-0000-4000-8000-000000000061";
const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const T1 = "2026-08-05T10:00:00.000Z";

const REVISION = {
  projectionId: C1,
  projectId: P1,
  missionId: M1,
  registrationId: R1,
  revision: 1,
  inputDigest: D1,
  projectionDigest: D2,
  recordedAtUtc: T1,
  snapshot: { snapshotId: S1, capturedAtUtc: T1, snapshotDigest: D1 },
  evidence: {
    evidenceKind: "STATIC_INFERENCE",
    inferenceStatus: "AVAILABLE",
    completeness: "COMPLETE",
    sourceDigest: D2
  },
  assetCount: 2,
  edgeCount: 1
} as const;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("code-map workspace API client", () => {
  it("accepts coherent snapshot-bound revision, asset and path pages", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        revisions: [REVISION],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        projectionRevision: 1,
        assets: [{
          assetId: A1,
          kind: "FILE",
          label: "src/policy.ts",
          sourcePath: "src/policy.ts",
          sourceDigest: D1,
          evidenceKind: "STATIC_INFERENCE",
          assetDigest: D2
        }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        projectionRevision: 1,
        edges: [{
          edgeId: E1,
          kind: "IMPORTS",
          fromAssetId: A1,
          toAssetId: A2,
          evidenceKind: "STATIC_INFERENCE",
          edgeDigest: D2
        }],
        page: { limit: 100, nextCursor: null }
      }));

    await expect(listCodeMapRevisions(M1, fetcher)).resolves.toMatchObject({
      revisions: [{ evidence: { evidenceKind: "STATIC_INFERENCE" } }]
    });
    await expect(listCodeMapAssets(M1, 1, fetcher)).resolves.toMatchObject({
      assets: [{ sourcePath: "src/policy.ts" }]
    });
    await expect(listCodeMapEdges(M1, 1, fetcher)).resolves.toMatchObject({
      edges: [{ kind: "IMPORTS" }]
    });
  });

  it("rejects incoherent evidence modes and malformed dependency endpoints", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        revisions: [{
          ...REVISION,
          evidence: {
            ...REVISION.evidence,
            evidenceKind: "DECLARED_INTELLILOOP_FIXTURE"
          }
        }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        projectionRevision: 1,
        edges: [{
          edgeId: E1,
          kind: "IMPORTS",
          fromAssetId: A1,
          toAssetId: A1,
          evidenceKind: "STATIC_INFERENCE",
          edgeDigest: D2
        }],
        page: { limit: 100, nextCursor: null }
      }));

    await expect(listCodeMapRevisions(M1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
    await expect(listCodeMapEdges(M1, 1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
  });

  it("keeps fallback disabled by omission and sends controlled consent explicitly", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => jsonResponse({
          apiVersion: "v1",
          created: true,
          codeMapRevision: REVISION
        }, 201));

    await runCodeMapRevision(M1, fetcher);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      `/api/v1/missions/${M1}/code-map/revisions`,
      expect.objectContaining({ method: "POST" })
    );
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("body");

    await runCodeMapRevision(
      M1,
      fetcher,
      "INTELLILOOP_CONTROLLED_FIXTURE"
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `/api/v1/missions/${M1}/code-map/revisions`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          fallbackMode: "INTELLILOOP_CONTROLLED_FIXTURE"
        })
      })
    );
  });
});
