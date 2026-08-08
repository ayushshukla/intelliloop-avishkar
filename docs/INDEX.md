# IntelliLoop Documentation Index

**Audience:** Developers, reviewers and future submission maintainers  
**Product status:** `IL-9.4_PRODUCT_DOSSIER_READY_HUMAN_PILOT_REQUIRED`  
**Completed stories through:** `IL-9.3`; `IL-9.4` implementation complete with external input pending  
**Evidence date:** 2026-08-07

Status labels used in this documentation:

- `IMPLEMENTED`: present and covered by cited verification.
- `FOUNDATION_ONLY`: operational scaffolding exists, but product capabilities do not.
- `ATTRIBUTED_TWIN`: immutable cited Twin revisions are usable; reconciliation/readiness authority remains absent.
- `EVIDENCE_TWIN_PROVEN`: attributed Twin and static code-map review are reproducibly proven; reconciliation/readiness authority remains absent.
- `RECONCILIATION_CONTRACT_READY`: deterministic pairwise comparison is versioned and tested; findings, impact and readiness authority remain absent.
- `RECONCILIATION_FINDING_CONTRACT_READY`: deterministic active-claim selection and conflict/ambiguity finding values are tested; persistence, impact and readiness authority remain absent.
- `RECONCILIATION_REASSESSMENT_CONTRACT_READY`: deterministic exact-dependency staleness, explicit missing support and immutable successor reassessment are tested; persistence, impact and readiness authority remain absent.
- `IMPACT_ANALYSIS_CONTRACT_READY`: deterministic bounded traversal, exact citations and explicit implementation/validation gap values are tested; persistence and UI are outside that domain-only status.
- `RECONCILIATION_IMPACT_API_READY`: immutable reconciliation/impact revisions and bounded Mission-scoped APIs are implemented; findings-and-impact UI and readiness authority remain absent.
- `RECONCILIATION_REVIEW_READY`: strict accessible findings/impact review is implemented over immutable API history; readiness authority remains absent.
- `PHASE_5_CORE_PROVEN`: generated controlled truth-table, replay, restart and limited metrics evidence closes Phase-5 `DC-04`/`DC-05`; the broader `G3` gate, readiness and AI authority remain absent.
- `EVIDENCE_PACK_CONTRACT_READY`: deterministic minimized transfer projection, second-pass redaction and stable allowlisted citation registry are implemented in the domain; explanation, provider/API/UI and readiness authority remain absent.
- `OFFLINE_EXPLANATION_CONTRACT_READY`: deterministic fixed-question rendering over the exact cited pack is implemented in the domain with `AI_OFF` metadata and no readiness authority; provider/API/UI remain absent.
- `MOCK_PROVIDER_ADAPTER_CONTRACT_READY`: exact provider-neutral request construction and disabled/mock-only response validation are implemented with safe offline fallback and resource controls; this label alone grants no live-provider or readiness authority.
- `CITED_EXPLANATION_WORKFLOW_READY`: the six fixed questions are available through strict local API/UI orchestration with deterministic `AI_OFF` answers, exact `NOT SENT` disclosure and verified citations; live provider and readiness authority remain absent.
- `OPENAI_CHECKPOINT_OFFLINE_DECISION_RECORDED`: the mandatory personal-provider course-correction checkpoint is digest-bound to `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`; no live call or provider metric is claimed.
- `AI_SAFETY_DOCUMENTATION_FINALIZED`: the offline finale posture, current/future transfer inventory, authority matrix, AI-use ledger and course-correction governance are reconciled to executable checkpoint evidence.
- `PHASE_6_ADVISORY_COMPLETE`: cited deterministic synthetic edge cases are available with explicit non-evidence/non-authority labels while the provider remains off.
- `READINESS_EVALUATOR_CONTRACT_READY`: pure `readiness.v1` obligations and fail-closed status calculation are tested; persistence, API/UI and Passport authority remain absent.
- `READINESS_ASSESSMENT_PERSISTENCE_READY`: immutable ReleaseAssessment history and exact repository-derived dependency staleness are tested; API/UI, Passport, release approval and deployment authority remain absent.
- `RELEASE_PASSPORT_PROJECTION_READY`: an unsigned immutable Passport reproduces one persisted assessment with exact digest/citations and derived stale association; API/UI, approval and deployment authority remain absent.
- `READINESS_PASSPORT_API_UI_READY`: strict Mission-scoped assessment/Passport API and browser presentation expose repository-derived `BLOCKED`, `READY` and historical `STALE` state plus safe structural download/print; validation/review intake, approval, signing and deployment authority remain absent.
- `READINESS_PASSPORT_PROOF_READY`: generated cross-layer evidence proves controlled fail-closed readiness, exact unsigned Passport projection, restart, scope isolation, integrity failure and AI-off execution; it is not production validation or release authority.
- `PHASE_7_COMPLETE`: the verified readiness/Passport implementation and its architecture, domain, data, API, operator, trust, testing and security documentation are reconciled; Phase-8 demo fixtures remain future work.
- `CONTROLLED_RETAIL_FIXTURE_READY`: a versioned source-independent synthetic cancellation repository/evidence definition and deterministic manifest exist; materialization, reset and golden-flow proof remain future work.
- `COMPETITION_GOLDEN_WORKFLOW_READY`: the fixed fixture runs through real persisted `BLOCKED → READY → STALE` browser checkpoints with AI off, an unsigned Passport and scoped reset; competition accessibility/polish remains next.
- `PHASE_8_DEMO_SUPPORT_COMPLETE`: the accessible golden workflow, paced restart/recovery gate, tested script-free fallback, hash-bound screenshots, judge Q&A and synchronized narration are complete; Phase-9 release/submission gates remain.
- `IL-9.3_DOCUMENTATION_SYNCHRONIZED`: canonical technical, setup, testing, contribution, API, user, trust, security and troubleshooting documents match the current candidate; later metrics, rules, submission and freeze work remains pending.
- `IL-9.4_PRODUCT_DOSSIER_READY_HUMAN_PILOT_REQUIRED`: controlled product metrics, claim mapping and the paired anonymous pilot protocol are reproducible; real developer/lead/manager timings and feedback remain absent, so the benefit hypothesis is not validated.
- `PLANNED`: authorized by R2/R3 but not implemented.
- `UNVERIFIED`: external requirements or runtime claims lack authoritative evidence.

