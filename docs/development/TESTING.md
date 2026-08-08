# Testing Strategy - Foundation Through Demo Run 2

**Audience:** Developers and reviewers  
**Status:** `IL-9.3_DOCUMENTATION_SYNCHRONIZED / DEMO_RUN_2_LOCAL_PILOT`  
**Evidence date:** 2026-08-08  
**Evidence:** [EV-FOUNDATION](../evidence/TEST_EVIDENCE.md), [EV-REPO-SAFETY](../evidence/EV_REPO_SAFETY.json), [EV-PRIVACY](../evidence/EV_PRIVACY.json), [EV-TWIN](../evidence/EV_TWIN.json), [EV-CODEMAP](../evidence/EV_CODEMAP.json), [IL-2.1](../evidence/IL_2_1_TEST_EVIDENCE.md), [IL-2.2](../evidence/IL_2_2_TEST_EVIDENCE.md), [IL-2.3](../evidence/IL_2_3_TEST_EVIDENCE.md), [IL-2.4](../evidence/IL_2_4_TEST_EVIDENCE.md), [IL-2.5](../evidence/IL_2_5_TEST_EVIDENCE.md), [IL-2.6](../evidence/IL_2_6_TEST_EVIDENCE.md), [IL-3.1](../evidence/IL_3_1_TEST_EVIDENCE.md), [IL-3.2](../evidence/IL_3_2_TEST_EVIDENCE.md), [IL-3.3](../evidence/IL_3_3_TEST_EVIDENCE.md), [IL-3.4](../evidence/IL_3_4_TEST_EVIDENCE.md), [IL-3.5](../evidence/IL_3_5_TEST_EVIDENCE.md), [IL-3.6](../evidence/IL_3_6_TEST_EVIDENCE.md), [IL-3.7](../evidence/IL_3_7_TEST_EVIDENCE.md), [IL-4.1](../evidence/IL_4_1_TEST_EVIDENCE.md), [IL-4.2](../evidence/IL_4_2_TEST_EVIDENCE.md), [IL-4.3](../evidence/IL_4_3_TEST_EVIDENCE.md), [IL-4.4](../evidence/IL_4_4_TEST_EVIDENCE.md), [IL-4.5](../evidence/IL_4_5_TEST_EVIDENCE.md), [IL-4.6](../evidence/IL_4_6_TEST_EVIDENCE.md), [IL-4.7](../evidence/IL_4_7_TEST_EVIDENCE.md), [IL-5.1](../evidence/IL_5_1_TEST_EVIDENCE.md), [IL-5.2](../evidence/IL_5_2_TEST_EVIDENCE.md), [IL-5.3](../evidence/IL_5_3_TEST_EVIDENCE.md), [IL-5.5](../evidence/IL_5_5_TEST_EVIDENCE.md), [IL-5.6](../evidence/IL_5_6_TEST_EVIDENCE.md)
**Impact, presentation, Phase-6 and readiness evidence:** [IL-5.4](../evidence/IL_5_4_TEST_EVIDENCE.md), [IL-5.6](../evidence/IL_5_6_TEST_EVIDENCE.md), [IL-6.1](../evidence/IL_6_1_TEST_EVIDENCE.md), [IL-6.2](../evidence/IL_6_2_TEST_EVIDENCE.md), [IL-6.3](../evidence/IL_6_3_TEST_EVIDENCE.md), [IL-6.4](../evidence/IL_6_4_TEST_EVIDENCE.md), [IL-6.5](../evidence/IL_6_5_TEST_EVIDENCE.md), [IL-6.6](../evidence/IL_6_6_TEST_EVIDENCE.md), [IL-6.7](../evidence/IL_6_7_TEST_EVIDENCE.md), [IL-7.1](../evidence/IL_7_1_TEST_EVIDENCE.md), [IL-7.2](../evidence/IL_7_2_TEST_EVIDENCE.md), [IL-7.3](../evidence/IL_7_3_TEST_EVIDENCE.md), [IL-7.4](../evidence/IL_7_4_TEST_EVIDENCE.md), [IL-7.5](../evidence/IL_7_5_TEST_EVIDENCE.md), [EV-CITATIONS](../evidence/EV_CITATIONS.json), [EV-OPENAI-EVAL](../evidence/EV_OPENAI_EVAL.json), [EV-READINESS](../evidence/EV_READINESS.json), [EV-PASSPORT](../evidence/EV_PASSPORT.json)

## Test layers

| Command | Scope | Authority proved |
|---|---|---|
| `npm.cmd run evidence:release-security` | Refresh repository safety/privacy proof, registry advisories, lockfile inventory, notices and candidate audit | Records the time-sensitive `IL-9.2` dependency, license, provenance, similarity, secret, network and mutation result in `EV-SECURITY-AUDIT` |
| `npm.cmd run check:release-security` | Existing exact-lock inventory and current candidate hashes/scans | Rejects dependency drift, unapproved or unknown licenses, non-fixture secret/private-path findings, provenance/similarity regressions or stale bound evidence without network access |
| `npm.cmd run evidence:release-platform` | Clean install plus all 20 release-candidate verification layers | Pinned environment, unchanged lockfile, Windows observation, Linux CI configuration and source/artifact hashes recorded in `EV-RELEASE` |
| `npm.cmd run check:release-platform` | Existing release record and current hashes | Rejects missing commands, invalid platform disposition or source/artifact drift without rerunning the full matrix |
| `npm.cmd run typecheck` | Every workspace | Strict TypeScript and package compatibility |
| `npm.cmd run test:unit` | Domain, contracts, web | Deterministic primitives, Project/Mission invariants, evidence preparation, metadata, strict browser contracts and semantic UI states |
| `npm.cmd run test:api` | Fastify, SQLite and child processes | Migrations, Project/Mission/evidence persistence, restart/concurrency/isolation plus API schemas, errors and safe logs |
| `npm.cmd run build` | Packages, API and web | Production ESM and Vite artifacts compile |
| `npm.cmd run evidence:repo-safety` | Generated synthetic repository proof | Status/tree equality, rejection corpus, path-free HTTP boundary and operator-doc fidelity |
| `npm.cmd run evidence:privacy` | Generated synthetic privacy proof | Eleven-rule corpus plus raw-token absence from logs, API, SQLite/sidecars and offline transfer fixtures |
| `npm.cmd run evidence:twin-code-map` | Generated synthetic repository/API/Twin proof | `EV-TWIN` and `EV-CODEMAP`, restart equality, explicit fallback distinction and repository non-mutation |
| `npm.cmd run evidence:citations` | Generated synthetic reconciliation/cited-question proof | `EV-RECONCILE` plus `EV-CITATIONS`, six fixed questions, exact disclosure, citations, controlled mock/failure boundary and non-mutation |
| `npm.cmd run evidence:openai-eval` | Offline personal-provider checkpoint | Revalidates privacy/reconciliation/citation prerequisites, scans repository text and records the exact digest-bound offline decision |
| `npm.cmd run test:e2e` | Chromium at 1366x768 | Connected/failure states, persisted Project/evidence/Twin workflows, plus deterministic conflict/correction/stale reconciliation history, cited impact paths and forged-integrity handling |
| `npm.cmd run check:docs` | Repository Markdown | Every local documentation target exists |
| `npm.cmd run check` | Typecheck, non-browser tests, build, all generated Phase-1 through Phase-4 evidence and documentation links | Repeatable aggregate quality gate |

## IL-1.6 foundation gate matrix

| `G1_FOUNDATION_RUNNABLE` requirement | Executable proof |
|---|---|
| Clean install | `npm.cmd ci` installs exactly from `package-lock.json` without a credential or database |
| Typecheck, tests and build | `npm.cmd run check` passes five workspaces, 56 unit/component tests, 29 API tests and the production build |
| API health | Fastify injection validates the shared contract; Chromium reaches the real localhost health route |
| Web smoke | Two Chromium cases prove the connected shell plus the honest failure/retry branch at 1366x768 |
| No default external call | Product source contains no provider client; configuration tests keep external calls disabled |
| Documentation integrity | The checked-in link gate resolves all local Markdown targets |

