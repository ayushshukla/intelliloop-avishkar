# IntelliLoop Execution State

**Audience:** Product, engineering and future roadmap-phase operators  
**Current roadmap phase:** Phase 2 - terminology and visual foundation  
**Evidence date:** 2026-08-08  
**Status:** `PHASE_2_VERIFIED / DEMO_RUN_1_PASS / DEMO_RUN_2_PASS / RUN_3_READY`

## Repository entry state

- Root: repository root (`docs/product/EXECUTION_STATE.md` resolves two directories below it); the operator-supplied machine path is intentionally not persisted
- Branch: `main`
- Commit: `UNBORN` — `HEAD` does not exist and no commit history is available
- Remote: none configured
- Worktrees: one, at the repository root
- Working tree: every project path was untracked at Phase-1 entry; no clean Git baseline exists
- Package manager: npm `10.9.4`, Node `22.22.0`, `package-lock.json` lockfile version 3

The controlled demo creates real commits only in its owned generated synthetic repository. Those fixture commits are not the application repository's `HEAD`. Phase 1 must remain uncommitted because the extensive pre-existing untracked tree cannot be attributed exclusively to this phase.

## Evidence-backed story baseline

The prior `58/62` statement is confirmed, not assumed:

- `COMPLETE`: 55 mandatory stories from `IL-1.1` through `IL-9.3`, plus optional `IL-10.1` through `IL-10.3` — 58 total.
- `PARTIAL`: `IL-9.4`. Product metrics, claim controls, manual QA and the strict calculation path exist; six genuine paired role runs, three feedback responses and sourced monthly cadence are absent.
- `BLOCKED`: `IL-9.5`. The official Avishkar rulebook/authorized source is absent, so official eligibility or compliance cannot be claimed.
- `PARTIAL`: `IL-9.6`. Draft submission copy, pitch/demo narration, fallback and asset hashes exist; official-rule adaptation and the final approved delivery package are pending.
- `PARTIAL`: `IL-9.7`. Release/security/documentation checklists and generators exist; final manifest approval, clean freeze, final backup/restore if required, tag/handoff and claim approval have not occurred.
- `NOT APPLICABLE`: no canonical story. Backup/restore and deployment are not current product capabilities and cannot be claimed as completed Phase-1 work.

Completion evidence is the story dossier under `docs/evidence`, generated `EV_*` reports, migrations and executable tests—not the count field alone. `IL-1.1`/`IL-1.6` are covered by `EV_FOUNDATION.json` and the consolidated foundation dossier; `IL-5.6` records its result under `**Result:** PASS`.

## Verified capabilities

- Five npm workspaces: Fastify API, React/Vite web app, domain, contracts and synthetic demo fixtures.
- API-owned SQLite with forward-only checksum-verified migrations `001` through `014`.
- Project/Mission lifecycle, safe local repository registration and fixed read-only Git snapshot capture, including attached, detached and unborn repositories.
- Redacted evidence import, immutable claims/supersessions and append-only timeline/runtime observations.
- Immutable Twin and source-free static code-map revisions bound to an exact Git snapshot.
- Deterministic reconciliation, cited impact paths and fixed-question AI-off explanations.
- One fail-closed `readiness.v1` evaluation persisted only through immutable `release-assessment.v1` history.
- Unsigned `release-passport.v1` projection that reproduces a stored assessment; the browser does not calculate readiness.
- Controlled synthetic `BLOCKED → READY → STALE` demo with API failure/recovery, scoped reset and recorded fallback.
- Default-off Evidence Replay, advisory disagreement and remediation-preview labs; none has canonical/readiness authority.

## Fixture-only, unverified and absent behavior

- LoopMart data, validation results, review record, controlled source correction and demo repository are synthetic/fixture-owned.
- General public validation/review intake is absent; current demo services populate only controlled records.
- External AI is protected off. No provider quality, latency or business result is measured.
- Linux verification is configured in GitHub Actions but was not locally observed and no remote is configured here.
- Authentication, multi-tenancy, enterprise/Jira/GitLab connectors, cloud deployment, signing/approval, production telemetry, backup/restore tooling and production scale are absent.
- Optional lab behavior is implemented and test-evidenced but was not re-run through a direct human browser session during this Phase-1 discovery pass.

## Human and external actions pending

