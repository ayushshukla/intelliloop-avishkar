# IntelliLoop Test Evidence Dossier

**Evidence ID:** `EV-FOUNDATION`  
**Story boundary:** `IL-1.1` through `IL-1.6`  
**Gate:** `G1_FOUNDATION_RUNNABLE`  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11

This dossier retains the observed source-independent Phase-1 foundation gate and links later capability proof as it closes. The foundation results remain available in [machine-readable form](EV_FOUNDATION.json); the current repository and privacy boundaries are recorded separately in [EV-REPO-SAFETY](EV_REPO_SAFETY.json) and [EV-PRIVACY](EV_PRIVACY.json).

## Environment

| Check | Observed result |
|---|---|
| Node.js | `v22.22.0` |
| npm | `10.9.4` |
| Git branch | `main` |
| Git HEAD | `UNBORN` |
| Git remotes | None |
| Package authority | `package-lock.json` |

## Clean verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | 219 packages installed from the lockfile; no product credential or database required |
| `npm.cmd run check` | 0 | Five workspaces typechecked; 56 unit/component and 29 API tests passed; API and web production builds passed; documentation links passed |
| `npm.cmd run test:e2e` | 0 | 2 Chromium tests passed at 1366 x 768 against managed localhost API/web processes |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across all severities |

The web production build transformed 43 modules. The documentation gate checked 30 Markdown files with zero broken local targets.

## Gate decision

| Requirement | Observed evidence | Result |
|---|---|---|
| Clean install | `npm.cmd ci` reproduced the pinned dependency tree | `PASS` |
| Strict typecheck | API, web, contracts, demo-fixtures and domain all passed | `PASS` |
| Tests | 9 unit/component files with 56 tests and 5 API files with 29 tests passed | `PASS` |
| Production build | Domain, contracts, demo-fixtures and API compiled; Vite emitted the web bundle | `PASS` |
| API health | Fastify injection returned the shared foundation-only contract; Chromium received HTTP 200 from the real local route | `PASS` |
| Web smoke | Chromium proved the connected AI-off/empty shell and the honest failed-network/retry branch | `PASS` |
| No default external call | External-AI flags remain false/fail-closed; product runtime uses only the relative local health route | `PASS` |
| Documentation integrity | The dependency-free checked-in link gate resolved every local Markdown target | `PASS` |
| Source independence | 15 frozen planning hashes and all six candidate Git baselines remained unchanged | `PASS` |

`G1_FOUNDATION_RUNNABLE` is therefore closed. The next authorized story is `IL-2.1`; this record does not authorize or implement it.

## Phase-2 repository-safety closure

`IL-2.6` closes capability `DC-01` with a generated path-safe proof rather than a hand-edited assertion. Reproduce it with:

```powershell
npm.cmd run evidence:repo-safety
```

| `EV-REPO-SAFETY` requirement | Observed/generated proof | Result |
|---|---|---|
| Status equality | Exact NUL-delimited porcelain-v1 bytes and their SHA-256 digest match before registration and after two captures | `PASS` |
| Repository digest equality | Sorted relative entry type/path plus complete file/link bytes produce the same SHA-256 digest before and after | `PASS` |
| Negative corpus | Missing, non-Git, relative, traversal, file, symlink, database-containment, duplicate/scope and pre-execution cases reject | `PASS` |
| HTTP boundary | Public registration remains path-free, repository write methods are absent and snapshot bodies reject | `PASS` |
| Documentation fidelity | DOC-06, DOC-07, DOC-10, DOC-15 and this dossier contain the required current boundary statements | `PASS` |

The generated JSON omits raw roots, filenames and status bytes. The detailed story record is [IL-2.6 test evidence](IL_2_6_TEST_EVIDENCE.md).

## Phase-3 privacy proof

`IL-3.6` generates `EV-PRIVACY` through production redaction, safe logging, SQLite and Fastify code. Reproduce it with:

```powershell
npm.cmd run evidence:privacy
```

The command exercises every current named redaction rule, an accepted/replayed/retrieved secret sentinel and a rejected secret/private-locator case. It scans logs, API bodies, the closed database/sidecars and verification-only export/AI-pack projections. [EV_PRIVACY.json](EV_PRIVACY.json) records only secret-safe pass/fail metadata; a nonzero run does not refresh it.

## Phase-3 historical runtime-observation proof

`IL-3.7` adds no standalone hand-edited pass assertion. Its acceptance is executable in the ordinary domain and API suites:

```powershell
npm.cmd run test:unit
npm.cmd run test:api
```

The domain suite covers exact schema/version/field, 32 KiB, measurement/sample/window, unit/value, source and non-revealing-error boundaries. API/repository suites prove atomic evidence linkage, exact replay, strictly-later-window staleness, pagination, stable errors, restart equality, SQL immutability, zero fetch calls and fixed evidence-only/no-live-feed authority. See [IL-3.7 test evidence](IL_3_7_TEST_EVIDENCE.md).

## Phase-4 Twin-vocabulary proof

`IL-4.1` is covered by a dedicated domain suite plus the aggregate gates:

```powershell
npx.cmd vitest run packages/domain/test/twin-vocabulary.test.ts --config vitest.unit.config.ts
npm.cmd run check
```

The vectors enumerate all ten node and thirteen relationship variants, both source revision/digest forms, all origin variants and both epistemic labels. They prove canonical round trips, exact endpoint-revision binding, stable failure for malformed metadata and cross-Project/cross-Mission rejection for every relationship type. Confidence vectors enforce extraction/match quality and the fixed not-truth-probability semantics. See [IL-4.1 test evidence](IL_4_1_TEST_EVIDENCE.md).

## Phase-4 Twin-projection proof

`IL-4.2` is covered by focused domain vectors plus the aggregate gates:

```powershell
npx.cmd vitest run packages/domain/test/twin-vocabulary.test.ts packages/domain/test/twin-projection.test.ts --config vitest.unit.config.ts
npm.cmd run check
npm.cmd run test:e2e
```

The vectors materialize actual Project, Change Mission, evidence, claim, explicit supersession, Git-snapshot and structured-validation entities into an immutable graph. They prove same-input and reordered-input determinism, changed/removed-source exact transitive invalidation, unchanged unrelated branches, intact predecessor bytes, strict canonical restart hydration and rejection of tampered or cross-scope input. See [IL-4.2 test evidence](IL_4_2_TEST_EVIDENCE.md).

## Phase-4 Twin-persistence and list proof

`IL-4.3` adds focused database, API, contract and browser vectors plus the aggregate gates:

```powershell
npx.cmd vitest run apps/api/test/twin-repository.test.ts apps/api/test/twin-api.test.ts --config vitest.api.config.ts
npm.cmd run check
npm.cmd run test:e2e
```

The vectors prove complete append-only canonical persistence, exact predecessor concurrency, same-input replay, restart equality, bounded revision/node/relationship pages, source path citations, endpoint revisions and fail-closed storage/browser integrity errors. Chromium proves the real empty-to-materialized-to-reloaded Mission Twin workflow. See [IL-4.3 test evidence](IL_4_3_TEST_EVIDENCE.md).

