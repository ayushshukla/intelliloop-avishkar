# Security and Privacy - Release Candidate Plus Optional IL-10.3

**Audience:** Developers, reviewers and demo operators  
**Status:** `IMPLEMENTED_WITH_LIMITATIONS`  
**Implemented through:** `IL-9.2`, `IL-10.3` and Demo Run 2's default-off allowlisted Local Project Pilot (no public validation/review intake, credential, live-provider, approval/signing or external-network surface)  
**Evidence date:** 2026-08-08

## Current attack surface

`IL-9.2` remediates the four development-tool advisories by upgrading to Vite `8.2.1`, Vitest to `4.1.10` and `@vitejs/plugin-react` to `6.0.5`; the Phase-1 refresh still reports zero full/production vulnerabilities. The lockfile-bound inventory covers 222 dependency instances with zero unknown/unapproved licenses, while the expanded 406-file candidate scan reports zero non-fixture secret/private-path/prohibited-file findings. These time-sensitive results are bound in [EV-SECURITY-AUDIT](../evidence/EV_SECURITY_AUDIT.json) and must be refreshed at final freeze.

The runtime contains localhost Fastify health, Local Project capability/preflight/context, Project/Mission, repository-registration, Git-snapshot, evidence/claim, Twin, code-map, reconciliation/impact, cited-explanation and readiness/Passport routes, a nine-route localhost React workflow, one API-owned SQLite file, pure deterministic domain primitives, in-process repositories and a bounded code-map scan/extract/project pipeline. Project names, mission titles, one private canonical repository root per Project, path-free Git observations, redacted attributed evidence sources/timeline events, normalized claims, explicit supersession links, canonical Twin revisions, source-free snapshot-bound code-map revisions, complete reconciliation/impact aggregates, validation/review records, ReleaseAssessments and unsigned Passports may be persisted. Evidence can enter through the bounded preview/import API and Mission browser form; claims/successors enter only through documented local APIs; reconciliation declarations can enter through the documented API and browser form. Validation/review writers are not exposed. Git is invoked only through closed read-only argument arrays selected by the server. The runtime still has no authentication, repository-source-content HTTP endpoint, arbitrary command input, file upload, shell execution, installer, credential endpoint or external AI integration; it must remain loopback-only.

Project/Mission operations reject cross-project references, duplicate/conflicting current missions, forged state and backwards lifecycle time. Database foreign keys, guarded head updates and one-current-mission uniqueness enforce the persisted boundary. Stable errors do not echo rejected values.

The web shell makes later product stages non-interactive and explicitly unavailable. Failed health or workspace requests produce stable error states with no cached or placeholder substitute; retry contacts only the local API. `CONNECTED` is labelled as operational connection and never as release readiness. Git status is labelled observation-only and `NOT ASSESSED`, never as validation or release readiness.

The Projects, Local Project and change-overview routes validate every success payload before use. Malformed or failed responses do not populate domain state. The only browser field containing a repository root is the Local Project preflight input. It is hidden after successful preflight and cleared after registration; successful preflight, registration and context responses supply only path-free metadata. The browser never receives the allowlist or changed filenames. Project and Mission names remain operator-entered persisted values and should not contain credentials or private path details.

## Fail-closed configuration

- The API accepts only the IPv4 loopback host `127.0.0.1`.
- The port is range-validated and the log level is allowlisted.
- Invalid configuration exits 1 before listening.
- Startup failure output contains a stable code, never the supplied value or environment dump.
- External-AI and experiment flags default false. External AI cannot be enabled. All optional experiments require strict aligned API/web opt-in and add no credential or provider authority. Remediation Preview contains no request/mutation client, rejects execution-shaped or uncited proposals and exposes no repository, shell, Git, deployment, persistence, validation or readiness operation. `IL-6.5` does not unfreeze provider execution.
- The Local Project Pilot also defaults false. It requires exact process-local enablement plus a non-empty bounded allowlist; capability reveals only enabled/configured state, never root values. This flag adds no network, authentication, AI, repository-write or readiness authority.
- `codeMap.enabled` authorizes the bounded local code-map infrastructure and its strict API/UI. It does not authorize source browsing, code execution, runtime-semantics claims or readiness authority.
- The data directory must be absolute and non-root; schema or open failure prevents listening.

## Request and error boundary

- Valid UUID request IDs propagate through `x-request-id`; unsafe values are replaced.
- Every API response includes the resolved request ID.
- Stable error codes are `NOT_FOUND`, `INVALID_REQUEST`, `CONFLICT`, `INTEGRITY_ERROR` and `INTERNAL_ERROR`.
- Unknown body and query properties are rejected rather than silently removed.
- Error messages are fixed by the shared contract.
- Raw exception messages, query values, absolute paths and submitted data do not enter ordinary responses.
- Broad CORS is not enabled.

## Safe structured logging

Fastify automatic request logging is disabled. The authored JSON-line logger serializes only:

- UTC timestamp, level and stable event;
- request ID, method and static route template;
- status and stable error code;
- configured loopback host and numeric port for lifecycle events.

