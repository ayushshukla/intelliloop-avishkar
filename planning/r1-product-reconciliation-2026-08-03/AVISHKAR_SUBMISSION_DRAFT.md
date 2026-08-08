# Avishkar 2026 Submission Draft

**Status:** R1 planning draft; implementation and impact proof are pending  
**Participation:** Individual  
**Working product name:** IntelliLoop  
**Subtitle:** The Evidence-Reconciled Active Software Twin

## Title

**IntelliLoop: The Active Software Twin That Finds What Green Checks Miss**

## One-line pitch

IntelliLoop builds a living, evidence-backed twin of a software change, then reconciles requirements, decisions, code and tests so teams—and their AI—can see contradictions, impact and release truth before mistakes ship.

## Concise problem statement

Important software changes are understood through tickets, documents, conversations, architecture decisions, code and test results that evolve independently. Teams spend time reconstructing context, and an apparently green release can still depend on an outdated requirement or miss a downstream validation. Search and project trackers retrieve or organize information but do not reconcile what the sources claim. Generic AI can make this worse by confidently explaining an incomplete retrieval set.

## Proposed AI solution

IntelliLoop converts bounded delivery evidence into an Active Software Twin connecting the change, claims, software assets, Git state, validations and risks. Its Reconcile Core deterministically identifies direct contradictions, stale bindings and missing coverage. AI then helps extract comparable claims, discover semantic relationships, and explain findings in natural language from a minimized evidence pack. Every material statement is cited, and facts, inferences, conflicts and missing evidence are visibly distinguished. AI remains advisory; deterministic rules own canonical staleness and readiness.

## Innovation

Most engineering assistants retrieve context and answer questions. IntelliLoop makes the context itself inspectable and reconcilable. It combines a living change-level software twin, explainable claim reconciliation, dependency-aware freshness, change-impact traversal and an evidence contract for AI. The memorable result is not another chatbot answer—it is watching the system expose why a green-looking change is unsafe, show the exact evidence paths, and update trust only when the underlying evidence changes.

## Practicality

The competition MVP is a local-first TypeScript application using bounded synthetic Markdown, text, JSON and Git evidence. It requires no company repository, client data, cloud service, vector database or production integration. Deterministic reconciliation, impact, readiness and Passport behavior work without an AI key. One optional provider adapter can improve semantic extraction and question answering without becoming a release authority.

## Scalability

The MVP deliberately focuses on one retail change, but its typed evidence model is domain-neutral. Requirements, decisions, software assets, snapshots, validations and findings can represent changes in banking, healthcare, logistics, internal platforms and other delivery environments. Future adapters can ingest CI/CD, issue-management, documentation and collaboration sources without replacing the Twin, reconciliation or readiness contracts. Production scale remains to be validated and is not claimed by this draft.

## Expected business impact

IntelliLoop is expected to reduce time spent reconstructing change context, surface contradictions earlier, expose missed dependencies, improve review and onboarding conversations, and make release decisions easier to reproduce. Before the finale, the controlled prototype should measure time-to-find the seeded contradiction, impacted-path coverage, citation validity, readiness truth-table accuracy and Release Passport fidelity. These benefits are currently projected or to be validated; no internal Nisum savings or adoption claim is made.

## 100-word version

Software changes are scattered across tickets, documents, conversations, code and tests, and those sources often disagree or become stale. IntelliLoop creates an Active Software Twin that connects this evidence around one change. Its Reconcile Core detects contradictions, missing validation and downstream impact. AI helps interpret unstructured evidence and explain findings, but every important statement is cited and deterministic rules—not AI—control readiness. In a retail cancellation demo, IntelliLoop reveals an inventory and fulfilment risk hidden behind green tests, guides the correction and generates a traceable Release Passport. The approach is local-first, practical, privacy-conscious and reusable across software-delivery domains globally.

## 250-word version

Software-delivery decisions depend on information scattered across tickets, requirement documents, conversations, architecture decisions, repositories and test results. These sources evolve independently. A release can appear green while implementing an outdated rule, missing a downstream dependency or relying on stale evidence. Search tools and project trackers organize information but do not reconcile what the sources actually claim. Generic AI assistants may confidently summarize whichever evidence was retrieved without recognizing that another source disagrees.

IntelliLoop addresses this with an evidence-reconciled Active Software Twin. It connects a software change to its requirements, decisions, source evidence, affected components, Git state, validations and release assessment. A deterministic Reconcile Core identifies direct contradictions, stale bindings, unsupported assertions and missing test coverage. AI adds value where language understanding matters: extracting candidate claims, finding semantically related evidence and explaining impact in natural language. Every material answer is tied to citations and visibly separates facts, inferences, conflicts and missing evidence. AI cannot approve a change or decide readiness.

The prototype will demonstrate a retail cancellation-rule change that seems ready because visible tests pass. IntelliLoop will reveal disagreement between the current requirement and an older architecture decision, trace the change into inventory and fulfilment components, and identify missing validation. After corrected evidence is supplied, deterministic readiness changes and a compact Release Passport reproduces the decision and its evidence.

The MVP is local-first, uses controlled synthetic data and continues to function without an AI key. The same typed evidence model can later support other software-delivery domains and connectors. Expected benefits include faster investigation, earlier conflict detection, fewer missed dependencies, clearer reviews and stronger auditability; these will be measured on the controlled scenario rather than presented as unverified production results.

## 60-second spoken pitch

“A software release can be green and still be wrong. The requirement may have changed in a document, an older architecture decision may still conflict with it, and the tests may never cover the downstream system that is actually at risk.

IntelliLoop turns those fragmented sources into an Active Software Twin—a living map of the change, its claims, code relationships, validations and release evidence. Its Reconcile Core finds contradictions, stale assumptions and missing coverage. Then AI explains the result in plain language, but only from a bounded evidence pack, with citations and a clear separation between fact and inference.

In my retail demo, an expanded cancellation flow looks ready until IntelliLoop reveals that inventory and fulfilment behavior are unsupported by the current tests. It traces the impact, tells the engineer exactly what is missing, and updates readiness only after the evidence is corrected. Finally, it creates a Release Passport showing exactly why the decision can be trusted.

IntelliLoop is not another chatbot or checklist. It is the evidence layer that helps teams—and their AI—understand what is actually true about a software change.”

## Suggested form-ready fields

### Business challenge

Engineering teams lose time and assume risk because the current truth about a software change is fragmented across artifacts that can contradict one another or become stale.

### AI approach

AI extracts and relates claims from unstructured delivery evidence and explains reconciled findings from a cited, redacted evidence pack. Deterministic contracts own scoping, contradiction state, staleness and readiness.

### Meaningful impact

Projected impact includes faster change investigation, earlier conflict discovery, fewer missed dependencies, clearer handoffs and reproducible release decisions. Controlled prototype measurements will be reported separately from projections.

### Why it can scale

The core model is based on domain-neutral software evidence and relationships. Retail is the initial wedge; future source adapters can extend the same Twin and Reconcile Core to other delivery domains without changing the trust model.

## Submission claim guardrail

This draft describes the intended product and prototype. Until implementation evidence exists, do not say that IntelliLoop currently builds, runs, detects conflicts, reduces time, improves accuracy, integrates with company systems or has been adopted. Do not claim guaranteed safe releases or eliminated hallucinations.