## Safety acceptance matrix

| IL-1.2 acceptance | Test evidence |
|---|---|
| Invalid configuration fails safely | Parser cases plus child-process startup exit/log assertion |
| Request IDs propagate | Valid inbound UUID and generated replacement assertions |
| Secret sentinel absent from logs | Header, query, request-ID, exception and invalid-config sentinels |
| External and experiment flags default off | Protected features reject enablement; Evidence Replay requires a strict explicit opt-in and defaults off |
| Errors remain stable | 404, validation and internal-failure response assertions |

## Deterministic Windows execution

The `IL-9.1` Windows 11 release observation passed Node `22.22.0`, npm `10.9.4`, a clean install, 380 unit/component tests across 43 files, 161 API/integration tests across 32 files, a 95-module web build, 17 Chromium E2E scenarios and every generated evidence/documentation gate. Linux uses the same entrypoint in `.github/workflows/release-platform-verification.yml`; because no Linux runtime was available locally, its current status remains configured rather than observed. See [IL-9.1 evidence](../evidence/IL_9_1_TEST_EVIDENCE.md) and [EV-RELEASE](../evidence/EV_RELEASE.json).

The subsequent `IL-9.2` audit upgraded Vite to `8.2.1`, Vitest to `4.1.10` and `@vitejs/plugin-react` to `6.0.5`, then passed all 380 unit/component, 161 API/integration and 17 Chromium scenarios plus the production build. Its exact-lock inventory covers 222 dependency instances (220 unique package/version pairs); full and production npm audits report zero advisories, and candidate scans report zero non-fixture secret or private-path findings. See [IL-9.2 evidence](../evidence/IL_9_2_TEST_EVIDENCE.md) and [EV-SECURITY-AUDIT](../evidence/EV_SECURITY_AUDIT.json). Registry advisories are time-sensitive and must be refreshed at final freeze.

Vitest file parallelism is disabled for the supported Windows 11 baseline. This prevents the observed vite-node temporary SSR-cache race while retaining normal per-file isolation and the complete assertion set. API integration tests use a bounded 30-second per-test ceiling because real filesystem, Git and SQLite work can exceed Vitest's five-second default on a loaded host. Two consecutive unit runs are used when validating the correction.

The default browser command still owns localhost ports `4173` and `3100`. Verification can set `INTELLILOOP_E2E_WEB_PORT` and `INTELLILOOP_E2E_API_PORT` to isolated local ports when a manual development session is already running. Vite validates both test-only port values, the API receives the matching port, and Playwright uses one clean temporary database; no non-loopback binding is permitted.

## IL-1.3 vector matrix

| Primitive | Required proof |
|---|---|
| Canonical JSON | Recursive key ordering, numeric representation, equivalent insertion order, fail-closed invalid values |
| SHA-256 | Fixed `abc` and canonical-object digests |
| Stable IDs | UUID v4 normalization, invalid rejection and injected deterministic sequence |
| Clock | Exact UTC output, injected sequence and non-canonical rejection |
| Metadata | Every origin, both revision variants, both epistemic labels, optional effective time and fixed canonical bytes |
| Boundary | Domain source imports no contracts, app, React, Vite, Fastify or SQLite module |

## Network boundary

Tests access only local web/API ports. Dependency and Chromium installation are development-time operations. Product code has no external service integration.

## IL-2.1 Project/Mission matrix

| Acceptance | Test evidence |
|---|---|
| State invariants | Frozen creation, canonical IDs/times, bounded labels, valid archive shape and forged-state rejection |
| Deterministic revisions | Project and mission creation are revision 1; archive returns revision 2 without mutating revision 1 |
| Project isolation | Mission collection, archive and current selection reject every cross-project reference |
| Current mission | Zero-or-one selection, second-current rejection, duplicate-ID rejection and conflicting-current rejection |
| Archive behavior | Mission before Project, terminal archive, history retention and new current only after prior archive |
| Chronology | Creation/archive cannot predate Project state or retained mission history |

## IL-1.4 persistence matrix

| Acceptance | Test evidence |
|---|---|
| Empty bootstrap | Temporary file reaches version 5 with exact name/checksum/time history and required pragmas |
| Restart | Same file reopens at version 5 without rewriting history rows |
| Failed migration | Forced version-6 SQL failure rolls back its table and retains version 5 unchanged |
| Unknown newer schema | Lifecycle and spawned API both refuse version 5; startup log omits the path |
| Concurrent startup | Four child processes converge on version 5 and five history records |
| Integrity | Unversioned non-empty files, altered checksum history and relative paths fail closed |

## IL-2.2 persistence and API matrix

| Acceptance | Test evidence |
|---|---|
| Database integration | Creation, retrieval, immutable revision rows, guarded heads and retained version-1 upgrade |
| Restart equality | File close/reopen returns exact Project and ChangeMission values |
| Isolation | Cross-Project mutation rejects without changing either record |
| Current mission concurrency | Two independent processes produce exactly one winner and one stable rejection |
| Schema failures | Missing storage schema and malformed HTTP bodies/paths/queries map to fixed errors without diagnostics |
| Pagination | Stable UUID ordering, cursor continuation, default 20 and enforced 1-100 bounds |
| HTTP contracts | All seven `/api/v1` routes use JSON, request IDs, version fields and explicit response schemas |

## IL-2.3 repository-registration matrix

| Acceptance | Test evidence |
|---|---|
| Missing/non-Git paths | Missing directories, plain directories and file paths reject with stable errors |
| Traversal/symlink escape | Relative and explicit-parent paths, root junctions, `.git` junctions and post-registration substitution reject |
| Canonical allowlist | Exact real root persists, restarts and is revalidated before future reads |
| Database placement | A database located at or below the proposed root rejects registration |
| Duplicate binding | Project and canonical-root unique constraints reject repeated and cross-Project binding |
| Path privacy | PUT/GET resources, errors and safe logs omit the raw root and sentinel basename |
| No mutation | Repository tree digest is equal before/after; POST/PATCH/DELETE routes do not exist |

## IL-2.4 Git-snapshot matrix

| Acceptance | Test evidence |
|---|---|
| State matrix | Real temporary Git repositories prove clean attached, dirty attached, unborn and detached observations |
| Stable digest | Repeated capture over unchanged dirty state creates new IDs with the same canonical changed-file digest |
| Status fidelity | Index, worktree, untracked and total counts are asserted; rename/copy NUL records are parsed explicitly |
| Bounded runner | Fixed command operations, disabled shell/prompts/optional locks/config hooks, timeout mapping and output limit |
| Race handling | Changed before/after HEAD evidence rejects without inserting a mixed snapshot |
| Immutability/restart | Exact snapshot survives database reopen; service has no mutation method and SQLite triggers reject update/delete |
| Scope/failure | Missing registration and archived mission reject before Git; malformed/traversing status maps to stable safe failure |
| Path privacy | API resources and logs omit canonical roots and changed filenames |
| No repository mutation | Complete synthetic repository file digest and porcelain status match before/after actual capture |

Database tests use newly created OS-temporary directories and remove them after each case. The browser-test wrapper uses a separate OS-temporary data directory, waits for Playwright and its managed web server to stop, then removes that directory with bounded Windows lock retries.

## IL-1.5 trust-shell matrix

| Acceptance | Test evidence |
|---|---|
| Component states | Static component tests assert `LOADING`, `CONNECTED`, `ERROR`, `EMPTY` and `AI_OFF` semantics |
| Keyboard navigation | Chromium proves skip-link focus/activation and sequential focus to brand/current route |
| Health integration | Unit client accepts only the shared contract; Chromium reaches the real local API |
| Network failure | Aborted health request shows an alert, no substitute, then retry recovers after the route is restored |
| No green placeholder | Connected copy disclaims readiness; empty state disclaims samples/inference; exact `READY` is absent |
| Planned routes | Current welcome is a link; later stages are labelled `Not available` and are non-interactive |

## IL-2.5 Project/change-overview matrix

