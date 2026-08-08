import { useEffect, useMemo, useState } from "react";

import {
  CITED_EXPLANATION_QUESTIONS,
  type CitedExplanationQuestion,
  type CitedExplanationResponse,
  type MissionResource
} from "@intelliloop/contracts";

import { createCitedExplanation } from "./cited-explanation-client";
import { AdvisoryDisagreementLab } from "./AdvisoryDisagreementLab";
import { RemediationPreviewLab } from "./RemediationPreviewLab";
import { WEB_FEATURE_FLAGS } from "./feature-flags";
import { WorkspaceClientError, getMission } from "./workspace-client";

export interface CitedExplanationWorkspaceProps {
  readonly missionId: string;
  readonly fetcher: typeof fetch;
  readonly onProjectAvailable?: (projectId: string) => void;
  readonly onOpenReconciliation?: (missionId: string) => void;
}

type MissionState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly mission: MissionResource };

type ExplanationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "rejected"; readonly message: string }
  | { readonly kind: "ready"; readonly response: CitedExplanationResponse };

const FAILURE_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  PROVIDER_DISABLED:
    "Optional provider execution is disabled. The complete deterministic answer remains available.",
  PROVIDER_CONCURRENCY_LIMIT:
    "The optional advisory request was not attempted because the one-request concurrency limit was active.",
  PROVIDER_SESSION_BUDGET_EXCEEDED:
    "The optional advisory request was not attempted because its bounded session budget was exhausted.",
  PROVIDER_INPUT_LIMIT_EXCEEDED:
    "The optional advisory request was not attempted because the redacted pack exceeded its input ceiling.",
  PROVIDER_TRANSPORT_FAILED:
    "The optional advisory transport failed safely. No provider text is displayed.",
  PROVIDER_TIMEOUT:
    "The optional advisory timed out after the bounded retry. No provider text is displayed.",
  PROVIDER_RESPONSE_LIMIT_EXCEEDED:
    "The optional advisory response exceeded its fixed size limit and was rejected.",
  PROVIDER_RESPONSE_SCHEMA_INVALID:
    "The optional advisory response did not match the closed schema and was rejected.",
  PROVIDER_REQUEST_ID_MISMATCH:
    "The optional advisory response did not match this exact request and was rejected.",
  PROVIDER_PACK_DIGEST_MISMATCH:
    "The optional advisory response did not match this exact evidence pack and was rejected.",
  PROVIDER_OUTPUT_SCHEMA_MISMATCH:
    "The optional advisory response used the wrong output-schema identity and was rejected.",
  PROVIDER_CITATION_INVALID:
    "The optional advisory contained an unknown or incoherent citation and was rejected.",
  PROVIDER_RESPONSE_CONTENT_UNSAFE:
    "The optional advisory contained unsafe response content and was rejected.",
  PROVIDER_READINESS_AUTHORITY_INVALID:
    "The optional advisory attempted to claim release authority and was rejected.",
  PROVIDER_USAGE_LIMIT_EXCEEDED:
    "The optional advisory reported usage outside the configured ceiling and was rejected."
});

function safeMissionError(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local Work Item scope could not be loaded.";
}

function shortDigest(value: string): string {
  return `${value.slice(0, 15)}...${value.slice(-8)}`;
}

function citationAnchor(citationId: string): string {
  return `citation-${citationId.slice(5, 21)}`;
}

type CitedStatement = {
  readonly text: string;
  readonly citationIds: readonly string[];
};

function CitationLinks({
  citationIds,
  indexes
}: {
  readonly citationIds: readonly string[];
  readonly indexes: ReadonlyMap<string, number>;
}): JSX.Element {
  return (
    <span className="statement-citations" aria-label="Evidence citations">
      {citationIds.map((citationId) => (
        <a key={citationId} href={`#${citationAnchor(citationId)}`}>
          [{indexes.get(citationId) ?? "?"}]
        </a>
      ))}
    </span>
  );
}

