import { beforeAll, describe, expect, it, vi } from "vitest";

import { createProviderNeutralAdapter } from "@intelliloop/domain";
import type { CitedExplanationResponse } from "@intelliloop/contracts";
import { createOfflineExplanationFixture } from "../../../packages/domain/test/support/offline-explanation-fixture";

import {
  createCitedExplanation,
  isCitedExplanationResponse
} from "../src/cited-explanation-client";
import { CitedExplanationService } from "../../api/src/explanations/cited-explanation-service";

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const UNKNOWN_CITATION = `cite:${"f".repeat(64)}`;
let validResponse: CitedExplanationResponse;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

beforeAll(async () => {
  const fixture = await createOfflineExplanationFixture(
    "Can we release?",
    "CONFLICT"
  );
  validResponse = await new CitedExplanationService({
    twins: { get: async () => fixture.twin },
    evidence: {
      getEvidenceSource: async (_projectId, _missionId, sourceId) => {
        const value = fixture.evidenceSources.find(
          (source) => source.evidenceSourceId === sourceId
        );
        if (value === undefined) throw new Error("fixture source absent");
        return value;
      }
    },
    claims: {
      getClaim: async (_projectId, _missionId, claimId) => {
        const value = fixture.claims.find((claim) => claim.claimId === claimId);
        if (value === undefined) throw new Error("fixture claim absent");
        return value;
      },
      listSupersessions: async () => ({
        items: fixture.claimSupersessions,
        nextCursor: null
      })
    },
    assessments: { latest: async () => fixture.assessment },
    adapter: createProviderNeutralAdapter()
  }).execute(
    fixture.assessment.projectId,
    fixture.assessment.missionId,
    "Can we release?",
    REQUEST_ID
  );
});

describe("cited-explanation browser contract", () => {
  it("accepts the complete strict AI-off response and sends only one fixed question", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(validResponse)
    );
    await expect(createCitedExplanation(
      validResponse.missionId,
      "Can we release?",
      fetcher
    )).resolves.toEqual(validResponse);
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/missions/${validResponse.missionId}/cited-explanations`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "Can we release?" }),
        headers: { Accept: "application/json", "Content-Type": "application/json" }
      })
    );
  });

  it("accepts a safe provider-unavailable label while retaining the offline explanation", () => {
    const unavailable = structuredClone(validResponse) as CitedExplanationResponse;
    Object.assign(unavailable.execution, {
      providerOutcome: "ADVISORY_UNAVAILABLE",
      failureCode: "PROVIDER_TRANSPORT_FAILED"
    });
    expect(isCitedExplanationResponse(unavailable)).toBe(true);
    expect(unavailable.offlineExplanation.engine.aiStatus).toBe("AI_OFF");
  });

  it("rejects an unknown statement citation before any answer can be rendered", async () => {
    const unsafe = structuredClone(validResponse) as unknown as {
      offlineExplanation: { answer: { citationIds: string[] } };
    };
    unsafe.offlineExplanation.answer.citationIds = [UNKNOWN_CITATION];
    expect(isCitedExplanationResponse(unsafe)).toBe(false);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(unsafe));
    await expect(createCitedExplanation(
      validResponse.missionId,
      "Can we release?",
      fetcher
    )).rejects.toMatchObject({ name: "WorkspaceClientError" });
  });

  it("rejects authority fields, incoherent pack identity and private absolute paths", () => {
    const authority = {
      ...structuredClone(validResponse),
      readinessStatus: "READY"
    };
    expect(isCitedExplanationResponse(authority)).toBe(false);

    const wrongPack = structuredClone(validResponse) as CitedExplanationResponse;
    const parsed = JSON.parse(wrongPack.disclosure.exactRedactedPackJson) as {
      packDigest: string;
    };
    parsed.packDigest = `sha256:${"f".repeat(64)}`;
    Object.assign(wrongPack.disclosure, {
      exactRedactedPackJson: JSON.stringify(parsed)
    });
    expect(isCitedExplanationResponse(wrongPack)).toBe(false);

    const privatePath = structuredClone(validResponse) as CitedExplanationResponse;
    const firstCitation = privatePath.citationDetails[0];
    if (firstCitation === undefined) throw new Error("Fixture citation is absent.");
    Object.assign(firstCitation, {
      payloadJson: JSON.stringify({ root: "C:\\Users\\private\\secret.txt" })
    });
    expect(isCitedExplanationResponse(privatePath)).toBe(false);
  });

  it("rejects synthetic suggestions with changed labels, unknown citations or authority", () => {
    expect(validResponse.syntheticEdgeCases.suggestions.length).toBeGreaterThan(0);

    const label = structuredClone(validResponse) as unknown as {
      syntheticEdgeCases: { suggestions: Array<{ authorityLabel: string }> };
    };
    const labelSuggestion = label.syntheticEdgeCases.suggestions[0];
    if (labelSuggestion === undefined) throw new Error("Fixture suggestion is absent.");
    labelSuggestion.authorityLabel = "AUTHORITATIVE";
    expect(isCitedExplanationResponse(label)).toBe(false);

    const citation = structuredClone(validResponse) as unknown as {
      syntheticEdgeCases: { suggestions: Array<{ citationIds: string[] }> };
    };
    const citationSuggestion = citation.syntheticEdgeCases.suggestions[0];
    if (citationSuggestion === undefined) throw new Error("Fixture suggestion is absent.");
    citationSuggestion.citationIds = [UNKNOWN_CITATION];
    expect(isCitedExplanationResponse(citation)).toBe(false);

    const authority = structuredClone(validResponse) as unknown as {
      syntheticEdgeCases: { authority: { readinessAuthority: boolean } };
    };
    authority.syntheticEdgeCases.authority.readinessAuthority = true;
    expect(isCitedExplanationResponse(authority)).toBe(false);
  });
});