| Acceptance | Test evidence |
|---|---|
| Real resources | Browser client validates Project, Mission, repository and snapshot resources; component tests reject malformed success payloads |
| Happy path | Chromium creates Project and Mission, registers an authored synthetic Git repository and captures its real dirty/unborn observation |
| Failure/empty truth | Health and workspace request failures render stable errors; no sample, fallback or inferred connected state appears |
| Restart retrieval | Page reload on the exact Project route retrieves the same Mission, registration and snapshot identity from SQLite |
| Path privacy | Repository-root and filename sentinels remain absent from the DOM; the one-time root input disappears after success |
| Honest readiness boundary | Text says `NOT ASSESSED`, observation only and not a readiness decision; later stages remain unavailable |
| Keyboard/accessibility | Form submission, Project selection and capture are keyboard-operable; skip link targets main content; status is not color-only |
| Desktop layout | In-app visual inspection at 1366 x 768 confirms no horizontal overflow and readable state/form composition |

## IL-2.6 repository-safety proof matrix

| Acceptance | Generated proof |
|---|---|
| Status equality | Exact NUL-delimited porcelain-v1 bytes and their SHA-256 digest match before/after registration and two captures |
| Complete-tree equality | Sorted relative directory/file/link entries plus complete bytes hash identically before and after |
| Negative corpus | 14 registration/scope/revalidation/capture cases reject with the expected stable code |
| Pre-execution boundary | Missing registration and archived Mission produce zero calls to the injected Git runner |
| HTTP boundary | Path-free resource, absent repository mutation methods and rejected caller-controlled snapshot body |
| Documentation fidelity | DOC-06, DOC-07, DOC-10, DOC-15 and DOC-21 exact boundary snippets are checked during generation |
| Cleanup/privacy | OS-temporary fixture is removed; report contains no root, filename or status bytes |

## IL-3.1 evidence-preparation matrix

| Acceptance | Test evidence |
|---|---|
| Format allowlist | Markdown/text/JSON accepted; unsupported declarations and obvious binary signatures reject |
| Input/output bounds | Empty, whitespace, malformed UTF-8, controls, exact 256 KiB boundary and redaction expansion are exercised |
| JSON integrity | Syntax, duplicate/NFC-colliding keys, scalar roots, non-finite numbers, surrogate escapes, depth and node limits reject |
| Redaction corpus | Named secret forms and secret-bearing JSON keys become stable placeholders; sentinels are absent |
| Normalization/digest | LF/NFC and canonical JSON variants converge; fixed digest vector and format framing are asserted |
| Atomicity | Failure produces no result, does not mutate caller bytes and leaks no rejected content in errors |

## IL-3.2 evidence-lineage matrix

| Acceptance | Test evidence |
|---|---|
| Same-import idempotency | Sequential retry and two-connection concurrency converge on one exact source/event pair and one database row each |
| Project/Mission isolation | Cross-Project Mission attribution rejects; scoped retrieval cannot observe another Mission's source |
| Restart | Full redacted prepared value, immutable attribution, import key and timeline identity round-trip exactly |
| Immutable attribution | Domain values are deeply frozen; SQL update/delete triggers reject source and event mutation |
| Timeline | Distinct imports append mission sequences 1..N atomically; cursor pagination is stable |
| Source pagination | Evidence identities sort deterministically with bounded 1-100 cursor pages |
| Privacy | Raw secret sentinel is absent from prepared result and closed SQLite file; logical locators reject paths/credentials/traversal |
| Lifecycle/failure | Archived Mission rejects new imports but retains prior history; malformed schema/pages produce stable non-diagnostic errors |
| Migration | Empty and retained version 1-4 databases reach schema 5; failure rolls back; concurrent startup converges |

## IL-3.3 claim/supersession matrix

| Acceptance | Test evidence |
|---|---|
| Normalization vectors | NFKC/case/punctuation term variants converge; dimension order converges; comparison and applicability keys remain deterministic |
| Bounds | Invented/non-source excerpts, duplicate dimensions, invalid windows and oversized/deep/node-heavy JSON values reject with stable domain errors |
| Conflicting evidence | Matching comparison/applicability claims with different raw excerpts and values persist separately; no winner is produced |
| Epistemic label | `INFERENCE` round-trips explicitly and remains distinct from source/claim truth authority |
| Supersession validity | Self, missing, mismatched comparison/applicability, backwards-time and already-successored predecessors reject |
| History and restart | Multi-step successor chain round-trips; predecessor rows and links remain readable; SQL update/delete attempts reject |
| Idempotency/concurrency | Sequential retry and two-connection intake converge on one exact claim |
| Atomicity | Forced link insertion failure rolls back the candidate successor |
| Scope/lifecycle | Source attribution is exact; archived Mission rejects new claims while prior history remains readable |
| Migration | Empty and retained version 1-5 databases reach schema 6; failure rolls back; concurrent startup converges |

## IL-3.4 evidence/claim API matrix

| Acceptance | Test evidence |
|---|---|
| Contract serialization | Shared converters preserve redacted source, timeline, nested JSON, applicability, optional-field omission and explicit `INFERENCE`/`SUPERSEDES` metadata |
| Preview/commit | Fastify injection proves stateless preview, server-side re-preparation, first-create `201`, exact-replay `200` and one persisted source/event |
| Retrieval | Exact and collection reads preserve Mission/Project attribution and return only the redacted normalized representation |
| Claims/successors | Create/get/list plus explicit predecessor-path successor creation and replay preserve history without a truth winner |
| Request IDs/errors | Valid inbound IDs propagate; schema, path, missing-resource and successor-conflict failures use stable envelopes |
| Privacy | Secret and raw-path sentinels remain absent from success/error bodies, safe logs and the closed SQLite file |
| Pagination | Evidence, timeline, claim and supersession collections prove deterministic multi-page traversal and reject limits outside 1-100, malformed cursors and unknown query fields |
| Authority boundary | Unsupported update/delete methods return 404; caller-supplied prepared values reject; no shell, repository-write, provider, Twin or readiness behavior is reachable |

## IL-3.5 evidence/timeline browser matrix

| Acceptance | Test evidence |
|---|---|
| Browser import and restart | Chromium creates a real Project/Mission, opens the exact evidence route, previews a synthetic authorization sentinel, imports the redacted representation and retrieves the same source/event after reload |
| Invalid import honesty | Malformed duplicate-key JSON produces a stable visible error, no preview, no enabled import and no source/timeline record |
| Keyboard flow | Project, Mission, route navigation, preview and import are completed through keyboard-operable controls with visible semantic labels |
| Integrity state | Client validators reject unknown fields, impossible byte/rule summaries and out-of-contract pages; a browser-intercepted forged lineage response yields `INTEGRITY ERROR` and no partial truth |
| Empty states | Sources, import events, claims and supersession sections each expose distinct `EMPTY` text before data exists |
| Epistemic and successor history | API-seeded `FACT`, `INFERENCE` and `SUPERSEDES` resources render with explicit textual labels, attribution and no winner/readiness claim |
| Layout and runtime | The required 1366x768 viewport has no horizontal overflow; live visual review found no console warning/error and confirmed the lower lineage panels remain readable |
| Scope and limits | The route loads the exact Mission, cross-checks Project/Mission/source/link attribution and discloses first-page-only display when a 100-record collection has a continuation cursor |

## IL-3.6 privacy-proof matrix

| Acceptance | Executable proof |
|---|---|
| `EV-PRIVACY` recorded | Generator writes a deterministic, secret-safe machine report only after all assertions and temporary-fixture cleanup pass |
| Negative corpus | Every current rule identifier is exercised across a deterministic text/JSON corpus; prepared values retain none of the raw fixed tokens |
| Logs | Real safe logger captures success/failure events; no request body, raw sentinel or private path appears |
| API | Preview, first commit, idempotent replay, source/timeline retrieval and rejected locator responses contain no raw fixed token |
| Persistence | Closed SQLite database, sidecars and fixture files are scanned for the full corpus in UTF-8 and UTF-16LE |
| Transfer fixtures | Verification-only export and AI-pack projections derive only from redacted API resources; both scan clean and are deleted |
| Offline/default network | Fetch is trapped, expected calls remain zero and no credential is read |
| Documentation | DOC-10, DOC-16, DOC-21 and DOC-23 must contain exact current-boundary statements before the report can pass |

