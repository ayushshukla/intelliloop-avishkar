import { useEffect, useMemo, useState } from "react";

import type {
  LocalProjectPilotCapabilityResponse,
  LocalProjectSafeRepository,
  ProjectResource,
  ReadinessAssessmentResource
} from "@intelliloop/contracts";

import { runCodeMapRevision } from "./code-map-client";
import {
  getLocalProjectContext,
  getLocalProjectPilotCapability,
  preflightLocalProject
} from "./local-pilot-client";
import {
  createReadinessAssessment,
  createReleasePassport
} from "./readiness-passport-client";
import { runReconciliation } from "./reconciliation-client";
import { materializeTwinRevision } from "./twin-client";
import {
  WorkspaceClientError,
  captureGitSnapshot,
  createMission,
  createProject,
  getRepository,
  listMissions,
  listProjects,
  registerRepository
} from "./workspace-client";

interface LocalProjectPilotEntryProps {
  readonly fetcher: typeof fetch;
  readonly onOpen: () => void;
}

type CapabilityState =
  | { readonly kind: "loading" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly value: LocalProjectPilotCapabilityResponse };

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The Local Project Pilot could not complete that step.";
}

export function LocalProjectPilotEntry({
  fetcher,
  onOpen
}: LocalProjectPilotEntryProps): JSX.Element {
  const [state, setState] = useState<CapabilityState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    void getLocalProjectPilotCapability(fetcher, controller.signal).then(
      (value) => { if (!controller.signal.aborted) setState({ kind: "ready", value }); },
      () => { if (!controller.signal.aborted) setState({ kind: "unavailable" }); }
    );
    return () => controller.abort();
  }, [fetcher]);

  const capability = state.kind === "ready" ? state.value.capability : undefined;
  return (
    <section className="local-pilot-entry" aria-labelledby="local-pilot-entry-title">
      <div>
        <p className="eyebrow">Authorized local repository</p>
        <h2 id="local-pilot-entry-title">Open Local Project Pilot</h2>
        <p>
          Analyze one configured Git repository read-only at its exact committed revision.
          Uncommitted changes are excluded, the Impact Map stays source-free, and external AI remains off.
        </p>
      </div>
      {capability?.state === "READY" ? (
        <button className="primary-action" type="button" onClick={onOpen}>Open Local Project Pilot</button>
      ) : (
        <div className="capability-state" role="status">
          <span className="state-label">{state.kind === "loading" ? "CHECKING" : "CONFIGURATION REQUIRED"}</span>
          <small>
            {state.kind === "loading"
              ? "Checking the local API capability."
              : capability?.state === "DISABLED"
                ? "The server-side pilot flag is off."
                : capability?.state === "CONFIGURATION_REQUIRED"
                  ? "No authorized repository root is configured."
                  : "The local API capability is unavailable."}
          </small>
        </div>
      )}
    </section>
  );
}

interface LocalProjectPilotProps {
  readonly fetcher: typeof fetch;
  readonly onBack: () => void;
  readonly onOpenProject: (projectId: string) => void;
  readonly onOpenTwin: (missionId: string) => void;
  readonly onOpenPassport: (missionId: string) => void;
}

interface PilotProgress {
  readonly projectId?: string;
  readonly missionId?: string;
  readonly snapshotId?: string;
  readonly codeMapRevision?: number;
  readonly twinRevision?: number;
  readonly reconciliationRevision?: number;
  readonly assessment?: ReadinessAssessmentResource;
  readonly reportCreated?: boolean;
}

type PilotState =
  | { readonly kind: "loading" }
  | { readonly kind: "disabled"; readonly message: string }
  | { readonly kind: "path" }
  | { readonly kind: "preflighting" }
  | { readonly kind: "rejected"; readonly reason: string; readonly recovery: string }
  | { readonly kind: "setup"; readonly repository: LocalProjectSafeRepository }
  | { readonly kind: "running"; readonly repository: LocalProjectSafeRepository; readonly step: string }
  | { readonly kind: "error"; readonly repository: LocalProjectSafeRepository; readonly message: string }
  | { readonly kind: "complete"; readonly repository: LocalProjectSafeRepository; readonly progress: PilotProgress };

