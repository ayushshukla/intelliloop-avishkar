import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  TwinNodeResource,
  TwinRelationshipResource,
  TwinRevisionSummaryResource
} from "@intelliloop/contracts";

import { EvidenceReplayLab } from "../src/EvidenceReplayLab";
import { compareTwinRevisions } from "../src/evidence-replay";
import { parseWebFeatureFlags, WEB_FEATURE_FLAGS } from "../src/feature-flags";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const NODE_A = "00000000-0000-4000-8000-000000000021";
const NODE_B = "00000000-0000-4000-8000-000000000022";
const NODE_C = "00000000-0000-4000-8000-000000000023";
const RELATIONSHIP_ID = "00000000-0000-4000-8000-000000000031";
const DIGEST_A = `sha256:${"a".repeat(64)}` as TwinNodeResource["memberDigest"];
const DIGEST_B = `sha256:${"b".repeat(64)}` as TwinNodeResource["memberDigest"];
const DIGEST_C = `sha256:${"c".repeat(64)}` as TwinNodeResource["memberDigest"];
const DIGEST_D = `sha256:${"d".repeat(64)}` as TwinNodeResource["memberDigest"];

function revision(value: number): TwinRevisionSummaryResource {
  return {
    projectionId: "00000000-0000-4000-8000-000000000041",
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    revision: value,
    inputDigest: value === 1 ? DIGEST_A : DIGEST_B,
    projectionDigest: value === 1 ? DIGEST_C : DIGEST_D,
    recordedAtUtc: `2026-08-07T00:00:0${value}.000Z`,
    ...(value === 1
      ? {}
      : { predecessor: { revision: value - 1, projectionDigest: DIGEST_C } }),
    nodeCount: 2,
    relationshipCount: 1,
    invalidationCount: 0
  };
}

function node(
  nodeId: string,
  memberDigest: string,
  pathCitation: string
): TwinNodeResource {
  return {
    nodeId,
    nodeRevision: 1,
    memberDigest: memberDigest as TwinNodeResource["memberDigest"],
    nodeType: "Claim",
    attribution: {
      origin: "SYNTHETIC_FIXTURE",
      pathCitation,
      sourceVersion: { kind: "CONTENT_DIGEST", value: DIGEST_A },
      recordedAtUtc: "2026-08-07T00:00:00.000Z",
      extractionMethod: "controlled-test",
      epistemicLabel: "FACT"
    },
    source: {
      sourceType: "Claim",
      sourceId: nodeId,
      sourceDigest: DIGEST_A
    }
  };
}

function relationship(): TwinRelationshipResource {
  return {
    relationshipId: RELATIONSHIP_ID,
    relationshipRevision: 1,
    memberDigest: DIGEST_D,
    relationshipType: "ASSERTS",
    from: { nodeId: NODE_A, nodeRevision: 1 },
    to: { nodeId: NODE_B, nodeRevision: 1 },
    attribution: {
      origin: "SYNTHETIC_FIXTURE",
      pathCitation: "decisions/cancellation.md#asserts",
      sourceVersion: { kind: "CONTENT_DIGEST", value: DIGEST_A },
      recordedAtUtc: "2026-08-07T00:00:00.000Z",
      extractionMethod: "controlled-test",
      epistemicLabel: "FACT"
    }
  };
}

describe("Evidence Replay Lab", () => {
  it("compares immutable members with exact before/after citations without mutation", () => {
    const input = {
      baseline: {
        revision: revision(1),
        nodes: [
          node(NODE_A, DIGEST_A, "requirements/cancellation.md#before"),
          node(NODE_B, DIGEST_B, "decisions/legacy.md#removed")
        ],
        relationships: [relationship()]
      },
      candidate: {
        revision: revision(2),
        nodes: [
          node(NODE_A, DIGEST_C, "requirements/cancellation.md#after"),
          node(NODE_C, DIGEST_D, "validations/inventory.md#added")
        ],
        relationships: [relationship()]
      }
    } as const;
    const before = structuredClone(input);

    const result = compareTwinRevisions(input);

    expect(result).toMatchObject({
      version: "evidence-replay.v1",
      addedCount: 1,
      removedCount: 1,
      changedCount: 1,
      unchangedMemberCount: 1
    });
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          change: "CHANGED",
          memberId: NODE_A,
          baseline: expect.objectContaining({ pathCitation: "requirements/cancellation.md#before" }),
          candidate: expect.objectContaining({ pathCitation: "requirements/cancellation.md#after" })
        }),
        expect.objectContaining({ change: "REMOVED", memberId: NODE_B }),
        expect.objectContaining({ change: "ADDED", memberId: NODE_C })
      ])
    );
    expect(input).toEqual(before);
  });

  it("is omitted by default and accepts only an explicit strict opt-in", () => {
    expect(WEB_FEATURE_FLAGS.evidenceReplay).toBe(false);
    expect(parseWebFeatureFlags({}).evidenceReplay).toBe(false);
    expect(
      parseWebFeatureFlags({ VITE_INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY: "true" })
        .evidenceReplay
    ).toBe(true);
    expect(() =>
      parseWebFeatureFlags({ VITE_INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY: "yes" })
    ).toThrow(/must be exactly true or false/);
  });

  it("renders an explicit read-only boundary and performs no request before operator action", () => {
    const fetcher = vi.fn<typeof fetch>();
    const html = renderToStaticMarkup(
      <EvidenceReplayLab
        missionId={MISSION_ID}
        revisions={[revision(2), revision(1)]}
        historyIsPartial={false}
        fetcher={fetcher}
      />
    );

    expect(html).toContain("Evidence Replay Lab");
    expect(html).toContain("GET requests only");
    expect(html).toContain("cannot alter evidence, findings, readiness or Passport state");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
