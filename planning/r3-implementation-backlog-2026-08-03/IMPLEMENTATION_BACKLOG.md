# IntelliLoop Dependency-Ordered Implementation Backlog

**Status:** `G5_CORE_DEMONSTRABLE` / Phase 9 release verification, security and canonical documentation through `IL-9.3`  
**Scope authority:** R2 development-readiness freeze  
**Execution rule:** Complete and verify one story before silently expanding its scope. A phase gate must pass before the next authority-bearing phase begins.

**Current checkpoint (2026-08-07):** Phase-1 repository reconciliation confirms `58/62` stories as complete from implementation, schema, tests, UI, fixtures and generated evidence—not from the prior count alone. The complete set is 55 mandatory stories through `IL-9.3` plus all three default-off optional stories. `IL-9.4`, `IL-9.6` and `IL-9.7` are `PARTIAL`; `IL-9.5` is `BLOCKED` on an official rules source. `IL-9.4` product-measurement generation, management QA, claim mapping and paired-pilot validation are implemented, but genuine role timings/feedback and sourced cadence do not exist. The development repository has an unborn `main` branch and every project path was untracked at entry, so no final freeze/tag/commit is claimed. Linux is configured in CI but not locally observed. No benefit result or production extrapolation is authorized. See `docs/product/EXECUTION_STATE.md`.

## Story contract

Every story is complete only when:

1. its user-visible or operational outcome works through the intended layer;
2. domain and trust invariants have executable tests;
3. failure, empty and stale behavior is honest;
4. security, privacy, repository and network boundaries remain intact;
5. affected professional documents are updated;
6. commands and exit states are recorded;
7. no fixture, fallback, UI default or AI output is treated as canonical evidence; and
8. the story's completion evidence is linked from the evidence dossier.

Priorities are `P0` non-cuttable, `P1` demo-critical/supporting and `P2` optional stretch. Estimates are relative sizing aids, not deadlines.

## Phase 1 — Foundation and trust baseline

### Exit gate: `G1_FOUNDATION_RUNNABLE`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-1.1` Clean-room workspace and offline health slice | P0 / M | Pinned npm workspaces contain runnable web, API, domain, contracts and fixture packages; API health and honest web foundation render offline | None | Clean install; strict typecheck; unit test; production build; Fastify injection health test; browser smoke; no credential or network requirement |
| `IL-1.2` Safe configuration, errors, request IDs, logging and flags | P0 / M | Typed startup configuration, localhost binding, stable errors, safe structured logs and frozen flag defaults | `IL-1.1` | Invalid configuration fails safely; request IDs propagate; secret sentinel absent from logs; all external/experiment flags default off |
| `IL-1.3` Deterministic domain and contract primitives | P0 / M | Stable IDs, UTC clock injection, canonical JSON/digest, scope/origin/revision types and error contracts exist without infrastructure imports | `IL-1.1` | Canonicalization vectors; deterministic clock/ID tests; package-boundary test; exhaustive type checks |
| `IL-1.4` SQLite lifecycle and migration baseline | P0 / L | API-owned database outside registered repositories bootstraps via forward-only transactional migration `001` | `IL-1.2`, `IL-1.3` | Empty bootstrap; restart; rollback on failed migration; unknown-newer-schema refusal; concurrent startup behavior |
| `IL-1.5` Web trust shell and API client states | P0 / M | Accessible route shell, API client and loading/empty/error/AI-off states contain no fake readiness or product data | `IL-1.1`, `IL-1.2` | Component tests; keyboard navigation; health integration; network failure shown honestly; no green placeholder |
| `IL-1.6` Foundation proof and documentation baseline | P0 / S | Foundation evidence, setup, architecture, testing, security, provenance, AI-use and notice documents reflect only implemented behavior | `IL-1.3`, `IL-1.4`, `IL-1.5` | `EV-FOUNDATION`; documentation link check; clean setup commands re-run from documented path |

Phase 1 prohibition: no product domain claim beyond foundation health and trust-state scaffolding.

## Phase 2 — Projects, missions and read-only repository evidence