## IL-3.7 runtime-observation matrix

| Acceptance | Executable proof |
|---|---|
| Schema and size | Exact-version/field tests, 32 KiB input, 32-measurement, sample-count, numeric-unit and 31-day window ceilings |
| Source | Only three attributed import origins, logical locator/revision, current Mission and server-derived effective/recorded time are accepted |
| Duplicate | Exact content/attribution replay returns the original source, timeline event and observation with no additional row |
| Staleness | A strictly later same-series window leaves history intact and derives `STALE_BY_NEWER_WINDOW` plus the newer observation ID |
| Restart and immutability | Closed/reopened SQLite returns exact source/observation equality; direct update/delete attempts fail |
| API bounds | Strict POST/GET/list schemas, identity pagination, stable not-found/error envelopes and unregistered mutations |
| Offline | Fetch is trapped and remains at zero calls; no connector, listener, poller, background worker or credential is present |
| Authority | Unknown/readiness-shaped fields reject; every accepted resource fixes `HISTORICAL_EVIDENCE_ONLY` and `liveFeed: false` |

## IL-4.1 Twin-vocabulary matrix

| Acceptance | Executable proof |
|---|---|
| Frozen vocabulary | Exact ordered vectors contain ten unique node and thirteen unique directed relationship types |
| Complete metadata | Node vectors cover every origin, both epistemic labels, recorded/effective time, logical source references and both source revision/digest variants |
| Revision | Every node, relationship and endpoint reference requires a positive safe-integer revision |
| Exhaustive serialization | Every node and relationship type canonically round-trips with exact version and no field loss |
| Scope | Every relationship type rejects cross-Project and cross-Mission endpoints; relationship metadata must match both endpoints |
| Endpoint binding | Serialization/deserialization rejects identity or revision substitution |
| Confidence semantics | Nodes accept only extraction quality, edges only relationship-match quality, 0-10,000 basis points and the fixed not-truth-probability label |
| Fail closed | Unknown fields, versions, variants, malformed metadata, unsafe references and oversized serialized input reject with stable non-revealing errors |

## IL-4.2 Twin-projection matrix

| Acceptance | Executable proof |
|---|---|
| Actual entity projection | Project, Mission, two evidence sources, two claims, one supersession, one Git snapshot and one validation produce attributed nodes/source bindings and 14 directed relationships |
| Same-input determinism | Reversed input collections and independent first calls produce exact object/canonical-byte equality; replay against the prior revision returns the same object |
| Changed digest | An immutable Mission successor increments only affected member revisions and records a `CHANGED` cause with exact transitive dependents |
| Exact branch isolation | Removing one evidence/claim branch records `REMOVED` invalidation without including the unrelated validation branch |
| History | The predecessor serialization is identical before and after successor projection |
| Restart | Canonical projection deserialize/serialize equality passes and projection-digest tampering rejects |
| Scope | Cross-Project or cross-Mission source records reject before materialization |

## IL-4.3 Twin-persistence/list matrix

| Acceptance | Executable proof |
|---|---|
| Canonical persistence | Migration `008` and repository tests retain the complete projection document with exact scope, count, predecessor and digest checks |
| Idempotent successor chain | Same-input materialization returns the exact row; changed input appends only the next positive revision against the live predecessor |
| Restart and immutability | Closed/reopened SQLite returns exact projection equality; update/delete triggers reject and canonical tampering fails closed |
| API bounds | Five strict Mission-scoped routes, no materialization body, stable errors, `1..100` limits and deterministic revision/node/relationship pagination |
| Attributed list projection | Shared converters and strict browser validators preserve logical path citations, source revision/digest, epistemic label, origin and recorded time |
| Endpoint binding | Relationship resources and the browser preserve exact source/target identity and member revision; unknown endpoints reject |
| Integrity state | Storage corruption maps to non-revealing `INTEGRITY_ERROR`; forged browser pages render one integrity state and no partial graph |
| Browser/manual path | Chromium covers empty state, keyboard navigation, materialization, node/relationship inspection, reload and direct API page verification |
| Offline authority | Fetch/provider behavior remains absent; materialization uses persisted local records and produces neither winner nor readiness decision |

## IL-4.4 code-map filesystem-safety matrix

| Acceptance | Executable proof |
|---|---|
| Canonical root | Mission scope resolves the exact registered read-only Project root and revalidates it before every scan; post-registration junction substitution rejects |
| Traversal and escape | Malicious `..` entry injection rejects before resolution/read; real junction escape rejects without reading target content |
| Extension boundary | Only `.ts/.tsx/.js/.jsx/.json` content is returned; unsupported regular files are counted by safe extension label |
| Exclusions | `.git` and `node_modules` are explicitly counted and never traversed, so Git hooks and installed code cannot enter the source bundle |
| Exact limits | Tests exercise 2,001 encountered files, 256 KiB plus one byte, the 5 MiB aggregate crossing and the exact five-second deadline |
| Read integrity | Read-only handles cap allocation, require stable file identity/size/times, strict UTF-8 and exact observed bytes; special/mid-read states fail closed |
| Non-execution | A static source guard forbids process/write primitives; malicious JS and package scripts scan as text without running or installing anything |
| Repository equality | Complete sorted relative path/content digest is identical before and after two actual scans |
| Scope/failure | Missing/archived Mission, absent registration, invalid encoding and unsafe roots return stable non-revealing errors and no partial result |

## IL-4.5 bounded static-extraction matrix

| Acceptance | Executable proof |
|---|---|
| Golden parser fixture | A checked-in multi-file TypeScript/JSON fixture asserts exact deterministic files, package metadata, static imports/exports, exported contracts, direct Fastify routes and import-backed test links |
| Input integrity | Extraction rechecks scan version/scope/limits, normalized unique paths, exact byte counts and every SHA-256 content digest; forged bundles reject with no result |
| Partial syntax | Recovered declarations remain available, the affected file is `SYNTAX_ERROR`, the whole result is `PARTIAL` and fixed diagnostics contain no source excerpt |
| Deterministic output | Reversing the valid scan-file order produces deep-equal output and the same canonical extraction digest |
| Exact bounds | An independent monotonic deadline fails closed; production constants cap syntax nodes, records, diagnostics, names, specifiers and route paths |
| Conservative semantics | Dynamic import, `require`, computed paths, untyped receivers and aliases do not create imports/routes/test links; every output fixes runtime semantics to `NOT_OBSERVED` |
| Non-execution/privacy | A production-source guard excludes filesystem/process/write/install primitives; malicious source and package commands remain inert and command/private-range values are absent from output |
| No premature authority | No migration, API route, browser surface, Twin projection, finding or readiness input is created |

## IL-4.6 snapshot-bound code-map matrix

| Acceptance | Executable proof |
|---|---|
| Exact snapshot binding | The service captures before/after state, binds only the post-extraction snapshot and rejects changed head/status state |
| Inferred versus declared | Domain and service tests assert distinct evidence/status/completeness/origin/method labels and evidence-kind-specific member identities |
| Explicit fallback | Only the package-owned manifest plus explicit constructor enablement and allowlisted safe-failure codes can create declared evidence |
| No silent equivalence | Invalid mode combinations reject; declared projections fix inference unavailable and never become repository-observation output |
| Append-only restart | Migration/repository integration proves immutable triggers, exact predecessor, closed/reopened equality and canonical tamper rejection |
| Twin projection | A real Git repository scan creates `SoftwareAsset` nodes, exact `BOUND_TO` edges and bounded static code relationships |
| Scope and failure | Snapshot movement, non-fallback errors, cross-scope bindings, persistence and integrity failures remain hard failures |

## IL-4.7 Twin/code-map UI and proof matrix

