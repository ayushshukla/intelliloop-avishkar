# IntelliLoop Provenance Ledger

**Audience:** Reviewers, contributors and submission maintainers  
**Status:** Active from `IL-1.1`  
**Source strategy:** `SOURCE_INDEPENDENT_BUILD`

## Governing decision

R2 found no candidate application file with sufficient ownership/license and competition-policy clearance. Therefore:

- `directSourceCopyAuthorized: false`
- `REUSE: 0`
- `ADAPT: 0`
- candidate application source transfer is prohibited

The authoritative decision is `planning/r2-development-readiness-2026-08-03/r2-reuse-manifest.json`.

## IL-1.1 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-1.1` | Workspace configuration | R2 stack and R3 coding contract | None |
| 2026-08-04 | `IL-1.1` | Fastify health API | Independently authored from the shared health requirement | None |
| 2026-08-04 | `IL-1.1` | React foundation UI and CSS | Original IntelliLoop foundation composition | None |
| 2026-08-04 | `IL-1.1` | Domain/contracts boundaries and tests | Independently authored from R2 dependency rules | None |
| 2026-08-04 | `IL-1.1` | Professional documentation | Implementation-facing original documentation | None |

Work was produced in a user-directed OpenAI Codex development session and verified with local toolchain tests. That assistance is disclosed separately in `AI_USE_DISCLOSURE.md`.

## IL-1.2 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-1.2` | Typed API configuration and frozen flags | R2 readiness defaults and R3 story acceptance | None |
| 2026-08-04 | `IL-1.2` | Stable errors and request-ID handling | Independently authored from the bounded API rules | None |
| 2026-08-04 | `IL-1.2` | Safe structured logger and sentinel tests | Independently authored from the privacy guardrail | None |
| 2026-08-04 | `IL-1.2` | Architecture, setup, testing and security updates | Current implementation evidence | None |

## Permitted external material

Published npm packages listed in `THIRD_PARTY_NOTICES.md` are independently selected dependencies under their own licenses. Package use does not authorize copying any candidate application.

## IL-1.3 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-1.3` | UUID, clock, canonical JSON and SHA-256 primitives | Frozen R2 identity/lineage boundary and R3 acceptance | None |
| 2026-08-04 | `IL-1.3` | Scope, origin and revision metadata contracts | Independently authored from R2 required metadata | None |
| 2026-08-04 | `IL-1.3` | Canonical vectors and exhaustive serialization tests | Authored against public JSON/SHA-256 behavior and project contracts | None |
| 2026-08-04 | `IL-1.3` | Domain model, architecture and evidence updates | Current implementation evidence | None |

## IL-1.4 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-1.4` | API-owned SQLite lifecycle and error boundary | Frozen R2 persistence contract and R3 acceptance | None |
| 2026-08-04 | `IL-1.4` | Migration `001` and schema-history validation | Independently authored forward-only migration design | None |
| 2026-08-04 | `IL-1.4` | Restart, rollback, newer-schema and concurrency tests | Authored from story acceptance criteria | None |
| 2026-08-04 | `IL-1.4` | Data/migration, setup, security and evidence documents | Current implementation evidence | None |

## IL-1.5 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-1.5` | Welcome-route trust shell and stage rail | Frozen R2 route/trust UX and R3 acceptance | None |
| 2026-08-04 | `IL-1.5` | Loading, connected, error, empty and AI-off components | Independently authored trust-state presentation | None |
| 2026-08-04 | `IL-1.5` | Component, health-client, keyboard and network-failure tests | Authored from story acceptance criteria | None |
| 2026-08-04 | `IL-1.5` | README, architecture, testing, security and evidence updates | Current implementation evidence | None |

## IL-1.6 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-1.6` | Dependency-free documentation-link gate | Frozen foundation proof acceptance | None |
| 2026-08-04 | `IL-1.6` | Human-readable and machine-readable foundation evidence | Observed clean setup, test, build, browser and integrity results | None |
| 2026-08-04 | `IL-1.6` | Foundation documentation baseline | Implemented `IL-1.1`-`IL-1.6` behavior only | None |

## IL-2.1 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-2.1` | Project and Change Mission lifecycle domain | Frozen R1/R2 vocabulary and R3 acceptance | None |
| 2026-08-04 | `IL-2.1` | Scope, archive, revision and chronology invariants | Independently authored fail-closed domain design | None |
| 2026-08-04 | `IL-2.1` | Adversarial lifecycle tests and evidence | Authored from story acceptance criteria | None |
| 2026-08-04 | `IL-2.1` | Domain, architecture, security and contributor documentation | Current implementation evidence | None |

## IL-2.2 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-2.2` | Migration `002` and Project/Mission repository | Frozen R2 persistence boundary and R3 acceptance | None |
| 2026-08-04 | `IL-2.2` | Versioned Project/Mission JSON contracts and routes | Independently authored from the bounded API contract | None |
| 2026-08-04 | `IL-2.2` | Restart, revision, isolation, concurrency and pagination tests | Authored from story acceptance and reconciled review risks | None |
| 2026-08-04 | `IL-2.2` | API, data, architecture, security and evidence documentation | Current implementation evidence | None |

## IL-2.3 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-2.3` | Migration `003` and canonical registration service | Frozen R2 repository boundary and R3 acceptance | None |
| 2026-08-04 | `IL-2.3` | Path-free PUT/GET repository contracts | Independently authored from the bounded API family | None |
| 2026-08-04 | `IL-2.3` | Traversal, symlink, placement, restart and non-mutation tests | Authored from story safety acceptance | None |
| 2026-08-04 | `IL-2.3` | API, data, security, testing and evidence documentation | Current implementation evidence | None |

## IL-2.4 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-2.4` | GitSnapshot domain entity and migration `004` | Frozen R2 evidence model and R3 acceptance | None |
| 2026-08-04 | `IL-2.4` | Fixed bounded read-only Git runner and capture service | Independently authored from the frozen repository-safety boundary | None |
| 2026-08-04 | `IL-2.4` | Path-free capture/list/get contracts and routes | Independently authored from the bounded API family | None |
| 2026-08-04 | `IL-2.4` | State, digest, timeout, immutability, restart and non-mutation tests | Authored from story acceptance criteria | None |
| 2026-08-04 | `IL-2.4` | Domain, API, data, security, testing and evidence documentation | Current implementation evidence | None |

