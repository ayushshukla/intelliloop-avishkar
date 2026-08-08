export function AiBoundaryPanel(): JSX.Element {
  return (
    <section className="ai-boundary" aria-labelledby="ai-boundary-title" data-state="AI_OFF">
      <p className="state-label">AI_OFF</p>
      <h2 id="ai-boundary-title">External AI is off</h2>
      <p>No credential is read and no evidence leaves this local foundation.</p>
    </section>
  );
}

export function FoundationEmptyState(): JSX.Element {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title" data-state="EMPTY">
      <div className="empty-state__marker" aria-hidden="true">0</div>
      <div>
        <p className="state-label">EMPTY</p>
        <h2 id="empty-state-title">No project workspace exists yet</h2>
        <p>
          Create the first persisted Project through the local API. Nothing is sampled, inferred or presented as current work.
        </p>
      </div>
    </section>
  );
}
