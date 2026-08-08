import { describe, expect, it } from "vitest";

import {
  SyntheticEdgeCaseError,
  assertSyntheticEdgeCaseSuggestionsInvariant,
  createSyntheticEdgeCaseSuggestions,
  resolveEvidencePackCitation,
  type SyntheticEdgeCaseSet
} from "../src/index.js";
import {
  createOfflineExplanationFixture,
  type OfflineExplanationScenario
} from "./support/offline-explanation-fixture.js";

const cases = [
  {
    question: "What conflicts are open?",
    scenario: "CONFLICT",
    expectedKind: "CONFLICT_BOUNDARY"
  },
  {
    question: "What validation is missing?",
    scenario: "MISSING_VALIDATION",
    expectedKind: "MISSING_VALIDATION_PAIR"
  },
  {
    question: "What is impacted?",
    scenario: "IMPACT",
    expectedKind: "IMPACT_PATH_INTERRUPTION"
  }
] as const;

describe("synthetic edge-case suggestions", () => {
  it.each(cases)(
    "generates cited deterministic $expectedKind suggestions",
    async ({ question, scenario, expectedKind }) => {
      const fixture = await createOfflineExplanationFixture(question, scenario);
      const result = await createSyntheticEdgeCaseSuggestions(fixture.pack);

      expect(result.suggestions.some((entry) => entry.kind === expectedKind)).toBe(
        true
      );
      expect(result).toMatchObject({
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
      });
      for (const suggestion of result.suggestions) {
        expect(suggestion).toMatchObject({
          syntheticLabel: "SYNTHETIC",
          authorityLabel: "ADVISORY_ONLY",
          evidenceStatus: "NOT_EVIDENCE"
        });
        for (const citationId of suggestion.citationIds) {
          await expect(
            resolveEvidencePackCitation(fixture.pack, citationId)
          ).resolves.toBeDefined();
        }
      }
      await expect(
        assertSyntheticEdgeCaseSuggestionsInvariant(result, fixture.pack)
      ).resolves.toBeUndefined();
    }
  );

  it("is byte-stable for the same verified pack", async () => {
    const fixture = await createOfflineExplanationFixture(
      "What conflicts are open?",
      "CONFLICT"
    );
    const first = await createSyntheticEdgeCaseSuggestions(fixture.pack);
    const second = await createSyntheticEdgeCaseSuggestions(fixture.pack);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.setDigest).toBe(first.setDigest);
  });

  it("returns an honest empty advisory set when the selected pack has no finding or path", async () => {
    const fixture = await createOfflineExplanationFixture(
      "Can we release?",
      "CLEAR"
    );
    const result = await createSyntheticEdgeCaseSuggestions(fixture.pack);
    expect(result.suggestions).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.limitations.join(" ")).toContain("not observed behavior");
  });

  it("rejects changed labels, authority, citations and digests", async () => {
    const fixture = await createOfflineExplanationFixture(
      "What conflicts are open?",
      "CONFLICT"
    );
    const original = await createSyntheticEdgeCaseSuggestions(fixture.pack);
    const mutations: SyntheticEdgeCaseSet[] = [];

    const label = structuredClone(original) as unknown as {
      suggestions: Array<{ authorityLabel: string }>;
    };
    if (label.suggestions[0] === undefined) throw new Error("fixture suggestion absent");
    label.suggestions[0].authorityLabel = "AUTHORITATIVE";
    mutations.push(label as unknown as SyntheticEdgeCaseSet);

    const authority = structuredClone(original) as unknown as {
      authority: { readinessAuthority: boolean };
    };
    authority.authority.readinessAuthority = true;
    mutations.push(authority as unknown as SyntheticEdgeCaseSet);

    const citation = structuredClone(original) as unknown as {
      suggestions: Array<{ citationIds: string[] }>;
    };
    if (citation.suggestions[0] === undefined) throw new Error("fixture suggestion absent");
    citation.suggestions[0].citationIds = [`cite:${"f".repeat(64)}`];
    mutations.push(citation as unknown as SyntheticEdgeCaseSet);

    const digest = structuredClone(original) as unknown as { setDigest: string };
    digest.setDigest = `sha256:${"f".repeat(64)}`;
    mutations.push(digest as unknown as SyntheticEdgeCaseSet);

    for (const changed of mutations) {
      await expect(
        assertSyntheticEdgeCaseSuggestionsInvariant(changed, fixture.pack)
      ).rejects.toBeInstanceOf(SyntheticEdgeCaseError);
    }
  });

  it.each([
    "CONFLICT",
    "MISSING_VALIDATION",
    "IMPACT",
    "CORRECTION"
  ] as const)("never creates canonical authority for %s", async (scenario) => {
    const question = scenario === "CORRECTION"
      ? "What changed after correction?"
      : "What should happen next?";
    const fixture = await createOfflineExplanationFixture(
      question,
      scenario as OfflineExplanationScenario
    );
    const before = JSON.stringify(fixture.assessment);
    const result = await createSyntheticEdgeCaseSuggestions(fixture.pack);
    expect(JSON.stringify(fixture.assessment)).toBe(before);
    expect(result.authority).toEqual({
      canonicalStateChanged: false,
      findingMutationAvailable: false,
      readinessAuthority: false,
      releasePassportAuthority: false
    });
    expect("readiness" in result).toBe(false);
  });
});
