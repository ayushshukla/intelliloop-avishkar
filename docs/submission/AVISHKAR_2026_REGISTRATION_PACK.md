# IntelliLoop: The Active Software Twin That Finds What Green Checks Miss

> **Historical preparation artifact:** This draft predates the officially submitted `IntelliLoop_Innovation_Brief.pdf`. It must not be treated as the submitted title or external-claim authority. See the [frozen submission commitments](../governance/SUBMISSION_COMMITMENTS.md).

**Subtitle:** Evidence-Reconciled AI Software Change Control  
**Challenge:** Avishkar - Nisum India AI Innovation Challenge 2026  
**Participation:** Individual self-nomination  
**Prepared for:** Submission owner  
**Document purpose:** Copy-ready registration answers describing the complete planned product while distinguishing the working prototype from future capabilities.

## 1. Recommended form title

**IntelliLoop: The Active Software Twin That Finds What Green Checks Miss**

If the form has a separate product-name field, use **IntelliLoop**. If it has a subtitle field, use **Evidence-Reconciled AI Software Change Control**.

## 2. One-line pitch

IntelliLoop creates a living, evidence-backed twin of a software change and uses responsible AI plus deterministic rules to expose contradictions, downstream impact, missing validation, and release risk before mistakes ship.

## 3. Short idea summary (approximately 100 words)

Software changes are understood through tickets, documents, conversations, architecture decisions, code, and tests that evolve independently. A release can look green while relying on an outdated requirement or missing a downstream dependency. IntelliLoop creates an Active Software Twin that connects this evidence around one change. Its deterministic Reconcile Core identifies conflicts, stale assumptions, missing support, and impact gaps. AI helps extract comparable claims from unstructured evidence, discover semantic relationships, and explain findings in plain language with validated citations. Readiness remains rule-based and fail-closed, and a Release Passport records exactly why a change is blocked, ready, or stale.

## 4. Detailed idea description (approximately 250 words)

Software-delivery decisions depend on information scattered across tickets, requirement documents, conversations, architecture decisions, repositories, test reports, and runtime observations. These sources evolve independently and can contradict one another. Teams therefore spend significant effort reconstructing context, and an apparently green release can still implement an outdated rule, overlook an affected service, or rely on tests that do not cover the real risk. Search tools and project trackers organize information, but they do not reconcile what the sources actually claim. Generic AI can compound the problem by confidently summarizing an incomplete retrieval set.

IntelliLoop addresses this with an evidence-reconciled Active Software Twin: a living, versioned model of one software change, its requirements, decisions, claims, code relationships, Git state, validations, risks, and release assessment. A deterministic Reconcile Core identifies conflicting claims, stale bindings, unsupported assertions, ambiguity, and missing implementation or validation coverage. Change-impact traversal shows the exact path from a requested change to affected components and required tests.

AI adds value where language understanding is strongest. It proposes structured claims from unstructured evidence, identifies semantically related material, suggests synthetic edge cases, and explains reconciled findings in natural language. Every material statement must cite an allowlisted evidence item. AI remains advisory: it cannot invent evidence, resolve a canonical conflict, approve a change, or determine readiness.

The planned demonstration follows a retail cancellation-policy change that appears ready because visible tests pass. IntelliLoop exposes a conflicting architecture decision and missing inventory and fulfilment coverage, explains why the change is blocked, and updates readiness only after corrective evidence arrives. It then generates a compact, reproducible Release Passport.

## 5. Business problem

Engineering teams lack a reliable, current view of what is true about a software change. Relevant knowledge is fragmented across multiple tools and artifact types, while requirements, decisions, implementation, and validation move at different speeds. This creates four recurring problems:

1. **Context reconstruction cost:** engineers and reviewers repeatedly search for the same background before they can make a decision.
2. **Hidden contradiction risk:** an updated requirement may conflict with an older decision, document, implementation assumption, or test expectation.
3. **Incomplete impact analysis:** changes can affect downstream services and validations that are not obvious from the originating ticket.
4. **Unreproducible readiness:** a green dashboard says that checks passed, but often cannot show whether the checks cover the current requirement and exact code snapshot.

The organisational opportunity is to turn fragmented delivery evidence into an inspectable decision system that helps teams find risk earlier, review changes faster, and explain release decisions consistently.