### Exit capability: `DC-01`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-2.1` Project and Change Mission domain | P0 / M | Project and mission identities, lifecycle, scope and revisions are deterministic and project-isolated | `IL-1.3` | Invariant/state tests; cross-project rejection; archive/current-mission behavior |
| `IL-2.2` Project/Mission persistence and API | P0 / L | Projects and missions persist, restart and expose bounded `/api/v1` contracts | `IL-1.4`, `IL-2.1` | Migration/integration tests; schema errors; idempotency where defined; restart equality; API reference update |
| `IL-2.3` Safe local repository registration | P0 / L | A mission can bind a canonical, allowlisted local repository root read-only without exposing its raw path normally | `IL-2.2` | Missing/non-Git/traversal/symlink cases; duplicate binding; database outside root; no write operation |
| `IL-2.4` Read-only Git snapshot capture | P0 / L | Branch/detached state, HEAD, index/worktree summary and changed-file digest become an immutable `GitSnapshot` | `IL-2.3` | Clean/dirty/unborn/detached fixtures; stable digest; timeout/error mapping; before/after repository equality |
| `IL-2.5` Project selection and change overview UI | P0 / L | User creates/selects a project and mission, registers the controlled repository and sees attributed snapshot truth | `IL-1.5`, `IL-2.2`, `IL-2.4` | Browser happy/failure flows; restart retrieval; path-safe display; keyboard path; no inferred readiness |
| `IL-2.6` Repository-safety proof and operator docs | P0 / S | `DC-01` receives a reproducible proof record and user/setup/API docs reflect repository limits | `IL-2.5` | `EV-REPO-SAFETY`; status/digest equality; safety negative corpus; docs verified |

Phase 2 prohibition: no shell endpoint, repository write, checkout, reset, install or execution of registered code.

## Phase 3 — Evidence ingestion, claims and lineage

### Exit capability: `DC-02` plus `SUP-01`, partial `SUP-05` and `SUP-06`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-3.1` Bounded import, redaction and digest pipeline | P0 / L | Markdown, text and JSON inputs are typed, size-limited, normalized, redacted before persistence and deterministically digested | `IL-1.3`, `IL-1.4` | Allowed/denied formats; malformed/oversize rejection; secret patterns; stable digest; atomic failure |
| `IL-3.2` Evidence persistence, attribution, idempotency and timeline | P0 / L | Imported sources retain origin, locator, revision/digest, times and append-oriented events without duplicate current records | `IL-2.2`, `IL-3.1` | Same-import idempotency; project/mission isolation; restart; immutable attribution; pagination |
| `IL-3.3` Claim normalization and explicit supersession intake | P0 / L | Evidence can produce bounded structured claims with comparison keys, applicability and explicit successor links | `IL-3.2` | Normalization vectors; conflicting raw text preserved; invalid supersession rejection; history intact |
| `IL-3.4` Evidence and claim API contracts | P0 / M | Import preview/commit, retrieval, timeline and claim/supersession endpoints are bounded and schema validated | `IL-3.2`, `IL-3.3` | Fastify injection suite; stable errors; no raw secrets/path leakage; request IDs |
| `IL-3.5` Evidence/timeline UI | P0 / L | User previews redaction, imports evidence and sees provenance, revisions, fact/inference labels and supersession history | `IL-2.5`, `IL-3.4` | Browser import/restart/failure paths; no trust-by-color alone; empty and integrity-error states |
| `IL-3.6` Evidence privacy proof and trust documentation | P0 / M | Secret sentinel is absent from logs, DB, API, export fixtures and AI-pack fixtures; trust model is documented | `IL-3.5` | `EV-PRIVACY`; initial security review; docs and negative corpus review |
| `IL-3.7` Imported runtime-observation summaries | P1 / M | Bounded attributed JSON summaries enter through evidence paths and remain historical observations, never a live production feed | `IL-3.4`, `IL-3.6` | Schema/size/source tests; duplicate and stale observation behavior; offline-only proof; no direct readiness authority |

Phase 3 prohibition: imported claims are evidence, not automatically true and not readiness authority.

## Phase 4 — Active Software Twin and bounded code map

