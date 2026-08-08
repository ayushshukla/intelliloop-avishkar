# IntelliLoop Domain Model - Lifecycle, Evidence, Twin, Reconciliation and Explanation

**Audience:** Developers, reviewers and future trust-model maintainers  
**Status:** `IMPLEMENTED` for deterministic primitives, lifecycle/evidence entities, generalized Twin vocabulary, immutable Twin/code-map revisions, deterministic impact analysis, persisted reconciliation/impact revisions, redacted pack/citations, offline explanation, mock provider validation, strict cited-question delivery and synthetic advisory sets  
**Implemented stories:** `IL-1.3`, `IL-2.1`, `IL-2.4`, `IL-3.1`, `IL-3.2`, `IL-3.3`, `IL-3.7`, `IL-4.1`, `IL-4.2`, `IL-4.3`, `IL-4.4`, `IL-4.5`, `IL-4.6`, `IL-4.7`, `IL-5.1`, `IL-5.2`, `IL-5.3`, `IL-5.4`, `IL-5.5`, `IL-5.6`, `IL-5.7`, `IL-6.1`, `IL-6.2`, `IL-6.3`, `IL-6.4`, `IL-6.5`, `IL-6.7`, `IL-7.1`, `IL-7.2`, `IL-7.3`, `IL-7.4`, `IL-7.5`, `IL-7.6`  
**Evidence date:** 2026-08-06

This document separates implemented deterministic primitives, lifecycle/evidence authority, immutable Twin/code-map projection, bounded impact analysis and reconciliation/impact persistence from later presentation and readiness authority. A projected graph, finding or path is not proof that its evidence is true or that a release is ready.

## Implemented primitives

### Stable identity

Stable IDs are canonical lowercase UUID v4 strings carried as branded TypeScript values. Creation is source-injected; the domain package does not call a random generator. This makes tests deterministic and leaves runtime randomness to a later infrastructure adapter. Invalid input fails with a fixed message that does not echo the value.

### Injected UTC clock

The domain `Clock` reads from an injected `Date` source and returns canonical `YYYY-MM-DDTHH:mm:ss.sssZ` timestamps. Offset, missing-millisecond and invalid forms are rejected at contract boundaries. The domain has no hidden current-time call.

### Canonical JSON and digest

Canonical JSON accepts only finite, acyclic JSON data:

- object keys sort recursively by ECMAScript string order;
- arrays preserve order and reject holes, accessors and extra properties;
- objects must be plain or null-prototype data objects with enumerable data properties;
- `undefined`, functions, symbols, big integers, non-finite numbers, cycles and class instances fail closed;
- JSON number/string escaping follows the pinned ECMAScript runtime.

The SHA-256 primitive hashes UTF-8 bytes through Web Crypto and emits lowercase `sha256:<64 hex>` values. The implementation does not claim RFC 8785 conformance; its authored rules and fixed vectors are the authority until a later versioned canonicalization story changes them.

### Scoped provenance metadata

The shared foundation metadata contract contains:

| Field | Meaning |
|---|---|
| `stableId` | Immutable record UUID |
| `scope.projectId` / `scope.missionId` | Exact owning scope; no unknown/global fallback |
| `origin.kind` | How the record entered the system |
| `sourceReference` | Bounded logical source locator |
| `sourceRevisionOrDigest` | Explicit source revision or canonical content digest |
| `recordedAtUtc` | When IntelliLoop recorded the metadata |
| `effectiveAtUtc` | Optional source-effective time, kept distinct from recording time |
| `extractionMethod` | Bounded uppercase method token |
| `epistemicLabel` | `FACT` or `INFERENCE`; origin alone never establishes truth |

Supported origin kinds are `USER_INPUT`, `REPOSITORY_OBSERVATION`, `VALIDATION_RESULT`, `SYSTEM_DERIVATION`, `SYNTHETIC_FIXTURE` and `AI_ADVISORY`. AI advisory origin does not grant canonical authority.

Every origin and revision variant is handled through exhaustive discriminated-union serialization. Unsupported variants fail rather than falling through to an ambiguous representation.

## Implemented Project and Change Mission lifecycle

### Entities

| Entity | Identity and scope | Lifecycle | Revision rule |
|---|---|---|---|
| `Project` | Branded Project UUID and bounded name | `ACTIVE` to terminal `ARCHIVED` | Starts at 1; archive returns revision 2 |
| `ChangeMission` | Branded Mission UUID, exact Project UUID and bounded title | `CURRENT` to terminal `ARCHIVED` | Starts at 1; archive returns revision 2 |

Both entities carry canonical `createdAtUtc` and `updatedAtUtc`; archived entities also carry `archivedAtUtc`, which must equal the update time of that archive revision. Objects are frozen and transitions return successors without mutating the earlier revision.

### Aggregate invariants

- a Project has zero or one `CURRENT` mission;
- a second current mission is rejected rather than replacing history implicitly;
- archiving the current mission leaves no current mission and preserves the archived revision;
- a new current mission may be created only after the prior one is archived;
- a Project may be archived only when it has no current mission;
- archive is terminal in the current lifecycle; no hard delete or reopen operation exists;
- every supplied mission must match the exact Project scope;
- duplicate mission IDs, multiple current missions and an archived Project with a current mission fail closed;
- creation and archive time cannot move backwards relative to Project or mission history.

Current mission is derived from the validated mission collection. It is not stored as a second mutable pointer on the Project, avoiding competing authority.

### Stable failures

Lifecycle failures use `ProjectDomainError` with bounded codes such as `CROSS_PROJECT_REFERENCE`, `CURRENT_MISSION_EXISTS`, `PROJECT_HAS_CURRENT_MISSION`, `DUPLICATE_MISSION_ID` and `NON_MONOTONIC_TIME`. Messages do not echo rejected names, titles, identities or timestamps.

## Implemented GitSnapshot entity

`GitSnapshot` is an immutable, Project- and Mission-scoped repository observation. It binds one registered repository identity to one capture time and records:

