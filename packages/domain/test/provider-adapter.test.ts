import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROVIDER_ADAPTER_LIMITS,
  PROVIDER_ADAPTER_REQUEST_VERSION,
  PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
  PROVIDER_ADVISORY_RESPONSE_VERSION,
  ProviderAdapterError,
  createProviderNeutralAdapter,
  evidencePackTokenUpperBound,
  type MockProviderTransport,
  type ProviderAdapterExecution,
  type ProviderAdapterFailureCode,
  type ProviderAdapterRequest
} from "../src/index.js";
import { compileOfflineExplanationFixture } from "./support/offline-explanation-fixture.js";

const REQUEST_1 = "20000000-0000-4000-8000-000000000001";
const REQUEST_2 = "20000000-0000-4000-8000-000000000002";
const WRONG_REQUEST = "20000000-0000-4000-8000-000000000009";
const WRONG_DIGEST = `sha256:${"0".repeat(64)}`;
const UNKNOWN_CITATION = `cite:${"f".repeat(64)}`;

type ResponseRecord = Record<string, unknown>;

function mockTransport(
  handler: (
    request: ProviderAdapterRequest,
    signal: AbortSignal
  ) => Promise<unknown> | unknown,
  metadata: { readonly providerId?: string; readonly modelId?: string } = {}
): MockProviderTransport {
  return {
    transportKind: "MOCK_VALIDATION",
    providerId: metadata.providerId ?? "fixture-provider",
    modelId: metadata.modelId ?? "fixture-model-v1",
    async execute(request, signal) {
      return handler(request, signal);
    }
  };
}

function successfulResponse(
  request: ProviderAdapterRequest,
  values: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
  } = {}
): ResponseRecord {
  const assessmentCitation = request.allowedCitationIds[0];
  const supportingCitation = request.allowedCitationIds[1] ?? assessmentCitation;
  if (assessmentCitation === undefined || supportingCitation === undefined) {
    throw new Error("Expected fixture citations.");
  }
  const citations = request.allowedCitationIds.filter(
    (citationId) =>
      citationId === assessmentCitation || citationId === supportingCitation
  );
  const inputTokens = values.inputTokens ?? 100;
  const outputTokens = values.outputTokens ?? 80;
  return {
    responseVersion: PROVIDER_ADVISORY_RESPONSE_VERSION,
    requestId: request.requestId,
    providerRequestDigest: request.requestDigest,
    evidencePackDigest: request.evidencePackDigest,
    outputSchemaVersion: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
    answer: {
      text: "The cited pack requires human review; this advisory does not decide readiness.",
      citationIds: [assessmentCitation]
    },
    facts: [
      {
        text: "The pack includes attributed evidence for the question.",
        citationIds: [supportingCitation]
      }
    ],
    inferences: [],
    conflicts: [],
    gaps: [],
    nextActions: [],
    citations,
    providerMetadata: {
      providerId: "fixture-provider",
      modelId: "fixture-model-v1",
      responseId: "fixture-response-1",
      executionKind: "MOCK_VALIDATION"
    },
    usageMetadata: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      source: "PROVIDER_REPORTED"
    }
  };
}

function expectFallback(
  execution: ProviderAdapterExecution,
  code: ProviderAdapterFailureCode,
  attempts?: number
): void {
  expect(execution.status).toBe("OFFLINE_FALLBACK");
  expect(execution.failure).toEqual({ code, retryable: false });
  expect(execution.advisory).toBeUndefined();
  expect(execution.offlineExplanation.engine).toEqual({
    explanationType: "DETERMINISTIC_EXPLANATION",
    aiStatus: "AI_OFF",
    provider: "NONE",
    externalCallMade: false
  });
  expect(execution.execution.externalCallMade).toBe(false);
  if (attempts !== undefined) expect(execution.metrics.attempts).toBe(attempts);
}