- Run the anonymous developer, technical-lead and manager manual/assisted pilot in `docs/evidence/PILOT_MEASUREMENT_TEMPLATE.json`; never backfill or simulate its observations.
- Supply an official rulebook, authorized form export/screenshots or official URL and resolve the gap register before `IL-9.5` can pass.
- Review/finalize the submission manifest, assets, claims and delivery steps only after the rule and pilot dispositions are known.
- Do not claim a backup, restore, presentation, video, manager demonstration, organizer acceptance, submission, freeze or measured savings until it actually occurs.

## Configuration names

Runtime names only; values must never be copied into this file:

- `INTELLILOOP_API_HOST`
- `INTELLILOOP_API_PORT`
- `INTELLILOOP_LOG_LEVEL`
- `INTELLILOOP_DATA_DIRECTORY`
- `INTELLILOOP_AI_EXTERNAL_CALLS`
- `INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY`
- `INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT`
- `INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW`
- `VITE_INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY`
- `VITE_INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT`
- `VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW`
- Test/launcher-only: `INTELLILOOP_E2E_API_PORT`, `INTELLILOOP_E2E_WEB_PORT`, `INTELLILOOP_E2E_DATA_DIRECTORY`, `INTELLILOOP_DEMO_DATA_DIRECTORY`, `INTELLILOOP_RELEASE_CI`

## Phase-1 validation record

Pre-edit focused baseline:

- deterministic readiness/reassessment/offline/provider contracts: 85 tests passed across 5 files;
- immutable assessment/Passport, Git non-mutation, demo restart/reset, citations and request safety: 28 tests passed across 6 files; and
- persisted golden path: 21 focused tests passed, including 4 Chromium scenarios.

Final Phase-1 verification:

- authoritative `evidence:release-platform`: `PASS` across 20/20 stages on Windows 11; Linux remains `CONFIGURED_NOT_OBSERVED_LOCALLY`;
- clean `npm ci`: 176 packages installed, lockfile unchanged, zero reported vulnerabilities;
- typecheck: all five workspaces passed;
- unit/component: 391/391 tests across 46 files;
- API/integration: 163/163 tests across 32 files;
- production web build: 86 modules transformed;
- browser: 17/17 Chromium workflows, including `BLOCKED → READY → STALE`, API recovery and AI-off completion;
- focused golden flow: 21 tests; readiness/Passport evidence: 56 focused tests;
- documentation: 17 canonical documents, all 53 registered API routes, seven current screenshots and 110 Markdown files with zero broken local targets;
- release security: zero full/production npm vulnerabilities, 222 dependency instances, 406 candidate files, zero non-fixture secret/private-path/prohibited-file findings; and
- optional Evidence Replay, advisory-disagreement and remediation-preview evidence regenerated with zero canonical/repository mutation.

Two fail-closed verification findings were repaired before the uninterrupted passing run: the backlog's `implementedThrough` value was restored to a real canonical story ID while optional completions were recorded separately, and the seven-image demo-support package was recaptured against its current source-file-set digest. One long browser workflow received only Playwright's per-test `slow` allowance; its assertions and product behavior were not reduced. A pre-existing registration pack and its generated DOCX were sanitized to remove the submitter's identity; the DOCX passed structural privacy and accessibility audits, while visual render QA could not run because LibreOffice is unavailable. No readiness, AI authority, repository-write or remediation boundary changed.

## Phase-2 terminology and visual foundation

Phase 2 is a presentation-only product-language and visual-system migration. The centralized presentation boundary is `apps/web/src/presentation.tsx`; it maps stored domain values to honest, accessible UI labels while preserving raw values for diagnostics and compatibility.

- Primary product terms are Project, Work Item, Work Item Key, Work Item Type, Linked Evidence, Impact Map, Resolve Conflicts, Risks & Checks, Release Check, Release Evidence Report, Analyzed Commit, Accepted Decision and Missing Evidence.
- Workflow Status and Release Check are separate axes. No authoritative Jira workflow source exists, so workflow is shown as `Not tracked`; `CURRENT` and `ARCHIVED` are not presented as workflow states.
- Release Check is rendered only from persisted backend assessments: `BLOCKED` is `Not Ready`, `READY` is `Ready`, and `STALE` is `Recheck Needed`. With no stored assessment the UI says `Not Checked`. Unknown values fail visibly without inventing readiness.
- Provenance is explicit: IntelliLoop Native, Built-in Baseline, External Evidence, or a provenance-safe unknown fallback. External results retain their source attribution.
- Jira-shaped metadata is honest about absence: unavailable workflow and sprint data are not fabricated; unpopulated type, priority, assignee, reporter, labels, component and fix-version fields are shown as not specified.
- Project selection, Work Item overview, Linked Evidence, Impact Map, code map, Resolve Conflicts, cited explanations, Release Check/Report and the competition demo use the shared terminology and semantic status language.
- The responsive visual foundation introduces reusable status/provenance badges, status-axis cards, semantic color variables, visible focus states, forced-color support and narrow-screen behavior without changing authoritative behavior.