It has no field for headers, authorization, cookies, request/response bodies, query values, raw URL, raw exception, environment variables, credentials or private filesystem paths. Logger sink failures are swallowed rather than affecting request handling or expanding the record.

Secret-sentinel tests cover invalid configuration, authorization headers, query values, unsafe request IDs, thrown error messages and database startup paths.

## Database boundary

- Only `apps/api` imports `better-sqlite3` or receives the connection.
- The default file is outside the source workspace; configured paths never enter responses or logs.
- Migration SQL executes under `BEGIN IMMEDIATE` and is recorded with a SHA-256 checksum.
- Unknown-newer, altered-history and unversioned non-empty databases fail closed.
- Foreign keys, WAL mode, full synchronization and a bounded busy timeout are enabled.
- Failed migration tests prove that partial schema changes are absent after rollback.
- Git snapshots have Project/Mission/registration foreign keys, head/count checks and database triggers rejecting update or delete.
- Claims bind complete source attribution through composite foreign keys. Claim/supersession rows are insert-only, direct successor links are unique and an insert trigger rejects mismatched scope, comparison/applicability or successor metadata.
- Code-map rows bind exact Project/Mission/registration/snapshot scope, inferred-versus-declared mode and predecessor metadata; canonical hydration and update/delete triggers fail closed on mutation or mismatch.
- Reconciliation/impact rows bind the exact persisted Twin, code map and target snapshot, retain the code-map trust tuple and component/result digests, enforce one Mission revision sequence and reject update/delete. Canonical hydration verifies the complete aggregate before any finding or path is returned.

Only bounded Project names, mission titles, canonical repository roots, redacted evidence and normalized claim data are accepted and persisted. Raw pre-redaction evidence is absent from the schema.

## Credential, data and network posture

No credential is accepted or required. No live provider call exists. `IL-6.4` production wiring is disabled; injected mock validation exists only inside controlled tests and every execution records `externalCallMade: false`. `IL-6.5` records `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` because explicit transfer authorization and a runtime-only credential were absent. The checkpoint reads no environment credential and cannot be enabled by current flags.

Generated `EV-OPENAI-EVAL` validates the passing privacy/citation/reconciliation prerequisites, scans repository text for non-fixture credential-like values and records no exact pack or provider body. The selected branch never receives a credential, so it cannot persist or log one. The pattern scan and synthetic `EV-PRIVACY` sentinel proof are bounded controls rather than complete secret detection.

No company, client, employer or real evidence data is checked into this repository or written to generated evidence. The only product fixture is an explicitly labeled IntelliLoop-owned declared code-map manifest for controlled fallback; it is not scanner-equivalent evidence. A separately authorized Local Project run may inspect exact committed Git objects, but raw source remains transient and is excluded from logs, generated evidence and persisted Code Map/Twin/Report records. Shared competition screenshots and artifacts must continue to use the controlled synthetic repository. Runtime calls remain on localhost.

## Repository boundary

- Registration accepts an explicit absolute root only through the default-off pilot's `PUT /api/v1/projects/:projectId/repository` after the same server-side preflight used by the browser.
- Exact `true` enablement and a non-empty process-local allowlist are mandatory. The allowlist is never returned or enumerated.
- Input is bounded, NUL-free, network/device-path-free and traversal-free; relative roots reject. Lexical path-aware containment runs before candidate filesystem inspection, then canonical containment applies host case rules and rejects sibling-prefix matches.
- The selected root and direct `.git` directory must exist as real directories. Root, parent-component and `.git` symlink/junction redirection reject.
- The canonical database file must be outside the canonical root.
- The exact canonical root becomes the Project's private repository binding and is revalidated against both registration and pilot allowlists before future pilot context reads.
- One root cannot cross Project scopes, and an archived Project cannot register.
- The canonical root is stored privately but excluded from API resources, stable errors and structured logs.
- Preflight/registration use filesystem metadata plus fixed Git identity, commit-time and status reads. Snapshot capture and Code Map projection may later invoke only the closed reads described below.
- No repository write, replace, remove, patch, checkout, reset, commit, push, deploy, shell or arbitrary-execution route exists.

### Read-only Git command boundary

The API chooses identity/status operations from a closed internal enum; callers provide no executable, argument, ref, path or environment value. Those arrays are:

- `git --no-optional-locks -c core.fsmonitor=false -c core.untrackedCache=false symbolic-ref --quiet --short HEAD`;
- `git --no-optional-locks -c core.fsmonitor=false -c core.untrackedCache=false rev-parse --verify HEAD`;
- `git --no-optional-locks -c core.fsmonitor=false -c core.untrackedCache=false show -s --format=%cI HEAD`;
- `git --no-optional-locks -c core.fsmonitor=false -c core.untrackedCache=false status --porcelain=v1 -z --untracked-files=all --ignore-submodules=all --no-renames`.

Snapshot-bound source acquisition additionally uses only `git --no-optional-locks --no-replace-objects ... ls-tree -r -z --long --full-tree <captured-commit>` and `git --no-optional-locks --no-replace-objects ... cat-file --batch`. The commit comes from the immutable snapshot and the batch object IDs come only from that tree; neither route accepts a ref, object ID or Git argument from the caller.