### Exit gate: `G2_EVIDENCE_TWIN_PROVEN`; capabilities `DC-03` and `ENH-01`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-4.1` Twin node/relationship domain vocabulary | P0 / L | The ten node and thirteen relationship types enforce scope, attribution, revision and epistemic metadata | `IL-3.3` | Vocabulary/invariant tests; exhaustive serialization; invalid cross-scope edge rejection |
| `IL-4.2` Twin projection, revisions and invalidation graph | P0 / XL | Evidence, claims, repository snapshots and validations project into immutable revisions with exact dependency invalidation | `IL-3.2`, `IL-4.1` | Same-input determinism; changed digest invalidates dependents; historical projection unchanged; restart |
| `IL-4.3` Twin persistence, API and accessible list projection | P0 / L | Mission Twin revisions and attributed paths persist and are retrievable through bounded APIs and authoritative list view | `IL-1.4`, `IL-4.2` | Database/API integration; pagination; revision selection; list path citations; integrity error |
| `IL-4.4` Code-map filesystem safety and limits | P1 / L | Scanner canonicalizes the registered root, applies file/byte/time/extension limits and never executes or installs repository code | `IL-1.3`, `IL-2.3` | Traversal/symlink/oversize/timeout/unsupported-extension tests; before/after repository equality |
| `IL-4.5` Bounded TypeScript/JSON extraction | P1 / XL | Compiler API extracts files, manifests, imports/exports, recognized Fastify routes/contracts and evidence-backed test associations | `IL-4.4` | Golden parser fixtures; syntax-error partial result; deterministic ordering; no runtime claim |
| `IL-4.6` Code-map Twin projection and declared-manifest fallback | P1 / L | Extracted assets/edges bind to one snapshot; safe failure can use an explicitly declared IntelliLoop fixture manifest | `IL-4.3`, `IL-4.5` | Snapshot binding; inferred versus declared labels; parser failure fallback; no silent equivalence |
| `IL-4.7` Twin/code-map UI, proof and documentation | P0/P1 / L | User sees attributed nodes and explainable paths in an accessible list, with visualization optional and bounded limitations explicit | `IL-3.5`, `IL-4.6` | `EV-TWIN`; `EV-CODEMAP`; graph/list parity if graph exists; restart; domain/API docs |

Cut rule: if `IL-4.5` cannot reliably pass the controlled fixture after bounded correction, retain `IL-4.4`, use `IL-4.6` declared evidence and visibly mark parser inference unavailable. `DC-03` cannot be cut.

## Phase 5 — Reconcile Core and explainable impact

### Exit deterministic-core authority: `DC-04` and `DC-05`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-5.1` Comparison keys, claim values and rule-set contract | P0 / L | Canonical subject/predicate/applicability comparison and incompatible-value rules are versioned and deterministic | `IL-4.2` | Normalization/comparison truth vectors; no fuzzy authority; rule version identity |
| `IL-5.2` Conflict, supersession and ambiguity rules | P0 / XL | Conflicts persist for incompatible applicable claims; valid supersession resolves applicability; ambiguity remains explicit | `IL-5.1` | Full truth table; overlapping/non-overlapping scopes; invalid/cyclic supersession; no guessed winner |
| `IL-5.3` Staleness, missing support and reassessment | P0 / XL | Exact dependency changes produce stale outputs and required absent evidence produces missing findings without rewriting history | `IL-4.2`, `IL-5.2` | Source/snapshot/rule/relationship/validation invalidation matrix; restart; successor reassessment |
| `IL-5.4` Impact traversal and validation-gap projection | P0 / XL | Bounded typed traversal shows affected assets and missing implementation/validation paths with citations | `IL-4.6`, `IL-5.3` | Expected retail paths; cycle/depth control; irrelevant path exclusion; `IMPACT_GAP` truth cases |
| `IL-5.5` Reconciliation/impact persistence and API | P0 / L | One immutable Twin revision plus rule version produces persisted findings and stable impact paths via API | `IL-4.3`, `IL-5.4` | Same-input idempotency; rerun after supersession; cross-scope rejection; transaction failure safety |
| `IL-5.6` Findings and impact UI | P0 / L | Conflict, stale, missing, ambiguous and impact-gap states show reasons, evidence and paths clearly within the judge flow | `IL-4.7`, `IL-5.5` | Browser initial conflict, correction and stale paths; accessibility; loading/error states |
| `IL-5.7` Deterministic-core proof, docs and controlled metrics baseline | P0 / M | Truth-table evidence and timing/accuracy baselines are recorded without production extrapolation | `IL-5.6` | `EV-RECONCILE`; deterministic rerun equality; metrics limitations; trust/domain docs refreshed |