## 6. Proposed solution

IntelliLoop organizes each change as a scoped **Change Mission**. It imports bounded, attributed evidence and connects it to a read-only repository observation. The product then:

1. builds an immutable Active Software Twin containing evidence, claims, software assets, Git snapshots, validations, findings, assessments, and Passports;
2. maps bounded TypeScript, JavaScript, and JSON structure without executing repository code;
3. reconciles comparable claims and identifies conflicts, staleness, missing support, ambiguity, and impact gaps;
4. traces explainable paths through affected assets and required validations;
5. compiles a minimized, redacted evidence pack for AI-assisted explanation;
6. validates every AI citation and keeps AI output advisory;
7. evaluates readiness deterministically as `BLOCKED`, `READY`, or `STALE`; and
8. produces an immutable Release Passport that reproduces the exact assessment and evidence.

## 7. How artificial intelligence is used

AI is a meaningful part of IntelliLoop, but it is deliberately placed where probabilistic language understanding creates value without controlling release authority.

### AI responsibilities

- Extract candidate claims, conditions, and applicability from unstructured delivery evidence.
- Identify semantically related evidence that may express the same or conflicting rule.
- Explain conflicts, missing support, and downstream impact in natural language.
- Answer release questions from a bounded, redacted evidence pack.
- Suggest cited synthetic edge cases as advisory test ideas.

### Deterministic responsibilities

- Project and mission scope, identity, provenance, and integrity.
- Canonical conflict, supersession, ambiguity, and staleness rules.
- Dependency invalidation and impact-path calculation.
- Readiness obligations and `BLOCKED` / `READY` / `STALE` status.
- Release Passport identity, contents, and digest.

### Responsible-AI guardrails

- AI receives only a minimized, redacted, explicitly disclosed evidence pack.
- Every material AI statement must cite an identifier from the supplied allowlist.
- Unknown citations, wrong request identity, wrong evidence digest, or invalid structured output are rejected.
- Facts, inferences, conflicts, gaps, and AI advice are visibly distinguished.
- The complete core workflow remains available without an AI key.
- AI cannot mutate a repository, approve a release, waive a finding, or create green readiness.

## 8. Why the idea is innovative

Most engineering assistants retrieve context and answer questions. IntelliLoop makes the context itself versioned, inspectable, and reconcilable. Its innovation is the combination of:

- a change-level Active Software Twin rather than a generic repository chatbot;
- deterministic reconciliation of evidence before AI explanation;
- dependency-aware freshness that invalidates derived conclusions when an input changes;
- explainable impact traversal tied to required validation;
- citation validation and explicit fact-versus-inference semantics; and
- a Release Passport that reproduces why a decision was made instead of merely displaying a green status.

The memorable demonstration is not a fluent chatbot answer. It is watching a green-looking change become blocked for precise, cited reasons, then become ready only after the missing evidence is supplied, and finally become stale when a bound dependency changes.

## 9. Complete product capability map

### Capability 1 - Local project, mission, and repository evidence

Create a Project and Change Mission, register a controlled repository, and capture immutable read-only Git identity and status without exposing or modifying repository content.

### Capability 2 - Bounded evidence ingestion and lineage

Import Markdown, text, JSON, test evidence, decisions, and historical runtime summaries through typed size limits, redaction, deterministic digests, attribution, and an append-oriented timeline.

### Capability 3 - Active Software Twin

Represent the change as versioned, attributed nodes and relationships covering the mission, evidence, claims, software assets, snapshots, validations, findings, assessments, and Passport.

### Capability 4 - Bounded semantic code map

Statically identify files, package metadata, imports and exports, declared contracts, recognized routes, and test associations from controlled TypeScript, JavaScript, and JSON without installing dependencies or executing code.

### Capability 5 - Reconcile Core

Compare normalized claims within overlapping applicability, preserve ambiguity, honor explicit supersession, detect stale dependencies, and emit canonical conflict, missing-support, and impact-gap findings.

### Capability 6 - Explainable change-impact analysis

Traverse bounded relationships to show affected services, components, contracts, and required validation paths with direct evidence citations.

### Capability 7 - Evidence-cited AI explanation

Answer questions such as "Can we release?" with separated facts, inferences, conflicts, gaps, next actions, and validated citations. Provide a deterministic AI-off explanation when external AI is unavailable.

