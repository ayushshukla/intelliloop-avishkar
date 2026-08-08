import { describe, expect, it } from "vitest";

import {
  OPENAI_EVALUATION_DECISIONS,
  assertOpenAiEvaluationCheckpointInvariant,
  createOfflineOpenAiEvaluationCheckpoint,
  type CreateOfflineOpenAiEvaluationCheckpointInput,
  type OpenAiEvaluationCheckpoint
} from "../src/index.js";

const QUESTIONS = Object.freeze([
  "Can we release?",
  "What conflicts are open?",
  "What is impacted?",
  "What validation is missing?",
  "What should happen next?",
  "What changed after correction?"
]);

function validInput(): CreateOfflineOpenAiEvaluationCheckpointInput {
  return {
    g3Status: "PASS",
    reconciliationEvidenceStatus: "PASS",
    citationEvidenceStatus: "PASS",
    privacyEvidenceStatus: "PASS",
    fixedQuestions: QUESTIONS,
    expectedQuestionCount: 6,
    passedQuestionCount: 6,
    exactRedactedPackPreviewAvailable: true,
    transferStatus: "NOT_SENT",
    maximumInputTokenUpperBound: 11_683,
    productionProviderOutcome: "DISABLED"
  };
}

describe("personal OpenAI evaluation checkpoint", () => {
  it("records the exact offline decision without inventing provider metrics", async () => {
    const checkpoint = await createOfflineOpenAiEvaluationCheckpoint(validInput());

    expect(checkpoint).toMatchObject({
      version: "openai-evaluation-checkpoint.v1",
      story: "IL-6.5",
      gate: "G4_OPENAI_COURSE_CORRECTION",
      mode: "OFFLINE_DECISION",
      runStatus: "NOT_RUN_NOT_AUTHORIZED",
      decision: "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
      credentialBoundary: {
        explicitUserEnablement: false,
        runtimeCredentialInjected: false,
        runtimeCredentialRead: false,
        credentialPersisted: false,
        credentialLogged: false
      },
      providerMetrics: {
        grounding: "NOT_MEASURED",
        citationValidity: "NOT_MEASURED",
        usefulness: "NOT_MEASURED",
        latencyMs: null,
        inputTokens: null,
        outputTokens: null,
        differenceFromDeterministicExplanation: "NOT_MEASURED"
      },
      authority: {
        externalCallMade: false,
        canonicalStateChanged: false,
        readinessAuthority: false
      }
    });
    expect(checkpoint.entryChecklist).toHaveLength(10);
    await expect(
      assertOpenAiEvaluationCheckpointInvariant(checkpoint)
    ).resolves.toBeUndefined();
  });

  it("is byte-identity stable for the same verified evidence baseline", async () => {
    const first = await createOfflineOpenAiEvaluationCheckpoint(validInput());
    const second = await createOfflineOpenAiEvaluationCheckpoint({
      ...validInput(),
      fixedQuestions: [...QUESTIONS]
    });

    expect(second).toEqual(first);
    expect(second.checkpointDigest).toBe(first.checkpointDigest);
  });

  it("exposes only the three frozen course-correction decisions", () => {
    expect(OPENAI_EVALUATION_DECISIONS).toEqual([
      "USE_LIVE_PROVIDER_IN_FINALE",
      "CORRECT_PROMPT_OR_EVIDENCE_PACK_AND_RETEST",
      "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE"
    ]);
  });

  it.each([
    ["wrong question order", { fixedQuestions: [...QUESTIONS].reverse() }],
    ["incomplete fixed set", { passedQuestionCount: 5 }],
    ["missing privacy proof", { privacyEvidenceStatus: "FAIL" }],
    ["sent transfer", { transferStatus: "SENT" }],
    ["pack overflow", { maximumInputTokenUpperBound: 12_001 }],
    ["provider enabled", { productionProviderOutcome: "LIVE" }]
  ])("rejects %s before recording the offline checkpoint", async (_label, change) => {
    await expect(
      createOfflineOpenAiEvaluationCheckpoint({
        ...validInput(),
        ...change
      } as CreateOfflineOpenAiEvaluationCheckpointInput)
    ).rejects.toMatchObject({
      code: "OPENAI_EVALUATION_CHECKPOINT_ENTRY_NOT_MET"
    });
  });

  it("rejects a changed decision or digest as an integrity failure", async () => {
    const checkpoint = await createOfflineOpenAiEvaluationCheckpoint(validInput());
    const changed = {
      ...checkpoint,
      decision: "USE_LIVE_PROVIDER_IN_FINALE"
    } as unknown as OpenAiEvaluationCheckpoint;

    await expect(
      assertOpenAiEvaluationCheckpointInvariant(changed)
    ).rejects.toMatchObject({
      code: "OPENAI_EVALUATION_CHECKPOINT_INTEGRITY_INVALID"
    });
  });
});
