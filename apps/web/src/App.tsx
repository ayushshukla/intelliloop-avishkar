import { useCallback, useEffect, useState } from "react";

import { AiBoundaryPanel } from "./FoundationStates";
import { HealthPanel } from "./HealthPanel";
import { ChangeOverview } from "./ChangeOverview";
import { CitedExplanationWorkspace } from "./CitedExplanationWorkspace";
import { DemoWorkspace } from "./DemoWorkspace";
import { EvidenceTimeline } from "./EvidenceTimeline";
import { DemoJourneyBridge } from "./GuidedDemoJourney";
import { ProjectSelection } from "./ProjectSelection";
import { GuidedLocalProjectJourney } from "./GuidedLocalProjectJourney";
import { LocalProjectPilot, LocalProjectPilotEntry } from "./LocalProjectPilot";
import { ReadinessPassportWorkspace } from "./ReadinessPassportWorkspace";
import { ReconciliationWorkspace } from "./ReconciliationWorkspace";
import { TwinWorkspace } from "./TwinWorkspace";
import { PRODUCT_TERMS } from "./presentation";
import { loadHealth, type HealthViewState } from "./health-client";

const PROJECT_PATH_PATTERN =
  /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/iu;
const EVIDENCE_PATH_PATTERN =
  /^\/missions\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/evidence\/?$/iu;
const TWIN_PATH_PATTERN =
  /^\/missions\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/twin\/?$/iu;
const RECONCILIATION_PATH_PATTERN =
  /^\/missions\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/reconciliation\/?$/iu;
const EXPLANATION_PATH_PATTERN =
  /^\/missions\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/explanation\/?$/iu;
const PASSPORT_PATH_PATTERN =
  /^\/missions\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/passport\/?$/iu;

export interface AppProps {
  readonly fetcher?: typeof fetch;
  readonly initialPath?: string;
}

