# IntelliLoop R1 Product Charter

**Decision time:** 2026-08-03T14:43:35.6678176+05:30  
**AI-mastery alignment updated:** 2026-08-03T15:10:55.5529853+05:30  
**Decision:** `R1_PRODUCT_RECONCILED_READY_FOR_REUSE_QUALIFICATION`  
**Product:** **IntelliLoop — The Evidence-Reconciled Active Software Twin**  
**Stage:** Planning only; no destination implementation exists

## Executive product decision

IntelliLoop is an AI-assisted software-delivery intelligence product that builds an **Active Software Twin** for one change and continuously reconciles the evidence around it. It connects requirements, decisions, document or conversation extracts, repository state, software assets, validations, risks, and release state. Its **Reconcile Core** detects contradiction, staleness, missing support, and downstream impact before an evidence-cited assistant explains the result. A small deterministic readiness projection and thin Release Passport prove the outcome; they are not the product category.

The retained retail wedge is cancellation after inventory reservation. It gives the finale a concrete, high-consequence story while the underlying model remains reusable for other engineering domains. The previous “Retail Delivery Control Plane” is therefore corrected to **Evidence-Reconciled Software Delivery Intelligence**. Release control remains a valuable outcome, not the central thesis.

The competition strategy is aggressive in visible intelligence and narrow in plumbing: one exceptional five-to-seven-minute workflow, one local application, one bounded evidence model, one deterministic reconciliation engine, one optional AI adapter, and one honest readiness result. The prior 28-MUST, 23-entity, 41-endpoint design is not binding on the competition MVP.

## Verified checkpoint

- R0 recommendation: `ACCEPT_POST_WAVE2_STATE_FOR_R1_RECONCILIATION`.
- Destination: valid Git worktree on unborn `main`, zero commits, zero remotes, zero tracked files.
- Existing files before R1: `.gitignore`, three canonical discovery artifacts, and the authorized R0 recovery checkpoint.
- Evidence exists for Waves 3, 4A, 4B, 5A, 5B, 5C and Super-Gates 1–3 at their recorded proof ceilings.
- Super-Gate 4, a complete Coding Prompt 1.1, its execution, and destination product implementation are absent.
- R1 creates planning artifacts only. Candidate-source inspection and all reuse decisions remain R2 work.

## Original-vision reconciliation

| Concept | R1 classification | Product, demo, feasibility and architecture decision |
|---|---|---|
| Active Software Twin | `RESTORE_AS_CORE` | The primary differentiator and main demo surface. Use a bounded typed graph, not a universal enterprise ontology. |
| Reconcile Core / DREC | `RESTORE_AS_CORE` | The product engine. Deterministic reconciliation guarantees offline demo behavior; AI proposes semantic matches and explanations. |
| Evidence-backed context | `RESTORE_AS_CORE` | Every important answer and finding must resolve to persisted, scoped source references. Context cannot itself satisfy readiness. |
| Document/conversation tree | `KEEP_WITH_CORRECTION` | Represent document and conversation extracts as evidence sources linked to claims; defer a full tree editor and chat archive product. |
| Context compilation | `MVP_SUPPORTING` | Compile a bounded, redacted evidence pack for one question or finding. Do not build a general prompt-management platform. |
| Claim reconciliation | `RESTORE_AS_CORE` | Structured claims are compared by subject, predicate, value, scope and revision. Ambiguity remains visible. |
| Freshness and staleness | `RESTORE_AS_CORE` | Revision and dependency changes invalidate findings, answers, readiness and Passports visibly. Avoid time-only freshness guesses. |
| Change-impact analysis | `RESTORE_AS_CORE` | Traverse from a changed claim or file to affected assets, validations and release obligations. Keep traversal explainable. |
| Hallucination reduction | `KEEP_WITH_CORRECTION` | Minimize unsupported output with bounded evidence, citations and fact/inference labels. Never claim hallucinations are eliminated. |
| Model-neutral AI assistance | `MVP_SUPPORTING` | One adapter contract and one optional provider in v0.1; deterministic AI-off operation remains complete. |

## Problem and users

### Real business problem

Software teams make consequential change and release decisions from information fragmented across tickets, requirement documents, conversations, architecture decisions, source code, Git state, and test results. These sources drift independently. A green test dashboard can coexist with an outdated requirement, an untested downstream dependency, or a code path that implements a different rule.