| Field | Meaning |
|---|---|
| `snapshotId` | Stable UUID for this observation; repeated captures create distinct records |
| `projectId`, `missionId`, `registrationId` | Exact owning scope and repository binding |
| `capturedAtUtc` | Injected canonical UTC observation time |
| `headState` | `ATTACHED`, `DETACHED` or `UNBORN` |
| `branchName` | Present for attached and unborn state; absent when detached |
| `headCommit` | Lowercase SHA-1 or SHA-256 object identity; absent when unborn |
| `dirty` | Derived from whether the changed-file count is nonzero |
| change counts | Index, worktree, untracked and distinct porcelain-record counts |
| `changedFilesDigest` | Canonical SHA-256 digest over normalized, sorted status entries |

The digest input includes each status pair, current path and rename/copy origin where present. Entries sort canonically before hashing, so equivalent status sets produce the same digest regardless of arrival order. Raw paths and the changed-entry collection are deliberately absent from the persisted public resource; `IL-2.4` establishes a bounded summary, while exact changed-file evidence remains a later story.

Head invariants fail closed: attached requires branch and commit, detached requires only commit, and unborn requires only branch. Counts are non-negative integers bounded by the changed-file count, and `dirty` must equal `changedFileCount > 0`. Creation validates the complete entity, freezes it, and persistence provides insert/read only; database triggers reject update and delete.

GitSnapshot is repository observation, not validation evidence or readiness. A clean snapshot does not mean tests passed, requirements are satisfied or a release is safe.

## Evidence preparation value

`prepareEvidenceImport` accepts an `EvidenceImportFormat` plus a `Uint8Array` and returns an immutable `PreparedEvidenceImport` only after every boundary succeeds. The value contains the normalization version, declared format, input and normalized byte counts, redacted normalized content, content digest and ordered redaction rule counts. It contains no raw-input field.

The operation accepts only `MARKDOWN`, `TEXT` and `JSON`, is strict about UTF-8 and structural ambiguity, and has fixed resource ceilings. JSON object keys and string values receive the same NFC/line-ending normalization as text; object keys then sort through canonical JSON. The content digest covers normalization version, format and redacted normalized content, so it cannot be confused with a raw file hash.

`PreparedEvidenceImport` is not an `EvidenceSource`, `Claim`, validation result or persisted entity. It has no Project/Mission attribution by itself. Successful preparation says nothing about truth, applicability, freshness, approval or readiness.

## EvidenceSource and timeline entities

`EvidenceSource` binds one revalidated prepared value to immutable Project/Mission scope and attribution. It carries stable source identity, `evidence-import-key.v1`, origin, logical non-path locator, optional source revision/effective time, recorded time, `DIRECT_IMPORT`, an epistemic label and the complete redacted prepared representation. Entity creation deep-freezes the value and recomputes both prepared-content and import-key digests.

The import key excludes generated identity and recorded time so retry/concurrency can return the exact original record. It includes scope and immutable attribution, so a changed Mission, locator, revision, effective time or prepared representation does not silently alias the prior source. Redaction may deliberately make two raw secret variants converge; there is no raw-input digest.

`EvidenceTimelineEvent` currently has one allowed event type, `EVIDENCE_IMPORTED`. It carries stable event/source identities, exact scope, Mission-local positive sequence and occurrence time equal to the source's first recorded time. Source and event append in one transaction. They have no update/delete domain operation.

The source epistemic label describes the artifact record, not assertions inside its content. `FACT` does not promote imported sentences to facts. See the [partial trust model](../product/TRUST_MODEL.md).

## Claim and explicit supersession intake

`Claim` is an immutable structured assertion extracted manually from one persisted `EvidenceSource`. It inherits exact Project/Mission scope, source identity, origin, logical locator, optional revision, content digest and optional effective time. Intake also records its own stable identity/time, `MANUAL_STRUCTURED_INTAKE`, explicit `FACT` or `INFERENCE`, and a verbatim 1-4096-byte excerpt that must occur in the source's already-redacted normalized content. The excerpt is evidence context; it is not independently normalized or treated as true.

The deterministic `claim-normalization.v1` contract is intentionally narrow:

- subject, predicate, applicability dimension and dimension value use Unicode NFKC, locale-stable lowercase and punctuation/whitespace collapse to dot-delimited terms of at most 256 UTF-8 bytes;
- the JSON claim value is canonicalized, deeply frozen and limited to 16,384 UTF-8 bytes, depth 16 and 256 nodes;
- applicability contains at most 16 unique named dimensions, sorted by normalized dimension/value, plus optional canonical UTC `effectiveFromUtc`/`effectiveUntilUtc` with start strictly before end; and
- the complete canonical applicability document is limited to 4096 UTF-8 bytes.

`claim-comparison-key.v1` hashes only normalized subject and predicate. `claim-applicability-key.v1` hashes the exact normalized applicability document. Keeping these keys separate allows later rules to ask whether two applicability regions overlap without making that policy part of intake. `claim-digest.v1` binds source/excerpt digest, structured statement, value, applicability, effective time, extraction method and epistemic label. `claim-import-key.v1` additionally binds exact scope and optional predecessor so retry can return the original record.

Conflicting raw statements and values are preserved as separate claims. Matching keys do not imply compatibility, truth, priority or a winner; those rules remain owned by `IL-5.1`/`IL-5.2`.

`ClaimSupersession` is an attributed append-only intake link with relationship type `SUPERSEDES`. A new successor may cite exactly one existing predecessor only when scope, comparison key and exact applicability key match and recording time does not move backwards. The repository allows at most one direct successor for a predecessor and one direct predecessor for a successor, creating a linear history chain. The link and successor append atomically; a failed link leaves no partial successor. Self-links, cross-scope links, mismatched keys, backwards time and forks reject. No timestamp-only or label-only supersession exists, and all predecessor rows remain readable.

