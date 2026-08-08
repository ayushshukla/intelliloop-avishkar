import { useState } from "react";

import type { CitedExplanationResponse } from "@intelliloop/contracts";

import {
  RemediationPreviewError,
  createRemediationPreview,
  type RemediationPreview,
  type RemediationPreviewMode
} from "./remediation-preview";

export interface RemediationPreviewLabProps {
  readonly response: CitedExplanationResponse;
}

function citationAnchor(citationId: string): string {
  return `citation-${citationId.slice(5, 21)}`;
}

export function RemediationPreviewLab({
  response
}: RemediationPreviewLabProps): JSX.Element {
  const [mode, setMode] = useState<RemediationPreviewMode>("TEST_PLAN");
  const [preview, setPreview] = useState<RemediationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate(): void {
    try {
      setPreview(createRemediationPreview(response, mode));
      setError(null);
    } catch (caught) {
      setPreview(null);
      setError(
        caught instanceof RemediationPreviewError
          ? caught.message
          : "The remediation preview could not be generated safely."
      );
    }
  }

  return (
    <section className="remediation-preview-lab" aria-labelledby="remediation-preview-title">
      <div className="section-heading section-heading--wide">
        <p className="eyebrow">Optional experiment / non-applying preview</p>
        <h2 id="remediation-preview-title">Guarded Remediation Preview</h2>
        <p>
          Turn the current validated, cited explanation into a bounded test plan or
          change-intent review. The preview exists only in browser memory and cannot
          apply source changes or run validation.
        </p>
      </div>

      <div className="remediation-preview-boundary" role="note">
        <strong>ADVISORY ONLY / NOT EVIDENCE / NOT EXECUTED</strong>
        <span>
          No repository write, shell, Git, provider, network, commit, push, deployment,
          readiness, waiver, approval, or Passport operation is available here.
        </span>
      </div>

      <div className="remediation-preview-controls">
        <label htmlFor="remediation-preview-mode">Preview type</label>
        <select
          id="remediation-preview-mode"
          value={mode}
          onChange={(event) => {
            setMode(event.currentTarget.value as RemediationPreviewMode);
            setPreview(null);
            setError(null);
          }}
        >
          <option value="TEST_PLAN">Cited controlled test plan</option>
          <option value="PATCH_INTENT">Cited change intent</option>
        </select>
        <button className="primary-action" type="button" onClick={generate}>
          Generate preview only
        </button>
      </div>

      {error === null ? null : (
        <div className="inline-state inline-state--error" role="alert">
          <span className="state-label">PREVIEW WITHHELD</span>
          <strong>No unsafe or uncited proposal was rendered</strong>
          <p>{error}</p>
        </div>
      )}

      {preview === null ? null : (
        <div className="remediation-preview-result" aria-live="polite">
          <dl className="disclosure-grid">
            <div><dt>Status</dt><dd>{preview.status.replaceAll("_", " ")}</dd></div>
            <div><dt>Proposals</dt><dd>{preview.proposals.length}</dd></div>
            <div><dt>Repository writes</dt><dd>0</dd></div>
            <div><dt>Commands executed</dt><dd>0</dd></div>
            <div><dt>Network calls</dt><dd>0</dd></div>
            <div><dt>Canonical changes</dt><dd>0</dd></div>
          </dl>
          <ol className="remediation-proposal-list">
            {preview.proposals.map((proposal) => (
              <li key={proposal.proposalId}>
                <article>
                  <header>
                    <span className="state-label">{proposal.kind.replaceAll("_", " ")}</span>
                    <strong>{proposal.title}</strong>
                  </header>
                  <p><strong>Cited rationale:</strong> {proposal.rationale}</p>
                  <ol>
                    {proposal.proposedSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  <p><strong>Expected review observation:</strong> {proposal.expectedObservation}</p>
                  <p className="statement-citations" aria-label="Proposal citations">
                    {proposal.citationIds.map((citationId) => (
                      <a key={citationId} href={`#${citationAnchor(citationId)}`}>
                        cited source
                      </a>
                    ))}
                  </p>
                  <p className="digest-line">{proposal.labels.join(" / ")}</p>
                </article>
              </li>
            ))}
          </ol>
          <ul className="explanation-limitations" aria-label="Remediation preview limitations">
            {preview.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
          <p className="digest-line">
            Preview complete in browser memory. Applied: NO; executed: NO; readiness changed: NO.
          </p>
        </div>
      )}
    </section>
  );
}
