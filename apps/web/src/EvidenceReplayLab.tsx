import { useState } from "react";

import type { TwinRevisionSummaryResource } from "@intelliloop/contracts";

import {
  compareTwinRevisions,
  type EvidenceReplayComparison,
  type ReplayMemberSnapshot
} from "./evidence-replay";
import { listTwinNodes, listTwinRelationships } from "./twin-client";
import { WorkspaceClientError } from "./workspace-client";

export interface EvidenceReplayLabProps {
  readonly missionId: string;
  readonly revisions: readonly TwinRevisionSummaryResource[];
  readonly historyIsPartial: boolean;
  readonly fetcher: typeof fetch;
}

type ReplayState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly comparison: EvidenceReplayComparison }
  | { readonly kind: "error"; readonly message: string };

function formatCitation(
  stage: "Baseline" | "Candidate",
  snapshot: ReplayMemberSnapshot | undefined
): JSX.Element | null {
  if (snapshot === undefined) return null;
  return (
    <div>
      <dt>{stage} citation</dt>
      <dd><code>{snapshot.pathCitation}</code></dd>
    </div>
  );
}

function safeMessage(error: unknown): string {
  if (error instanceof WorkspaceClientError && error.code === "INTEGRITY_ERROR") {
    return "A selected immutable revision failed integrity verification.";
  }
  if (error instanceof TypeError) return error.message;
  return "The read-only replay comparison could not be completed.";
}