## Phase-4 code-map filesystem-safety proof

`IL-4.4` adds a focused API-infrastructure suite plus the aggregate gates:

```powershell
npx.cmd vitest run apps/api/test/code-map-scanner.test.ts --config vitest.api.config.ts
npm.cmd run check
```

The vectors exercise the real registered-root scanner and controlled filesystem adapters. They prove traversal and junction rejection, post-registration root revalidation, exact extension/file/byte/time bounds, strict UTF-8, honest skip accounting, inert malicious script/package content, Mission lifecycle isolation and complete repository-byte equality before/after repeated scans. See [IL-4.4 test evidence](IL_4_4_TEST_EVIDENCE.md).

## Phase-4 bounded static-extraction proof

`IL-4.5` adds a checked-in golden parser fixture and focused API-infrastructure suite plus the aggregate gates:

```powershell
npx.cmd vitest run apps/api/test/code-map-extractor.test.ts --config vitest.api.config.ts
npm.cmd run check
```

The vectors prove exact TypeScript/JSON static records, recoverable bounded partial results, deterministic ordering/digest, input tamper rejection, independent timeout, inert malicious source/package content, omission of private script/range values and explicit `NOT_OBSERVED` runtime semantics. No route, migration, persisted code map, browser surface or readiness effect is introduced. See [IL-4.5 test evidence](IL_4_5_TEST_EVIDENCE.md).

## Phase-4 snapshot-bound code-map proof

`IL-4.6` adds domain/Twin and API persistence/orchestration suites plus the aggregate gates:

```powershell
npx.cmd vitest run packages/domain/test/code-map-projection.test.ts packages/domain/test/twin-projection.test.ts --config vitest.unit.config.ts
npx.cmd vitest run apps/api/test/code-map-projection-service.test.ts apps/api/test/code-map-repository.test.ts apps/api/test/database-lifecycle.test.ts apps/api/test/twin-repository.test.ts --config vitest.api.config.ts
npm.cmd run check
```

The vectors prove exact post-extraction snapshot binding, immutable migration-009 persistence, restart equality, canonical tamper rejection, real-repository `SoftwareAsset`/`BOUND_TO` Twin projection, explicit controlled fallback and distinct inferred-versus-declared identities/status/origin/method labels. Repository movement and ineligible failures remain hard failures. No code-map route/browser resource, runtime truth, finding or readiness effect is introduced. See [IL-4.6 test evidence](IL_4_6_TEST_EVIDENCE.md).

## Phase-4 Twin/code-map closure proof

`IL-4.7` adds the production code-map routes, accessible attributed list and deterministic `EV-TWIN`/`EV-CODEMAP` generator:

```powershell
npx.cmd vitest run apps/web/test/code-map-client.test.tsx --config vitest.unit.config.ts
npx.cmd vitest run apps/api/test/code-map-api.test.ts apps/api/test/code-map-projection-service.test.ts --config vitest.api.config.ts
npm.cmd run evidence:twin-code-map
npm.cmd run test:e2e
npm.cmd run check
```

The vectors prove strict source-free resources, bounded paging, default hard failure, exact per-run declared-fixture consent, static/declared non-equivalence, accessible attributed assets and paths, database restart, browser reload, repository byte equality and code-derived `SoftwareAsset` projection into the Twin. No graph exists, so the accessible list is authoritative and graph/list parity is `NOT_APPLICABLE_NO_GRAPH`. The result closes `G2_EVIDENCE_TWIN_PROVEN` only after the final commands pass; it does not prove runtime semantics, reconciliation or readiness. See [IL-4.7 test evidence](IL_4_7_TEST_EVIDENCE.md), [EV-CODEMAP](EV_CODEMAP.json) and [EV-TWIN](EV_TWIN.json).

## Trust and integrity observations

- No `.env`, credential, certificate, key, log, product database or fixture record exists in the repository.
- Owned verification processes and `intelliloop-privacy-*` / `intelliloop-e2e-*` temporary directories are cleaned after each proof. User-started localhost development services are intentionally not stopped by verification or cleanup.
- Runtime and maintained documentation contain no private absolute path or external non-local product URL.
- Exactly one production source file imports `better-sqlite3`, inside the API-owned database lifecycle.
- API and web production outputs exist.
- Candidate application source was not copied, adapted or modified.
- No Git commit, remote, fetch, pull, push, reset, clean, checkout, merge or deployment action was performed.

## Dependency note

The clean installation reports four development-tree advisories (two moderate, one high and one critical) and the transitive `prebuild-install@7.1.3` deprecation warning. `npm.cmd audit --omit=dev --json` reports zero production vulnerabilities. No breaking force-upgrade was applied outside the frozen dependency boundary. The current containment remains localhost-only development, no Vitest UI and controlled local repository input under fixed read-only source-scan limits with no repository-code execution.

## Story evidence trail