| Acceptance | Executable proof |
|---|---|
| Production API | Fastify integration runs a real controlled repository and pages exact revision, asset and edge resources under strict schemas |
| Explicit fallback | Safe oversize failure returns `409` without consent; the exact `INTELLILOOP_CONTROLLED_FIXTURE` body returns visibly declared/unavailable evidence |
| Twin integration | The same run materializes attributed `SoftwareAsset` nodes and exact code-derived relationships with snapshot bindings |
| Accessible list | Chromium operates **Map repository and refresh Twin** by keyboard and reviews text-labeled assets and dependency paths |
| Restart/reload | SQLite close/reopen preserves exact Twin/code-map digests; browser reload restores both revision selectors and content |
| Integrity failure | Canonical tampering maps to `INTEGRITY_ERROR` without returning the corrupted value or partial map |

## Demo Run 2 Local Project Pilot matrix

| Acceptance | Executable proof |
|---|---|
| Default-off capability | API/config tests cover disabled, missing allowlist, strict boolean/path parsing and no root enumeration; the UI presents no live action until capability is `READY` |
| Path authorization | Controlled repositories cover exact and nested allowlisted roots, outside/sibling-prefix/traversal/non-Git/unborn/link rejection and sanitized responses/logs |
| Exact committed objects | A committed contract is projected while a conflicting dirty-worktree-only contract is excluded; the output contains neither raw source nor absolute root |
| Sensitive names | A committed local-configuration filename is skipped before blob acquisition and accepted by the extractor only as generic `[sensitive-name]` coverage |
| Non-mutation | Tests compare HEAD, branch, porcelain status, index and branch-ref digests before/after real preflight, registration, capture and projection |
| Fail-closed bounds | The one-millisecond Git test fails with `GIT_TIMEOUT`; committed source retains the existing 2,000-file, 256-KiB/file, 5-MiB and five-second ceilings |
| Browser journey | Chromium covers outside-root rejection, preflight, exact commit/ref and dirty exclusion, Project/Work Item creation, API interruption/retry, source-free map, deterministic Not Ready assessment/report, demo-reset isolation and 390-by-844 overflow |
| Offline isolation | Browser request auditing records zero external requests; no demo mutation action appears on a Local Project |
| Graph/list parity | `NOT_APPLICABLE_NO_GRAPH`; the accessible list is the only implemented presentation authority |
| Repository safety | `EV-CODEMAP` hashes complete controlled repository bytes before/after inference and declared safe-failure paths |
| Phase gate | Generated `EV-TWIN` and `EV-CODEMAP` close `G2_EVIDENCE_TWIN_PROVEN`; neither claims reconciliation or readiness |

## IL-5.1 reconciliation-comparison matrix

| Acceptance | Executable proof |
|---|---|
| Rule identity | Exact `reconciliation-rules.v1` version and canonical SHA-256 digest are pinned |
| Eligibility | Same Mission, exact normalized subject/predicate and the same comparison key are required; no fuzzy authority exists |
| Applicability | Broad/narrow compatible scopes overlap; shared dimension disagreement and touching/disjoint half-open intervals do not |
| Value equality | Canonically equal primitives and structured JSON are equivalent |
| Scalar incompatibility | Unequal same-type booleans, numbers and strings are incompatible symmetrically |
| Ambiguity | Unknown null, mixed types and unequal structured values remain explicit and are never coerced |
| Scope/version defense | Cross-Mission, term mismatch and comparison-key mismatch are not comparable |
| Story boundary | Focused tests prove a pure domain contract only; no finding, winner, persistence, API, UI, impact or readiness state exists |

## IL-5.2 conflict/supersession/ambiguity matrix

| Acceptance | Executable proof |
|---|---|
| Policy identity | Exact `reconciliation-decision-policy.v1` digest and no timestamp/source/confidence/AI authority are pinned |
| Active conflict | An unlinked newer incompatible claim remains active and creates one input-order-independent open conflict |
| Active ambiguity | Null, mixed-type and unequal structured values create explicit ambiguity findings without coercion |
| Valid supersession | Exact attributed one-step and multi-step chains deactivate only predecessors; only the chain head remains active |
| Invalid topology | Missing/forged links, forks/joins and cycles reject the complete evaluation with stable domain errors |
| Scope and limits | Cross-Mission/duplicate claims reject and the 100-claim limit fails before pair expansion |
| Determinism | Canonical claim-ID order fixes pair order, finding keys and complete result digest regardless of caller order |
| Story boundary | `IL-5.2` findings are pure domain values only; stale/missing composition belongs exclusively to the separate `IL-5.3` contract and neither has persistence, API, UI, impact or readiness authority |

## IL-5.3 staleness/missing-support/reassessment matrix

| Acceptance | Executable proof |
|---|---|
| Support-policy identity | Exact `reconciliation-support-policy.v1` digest pins explicit-only requirements, exact matching, no history mutation and no AI authority |
| Missing support | Exact absent evidence locators and target-snapshot validation keys emit stable `MISSING`; an empty declaration invents nothing |
| Validation presence | An exact `FAILED` validation satisfies presence while retaining its failed status for downstream policy |
| Exact dependencies | Claim/evidence source, snapshot, supersession relationship, validation, rule, decision and requirement identities are canonical dependencies |
| Stale successor | Added/changed/removed exact dependencies emit one digest-linked `STALE` predecessor finding without modifying historical bytes |
| Unrelated change | A Twin-only unrelated source change creates a newly bound reassessment and no false stale finding |
| Determinism/restart | Caller order is irrelevant, exact replay returns the prior object and JSON/Twin restart preserves the result bytes |
| Rejection boundary | Invalid/duplicate/over-limit requirements, a snapshot absent from the Twin and a forged predecessor reject with stable errors |
| Story boundary | Reassessments remain pure domain values; no database identity, persistence, API, UI, impact path or readiness authority exists |

## IL-5.4 deterministic impact matrix

| Acceptance | Executable proof |
|---|---|
| Policy identity | The fixed traversal policy pins allowed relationship types/directions, depth eight, deterministic order and no AI authority |
| Expected paths | Exact Twin roots reach source-backed critical code assets through bounded typed paths with complete member citations |
| Validation gaps | Explicit requirements distinguish absent validation result, absent validation path and unavailable implementation support without inventing obligations |
| Negative paths | Irrelevant relationships are excluded; cycles terminate; a target beyond the fixed depth does not appear |
| Trust labels | Declared code-map fallback remains visible and cannot close implementation support |
| Determinism/integrity | Reordered declarations are equal; canonical restart succeeds; forged bindings, citations, limits and AI-advisory roots reject |
| Story boundary | Impact is a pure domain result until `IL-5.5`; it grants no truth, provider or readiness authority |

## IL-5.5 reconciliation/impact persistence and API matrix

| Acceptance | Executable proof |
|---|---|
| Aggregate lineage | `reconciliation-impact-revision.v1` binds exact reassessment, impact, Twin, snapshot and code-map identities plus stable finding/path counts |
| Same-input idempotency | Exact current replay returns the same aggregate; replaying an older input after a successor returns the exact historical row without appending |
| Successor history | A changed canonical input appends one digest-linked revision and leaves predecessor bytes unchanged |
| Transaction safety | Forced insertion failure creates no partial row; update/delete triggers reject mutation |
| Restart/integrity | Close/reopen preserves canonical bytes; valid-but-noncanonical stored JSON fails closed before member retrieval |
| Strict API | POST returns 201/200; exact/list/findings/impact-path reads are Mission-scoped and bounded; unknown fields, excessive arrays and malformed cursors reject |
| Exact reconstruction | Execution loads only Twin-bound evidence/claims/supersessions and rejects mismatched code-map or unreconstructable validation-result state |
| No caller graph authority | Callers select persisted revisions and submit explicit obligations only; semantic relationships, findings and paths are not accepted inputs |
| Story delivery boundary | At `IL-5.5`, API and persistence existed while `IL-5.6` still owned browser presentation; no reconciliation state can authorize readiness |

## IL-5.6 findings-and-impact presentation matrix