Phase 5 prohibition: AI cannot create, dismiss or resolve canonical findings.

Current Phase-5 checkpoint: `IL-5.1`-`IL-5.7` are implemented. Generated `EV-RECONCILE` executes the production domain/API/persistence path on an offline synthetic fixture and proves exact conflict, ambiguity, missing-support, impact-gap, explicit-supersession and stale-successor truth cases, canonical/reordered replay equality, restart integrity and repository non-mutation. The timing/accuracy baseline is explicitly local and non-production. Persisted validation-result intake, cited explanation and readiness remain later boundaries, and the broader `G3` gate is not pre-claimed.

## Phase 6 — Evidence-cited explanation and personal OpenAI checkpoint

### Exit gate: `G3_DETERMINISTIC_CORE_PROVEN`, then `G4_OPENAI_COURSE_CORRECTION` (mandatory decision, conditional live call); capability `DC-06`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-6.1` Redacted evidence-pack compiler and citation registry | P0 / L | Mission question produces a minimized, deterministic pack digest and allowlisted stable citation IDs | `IL-3.4`, `IL-5.5` | Same-input digest; ordering; redaction; size/token bounds; citation locator validity |
| `IL-6.2` Deterministic offline explanation | P0 / L | “Can we release?” and fixed follow-ups render facts, inferences, conflicts, gaps and next actions from canonical structures | `IL-6.1` | Golden text structure; citations resolve; AI-off label; no invented evidence; failure behavior |
| `IL-6.3` Provider-neutral adapter and mocked structured-output validation | P0 / XL | Disabled-by-default adapter enforces identity, digest, schema, citation allowlist, limits, budgets, timeout and retry | `IL-1.2`, `IL-6.1` | Mock success/failure; unknown citation rejection; wrong digest/request/schema; budget/timeout/retry; no readiness field |
| `IL-6.4` Cited-question API and UI | P0 / L | User sees outbound-pack disclosure, AI-off answer and optional validated advisory answer without confusing authority | `IL-5.6`, `IL-6.2`, `IL-6.3` | `EV-CITATIONS`; browser AI-off/provider-failure/unknown-citation; explicit labels; offline completion |
| `IL-6.5` Personal OpenAI evaluation checkpoint | P1 / M | After explicit user enablement, fixed redacted questions are evaluated with a runtime-only personal credential and one exact decision is recorded | `IL-5.7`, `IL-6.4` | Entry checklist; no credential in files/logs/DB; grounding/citation/usefulness/latency/token/privacy results; exact decision enum |
| `IL-6.6` AI safety, transfer, evaluation and course-correction docs | P0 / M | Professional AI disclosure describes data transfer, authority limits, evaluation evidence and the finalized offline finale decision | `IL-6.4`; `IL-6.5` executed offline | Finalized AI safety docs; reconciled AI-use ledger; checked evaluation/offline decision; no secret/raw private body |
| `IL-6.7` Advisory synthetic edge-case suggestions | P1 / M | Validated provider or deterministic advisory logic may suggest cited synthetic retail edge cases without changing findings or readiness | `IL-6.3`, `IL-6.4` | Structured/citation validation; explicit synthetic/advisory labels; provider-off behavior; zero canonical-state effect |

Phase-6 closure checkpoint: `IL-6.1`-`IL-6.7` are implemented. The Mission API/UI renders the deterministic explanation, exact redacted pack disclosure, used-citation registry and cited deterministic edge-case suggestions. Every suggestion is derived only from the verified redacted pack, carries `SYNTHETIC` / `ADVISORY_ONLY` / `NOT_EVIDENCE`, and has no canonical-state, finding, readiness or Passport authority. Generated `EV-CITATIONS` proves all six fixed questions and 23 resolved synthetic suggestion citations on the controlled fixture. Generated `EV-OPENAI-EVAL` remains `NOT_RUN_NOT_AUTHORIZED` / `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`; production provider execution remains disabled. `IL-7.1`, which was next at that closure, is now implemented and recorded in the Phase-7 checkpoint below.