## Current documents

| Document | Status | Purpose |
|---|---|---|
| [README](../README.md) | `IL-9.4_PRODUCT_DOSSIER_READY_HUMAN_PILOT_REQUIRED` | Honest product status and quick start |
| [Product target](product/PRODUCT_TARGET.md) | `DURABLE_TARGET / PHASE_1_BASELINE` | Plain-language product, users, Work Item workflow, ten-phase direction and invariants |
| [Execution state](product/EXECUTION_STATE.md) | `PHASE_1_RECONCILED` | Evidence-backed repository/story state, gaps, validation and next-phase gate |
| [Architecture](architecture/ARCHITECTURE.md) | `IMPLEMENTED` | Runtime topology, configuration and dependency boundaries |
| [Domain model](architecture/DOMAIN_MODEL.md) | `IMPLEMENTED` | Deterministic primitives, frozen Twin vocabulary and current authority boundaries |
| [Data and migrations](architecture/DATA_AND_MIGRATIONS.md) | `IMPLEMENTED` | SQLite ownership, schema history, restart and upgrade behavior |
| [Local API reference](api/API_REFERENCE.md) | `IMPLEMENTED_LOCAL_V1` | All 53 Project/Mission/evidence/Twin/reconciliation/explanation/readiness/demo routes, schemas, privacy, pagination and integrity errors |
| [User guide](product/USER_GUIDE.md) | `IL-9.3_DOCUMENTATION_SYNCHRONIZED` | Complete local Mission workflow plus the separate fixed synthetic demo control room |
| [Readiness and Release Passport guide](product/READINESS_AND_PASSPORT_GUIDE.md) | `IMPLEMENTED_WITH_CONTROLLED_DEMO_PROOF` | Canonical status, obligation, lifecycle, staleness, operation, recovery and non-authority semantics |
| [Controlled retail fixture](product/CONTROLLED_RETAIL_FIXTURE.md) | `COMPETITION_GOLDEN_WORKFLOW_READY` | Synthetic cancellation scenario, real-path correction/staleness, scoped reset and provenance |
| [Competition demo runbook](demo/DEMO_RUNBOOK.md) | `FINALIZED_IL_8_6` | Five-to-seven-minute browser sequence, expected states, recovery and tested fallback branch |
| [Competition demo troubleshooting](demo/DEMO_TROUBLESHOOTING.md) | `IL-9.3_DOCUMENTATION_SYNCHRONIZED` | Truth-preserving recovery, trace handling and static fallback guidance |
| [Judge Q&A](demo/JUDGE_QA.md) | `FINALIZED_IL_8_6` | Concise innovation, AI, evidence, feasibility, value and limitation answers |
| [Pitch and demo script](submission/PITCH_AND_DEMO_SCRIPT.md) | `BASELINE_IL_8_6` | Sixty-second pitch, synchronized live narration, fallback branch and presenter guardrails |
| [Demo asset manifest](demo/DEMO_ASSET_MANIFEST.json) | `PASS` | Seven screenshot hashes, dimensions, fixture/source revision, route and exact state metadata |
| [Recorded demo fallback](demo/fallback/index.html) | `PASS` | Script-free ordered local sequence with explicit recorded/synthetic/non-authority disclosure |
| [Trust model](product/TRUST_MODEL.md) | `PARTIAL` | Implemented evidence/lineage/projection/reconciliation/readiness review; intake, approval/signing and release authority remain later work |
| [Setup](development/SETUP.md) | `IMPLEMENTED` | Installation, typed configuration, run and build commands |
| [Testing](development/TESTING.md) | `IMPLEMENTED` | Test layers, commands and proof boundaries |
| [Contributing](development/CONTRIBUTING.md) | `IMPLEMENTED` | Clean-room and bounded-story engineering rules |
| [Security and privacy](security/SECURITY_AND_PRIVACY.md) | `IMPLEMENTED_WITH_LIMITATIONS` | Configuration, errors, request IDs, logs, flags and safety limits |
| [AI safety and data transfer](security/AI_SAFETY_AND_DATA_TRANSFER.md) | `FINALIZED_IL_6_6` | Offline finale record, exact transfer inventory, authority matrix, pack/provider controls and course-correction governance |
| [Security review](evidence/SECURITY_REVIEW.md) | `RELEASE_AUDIT_PASS_WITH_DISCLOSED_LIMITS` | Dependency/license, secret/private-path, provenance/similarity, network/mutation results and residual risks |
| [Provenance](governance/PROVENANCE.md) | `IMPLEMENTED` | Greenfield source and artifact lineage |
| [AI-use disclosure](governance/AI_USE_DISCLOSURE.md) | `FINALIZED_IL_6_6` | Development assistance, deterministic product runtime and non-executed provider checkpoint distinction |
| [Submission commitments](governance/SUBMISSION_COMMITMENTS.md) | `FROZEN_EXTERNAL_CLAIM_BASELINE` | Officially submitted identity, promises, boundaries and benefit hypothesis |
| [Promise-to-evidence matrix](governance/PROMISE_TO_EVIDENCE_MATRIX.md) | `ACTIVE_POST_SUBMISSION_CONTROL` | Submitted promise status, owning stories, evidence and remaining proof |
| [Third-party notices](governance/THIRD_PARTY_NOTICES.md) | `IL-9.2_RELEASE_INVENTORY_PASS` | Complete direct/transitive exact-lock dependency and license inventory |
| [Consolidated evidence dossier](evidence/TEST_EVIDENCE.md) | `PASS` | Historical story and focused evidence through `IL-9.3`, including release security and documentation synchronization |
| [Machine-readable foundation evidence](evidence/EV_FOUNDATION.json) | `PASS` | Deterministic command, proof and integrity result summary |
| [Machine-readable repository-safety evidence](evidence/EV_REPO_SAFETY.json) | `PASS` | Generated status/tree equality, rejection corpus, HTTP and documentation proof |
| [Machine-readable privacy evidence](evidence/EV_PRIVACY.json) | `PASS` | Generated redaction corpus and sentinel absence across current persistence/transfer surfaces |
| [Machine-readable Twin evidence](evidence/EV_TWIN.json) | `PASS` | Generated attributed Twin, restart and phase-gate proof |
| [Machine-readable code-map evidence](evidence/EV_CODEMAP.json) | `PASS` | Generated static/declared distinction, repository-equality and list-authority proof |
| [Machine-readable reconciliation evidence](evidence/EV_RECONCILE.json) | `PASS` | Generated controlled truth tables, replay/restart equality and Phase-5 capability proof |
| [Machine-readable citation evidence](evidence/EV_CITATIONS.json) | `PASS` | Six fixed questions, exact disclosure, 23 cited synthetic suggestions, mock boundary and canonical-state non-mutation proof |
| [Machine-readable OpenAI checkpoint evidence](evidence/EV_OPENAI_EVAL.json) | `PASS_OFFLINE_DECISION` | Entry checklist, six `NOT_SENT` previews, credential-safe non-execution and frozen course-correction decision |
| [Machine-readable readiness evidence](evidence/EV_READINESS.json) | `PASS` | Controlled zero-false-`READY`, restart, isolation, integrity and AI-off proof |
| [Machine-readable Passport evidence](evidence/EV_PASSPORT.json) | `PASS` | Exact canonical one-assessment projection, restart, integrity and non-authority proof |
| [Machine-readable retail fixture evidence](evidence/EV_RETAIL_FIXTURE.json) | `PASS` | Per-item/tree/set hashes, source-independent provenance, privacy scan and inert loader boundary |
| [Machine-readable golden-flow evidence](evidence/EV_GOLDEN_FLOW.json) | `PASS` | Persisted browser `BLOCKED → READY → STALE`, AI-off, credential-free and safe-trace proof |
| [Controlled metrics report](evidence/METRICS_REPORT.md) | `PRODUCT_PROOF_PASS / HUMAN_PILOT_REQUIRED` | Exact controlled scorecard, local timing boundary, benefit formula and limitations |
| [Machine-readable metrics evidence](evidence/EV_METRICS.json) | `PASS_CONTROLLED_PRODUCT_METRICS_PILOT_INPUT_REQUIRED` | Hashed source-evidence aggregation, assisted system timing, pilot completeness and claim boundary |
| [Paired pilot input](evidence/PILOT_MEASUREMENT_TEMPLATE.json) | `NOT_RUN` | Strictly validated anonymous developer/lead/manager manual-versus-assisted timing, quality, feedback and sourced-cadence template |
| [Management proof and pilot guide](product/MANAGEMENT_PROOF_AND_PILOT_GUIDE.md) | `MANUAL_QA_READY` | Ten-case product scorecard, leader proof pack and fair benefit-pilot procedure |
| [IL-9.4 interactive manual QA](evidence/IL_9_4_MANUAL_QA.md) | `PASS_CONTROLLED_PRODUCT_QA` | Direct `EMPTY → BLOCKED → READY → STALE`, API-off recovery and reset/restart observation |
| [Claim-to-evidence matrix](submission/CLAIM_EVIDENCE_MATRIX.md) | `IL-9.4_DRAFT` | External claims classified as verified, bounded, hypothesis or not claimable |
| [Machine-readable Evidence Replay proof](evidence/EV_EVIDENCE_REPLAY.json) | `PASS_OPTIONAL_FEATURE_FLAGGED` | Default-off isolation, focused tests, cited revision-1/2 comparison and canonical-state non-mutation |
| [IL-10.1 Evidence Replay evidence](evidence/IL_10_1_TEST_EVIDENCE.md) | `PASS_OPTIONAL_FEATURE_FLAGGED` | Read-only Twin diff, strict opt-in, GET-only browser observation and authority boundary |
| [Machine-readable advisory-disagreement proof](evidence/EV_ADVISORY_DISAGREEMENT.json) | `PASS_OPTIONAL_FEATURE_FLAGGED` | Strict attributed imports, exact text/citation variance, zero comparison requests and unchanged readiness |
| [IL-10.2 advisory-disagreement evidence](evidence/IL_10_2_TEST_EVIDENCE.md) | `PASS_OPTIONAL_FEATURE_FLAGGED` | Default-off browser-local comparison with no orchestration, semantic judgment or authority |
| [Machine-readable remediation-preview proof](evidence/EV_REMEDIATION_PREVIEW.json) | `PASS_OPTIONAL_FEATURE_FLAGGED` | Cited browser-local previews, repository equality, zero execution/network and unchanged readiness |
| [IL-10.3 remediation-preview evidence](evidence/IL_10_3_TEST_EVIDENCE.md) | `PASS_OPTIONAL_FEATURE_FLAGGED` | Default-off cited test/change-intent preview with no apply, execution, validation or authority |
| [Evidence-aligned submission copy](submission/SUBMISSION_COPY.md) | `IL-9.4_INITIAL_DRAFT` | Claim-safe title, short/long copy, impact and disclosure for later finalization |
| [Submission manifest](submission/SUBMISSION_MANIFEST.md) | `PREPARED_TEMPLATE / NOT_FINAL / NOT_SUBMITTED` | Canonical final-delivery artifact set, blockers and evidence-backed completion checklist |
| [Manual review checkpoint](product/MANUAL_REVIEW_CHECKPOINT.md) | `READY` | Supported local launch and judge-facing review walkthrough |
| [Avishkar 2026 registration pack](submission/AVISHKAR_2026_REGISTRATION_PACK.md) | `HISTORICAL_SUBMISSION_DRAFT` | Pre-submission product vision and form-ready preparation; not the controlling submitted artifact |
| [IL-1.2 evidence](evidence/IL_1_2_TEST_EVIDENCE.md) | `PASS` | Safety and observability proof |
| [IL-1.3 evidence](evidence/IL_1_3_TEST_EVIDENCE.md) | `PASS` | Deterministic primitive and serialization proof |
| [IL-1.4 evidence](evidence/IL_1_4_TEST_EVIDENCE.md) | `PASS` | SQLite bootstrap, rollback, restart, refusal and concurrency proof |
| [IL-1.5 evidence](evidence/IL_1_5_TEST_EVIDENCE.md) | `PASS` | Trust shell, API states, keyboard and honest-failure proof |
| [IL-2.1 evidence](evidence/IL_2_1_TEST_EVIDENCE.md) | `PASS` | Project/Mission invariants, scope, revisions, current selection and archive proof |
| [IL-2.2 evidence](evidence/IL_2_2_TEST_EVIDENCE.md) | `PASS` | Persistence, revisions, restart, concurrency, pagination and API proof |
| [IL-2.3 evidence](evidence/IL_2_3_TEST_EVIDENCE.md) | `PASS` | Canonical registration, path privacy, restart and repository non-mutation proof |
| [IL-2.4 evidence](evidence/IL_2_4_TEST_EVIDENCE.md) | `PASS` | Fixed-command Git capture, state matrix, stable digest, immutability, restart and non-mutation proof |
| [IL-2.5 evidence](evidence/IL_2_5_TEST_EVIDENCE.md) | `PASS` | Real browser workflow, failure, restart, path-safety, keyboard and layout proof |
| [IL-2.6 evidence](evidence/IL_2_6_TEST_EVIDENCE.md) | `PASS` | Reproducible `DC-01` safety artifact and operator-documentation closure |
| [IL-3.1 evidence](evidence/IL_3_1_TEST_EVIDENCE.md) | `PASS` | Bounded format, normalization, redaction, digest and atomic-failure proof |
| [IL-3.2 evidence](evidence/IL_3_2_TEST_EVIDENCE.md) | `PASS` | Evidence attribution, persistence, idempotency, timeline, restart and isolation proof |
| [IL-3.3 evidence](evidence/IL_3_3_TEST_EVIDENCE.md) | `PASS` | Claim normalization, applicability, explicit supersession, history, restart and atomicity proof |
| [IL-3.4 evidence](evidence/IL_3_4_TEST_EVIDENCE.md) | `PASS` | Evidence/claim API schema, idempotency, privacy, errors, request-ID and pagination proof |
| [IL-3.5 evidence](evidence/IL_3_5_TEST_EVIDENCE.md) | `PASS` | Browser preview/import, reload, failure, keyboard, integrity, empty-state and lineage-presentation proof |
| [IL-3.6 evidence](evidence/IL_3_6_TEST_EVIDENCE.md) | `PASS` | Generated privacy proof, negative corpus and implementation-matched trust/security documentation |
| [IL-3.7 evidence](evidence/IL_3_7_TEST_EVIDENCE.md) | `PASS` | Bounded historical runtime-observation schema, persistence, API, staleness and offline proof |
| [IL-4.1 evidence](evidence/IL_4_1_TEST_EVIDENCE.md) | `PASS` | Exact Twin vocabulary, metadata, canonical serialization, endpoint-revision and cross-scope rejection proof |
| [IL-4.2 evidence](evidence/IL_4_2_TEST_EVIDENCE.md) | `PASS` | Deterministic entity projection, immutable revisions, exact dependency invalidation and canonical restart proof |
| [IL-4.3 evidence](evidence/IL_4_3_TEST_EVIDENCE.md) | `PASS` | Append-only persistence, bounded API, revision selection, cited list UI, restart and integrity-failure proof |
| [IL-4.4 evidence](evidence/IL_4_4_TEST_EVIDENCE.md) | `PASS` | Canonical-root containment, extension/file/byte/time limits, honest skips, non-execution and repository-equality proof |
| [IL-4.5 evidence](evidence/IL_4_5_TEST_EVIDENCE.md) | `PASS` | Golden TypeScript/JSON extraction, bounded partial recovery, deterministic digest, tamper rejection and no-runtime claim proof |
| [IL-4.6 evidence](evidence/IL_4_6_TEST_EVIDENCE.md) | `PASS` | Exact snapshot binding, append-only restart/integrity proof, Twin SoftwareAsset projection and explicit non-equivalent fallback proof |
| [IL-4.7 evidence](evidence/IL_4_7_TEST_EVIDENCE.md) | `PASS` | Production API/UI, accessible list, explicit fallback consent, restart and G2 proof |
| [IL-5.1 evidence](evidence/IL_5_1_TEST_EVIDENCE.md) | `PASS` | Rule identity, exact eligibility, applicability overlap and conservative value-relation proof |
| [IL-5.2 evidence](evidence/IL_5_2_TEST_EVIDENCE.md) | `PASS` | Active conflict/ambiguity truth table, explicit supersession topology and no-winner proof |
| [IL-5.3 evidence](evidence/IL_5_3_TEST_EVIDENCE.md) | `PASS` | Exact dependency invalidation, explicit missing support, immutable successor and restart proof |
| [IL-5.4 evidence](evidence/IL_5_4_TEST_EVIDENCE.md) | `PASS` | Bounded deterministic traversal, exact citations, explicit impact-gap truth cases and no-AI-authority proof |
| [IL-5.5 evidence](evidence/IL_5_5_TEST_EVIDENCE.md) | `PASS` | Immutable reconciliation/impact persistence, strict API, replay and integrity proof |
| [IL-5.6 evidence](evidence/IL_5_6_TEST_EVIDENCE.md) | `PASS` | Strict accessible findings/impact UI, real correction/stale history and regression proof |
| [IL-5.7 evidence](evidence/IL_5_7_TEST_EVIDENCE.md) | `PASS` | Generated aggregate truth table, deterministic rerun, restart, safety and controlled metrics proof |
| [IL-6.1 evidence](evidence/IL_6_1_TEST_EVIDENCE.md) | `PASS` | Deterministic minimized pack, second-pass redaction, bounds and stable allowlisted citation proof |
| [IL-6.2 evidence](evidence/IL_6_2_TEST_EVIDENCE.md) | `PASS` | Fixed-question deterministic AI-off explanation, correction handling, citation resolution and tamper-rejection proof |
| [IL-6.3 evidence](evidence/IL_6_3_TEST_EVIDENCE.md) | `PASS` | Default-off/mock-only provider request, strict structured validation, safe fallback and resource-control proof |
| [IL-6.4 evidence](evidence/IL_6_4_TEST_EVIDENCE.md) | `PASS` | Strict cited-question API/UI, exact outbound disclosure, AI-off completion and browser citation/failure proof |
| [IL-6.5 evidence](evidence/IL_6_5_TEST_EVIDENCE.md) | `PASS_OFFLINE_DECISION` | Personal OpenAI checkpoint prerequisites, safe non-execution, exact decision enum and digest proof |
| [IL-6.6 evidence](evidence/IL_6_6_TEST_EVIDENCE.md) | `PASS` | Final AI transfer inventory, authority limits, disclosure, checkpoint binding and sensitive-body documentation guard |
| [IL-6.7 evidence](evidence/IL_6_7_TEST_EVIDENCE.md) | `PASS` | Deterministic cited synthetic suggestions, strict labels, provider-off behavior and zero authority proof |
| [IL-7.1 evidence](evidence/IL_7_1_TEST_EVIDENCE.md) | `PASS` | Nine readiness obligations, exhaustive fail-closed truth table, ordering/digests and non-authority proof |
| [IL-7.2 evidence](evidence/IL_7_2_TEST_EVIDENCE.md) | `PASS` | Immutable assessment persistence, atomic dependency capture, restart, concurrency and stale-history proof |
| [IL-7.3 evidence](evidence/IL_7_3_TEST_EVIDENCE.md) | `PASS` | Exact one-assessment Passport projection, digest, history, concurrency and stale-association proof |
| [IL-7.4 evidence](evidence/IL_7_4_TEST_EVIDENCE.md) | `PASS` | Strict Mission-scoped readiness/Passport API, browser state matrix and structural download/print boundary |
| [IL-7.5 evidence](evidence/IL_7_5_TEST_EVIDENCE.md) | `PASS` | Generated domain/SQLite/API/browser proof, zero controlled false `READY`, exact Passport equality and AI-off boundary |
| [IL-7.6 evidence](evidence/IL_7_6_TEST_EVIDENCE.md) | `PASS` | Contract-aligned readiness/Passport technical, operator, trust and security documentation closure |
| [IL-8.1 evidence](evidence/IL_8_1_TEST_EVIDENCE.md) | `PASS` | Controlled repository/evidence definitions, correction topology, deterministic hashes and provenance |
| [IL-8.2 evidence](evidence/IL_8_2_TEST_EVIDENCE.md) | `PASS` | Real-path initial loader, idempotency, restart, scoped reset and non-demo isolation |
| [IL-8.3 evidence](evidence/IL_8_3_TEST_EVIDENCE.md) | `PASS` | Browser conflict/impact, offline answer, correction, readiness, Passport and staleness proof |
| [IL-8.4 evidence](evidence/IL_8_4_TEST_EVIDENCE.md) | `PASS` | Keyboard focus continuity, semantic/non-color status, visual-state and responsive proof |
| [Competition accessibility review](evidence/ACCESSIBILITY_REVIEW.md) | `PASS` | Two-minute story, keyboard path, semantic inventory, visual-state matrix and limitations |
| [Machine-readable accessibility evidence](evidence/EV_ACCESSIBILITY.json) | `PASS` | Four focused Chromium cases, viewport matrix, screenshot attachment register and source hashes |
| [IL-8.5 evidence](evidence/IL_8_5_TEST_EVIDENCE.md) | `PASS` | Restart/recovery, reset, repository/network/privacy safety and 5.8-minute rehearsal proof |
| [Machine-readable demo gate](evidence/EV_DEMO_GATE.json) | `PASS` | Three API starts, exact runtime/source equality, zero outbound/sentinel results and timed phases |
| [IL-8.6 evidence](evidence/IL_8_6_TEST_EVIDENCE.md) | `PASS` | Runbook, fallback, metadata, judge Q&A, pitch and limitation closure |
| [Machine-readable demo support evidence](evidence/EV_DEMO_SUPPORT.json) | `PASS` | Seven production-build captures, restart recovery and API-off local fallback rendering proof |
| [IL-9.1 evidence](evidence/IL_9_1_TEST_EVIDENCE.md) | `PASS_WINDOWS_LINUX_CI_CONFIGURED` | Clean install, 20 verification layers, exact observed counts, platform limits and advisory handoff |
| [Machine-readable release evidence](evidence/EV_RELEASE.json) | `PASS_WINDOWS_LINUX_CI_CONFIGURED` | Runtime/lockfile equality, command durations, source digest and 17 artifact hashes |
| [IL-9.2 evidence](evidence/IL_9_2_TEST_EVIDENCE.md) | `PASS` | Remediated dependency audit, complete licenses, provenance/similarity review and candidate privacy/safety proof |
| [Machine-readable security audit](evidence/EV_SECURITY_AUDIT.json) | `PASS` | Zero audit vulnerabilities, 222 dependency instances, 406-file candidate scan and bound mutation/privacy evidence |
| [Source similarity review](governance/SOURCE_SIMILARITY_REVIEW.md) | `PASS_BOUNDED_REVIEW` | Zero authorized reuse/adaptation and zero known implementation marker/header findings with explicit limit |
| [IL-9.3 evidence](evidence/IL_9_3_TEST_EVIDENCE.md) | `PASS` | Canonical documents, commands, API routes, deferred labels, schema and screenshots synchronized |
| [Machine-readable documentation evidence](evidence/EV_DOCUMENTATION.json) | `PASS` | Fourteen document hashes, 53 API routes, package-script references and seven manifest-bound screenshots |
| [IL-9.4 evidence](evidence/IL_9_4_TEST_EVIDENCE.md) | `PRODUCT_AND_MANUAL_QA_PASS / EXTERNAL_INPUT_REQUIRED` | Product metrics, claim dossier and direct browser QA pass; paired human timing/feedback rows remain open |
| [Release checklist](evidence/RELEASE_CHECKLIST.md) | `ACTIVE_PRE_RELEASE_CHECKLIST` | Platform, security and documentation gates pass; metrics, rules, submission and freeze items remain explicit |