## Implemented reconciliation comparison contract

`IL-5.1` adds a pure domain comparison layer without creating canonical findings. `reconciliation-rules.v1` has a deterministic SHA-256 identity over the complete declared contract and pins the existing `claim-comparison-key.v1`, `claim-applicability-overlap.v1` and `claim-value-comparison.v1` versions.

A pair is comparison-eligible only when it has the same Project and Mission, the exact normalized subject and predicate, the same comparison key and overlapping applicability. Applicability uses two deterministic rules:

- any shared normalized dimension with unequal values makes the scopes disjoint; additional dimensions on only one side narrow that side and do not prevent overlap; and
- effective intervals are half-open. Missing starts/ends are unbounded, while a left end exactly equal to a right start does not overlap.

Value comparison is intentionally conservative:

- canonical JSON equality is `EQUIVALENT`, including object-key order normalization;
- unequal booleans, numbers or strings of the same type are `INCOMPATIBLE`;
- `null` represents an unknown value and remains `AMBIGUOUS` against a different value;
- mixed types are not coerced and remain `AMBIGUOUS`; and
- unequal arrays or objects require a future explicit predicate policy and remain `AMBIGUOUS`.

The contract uses no fuzzy, embedding, recency, source-priority, confidence or AI authority. `IL-5.1` persists nothing and does not interpret an `INCOMPATIBLE` pair as a finding by itself.

## Implemented conflict, supersession and ambiguity contract

`IL-5.2` adds the pure, bounded `claim-reconciliation.v1` evaluation over at most 100 already invariant-checked claims and 99 attributed supersession links in one exact Project/Mission scope. It still recomputes the comparison and applicability keys from normalized claim content before using them, so a malformed caller cannot suppress comparison with a forged digest. Its separately hashed `reconciliation-decision-policy.v1` fixes canonical claim-ID ordering and explicitly gives no authority to timestamps, source priority, confidence or AI.

Before comparison, every successor must have exactly one present attributed link to its named predecessor. The link must pass the existing cryptographic and domain invariant, including exact comparison/applicability keys and non-backwards recording time. Missing or forged links, absent endpoints, duplicate identities, forks, joins and cycles fail the entire evaluation. Valid chains remain append-only history; a claim is active exactly when it has no validated explicit successor. Thus supersession deactivates the exact predecessor applicability and never selects between unlinked claims.

Every unordered claim pair receives one deterministic disposition. A pair containing an inactive historical claim is `SUPERSEDED_INACTIVE`; otherwise the `IL-5.1` comparison becomes `EQUIVALENT`, `NOT_COMPARABLE`, an open `CONFLICT` for incompatible values or an open `AMBIGUOUS` finding. Findings bind the exact claim IDs/digests, comparison key, comparison-rule identity and decision-policy identity under `reconciliation-finding-key.v1`. The complete ordered result also has a canonical digest and is input-order independent.

These are immutable domain values, not database records by themselves. `OPEN` communicates an unresolved active finding, not persistence or release blocking by itself. `IL-5.3` composes them into pure reassessment values, `IL-5.5` persists the complete composed reconciliation/impact aggregate and `IL-5.6` presents it without adding mutation authority. No finding chooses a true claim, rewrites evidence or determines readiness.

## Implemented staleness, missing-support and reassessment contract

`IL-5.3` adds `reconciliation-reassessment.v1`, a bounded pure evaluation over one integrity-checked Twin revision, one exact target `GitSnapshot`, the current invariant-checked claim/supersession set, target-snapshot validation results and an explicit support-requirement set. The reassessment re-runs `claim-reconciliation.v1`; it does not accept caller-authored claim findings as authority.

Support obligations use `EXPLICIT_DECLARATION_ONLY`. An evidence requirement matches only an exact normalized source locator. A validation requirement matches only an exact normalized validation key in the supplied target-snapshot validation set. Absence emits an immutable open `MISSING` finding with the requirement-set and support-policy digests. Presence is independent of `PASSED`, `FAILED` or `INCONCLUSIVE`: the result status remains evidence for a later readiness rule, while the missing rule answers only whether the exact required artifact exists. An empty requirement set creates no guessed obligations.

Each result records exact dependencies for the claim-reconciliation result, comparison rule set, decision policy, support policy/requirement set, projected claim and evidence source nodes, projected supersession relationships, the target snapshot and matched validations. Projected member bindings must match the source entity digest and exact node/relationship revision. The dependency list is canonical and capped before a result is returned.

Exact replay returns the prior reassessment object. A changed input appends the next positive revision with the predecessor key/revision/digest and leaves the predecessor byte-identical. An exact added, removed or changed dependency emits one open `STALE` finding for that predecessor with the canonical dependency diff. A Twin revision that changes only unrelated members still appends a newly bound reassessment, but it does not mark the predecessor stale. JSON restart revalidates the predecessor digest before replay or extension.

The reassessment result, `MISSING` finding and predecessor `STALE` finding remain immutable domain values and are not separately materialized as Twin `ReconciliationFinding` nodes. `IL-5.5` persists the complete reassessment together with its exact impact result in one aggregate revision and exposes bounded API projections. `IL-5.6` presents those projections without readiness effect.

## Implemented impact traversal and validation-gap projection

`IL-5.4` adds `impact-analysis.v1`, a pure bounded evaluation over one exact Twin projection, the code-map projection bound into that Twin, the matching `IL-5.3` reassessment, one exact target snapshot, supplied target-snapshot validation results and explicit impact declarations. Scope, projection IDs/revisions/digests, code-map trust metadata, snapshot digest, source bindings, code-map assets/edges and every supplied validation result are revalidated before traversal.

Authority is fixed to `EXPLICIT_DECLARATION_ONLY`. The caller may declare at most 50 unique roots and 500 unique requirements. A root must resolve to an exact non-AI `Claim` or `SoftwareAsset` node. Each requirement names that root, one exact critical code-map asset, `IMPLEMENTATION` or `VALIDATION` support, and 1-50 exact Twin member citations explaining its basis. Validation support additionally names one exact validation key. Empty declarations produce no inferred obligations or gaps.

