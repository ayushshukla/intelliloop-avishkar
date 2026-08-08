# IntelliLoop Development-Readiness Freeze

**Gate:** R2B — architecture, scope and development boundary  
**Date:** 2026-08-03  
**Decision:** `READY_FOR_BACKLOG_GENERATION`  
**Product:** **IntelliLoop — The Evidence-Reconciled Active Software Twin**

This is the authoritative implementation boundary for the next gate. It freezes what will be built and how the parts meet; it deliberately does not contain the dependency-ordered backlog or an executable first coding prompt.

## 1. Final competition promise

IntelliLoop turns fragmented software-delivery evidence into a living, versioned model of one change. It reconciles requirements, decisions, repository observations and validations; exposes contradictions, staleness and missing impact coverage; answers release questions with validated evidence citations; and produces deterministic release truth and a compact Release Passport.

The primary wedge is retail delivery, but the bounded model generalizes to other software changes. The product is not a tracker, generic RAG interface, code chatbot, static checklist, deployment system or autonomous coding agent.

## 2. Winning demo promise

In five to seven minutes, a judge sees an apparently green retail cancellation change become `BLOCKED` for precise, cited reasons, then become `READY` only after corrective evidence arrives, and optionally become `STALE` after a dependency changes.

The fictional change expands cancellation from `BEFORE_PICKING` to after picking begins but before dispatch. A newer requirement calls for inventory release, refund, fulfilment stop and notification; an older ADR conflicts; the code snapshot shows cancellation/refund work but omits inventory/fulfilment updates; and visible tests miss those paths. IntelliLoop:

1. imports and attributes the sources;
2. constructs the Active Software Twin and bounded code map;
3. identifies the requirement/ADR conflict, unsupported readiness claim and impact/validation gaps;
4. answers “Can we release?” with facts, inferences, gaps and citations;
5. traces impact through order, inventory, refund, fulfilment, notification and tests;
6. accepts an explicit superseding decision and missing implementation/validation evidence;
7. changes deterministic readiness from `BLOCKED` to `READY`;
8. creates a Release Passport reproducing that assessment; and
9. can show `STALE` after a bound source changes.

All data and the repository are controlled synthetic fixtures. The complete path works offline.

## 3. Scope freeze

### Non-cuttable winning core

| ID | Capability | Bounded outcome |
|---|---|---|
| DC-01 | Local project and repository registration | Canonical local project, mission, Git identity and read-only snapshot |
| DC-02 | Bounded evidence ingestion | Markdown, text and JSON become scoped, redacted, digested evidence |
| DC-03 | Active Software Twin | Typed, attributed, revision-aware nodes and relationships |
| DC-04 | Reconcile Core | Deterministic conflicts, staleness, missing support, ambiguity and impact gaps |
| DC-05 | Change-impact traversal | Explainable affected-asset and required-validation paths |
| DC-06 | Evidence-cited explanation | Optional AI with strict citation validation plus complete deterministic fallback |
| DC-07 | Deterministic readiness | Fail-closed `BLOCKED`, `READY` and `STALE` assessment |
| DC-08 | Thin Release Passport | Immutable projection of one assessment, its citations and digest |
| DC-09 | Competition demo workspace | Resettable, synthetic, real-path five-to-seven-minute story |

### Demo-critical enhancement

The bounded TypeScript code map is **kept**. It strengthens the “how did it know that?” moment by extracting manifests, static imports/exports, Fastify-style routes, schema/contract declarations and test associations from the controlled repository. It is not universal semantic understanding.

### MVP supporting

- Evidence timeline and append-oriented knowledge lineage.
- Imported, attributed runtime-observation summaries—never a live production connection.
- AI-suggested synthetic edge cases labeled as advisory.
- Token, timeout, retry, concurrency and session-budget controls.
- Evidence correction through explicit supersession and dependent-output invalidation.
- Privacy guardrails, honest empty states and compact onboarding.