## Authoritative planning

- R2 implementation boundary: `planning/r2-development-readiness-2026-08-03/DEVELOPMENT_READINESS_FREEZE.md`
- R3 backlog: `planning/r3-implementation-backlog-2026-08-03/IMPLEMENTATION_BACKLOG.md`
- `IL-5.1` execution authority: the frozen R2 Reconcile Core boundary and R3 backlog entry; no separate coding-prompt file exists
- `IL-5.2` execution authority: the same frozen Reconcile Core boundary and dependency-eligible R3 story; no separate coding-prompt file exists
- `IL-5.3` execution authority: the same frozen Reconcile Core boundary and dependency-eligible R3 story; no separate coding-prompt file exists
- `IL-5.4` execution authority: the frozen Reconcile Core boundary and R3 impact-traversal story; no separate coding-prompt file exists
- `IL-5.5` execution authority: the frozen Reconcile Core boundary and R3 reconciliation/impact persistence and API story; no separate coding-prompt file exists
- `IL-5.6` execution authority: the frozen Reconcile Core boundary and R3 findings-and-impact presentation story; no separate coding-prompt file exists
- `IL-5.7` execution authority: the frozen `DC-04`/`DC-05` boundary and R3 deterministic-core proof story; no separate coding-prompt file exists
- `IL-6.1` execution authority: the frozen R2 context-compiler/AI-safety boundary and dependency-eligible R3 evidence-pack story; no separate coding-prompt file exists
- `IL-6.2` execution authority: the frozen R2 offline-fallback/structured-response boundary and dependency-eligible R3 deterministic explanation story; no separate coding-prompt file exists
- `IL-6.3` execution authority: the frozen R2 provider-neutral adapter/citation/resource boundary and dependency-eligible R3 mocked-validation story; no separate coding-prompt file exists
- `IL-6.4` execution authority: the frozen R2 cited-question/disclosure boundary and dependency-eligible R3 product API/UI story; no separate coding-prompt file exists
- `IL-6.5` execution authority: the frozen personal OpenAI checkpoint permits an offline course-correction decision when explicit transfer enablement/runtime credential are absent; no live-call branch was authorized
- `IL-6.6` execution authority: the R3 professional AI safety/transfer/course-correction documentation story, reconciled to the completed offline checkpoint
- `IL-6.7` execution authority: the frozen R2 advisory-only AI boundary and dependency-eligible R3 synthetic edge-case story; deterministic provider-free generation was selected
- `IL-7.1`-`IL-7.6` execution authority: frozen fail-closed readiness rules, immutable repository-derived assessment history, unsigned one-assessment Passport projection, strict supported API/UI, generated cross-layer proof and reconciled professional documentation; validation/review intake and release authority remain excluded
- `IL-8.2` execution authority: fixed generated-root materialization and scoped reset for the one IntelliLoop-owned fixture only; no registered-user repository write or source execution
- `IL-8.4` execution authority: the frozen competition visual/responsive/accessibility acceptance; no authority, provider or workflow expansion
- `IL-8.5` execution authority: the frozen non-functional reset/restart/offline/repository/privacy/rehearsal gate; no production-certification expansion
- `IL-8.6` execution authority: the frozen professional demo-support story covering runbook rehearsal, truthful fallback assets/metadata, judge Q&A and synchronized narration; no runtime-authority expansion
- `IL-9.1` execution authority: clean install/build/test/hash acceptance with Windows directly observed and Linux deterministically configured in CI; no unobserved Linux pass or final security claim
- `IL-9.2` execution authority: exact dependency remediation, complete lockfile license inventory, source-independent provenance/similarity review and secret/network/mutation proof; no legal, penetration-test or universal-plagiarism claim
- `IL-9.3` execution authority: synchronize and verify canonical technical/setup/user/API/security/troubleshooting documentation, command names and current screenshots; no runtime or authority expansion
- `IL-9.4` execution authority: aggregate existing controlled proof, implement claim mapping and a privacy-preserving manual-versus-assisted pilot; do not fabricate human timing, feedback, savings or production outcomes
- `IL-10.1` optional execution authority: default-off, read-only immutable Twin comparison with persisted path citations; no canonical mutation, readiness/Passport authority or provider use
- `IL-10.2` optional execution authority: default-off, browser-memory comparison of strict attributed advisory imports; no network, persistence, orchestration, semantic judgment or readiness/Passport authority
- `IL-10.3` optional execution authority: default-off, browser-memory cited test-plan/change-intent preview; no source fabrication, repository write, shell/Git/network execution, validation or readiness/Passport authority
- Current completion checkpoint: `58/62`; every optional story is complete while mandatory `IL-9.4` still awaits paired human pilot input
- Competition-rule gaps: `planning/r3-implementation-backlog-2026-08-03/AVISHKAR_RULES_GAP_REGISTER.md`

Planning files describe authorized future work. They are not evidence that a capability exists.