| Acceptance | Executable proof |
|---|---|
| Strict client contract | Exact decoders accept all five finding variants and cited paths while rejecting unknown/AI/malformed reason, citation, count, dependency-change and path-continuity states |
| Exact citation seam | Twin node/relationship resources expose canonical member digests; browser impact declarations use the selected root member digest rather than its source digest |
| Cross-resource integrity | Mission/Project/revision scope, complete-page finding/path counts and supporting-path references are checked before render |
| Accessible presentation | Loading, empty, error, integrity and partial states are explicit; form controls, revision history and citation disclosures are keyboard-operable and not color-only |
| Real workflow | Isolated Chromium creates conflict, runs assessment, inspects a cited path, appends an explicit correction, materializes a successor Twin and verifies historical `STALE` without the corrected active conflict |
| Failure boundary | Intercepted finding retrieval renders retryable failure with no sample result; no dismiss, resolve, approve, block or `READY` control exists |
| Regression audit | Real nonempty code maps retain distinct asset/edge provenance; exact edge verification accepts actual dependency edges without treating legacy asset citations as extras |
| Story boundary | Presentation adds no schema, provider, validation persistence, AI authority, finding mutation or readiness decision; aggregate proof belongs to `IL-5.7` |

## IL-5.7 deterministic-core evidence matrix

| Acceptance | Executable proof |
|---|---|
| Reproducible report | `npm.cmd run evidence:reconcile` builds the required packages and generates `EV-RECONCILE` from the production domain/API/persistence path |
| Controlled truth table | One controlled synthetic fixture proves exact conflict, null-versus-known ambiguity, missing evidence/validation support and two explicit impact-gap reasons |
| Explicit correction | A persisted `SUPERSEDES` link projects into the successor Twin, clears the active conflict and preserves predecessor history |
| Exact staleness | The successor Twin changes exact claim/supersession dependencies and appends one digest-linked `STALE` finding |
| Deterministic replay | Canonical and reordered declarations reuse the same immutable revision/result digest; 25 measured replays return byte-equal success bodies |
| Restart/safety | SQLite close/reopen preserves the final digest; registered-repository tree bytes are equal and no provider, credential, install or product repository write is used |
| Metrics boundary | `METRICS_REPORT` records 6/6 authored case conformance and local timings with no wall-clock pass threshold or production/ROI extrapolation |
| Gate boundary | Phase-5 `DC-04`/`DC-05` plus `EV-CITATIONS` jointly close `G3_DETERMINISTIC_CORE_PROVEN`; `EV-OPENAI-EVAL` satisfies G4 through the frozen offline decision |

## IL-6.1 evidence-pack matrix

| Acceptance | Executable proof |
|---|---|
| Same-input digest | Exact and reordered source/claim collections compile to byte-equal packs and one canonical pack digest |
| Exact scope/binding | Aggregate, Twin, source, claim and supersession identities/digests are revalidated; incomplete Twin inputs reject |
| Minimization | Full evidence-source normalized content, repository roots and source code are absent; compact attribution and claim excerpts remain |
| Transfer redaction | Existing secret rules plus private Windows/UNC/POSIX path rules rerun over the question and all selected JSON keys/values |
| Bounds | Question, source-item, redacted-item, count, serialized-byte and 12,000 conservative transfer-unit ceilings fail without truncation |
| Citation stability | Locator-derived IDs remain stable when only the question changes; item and pack digests change when their covered content changes |
| Locator validity | Every allowlisted ID resolves to one exact item/locator/digest; malformed, unknown, duplicate or tampered state rejects |
| Story boundary | Compilation remains pure; product orchestration is separately owned and proved by `IL-6.4` |

## IL-6.2 deterministic offline-explanation matrix

| Acceptance | Executable proof |
|---|---|
| Golden structure | Release fixture asserts exact answer, fact, inference, conflict, next-action and limitation text with separate sections |
| Fixed questions | Conflict, impact, missing-validation, next-action and post-correction questions assert exact answer kind/text |
| Citation grounding | Every statement has at least one pack-allowlisted citation; every used citation resolves to its exact item/locator/digest |
| Correction semantics | A real explicit `SUPERSEDES` fixture labels predecessor evidence historical, retains current successor evidence and cites the correction |
| AI-off disclosure | Engine is exactly `DETERMINISTIC_EXPLANATION`, `AI_OFF`, provider `NONE`, `externalCallMade: false` |
| Determinism and limits | Repeated rendering is byte/digest equal; statement/citation/serialized ceilings are versioned policy inputs |
| Failure behavior | Unsupported free-form questions, changed answer text and forged citation identity fail closed |
| Authority | No readiness field, provider call, finding mutation, winner selection, waiver, API, persistence or UI exists |

## IL-6.3 provider-neutral mock-validation matrix

| Acceptance | Executable proof |
|---|---|
| Default off | Configured mock transport receives zero calls; adapter returns the complete `AI_OFF` explanation with `PROVIDER_DISABLED` |
| Request binding | UUID, Project/Mission/question, full verified redacted pack, pack/schema/policy/request digests, allowlist and immutable limits are asserted |
| Mock success | One strict structured response is accepted, digest-wrapped and retains offline fallback alongside it; external call remains false |
| Identity/schema failure | Wrong UUID/request digest, pack digest, schema version, unknown field and readiness field each reject without retry |
| Citation validation | Unknown statement citation and incoherent top-level citation union reject against the exact pack registry |
| Metadata/usage | Unsafe or mismatched provider identity, incoherent token totals and output-token overflow reject |
| Limits | Oversized response, input ceiling, one-concurrent-request ceiling and cumulative session budget fail closed before unsafe continuation |
| Timeout/retry | Abort fires on both timed-out attempts; one transient transport failure retries once and succeeds; repeated failure stops after one retry |
| Static safety | Adapter source has no fetch, HTTP(S), environment, credential or authorization API reference |
| Authority | Only `DISABLED` and `MOCK_VALIDATION` exist; no route, persistence, live transport, credential, provider call or readiness authority exists |

## IL-6.4 cited-question API/UI matrix

| Acceptance | Executable proof |
|---|---|
| Fixed request surface | Contract/API tests accept exactly six questions and reject arbitrary questions plus provider/readiness/extra fields |
| Persisted orchestration | API loads latest exact reconciliation, Twin, sources, claims and supersessions; absent/corrupt/over-limit state fails closed |
| Offline completion | Every valid response returns `DETERMINISTIC_EXPLANATION` / `AI_OFF`; disabled and failed provider outcomes retain it |
| Exact disclosure | Response and browser show canonical redacted pack JSON, counts/digests/redaction and literal `transferStatus: NOT_SENT` |
| Citation integrity | Server emits used citation details only; client verifies every statement/advisory citation and rejects unknown/mismatched/private-path data |
| Mock boundary | Controlled valid mock is accepted; unknown citation is rejected without retry; transport failure retries once then falls back |
| Browser workflow | Real localhost flow opens explanation, follows citation links, survives provider-unavailable response and refuses an injected unknown citation |
| Authority/non-mutation | Production adapter is disabled; no credential/network/persistence/readiness field exists and reconciliation revision count remains unchanged |
| Aggregate gate | `EV-CITATIONS` passes 6/6 fixed questions; its largest controlled question pack is at most the frozen 12,000-unit ceiling |

## IL-6.5 personal OpenAI checkpoint matrix

| Acceptance | Executable proof |
|---|---|
| Entry checklist | Domain/generator require passing G3, reconciliation, citation and privacy evidence plus the exact six-question preview set |
| No inferred authorization | Offline constructor fixes explicit enablement and runtime credential injection/read to false |
| No fabricated metrics | Grounding, citation validity, usefulness, latency, token usage and deterministic difference are all exactly `NOT_MEASURED` |
| Exact decision | Only three frozen enum values exist; the selected branch is `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` |
| Bounds | Wrong question order/count, non-`NOT_SENT` transfer, input above 12,000 or non-disabled production outcome rejects |
| Credential boundary | Static test rejects environment, credential and network APIs; generator rejects non-fixture credential-like repository text |
| Integrity | Same evidence produces the same checkpoint digest; changed decision/digest fails closed |
| Generated evidence | `EV-OPENAI-EVAL` records six preview sizes, safe non-execution, decision digest and `IL-6.6` next authority |