The frozen fallback rule was applied: without a newly authorized live transfer/runtime credential, `IL-6.5` selected `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` and does not block later core phases.

## Phase 7 — Deterministic readiness and thin Release Passport

### Exit capabilities: `DC-07` and `DC-08`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-7.1` Readiness obligation catalog and evaluator | P0 / XL | `readiness.v1` maps integrity, scope, snapshot, findings, validations, review and freshness to fail-closed status | `IL-3.4`, `IL-5.5` | Exhaustive truth table; missing/sample/fallback/AI/unpersisted/stale inputs never create `READY` |
| `IL-7.2` Assessment persistence and dependency staleness | P0 / L | Immutable assessments persist with exact input fingerprint; dependency changes create `STALE` historical output | `IL-4.2`, `IL-7.1` | Transaction/concurrency tests; restart; stale matrix; old assessment unchanged |
| `IL-7.3` Release Passport projection and digest | P0 / L | Passport is an immutable projection of exactly one persisted assessment and never recomputes readiness | `IL-7.2` | Canonical projection equality; digest vectors; historical retrieval; changed dependency marks stale association |
| `IL-7.4` Readiness/Passport API and UI | P0 / L | User sees obligations, blockers, findings, validations, citations and historical Passport with clear state semantics | `IL-6.4`, `IL-7.3` | Browser blocked/ready/stale states; API contracts; print/export-safe projection; no UI recomputation |
| `IL-7.5` Readiness/Passport integration, restart and safety proof | P0 / L | Full domain/API/DB/UI proof shows zero controlled false `READY` and exact Passport equality | `IL-7.4` | `EV-READINESS`; `EV-PASSPORT`; restart, project isolation, integrity and AI-off tests |
| `IL-7.6` Readiness, Passport, domain and user documentation | P0 / S | Trust semantics, limitations and operator guidance match the verified authority model | `IL-7.5` | Documentation review against contracts/tests; no deployment/safety guarantee claim |

Phase-7 closure: `IL-7.1`-`IL-7.6` are implemented, proven and documented. Nine ordered obligations feed immutable ReleaseAssessment history; migration `012` adds immutable Release Passports. Projection is one-assessment-only, digest-bound, idempotent, restart-safe and explicitly unsigned. Mission-scoped APIs and the browser workspace expose only repository-hydrated assessment/Passport resources, including server-derived `STALE`, plus a structural safe-download projection. Generated cross-layer evidence proves zero false `READY` in the controlled matrix, exact Passport equality, restart, scope isolation, tamper failure and AI-off execution. Canonical documentation explains operation, recovery, staleness and non-authority. No release approval, signing or deployment authority is claimed. `IL-8.1` is next.

## Phase 8 — Competition demo workspace and product polish

### Exit gate: `G5_CORE_DEMONSTRABLE`; capability `DC-09`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-8.1` Controlled retail repository and evidence fixtures | P0 / XL | IntelliLoop-owned synthetic repository/evidence encode the cancellation conflict, affected domains, partial tests and corrective evidence | `IL-4.6`, `IL-7.3` | Fixture schema/content review; no private/company data; deterministic hashes; provenance entries |
| `IL-8.2` Real-path fixture loader and scoped reset | P0 / L | Demo setup uses normal project, repository, import, Twin, reconcile and assessment paths; reset affects only demo workspace | `IL-2.4`, `IL-3.4`, `IL-8.1` | Empty-to-initial state; idempotent reset; non-demo project isolation; restart |
| `IL-8.3` Browser golden workflow | P0 / XL | Playwright proves import → Twin → conflict/impact → AI-off answer → corrective evidence → `BLOCKED → READY → STALE` → Passport | `IL-7.4`, `IL-8.2` | `EV-GOLDEN-FLOW`; stable selectors; screenshots/traces on failure; all stretch off; no credential |
| `IL-8.4` Competition visual, responsive and accessibility polish | P0 / XL | Critical story is understandable within two minutes and fully operable at 1366×768 without color-only trust cues | `IL-8.3` | `EV-ACCESSIBILITY`; keyboard/focus/heading review; visual QA for loading/empty/error/trust states |
| `IL-8.5` Non-functional safety, restart and rehearsal gate | P0 / L | Clean reset/restart, no default network, no repository mutation, secret-sentinel absence and 5–7 minute rehearsal pass | `IL-8.4` | Before/after repository proof; network interception; restart E2E; rehearsal timing and recovery drill |
| `IL-8.6` Demo runbook, troubleshooting, judge Q&A and fallback assets | P0 / L | Professional demo/support documents and truthful fallback assets reflect the exact release flow | `IL-8.5` | Runbook rehearsal; screenshot metadata; fallback test; limitations and AI-off story included |