function StatementList({
  title,
  statements,
  indexes
}: {
  readonly title: string;
  readonly statements: readonly CitedStatement[];
  readonly indexes: ReadonlyMap<string, number>;
}): JSX.Element | null {
  if (statements.length === 0) return null;
  return (
    <section className="explanation-section" aria-labelledby={`section-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <h3 id={`section-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h3>
      <ul>
        {statements.map((statement, index) => (
          <li key={`${title}:${index}:${statement.text}`}>
            <span>{statement.text}</span>{" "}
            <CitationLinks citationIds={statement.citationIds} indexes={indexes} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExplanationResult({ response }: { readonly response: CitedExplanationResponse }): JSX.Element {
  const citationIndexes = useMemo(
    () => new Map(
      response.citationDetails.map((citation, index) => [citation.citationId, index + 1])
    ),
    [response]
  );
  const offline = response.offlineExplanation;
  const advisory = response.advisory?.response;
  return (
    <div className="explanation-result">
      <section className="explanation-trust" aria-labelledby="explanation-trust-title">
        <div>
          <span className="state-label">DETERMINISTIC EXPLANATION / AI OFF</span>
          <h2 id="explanation-trust-title">Cited answer from the exact persisted assessment</h2>
          <p>
            This explanation is advisory and cannot approve release, change Risks &amp; Checks,
            waive Linked Evidence, or create a Release Evidence Report.
          </p>
        </div>
        <dl>
          <div><dt>Provider outcome</dt><dd>{response.execution.providerOutcome.replaceAll("_", " ")}</dd></div>
          <div><dt>External call</dt><dd>NO</dd></div>
          <div><dt>Canonical state changed</dt><dd>NO</dd></div>
        </dl>
      </section>

      {response.execution.failureCode === undefined ? null : (
        <div className="provider-notice" role="status">
          <strong>{response.execution.failureCode.replaceAll("_", " ")}</strong>
          <span>{FAILURE_MESSAGES[response.execution.failureCode] ?? "The optional advisory was unavailable and no unvalidated provider text is displayed."}</span>
        </div>
      )}

      <section className="outbound-disclosure" aria-labelledby="outbound-disclosure-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Outbound disclosure / NOT SENT</p>
          <h2 id="outbound-disclosure-title">Exact redacted provider pack</h2>
          <p>
            The current product made no external call. This is the exact bounded content
            that a later explicitly enabled checkpoint would be allowed to send.
          </p>
        </div>
        <dl className="disclosure-grid">
          <div><dt>Pack digest</dt><dd><code>{shortDigest(response.disclosure.evidencePackDigest)}</code></dd></div>
          <div><dt>Items</dt><dd>{response.disclosure.itemCount}</dd></div>
          <div><dt>Citations</dt><dd>{response.disclosure.citationCount}</dd></div>
          <div><dt>Serialized bytes</dt><dd>{response.disclosure.serializedBytes}</dd></div>
          <div><dt>Input upper bound</dt><dd>{response.disclosure.inputTokenUpperBound}</dd></div>
          <div><dt>Redactions</dt><dd>{response.disclosure.redaction.totalReplacements}</dd></div>
        </dl>
        <details className="pack-preview">
          <summary>Review exact redacted pack JSON</summary>
          <pre>{response.disclosure.exactRedactedPackJson}</pre>
        </details>
      </section>

      <section className="primary-answer" aria-labelledby="primary-answer-title">
        <span className="state-label">PRIMARY / DETERMINISTIC</span>
        <h2 id="primary-answer-title">{offline.question}</h2>
        <p className="answer-copy">
          {offline.answer.text}{" "}
          <CitationLinks citationIds={offline.answer.citationIds} indexes={citationIndexes} />
        </p>
        <div className="explanation-sections">
          <StatementList title="Facts" statements={offline.facts} indexes={citationIndexes} />
          <StatementList title="Inferences" statements={offline.inferences} indexes={citationIndexes} />
          <StatementList title="Open conflicts" statements={offline.conflicts} indexes={citationIndexes} />
          <StatementList title="Evidence gaps" statements={offline.gaps} indexes={citationIndexes} />
          <StatementList title="Next actions" statements={offline.nextActions} indexes={citationIndexes} />
        </div>
        <ul className="explanation-limitations" aria-label="Explanation limitations">
          {offline.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
        <p className="digest-line">Explanation digest <code>{offline.explanationDigest}</code></p>
      </section>

      <section className="synthetic-edge-cases" aria-labelledby="synthetic-edge-cases-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">SYNTHETIC / ADVISORY ONLY / NOT EVIDENCE</p>
          <h2 id="synthetic-edge-cases-title">Synthetic retail edge cases</h2>
          <p>
            Deterministic test ideas derived from cited redacted pack items. Provider NONE;
            no risk, Release Check, evidence record, or Release Evidence Report can be changed.
          </p>
        </div>
        {response.syntheticEdgeCases.suggestions.length === 0 ? (
          <p>No cited synthetic edge case is suggested by the selected question pack.</p>
        ) : (
          <ol className="synthetic-suggestion-list">
            {response.syntheticEdgeCases.suggestions.map((suggestion) => (
              <li key={suggestion.suggestionId}>
                <article>
                  <header>
                    <strong>{suggestion.title}</strong>
                    <span className="state-label">{suggestion.syntheticLabel}</span>
                    <span className="state-label">{suggestion.authorityLabel.replaceAll("_", " ")}</span>
                  </header>
                  <p><strong>Scenario:</strong> {suggestion.scenario}</p>
                  <p>
                    <strong>Expected deterministic observation:</strong>{" "}
                    {suggestion.expectedObservation}{" "}
                    <CitationLinks citationIds={suggestion.citationIds} indexes={citationIndexes} />
                  </p>
                  <p className="digest-line">{suggestion.evidenceStatus.replaceAll("_", " ")}</p>
                </article>
              </li>
            ))}
          </ol>
        )}
        <ul className="explanation-limitations" aria-label="Synthetic suggestion limitations">
          {response.syntheticEdgeCases.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p className="digest-line">
          Suggestion set digest <code>{response.syntheticEdgeCases.setDigest}</code>
        </p>
      </section>

      {advisory === undefined ? null : (
        <section className="advisory-answer" aria-labelledby="advisory-answer-title">
          <span className="state-label">VALIDATED MOCK ADVISORY / NON-AUTHORITATIVE</span>
          <h2 id="advisory-answer-title">Optional advisory comparison</h2>
          <p className="answer-copy">
            {advisory.answer.text}{" "}
            <CitationLinks citationIds={advisory.answer.citationIds} indexes={citationIndexes} />
          </p>
          <div className="explanation-sections">
            <StatementList title="Advisory facts" statements={advisory.facts} indexes={citationIndexes} />
            <StatementList title="Advisory inferences" statements={advisory.inferences} indexes={citationIndexes} />
            <StatementList title="Advisory conflicts" statements={advisory.conflicts} indexes={citationIndexes} />
            <StatementList title="Advisory gaps" statements={advisory.gaps} indexes={citationIndexes} />
            <StatementList title="Advisory next actions" statements={advisory.nextActions} indexes={citationIndexes} />
          </div>
          <p className="digest-line">
            Controlled mock {advisory.providerMetadata.providerId} / {advisory.providerMetadata.modelId};
            {" "}{advisory.usageMetadata.totalTokens} provider-reported fixture tokens.
          </p>
        </section>
      )}

      {WEB_FEATURE_FLAGS.agentDisagreement ? (
        <AdvisoryDisagreementLab response={response} />
      ) : null}

      {WEB_FEATURE_FLAGS.remediationPreview ? (
        <RemediationPreviewLab response={response} />
      ) : null}

      <section className="citation-registry" aria-labelledby="citation-registry-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Allowlisted resolution</p>
          <h2 id="citation-registry-title">Used citation registry</h2>
          <p>Every rendered statement resolves to one exact redacted pack item below.</p>
        </div>
        <ol>
          {response.citationDetails.map((citation, index) => (
            <li key={citation.citationId} id={citationAnchor(citation.citationId)} tabIndex={-1}>
              <article>
                <header>
                  <strong>[{index + 1}] {citation.itemKind.replaceAll("_", " ")}</strong>
                  <code>{shortDigest(citation.itemDigest)}</code>
                </header>
                <p><code>{citation.itemKey}</code></p>
                <details>
                  <summary>Inspect redacted cited payload</summary>
                  <pre>{citation.payloadJson}</pre>
                </details>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function CitedExplanationWorkspace({
  missionId,
  fetcher,
  onProjectAvailable,
  onOpenReconciliation
}: CitedExplanationWorkspaceProps): JSX.Element {
  const [missionState, setMissionState] = useState<MissionState>({ kind: "loading" });
  const [question, setQuestion] = useState<CitedExplanationQuestion>(
    CITED_EXPLANATION_QUESTIONS[0]
  );
  const [explanation, setExplanation] = useState<ExplanationState>({ kind: "idle" });

  useEffect(() => {
    const controller = new AbortController();
    setMissionState({ kind: "loading" });
    void getMission(missionId, fetcher, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setMissionState({ kind: "ready", mission: response.mission });
        onProjectAvailable?.(response.mission.projectId);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMissionState({ kind: "error", message: safeMissionError(error) });
        }
      });
    return () => controller.abort();
  }, [fetcher, missionId, onProjectAvailable]);

  async function ask(): Promise<void> {
    setExplanation({ kind: "loading" });
    try {
      const response = await createCitedExplanation(missionId, question, fetcher);
      setExplanation({ kind: "ready", response });
    } catch {
      setExplanation({
        kind: "rejected",
        message:
          "The cited-explanation response was unavailable or failed strict citation validation. No unvalidated answer is displayed."
      });
    }
  }

  if (missionState.kind === "loading") {
    return (
      <section className="overview-state" aria-busy="true">
        <span className="state-label">LOADING</span>
        <h1>Reading the cited-explanation scope</h1>
        <p>No provider is contacted while the persisted Work Item is loaded.</p>
      </section>
    );
  }
  if (missionState.kind === "error") {
    return (
      <section className="overview-state overview-state--error" role="alert">
        <span className="state-label">ERROR</span>
        <h1>Cited explanation unavailable</h1>
        <p>{missionState.message}</p>
      </section>
    );
  }

  return (
    <div className="explanation-workspace">
      <section className="overview-hero explanation-hero" aria-labelledby="explanation-title">
        <div>
          <p className="eyebrow">Current route / Cited explanation</p>
          <h1 id="explanation-title">Ask the evidence, not an authority.</h1>
          <p>
            Choose one fixed question. IntelliLoop rebuilds the exact redacted pack from
            the latest immutable assessment and always answers deterministically with citations.
          </p>
        </div>
        <div className="truth-badge" data-state="AI_OFF">
          <span>AI status</span><strong>OFF</strong><small>Provider calls disabled</small>
        </div>
      </section>

      <section className="question-panel" aria-labelledby="question-panel-title">
        <div>
          <p className="eyebrow">Fixed question contract</p>
          <h2 id="question-panel-title">Generate a cited explanation</h2>
          <p>Arbitrary prompts are not accepted. Every answer is bound to the latest persisted conflict-resolution revision.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void ask(); }}>
          <label htmlFor="cited-question">Evidence question</label>
          <select
            id="cited-question"
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value as CitedExplanationQuestion)}
          >
            {CITED_EXPLANATION_QUESTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <button className="primary-action" type="submit" disabled={explanation.kind === "loading"}>
            {explanation.kind === "loading" ? "Compiling cited answer..." : "Generate cited answer"}
          </button>
        </form>
      </section>

      {explanation.kind === "idle" ? (
        <section className="reconciliation-empty" data-state="EMPTY" aria-labelledby="explanation-empty-title">
          <span className="state-label">NO ANSWER GENERATED</span>
          <h2 id="explanation-empty-title">Select a fixed question to begin</h2>
          <p>No sample, cached answer, provider output, or Release Check is substituted.</p>
          {onOpenReconciliation === undefined ? null : (
            <button className="secondary-action" type="button" onClick={() => onOpenReconciliation(missionId)}>
              Review Risks &amp; Checks
            </button>
          )}
        </section>
      ) : null}
      {explanation.kind === "loading" ? (
        <section className="overview-state" aria-busy="true">
          <span className="state-label">COMPILING</span>
          <h2>Building the exact redacted evidence pack</h2>
          <p>The complete deterministic answer will remain available even if the optional advisory path fails.</p>
        </section>
      ) : null}
      {explanation.kind === "rejected" ? (
        <section className="overview-state overview-state--error" role="alert">
          <span className="state-label">UNSAFE RESPONSE REJECTED</span>
          <h2>Cited answer not rendered</h2>
          <p>{explanation.message}</p>
        </section>
      ) : null}
      {explanation.kind === "ready" ? <ExplanationResult response={explanation.response} /> : null}
    </div>
  );
}