Search retrieves documents but does not determine how their claims relate. Project trackers record activity but not evidence truth. Release checklists report declared completion but do not reconcile contradictions. Generic RAG assistants can summarize incomplete or stale context convincingly without knowing that another source disagrees.

AI alone is unsafe here because semantic fluency is not evidence authority. IntelliLoop first structures, scopes and reconciles evidence, then lets AI explain only a cited evidence pack. Deterministic rules own staleness, conflict state and readiness.

### Users

- **Primary:** Tech lead or engineering delivery lead deciding whether a change is understood and releasable.
- **Secondary:** Developer implementing the change; QA/reviewer validating coverage; product owner clarifying the current requirement.
- **Trigger:** A cross-component change appears complete, but relevant evidence is fragmented or has changed since implementation began.
- **Value to a delivery organization:** Faster evidence gathering, earlier contradiction detection, fewer missed dependencies, clearer technical reviews, reusable change knowledge, and more defensible release conversations. No Nisum-specific adoption or savings claim is made.

## Positioning

- **Working name:** IntelliLoop
- **Subtitle:** The Evidence-Reconciled Active Software Twin
- **Category:** AI-assisted, evidence-reconciled software-delivery intelligence
- **One-line pitch:** IntelliLoop builds a living, evidence-backed twin of a software change, then reconciles requirements, decisions, code and tests so teams—and their AI—can see contradictions, impact and release truth before mistakes ship.
- **30-second pitch:** Software changes live across tickets, chats, decisions, code and tests, and those sources rarely evolve together. IntelliLoop turns them into an Active Software Twin, detects conflicting or stale claims, traces what a change affects, and gives AI a bounded evidence pack so every answer is cited and every inference is visible. In our retail demo, a release looks green until IntelliLoop reveals an untested inventory consequence and shows exactly what must change before an honest Release Passport can be issued.
- **Registration description:** IntelliLoop is an AI-assisted Active Software Twin that reconciles fragmented software-delivery evidence. It connects requirements, decisions, repository state, code relationships and validations; detects contradictions and stale assumptions; traces downstream impact; and produces evidence-cited explanations plus deterministic release readiness. The retail cancellation demonstration shows how an apparently ready change can still miss inventory, refund and fulfilment consequences.
- **Primary retail scenario:** Expanding order cancellation after inventory reservation but before dispatch.
- **Generalization:** The same evidence/claim/asset/validation model applies to banking rule changes, healthcare workflows, logistics, platform migrations and internal engineering programs.

### Defensible differentiators

1. **Reconciliation, not retrieval:** it detects disagreement and missing support rather than merely returning similar text.
2. **A living change twin:** claims, assets, Git state, validations and findings stay connected and invalidate when their dependencies change.
3. **AI with an evidence contract:** AI explains and proposes; citations, deterministic conflict state and readiness remain independently verifiable.

**This is not** another project tracker, code chatbot, document search interface, generic RAG demo, or green/red checklist.

## Competition MVP

### DEMO-CRITICAL

