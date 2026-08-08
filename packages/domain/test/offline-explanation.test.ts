import { describe, expect, it } from "vitest";

import {
  OFFLINE_EXPLANATION_AI_STATUS,
  OFFLINE_EXPLANATION_TYPE,
  OfflineExplanationError,
  assertOfflineExplanationInvariant,
  offlineExplanationSerializedByteCount,
  renderOfflineExplanation,
  resolveEvidencePackCitation,
  type EvidencePack,
  type OfflineExplanation,
  type OfflineExplanationErrorCode,
  type OfflineExplanationStatement
} from "../src/index.js";
import {
  compileOfflineExplanationFixture,
  type OfflineExplanationScenario
} from "./support/offline-explanation-fixture.js";

async function expectCode(
  operation: () => Promise<unknown>,
  code: OfflineExplanationErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected offline-explanation operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(OfflineExplanationError);
    if (!(error instanceof OfflineExplanationError)) throw error;
    expect(error.code).toBe(code);
  }
}

function statements(
  explanation: OfflineExplanation
): readonly OfflineExplanationStatement[] {
  return [
    explanation.answer,
    ...explanation.facts,
    ...explanation.inferences,
    ...explanation.conflicts,
    ...explanation.gaps,
    ...explanation.nextActions
  ];
}