Every process uses the privately revalidated canonical repository root as `cwd`, `shell: false`, hidden windows and ignored stdin. Inherited `GIT_*` variables are removed; a null global-config source and `GIT_CONFIG_NOSYSTEM=1` exclude user/system configuration. `GIT_OPTIONAL_LOCKS=0` prevents optional lock-backed refresh writes, `GIT_TERMINAL_PROMPT=0` prevents credential prompts, and `LC_ALL=C` stabilizes command behavior. Fixed command overrides disable repository-configured filesystem-monitor hooks and the untracked cache. Capture neither sets nor mutates global/local Git configuration.

Identity/commit-time/status commands have the Run 1 15-second fail-closed per-command ceiling and a combined stdout/stderr limit of 1 MiB; the explicit one-millisecond negative test remains. Committed-object acquisition has one five-second aggregate deadline and a 16-MiB process-output ceiling in addition to the source limits below. Timeout, process, output and malformed UTF-8/status/tree failures map to fixed errors. Stderr is counted but discarded. Status parsing accepts NUL-delimited porcelain v1 records, including defensively supported rename/copy pairs, and rejects absolute/traversing paths. The production status command disables rename detection and ignores submodule worktree inspection to keep the root observation bounded and avoid nested repository execution. Raw root paths and changed filenames are used only inside the bounded capture/digest process; they are not persisted in `git_snapshots`, serialized or logged.

HEAD evidence is read before and after status. Any exit-code or byte change rejects the capture rather than persisting a mixed identity. The stored record is insert-only, and repository-state fixtures hash the complete synthetic root before and after actual capture. Clean, dirty, unborn and detached cases preserve exact repository bytes. These controls do not protect against another local process changing worktree files at the same instant; the before/after HEAD check detects identity movement, while the snapshot remains a point observation under the documented local-user trust model.

The current conservative boundary accepts direct `.git` directories only; Git worktree/submodule `.git` files are not yet supported. Exact changed-file evidence remains later work.

## Evidence import privacy boundary

`IL-3.1` implements redaction before the persistence call. The pure domain operation accepts only declared Markdown/text/JSON bytes, with strict UTF-8, a 256 KiB input/output ceiling, bounded JSON depth/nodes and rejection of malformed syntax, ambiguous keys, disallowed controls and obvious binary signatures. It normalizes before applying an ordered catalog covering private keys, common provider/service tokens, AWS keys, JWTs, authorization values, credential URLs, generic assignments and secret-bearing JSON keys.

Only stable category placeholders and per-rule counts enter the prepared result. Raw input and matched values are not returned, logged, persisted or included in its content digest. Rejection produces a stable non-revealing error and no partial result; caller bytes are unchanged. Preparation remains a domain-only byte boundary; the persistence adapter accepts only its revalidated result and is not a file-upload or repository scanner.

`IL-3.2` revalidates the prepared content/digest before an immediate SQLite transaction. Only active/current scope is writable. Persisted metadata uses a bounded logical locator grammar that rejects absolute paths, backslashes, credentials, query/fragment syntax and traversal. Raw input and raw-input hashes are absent from the schema. The repository acceptance test confirms a secret sentinel is absent from the closed SQLite file.

Same-import idempotency is computed from redacted prepared metadata plus exact scope/attribution. It cannot be used to test guesses against a raw secret hash. Source and event rows append atomically, bind through composite foreign keys and reject update/delete. Existing history remains readable after Mission archival; new imports fail closed. Errors contain stable codes/messages and never SQLite statements or row content.

`IL-3.3` claim intake accepts only an excerpt that occurs verbatim in the redacted normalized source, so it cannot persist a separate raw-source variant through the claim field. Subject/predicate, canonical JSON value and applicability have explicit byte/depth/node/dimension limits. Claim digests use an excerpt digest rather than an additional raw secret-bearing input. Claim and optional successor link append atomically and remain immutable.

`IL-3.4` exposes the boundary through strict mission-scoped JSON schemas. Evidence content is limited to 256 KiB of strict UTF-8 by the domain and the route has a separate 2,000,000-byte transport ceiling. Commit re-runs preparation and rejects caller-forged prepared data. Source and claim routes accept no absolute locator, Project scope, recorded time, extraction method, command or repository path. Successful resources contain the redacted normalized representation; structured logs retain no body, content, locator, claim excerpt/value or query value. Stable errors do not echo rejected secrets or paths. Identity and sequence pagination are bounded to 1-100, and update/delete methods remain unregistered.

`IL-3.5` exposes preview/import in the Mission browser route. The raw draft is present in the browser form and sent only to the relative loopback preview/commit endpoints. Preview state is not persisted; editing the content/format invalidates import, and a successful commit clears raw content plus the preview. This is lifecycle hygiene, not secure browser-memory erasure. The browser displays only the API's redacted normalized content and never renders it as HTML.