Compatibility boundaries remained unchanged: there is no migration `015`, API routes and payload keys retain their established names, internal mission/readiness/passport/Twin/reconciliation identifiers and enums remain intact, historical records were not rewritten, and no Jira connector was added. Repository registration, analysis and remediation-preview behavior remain read-only/default-off. AI remains advisory and the complete deterministic workflow remains available with external AI disabled.

## Phase-2 validation record

- Typecheck passed across all five workspaces; production build completed with 87 web modules.
- Unit/component verification passed 406/406 tests across 47 files; API/integration verification passed 163/163 tests across 32 files.
- Focused presentation/foundation verification passed 30/30 tests; Release Check/Report verification passed 56 focused tests; persisted golden-flow verification passed 21 focused tests.
- The stale pre-Phase-2 browser selectors were corrected, after which the complete browser suite passed 17/17. Demo Acceleration Run 1 subsequently executed the authoritative release-platform orchestration once from the stabilized tree; all 20 stages passed in one uninterrupted Windows record.
- Golden-flow, accessibility, demo-gate, demo-support, repository-safety, privacy, deterministic projections and documentation checks were rerun against the corrected final tree.
- Human visual QA covered the seven demo views at desktop size and the Work Item overview, Release Check and demo state at a 390-by-844 narrow viewport. No clipping, overlap or horizontal overflow was observed; status meaning remained textual and non-color-only.

## Demo acceleration Run 1 completion

Run 1 is complete. The earlier controlled-demo API failure had two bounded timeout causes under loaded Windows suite execution, not nondeterministic product authority:

- the Git command runner's five-second default could expire during full-suite contention; its fail-closed per-command ceiling is now 15 seconds, while explicit negative timeout tests still prove timeout failure; and
- the aggregate demo lifecycle test inherited Vitest's 30-second outer deadline even though it performs 35 separately bounded Git reads across setup, correction, staleness, restart and reload. That one test now has a 240-second aggregate ceiling so teardown cannot race an active bounded Git process. No product operation timeout, retry or sleep was added.

Focused repetitions passed 24/24 after the lifecycle ceiling change and 28/28 after the Git runner change. The normal API suite then passed 163/163 in 32 files. The authoritative `evidence:release-platform` command passed all 20 stages in one uninterrupted run: clean install with zero reported vulnerabilities, all workspace typechecks, 406/406 unit/component tests, 163/163 API/integration tests, production build, 17/17 Chromium workflows, repository/privacy/safety checks, deterministic projections, 56 focused Release Check/Report tests, 21 focused golden-flow tests, accessibility, demo gate/support and documentation links. The recorded platform result is `PASS`; Linux remains `CONFIGURED_NOT_OBSERVED_LOCALLY`.

The web application now presents one guided six-step synthetic journey across existing routes: Work Item, Linked Evidence, Impact Map, Resolve Conflicts, Release Check and Release Evidence Report. The shared context header uses stored Project, Work Item, repository, ref, snapshot and assessment data; it keeps Workflow Status separate from Release Check and never computes readiness. Missing prerequisites, context-load errors and retry are explicit. The home and demo entry action is `Use Demo Project`. Controlled reset requires confirmation and states that unrelated Projects, Work Items and repositories are outside its scope.

Focused final verification passed: 25/25 guided/foundation/Report component tests, production build, 8/8 isolated Chromium golden/accessibility scenarios, repository-safety, 21 focused golden-flow tests and accessibility evidence with four browser plus two responsive cases. Live in-app browser QA covered empty prerequisites, Not Ready, controlled correction to Ready, the stored unsigned Release Evidence Report, Recheck Needed and reset confirmation. Desktop and 390-by-844 views had no horizontal overflow; journey states remained textual and non-color-only; browser console warnings/errors were empty.