function browserPath(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function App({
  fetcher = globalThis.fetch,
  initialPath
}: AppProps): JSX.Element {
  const [health, setHealth] = useState<HealthViewState>({ kind: "loading" });
  const [healthAttempt, setHealthAttempt] = useState(0);
  const [path, setPath] = useState(() => initialPath ?? browserPath());
  const [projectMissionId, setProjectMissionId] = useState<string | undefined>();
  const [scopedProjectId, setScopedProjectId] = useState<string | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(fetcher, controller.signal).then((nextState) => {
      if (!controller.signal.aborted) setHealth(nextState);
    });
    return () => controller.abort();
  }, [fetcher, healthAttempt]);

  useEffect(() => {
    if (initialPath !== undefined || typeof window === "undefined") return undefined;
    const onPopState = (): void => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialPath]);

  useEffect(() => {
    setProjectMissionId(undefined);
    setScopedProjectId(undefined);
  }, [path]);

  const navigate = useCallback(
    (nextPath: string): void => {
      const [nextPathname = "/", anchor] = nextPath.split("#", 2);
      if (typeof window !== "undefined" && initialPath === undefined) {
        window.history.pushState({}, "", nextPath);
        if (anchor === undefined) {
          window.scrollTo({ top: 0, behavior: "auto" });
        } else {
          window.requestAnimationFrame(() => {
            document.getElementById(anchor)?.scrollIntoView({ block: "start" });
          });
        }
      }
      setPath(nextPathname);
    },
    [initialPath]
  );

  function retryHealth(): void {
    setHealth({ kind: "loading" });
    setHealthAttempt((attempt) => attempt + 1);
  }

  const projectMatch = PROJECT_PATH_PATTERN.exec(path);
  const projectId = projectMatch?.[1]?.toLowerCase();
  const evidenceMatch = EVIDENCE_PATH_PATTERN.exec(path);
  const evidenceMissionId = evidenceMatch?.[1]?.toLowerCase();
  const twinMatch = TWIN_PATH_PATTERN.exec(path);
  const twinMissionId = twinMatch?.[1]?.toLowerCase();
  const reconciliationMatch = RECONCILIATION_PATH_PATTERN.exec(path);
  const reconciliationMissionId = reconciliationMatch?.[1]?.toLowerCase();
  const explanationMatch = EXPLANATION_PATH_PATTERN.exec(path);
  const explanationMissionId = explanationMatch?.[1]?.toLowerCase();
  const passportMatch = PASSPORT_PATH_PATTERN.exec(path);
  const passportMissionId = passportMatch?.[1]?.toLowerCase();
  const scopedMissionId = evidenceMissionId ?? twinMissionId ?? reconciliationMissionId ?? explanationMissionId ?? passportMissionId;
  const onWelcome = path === "/" || path === "";
  const onDemo = path === "/demo" || path === "/demo/";
  const onLocalPilot = path === "/local-pilot" || path === "/local-pilot/";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="IntelliLoop home"
          onClick={(event) => {
            event.preventDefault();
            navigate("/");
          }}
        >
          <span className="brand__mark" aria-hidden="true">IL</span>
          <span>
            <strong>IntelliLoop</strong>
            <small>Deterministic release assurance for software changes</small>
          </span>
        </a>
        <div className="topbar__states" aria-label="Current product states">
          <span className="state-pill state-pill--foundation">
            <span aria-hidden="true">L</span> Local only
          </span>
          <span className="state-pill state-pill--offline">
            <span aria-hidden="true">A</span> AI off
          </span>
        </div>
      </header>

      <div className="workspace-shell">
        <aside className="stage-rail" aria-label="Workspace navigation and trust boundary">
          <nav aria-labelledby="route-navigation-title">
            <p className="rail-label" id="route-navigation-title">Work Item assurance</p>
            <a
              className={`route-link ${onWelcome ? "route-link--current" : ""}`}
              href="/"
              aria-current={onWelcome ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate("/");
              }}
            >
              <span className="route-link__index" aria-hidden="true">01</span>
              Projects
              <small>{onWelcome ? "Current route" : "Select workspace"}</small>
            </a>
            {projectId !== undefined ? (
              <a className="route-link route-link--current" href={path} aria-current="page">
                <span className="route-link__index" aria-hidden="true">02</span>
                {PRODUCT_TERMS.changeMission} overview
                <small>Current route</small>
              </a>
            ) : scopedMissionId !== undefined && scopedProjectId !== undefined ? (
              <a
                className="route-link"
                href={`/projects/${scopedProjectId}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/projects/${scopedProjectId}`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">02</span>
                {PRODUCT_TERMS.changeMission} overview
                <small>Project scope</small>
              </a>
            ) : (
              <span className="route-link route-link--planned" aria-disabled="true">
                <span className="route-link__index" aria-hidden="true">02</span>
                {PRODUCT_TERMS.changeMission} overview
                <small>{scopedMissionId === undefined ? "Select a Project" : "Loading Project scope"}</small>
              </span>
            )}
            {evidenceMissionId !== undefined ? (
              <a className="route-link route-link--current" href={path} aria-current="page">
                <span className="route-link__index" aria-hidden="true">03</span>
                {PRODUCT_TERMS.evidence}
                <small>Current route</small>
              </a>
            ) : twinMissionId !== undefined || reconciliationMissionId !== undefined || explanationMissionId !== undefined || passportMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${scopedMissionId}/evidence`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${scopedMissionId}/evidence`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">03</span>
                {PRODUCT_TERMS.evidence}
                <small>Work Item sources</small>
              </a>
            ) : projectId !== undefined && projectMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${projectMissionId}/evidence`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${projectMissionId}/evidence`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">03</span>
                {PRODUCT_TERMS.evidence}
                <small>Open current Work Item</small>
              </a>
            ) : (
              <span className="route-link route-link--planned" aria-disabled="true">
                <span className="route-link__index" aria-hidden="true">03</span>
                {PRODUCT_TERMS.evidence}
                <small>{projectId === undefined ? "Select a Work Item" : "Create a current Work Item"}</small>
              </span>
            )}
            {twinMissionId !== undefined ? (
              <a className="route-link route-link--current" href={path} aria-current="page">
                <span className="route-link__index" aria-hidden="true">04</span>
                {PRODUCT_TERMS.activeSoftwareTwin}
                <small>Current route</small>
              </a>
            ) : scopedMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${scopedMissionId}/twin`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${scopedMissionId}/twin`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">04</span>
                {PRODUCT_TERMS.activeSoftwareTwin}
                <small>Persisted revisions</small>
              </a>
            ) : projectId !== undefined && projectMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${projectMissionId}/twin`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${projectMissionId}/twin`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">04</span>
                {PRODUCT_TERMS.activeSoftwareTwin}
                <small>Open current Work Item</small>
              </a>
            ) : (
              <span className="route-link route-link--planned" aria-disabled="true">
                <span className="route-link__index" aria-hidden="true">04</span>
                {PRODUCT_TERMS.activeSoftwareTwin}
                <small>Select a Work Item</small>
              </span>
            )}
            {reconciliationMissionId !== undefined ? (
              <a className="route-link route-link--current" href={path} aria-current="page">
                <span className="route-link__index" aria-hidden="true">05</span>
                {PRODUCT_TERMS.reconciliation}
                <small>Current route</small>
              </a>
            ) : scopedMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${scopedMissionId}/reconciliation`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${scopedMissionId}/reconciliation`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">05</span>
                {PRODUCT_TERMS.reconciliation}
                <small>{PRODUCT_TERMS.findings}</small>
              </a>
            ) : projectId !== undefined && projectMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${projectMissionId}/reconciliation`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${projectMissionId}/reconciliation`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">05</span>
                {PRODUCT_TERMS.reconciliation}
                <small>Open current Work Item</small>
              </a>
            ) : (
              <span className="route-link route-link--planned" aria-disabled="true">
                <span className="route-link__index" aria-hidden="true">05</span>
                {PRODUCT_TERMS.reconciliation}
                <small>Select a Work Item</small>
              </span>
            )}
            {explanationMissionId !== undefined ? (
              <a className="route-link route-link--current" href={path} aria-current="page">
                <span className="route-link__index" aria-hidden="true">06</span>
                Cited explanation
                <small>Current route</small>
              </a>
            ) : scopedMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${scopedMissionId}/explanation`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${scopedMissionId}/explanation`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">06</span>
                Cited explanation
                <small>Ask fixed evidence questions</small>
              </a>
            ) : projectId !== undefined && projectMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${projectMissionId}/explanation`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${projectMissionId}/explanation`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">06</span>
                Cited explanation
                <small>Open current Work Item</small>
              </a>
            ) : (
              <span className="route-link route-link--planned" aria-disabled="true">
                <span className="route-link__index" aria-hidden="true">06</span>
                Cited explanation
                <small>Select a Work Item</small>
              </span>
            )}
            {passportMissionId !== undefined ? (
              <a className="route-link route-link--current" href={path} aria-current="page">
                <span className="route-link__index" aria-hidden="true">07</span>
                {PRODUCT_TERMS.readiness} &amp; Report
                <small>Current route</small>
              </a>
            ) : scopedMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${scopedMissionId}/passport`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${scopedMissionId}/passport`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">07</span>
                {PRODUCT_TERMS.readiness} &amp; Report
                <small>Inspect exact release state</small>
              </a>
            ) : projectId !== undefined && projectMissionId !== undefined ? (
              <a
                className="route-link"
                href={`/missions/${projectMissionId}/passport`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/missions/${projectMissionId}/passport`);
                }}
              >
                <span className="route-link__index" aria-hidden="true">07</span>
                {PRODUCT_TERMS.readiness} &amp; Report
                <small>Open current Work Item</small>
              </a>
            ) : (
              <span className="route-link route-link--planned" aria-disabled="true">
                <span className="route-link__index" aria-hidden="true">07</span>
                {PRODUCT_TERMS.readiness} &amp; Report
                <small>Select a Work Item</small>
              </span>
            )}
            <a
              className={`route-link ${onDemo ? "route-link--current" : ""}`}
              href="/demo"
              aria-current={onDemo ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate("/demo");
              }}
            >
              <span className="route-link__index" aria-hidden="true">08</span>
              Competition demo
              <small>{onDemo ? "Current route" : "Golden workflow"}</small>
            </a>
            <a
              className={`route-link ${onLocalPilot ? "route-link--current" : ""}`}
              href="/local-pilot"
              aria-current={onLocalPilot ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate("/local-pilot");
              }}
            >
              <span className="route-link__index" aria-hidden="true">09</span>
              Local Project Pilot
              <small>{onLocalPilot ? "Current route" : "Configured repositories only"}</small>
            </a>
          </nav>
          <AiBoundaryPanel />
        </aside>

        <main id="main-content" tabIndex={-1}>
          {onWelcome ? (
            <>
              <section className="hero hero--compact" aria-labelledby="hero-title">
                <p className="eyebrow">Current route / Projects</p>
                <h1 id="hero-title">Know whether an exact software change is ready to release.</h1>
                <p className="hero__lede">
                  Select a Project and Work Item, confirm the analyzed commit, then follow
                  linked evidence through risks, deterministic checks, and the next action.
                </p>
                <div className="scope-note" role="note" aria-label="Current implementation scope">
                  <strong>Honest scope</strong>
                  <span>
                    Repository analysis is read-only and pinned to an exact commit. Linked Evidence,
                    Impact Map revisions, Risks &amp; Checks, deterministic Release Checks, cited AI-off
                    explanations, and the unsigned Release Evidence Report are implemented.
                  </span>
                </div>
              </section>

              <section className="status-section status-section--compact" aria-labelledby="status-heading">
                <div className="section-heading">
                  <p className="eyebrow">Operational truth</p>
                  <h2 id="status-heading">Local API connection</h2>
                  <p>Connection state is operational only—never release readiness.</p>
                </div>
                <HealthPanel state={health} onRetry={retryHealth} />
              </section>

              <section className="demo-entry" aria-labelledby="demo-entry-title">
                <div>
                  <p className="eyebrow">Competition-ready path</p>
                  <h2 id="demo-entry-title">Use Demo Project</h2>
                  <p>Load only IntelliLoop-owned synthetic data, then follow one Work Item through Not Ready, supported correction, Ready, an unsigned Release Evidence Report, and Recheck Needed.</p>
                </div>
                <button className="primary-action" type="button" onClick={() => navigate("/demo")}>Use Demo Project</button>
              </section>

              <LocalProjectPilotEntry fetcher={fetcher} onOpen={() => navigate("/local-pilot")} />

              <ProjectSelection fetcher={fetcher} onOpenProject={(id) => navigate(`/projects/${id}`)} />
            </>
          ) : onDemo ? (
            <DemoWorkspace
              fetcher={fetcher}
              currentPath={path}
              onNavigate={navigate}
              onOpenProject={(id) => navigate(`/projects/${id}`)}
              onOpenEvidence={(missionId) => navigate(`/missions/${missionId}/evidence`)}
              onOpenTwin={(missionId) => navigate(`/missions/${missionId}/twin`)}
              onOpenReconciliation={(missionId) => navigate(`/missions/${missionId}/reconciliation`)}
              onOpenExplanation={(missionId) => navigate(`/missions/${missionId}/explanation`)}
              onOpenPassport={(missionId) => navigate(`/missions/${missionId}/passport`)}
            />
          ) : onLocalPilot ? (
            <LocalProjectPilot
              fetcher={fetcher}
              onBack={() => navigate("/")}
              onOpenProject={(id) => navigate(`/projects/${id}`)}
              onOpenTwin={(missionId) => navigate(`/missions/${missionId}/twin`)}
              onOpenPassport={(missionId) => navigate(`/missions/${missionId}/passport`)}
            />
          ) : projectId !== undefined ? (
            <>
              <DemoJourneyBridge scopeId={projectId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <GuidedLocalProjectJourney projectId={projectId} missionId={projectMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <ChangeOverview
              projectId={projectId}
              fetcher={fetcher}
              onMissionAvailable={setProjectMissionId}
              onOpenEvidence={(missionId) => navigate(`/missions/${missionId}/evidence`)}
              onOpenTwin={(missionId) => navigate(`/missions/${missionId}/twin`)}
              onOpenRisks={(missionId) => navigate(`/missions/${missionId}/reconciliation`)}
              onOpenReleaseCheck={(missionId) => navigate(`/missions/${missionId}/passport`)}
              onOpenLocalPilot={() => navigate("/local-pilot")}
              />
            </>
          ) : evidenceMissionId !== undefined ? (
            <>
              <DemoJourneyBridge scopeId={evidenceMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <GuidedLocalProjectJourney projectId={scopedProjectId} missionId={evidenceMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <EvidenceTimeline
              missionId={evidenceMissionId}
              fetcher={fetcher}
              onProjectAvailable={setScopedProjectId}
              onOpenProject={(id) => navigate(`/projects/${id}`)}
              onOpenTwin={(missionId) => navigate(`/missions/${missionId}/twin`)}
              />
            </>
          ) : twinMissionId !== undefined ? (
            <>
              <DemoJourneyBridge scopeId={twinMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <GuidedLocalProjectJourney projectId={scopedProjectId} missionId={twinMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <TwinWorkspace
              missionId={twinMissionId}
              fetcher={fetcher}
              onProjectAvailable={setScopedProjectId}
              onOpenEvidence={(missionId) => navigate(`/missions/${missionId}/evidence`)}
              onOpenReconciliation={(missionId) => navigate(`/missions/${missionId}/reconciliation`)}
              />
            </>
          ) : reconciliationMissionId !== undefined ? (
            <>
              <DemoJourneyBridge scopeId={reconciliationMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <GuidedLocalProjectJourney projectId={scopedProjectId} missionId={reconciliationMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <ReconciliationWorkspace
              missionId={reconciliationMissionId}
              fetcher={fetcher}
              onProjectAvailable={setScopedProjectId}
              onOpenEvidence={(missionId) => navigate(`/missions/${missionId}/evidence`)}
              onOpenTwin={(missionId) => navigate(`/missions/${missionId}/twin`)}
              onOpenExplanation={(missionId) => navigate(`/missions/${missionId}/explanation`)}
              />
            </>
          ) : explanationMissionId !== undefined ? (
            <CitedExplanationWorkspace
              missionId={explanationMissionId}
              fetcher={fetcher}
              onProjectAvailable={setScopedProjectId}
              onOpenReconciliation={(missionId) => navigate(`/missions/${missionId}/reconciliation`)}
            />
          ) : passportMissionId !== undefined ? (
            <>
              <DemoJourneyBridge scopeId={passportMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <GuidedLocalProjectJourney projectId={scopedProjectId} missionId={passportMissionId} currentPath={path} fetcher={fetcher} onNavigate={navigate} />
              <ReadinessPassportWorkspace
              missionId={passportMissionId}
              fetcher={fetcher}
              onProjectAvailable={setScopedProjectId}
              onOpenReconciliation={(missionId) => navigate(`/missions/${missionId}/reconciliation`)}
              onOpenExplanation={(missionId) => navigate(`/missions/${missionId}/explanation`)}
              />
            </>
          ) : (
            <section className="overview-state overview-state--error" role="alert">
              <span className="state-label">NOT FOUND</span>
              <h1>Workspace route not recognized</h1>
              <p>Select an existing Project from the local workspace list.</p>
              <button className="secondary-action" type="button" onClick={() => navigate("/")}>Return to Projects</button>
            </section>
          )}
        </main>
      </div>

      <footer>
        <span>Golden workflow and verified demo support through IL-8.6</span>
        <span>Local API / Deterministic Release Check / Unsigned Evidence Report / No provider call</span>
      </footer>
    </div>
  );
}