`impact-traversal-policy.v1` has a pinned digest and allows only four typed transitions:

| Relationship | Direction and meaning in traversal |
|---|---|
| `AFFECTS` | Follow the authored relationship forward |
| `DEPENDS_ON` | Follow in reverse, from a changed dependency to its dependents |
| `IMPLEMENTS` | Follow whichever endpoint direction reaches a `SoftwareAsset` |
| `VALIDATED_BY` | Follow asset-to-validation forward and stop at that validation |

Traversal is deterministic breadth-first search. It visits an exact node revision once per root, stops after depth 8 and returns one canonically selected shortest path for each satisfied root/requirement pair. `CONCERNS` and every other relationship type are excluded. Paths retain exact node and relationship member IDs, revisions, digests, source references, source revision/digest, origin, extraction method and epistemic label. Dependencies bind the Twin, code map, reassessment, target snapshot, policy, requirement set and cited members.

`IMPACT_GAP` is emitted only against an explicit requirement and uses one of five reasons:

- `CRITICAL_IMPLEMENTATION_ASSET_ABSENT`;
- `CRITICAL_IMPLEMENTATION_PATH_ABSENT`;
- `REQUIRED_VALIDATION_RESULT_ABSENT`;
- `REQUIRED_VALIDATION_PATH_ABSENT`; or
- `IMPLEMENTATION_SUPPORT_UNAVAILABLE`.

Validation result presence and readiness are deliberately separate. `FAILED` and `INCONCLUSIVE` results count as structurally present when the exact `VALIDATED_BY` path exists, and the status remains visible on that path; neither status is converted to passing or readiness. Conversely, an existing result without the required relationship produces `REQUIRED_VALIDATION_PATH_ABSENT`. Declared/synthetic fallback assets and paths remain visible, but their `UNAVAILABLE_SAFE_FAILURE`/`UNAVAILABLE` code-map binding cannot close implementation support and therefore produces `IMPLEMENTATION_SUPPORT_UNAVAILABLE`.

AI has no canonical traversal authority. AI-advisory roots, AI-authored semantic declarations and AI-attributed traversal members are rejected or excluded. An AI output cannot declare an obligation, introduce a canonical edge, close a gap, waive a validation or alter readiness. Canonical serialization, a 16 MiB document limit, fixed collection ceilings, digest revalidation and deep freezing make the result deterministic and restart-safe without making it true.

## Persisted reconciliation and impact aggregate

`IL-5.5` adds `reconciliation-impact-revision.v1`. It embeds one invariant-checked reassessment and its matching impact analysis under the same Project/Mission, exact Twin binding, target snapshot and code-map binding. The aggregate records a stable Mission key, positive revision, canonical input/result digests, optional exact predecessor, counts for `CONFLICT`, `AMBIGUOUS`, `MISSING`, `STALE` and `IMPACT_GAP`, and the impact-path count. Equal logical input returns the predecessor unchanged; changed input appends the next digest-linked revision.

Migration `010` persists the complete canonical aggregate and a constrained envelope. The row is foreign-key bound to the exact Twin revision, code-map revision and Git snapshot; triggers verify matching scope/digests/trust metadata and exact predecessor continuity. Update and delete reject. Repository writes occur in an immediate transaction, same-input concurrency converges, a failed insert rolls back without a partial successor and every read revalidates canonical JSON, envelope counts and history.

The strict Mission-scoped API can execute reconciliation for explicit selected inputs, list revisions, retrieve an exact revision summary, page the combined finding set and page stable cited impact paths. The execution service reconstructs only exact Twin-bound persisted evidence, claims and supersession links and verifies complete code-map membership. Persisted validation-result intake/reconstruction does not yet exist; the service supplies no synthetic results and rejects a selected Twin containing validation nodes. This is an honest adapter limitation, not permission to infer that validations passed or are absent in reality.

The aggregate, API and `IL-5.6` UI remain non-readiness state. They neither resolve a claim, convert validation status to success nor choose a release outcome. Phase 7 owns readiness.

## RuntimeObservation supporting entity

`RuntimeObservation` is an immutable supporting projection over one persisted JSON `EvidenceSource`, not a live feed or generalized Twin node. `runtime-observation-summary.v1` permits exactly a bounded subject, environment, observation kind, canonical UTC start/end, positive sample count and 1-32 ascending unique numeric measurements. The serialized input is limited to 32,768 UTF-8 bytes and a 31-day window. Units are bounded and enforce non-negative/range/integer constraints where applicable. Unknown fields and unsupported versions fail closed.

The source must use `DIRECT_IMPORT`, one of `USER_INPUT`, `VALIDATION_RESULT` or `SYNTHETIC_FIXTURE`, and an effective time equal to the observation window end. The window cannot end after the source's server-owned recorded time. The source's normalized JSON must exactly equal the canonical parsed summary; therefore the projection cannot detach from the redacted evidence representation.

`runtime-observation-digest.v1` binds the complete canonical summary. `runtime-observation-series-key.v1` binds subject, environment and observation kind but not time or measurements. Exact evidence content plus attribution remains idempotent under the existing evidence import key. Freshness is a read projection: a row is `STALE_BY_NEWER_WINDOW` only when a row with the same exact series key has a strictly later window end. Equal windows remain co-latest, and no historical row is updated or deleted. Recency is not truth, validation or readiness.

## Implemented Twin vocabulary

`twin-vocabulary.v1` freezes exactly these node types:

`Project`, `ChangeMission`, `EvidenceSource`, `Claim`, `SoftwareAsset`, `GitSnapshot`, `ValidationResult`, `ReconciliationFinding`, `ReleaseAssessment`, `ReleasePassport`.

It freezes exactly these directed relationship types:

