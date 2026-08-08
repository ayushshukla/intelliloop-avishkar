# IntelliLoop Initial Security and Privacy Review

**Document ID:** `DOC-23`  
**Story boundary:** release candidate through `IL-9.2`  
**Status:** `RELEASE_AUDIT_PASS_WITH_DISCLOSED_LIMITS`  
**Evidence date:** 2026-08-06  
**Primary machine evidence:** [EV-SECURITY-AUDIT](EV_SECURITY_AUDIT.json), [EV-PRIVACY](EV_PRIVACY.json), [EV-REPO-SAFETY](EV_REPO_SAFETY.json), [EV-TWIN](EV_TWIN.json), [EV-CODEMAP](EV_CODEMAP.json), [EV-RECONCILE](EV_RECONCILE.json), [EV-CITATIONS](EV_CITATIONS.json), [EV-OPENAI-EVAL](EV_OPENAI_EVAL.json), [EV-GOLDEN-FLOW](EV_GOLDEN_FLOW.json), [EV-ACCESSIBILITY](EV_ACCESSIBILITY.json), [EV-DEMO-GATE](EV_DEMO_GATE.json), [EV-DEMO-SUPPORT](EV_DEMO_SUPPORT.json)

## Review decision

The `IL-9.2` source/prototype audit passes, and its `IL-9.4` refresh remains passing. Full and production npm advisory queries report zero vulnerabilities after exact development-tool remediation. The complete lockfile inventory has 222 dependency instances, 220 unique package/version pairs and zero unknown/unapproved licenses. Candidate scanning now covers 379 files with zero non-fixture secret, private-path or prohibited-file findings. The source-independent manifest remains zero reuse/zero adaptation, the bounded marker/header similarity review has zero findings, and fresh privacy/repository-mutation proofs pass.

The current localhost evidence-ingestion boundary passes its controlled privacy and repository-safety corpora. Raw fixed secret sentinels are absent from captured logs, API responses, the closed SQLite database/sidecars and temporary transfer projections. Repository registration and observation remain read-only under the separate generated proof. These are bounded implementation results, not a penetration test, complete secret scan, operating-system sandbox or release security certification.

## Reviewed attack surface

| Surface | Current implementation | Review result |
|---|---|---|
| Network binding | Fastify and Vite bind to loopback for the supported workflow | `PASS` |
| Authentication | None; local single-user trust model only | `LIMITATION` |
| Evidence input | Declared Markdown/text/JSON, strict UTF-8, 256 KiB domain ceiling | `PASS` |
| Redaction | Ordered 11-rule catalog before persistence and digest | `PASS_WITH_LIMITATIONS` |
| Logs | Fixed allowlist with no request/response body, header, query value or raw exception | `PASS` |
| Persistence | API-owned SQLite; prepared redacted content plus complete canonical Twin, source-free code-map and reconciliation/impact documents; insert-only lineage | `PASS` |
| API | Strict schemas, stable errors, bounded pages, redacted success resources and dedicated Twin/code-map/reconciliation/cited-explanation integrity failures | `PASS` |
| Browser | Escaped text rendering, preview invalidation, raw-field clearing and fail-closed attributed Twin/code-map/citation verification | `PASS_WITH_LIMITATIONS` |
| Repository | Canonical read-only allowlist, three fixed Git reads and bounded static source acquisition with no writes/execution | `PASS_WITH_LIMITATIONS` |
| Code-map scanner | Five text extensions, explicit skips, exact file/byte/time ceilings, canonical containment and source-free API selection | `PASS_WITH_LIMITATIONS` |
| Code-map projection | Source-free exact-snapshot persistence, strict paged API, accessible list, immutable integrity checks and visibly non-equivalent consent-gated fallback | `PASS_WITH_LIMITATIONS` |
| Export/provider | Exact local redacted pack disclosure is implemented as `NOT SENT`; no general export, live transport or provider credential exists | `PARTIAL_IMPLEMENTED_SAFE_OFF` |
| Runtime observations | Strict offline JSON import only; no connector/poller/stream; immutable history and evidence-only authority | `PASS_WITH_LIMITATIONS` |
| Twin vocabulary | Exact variants, bounded serialization, revision binding and cross-scope rejection used by the canonical store and list resource | `PASS_WITH_LIMITATIONS` |
| Twin projection | Deterministic materialization, complete immutable SQLite documents, bounded list routes and exact scope/dependency/integrity checks | `PASS_WITH_LIMITATIONS` |
| Reconciliation/impact | Deterministic bounded evaluation, exact persisted selectors, immutable aggregate history and strict browser finding/path review; no validation-result intake or decision controls | `PASS_WITH_LIMITATIONS` |
| Readiness | Repository-derived immutable assessment and unsigned Passport API/UI; controlled demo proves `BLOCKED → READY → STALE` | `PASS_WITH_NON_AUTHORITY_LIMITS` |