- `IL-1.1`: workspace, local health slice, package boundaries and original browser smoke;
- [IL-1.2](IL_1_2_TEST_EVIDENCE.md): configuration, request IDs, stable errors, safe logs and frozen flags;
- [IL-1.3](IL_1_3_TEST_EVIDENCE.md): IDs, clocks, canonical JSON, digests, metadata and dependency direction;
- [IL-1.4](IL_1_4_TEST_EVIDENCE.md): SQLite bootstrap, restart, rollback, refusal and concurrent startup;
- [IL-1.5](IL_1_5_TEST_EVIDENCE.md): accessible trust shell, explicit client states, keyboard path and honest network failure;
- `IL-1.6`: clean proof rerun, checked-in documentation-link gate and professional documentation baseline.
- [IL-2.1](IL_2_1_TEST_EVIDENCE.md): Project/Mission lifecycle and isolation;
- [IL-2.2](IL_2_2_TEST_EVIDENCE.md): persistence, restart, concurrency and JSON APIs;
- [IL-2.3](IL_2_3_TEST_EVIDENCE.md): canonical read-only registration and path privacy;
- [IL-2.4](IL_2_4_TEST_EVIDENCE.md): bounded Git observation and repository non-mutation;
- [IL-2.5](IL_2_5_TEST_EVIDENCE.md): real Project/change-overview browser workflow;
- [IL-2.6](IL_2_6_TEST_EVIDENCE.md): reproducible repository-safety proof and operator documentation closure.
- [IL-3.1](IL_3_1_TEST_EVIDENCE.md): bounded pre-persistence format, redaction, normalization, digest and atomic-failure proof.
- [IL-3.2](IL_3_2_TEST_EVIDENCE.md): attributed append-only source/timeline persistence, idempotency, restart and isolation proof.
- [IL-3.3](IL_3_3_TEST_EVIDENCE.md): bounded claim normalization, applicability, explicit supersession and intact-history proof.
- [IL-3.4](IL_3_4_TEST_EVIDENCE.md): schema-validated evidence/claim preview, commit, retrieval, timeline and explicit-successor API proof.
- [IL-3.5](IL_3_5_TEST_EVIDENCE.md): evidence redaction-preview/import, reload, keyboard, invalid-input, integrity-state and explicit lineage-presentation browser proof.
- [IL-3.6](IL_3_6_TEST_EVIDENCE.md): generated negative-corpus and cross-surface secret-sentinel absence proof plus initial security/trust review.
- [IL-3.7](IL_3_7_TEST_EVIDENCE.md): bounded historical runtime-summary schema, evidence linkage, idempotency, staleness, restart and offline/non-authority proof.
- [IL-4.1](IL_4_1_TEST_EVIDENCE.md): exact generalized Twin vocabulary, attributed metadata, canonical round trips, endpoint revision binding and cross-scope rejection proof.
- [IL-4.2](IL_4_2_TEST_EVIDENCE.md): deterministic immutable projection, structured validation binding, member revisions, exact dependency invalidation and canonical restart proof.
- [IL-4.3](IL_4_3_TEST_EVIDENCE.md): append-only canonical persistence, bounded revision/node/relationship APIs, attributed path list, reload and integrity-failure proof.
- [IL-4.4](IL_4_4_TEST_EVIDENCE.md): registered-root containment, traversal/junction rejection, exact scan limits, honest skips, non-execution and repository-equality proof.
- [IL-4.5](IL_4_5_TEST_EVIDENCE.md): golden TypeScript/JSON extraction, bounded partial recovery, determinism, tamper rejection and no-runtime-semantics proof.
- [IL-4.6](IL_4_6_TEST_EVIDENCE.md): exact snapshot binding, append-only restart/integrity, Twin SoftwareAsset projection and explicit non-equivalent fallback proof.
- [IL-4.7](IL_4_7_TEST_EVIDENCE.md): production code-map API/UI, explicit fallback consent, attributed list, restart/reload and Phase-4 gate proof.
- [IL-5.1](IL_5_1_TEST_EVIDENCE.md): exact comparison eligibility, applicability overlap, conservative value relations and stable rule identity.
- [IL-5.2](IL_5_2_TEST_EVIDENCE.md): deterministic active claims, open conflict/ambiguity findings, explicit successor-chain authority and invalid-topology rejection.
- [IL-5.3](IL_5_3_TEST_EVIDENCE.md): explicit missing support, exact dependency staleness, immutable successor reassessment, unrelated-change exclusion and restart proof.
- [IL-5.4](IL_5_4_TEST_EVIDENCE.md): bounded typed impact traversal, exact citations, cycle/depth control, validation-gap truth cases and unavailable-support honesty.
- [IL-5.5](IL_5_5_TEST_EVIDENCE.md): immutable aggregate persistence, schema `010`, exact/historical replay, supersession rerun, strict APIs and production wiring.
- [IL-5.6](IL_5_6_TEST_EVIDENCE.md): strict accessible findings/impact presentation, exact member citations, real conflict/correction/stale history and legacy-edge regression proof.
- [IL-5.7](IL_5_7_TEST_EVIDENCE.md): generated aggregate truth table, deterministic replay/restart, repository safety and controlled local metrics proof.
- [IL-6.1](IL_6_1_TEST_EVIDENCE.md): deterministic minimized pack digest, second-pass redaction, transfer bounds and stable allowlisted citation proof.
- [IL-6.2](IL_6_2_TEST_EVIDENCE.md): deterministic fixed-question AI-off explanation, explicit correction semantics, resolvable citation grounding and tamper failure.
- [IL-6.3](IL_6_3_TEST_EVIDENCE.md): disabled/mock-only provider request, strict response identity/schema/citation validation, bounded retry/budgets and complete offline fallback.
- [IL-6.4](IL_6_4_TEST_EVIDENCE.md): strict cited-question API/UI, exact `NOT SENT` disclosure, browser provider-failure/unknown-citation behavior and generated [EV-CITATIONS](EV_CITATIONS.json).
- [IL-6.5](IL_6_5_TEST_EVIDENCE.md): digest-bound personal OpenAI checkpoint, fail-closed entry criteria, credential-safe non-execution and generated [EV-OPENAI-EVAL](EV_OPENAI_EVAL.json) offline decision.
- [IL-6.6](IL_6_6_TEST_EVIDENCE.md): finalized AI safety/transfer inventory, authority matrix, AI-use disclosure, course-correction governance and executable sensitive-body documentation guard.
- [IL-6.7](IL_6_7_TEST_EVIDENCE.md): deterministic cited synthetic retail edge cases, strict non-evidence/advisory labeling, provider-free generation and zero canonical/readiness authority.
- [IL-7.1](IL_7_1_TEST_EVIDENCE.md): nine ordered readiness obligations, exhaustive fail-closed candidate-status truth cases, canonical ordering/digests and explicit non-persistence/non-authority.
- [IL-7.2](IL_7_2_TEST_EVIDENCE.md): immutable repository-derived ReleaseAssessment history, same-input convergence, exact dependency-staleness derivation, restart and unchanged historical bytes.
- [IL-7.3](IL_7_3_TEST_EVIDENCE.md): exact one-assessment Release Passport projection, canonical digest, immutable history, concurrency/restart and derived stale association.
- [IL-7.4](IL_7_4_TEST_EVIDENCE.md): strict Mission-scoped readiness/Passport API, browser `BLOCKED`/`READY`/`STALE` presentation and structural download/print boundary.
- [IL-7.5](IL_7_5_TEST_EVIDENCE.md): generated zero-false-`READY`, exact Passport equality, restart, Project/Mission isolation, integrity and AI-off proof.
- [IL-7.6](IL_7_6_TEST_EVIDENCE.md): contract-aligned readiness/Passport architecture, domain, persistence, API, operator, trust, testing and security documentation closure.
- [IL-8.1](IL_8_1_TEST_EVIDENCE.md): controlled synthetic retail repository/evidence definitions, correction topology, deterministic hashes and source-independent provenance.
- [IL-8.2](IL_8_2_TEST_EVIDENCE.md): fixed generated-root materialization through real product services, initial `BLOCKED` state, idempotent setup/reset, restart and non-demo isolation.
- [IL-8.3](IL_8_3_TEST_EVIDENCE.md): serial persisted browser `BLOCKED → READY → STALE`, conflict/impact, AI-off cited answer, correction, unsigned Passport, credential/outbound audit and safe failure artifacts.
- [IL-8.4](IL_8_4_TEST_EVIDENCE.md): competition keyboard/focus continuity, semantic headings, non-color status, loading/empty/error/trust visual QA and responsive viewport proof.
- [IL-8.5](IL_8_5_TEST_EVIDENCE.md): combined repository/network/privacy/restart/reset proof and 5.8-minute paced recovery rehearsal closing `G5_CORE_DEMONSTRABLE`.
- [IL-8.6](IL_8_6_TEST_EVIDENCE.md): tested script-free fallback, seven exact screenshot assets/metadata, judge Q&A and synchronized presentation package completing Phase 8.
- [IL-9.1](IL_9_1_TEST_EVIDENCE.md): clean lockfile install, complete 20-command Windows release proof, pinned Windows/Linux CI and source/artifact hash manifest.
- [IL-9.2](IL_9_2_TEST_EVIDENCE.md): exact development-tool advisory remediation, complete direct/transitive licenses, candidate secret/private scan, clean-room similarity review and fresh network/mutation proof.
- [IL-9.4 product dossier](IL_9_4_TEST_EVIDENCE.md): generated product-conformance scorecard, claim mapping, management QA path and anonymous paired-pilot protocol; final human timing/feedback acceptance remains input-required.

