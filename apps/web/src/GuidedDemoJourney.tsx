import { useEffect, useMemo, useState } from "react";

import type {
  DemoWorkspaceResource,
  GitSnapshotResource
} from "@intelliloop/contracts";

import { getDemoWorkspace } from "./demo-client";
import {
  WorkflowStatusBadge,
  ReleaseCheckBadge
} from "./presentation";
import {
  WorkspaceClientError,
  getMission,
  getProject,
  getRepository,
  listGitSnapshots
} from "./workspace-client";

export interface DemoJourneyContext {
  readonly projectName: string;
  readonly workItemTitle: string;
  readonly repositoryLabel: string;
  readonly branchOrRef?: string;
  readonly currentCommit?: string;
  readonly assessedCommit?: string;
  readonly capturedAtUtc?: string;
}

type ContextState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly context: DemoJourneyContext };

type JourneyState = "CURRENT" | "COMPLETE" | "ATTENTION" | "WAITING";

const STEPS = [
  {
    label: "Work Item",
    meaning: "Confirm the change scope and exact repository context."
  },
  {
    label: "Linked Evidence",
    meaning: "Inspect attributed requirements, decisions and validation inputs."
  },
  {
    label: "Impact Map",
    meaning: "Trace the source-free software impact bound to the analyzed commit."
  },
  {
    label: "Resolve Conflicts",
    meaning: "Review cited contradictions, missing support and affected paths."
  },
  {
    label: "Release Check",
    meaning: "Read the stored deterministic assessment and its next action."
  },
  {
    label: "Release Evidence Report",
    meaning: "Inspect the unsigned projection of one stored assessment."
  }
] as const;

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The guided demo context could not be loaded from the local API.";
}