Run 1 did not add an API route, schema or migration. Migrations remain `001` through `014`. The single deterministic `readiness.v1` authority, immutable assessment/report history, read-only repository boundary, default-off remediation, exact-commit pinning, redaction boundary, AI-off workflow and provenance rules remain unchanged.

## Demo acceleration Run 2 completion

Run 2 is complete. IntelliLoop now has one genuine Local Project Pilot entry beside the controlled LoopMart entry. It reuses the existing Project, Mission/Work Item, repository registration, Git snapshot, code-map, Twin, reconciliation, readiness and Passport services; it adds no second readiness authority, schema or migration. The current domain permits one repository per Project, so distinct repositories use distinct Projects and Work Items rather than a fabricated combined assessment.

The pilot defaults off. `INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED` must be exactly `true` and `INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS` must contain at least one bounded absolute local root for the current API process. Values are never committed, returned to the browser or copied into this document. Server preflight performs lexical containment before candidate inspection, then canonical path-aware containment with Windows case handling. Network/device paths, sibling-prefix matches, traversal, symbolic-link/junction escapes, missing/non-Git roots, bare repositories and missing committed `HEAD` fail closed. Capability reveals configuration state only; the browser cannot enumerate roots.

Successful preflight and context are path-free. They expose a repository display name, actual ref, exact commit and commit time, and disclose excluded working-tree changes without filenames. Registration revalidates the same boundary and stores the canonical root only in IntelliLoop-owned local state. Snapshot capture remains fixed-command, read-only and immutable. Production Code Map acquisition reads only bounded supported blobs from the captured commit with fixed `ls-tree` and `cat-file --batch` operations; sensitive-name candidates are excluded before blob transfer. Raw source is transient and is absent from persisted Code Map/Twin/Release Evidence Report data. External AI remains off.

The Local Project journey uses the common six-step Work Item navigation but contains no LoopMart correction, synthetic commit, reset or fixture-fallback controls. Workflow Status remains `Not tracked` without an authoritative workflow source. Release Check is created only by the existing server evaluator, fails closed on missing evidence and is rendered from a stored immutable assessment; an unsigned Release Evidence Report projects that same assessment. LoopMart reset was exercised after local records existed and preserved them.

Controlled validation passed:

- local security/API focus: 30/30, including default-off/missing allowlist, allowed/nested roots, outside/sibling/traversal/link rejection, non-Git and unborn rejection, sanitized responses, no allowlist enumeration, exact-commit capture, dirty exclusion, repository non-mutation, one-millisecond timeout and source-free persistence;
- local web focus: 21/21, including honest capability state, preflight retry/success, Project/Work Item setup, path removal, ref/commit and dirty disclosure, workflow/readiness separation, no demo controls and common-journey navigation;
- local Chromium fixture: 2/2, covering the full exact-commit flow, Not Ready, API interruption/recovery, demo-reset isolation, 390-by-844 overflow, before/after repository equality and zero external requests;
- normal API/integration suite: 174/174 across 33 files;
- shortest LoopMart regression: 21 focused tests;
- generated accessibility proof: four browser and two responsive cases; and
- repository-safety and Twin/code-map evidence generators passed against controlled temporary repositories.

Both specifically authorized local repository candidates were attempted through the real application with process-local allowlisting. The frontend candidate preflighted and registered at actual ref `react-develop`, exact commit `527d4b02d64ccd4f8a7f850992bd95294d727387`, with one working-tree change excluded. Exact snapshot capture succeeded; source-free mapping then stopped consistently with `CODE_MAP_FILE_BYTES_EXCEEDED` because one committed supported file exceeds the existing 256-KiB per-file limit. The limit and failure were preserved.

The backend candidate completed preflight, registration, exact snapshot, Code Map, Twin, reconciliation, Release Check and Release Evidence Report at actual ref `develop_new_enhancements`, exact commit `0cfbe16d7ca3d25cd2764ea4ddda468158a2fa0f`, with five working-tree changes excluded. The committed tree contained 602 encountered files but zero supported TypeScript/JavaScript/JSON files after exclusions, so the honest source-free map contains zero assets and zero paths. The stored Release Check is `Not Ready` because the validation catalog is empty and explicit human review is absent. No synthetic evidence was added.