| Capability | User-visible outcome and judge value | Minimum honest implementation | Completion evidence | Dependency | Explicit exclusions |
|---|---|---|---|---|---|
| 1. Local project and repository registration | User opens one real workspace tied safely to a local demo repository; establishes technical credibility. | Create/retrieve one Project, register/canonicalize a Git root, capture read-only identity and status. | API/DB/UI test, invalid-path negative, no-mutation Git proof, restart retrieval. | Foundation | Multi-repository federation, cloud SCM, write commands. |
| 2. Bounded evidence ingestion | Requirements, ADR/conversation extract and validation results become attributed evidence. | Import controlled UTF-8 Markdown/text/JSON; normalize, redact, hash, scope and persist. | Import/retrieve/restart tests; oversize/type/secret sentinel negatives. | Project | Email/chat connectors, PDFs, arbitrary files, embeddings. |
| 3. Active Software Twin | A judge sees how the change, claims, assets and tests connect. | Materialized typed nodes/edges for one project and mission with provenance, revisions and freshness. | Deterministic fixture-to-graph test plus interactive graph/list UI. | Evidence ingestion, Git snapshot | Universal ontology, live code parser for every language, graph database. |
| 4. Reconcile Core | Contradiction, stale claim and missing evidence appear automatically with reasons. | Structured claim comparison, explicit supersession, dependency invalidation and coverage-gap rules. | Unit truth tables and the primary conflict reproduced offline. | Twin | Autonomous truth selection, broad policy engine. |
| 5. Change-impact traversal | A changed cancellation rule visibly reaches inventory, refund, fulfilment, notification and tests. | Explainable bounded traversal over typed `AFFECTS`, `DEPENDS_ON`, `IMPLEMENTS` and `VALIDATED_BY` edges. | Expected-path tests and displayed path citations. | Twin, Reconcile Core | Whole-codebase semantic analysis, production dependency discovery. |
| 6. Evidence-cited AI explanation | User asks “Can we safely release this?” and receives a clear cited answer with facts, inferences and gaps. | One provider-neutral adapter; curated redacted evidence pack; deterministic offline narrative fallback generated from findings. | Adapter contract test, citation validation, AI-off E2E, optional provider smoke when configured. | Findings, context compiler | AI truth authority, autonomous actions, multiple providers. |
| 7. Deterministic readiness | Apparently ready becomes `BLOCKED`, then `READY`, then `STALE` when bound evidence changes. | Small rule set: integrity, current scope/snapshot, unresolved critical findings, required validations and explicit review. | Truth-table tests and Playwright transition proof. | Findings, validations | Full waiver/governance platform, deployment claim. |
| 8. Thin Release Passport | Final decision becomes a concise, reproducible evidence artifact. | Persist and render one projection of an assessment with evidence, blockers, citations and digest. | Passport/assessment equality, restart and stale-banner tests. | Readiness | Signing infrastructure, compliance certification, complex export formats. |
| 9. Competition demo workspace | The complete story is understandable in five to seven minutes. | Controlled synthetic repository/evidence created through the real import and assessment paths; guided overview, Twin, Reconcile and Passport views. | Rehearsed Playwright golden path; zero hardcoded green state. | Capabilities 1–8 | Client/company data, commerce backend, production integrations. |

### MVP-SUPPORTING

| Capability | User-visible outcome and value | Minimum implementation/evidence | Dependency | Explicit exclusions |
|---|---|---|---|---|
| Evidence timeline | Shows how a finding and answer were derived. | Append-oriented events for imports, findings, assessments and Passports; ordered/restart test. | Persistence | Full cryptographic ledger/recovery suite. |
| Context compiler | Produces the exact evidence pack behind one answer. | Bounded source selection, redaction, digest and citation IDs; deterministic test. | Twin | General prompt studio or long-term memory platform. |
| Privacy guardrails | Demonstrates responsible AI handling. | Pre-persistence redaction, size limits, safe logs, no network by default; sentinel scan. | Ingestion/AI | DLP platform or privileged-host protection claims. |
| Evidence correction | User can add a superseding claim or validation without rewriting history. | Append successor and invalidate dependents; state-transition tests. | Reconcile Core | Collaborative editing and conflict-free replication. |
| Compact onboarding | A first-time judge can enter the demo quickly. | Guided primary action and honest empty states; browser test. | UI shell | Role system, enterprise identity and personalization. |

### POST-COMPETITION

| Capability | Intended outcome | Evidence required before promotion | Dependency | Explicit exclusion from competition MVP |
|---|---|---|---|---|
| CI/CD connectors | Automatic current build/deploy evidence. | Secure connector and stale/failure tests. | Stable evidence contract | No live CI integration now. |
| Jira/Confluence/chat connectors | Broader evidence capture. | Permission, provenance and incremental-sync proof. | Import model | No company-system connection now. |
| Repository watchers | Continuous Twin refresh. | Resource, race and invalidation tests. | Git adapter | Manual recapture only now. |
| Semantic code graph | Richer component and contract discovery. | Language-specific accuracy benchmarks. | Twin model | Controlled manifest/file map now. |
| Multi-user governance | Authenticated review and approvals. | Identity, authorization and audit design. | Readiness | Local claimed reviewer only now. |
| Advanced conflict learning | Prioritizes recurring disagreement patterns. | Evaluated dataset and false-positive controls. | Reconcile history | Deterministic bounded rules now. |
| Multiple AI providers/local models | Deployment flexibility. | Adapter compatibility and privacy evaluation. | One-adapter contract | One optional adapter now. |
| Signed Passports and enterprise retention | Stronger external assurance. | Key management, retention and threat model. | Stable Passport | Digest only now. |

## Active Software Twin

### Minimum node model

