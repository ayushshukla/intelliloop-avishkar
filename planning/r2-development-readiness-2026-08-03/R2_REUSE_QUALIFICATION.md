# IntelliLoop R2 Reuse, Maturity and Provenance Qualification

**Qualified at:** 2026-08-03T15:24:18.5507097+05:30  
**Decision:** `QUALIFIED_FOR_SOURCE_INDEPENDENT_DEVELOPMENT_FREEZE`  
**Direct source copying:** `NOT_AUTHORIZED`  
**Product implementation:** Not started

## Executive decision

All six authorized candidates were re-baselined and inspected only for the eighteen approved feature families. Existing Wave 3–5 static and isolated runtime evidence was sufficient; no new dependency install, build, application start, browser run, database, live AI call or disposable runtime copy was required.

The portfolio contains mature, relevant behavior—especially DevLoop's persisted Project/Mission/Git/validation paths, ChatVault's import/context/recovery paths, and ForgeOS's graph/ledger/safety/dry-run contracts. None reaches `M7_REUSE_READY`: every candidate lacks affirmative application-source license/ownership clearance, exact competition pre-existing-code permission remains unavailable, ChatVault is an unborn all-untracked repository, ForgeOS has a large preserved dirty baseline and stack mismatch, and the two design candidates have template/Lovable provenance plus mock-only data.

Accordingly:

- `REUSE`: zero
- `ADAPT`: zero
- `CLEAN_ROOM_REBUILD`: DevLoop-derived product behavior and all new IntelliLoop core behavior
- `CONTRACT_REFERENCE_ONLY`: ChatVault, ForgeOS, DevDeploy and the two design references
- `EXCLUDE`: conflicting shells/models, mocks/fixtures as product truth, Tauri/Dexie/.NET runtimes, autonomous execution, live capture and enterprise integrations

This is not a blocker. The frozen evidence and behavioral contracts are sufficient to build a new TypeScript implementation without copying application source.

## Verified checkpoint

| Item | Result |
|---|---|
| Destination | Valid Git worktree, unborn `main`, zero commits, zero remotes |
| Destination implementation | Absent; planning/recovery Markdown and JSON only |
| R0 recommendation | `ACCEPT_POST_WAVE2_STATE_FOR_R1_RECONCILIATION` |
| R1 decision | `R1_PRODUCT_RECONCILED_READY_FOR_REUSE_QUALIFICATION` |
| Canonical input integrity | All nine authoritative input hashes matched before qualification |
| R2 output directory | Absent before this gate; created only for the five authorized outputs |
| New runtime execution | None; prior isolated qualification evidence reused |
| Candidate source copy | None |

## Candidate baselines

| Candidate | Current baseline | Result |
|---|---|---|
| DevLoop Autopilot | `feature/solo-mvp-readiness`, `b7c1d81d99eea056b33413cbdda733ce3c4e4192`, tracked 0, untracked 0 | Exact R0 match |
| DevDeploy | `main`, `3c0f16ab8ca54d4d72a70cef7a4f79f7d0831d91`, 0/0 | Exact R0 match |
| ChatVaultAI | `master`, `UNBORN`, tracked 0, untracked 667 | Exact R0 match |
| ForgeOS | `main`, `204e345bbf0a6f6cee1c9cb23271e691cb6154a0`, tracked 210, untracked 12 | Exact preserved dirty baseline |
| DevForge Memory UI | `main`, `7cba1d02b52117283629d79535d26b6162709e5d`, tracked 0, untracked 1 | Exact R0 match |
| DevLoop OS Cockpit | `main`, `799a1dc916378647532446272c5124db42061c34`, 0/0 | Exact R0 match |

## Evidence method

R2 used:

1. Wave 3's sixty source-backed capability claims and exact locators.
2. DevLoop Wave 4A/4B isolated typecheck, build, smoke, Git-state, restart, mission-isolation and sample-isolation evidence.
3. ChatVault Wave 5A isolated build/import/search/project-isolation/export/restart/backup-restore evidence, retaining its documented validator failure and stale-context defect.
4. ForgeOS Wave 5B isolated restore/build/test/CLI/ledger/privacy/corruption evidence, retaining its format exit 2 and dirty-source boundary.
5. Current read-only source searches in the six candidates, excluding secret-bearing paths, build output, dependencies and databases.
6. Current package/license metadata. No candidate has a root application-source license or notice.

