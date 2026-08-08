# IntelliLoop Documentation and Submission Plan

**Purpose:** Produce professional, evidence-backed project documentation at the point each subject becomes stable.  
**Policy:** Documentation is part of story completion and may never claim implementation beyond executable proof.

## Documentation quality standard

Every maintained document must:

- name its audience and status;
- identify the product/version or evidence date it describes;
- use the exact IntelliLoop vocabulary frozen by R2;
- separate planned, implemented, tested and deferred behavior;
- link requirements and claims to story IDs, tests or evidence reports;
- disclose synthetic data, offline behavior and optional AI accurately;
- avoid Nisum/client/employer/private information and unverified Avishkar claims;
- avoid secrets, raw credentials, private URLs and raw absolute paths in examples;
- use copy-pasteable commands verified on the supported environment;
- be refreshed in the same change that materially alters its subject.

## Canonical document set

| ID | Target document | First created | Finalized | Owner/purpose |
|---|---|---|---|---|
| DOC-01 | `README.md` | `IL-1.1` | `IL-9.3` | Product overview, honest status, quick start and links |
| DOC-02 | `docs/INDEX.md` | `IL-1.1` | `IL-9.3` | Canonical documentation map and status legend |
| DOC-03 | `docs/architecture/ARCHITECTURE.md` | `IL-1.1` | `IL-9.3` | Context, modules, dependency direction and runtime topology |
| DOC-04 | `docs/architecture/DOMAIN_MODEL.md` | `IL-1.3` | `IL-9.3` | Twin vocabulary, reconciliation, readiness and Passport authority |
| DOC-05 | `docs/architecture/DATA_AND_MIGRATIONS.md` | `IL-1.4` | `IL-9.3` | SQLite ownership, schema history, restart and upgrade behavior |
| DOC-06 | `docs/api/API_REFERENCE.md` | `IL-2.2` | `IL-9.3` | Versioned endpoint contract, errors, bounds and examples |
| DOC-07 | `docs/development/SETUP.md` | `IL-1.1` | `IL-9.3` | Prerequisites, install, run, test, build and troubleshooting links |
| DOC-08 | `docs/development/TESTING.md` | `IL-1.1` | `IL-9.3` | Test pyramid, commands, fixtures and proof gates |
| DOC-09 | `docs/development/CONTRIBUTING.md` | `IL-1.1` | `IL-9.3` | Scope, clean-room, commit and documentation discipline |
| DOC-10 | `docs/security/SECURITY_AND_PRIVACY.md` | `IL-1.2` | `IL-9.3` | Threat boundaries, repository safety, redaction and network defaults |
| DOC-11 | `docs/security/AI_SAFETY_AND_DATA_TRANSFER.md` | `IL-6.1` | `IL-6.7` | Evidence pack, citations, provider controls, synthetic advisory boundary and outbound disclosure |
| DOC-12 | `docs/governance/PROVENANCE.md` | `IL-1.1` | `IL-9.2` | Greenfield authorship, source-use boundary and generated-artifact ledger |
| DOC-13 | `docs/governance/AI_USE_DISCLOSURE.md` | `IL-1.1` | `IL-9.5` | AI-assisted development and product-provider disclosure |
| DOC-14 | `docs/governance/THIRD_PARTY_NOTICES.md` | `IL-1.1` | `IL-9.2` | Direct/transitive dependency license and notice inventory |
| DOC-15 | `docs/product/USER_GUIDE.md` | `IL-2.5` | `IL-9.3` | Real user workflow, concepts and failure-state guidance |
| DOC-16 | `docs/product/TRUST_MODEL.md` | `IL-3.6` | `IL-9.3` | Fact/inference, evidence eligibility, conflicts, staleness and readiness |
| DOC-17 | `docs/product/READINESS_AND_PASSPORT_GUIDE.md` | `IL-7.3` | `IL-9.3` | Readiness/Passport semantics, immutability, digest, operation and non-deployment boundary |
| DOC-18 | `docs/demo/DEMO_RUNBOOK.md` | `IL-8.3` | `IL-8.6` | 5–7 minute script, reset, expected states and fallback branch |
| DOC-19 | `docs/demo/DEMO_TROUBLESHOOTING.md` | `IL-8.3` | `IL-9.3` | Recovery steps that preserve evidence truth |
| DOC-20 | `docs/demo/JUDGE_QA.md` | `IL-8.6` | `IL-9.6` | Concise answers on innovation, AI, evidence, limits and scale |
| DOC-21 | `docs/evidence/TEST_EVIDENCE.md` | `IL-1.6` | `IL-9.4` | Commands, environment, results and linked machine-readable reports |
| DOC-22 | `docs/evidence/METRICS_REPORT.md` | `IL-5.7` | `IL-9.4` | Controlled scenario measurements and limitations |
| DOC-23 | `docs/evidence/SECURITY_REVIEW.md` | `IL-3.6` | `IL-9.2` | Negative test corpus, secret scan, network and mutation proof |
| DOC-24 | `docs/evidence/ACCESSIBILITY_REVIEW.md` | `IL-8.4` | `IL-8.6` | Keyboard, focus, text semantics and 1366×768 review |
| DOC-25 | `docs/evidence/RELEASE_CHECKLIST.md` | `IL-8.6` | `IL-9.7` | Code-freeze and submission evidence checklist |
| DOC-26 | `docs/submission/AVISHKAR_RULES_MATRIX.md` | `IL-9.5` | `IL-9.5` | Official-rule-to-evidence compliance matrix |
| DOC-27 | `docs/submission/SUBMISSION_COPY.md` | `IL-9.4` | `IL-9.6` | Title, one-line, 100/250-word, impact and disclosure variants |
| DOC-28 | `docs/submission/PITCH_AND_DEMO_SCRIPT.md` | `IL-8.6` | `IL-9.6` | 60-second pitch and synchronized live-demo narration |
| DOC-29 | `docs/submission/CLAIM_EVIDENCE_MATRIX.md` | `IL-9.4` | `IL-9.7` | Every material external claim mapped to reproducible evidence |
| DOC-30 | `docs/submission/SUBMISSION_MANIFEST.md` | `IL-9.6` | `IL-9.7` | Final files, hashes, versions, evidence and delivery status |
| DOC-31 | `docs/governance/SUBMISSION_COMMITMENTS.md` | Post-submission reconciliation | `IL-9.7` | Frozen submitted identity, promise, safety and benefit-claim baseline |
| DOC-32 | `docs/governance/PROMISE_TO_EVIDENCE_MATRIX.md` | Post-submission reconciliation | `IL-9.7` | Submitted promises mapped to current evidence, owning stories and proof gaps |