| Node | Purpose |
|---|---|
| `Project` | Stable local workspace boundary. |
| `ChangeMission` | One versioned software change and demo scope. |
| `EvidenceSource` | Attributed document, conversation extract, repository manifest, Git observation or validation import. |
| `Claim` | Structured assertion with kind `REQUIREMENT`, `DECISION`, `IMPLEMENTATION`, `VALIDATION_CLAIM` or `RISK`. |
| `SoftwareAsset` | Bounded component, file, API/contract or retail domain affected by the change. |
| `GitSnapshot` | Exact repository revision and worktree identity used by evidence. |
| `ValidationResult` | Scoped pass/fail/skip/error record tied to claims/assets/snapshot. |
| `ReconciliationFinding` | Conflict, stale claim, missing support, ambiguity or impact gap. |
| `ReleaseAssessment` | Deterministic projection of current obligations and blockers. |
| `ReleasePassport` | Immutable thin projection of one persisted assessment. |

### Essential relationships

`SCOPED_TO`, `EXTRACTED_FROM`, `ASSERTS`, `CONCERNS`, `IMPLEMENTS`, `AFFECTS`, `DEPENDS_ON`, `VALIDATED_BY`, `CONTRADICTS`, `SUPERSEDES`, `DERIVED_FROM`, `BOUND_TO`, and `BLOCKS`.

Every node/edge records stable ID, project/mission scope, origin, source reference, source revision/digest, recorded time, optional effective time, extraction method, and `FACT` or `INFERENCE`. Confidence expresses extraction/match confidence, never truth probability. Explicit source revision or supersession owns freshness; timestamp alone does not silently decide truth.

Invalidation occurs when a source digest/revision, claim, relationship, Git snapshot, validation input, reconciliation rule or assessment dependency changes. Findings and Passports are immutable historical records; recomputation creates successors and old records remain visibly stale.

## Reconcile Core

### Deterministic authority

- Normalize accepted structured claims into subject/predicate/value/applicability/revision form.
- Compare claims sharing subject and predicate within overlapping applicability.
- Detect incompatible values, explicit supersession, stale source bindings and unsupported assertions.
- Preserve ambiguity when priority/supersession is absent.
- Calculate impacted assets and missing validations by explainable graph traversal.
- Invalidate downstream findings, answers, assessments and Passports on dependency changes.
- Produce canonical finding state and the small readiness truth table.

### AI-assisted behavior

- Propose structured claims from prose for review or deterministic demo ingestion.
- Suggest semantically related claims and candidate edges.
- Summarize a finding in plain language.
- Explain likely business impact and next actions from a bounded evidence pack.
- Answer natural-language questions with validated citation IDs.

AI cannot invent evidence, hide ambiguity, approve, waive, determine canonical readiness, mutate repositories, claim deployment, or receive unredacted secrets. An AI output is an attributed advisory artifact. The system rejects missing/unknown citations and clearly labels `FACT`, `INFERENCE`, `MISSING`, and `CONFLICT`.

## Primary five-to-seven-minute demo

### Fictional change

“Allow customers to cancel a reserved retail order after picking has started but before dispatch.”

### Controlled evidence

1. Requirement v2 permits cancellation until `BEFORE_DISPATCH` and requires inventory release, refund initiation, fulfilment stop and customer notification.
2. An older ADR still limits cancellation to `BEFORE_PICKING` and describes a different inventory-release responsibility.
3. A repository snapshot shows the cancellation API and refund handler changed, while the inventory-reservation consumer did not.
4. Imported validations show order-state and refund tests passing, but no post-picking inventory-release or fulfilment-stop validation.
5. A release note claims the expanded cancellation flow is ready.

### Demonstration sequence

1. Open the apparently green retail change overview.
2. Import/register the controlled sources through real product paths.
3. Show the Active Software Twin joining requirement, ADR, changed assets and tests.
4. Reconcile Core marks the ADR/requirement disagreement, unsupported “ready” claim and missing inventory/fulfilment coverage.
5. Ask: “Can we safely release expanded cancellation?”
6. The assistant answers “Not yet,” cites the requirement, ADR, Git snapshot and validations, separates facts from inferred impact, and lists the next two actions.
7. Traverse the impact path from cancellation rule to order state, inventory, refund, fulfilment and notification.
8. Add a superseding decision and passing inventory/fulfilment validation through the real workflow.
9. Reassess from `BLOCKED` to `READY`; then change a bound source to demonstrate immediate `STALE` behavior if time permits.
10. Generate the Release Passport with the exact evidence lineage and final status.

