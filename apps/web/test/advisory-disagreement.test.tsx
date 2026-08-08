import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CitedExplanationResponse } from "@intelliloop/contracts";

import { AdvisoryDisagreementLab } from "../src/AdvisoryDisagreementLab";
import {
  AdvisoryImportError,
  compareImportedAdvisoryOutputs,
  parseImportedAdvisoryOutputs
} from "../src/advisory-disagreement";
import { parseWebFeatureFlags, WEB_FEATURE_FLAGS } from "../src/feature-flags";

const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const QUESTION_DIGEST = `sha256:${"a".repeat(64)}`;
const PACK_DIGEST = `sha256:${"b".repeat(64)}`;
const CITATION_A = `cite:${"c".repeat(64)}`;
const CITATION_B = `cite:${"d".repeat(64)}`;

function output(
  suffix: string,
  recommendations: readonly { text: string; citationIds: readonly string[] }[]
): unknown {
  return {
    importVersion: "imported-advisory-output.v1",
    attribution: {
      agentLabel: `Review agent ${suffix}`,
      providerId: "imported-provider",
      modelId: `model-${suffix}`,
      outputId: `output-${suffix}`
    },
    binding: {
      missionId: MISSION_ID,
      questionDigest: QUESTION_DIGEST,
      evidencePackDigest: PACK_DIGEST
    },
    authority: "ADVISORY_ONLY",
    recommendations
  };
}

const scope = {
  missionId: MISSION_ID,
  questionDigest: QUESTION_DIGEST,
  evidencePackDigest: PACK_DIGEST,
  allowedCitationIds: new Set([CITATION_A, CITATION_B])
};

describe("Advisory-output Disagreement Lab", () => {
  it("compares exact alignment, citation variance and output-only text without mutation", () => {
    const input = [
      output("a", [
        { text: "Re-run validation.", citationIds: [CITATION_A] },
        { text: "Inspect the boundary.", citationIds: [CITATION_A] },
        { text: "Ask the technical lead.", citationIds: [CITATION_B] }
      ]),
      output("b", [
        { text: "  re-run   validation. ", citationIds: [CITATION_A] },
        { text: "Inspect the boundary.", citationIds: [CITATION_B] },
        { text: "Add an integration check.", citationIds: [CITATION_B] }
      ])
    ];
    const before = structuredClone(input);

    const parsed = parseImportedAdvisoryOutputs(JSON.stringify(input), scope);
    const comparison = compareImportedAdvisoryOutputs(parsed);

    expect(comparison).toMatchObject({
      version: "advisory-disagreement.v1",
      outputCount: 2,
      alignedCount: 1,
      citationVarianceCount: 1,
      outputOnlyCount: 2,
      authority: {
        advisoryOnly: true,
        semanticContradictionInferred: false,
        canonicalStateChanged: false,
        readinessAuthority: false,
        liveOrchestration: false,
        externalCallMade: false
      }
    });
    expect(input).toEqual(before);
  });

  it("rejects cross-scope, unknown-citation and release-authority shaped imports", () => {
    const valid = output("a", [
      { text: "Review cited evidence.", citationIds: [CITATION_A] }
    ]) as Record<string, unknown>;
    const peer = output("b", [
      { text: "Re-run validation.", citationIds: [CITATION_B] }
    ]);

    expect(() =>
      parseImportedAdvisoryOutputs(
        JSON.stringify([{ ...valid, binding: { ...(valid.binding as object), missionId: "00000000-0000-4000-8000-000000000099" } }, peer]),
        scope
      )
    ).toThrow(AdvisoryImportError);
    expect(() =>
      parseImportedAdvisoryOutputs(
        JSON.stringify([output("a", [{ text: "Review.", citationIds: [`cite:${"e".repeat(64)}`] }]), peer]),
        scope
      )
    ).toThrow(/allowlisted citations/);
    expect(() =>
      parseImportedAdvisoryOutputs(
        JSON.stringify([output("a", [{ text: "Release is approved.", citationIds: [CITATION_A] }]), peer]),
        scope
      )
    ).toThrow(/forbidden release authority/);
  });

  it("is omitted by default and accepts only exact opt-in values", () => {
    expect(WEB_FEATURE_FLAGS.agentDisagreement).toBe(false);
    expect(parseWebFeatureFlags({}).agentDisagreement).toBe(false);
    expect(parseWebFeatureFlags({
      VITE_INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT: "true"
    }).agentDisagreement).toBe(true);
    expect(() => parseWebFeatureFlags({
      VITE_INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT: "enabled"
    })).toThrow(/must be exactly true or false/);
  });

  it("renders the browser-local non-authority boundary without a request surface", () => {
    const response = {
      missionId: MISSION_ID,
      disclosure: {
        questionDigest: QUESTION_DIGEST,
        evidencePackDigest: PACK_DIGEST
      },
      citationDetails: [{ citationId: CITATION_A }, { citationId: CITATION_B }]
    } as unknown as CitedExplanationResponse;

    const html = renderToStaticMarkup(
      <AdvisoryDisagreementLab response={response} />
    );

    expect(html).toContain("Advisory-output Disagreement Lab");
    expect(html).toContain("browser-local import");
    expect(html).toContain("no provider request");
    expect(html).toContain("NO SEMANTIC JUDGMENT");
  });
});