## Evidence artifacts generated by verification

These are reports, not hand-edited claims. The final paths may be JSON, Markdown or both, but must be deterministic and secret-safe.

| Evidence ID | Produced by | Required content |
|---|---|---|
| EV-FOUNDATION | `IL-1.6` | Environment versions, clean install, typecheck, test, build, API health, web smoke |
| EV-REPO-SAFETY | `IL-2.6` and `IL-8.5` | Before/after repository status and digest equality, traversal/symlink rejection |
| EV-PRIVACY | `IL-3.6` and `IL-9.2` | Sentinel absence from logs, DB, API, export and provider fixtures |
| EV-TWIN | `IL-4.7` | Expected node/edge identities, attribution and restart equality |
| EV-CODEMAP | `IL-4.7` | Extracted controlled-fixture assets plus size/time/syntax failure behavior |
| EV-RECONCILE | `IL-5.7` | Truth tables for conflict, supersession, stale, missing, ambiguous and impact gap |
| EV-CITATIONS | `IL-6.4`, extended by `IL-6.7` | Stable pack digest, known citation success, unknown citation rejection and cited synthetic advisory proof |
| EV-OPENAI-EVAL | `IL-6.5` | Redacted fixed-set results, latency/usage, citation validity and selected decision |
| EV-READINESS | `IL-7.5` | Fail-closed truth table with zero false `READY` in controlled cases |
| EV-PASSPORT | `IL-7.5` | Byte/canonical equality between persisted assessment projection and Passport input |
| EV-GOLDEN-FLOW | `IL-8.3` | Browser `BLOCKED → READY → STALE`, reset and AI-off completion |
| EV-ACCESSIBILITY | `IL-8.4` | Keyboard and semantic-state evidence at demo viewport |
| EV-DEMO-SUPPORT | `IL-8.6` | Seven exact screenshot assets, restart recovery, local fallback with API stopped, metadata/hashes and AI-off disclosures |
| EV-RELEASE | `IL-9.1` | Pinned clean install, all required verification layers, supported-platform disposition and source/artifact hashes |
| EV-SECURITY-AUDIT | `IL-9.2` | Exact dependency/license inventory, zero-advisory observation, provenance/similarity review and candidate secret/network/mutation proof |
| EV-DOCUMENTATION | `IL-9.3` | Canonical document hashes/metadata, package-script and API-route coverage, deferred labels and screenshot-manifest verification |