All evidence/claim success payloads pass exact-shape validators before use. Prepared byte counts must match UTF-8 output; redaction summaries use only known rules with coherent totals. The page then cross-checks Mission/Project scope, source-event references, claim/source attribution and predecessor/successor/link relationships. Any invalid success resource replaces the complete lineage surface with `INTEGRITY ERROR`; no plausible subset remains visible as authoritative. Collections are limited to 100 records per page and a continuation is disclosed rather than hidden.

Pattern matching cannot guarantee discovery of every secret and can redact harmless matches. React text rendering escapes Markdown/HTML-like content in the current preview and source panels; no rich Markdown renderer exists. `IL-3.5` alone therefore made no cross-surface privacy claim. `IL-3.6` now supplies bounded fixed-corpus `EV-PRIVACY` evidence across logs, database, API and verification-only export/AI-pack fixtures, while still making no complete-DLP, secure-memory-erasure or tamper-evident-ledger claim. Full semantics are recorded in the [partial trust model](../product/TRUST_MODEL.md).

### Cross-surface privacy proof

`IL-3.6` adds a generated, fail-closed proof rather than a product transfer feature. Run `npm.cmd run evidence:privacy` to rebuild [EV-PRIVACY](../evidence/EV_PRIVACY.json) from production preparation, persistence, logging and HTTP code against IntelliLoop-authored synthetic values.

The proof exercises all 11 named redaction-rule identifiers, then submits a separate raw secret sentinel through preview, commit, idempotent replay and retrieval. It also sends a second secret with a private absolute locator through an expected rejection. EV-PRIVACY scans UTF-8 and UTF-16LE sentinel encodings across captured safe logs, every successful and failed API body, the closed SQLite database and any SQLite sidecar file. The generated report records only categories, counts and pass/fail results; it does not contain the sentinel, the rejected private path, temporary roots or transfer-fixture bodies.

No production export or AI-pack endpoint exists. `IL-6.4` has one local cited-explanation response that embeds exact redacted pack JSON under literal `NOT SENT` disclosure; that review response is neither a general export nor an outbound transfer endpoint. Separately, the older privacy generator creates two temporary verification-only projections from an already-redacted API resource, scans them for the forbidden corpus and deletes them. Both generators trap global fetch and require zero calls. These prove current local serializers, not the safety of a future live transport.

### Evidence-pack compiler boundary

`IL-6.1` adds the first production domain contract for a future provider-neutral context, but it remains an in-process pure value. It requires exact validated aggregate/Twin/source bindings, copies no repository root or source code, omits complete evidence-source bodies in favor of compact attribution and claim excerpts, and applies a second transfer pass over the question plus every selected JSON key/value. The pass uses the existing secret rules and a separate private-path rule. Redaction summaries, item digests, citation registry and allowlist are bound into the pack digest.

Input/output/item/count and conservative transfer-unit ceilings fail closed without truncation. Citation lookup accepts only the pack allowlist and verifies exact locator/item/digest coherence. An unknown citation, incomplete Twin input, cross-scope value, content over a bound or forged digest cannot produce a usable pack.

`IL-6.4` now exposes the compiled pack only inside one strict local response and browser disclosure fixed to `NOT SENT`; there is still no pack table, general export, provider credential or outbound call. Compilation cannot create, mutate or resolve a finding/readiness state. See [AI safety and data transfer](AI_SAFETY_AND_DATA_TRANSFER.md) for the complete current and future outbound-control boundary.

### Offline explanation and mock-provider boundary

`IL-6.2` renders only six fixed questions from one exact verified pack. Every answer/fact/inference/conflict/gap/action statement is bounded and allowlist-cited, complete rerender equality rejects tampering, superseded evidence is labeled historical, and the output is fixed to `DETERMINISTIC_EXPLANATION`, `AI_OFF`, provider `NONE`, no external call and no readiness field.

`IL-6.3` constructs one versioned provider-neutral request internally from the same verified pack. The request includes the full redacted pack, scope/question/digest bindings, exact citation allowlist, closed structured-output schema and fixed policy/limits. It cannot accept a caller-authored pack digest, allowlist or raw provider request. Adapter mode defaults `DISABLED`; the only executable transport kind is `MOCK_VALIDATION`.

Mock output is canonical-JSON detached and capped before strict parsing. Request UUID/digest, pack digest, schema, exact allowed keys, section/text/count bounds, every citation and the pack-ordered used-citation union must agree. Provider/model/response IDs use a narrow grammar, provider usage totals must be coherent and within limits, and readiness/approval/waiver/Passport/finding-mutation-shaped keys reject. Accepted test output receives a validation digest but no truth or readiness authority.

One concurrent request, 20-second timeout, one retry, 12,000 input units, 1,200 output tokens and a 50,000-unit session budget are the maximum defaults. Only timeout and transport failure retry. Static proof rejects fetch, HTTP(S), process environment, credential and authorization APIs from the adapter source. Every disabled or failed result retains the deterministic offline answer and a stable error code; raw transport errors are discarded. Application orchestration now exists, but production injects disabled mode only and logs/persists no pack, question, explanation or provider body.

