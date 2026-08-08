import type { HealthViewState } from "./health-client";

export interface HealthPanelProps {
  readonly state: HealthViewState;
  readonly onRetry?: () => void;
}

export function HealthPanel({ state, onRetry }: HealthPanelProps): JSX.Element {
  if (state.kind === "loading") {
    return (
      <section className="health-card" aria-labelledby="health-title" aria-live="polite" aria-busy="true" role="status" data-state="LOADING">
        <div className="health-card__signal health-card__signal--checking" aria-hidden="true" />
        <div>
          <p className="state-label">LOADING</p>
          <h2 id="health-title">Checking the local foundation</h2>
          <p>Waiting for the versioned API contract. No external service is contacted.</p>
        </div>
      </section>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <section className="health-card health-card--unavailable" aria-labelledby="health-title" role="alert" data-state="ERROR">
        <div className="health-card__signal health-card__signal--unavailable" aria-hidden="true" />
        <div>
          <p className="state-label">ERROR</p>
          <h2 id="health-title">Foundation unavailable</h2>
          <p>{state.message}</p>
          <p className="health-card__assurance">No cached status, sample response or placeholder is substituted.</p>
          {onRetry === undefined ? null : (
            <button className="secondary-action" type="button" onClick={onRetry}>Try local API again</button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="health-card health-card--connected" aria-labelledby="health-title" aria-live="polite" role="status" data-state="CONNECTED">
      <div className="health-card__signal health-card__signal--connected" aria-hidden="true" />
      <div className="health-card__content">
        <p className="state-label">CONNECTED</p>
        <h2 id="health-title">Foundation connected</h2>
        <p>The browser and local API agree on the bounded health contract.</p>
        <p className="health-card__assurance">Operational connection only - not release readiness.</p>
        <dl className="health-facts">
          <div><dt>Service</dt><dd>{state.data.service}</dd></div>
          <div><dt>API</dt><dd>{state.data.apiVersion}</dd></div>
          <div><dt>Mode</dt><dd>Foundation only</dd></div>
          <div><dt>External AI</dt><dd>Off</dd></div>
        </dl>
      </div>
    </section>
  );
}