## IL-2.5 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-2.5` | Typed workspace browser client and two-route UI | Frozen R2 route/trust boundary and R3 acceptance | None |
| 2026-08-04 | `IL-2.5` | Project, Mission, registration and snapshot interaction states | Independently authored from existing API contracts | None |
| 2026-08-04 | `IL-2.5` | Component, failure, keyboard, reload and path-privacy browser tests | Authored from story acceptance criteria | None |
| 2026-08-04 | `IL-2.5` | User guide, architecture, security and test-evidence updates | Current implementation evidence | None |

## IL-2.6 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-2.6` | Deterministic repository-safety evidence generator | Frozen `EV-REPO-SAFETY` contract and R3 acceptance | None |
| 2026-08-04 | `IL-2.6` | Synthetic status/tree equality and negative-corpus proof | Independently authored from the implemented safety boundary | None |
| 2026-08-04 | `IL-2.6` | Machine-readable proof and story evidence record | Generated from production services and authored fixtures | None |
| 2026-08-04 | `IL-2.6` | Setup, API, security, user and testing documentation closure | Current implementation behavior | None |

## IL-3.1 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.1` | Pure typed evidence preparation domain pipeline | Frozen R2 evidence/privacy boundary and R3 acceptance | None |
| 2026-08-04 | `IL-3.1` | UTF-8, size, JSON structure and denied-signature limits | Independently authored conservative implementation choices | None |
| 2026-08-04 | `IL-3.1` | Ordered redaction catalog and version/format-framed digest | Independently authored deterministic privacy design | None |
| 2026-08-04 | `IL-3.1` | Secret corpus, malformed/oversize, digest-vector and atomicity tests | Authored from story acceptance and reconciled privacy risks | None |
| 2026-08-04 | `IL-3.1` | Partial trust model, security, testing and story-evidence documentation | Current implementation behavior and explicitly deferred `IL-3.2`/`IL-3.6` work | None |

## IL-3.2 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.2` | EvidenceSource and EvidenceTimelineEvent domain entities | Frozen R2 node metadata and R3 lineage acceptance | None |
| 2026-08-04 | `IL-3.2` | Unified domain origin/epistemic metadata authority | Existing authored metadata contract and dependency-direction rules | None |
| 2026-08-04 | `IL-3.2` | Migration `005` evidence-source/timeline schema | Frozen R2 forward-only SQLite boundary | None |
| 2026-08-04 | `IL-3.2` | Attributed idempotent SQLite evidence repository | Independently authored from scope, privacy and append-only acceptance | None |
| 2026-08-04 | `IL-3.2` | Restart, isolation, immutability, pagination, concurrency and sentinel tests | Authored from story acceptance and reconciled trust risks | None |
| 2026-08-04 | `IL-3.2` | Architecture, data, trust, security and story-evidence documentation | Current implementation behavior and explicitly deferred `IL-3.3`/`IL-3.4` work | None |

## IL-3.3 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.3` | Claim and ClaimSupersession domain entities | Frozen R2 claim metadata/lineage boundary and R3 acceptance | None |
| 2026-08-04 | `IL-3.3` | Versioned bounded normalization, applicability and digest contracts | Independently authored conservative intake design | None |
| 2026-08-04 | `IL-3.3` | Migration `006` claim/supersession schema | Frozen R2 forward-only append-oriented persistence boundary | None |
| 2026-08-04 | `IL-3.3` | Idempotent SQLite claim repository and explicit successor transactions | Independently authored from scope, source-attribution and history acceptance | None |
| 2026-08-04 | `IL-3.3` | Normalization, conflict-preservation, rejection, restart, atomicity and concurrency tests | Authored from story acceptance and reconciled trust risks | None |
| 2026-08-04 | `IL-3.3` | Domain model, trust model, data, security and story-evidence documentation | Current implementation behavior and explicitly deferred `IL-3.4`/`IL-5.1`/`IL-5.2` work | None |

## IL-3.4 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.4` | Versioned evidence/claim API contracts and resource converters | Frozen R2 bounded JSON boundary and R3 acceptance | None |
| 2026-08-04 | `IL-3.4` | Mission-scoped Fastify preview, commit, retrieval, timeline, claim and successor routes | Independently authored over the existing domain/repository authority | None |
| 2026-08-04 | `IL-3.4` | Stable evidence/claim error classification and runtime wiring | Existing request-ID, privacy and non-revealing error boundary | None |
| 2026-08-04 | `IL-3.4` | Contract and injection tests for idempotency, privacy, pagination and unsupported mutation | Authored from story acceptance and reconciled trust risks | None |
| 2026-08-04 | `IL-3.4` | DOC-06 API reference and architecture, trust, security and evidence updates | Current implementation behavior and explicitly deferred `IL-3.5`/`IL-5.1`/`IL-5.2` work | None |

## IL-3.5 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.5` | Strict browser evidence/claim response client and lineage-integrity checks | Existing mission-scoped API contracts plus frozen R3 acceptance | None |
| 2026-08-04 | `IL-3.5` | Mission evidence/timeline route, redaction-preview/import flow and explicit trust states | Independently authored from R2 route, accessibility and epistemic-label requirements | None |
| 2026-08-04 | `IL-3.5` | Source, timeline, claim and explicit supersession presentation | Existing immutable resources; no inference or source transfer | None |
| 2026-08-04 | `IL-3.5` | Component/client, browser success/failure/reload/keyboard/integrity tests and live visual review | Authored from story acceptance and reconciled trust risks | None |
| 2026-08-04 | `IL-3.5` | DOC-15 user guide, DOC-16 trust model and architecture/security/testing/evidence updates | Current implementation behavior and explicitly deferred `IL-3.6`/`IL-5.1`/`IL-5.2` work | None |

## IL-3.6 authorship record