## EV-PRIVACY negative corpus

The deterministic generator exercises the following redaction categories through production domain code:

- secret-bearing JSON keys;
- PEM private keys;
- OpenAI token forms;
- GitHub token forms;
- npm/GitLab/Stripe service-token forms;
- Slack token forms;
- AWS access-key identifiers;
- JSON Web Tokens;
- authorization and bearer values;
- credential-bearing HTTP URLs; and
- generic secret/password/token assignments.

The end-to-end case separately sends one synthetic secret through preview, commit, idempotent replay and retrieval. A second secret plus absolute private-path sentinel exercises non-revealing rejection. The run scans the exact fixed tokens in UTF-8 and UTF-16LE form across safe log lines, response bodies, the SQLite file, SQLite sidecars and transfer fixtures. The report itself is scanned before it replaces [EV_PRIVACY.json](EV_PRIVACY.json).

## Transfer and network boundary

No production export or AI-pack endpoint exists. EV-PRIVACY temporarily projects the redacted successful API resource into:

- a verification-only export fixture; and
- a verification-only AI-pack fixture marked `NOT_TRANSMITTED` and `ADVISORY_ONLY`.

These projections test data selection only. They are deleted with the synthetic database, are not imported by product runtime and must not be treated as an API or provider contract. The generator installs a fetch trap and requires zero calls. No credential is accepted or read.

## Repository-mutation and source boundary

[EV-REPO-SAFETY](EV_REPO_SAFETY.json) remains the authority for repository non-mutation, traversal/symlink rejection, private-path omission and unsupported write methods. IL-3.6 adds no repository operation, migration, shell surface, command input, file upload or registered-code execution.

`IL-3.7` adds migration `007` and three mission evidence routes for historical summaries. It adds no repository operation, filesystem read, registered-code execution or product-network path. Fastify schemas and domain validation reject unsupported source origins, private locators, extra/readiness fields and out-of-bound summaries without echoing supplied values. The focused proof traps fetch at zero calls.

`IL-4.1` adds only domain types, invariant checks and canonical serializers. It adds no migration, repository operation, route, browser surface or product-network path. Focused negative vectors reject unknown fields/versions, unsafe logical-source metadata, endpoint substitution and all thirteen relationship types across Project or Mission scope. Confidence is structurally limited to extraction/match quality and cannot be labeled as truth probability.

`IL-4.2` was domain-only and added no migration, route, filesystem/process operation, logging field or product-network path. It revalidates complete source entities before projection, rejects missing/cross-scope dependencies, caps collections and canonical bytes, and verifies member, endpoint, predecessor and projection digests on hydration. Projection JSON contains only already-redacted attribution and logical references; the following `IL-4.3` review covers its persistence/API serializers.

`IL-4.3` adds migration `008`, a Mission-scoped materialization service, five strict routes and an attributed browser list. The write endpoint accepts no body, graph, path, identity, timestamp or readiness field. Materialization pages only through existing local repositories, executes no shell or checkout scan and performs no provider/network call. The repository stores the complete bounded canonical projection, validates the live predecessor in an immediate transaction and rehydrates/verifies the entire envelope before any list resource is returned. Storage mismatches and forged client resources produce the non-revealing `INTEGRITY_ERROR` state; no partial graph or stored diagnostic is returned.