### Cited-question API and browser boundary

`IL-6.4` accepts one of six fixed questions and reconstructs all server-owned inputs from the latest exact persisted assessment. Request schema rejects arbitrary prompts, provider/model selection, readiness fields and unknown members. The response carries only redacted/canonical pack bytes and used citation details; every execution says no external call and no canonical-state change.

The browser parser requires exact keys, scope/digest/pack identity, complete statement citations, coherent used-citation registries, safe optional mock metadata and no private absolute path before rendering. Any unknown citation or success-shaped authority field rejects the whole response and clears prior content. Provider unavailable/rejected state keeps the deterministic answer. Generated `EV-CITATIONS` traps external fetch, proves zero calls and verifies the reconciliation revision count is unchanged.

Pattern redaction is not complete data-loss prevention. A passing corpus proves absence of the fixed synthetic tokens exercised by this version, not arbitrary secrets, transformed values, browser-memory erasure or operating-system isolation. The detailed results and remaining risks are in the [initial security review](../evidence/SECURITY_REVIEW.md).

### Historical runtime-observation boundary

`IL-3.7` accepts only caller-supplied JSON through a loopback mission evidence route. The exact schema has eight top-level fields and fixed byte, count, measurement, time-window, token, unit and numeric limits. Additional fields—including readiness fields—reject. Only `USER_INPUT`, `VALIDATION_RESULT` and `SYNTHETIC_FIXTURE` sources with logical non-path locators are accepted.

The supplied object passes through the existing JSON normalization and 11-rule redaction pipeline before persistence. Its source/event and one-to-one observation projection append in one immediate transaction. SQLite validation binds exact source scope/time/shape, and hydration recomputes summary/series digests and all duplicated fields. Update/delete routes do not exist and database triggers reject direct mutation.

There is no network client, webhook, socket, connector, poller, subscriber, background worker, credential or provider path. Focused proof traps global fetch and observes zero calls. `liveFeed: false` is a fixed response property, not a configurable switch. Freshness is derived only from immutable local rows and grants no validation or readiness authority. The application cannot verify the authenticity, completeness, sampling quality or instrumentation correctness of an imported summary; only controlled synthetic data is appropriate at this stage.

### Twin-vocabulary boundary

`IL-4.1` is confined to `packages/domain`. It adds no route, database object, filesystem operation, process execution, network call, credential read, logging field or browser input. Serialized values are limited to 16 KiB, must be exact plain JSON objects and reject unknown keys and unsupported versions.

Source references use the existing bounded logical-locator posture and reject absolute/private paths, backslashes, query/fragment/credential syntax, controls and traversal segments. Stable errors do not echo the rejected value. Every relationship must bind exact node revisions under one Project/Mission scope, preventing a serialized edge from silently joining separate mission data. This scope check is a domain isolation invariant, not authorization; the application still has no multi-user authentication boundary.

The fixed confidence meaning explicitly excludes truth probability. This prevents generic model-like scores from entering the core representation as apparent factual or readiness authority. It does not establish extraction or match quality. Current Twin producers are the persisted evidence/claim projection and the snapshot-bound code-map projection; neither supplies reconciliation or readiness authority.

### Twin-projection boundary

`IL-4.2` remains inside `packages/domain`. It consumes already validated in-memory entities, performs no filesystem/database/network/process operation and accepts no credential. Collection, node, relationship, dependency and serialized-byte ceilings fail closed. Cross-scope, missing-source, missing-snapshot, duplicate-source, endpoint and digest-integrity failures return stable messages without source values.

Canonical projection JSON includes redacted evidence attribution/digests and logical references, not raw pre-redaction input or repository paths. `IL-4.3` persists that exact canonical document in the API-owned database and exposes only bounded revision/member resources. Node paths are already-validated logical references; private repository roots, changed filenames and pre-redaction bytes are not introduced.

Migration `008` constrains exact scope, revision, digests, predecessor, JSON envelope and counts, then rejects update/delete. Repository reads run canonical domain hydration and envelope comparison before returning any member. A failure maps to `INTEGRITY_ERROR`; structured logs retain only request ID, method, route, status and the stable error code. The response and browser warning do not echo the corrupted JSON or path.

Materialization reads only existing persistence adapters and the Git snapshot table. It does not scan a registered root, execute a command, install a dependency, read a credential, call a provider or start a background task. The explicit POST accepts no body, preventing caller-supplied projection documents or forged server-owned attribution.

### Reconciliation and impact boundary

`IL-5.3` remains inside `packages/domain`. It consumes already validated entities and an integrity-checked Twin value in memory, performs no filesystem/database/network/process operation, accepts no credential and emits no log. Fixed evidence, validation, requirement and dependency ceilings fail closed before pair/dependency expansion becomes unbounded.

Every dependency used for reassessment must match the exact projected source digest and node revision; supersession must match the exact projected relationship and endpoint revisions. The target snapshot must be present in the supplied Twin. Requirement keys and locators use the existing bounded logical parsers, and errors expose stable codes rather than source values. A predecessor result digest is revalidated on restart or extension. These checks protect the local derivation boundary; they are not authentication, signatures or proof that evidence is true.