| Date | Story | Artifact class | Basis | Source transfer |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.6` | Deterministic `EV-PRIVACY` generator and aggregate-gate integration | Frozen R3 sentinel-absence acceptance and documentation plan | None |
| 2026-08-04 | `IL-3.6` | Eleven-category redaction corpus plus API/log/SQLite byte scans | Existing independently authored production privacy boundary | None |
| 2026-08-04 | `IL-3.6` | Verification-only export and AI-pack projections | Authored solely to test redacted transfer selection; no product/provider transfer | None |
| 2026-08-04 | `IL-3.6` | Machine-readable privacy report and initial security review | Generated current-run observations plus explicit residual risks | None |
| 2026-08-04 | `IL-3.6` | DOC-10, DOC-16, DOC-21, DOC-23 and supporting documentation updates | Current implementation behavior and explicitly deferred `IL-3.7`/`IL-6.x`/`IL-9.2` work | None |

## IL-3.7 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-04 | `IL-3.7` | Versioned runtime-observation schema, digest, series key and invariants | Frozen R3 bounded historical-summary outcome and source-independent domain patterns | None |
| 2026-08-04 | `IL-3.7` | Migration `007` and evidence-repository observation transaction/freshness projection | Existing append-only evidence authority plus explicit stale/history acceptance | None |
| 2026-08-04 | `IL-3.7` | Strict mission evidence API contracts and routes | Existing Fastify/request-ID/privacy boundary plus offline-only acceptance | None |
| 2026-08-04 | `IL-3.7` | Domain, migration, repository and API tests for schema/size/source/idempotency/staleness/restart/offline authority | Independently authored synthetic observation fixtures | None |
| 2026-08-04 | `IL-3.7` | DOC-03-DOC-10, DOC-12-DOC-16, DOC-21/DOC-23 and story-evidence updates | Current implementation behavior and explicitly deferred `IL-4.1`/`IL-5.3`/live-telemetry work | None |

## IL-4.1 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.1` | Exact `twin-vocabulary.v1` node/relationship enums and branded representation | Frozen R2 ten-node/thirteen-relationship vocabulary and R3 acceptance | None |
| 2026-08-05 | `IL-4.1` | Mission-scoped attribution, positive revisions, endpoint-revision binding and cross-scope invariants | Existing clean-room metadata primitives plus R2 scope/revision rules | None |
| 2026-08-05 | `IL-4.1` | Canonical fail-closed node/relationship serializers and fixed quality-confidence semantics | Existing canonical JSON contract and R2 rule that confidence is not truth probability | None |
| 2026-08-05 | `IL-4.1` | Exhaustive type vectors, round trips, negative metadata and all-relationship cross-scope tests | Independently authored synthetic UUID, time, digest and locator fixtures | None |
| 2026-08-05 | `IL-4.1` | DOC-04 plus architecture, trust, security, testing, governance and story-evidence updates | Current implementation behavior and explicitly deferred `IL-4.2+` work | None |

## IL-4.2 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.2` | Immutable structured `ValidationResult` source and digest | Frozen validation projection requirement plus existing evidence/snapshot contracts | None |
| 2026-08-05 | `IL-4.2` | Deterministic `twin-projection.v1` materializer, source bindings and relationship projection | Frozen R3 outcome and independently authored domain design | None |
| 2026-08-05 | `IL-4.2` | Successor revisions, predecessor digest and exact dependency invalidation graph | R2 append-only/invalidation rules; no candidate implementation source | None |
| 2026-08-05 | `IL-4.2` | Canonical projection serializer/hydrator and integrity checks | Existing IntelliLoop canonical JSON/digest primitives | None |
| 2026-08-05 | `IL-4.2` | Determinism, history, branch-isolation, restart, tamper and scope vectors | IntelliLoop-authored synthetic checkout fixtures | None |

## IL-4.3 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.3` | Migration `008` and append-only canonical Twin revision repository | Frozen persistence/revision acceptance plus existing SQLite lifecycle patterns | None |
| 2026-08-05 | `IL-4.3` | Server-derived materialization service and strict bounded Twin API contracts/routes | Existing persisted source authorities plus frozen Mission-scoped API outcome | None |
| 2026-08-05 | `IL-4.3` | Accessible revision selector, attributed list projection, path citations and integrity state | Frozen authoritative-list acceptance plus existing browser trust-state patterns | None |
| 2026-08-05 | `IL-4.3` | Persistence, pagination, restart, tamper, client-contract and Chromium vectors | Independently authored synthetic Project/Mission/evidence fixtures | None |
| 2026-08-05 | `IL-4.3` | DOC-03-DOC-10, DOC-15-DOC-16, DOC-21/DOC-23 and story-evidence updates | Current implementation behavior and explicitly deferred `IL-4.4+` work | None |

## IL-4.4 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.4` | Mission-scoped canonical read-only source scanner and stable failures | Frozen R2 extension/file/byte/time/root boundary plus existing registration authority | None |
| 2026-08-05 | `IL-4.4` | Secure bounded file adapter, relative source bundle, digests and honest skip summaries | Independently authored Node filesystem design; no candidate implementation source | None |
| 2026-08-05 | `IL-4.4` | Traversal, junction, substitution, oversize, aggregate, file-count, timeout, encoding and lifecycle vectors | IntelliLoop-authored synthetic filesystem/repository fixtures | None |
| 2026-08-05 | `IL-4.4` | Non-execution source guard and before/after complete-tree equality proof | Frozen no-execution/no-install/no-mutation acceptance | None |
| 2026-08-05 | `IL-4.4` | DOC-03-DOC-10, DOC-15-DOC-16, DOC-21/DOC-23 and story-evidence updates | Current implementation behavior and explicitly deferred `IL-4.5+` work | None |