### Stretch, off by default

| Flag | Feature | Boundary |
|---|---|---|
| `experiments.evidenceReplay` | Evidence Replay Lab | Read-only comparison of two immutable snapshots |
| `experiments.agentDisagreement` | Imported multi-agent disagreement | Compare attributed advisory outputs; no orchestration |
| `experiments.remediationPreview` | Guarded Remediation Preview | Cited proposed patch/test plan; never apply, commit, push or deploy |

Cut order is Remediation Preview, disagreement, replay, synthetic suggestions, runtime observations, usage display, and only then the code-map enhancement if its fixed fixture path cannot be made reliable. The nine winning capabilities and the offline explanation path do not get cut.

### Post-competition

Live production twins, shadow traffic, continuous learning/retraining, multi-agent orchestration, autonomous repair/apply/commit/deploy, predictive infrastructure scaling, a multiple-provider fabric, enterprise connectors, enterprise identity/governance and signed Passports are explicitly excluded from the finale claim.

## 4. Source and reuse decision

Development is a `SOURCE_INDEPENDENT_BUILD`.

- `directSourceCopyAuthorized` is `false`.
- No candidate application source qualifies for `REUSE` or `ADAPT`.
- Nine mature DevLoop behaviors are clean-room requirements references.
- Twenty mature ChatVaultAI, ForgeOS, DevDeploy and UI/cockpit behaviors are contract references only.
- No code, schema, prompt, test, prose, asset or UI composition may be copied.
- Published packages can be selected independently under their own licenses; a final dependency/notice audit remains mandatory.

The exact controls and 29 above-50% dispositions are in `r2-reuse-manifest.json` and `r2-feature-maturity.json`.

## 5. Target stack and repository shape

Use an npm-workspaces TypeScript modular monolith:

```text
apps/web              React 18.3.1 + Vite 5.4.21
apps/api              Fastify 5.8.5
packages/domain       Pure deterministic domain logic
packages/contracts    Shared HTTP and persistence-facing contracts
packages/demo-fixtures Synthetic repository and evidence definitions
```

Runtime and tool baseline: Node.js `22.22.0`, npm `10.9.4`, TypeScript `5.9.3` strict mode, SQLite through `better-sqlite3 11.10.0`, Vitest, Fastify injection tests and Playwright Chromium. The API alone owns database access. Windows 11 is the first demo target; Linux CI becomes a build concern after backlog authorization.

Prefer direct, authored domain modules over framework-heavy abstractions. No graph database, vector database, cloud service, container platform or message broker is needed for the competition build.

## 6. Module ownership

| Module | Owns |
|---|---|
| Foundation | configuration, safe logs, errors, database lifecycle, health |
| Projects | project, mission, registered repository and read-only snapshot |
| Evidence | bounded import, redaction, digest, sources, claims and timeline |
| Twin | typed nodes/edges, projection, revisions and invalidation |
| CodeMap | bounded static TypeScript/JavaScript analysis |
| Reconcile | deterministic findings and rule versions |
| Impact | explainable traversal and validation-gap projection |
| AdvisoryAI | context compiler, adapter, citations and offline explanation |
| Readiness | fail-closed assessments and obligations |
| Passport | immutable assessment projection and digest |
| Demo | synthetic fixtures and scoped reset |
| Experiments | the three isolated, disabled stretch features |

Dependencies flow from contracts/domain into API and UI; domain logic must not import web, Fastify, SQLite or provider code. Stretch modules cannot be imported into winning-core domain authority.

## 7. Active Software Twin vocabulary

The ten node types are `Project`, `ChangeMission`, `EvidenceSource`, `Claim`, `SoftwareAsset`, `GitSnapshot`, `ValidationResult`, `ReconciliationFinding`, `ReleaseAssessment` and `ReleasePassport`.