async function expectCitationsResolve(
  pack: EvidencePack,
  explanation: OfflineExplanation
): Promise<void> {
  const allowed = new Set(pack.allowedCitationIds);
  const cited = new Set(
    explanation.citations.map((citation) => citation.citationId)
  );
  for (const value of statements(explanation)) {
    expect(value.citationIds.length).toBeGreaterThan(0);
    expect(value.statementId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    for (const citationId of value.citationIds) {
      expect(allowed.has(citationId)).toBe(true);
      expect(cited.has(citationId)).toBe(true);
      await expect(resolveEvidencePackCitation(pack, citationId)).resolves.toEqual(
        expect.objectContaining({ citation: expect.objectContaining({ citationId }) })
      );
    }
  }
  expect(explanation.citations.every((citation) => allowed.has(citation.citationId))).toBe(
    true
  );
}

describe("deterministic AI-off explanation", () => {
  it("renders the release golden structure without claiming release authority", async () => {
    const pack = await compileOfflineExplanationFixture(
      "Can we release?",
      "CONFLICT"
    );
    const explanation = await renderOfflineExplanation(pack);

    expect(explanation.engine).toEqual({
      explanationType: OFFLINE_EXPLANATION_TYPE,
      aiStatus: OFFLINE_EXPLANATION_AI_STATUS,
      provider: "NONE",
      externalCallMade: false
    });
    expect(explanation.questionKind).toBe("RELEASE");
    expect(explanation.answer).toMatchObject({
      category: "ANSWER",
      text: "This deterministic explanation does not decide release readiness. The evidence pack contains 1 open conflict or ambiguity and 0 open gaps requiring review."
    });
    expect(explanation.facts.map((value) => value.text)).toEqual([
      "Evidence states: Release is approved for the global region."
    ]);
    expect(explanation.inferences.map((value) => value.text)).toEqual([
      "Recorded inference: Release is blocked for the global region."
    ]);
    expect(explanation.conflicts.map((value) => value.text)).toEqual([
      "Open conflict: two active applicable claims have incompatible values."
    ]);
    expect(explanation.gaps).toEqual([]);
    expect(explanation.nextActions.map((value) => value.text)).toEqual([
      "Review the cited active claims and record an explicit correction when justified; this renderer does not choose a winner."
    ]);
    expect(explanation.limitations).toEqual([
      "This deterministic explanation summarizes the cited evidence pack; it does not determine release readiness.",
      "Evidence labels and structurally valid citations do not establish truth, completeness or approval."
    ]);
    expect(explanation.explanationDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(explanation)).toBe(true);
    expect(offlineExplanationSerializedByteCount(explanation)).toBeGreaterThan(0);
    await expectCitationsResolve(pack, explanation);
    await expect(assertOfflineExplanationInvariant(explanation, pack)).resolves.toBeUndefined();
  });

  it("is byte-for-byte deterministic for the same canonical pack", async () => {
    const pack = await compileOfflineExplanationFixture(
      "What conflicts are open?",
      "CONFLICT"
    );
    const first = await renderOfflineExplanation(pack);
    const second = await renderOfflineExplanation(pack);

    expect(second).toEqual(first);
    expect(second.explanationDigest).toBe(first.explanationDigest);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it.each<{
    question: string;
    scenario: OfflineExplanationScenario;
    kind: OfflineExplanation["questionKind"];
    answer: string;
  }>([
    {
      question: "What conflicts are open?",
      scenario: "CONFLICT",
      kind: "CONFLICTS",
      answer: "The evidence pack contains 1 open conflict or ambiguity."
    },
    {
      question: "What is impacted?",
      scenario: "IMPACT",
      kind: "IMPACT",
      answer: "The evidence pack contains 1 cited impact path and 0 open impact gaps."
    },
    {
      question: "What validation is missing?",
      scenario: "MISSING_VALIDATION",
      kind: "MISSING_VALIDATION",
      answer: "The evidence pack contains 2 open validation gaps."
    },
    {
      question: "What should happen next?",
      scenario: "MISSING_VALIDATION",
      kind: "NEXT_ACTIONS",
      answer: "The deterministic renderer produced 2 cited next actions from open canonical findings."
    },
    {
      question: "What changed after correction?",
      scenario: "CORRECTION",
      kind: "POST_CORRECTION",
      answer: "The evidence pack records 1 explicit correction and 0 stale predecessor findings."
    }
  ])("answers the fixed $kind follow-up from canonical structures", async (value) => {
    const pack = await compileOfflineExplanationFixture(
      value.question,
      value.scenario
    );
    const explanation = await renderOfflineExplanation(pack);

    expect(explanation.questionKind).toBe(value.kind);
    expect(explanation.answer.text).toBe(value.answer);
    await expectCitationsResolve(pack, explanation);
    await expect(assertOfflineExplanationInvariant(explanation, pack)).resolves.toBeUndefined();
    if (value.kind === "POST_CORRECTION") {
      expect(explanation.facts.map((statementValue) => statementValue.text)).toEqual([
        "Historical superseded evidence stated: Release was blocked for the global region.",
        "Evidence states: Release is approved for the global region.",
        expect.stringContaining("An explicit correction supersedes claim")
      ]);
    }
  });

  it("returns a conservative release answer for a pack with no open findings", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CLEAR");
    const explanation = await renderOfflineExplanation(pack);

    expect(explanation.answer.text).toBe(
      "This deterministic explanation does not decide release readiness. The evidence pack contains 0 open conflicts or ambiguities and 0 open gaps requiring review."
    );
    expect(explanation.conflicts).toEqual([]);
    expect(explanation.gaps).toEqual([]);
    expect(explanation.nextActions).toEqual([]);
    expect(JSON.stringify(explanation)).not.toContain('"readinessStatus"');
    expect(JSON.stringify(explanation)).not.toContain('"READY"');
    expect(JSON.stringify(explanation)).not.toContain('"BLOCKED"');
  });

  it("normalizes only supported fixed questions and fails closed otherwise", async () => {
    const normalizedPack = await compileOfflineExplanationFixture(
      "  CAN   WE RELEASE?  ",
      "CLEAR"
    );
    const normalized = await renderOfflineExplanation(normalizedPack);
    expect(normalized.questionKind).toBe("RELEASE");

    const unsupportedPack = await compileOfflineExplanationFixture(
      "Should I approve production now?",
      "CLEAR"
    );
    await expectCode(
      () => renderOfflineExplanation(unsupportedPack),
      "OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED"
    );
  });

  it("rejects any answer or citation tampering against the bound pack", async () => {
    const pack = await compileOfflineExplanationFixture(
      "What conflicts are open?",
      "CONFLICT"
    );
    const explanation = await renderOfflineExplanation(pack);
    const inventedAnswer = {
      ...explanation,
      answer: { ...explanation.answer, text: "Release is approved." }
    } as OfflineExplanation;
    await expectCode(
      () => assertOfflineExplanationInvariant(inventedAnswer, pack),
      "OFFLINE_EXPLANATION_INTEGRITY_INVALID"
    );

    const firstCitation = explanation.answer.citationIds[0];
    if (firstCitation === undefined) throw new Error("Expected answer citation.");
    const forgedCitation = `${firstCitation.slice(0, -1)}${firstCitation.endsWith("0") ? "1" : "0"}`;
    const inventedCitation = {
      ...explanation,
      answer: {
        ...explanation.answer,
        citationIds: [forgedCitation]
      }
    } as unknown as OfflineExplanation;
    await expectCode(
      () => assertOfflineExplanationInvariant(inventedCitation, pack),
      "OFFLINE_EXPLANATION_INTEGRITY_INVALID"
    );
  });

  it("exposes only the non-authoritative fixed contract", async () => {
    const pack = await compileOfflineExplanationFixture("Can we release?", "CONFLICT");
    const explanation = await renderOfflineExplanation(pack);

    expect(Object.keys(explanation)).toEqual([
      "version",
      "digestVersion",
      "rendererPolicyVersion",
      "rendererPolicyDigest",
      "projectId",
      "missionId",
      "evidencePackDigest",
      "questionDigest",
      "question",
      "questionKind",
      "engine",
      "answer",
      "facts",
      "inferences",
      "conflicts",
      "gaps",
      "nextActions",
      "citations",
      "limitations",
      "explanationDigest"
    ]);
    expect(explanation.engine.explanationType).toBe("DETERMINISTIC_EXPLANATION");
    expect(explanation.engine.aiStatus).toBe("AI_OFF");
    expect(explanation.engine.externalCallMade).toBe(false);
    expect(explanation.engine.provider).toBe("NONE");
  });
});