## IL-4.5 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.5` | Bounded deterministic `code-map-extraction.v1` representation and input revalidation | Frozen R2 TypeScript/JSON parser boundary and R3 acceptance | None |
| 2026-08-05 | `IL-4.5` | Static import/export, exported-contract, conservative Fastify-route and test-association recognizers | Independently authored syntax-only rules; no candidate implementation source | None |
| 2026-08-05 | `IL-4.5` | Strict package metadata parser with command/private-range omission | Existing IntelliLoop privacy and bounded-output rules | None |
| 2026-08-05 | `IL-4.5` | Checked-in golden fixture plus malformed, determinism, tamper, deadline and non-execution vectors | IntelliLoop-authored synthetic TypeScript/JSON fixture | None |
| 2026-08-05 | `IL-4.5` | DOC-04, DOC-16 and supporting architecture/security/testing/governance/evidence updates | Current implementation behavior and explicitly deferred `IL-4.6+` work | None |

## IL-4.6 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.6` | Canonical `code-map-projection.v1`, exact Git-snapshot digest and evidence-kind-specific member identities | Frozen R2/R3 snapshot binding and no-silent-equivalence acceptance | None |
| 2026-08-05 | `IL-4.6` | Migration `009`, append-only repository and complete canonical restart/integrity checks | Existing IntelliLoop migration/Twin persistence patterns, independently extended for code-map mode/snapshot constraints | None |
| 2026-08-05 | `IL-4.6` | Before/after snapshot orchestration and enumerated safe-failure policy | Frozen read-only/safe-failure boundary; no candidate implementation source | None |
| 2026-08-05 | `IL-4.6` | Explicit IntelliLoop-owned checkout declared manifest and visibly synthetic Twin projection | Frozen declared-evidence fallback rule and IntelliLoop-authored synthetic values | None |
| 2026-08-05 | `IL-4.6` | Domain, service, real-repository, restart, immutability and tamper vectors | IntelliLoop-authored controlled fixtures | None |
| 2026-08-05 | `IL-4.6` | DOC-04, DOC-16 and supporting architecture/data/security/testing/governance/evidence updates | Current implementation behavior and explicitly deferred `IL-4.7+` work | None |

## IL-4.7 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-4.7` | Strict source-free code-map run, revision, asset and edge contracts/routes | Frozen R2 data-selection boundary and R3 presentation acceptance | None |
| 2026-08-05 | `IL-4.7` | Accessible attributed code-map list and Twin refresh workflow | Existing IntelliLoop trust-state patterns and independent UI implementation | None |
| 2026-08-05 | `IL-4.7` | Per-run declared-fixture consent and inferred/declared client coherence checks | Reconciled no-silent-fallback and personal-repository safety requirements | None |
| 2026-08-05 | `IL-4.7` | Deterministic `EV-TWIN`/`EV-CODEMAP` production-path generator | Frozen G2 evidence requirements and IntelliLoop-authored synthetic repositories | None |
| 2026-08-05 | `IL-4.7` | API, component, Chromium, restart, privacy and integrity vectors | Authored from story acceptance and current implementation boundaries | None |
| 2026-08-05 | `IL-4.7` | DOC-03-DOC-10, DOC-15-DOC-16, DOC-21/DOC-23 and manual checkpoint updates | Current implementation behavior and explicitly deferred `IL-5.1+` work | None |

## Post-submission reconciliation record

| Date | Story/control | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | Submission baseline | `SUBMISSION_COMMITMENTS.md` and `PROMISE_TO_EVIDENCE_MATRIX.md` | User-confirmed officially submitted eight-page brief; SHA-256 `5595C1D4B08D52EDCE65BBBB19D1285E53DCECD63B5C8DDB80FADD9F727F6329` | `IntelliLoop_Innovation_Brief.pdf` for claim reconciliation only; no implementation source |
| 2026-08-05 | R3 refinement | Expanded `IL-9.4` measurement acceptance | Submitted 20–40 team-hour/month pilot hypothesis required an explicit reproducible manual-versus-assisted protocol | Submitted benefit claim only; no external code/data |

## IL-5.1 authorship record

| Date | Story | Artifact | Basis | External source material |
|---|---|---|---|---|
| 2026-08-05 | `IL-5.1` | Versioned deterministic comparison, applicability-overlap and conservative claim-value contracts | Frozen R2 Reconcile Core contract and R3 story acceptance | None |
| 2026-08-05 | `IL-5.1` | Rule-set identity and no-fuzzy-authority declaration | Existing canonical JSON/digest primitives and deterministic-authority boundary | None |
| 2026-08-05 | `IL-5.1` | Eligibility, overlap, equality, incompatibility, ambiguity, symmetry and rule-identity vectors | IntelliLoop-authored synthetic claim values/scopes | None |
| 2026-08-05 | `IL-5.1` verification | Deterministic code-map fixture clock, bounded integration-test windows and isolated local E2E ports | Failures reproduced during aggregate verification on a loaded Windows host; product behavior unchanged | None |
| 2026-08-05 | `IL-5.1` | Domain, trust, testing, AI-use, submission-control and evidence documentation | Current implementation plus official submitted-claim baseline | Submitted PDF used only to preserve claims/status; no code or private data |

## IL-5.2 authorship record

| Date | Story | Artifact or behavior | Source basis | Direct candidate-source transfer |
|---|---|---|---|---|
| 2026-08-05 | `IL-5.2` | Bounded `claim-reconciliation.v1` active-claim and pair-decision contract | Frozen R2 Reconcile Core rules and dependency-eligible R3 acceptance criteria | None |
| 2026-08-05 | `IL-5.2` | `reconciliation-decision-policy.v1`, canonical finding keys and complete result digest | Existing IntelliLoop canonical JSON/digest and `IL-5.1` comparison primitives | None |
| 2026-08-05 | `IL-5.2` | Conflict/ambiguity truth table plus successor-chain, missing-link, fork, cycle, scope, ordering and limit tests | IntelliLoop-authored controlled claim fixtures | None |
| 2026-08-05 | `IL-5.2` | Domain, trust, testing, security, submission-control and evidence documentation | Current implementation behavior and explicit `IL-5.3`/`IL-5.5`/`IL-5.6` boundaries | None |