`IL-4.4` introduces controlled repository content reading for the first time. It is restricted to the registered current Mission root, `.ts/.tsx/.js/.jsx/.json`, 2,000 encountered files, 256 KiB per accepted file, 5 MiB accepted bytes and five monotonic seconds. Canonical child equality, root containment, traversal-name validation, symlink/junction rejection, strict UTF-8 and stable read-handle metadata fail closed before a bundle is returned. `.git`, `node_modules` and unsupported extensions are explicitly skipped. The scanner has no child-process or write primitive, route, database table, log field, provider path or readiness effect. Synthetic malicious scripts remain text; complete repository bytes match before and after repeated scans.

`IL-4.5` revalidates the complete transient scan bundle and parses only through TypeScript `createSourceFile` and strict `JSON.parse`. The extractor exposes no filesystem, process, compiler-host, emit, plugin, module-loader or network primitive. Its output omits source and package commands, omits unsafe path/URL-shaped dependency ranges, caps diagnostics/records/nodes/time and fixes authority to syntax only with runtime behavior unobserved. Dynamic imports, `require`, computed routes, aliases and untyped lookalikes cannot become claimed runtime facts. The focused proof covers golden structure, malformed partial recovery, order invariance, tamper rejection, deadline and inert malicious content. No route, database table, Twin member, provider path or readiness effect exists.

`IL-4.6` captures immutable Git observations before and after extraction and rejects changed head/status state before persistence. Migration `009` binds the complete source-free projection to the exact second snapshot and enforces append-only mode/predecessor/scope constraints; hydration recomputes identities and digests. The declared path requires explicit enablement, the package-owned manifest and an allowlisted safe-failure code, and is labeled as synthetic evidence with inference unavailable. It never handles repository movement, scope/registration errors, malformed input, database or integrity failures.

`IL-4.7` adds strict Mission-scoped run/revision/asset/edge routes and an accessible attributed list beside the existing Twin. The default run sends no body and cannot use fallback. Declared fallback additionally requires exact per-run `INTELLILOOP_CONTROLLED_FIXTURE` consent, preventing a configured fixture from silently replacing failed personal-repository inference. Responses omit source bodies, scripts, absolute roots, changed filenames and diagnostics; static identifiers, logical paths and literal routes remain potentially sensitive structural metadata. Client and server validate exact mode/status/completeness coherence, canonical tamper becomes `INTEGRITY_ERROR`, pagination is bounded and no graph/provider/readiness surface is introduced.

`IL-5.1`-`IL-5.4` are domain-only reconciliation/impact contracts. They add no migration, route, log field, filesystem/process operation, product-network path, credential access or provider call. `IL-5.3` verifies Twin integrity, exact source/snapshot/relationship/validation bindings, bounded explicit support declarations and predecessor result digest. `IL-5.4` revalidates exact Twin/code-map/snapshot/reassessment bindings, limits traversal to the frozen typed policy and depth, excludes AI-advisory roots and retains complete citations. Fixed collection limits, explicit-only obligations and exact-diff-only staleness prevent silent authority expansion.

`IL-5.5` adds local persistence and API only. Migration `010` stores a canonical combined aggregate under exact Twin, code-map and snapshot foreign keys, retains code-map trust labels and component/result digests, enforces predecessor/count coherence and rejects update/delete. Immediate transactions make same-input replay idempotent and changed-input append atomic; hydration verifies the entire canonical document before returning a revision, finding or path.

The POST schema requires persisted selectors and explicit bounded support, root and impact-requirement arrays. Caller-supplied semantic relationships, findings, paths and unknown members reject. The service reconstructs only exact selected-Twin evidence/claim/supersession sources and rejects scope, binding or source mismatch. The reconciliation execution route is not integrated with the later internal IL-7.2 validation store, so selected Twin validation state that it cannot reconstruct still fails closed. Five Mission-scoped routes page revisions, findings and paths at 1-100 members with non-revealing errors.

