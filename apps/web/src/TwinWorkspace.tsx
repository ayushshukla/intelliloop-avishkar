import { useEffect, useMemo, useState } from "react";

import type {
  MissionResource,
  TwinNodeResource,
  TwinRelationshipResource,
  TwinRevisionSummaryResource
} from "@intelliloop/contracts";

import {
  listTwinNodes,
  listTwinRelationships,
  listTwinRevisions,
  materializeTwinRevision
} from "./twin-client";
import { WorkspaceClientError, getMission } from "./workspace-client";
import { CodeMapWorkspace } from "./CodeMapWorkspace";
import { EvidenceReplayLab } from "./EvidenceReplayLab";
import { WEB_FEATURE_FLAGS } from "./feature-flags";
import { PRODUCT_TERMS, ProvenanceBadge } from "./presentation";

export interface TwinWorkspaceProps {
  readonly missionId: string;
  readonly fetcher: typeof fetch;
  readonly onProjectAvailable?: (projectId: string) => void;
  readonly onOpenEvidence?: (missionId: string) => void;
  readonly onOpenReconciliation?: (missionId: string) => void;
}

interface TwinViewData {
  readonly mission: MissionResource;
  readonly revisions: readonly TwinRevisionSummaryResource[];
  readonly selected: TwinRevisionSummaryResource;
  readonly nodes: readonly TwinNodeResource[];
  readonly relationships: readonly TwinRelationshipResource[];
  readonly partial: boolean;
}

type TwinViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty"; readonly mission: MissionResource }
  | { readonly kind: "integrity-error" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly data: TwinViewData };

function displayToken(value: string): string {
  return value.replaceAll("_", " ");
}

function formatTime(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function isConsistent(data: TwinViewData): boolean {
  const { mission, revisions, selected, nodes, relationships, partial } = data;
  if (
    selected.missionId !== mission.missionId ||
    selected.projectId !== mission.projectId ||
    revisions.some(
      (revision) =>
        revision.missionId !== mission.missionId ||
        revision.projectId !== mission.projectId
    ) ||
    new Set(revisions.map((revision) => revision.revision)).size !==
      revisions.length ||
    new Set(nodes.map((node) => node.nodeId)).size !== nodes.length ||
    new Set(relationships.map((relationship) => relationship.relationshipId))
      .size !== relationships.length
  ) {
    return false;
  }
  if (
    !partial &&
    (nodes.length !== selected.nodeCount ||
      relationships.length !== selected.relationshipCount)
  ) {
    return false;
  }
  if (partial) return true;
  const nodeRevisions = new Set(
    nodes.map((node) => `${node.nodeId}:${node.nodeRevision}`)
  );
  return relationships.every(
    (relationship) =>
      nodeRevisions.has(
        `${relationship.from.nodeId}:${relationship.from.nodeRevision}`
      ) &&
      nodeRevisions.has(
        `${relationship.to.nodeId}:${relationship.to.nodeRevision}`
      )
  );
}

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local Impact Map could not be loaded.";
}

