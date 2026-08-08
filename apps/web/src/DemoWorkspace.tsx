import { useEffect, useRef, useState } from "react";

import type { DemoWorkspaceResource } from "@intelliloop/contracts";

import {
  applyDemoCorrection,
  demonstrateDemoStaleness,
  getDemoWorkspace,
  resetDemoWorkspace,
  setupDemoWorkspace
} from "./demo-client";
import { GuidedDemoJourney } from "./GuidedDemoJourney";
import { ReleaseCheckBadge, presentReleaseCheck } from "./presentation";

interface DemoWorkspaceProps {
  readonly fetcher?: typeof fetch;
  readonly currentPath: string;
  readonly onNavigate: (path: string) => void;
  readonly onOpenProject: (projectId: string) => void;
  readonly onOpenEvidence: (missionId: string) => void;
  readonly onOpenTwin: (missionId: string) => void;
  readonly onOpenReconciliation: (missionId: string) => void;
  readonly onOpenExplanation: (missionId: string) => void;
  readonly onOpenPassport: (missionId: string) => void;
}

type DemoState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly workspace: DemoWorkspaceResource };

type DemoAction = "SETUP" | "CORRECTION" | "STALENESS" | "RESET";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The controlled demo workflow could not be completed.";
}

function checkpointDetail(status: DemoWorkspaceResource["readinessStatus"]): string {
  return presentReleaseCheck(status).explanation;
}