### Final payoff

The judge sees a risk that green tests and a generic chatbot would miss, receives an understandable cited explanation, and watches trust state respond to evidence rather than presentation.

### AI-unavailable fallback

The same findings, impact paths, citations, readiness transitions and Passport work offline. A deterministic narrative renderer explains structured findings and is visibly labeled `DETERMINISTIC_EXPLANATION`, not AI. An optional configured provider improves semantic question answering without changing canonical state.

## AI value and boundaries

AI is valuable for extracting comparable claims from unstructured prose, discovering semantically related evidence, translating a graph finding into a concise explanation, and answering varied natural-language questions. Rules are better for identity, scoping, explicit contradictions, invalidation, coverage obligations and readiness.

The assistant receives only a minimized redacted evidence pack selected by Project, Mission, question and finding. Each pack has a digest and stable citation IDs. Output must reference existing IDs; unsupported citations fail validation. Provider/model/request metadata is retained when safely available. Model replacement occurs behind one adapter contract, leaving evidence, Twin, reconciliation and readiness unchanged.

This design reduces the opportunity for unsupported output; it does not eliminate hallucinations or guarantee correct releases.

## Business impact model

No outcome is measured yet.

| Impact | Classification | R1 hypothesis / measurement plan |
|---|---|---|
| Investigation time | `PROJECTED` | A scoped evidence graph and cited answer should reduce time spent finding the relevant requirement, decision, code and test. Compare timed manual lookup with IntelliLoop on the controlled scenario. |
| Context switching | `PROJECTED` | One reconciled view should reduce the number of separate artifacts opened. Count artifacts/actions in the controlled comparison. |
| Earlier conflict detection | `PROJECTED` | Contradictions should surface before a release review. Measure detection against a seeded conflict set. |
| Missed dependency risk | `PROJECTED` | Impact paths should expose uncovered inventory/fulfilment dependencies. Compare expected versus displayed affected assets. |
| Onboarding speed | `TO_BE_VALIDATED` | A new reviewer should explain the change and blockers faster after using the Twin. Run a small timed walkthrough if participants are available. |
| Release decision quality | `TO_BE_VALIDATED` | Readiness should refuse stale, unsupported or conflicting evidence consistently. Verify deterministic truth-table scenarios locally. |
| Auditability | `PROJECTED` | Passport should reproduce the exact persisted assessment and citations. Verify equality automatically. |
| Reusable delivery knowledge | `TO_BE_VALIDATED` | Historical claims/findings may help future changes; outside the finale proof boundary. |

Demo-observable indicators: conflict detection on a controlled truth set; affected-asset path coverage; citation validity; time-to-answer; readiness truth-table accuracy; Passport/assessment equality; and AI-off completion of the golden flow.

## Avishkar scorecard

These are design-stage self-assessments, not judge scores.

| Criterion | Score / 5 | Basis and required follow-through |
|---|---:|---|
| Real business problem | 5 | Common fragmentation and drift are concrete; keep the retail consequence specific. |
| AI-created value | 5 | Semantic extraction/explanation complements deterministic reconciliation; prove one live cited answer. |
| Innovation | 5 | Active Software Twin plus claim reconciliation differentiates it from search/RAG/checklists. |
| Practicality | 4 | Local-first bounded sources and offline core are feasible; R2 and Super-Gate 4 must keep the implementation narrow. |
| Scalability | 4 | Typed evidence/adapter model generalizes; do not claim production scale before measurement. |
| Meaningful business impact | 4 | Impact pathways are strong but projected; collect controlled timing and correctness evidence. |
| Demo clarity | 5 | One apparent-green-to-hidden-risk-to-cited-resolution story has a clear reveal. |
| Technical credibility | 4 | Deterministic/offline contracts are credible; implementation and runtime proof are still required. |
| Trustworthiness | 5 | Fact/inference labels, citations, staleness and non-authoritative AI are central. |
| Memorability | 5 | “A living twin that catches what green checks missed” is a concise finale moment. |

## Claims and risks

### Permitted after R1

- IntelliLoop is designed as an evidence-reconciled Active Software Twin.
- Its planned Reconcile Core combines deterministic rules with advisory AI.
- The MVP is designed to work without an AI key and without company/client data.
- The product targets contradiction, staleness, impact and evidence-cited explanation.
- Business benefits are hypotheses or projections pending measurement.

### Requiring implementation proof

