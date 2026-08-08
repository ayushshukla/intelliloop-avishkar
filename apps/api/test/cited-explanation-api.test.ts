import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createProviderNeutralAdapter,
  type EvidencePackCitationId,
  type ProviderAdapterRequest,
  type ProviderAdapterSession
} from "@intelliloop/domain";
import { createOfflineExplanationFixture } from "../../../packages/domain/test/support/offline-explanation-fixture.js";

import { buildApp } from "../src/app.js";
import {
  CitedExplanationService,
  type CitedExplanationAssessmentPort,
  type CitedExplanationClaimPort,
  type CitedExplanationEvidencePort,
  type CitedExplanationTwinPort
} from "../src/explanations/cited-explanation-service.js";
import type { SqliteProjectRepository } from "../src/projects/project-repository.js";

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const UNKNOWN_CITATION = `cite:${"f".repeat(64)}` as EvidencePackCitationId;
const QUESTIONS = [
  "Can we release?",
  "What conflicts are open?",
  "What is impacted?",
  "What validation is missing?",
  "What should happen next?",
  "What changed after correction?"
] as const;

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function rawAdvisory(
  request: ProviderAdapterRequest,
  citationId: EvidencePackCitationId
): unknown {
  return {
    responseVersion: "provider-advisory-response.v1",
    requestId: request.requestId,
    providerRequestDigest: request.requestDigest,
    evidencePackDigest: request.evidencePackDigest,
    outputSchemaVersion: request.outputSchemaVersion,
    answer: {
      text: "Controlled mock advisory summary.",
      citationIds: [citationId]
    },
    facts: [],
    inferences: [],
    conflicts: [],
    gaps: [],
    nextActions: [],
    citations: [citationId],
    providerMetadata: {
      providerId: "controlled.mock",
      modelId: "schema-fixture-v1",
      responseId: "response-fixture-1",
      executionKind: "MOCK_VALIDATION"
    },
    usageMetadata: {
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      source: "PROVIDER_REPORTED"
    }
  };
}

async function setup(
  question: (typeof QUESTIONS)[number],
  adapter: ProviderAdapterSession = createProviderNeutralAdapter()
) {
  const scenario = question === "What changed after correction?"
    ? "CORRECTION"
    : question === "What validation is missing?"
      ? "MISSING_VALIDATION"
      : question === "What is impacted?"
        ? "IMPACT"
        : "CONFLICT";
  const fixture = await createOfflineExplanationFixture(question, scenario);
  const evidenceById = new Map(
    fixture.evidenceSources.map((source) => [source.evidenceSourceId, source])
  );
  const claimsById = new Map(
    fixture.claims.map((claim) => [claim.claimId, claim])
  );
  const service = new CitedExplanationService({
    twins: {
      get: async () => fixture.twin
    } as CitedExplanationTwinPort,
    evidence: {
      getEvidenceSource: async (_projectId, _missionId, evidenceSourceId) => {
        const source = evidenceById.get(evidenceSourceId);
        if (source === undefined) throw new Error("controlled source absent");
        return source;
      }
    } as CitedExplanationEvidencePort,
    claims: {
      getClaim: async (_projectId, _missionId, claimId) => {
        const claim = claimsById.get(claimId);
        if (claim === undefined) throw new Error("controlled claim absent");
        return claim;
      },
      listSupersessions: async () => ({
        items: fixture.claimSupersessions,
        nextCursor: null
      })
    } as CitedExplanationClaimPort,
    assessments: {
      latest: async () => fixture.assessment
    } as CitedExplanationAssessmentPort,
    adapter
  });
  const app = buildApp({
    projectRepository: {
      getMission: () => ({ projectId: fixture.assessment.projectId })
    } as unknown as SqliteProjectRepository,
    citedExplanationService: service,
    requestIdFactory: () => REQUEST_ID
  });
  apps.push(app);
  return { app, fixture, service };
}

