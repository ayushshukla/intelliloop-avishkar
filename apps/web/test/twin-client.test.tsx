import { describe, expect, it, vi } from "vitest";

import {
  listTwinNodes,
  listTwinRelationships,
  listTwinRevisions,
  materializeTwinRevision
} from "../src/twin-client";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const N1 = "00000000-0000-4000-8000-000000000021";
const N2 = "00000000-0000-4000-8000-000000000022";
const R1 = "00000000-0000-4000-8000-000000000031";
const C1 = "00000000-0000-4000-8000-000000000041";
const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const T1 = "2026-08-05T10:00:00.000Z";

const REVISION = {
  projectionId: "00000000-0000-4000-8000-000000000091",
  projectId: P1,
  missionId: M1,
  revision: 1,
  inputDigest: D1,
  projectionDigest: D2,
  recordedAtUtc: T1,
  codeMapBinding: {
    projectionId: C1,
    revision: 3,
    projectionDigest: D1
  },
  nodeCount: 2,
  relationshipCount: 1,
  invalidationCount: 0
} as const;

const ATTRIBUTION = {
  origin: "USER_INPUT",
  pathCitation: `project:${P1}`,
  sourceVersion: { kind: "CONTENT_DIGEST", value: D1 },
  recordedAtUtc: T1,
  extractionMethod: "DETERMINISTIC_PROJECTION",
  epistemicLabel: "FACT"
} as const;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("Twin workspace API client", () => {
  it("accepts bounded revision, cited node and exact relationship pages", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          revisions: [REVISION],
          page: { limit: 100, nextCursor: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          projectionRevision: 1,
          nodes: [
            {
              nodeId: N1,
              nodeRevision: 1,
              memberDigest: D2,
              nodeType: "SoftwareAsset",
              attribution: ATTRIBUTION,
              source: { sourceType: "SoftwareAsset", sourceId: N1, sourceDigest: D1 }
            }
          ],
          page: { limit: 100, nextCursor: N1 }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          projectionRevision: 1,
          relationships: [
            {
              relationshipId: R1,
              relationshipRevision: 1,
              memberDigest: D2,
              relationshipType: "SCOPED_TO",
              from: { nodeId: N1, nodeRevision: 1 },
              to: { nodeId: N2, nodeRevision: 1 },
              attribution: {
                ...ATTRIBUTION,
                origin: "SYSTEM_DERIVATION",
                pathCitation: "projection-link:scoped-to/project"
              }
            }
          ],
          page: { limit: 100, nextCursor: null }
        })
      );

    await expect(listTwinRevisions(M1, fetcher)).resolves.toMatchObject({
      revisions: [
        {
          revision: 1,
          codeMapBinding: { projectionId: C1, revision: 3 }
        }
      ]
    });
    await expect(listTwinNodes(M1, 1, fetcher)).resolves.toMatchObject({
      nodes: [{ attribution: { pathCitation: `project:${P1}` } }]
    });
    await expect(listTwinRelationships(M1, 1, fetcher)).resolves.toMatchObject({
      relationships: [{ relationshipType: "SCOPED_TO" }]
    });
  });

  it("rejects cross-scope, broken predecessor and unknown member variants", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          revisions: [{ ...REVISION, missionId: P1 }],
          page: { limit: 100, nextCursor: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          revisions: [
            { ...REVISION, revision: 2, predecessor: { revision: 2, projectionDigest: D1 } }
          ],
          page: { limit: 100, nextCursor: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          projectionRevision: 1,
          nodes: [
            {
              nodeId: N1,
              nodeRevision: 1,
              memberDigest: D2,
              nodeType: "InventedNode",
              attribution: ATTRIBUTION,
              source: { sourceType: "Project", sourceId: P1, sourceDigest: D1 }
            }
          ],
          page: { limit: 100, nextCursor: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          revisions: [
            {
              ...REVISION,
              codeMapBinding: { ...REVISION.codeMapBinding, revision: 0 }
            }
          ],
          page: { limit: 100, nextCursor: null }
        })
      );

    await expect(listTwinRevisions(M1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
    await expect(listTwinRevisions(M1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
    await expect(listTwinNodes(M1, 1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
    await expect(listTwinRevisions(M1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
  });

  it("materializes without a caller body and preserves the dedicated integrity error", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ apiVersion: "v1", created: true, twinRevision: REVISION }, 201)
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              version: "v1",
              code: "INTEGRITY_ERROR",
              message: "Stored resource integrity verification failed.",
              requestId: "request-1"
            }
          },
          500
        )
      );

    await expect(materializeTwinRevision(M1, fetcher)).resolves.toMatchObject({
      created: true,
      twinRevision: { revision: 1 }
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      `/api/v1/missions/${M1}/twin/revisions`,
      expect.objectContaining({ method: "POST" })
    );
    await expect(listTwinRevisions(M1, fetcher)).rejects.toMatchObject({
      code: "INTEGRITY_ERROR",
      status: 500
    });
  });
});