The current `IL-3.1` aggregate observation is 116 unit/component plus 61 API tests, production builds with 52 Vite modules, regenerated repository-safety proof, 40 Markdown files with zero broken links, 3 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact trust boundary and command evidence.

The current `IL-3.2` aggregate observation is 127 unit/component plus 70 API tests, production builds with 54 Vite modules, regenerated repository-safety proof, 41 Markdown files with zero broken links, 3 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact lineage, privacy and authority boundary.

The current `IL-3.3` aggregate observation is 141 unit/component plus 80 API tests, production builds with 55 Vite modules, regenerated repository-safety proof, 42 Markdown files with zero broken links, 3 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact normalization, successor-lineage and non-authority boundary.

The current `IL-3.4` aggregate observation is 143 unit/component plus 86 API tests, production builds with 56 Vite modules, regenerated repository-safety proof, 43 Markdown files with zero broken links, 3 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact schema, privacy, pagination, idempotency and non-authority boundary.

The current `IL-3.5` aggregate observation is 149 unit/component plus 86 API tests, production builds with 58 Vite modules, regenerated repository-safety proof, 44 Markdown files with zero broken links, 5 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact preview/import, integrity, accessibility, lineage-presentation and non-authority boundary.

The current `IL-3.6` aggregate observation is 149 unit/component plus 86 API tests, production builds with 58 Vite modules, regenerated repository-safety and privacy proofs, 46 Markdown files with zero broken links, 5 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact negative-corpus, cross-surface secret-absence, cleanup and non-certification boundary.

The current `IL-3.7` aggregate observation is 154 unit/component plus 91 API tests, production builds with 59 Vite modules, regenerated repository-safety and privacy proofs, 47 Markdown files with zero broken links, 5 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact schema/size/source, immutable evidence-linkage, idempotency, staleness, offline and non-readiness boundary.

The current `IL-4.1` aggregate observation is 166 unit/component plus 91 API tests, production builds with 60 Vite modules, regenerated repository-safety and privacy proofs, 48 Markdown files with zero broken links, 5 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for the exact vocabulary, metadata, revision, serialization, scope and non-authority boundary.

The current `IL-4.2` aggregate observation is 173 unit/component plus 91 API tests, production builds with 62 Vite modules, regenerated repository-safety and privacy proofs, 49 Markdown files with zero broken links, 5 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for deterministic materialization, exact dependency invalidation, immutable history, canonical restart and the deliberate pre-persistence boundary.

The current `IL-4.3` aggregate observation is 178 unit/component plus 95 API tests, production builds with 65 Vite modules, regenerated repository-safety and privacy proofs, 50 Markdown files with zero broken links, 6 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for canonical persistence, bounded list resources, attributed browser review, restart and dedicated integrity handling.

The current `IL-4.4` aggregate observation is 178 unit/component plus 105 API tests, production builds with 65 Vite modules, regenerated repository-safety and privacy proofs, 51 Markdown files with zero broken links, 6 Chromium workflows and 0 production vulnerabilities across 104 production dependencies. See the story record for canonical containment, exact source-scan limits, inert repository content, explicit exclusions and repository equality.

The current `IL-4.5` aggregate observation is 178 unit/component plus 112 API tests, production builds with 65 Vite modules, regenerated repository-safety and privacy proofs, 52 Markdown files with zero broken links, 6 Chromium workflows and 0 production vulnerabilities across 105 production dependencies. See the story record for the exact golden fixture, static recognition rules, bounded partial recovery, deterministic digest, tamper rejection and explicit no-runtime-semantics boundary.

The current `IL-4.6` aggregate observation is 183 unit/component plus 117 API tests, production builds with 66 Vite modules, regenerated repository-safety and privacy proofs, 53 Markdown files with zero broken links, 6 Chromium workflows and 0 production vulnerabilities across 105 production dependencies. See the story record for exact post-extraction snapshot binding, migration-009 restart/integrity, Twin SoftwareAsset projection, controlled declared fallback and explicit inferred-versus-declared non-equivalence.

The current `IL-4.7` aggregate observation is 186 unit/component plus 122 API tests, production builds with 69 Vite modules, regenerated repository-safety, privacy, Twin and code-map proofs, 55 Markdown files with zero broken links, 7 Chromium workflows and 0 production vulnerabilities across 105 production dependencies. See the story record for the strict source-free API, per-run fallback consent, Windows UTF-8 BOM compatibility, accessible attributed list, Twin integration, restart/reload and `G2_EVIDENCE_TWIN_PROVEN` decision.

The current `IL-5.1` observation is 204 unit/component plus 122 API tests, a production build with 70 Vite modules, regenerated repository-safety/privacy/Twin/code-map proofs, 59 Markdown files with zero broken links, 7 Chromium workflows and 0 production vulnerabilities across 105 production dependencies. The 18 new focused vectors pin `reconciliation-rules.v1` and cover exact eligibility, broad/narrow and time applicability, canonical equality, scalar incompatibility, conservative ambiguity, symmetry, cross-Mission isolation and no fuzzy authority. A pre-existing code-map API fixture clock was made deterministic, and bounded API/browser integration timeouts plus isolated E2E ports remove host-load/default-port flakiness without changing product authority. The full development tree still reports four advisories (two moderate, one high and one critical) in Vite/Vitest tooling; the product dependency audit remains zero. See [IL-5.1 test evidence](IL_5_1_TEST_EVIDENCE.md).

The current `IL-5.2` observation is 222 unit/component plus 122 API tests, a production build with 71 Vite modules, regenerated repository-safety/privacy/Twin/code-map proofs, 60 Markdown files with zero broken links and 7 isolated Chromium workflows. The 18 new focused vectors pin `reconciliation-decision-policy.v1` and cover active conflict/ambiguity truth cases, no timestamp winner, exact explicit successor chains, input-order equality, missing/forged/forked/cyclic topology, recomputed comparison-critical keys, cross-Mission/duplicate input and the fixed pre-pair-expansion limit. No dependency changed, so the previously recorded zero-production-vulnerability and four-development-advisory audit boundary is unchanged. See [IL-5.2 test evidence](IL_5_2_TEST_EVIDENCE.md).

The current `IL-5.3` observation is 237 unit/component plus 122 API tests, a production build with 72 Vite modules, regenerated repository-safety/privacy/Twin/code-map proofs, 61 Markdown files with zero broken links and 7 isolated Chromium workflows. The 15 new focused vectors pin `reconciliation-support-policy.v1` and cover explicit evidence/validation absence, failed-validation presence semantics, exact source/snapshot/relationship/validation/rule dependency changes, immutable stale successors, unrelated Twin change exclusion, input order, replay, restart and fail-closed requirement/Twin/predecessor boundaries. No dependency changed, so the previously recorded zero-production-vulnerability and four-development-advisory audit boundary is unchanged. See [IL-5.3 test evidence](IL_5_3_TEST_EVIDENCE.md).