## IL-6.6 AI safety documentation matrix

| Acceptance | Executable proof |
|---|---|
| Authority disclosure | Canonical document must contain the reviewer record and authority matrix denying AI canonical, finding, readiness and Passport authority |
| Transfer disclosure | Data inventory must distinguish current local lifetime, `NOT_SENT`, future eligible minimized payload and data that must remain local |
| Checkpoint binding | Checker reads `EV-OPENAI-EVAL`, requires G4 offline pass, exact decision, no-call state and the canonical checkpoint digest in documentation |
| AI-use separation | Ledger must distinguish Codex-assisted development, deterministic product runtime and the personal-provider experiment that did not run |
| Sensitive-body guard | Checker rejects credential-like values, private absolute paths and raw normalized/provider-response body markers on final story surfaces |
| Planning consistency | Checker requires the backlog to retain at least the completed `IL-6.6` checkpoint and keep one consistent current next-story value as later stories advance |
| Link integrity | Documentation link checker must discover the new story record and report zero broken local targets |

## Current limits

Project/Mission domain, bounded JSON APIs, default-off allowlisted local registration, immutable Git snapshot capture, exact-commit source acquisition, evidence/claim lineage, historical runtime summaries, Local Project/browser evidence workflows, generated privacy/Twin/code-map/reconciliation/citation/OpenAI-checkpoint/readiness/Passport proof, generalized Twin vocabulary, deterministic projection/invalidation, canonical Twin persistence/API/list UI, bounded code-map scanning/extraction/persistence/API, accessible Twin/code-map review, deterministic reconciliation/impact evaluation, immutable reconciliation/impact persistence/API, strict findings/path review, question-directed pack/citation registry, deterministic offline explanation, mock provider validation, strict cited-question API/UI, the frozen offline course-correction decision, deterministic cited synthetic edge-case suggestions, the pure readiness evaluator, immutable ReleaseAssessment persistence, unsigned one-assessment Passport projection and strict readiness/Passport API/UI now exist. `IL-7.5` closes focused restart, isolation, corruption, exact-projection, zero-false-`READY` and AI-off proof across the real local layers. There is no public validation/review intake, live telemetry, external provider transport, general export, Passport signing, approval or deployment surface to test. Phase 8 owns the controlled retail fixture and complete golden workflow; Demo Run 2 adds no multi-repository aggregation or new readiness authority.

## IL-6.7 synthetic edge-case matrix

| Boundary | Required proof |
|---|---|
| Domain | Stable output/digest, finding/path scenario coverage, honest empty set and tamper rejection |
| Dependency boundary | Domain source has no fetch, socket, process environment or provider-adapter import |
| API | All six fixed questions return v2 synthetic sets bound to exact pack/question identity and resolved citations |
| Client | Unknown members, project drift, labels, authority, kinds, paths and citations fail closed |
| Browser | Synthetic section and all three warning labels render; existing failure and non-readiness behavior remains |
| Generated evidence | `EV-CITATIONS` records 6 sets, 23 cited suggestions, provider `NONE` and zero canonical authority |

## IL-7.1 readiness evaluator matrix

| Boundary | Required proof |
|---|---|
| Candidate green | One exact verified/current/persisted-input vector passes all nine ordered obligations and yields candidate `READY` |
| Fail-closed blockers | Integrity, scope, snapshot, all four active finding classes, validation absence/status/scope/staleness/origin/persistence, review absence/origin/scope/staleness/persistence, freshness, provenance, fallback and completeness each prevent green |
| Stale precedence | Changed snapshot, stale validation/review or changed dependency yields `STALE`; historical predecessor-stale findings do not stale the current corrected evaluation |
| Determinism | Reordered validation inputs produce exact equality; policy, input, result and evaluation-key digests are stable |
| Integrity and limits | Unknown members, malformed freshness, verified aggregate tamper, output tamper and collection ceilings fail closed |
| Non-authority | Output is `NOT_PERSISTED`, denies release/Passport/deployment/AI authority and static guards exclude infrastructure/API/UI primitives |

## IL-7.2 assessment persistence and dependency-staleness matrix

| Boundary | Required proof |
|---|---|
| Canonical persistence | The immutable `release-assessment.v1` envelope round-trips with its exact `readiness.v1` evaluation, input fingerprint, predecessor and digest |
| Repository authority | Evaluator inputs are derived from the latest stored reconciliation, Mission snapshot, validation records and explicit review; caller-authored freshness/persistence classifications are unavailable |
| Idempotency and concurrency | Exact same-input replay and concurrent requests converge on one stable assessment identity and one database row |
| Successor history | A changed authoritative input appends a digest-linked successor only against the live predecessor; forced failure leaves the prior row intact |
| Derived staleness | Reconciliation, snapshot, validation and review changes make the historical assessment `STALE` without rewriting its original status, bytes or digest |
| Hydration integrity | Scope, duplicated SQL fields, canonical envelopes, evidence/snapshot bindings, review binding and the complete predecessor chain are revalidated on read |
| Restart and migration | Schema `011` survives close/reopen, upgrades atomically, rejects newer schemas and converges under multi-process startup |
| Non-authority | No readiness/validation/review HTTP route, browser surface, Passport, release approval, deployment action, provider or credential path exists |

## IL-7.3 Release Passport matrix

| Boundary | Required proof |
|---|---|
| Exact projection | Every Passport scope, snapshot, rule, evidence, status, obligation, blocker, finding, validation and review value equals one persisted assessment |
| Digest and canonical equality | Fixed identity/time projection is byte/digest equal; changed content or digest rejects |
| Citation reproduction | Structural assessment/reconciliation/snapshot/validation/review references are copied from the assessment only |
| Persistence | Schema `012` requires exact existing assessment identity/revision/digest/status/input digest and forbids update/delete |
| Idempotency/concurrency | Repeated and competing projections converge on one stable Passport row per assessment |
| History/restart | Passports retrieve by assessment revision, list newest-first and rehydrate against the complete assessment chain |
| Stale association | Assessment dependency change yields Passport `STALE` association while historical Passport bytes remain unchanged |
| Non-authority | Passport is unsigned, non-approving and has no readiness recomputation, API/UI, export, deployment, provider or credential capability |

## IL-7.4 readiness and Passport API/UI matrix

| Boundary | Required proof |
|---|---|
| Strict commands | Assessment and Passport POST bodies accept exactly `{}`; callers cannot author readiness inputs or projection content |
| Mission scope | Server resolves Project ownership from the Mission and list/detail resources retain the exact Mission binding |
| State ownership | API maps repository-derived assessment/Passport state; browser consumes `currentStatus` and never evaluates obligations |
| Contract integrity | API schemas and client decoders require exact identities, digests, obligations, blockers, findings, validations, review, citations and false authority flags |
| Bounded history | Assessment and Passport lists use positive revision cursors and limits from 1 through 100; detail selection retrieves complete immutable state |
| Browser states | Chromium renders `BLOCKED`, candidate `READY` and historical `STALE`, including exact blocker/stale reason text and Passport history |
| Safe projection | JSON download and print use the verified Passport resource; export flags deny source bodies, absolute paths, credentials, signature, approval and deployment |
| Honest boundary | No validation/review intake, live AI/provider, release approval, signing or deployment control is registered or rendered |

## IL-7.5 cross-layer readiness and Passport proof matrix

| Boundary | Required proof |
|---|---|
| Controlled readiness | One all-satisfied case yields candidate `READY`; 26 non-ready cases produce zero false `READY` |
| Layer continuity | Domain values pass through real SQLite repositories, production Fastify routes and browser decoders without authority widening |
| Exact Passport | Projection fields equal the selected assessment; canonical/digest changes reject |
| Restart | Assessment and Passport resources rehydrate through a newly composed application after database close/reopen |
| Isolation | Another Project/Mission cannot read or infer the assessment identity |
| Integrity | Corrupted canonical assessment or Passport bytes fail closed rather than render |
| AI off | Network access is trapped and unused; evaluator/projection source guards exclude provider authority |
| Presentation | Focused Chromium workflow renders server-owned state and explicit unsigned/non-approval language |