Before/after checks for both candidates proved branch and `HEAD` equality, unchanged Git index digests, unchanged dirty state and unchanged safe status-record counts. The product used only its fixed read-only Git command surface, which contains no ref-writing or remote operation; no external AI call occurred. Desktop and 390-by-844 live visual QA covered entry states, sanitized failure, successful preflight, exact-commit context, dirty exclusion, source-free map, local journey, Not Ready/report, API retry, reset isolation and return navigation. There was no horizontal overflow or Run-2 console warning/error; focus was visible and state meaning remained textual.

Run 2 changed exactly these IntelliLoop files relative to its preserved pre-edit snapshots:

- `apps/api/src/config.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/projects/project-routes.ts`
- `apps/api/src/projects/repository-registration.ts`
- `apps/api/src/projects/git-command-runner.ts`
- `apps/api/src/projects/local-project-pilot-service.ts`
- `apps/api/src/projects/local-project-pilot-routes.ts`
- `apps/api/src/code-map/code-map-scanner.ts`
- `apps/api/src/code-map/code-map-projection-service.ts`
- `apps/api/src/code-map/committed-git-code-map-reader.ts`
- `apps/api/src/code-map/code-map-extractor.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/local-project-pilot-api.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/ChangeOverview.tsx`
- `apps/web/src/GuidedLocalProjectJourney.tsx`
- `apps/web/src/LocalProjectPilot.tsx`
- `apps/web/src/local-pilot-client.ts`
- `apps/web/src/styles.css`
- `apps/api/test/config.test.ts`
- `apps/api/test/repository-api.test.ts`
- `apps/api/test/local-project-pilot-api.test.ts`
- `apps/web/test/foundation.test.tsx`
- `apps/web/test/local-project-pilot.test.tsx`
- `apps/web/e2e/local-project-pilot.spec.ts`
- `scripts/run-e2e.mjs`
- `scripts/generate-repo-safety-evidence.mjs`
- `playwright.config.ts`
- `docs/api/API_REFERENCE.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/development/SETUP.md`
- `docs/development/TESTING.md`
- `docs/product/TRUST_MODEL.md`
- `docs/product/USER_GUIDE.md`
- `docs/security/SECURITY_AND_PRIVACY.md`
- `docs/product/EXECUTION_STATE.md`
- `docs/evidence/EV_ACCESSIBILITY.json`
- `docs/evidence/EV_GOLDEN_FLOW.json`
- `docs/evidence/EV_DOCUMENTATION.json`

Generated `EV_CODEMAP.json`, `EV_TWIN.json` and `EV_REPO_SAFETY.json` were regenerated through their supported writers and remained byte-identical. Run 1 files not listed above remained unchanged from the Run 2 entry snapshot. Migrations still end at `014`; no migration `015` exists. `package-lock.json` remains unchanged at SHA-256 `1226a18521f5ccb51b28b622868d219d1c56b3ac746987b829dc2ff95a4883ef`. Run 1's intentional Git per-command default change from five to 15 seconds remains fail-closed and its one-millisecond negative test remains.

Remaining limitations are explicit: one repository per Project, typed-path entry rather than filesystem browsing, no authentication beyond local loopback/configuration, static syntax-only inference, existing file/count/byte/time ceilings, no supported code in the backend pilot's captured commit, and the frontend pilot's preserved oversized-file failure. These are not production-readiness or multi-repository claims.

## Next phase gate

Run 3 may begin only from this `DEMO_RUN_2_PASS` checkpoint. Its first authoritative task is the explicitly authorized final combined Run 1 + Run 2 full-platform regression with `npm.cmd run evidence:release-platform`, followed by source/evidence drift review and final delivery freeze. That 20-stage command has deliberately not been run after the combined guided-journey and Local Project changes, so no Run 2 result may be represented as the final platform release gate.

A genuine human pilot and official competition rules remain external closure work. They still block claims of measured business savings, official rule compliance, organizer acceptance, final submission approval or production readiness.

## Demo acceleration Run 3 blocked final-gate checkpoint

Run 3 began on `main` with an unborn `HEAD`, no staged files, no remotes and one worktree. The repository contained 424 non-ignored candidate files across 16 top-level entries; copies and SHA-256 hashes were preserved outside the repository before editing. The package-lock SHA-256 was and remains `1226a18521f5ccb51b28b622868d219d1c56b3ac746987b829dc2ff95a4883ef`. Migrations still end at `014`, with no migration `015`. Ports 3100 and 4173 had no entry listeners. Every path in Run 2's canonical 40-file changed-file manifest was present; the earlier 37-file user-interface summary was an inaccurate display count and is not the durable authority.