export function TwinWorkspace({
  missionId,
  fetcher,
  onProjectAvailable,
  onOpenEvidence,
  onOpenReconciliation
}: TwinWorkspaceProps): JSX.Element {
  const [state, setState] = useState<TwinViewState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedRevision, setSelectedRevision] = useState<number | undefined>();
  const [materializing, setMaterializing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      try {
        const [missionResponse, revisionResponse] = await Promise.all([
          getMission(missionId, fetcher, controller.signal),
          listTwinRevisions(missionId, fetcher, controller.signal)
        ]);
        const mission = missionResponse.mission;
        if (
          mission.missionId !== missionId ||
          revisionResponse.missionId !== missionId ||
          revisionResponse.revisions.some(
            (revision) => revision.projectId !== mission.projectId
          )
        ) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }
        if (revisionResponse.revisions.length === 0) {
          if (!controller.signal.aborted) setState({ kind: "empty", mission });
          return;
        }
        const revision =
          selectedRevision ?? revisionResponse.revisions[0]?.revision;
        const selected = revisionResponse.revisions.find(
          (candidate) => candidate.revision === revision
        );
        if (selected === undefined) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }
        const [nodeResponse, relationshipResponse] = await Promise.all([
          listTwinNodes(missionId, selected.revision, fetcher, controller.signal),
          listTwinRelationships(
            missionId,
            selected.revision,
            fetcher,
            controller.signal
          )
        ]);
        const data: TwinViewData = {
          mission,
          revisions: revisionResponse.revisions,
          selected,
          nodes: nodeResponse.nodes,
          relationships: relationshipResponse.relationships,
          partial:
            revisionResponse.page.nextCursor !== null ||
            nodeResponse.page.nextCursor !== null ||
            relationshipResponse.page.nextCursor !== null
        };
        if (
          nodeResponse.missionId !== missionId ||
          relationshipResponse.missionId !== missionId ||
          nodeResponse.projectionRevision !== selected.revision ||
          relationshipResponse.projectionRevision !== selected.revision ||
          !isConsistent(data)
        ) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }
        if (!controller.signal.aborted) setState({ kind: "ready", data });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          error instanceof WorkspaceClientError &&
          (error.code === "INTEGRITY_ERROR" ||
            error.code === "INVALID_RESPONSE")
        ) {
          setState({ kind: "integrity-error" });
        } else {
          setState({ kind: "error", message: safeMessage(error) });
        }
      }
    })();
    return () => controller.abort();
  }, [attempt, fetcher, missionId, selectedRevision]);

  useEffect(() => {
    if (state.kind === "ready") {
      onProjectAvailable?.(state.data.mission.projectId);
    } else if (state.kind === "empty") {
      onProjectAvailable?.(state.mission.projectId);
    }
  }, [onProjectAvailable, state]);

  const nodes = useMemo(
    () =>
      state.kind === "ready"
        ? [...state.data.nodes].sort((left, right) =>
            left.nodeType === right.nodeType
              ? left.nodeId.localeCompare(right.nodeId)
              : left.nodeType.localeCompare(right.nodeType)
          )
        : [],
    [state]
  );

  function refresh(): void {
    setAttempt((value) => value + 1);
  }

  async function materialize(): Promise<boolean> {
    setMaterializing(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await materializeTwinRevision(missionId, fetcher);
      setNotice(
        response.created
          ? `Impact Map revision ${response.twinRevision.revision} materialized from persisted sources.`
          : `Impact Map revision ${response.twinRevision.revision} already represents the current persisted sources.`
      );
      setSelectedRevision(undefined);
      refresh();
      return true;
    } catch (error) {
      if (
        error instanceof WorkspaceClientError &&
        error.code === "INTEGRITY_ERROR"
      ) {
        setState({ kind: "integrity-error" });
      } else {
        setActionError(safeMessage(error));
      }
      return false;
    } finally {
      setMaterializing(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <section className="overview-state" role="status" aria-live="polite" aria-busy="true">
        <span className="state-label">LOADING</span>
        <h1>Reading persisted Impact Map history</h1>
        <p>Verifying revision metadata, attributed nodes, relationships and path citations.</p>
      </section>
    );
  }

  if (state.kind === "integrity-error") {
    return (
      <section className="overview-state overview-state--error" role="alert" data-state="INTEGRITY_ERROR">
        <span className="state-label">INTEGRITY ERROR</span>
        <h1>Impact Map history failed verification</h1>
        <p>
          Stored canonical history or its API projection did not preserve the expected
          Work Item, digest, member or endpoint contract. No partial Impact Map is presented.
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
        <h1>Impact Map unavailable</h1>
        <p>{state.message}</p>
        <button className="secondary-action" type="button" onClick={refresh}>
          Retry Impact Map
        </button>
      </section>
    );
  }

  const mission = state.kind === "empty" ? state.mission : state.data.mission;

  return (
    <div className="twin-workspace">
      <header className="overview-hero">
        <div>
          <p className="eyebrow">Current route / {PRODUCT_TERMS.activeSoftwareTwin}</p>
          <h1>{mission.title}</h1>
          <p className="hero__lede">
            Trace the exact Work Item through immutable evidence, code, validation and dependency relationships.
          </p>
          <div className="route-actions">
            {onOpenEvidence === undefined ? null : (
              <button
                className="secondary-action secondary-action--neutral"
                type="button"
                onClick={() => onOpenEvidence(missionId)}
              >
                Return to Linked Evidence
              </button>
            )}
            {onOpenReconciliation === undefined ? null : (
              <button
                className="secondary-action secondary-action--neutral"
                type="button"
                onClick={() => onOpenReconciliation(missionId)}
              >
                Open Resolve Conflicts
              </button>
            )}
          </div>
        </div>
        <div className="truth-badge" role="note" aria-label="Impact Map authority status">
          <span>Authority</span>
          <strong>ATTRIBUTED PROJECTION</strong>
          <small>Not truth selection or release readiness</small>
        </div>
      </header>

      <div className="scope-note" role="note" aria-label="Impact Map trust boundary">
        <strong>Immutable and cited</strong>
        <span>
          Every displayed member belongs to the selected persisted revision. A FACT label,
          relationship or invalidation does not establish correctness or approval.
        </span>
      </div>

      {actionError === null ? null : (
        <div className="action-error" role="alert">
          <strong>Materialization not completed.</strong> {actionError}
        </div>
      )}
      {notice === null ? null : (
        <div className="import-notice" role="status"><strong>Projection updated.</strong> {notice}</div>
      )}

      {state.kind === "empty" ? (
        <section className="twin-empty" data-state="EMPTY" aria-labelledby="twin-empty-title">
          <span className="state-label">EMPTY</span>
          <h2 id="twin-empty-title">No persisted Impact Map revision exists</h2>
          <p>
            Materialize the current Project, Work Item, Linked Evidence, claims and analyzed commits.
            No sample nodes will be substituted.
          </p>
          <button
            className="primary-action"
            type="button"
            disabled={materializing}
            onClick={() => void materialize()}
          >
            {materializing ? "Materializing..." : "Materialize current sources"}
          </button>
        </section>
      ) : (
        <>
          <section className="twin-controls" aria-labelledby="twin-revision-title">
            <div>
              <p className="eyebrow">Historical selector</p>
              <h2 id="twin-revision-title">Impact Map revision</h2>
            </div>
            <label htmlFor="twin-revision">Selected immutable revision</label>
            <select
              id="twin-revision"
              value={state.data.selected.revision}
              disabled={materializing}
              onChange={(event) => setSelectedRevision(Number(event.currentTarget.value))}
            >
              {state.data.revisions.map((revision) => (
                <option key={revision.revision} value={revision.revision}>
                  Revision {revision.revision} / {formatTime(revision.recordedAtUtc)}
                </option>
              ))}
            </select>
            <button
              className="primary-action"
              type="button"
              disabled={materializing}
              onClick={() => void materialize()}
            >
              {materializing ? "Materializing..." : "Materialize current sources"}
            </button>
          </section>

          {state.data.partial ? (
            <div className="partial-warning" role="status">
              <strong>PARTIAL PAGE</strong>
              <span>Only the bounded first page is displayed; totals come from verified revision metadata.</span>
            </div>
          ) : null}

          <section className="twin-summary" aria-label="Selected Impact Map revision summary">
            <dl className="count-grid">
              <div><dt>Revision</dt><dd>{state.data.selected.revision}</dd></div>
              <div><dt>Nodes</dt><dd>{state.data.selected.nodeCount}</dd></div>
              <div><dt>Relationships</dt><dd>{state.data.selected.relationshipCount}</dd></div>
              <div><dt>Invalidations</dt><dd>{state.data.selected.invalidationCount}</dd></div>
            </dl>
            <p className="digest-line">
              Projection digest <code>{state.data.selected.projectionDigest}</code>
            </p>
          </section>

          <section className="twin-node-section" aria-labelledby="twin-node-title">
            <div className="section-heading section-heading--wide">
              <p className="eyebrow">Authoritative list projection</p>
              <h2 id="twin-node-title">Attributed Impact Map nodes</h2>
              <p>Each card cites the exact logical path and source digest persisted in this revision.</p>
            </div>
            <ol className="twin-node-list">
              {nodes.map((node) => (
                <li key={node.nodeId}>
                  <article>
                    <header>
                      <div>
                        <span className="state-label">{displayToken(node.nodeType)}</span>
                        <h3>{shortId(node.nodeId)}</h3>
                      </div>
                      <span className={`epistemic-label epistemic-label--${node.attribution.epistemicLabel.toLowerCase()}`}>
                        {node.attribution.epistemicLabel}
                      </span>
                    </header>
                    <dl className="evidence-lines">
                      <div><dt>Attributed path</dt><dd><code>{node.attribution.pathCitation}</code></dd></div>
                      <div><dt>Node revision</dt><dd>{node.nodeRevision}</dd></div>
                      <div><dt>Source</dt><dd>{node.source.sourceType} / <code>{shortId(node.source.sourceId)}</code></dd></div>
                      <div><dt>Source digest</dt><dd><code>{node.source.sourceDigest}</code></dd></div>
                      <div><dt>Canonical member digest</dt><dd><code>{node.memberDigest}</code></dd></div>
                      <div><dt>Provenance</dt><dd><ProvenanceBadge origin={node.attribution.origin} /></dd></div>
                      <div><dt>Recorded</dt><dd>{formatTime(node.attribution.recordedAtUtc)}</dd></div>
                    </dl>
                  </article>
                </li>
              ))}
            </ol>
          </section>

          <section className="twin-relationship-section" aria-labelledby="twin-relationship-title">
            <div className="section-heading section-heading--wide">
              <p className="eyebrow">Exact endpoint revisions</p>
              <h2 id="twin-relationship-title">Relationships</h2>
            </div>
            <details>
              <summary>Inspect {state.data.relationships.length} displayed relationships</summary>
              <ol className="twin-relationship-list">
                {state.data.relationships.map((relationship) => (
                  <li key={relationship.relationshipId}>
                    <strong>{displayToken(relationship.relationshipType)}</strong>
                    <code>{shortId(relationship.from.nodeId)} r{relationship.from.nodeRevision}</code>
                    <span aria-hidden="true">-&gt;</span>
                    <code>{shortId(relationship.to.nodeId)} r{relationship.to.nodeRevision}</code>
                    <small>{relationship.attribution.pathCitation}</small>
                  </li>
                ))}
              </ol>
            </details>
          </section>
          {WEB_FEATURE_FLAGS.evidenceReplay ? (
            <EvidenceReplayLab
              missionId={missionId}
              revisions={state.data.revisions}
              historyIsPartial={state.data.partial}
              fetcher={fetcher}
            />
          ) : null}
        </>
      )}
      <CodeMapWorkspace
        missionId={missionId}
        fetcher={fetcher}
        onRefreshTwin={materialize}
      />
    </div>
  );
}