## IL-5.3 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-05 | `IL-5.3` | Bounded `reconciliation-reassessment.v1` immutable successor contract | Frozen R2 Reconcile Core staleness/missing rules and dependency-eligible R3 acceptance criteria | None |
| 2026-08-05 | `IL-5.3` | `reconciliation-support-policy.v1`, explicit requirement-set identity and canonical missing/stale finding keys | Existing IntelliLoop canonical JSON/digest, Twin projection and `IL-5.2` active-finding primitives | None |
| 2026-08-05 | `IL-5.3` | Exact source/snapshot/relationship/validation/rule dependency diff plus replay, restart, unrelated-change, missing-support and rejection tests | IntelliLoop-authored controlled Project/Mission/Twin fixtures | None |
| 2026-08-05 | `IL-5.3` | Domain, architecture, trust, testing, security, submission-control and evidence documentation | Current implementation behavior and explicit `IL-5.4`/`IL-5.5`/`IL-5.6` boundaries | None |

## IL-5.4 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-05 | `IL-5.4` | Bounded `impact-analysis.v1` traversal, cited path and `IMPACT_GAP` domain contract | Frozen R2 explainable-impact rules and dependency-eligible R3 acceptance criteria | None |
| 2026-08-05 | `IL-5.4` | `impact-traversal-policy.v1`, exact Twin/code-map/snapshot/reassessment bindings and canonical requirement/path identities | Existing IntelliLoop canonical JSON/digest, Twin, code-map and `IL-5.3` reassessment primitives | None |
| 2026-08-05 | `IL-5.4` | Expected retail paths, validation/implementation gaps, cycle/depth, irrelevant-edge, declared-fallback, ordering, restart and tamper tests | IntelliLoop-authored controlled Project/Mission/Twin/code-map fixtures | None |

## IL-5.5 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-05 | `IL-5.5` | `reconciliation-impact-revision.v1` immutable aggregate and exact component/predecessor integrity contract | Frozen R2 lineage/idempotency requirements and dependency-eligible R3 acceptance criteria | None |
| 2026-08-05 | `IL-5.5` | Migration `010`, transactional repository, canonical restart/historical replay and bounded finding/path pagination | Existing IntelliLoop SQLite lifecycle, append-only projection stores and canonical digest primitives | None |
| 2026-08-05 | `IL-5.5` | Strict reconciliation run/history/findings/impact-path contracts, routes, error mapping and exact persisted-source reconstruction service | Existing Mission-scoped Fastify/API conventions plus `IL-5.3`/`IL-5.4` domain contracts | None |
| 2026-08-05 | `IL-5.5` | Aggregate, migration, repository, service and route tests with professional API/data/setup/testing/security/governance evidence | IntelliLoop-authored controlled Project/Mission/Twin/code-map fixtures and current implementation behavior | None |

## IL-5.6 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-06 | `IL-5.6` | Strict reconciliation web client and accessible Mission findings/impact workspace with immutable revision review | Frozen R2 non-authority/citation rules and dependency-eligible R3 presentation acceptance criteria | None |
| 2026-08-06 | `IL-5.6` | Canonical Twin member-digest list seam and exact browser-originated impact declarations | Existing canonical Twin serializers, SHA-256 primitives and `IL-5.5` run contract | None |
| 2026-08-06 | `IL-5.6` | Browser conflict/correction/stale workflow, strict semantic decoder vectors and real-edge reconciliation regression | IntelliLoop-authored controlled Project/Mission/evidence/repository fixtures | None |
| 2026-08-06 | `IL-5.6` | User, trust, architecture, API, testing, security, submission-control and test-evidence updates | Current implementation behavior and explicit `IL-5.7`/validation/readiness boundaries | None |

## IL-5.7 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-06 | `IL-5.7` | Offline `EV-RECONCILE` generator over production static code-map, Twin, reconciliation, impact, API and immutable persistence paths | Frozen R2 `DC-04`/`DC-05` boundary and dependency-eligible R3 acceptance criteria | None |
| 2026-08-06 | `IL-5.7` | Controlled conflict, ambiguity, missing, impact-gap, supersession and stale truth fixture plus exact/reordered replay and restart proof | Existing IntelliLoop domain/API contracts and IntelliLoop-authored synthetic Git/evidence data | None |
| 2026-08-06 | `IL-5.7` | Generated controlled metrics report with explicit conformance, timing and non-production limitations | R3 `DOC-22` requirement and observed local generator timings | None |
| 2026-08-06 | `IL-5.7` | Host-safe E2E launcher allocation of distinct temporary loopback ports | Final regression found the operator's existing port 4173 must remain untouched | None |
| 2026-08-06 | `IL-5.7` | Domain, trust, testing, security, governance, checkpoint, backlog and evidence reconciliation | Current implementation behavior and explicit `G3`/validation/explanation/readiness boundaries | None |

## IL-6.1 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-06 | `IL-6.1` | `evidence-pack.v1` deterministic compiler, policy identity, digest and conservative transfer limits | Frozen R2 context-compiler/data-minimization boundary and dependency-eligible R3 acceptance criteria | None |
| 2026-08-06 | `IL-6.1` | Second-pass secret/private-path redaction and exact aggregate/Twin/source binding checks | Existing IntelliLoop evidence redaction, canonical digest, Twin and reconciliation invariants | None |
| 2026-08-06 | `IL-6.1` | Stable locator-derived citation IDs, allowlist-only resolver and tamper checks | R2 citation-validation boundary and current canonical item identities | None |
| 2026-08-06 | `IL-6.1` | Focused deterministic/order/redaction/bound/citation tests and professional AI-safety/evidence documentation | IntelliLoop-authored controlled Project/Mission/evidence/reconciliation fixtures | None |