The first authorized `evidence:release-platform` attempt was the first major validation after entry capture. `CLEAN_INSTALL`, `TYPECHECK`, `UNIT_COMPONENT`, `API_INTEGRATION` and `PRODUCTION_BUILD` passed: 176 packages installed with zero reported vulnerabilities, five workspaces typechecked, 416/416 unit/component tests passed across 49 files, 174/174 API/integration tests passed across 33 files, and the web build transformed 92 modules. `BROWSER_E2E` then failed with 16/19 scenarios passing; the remaining 14 stages did not run. The failure was a repository-owned browser-harness drift: three older foundation scenarios attempted the removed absolute-path UI or bypassed the new server-gated Local Project preflight, while one global text assertion also collided with the shared `Resolve Conflicts` journey label. Product enforcement correctly rejected the unsafe registration path.

The bounded repair kept every safety boundary intact. The E2E runner now creates exact committed synthetic fixtures and supplies their exact roots through the process-local allowlist; Playwright passes that same bounded allowlist to its managed server. Foundation scenarios register only after a successful safe preflight, reload stored context, expect an attached committed `HEAD`, and scope the no-release-authority assertion to the reconciliation workspace. The fixture commit includes the minimum cancellation contract, route and test required by its Code Map assertion. No assertion, timeout, source-size ceiling, fail-closed rule, repository-write boundary or readiness authority was weakened. The repaired Local Project path, Code Map case and reconciliation case each passed independently.

The second and final authorized execution reached 17 passing stages: `CLEAN_INSTALL`, `TYPECHECK`, `UNIT_COMPONENT`, `API_INTEGRATION`, `PRODUCTION_BUILD`, `BROWSER_E2E`, `REPOSITORY_SAFETY`, `PRIVACY`, `TWIN_CODE_MAP`, `RECONCILIATION_CITATIONS`, `OPENAI_OFFLINE_CHECKPOINT`, `READINESS_PASSPORT`, `READINESS_PASSPORT_DOCS`, `RETAIL_FIXTURE`, `AI_SAFETY_DOCS`, `GOLDEN_FLOW` and `ACCESSIBILITY`. It again installed 176 packages with zero reported vulnerabilities, typechecked five workspaces, passed 416/416 unit/component tests across 49 files, passed 174/174 API/integration tests across 33 files, built 92 web modules and passed 19/19 Chromium workflows. `DEMO_GATE_FAST` then failed while waiting for a removed `Start golden workflow` label; `DEMO_SUPPORT` and `DOCUMENTATION_LINKS` did not run. Because the writer records only a complete run, `docs/evidence/EV_RELEASE.json` was not overwritten and its older 20-stage pass predates the combined Run 1/Run 2 tree. It must not be represented as the Run 3 result. The maximum of two authoritative executions is exhausted, so Run 3 is `BLOCKED` and no release-candidate commit or tag is authorized.

Post-failure diagnosis found bounded presentation-contract drift, not an authority or product-domain defect. The product and complete browser suite use `Use Demo Project`, but the later demo-gate/demo-support writers and three operator documents retained the old label; the demo-gate writer also predated the explicit `Confirm controlled reset` step. Those selectors and documents were aligned without changing product behavior. The focused fast gate then passed all nine phases, including Not Ready, Ready, unsigned report, API restart/recovery, Recheck Needed and confirmed reset, with zero outbound request or sentinel leak. Demo-support verification next identified an obsolete frontend source digest; its supported writer regenerated seven synthetic screenshots, the manifest and evidence, after which verification passed with seven assets and a working static fallback. These focused results establish a repaired state for a separately authorized future full run; they do not convert the failed final authoritative attempt into a pass.

