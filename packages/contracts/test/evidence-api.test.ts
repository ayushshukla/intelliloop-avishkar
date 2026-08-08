import {
  createClaim,
  createClock,
  createEvidenceSource,
  createEvidenceTimelineEvent,
  createStableIdGenerator,
  prepareEvidenceImport
} from "@intelliloop/domain";
import { describe, expect, it } from "vitest";

import {
  createClaimResponse,
  createEvidencePreviewResponse,
  createEvidenceSourceResponse,
  toClaimResource
} from "../src/index.js";

const PROJECT = "00000000-0000-4000-8000-000000000001";
const MISSION = "00000000-0000-4000-8000-000000000011";
const SOURCE = "00000000-0000-4000-8000-000000000041";
const EVENT = "00000000-0000-4000-8000-000000000051";
const CLAIM = "00000000-0000-4000-8000-000000000061";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const encoder = new TextEncoder();

async function fixture() {
  const prepared = await prepareEvidenceImport({
    format: "MARKDOWN",
    content: encoder.encode(
      "Cancellation is allowed before dispatch.\npassword=contract-secret-123456789\n"
    )
  });
  const source = await createEvidenceSource(
    {
      projectId: PROJECT as never,
      missionId: MISSION as never,
      origin: "USER_INPUT",
      sourceLocator: "manual:requirements/cancellation-v2",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared
    },
    {
      ids: createStableIdGenerator(() => SOURCE),
      clock: createClock(() => new Date(T0))
    }
  );
  const timelineEvent = createEvidenceTimelineEvent(
    source,
    1,
    createStableIdGenerator(() => EVENT)
  );
  const claim = (
    await createClaim(
      {
        projectId: source.projectId,
        missionId: source.missionId,
        evidenceSourceId: source.evidenceSourceId,
        rawText: "Cancellation is allowed before dispatch.",
        subject: "Order Cancellation",
        predicate: "Allowed Before",
        value: { state: false, threshold: 0 },
        applicability: {
          dimensions: [{ dimension: "Region", value: "India" }]
        },
        extractionMethod: "MANUAL_STRUCTURED_INTAKE",
        epistemicLabel: "INFERENCE"
      },
      source,
      undefined,
      {
        ids: createStableIdGenerator(() => CLAIM),
        clock: createClock(() => new Date(T1))
      }
    )
  ).claim;
  return { prepared, source, timelineEvent, claim };
}

describe("evidence API resource contracts", () => {
  it("serializes a redacted preview and attributed source/event without optional nulls", async () => {
    const { prepared, source, timelineEvent } = await fixture();

    expect(createEvidencePreviewResponse(prepared)).toMatchObject({
      apiVersion: "v1",
      preview: {
        normalizedContent:
          "Cancellation is allowed before dispatch.\npassword=[REDACTED:GENERIC_SECRET_ASSIGNMENT]\n",
        redaction: { applied: true, totalReplacements: 1 }
      }
    });
    const response = createEvidenceSourceResponse({
      created: true,
      source,
      timelineEvent
    });
    expect(response.evidenceSource).not.toHaveProperty("sourceRevision");
    expect(response.evidenceSource).not.toHaveProperty("effectiveAtUtc");
    expect(response.timelineEvent).toMatchObject({
      timelineEventId: EVENT,
      evidenceSourceId: SOURCE,
      sequence: 1
    });
  });

  it("preserves canonical nested JSON and explicit inference metadata", async () => {
    const { claim } = await fixture();
    const resource = toClaimResource(claim);
    const response = createClaimResponse({ created: true, claim });

    expect(resource.value).toEqual({ state: false, threshold: 0 });
    expect(resource).toMatchObject({
      claimId: CLAIM,
      subject: "order.cancellation",
      predicate: "allowed.before",
      epistemicLabel: "INFERENCE",
      applicability: {
        dimensions: [{ dimension: "region", value: "india" }]
      }
    });
    expect(resource).not.toHaveProperty("supersedesClaimId");
    expect(response).not.toHaveProperty("supersession");
  });
});