- The application builds, runs, persists, restarts, detects conflicts, traces impact, cites evidence, assesses readiness or generates a Passport.
- AI output is accurately grounded in every tested case.
- Security, redaction, no-network and repository no-mutation controls work.
- Any candidate feature was reused or adapted.

### Requiring measured demo results

- Percentage or time reductions, detection accuracy, impact coverage, citation accuracy, usability improvement, scale or reliability.

### Prohibited

- Guaranteed safe releases, eliminated defects or hallucinations, production deployment, enterprise-grade security, official Nisum endorsement, trademark clearance, competition victory, client adoption, or ownership/reuse clearance not explicitly evidenced.

### Material risks

| Risk | Control |
|---|---|
| Schedule expansion | Super-Gate 4 must keep one scenario and nine demo-critical capabilities; cut supporting features before core intelligence. |
| AI variability/network failure | Offline deterministic reconciliation and narrative path; optional provider cannot alter canonical truth. |
| Source ownership/licensing | No copy until R2 disposition and manifest; default to clean-room behavior reimplementation. |
| Confidentiality | Synthetic data only; quarantined company/client roots remain excluded. |
| False conflict or impact | Explain rules/paths, preserve ambiguity, and test a controlled truth set. |
| Misleading readiness | Small fail-closed rule set; no static/sample green state. |
| Graph overengineering | SQLite tables/materialized relations only; no graph database or universal ontology. |
| Weak visual polish | Reserve a dedicated demo UX story after the vertical intelligence path works. |
| Unverified event details | User-supplied event material establishes timeline and broad criteria; exact pre-existing-code, branding and submission-form rules remain to be confirmed. |

## AI-mastery alignment addendum

The twelve supplied “AI mastery” concepts are useful as a product-horizon test, but several were framed as a real-time production twin that autonomously changes code or prompts. IntelliLoop's competition product is an **evidence twin of a software change**, not a live production replica, model-training system or autonomous deployment agent. R1 therefore incorporates their value through the following safe, staged translations.

| Proposed capability | R1 disposition | IntelliLoop incorporation |
|---|---|---|
| Dual-engine execution and shadow testing | `STRETCH_MVP` | Add an **Evidence Replay Lab** only after the core works: compare a baseline and candidate snapshot against the same controlled evidence/validation scenario. Real-time production mirroring and live shadow traffic are post-competition. |
| Automated discrepancy reconciliation | `CORE_WITH_SAFETY_CORRECTION` | This is the Reconcile Core: detect differences between requirements, decisions, observed behavior, code relationships and tests. “Auto-alignment” becomes a proposed corrective action; it never silently changes code, prompts or truth. |
| Continuous feedback integration | `MVP_SUPPORTING` | Accept bounded imported runtime-observation/telemetry summaries as attributed evidence and show how they invalidate claims. Continuous streaming and reinforcement/training loops are post-competition. |
| Explainable-AI auditing | `CORE` | Retain evidence-pack digest, citations, fact/inference labels and provider/model/request/usage metadata when available. Hosted-model weight-level tracing is neither available nor claimed. |
| Multi-agent collaboration fabric | `STRETCH_MVP` | Reconcile two or more **imported agent recommendations** as claims and expose disagreement. Do not build agent orchestration or sub-twin infrastructure for the finale. |
| Semantic code understanding | `DEMO_CRITICAL_ENHANCEMENT` | R2 must look for a bounded TypeScript code mapper. The preferred MVP extracts manifests, imports, routes/contracts and test-to-asset links for the controlled repository. It is not whole-repository universal semantic understanding. |
| Self-healing code generation | `STRETCH_MVP_GUARDED` | If the core is green, add a **Remediation Preview** that proposes a patch or test change from cited findings and validates it only in a disposable sandbox. No automatic apply, commit, push or production action. |
| Synthetic data generation | `MVP_SUPPORTING` | Use visibly synthetic retail evidence and optionally generate edge-case test suggestions. Generated material is permanently labeled and cannot satisfy readiness until executed and imported as real validation evidence. |
| Governance and guardrail verification | `CORE_MINIMAL` | Enforce hard product boundaries: AI cannot alter canonical evidence/readiness or mutate source; unsafe paths, unknown citations and prohibited actions fail closed. Enterprise compliance/bias suites are deferred. |
| Multi-modal state syncing | `CORE_WITH_NAMING_CORRECTION` | Implement **multi-source state reconciliation** across documents, conversation extracts, repository/code maps, Git and tests with restart persistence. Images/audio and real-time architecture telemetry are post-competition. |
| Predictive resource scaling | `POST_COMPETITION_WITH_MVP_METERING` | Add request token/usage visibility, explicit budgets, timeout/retry limits and optional cost estimates for AI testing. Infrastructure and model-scaling simulation is deferred. |
| Version-controlled knowledge bases | `CORE` | Preserve immutable evidence/claim versions, lineage, source revisions, supersession and historical Twin comparison. “Time travel” is read-only comparison; no destructive rollback of source or knowledge. |