The frontend handoff gate also passed: web typecheck, 25/25 focused component tests across three files, the 92-module production build and 4/4 shortest LoopMart Chromium scenarios. Live in-app browser QA used synthetic data and covered Project Selection, distinct Demo and Local entries, default-off and explicitly enabled Local capability, successful path-safe preflight, exact ref/commit and excluded-dirty-change context, all six common steps, separate Workflow Status and Release Check, Not Ready, Ready, Recheck Needed, immutable prior assessment, stored unsigned report and safe reset. The default-off entry exposed `CONFIGURATION REQUIRED` and `The server-side pilot flag is off` without an action button. Desktop content had no horizontal overflow or raw-path/source exposure. The controlled Local Chromium regression and generated accessibility evidence cover 390-by-844 and 768-by-1024 layouts, visible keyboard focus, textual status meaning, API interruption/retry, retained state, recovery, Local/Demo isolation and repository equality. A browser interstitial seen while deliberately stopping the temporary server was tooling state, not a product screen; the controlled product recovery regression is the authoritative failure/recovery proof. All Run 3 browser tabs and temporary services were closed, temporary QA data was removed, and ports 3100 and 4173 were free before final verification.

Publication hygiene covers the complete intended private-GitHub candidate. The root ignore policy excludes dependencies, environment overrides, credentials and signing material, runtime databases, logs, coverage, browser profiles, screenshots outside the reviewed synthetic demo package, test output, temporary fixtures, build output, editor/OS state, archives, process files and local runtime artifacts. Supported release-security and documentation writers were refreshed at final freeze. Candidate and staged reviews require zero non-fixture secret or private-path findings, zero prohibited files, no real external-repository source or absolute root, no employee information, no database/configuration value, no proprietary screenshot and no unlabelled synthetic evidence. Safe repository/ref/commit provenance remains allowed only through the existing privacy model.

`docs/product/EMERGENT_HANDOFF.md` is the sole concise polish handoff. It freezes product positioning, the Work Item-centered model, verified capabilities, routes/components, tokens/CSS, the six-step journey, Demo/Local behavior and state matrix; it gives an exact frontend edit allowlist, forbidden authority/backend/evidence surfaces, required checks, privacy rules, limitations, allowed/forbidden claims, separate-branch policy, no-polish-dependency rule and hosted default-off Local Pilot rule. `verify:ui-handoff` composes the narrow typecheck, component, build and guided browser proof without generating evidence or starting long-lived services.

Run 3 changes exactly these registered source/evidence files relative to its preserved entry copies:

- `.gitignore`
- `apps/web/e2e/foundation.spec.ts`
- `docs/demo/assets/01-blocked-control-room.png`
- `docs/demo/assets/02-active-twin.png`
- `docs/demo/assets/03-conflict-impact.png`
- `docs/demo/assets/04-ai-off-cited-answer.png`
- `docs/demo/assets/05-ready-passport.png`
- `docs/demo/assets/06-stale-passport.png`
- `docs/demo/assets/07-live-service-unavailable.png`
- `docs/demo/DEMO_ASSET_MANIFEST.json`
- `docs/demo/DEMO_RUNBOOK.md`
- `docs/evidence/EV_ACCESSIBILITY.json`
- `docs/evidence/EV_DEMO_SUPPORT.json`
- `docs/evidence/EV_DOCUMENTATION.json`
- `docs/evidence/EV_GOLDEN_FLOW.json`
- `docs/evidence/EV_OPENAI_EVAL.json`
- `docs/evidence/EV_PASSPORT.json`
- `docs/evidence/EV_READINESS.json`
- `docs/evidence/EV_RECONCILE.json`
- `docs/evidence/EV_SECURITY_AUDIT.json`
- `docs/evidence/METRICS_REPORT.md`
- `docs/product/EMERGENT_HANDOFF.md`
- `docs/product/EXECUTION_STATE.md`
- `docs/product/MANAGEMENT_PROOF_AND_PILOT_GUIDE.md`
- `docs/submission/PITCH_AND_DEMO_SCRIPT.md`
- `package.json`
- `playwright.config.ts`
- `scripts/generate-demo-gate-evidence.mjs`
- `scripts/generate-demo-support-evidence.mjs`
- `scripts/run-e2e.mjs`

No files are staged. `main` remains unborn, and neither commit `feat: establish IntelliLoop Avishkar release candidate` nor annotated tag `avishkar-2026-pre-emergent-rc1` was created because the authoritative gate did not pass. No remote was added and no push, deployment, external AI, cloud service or Emergent modification occurred in Run 3.

Known limitations remain: one repository per Project; static syntax-only TypeScript/JavaScript/JSON analysis; no authentication; local-only and default-off Local Project capability; the existing per-file ceiling can stop frontend analysis; missing real validation/review evidence correctly produces Not Ready; and no measured business outcome, human-pilot result, approval, production certification or competition acceptance is claimed.