The thirteen relationship types are `SCOPED_TO`, `EXTRACTED_FROM`, `ASSERTS`, `CONCERNS`, `IMPLEMENTS`, `AFFECTS`, `DEPENDS_ON`, `VALIDATED_BY`, `CONTRADICTS`, `SUPERSEDES`, `DERIVED_FROM`, `BOUND_TO` and `BLOCKS`.

Every node and edge carries stable identity, project and mission scope, origin, source locator, digest/revision, recorded time, effective time when known, extraction method and `FACT` or `INFERENCE`. Confidence describes extraction or relationship-match confidence, never truth probability. Findings are `CONFLICT`, `STALE`, `MISSING`, `AMBIGUOUS` or `IMPACT_GAP`.

Corrections append a successor and explicit `SUPERSEDES` edge. They do not rewrite history. A changed source digest, Git snapshot, relationship, validation, rule version or assessment dependency invalidates exact dependent outputs.

## 8. Reconcile Core contract

Canonical reconciliation is deterministic and mission-scoped. Given one immutable Twin revision and a rule-set version, it:

- compares normalized claims with matching subject/predicate and overlapping applicability;
- emits a conflict for incompatible values unless explicit valid supersession resolves the applicability;
- marks bound results stale after a dependency changes;
- detects required evidence or validation missing from the exact scope/snapshot;
- preserves ambiguity instead of guessing;
- traverses critical impact relationships and emits implementation or validation gaps; and
- persists canonical findings with exact inputs and rule versions.

AI may propose structured claims, related evidence, candidate edges, explanations, next actions and synthetic edge cases. It may not invent evidence, silently resolve ambiguity, approve, waive, determine readiness, mutate a repository, claim deployment or receive unredacted secrets.

## 9. Bounded semantic code map

Use the TypeScript compiler API for static structure and the JSON parser for manifests. Allow `.ts`, `.tsx`, `.js`, `.jsx` and `.json` only. Limits are 2,000 files, 5 MiB aggregate, 256 KiB per file and five seconds. Canonicalize the registered root, reject traversal and symlink escape, do not install candidate dependencies and never execute repository code.

The map may claim only files, package metadata, static imports/exports, recognized routes/contracts and evidence-backed test associations. Runtime dependency discovery, other languages and universal semantics are out of scope. On failure or limit breach, the demo may import an IntelliLoop-owned declared asset manifest as evidence and must label unavailable inferred edges honestly.

## 10. Persistence and migrations

One local SQLite database lives outside registered repositories. Core tables are migrations, projects, repositories, missions, Git snapshots, evidence sources, claims, assets, Twin edges, validations, findings, assessments, Passports, advisory requests/responses and timeline events.

Use numbered, forward-only, transactional SQL migrations recorded in `schema_migrations`. Startup fails safely if a database has an unknown newer schema. Test empty bootstrap and upgrade from every retained prior fixture. Stable UUIDs and unique scope/digest/revision constraints prevent duplicate import. Derived rows record schema and rule versions. Competition-flow deletion is archival/supersession; only the dedicated demo workspace can be reset.

## 11. Bounded API surface

All routes are JSON under `/api/v1`, except ordinary navigation assets. The families are health; projects; project repository; missions; evidence import; Twin retrieval; code-map run/retrieval; reconciliation; findings; impact; cited question; assessments; Passports; and scoped demo reset.

Boundaries require schema validation, stable error codes, request IDs and bounded pagination. Ordinary responses do not expose raw absolute paths. There are no shell, arbitrary-execution, repository-write, patch, commit, push, deploy or credential endpoints.

## 12. UI route map and trust UX

The eight screens are welcome/project selection, change overview, evidence/timeline, Active Twin, reconcile findings, impact paths, cited explanation, and readiness/Passport. The authoritative data source is the API; no screen may derive green status from placeholder or sample values.

