import { useEffect, useState } from "react";

import type { LocalProjectSafeRepository } from "@intelliloop/contracts";

import { getLocalProjectContext } from "./local-pilot-client";

export interface GuidedLocalProjectJourneyProps {
  readonly projectId: string | undefined;
  readonly missionId: string | undefined;
  readonly currentPath: string;
  readonly fetcher: typeof fetch;
  readonly onNavigate: (path: string) => void;
}

const STEPS = [
  ["Work Item", "project"],
  ["Linked Evidence", "evidence"],
  ["Impact Map", "twin"],
  ["Resolve Conflicts", "reconciliation"],
  ["Release Check", "passport"],
  ["Release Evidence Report", "report"]
] as const;

export function GuidedLocalProjectJourney({
  projectId,
  missionId,
  currentPath,
  fetcher,
  onNavigate
}: GuidedLocalProjectJourneyProps): JSX.Element | null {
  const [repository, setRepository] = useState<LocalProjectSafeRepository | null>(null);

  useEffect(() => {
    if (projectId === undefined) {
      setRepository(null);
      return undefined;
    }
    const controller = new AbortController();
    void getLocalProjectContext(projectId, fetcher, controller.signal).then(
      (response) => { if (!controller.signal.aborted) setRepository(response.repository); },
      () => { if (!controller.signal.aborted) setRepository(null); }
    );
    return () => controller.abort();
  }, [fetcher, projectId]);

  if (repository === null || projectId === undefined) return null;
  return (
    <section className="guided-context guided-context--local" aria-label="Local Project Work Item journey">
      <div className="guided-context__summary">
        <div>
          <span className="guided-context__fixture">LOCAL PROJECT / READ ONLY</span>
          <strong>{repository.displayName}</strong>
          <small>{repository.ref} · exact commit <code>{repository.exactCommit.slice(0, 12)}…</code></small>
        </div>
        <div className="guided-context__axes">
          <span>Workflow Status <strong>Not tracked</strong></span>
          <span>External AI <strong>Off</strong></span>
        </div>
      </div>
      {repository.uncommittedChanges === "EXCLUDED" ? (
        <p className="guided-context__notice" role="note">
          {repository.excludedChangeCount} uncommitted change(s) are visible only as an excluded count; analysis reads committed Git objects.
        </p>
      ) : null}
      <ol className="guided-steps" aria-label="Local Project journey steps">
        {STEPS.map(([label, kind], index) => {
          const route = kind === "project"
            ? `/projects/${projectId}`
            : missionId === undefined
              ? undefined
              : kind === "report"
                ? `/missions/${missionId}/passport#release-evidence-report`
                : `/missions/${missionId}/${kind}`;
          const current = route !== undefined &&
            (currentPath === route || (kind === "report" && currentPath.includes("/passport")));
          return (
            <li key={kind} className={current ? "guided-step guided-step--current" : "guided-step"}>
              <button type="button" disabled={route === undefined} onClick={() => route !== undefined && onNavigate(route)}>
                <span>{String(index + 1).padStart(2, "0")}</span>{label}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="guided-context__notice">No demo reset, synthetic correction, or fixture commit action is available for Local Projects.</p>
    </section>
  );
}
