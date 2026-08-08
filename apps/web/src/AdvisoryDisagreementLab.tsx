import { useMemo, useState } from "react";

import type { CitedExplanationResponse } from "@intelliloop/contracts";

import {
  AdvisoryImportError,
  compareImportedAdvisoryOutputs,
  parseImportedAdvisoryOutputs,
  type AdvisoryDisagreementComparison
} from "./advisory-disagreement";

export interface AdvisoryDisagreementLabProps {
  readonly response: CitedExplanationResponse;
}

function citationAnchor(citationId: string): string {
  return `citation-${citationId.slice(5, 21)}`;
}

function createControlledExample(response: CitedExplanationResponse): string {
  const citationIds = response.citationDetails.map((entry) => entry.citationId);
  const first = citationIds[0] as string;
  const second = citationIds[1] ?? first;
  const binding = {
    missionId: response.missionId,
    questionDigest: response.disclosure.questionDigest,
    evidencePackDigest: response.disclosure.evidencePackDigest
  };
  const common = {
    importVersion: "imported-advisory-output.v1",
    binding,
    authority: "ADVISORY_ONLY"
  };
  return JSON.stringify(
    [
      {
        ...common,
        attribution: {
          agentLabel: "Controlled review A",
          providerId: "imported-demo",
          modelId: "review-fixture-a",
          outputId: "controlled-output-a"
        },
        recommendations: [
          { text: "Review the cited release evidence before any decision.", citationIds: [first] },
          { text: "Re-run the bounded validation path.", citationIds: [second] }
        ]
      },
      {
        ...common,
        attribution: {
          agentLabel: "Controlled review B",
          providerId: "imported-demo",
          modelId: "review-fixture-b",
          outputId: "controlled-output-b"
        },
        recommendations: [
          { text: "Review the cited release evidence before any decision.", citationIds: [second] },
          { text: "Inspect unresolved evidence gaps with the technical lead.", citationIds: [first] }
        ]
      }
    ],
    null,
    2
  );
}

export function AdvisoryDisagreementLab({
  response
}: AdvisoryDisagreementLabProps): JSX.Element {
  const [rawJson, setRawJson] = useState("");
  const [comparison, setComparison] =
    useState<AdvisoryDisagreementComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowedCitationIds = useMemo(
    () => new Set(response.citationDetails.map((entry) => entry.citationId)),
    [response]
  );

  function compare(): void {
    try {
      const outputs = parseImportedAdvisoryOutputs(rawJson, {
        missionId: response.missionId,
        questionDigest: response.disclosure.questionDigest,
        evidencePackDigest: response.disclosure.evidencePackDigest,
        allowedCitationIds
      });
      setComparison(compareImportedAdvisoryOutputs(outputs));
      setError(null);
    } catch (caught) {
      setComparison(null);
      setError(
        caught instanceof AdvisoryImportError
          ? caught.message
          : "The imported advisory outputs could not be compared safely."
      );
    }
  }

  return (
    <section
      className="advisory-disagreement-lab"
      aria-labelledby="advisory-disagreement-title"
    >
      <div className="section-heading section-heading--wide">
        <p className="eyebrow">Optional experiment / browser-local import</p>
        <h2 id="advisory-disagreement-title">Advisory-output Disagreement Lab</h2>
        <p>
          Compare two to four attributed recommendation sets bound to this exact
          Mission, question, evidence pack and citation allowlist. IntelliLoop makes
          no provider request and does not persist or orchestrate the imported agents.
        </p>
      </div>

      <div className="advisory-disagreement-boundary" role="note">
        <strong>ADVISORY ONLY / NO SEMANTIC JUDGMENT</strong>
        <span>
          Exact text and citation differences are inspectable; they are not proof of
          contradiction, correctness, approval, readiness, waiver, or Passport authority.
        </span>
      </div>

      <div className="advisory-import-controls">
        <label htmlFor="advisory-import-json">Attributed advisory-output JSON array</label>
        <textarea
          id="advisory-import-json"
          value={rawJson}
          onChange={(event) => {
            setRawJson(event.currentTarget.value);
            setComparison(null);
            setError(null);
          }}
          rows={14}
          spellCheck={false}
          placeholder="Paste 2-4 imported-advisory-output.v1 objects here."
        />
        <div className="advisory-import-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => {
              setRawJson(createControlledExample(response));
              setComparison(null);
              setError(null);
            }}
          >
            Insert controlled example
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={compare}
            disabled={rawJson.trim().length === 0}
          >
            Compare imported outputs
          </button>
        </div>
        <p className="field-help">
          The controlled example is synthetic demonstration data, not provider evidence.
          Replace its attribution and recommendations when reviewing real exported outputs.
        </p>
      </div>

      {error === null ? null : (
        <div className="inline-state inline-state--error" role="alert">
          <span className="state-label">IMPORT REJECTED</span>
          <strong>Unsafe or mismatched advisory output was not rendered</strong>
          <p>{error}</p>
        </div>
      )}

      {comparison === null ? null : (
        <div className="advisory-comparison-result" aria-live="polite">
          <dl className="disclosure-grid">
            <div><dt>Imported outputs</dt><dd>{comparison.outputCount}</dd></div>
            <div><dt>Exactly aligned</dt><dd>{comparison.alignedCount}</dd></div>
            <div><dt>Citation variance</dt><dd>{comparison.citationVarianceCount}</dd></div>
            <div><dt>Output-only text</dt><dd>{comparison.outputOnlyCount}</dd></div>
            <div><dt>External calls</dt><dd>0</dd></div>
            <div><dt>Canonical changes</dt><dd>0</dd></div>
          </dl>
          <ol className="advisory-difference-list">
            {comparison.differences.map((difference, index) => (
              <li key={`${difference.kind}:${difference.text}:${index}`}>
                <article>
                  <header>
                    <span className="state-label">
                      {difference.kind.replaceAll("_", " ")}
                    </span>
                    <strong>{difference.text}</strong>
                  </header>
                  <ul>
                    {difference.occurrences.map((occurrence) => (
                      <li key={`${occurrence.outputId}:${difference.text}`}>
                        <strong>{occurrence.agentLabel}</strong>{" "}
                        <code>{occurrence.outputId}</code>{" "}
                        {occurrence.citationIds.map((citationId) => (
                          <a key={citationId} href={`#${citationAnchor(citationId)}`}>
                            citation
                          </a>
                        ))}
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
          <p className="digest-line">
            Comparison complete in browser memory. Semantic contradiction inferred: NO;
            readiness changed: NO; live orchestration: NO.
          </p>
        </div>
      )}
    </section>
  );
}
