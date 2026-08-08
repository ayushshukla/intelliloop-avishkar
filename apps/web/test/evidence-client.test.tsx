import { describe, expect, it, vi } from "vitest";

import {
  commitEvidence,
  isClaimResource,
  isClaimSupersessionResource,
  listClaimSupersessions,
  listClaims,
  listEvidenceSources,
  previewEvidence
} from "../src/evidence-client";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const S1 = "00000000-0000-4000-8000-000000000041";
const E1 = "00000000-0000-4000-8000-000000000051";
const C1 = "00000000-0000-4000-8000-000000000061";
const C2 = "00000000-0000-4000-8000-000000000062";
const L1 = "00000000-0000-4000-8000-000000000071";
const DIGEST = `sha256:${"a".repeat(64)}`;
const T1 = "2026-08-04T10:00:00.000Z";

const PREPARED = {
  normalizationVersion: "evidence-normalization.v1",
  format: "TEXT",
  inputByteCount: 18,
  normalizedByteCount: 18,
  normalizedContent: "Cancellation rule\n",
  contentDigest: DIGEST,
  redaction: { applied: false, totalReplacements: 0, ruleCounts: [] }
} as const;

const SOURCE = {
  evidenceSourceId: S1,
  projectId: P1,
  missionId: M1,
  importKey: DIGEST,
  origin: "USER_INPUT",
  sourceLocator: "manual:requirements/cancellation-v1",
  sourceRevision: "v1",
  recordedAtUtc: T1,
  extractionMethod: "DIRECT_IMPORT",
  epistemicLabel: "FACT",
  prepared: PREPARED
} as const;

const EVENT = {
  timelineEventId: E1,
  projectId: P1,
  missionId: M1,
  sequence: 1,
  eventType: "EVIDENCE_IMPORTED",
  evidenceSourceId: S1,
  occurredAtUtc: T1
} as const;

const CLAIM = {
  claimId: C1,
  projectId: P1,
  missionId: M1,
  evidenceSourceId: S1,
  importKey: DIGEST,
  claimDigest: DIGEST,
  normalizationVersion: "claim-normalization.v1",
  origin: "USER_INPUT",
  sourceLocator: SOURCE.sourceLocator,
  sourceRevision: "v1",
  sourceContentDigest: DIGEST,
  recordedAtUtc: T1,
  extractionMethod: "MANUAL_STRUCTURED_INTAKE",
  epistemicLabel: "FACT",
  rawText: "Cancellation rule",
  subject: "order.cancellation",
  predicate: "allowed.before",
  comparisonKey: DIGEST,
  value: { allowed: true, channels: ["web"] },
  applicability: { dimensions: [{ dimension: "channel", value: "web" }] },
  applicabilityKey: DIGEST
} as const;

const SUCCESSOR = {
  ...CLAIM,
  claimId: C2,
  epistemicLabel: "INFERENCE",
  value: false,
  supersedesClaimId: C1
} as const;

const LINK = {
  claimSupersessionId: L1,
  relationshipType: "SUPERSEDES",
  projectId: P1,
  missionId: M1,
  predecessorClaimId: C1,
  successorClaimId: C2,
  evidenceSourceId: S1,
  comparisonKey: DIGEST,
  applicabilityKey: DIGEST,
  origin: "USER_INPUT",
  sourceLocator: SOURCE.sourceLocator,
  sourceRevision: "v1",
  sourceContentDigest: DIGEST,
  recordedAtUtc: T1,
  extractionMethod: "MANUAL_STRUCTURED_INTAKE",
  epistemicLabel: "INFERENCE",
  linkDigest: DIGEST
} as const;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("evidence workspace API client", () => {
  it("previews through the strict route and accepts only a bounded prepared resource", async () => {
    const response = { apiVersion: "v1", preview: PREPARED } as const;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(response));

    await expect(
      previewEvidence(M1, { format: "TEXT", content: "Cancellation rule\n" }, fetcher)
    ).resolves.toEqual(response);
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/missions/${M1}/evidence/preview`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ format: "TEXT", content: "Cancellation rule\n" })
      })
    );

    const invalidFetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          preview: { ...PREPARED, normalizedByteCount: 16 }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          preview: {
            ...PREPARED,
            redaction: {
              applied: true,
              totalReplacements: 1,
              ruleCounts: [{ rule: "UNKNOWN_RULE", replacements: 1 }]
            }
          }
        })
      );
    await expect(
      previewEvidence(M1, { format: "TEXT", content: "Cancellation rule\n" }, invalidFetcher)
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(
      previewEvidence(M1, { format: "TEXT", content: "Cancellation rule\n" }, invalidFetcher)
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects a commit response whose event attribution does not match its source", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        apiVersion: "v1",
        created: true,
        evidenceSource: SOURCE,
        timelineEvent: { ...EVENT, evidenceSourceId: C1 }
      }, 201)
    );

    await expect(
      commitEvidence(
        M1,
        {
          format: "TEXT",
          content: "Cancellation rule\n",
          origin: "USER_INPUT",
          sourceLocator: SOURCE.sourceLocator,
          epistemicLabel: "FACT"
        },
        fetcher
      )
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects unknown source fields and out-of-contract pagination", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          evidenceSources: [{ ...SOURCE, rawContent: "must-not-render" }],
          page: { limit: 100, nextCursor: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          evidenceSources: [SOURCE],
          page: { limit: 101, nextCursor: null }
        })
      );

    await expect(listEvidenceSources(M1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
    await expect(listEvidenceSources(M1, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
  });

  it("preserves nested claim values and explicit successor metadata", async () => {
    expect(isClaimResource(CLAIM)).toBe(true);
    expect(isClaimResource(SUCCESSOR)).toBe(true);
    expect(isClaimSupersessionResource(LINK)).toBe(true);

    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          claims: [CLAIM, SUCCESSOR],
          page: { limit: 100, nextCursor: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          apiVersion: "v1",
          missionId: M1,
          supersessions: [LINK],
          page: { limit: 100, nextCursor: null }
        })
      );

    await expect(listClaims(M1, fetcher)).resolves.toMatchObject({
      claims: [{ value: { allowed: true, channels: ["web"] } }, { value: false }]
    });
    await expect(listClaimSupersessions(M1, fetcher)).resolves.toMatchObject({
      supersessions: [
        { predecessorClaimId: C1, successorClaimId: C2, relationshipType: "SUPERSEDES" }
      ]
    });
  });
});
