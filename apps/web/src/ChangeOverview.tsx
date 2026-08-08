import { useEffect, useMemo, useState } from "react";

import type {
  GitSnapshotResource,
  MissionResource,
  ProjectResource,
  ReadinessAssessmentSummaryResource,
  RepositoryResource
} from "@intelliloop/contracts";

import {
  WorkspaceClientError,
  captureGitSnapshot,
  createMission,
  getProject,
  getRepository,
  listGitSnapshots,
  listMissions
} from "./workspace-client";
import { listReadinessAssessments } from "./readiness-passport-client";
import {
  PRODUCT_TERMS,
  OptionalMetadata,
  ReleaseCheckBadge,
  WorkflowStatusBadge
} from "./presentation";

export interface ChangeOverviewProps {
  readonly projectId: string;
  readonly fetcher: typeof fetch;
  readonly onMissionAvailable?: (missionId: string | undefined) => void;
  readonly onOpenEvidence?: (missionId: string) => void;
  readonly onOpenTwin?: (missionId: string) => void;
  readonly onOpenRisks?: (missionId: string) => void;
  readonly onOpenReleaseCheck?: (missionId: string) => void;
  readonly onOpenLocalPilot?: () => void;
}

interface OverviewData {
  readonly project: ProjectResource;
  readonly missions: readonly MissionResource[];
  readonly repository?: RepositoryResource;
  readonly snapshots: readonly GitSnapshotResource[];
  readonly releaseCheck?: ReadinessAssessmentSummaryResource;
}

type OverviewState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly data: OverviewData };

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local change overview could not be loaded.";
}

