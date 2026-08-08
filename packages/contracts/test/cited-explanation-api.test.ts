import { describe, expect, it } from "vitest";

import {
  CITED_EXPLANATION_API_VERSION,
  CITED_EXPLANATION_DISCLOSURE_VERSION,
  CITED_EXPLANATION_PROVIDER_OUTCOMES,
  CITED_EXPLANATION_QUESTIONS
} from "../src/index.js";

describe("cited explanation API contract", () => {
  it("keeps the public question surface closed to the six approved prompts", () => {
    expect(CITED_EXPLANATION_API_VERSION).toBe("v2");
    expect(CITED_EXPLANATION_DISCLOSURE_VERSION).toBe(
      "cited-explanation-disclosure.v1"
    );
    expect(CITED_EXPLANATION_QUESTIONS).toEqual([
      "Can we release?",
      "What conflicts are open?",
      "What is impacted?",
      "What validation is missing?",
      "What should happen next?",
      "What changed after correction?"
    ]);
    expect(new Set(CITED_EXPLANATION_QUESTIONS).size).toBe(6);
    expect(Object.isFrozen(CITED_EXPLANATION_QUESTIONS)).toBe(true);
  });

  it("keeps provider outcomes advisory and explicitly bounded", () => {
    expect(CITED_EXPLANATION_PROVIDER_OUTCOMES).toEqual([
      "DISABLED",
      "ADVISORY_ACCEPTED",
      "ADVISORY_UNAVAILABLE",
      "ADVISORY_REJECTED"
    ]);
    expect(new Set(CITED_EXPLANATION_PROVIDER_OUTCOMES).size).toBe(4);
    expect(Object.isFrozen(CITED_EXPLANATION_PROVIDER_OUTCOMES)).toBe(true);
    expect(CITED_EXPLANATION_PROVIDER_OUTCOMES).not.toContain("READY");
    expect(CITED_EXPLANATION_PROVIDER_OUTCOMES).not.toContain("APPROVED");
  });
});
