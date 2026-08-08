import { useEffect, useMemo, useState } from "react";

import type {
  ClaimResource,
  ClaimSupersessionResource,
  CommitEvidenceRequest,
  EvidencePreviewRequest,
  EvidenceSourceResource,
  EvidenceTimelineEventResource,
  MissionResource,
  PreparedEvidenceResource
} from "@intelliloop/contracts";

import {
  commitEvidence,
  listClaims,
  listClaimSupersessions,
  listEvidenceSources,
  listEvidenceTimeline,
  previewEvidence
} from "./evidence-client";
import { WorkspaceClientError, getMission } from "./workspace-client";
import { PRODUCT_TERMS, ProvenanceBadge } from "./presentation";

export interface EvidenceTimelineProps {
  readonly missionId: string;
  readonly fetcher: typeof fetch;
  readonly onProjectAvailable?: (projectId: string) => void;
  readonly onOpenProject?: (projectId: string) => void;
  readonly onOpenTwin?: (missionId: string) => void;
}

interface EvidenceViewData {
  readonly mission: MissionResource;
  readonly evidenceSources: readonly EvidenceSourceResource[];
  readonly timelineEvents: readonly EvidenceTimelineEventResource[];
  readonly claims: readonly ClaimResource[];
  readonly supersessions: readonly ClaimSupersessionResource[];
  readonly partial: boolean;
}

type EvidenceViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "integrity-error" }
  | { readonly kind: "ready"; readonly data: EvidenceViewData };

type ImportAction = "PREVIEW" | "IMPORT" | null;

function formatTime(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local evidence workspace could not be loaded.";
}

function isLogicalLocator(value: string): boolean {
  if (
    value.length < 4 ||
    value.length > 512 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f\\@?#%]/u.test(value)
  ) {
    return false;
  }
  const match = /^([a-z][a-z0-9+.-]{1,31}):([A-Za-z0-9][A-Za-z0-9._~/-]*)$/u.exec(
    value
  );
  if (match === null) return false;
  const payload = match[2] ?? "";
  return (
    !payload.includes("//") &&
    !payload.split("/").some((segment) => segment === "." || segment === "..")
  );
}

