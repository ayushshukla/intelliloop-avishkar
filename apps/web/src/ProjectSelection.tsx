import { useEffect, useState } from "react";

import type { ProjectResource } from "@intelliloop/contracts";

import {
  WorkspaceClientError,
  createProject,
  listProjects
} from "./workspace-client";

export interface ProjectSelectionProps {
  readonly fetcher: typeof fetch;
  readonly onOpenProject: (projectId: string) => void;
}

type ProjectSelectionState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly projects: readonly ProjectResource[] };

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local project workspace could not be loaded.";
}

export function ProjectSelection({
  fetcher,
  onOpenProject
}: ProjectSelectionProps): JSX.Element {
  const [state, setState] = useState<ProjectSelectionState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void listProjects(fetcher, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setState({ kind: "ready", projects: response.projects });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ kind: "error", message: safeMessage(error) });
        }
      });
    return () => controller.abort();
  }, [attempt, fetcher]);

  async function submitProject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalized = name.trim();
    if (normalized.length < 1 || normalized.length > 120) {
      setCreateError("Enter a project name from 1 to 120 characters.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await createProject(normalized, fetcher);
      setName("");
      onOpenProject(response.project.projectId);
    } catch (error) {
      setCreateError(safeMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="project-selection" aria-labelledby="projects-title">
      <div className="section-heading section-heading--wide">
        <p className="eyebrow">Local workspaces</p>
        <h2 id="projects-title">Choose a Project</h2>
        <p>
          Every Project is persisted by the local API. Nothing shown here is a
          sample, fallback, or inferred workspace.
        </p>
      </div>

      <div className="project-selection__content">
        {state.kind === "loading" ? (
          <div className="inline-state" role="status" aria-live="polite" aria-busy="true">
            <span className="state-label">LOADING</span>
            <strong>Reading local Projects</strong>
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className="inline-state inline-state--error" role="alert">
            <span className="state-label">ERROR</span>
            <strong>Projects unavailable</strong>
            <p>{state.message}</p>
            <button
              className="secondary-action"
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry Project list
            </button>
          </div>
        ) : null}

        {state.kind === "ready" && state.projects.length === 0 ? (
          <div className="inline-state inline-state--empty" data-state="EMPTY">
            <span className="state-label">EMPTY</span>
            <strong>No Project exists yet</strong>
            <p>Create the first real local Project below.</p>
          </div>
        ) : null}

        {state.kind === "ready" && state.projects.length > 0 ? (
          <ul className="project-list" aria-label="Available Projects">
            {state.projects.map((project) => (
              <li key={project.projectId}>
                <div>
                  <span className="record-state">{project.status}</span>
                  <h3>{project.name}</h3>
                  <p>
                    Revision {project.revision} · Updated {project.updatedAtUtc}
                  </p>
                </div>
                <button
                  className="secondary-action secondary-action--neutral"
                  type="button"
                  onClick={() => onOpenProject(project.projectId)}
                  disabled={project.status !== "ACTIVE"}
                >
                  Open Work Item overview
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <form className="creation-form" onSubmit={(event) => void submitProject(event)}>
          <div>
            <label htmlFor="project-name">New Project name</label>
            <p id="project-name-help">Use a concise local workspace name. Do not enter credentials.</p>
          </div>
          <div className="field-action">
            <input
              id="project-name"
              name="projectName"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              aria-describedby="project-name-help"
              maxLength={120}
              autoComplete="off"
              disabled={creating}
            />
            <button className="primary-action" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create Project"}
            </button>
          </div>
          {createError === null ? null : (
            <p className="form-error" role="alert">{createError}</p>
          )}
        </form>
      </div>
    </section>
  );
}