`IL-5.6` adds a browser surface over those routes. Canonical member digests prevent a source digest from being substituted as a Twin-member citation. The client rejects unknown fields, unsupported reason/type combinations, mismatched basis citations, discontinuous path steps, incoherent terminal validation, count drift and unresolved supporting-path references before rendering. The form is bounded to explicit declarations and has no free-form graph/finding/path body, external call, repository mutation, credential use, finding mutation or readiness authority.

`IL-6.1` adds a pure in-memory product evidence-pack compiler and citation registry. It reruns entity/Twin/aggregate integrity, requires the complete exact Twin source set, omits full evidence bodies and repository roots, applies second-pass secret/private-path redaction to the question and selected JSON keys/values, and rejects item/count/byte/conservative token-unit overflow without truncation. Citation resolution is allowlist-only and item-digest-bound. No endpoint, persistence, provider adapter, credential or network transfer is introduced; the earlier `EV-PRIVACY` AI-pack object remains a distinct verification-only fixture.

`IL-6.2` adds a pure deterministic renderer over the verified pack. Only six fixed questions are accepted; every answer/fact/inference/conflict/gap/action statement is bounded and cited to the pack allowlist. Complete rerender equality and citation resolution reject tampering or invented output. Engine metadata fixes AI off, provider none and no external call, and the contract exposes no readiness field. This adds no endpoint, persistence, credential, provider or transport attack surface.

`IL-6.3` adds a pure provider-neutral request and mock response validator. The adapter defaults disabled and exposes only `MOCK_VALIDATION`; a static boundary rejects fetch, HTTP(S), environment, credential and authorization APIs. Requests bind the exact verified redacted pack, allowlist, closed schema, limits and canonical digests. Responses reject unknown/readiness authority fields, identity/digest/schema mismatch, unknown or incoherent citations, unsafe mock metadata, usage overflow and size limits. Concurrency, timeout, retry, input and session budgets are bounded, and all failures retain the `AI_OFF` answer without raw transport errors. No application route, persistence, log, credential or external call is introduced.

`IL-6.4` adds one strict local cited-question route and browser workflow. Complete Twin-bound sources are verified before `evidence-pack-compiler-policy.v2` selects a fixed-question-relevant minimized projection under the unchanged 12,000-unit ceiling. Production injects disabled provider mode; responses disclose exact pack JSON as `NOT SENT`, carry used citations only and cannot mutate canonical state. The client rejects unknown citations, identity drift, private paths and readiness-shaped success fields before rendering. `EV-CITATIONS` proves all six questions, controlled mock/failure paths, zero external calls and zero reconciliation revision mutation.

`IL-6.5` adds no provider transport, credential input, route, configuration flag or persistence. Its pure checkpoint contract requires the passing G3/privacy/citation/preview boundary and records `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` with a canonical digest. The generator imports no environment/network API, records every live-provider metric as `NOT_MEASURED`, rejects non-fixture credential-like repository text and excludes exact pack/provider bodies. Generated `EV-OPENAI-EVAL` records zero credential access, external calls and canonical mutation.

`IL-6.6` finalizes the transfer inventory and authority/course-correction documentation without adding a product surface. Its checker binds the documents to generated checkpoint evidence/backlog state and rejects credential-like text, private absolute paths and raw private-body markers on the final story documents. This bounded scan is not universal DLP; production remains safer because no live transport or credential input exists.

The source strategy remains independent: candidate, employer, client, personal and quarantined roots were not used for this proof. All corpus values, database records and transfer projections are IntelliLoop-authored synthetic fixtures.

## Residual risks and required future work

