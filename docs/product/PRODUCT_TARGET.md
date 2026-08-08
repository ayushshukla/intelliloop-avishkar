# IntelliLoop Product Target

**Audience:** Product, design, engineering and assurance contributors  
**Status:** `DURABLE_TARGET / PHASE_1_BASELINE`  
**Evidence date:** 2026-08-07

## Product in plain language

IntelliLoop helps a delivery team decide whether a software change has enough current, consistent and cited evidence to become a release candidate. It brings work context, exact repository state, code structure, validation and review evidence into one inspectable trail; shows conflicts, gaps and affected paths; and records one deterministic Release Check as an immutable, unsigned Release Evidence Report.

Primary users are developers preparing a change, technical leads reviewing impact and evidence, and engineering/release managers checking candidate readiness. IntelliLoop supports their accountable decision; it does not approve or deploy a release for them.

## Jira-familiar Work Item workflow

The target experience begins with a **Work Item** familiar to Jira users: title, description, acceptance criteria, owner/team context, lifecycle status and linked change evidence. A Work Item binds to one exact repository commit/snapshot, accumulates attributed evidence, exposes an Active Software Twin and impact view, runs the deterministic Release Check, and preserves the resulting Release Evidence Report. Current `Project` and `Change Mission` terminology remains implemented until the separately verified Phase-2 migration; this target does not rename runtime contracts by itself.

## Unique value

Typical trackers show planned work, source tools show code, and CI/review tools show separate results. IntelliLoop's differentiator is the deterministic reconciliation layer between them: every readiness obligation is bound to exact persisted inputs, every explanation is cited, contradictory or stale evidence fails closed, and historical results cannot be rewritten when the world changes.

## Ten-phase target roadmap

1. **Evidence-backed baseline and closure preparation:** establish the real repository state, preserve the deterministic core, and leave human/external competition work honestly pending.
2. **Work Item terminology and UX migration:** introduce Jira-familiar language and navigation without changing readiness authority or stored truth.
3. **Unified Work Item lifecycle:** make planning context, acceptance criteria, ownership and evidence collection coherent around one bounded change.
4. **Exact repository evidence:** strengthen read-only registration, commit-pinned indexing and source-free analysis while retaining non-execution.
5. **Active Software Twin and impact:** evolve attributed change structure, dependency paths and deterministic conflict/gap analysis.
6. **Validation and review evidence:** support trustworthy, provenance-preserving validation/review ingestion and explicit correction without silent truth selection.
7. **Release Check and Evidence Report:** refine the single fail-closed authority, immutable assessment history and stored-report presentation.
8. **Guarded AI assistance:** add cited, redacted advisory help only where it can be independently validated and cannot change canonical state.
9. **Enterprise integrations and operability:** add authorized connector, identity, audit, backup/restore and operational controls with fail-closed boundaries.
10. **Production evidence and governance:** complete security, scale, reliability and genuine human/business pilots before any production or value claim.

Each phase must reuse verified current capabilities where appropriate; the roadmap is not permission to rebuild working foundations or pre-claim later outcomes.

## Invariants no phase may weaken

- one deterministic persisted Release Check/readiness authority;
- stored Release Evidence Reports reproduce assessments and never recompute history;
- AI has no truth-selection, finding-resolution, readiness, approval, evidence-supersession or mutation authority;
- registered repositories remain commit-pinned, read-only and never executed;
- remediation remains guarded/default-off and never auto-applies source changes;
- redaction precedes logging, non-local hashing/storage and AI transfer;
- incomplete, stale, conflicting, unsupported or tampered required evidence fails closed;
- assessments, reports and evidence history remain immutable and provenance-preserving;
- AI-disabled operation retains the full deterministic path; and
- secrets, private/internal data and personal information stay out of product and evidence artifacts.