Reproduce this matrix with `npm.cmd run evidence:readiness-passport`. The generated reports are controlled local conformance evidence, not production accuracy or release authority.

## IL-8.1 controlled retail fixture matrix

| Boundary | Required proof |
|---|---|
| Ownership | Fixture is `INTELLILOOP_AUTHORED_SYNTHETIC_ONLY`, source-independent and transfers no external source |
| Repository revisions | Nine unique safe initial paths plus five deterministic changes produce one ten-file corrected tree |
| Evidence and claims | Logical locators are unique, every claim excerpt exists in its source and successors retain exact comparison/applicability keys |
| Partial validation | Order/refund are initially present; inventory/fulfilment are missing until correction; every draft fixes `executed: false` |
| Impact | Aliases resolve to corrected-tree assets across order, inventory, refund, fulfilment and notification |
| Privacy | Private absolute paths, credential shapes and company identifiers reject |
| Determinism | Generated per-item, tree, evidence-set and complete-fixture SHA-256 manifests remain stable |
| Authority | Fixture stores no precomputed product state and exposes no materializer/reset; `IL-8.2` owns those operations |

Run `npm.cmd run evidence:retail-fixture` to build the isolated package and regenerate [EV-RETAIL-FIXTURE](../evidence/EV_RETAIL_FIXTURE.json).

## IL-8.2 real-path loader and reset matrix

| Boundary | Required proof |
|---|---|
| Normal path | Setup uses production Project, Mission, registration, snapshot, evidence, claim, code-map, Twin, reconciliation and readiness services |
| Initial truth | The persisted initial assessment is `BLOCKED`; no status is fixture-authored |
| Idempotency | Repeated setup reuses exact IDs/counts; repeated reset is a successful no-op |
| Restart | Reopened SQLite returns the same loaded fixture identities and revisions |
| Isolation | Reset removes the demo Project only and preserves a separately created non-demo Project |
| Scope | Reset accepts no body, path, Project ID or fixture selector |
| Integrity | Ownership marker/root checks precede filesystem removal; ordinary immutable deletes still reject |
| Inert source | Git is initialized and committed, but fixture source and scripts never execute |

Run `npx.cmd vitest run --config vitest.api.config.ts apps/api/test/demo-workspace-api.test.ts apps/api/test/database-lifecycle.test.ts` for the focused real-filesystem/Git/SQLite proof.

## IL-8.3 golden workflow matrix

| Boundary | Required proof |
|---|---|
| Persisted sequence | Real services derive `BLOCKED → READY → STALE`; no status is fixture-authored |
| Correction | Fixed successor evidence, code map, Twin, reconciliation, validation/review inputs and assessment converge idempotently |
| Passport | Candidate `READY` produces one unsigned assessment-bound projection without approval authority |
| Staleness | One exact dependency change leaves historical assessment/Passport bytes unchanged and derives `STALE` |
| Browser/network | Four serial Chromium cases complete with zero non-loopback or credential-bearing requests |
| Reset/restart | The owned workspace resets to `EMPTY`; unrelated Projects survive |

Run `npm.cmd run evidence:golden-flow` to regenerate [EV-GOLDEN-FLOW](../evidence/EV_GOLDEN_FLOW.json).

## IL-8.4 through IL-8.6 competition proof matrix

| Story | Executable proof | Result |
|---|---|---|
| `IL-8.4` | `npm.cmd run evidence:accessibility` | Keyboard focus continuity, semantic/non-color status and three-viewport overflow checks pass |
| `IL-8.5` | `npm.cmd run evidence:demo-gate` | Paced restart/recovery, repository equality, loopback-only traffic, privacy sentinel and reset pass |
| `IL-8.6` | `npm.cmd run evidence:demo-support` | Seven 1366×768 production screenshots plus API-off script-free fallback and hashes pass |

The faster `check:demo-gate` and `check:demo-support` commands verify existing/diagnostic state; they do not replace the paced capture when release assets materially change.

## IL-9.1 through IL-9.3 release matrix

| Story | Command | Authority proved |
|---|---|---|
| `IL-9.1` | `npm.cmd run check:release-platform` | Current source/artifact hashes still match the directly observed 20-command Windows run; Linux remains configured, not locally observed |
| `IL-9.2` | `npm.cmd run check:release-security` | Exact lockfile/inventory, approved licenses, zero recorded audit findings and candidate privacy/provenance/similarity/safety evidence remain coherent |
| `IL-9.3` | `npm.cmd run check:documentation` | Fourteen canonical documents, package-script references, complete API route inventory, deferred labels and seven manifest-bound screenshots match |
| `IL-9.3` | `npm.cmd run check:docs` | Every local Markdown target resolves |

`EV-DOCUMENTATION` is deterministic and contains only relative paths, counts and SHA-256 values. Its command check proves that documented npm script names exist; actual execution is established by the release run and the focused commands cited in [IL-9.3 evidence](../evidence/IL_9_3_TEST_EVIDENCE.md). Documentation and screenshots cannot turn a deferred feature into an implemented one or grant release authority.

## IL-9.4 metrics and human-pilot input matrix

| Command | Required proof |
|---|---|
| `npm.cmd run check:metrics` | Controlled product counts remain bound to passing evidence and incomplete human input continues to withhold a benefit result |
| `npm.cmd run test:pilot-measurement` | An in-memory complete example calculates deterministically; negative timing and false `COMPLETE` input reject without writing synthetic values to evidence |
| `npm.cmd run evidence:metrics` | After real anonymous paired observations are entered, regenerate the aggregate result and its pilot-input digest |

The pilot validator requires six unique role/mode runs, non-negative phase minutes, non-negative integer quality counts, three complete 1â€“5 assisted-feedback responses and a positive monthly cadence with a source. It reports every missing field and cannot treat partial timing alone as a completed run.

## IL-10.1 optional Evidence Replay matrix

| Command | Required proof |
|---|---|
| `npm.cmd run evidence:evidence-replay` | Focused comparison/flag tests pass and refresh source-bound `EV-EVIDENCE-REPLAY` |
| `npm.cmd run check:evidence-replay` | Optional implementation and evidence hashes remain coherent without rerunning the browser observation |
| `npm.cmd run dev:replay` | Strict API/web opt-in exposes the read-only Lab against isolated data; normal startup remains flag-off |

The controlled browser result compares revision 1 to 2 with 101 cited differences and proves byte-equal demo/readiness and Twin-history API responses before/after. A changed digest is not correctness or approval.

## IL-10.2 optional advisory-disagreement matrix

| Command | Required proof |
|---|---|
| `npm.cmd run evidence:advisory-disagreement` | Four focused import/comparison tests and API flag tests pass; refresh source-bound machine evidence |
| `npm.cmd run check:advisory-disagreement` | Stored browser observation, implementation hashes and non-authority assertions remain coherent |
| `npm.cmd run dev:disagreement` | Strict aligned opt-in exposes the browser-local import lab; normal startup remains flag-off |

The controlled comparison must reject wrong Mission/question/pack binding, unknown citations, duplicate output identities, unknown schema fields and release-authority-shaped recommendations. It may report only normalized exact-text membership and citation-set variance. Zero network requests and unchanged readiness are acceptance requirements.

## IL-10.3 optional remediation-preview matrix

| Command | Required proof |
|---|---|
| `npm.cmd run evidence:remediation-preview` | Four focused preview/citation/authority tests and API flag tests pass; source-bound evidence refreshes |
| `npm.cmd run check:remediation-preview` | Stored repository equality, browser observation and implementation hashes remain coherent |
| `npm.cmd run dev:remediation` | Strict aligned opt-in exposes the browser-local preview; normal startup remains flag-off |

The controlled proof requires five allowlisted cited proposals, zero server request during generation, identical repository HEAD/status/non-Git file hashes before/after, and unchanged `READY`. Tampered citations, execution-shaped text or any true authority capability must reject.