`FACT`, `INFERENCE`, `CONFLICT`, `MISSING`, `BLOCKED`, `READY`, `STALE`, `AI_OFF` and `AI_ASSISTED` are visible through text/icon treatment, not color alone. A graph can improve the Twin view, but an accessible list/path projection remains authoritative. The primary flow must work by keyboard and at the 1366×768 demo baseline.

## 13. AI adapter and citation contract

One provider-neutral interface accepts a mission question, redacted evidence pack, evidence-pack digest, allowlisted citation IDs, structured-output schema and limits. The response separates answer, facts, inferences, conflicts, gaps, next actions, citations and safe provider/usage metadata.

Every response is rejected unless its request identity, pack digest and JSON shape match and every citation is in the provided allowlist. An AI response has no readiness-authority field. The offline renderer consumes the same findings and impact paths and labels itself `DETERMINISTIC_EXPLANATION`.

External calls are off by default. Defaults are one concurrent request, 20-second timeout, one retry, 12,000 input tokens, 1,200 output tokens and a 50,000-token session budget. Returned token use may be stored; cost is clearly estimated rather than represented as billing truth. Credentials and raw request bodies do not enter normal logs.

## 14. Personal OpenAI course-correction checkpoint

Status is `SPECIFIED_NOT_EXECUTED`. It occurs mid-development only after evidence/redaction, Twin projection, conflict/staleness, stable citation pack, AI-off golden flow and mocked adapter tests pass.

At the checkpoint, a personal credential is injected at runtime through an environment variable or operating-system secret facility. It is never committed, persisted or printed. The user sees the outbound redacted pack and explicitly enables external calls.

The fixed evaluation set covers the primary release question, conflict explanation, impact, missing validation, post-correction explanation and an adversarial unknown-citation response. Measure grounding, citation validity, usefulness, latency, token use, redaction and improvement over the deterministic explanation. The outcome is one of:

- use a live provider in the finale;
- correct the prompt/evidence pack and retest; or
- keep the finale offline.

No credential was used and no live call was made in R2. Startup, tests, reconciliation, impact, readiness and Passport do not require OpenAI.

## 15. Deterministic readiness and Passport

Readiness is fail-closed. `READY` requires valid integrity, exact mission/snapshot binding, no unresolved critical conflict or impact gap, every required validation passing, explicit review and current dependencies. Sample, fallback, AI advice, unpersisted results, unknown-scope validation and stale evidence cannot create green state.

A Passport is an immutable projection of one persisted assessment. It stores scope, snapshot, rule version, evidence digest, status, obligations, blockers, findings, validations, citations and its own digest. It reproduces; it does not recompute. Dependency changes retain history and visibly mark the assessment, answers and Passport `STALE`.

## 16. Twelve AI-mastery concepts reconciled

| Concept | Competition disposition |
|---|---|
| Dual-engine/shadow execution | Post; competition compares offline and optional advisory explanations only |
| Automated discrepancy reconciliation | Core deterministic Reconcile Core |
| Continuous feedback | Imported attributed runtime observations; no learning loop |
| Explainable AI auditing | Core lineage, digest, fact/inference and validated citations |
| Multi-agent collaboration | Stretch imported disagreement; orchestration post |
| Semantic code understanding | Bounded TypeScript map kept as demo-critical enhancement |
| Self-healing code | Non-applying stretch preview; autonomy post |
| Synthetic data | Controlled retail fixture and advisory edge cases |
| Governance/guardrails | Minimal hard safety, citation and readiness boundaries |
| Multi-modal state sync | Versioned text, JSON and code evidence in one Twin |
| Predictive scaling | Post; only usage/budget controls now |
| Version-controlled knowledge | Core append-oriented lineage, supersession and temporal staleness |

## 17. Repository, privacy and network safety

Bind locally, make no network call by default and keep the database outside registered repositories. Repository access is canonical, read-only and allowlisted; reject traversal and symlink escapes. Never invoke repository mutations or arbitrary project code. Imports are typed and size-limited. Redact before persistence and again before optional transfer. Tests must prove a sentinel secret is absent from database, logs, responses, exports and provider fixtures.