`SCOPED_TO`, `EXTRACTED_FROM`, `ASSERTS`, `CONCERNS`, `IMPLEMENTS`, `AFFECTS`, `DEPENDS_ON`, `VALIDATED_BY`, `CONTRADICTS`, `SUPERSEDES`, `DERIVED_FROM`, `BOUND_TO`, `BLOCKS`.

Every node and relationship has a canonical UUID v4 identity, positive append-oriented revision and the same attributed metadata shape:

| Field | Invariant |
|---|---|
| Project/Mission scope | Both IDs are required; no global or unknown scope exists |
| Origin | One of the six shared origin kinds |
| Source reference | A bounded logical `scheme:relative/value` reference; private/absolute paths and traversal reject |
| Source revision or digest | An exhaustive `SOURCE_REVISION`/`CONTENT_DIGEST` union; timestamps alone never establish freshness |
| Time | Canonical recorded UTC time and optional distinct effective UTC time |
| Extraction method | Bounded uppercase token |
| Epistemic label | Exactly `FACT` or `INFERENCE` |
| Confidence | Optional extraction-quality score for nodes or relationship-match-quality score for edges, in integer basis points |

Confidence always carries the fixed semantic label `QUALITY_ESTIMATE_NOT_TRUTH_PROBABILITY`. A numeric quality score describes extraction or matching quality only; it cannot represent confidence that an assertion is true, promote an inference to fact or influence readiness.

Relationships store both endpoint IDs and endpoint revisions. Creation, invariant checking, serialization and deserialization require the supplied endpoint nodes to match those references exactly. Relationship metadata and both endpoints must share exact Project and Mission scope; crossing either boundary rejects with a stable error. The vocabulary deliberately does not yet impose a guessed node-type pair table: semantic projection policy belongs to `IL-4.2` and subsequent rules.

Canonical serializers handle every frozen node and relationship variant, preserve all attribution, reject unknown fields/versions/variants and cap serialized input at 16 KiB. Objects and nested metadata are frozen after validation. These are representation invariants, not persistence or truth guarantees.

`Project`, `ChangeMission`, `GitSnapshot`, `EvidenceSource` and `Claim` already exist as separate domain entities. `PreparedEvidenceImport`, `EvidenceTimelineEvent`, `ClaimSupersession` and `RuntimeObservation` are supporting values/entities and are not Twin node types. `IL-4.1` does not materialize any existing entity as a Twin node, persist a graph, expose a route or interpret relationship effects. Deterministic projection and revision/invalidation semantics begin with `IL-4.2`.

## Implemented Twin projection and invalidation

`twin-projection.v1` consumes one exact Project/Mission scope plus validated collections of `EvidenceSource`, `Claim`, `ClaimSupersession`, `GitSnapshot` and `ValidationResult`. It materializes the six corresponding node types and deterministic relationships:

- every projected node retains an exact source-entity binding and source digest;
- `SCOPED_TO` binds Mission to Project and each evidence/claim/snapshot/validation node to the Mission;
- `EXTRACTED_FROM` and `ASSERTS` preserve claim/evidence lineage;
- `SUPERSEDES` projects only an already-valid explicit claim correction; and
- `EXTRACTED_FROM` and `BOUND_TO` bind a validation to its evidence source and exact snapshot.

`ValidationResult` is an immutable structured projection source. It accepts `PASSED`, `FAILED` or `INCONCLUSIVE`, a bounded logical validation key, one validation/synthetic evidence source and one same-scope Git snapshot. `validation-result-digest.v1` covers exact scope, source, snapshot, key, result, effective time, extraction method and epistemic label. The result does not establish readiness.

For `IL-5.4`, Twin projection can also accept explicitly attributed semantic declarations of `AFFECTS`, `DEPENDS_ON`, `IMPLEMENTS` and `VALIDATED_BY`. Their endpoint shapes are fixed: claim/asset to asset for `AFFECTS`, asset to asset for `DEPENDS_ON`, claim-to-asset or asset-to-claim for `IMPLEMENTS`, and asset-to-validation for `VALIDATED_BY`. Both endpoints must already be projected sources in the same scope. Duplicate logical edges, malformed attribution and `AI_ADVISORY` origin reject. When a code map is present, the Twin revision records its exact projection ID, revision and digest so impact analysis cannot silently substitute another map.

Projection and member IDs derive deterministically from versioned namespaces and logical identities. Input collections sort canonically, so order changes cannot create a new graph. Re-projecting the same input digest returns the exact prior object; a changed digest creates the next positive projection revision and increments only changed node/relationship revisions.

The dependency graph is explicit and directional: Project to Mission; Mission to scoped sources/snapshots; evidence to extracted claims; evidence and snapshot to validation; and both relationship endpoints to the relationship. Comparing successive projections records `CHANGED` or `REMOVED` causes and the exact prior direct/transitive dependents. It never mutates the earlier revision or assigns truth/readiness semantics to invalidation.

`twin-projection-digest.v1` binds the canonical projection, predecessor reference, nodes, relationships, source bindings, dependency bindings and invalidations. Deserialization revalidates ordering, identities, endpoint revisions, digests, dependency membership and projection integrity. `IL-4.3` stores that complete representation append-only and re-runs the same hydration checks for every exact/member read.

## Safe code-map acquisition and extraction boundary

`code-map-source-scan.v1` is an API-internal transient source bundle rather than a domain fact. It binds exact Project, Mission and repository-registration identities to sorted supported files. Each accepted file retains only its repository-relative logical path, normalized supported extension, exact UTF-8 byte length, SHA-256 content digest and text. Skip counts distinguish unsupported extensions and excluded `.git`/`node_modules` directories.

The source bundle itself does not assert assets, imports, exports, routes, contracts, tests or runtime semantics. `code-map-extraction.v1` is the separate transient `IL-4.5` interpretation over that bundle. Before parsing, it revalidates the exact scan version/scope/limits, repository-relative normalized path uniqueness, extension, UTF-8 byte length, aggregate count and every content digest. A forged, reordered-counter, duplicate, oversized or content-mismatched bundle fails closed.