The `IL-5.4` focused observation is 14/14 impact-analysis tests plus a passing 195-test domain suite. It proves explicit-only roots and requirements, exact four-type direction policy, canonical shortest paths, cycle/depth/path/dependency ceilings, irrelevant-edge exclusion, exact citation preservation, absent implementation/validation reasons, status-visible `FAILED`/`INCONCLUSIVE` validation and fail-closed declared/synthetic support. See [IL-5.4 test evidence](IL_5_4_TEST_EVIDENCE.md).

The current `IL-5.5` repository observation is 255 unit/component plus 142 API tests, a production build with 75 Vite modules, regenerated passing repository-safety/privacy/Twin/code-map proofs, 63 Markdown files with zero broken links and 7/7 isolated Chromium workflows on fresh loopback ports. The 34 focused reconciliation API vectors include schema-10 lifecycle, canonical immutable persistence, current and historical idempotency, exact `SUPERSEDES` reconstruction/rerun, atomic failure, stable finding/path pagination, strict routes, production composition/error translation and exact Twin/code-map binding exposure. The isolated browser run found and then verified the fix for a strict web decoder that initially rejected the newly exposed optional Twin code-map binding. No dependency changed. The external npm audit was not retransmitted to the registry during this checkpoint, so the previously recorded dependency-audit boundary is carried forward rather than claimed as freshly observed. See [IL-5.5 test evidence](IL_5_5_TEST_EVIDENCE.md).

The current `IL-5.6` repository observation is 261 unit/component plus 143 API tests, a production build with 77 Vite modules, regenerated passing repository-safety/privacy/Twin/code-map proofs, 64 Markdown files with zero broken links and 8/8 isolated Chromium workflows on fresh loopback ports. Strict web vectors cover all five finding variants, reason/support/citation/path coherence, exact historical retrieval beyond a partial first history page and integrity failure. The real browser workflow proves initial conflict, cited depth-zero impact, explicit correction, successor Twin, preserved history and exact-dependency `STALE`, with no decision/readiness control. The audit also found and fixed canonical member-citation exposure plus an `IL-5.5` real-edge verifier defect caused by legacy asset provenance using an edge-shaped prefix; both have permanent regressions. No dependency changed and the prior audit boundary is carried forward rather than claimed as freshly observed. See [IL-5.6 test evidence](IL_5_6_TEST_EVIDENCE.md).

The current `IL-5.7` repository observation is 261 unit/component plus 143 API tests, a production build with 77 Vite modules, regenerated passing repository-safety/privacy/Twin/code-map/reconciliation proofs, 66 Markdown files with zero broken links and 8/8 isolated Chromium workflows. Generated [EV-RECONCILE](EV_RECONCILE.json) executes the production static code-map, Twin, reconciliation, impact, API and immutable persistence path against an IntelliLoop-authored synthetic repository. Six exact authored truth cases pass: conflict, ambiguity, missing support, impact gaps, explicit supersession and stale successor. Canonical and reordered requests reuse the same result, 25 measured replays return byte-equal bodies, close/reopen preserves the final digest and registered-repository bytes remain unchanged. Timings and 6/6 conformance are a local development baseline only, with no production, ROI or organizational extrapolation. The browser launcher also now allocates distinct free loopback ports, so its passing rerun did not disturb the operator's existing port-4173 process. See [IL-5.7 test evidence](IL_5_7_TEST_EVIDENCE.md) and the [controlled metrics report](METRICS_REPORT.md).

The current `IL-6.1` repository observation is 266 unit/component plus 143 API tests, a 78-module production build, regenerated passing repository-safety/privacy/Twin/code-map/reconciliation proofs, 68 Markdown files with zero broken links and a final 8/8 isolated Chromium rerun. The 5 focused evidence-pack tests prove exact/reversed-input byte equality, stable locator-derived citation IDs across question changes, allowlisted resolution, second-pass secret/private-path redaction, source-body omission, bounds, incomplete-input rejection and tamper failure. The first browser attempt passed 7/8 and hit the 30-second whole-test ceiling after the final workflow's reconciliation POST returned `201`; its clean rerun passed all workflows without widening a timeout. No API, database, UI, provider, credential, network call, explanation or readiness field was added. See [IL-6.1 test evidence](IL_6_1_TEST_EVIDENCE.md) and [AI safety and data transfer](../security/AI_SAFETY_AND_DATA_TRANSFER.md).

The current `IL-6.2` repository observation is 277 unit/component plus 143 API tests, a 79-module production build, regenerated passing repository-safety/privacy/Twin/code-map/reconciliation proofs, 69 Markdown files with zero broken links and 8/8 isolated Chromium workflows. The 11 focused vectors cover exact golden section text, all six fixed questions, repeated byte/digest equality, real explicit correction with historical predecessor labeling, complete citation resolution, conservative zero-finding release wording, normalized fixed-question matching, unsupported-question failure, answer/citation tampering and the fixed non-authoritative output surface. The engine is exactly `DETERMINISTIC_EXPLANATION` / `AI_OFF`, provider `NONE`, with no external call or readiness field. No database, API, UI, credential or provider boundary changed, and no existing timeout or assertion was widened. See [IL-6.2 test evidence](IL_6_2_TEST_EVIDENCE.md).

`IL-6.3` adds `provider-adapter-policy.v1`, exact request/schema digests, a closed structured mock response and a session executor that always retains the `AI_OFF` explanation. The 19 adapter vectors plus two domain-boundary vectors prove default-off zero-call behavior, accepted mock structure, request/pack/schema/authority rejection, citation-union and response-content privacy validation, safe metadata/usage, output/input/concurrency/session ceilings, one bounded retry, abort-backed timeout and absence of network/environment/credential APIs. The completed repository gate passed 297 unit/component tests, 143 API tests, all typechecks and production builds, all five generated evidence families and 70 documentation files with zero broken local targets; the browser regression passed all eight existing Chromium workflows. No route, database, browser, live transport, credential or external call was added. See [IL-6.3 test evidence](IL_6_3_TEST_EVIDENCE.md).

`IL-6.4` adds one fixed-question Mission API and an accessible cited-explanation route. `evidence-pack-compiler-policy.v2` performs deterministic question-directed minimization after verifying the complete exact input so the frozen 12,000-unit ceiling is preserved. The strict server/client boundary returns and validates the unconditional `AI_OFF` explanation, exact local `NOT SENT` pack disclosure and used citation details; production provider execution remains disabled. The completed split repository gate passed 304 unit/component tests across 37 files, 149 API tests across 29 files, all workspace typechecks, an 83-module production web build, all six generated evidence reports, 71 Markdown files with zero broken local targets and a final 8/8 isolated Chromium rerun. Generated [EV-CITATIONS](EV_CITATIONS.json) passes 6/6 fixed questions, 56 cited statements and 78 citation uses in the controlled aggregate run, controlled mock acceptance, unknown-citation rejection without retry, provider transport fallback and zero reconciliation-revision mutation. Together with [EV-RECONCILE](EV_RECONCILE.json), it closes `G3_DETERMINISTIC_CORE_PROVEN`. The aggregate wrapper itself exceeded the host command window while buffering output; its constituent gates were therefore captured independently without widening a product or test limit. See [IL-6.4 test evidence](IL_6_4_TEST_EVIDENCE.md).