### Capability 8 - Deterministic readiness

Evaluate integrity, exact snapshot binding, unresolved findings, required validations, explicit review, and freshness. Fail closed so incomplete, sample, fallback, stale, or AI-only inputs cannot produce `READY`.

### Capability 9 - Release Passport

Create an immutable, digest-backed projection of one readiness assessment, including scope, snapshot, rules, evidence, blockers, obligations, validations, findings, and citations.

### Capability 10 - Competition demo workspace

Provide a resettable synthetic retail scenario that demonstrates the complete `BLOCKED -> READY -> STALE` journey in five to seven minutes without client data or production access.

## 10. Planned user journey

1. The user creates a Project and Change Mission.
2. IntelliLoop registers a controlled repository and captures a read-only Git snapshot.
3. The user imports requirements, decisions, test reports, and other evidence.
4. IntelliLoop redacts, attributes, versions, and links the evidence.
5. The Active Software Twin and bounded code map show the current change context.
6. The Reconcile Core finds contradictions, stale dependencies, missing support, and impact gaps.
7. Impact analysis identifies affected components and missing validations.
8. The user asks a release question and receives a cited deterministic or AI-assisted explanation.
9. Deterministic readiness remains blocked until the required correction and validation evidence is present.
10. IntelliLoop creates a Release Passport when the assessment is complete.
11. If a dependency changes, the historical decision remains visible but is marked stale.

## 11. Demonstration story

The synthetic retail scenario expands order cancellation from `BEFORE_PICKING` to after picking begins but before dispatch. A newer requirement expects inventory release, refund initiation, fulfilment stop, and customer notification. An older architecture decision conflicts with that rule. The code snapshot contains cancellation and refund work but omits inventory and fulfilment changes, while visible tests cover only the obvious path.

IntelliLoop imports and attributes the sources, constructs the Twin, maps the controlled code, and shows why the release is blocked. It traces impact through order, inventory, refund, fulfilment, notification, and tests. After the user supplies an explicit superseding decision plus missing implementation and validation evidence, readiness becomes `READY` and a Release Passport is generated. A later dependency change makes the assessment `STALE`, proving that trust follows current evidence rather than a permanently green label.

## 12. Expected business impact

The expected benefits are:

- reduced time spent reconstructing change context;
- earlier discovery of contradictory requirements and decisions;
- fewer missed downstream dependencies and validation gaps;
- clearer code-review, QA, handoff, onboarding, and release conversations;
- evidence-cited AI assistance with lower risk of unsupported explanation;
- reproducible release decisions and stronger auditability; and
- a reusable evidence model that can support multiple Nisum delivery domains.

These are projected benefits to be validated on a controlled prototype; they are not presented as measured Nisum production savings.

## 13. Proposed measurable success criteria

| Measure | Prototype method | Desired signal |
|---|---|---|
| Time to identify the seeded contradiction | Timed manual baseline versus IntelliLoop workflow | Faster discovery with a reproducible path |
| Conflict detection accuracy | Fixed claim-comparison truth table | All seeded conflicts found; no guessed winner |
| Impact-path coverage | Compare expected retail dependency paths with returned paths | Required affected domains and validations are represented |
| Citation validity | Validate every explanation citation against the compiled evidence allowlist | 100% structural citation validity |
| Readiness accuracy | Exhaustive controlled `BLOCKED`, `READY`, and `STALE` cases | Zero false `READY` in the controlled corpus |
| Passport fidelity | Rehydrate the stored Passport and compare with its assessment | Exact assessment projection and digest equality |
| Privacy boundary | Scan logs, responses, database, and AI fixtures for sentinel secrets | No fixed raw sentinel detected |
| Repository safety | Hash repository bytes before and after analysis | No repository mutation |

## 14. Feasibility and implementation approach

The competition product is deliberately local-first and source-independent. It uses a TypeScript modular monolith with a React web interface, Fastify API, deterministic domain packages, SQLite persistence, bounded static analysis, and controlled synthetic fixtures. It does not require a cloud platform, graph database, vector database, production connector, or external AI key for the core demonstration.