## Phase 9 — Release, professional documentation and submission

### Exit gates: `G6_CODE_FREEZE` and `G7_SUBMISSION_READY`

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-9.1` Clean install, build, test and supported-platform verification | P0 / L | Release candidate installs reproducibly and passes required checks on Windows 11 plus available Linux CI | `IL-8.5` | Node/npm verification; lockfile install; typecheck/unit/integration/component/E2E/build; artifact hashes |
| `IL-9.2` Dependency, license, provenance, similarity, secrets and security audit | P0 / XL | Release has complete notices and proof that candidate source/secrets/private content were not transferred | `IL-9.1` | Direct/transitive license report; source/provenance ledger; similarity review; secret scan; network/mutation proof |
| `IL-9.3` Final technical, setup, user, API, security and troubleshooting docs | P0 / L | All canonical professional documents are synchronized with the release candidate and commands are reverified | `IL-7.6`, `IL-8.6`, `IL-9.1` | Documentation checklist; link/command verification; implemented/deferred labels; no stale screenshots |
| `IL-9.4` Controlled metrics and claim-evidence dossier | P0 / L | Prototype measurements and each external claim map to reproducible evidence with limitations, including a bounded manual-versus-assisted pilot protocol for the submitted time-saving hypothesis | `IL-8.5` | Representative change/release count; manual and assisted context-gathering, impact-analysis, evidence-checking and release-preparation time; path/citation validity, readiness accuracy and Passport fidelity; developer/lead/manager feedback; reproducible monthly team-hour calculation with assumptions and limitations; no individual surveillance or production extrapolation |
| `IL-9.5` Official Avishkar rule verification and compliance matrix | P0 / M / external input | Supplied official rules are hashed, mapped and resolved; branding, AI, ownership, dependency, data and submission terms pass | `IL-9.2`, `IL-9.3`, `IL-9.4` | Completed `AVISHKAR_RULES_MATRIX`; no unresolved submission blocker; written clarification where needed |
| `IL-9.6` Submission copy, pitch, demo package and manifest | P0 / XL | Form-ready copy, 60-second pitch, synchronized demo script, fallback assets and final manifest are professional and truthful | `IL-9.5` | Word/format limits; claim matrix; asset hashes; rehearsal; required disclosure present |
| `IL-9.7` Code freeze, release candidate and final claim gate | P0 / M | No P0/P1 blocker remains; final repository state and evidence support only bounded, accurate completion claims | `IL-9.6` | Full gate rerun; release checklist; clean status review; final manifest; approved final claim |

`IL-9.5` is blocked until official rules are supplied. It does not block safe implementation, but it blocks “Avishkar compliant,” “officially eligible,” branding and final submission claims.

Current Phase-9 checkpoint: `IL-9.1` through `IL-9.3` are complete. [EV-RELEASE](../../docs/evidence/EV_RELEASE.json), [EV-SECURITY-AUDIT](../../docs/evidence/EV_SECURITY_AUDIT.json) and [EV-DOCUMENTATION](../../docs/evidence/EV_DOCUMENTATION.json) bind the release, security and canonical-documentation state. [EV-METRICS](../../docs/evidence/EV_METRICS.json) now passes controlled product proof and withholds the benefit result. `IL-9.4` remains the current story until six paired human runs, three anonymous role feedback responses and a sourced cadence complete its acceptance.

## Phase 10 — Optional feature-flagged stretch

These stories are not on the critical path. Start none until `IL-8.3` passes with all stretch flags off. Cut in the frozen order without weakening the core.

| Story | Priority / size | Outcome | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| `IL-10.1` Evidence Replay Lab | P2 / L | Read-only comparison of two immutable Twin snapshots behind `experiments.evidenceReplay` | `IL-8.3` | Flag-off isolation; no canonical-state mutation; expected diff citations |
| `IL-10.2` Imported advisory-output disagreement | P2 / L | Compare attributed imported agent/model recommendations behind `experiments.agentDisagreement` | `IL-6.3`, `IL-8.3` | Import-only; disagreement remains advisory; no orchestration/readiness effect |
| `IL-10.3` Guarded Remediation Preview | P2 / XL | Cited patch/test proposal preview behind `experiments.remediationPreview`, never applied | `IL-6.3`, `IL-8.3` | No repository write/shell/Git/network action; flag-off isolation; cited proposal validation |

## Documentation timing summary

- `IL-1.1`–`IL-1.6`: documentation skeleton, setup, architecture, testing, provenance, AI-use and security baseline.
- `IL-2.2`–`IL-4.7`: API, domain, data, repository-safety, evidence, Twin and code-map documentation.
- `IL-5.7`–`IL-6.7`: reconcile truth, metrics baseline, AI safety/data transfer, checkpoint report and cited synthetic edge cases.
- `IL-7.3`–`IL-8.6`: Passport guide, user guide, demo runbook, troubleshooting, accessibility and fallback assets.
- `IL-9.1`–`IL-9.7`: final technical docs, notices, provenance, audits, official-rules matrix, submission copy, claim dossier and manifest.

## AI-mastery traceability

| R2 concept | Backlog path |
|---|---|
| Dual-engine/shadow execution | Post-competition; no implementation story |
| Automated discrepancy reconciliation | `IL-5.1`–`IL-5.7` |
| Continuous feedback | `IL-3.7` imported summaries only; continuous learning remains post-competition |
| Explainable AI auditing | `IL-6.1`–`IL-6.7` |
| Multi-agent collaboration | `IL-10.2` imported disagreement only; orchestration remains post-competition |
| Semantic code understanding | `IL-4.4`–`IL-4.7` bounded TypeScript/JSON map |
| Self-healing code | `IL-10.3` preview only; application/autonomy remains post-competition |
| Synthetic data | `IL-8.1` controlled fixture and `IL-6.7` advisory edge cases |
| Governance and guardrails | `IL-1.2`, `IL-3.6`, `IL-6.3`, `IL-7.1`, `IL-7.2`, `IL-7.3` |
| Multi-source state sync | `IL-3.1`–`IL-4.3` versioned text/JSON/code evidence |
| Predictive scaling | `IL-6.3` bounded usage controls only; scaling simulation remains post-competition |
| Version-controlled knowledge | `IL-3.2`, `IL-4.2`, `IL-5.3`, optional `IL-10.1` |

## Final critical path

```text
IL-1.1 → foundation gate
→ project/mission/repository snapshot
→ bounded evidence + lineage
→ Twin + bounded code map
→ deterministic reconciliation + impact
→ evidence pack + AI-off cited explanation
→ optional personal OpenAI checkpoint
→ deterministic readiness + Passport
→ synthetic real-path golden demo
→ release audits + official-rules matrix
→ submission package + code freeze
```

## Backlog decision

Phase 8 is complete through `IL-8.6` and `G5_CORE_DEMONSTRABLE` remains closed. `IL-9.1` proves the pinned release path on Windows, `IL-9.2` completes the bounded release-security audit, and `IL-9.3` synchronizes the canonical professional documentation. `IL-10.1`, `IL-10.2` and `IL-10.3` are complete as independently eligible optional stories; all remain absent from normal startup. `IL-9.4` has a complete controlled product dossier and executable input-validation/calculation path, but intentionally remains open for real role-based pilot observations. This prevents an unsupported savings claim from unlocking `IL-9.5` or `G6_CODE_FREEZE`.

The backlog remains sufficiently bounded to complete `IL-9.4` after the paired human pilot. Later story details may be refined from implementation evidence, but no refinement may change R2 scope, authority, source-use or safety boundaries without an explicit planning decision.

`INTELLILOOP_DEPENDENCY_ORDERED_BACKLOG_COMPLETE`