The extractor uses the TypeScript compiler API only to recover static syntax from `.ts`, `.tsx`, `.js` and `.jsx`, and strict `JSON.parse` for every `.json` file. Its bounded output retains the exact scan/extraction limits, encountered/scanned byte and file counts, unsupported-extension counts and excluded-directory counts so skipped content cannot silently appear analyzed. It also contains:

- a content-digest-bound file inventory and validated `package.json` metadata; script names are retained but commands are not, and unsafe dependency ranges are omitted;
- static `import` declarations and static export declarations/declarations, with repository-relative resolution only when one scanned candidate is unambiguous;
- exported interface, type-alias and enum declarations as syntactic contracts;
- direct literal-path Fastify method calls or `route({ method, url })` calls only when the receiver is established by a static `fastify` import plus direct factory initialization or a `FastifyInstance`-typed parameter; and
- test-to-source associations only when a recognized test path has a static relative import resolving to one scanned non-test file.

The representation is canonically ordered and bound by `extractionDigest`. `authority: STATIC_SYNTAX_ONLY` and `runtimeSemantics: NOT_OBSERVED` are mandatory. Dynamic `import()`, `require`, aliases/wrappers, computed routes, prefix composition, dependency resolution outside the scan, reachability, runtime registration order, code in other languages and universal program semantics are not inferred. Syntax/manifest diagnostics are fixed and bounded; a recoverable problem makes `completeness: PARTIAL` without promoting recovered syntax to runtime truth. Independent ceilings are 250,000 visited syntax nodes, 20,000 emitted records, 100 diagnostics and five monotonic seconds.

The extraction contains no source text. `IL-4.6` converts that source-free representation into `code-map-projection.v1`; the domain value is `CodeMapProjectionRevision`. A run captures Git state before acquisition and again after extraction; only an unchanged Project/Mission/registration/head/status state can bind to the exact second snapshot. Repository movement fails closed. Each immutable projection records snapshot identity/digest, extraction digest, explicit evidence kind, inference status, completeness, member digests and its predecessor.

Inferred assets are labeled `STATIC_INFERENCE`, `AVAILABLE` and `COMPLETE`/`PARTIAL`. Files, package manifests, exported contracts and recognized routes receive deterministic evidence-kind-specific identities. Only resolved in-bundle static imports/re-exports, declaration links and static test imports become code-map edges. Twin projection maps these records to `SoftwareAsset` nodes with `REPOSITORY_OBSERVATION`, `STATIC_CODE_EXTRACTION` and `INFERENCE`; every asset has an exact `BOUND_TO` relationship to the recorded `GitSnapshot`.

The fallback is a different authority, not parser equivalence. It activates only when an IntelliLoop-owned manifest is explicitly supplied and an enumerated scanner/extractor limit or safe failure occurs. Its projection is fixed to `DECLARED_INTELLILOOP_FIXTURE`, `UNAVAILABLE_SAFE_FAILURE`, `UNAVAILABLE`, a manifest identity and fallback reason. Twin members use `SYNTHETIC_FIXTURE`, `DECLARED_FIXTURE_MANIFEST` and `INFERENCE`, and their identities differ from inferred members with the same logical key. Repository movement, missing/archived scope, unsafe registration, invalid extraction input, persistence and integrity failures never fall back.

Code-map projection adds no runtime-semantic, validation, finding or readiness claim. `IL-4.7` exposes verified source-free summaries, assets and edges through bounded contracts and presents the same values in the authoritative accessible list. The UI does not create another domain model and ships no graph visualization.

## Implemented Twin persistence and list projection

One deterministic projection identity spans a Mission's immutable positive revisions. Persisted metadata duplicates only the envelope required for bounded selection and storage checks: exact Project/Mission scope, projection/input digests, recorded time, predecessor revision/digest and member counts. The canonical document remains the authority for nodes, relationships, source bindings, dependency bindings and invalidations; a mismatch between the envelope and document is an integrity failure.

The API list representation is deliberately not a second graph model. A node list resource combines one verified `TwinNode` with its exact `TwinProjectionNodeSource` and renames `metadata.sourceReference` to `pathCitation` for visible provenance. A relationship list resource preserves exact endpoint identities/revisions and its attributed logical projection path. Revision summaries expose counts and digests but never infer truth, conflict resolution, validation success or readiness.

## Redacted evidence pack and citation registry

`evidence-pack.v1` is an immutable transfer/context projection, not a new evidence authority. Compilation requires one non-empty bounded Mission question, one complete `ReconciliationImpactRevision`, its exact `TwinProjectionRevision`, and the complete evidence-source/claim/supersession collections represented by that Twin. Existing entity, Twin and aggregate invariants are rerun. Scope, projection ID/revision/digest, source IDs/digests and supersession dependencies must agree exactly.

`evidence-pack-compiler-policy.v2` creates canonically ordered `ASSESSMENT`, `EVIDENCE_SOURCE`, `CLAIM`, `CLAIM_SUPERSESSION`, `RECONCILIATION_FINDING` and `IMPACT_PATH` projections selected for the exact approved question. Release/next-action packs retain every open finding plus only referenced claims/paths; conflict, impact, missing-validation and post-correction questions select their exact relevant finding/source lineage. Complete input collections are still verified before selection. The evidence-source item is a compact attribution card and intentionally excludes `prepared.normalizedContent`; claims/findings/paths carry only fields the deterministic renderer needs. This question-directed v2 correction was required by `IL-6.4` integration to preserve—not widen—the frozen 12,000-unit transfer ceiling.

`evidence-pack-digest.v1` covers the compiler-policy identity, redacted question and question digest, exact assessment/Twin binding, every item/digest, the complete citation registry/allowlist and ordered redaction summary. The full serialized value is capped and a provider-neutral 12,000-unit upper bound conservatively counts one unit per UTF-8 byte. The compiler never silently truncates or drops an item to pass a bound.