`IL-6.5` adds `openai-evaluation-checkpoint.v1`, the exact three-value course-correction enum and generated [EV-OPENAI-EVAL](EV_OPENAI_EVAL.json). Passing G3/privacy/citation evidence, the exact six-question set, local `NOT_SENT` previews, the frozen 12,000-unit ceiling and disabled production provider are mandatory inputs. Because explicit transfer enablement and a runtime credential were absent, the digest-bound result is `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` / `NOT_RUN_NOT_AUTHORIZED`. Grounding, citation validity, usefulness, latency, token use and deterministic-answer difference are recorded as `NOT_MEASURED`; no mock or deterministic result is presented as provider performance. The checkpoint/generator have no credential/environment/network API and add no product route, persistence or authority. The completed repository gate passed all workspace typechecks, 315 unit/component tests across 38 files, 149 API tests across 29 files, an 84-module production web build, all seven generated evidence reports, 72 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows. See [IL-6.5 test evidence](IL_6_5_TEST_EVIDENCE.md).

`IL-6.6` finalizes the reviewer-facing [AI safety and data-transfer record](../security/AI_SAFETY_AND_DATA_TRANSFER.md) and [AI-use disclosure](../governance/AI_USE_DISCLOSURE.md). The record states zero current outbound provider payloads, identifies the exact minimized/redacted data that could become eligible only under a new authorized checkpoint, lists data that must remain local, distinguishes deterministic/mock/provider contexts, denies AI canonical/readiness/Passport authority and binds the offline finale decision to the IL-6.5 digest. `check:ai-safety-docs` parses the generated checkpoint and backlog, enforces required disclosures and rejects credential-like text, private absolute paths and raw private-body markers on the canonical story surfaces. The complete gate passed all workspace typechecks, 315 unit/component tests across 38 files, 149 API tests across 29 files, an 84-module production web build, all seven generated evidence reports, the new AI-documentation contract, 73 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows. This story adds no runtime feature or external call. See [IL-6.6 test evidence](IL_6_6_TEST_EVIDENCE.md).

`IL-6.7` adds a versioned deterministic synthetic-edge-case set to the existing cited-explanation response and browser workflow. The rule engine derives only from verified redacted reconciliation-finding/impact-path items; every suggestion carries resolved citations plus `SYNTHETIC`, `ADVISORY_ONLY` and `NOT_EVIDENCE`. The v2 API schema and browser decoder fail closed on identity/digest drift, unknown fields/kinds/citations, changed labels, private paths or authority widening. Production remains provider `NONE`; no route input, persistence, repository write, evidence/finding mutation, readiness or Passport operation is added. Generated [EV-CITATIONS](EV_CITATIONS.json) records 6/6 fixed question sets, 23 suggestions and 23 resolved suggestion citation uses with zero canonical-state effect. The complete gate passed all workspace typechecks, 327 unit/component tests across 39 files, 149 API tests across 29 files, an 85-module production web build, all generated evidence and AI-safety checks, 74 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows. See [IL-6.7 test evidence](IL_6_7_TEST_EVIDENCE.md).

`IL-7.1` adds the pure `readiness.v1` evaluator with nine fixed ordered obligations and candidate `BLOCKED` / `READY` / `STALE` outcomes. The focused truth table covers every blocker family, stale precedence, a current corrected revision retaining a historical predecessor-stale finding, deterministic input reordering, malformed/oversized/tampered input and output, and the fixed non-authority surface. Sample, fallback, AI-advisory, incomplete or unpersisted inputs never create green. The result remains `NOT_PERSISTED`; no schema, API, UI, Passport, provider or deployment capability is added. The complete repository observation is 359/359 unit/component tests across 40 files, 149/149 API tests across 29 files, an 86-module production web build, all seven generated evidence reports, the AI-safety documentation contract, 75 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows. Two generated-evidence documentation guards initially caught missing historical README proof markers; the accurate `EV-CITATIONS`, `IL-6.5` and `IL-6.6` references were restored and both generators passed without widening product or test limits. See [IL-7.1 test evidence](IL_7_1_TEST_EVIDENCE.md).

`IL-7.2` adds immutable `release-assessment.v1`, `readiness-review.v1` and derived `release-assessment-state.v1` contracts plus schema `011` storage. The internal service reconstructs every readiness input from stored reconciliation, Git snapshot, validation evidence and explicit review records. Same-input replay returns the existing assessment; a changed authoritative input appends a predecessor-bound successor. Historical `STALE` is derived by comparing the stored evaluation with a fresh repository-derived evaluation, while the original status, canonical bytes and digest remain unchanged. Focused proof covers canonical round-trip, idempotency, dependency changes, transaction rollback, concurrency, restart, scope isolation and migration lifecycle. There is no readiness/validation/review HTTP surface, Passport, release approval, deployment action, provider or credential path. See [IL-7.2 test evidence](IL_7_2_TEST_EVIDENCE.md).

The completed `IL-7.2` repository gate passed all workspace typechecks, 363/363 unit/component tests across 41 files, 152/152 API tests across 30 files, an 88-module production web build, all seven generated evidence reports, the AI-safety documentation contract, 76 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows. The repository-safety and Twin/code-map generators required permission for Git operations inside their disposable synthetic fixtures; each passed unchanged after that environmental permission was granted. No product or test limit was widened.

`IL-7.3` adds `release-passport.v1`, `release-passport-state.v1`, migration `012` and internal repository/service composition. One unsigned Passport copies one persisted ReleaseAssessment's scope, snapshots, readiness rule, complete input digest, status, obligations, blockers, finding counts, validations, review and structural citation manifest; projection never invokes the readiness evaluator. Same-assessment retry/concurrency converges on one immutable row, history survives restart and later assessment dependency change produces only a derived Passport `STALE` association. No readiness/Passport API/UI, export, release approval, signature, deployment, provider or credential path is added. See [IL-7.3 test evidence](IL_7_3_TEST_EVIDENCE.md).

`IL-7.4` adds strict `v1` assessment/Passport resources, seven Mission-scoped routes and `/missions/:missionId/passport`. Commands accept no caller-authored readiness inputs; services derive current status and the browser only validates/renders it. The workspace exposes obligations, blockers, findings, validations, review, citations, history and distinct `BLOCKED`/candidate `READY`/historical `STALE` semantics. Its structural Passport JSON download and print view remain unsigned and non-approving and contain no source bodies, credentials or private absolute paths. Focused API, client/shell and Chromium tests pass; full integration/restart/isolation/tamper and zero-false-`READY` proof remains `IL-7.5`. See [IL-7.4 test evidence](IL_7_4_TEST_EVIDENCE.md).