The demo contains no Nisum, client, employer, private repository or personal content.

## 18. Test and proof strategy

The pyramid is:

- pure unit tests for normalization, conflicts, supersession, invalidation, impact, readiness, citations, redaction and code-map limits;
- API/database integration tests for migrations, import, snapshots, Twin projection, reconciliation, assessment/Passport equality, restart and mocked AI;
- UI component tests for trust semantics, graph/list parity and honest blocked/error/AI-off states;
- Playwright for the complete `BLOCKED → READY → STALE` golden flow, demo reset and key negative paths; and
- non-functional gates for no repository mutation, no default network, no secret sentinel, restart persistence, five-to-seven-minute rehearsal and 1366×768 visual quality.

The winning core and offline story must pass with every stretch flag disabled and without an OpenAI credential.

## 19. Feature flags and cut discipline

`ai.externalCalls` defaults off. `codeMap.enabled` defaults on for the controlled fixture. All three `experiments.*` flags default off. Disabled modules must neither alter domain state nor appear as completed in UI or claims. Schedule cuts follow the frozen cut order and cannot weaken deterministic reconciliation, impact, readiness, Passport or the offline finale.

## 20. Risks and controls

| Risk | Control |
|---|---|
| Source/competition ownership policy remains unknown | No direct source copy; retain clean-room provenance ledger |
| Ambition harms reliability | Nine non-cuttable capabilities, explicit cut order, stretch off |
| Code map is overclaimed | Strict language/size/time boundary and declared-evidence fallback |
| Provider unavailable or ungrounded | Complete offline path and unknown-citation rejection |
| Graph polish consumes schedule | Accessible list/path view remains authoritative |

## 21. Assumptions and non-blocking unknowns

Assumptions: individual participation permits a local synthetic prototype; the demo machine supports Node 22 and SQLite; a personal OpenAI configuration may be tested later but is not guaranteed.

Non-blocking unknowns are final judging weights/packaging, finale connectivity, optional model selection, final graph rendering choice and the dependency notice inventory after installation. None prevents backlog generation because the core is offline, source-independent and bounded.

## 22. Definition of Ready

All criteria pass:

- product, wedge, narrative and five-to-seven-minute outcome are frozen;
- all nine winning capabilities have bounded ownership and proof expectations;
- 18 feature families and six authorized candidates were assessed;
- all 29 candidate-feature records above 50% have explicit dispositions;
- no permission was inferred and no source copy is authorized;
- stack, modules, persistence, migrations, API and routes are frozen;
- Twin vocabulary, reconciliation authority and AI boundary are frozen;
- the bounded code map has a keep decision, limits and fallback;
- demo fixtures, transition states and offline golden flow are frozen;
- the personal OpenAI checkpoint is complete as a contract and remains unexecuted;
- stretch cannot block the winning core;
- test, restart, negative-path, privacy and repository-safety gates are defined;
- no candidate was modified and no product source was created in R2; and
- no detailed backlog or executable first coding prompt exists.

## 23. Development sequencing constraint

The next authorized artifact may translate this freeze into a dependency-ordered backlog. It should begin with foundation and deterministic domain seams, preserve vertical proof slices, place the personal OpenAI checkpoint only after the deterministic/offline entry criteria, and leave stretch work after the entire golden flow. This paragraph is a sequencing constraint, not the backlog.

## 24. Gate decision

Architecture and build-versus-reference choices are sufficiently frozen to generate the backlog. Every demo-critical capability has a greenfield path, the AI-mastery ideas are honestly bounded, the code map is retained without overclaiming, and provider use cannot compromise canonical truth or offline reliability.

`INTELLILOOP_DEV_READY_FOR_BACKLOG_GENERATION`