## IL-6.2 through IL-6.7 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-06 | `IL-6.2` | Six-question deterministic offline renderer, statement/citation digests and invariant rerender validation | Frozen R2 offline-fallback boundary and `IL-6.1` pack contract | None |
| 2026-08-06 | `IL-6.3` | Disabled/mock-only provider-neutral request, strict structured-response validator and bounded session executor | Frozen R2 provider/citation/resource boundary and dependency-eligible R3 acceptance criteria | None |
| 2026-08-06 | `IL-6.4` | Strict cited-question API service/routes/contracts and accessible Mission explanation/disclosure workspace | Frozen R2 fixed-question/disclosure/non-authority boundary and dependency-eligible R3 story | None |
| 2026-08-06 | `IL-6.4` | `evidence-pack-compiler-policy.v2` question-directed minimization correction preserving the 12,000-unit ceiling | Aggregate `EV-CITATIONS` initially failed closed on the earlier oversized full projection | None |
| 2026-08-06 | `IL-6.4` | Server/client/API/browser negative tests plus generated `EV-CITATIONS` and G3 reconciliation | IntelliLoop-authored synthetic Project/Mission/repository/evidence fixture; no provider credential or external call | None |
| 2026-08-06 | `IL-6.4` | Architecture, API, trust, safety, operator, governance and evidence documentation | Current implementation behavior and explicit `IL-6.5`/readiness/Passport boundaries | None |
| 2026-08-06 | `IL-6.5` | Versioned digest-bound offline OpenAI checkpoint contract, invariant and fail-closed tests | Frozen R3 G4 decision enum and conditional-live-call authority | None |
| 2026-08-06 | `IL-6.5` | Generated `EV-OPENAI-EVAL`, credential-pattern guard and offline-decision evidence documentation | Passing IntelliLoop-generated `EV-RECONCILE`, `EV-CITATIONS` and `EV-PRIVACY`; no credential/provider call | None |
| 2026-08-06 | `IL-6.6` | Final AI safety/transfer inventory, authority matrix, AI-use disclosure and course-correction governance | Implemented `IL-6.1`-`IL-6.5` behavior and generated `EV-OPENAI-EVAL` offline decision | None |
| 2026-08-06 | `IL-6.6` | Executable AI documentation/evidence/backlog consistency and sensitive-body guard | R3 story acceptance criteria and existing local documentation/link-check conventions | None |
| 2026-08-06 | `IL-6.7` | Versioned deterministic synthetic edge-case set/policy, strict v2 API/client contract and accessible cited UI | Frozen R2 advisory-only boundary; R3 `SUP-03` / `AM-08` story; verified redacted evidence-pack items only | None |
| 2026-08-06 | `IL-6.7` | Domain/API/client/browser tests, extended generated `EV-CITATIONS`, backlog and professional documentation | IntelliLoop-authored controlled synthetic cancellation fixture; no provider credential, call, private repository or external source | None |

## IL-7.1 authorship record

| Date | Story | Authored artifact | Basis | Candidate-source use |
|---|---|---|---|---|
| 2026-08-06 | `IL-7.1` | Versioned `readiness.v1` obligation catalog, pure fail-closed evaluator, canonical policy/input/result digests and invariant validation | Frozen R2 readiness authority boundary and dependency-eligible R3 `IL-7.1` acceptance criteria | None |
| 2026-08-06 | `IL-7.1` | Exhaustive candidate `READY`/`BLOCKED`/`STALE` truth vectors, domain static-boundary guard and stale-predecessor regression | Existing IntelliLoop Project/Mission/GitSnapshot/reconciliation/impact contracts and IntelliLoop-authored controlled fixtures | None |
| 2026-08-06 | `IL-7.1` | Architecture, trust, security, governance, backlog and professional evidence reconciliation | Current local implementation behavior; no credential, provider call, private repository, persistence/API/UI or external source | None |

## IL-7.2 authorship record

| Date | Story | Independently authored artifact | Inputs used | Direct candidate-source copy |
|---|---|---|---|---|
| 2026-08-06 | `IL-7.2` | `release-assessment.v1`, `readiness-review.v1`, derived assessment-state contracts and canonical invariant tests | Frozen R2 readiness authority and R3 `IL-7.2` acceptance criteria; existing IntelliLoop readiness/reconciliation primitives | None |
| 2026-08-06 | `IL-7.2` | Migration `011`, SQLite readiness repository, repository-derived assessment service and production composition | Existing IntelliLoop migration/repository patterns and independently authored exact-binding design | None |
| 2026-08-06 | `IL-7.2` | Transaction/concurrency/restart/stale-history tests and architecture/trust/governance/evidence reconciliation | IntelliLoop-authored controlled Git/SQLite fixtures; no credential, provider call, private repository, HTTP readiness surface or external source | None |

## IL-7.3 authorship record

| Date | Story | Independently authored artifact | Inputs used | Direct candidate-source copy |
|---|---|---|---|---|
| 2026-08-06 | `IL-7.3` | `release-passport.v1`, structural citation manifest, canonical projection/digest and derived stale-association contracts | Frozen R2 thin-Passport authority and R3 `IL-7.3` acceptance criteria; existing IntelliLoop ReleaseAssessment contract | None |
| 2026-08-06 | `IL-7.3` | Migration `012`, immutable Passport repository/service and production composition | Existing IntelliLoop migration/repository patterns and independently authored exact one-assessment binding | None |
| 2026-08-06 | `IL-7.3` | Projection equality, tamper, concurrency, restart/history, immutability and stale-association tests plus professional evidence reconciliation | IntelliLoop-authored controlled Git/SQLite fixtures; no credential, provider call, private repository, HTTP readiness/Passport surface or external source | None |

## IL-7.4 authorship record

| Date | Story | Independently authored artifact | Inputs used | Direct candidate-source copy |
|---|---|---|---|---|
| 2026-08-06 | `IL-7.4` | Versioned readiness/Passport API resource contracts, structural export contract and strict Mission-scoped Fastify routes | Frozen R2 presentation/authority boundary, R3 `IL-7.4` acceptance criteria and existing IntelliLoop assessment/Passport services | None |
| 2026-08-06 | `IL-7.4` | Strict browser client and accessible `/missions/:missionId/passport` workspace with assessment/Passport history, state, download and print controls | Existing IntelliLoop shell/client conventions and repository-owned assessment/Passport resources | None |
| 2026-08-06 | `IL-7.4` | API, client, shell and Chromium state-matrix tests plus professional documentation/evidence reconciliation | IntelliLoop-authored controlled fixtures; no credential, provider call, private repository, external transfer or candidate source | None |

## IL-7.5 through IL-7.6 authorship record