No support obligation is inferred by a model. Only explicit declarations can produce `MISSING`, and only an exact dependency diff can produce `STALE`. A validation record's presence does not reinterpret `FAILED` as success.

`IL-5.4` adds pure deterministic impact traversal. Roots must be exact non-AI-advisory Twin nodes, requirements and basis citations are explicit, only the fixed typed relationship policy is traversed, cycles terminate and depth is capped at eight. Exact Twin, code-map, snapshot and reassessment bindings are revalidated. Static or declared code-map structure remains attributed evidence rather than runtime truth; a declared unavailable fallback cannot satisfy implementation support.

`IL-5.5` adds migration `010` and five Mission-scoped reconciliation routes. The run request can select only persisted Twin/code-map/snapshot revisions and declare bounded requirements/roots/citations; it cannot submit graph edges, findings, paths, aggregate identity, timestamps or readiness. The service reconstructs evidence, claims and supersessions from exact selected-Twin bindings, verifies the Twin's exact code-map binding and fails closed on mismatched scope/source state. Validation-result persistence is absent, so a selected Twin with validation state that cannot be reconstructed returns a stable conflict rather than using invented or caller-supplied results.

The combined aggregate is capped at 16 MiB, stored under an immediate transaction and immutable. SQL foreign keys/checks/triggers enforce exact scope, component bindings, predecessor linkage, count coherence and no update/delete. Same-input replay returns the exact current or historical row; changed input appends without rewriting history. Every read rehydrates and verifies the entire aggregate before bounded member paging. Stable errors and allowlisted logs exclude the submitted declarations and stored canonical JSON. Internal failure logs may add only a bounded uppercase stable domain-error code; raw error messages, stacks, bodies and inputs remain excluded.

`IL-5.6` adds a strict local browser consumer. It validates exact response shapes and cross-resource scope/count/path coherence, cites roots using canonical Twin member digests, and fails closed to a single integrity state. Form controls submit only explicit logical locators, validation keys, roots and bounded obligations. They cannot submit graph edges, findings, paths, timestamps, readiness or arbitrary stored documents.

There is no provider call, AI interpretation, validation-result intake or readiness decision. The browser has no finding mutation/dismissal/waiver and displays bounded logical locators, labels, identifiers and citations that may still reveal controlled product structure. Use only synthetic demonstration data.

### Code-map filesystem boundary

`IL-4.4` introduced a separate API-internal source scanner. Demo Run 2 changes the production projection path so a scan requires a current Mission, its exact read-only registration and an immutable Git snapshot with committed HEAD. Canonical-root/Git-marker validation is repeated, but source is selected from the captured commit's tree rather than by reading worktree files. Tree paths must be strict UTF-8/NFC, control-free, relative and traversal-free; unsupported modes reject, submodule commit entries are skipped and `node_modules` is excluded.

Only committed `.ts`, `.tsx`, `.js`, `.jsx` and `.json` blobs are read. Unsupported files count toward the 2,000-file ceiling and are summarized by generic extension; `.env`, secret/credential/token/private-key, certificate/keystore, dump/SQL and local configuration naming patterns are summarized only as `[sensitive-name]` and their blobs are not requested. Accepted blobs are capped at 256 KiB each, decoded as strict UTF-8 and capped at 5 MiB aggregate. One monotonic five-second deadline covers the tree and batch reads. Failures return stable internal codes without an absolute root, relative path or source excerpt.

The committed reader has no caller-supplied process surface and invokes no package script, hook, compiler, installed dependency or worktree content. `shell: false`, sanitized Git environment, `--no-replace-objects`, disabled optional locks/prompts/configured filesystem monitor and exact object IDs keep acquisition read-only and commit-bound. It has no write, rename or delete method. Source bundles remain transient in-process values: they are not logged, persisted or exposed through HTTP through `IL-4.5`. Controlled fixture tests prove exact HEAD/branch/status/index/ref equality and committed-versus-dirty exclusion; this is bounded non-mutation evidence, not an operating-system sandbox against a privileged concurrent attacker.

### Static extraction boundary

`IL-4.5` consumes only the already-bounded in-memory bundle and revalidates its scope, counters, limits, normalized relative paths, exact UTF-8 bytes and SHA-256 digests. The extractor imports no filesystem, process, network or dynamic-module API. TypeScript is now an API runtime dependency solely for `createSourceFile` parsing; there is no compiler host, emit, resolver outside the bundle or plugin path. JSON uses strict `JSON.parse`.

Output excludes source text and package script command values. Dependency ranges containing path/URL-shaped syntax are omitted. Static specifiers, names, route paths, diagnostics, nodes, records and total work have explicit ceilings. Syntax errors yield a labeled partial result; forged input, digest mismatch, hard limit or deadline failure yields no result.