The machine-readable rows are in `r2-feature-maturity.json`.

## Candidate conclusions

### DevLoop Autopilot

Strongest behavioral foundation, but not a source base. Current source still shows real SQLite Project/Mission/agent-output/Git/validation/report paths alongside sample/default models, mock UI imports and explicitly disabled provider calls. Wave 4B proves a bounded runtime and exposes mission-leakage/readiness issues that must not be inherited.

Disposition: `CLEAN_ROOM_REBUILD` from R1/R2 contracts. Do not copy the shell, schemas, services, repositories, wording or UI.

Most valuable qualified behaviors:

- Project/Mission persistence and restart: `M6_ROBUST_BOUNDED` / 85%
- Read-only Git capture: `M5_RUNNABLE_BOUNDED` / 70%
- Validation/readiness: `M5_RUNNABLE_BOUNDED` / 70%, with known scope/truth defects
- Conversation import and manual agent-output ingestion: `M4_INTEGRATED_STATIC` / 55%
- Delivery report, evidence persistence, temporal prompt history and mixed UI: `M4_INTEGRATED_STATIC` / 55%
- Provider execution remains absent; impact is rule-based rather than semantic.

### DevDeploy

Small coherent TypeScript skeleton with real project JSON persistence, metadata scanning, readiness projection and UI/API wiring. Its own code labels reports advisory and does not observe deployment/runtime truth. There is no root application license.

Disposition: `CONTRACT_REFERENCE_ONLY`. Use its bounded scanner/report failure semantics as requirements; do not copy application source or select its JSON persistence.

### ChatVaultAI

Strongest bounded import, normalization, project association, search, context-pack, export, audit timeline and backup/restore behavior. Wave 5A proves several flows but retains an important project/stale-context isolation defect. The repository is unborn and all application files are untracked; no root license exists. Dexie/browser authority conflicts with the selected Fastify/SQLite architecture.

Disposition: `CONTRACT_REFERENCE_ONLY`, consistent with Super-Gate 2. Reimplement import, attribution, context-pack and lineage behavior independently. Exclude Dexie, Tauri, browser extension and live-capture authority.

### ForgeOS

Strong contract and runtime evidence for immutable mission graphs, scan-to-evidence projection, persistent ledger history/integrity, privacy redaction, local observations and dry-run remediation plans. The source is .NET, has a preserved 210/12 dirty baseline, and no root application license.

Disposition: `CONTRACT_REFERENCE_ONLY`, consistent with Super-Gate 2. Reimplement bounded TypeScript contracts; do not take a .NET runtime dependency or copy source/schema wording.

### DevForge Memory UI

Useful memory/context/provenance information architecture, but services are mock-backed and no persistence path exists. The package retains generic template identity and Lovable/Cloudflare signals without a root application license.

Disposition: `CONTRACT_REFERENCE_ONLY` for interaction lessons only. No components, styling, wording or mock data are copied.

### DevLoop OS Cockpit

Useful engineering cockpit, timeline and trust-state design reference, but routes are mock/placeholder-backed with no API or persistence. It has generic template identity and no root license.

Disposition: `CONTRACT_REFERENCE_ONLY` for information hierarchy only. No components, styling, wording or fixtures are copied.

## Eighteen-family decision summary

