import { useEffect, useMemo, useState } from "react";

import type {
  CodeMapAssetResource,
  CodeMapEdgeResource,
  CodeMapRevisionSummaryResource
} from "@intelliloop/contracts";

import {
  listCodeMapAssets,
  listCodeMapEdges,
  listCodeMapRevisions,
  runCodeMapRevision
} from "./code-map-client";
import { WorkspaceClientError } from "./workspace-client";

export interface CodeMapWorkspaceProps {
  readonly missionId: string;
  readonly fetcher: typeof fetch;
  readonly onRefreshTwin: () => Promise<boolean>;
}

interface CodeMapViewData {
  readonly revisions: readonly CodeMapRevisionSummaryResource[];
  readonly selected: CodeMapRevisionSummaryResource;
  readonly assets: readonly CodeMapAssetResource[];
  readonly edges: readonly CodeMapEdgeResource[];
  readonly partial: boolean;
}

type CodeMapState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "integrity-error" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly data: CodeMapViewData };

function displayToken(value: string): string {
  return value.replaceAll("_", " ");
}

function formatTime(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local code-map workspace could not be loaded.";
}

function consistent(data: CodeMapViewData, missionId: string): boolean {
  if (
    data.selected.missionId !== missionId ||
    data.revisions.some((revision) => revision.missionId !== missionId) ||
    new Set(data.revisions.map((revision) => revision.revision)).size !==
      data.revisions.length ||
    new Set(data.assets.map((asset) => asset.assetId)).size !== data.assets.length ||
    new Set(data.edges.map((edge) => edge.edgeId)).size !== data.edges.length ||
    data.assets.some(
      (asset) => asset.evidenceKind !== data.selected.evidence.evidenceKind
    ) ||
    data.edges.some(
      (edge) => edge.evidenceKind !== data.selected.evidence.evidenceKind
    )
  ) {
    return false;
  }
  if (data.partial) return true;
  if (
    data.assets.length !== data.selected.assetCount ||
    data.edges.length !== data.selected.edgeCount
  ) {
    return false;
  }
  const assetIds = new Set(data.assets.map((asset) => asset.assetId));
  return data.edges.every(
    (edge) => assetIds.has(edge.fromAssetId) && assetIds.has(edge.toAssetId)
  );
}