export function LocalProjectPilot({
  fetcher,
  onBack,
  onOpenProject,
  onOpenTwin,
  onOpenPassport
}: LocalProjectPilotProps): JSX.Element {
  const [state, setState] = useState<PilotState>({ kind: "loading" });
  const [path, setPath] = useState("");
  const [projects, setProjects] = useState<readonly ProjectResource[]>([]);
  const [projectChoice, setProjectChoice] = useState("NEW");
  const [projectName, setProjectName] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [progress, setProgress] = useState<PilotProgress>({});

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      getLocalProjectPilotCapability(fetcher, controller.signal),
      listProjects(fetcher, controller.signal)
    ]).then(([capability, projectList]) => {
      if (controller.signal.aborted) return;
      setProjects(projectList.projects.filter((project) => project.status === "ACTIVE"));
      if (capability.capability.state === "READY") setState({ kind: "path" });
      else setState({
        kind: "disabled",
        message: capability.capability.state === "DISABLED"
          ? "The Local Project Pilot is disabled in the local API configuration."
          : "The Local Project Pilot needs at least one authorized repository root."
      });
    }, (error: unknown) => {
      if (!controller.signal.aborted) setState({ kind: "disabled", message: safeMessage(error) });
    });
    return () => controller.abort();
  }, [fetcher]);

  const repository = "repository" in state ? state.repository : undefined;
  const selectedProject = useMemo(
    () => projects.find((project) => project.projectId === projectChoice),
    [projectChoice, projects]
  );

  async function runPreflight(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (path.length < 1 || path.length > 4_096) {
      setState({ kind: "rejected", reason: "Path required", recovery: "Enter one configured absolute local Git repository path." });
      return;
    }
    setState({ kind: "preflighting" });
    try {
      const response = await preflightLocalProject(path, fetcher);
      if (response.preflight.status === "REJECTED") {
        setState({
          kind: "rejected",
          reason: response.preflight.reason.replaceAll("_", " "),
          recovery: response.preflight.recovery
        });
        return;
      }
      setProjectName(`${response.preflight.repository.displayName} Local Pilot`);
      setMissionTitle(`${response.preflight.repository.displayName} repository assessment`);
      setState({ kind: "setup", repository: response.preflight.repository });
    } catch (error) {
      setState({ kind: "rejected", reason: "API unavailable", recovery: safeMessage(error) });
    }
  }

  async function executePilot(repo: LocalProjectSafeRepository): Promise<void> {
    let next = progress;
    const persist = (value: PilotProgress, step: string): void => {
      next = value;
      setProgress(value);
      setState({ kind: "running", repository: repo, step });
    };
    try {
      let projectId = next.projectId;
      if (projectId === undefined) {
        if (projectChoice === "NEW") {
          const normalized = projectName.trim();
          if (normalized.length < 1 || normalized.length > 120) {
            throw new Error("Enter a Project name from 1 to 120 characters.");
          }
          projectId = (await createProject(normalized, fetcher)).project.projectId;
        } else {
          projectId = selectedProject?.projectId;
          if (projectId === undefined) throw new Error("Select an active Project.");
        }
        persist({ ...next, projectId }, "Registering authorized repository read-only");
      }

      try {
        await getRepository(projectId, fetcher);
        const existingContext = await getLocalProjectContext(projectId, fetcher);
        if (
          existingContext.repository.displayName !== repo.displayName ||
          existingContext.repository.exactCommit !== repo.exactCommit
        ) {
          throw new Error("The selected Project is bound to a different local repository.");
        }
      } catch (error) {
        if (!(error instanceof WorkspaceClientError) || error.code !== "NOT_FOUND") throw error;
        await registerRepository(projectId, path, fetcher);
      }
      setPath("");
      persist(next, "Creating or selecting the current Work Item");

      let missionId = next.missionId;
      if (missionId === undefined) {
        const existing = (await listMissions(projectId, fetcher)).missions.find(
          (mission) => mission.status === "CURRENT"
        );
        if (existing !== undefined) missionId = existing.missionId;
        else {
          const normalized = missionTitle.trim();
          if (normalized.length < 1 || normalized.length > 160) {
            throw new Error("Enter a Work Item title from 1 to 160 characters.");
          }
          missionId = (await createMission(projectId, normalized, fetcher)).mission.missionId;
        }
        persist({ ...next, missionId }, "Capturing the exact committed revision");
      }

      let snapshotId = next.snapshotId;
      if (snapshotId === undefined) {
        const snapshot = (await captureGitSnapshot(missionId, fetcher)).snapshot;
        if (snapshot.headCommit !== repo.exactCommit) {
          throw new Error("Repository HEAD changed after preflight. Run preflight again.");
        }
        snapshotId = snapshot.snapshotId;
        persist({ ...next, snapshotId }, "Building the source-free Impact Map");
      }

      let codeMapRevision = next.codeMapRevision;
      if (codeMapRevision === undefined) {
        const codeMap = (await runCodeMapRevision(missionId, fetcher)).codeMapRevision;
        codeMapRevision = codeMap.revision;
        snapshotId = codeMap.snapshot.snapshotId;
        persist({ ...next, codeMapRevision, snapshotId }, "Materializing the Active Software Twin");
      }

      let twinRevision = next.twinRevision;
      if (twinRevision === undefined) {
        twinRevision = (await materializeTwinRevision(missionId, fetcher)).twinRevision.revision;
        persist({ ...next, twinRevision }, "Reconciling available evidence without invention");
      }

      let reconciliationRevision = next.reconciliationRevision;
      if (reconciliationRevision === undefined) {
        reconciliationRevision = (await runReconciliation(missionId, {
          twinRevision,
          codeMapRevision,
          targetSnapshotId: snapshotId,
          supportRequirements: [],
          roots: [],
          impactRequirements: []
        }, fetcher)).reconciliationRevision.revision;
        persist({ ...next, reconciliationRevision }, "Running the deterministic Release Check");
      }

      let assessment = next.assessment;
      if (assessment === undefined) {
        assessment = (await createReadinessAssessment(missionId, fetcher)).assessment;
        persist({ ...next, assessment }, "Creating the stored-assessment Release Evidence Report");
      }
      if (next.reportCreated !== true) {
        await createReleasePassport(missionId, assessment.revision, fetcher);
        persist({ ...next, reportCreated: true }, "Opening the reusable Work Item journey");
      }
      setState({ kind: "complete", repository: repo, progress: next });
    } catch (error) {
      setState({ kind: "error", repository: repo, message: safeMessage(error) });
    }
  }

  const facts = repository === undefined ? null : (
    <dl className="local-repository-facts">
      <div><dt>Repository</dt><dd>{repository.displayName}</dd></div>
      <div><dt>Actual ref</dt><dd><code>{repository.ref}</code></dd></div>
      <div><dt>Exact commit</dt><dd><code>{repository.exactCommit}</code></dd></div>
      <div><dt>Commit time</dt><dd>{repository.commitTimestampUtc}</dd></div>
      <div><dt>Working tree</dt><dd>{repository.uncommittedChanges === "EXCLUDED" ? `${repository.excludedChangeCount} uncommitted change(s) excluded` : "Clean"}</dd></div>
      <div><dt>Persistence</dt><dd>Source-free Impact Map</dd></div>
    </dl>
  );

  return (
    <div className="local-pilot-workspace">
      <header className="overview-hero">
        <div>
          <p className="eyebrow">Local-only / Authorized repository</p>
          <h1>Local Project Pilot</h1>
          <p className="hero__lede">Preflight one configured repository, bind analysis to its exact commit, and continue through IntelliLoop’s existing deterministic Work Item journey.</p>
        </div>
        <button className="secondary-action" type="button" onClick={onBack}>Back to Projects</button>
      </header>
      <div className="scope-note" role="note">
        <strong>Read-only and fail-closed</strong>
        <span>Uncommitted changes are excluded. Raw source is not persisted in the Impact Map or report. External AI is off. Repository access alone never makes a release Ready.</span>
      </div>

      {state.kind === "loading" ? <div className="inline-state" role="status">Checking server capability…</div> : null}
      {state.kind === "disabled" ? (
        <section className="overview-state overview-state--error" role="status">
          <span className="state-label">CONFIGURATION REQUIRED</span><h2>Local Project Pilot unavailable</h2><p>{state.message}</p>
        </section>
      ) : null}
      {state.kind === "path" || state.kind === "preflighting" || state.kind === "rejected" ? (
        <section className="workspace-card local-pilot-card" aria-labelledby="preflight-title">
          <p className="eyebrow">Step 1 / Safe preflight</p><h2 id="preflight-title">Choose an authorized Git repository</h2>
          <form className="stack-form" onSubmit={(event) => void runPreflight(event)}>
            <label htmlFor="local-repository-path">Configured absolute repository path</label>
            <input id="local-repository-path" value={path} onChange={(event) => setPath(event.currentTarget.value)} maxLength={4096} autoComplete="off" spellCheck={false} disabled={state.kind === "preflighting"} />
            <button className="primary-action" type="submit" disabled={state.kind === "preflighting"}>{state.kind === "preflighting" ? "Checking read-only boundary…" : "Run safe preflight"}</button>
          </form>
          {state.kind === "rejected" ? <div className="action-error" role="alert"><strong>{state.reason}.</strong> {state.recovery}</div> : null}
        </section>
      ) : null}
      {repository !== undefined ? (
        <section className="workspace-card local-pilot-card" aria-labelledby="safe-context-title">
          <p className="eyebrow">Verified safe metadata</p><h2 id="safe-context-title">Exact repository context</h2>{facts}
        </section>
      ) : null}
      {state.kind === "setup" || state.kind === "error" ? (
        <section className="workspace-card local-pilot-card" aria-labelledby="pilot-setup-title">
          <p className="eyebrow">Step 2 / Existing domain records</p><h2 id="pilot-setup-title">Project and Work Item</h2>
          <label htmlFor="pilot-project-choice">Project</label>
          <select id="pilot-project-choice" value={projectChoice} onChange={(event) => setProjectChoice(event.currentTarget.value)}>
            <option value="NEW">Create a Local Pilot Project</option>
            {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.name}</option>)}
          </select>
          {projectChoice === "NEW" ? <><label htmlFor="pilot-project-name">Project name</label><input id="pilot-project-name" value={projectName} onChange={(event) => setProjectName(event.currentTarget.value)} maxLength={120} /></> : null}
          <label htmlFor="pilot-work-item-title">Work Item title</label>
          <input id="pilot-work-item-title" value={missionTitle} onChange={(event) => setMissionTitle(event.currentTarget.value)} maxLength={160} />
          <p><strong>Workflow Status:</strong> Not tracked</p>
          {state.kind === "error" ? <div className="action-error" role="alert"><strong>Progress retained.</strong> {state.message}</div> : null}
          <button className="primary-action" type="button" onClick={() => void executePilot(state.repository)}>{state.kind === "error" ? "Retry from retained progress" : "Start exact-commit analysis"}</button>
        </section>
      ) : null}
      {state.kind === "running" ? <div className="inline-state" role="status" aria-live="polite" aria-busy="true"><span className="state-label">RUNNING</span><strong>{state.step}</strong><p>Completed artifacts are retained if the local API is interrupted.</p></div> : null}
      {state.kind === "complete" ? (
        <section className="workspace-card local-pilot-card local-pilot-complete" aria-labelledby="pilot-complete-title">
          <span className="state-label">ANALYSIS COMPLETE</span><h2 id="pilot-complete-title">Continue through the real Work Item</h2>
          <p><strong>Workflow Status:</strong> Not tracked</p>
          <p><strong>Release Check:</strong> {state.progress.assessment?.currentStatus === "READY" ? "Ready" : "Not Ready"}</p>
          <p>The report is a projection of stored assessment revision {state.progress.assessment?.revision}; no UI action can change that result.</p>
          <div className="local-pilot-actions">
            <button className="primary-action" type="button" onClick={() => onOpenProject(state.progress.projectId as string)}>Open Work Item overview</button>
            <button className="secondary-action" type="button" onClick={() => onOpenTwin(state.progress.missionId as string)}>Open source-free Impact Map</button>
            <button className="secondary-action" type="button" onClick={() => onOpenPassport(state.progress.missionId as string)}>Review Release Check &amp; Report</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