export function EvidenceReplayLab({
  missionId,
  revisions,
  historyIsPartial,
  fetcher
}: EvidenceReplayLabProps): JSX.Element {
  const [baselineRevision, setBaselineRevision] = useState(
    revisions[1]?.revision ?? revisions[0]?.revision ?? 0
  );
  const [candidateRevision, setCandidateRevision] = useState(
    revisions[0]?.revision ?? 0
  );
  const [state, setState] = useState<ReplayState>({ kind: "idle" });

  const canCompare =
    !historyIsPartial &&
    revisions.length >= 2 &&
    baselineRevision !== candidateRevision;

  async function compare(): Promise<void> {
    const baseline = revisions.find((revision) => revision.revision === baselineRevision);
    const candidate = revisions.find((revision) => revision.revision === candidateRevision);
    if (!canCompare || baseline === undefined || candidate === undefined) return;

    setState({ kind: "loading" });
    try {
      const [baselineNodes, baselineRelationships, candidateNodes, candidateRelationships] =
        await Promise.all([
          listTwinNodes(missionId, baseline.revision, fetcher),
          listTwinRelationships(missionId, baseline.revision, fetcher),
          listTwinNodes(missionId, candidate.revision, fetcher),
          listTwinRelationships(missionId, candidate.revision, fetcher)
        ]);
      const responses = [
        baselineNodes,
        baselineRelationships,
        candidateNodes,
        candidateRelationships
      ];
      if (
        responses.some(
          (response) =>
            response.missionId !== missionId || response.page.nextCursor !== null
        ) ||
        baselineNodes.projectionRevision !== baseline.revision ||
        baselineRelationships.projectionRevision !== baseline.revision ||
        candidateNodes.projectionRevision !== candidate.revision ||
        candidateRelationships.projectionRevision !== candidate.revision
      ) {
        throw new TypeError("Evidence Replay requires complete, correctly scoped revision pages.");
      }

      setState({
        kind: "ready",
        comparison: compareTwinRevisions({
          baseline: {
            revision: baseline,
            nodes: baselineNodes.nodes,
            relationships: baselineRelationships.relationships
          },
          candidate: {
            revision: candidate,
            nodes: candidateNodes.nodes,
            relationships: candidateRelationships.relationships
          }
        })
      });
    } catch (error) {
      setState({ kind: "error", message: safeMessage(error) });
    }
  }

  return (
    <section className="replay-lab" aria-labelledby="replay-lab-title" data-feature="experiments.evidenceReplay">
      <header className="section-heading section-heading--wide">
        <p className="eyebrow">Optional stretch / read-only</p>
        <h2 id="replay-lab-title">Evidence Replay Lab</h2>
        <p>
          Compare two immutable Twin revisions using canonical member digests and exact
          persisted path citations. The comparison performs GET requests only and cannot
          alter evidence, findings, readiness or Passport state.
        </p>
      </header>

      {revisions.length < 2 ? (
        <div className="replay-lab__notice" role="status">
          Two immutable Twin revisions are required. Materialize a changed successor first.
        </div>
      ) : (
        <div className="replay-lab__controls">
          <label htmlFor="replay-baseline">
            Baseline revision
            <select
              id="replay-baseline"
              value={baselineRevision}
              onChange={(event) => {
                setBaselineRevision(Number(event.currentTarget.value));
                setState({ kind: "idle" });
              }}
            >
              {revisions.map((revision) => (
                <option key={revision.revision} value={revision.revision}>Revision {revision.revision}</option>
              ))}
            </select>
          </label>
          <label htmlFor="replay-candidate">
            Candidate revision
            <select
              id="replay-candidate"
              value={candidateRevision}
              onChange={(event) => {
                setCandidateRevision(Number(event.currentTarget.value));
                setState({ kind: "idle" });
              }}
            >
              {revisions.map((revision) => (
                <option key={revision.revision} value={revision.revision}>Revision {revision.revision}</option>
              ))}
            </select>
          </label>
          <button
            className="primary-action"
            type="button"
            disabled={!canCompare || state.kind === "loading"}
            onClick={() => void compare()}
          >
            {state.kind === "loading" ? "Comparing..." : "Compare immutable revisions"}
          </button>
        </div>
      )}

      {historyIsPartial ? (
        <div className="partial-warning" role="alert">
          <strong>COMPARISON WITHHELD</strong>
          <span>The revision history or member page is partial; no incomplete diff is presented.</span>
        </div>
      ) : baselineRevision === candidateRevision && revisions.length >= 2 ? (
        <div className="replay-lab__notice" role="status">Choose two different immutable revisions.</div>
      ) : null}

      {state.kind === "error" ? (
        <div className="action-error" role="alert"><strong>Replay withheld.</strong> {state.message}</div>
      ) : null}
      {state.kind === "ready" ? (
        <div className="replay-lab__result" role="region" aria-label="Evidence Replay comparison result">
          <div className="scope-note" role="note">
            <strong>ADVISORY COMPARISON ONLY</strong>
            <span>Revision {state.comparison.baseline.revision} → {state.comparison.candidate.revision}; no canonical state changed.</span>
          </div>
          <dl className="count-grid">
            <div><dt>Added</dt><dd>{state.comparison.addedCount}</dd></div>
            <div><dt>Removed</dt><dd>{state.comparison.removedCount}</dd></div>
            <div><dt>Changed</dt><dd>{state.comparison.changedCount}</dd></div>
            <div><dt>Unchanged</dt><dd>{state.comparison.unchangedMemberCount}</dd></div>
          </dl>
          {state.comparison.differences.length === 0 ? (
            <p className="replay-lab__notice">The selected revisions have identical canonical members.</p>
          ) : (
            <ol className="replay-lab__differences">
              {state.comparison.differences.map((difference) => (
                <li key={`${difference.memberKind}:${difference.memberId}`}>
                  <header>
                    <span className="state-label">{difference.change}</span>
                    <strong>{difference.memberKind} / <code>{difference.memberId}</code></strong>
                  </header>
                  <dl className="evidence-lines">
                    {formatCitation("Baseline", difference.baseline)}
                    {formatCitation("Candidate", difference.candidate)}
                    {difference.baseline === undefined ? null : (
                      <div><dt>Baseline digest</dt><dd><code>{difference.baseline.memberDigest}</code></dd></div>
                    )}
                    {difference.candidate === undefined ? null : (
                      <div><dt>Candidate digest</dt><dd><code>{difference.candidate.memberDigest}</code></dd></div>
                    )}
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}