- Pattern matching can miss split, encoded, transformed, novel or context-specific secrets and can redact harmless values.
- A fixed sentinel absence test cannot prove universal data-loss prevention.
- JavaScript/browser memory is not securely erased when a form field is cleared.
- A privileged local actor can inspect process memory or replace application/database files.
- No authentication means loopback confinement and local-machine trust remain required.
- The local pack/explanation serializer is now covered by `EV-CITATIONS`, but general exporters and any live provider transport must rerun this gate against their actual transport; `NOT SENT` disclosure does not authorize transfer.
- The offline checkpoint is not a security review of an OpenAI transport because no transport ran. Any future superseding live decision must review the actual SDK/request serializer, current data terms, credential injection and network logs before transfer.
- Imported runtime summaries can be incomplete, forged, mis-sampled or produced by faulty instrumentation; attribution and recency do not establish authenticity or correctness.
- A structurally valid and integrity-verified Twin record, static edge, finding, impact path or ReleaseAssessment can still be semantically false or incomplete; supported validation/review intake and readiness presentation remain future review surfaces.
- SQLite integrity verification detects contract-level corruption but is not storage repair, cryptographic authenticity, access control or protection from a privileged local attacker replacing both code and data.
- Filesystem containment and before/after byte equality do not create an operating-system sandbox. A privileged concurrent actor can still race or replace host resources; stable-handle and final-root checks reduce but cannot eliminate every host-level time-of-check/time-of-use risk.
- Code-map source may itself contain secrets. Source stays transient and the `IL-4.7` API/UI selects only source-free static identifiers, logical paths and literal routes, but those records can still be sensitive. `IL-6.1`-`IL-6.4` establish minimized/redacted question selection, deterministic rendering, mock validation and exact local preview; any live-provider story still requires explicit enablement and transport review before widening that boundary.
- A future live connector, if ever authorized, requires a separate threat model for authentication, replay, transport secrecy, rate limits, retention and network isolation; none exists now.
- A final dependency/license/provenance/secret/security audit remains owned by `IL-9.2`.
- Official competition rules remain unavailable; `OFFICIAL_AVISHKAR_RULES_UNVERIFIED` remains an explicit limitation.

## Reproduction

From the workspace root:

```powershell
npm.cmd run evidence:privacy
npm.cmd run evidence:repo-safety
npm.cmd run evidence:twin-code-map
npm.cmd run check
npm.cmd run test:e2e
npm.cmd audit --omit=dev
```

The generated JSON reports are evidence only when their commands exit zero. Hand editing a report does not establish a passing result.

## IL-6.7 review delta

The synthetic-edge-case transformer has no network, provider-adapter or environment dependency and receives only the existing verified redacted evidence pack. Output is bounded, canonically digested and restricted to cited finding/path categories. API and client validation require exact identity/digest bindings, reject private paths and unknown citations, and require all authority flags false. The result is transient and exposes no action that can create evidence, mutate a finding, decide readiness or issue a Passport. Extended `EV-CITATIONS` proves 23/23 resolved suggestion citation uses across six fixed question sets with provider `NONE` and unchanged reconciliation revision count.

## IL-7.1 review delta

The readiness evaluator is a pure standard-ECMAScript domain module. Exact-object validation, bounded collections/output, complete aggregate invariant checks, canonical ordering/digests and stable blocker codes constrain malformed or ambiguous inputs. Static boundary tests reject network, environment, credential, provider, Fastify, React, SQLite, repository, Passport and deployment primitives. Sample/placeholder, AI advisory, controlled fallback, incomplete or unpersisted source inputs cannot produce candidate `READY`.

This does not eliminate authorization risk. The pure function accepts persistence and freshness assertions supplied by its caller, so its result cannot safely cross an API or browser boundary by itself. The result structurally records `NOT_PERSISTED`, denies release/Passport/deployment authority and contains no execution capability. `IL-7.2` therefore wraps it only after sourcing those assertions from authoritative repositories.

## IL-7.2 review delta

Migration `011` and the internal readiness service add SQLite write/read surface but no HTTP, browser, credential, provider, filesystem or registered-repository operation. Validation rows require an exact existing attributed source and Mission snapshot. Reviews require one exact reconciliation result and target snapshot. ReleaseAssessment insertion uses an immediate transaction to recheck the latest reconciliation, current snapshot, selected review, every required validation and live predecessor. All three tables reject update/delete.