function formatTime(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function sortedSnapshots(
  snapshots: readonly GitSnapshotResource[]
): readonly GitSnapshotResource[] {
  return [...snapshots].sort((left, right) => {
    const byTime = right.capturedAtUtc.localeCompare(left.capturedAtUtc);
    return byTime === 0 ? right.snapshotId.localeCompare(left.snapshotId) : byTime;
  });
}

export function ChangeOverview({
  projectId,
  fetcher,
  onMissionAvailable,
  onOpenEvidence,
  onOpenTwin,
  onOpenRisks,
  onOpenReleaseCheck,
  onOpenLocalPilot
}: ChangeOverviewProps): JSX.Element {
  const [state, setState] = useState<OverviewState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [missionTitle, setMissionTitle] = useState("");
  const [action, setAction] = useState<"MISSION" | "SNAPSHOT" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      try {
        const [projectResponse, missionResponse, repository] = await Promise.all([
          getProject(projectId, fetcher, controller.signal),
          listMissions(projectId, fetcher, controller.signal),
          getRepository(projectId, fetcher, controller.signal).then(
            (response) => response.repository,
            (error: unknown) => {
              if (error instanceof WorkspaceClientError && error.code === "NOT_FOUND") {
                return undefined;
              }
              throw error;
            }
          )
        ]);
        const currentMission = missionResponse.missions.find(
          (mission) => mission.status === "CURRENT"
        );
        const [snapshots, assessments] = currentMission === undefined
          ? [[], []] as const
          : await Promise.all([
              listGitSnapshots(currentMission.missionId, fetcher, controller.signal)
                .then((response) => response.snapshots),
              listReadinessAssessments(currentMission.missionId, fetcher, controller.signal)
                .then((response) => response.assessments)
            ]);
        if (!controller.signal.aborted) {
          setState({
            kind: "ready",
            data: {
              project: projectResponse.project,
              missions: missionResponse.missions,
              ...(repository === undefined ? {} : { repository }),
              snapshots,
              ...(assessments[0] === undefined ? {} : { releaseCheck: assessments[0] })
            }
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ kind: "error", message: safeMessage(error) });
        }
      }
    })();
    return () => controller.abort();
  }, [attempt, fetcher, projectId]);

  const currentMission =
    state.kind === "ready"
      ? state.data.missions.find((mission) => mission.status === "CURRENT")
      : undefined;
  useEffect(() => {
    onMissionAvailable?.(currentMission?.missionId);
  }, [currentMission?.missionId, onMissionAvailable]);
  const snapshots = useMemo(
    () => (state.kind === "ready" ? sortedSnapshots(state.data.snapshots) : []),
    [state]
  );
  const latestSnapshot = snapshots[0];

  function refresh(): void {
    setActionError(null);
    setAttempt((value) => value + 1);
  }

  async function submitMission(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalized = missionTitle.trim();
    if (normalized.length < 1 || normalized.length > 160) {
      setActionError("Enter a Work Item title from 1 to 160 characters.");
      return;
    }
    setAction("MISSION");
    setActionError(null);
    try {
      await createMission(projectId, normalized, fetcher);
      setMissionTitle("");
      refresh();
    } catch (error) {
      setActionError(safeMessage(error));
    } finally {
      setAction(null);
    }
  }

  async function capture(): Promise<void> {
    if (currentMission === undefined) return;
    setAction("SNAPSHOT");
    setActionError(null);
    try {
      await captureGitSnapshot(currentMission.missionId, fetcher);
      refresh();
    } catch (error) {
      setActionError(safeMessage(error));
    } finally {
      setAction(null);
    }
  }

  if (state.kind === "loading") {
    return (
      <section className="overview-state" role="status" aria-live="polite" aria-busy="true">
        <span className="state-label">LOADING</span>
        <h1>Reading the Work Item overview</h1>
        <p>Waiting for Project, Work Item, repository and analyzed-commit records from the local API.</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="overview-state overview-state--error" role="alert">
        <span className="state-label">ERROR</span>
        <h1>Work Item overview unavailable</h1>
        <p>{state.message}</p>
        <button className="secondary-action" type="button" onClick={refresh}>
          Retry Work Item overview
        </button>
      </section>
    );
  }

  return (
    <div className="change-overview">
      <header className="overview-hero">
        <div>
          <p className="eyebrow">Current route / Work Item overview</p>
          <h1>{state.data.project.name}</h1>
          <p className="hero__lede">
            See the current Work Item, exact analyzed commit, independent workflow and Release Check, and the next useful action.
          </p>
        </div>
        <div className="status-axis-card" role="group" aria-label="Work Item status summary">
          <div><span>Workflow Status</span><WorkflowStatusBadge /></div>
          <div><span>Release Check</span><ReleaseCheckBadge status={state.data.releaseCheck?.currentStatus} /></div>
        </div>
      </header>

      <div className="scope-note" role="note" aria-label="Observation boundary">
        <strong>Observation only</strong>
        <span>
          This screen reports persisted local state. No requirement, validation,
          approval, workflow status, or release decision has been inferred.
        </span>
      </div>

      {actionError === null ? null : (
        <div className="action-error" role="alert">
          <strong>Action not completed.</strong> {actionError}
        </div>
      )}

      <div className="overview-grid">
        <section className="workspace-card" aria-labelledby="mission-title">
          <div className="card-heading">
            <span className="card-index">01</span>
            <div>
              <p className="eyebrow">Change scope</p>
              <h2 id="mission-title">Current {PRODUCT_TERMS.changeMission}</h2>
            </div>
          </div>
          {currentMission === undefined ? (
            <form className="stack-form" onSubmit={(event) => void submitMission(event)}>
              <p className="empty-copy">No current Work Item exists. Define one real change scope.</p>
              <label htmlFor="mission-name">Work Item title</label>
              <input
                id="mission-name"
                value={missionTitle}
                onChange={(event) => setMissionTitle(event.currentTarget.value)}
                maxLength={160}
                autoComplete="off"
                disabled={action !== null}
              />
              <button className="primary-action" type="submit" disabled={action !== null}>
                {action === "MISSION" ? "Creating…" : "Create Work Item"}
              </button>
            </form>
          ) : (
            <>
              <dl className="record-facts">
                <div><dt>Workflow Status</dt><dd><WorkflowStatusBadge /></dd></div>
                <div><dt>Title</dt><dd>{currentMission.title}</dd></div>
                <div><dt>Work Item Type</dt><dd><OptionalMetadata /></dd></div>
                <div><dt>Work Item Key</dt><dd><code>{currentMission.missionId}</code></dd></div>
                <div><dt>Release Check</dt><dd><ReleaseCheckBadge status={state.data.releaseCheck?.currentStatus} /></dd></div>
                <div><dt>Priority</dt><dd><OptionalMetadata /></dd></div>
                <div><dt>Assignee</dt><dd><OptionalMetadata /></dd></div>
                <div><dt>Reporter</dt><dd><OptionalMetadata /></dd></div>
                <div><dt>Labels</dt><dd><OptionalMetadata /></dd></div>
                <div><dt>Component</dt><dd><OptionalMetadata /></dd></div>
                <div><dt>Sprint</dt><dd><OptionalMetadata fallback="Not available" /></dd></div>
                <div><dt>Fix version</dt><dd><OptionalMetadata /></dd></div>
              </dl>
              {onOpenEvidence === undefined ? null : (
                <button
                  className="secondary-action secondary-action--neutral card-route-action"
                  type="button"
                  onClick={() => onOpenEvidence(currentMission.missionId)}
                >
                  Open Linked Evidence
                </button>
              )}
              {onOpenTwin === undefined ? null : (
                <button
                  className="secondary-action secondary-action--neutral card-route-action"
                  type="button"
                  onClick={() => onOpenTwin(currentMission.missionId)}
                >
                  Open Impact Map
                </button>
              )}
              {onOpenRisks === undefined ? null : (
                <button
                  className="secondary-action secondary-action--neutral card-route-action"
                  type="button"
                  onClick={() => onOpenRisks(currentMission.missionId)}
                >
                  Open Risks &amp; Checks
                </button>
              )}
              {onOpenReleaseCheck === undefined ? null : (
                <button
                  className="primary-action card-route-action"
                  type="button"
                  onClick={() => onOpenReleaseCheck(currentMission.missionId)}
                >
                  {state.data.releaseCheck?.currentStatus === "BLOCKED"
                    ? "Review Not Ready result"
                    : state.data.releaseCheck?.currentStatus === "STALE"
                      ? "Run Release Check again"
                      : state.data.releaseCheck?.currentStatus === "READY"
                        ? "Review Release Evidence Report"
                        : "Run first Release Check"}
                </button>
              )}
            </>
          )}
        </section>

        <section className="workspace-card" aria-labelledby="repository-title">
          <div className="card-heading">
            <span className="card-index">02</span>
            <div>
              <p className="eyebrow">Controlled source</p>
              <h2 id="repository-title">Repository</h2>
            </div>
          </div>
          {state.data.repository === undefined ? (
            <div className="stack-form">
              <p className="empty-copy">
                Repository registration is available only through the server-gated Local Project Pilot.
              </p>
              {onOpenLocalPilot === undefined ? null : (
                <button className="primary-action" type="button" onClick={onOpenLocalPilot}>
                  Open Local Project Pilot
                </button>
              )}
            </div>
          ) : (
            <dl className="record-facts">
              <div><dt>Kind</dt><dd>Local Git</dd></div>
              <div><dt>Access</dt><dd>{state.data.repository.accessMode.replace("_", " ")}</dd></div>
              <div><dt>Registered</dt><dd>{formatTime(state.data.repository.registeredAtUtc)}</dd></div>
              <div><dt>Registration ID</dt><dd><code>{shortId(state.data.repository.registrationId)}</code></dd></div>
            </dl>
          )}
        </section>

        <section className="workspace-card workspace-card--snapshot" aria-labelledby="snapshot-title">
          <div className="card-heading card-heading--action">
            <span className="card-index">03</span>
            <div>
              <p className="eyebrow">Attributed Git truth</p>
              <h2 id="snapshot-title">{PRODUCT_TERMS.repositorySnapshot}</h2>
            </div>
            <button
              className="primary-action"
              type="button"
              onClick={() => void capture()}
              disabled={
                action !== null ||
                currentMission === undefined ||
                state.data.repository === undefined
              }
            >
              {action === "SNAPSHOT" ? "Capturing…" : "Analyze current commit"}
            </button>
          </div>

          {currentMission === undefined || state.data.repository === undefined ? (
            <div className="inline-state inline-state--empty" data-state="EMPTY">
              <span className="state-label">WAITING</span>
              <strong>Work Item and repository required</strong>
              <p>Create the current Work Item and register its Project repository first.</p>
            </div>
          ) : latestSnapshot === undefined ? (
            <div className="inline-state inline-state--empty" data-state="EMPTY">
              <span className="state-label">EMPTY</span>
              <strong>No commit analyzed</strong>
              <p>Analysis reads Git identity and status without writing to the repository.</p>
            </div>
          ) : (
            <>
              <div className="snapshot-summary">
                <div className="snapshot-identity">
                  <span className={`observation-state observation-state--${latestSnapshot.dirty ? "dirty" : "clean"}`}>
                    {latestSnapshot.dirty ? "DIRTY OBSERVATION" : "CLEAN OBSERVATION"}
                  </span>
                  <h3>
                    {latestSnapshot.headState === "DETACHED"
                      ? "Detached HEAD"
                      : (latestSnapshot.branchName ?? latestSnapshot.headState)}
                  </h3>
                  <p>{latestSnapshot.headState} · Captured {formatTime(latestSnapshot.capturedAtUtc)}</p>
                </div>
                <dl className="count-grid">
                  <div><dt>Changed</dt><dd>{latestSnapshot.changedFileCount}</dd></div>
                  <div><dt>Index</dt><dd>{latestSnapshot.indexChangeCount}</dd></div>
                  <div><dt>Worktree</dt><dd>{latestSnapshot.worktreeChangeCount}</dd></div>
                  <div><dt>Untracked</dt><dd>{latestSnapshot.untrackedFileCount}</dd></div>
                </dl>
              </div>
              <dl className="evidence-lines">
                <div>
                  <dt>HEAD commit</dt>
                  <dd><code>{latestSnapshot.headCommit ?? "No commit — unborn branch"}</code></dd>
                </div>
                <div>
                  <dt>Changed-file digest</dt>
                  <dd><code>{latestSnapshot.changedFilesDigest}</code></dd>
                </div>
                <div>
                  <dt>Snapshot ID</dt>
                  <dd><code>{latestSnapshot.snapshotId}</code></dd>
                </div>
              </dl>
              <p className="not-readiness" role="note">
                <strong>Not a Release Check.</strong> This observation does not prove tests,
                requirements, review, or release safety.
              </p>
            </>
          )}
        </section>
      </div>

      {snapshots.length > 1 ? (
        <section className="history-strip" aria-labelledby="history-title">
          <div>
            <p className="eyebrow">Immutable history</p>
            <h2 id="history-title">Earlier observations</h2>
          </div>
          <ol>
            {snapshots.slice(1).map((snapshot) => (
              <li key={snapshot.snapshotId}>
                <span>{formatTime(snapshot.capturedAtUtc)}</span>
                <strong>{snapshot.headState}</strong>
                <span>{snapshot.changedFileCount} changed</span>
                <code>{shortId(snapshot.snapshotId)}</code>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