### Ambition ladder

The implementation backlog must protect this order:

1. **Winning core:** the existing nine demo-critical capabilities.
2. **High-value enhancements:** bounded semantic code map and temporal Twin comparison.
3. **AI mastery stretch:** Evidence Replay Lab, imported-agent disagreement and guarded Remediation Preview.
4. **Post-competition:** live telemetry, continuous learning, production shadowing, autonomous repair, agent orchestration and resource-scaling simulation.

No stretch capability may delay a working cited contradiction/impact/readiness/Passport demonstration.

### Personal OpenAI integration checkpoint

The user intends to test with a personal OpenAI configuration around the middle of development. This is a deliberate course-correction checkpoint, not a foundation dependency.

It occurs only after deterministic ingestion, Twin construction, reconciliation, citations and AI-off explanation pass their tests. Before any live call:

- The provider-neutral adapter and mocked contract tests must already pass.
- Credentials are supplied at runtime through an environment variable or OS-appropriate secret mechanism and are never committed, persisted in product data or printed.
- External transfer is off by default and requires explicit enablement.
- The UI shows the redacted evidence pack before or alongside the first transfer.
- Each request has bounded input/output tokens, timeout, retry count and session/request budget.
- Model identity and usage metadata are recorded when returned safely; cost is labeled estimated unless verified from authoritative billing data.
- Unknown citations or structurally invalid output fail closed into an advisory error.
- The deterministic offline explanation remains available before and after provider testing.
- A fixed evaluation set compares grounding, citation validity, usefulness, latency and token usage. Provider output never changes readiness directly.

The checkpoint decides whether the live provider enhances the finale demo, needs prompt/pack correction, or should remain a recorded optional path.

## R2 qualification inputs

R2 must inspect only authorized candidate roots and produce source/revision, maturity, runtime evidence, portability, dependency, provenance and disposition records. Priority families are:

1. Project/workspace persistence and Mission/change lifecycle.
2. Safe repository registration and read-only Git capture.
3. Evidence/event persistence and attribution.
4. Context/conversation import, normalization, project scoping and recovery.
5. Memory/context-pack compilation and citation UX.
6. Relationship/Twin visualization or reusable graph/list components.
7. Claim comparison, staleness and impact analysis.
8. Validation evidence and deterministic readiness.
9. Provider-neutral AI adapters or structured-output validation.
10. Delivery reporting/Release Passport projection.
11. Competition-quality engineering cockpit and evidence UX.
12. Bounded semantic TypeScript code mapping and test-to-asset relationships.
13. Baseline/candidate evidence replay and imported runtime-observation evidence.
14. AI-output claim ingestion and disagreement reconciliation.
15. Guarded patch/test remediation preview and disposable validation boundary.
16. Temporal Twin/knowledge lineage comparison.
17. AI request metering, budget controls and safe provider diagnostics.

Expected high-priority candidates from existing evidence are DevLoop Autopilot, ChatVaultAI, ForgeOS, DevDeploy, DevForge Memory UI and DevLoop OS Cockpit. R2 must not infer permission from technical quality. Pushhpa/client/employer/MyTeams roots remain quarantined.

The detailed R2 questions and required manifest are in `R2_QUALIFICATION_INPUT.md`.

## Final R1 decision

The product identity, differentiated core, competition MVP, demo, AI boundaries, impact hypotheses and claim limits are reconciled. The scope has been reduced from a broad delivery-control platform to one evidence-reconciliation vertical while preserving valuable trust mechanisms. No implementation or source reuse is authorized by R1.

Next gate: `R2_REUSE_AI_MASTERY_AND_DEVELOPMENT_READINESS`. It performs read-only qualification and freezes the development-ready architecture. Detailed backlog generation remains the following separately authorized gate.

`R1_PRODUCT_RECONCILED_READY_FOR_REUSE_QUALIFICATION`