The extractor recognizes declarations, not behavior. Dynamic `import()`, `require`, computed routes, aliases/wrappers and runtime package discovery cannot become imports, routes or test links. Every result states `STATIC_SYNTAX_ONLY` and `NOT_OBSERVED`. `IL-4.6` persists only the source-free projection and projects it into the Twin; `IL-4.7` returns only bounded source-free revision, asset and edge resources. No source body, package command, absolute root or runtime-observation claim is logged, persisted or returned, and no code-map record is used for readiness.

### Code-map API and browser boundary

`IL-4.7` exposes source-free code-map summaries, assets and edges under strict Mission-scoped routes. Resources contain bounded static identifiers, logical relative paths, literal route patterns and dependency specifiers, so they can still reveal sensitive repository structure. The API never returns source bodies, package scripts, absolute roots, changed filenames or scanner diagnostics. Shared competition review must use IntelliLoop-controlled synthetic repositories; explicitly authorized local pilots must keep their source-free results local.

The ordinary run request has no body and can produce only `STATIC_INFERENCE`. A configured declared manifest is insufficient by itself: fallback additionally requires the exact per-request `INTELLILOOP_CONTROLLED_FIXTURE` consent value and an allowlisted safe-failure code. Declared output remains `DECLARED_INTELLILOOP_FIXTURE`, `UNAVAILABLE_SAFE_FAILURE` and `UNAVAILABLE`; it cannot silently become scanner-equivalent evidence.

Code-map routes page at 1-100 records, reject unknown input, rehydrate the complete canonical projection before returning any member and map tamper to `INTEGRITY_ERROR`. The browser validates complete response shapes and revision/scope coherence before rendering. Its attributed list is authoritative; no graph is implemented. The application never executes registered code and the code-map routes do not add a provider or non-local network call.

### Reproducible repository-safety proof

Run `npm.cmd run evidence:repo-safety`. The command creates only an IntelliLoop-authored OS-temporary repository and an external temporary database. It proves exact NUL-delimited status-byte equality, status-digest equality and complete sorted repository-tree digest equality across registration and two captures. It also exercises missing/non-Git/relative/traversing/file/symlink roots, database containment, duplicate and cross-Project binding, archived scope, post-registration symlink substitution, pre-execution capture rejection, unsupported repository methods and caller-controlled snapshot input.

The generated [EV-REPO-SAFETY report](../evidence/EV_REPO_SAFETY.json) records only pass/fail structure, fixed synthetic counts and algorithms. It contains no raw absolute root, status bytes or filenames. A failed check exits nonzero and does not convert the existing report into fresh evidence.

## Development dependency posture

`IL-9.2` upgraded the affected development toolchain to exact compatible Vite `8.2.1`, Vitest `4.1.10` and `@vitejs/plugin-react` `6.0.5` versions. The refreshed full and production npm audits both report zero vulnerabilities, and the exact lockfile inventory contains no unknown or unapproved declared license. These registry observations are time-sensitive and must be refreshed at final freeze; they are not a guarantee that every package is defect-free.

The `IL-1.6` foundation gate also verifies that runtime source contains no external non-local URL, external calls remain disabled by default and no credential-bearing artifact exists in the repository. Current browser proof uses only authored synthetic Git/evidence values, verifies repository-root, filename and raw-secret sentinels are absent from rendered persisted state, and leaves no API/web listener or current-run temporary data directory behind. These are bounded implementation checks, not a complete release security review.

## Reporting

If a secret or private path is observed, stop, do not print it, remove it through an authorized workflow and record the affected boundary. Do not use the application as a credential store.

## Synthetic advisory safety

`IL-6.7` adds no input, execution or write surface. Its deterministic transformer consumes the already verified redacted pack and emits bounded scenario text plus a subset of existing citations. The domain source is guarded against network, provider-adapter and environment access; the API/client reject private-path text, citation drift and any authority bit set true. Results are not stored. A synthetic suggestion must never be copied into evidence or a validation record without a separate attributed intake and real execution owned by a later authorized workflow.

## Candidate-readiness evaluation safety

`IL-7.1` adds no runtime attack surface. Its strict bounded domain evaluator imports no database, web framework, environment, credential, network, provider, repository, Passport or deployment primitive. It rejects unknown object members and malformed/oversized inputs, verifies complete reconciliation integrity for verified inputs, sorts obligations/evidence deterministically and fails closed for sample, fallback, AI-advisory, incomplete, missing, non-passing, unknown-scope or unpersisted state.

`IL-7.2` adds internal append-only validation, review and ReleaseAssessment persistence. SQL and domain validation bind records to existing same-scope evidence, snapshot and reconciliation dependencies. An immediate transaction rechecks the current dependency set and assessment predecessor before insertion; update/delete triggers protect history. Repository hydration revalidates canonical bytes and complete referenced records. The service is composed in the API process but has no route, browser resource, credential, provider/network call, filesystem scan or execution primitive. A stored assessment denies release, Passport, deployment and AI authority.

`IL-7.3` adds an append-only Passport table and internal projection service. SQL requires one exact existing same-scope assessment identity/revision/digest/status/input digest; domain hydration reconstructs the Passport only against that verified assessment. Update/delete reject, concurrent same-assessment creation converges, and derived stale association writes nothing. The Passport is explicitly unsigned and non-approving.