## Checkpoint-specific documentation

### Foundation checkpoint

Create the documentation skeleton with real commands and explicit `FOUNDATION_ONLY` status. Record the greenfield/source-independent boundary and avoid aspirational feature screenshots.

### Evidence and Twin checkpoint

Add the domain model, import limits, redaction model, data/migration details, repository safety model and API contracts. Publish only fixture-backed examples produced through actual APIs.

### Deterministic-core checkpoint

Document reconciliation truth tables, impact traversal, offline explanation and known limitations. Begin the controlled metrics report; do not extrapolate to production.

### Personal OpenAI checkpoint

Before the call, document what data leaves the machine and show the redacted pack. After evaluation, record only safe metadata and the exact course-correction decision. Never include the credential or raw secret-bearing prompts.

### Core-demonstrable checkpoint

Create the user guide, demo runbook, troubleshooting, judge Q&A, accessibility report, Release Passport guide and fallback assets from the verified golden flow.

### Submission checkpoint

Refresh every command and screenshot against the release candidate. Complete the official-rules matrix, dependency notices, AI-use disclosure, claim-evidence matrix, test dossier, submission copy and final manifest. Remove or qualify every unsupported claim.

## Professional visual assets

Visual assets are produced only after the UI is stable:

- architecture diagram from implemented module boundaries;
- Active Twin screenshot showing cited relationships and accessible labels;
- reconciliation screenshot showing conflict and impact gap;
- readiness/Passport screenshots for `BLOCKED`, `READY` and `STALE`;
- offline/AI-assisted disclosure screenshot if the provider checkpoint permits it;
- short fallback recording or ordered screenshot sequence, subject to official rules;
- no corporate logo or branding without permission.

Each asset must include capture date, app revision, fixture version and associated test state in the submission manifest.

## Freshness triggers

Documentation must be refreshed when any of these change:

- public API contract or error code;
- database schema or migration support;
- domain vocabulary, rule version or readiness obligation;
- import, repository, network, privacy or AI boundary;
- setup/build/test command;
- feature flag default or cut decision;
- demo fixture, expected state or timing;
- controlled metric or external claim;
- official Avishkar rule or organizer clarification.

## Definition of documentation complete

- All canonical documents exist and have accurate statuses.
- Setup instructions succeed from a clean environment.
- Architecture, domain and API docs match implementation contracts.
- Security/privacy and AI-transfer boundaries have negative-test evidence.
- All screenshots and metrics originate from the release candidate.
- The official-rules matrix contains no unresolved submission blocker.
- Every external claim has evidence or an explicit projection/limitation label.
- Package notices, AI-use disclosure and provenance are complete.
- The demo runbook and fallback path have been rehearsed.
- The submission manifest contains exact versions and hashes.

`INTELLILOOP_DOCUMENTATION_PLAN_FROZEN`