The system is built in dependency-ordered vertical slices: foundation and trust controls; projects and repository evidence; evidence lineage; Active Twin and code map; reconciliation and impact; cited explanation; readiness and Passport; demo workspace; and final release proof. Each slice includes domain tests, API/database integration, accessible browser behavior, security boundaries, and professional documentation.

## 15. Scalability and organisational applicability

Retail is the first demonstration wedge, but the model is domain-neutral. Projects, missions, evidence, claims, software assets, snapshots, validations, findings, assessments, and Passports can describe delivery changes in banking, healthcare, logistics, commerce, internal platforms, and client engineering programs.

Future adapters can ingest issue-management, documentation, source-control, CI/CD, test-management, and collaboration systems while retaining the same Twin, reconciliation, citation, and readiness contracts. Organisational rollout can begin as a local review assistant for high-risk changes and later evolve into governed team and enterprise integrations. Production scale and enterprise adoption remain future validation areas rather than current claims.

## 16. Security, privacy, and governance

- Localhost-only competition runtime and no external network call by default.
- Controlled synthetic data; no Nisum, client, employer, or private repository content in the demo.
- Canonical read-only repository access; no arbitrary shell or repository-write endpoint.
- Bounded formats, file sizes, counts, traversal depth, processing time, and API pagination.
- Redaction before persistence and before any optional AI transfer.
- Immutable attribution, digests, revision history, and explicit supersession rather than silent rewriting.
- No credential in source code, database, logs, or ordinary responses.
- Fail-closed errors and integrity checks; no partial trusted result after tampering.
- AI remains advisory and cannot determine readiness or perform remediation.

## 17. Current prototype versus complete vision

### Working and verified now

The current local prototype implements the foundation through the end of the Active Software Twin and bounded code-map phase. A user can create a Project and Mission, register a controlled Git repository, capture immutable read-only snapshots, import redacted evidence, review append-only lineage and claims, materialize an attributed Twin, map bounded TypeScript/JavaScript/JSON structure, and inspect attributed assets and explainable dependency paths. Automated unit, API, browser, privacy, repository-safety, Twin, and code-map evidence exists for this boundary.

### Planned next

The Reconcile Core, canonical impact findings, cited AI explanation, deterministic readiness, Release Passport, resettable retail golden flow, final metrics, packaging, and official-rule compliance matrix are planned epics and should be described as the product vision or in-progress roadmap, not as already implemented behavior.

## 18. Product roadmap by epic

| Epic | Product outcome | Status at registration |
|---|---|---|
| Foundation and trust baseline | Runnable local product, safe configuration, SQLite, contracts, honest UI states | Implemented |
| Projects, missions, and repository evidence | Scoped change workspace and immutable read-only Git snapshots | Implemented |
| Evidence ingestion, claims, and lineage | Redacted attributed evidence, normalized claims, supersession, timeline | Implemented |
| Active Software Twin and bounded code map | Immutable attributed Twin plus static software structure and paths | Implemented through manual-review checkpoint |
| Reconcile Core and impact | Conflicts, ambiguity, staleness, missing support, impact and validation gaps | Planned next |
| Evidence-cited explanation | Deterministic explanation plus optional validated AI advisory | Planned |
| Readiness and Release Passport | Fail-closed assessment and immutable decision record | Planned |
| Competition demo workspace | Synthetic retail `BLOCKED -> READY -> STALE` golden flow | Planned |
| Release, evidence dossier, and submission | Metrics, audits, documentation, official-rules matrix, demo package | Planned |
| Optional stretch | Evidence replay, imported AI disagreement, non-applying remediation preview | Stretch; off by default |

## 19. Why this matters to Nisum

Nisum delivers complex digital products where changes span business rules, architecture, code, testing, and client communication. IntelliLoop can help make those changes easier to understand and defend. It complements engineering expertise rather than replacing it: teams receive a shared evidence model, earlier warning of inconsistent assumptions, clearer downstream impact, and cited AI assistance that remains inside explicit governance boundaries.

The concept aligns with an AI-first transformation because it demonstrates both AI usefulness and responsible operational control. It can improve developer productivity, QA focus, architecture review, onboarding, delivery assurance, and client-facing transparency while remaining adaptable across accounts and industries.

## 20. Form-ready field answers

### What business or operational challenge are you solving?