export function CodeMapWorkspace({
  missionId,
  fetcher,
  onRefreshTwin
}: CodeMapWorkspaceProps): JSX.Element {
  const [state, setState] = useState<CodeMapState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedRevision, setSelectedRevision] = useState<number | undefined>();
  const [running, setRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      try {
        const response = await listCodeMapRevisions(
          missionId,
          fetcher,
          controller.signal
        );
        if (response.missionId !== missionId) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }
        if (response.revisions.length === 0) {
          if (!controller.signal.aborted) setState({ kind: "empty" });
          return;
        }
        const revision = selectedRevision ?? response.revisions[0]?.revision;
        const selected = response.revisions.find(
          (candidate) => candidate.revision === revision
        );
        if (selected === undefined) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }
        const [assetResponse, edgeResponse] = await Promise.all([
          listCodeMapAssets(
            missionId,
            selected.revision,
            fetcher,
            controller.signal
          ),
          listCodeMapEdges(
            missionId,
            selected.revision,
            fetcher,
            controller.signal
          )
        ]);
        const data: CodeMapViewData = {
          revisions: response.revisions,
          selected,
          assets: assetResponse.assets,
          edges: edgeResponse.edges,
          partial:
            response.page.nextCursor !== null ||
            assetResponse.page.nextCursor !== null ||
            edgeResponse.page.nextCursor !== null
        };
        if (
          assetResponse.missionId !== missionId ||
          edgeResponse.missionId !== missionId ||
          assetResponse.projectionRevision !== selected.revision ||
          edgeResponse.projectionRevision !== selected.revision ||
          !consistent(data, missionId)
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

  const sortedAssets = useMemo(
    () => state.kind === "ready"
      ? [...state.data.assets].sort((left, right) =>
          left.kind === right.kind
            ? (left.sourcePath ?? left.label).localeCompare(
                right.sourcePath ?? right.label
              )
            : left.kind.localeCompare(right.kind)
        )
      : [],
    [state]
  );

  async function runMap(): Promise<void> {
    setRunning(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await runCodeMapRevision(missionId, fetcher);
      setSelectedRevision(undefined);
      setAttempt((value) => value + 1);
      const twinUpdated = await onRefreshTwin();
      setNotice(
        `Code-map revision ${response.codeMapRevision.revision} ${
          response.created ? "persisted" : "already matched the repository"
        }. ${
          twinUpdated
            ? "The Impact Map was refreshed from that persisted code map."
            : "The code map is safe, but the Impact Map refresh needs to be retried above."
        }`
      );
    } catch (error) {
      if (
        error instanceof WorkspaceClientError &&
        error.code === "INTEGRITY_ERROR"
      ) {
        setState({ kind: "integrity-error" });
      } else {
        setActionError(
          `${safeMessage(error)} No declared fixture was substituted for this repository.`
        );
      }
    } finally {
      setRunning(false);
    }
  }

  const runButton = (
    <button
      className="primary-action"
      type="button"
      disabled={running}
      onClick={() => void runMap()}
    >
      {running ? "Mapping and refreshing Impact Map..." : "Map repository and refresh Impact Map"}
    </button>
  );

  return (
    <section className="code-map-workspace" aria-labelledby="code-map-title">
      <div className="section-heading section-heading--wide">
        <p className="eyebrow">Snapshot-bound static structure</p>
        <h2 id="code-map-title">Repository code map</h2>
        <p>
          Scan bounded TypeScript, JavaScript and JSON sources without executing
          repository code, then project the result into the Impact Map.
        </p>
      </div>

      <div className="scope-note" role="note" aria-label="Code-map authority boundary">
        <strong>Inference, not runtime truth</strong>
        <span>
          Static syntax can miss dynamic imports, aliases, wrappers and runtime routes.
          This accessible list is authoritative for the UI; no graph is shipped, so
          graph/list parity is not applicable.
        </span>
      </div>

      {actionError === null ? null : (
        <div className="action-error" role="alert">
          <strong>Code map not completed.</strong> {actionError}
        </div>
      )}
      {notice === null ? null : (
        <div className="import-notice" role="status">
          <strong>Code map updated.</strong> {notice}
        </div>
      )}

      {state.kind === "loading" ? (
        <div className="inline-state" role="status" aria-live="polite" aria-busy="true">
          <span className="state-label">LOADING</span>
          <strong>Verifying persisted code-map history</strong>
          <p>Checking snapshot bindings, evidence labels, assets and dependency paths.</p>
        </div>
      ) : state.kind === "integrity-error" ? (
        <div className="inline-state inline-state--error" role="alert" data-state="INTEGRITY_ERROR">
          <span className="state-label">INTEGRITY ERROR</span>
          <strong>Code-map history failed verification</strong>
          <p>No partial map is presented. Retry after the persisted history is inspected.</p>
          <button className="secondary-action" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry integrity check
          </button>
        </div>
      ) : state.kind === "error" ? (
        <div className="inline-state inline-state--error" role="alert">
          <span className="state-label">ERROR</span>
          <strong>Code-map workspace unavailable</strong>
          <p>{state.message}</p>
          <button className="secondary-action" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry code-map workspace
          </button>
        </div>
      ) : state.kind === "empty" ? (
        <div className="code-map-empty" data-state="EMPTY">
          <span className="state-label">NOT MAPPED</span>
          <h3>No persisted code-map revision exists</h3>
          <p>
            Run the map action for this Work Item after registering a controlled local Git
            repository. The default action uses static inference only and never silently
            substitutes declared fixture data.
          </p>
          {runButton}
        </div>
      ) : (
        <>
          <div className="code-map-controls">
            <label htmlFor="code-map-revision">
              Selected immutable code-map revision
              <select
                id="code-map-revision"
                value={state.data.selected.revision}
                disabled={running}
                onChange={(event) => setSelectedRevision(Number(event.currentTarget.value))}
              >
                {state.data.revisions.map((revision) => (
                  <option key={revision.revision} value={revision.revision}>
                    Revision {revision.revision} / {formatTime(revision.recordedAtUtc)}
                  </option>
                ))}
              </select>
            </label>
            {runButton}
          </div>

          <div className={`code-map-mode code-map-mode--${state.data.selected.evidence.evidenceKind === "STATIC_INFERENCE" ? "inferred" : "declared"}`} role="note">
            <span className="epistemic-label epistemic-label--inference">INFERENCE</span>
            <div>
              <strong>{displayToken(state.data.selected.evidence.evidenceKind)}</strong>
              <small>
                {displayToken(state.data.selected.evidence.inferenceStatus)} / {displayToken(state.data.selected.evidence.completeness)}
              </small>
            </div>
            <p>
              Bound to Git snapshot <code>{shortId(state.data.selected.snapshot.snapshotId)}</code>
              {state.data.selected.evidence.declaredManifestId === undefined
                ? null
                : <> / declared manifest <code>{state.data.selected.evidence.declaredManifestId}</code></>}
            </p>
          </div>

          {state.data.partial ? (
            <div className="partial-warning" role="status">
              <strong>PARTIAL PAGE</strong>
              <span>Only the bounded first page is displayed; verified revision metadata supplies the totals.</span>
            </div>
          ) : null}

          <dl className="count-grid code-map-counts" aria-label="Selected code-map summary">
            <div><dt>Revision</dt><dd>{state.data.selected.revision}</dd></div>
            <div><dt>Assets</dt><dd>{state.data.selected.assetCount}</dd></div>
            <div><dt>Paths</dt><dd>{state.data.selected.edgeCount}</dd></div>
            <div><dt>Completeness</dt><dd>{state.data.selected.evidence.completeness}</dd></div>
          </dl>

          <div className="code-map-columns">
            <section aria-labelledby="code-map-assets-title">
              <h3 id="code-map-assets-title">Attributed software assets</h3>
              {sortedAssets.length === 0 ? (
                <p className="empty-copy">This verified revision contains no recognized assets.</p>
              ) : (
                <ol className="code-map-asset-list">
                  {sortedAssets.map((asset) => (
                    <li key={asset.assetId}>
                      <span className="state-label">{asset.kind}</span>
                      <strong>{asset.label}</strong>
                      <code>{asset.sourcePath ?? `declared:${shortId(asset.assetId)}`}</code>
                      <small>Source digest {asset.sourceDigest}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section aria-labelledby="code-map-paths-title">
              <h3 id="code-map-paths-title">Explainable dependency paths</h3>
              {state.data.edges.length === 0 ? (
                <p className="empty-copy">No recognized dependency path exists in this revision.</p>
              ) : (
                <ol className="code-map-edge-list">
                  {state.data.edges.map((edge: CodeMapEdgeResource) => {
                    const from = state.data.assets.find((asset) => asset.assetId === edge.fromAssetId);
                    const to = state.data.assets.find((asset) => asset.assetId === edge.toAssetId);
                    return (
                      <li key={edge.edgeId}>
                        <span className="state-label">{displayToken(edge.kind)}</span>
                        <strong>{from?.label ?? shortId(edge.fromAssetId)}</strong>
                        <span aria-hidden="true">→</span>
                        <strong>{to?.label ?? shortId(edge.toAssetId)}</strong>
                        <small>
                          {from?.sourcePath ?? "Endpoint outside displayed page"} → {to?.sourcePath ?? "endpoint outside displayed page"}
                        </small>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
