# IntelliLoop Judge Q&A

**Document ID:** `DOC-20`  
**Implemented through:** `IL-8.6` / `G5_CORE_DEMONSTRABLE`  
**Demo mode:** local, synthetic, deterministic explanation, external AI off

Use the first sentence of each answer when time is limited. Expand only when asked.

## Product and innovation

### What problem does IntelliLoop solve?

Software release decisions are slowed by fragmented requirements, code structure, validation, operational observations and review history. IntelliLoop reconciles those sources into an attributed Active Software Twin, exposes contradictions and impact paths, and evaluates whether the exact persisted candidate is `BLOCKED`, candidate `READY` or historically `STALE`.

### Who benefits?

Developers gain faster evidence discovery, technical leads gain explicit impact and validation paths, release managers gain a reproducible readiness record, and delivery leaders gain a clearer review trail. These benefits are the product hypothesis; organizational time savings and outcome improvement have not yet been measured and remain owned by `IL-9.4`.

### What is the innovation beyond a dashboard or generic chatbot?

IntelliLoop separates deterministic authority from explanation. Versioned evidence, exact Git snapshots, Twin relationships, reconciliation findings, readiness obligations and Passport projection are computed and persisted by bounded rules; explanation is cited and advisory. A fluent answer cannot silently change the evidence or produce green readiness.

### Why call it an Active Software Twin?

It is a revisioned, attributed model connecting a change Mission to evidence, claims, software assets, validation and their dependencies. “Active” means a new authoritative input can invalidate exact dependants and make earlier readiness stale; it does not mean autonomous code changes or deployment.

## AI and trust

### Where is AI used in this demonstrated version?

The product includes an AI-ready, provider-neutral cited-explanation boundary, but the competition workflow deliberately runs the deterministic explanation with external AI off. The exact minimized/redacted pack is shown as `NOT SENT`; the current course-correction decision is to keep a provider optional and keep the demo offline.

### Is this still an AI innovation when the demo is AI-off?

Yes: the architecture is designed for bounded, cited AI assistance without granting AI canonical authority, while the trusted core remains useful during provider failure or policy restrictions. This demo proves the safer baseline; it does not claim measured model quality or a live-provider integration.

### What data leaves the machine?

None in the demonstrated workflow. Browser traffic is restricted to loopback, the provider path is disabled, no credential is read, and the evidence gate observed zero non-loopback requests and zero authorization headers. This is tested local behavior, not an operating-system network sandbox or universal DLP guarantee.

### Can AI approve a release or alter findings?

No. AI output is advisory, cited and excluded from canonical evidence, reconciliation, readiness and Passport authority. The application exposes no release approval, signing, deployment or autonomous remediation action.

## Evidence and behavior

### What does `READY` mean?

It means nine deterministic obligations pass for one exact persisted input set: integrity, scope, findings, validation, review, freshness, provenance, persistence and completeness. It is candidate readiness, not a guarantee that the release is correct, safe, approved or deployed.

### Why does READY become STALE?

The demo changes a fixture-owned dependency after the READY assessment. IntelliLoop compares current authoritative inputs with the assessment binding, marks the association `STALE`, and preserves the historical READY assessment and Passport bytes instead of rewriting history.

### What is the Release Passport?

It is an immutable structural projection of one persisted ReleaseAssessment, including bindings, obligations, blockers, citations, validation and review metadata. It is unsigned, non-approving and non-deploying; its digest is integrity evidence, not a signature or attestation.

### How do you prevent false green states?

The readiness evaluator fails closed. Missing, stale, failed, inconclusive, unscoped, synthetic-fallback-only, AI-produced or unpersisted required inputs cannot create `READY`; controlled proof currently records one valid positive case, 26 non-ready cases and zero false READY outcomes.

### Does IntelliLoop execute or modify my repository?

Registered repositories are inspected read-only with bounded Git/static analysis and are never executed or dependency-installed. The LoopMart demo creates and changes only an IntelliLoop-owned repository inside its disposable data directory; repository-safety evidence verifies registered repository equality.

### Is the demo using customer, employer or personal data?

No. LoopMart is an IntelliLoop-authored fictional fixture with fixed provenance, privacy checks and deterministic hashes. It must not be described as a production pilot, customer deployment or measured business outcome.

## Feasibility, scale and limits

### How would this scale beyond the prototype?

The domain contracts, bounded APIs, append-only history and provider-neutral explanation seam provide a path to authenticated shared storage, supported validation/review connectors and enterprise controls. Production scale, multi-user authorization, live telemetry, service-level performance and connector security are not implemented or claimed.

### What measurable value can you claim today?

Today we can claim reproducible prototype behavior: exact state transitions, citation/path validity checks, restart recovery, repository equality, accessibility checks and deterministic evidence hashes. Submitted productivity and time-saving benefits remain hypotheses until the controlled `IL-9.4` measurement protocol is completed.

### What happens if the live demo fails?

The application displays `UNAVAILABLE` and invents no replacement readiness. Use **Retry demo workspace** after restoring the API; if truthful recovery is not possible, disclose the switch and open the tested static [recorded fallback](fallback/index.html), whose seven images and hashes are recorded in the [asset manifest](DEMO_ASSET_MANIFEST.json).

### What are the most important current limitations?

This is a local single-user prototype using a synthetic scenario. It has no authentication, production telemetry, public validation/review intake, live provider transport, Passport signature, release approval or deployment authority. Official Avishkar rules are still unverified, so final eligibility/compliance remains a Phase-9 gate.