`IL-7.4` adds strict Mission-scoped assessment/Passport routes and one browser workspace. Assessment commands accept exactly `{}` and derive every readiness input from existing repositories; Passport commands identify only the exact assessment revision. Closed response schemas, independent browser validation, exact Mission binding and server-owned state prevent caller-authored readiness or client recomputation. The structural JSON download contains no source body, credential or private absolute path and fixes unsigned/non-approval warnings. It is not a general exporter. No validation/review intake, credential/provider/network path, registered-repository write, signature, approval or deployment primitive is added.

`IL-7.5` adds verification tooling, not product attack surface. The generator uses operating-system temporary fixtures, invokes only focused local tests, traps external fetch in the real cross-layer path, writes relative source names and SHA-256 digests, and rejects private-path or credential-shaped evidence output. It proves controlled restart, Project/Mission isolation and canonical-corruption failure without adding a route, table, background process, transport or credential lookup. `IL-7.6` changes documentation only. The [Readiness and Release Passport guide](../product/READINESS_AND_PASSPORT_GUIDE.md) preserves these authority and recovery limits for operators.

`IL-8.1` adds inert package data and a local hash generator. The controlled retail fixture is explicitly synthetic and source-independent; automated checks reject private absolute paths, credential shapes and company identifiers. Validation drafts fix `executed: false`, and expected states fix `EXPECTED_DEMO_SEQUENCE_NOT_PRECOMPUTED_PRODUCT_STATE`.

`IL-8.2` adds one production write/reset exception for that fixed fixture. Its root is derived from the API database directory and fixed fixture ID; callers cannot provide a path, Project ID or alternate fixture. An ownership marker outside the generated repository must match exact fixture identity/version/ownership before recursive removal. Migration `013` retains ordinary immutability and permits deletes only inside a transaction holding authorization for the recorded demo Project. Integration proof covers rejected caller scope, direct immutable-delete rejection, restart, foreign-key integrity and survival of a non-demo Project. The materializer runs fixed Git initialization commands but never package install, shell input, repository script or source execution.

`IL-8.3` adds server-owned correction and staleness transitions for only that recorded fixture. The correction writes fixed fixture files and Git metadata, imports bounded synthetic evidence/validation/review records, and invokes normal product services; it accepts no caller content, path, command, identity, status or credential. Staleness writes one fixed uncommitted marker below the validated generated root and derives current status without rewriting assessment or Passport bytes. The Chromium golden proof audits every browser request and records zero non-loopback destinations and zero authorization headers. External AI remains frozen off. Optional Evidence Replay defaults off and, when explicitly enabled, uses four existing Twin GET requests with no canonical mutation or readiness/Passport authority. Advisory disagreement and remediation preview also default off, operate only in browser memory and contain no request or persistence client. The preview rejects uncited/execution-shaped/authority-bearing data and performed zero repository/network action in controlled proof. Failure traces are retained only on failure and must be reviewed before sharing.

`IL-8.4` removes inherited parent-process environment data from the fixed demo Git subprocesses. They receive only deterministic Git dates, non-interactive/local configuration and an explicitly empty credential helper. The regenerated 17-test API/migration and four-test Chromium golden proof passes with that narrower environment. The competition UI additionally exposes non-color status text/symbols, explicit error/no-inference guidance and keyboard focus restoration; this is accessibility and least-data hardening, not new product authority.

`IL-8.5` closes the bounded demonstrable-core gate. The paced Chromium path actively blocks non-loopback requests, observes zero attempted external destinations and authorization headers, and recovers from a deliberate API stop at `READY` using the same database. A fixed synthetic environment sentinel is absent from captured API/web logs, response text, rendered content and the entire isolated data directory. Application-source digest, Git-status bytes and the regenerated controlled registered-repository tree match before/after. These are local synthetic controls, not an OS sandbox, universal DLP or production certification.

`IL-8.6` adds no product authority or external transport. A production-build capture uses only the fixed synthetic fixture and loopback, records zero non-loopback requests/authorization headers, and produces seven reviewed screenshots with exact hashes, dimensions, fixture identity and source-file-set revision. The script-free fallback viewer is validated from local files with the API stopped. Screenshots may contain synthetic structural IDs/digests and are reviewed presentation material; hashes do not prove semantic truth or production behavior.

`IL-9.3` adds documentation verification tooling only. It reads repository documentation, API route declarations, package-script names and the existing screenshot files, then writes relative paths, counts and SHA-256 values to `EV-DOCUMENTATION`. It opens no product socket, credential, private repository or external connection and grants no runtime, release or compliance authority.

The pure evaluator output cannot authorize action: it remains `NOT_PERSISTED` and `EVALUATION_ONLY_UNTIL_PERSISTED`, with release-decision, Passport and deployment authority false and AI authority `NONE`. The supported API never exposes caller-controlled evaluator inputs; `IL-7.2` derives them from verified repositories and `IL-7.4` transports only the persisted assessment and assessment-bound Passport resources.