`IL-7.5` generates [EV-READINESS](EV_READINESS.json) and [EV-PASSPORT](EV_PASSPORT.json) from a focused 56-test proof spanning the domain contracts, real SQLite persistence, production Fastify routes, browser decoders and the readiness/Passport UI scenario. The controlled matrix records one satisfied positive case, 26 non-ready cases and zero false `READY`; real application composition survives database restart, denies cross-Project/Mission disclosure, rejects corrupted canonical assessment/Passport bytes and observes no network/provider call. Passport projection equality, digest binding and fixed unsigned/non-approval/non-deployment authority all pass. See [IL-7.5 test evidence](IL_7_5_TEST_EVIDENCE.md).

`IL-7.6` completes Phase 7 without changing runtime behavior. The canonical [Readiness and Release Passport guide](../product/READINESS_AND_PASSPORT_GUIDE.md) and reconciled architecture, domain, data, API, setup, testing, user, trust and security documents now explain all nine obligations, `BLOCKED`/candidate `READY`/historical `STALE`, exact assessment-to-Passport projection, immutable stale association, supported operation/recovery and every non-authority boundary. A checked-in static documentation contract prevents stale migration ranges, missing proof links, removed authority flags and safety/deployment guarantee language. See [IL-7.6 evidence](IL_7_6_TEST_EVIDENCE.md).

`IL-8.1` adds `intelliloop-retail-cancellation-fixture.v1` to the isolated demo-fixtures package. Nine initial repository files plus five correction changes, nine evidence drafts, seven claims, four non-executed synthetic validations, five support requirements and five impact aliases encode the cancellation conflict, affected order/inventory/refund/fulfilment/notification domains, partial validation and correction. Six focused tests and generated [EV-RETAIL-FIXTURE](EV_RETAIL_FIXTURE.json) prove unique/bounded structure, excerpt/evidence and successor coherence, expected missing-to-present support, source-independent ownership, privacy scanning and deterministic item/tree/set hashes. The data remains inert: no Git repository, database state, loader, reset or demonstrated status transition exists yet. See [IL-8.1 evidence](IL_8_1_TEST_EVIDENCE.md).

The completed `IL-7.4` repository gate passed all workspace typechecks, 374/374 unit/component tests across 42 files, 157/157 API/integration tests across 31 files, a 92-module production web build, all seven generated evidence reports, the AI-safety documentation contract, 78 Markdown files with zero broken local targets and 9/9 isolated Chromium workflows. The first unit invocation was blocked before collection by the Windows sandbox's esbuild child-process restriction; its authorized rerun passed, and the complete suite also passed after the final Mission-scope regression was added. No assertion failure was hidden or waived.

The completed `IL-7.3` repository gate passed all workspace typechecks, 367/367 unit/component tests across 41 files, 153/153 API/integration tests across 30 files, an 89-module production web build, all seven generated evidence reports, the AI-safety documentation contract, 77 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows. Generated-evidence guards initially caught missing historical README proof markers; the accurate `EV-CITATIONS`, `IL-6.5` and `IL-6.6` context was restored and both generators passed without widening product or test limits. The first unit command was blocked before collection by the Windows sandbox's esbuild child-process restriction; its unchanged rerun passed with the required local process permission.

`IL-8.2` adds the production-composed fixed retail workspace lifecycle. The initial repository is written only below the API data directory, committed with fixed Git commands and never executed. Setup resolves real persisted identities through Project, Mission, registration, evidence, claim, code-map, Twin, reconciliation and readiness services and proves an initial `BLOCKED` assessment. Migration `013` records exact fixture ownership and gates otherwise immutable deletion behind a transaction-local authorization for only that Project. Focused proof passes 2/2 full loader/reset integration cases and 15/15 migration lifecycle cases, including setup/reset idempotency, restart, reset/reload, body rejection, direct immutable-delete rejection, foreign-key integrity and non-demo Project survival. See [IL-8.2 evidence](IL_8_2_TEST_EVIDENCE.md).

`IL-8.3` completes the controlled browser golden workflow without enabling any stretch feature. Migration `014` records exact correction/READY/Passport/stale pointers; fixed server transitions use normal Git snapshot, evidence, validation, Twin, reconciliation, readiness and Passport services and remain idempotent. The 17-test API/migration proof covers lifecycle, restart, reset isolation and schema integrity. One four-test serial Chromium run passes in 19.2 seconds and demonstrates initial conflict plus cited impact, a deterministic `NOT SENT` conflict answer, controlled correction to `READY`, an unsigned Passport and exact dependency invalidation to `STALE`. Browser request auditing observes zero external destinations and zero authorization headers. The broad “Can we release?” fixture pack was correctly rejected at the frozen 12,000-byte bound; the demo uses the narrower conflict question rather than weakening that safety limit. See [EV-GOLDEN-FLOW](EV_GOLDEN_FLOW.json) and [IL-8.3 evidence](IL_8_3_TEST_EVIDENCE.md).

`IL-8.4` adds no authority-bearing product behavior. The competition route now restores focus to the next action heading after each replaced control, exposes busy/live/error semantics, identifies checkpoints with words and symbols, provides reduced-motion and forced-color alternatives, and compacts unavailable navigation at mobile widths. Four focused Chromium cases cover loading, empty, unavailable/retry, the keyboard-only three-state sequence, semantic heading/list structure and no horizontal overflow at 1366×768, 768×1024 and 390×844. A separate in-app browser review replayed the real local `EMPTY → BLOCKED → READY → STALE` path and observed the completion heading as the final active element. See [EV-ACCESSIBILITY](EV_ACCESSIBILITY.json), the [accessibility review](ACCESSIBILITY_REVIEW.md) and [IL-8.4 evidence](IL_8_4_TEST_EVIDENCE.md).

`IL-8.5` generates [EV-DEMO-GATE](EV_DEMO_GATE.json) from the production build and freshly regenerated repository/privacy proof. One paced 5.8-minute Chromium run starts the API three times and records `EMPTY → BLOCKED → READY → UNAVAILABLE → READY_AFTER_RESTART → STALE → EMPTY_AFTER_RESET_AND_RESTART`. The browser blocks non-loopback egress and observes zero attempted external requests or authorization headers. One fixed environment sentinel is absent from process logs, responses, rendered text and all isolated data-directory files; application-source digest, Git-status bytes and the controlled registered-repository tree remain equal. The gate corrects the runbook port to 4173 and closes `G5_CORE_DEMONSTRABLE` without claiming an OS sandbox, universal DLP or production readiness. See [IL-8.5 evidence](IL_8_5_TEST_EVIDENCE.md) and the [release checklist](RELEASE_CHECKLIST.md).

`IL-8.6` completes Phase 8 with the professional support package. A production-build Chromium sequence captures seven 1366×768 frames for BLOCKED, Active Twin, conflict/impact, deterministic AI-off citations, READY Passport, historical STALE Passport and explicit live-service unavailability. [EV-DEMO-SUPPORT](EV_DEMO_SUPPORT.json) records restart recovery, zero non-loopback requests/authorization headers and a second API-off validation in which the script-free local fallback loads all seven images with zero broken assets. The [asset manifest](../demo/DEMO_ASSET_MANIFEST.json) binds each frame to fixture identity, source-file-set digest, route/state, dimensions, bytes and SHA-256. Judge Q&A, 60-second pitch, synchronized narration, presenter guardrails, runbook, troubleshooting and accessibility review explicitly preserve synthetic, AI-off, candidate-only READY and unsigned/non-approval limits. See [IL-8.6 evidence](IL_8_6_TEST_EVIDENCE.md).