| Family | Best evidence | Maturity ceiling | Final IntelliLoop decision |
|---|---|---:|---|
| F01 Project/Mission | DevLoop | 85 | Clean-room implementation using narrower R1 model |
| F02 Repository/Git | DevLoop | 70 | Clean-room safe Git adapter |
| F03 Evidence/events | Forge ledger / ChatVault provenance / DevLoop store | 85 contract; 55 aligned | Clean-room small event/evidence model; Forge contract reference |
| F04 Context import | ChatVault | 85 | Clean-room Fastify/SQLite importer from behavioral contract |
| F05 Context pack/search/citations | ChatVault | 70 | Clean-room compiler/search; exact cited pack contract |
| F06 Twin/relationships | Forge mission graph | 70 contract | New bounded IntelliLoop Twin; Forge contract reference only |
| F07 Contradiction/staleness | Forge policy/safety plus partial context behavior | 70 adjacent contract | New Reconcile Core; no candidate implements required claim authority |
| F08 Change impact | DevLoop/Forge projections | 55 adjacent | New explainable Twin traversal |
| F09 Validation/readiness | DevLoop | 70 | New small fail-closed rules; do not inherit scope/sample defects |
| F10 AI adapter | None | 25 | New provider-neutral adapter and deterministic fallback |
| F11 Reporting/Passport | DevLoop report / ChatVault export | 55/85 adjacent | New thin Passport from one assessment |
| F12 Trust UX | DevLoop plus UI references | 55 | New original shell informed by behavioral lessons only |
| F13 Semantic code map | DevDeploy metadata scan | 55 | High-value enhancement; new TypeScript compiler-API mapper |
| F14 Replay/runtime observations | Forge scan/observability | 85 contract | JSON observation import supporting; replay stretch |
| F15 Multi-agent output | ChatVault Codex import / DevLoop agent output | 70/55 | Imported advisory output support; disagreement view stretch |
| F16 Remediation preview | Forge dry-run plan | 85 contract | Feature-flagged clean-room preview; no source mutation |
| F17 Temporal lineage | Forge ledger / ChatVault audit / DevLoop history | 85/70/55 | Core immutable lineage; comparison UI enhancement |
| F18 AI usage/budget | DevLoop metadata/docs only | 40 | New request budgets and safe usage metadata |

## Features above 50% and disposition coverage

Twenty-nine candidate-feature rows exceed 50%. Every one has an explicit non-copy disposition in `r2-feature-maturity.json` and `r2-reuse-manifest.json`:

- DevLoop: nine rows, all `CLEAN_ROOM_REBUILD`.
- DevDeploy: two rows, both `CONTRACT_REFERENCE_ONLY`.
- ChatVault: eight rows, all `CONTRACT_REFERENCE_ONLY`.
- ForgeOS: eight rows, all `CONTRACT_REFERENCE_ONLY`.
- DevForge Memory UI: one design row, `CONTRACT_REFERENCE_ONLY`.
- DevLoop OS Cockpit: one design row, `CONTRACT_REFERENCE_ONLY`.

No file meets `M7_REUSE_READY`; therefore the empty direct-copy set is complete rather than a missing decision.

## AI-mastery qualification

- Evidence reconciliation, explainable lineage, minimal guardrails, multi-source state and versioned knowledge remain core.
- The bounded TypeScript code map is retained as `HIGH_VALUE_ENHANCEMENT`, enabled for the demo but replaceable by an explicit controlled asset manifest if parser risk materializes.
- Runtime-observation import, synthetic edge-case suggestions and AI usage budgets remain supporting.
- Evidence Replay, imported-agent disagreement and Remediation Preview remain feature-flagged stretch, default off.
- Production shadowing, continuous learning, orchestration, automatic repair/deploy and predictive scaling remain post-competition.

## Provenance and notice decision

- Candidate application source license: not found for all six.
- Candidate application source reuse: not authorized.
- Exact event pre-existing-code and AI-generated-code policy: not found in supplied material.
- Ordinary third-party packages may be selected under their own licenses, followed by a final production/transitive notice inventory.
- Direct source copy remains false even for mature behavior.
- Clean-room separation means implementing from R1/R2 product contracts and evidence IDs without copying names, comments, code structure, schema prose or UI wording. It is an engineering control, not a legal guarantee.

## R2A gate result

All eighteen families were assessed; all mature candidate features have dispositions; every winning-core capability has a clean-room path. No ownership uncertainty blocks development because direct copying is unnecessary.

`R2A_QUALIFICATION_COMPLETE_SOURCE_INDEPENDENT_PATH_CONFIRMED`