describe("cited-question API and product orchestration", () => {
  it("serves all six fixed questions with exact NOT_SENT disclosure and deterministic citations", async () => {
    for (const question of QUESTIONS) {
      const { app, fixture, service } = await setup(question);
      const url = `/api/v1/missions/${fixture.assessment.missionId}/cited-explanations`;
      const direct = await service.execute(
        fixture.assessment.projectId,
        fixture.assessment.missionId,
        question,
        REQUEST_ID
      );
      expect(direct.execution.providerOutcome).toBe("DISABLED");
      const first = await app.inject({ method: "POST", url, payload: { question } });
      const second = await app.inject({ method: "POST", url, payload: { question } });
      expect(first.statusCode, first.body).toBe(200);
      expect(second.statusCode, second.body).toBe(200);
      expect(second.body).toBe(first.body);
      const body = first.json();
      expect(body).toMatchObject({
        apiVersion: "v2",
        missionId: fixture.assessment.missionId,
        question,
        execution: {
          primaryExplanation: "DETERMINISTIC_EXPLANATION",
          externalAiStatus: "OFF",
          providerOutcome: "DISABLED",
          externalCallMade: false,
          canonicalStateChanged: false,
          authority: "ADVISORY_ONLY_NO_RELEASE_DECISION",
          failureCode: "PROVIDER_DISABLED"
        },
        disclosure: {
          disclosureVersion: "cited-explanation-disclosure.v1",
          transferStatus: "NOT_SENT",
          evidencePackDigest: fixture.pack.packDigest,
          itemCount: fixture.pack.items.length,
          citationCount: fixture.pack.citations.length
        },
        offlineExplanation: {
          question,
          engine: {
            explanationType: "DETERMINISTIC_EXPLANATION",
            aiStatus: "AI_OFF",
            provider: "NONE",
            externalCallMade: false
          }
        },
        syntheticEdgeCases: {
          version: "synthetic-edge-case-set.v1",
          policyVersion: "synthetic-edge-case-policy.v1",
          evidencePackDigest: fixture.pack.packDigest,
          generation: {
            mode: "DETERMINISTIC_RULES",
            provider: "NONE",
            externalCallMade: false
          },
          authority: {
            canonicalStateChanged: false,
            findingMutationAvailable: false,
            readinessAuthority: false,
            releasePassportAuthority: false
          }
        }
      });
      expect(body.advisory).toBeUndefined();
      expect(JSON.parse(body.disclosure.exactRedactedPackJson)).toEqual(
        JSON.parse(JSON.stringify(fixture.pack))
      );
      const details = new Map(
        body.citationDetails.map((entry: { citationId: string }) => [entry.citationId, entry])
      );
      const statements = [
        body.offlineExplanation.answer,
        ...body.offlineExplanation.facts,
        ...body.offlineExplanation.inferences,
        ...body.offlineExplanation.conflicts,
        ...body.offlineExplanation.gaps,
        ...body.offlineExplanation.nextActions
      ];
      expect(statements.every((statement: { citationIds: string[] }) =>
        statement.citationIds.every((citationId) => details.has(citationId))
      )).toBe(true);
      expect(body.syntheticEdgeCases.suggestions.every((suggestion: {
        syntheticLabel: string;
        authorityLabel: string;
        evidenceStatus: string;
        citationIds: string[];
      }) =>
        suggestion.syntheticLabel === "SYNTHETIC" &&
        suggestion.authorityLabel === "ADVISORY_ONLY" &&
        suggestion.evidenceStatus === "NOT_EVIDENCE" &&
        suggestion.citationIds.every((citationId) => details.has(citationId))
      )).toBe(true);
    }
  });

  it("rejects arbitrary questions and caller-authored execution fields before orchestration", async () => {
    const { app, fixture } = await setup("Can we release?");
    const url = `/api/v1/missions/${fixture.assessment.missionId}/cited-explanations`;
    for (const payload of [
      { question: "Tell me anything" },
      { question: "Can we release?", providerMode: "LIVE" },
      { question: "Can we release?", readinessStatus: "READY" },
      {}
    ]) {
      const response = await app.inject({ method: "POST", url, payload });
      expect(response.statusCode, response.body).toBe(400);
      expect(response.body).not.toContain("LIVE");
      expect(response.body).not.toContain("READY");
    }
  });

  it("keeps the complete offline answer when an unknown advisory citation is rejected without retry", async () => {
    const execute = vi.fn(async (request: ProviderAdapterRequest) =>
      rawAdvisory(request, UNKNOWN_CITATION)
    );
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: {
        transportKind: "MOCK_VALIDATION",
        providerId: "controlled.mock",
        modelId: "schema-fixture-v1",
        execute
      }
    });
    const { app, fixture } = await setup("Can we release?", adapter);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${fixture.assessment.missionId}/cited-explanations`,
      payload: { question: "Can we release?" }
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      execution: {
        providerOutcome: "ADVISORY_REJECTED",
        failureCode: "PROVIDER_CITATION_INVALID",
        externalCallMade: false
      },
      offlineExplanation: {
        engine: { aiStatus: "AI_OFF", externalCallMade: false }
      }
    });
    expect(response.json().advisory).toBeUndefined();
    expect(response.body).not.toContain(UNKNOWN_CITATION);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("labels repeated mock transport failure as unavailable after one bounded retry", async () => {
    const execute = vi.fn(async () => {
      throw new Error("private transport detail");
    });
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: {
        transportKind: "MOCK_VALIDATION",
        providerId: "controlled.mock",
        modelId: "schema-fixture-v1",
        execute
      }
    });
    const { app, fixture } = await setup("What conflicts are open?", adapter);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${fixture.assessment.missionId}/cited-explanations`,
      payload: { question: "What conflicts are open?" }
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().execution).toMatchObject({
      providerOutcome: "ADVISORY_UNAVAILABLE",
      failureCode: "PROVIDER_TRANSPORT_FAILED",
      externalCallMade: false
    });
    expect(response.body).not.toContain("private transport detail");
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("accepts only a fully validated mock advisory and resolves its citation", async () => {
    const execute = vi.fn(async (request: ProviderAdapterRequest) =>
      rawAdvisory(request, request.allowedCitationIds[0] as EvidencePackCitationId)
    );
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: {
        transportKind: "MOCK_VALIDATION",
        providerId: "controlled.mock",
        modelId: "schema-fixture-v1",
        execute
      }
    });
    const { app, fixture } = await setup("What is impacted?", adapter);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${fixture.assessment.missionId}/cited-explanations`,
      payload: { question: "What is impacted?" }
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      execution: { providerOutcome: "ADVISORY_ACCEPTED" },
      advisory: {
        validationVersion: "provider-advisory-validation.v1",
        response: {
          answer: { text: "Controlled mock advisory summary." },
          providerMetadata: { executionKind: "MOCK_VALIDATION" }
        }
      }
    });
    expect(response.json().citationDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          citationId: response.json().advisory.response.citations[0]
        })
      ])
    );
  });

  it("fails closed when no assessment or an exact bound source is available", async () => {
    const { fixture } = await setup("Can we release?");
    const noAssessment = new CitedExplanationService({
      twins: {} as CitedExplanationTwinPort,
      evidence: {} as CitedExplanationEvidencePort,
      claims: {} as CitedExplanationClaimPort,
      assessments: { latest: async () => undefined },
      adapter: createProviderNeutralAdapter()
    });
    await expect(noAssessment.execute(
      fixture.assessment.projectId,
      fixture.assessment.missionId,
      "Can we release?",
      REQUEST_ID
    )).rejects.toMatchObject({
      code: "CITED_EXPLANATION_ASSESSMENT_UNAVAILABLE"
    });

    const sourceMissing = new CitedExplanationService({
      twins: { get: async () => fixture.twin },
      evidence: { getEvidenceSource: async () => { throw new Error("missing"); } },
      claims: {
        getClaim: async (_projectId, _missionId, claimId) => {
          const claim = fixture.claims.find((entry) => entry.claimId === claimId);
          if (claim === undefined) throw new Error("missing");
          return claim;
        },
        listSupersessions: async () => ({ items: [], nextCursor: null })
      },
      assessments: { latest: async () => fixture.assessment },
      adapter: createProviderNeutralAdapter()
    });
    await expect(sourceMissing.execute(
      fixture.assessment.projectId,
      fixture.assessment.missionId,
      "Can we release?",
      REQUEST_ID
    )).rejects.toMatchObject({ code: "CITED_EXPLANATION_INTEGRITY_INVALID" });
  });
});