`IL-9.1` adds a pinned release-platform verifier and Windows/Linux GitHub Actions matrix. The directly observed Windows 11 run performed an unchanged-lockfile `npm ci`, then passed 20/20 required commands: strict typechecking, 380/380 unit/component tests across 43 files, 161/161 API/integration tests across 32 files, a 95-module production web build, 17/17 Chromium scenarios, and every repository/privacy/Twin/code-map/reconciliation/citation/offline-AI/readiness/Passport/fixture/accessibility/demo/documentation gate. [EV-RELEASE](EV_RELEASE.json) records the environment, durations, source-tree digest and 17 artifact hashes. Linux is configured with identical pins but was not locally observed; the four reported development-tree advisories remain unresolved pending `IL-9.2`. See [IL-9.1 evidence](IL_9_1_TEST_EVIDENCE.md).

`IL-9.2` resolves those four development-tool advisories with exact Vite `8.2.1`, Vitest `4.1.10` and React plugin `6.0.5` versions. Post-upgrade typecheck, 380 unit/component tests, 161 API/integration tests, production build and 17 Chromium scenarios pass. The refreshed [EV-SECURITY-AUDIT](EV_SECURITY_AUDIT.json) records zero full/production npm vulnerabilities, 222 lockfile dependency instances with zero unknown/unapproved licenses, a 372-file candidate scan with zero non-fixture secret/private/prohibited-file findings, zero known source-marker/header findings, zero source reuse/adaptation and passing privacy/repository-mutation evidence. See [IL-9.2 evidence](IL_9_2_TEST_EVIDENCE.md).

`IL-9.3` synchronizes fourteen canonical professional documents with the current release candidate. [EV-DOCUMENTATION](EV_DOCUMENTATION.json) binds their metadata and hashes, all 53 registered local API routes, every documented npm script, the explicit deferred-capability markers and seven screenshot files against their IL-8.6 manifest byte counts, dimensions and SHA-256 values. A clean install reports zero vulnerabilities; all five workspace typechecks, 380 unit/component tests, 161 API/integration tests and the Vite `8.2.1` production build pass. The aggregate gate exposed and corrected one stale Phase-7 checker that still expected schema `012`; the current setup, data ledger and guard now require migrations `001`-`014`. See [IL-9.3 evidence](IL_9_3_TEST_EVIDENCE.md).

`IL-9.4` now generates [EV-METRICS](EV_METRICS.json) from hashed reconciliation, citation, readiness, Passport, golden-flow, demo and release evidence. The controlled scorecard records one representative change/candidate release, 6/6 authored reconciliation cases, 2 cited impact paths, 56/56 cited statements with 78 resolved citation references, one positive plus 26 non-ready cases with zero false `READY`, exact unsigned Passport projection and the 5.8-minute leadership rehearsal. A [management proof guide](../product/MANAGEMENT_PROOF_AND_PILOT_GUIDE.md), [claim matrix](../submission/CLAIM_EVIDENCE_MATRIX.md), initial [submission copy](../submission/SUBMISSION_COPY.md) and anonymous six-run [pilot template](PILOT_MEASUREMENT_TEMPLATE.json) are implemented. Direct interactive [manual QA](IL_9_4_MANUAL_QA.md) also passed all ten controlled leadership-demo cases, including fail-closed API loss, persisted recovery and scoped reset/restart, using the safe isolated `dev:demo` launcher. The pilot gate now enumerates all 62 missing fields, rejects malformed values and false `COMPLETE` state, and aggregates only complete quality/feedback data; its in-memory self-test passes without writing synthetic benefit evidence. Final story acceptance remains input-required because comparable developer/lead/manager human timings, three role feedback responses and a sourced monthly cadence are absent. No savings result is calculated. See [IL-9.4 evidence](IL_9_4_TEST_EVIDENCE.md).

Optional `IL-10.1` implements the default-off [Evidence Replay Lab](IL_10_1_TEST_EVIDENCE.md). Three focused web tests and 16 API configuration tests pass strict flag isolation, pure no-input-mutation comparison and explicit read-only presentation. Direct in-app Chromium comparison of LoopMart Twin revision 1 (80 members) and revision 2 (125 members) displayed 58 added, 13 removed, 30 changed and 37 unchanged members with persisted path citations. Only four Twin GET requests occurred; demo/readiness and complete Twin-history JSON were byte-equal before/after. [EV-EVIDENCE-REPLAY](EV_EVIDENCE_REPLAY.json) binds source hashes, observed counts and the no-authority boundary.

Optional `IL-10.2` implements the default-off [Advisory-output Disagreement Lab](IL_10_2_TEST_EVIDENCE.md). Four focused web tests and 16 API configuration tests pass strict flag isolation; exact Mission/question/pack/citation binding; authority-shaped, cross-scope and unknown-citation rejection; deterministic normalized-text/citation comparison; and input immutability. Direct in-app Chromium used two clearly labelled controlled imports and displayed one citation variance plus two output-only groups. The browser made zero requests during comparison and readiness remained `READY`. [EV-ADVISORY-DISAGREEMENT](EV_ADVISORY_DISAGREEMENT.json) binds source hashes and the no-orchestration/no-semantic-judgment boundary.

Optional `IL-10.3` implements the default-off [Guarded Remediation Preview](IL_10_3_TEST_EVIDENCE.md). Four focused web tests and 16 API configuration tests pass strict flag isolation, cited test-plan/change-intent generation, input immutability, and unknown-citation/execution-text/acquired-authority rejection. Direct in-app Chromium produced five cited test-plan cards with zero API requests during generation. Controlled repository HEAD, clean status and all ten non-Git file hashes were equal before/after; readiness remained `READY`. [EV-REMEDIATION-PREVIEW](EV_REMEDIATION_PREVIEW.json) binds the source hashes and no-apply/no-execution boundary.

## Current limitations

Projects, Change Missions, read-only registration, immutable Git observations, bounded evidence/claim/observation lineage, attributed Twin/code-map review, deterministic comparison/reassessment/impact, immutable reconciliation history, strict findings/path browser review, generated reconciliation/citation/offline-checkpoint/readiness/Passport proof, deterministic AI-off explanation, immutable ReleaseAssessment/unsigned Passport presentation, the accessible restart-safe `BLOCKED → READY → STALE` retail demo, tested support package, Windows release verification, bounded release security audit, canonical professional documentation and the controlled product/claim dossier are implemented. Phase 8 is complete, `G5_CORE_DEMONSTRABLE` passes and `IL-9.3` is complete. `IL-9.4` awaits external human pilot input and no benefit result is claimed. No live provider call occurs. Linux execution, live telemetry, public validation/review intake, Passport signing/approval and final rules/submission/freeze work remain pending. A passing conformance/security/documentation scan, screenshot, candidate `READY` assessment or Passport is not complete DLP, legal clearance, production approval, signing or release authority. Official Avishkar rules remain unverified, so eligibility or compliance is not claimed.