export function DemoWorkspace({
  fetcher = globalThis.fetch,
  currentPath,
  onNavigate,
  onOpenProject,
  onOpenEvidence,
  onOpenTwin,
  onOpenReconciliation,
  onOpenExplanation,
  onOpenPassport
}: DemoWorkspaceProps): JSX.Element {
  const [state, setState] = useState<DemoState>({ kind: "loading" });
  const [action, setAction] = useState<DemoAction>();
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [resetArmed, setResetArmed] = useState(false);
  const activeStepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void getDemoWorkspace(fetcher, controller.signal)
      .then((workspace) => {
        if (!controller.signal.aborted) setState({ kind: "ready", workspace });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [attempt, fetcher]);

  useEffect(() => {
    if (notice !== undefined) activeStepHeading.current?.focus();
  }, [notice, state]);

  async function run(actionName: DemoAction): Promise<void> {
    setResetArmed(false);
    setAction(actionName);
    setActionError(undefined);
    setNotice(undefined);
    try {
      const workspace = actionName === "SETUP"
        ? await setupDemoWorkspace(fetcher)
        : actionName === "CORRECTION"
          ? await applyDemoCorrection(fetcher)
          : actionName === "STALENESS"
            ? await demonstrateDemoStaleness(fetcher)
            : await resetDemoWorkspace(fetcher);
      setState({ kind: "ready", workspace });
      setNotice(actionName === "SETUP" ? "Controlled initial workspace loaded."
        : actionName === "CORRECTION" ? "Correction assessed through real product services."
          : actionName === "STALENESS" ? "The historical Ready assessment and Evidence Report now require a recheck."
            : "Controlled workspace reset without changing other Projects.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setAction(undefined);
    }
  }

  if (state.kind === "loading") {
    return <section className="overview-state demo-loading" aria-busy="true" aria-labelledby="demo-loading-title" aria-live="polite"><span className="state-label"><span className="state-symbol" aria-hidden="true">…</span> LOADING</span><h1 id="demo-loading-title">Reading golden workflow state</h1><p>Checking the local, synthetic fixture. No provider or repository code is called.</p><div className="demo-loading__bar" aria-hidden="true" /></section>;
  }
  if (state.kind === "error") {
    return <section className="overview-state overview-state--error demo-error" role="alert" aria-labelledby="demo-error-title"><span className="state-label"><span className="state-symbol" aria-hidden="true">!</span> UNAVAILABLE</span><h1 id="demo-error-title">Competition demo unavailable</h1><p>{state.message}</p><p className="demo-state-guidance">The failure is explicit: no Release Check has been inferred or preserved.</p><button className="secondary-action" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry demo workspace</button></section>;
  }

  const workspace = state.workspace;
  const stage = workspace.workflowStage;
  const missionId = workspace.missionId;
  return (
    <div className="demo-workspace" data-demo-stage={stage ?? "EMPTY"} aria-busy={action !== undefined}>
      <header className="overview-hero demo-hero" aria-labelledby="demo-title">
        <div>
          <p className="eyebrow">Current route / Competition demo</p>
          <h1 id="demo-title">LoopMart cancellation control room</h1>
          <p className="hero__lede">Follow one synthetic Work Item from conflicting evidence to a corrected candidate, then prove why yesterday&apos;s Ready result cannot silently survive a new dependency.</p>
        </div>
        <div className="truth-badge demo-truth-badge" role="status" aria-label={`Current Release Check: ${presentReleaseCheck(workspace.readinessStatus).label}. ${checkpointDetail(workspace.readinessStatus)}`} data-readiness-status={workspace.readinessStatus ?? "EMPTY"}>
          <span>Current Release Check</span>
          <strong><ReleaseCheckBadge status={workspace.readinessStatus} /></strong>
          <small>{checkpointDetail(workspace.readinessStatus)}</small>
          <small>Deterministic, local and unsigned</small>
        </div>
      </header>

      <div className="scope-note" role="note">
        <strong>SYNTHETIC / AI OFF</strong>
        <span>IntelliLoop owns this fictional fixture. Provider calls, repository source execution, release approval, signing and deployment authority remain disabled.</span>
      </div>

      <GuidedDemoJourney
        workspace={workspace}
        fetcher={fetcher}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />

      {notice === undefined ? null : <p className="action-notice" role="status" aria-atomic="true"><span aria-hidden="true">✓</span> {notice}</p>}
      {actionError === undefined ? null : <div className="action-error" role="alert"><strong>Action not completed.</strong> {actionError}</div>}

      {workspace.status === "EMPTY" ? (
        <section className="demo-action-card" aria-labelledby="demo-setup-title">
          <p className="eyebrow">Step 1 / Materialize</p><h2 id="demo-setup-title" ref={activeStepHeading} tabIndex={-1}>Load the controlled initial candidate</h2>
          <p>The API creates a dedicated Git repository and imports the synthetic requirement, decisions, validation drafts and claims through normal persisted services.</p>
          <button className="primary-action" type="button" disabled={action !== undefined} onClick={() => void run("SETUP")}>{action === "SETUP" ? "Loading real product paths…" : "Use Demo Project"}</button>
        </section>
      ) : (
        <>
          <section className="demo-facts" aria-label="Persisted workflow facts">
            <div><span>Linked Evidence</span><strong>Imported and attributed</strong></div>
            <div><span>Code map / Impact Map</span><strong>r{workspace.correctedTwinRevision ?? workspace.twinRevision}</strong></div>
            <div><span>Resolve Conflicts</span><strong>r{workspace.correctedReconciliationRevision ?? workspace.reconciliationRevision}</strong></div>
            <div><span>AI provider</span><strong>OFF / NOT SENT</strong></div>
          </section>
          <div className="demo-route-actions" aria-label="Inspect current product evidence">
            <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenProject(workspace.projectId!)}>Open Work Item</button>
            <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenEvidence(missionId!)}>Inspect Linked Evidence</button>
            <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenTwin(missionId!)}>Inspect Impact Map</button>
            <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenReconciliation(missionId!)}>Inspect Risks &amp; Checks</button>
            <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenExplanation(missionId!)}>Ask “What conflicts are open?” offline</button>
            {workspace.passportAssessmentRevision === undefined ? null : <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenPassport(missionId!)}>Inspect unsigned Evidence Report</button>}
          </div>
        </>
      )}

      {stage === "INITIAL_BLOCKED" ? (
        <section className="demo-action-card demo-action-card--blocked" aria-labelledby="demo-correction-title">
          <p className="eyebrow"><span aria-hidden="true">×</span> Step 2 / Correct</p><h2 id="demo-correction-title" ref={activeStepHeading} tabIndex={-1}>Resolve the conflict with cited corrective inputs</h2>
          <p>The controlled action commits the corrected implementation, imports the superseding ADR and four analyzed-commit-bound validation results, refreshes the Impact Map and conflict analysis, records an explicitly synthetic human-review fixture, evaluates the Release Check, and projects an unsigned Evidence Report.</p>
          <button className="primary-action" type="button" disabled={action !== undefined} onClick={() => void run("CORRECTION")}>{action === "CORRECTION" ? "Applying and reassessing…" : "Apply controlled correction"}</button>
        </section>
      ) : null}

      {stage === "CORRECTED_READY" ? (
        <section className="demo-action-card demo-action-card--ready" aria-labelledby="demo-stale-title">
          <p className="eyebrow"><span aria-hidden="true">✓</span> Step 3 / Invalidate</p><h2 id="demo-stale-title" ref={activeStepHeading} tabIndex={-1}>Prove that Ready is not permanent</h2>
          <p>A fixed, uncommitted fixture-owned file changes the current analyzed commit. The stored Ready assessment and Evidence Report remain immutable while their live association becomes Recheck Needed.</p>
          <button className="primary-action" type="button" disabled={action !== undefined} onClick={() => void run("STALENESS")}>{action === "STALENESS" ? "Capturing changed dependency…" : "Demonstrate dependency staleness"}</button>
        </section>
      ) : null}

      {stage === "READY_STALE" ? (
        <section className="demo-action-card demo-action-card--stale" aria-labelledby="demo-complete-title" role="status">
          <p className="eyebrow"><span aria-hidden="true">!</span> Golden sequence complete</p><h2 id="demo-complete-title" ref={activeStepHeading} tabIndex={-1}>Not Ready → Ready → Recheck Needed is persisted</h2>
          <p>The historical Evidence Report still says Ready when recorded and Recheck Needed now. Nothing was silently rewritten, approved, signed or deployed.</p>
        </section>
      ) : null}

      {workspace.status === "READY" ? resetArmed ? (
        <section className="demo-reset-confirmation" role="alert" aria-labelledby="demo-reset-title">
          <div>
            <strong id="demo-reset-title">Reset only IntelliLoop-owned demo data?</strong>
            <span>Unrelated Projects, Work Items and registered repositories are outside this action.</span>
          </div>
          <div>
            <button className="secondary-action" type="button" disabled={action !== undefined} onClick={() => setResetArmed(false)}>Cancel</button>
            <button className="primary-action" type="button" disabled={action !== undefined} onClick={() => void run("RESET")}>{action === "RESET" ? "Resetting…" : "Confirm controlled reset"}</button>
          </div>
        </section>
      ) : (
        <button className="demo-reset" type="button" disabled={action !== undefined} onClick={() => setResetArmed(true)}>Reset controlled demo</button>
      ) : null}
    </div>
  );
}