| Date | Story | Independently authored artifact | Inputs used | Direct candidate-source copy |
|---|---|---|---|---|
| 2026-08-06 | `IL-7.5` | Generated `EV-READINESS`/`EV-PASSPORT` cross-layer proof, restart/isolation/corruption integration vectors and source-integrity binding | Existing IntelliLoop domain, SQLite, API and browser contracts plus controlled local fixtures | None |
| 2026-08-06 | `IL-7.6` | Canonical readiness/Passport operator guide, reconciled professional documentation and executable documentation contract | Verified `IL-7.1`-`IL-7.5` implementation/evidence and R3 documentation requirements | None |

## IL-8.1 authorship record

| Date | Story | Independently authored artifact | Inputs used | Direct candidate-source copy |
|---|---|---|---|---|
| 2026-08-06 | `IL-8.1` | Versioned LoopMart repository initial/correction file definitions, evidence drafts, claim successors, validation drafts, impact aliases and synthetic review | Frozen R1/R2 retail cancellation scenario and R3 `IL-8.1` acceptance criteria | None |
| 2026-08-06 | `IL-8.1` | Fixture ownership/provenance/loader-boundary schema and focused structural/privacy tests | Existing IntelliLoop synthetic-data, source-independent and authority constraints | None |
| 2026-08-06 | `IL-8.1` | Deterministic `EV-RETAIL-FIXTURE` generator with per-item/tree/set SHA-256 manifests | Package-owned inert fixture data only; no filesystem materialization, network, provider or external source | None |
| 2026-08-06 | `IL-8.1` | Controlled fixture guide, backlog and evidence reconciliation | Current implementation behavior and explicit `IL-8.2` loader/reset boundary | None |

## IL-8.2 authorship record

| Date | Story | Independently authored artifact | Inputs used | Direct candidate-source copy |
|---|---|---|---|---|
| 2026-08-06 | `IL-8.2` | Fixed generated-root materializer, ownership marker and deterministic Git initialization | IntelliLoop-owned `IL-8.1` fixture and frozen R2/R3 loader constraints | None |
| 2026-08-06 | `IL-8.2` | Migration `013`, fixed workspace lifecycle record and transaction-scoped immutable-delete authorization | Existing IntelliLoop SQLite/immutability patterns and explicit demo-reset exception | None |
| 2026-08-06 | `IL-8.2` | Normal-service loader composition and no-parameter demo status/setup/reset API | Existing Project, repository, evidence, code-map, Twin, reconciliation and readiness services | None |
| 2026-08-06 | `IL-8.2` | Real Git/SQLite restart, idempotency, reload and non-demo isolation integration proof plus documentation | IntelliLoop-authored temporary fixtures only; no credential, network, private repository or external source | None |

## IL-8.3 authorship record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-8.3` | Migration `014`, fixed correction/staleness orchestration and validation-result Twin bindings | Existing IntelliLoop domain/services plus the source-independent LoopMart fixture | None |
| 2026-08-06 | `IL-8.3` | `/demo` control room, strict client, responsive baseline styles and serial Chromium workflow | Frozen R3 golden-workflow acceptance and current product contracts | None |
| 2026-08-06 | `IL-8.3` | `EV-GOLDEN-FLOW`, demo runbook, troubleshooting and reconciled technical/governance records | Focused real Git/SQLite/API/Chromium evidence generated from IntelliLoop-authored synthetic data | None |

## IL-8.4 authorship record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-8.4` | Competition status semantics, focus restoration, loading/error presentation and responsive styles | Frozen R3 accessibility acceptance and existing IntelliLoop UI language | None |
| 2026-08-06 | `IL-8.4` | Four-case Chromium keyboard, semantic, visual-state and viewport suite | IntelliLoop-authored mocked resources plus the existing local golden workflow | None |
| 2026-08-06 | `IL-8.4` | Fixed allowlisted Git subprocess environment and credential-helper suppression | Existing golden-flow no-credential boundary and failed static evidence guard | None |
| 2026-08-06 | `IL-8.4` | `EV-ACCESSIBILITY`, accessibility review and reconciled backlog/governance records | Local Chromium and in-app browser observations only | None |

## IL-8.5 authorship record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-8.5` | Combined production-build demo gate with restart/recovery, egress interception, sentinel scan and source equality | Frozen R3 non-functional and rehearsal acceptance | None |
| 2026-08-06 | `IL-8.5` | `EV-DEMO-GATE` 5.8-minute paced rehearsal and regenerated repository/privacy evidence | IntelliLoop-authored synthetic fixture and local loopback processes | None |
| 2026-08-06 | `IL-8.5` | Release checklist, corrected port/recovery instructions and reconciled security/backlog records | Observed configured runtime and generated evidence | None |

## IL-8.6 authorship record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-8.6` | Production-build screenshot generator, exact asset manifest and script-free local fallback viewer | Frozen R3 support-package acceptance and existing IntelliLoop golden workflow | None |
| 2026-08-06 | `IL-8.6` | Seven 1366×768 fallback frames covering BLOCKED, Twin, conflict/impact, AI-off citation, READY, STALE and unavailable state | Local loopback Chromium over the IntelliLoop-owned LoopMart fixture | None |
| 2026-08-06 | `IL-8.6` | Judge Q&A, 60-second pitch, synchronized demo narration, runbook/troubleshooting/accessibility closure and `EV-DEMO-SUPPORT` | Frozen submitted claim baseline, generated IL-8.1–IL-8.5 evidence and visual review | None |

## IL-9.1 authorship record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-9.1` | Deterministic release-platform verifier and pinned Windows/Linux GitHub Actions matrix | Frozen R3 clean-install/build/test/platform/hash acceptance | None |
| 2026-08-06 | `IL-9.1` | `EV-RELEASE`, IL-9.1 evidence, setup/testing/release-checklist and backlog reconciliation | Direct local Windows observations and IntelliLoop-authored repository artifacts | None |
| 2026-08-06 | `IL-9.1` | Scope-gated web foundation assertion update | Existing implemented navigation labels; no product or acceptance weakening | None |