Citation IDs derive from `evidence-pack-citation-locator.v1`, which contains only the item kind and stable logical key. They therefore remain stable when only the question changes. Resolution is allowlist-only and verifies the matching locator, item identity and item digest. Citation stability proves reference integrity under this version; it does not prove cited truth, completeness, relevance or readiness.

## Deterministic offline explanation

`offline-explanation.v1` is an immutable, non-authoritative rendering of one exact `EvidencePack`. Its fixed question vocabulary covers release, open conflicts, impact, missing validation, next actions and post-correction change. NFC/case/whitespace normalization is accepted only for those questions; arbitrary free-form text fails with `OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED`.

The renderer walks only canonical pack items. `FACT` and `INFERENCE` claims remain separated, superseded claims are labeled historical, explicit supersessions are surfaced as facts, open findings become cited conflict/gap and next-action statements, and impact paths become structural facts. The answer cites the compact assessment binding that contains canonical counts; every other statement cites its exact originating item plus any referenced claim or path items. Used citations retain pack order and all IDs must resolve through the pack registry.

The versioned output binds Project, Mission, pack digest, question digest and renderer-policy digest. It is capped at 256 statements, 4,096 UTF-8 bytes per statement, 64 citations per statement and 131,072 serialized UTF-8 bytes. The complete output receives its own canonical SHA-256 digest. Invariant validation deterministically rerenders from the bound pack and rejects any changed text, identity, order, citation, metadata or digest.

Engine metadata is exactly `DETERMINISTIC_EXPLANATION`, `AI_OFF`, provider `NONE` and `externalCallMade: false`. The type has no readiness field, provider payload or finding mutation. A cited answer describes evidence-pack state; it does not approve, block, waive or determine release readiness.

## Provider-neutral mock validation

`provider-adapter-request.v1` is derived internally from one verified pack and a canonical UUID request ID. It embeds the exact redacted pack, repeats its Project/Mission/question/digest bindings, carries the exact citation allowlist, and includes a closed `provider-advisory-output-schema.v1` plus its digest. `provider-adapter-policy.v1` binds that schema to fixed response bounds, mock-only transport authority, no readiness authority and the session's immutable limits. The complete request has its own canonical digest.

`provider-advisory-response.v1` separates one answer from facts, inferences, conflicts, gaps and next actions. Every statement is bounded and must cite at least one pack item. The top citation list must equal the exact pack-ordered union used by all statements. Provider/model/response identifiers use a narrow non-secret grammar, execution kind is exactly `MOCK_VALIDATION`, and provider-reported input/output/total usage must be coherent and within the request limits.

Validation first detaches plain canonical JSON, caps it at 16,384 UTF-8 bytes and rejects any unknown or readiness/approval/waiver/Passport-shaped key. It then verifies request UUID/digest, pack digest, schema version, section/count/text bounds, every allowlisted citation, citation-union ordering, mock provider identity and usage. An accepted response is wrapped by `provider-advisory-validation.v1` with its own canonical digest. This establishes structural grounding and identity, not semantic truth or explanation quality.

One adapter session permits only one concurrent mock request. Defaults are 20,000 ms, one retry, 12,000 input-token upper-bound units, 1,200 provider-reported output tokens and a 50,000-unit session budget. Each attempted call reserves the pack's conservative input units plus the configured output ceiling. Only timeout and transport failure retry. Every execution retains the complete deterministic offline answer and records `externalCallMade: false`; there is no live transport type, credential access, network client, persistence or readiness field.

## Personal OpenAI evaluation checkpoint

`openai-evaluation-checkpoint.v1` is an immutable, non-runtime record for the `IL-6.5` course-correction decision. Its entry data is restricted to passing reconciliation/citation/privacy evidence status, the six exact approved questions, exact-preview availability, `NOT_SENT`, the maximum conservative input bound and production outcome `DISABLED`. It accepts no credential, provider request, provider response or arbitrary decision string.

The allowed decision enum is exactly `USE_LIVE_PROVIDER_IN_FINALE`, `CORRECT_PROMPT_OR_EVIDENCE_PACK_AND_RETEST` and `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`. The authorized offline constructor always selects the third value, fixes the run status to `NOT_RUN_NOT_AUTHORIZED`, records all provider evaluation metrics as `NOT_MEASURED`, and fixes every authority/mutation/credential-use field to false. A canonical SHA-256 checkpoint digest covers the full record and its invariant rejects a changed decision, prerequisite, metric or authority field.

## Readiness obligation evaluation

`IL-7.1` adds `readiness.v1`, a pure deterministic evaluation over one exact Project, Mission, reconciliation/impact revision and current Git snapshot. The fixed ordered catalog contains nine obligations: verified aggregate integrity, exact scope, current snapshot, no active critical findings or impact gaps, every declared required validation present and passing, explicit persisted human review, current dependencies, canonical complete inputs and persisted source records. The policy, input and output each receive a versioned canonical digest; validation requirements and evidence sort by stable identity, so collection order cannot alter the result.

The result enum is exactly `BLOCKED`, candidate `READY` or `STALE`. Snapshot drift, stale validation/review evidence or an explicitly changed dependency takes `STALE` precedence. Every other unmet obligation is `BLOCKED`. Candidate `READY` is possible only when all nine obligations pass. Empty or missing required validation evidence, `FAILED` or `INCONCLUSIVE` results, unknown validation scope, missing/non-human review, unknown freshness, incomplete inputs, controlled fallback, `SAMPLE_PLACEHOLDER`, `AI_ADVISORY` or any unpersisted reconciliation/validation/review input fails closed.

A `STALE` finding inside the current reconciliation revision records that revision's exact predecessor change. It is historical context, not evidence that the current revision itself is stale. Current evaluation becomes `STALE` only from its own changed snapshot, validation, review or dependency input. Active conflict, ambiguity, missing-support and impact-gap counts still block. This distinction prevents a correctly reassessed successor from being permanently stale while preserving predecessor history.