function isCanonicalOptionalTime(value: string): boolean {
  if (value.length === 0) return true;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function isConsistent(data: EvidenceViewData): boolean {
  const { mission, evidenceSources, timelineEvents, claims, supersessions } = data;
  if (
    !hasUniqueValues(evidenceSources.map((source) => source.evidenceSourceId)) ||
    !hasUniqueValues(timelineEvents.map((event) => event.timelineEventId)) ||
    !hasUniqueValues(timelineEvents.map((event) => String(event.sequence))) ||
    !hasUniqueValues(claims.map((claim) => claim.claimId)) ||
    !hasUniqueValues(supersessions.map((link) => link.claimSupersessionId))
  ) {
    return false;
  }

  if (
    evidenceSources.some(
      (source) =>
        source.projectId !== mission.projectId || source.missionId !== mission.missionId
    ) ||
    timelineEvents.some(
      (event) =>
        event.projectId !== mission.projectId || event.missionId !== mission.missionId
    ) ||
    claims.some(
      (claim) =>
        claim.projectId !== mission.projectId || claim.missionId !== mission.missionId
    ) ||
    supersessions.some(
      (link) => link.projectId !== mission.projectId || link.missionId !== mission.missionId
    )
  ) {
    return false;
  }

  const sources = new Map(
    evidenceSources.map((source) => [source.evidenceSourceId, source] as const)
  );
  const claimById = new Map(claims.map((claim) => [claim.claimId, claim] as const));

  for (const event of timelineEvents) {
    if (!data.partial && !sources.has(event.evidenceSourceId)) return false;
  }
  for (const claim of claims) {
    const source = sources.get(claim.evidenceSourceId);
    if (source === undefined) {
      if (!data.partial) return false;
      continue;
    }
    if (
      claim.sourceContentDigest !== source.prepared.contentDigest ||
      claim.origin !== source.origin ||
      claim.sourceLocator !== source.sourceLocator ||
      claim.sourceRevision !== source.sourceRevision
    ) {
      return false;
    }
  }
  for (const link of supersessions) {
    const predecessor = claimById.get(link.predecessorClaimId);
    const successor = claimById.get(link.successorClaimId);
    if (predecessor === undefined || successor === undefined) {
      if (!data.partial) return false;
      continue;
    }
    if (
      successor.supersedesClaimId !== predecessor.claimId ||
      link.evidenceSourceId !== successor.evidenceSourceId ||
      link.comparisonKey !== successor.comparisonKey ||
      link.applicabilityKey !== successor.applicabilityKey
    ) {
      return false;
    }
  }
  return true;
}

function sortSources(
  sources: readonly EvidenceSourceResource[]
): readonly EvidenceSourceResource[] {
  return [...sources].sort((left, right) => {
    const byTime = right.recordedAtUtc.localeCompare(left.recordedAtUtc);
    return byTime === 0
      ? right.evidenceSourceId.localeCompare(left.evidenceSourceId)
      : byTime;
  });
}

function sortClaims(claims: readonly ClaimResource[]): readonly ClaimResource[] {
  return [...claims].sort((left, right) => {
    const byTime = right.recordedAtUtc.localeCompare(left.recordedAtUtc);
    return byTime === 0 ? right.claimId.localeCompare(left.claimId) : byTime;
  });
}

export function EvidenceTimeline({
  missionId,
  fetcher,
  onProjectAvailable,
  onOpenProject,
  onOpenTwin
}: EvidenceTimelineProps): JSX.Element {
  const [state, setState] = useState<EvidenceViewState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [format, setFormat] = useState<EvidencePreviewRequest["format"]>("MARKDOWN");
  const [content, setContent] = useState("");
  const [origin, setOrigin] = useState<CommitEvidenceRequest["origin"]>("USER_INPUT");
  const [sourceLocator, setSourceLocator] = useState("");
  const [sourceRevision, setSourceRevision] = useState("");
  const [effectiveAtUtc, setEffectiveAtUtc] = useState("");
  const [epistemicLabel, setEpistemicLabel] =
    useState<CommitEvidenceRequest["epistemicLabel"]>("FACT");
  const [preview, setPreview] = useState<PreparedEvidenceResource | null>(null);
  const [previewDraft, setPreviewDraft] = useState<EvidencePreviewRequest | null>(null);
  const [action, setAction] = useState<ImportAction>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      try {
        const mission = (await getMission(missionId, fetcher, controller.signal)).mission;
        const [sources, timeline, claimList, linkList] = await Promise.all([
          listEvidenceSources(missionId, fetcher, controller.signal),
          listEvidenceTimeline(missionId, fetcher, controller.signal),
          listClaims(missionId, fetcher, controller.signal),
          listClaimSupersessions(missionId, fetcher, controller.signal)
        ]);
        const data: EvidenceViewData = {
          mission,
          evidenceSources: sources.evidenceSources,
          timelineEvents: timeline.timelineEvents,
          claims: claimList.claims,
          supersessions: linkList.supersessions,
          partial:
            sources.page.nextCursor !== null ||
            timeline.page.nextCursor !== null ||
            claimList.page.nextCursor !== null ||
            linkList.page.nextCursor !== null
        };
        if (
          sources.missionId !== missionId ||
          timeline.missionId !== missionId ||
          claimList.missionId !== missionId ||
          linkList.missionId !== missionId ||
          !isConsistent(data)
        ) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }
        if (!controller.signal.aborted) setState({ kind: "ready", data });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof WorkspaceClientError && error.code === "INVALID_RESPONSE") {
          setState({ kind: "integrity-error" });
        } else {
          setState({ kind: "error", message: safeMessage(error) });
        }
      }
    })();
    return () => controller.abort();
  }, [attempt, fetcher, missionId]);

  useEffect(() => {
    if (state.kind === "ready") onProjectAvailable?.(state.data.mission.projectId);
  }, [onProjectAvailable, state]);

  const sources = useMemo(
    () => (state.kind === "ready" ? sortSources(state.data.evidenceSources) : []),
    [state]
  );
  const timeline = useMemo(
    () =>
      state.kind === "ready"
        ? [...state.data.timelineEvents].sort((left, right) => right.sequence - left.sequence)
        : [],
    [state]
  );
  const claims = useMemo(
    () => (state.kind === "ready" ? sortClaims(state.data.claims) : []),
    [state]
  );
  const supersessions = useMemo(
    () =>
      state.kind === "ready"
        ? [...state.data.supersessions].sort((left, right) =>
            right.recordedAtUtc.localeCompare(left.recordedAtUtc)
          )
        : [],
    [state]
  );
  const currentPreview =
    preview !== null &&
    previewDraft?.format === format &&
    previewDraft.content === content;

  function invalidatePreview(): void {
    setPreview(null);
    setPreviewDraft(null);
    setImportNotice(null);
  }

  function refresh(): void {
    setAttempt((value) => value + 1);
  }

  async function submitPreview(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const byteCount = new TextEncoder().encode(content).byteLength;
    if (byteCount < 1 || byteCount > 262_144) {
      setImportError("Evidence content must contain 1 to 262,144 UTF-8 bytes.");
      return;
    }
    setAction("PREVIEW");
    setImportError(null);
    setImportNotice(null);
    try {
      const draft = { format, content } satisfies EvidencePreviewRequest;
      const response = await previewEvidence(missionId, draft, fetcher);
      setPreview(response.preview);
      setPreviewDraft(draft);
    } catch (error) {
      setPreview(null);
      setPreviewDraft(null);
      setImportError(safeMessage(error));
    } finally {
      setAction(null);
    }
  }

  async function importPreparedEvidence(): Promise<void> {
    if (!currentPreview) {
      setImportError("Preview the current evidence content before importing it.");
      return;
    }
    if (!isLogicalLocator(sourceLocator)) {
      setImportError(
        "Enter a logical source locator such as manual:requirements/cancellation-v2."
      );
      return;
    }
    if (sourceRevision.length > 256) {
      setImportError("Source revision must contain at most 256 characters.");
      return;
    }
    if (!isCanonicalOptionalTime(effectiveAtUtc)) {
      setImportError("Effective time must be an exact UTC timestamp or left empty.");
      return;
    }

    setAction("IMPORT");
    setImportError(null);
    setImportNotice(null);
    try {
      const response = await commitEvidence(
        missionId,
        {
          format,
          content,
          origin,
          sourceLocator,
          ...(sourceRevision.length === 0 ? {} : { sourceRevision }),
          ...(effectiveAtUtc.length === 0 ? {} : { effectiveAtUtc }),
          epistemicLabel
        },
        fetcher
      );
      setImportNotice(
        response.created
          ? "Evidence imported with immutable provenance and a timeline event."
          : "This exact attributed import already existed; the persisted record was reused."
      );
      setContent("");
      setPreview(null);
      setPreviewDraft(null);
      refresh();
    } catch (error) {
      setImportError(safeMessage(error));
    } finally {
      setAction(null);
    }
  }

  if (state.kind === "loading") {
    return (
      <section className="overview-state" role="status" aria-live="polite" aria-busy="true">
        <span className="state-label">LOADING</span>
        <h1>Reading evidence and lineage</h1>
        <p>Waiting for the Work Item, linked sources, timeline, claims and successor links.</p>
      </section>
    );
  }

  if (state.kind === "integrity-error") {
    return (
      <section
        className="overview-state overview-state--error"
        role="alert"
        data-state="INTEGRITY_ERROR"
      >
        <span className="state-label">INTEGRITY ERROR</span>
        <h1>Evidence integrity check failed</h1>
        <p>
          The local API response did not preserve the expected Work Item scope or lineage
          contract. No partial evidence has been presented as trustworthy.
        </p>
        <button className="secondary-action" type="button" onClick={refresh}>
          Retry integrity check
        </button>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="overview-state overview-state--error" role="alert">
        <span className="state-label">ERROR</span>
        <h1>Linked Evidence unavailable</h1>
        <p>{state.message}</p>
        <button className="secondary-action" type="button" onClick={refresh}>
          Retry Linked Evidence
        </button>
      </section>
    );
  }

  return (
    <div className="evidence-workspace">
      <header className="overview-hero">
        <div>
          <p className="eyebrow">Current route / {PRODUCT_TERMS.evidence}</p>
          <h1>{state.data.mission.title}</h1>
          <p className="hero__lede">
            Preview redaction, import bounded evidence, and inspect immutable lineage.
          </p>
          {onOpenProject === undefined ? null : (
            <button
              className="secondary-action secondary-action--neutral"
              type="button"
              onClick={() => onOpenProject(state.data.mission.projectId)}
            >
              Return to Work Item overview
            </button>
          )}
          {onOpenTwin === undefined ? null : (
            <button
              className="secondary-action secondary-action--neutral"
              type="button"
              onClick={() => onOpenTwin(missionId)}
            >
              Open Impact Map
            </button>
          )}
        </div>
        <div className="truth-badge" role="note" aria-label="Evidence authority status">
          <span>Authority</span>
          <strong>EVIDENCE ONLY</strong>
          <small>No claim or label is a readiness decision</small>
        </div>
      </header>

      <div className="scope-note" role="note" aria-label="Evidence trust boundary">
        <strong>Declared provenance</strong>
        <span>
          FACT and INFERENCE are visible epistemic labels. They do not prove truth,
          select a winner, validate implementation, or authorize release.
        </span>
      </div>

      <section className="import-panel" aria-labelledby="import-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Bounded local input</p>
          <h2 id="import-title">Preview before import</h2>
          <p>
            The preview is not persisted. Import re-runs preparation and stores only the
            redacted normalized representation.
          </p>
        </div>

        <form className="evidence-form" onSubmit={(event) => void submitPreview(event)}>
          <div className="evidence-form__grid">
            <div>
              <label htmlFor="evidence-format">Evidence format</label>
              <select
                id="evidence-format"
                value={format}
                disabled={action !== null}
                onChange={(event) => {
                  setFormat(event.currentTarget.value as EvidencePreviewRequest["format"]);
                  invalidatePreview();
                }}
              >
                <option value="MARKDOWN">Markdown</option>
                <option value="TEXT">Plain text</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <div>
              <label htmlFor="evidence-origin">Origin</label>
              <select
                id="evidence-origin"
                value={origin}
                disabled={action !== null}
                onChange={(event) =>
                  setOrigin(event.currentTarget.value as CommitEvidenceRequest["origin"])
                }
              >
                <option value="USER_INPUT">User input</option>
                <option value="REPOSITORY_OBSERVATION">Repository observation</option>
                <option value="VALIDATION_RESULT">Validation result</option>
                <option value="SYSTEM_DERIVATION">System derivation</option>
                <option value="SYNTHETIC_FIXTURE">Synthetic fixture</option>
                <option value="AI_ADVISORY">AI advisory</option>
              </select>
            </div>
            <div>
              <label htmlFor="source-locator">Logical source locator</label>
              <input
                id="source-locator"
                value={sourceLocator}
                maxLength={512}
                autoComplete="off"
                spellCheck={false}
                placeholder="manual:requirements/cancellation-v2"
                disabled={action !== null}
                onChange={(event) => setSourceLocator(event.currentTarget.value)}
              />
            </div>
            <div>
              <label htmlFor="source-revision">Source revision (optional)</label>
              <input
                id="source-revision"
                value={sourceRevision}
                maxLength={256}
                autoComplete="off"
                spellCheck={false}
                placeholder="requirements-v2"
                disabled={action !== null}
                onChange={(event) => setSourceRevision(event.currentTarget.value)}
              />
            </div>
            <div>
              <label htmlFor="effective-at">Effective time UTC (optional)</label>
              <input
                id="effective-at"
                value={effectiveAtUtc}
                autoComplete="off"
                spellCheck={false}
                placeholder="2026-08-04T10:00:00.000Z"
                disabled={action !== null}
                onChange={(event) => setEffectiveAtUtc(event.currentTarget.value)}
              />
            </div>
            <div>
              <label htmlFor="evidence-label">Epistemic label</label>
              <select
                id="evidence-label"
                value={epistemicLabel}
                disabled={action !== null}
                onChange={(event) =>
                  setEpistemicLabel(
                    event.currentTarget.value as CommitEvidenceRequest["epistemicLabel"]
                  )
                }
              >
                <option value="FACT">FACT - declared factual evidence</option>
                <option value="INFERENCE">INFERENCE - declared interpretation</option>
              </select>
            </div>
          </div>

          <label htmlFor="evidence-content">Evidence content</label>
          <textarea
            id="evidence-content"
            value={content}
            maxLength={262_144}
            rows={8}
            spellCheck={false}
            disabled={action !== null}
            onChange={(event) => {
              setContent(event.currentTarget.value);
              invalidatePreview();
            }}
          />

          <div className="form-actions">
            <button className="secondary-action secondary-action--neutral" type="submit" disabled={action !== null}>
              {action === "PREVIEW" ? "Previewing..." : "Preview redaction"}
            </button>
            <button
              className="primary-action"
              type="button"
              disabled={action !== null || !currentPreview}
              onClick={() => void importPreparedEvidence()}
            >
              {action === "IMPORT" ? "Importing..." : "Import Linked Evidence"}
            </button>
          </div>
        </form>

        {importError === null ? null : (
          <div className="action-error" role="alert" data-state="IMPORT_ERROR">
            <strong>Import not completed.</strong> {importError}
          </div>
        )}
        {importNotice === null ? null : (
          <div className="import-notice" role="status" aria-live="polite">
            <strong>Import complete.</strong> {importNotice}
          </div>
        )}

        {preview === null || !currentPreview ? null : (
          <section className="evidence-preview" aria-labelledby="preview-title">
            <div>
              <span className="state-label">REDACTED PREVIEW</span>
              <h3 id="preview-title">Prepared content</h3>
              <p>
                {preview.redaction.totalReplacements} replacement(s) across{" "}
                {preview.redaction.ruleCounts.length} rule(s). Not yet persisted.
              </p>
            </div>
            <pre>{preview.normalizedContent}</pre>
            <dl className="evidence-lines">
              <div><dt>Format</dt><dd>{preview.format}</dd></div>
              <div><dt>Input bytes</dt><dd>{preview.inputByteCount}</dd></div>
              <div><dt>Normalized bytes</dt><dd>{preview.normalizedByteCount}</dd></div>
              <div><dt>Content digest</dt><dd><code>{preview.contentDigest}</code></dd></div>
            </dl>
          </section>
        )}
      </section>

      {state.data.partial ? (
        <div className="scope-note" role="note">
          <strong>Bounded view</strong>
          <span>This screen shows the first 100 records in one or more collections.</span>
        </div>
      ) : null}

      <div className="evidence-layout">
        <section className="lineage-section lineage-section--sources" aria-labelledby="sources-title">
          <div className="section-heading">
            <p className="eyebrow">Immutable source records</p>
            <h2 id="sources-title">Linked Evidence sources</h2>
          </div>
          {sources.length === 0 ? (
            <div className="inline-state inline-state--empty" data-state="EMPTY">
              <span className="state-label">EMPTY</span>
              <strong>No Linked Evidence imported</strong>
              <p>Preview and import the first attributed source above.</p>
            </div>
          ) : (
            <ol className="source-list">
              {sources.map((source) => (
                <li key={source.evidenceSourceId}>
                  <article>
                    <header>
                      <div>
                        <span className={`epistemic-label epistemic-label--${source.epistemicLabel.toLowerCase()}`}>
                          {source.epistemicLabel}
                        </span>
                        <h3>{source.sourceLocator}</h3>
                      </div>
                      <code>{shortId(source.evidenceSourceId)}</code>
                    </header>
                    <dl className="record-facts">
                      <div><dt>Provenance</dt><dd><ProvenanceBadge origin={source.origin} /></dd></div>
                      <div><dt>Revision</dt><dd>{source.sourceRevision ?? "Not supplied"}</dd></div>
                      <div><dt>Recorded</dt><dd>{formatTime(source.recordedAtUtc)}</dd></div>
                      <div><dt>Effective</dt><dd>{source.effectiveAtUtc === undefined ? "Not supplied" : formatTime(source.effectiveAtUtc)}</dd></div>
                    </dl>
                    <details>
                      <summary>Inspect redacted normalized evidence</summary>
                      <pre>{source.prepared.normalizedContent}</pre>
                      <p className="digest-line"><strong>Digest</strong> <code>{source.prepared.contentDigest}</code></p>
                    </details>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="lineage-section" aria-labelledby="timeline-title">
          <div className="section-heading">
            <p className="eyebrow">Append-only lineage</p>
            <h2 id="timeline-title">Import timeline</h2>
          </div>
          {timeline.length === 0 ? (
            <div className="inline-state inline-state--empty" data-state="EMPTY">
              <span className="state-label">EMPTY</span>
              <strong>No timeline events</strong>
              <p>An import appends one mission-sequenced event.</p>
            </div>
          ) : (
            <ol className="timeline-list">
              {timeline.map((event) => (
                <li key={event.timelineEventId}>
                  <span className="timeline-sequence">#{event.sequence}</span>
                  <div>
                    <strong>EVIDENCE IMPORTED</strong>
                    <p>{formatTime(event.occurredAtUtc)}</p>
                    <code>{shortId(event.evidenceSourceId)}</code>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="claim-section" aria-labelledby="claims-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Structured evidence statements</p>
          <h2 id="claims-title">Claims and epistemic labels</h2>
          <p>Labels are declared metadata. This view does not choose a true or winning claim.</p>
        </div>
        {claims.length === 0 ? (
          <div className="inline-state inline-state--empty" data-state="EMPTY">
            <span className="state-label">EMPTY</span>
            <strong>No structured claims recorded</strong>
            <p>Imported evidence remains available without inventing claims from its content.</p>
          </div>
        ) : (
          <ol className="claim-list">
            {claims.map((claim) => (
              <li key={claim.claimId}>
                <article>
                  <header>
                    <span className={`epistemic-label epistemic-label--${claim.epistemicLabel.toLowerCase()}`}>
                      {claim.epistemicLabel}
                    </span>
                    <code>{shortId(claim.claimId)}</code>
                  </header>
                  <h3>{claim.subject} / {claim.predicate}</h3>
                  <blockquote>{claim.rawText}</blockquote>
                  <dl className="record-facts">
                    <div><dt>Value</dt><dd><code>{JSON.stringify(claim.value)}</code></dd></div>
                    <div><dt>Source revision</dt><dd>{claim.sourceRevision ?? "Not supplied"}</dd></div>
                    <div><dt>Recorded</dt><dd>{formatTime(claim.recordedAtUtc)}</dd></div>
                    <div><dt>Successor of</dt><dd>{claim.supersedesClaimId === undefined ? "No predecessor" : shortId(claim.supersedesClaimId)}</dd></div>
                  </dl>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="supersession-section" aria-labelledby="supersession-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Explicit correction lineage</p>
          <h2 id="supersession-title">Supersession history</h2>
          <p>Only persisted `SUPERSEDES` links appear; timestamps never imply correction.</p>
        </div>
        {supersessions.length === 0 ? (
          <div className="inline-state inline-state--empty" data-state="EMPTY">
            <span className="state-label">EMPTY</span>
            <strong>No supersession links recorded</strong>
            <p>No correction relationship has been declared for this Work Item.</p>
          </div>
        ) : (
          <ol className="supersession-list">
            {supersessions.map((link) => (
              <li key={link.claimSupersessionId}>
                <span className="epistemic-label epistemic-label--inference">SUPERSEDES</span>
                <strong>
                  <code>{shortId(link.predecessorClaimId)}</code>
                  <span aria-hidden="true"> -&gt; </span>
                  <code>{shortId(link.successorClaimId)}</code>
                </strong>
                <span>{formatTime(link.recordedAtUtc)}</span>
                <span>{link.epistemicLabel}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