Canonical hydration re-runs domain invariants and exact dependency bindings; malformed history fails closed. Historical staleness compares a newly repository-derived evaluation and never updates the original record. Same-input concurrency converges on one revision, forced insertion failure rolls back, and restart reproduces exact bytes. Residual risk remains: local single-user storage has no authentication, an attributed review does not prove reviewer identity, persisted validation does not prove test authenticity, and no internal assessment is release approval or safe for presentation until the later API/UI authority boundary is implemented.

## IL-7.3 review delta

Migration `012` adds only an internal append-only Passport projection. Each row must match one existing same-scope ReleaseAssessment identity, revision, digest, status and complete input digest. Canonical hydration first verifies the assessment and all its dependencies, then reconstructs the Passport and compares duplicated SQL fields. Retry/concurrency converges on one row; update/delete reject; stale association is derived without a write.

The Passport module copies the assessment and imports no readiness evaluator, provider, network, environment, credential, filesystem or deployment primitive. Authority fixes it as unsigned, non-approving and `REPRODUCED_NOT_RECOMPUTED`. At the `IL-7.3` checkpoint, residual risk included the absence of a supported presentation boundary; a local digest was and remains integrity evidence, not a signature or independent attestation, and assessment quality still depends on stored evidence/review authenticity. `IL-7.4` adds strict local presentation while later gates retain full proof.

## IL-7.4 review delta

Seven strict Mission-scoped readiness/Passport operations expose only repository-hydrated assessment and Passport resources. Empty command bodies prevent readiness-input injection; list/detail responses bind Mission, revision, identity and digests; browser decoders reject unknown members, private absolute paths, inconsistent blockers/citations and any authority elevation. Status comes from the service-owned assessment state and is not recomputed in React. The structural JSON projection fixes source-body, absolute-path and credential flags false and repeats unsigned/non-approval warnings.

Residual risks remain: localhost has no authentication; a local download can be copied outside its intended context; a digest is not a signature; stored validation and reviewer attribution do not prove authenticity; and `IL-7.4` route tests plus the browser matrix are not the full restart/isolation/tamper proof owned by `IL-7.5`. The implementation adds no live provider, external transfer, source-body export, validation/review intake, approval/signing or deployment authority.

## IL-8.5 review delta

The combined demo gate reruns the complete registered-repository equality and privacy negative corpora, then starts the production-built API with an isolated data directory and the browser through the normal local web proxy. Chromium actively blocks non-loopback requests and records attempted destinations plus authorization headers. The API is stopped at `READY`; the browser must show an explicit unavailable state, the same database is restarted, and the visible retry action must restore the exact `READY` workflow before staleness continues. Reset is followed by a second restart and must remain `EMPTY`.

One fixed synthetic environment sentinel is supplied to both local processes. The gate scans captured logs, response bodies, rendered text and all isolated database/sidecar/generated-workspace bytes in UTF-8 and UTF-16LE form. Application-source tree and Git-status bytes must match before and after runtime; the generated fixture repository is the only intentional write surface and exists inside the disposable API data directory. These controls do not constitute an operating-system sandbox, universal DLP, penetration test or production certification.

## IL-8.6 review delta

The support generator launches only the production-built local API/web path with an OS-temporary data directory and bundled Chromium. Browser routing aborts non-loopback HTTP(S) requests and records authorization headers; the observed counts are zero. The generator uses the fixed IntelliLoop-owned fixture, never accepts a caller repository/path or credential, and never executes fixture code.

Fallback images are presentation artifacts and can disclose the synthetic Mission title, structural identifiers, digests and recorded timestamps visible in the product. They contain no source bodies or private absolute paths, but should still be shared only as reviewed competition material. The manifest records byte hashes and application-source identity; neither proves semantic truth, screenshot authenticity against a malicious local actor or production behavior.

The standalone viewer contains no script or external resource. Its executable check stops the API and requires all seven local images to load at exact dimensions, while the live app separately exposes `UNAVAILABLE` and no inferred readiness. This adds no runtime endpoint, provider, credential, persistence, approval, signing or deployment surface. Residual Phase-9 work includes the final dependency/license/provenance/secret audit, official-rules review and release-candidate artifact refresh.