Engineering teams lose time and assume avoidable release risk because the current truth about a software change is fragmented across tickets, documents, conversations, architecture decisions, repositories, and test results. These artifacts evolve independently, can contradict one another, and do not clearly show whether passing checks cover the current requirement and all affected systems.

### How does AI solve the challenge?

IntelliLoop uses AI to extract comparable claims from unstructured delivery evidence, identify semantically related sources, and explain reconciled conflicts and impact in natural language with validated citations. A deterministic Active Software Twin and Reconcile Core own scope, provenance, conflict state, staleness, impact, and readiness, ensuring AI remains an advisory reasoning layer rather than an approval authority.

### What makes the solution innovative?

Instead of another chatbot that retrieves and summarizes context, IntelliLoop makes the context itself versioned, inspectable, and reconcilable. It combines an Active Software Twin, deterministic claim reconciliation, dependency-aware freshness, explainable impact traversal, evidence-cited AI, fail-closed readiness, and a reproducible Release Passport.

### What value can it create?

Projected value includes faster change investigation, earlier conflict discovery, fewer missed dependencies and validation gaps, clearer reviews and handoffs, safer use of AI in delivery decisions, and reproducible release reasoning. The controlled prototype will measure these outcomes without claiming unverified production savings.

### Is the idea feasible?

Yes. The competition implementation is a local-first TypeScript application using a React interface, Fastify API, SQLite, controlled Git fixtures, bounded static analysis, and deterministic rules. The core workflow works offline and does not require company systems, client data, cloud infrastructure, a vector database, or an AI key. Four foundational epics are already implemented and verified locally.

### Can it scale across Nisum?

Yes in concept. The evidence and Twin model is domain-neutral, so the retail demonstration can extend to banking, healthcare, logistics, commerce, internal platforms, and other delivery programs. Future connectors can integrate issue, documentation, source-control, CI/CD, test, and collaboration systems without replacing the core reconciliation and trust model. Production scale remains to be validated.

### What is the current status?

A working local prototype is implemented through the Active Software Twin and bounded code-map checkpoint. It supports project and mission creation, controlled repository registration, read-only Git snapshots, redacted evidence import, claim lineage, immutable Twin revisions, static code mapping, and attributed dependency-path review. Reconciliation, impact, AI explanation, readiness, Release Passport, and the complete demo story are the next planned epics.

## 21. Sixty-second pitch

A software release can be green and still be wrong. The requirement may have changed in a document, an older architecture decision may conflict with it, and the tests may never cover the downstream system actually at risk.

IntelliLoop turns those fragmented sources into an Active Software Twin: a living map of the change, its claims, code relationships, validations, and release evidence. Its deterministic Reconcile Core finds contradictions, stale assumptions, and missing coverage. AI then explains the result in plain language, but only from a bounded evidence pack with validated citations and a clear separation between fact and inference.

In the retail demo, an expanded cancellation flow looks ready until IntelliLoop reveals that inventory and fulfilment behavior are unsupported by current tests. It traces the impact, shows exactly what is missing, and changes readiness only after corrective evidence arrives. Finally, it creates a Release Passport showing why the decision can be trusted. IntelliLoop is not another chatbot or checklist; it is the evidence layer that helps teams and their AI understand what is currently supported about a software change.

## 22. Submission claim guardrail

Use present tense only for the verified prototype boundary described in Section 17. Use "will," "is designed to," "planned," or "expected" for reconciliation, impact, AI provider use, readiness, Passport, enterprise connectors, and organisational benefits until those capabilities and measurements are complete. Do not claim guaranteed safe releases, eliminated hallucinations, production adoption, measured Nisum savings, official Avishkar compliance, or client deployment without separate evidence.

## 23. Final registration checklist

- Use the recommended title and one-line pitch consistently.
- Select the category closest to AI for software engineering, delivery assurance, productivity, or operational excellence.
- Describe the complete vision, then state the current prototype milestone honestly.
- Mention that AI is responsible for extraction and cited explanation while deterministic rules own readiness.
- Emphasize the five-to-seven-minute `BLOCKED -> READY -> STALE` retail story.
- Report projected impact as projected, with the proposed controlled measurements.
- Do not upload private repositories, credentials, client data, or internal confidential material.
- Add nominee details, business unit, location, manager, and any mandatory declarations exactly as requested by the live form.
- Verify the live form's actual deadline and attachment rules before submission.
