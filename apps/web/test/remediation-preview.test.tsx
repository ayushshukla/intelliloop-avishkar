import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CitedExplanationResponse } from "@intelliloop/contracts";

import { RemediationPreviewLab } from "../src/RemediationPreviewLab";
import { parseWebFeatureFlags, WEB_FEATURE_FLAGS } from "../src/feature-flags";
import {
  RemediationPreviewError,
  createRemediationPreview,
  validateRemediationPreview,
  type RemediationPreview
} from "../src/remediation-preview";

const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const QUESTION_DIGEST = `sha256:${"a".repeat(64)}`;
const PACK_DIGEST = `sha256:${"b".repeat(64)}`;
const CITATION_A = `cite:${"c".repeat(64)}`;
const CITATION_B = `cite:${"d".repeat(64)}`;

function response(): CitedExplanationResponse {
  return {
    missionId: MISSION_ID,
    disclosure: {
      questionDigest: QUESTION_DIGEST,
      evidencePackDigest: PACK_DIGEST
    },
    citationDetails: [
      { citationId: CITATION_A },
      { citationId: CITATION_B }
    ],
    syntheticEdgeCases: {
      suggestions: [
        {
          scenario: "Exercise the cited cancellation boundary with an inventory hold.",
          expectedObservation: "The cited impact path remains visible.",
          citationIds: [CITATION_A],
          kind: "IMPACT_PATH_INTERRUPTION"
        },
        {
          scenario: "Exercise the cited refund boundary after cancellation.",
          expectedObservation: "The refund validation remains attributable.",
          citationIds: [CITATION_B],
          kind: "MISSING_VALIDATION_PAIR"
        }
      ]
    },
    offlineExplanation: {
      nextActions: [
        {
          category: "NEXT_ACTION",
          text: "Review the cited implementation boundary.",
          citationIds: [CITATION_A]
        }
      ],
      gaps: [],
      conflicts: [],
      answer: {
        category: "ANSWER",
        text: "The cited impact remains advisory.",
        citationIds: [CITATION_B]
      }
    }
  } as unknown as CitedExplanationResponse;
}

describe("Guarded Remediation Preview", () => {
  it("creates cited test and patch-intent previews without input mutation or authority", () => {
    const input = response();
    const before = structuredClone(input);

    const tests = createRemediationPreview(input, "TEST_PLAN");
    const patchIntent = createRemediationPreview(input, "PATCH_INTENT");

    expect(tests).toMatchObject({
      version: "remediation-preview.v1",
      mode: "TEST_PLAN",
      status: "PREVIEW_ONLY",
      proposals: [{ kind: "TEST_PLAN" }, { kind: "TEST_PLAN" }],
      authority: {
        canonicalStateChanged: false,
        repositoryWriteAvailable: false,
        shellAvailable: false,
        gitAvailable: false,
        deploymentAvailable: false,
        networkAvailable: false,
        externalCallMade: false,
        readinessAuthority: false,
        releasePassportAuthority: false
      }
    });
    expect(patchIntent.mode).toBe("PATCH_INTENT");
    expect(patchIntent.proposals[0]?.labels).toEqual([
      "ADVISORY_ONLY",
      "NOT_EVIDENCE",
      "NOT_EXECUTED"
    ]);
    expect(input).toEqual(before);
  });

  it("rejects unknown citations, execution-shaped text, and acquired authority", () => {
    const input = response();
    const valid = createRemediationPreview(input, "TEST_PLAN");
    const first = valid.proposals[0];
    expect(first).toBeDefined();

    const unknownCitation = structuredClone(valid) as RemediationPreview;
    (unknownCitation.proposals[0] as unknown as { citationIds: string[] }).citationIds = [
      `cite:${"e".repeat(64)}`
    ];
    expect(() => validateRemediationPreview(unknownCitation, input)).toThrow(
      RemediationPreviewError
    );

    const executionText = structuredClone(valid) as RemediationPreview;
    (executionText.proposals[0] as unknown as { rationale: string }).rationale =
      "Apply the patch and git push it.";
    expect(() => validateRemediationPreview(executionText, input)).toThrow(
      /text, labels, or citations/
    );

    const authority = structuredClone(valid) as RemediationPreview;
    (authority.authority as { repositoryWriteAvailable: boolean }).repositoryWriteAvailable = true;
    expect(() => validateRemediationPreview(authority, input)).toThrow(
      /execution or release authority/
    );
  });

  it("is absent by default and accepts only exact explicit opt-in", () => {
    expect(WEB_FEATURE_FLAGS.remediationPreview).toBe(false);
    expect(parseWebFeatureFlags({}).remediationPreview).toBe(false);
    expect(parseWebFeatureFlags({
      VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "true"
    }).remediationPreview).toBe(true);
    expect(() => parseWebFeatureFlags({
      VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "enabled"
    })).toThrow(/must be exactly true or false/);
  });

  it("renders a preview-only boundary without repository, command, or network controls", () => {
    const html = renderToStaticMarkup(<RemediationPreviewLab response={response()} />);

    expect(html).toContain("Guarded Remediation Preview");
    expect(html).toContain("ADVISORY ONLY / NOT EVIDENCE / NOT EXECUTED");
    expect(html).toContain("No repository write, shell, Git, provider, network");
    expect(html).toContain("Generate preview only");
    expect(html).not.toContain("Apply preview");
  });
});