function formatTime(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function sortedSnapshots(
  snapshots: readonly GitSnapshotResource[]
): readonly GitSnapshotResource[] {
  return [...snapshots].sort((left, right) => {
    const byTime = right.capturedAtUtc.localeCompare(left.capturedAtUtc);
    return byTime === 0
      ? right.snapshotId.localeCompare(left.snapshotId)
      : byTime;
  });
}

function stepPaths(workspace: DemoWorkspaceResource): readonly string[] {
  if (workspace.status !== "READY") return [];
  const projectId = workspace.projectId;
  const missionId = workspace.missionId;
  return [
    `/projects/${projectId}`,
    `/missions/${missionId}/evidence`,
    `/missions/${missionId}/twin`,
    `/missions/${missionId}/reconciliation`,
    `/missions/${missionId}/passport#release-check`,
    `/missions/${missionId}/passport#release-evidence-report`
  ];
}

function routeStep(
  currentPath: string,
  workspace: DemoWorkspaceResource
): number | undefined {
  if (workspace.status !== "READY") return undefined;
  if (currentPath.startsWith(`/projects/${workspace.projectId}`)) return 0;
  if (currentPath.includes(`/missions/${workspace.missionId}/evidence`)) return 1;
  if (currentPath.includes(`/missions/${workspace.missionId}/twin`)) return 2;
  if (currentPath.includes(`/missions/${workspace.missionId}/reconciliation`)) return 3;
  if (currentPath.includes(`/missions/${workspace.missionId}/passport`)) {
    return workspace.passportAssessmentRevision === undefined ? 4 : 5;
  }
  return undefined;
}

function lifecycleStep(workspace: DemoWorkspaceResource): number {
  if (workspace.status !== "READY") return 0;
  if (workspace.workflowStage === "INITIAL_BLOCKED") return 3;
  if (workspace.workflowStage === "CORRECTED_READY") return 5;
  return 4;
}

function baseStepState(
  workspace: DemoWorkspaceResource,
  index: number
): JourneyState {
  if (workspace.status !== "READY") return index === 0 ? "CURRENT" : "WAITING";
  if (workspace.workflowStage === "INITIAL_BLOCKED") {
    if (index <= 2) return "COMPLETE";
    if (index === 3) return "CURRENT";
    if (index === 4) return "ATTENTION";
    return "WAITING";
  }
  if (workspace.workflowStage === "CORRECTED_READY") {
    return index <= 4 ? "COMPLETE" : "CURRENT";
  }
  if (index <= 3) return "COMPLETE";
  return "ATTENTION";
}

function prerequisite(workspace: DemoWorkspaceResource, index: number): string {
  if (workspace.status !== "READY") {
    return index === 0
      ? "Use Demo Project to create the controlled Project and Work Item."
      : "The controlled Work Item must be loaded first.";
  }
  if (workspace.workflowStage === "INITIAL_BLOCKED" && (index === 3 || index === 4)) {
    return "Resolve the cited conflict and request a new deterministic assessment."
  }
  if (workspace.passportAssessmentRevision === undefined && index === 5) {
    return "A stored Ready assessment is required before its report can exist.";
  }
  if (workspace.workflowStage === "READY_STALE" && index >= 4) {
    return "The current repository state changed; analyze and run the Release Check again."
  }
  return "Required persisted artifacts are available.";
}

function actionFor(workspace: DemoWorkspaceResource): {
  readonly label: string;
  readonly path: string;
} {
  if (workspace.status !== "READY" || workspace.workflowStage === "INITIAL_BLOCKED") {
    return {
      label: workspace.status === "READY" ? "Resolve the controlled conflict" : "Load controlled Work Item",
      path: workspace.status === "READY" ? "/demo" : "/demo#demo-setup-title"
    };
  }
  if (workspace.workflowStage === "CORRECTED_READY") {
    return {
      label: "Inspect stored Evidence Report",
      path: `/missions/${workspace.missionId}/passport#release-evidence-report`
    };
  }
  return {
    label: "Inspect Recheck Needed",
    path: `/missions/${workspace.missionId}/passport#release-check`
  };
}

export interface GuidedDemoJourneyViewProps {
  readonly workspace: DemoWorkspaceResource;
  readonly contextState: ContextState;
  readonly currentPath: string;
  readonly onNavigate: (path: string) => void;
  readonly onRetryContext?: () => void;
}

export function GuidedDemoJourneyView({
  workspace,
  contextState,
  currentPath,
  onNavigate,
  onRetryContext
}: GuidedDemoJourneyViewProps): JSX.Element {
  const paths = stepPaths(workspace);
  const selectedStep = routeStep(currentPath, workspace) ?? lifecycleStep(workspace);
  const primaryAction = actionFor(workspace);

  return (
    <section className="guided-journey" aria-labelledby="guided-journey-title">
      <header className="guided-journey__heading">
        <div>
          <p className="eyebrow">Guided synthetic journey</p>
          <h2 id="guided-journey-title">Six steps, one evidence trail</h2>
          <p>Progress reflects stored artifacts only. It never calculates or changes release readiness.</p>
        </div>
        <a
          className="primary-action"
          href={primaryAction.path}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(primaryAction.path);
          }}
        >
          {primaryAction.label}
        </a>
      </header>

      <div className="guided-context" aria-label="Persistent Work Item context">
        {workspace.status !== "READY" ? (
          <p className="guided-context__empty">No controlled Work Item is loaded. Use Demo Project to create only IntelliLoop-owned synthetic data.</p>
        ) : contextState.kind === "loading" ? (
          <p role="status" aria-live="polite" aria-busy="true">Loading authoritative Project, Work Item and analyzed-commit context…</p>
        ) : contextState.kind === "error" ? (
          <div className="guided-context__error" role="alert">
            <strong>Guided context unavailable.</strong>
            <span>{contextState.message} No identifier or Release Check is guessed.</span>
            {onRetryContext === undefined ? null : (
              <button className="secondary-action" type="button" onClick={onRetryContext}>Retry guided context</button>
            )}
          </div>
        ) : (
          <dl>
            <div><dt>Project</dt><dd>{contextState.context.projectName}</dd></div>
            <div><dt>Work Item</dt><dd>{contextState.context.workItemTitle}<code>{workspace.missionId}</code></dd></div>
            <div><dt>Repository</dt><dd>{contextState.context.repositoryLabel}</dd></div>
            <div><dt>Branch / ref</dt><dd>{contextState.context.branchOrRef ?? "Not available"}</dd></div>
            <div><dt>Current commit</dt><dd><code>{contextState.context.currentCommit ?? "Not available"}</code></dd></div>
            {workspace.workflowStage !== "READY_STALE" ? null : (
              <div><dt>Assessed commit</dt><dd><code>{contextState.context.assessedCommit ?? "Not available"}</code></dd></div>
            )}
            <div><dt>Snapshot time</dt><dd>{contextState.context.capturedAtUtc === undefined ? "Not available" : formatTime(contextState.context.capturedAtUtc)}</dd></div>
            <div><dt>Workflow Status</dt><dd><WorkflowStatusBadge /></dd></div>
            <div><dt>Release Check</dt><dd><ReleaseCheckBadge status={workspace.readinessStatus} /></dd></div>
          </dl>
        )}
      </div>

      <ol className="guided-steps" aria-label="Six-step demonstration progress">
        {STEPS.map((step, index) => {
          const state = baseStepState(workspace, index);
          const current = index === selectedStep;
          const path = paths[index];
          const available = path !== undefined && state !== "WAITING";
          const stateText = current
            ? state === "ATTENTION" ? "CURRENT · ATTENTION" : "CURRENT"
            : state;
          return (
            <li
              key={step.label}
              className={`guided-step${current ? " guided-step--current" : ""}`}
              data-journey-state={state}
              aria-current={current ? "step" : undefined}
            >
              <span className="guided-step__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.meaning}</small>
                <em><span aria-hidden="true">{state === "COMPLETE" ? "✓" : state === "ATTENTION" ? "!" : state === "CURRENT" ? "▶" : "○"}</span> {stateText}</em>
              </div>
              {available ? (
                <a href={path} onClick={(event) => { event.preventDefault(); onNavigate(path); }}>
                  {current ? "View current step" : "Open step"}
                </a>
              ) : <span className="guided-step__locked">Prerequisite required</span>}
            </li>
          );
        })}
      </ol>

      <div className="guided-next" role="note" aria-label="Current step guidance">
        <div>
          <strong>{STEPS[selectedStep]?.label}</strong>
          <span>{STEPS[selectedStep]?.meaning}</span>
          <small>{prerequisite(workspace, selectedStep)}</small>
        </div>
        <div className="guided-next__actions">
          {selectedStep > 0 && paths[selectedStep - 1] !== undefined ? (
            <a href={paths[selectedStep - 1]} onClick={(event) => { event.preventDefault(); onNavigate(paths[selectedStep - 1]!); }}>Back</a>
          ) : null}
          {selectedStep < STEPS.length - 1 && paths[selectedStep + 1] !== undefined && baseStepState(workspace, selectedStep + 1) !== "WAITING" ? (
            <a href={paths[selectedStep + 1]} onClick={(event) => { event.preventDefault(); onNavigate(paths[selectedStep + 1]!); }}>Next step</a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export interface GuidedDemoJourneyProps {
  readonly workspace: DemoWorkspaceResource;
  readonly fetcher?: typeof fetch;
  readonly currentPath: string;
  readonly onNavigate: (path: string) => void;
}

export function GuidedDemoJourney({
  workspace,
  fetcher = globalThis.fetch,
  currentPath,
  onNavigate
}: GuidedDemoJourneyProps): JSX.Element {
  const [attempt, setAttempt] = useState(0);
  const [contextState, setContextState] = useState<ContextState>(() =>
    workspace.status === "READY" ? { kind: "loading" } : { kind: "ready", context: {
      projectName: "Not available",
      workItemTitle: "Not available",
      repositoryLabel: workspace.fixtureId
    } }
  );

  useEffect(() => {
    if (workspace.status !== "READY") return undefined;
    const controller = new AbortController();
    setContextState({ kind: "loading" });
    void Promise.all([
      getProject(workspace.projectId!, fetcher, controller.signal),
      getMission(workspace.missionId!, fetcher, controller.signal),
      getRepository(workspace.projectId!, fetcher, controller.signal),
      listGitSnapshots(workspace.missionId!, fetcher, controller.signal)
    ]).then(([project, mission, repository, snapshots]) => {
      if (controller.signal.aborted) return;
      const ordered = sortedSnapshots(snapshots.snapshots);
      const currentSnapshotId = workspace.staleSnapshotId ?? workspace.correctedSnapshotId ?? workspace.initialSnapshotId;
      const assessedSnapshotId = workspace.correctedSnapshotId ?? workspace.initialSnapshotId;
      const currentSnapshot = ordered.find((item) => item.snapshotId === currentSnapshotId) ?? ordered[0];
      const assessedSnapshot = ordered.find((item) => item.snapshotId === assessedSnapshotId);
      setContextState({
        kind: "ready",
        context: {
          projectName: project.project.name,
          workItemTitle: mission.mission.title,
          repositoryLabel: `${workspace.fixtureId} · ${repository.repository.repositoryKind}`,
          ...(currentSnapshot?.branchName === undefined ? {} : { branchOrRef: currentSnapshot.branchName }),
          ...(currentSnapshot?.headCommit === undefined ? {} : { currentCommit: currentSnapshot.headCommit }),
          ...(assessedSnapshot?.headCommit === undefined ? {} : { assessedCommit: assessedSnapshot.headCommit }),
          ...(currentSnapshot?.capturedAtUtc === undefined ? {} : { capturedAtUtc: currentSnapshot.capturedAtUtc })
        }
      });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setContextState({ kind: "error", message: safeMessage(error) });
    });
    return () => controller.abort();
  }, [attempt, fetcher, workspace]);

  return (
    <GuidedDemoJourneyView
      workspace={workspace}
      contextState={contextState}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onRetryContext={() => setAttempt((value) => value + 1)}
    />
  );
}

export interface DemoJourneyBridgeProps {
  readonly scopeId: string;
  readonly currentPath: string;
  readonly fetcher?: typeof fetch;
  readonly onNavigate: (path: string) => void;
}

export function DemoJourneyBridge({
  scopeId,
  currentPath,
  fetcher = globalThis.fetch,
  onNavigate
}: DemoJourneyBridgeProps): JSX.Element | null {
  const [workspace, setWorkspace] = useState<DemoWorkspaceResource>();

  useEffect(() => {
    const controller = new AbortController();
    void getDemoWorkspace(fetcher, controller.signal).then((next) => {
      if (!controller.signal.aborted && next.status === "READY" &&
        (next.projectId === scopeId || next.missionId === scopeId)) {
        setWorkspace(next);
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, [fetcher, scopeId]);

  return useMemo(() => workspace === undefined ? null : (
    <GuidedDemoJourney workspace={workspace} fetcher={fetcher} currentPath={currentPath} onNavigate={onNavigate} />
  ), [currentPath, fetcher, onNavigate, workspace]);
}