describe("disabled provider-neutral adapter and mocked validation", () => {
  it("defaults disabled, makes no transport call and returns the complete offline answer", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CONFLICT");
    let calls = 0;
    const adapter = createProviderNeutralAdapter({
      transport: mockTransport(() => {
        calls += 1;
        throw new Error("must not run");
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });

    expectFallback(execution, "PROVIDER_DISABLED", 0);
    expect(calls).toBe(0);
    expect(execution.execution).toEqual({
      adapterMode: "DISABLED",
      transportKind: "NONE",
      externalCallMade: false
    });
    expect(execution.metrics.chargedSessionTokenUnits).toBe(0);
    expect(execution.metrics.budgetBefore).toEqual(execution.metrics.budgetAfter);
    expect(adapter.budget()).toEqual({
      limit: DEFAULT_PROVIDER_ADAPTER_LIMITS.sessionTokenBudget,
      consumed: 0,
      remaining: DEFAULT_PROVIDER_ADAPTER_LIMITS.sessionTokenBudget
    });
  });

  it("builds an exact bound request and accepts one strict cited mock response", async () => {
    const pack = await compileOfflineExplanationFixture(
      "What conflicts are open?",
      "CONFLICT"
    );
    let observedRequest: ProviderAdapterRequest | undefined;
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        observedRequest = request;
        return successfulResponse(request);
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });

    expect(execution.status).toBe("MOCK_ADVISORY_ACCEPTED");
    expect(execution.failure).toBeUndefined();
    expect(execution.execution).toEqual({
      adapterMode: "MOCK_VALIDATION",
      transportKind: "MOCK_VALIDATION",
      externalCallMade: false
    });
    expect(execution.metrics).toMatchObject({ attempts: 1, retries: 0 });
    expect(execution.advisory?.response.providerMetadata).toEqual({
      providerId: "fixture-provider",
      modelId: "fixture-model-v1",
      responseId: "fixture-response-1",
      executionKind: "MOCK_VALIDATION"
    });
    expect(execution.advisory?.responseDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(execution.offlineExplanation.engine.aiStatus).toBe("AI_OFF");
    expect(observedRequest).toBe(execution.request);
    expect(execution.request).toMatchObject({
      requestVersion: PROVIDER_ADAPTER_REQUEST_VERSION,
      requestId: REQUEST_1,
      projectId: pack.projectId,
      missionId: pack.missionId,
      question: pack.question,
      questionDigest: pack.questionDigest,
      evidencePackDigest: pack.packDigest,
      outputSchemaVersion: PROVIDER_ADVISORY_OUTPUT_SCHEMA_VERSION,
      limits: DEFAULT_PROVIDER_ADAPTER_LIMITS
    });
    expect(execution.request.redactedEvidencePack).toBe(pack);
    expect(execution.request.allowedCitationIds).toEqual(pack.allowedCitationIds);
    expect(execution.request.outputSchema).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        properties: expect.objectContaining({
          providerMetadata: expect.objectContaining({
            additionalProperties: false,
            properties: expect.objectContaining({
              providerId: expect.any(Object),
              modelId: expect.any(Object),
              responseId: expect.any(Object),
              executionKind: { const: "MOCK_VALIDATION" }
            })
          }),
          usageMetadata: expect.objectContaining({
            additionalProperties: false,
            properties: expect.objectContaining({
              inputTokens: expect.any(Object),
              outputTokens: expect.any(Object),
              totalTokens: expect.any(Object),
              source: { const: "PROVIDER_REPORTED" }
            })
          })
        })
      })
    );
    expect(execution.request.requestDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(execution.request)).toBe(true);
    expect(Object.isFrozen(execution.advisory?.response)).toBe(true);
    expect(JSON.stringify(execution)).not.toContain('"readinessStatus"');
    expect(JSON.stringify(execution)).not.toContain('"externalCallMade":true');
  });

  it.each<{
    name: string;
    expected: ProviderAdapterFailureCode;
    mutate: (response: ResponseRecord) => void;
  }>([
    {
      name: "wrong request UUID",
      expected: "PROVIDER_REQUEST_ID_MISMATCH",
      mutate: (response) => {
        response.requestId = WRONG_REQUEST;
      }
    },
    {
      name: "wrong request digest",
      expected: "PROVIDER_REQUEST_ID_MISMATCH",
      mutate: (response) => {
        response.providerRequestDigest = WRONG_DIGEST;
      }
    },
    {
      name: "wrong pack digest",
      expected: "PROVIDER_PACK_DIGEST_MISMATCH",
      mutate: (response) => {
        response.evidencePackDigest = WRONG_DIGEST;
      }
    },
    {
      name: "wrong output schema",
      expected: "PROVIDER_OUTPUT_SCHEMA_MISMATCH",
      mutate: (response) => {
        response.outputSchemaVersion = "provider-advisory-output-schema.v0";
      }
    },
    {
      name: "unknown ordinary field",
      expected: "PROVIDER_RESPONSE_SCHEMA_INVALID",
      mutate: (response) => {
        response.unexpected = true;
      }
    },
    {
      name: "readiness authority field",
      expected: "PROVIDER_READINESS_AUTHORITY_INVALID",
      mutate: (response) => {
        response.readinessStatus = "READY";
      }
    }
  ])("rejects $name without retrying", async ({ expected, mutate }) => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CONFLICT");
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        const response = successfulResponse(request);
        mutate(response);
        return response;
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    expectFallback(execution, expected, 1);
    expect(execution.metrics.retries).toBe(0);
  });

  it("rejects an unknown citation and a top-level citation union mismatch", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CONFLICT");
    let caseIndex = 0;
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        const response = successfulResponse(request);
        if (caseIndex++ === 0) {
          response.answer = {
            ...(response.answer as Record<string, unknown>),
            citationIds: [UNKNOWN_CITATION]
          };
        } else {
          response.citations = [request.allowedCitationIds[0]];
        }
        return response;
      })
    });

    const unknown = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    const unionMismatch = await adapter.execute({ requestId: REQUEST_2, evidencePack: pack });
    expectFallback(unknown, "PROVIDER_CITATION_INVALID", 1);
    expectFallback(unionMismatch, "PROVIDER_CITATION_INVALID", 1);
  });

  it("rejects malformed usage, usage overflow and unsafe provider identity", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    const mutations: Array<(response: ResponseRecord) => void> = [
      (response) => {
        response.usageMetadata = {
          inputTokens: 100,
          outputTokens: 80,
          totalTokens: 999,
          source: "PROVIDER_REPORTED"
        };
      },
      (response) => {
        response.usageMetadata = {
          inputTokens: 100,
          outputTokens: DEFAULT_PROVIDER_ADAPTER_LIMITS.maxOutputTokens + 1,
          totalTokens: 100 + DEFAULT_PROVIDER_ADAPTER_LIMITS.maxOutputTokens + 1,
          source: "PROVIDER_REPORTED"
        };
      },
      (response) => {
        response.providerMetadata = {
          providerId: "fixture-provider SECRET=value",
          modelId: "fixture-model-v1",
          responseId: "fixture-response-1",
          executionKind: "MOCK_VALIDATION"
        };
      }
    ];
    const expected: ProviderAdapterFailureCode[] = [
      "PROVIDER_RESPONSE_SCHEMA_INVALID",
      "PROVIDER_USAGE_LIMIT_EXCEEDED",
      "PROVIDER_RESPONSE_SCHEMA_INVALID"
    ];
    for (let index = 0; index < mutations.length; index += 1) {
      const mutate = mutations[index];
      const expectedCode = expected[index];
      if (mutate === undefined || expectedCode === undefined) throw new Error("Fixture absent.");
      const adapter = createProviderNeutralAdapter({
        mode: "MOCK_VALIDATION",
        transport: mockTransport((request) => {
          const response = successfulResponse(request);
          mutate(response);
          return response;
        })
      });
      const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
      expectFallback(execution, expectedCode, 1);
    }
  });

  it.each([
    "A generated token sk-proj-ABCDEFGHIJKLMNOPQRSTUV must never be rendered.",
    "The private result is stored at C:\\Users\\fixture\\result.json."
  ])("rejects unsafe response content without rendering or retrying", async (text) => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        const response = successfulResponse(request);
        response.answer = {
          ...(response.answer as Record<string, unknown>),
          text
        };
        return response;
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    expectFallback(execution, "PROVIDER_RESPONSE_CONTENT_UNSAFE", 1);
    expect(JSON.stringify(execution)).not.toContain(text);
  });

  it("rejects an oversized response before parsing its statement structure", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        const response = successfulResponse(request);
        response.answer = {
          text: "x".repeat(20_000),
          citationIds: [request.allowedCitationIds[0]]
        };
        return response;
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    expectFallback(execution, "PROVIDER_RESPONSE_LIMIT_EXCEEDED", 1);
  });

  it("retries one transport failure and accepts the second valid response", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    let calls = 0;
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        calls += 1;
        if (calls === 1) throw new Error("transient fixture failure");
        return successfulResponse(request);
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    expect(execution.status).toBe("MOCK_ADVISORY_ACCEPTED");
    expect(execution.metrics).toMatchObject({ attempts: 2, retries: 1 });
    expect(calls).toBe(2);
  });

  it("stops after the one permitted retry when transport keeps failing", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    let calls = 0;
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport(() => {
        calls += 1;
        throw new Error("fixture failure must not escape");
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    expectFallback(execution, "PROVIDER_TRANSPORT_FAILED", 2);
    expect(execution.metrics.retries).toBe(1);
    expect(calls).toBe(2);
  });

  it("aborts each timed-out attempt and falls back after one retry", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    let calls = 0;
    let aborts = 0;
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      limits: { timeoutMs: 5 },
      transport: mockTransport((_request, signal) => {
        calls += 1;
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              aborts += 1;
              reject(new Error("mock aborted"));
            },
            { once: true }
          );
        });
      })
    });

    const execution = await adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    expectFallback(execution, "PROVIDER_TIMEOUT", 2);
    expect(execution.metrics.retries).toBe(1);
    expect(calls).toBe(2);
    expect(aborts).toBe(2);
  });

  it("enforces one concurrent request without calling the transport twice", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    let release: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let calls = 0;
    const adapter = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      transport: mockTransport((request) => {
        calls += 1;
        markStarted?.();
        return new Promise((resolve) => {
          release = () => resolve(successfulResponse(request));
        });
      })
    });

    const firstPromise = adapter.execute({ requestId: REQUEST_1, evidencePack: pack });
    await started;
    const second = await adapter.execute({ requestId: REQUEST_2, evidencePack: pack });
    expectFallback(second, "PROVIDER_CONCURRENCY_LIMIT", 0);
    expect(calls).toBe(1);
    release?.();
    const first = await firstPromise;
    expect(first.status).toBe("MOCK_ADVISORY_ACCEPTED");
  });

  it("enforces input and cumulative session budgets before transport", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    const inputUnits = evidencePackTokenUpperBound(pack);
    let inputLimitCalls = 0;
    const inputLimited = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      limits: { maxInputTokens: inputUnits - 1 },
      transport: mockTransport(() => {
        inputLimitCalls += 1;
        throw new Error("must not run");
      })
    });
    const inputFailure = await inputLimited.execute({
      requestId: REQUEST_1,
      evidencePack: pack
    });
    expectFallback(inputFailure, "PROVIDER_INPUT_LIMIT_EXCEEDED", 0);
    expect(inputLimitCalls).toBe(0);

    const maxOutputTokens = 100;
    const oneReservation = inputUnits + maxOutputTokens;
    let budgetCalls = 0;
    const budgetLimited = createProviderNeutralAdapter({
      mode: "MOCK_VALIDATION",
      limits: {
        maxOutputTokens,
        sessionTokenBudget: oneReservation
      },
      transport: mockTransport((request) => {
        budgetCalls += 1;
        return successfulResponse(request, { outputTokens: 80 });
      })
    });
    const accepted = await budgetLimited.execute({
      requestId: REQUEST_1,
      evidencePack: pack
    });
    const budgetFailure = await budgetLimited.execute({
      requestId: REQUEST_2,
      evidencePack: pack
    });
    expect(accepted.status).toBe("MOCK_ADVISORY_ACCEPTED");
    expectFallback(budgetFailure, "PROVIDER_SESSION_BUDGET_EXCEEDED", 0);
    expect(budgetCalls).toBe(1);
    expect(budgetLimited.budget()).toEqual({
      limit: oneReservation,
      consumed: oneReservation,
      remaining: 0
    });
  });

  it("rejects unsafe policy construction and invalid request identity", async () => {
    expect(() =>
      createProviderNeutralAdapter({ mode: "MOCK_VALIDATION" })
    ).toThrowError(ProviderAdapterError);
    expect(() =>
      createProviderNeutralAdapter({
        limits: { timeoutMs: DEFAULT_PROVIDER_ADAPTER_LIMITS.timeoutMs + 1 }
      })
    ).toThrowError(ProviderAdapterError);
    expect(() =>
      createProviderNeutralAdapter({
        mode: "MOCK_VALIDATION",
        transport: mockTransport(() => ({}), { providerId: "unsafe secret=value" })
      })
    ).toThrowError(ProviderAdapterError);

    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    const disabled = createProviderNeutralAdapter();
    await expect(
      disabled.execute({ requestId: "not-a-request-id", evidencePack: pack })
    ).rejects.toMatchObject({ code: "PROVIDER_ADAPTER_INPUT_INVALID" });
  });
});