## IL-9.2 authorship and release-audit record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-9.2` | Exact Vite, Vitest and React-plugin security upgrades plus lockfile reconciliation | npm advisory data and official package metadata; no application-source transfer | None |
| 2026-08-06 | `IL-9.2` | Deterministic dependency/license, candidate privacy, provenance, similarity, network and mutation audit generator | Frozen R3 acceptance, exact npm lockfile and existing IntelliLoop safety evidence | None |
| 2026-08-06 | `IL-9.2` | Complete third-party inventory/notices, `EV-SECURITY-AUDIT`, similarity review and IL-9.2 evidence | Generated repository observations and IntelliLoop-authored analysis | None |
| 2026-08-06 | `IL-9.2` | Release-facing R2 path sanitization to `local-reference://` identifiers | Same historical local inputs; pre-sanitization hashes retained in audit evidence | None |

`IL-9.2` completed the bounded release audit: the exact dependency tree has approved declared licenses, both full and production npm audits report zero advisories, non-fixture secret/private-path findings are zero, reuse/adapt decisions remain zero, and the bounded similarity-marker/header review found no transfer signal. This is not a legal opinion, penetration test, universal plagiarism result or production certification. Refresh the time-sensitive audit at final freeze; `IL-9.3` is next.

## IL-9.3 authorship and documentation record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-06 | `IL-9.3` | Canonical architecture, schema, API, setup, testing, contribution, user, Passport, security and troubleshooting corrections | Current IntelliLoop implementation, generated evidence and frozen R3 documentation acceptance | None |
| 2026-08-06 | `IL-9.3` | Deterministic documentation verifier and `EV-DOCUMENTATION` | Repository-local document/API/package/asset metadata only | None |
| 2026-08-06 | `IL-9.3` | IL-9.3 evidence, release checklist and backlog/governance reconciliation | Direct local verification results and IntelliLoop-authored documentation | None |

No product runtime, provider path or authority changed. On 2026-08-07, `IL-9.4` added deterministic `EV-METRICS` generation, the anonymous six-run pilot template, controlled report, claim matrix, initial evidence-aligned submission copy and management proof guide using repository-owned evidence only. Direct in-app Chromium observation then passed the ten-case controlled leadership workflow against an isolated schema-14 directory; the `dev:demo` launcher preserves the default database and normal migration-integrity checks. The pilot validator was subsequently hardened to require complete timing, quality, feedback and sourced-cadence input, reject malformed/false-complete data and exercise its calculation with synthetic values held only in memory. Product conformance is reproducible; final story acceptance and the submitted benefit hypothesis remain open for real paired role timing/feedback and a sourced cadence. No participant data, external source or production extrapolation was introduced.

## IL-10.1 authorship and optional-feature record

| Date | Story | Artifact | Basis | External source transfer |
|---|---|---|---|---|
| 2026-08-07 | `IL-10.1` | Strict API/web feature opt-in and isolated `dev:replay` launcher | Frozen STR-01/default-off/read-only acceptance | None |
| 2026-08-07 | `IL-10.1` | Pure immutable Twin member comparison and cited accessible UI | Existing IntelliLoop Twin resources and authored LoopMart revisions | None |
| 2026-08-07 | `IL-10.1` | Focused tests, `EV-EVIDENCE-REPLAY`, direct browser observation and professional evidence | Repository-owned source, local loopback responses and IntelliLoop-authored synthetic fixture | None |

## IL-10.2 authorship and optional-feature record

| Date | Scope | Authored artifact | Basis | External source reuse |
|---|---|---|---|---|
| 2026-08-07 | `IL-10.2` | Strict API/web feature opt-in and isolated `dev:disagreement` launcher | Frozen STR-02/default-off/import-only acceptance | None |
| 2026-08-07 | `IL-10.2` | Browser-local attributed import validator, exact-text/citation comparator and accessible UI | Existing IntelliLoop cited-explanation pack/citation boundary | None |
| 2026-08-07 | `IL-10.2` | Focused tests, `EV-ADVISORY-DISAGREEMENT`, browser observation and professional evidence | Repository-owned source and IntelliLoop-authored controlled demonstration data | None |

The comparison introduces no source ingestion, provider call, repository execution, readiness decision, Passport authority or canonical write. The observed member counts and citations derive only from existing synthetic Twin revisions; no external implementation source or participant data was used.

## IL-10.3 authorship and optional-feature record

| Date | Scope | Authored artifact | Basis | External source reuse |
|---|---|---|---|---|
| 2026-08-07 | `IL-10.3` | Strict API/web feature opt-in and isolated `dev:remediation` launcher | Frozen STR-03/default-off/preview-only acceptance | None |
| 2026-08-07 | `IL-10.3` | Pure cited test-plan/change-intent proposal generator, validator and accessible UI | Existing IntelliLoop explanation pack, citation registry, gaps, conflicts and authored synthetic impact paths | None |
| 2026-08-07 | `IL-10.3` | Focused tests, `EV-REMEDIATION-PREVIEW`, direct browser observation and professional evidence | Repository-owned source, local loopback responses and IntelliLoop-authored controlled demonstration data | None |

The preview introduces no source-body ingestion or fabrication, patch application, repository write, shell/Git command, network/provider request, disposable runner, readiness decision, Passport authority or canonical write. Its browser-memory proposals are explicitly `ADVISORY_ONLY`, `NOT_EVIDENCE` and `NOT_EXECUTED`; a human must independently authorize, implement and validate any later change.

## Phase-1 baseline reconciliation record

| Date | Scope | Authored artifact | Basis | External source reuse |
|---|---|---|---|---|
| 2026-08-07 | Phase 1 | Root operator guidance, durable product target and verified execution-state record | Repository implementation, canonical backlog, migrations, tests, generated evidence and local Git observations | None |
| 2026-08-07 | Phase 1 | Canonical submission-manifest template and documentation-index/verifier integration | Existing `IL-9.6`/`IL-9.7` plans and repository-owned submission artifacts | None |
| 2026-08-07 | Phase 1 | Long browser-workflow timeout allowance and refreshed demo/security/documentation evidence | Direct local verification; assertions and product behavior unchanged | None |

No external product source, rulebook, participant result or private repository body was introduced. Phase 1 preserves the previously completed runtime and records official rules, genuine pilot observations, owner approvals and final submission/freeze actions as pending.