`SYNTHETIC_FIXTURE` validation evidence can satisfy structural evaluation only when it is explicitly attributed, persisted, exact-scope and passing; it does not erase the synthetic provenance. The separate `SAMPLE_PLACEHOLDER` input classification can never make readiness green. This permits a controlled offline demonstration without relabeling sample material as production evidence.

The output fixes `evaluationPersistence` to `NOT_PERSISTED`, `readinessAuthority` to `EVALUATION_ONLY_UNTIL_PERSISTED`, and release-decision, Release-Passport, deployment and AI authority to false/`NONE`. It adds no repository, database migration, endpoint, browser state, provider call or credential path. `IL-7.2` alone owns immutable assessment persistence and derived historical staleness; `IL-7.3` owns Passport projection.

## Immutable ReleaseAssessment and derived state

`IL-7.2` adds `release-assessment.v1`, an immutable persisted envelope around one exact invariant-checked `readiness.v1` evaluation. Its stable Mission assessment key, positive revision, generated assessment identity, recorded time, evaluation input fingerprint, evaluated status, exact evaluation, optional predecessor identity/digest and assessment digest form one canonical record. Exact input replay returns the stored revision; a changed input appends a successor linked to the immediately prior assessment.

The envelope distinguishes two authorities deliberately. The embedded evaluator result still says `NOT_PERSISTED` because it is the pure candidate value defined by `IL-7.1`. The enclosing ReleaseAssessment says `PERSISTED_IMMUTABLE` and `DETERMINISTIC_ASSESSMENT`; release approval, Release Passport, deployment and AI authority remain false/absent.

`readiness-review.v1` records one explicit human or visibly AI-advisory review against an exact persisted reconciliation revision/result and its target Git snapshot. ValidationResult, review and assessment rows are append-only. `release-assessment-state.v1` is a derived read model, not another decision row: it compares every stored evaluation dependency and the complete input fingerprint with a new repository-derived evaluation. An exact match preserves the assessed status; any difference produces `STALE`, ordered reason codes and `storedAssessmentChanged: false`.

## Thin Release Passport and derived association

`release-passport.v1` is a canonical projection of one persisted ReleaseAssessment. It has one stable identity/key, recorded time, exact assessment identity/revision/digest, snapshot and rule bindings, complete input/evidence digest, copied status, obligations, blockers, finding counts, validations, review, structural citations and its own digest. The projection policy is `REPRODUCED_NOT_RECOMPUTED`; no evaluator or reconciliation function participates.

The structural citation manifest reproduces assessment, reconciliation, target/current snapshot, validation-result and optional review identifiers/digests already carried by the assessment. It does not add claims or represent an evidence-pack citation registry. `release-passport-state.v1` binds the Passport to its assessment's derived state. A later dependency change can show `STALE` while `passportChanged: false`; the original Passport remains an unsigned immutable historical record.

## Current authority boundaries

| Area | Planned authority | Current state |
|---|---|---|
| Reconciliation and impact | Deterministic, mission-scoped rules over one immutable Twin revision | Findings, reassessment, bounded cited impact analysis, immutable persistence/API and strict browser review are implemented; generated `EV-RECONCILE` proves Phase-5 `DC-04` and `DC-05` on a controlled synthetic fixture |
| Readiness | Fail-closed persisted assessment over exact evidence/snapshot/rule versions | Immutable ReleaseAssessment history, repository-derived `BLOCKED`/`READY`/`STALE` state and strict API/UI presentation are implemented; validation/review intake remains absent |
| Release Passport | Immutable projection of one persisted assessment; reproduce, never recompute | Unsigned projection, digest, history, stale association and strict API/UI plus structural JSON download/print are implemented; signing and release authority remain absent |
| AI | Cited advisory explanation only; never mutates findings or readiness | Redacted pack/citations, deterministic `AI_OFF` explanation, disabled/mock-only validation, strict local API/UI and digest-bound offline course-correction decision are implemented; production provider execution remains disabled and live provider authority is absent |

Canonical JSON, Git status digests, prepared-evidence/import-key digests, stable identities and the reconciliation rule-set digest make equality and lineage checks possible, but a matching digest or comparison relation is not evidence quality, truth, approval or readiness. `EV-RECONCILE` demonstrates exact authored truth cases and deterministic replay; its 6/6 controlled agreement is rule-conformance evidence, not statistical or production accuracy.

Generated [EV-READINESS](../evidence/EV_READINESS.json) and [EV-PASSPORT](../evidence/EV_PASSPORT.json) establish controlled cross-layer conformance for the Phase-7 model: no negative fixture yielded `READY`, Passport content remained the exact assessment projection, immutable state survived restart, scope remained isolated and corrupt canonical bytes failed closed. These results prove implementation behavior for the controlled cases only. They do not prove evidence authenticity, production safety, release approval or deployment fitness. See the [Readiness and Release Passport guide](../product/READINESS_AND_PASSPORT_GUIDE.md) for operator semantics.

## Versioning rule

The canonicalization and metadata shapes remain foundation contracts. Project/Mission archive creates and persists an immutable successor revision while retaining the earlier row. Claim correction appends a new claim and explicit `SUPERSEDES` intake link without rewriting history. Runtime observations append under a versioned summary/digest/series contract, and staleness is derived without mutation. Twin and ReleaseAssessment successors persist only by appending a complete verified canonical document with the exact predecessor. A reconciliation rule, impact-traversal policy, evidence-pack compiler policy, offline-renderer policy, provider-adapter/schema policy, personal-provider checkpoint, synthetic-edge-case policy, readiness policy, assessment envelope, Passport projection or derived-state contract change requires a new versioned identity. The pure readiness evaluation remains an unpersisted value by design; `release-assessment.v1` is the persisted authority wrapper and `release-passport.v1` is its unsigned non-approving projection. No current version creates release-approval or deployment authority.
