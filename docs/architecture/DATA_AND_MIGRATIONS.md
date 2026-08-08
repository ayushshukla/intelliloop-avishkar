# IntelliLoop Data and Migrations

**Audience:** Developers, reviewers and demo operators  
**Status:** `IMPLEMENTED` for schema lifecycle through controlled demo workspace ownership/reset  
**Runtime documented through:** `IL-8.3`; schema is migration `014`  
**Documentation finalized through:** `IL-9.3`  
**Evidence date:** 2026-08-06

This document is the current authority for SQLite ownership, schema history, Project/Mission, Git-snapshot, evidence-source/timeline, claim/supersession, runtime-observation, canonical Twin-revision, snapshot-bound code-map-revision, reconciliation/impact aggregate, validation-result, explicit-review, ReleaseAssessment and Release Passport persistence, and startup behavior.

## Ownership and placement

- `apps/api` is the only package permitted to open SQLite.
- The browser, contracts and domain packages never receive a database handle.
- The database filename is `intelliloop.sqlite3` under the configured data directory.
- `INTELLILOOP_DATA_DIRECTORY`, when supplied, must be a bounded absolute non-root directory.
- The Windows default is the current user's `AppData\Local\IntelliLoop` directory; the non-Windows default is `.local/share/intelliloop` under the current home directory.
- Operators must keep any override outside every registered repository. Registration compares the canonical database file to the proposed canonical root and rejects containment.

No absolute database path is returned by the API or emitted in normal logs.

## Connection policy

Each connection enables:

| SQLite setting | Value | Purpose |
|---|---:|---|
| `busy_timeout` | 5000 ms | Bounded wait during concurrent startup and writes |
| `foreign_keys` | `ON` | Enforce future relational constraints per connection |
| `journal_mode` | `WAL` | Local crash/concurrency baseline |
| `synchronous` | `FULL` | Durable local commits |

Brand-new-file WAL initialization also retries only transient `SQLITE_BUSY`/`SQLITE_LOCKED` results for at most five seconds. This closes a Windows multi-process cold-start race without retrying schema or integrity failures.

The API closes the database on normal shutdown and on listener-start failure.

## Forward-only migration protocol

Migrations are authored SQL definitions with contiguous integer versions starting at 1. Startup performs this sequence:

1. create the configured parent directory and open the SQLite file;
2. configure the connection;
3. acquire `BEGIN IMMEDIATE` before reading schema state;
4. read `PRAGMA user_version` and validate the complete applied history;
5. hash each authored SQL body with UTF-8 SHA-256;
6. apply every pending migration in version order;
7. insert version, name, checksum and canonical UTC application time into `schema_migrations`;
8. set `user_version`, revalidate history and commit.

Any failure before commit rolls back the batch. No migration-down operation exists. An unversioned non-empty file, missing/altered history, discontinuous application plan or unknown newer version fails closed.

## Schema history

| Version | Name | Authored SQL SHA-256 | Creates | Product data |
|---:|---|---|---|---|
| `001` | `schema_history_foundation` | `sha256:7a95f507fddb90d2f1e3ee71c37a0df4e58707c8b712715dd64857f6510b61bb` | Strict `schema_migrations` table | None |
| `002` | `projects_and_missions` | `sha256:6744e43f4d95581001b19d230f6a716591da2b5c5b34b2200c9013f4e5d5a0c3` | Project/Mission heads, immutable revisions and indexes | Project and ChangeMission |
| `003` | `repository_registrations` | `sha256:631f3beb17ccce7f7c60fae33100a67cec2ac9a3246210a523cec87949905d73` | Strict `repositories` table and Project index | Canonical local repository binding |
| `004` | `git_snapshots` | `sha256:c19795a7f282708ddbe9e392811edd611d7a263cbc22d5dd7bbee045adb83a34` | Strict snapshot table, scoped indexes and immutability triggers | Path-free Git identity/status observation |
| `005` | `evidence_sources_and_timeline` | `sha256:9a6ebbb0147d9731318d0689f236566bdeab870183a6b05ca9f677f934bb5e6c` | Strict evidence-source/timeline tables, scoped indexes and immutability triggers | Redacted attributed sources and import events |
| `006` | `claims_and_supersessions` | `sha256:304073b353710dc5c306813a9bdadffbf0478bb46a0c5e6fa30df7317c0ce60c` | Strict claim/supersession tables, attribution/index constraints and immutability/validation triggers | Normalized claims and explicit successor links |
| `007` | `runtime_observations` | `sha256:4b5c68792f1f085a65dc8334a8c34f0cb2811dc1a94893bd9aa7b6f1bf3b101b` | Strict observation table, evidence-shape/source validation, series/window indexes and immutability triggers | Historical runtime-observation projections |
| `008` | `twin_revisions` | `sha256:47a8f1f76ad0c747cb9a4c3e6e8772b97c283dd9f79886e0e1c2b63d3acaee9f` | Canonical projection store, scope/predecessor/count checks, mission index and immutability/insertion triggers | Complete immutable Twin revision documents |
| `009` | `code_map_revisions` | `sha256:4132cb64f43e71435c576700691f7305ce431125911f6507547c0d2afb9b6e04` | Canonical snapshot-bound code-map store, inferred/declared mode constraints, predecessor/scope checks and immutability triggers | Source-free inferred or explicitly declared code-map revisions |
| `010` | `reconciliation_impact_revisions` | `sha256:0d41e3f0b3da56dad9e5e8dfd9b4d56ed25bca6dea82156dda386111947083ff` | Canonical combined reassessment/impact store, exact Twin/code-map/snapshot bindings, predecessor/scope/count checks and immutability triggers | Complete immutable reconciliation/impact revision documents |
| `011` | `readiness_assessments` | `sha256:198d70f8dc0bf0907ab7059bff8450018f1e13a79f49b266f08ae38b379dd297` | Append-only validation/review/assessment stores, exact scope/dependency JSON checks, predecessor constraints and immutability triggers | Structured validations, explicit reviews and immutable ReleaseAssessment history |
| `012` | `release_passports` | `sha256:918dd545d57844766f20a7b50126e4c8ecbc8a747cae9cc37e4d061a49f42a23` | Canonical one-assessment Passport store, exact duplicated binding checks, unique assessment projection and immutability triggers | Unsigned immutable Release Passport history |
| `013` | `demo_workspaces` | `sha256:ff773fb7415d08f0a6a87a7748071ffb12b7b9dfe9bf596b1cef814694b127ea` | Fixed-fixture ownership/lifecycle record and narrowly gated delete triggers | Dedicated generated LoopMart setup/reset only |
| `014` | `demo_golden_workflow` | `sha256:c2daa90d3dc40503b099cadf4adb5a544bf24d69e24324f4f2831bfcd6fdc0ae` | Constrained golden-workflow stage and exact correction/readiness/Passport/staleness pointers | Server-owned `BLOCKED → READY → STALE` demo orchestration state |

The history table stores `version`, `name`, `checksum` and `applied_at_utc`. Restart validates the version/name/checksum sequence and the canonical timestamp before allowing startup.

Migration `002` stores stable identities separately from append-only revision rows. Head rows point to exact immutable revisions. Foreign keys retain Project scope, and a partial unique index permits at most one `CURRENT` mission per Project. Repository writes use immediate transactions; archival appends revision 2 and advances the guarded head. There is no hard-delete path.

Migration `003` stores one stable registration identity, exact Project scope, canonical absolute root, fixed `READ_ONLY` mode and registration time. Unique constraints prevent a Project from acquiring two roots and prevent one root from crossing Project scopes. The private canonical root is not serialized by the ordinary API. Registration has no update or delete path.

Migration `004` stores stable snapshot, Project, Mission and registration identities; capture time; head state; optional branch/commit; dirty/count summary; and one canonical changed-file digest. Composite foreign keys prevent a snapshot from crossing Mission or registration scope. SQL checks enforce head-state shape, digest form, non-negative bounded relationships and exact dirty/count correspondence. Update and delete triggers make rows append-only even through direct storage access. Raw repository roots and filenames are not stored in this table.

Migration `005` creates `evidence_sources` and `timeline_events`. Evidence rows retain exact scope, import key, origin, logical locator, optional revision/effective time, recorded time, extraction/epistemic metadata and the redacted normalized prepared representation. Byte counts and SHA-256 forms are constrained; raw input is absent. A unique Mission/import-key constraint prevents duplicate source records.

Each new source atomically creates one `EVIDENCE_IMPORTED` event. A unique Mission/sequence constraint provides stable chronological pagination, and a composite foreign key binds event identity, scope and occurrence time to the immutable source. Update/delete triggers protect both tables.

Migration `006` creates `claims` and `claim_supersessions`. Claim rows retain stable identity, exact scope/source attribution, versioned import/claim/comparison/applicability digests, recorded/effective time, extraction/epistemic metadata, verbatim redacted-source excerpt, normalized subject/predicate, canonical JSON value and canonical applicability. A composite foreign key binds the complete stored source attribution to `evidence_sources`; scoped import-key uniqueness makes exact intake idempotent.

Supersession rows retain their own stable identity/digest and the successor's attribution. Composite foreign keys bind both claims to the same scope. An insert-validation trigger requires predecessor and successor to share exact comparison/applicability keys, requires the link metadata to equal the successor and rejects backwards recording time. Unique predecessor and successor constraints make direct links linear; update/delete triggers protect both tables. Migration `006` itself stores neither Twin projections nor conflict findings.

Migration `007` creates `runtime_observations` as a one-to-one immutable projection of an evidence source. Rows retain stable identity, exact scope/source identity, schema version, series key, summary digest, subject, environment, observation kind, canonical window, sample/measurement counts and the source's recorded time. Composite foreign keys bind exact scope/source/time. The insert trigger requires an allowed source origin, direct JSON import, the 32 KiB ceiling, effective time equal to the window end, eight exact top-level summary members and matching normalized JSON values. Domain hydration recomputes both digests and verifies every duplicated column.

The series/window index supports derived freshness without a stored mutable flag. Strictly later window ends make older rows stale at read time; equal window ends remain co-latest. Update/delete triggers preserve history. The table contains no readiness, validation, connector, polling or provider state.

Migration `008` stores each complete canonical `twin-projection.v1` document alongside exact Project/Mission scope, positive projection revision, input/projection digests, recorded time, predecessor revision/digest and verified member counts. A composite primary key preserves the deterministic projection identity across revisions; Mission/revision and projection/digest uniqueness prevent ambiguous selection. JSON checks bind the stored envelope and counts to the canonical document.

The insertion trigger requires revision 1 to be the first Mission Twin row and every later row to cite the immediately preceding revision and exact digest. Update/delete triggers make history append-only. Repository hydration re-runs the domain deserializer and compares every stored envelope field, predecessor and count; any mismatch or digest failure becomes `TWIN_STORAGE_SCHEMA_INVALID` and the HTTP boundary returns the dedicated non-revealing `INTEGRITY_ERROR`.

Migration `009` stores each complete canonical `code-map-projection.v1` document with exact Project, Mission, repository registration and Git snapshot identity; input, snapshot, source and projection digests; evidence kind, inference status and completeness; optional declared-manifest/fallback labels; predecessor linkage; and asset/edge counts. SQL mode checks make `STATIC_INFERENCE` valid only with `AVAILABLE` plus `COMPLETE`/`PARTIAL`, while `DECLARED_INTELLILOOP_FIXTURE` requires `UNAVAILABLE_SAFE_FAILURE`, `UNAVAILABLE`, a manifest identity and an explicit fallback reason.

The insertion trigger verifies that the referenced Git snapshot has the same Project, Mission and registration, then enforces the exact predecessor chain. Update/delete triggers preserve history. Repository hydration re-runs canonical deserialization, deterministic member identity/digest checks and complete envelope comparison; corruption becomes `CODE_MAP_STORAGE_SCHEMA_INVALID`. Code-map rows contain logical relative paths and static identifiers, never source text, repository roots or runtime claims.

Migration `010` stores each complete canonical `reconciliation-impact-revision.v1` document with one stable Project/Mission lineage key; exact Twin, target-snapshot and code-map identities/digests; the code-map evidence/inference/completeness tuple; reassessment and impact result digests; predecessor identity; per-kind finding counts; impact-path count; and the complete aggregate input/result digests. The canonical document is capped at 16 MiB. JSON checks bind every duplicated envelope, trust and count field to the stored document.

Composite foreign keys and an insert trigger require the selected Twin, code-map and snapshot rows to exist in the same Project/Mission scope, require the code map to use that exact snapshot, and retain the code-map trust labels. A Mission has one positive revision sequence and one row per canonical input digest. Revision 1 has no predecessor; each successor cites the immediately prior revision/result digest. Update/delete triggers preserve historical bytes. Repository hydration re-runs both component invariants, aggregate deserialization and complete envelope/count comparison before returning any summary, finding or path.

Migration `011` stores structured `ValidationResult` values, `readiness-review.v1` records and canonical `release-assessment.v1` envelopes. A validation row is bound to one existing evidence source and Git snapshot in the same Project/Mission and preserves key, outcome, origin, result digest, recorded time and complete canonical value. A review is bound to one exact reconciliation revision/result and its target snapshot. Both reject update/delete.

Each ReleaseAssessment duplicates and SQL-checks its Mission lineage key/revision, recorded time, evaluation input fingerprint, evaluated status, exact reconciliation and snapshot bindings, selected review, validation-evidence count, predecessor and assessment digest. An insert trigger verifies the exact reconciliation row, current snapshot, review digest and every JSON-listed validation result against immutable source rows. Revision 1 has no predecessor; later revisions cite the immediately preceding assessment digest. The repository rehydrates the full predecessor chain, re-runs domain assessment/evaluation invariants, then rehydrates every referenced validation and review before returning a record.

Assessment creation derives all persistence and freshness assertions inside the API process. Its immediate transaction rechecks the latest reconciliation revision/result, latest Mission snapshot, latest explicit review, latest validation per required key and live assessment predecessor. A same-input race returns the one existing canonical row; a changed dependency or stale predecessor fails without a partial insert. Historical `STALE` is computed at read time against a newly derived evaluation and never stored by updating an old assessment.

Migration `012` stores one canonical `release-passport.v1` per ReleaseAssessment. Duplicated Project/Mission, assessment identity/revision/digest, assessed status and complete input/evidence digest must equal the existing immutable assessment row. The canonical document additionally carries copied obligations, blockers, finding counts, validation/review details, structural citations, unsigned/non-approving authority and its own digest. Update/delete triggers protect history.

Passport projection first hydrates the owning assessment, then persists under an immediate transaction that rechecks its exact row. Same-assessment retry or concurrency returns the single existing Passport. Restart rehydrates the assessment chain and re-runs the Passport projection invariant before returning history. Current `STALE` is a derived association with assessment state; neither table is updated.

Migration `013` adds one fixed `demo_workspaces` row shape plus an internal `demo_reset_authorizations` gate. Ordinary immutable-row delete triggers still reject mutation. They allow deletion only while the same transaction contains authorization for the exact recorded LoopMart Project, after which the authorization is removed. The API route accepts no caller scope. Reset deletes child rows in dependency order with deferred foreign-key enforcement and checks the exact Project deletion count.

Migration `014` extends that row with a constrained `workflow_stage` and exact corrected snapshot/code-map/Twin/reconciliation, READY assessment/Passport and stale snapshot references. Insert/update triggers require every reference needed by `CORRECTED_READY` and `READY_STALE`; incomplete or out-of-order lifecycle state cannot be persisted. Product histories remain append-only—the row records orchestration pointers and never rewrites an assessment or Passport.

## Concurrency and restart behavior

The schema state is read only after the immediate transaction acquires SQLite's writer lock. Competing API processes therefore cannot both act on a stale version-0 observation. The retained acceptance test releases four independent Node processes against one empty file and requires all four to return schema version 14 with exactly fourteen migration records. Retained version-1 through version-6, version-8 and version-9 fixtures upgrade without changing their original timestamps.

Restart opens the same file, validates existing history and performs no rewrite. Integration tests close and reopen the file and require exact Project/Mission, EvidenceSource/timeline and Claim/supersession equality. A database whose `user_version` or history exceeds the application migration plan is never downgraded or opened as current.

## Record consistency and concurrency

- Project/Mission creation and lifecycle transitions are atomic.
- Revision rows are retained; a head advances only from its expected prior revision.
- Project archival rejects while a current mission exists.
- Mission operations validate exact Project ownership.
- Two independent processes creating a current mission converge on one winner and one stable conflict.
- Pagination orders by immutable identity and reads at most `limit + 1` rows.
- Repository registration inserts under an immediate transaction after Project-state and duplicate checks.
- Restart returns the exact private canonical registration while the API emits only path-free metadata.
- Git snapshot insertion rechecks active Mission scope and exact registration inside an immediate transaction after bounded Git reads.
- Snapshot rows are never updated or deleted; restart hydrates and revalidates every field before returning it.
- Evidence import revalidates the prepared digest, enters an immediate transaction, rechecks active/current scope and returns an exact existing source/event for the same import key.
- Distinct evidence sources and timeline events append atomically; both tables reject update/delete and hydrate through domain invariants after restart.
- Claim intake rechecks current scope and source identity, derives a versioned import key and returns the exact existing row for a retry.
- Conflicting claim values append independently; persistence does not select a winner.
- A successor claim and its `SUPERSEDES` link append in one immediate transaction. If link insertion fails, the successor insert rolls back.
- One predecessor may have at most one direct successor. Chains remain readable and hydrate through source, claim and link invariants after restart.
- Runtime-summary import prepares/redacts before entering one immediate transaction, then appends or reuses the source/event and inserts at most one observation for that source.
- Runtime observations reject update/delete, hydrate through source and observation invariants after restart and derive stale/current presentation from immutable later-window rows.
- Twin materialization loads bounded persisted Mission sources, uses the latest verified projection as predecessor and returns that exact row when the input digest is unchanged.
- A changed projection appends only when its predecessor revision/digest still matches the live head; concurrent stale writers fail with a stable conflict.
- Twin revision, node and relationship reads hydrate and integrity-check the complete canonical document before any list resource is returned.
- Code-map persistence is idempotent on the complete input digest and appends only against the live predecessor; snapshot scope is rechecked by SQL.
- Code-map restart reads verify every duplicated column plus deterministic projection/member digests before returning the canonical revision.
- Reconciliation persistence uses one immediate transaction, rechecks Project/Mission scope and the live predecessor, and returns any existing Mission row with the same complete input digest rather than duplicating it.
- Historical replay is idempotent: if an older canonical input is requested after newer revisions exist, the exact older stored revision is returned with no history rewrite.
- Reconciliation revision, finding and impact-path reads hydrate and verify the full combined aggregate before paging deterministic revision or digest identities.
- Forced insert failure rolls back without a partial aggregate; direct update/delete triggers reject mutation.
- Validation and explicit-review records append only after exact source/snapshot/reconciliation invariant checks; a conflicting stable identity is rejected rather than silently reused.
- Assessment input is derived from authoritative repositories, then an immediate transaction rechecks every latest dependency and the live predecessor before insertion.
- Concurrent identical assessment requests converge on one input fingerprint/revision, forced insertion failure leaves the prior chain unchanged, and restart revalidates canonical assessment, validation and review bindings.
- Historical assessment state compares exact input fingerprints and named dependencies; dependency changes produce `STALE` while stored canonical bytes remain unchanged.
- Passport projection is unique per assessment, converges under retry/concurrency, revalidates the owning assessment on restart and derives stale association without updating Passport bytes.

## Twin projection persistence

`IL-4.2` established the canonical `twin-projection.v1` representation. `IL-4.3` persists that representation without flattening away source bindings, dependency bindings or invalidation records. Current schema version is 14. Revision metadata pages sort newest first by positive revision; node and relationship pages retain deterministic identity order.

The table is an immutable history store, not reconciliation or readiness authority. Materialization is explicit through the local Mission route; there is no background refresh, polling, filesystem scan or automatic winner selection. A later source append requires another explicit materialization to create a successor revision.

## Current exclusions

Current schema version is 14. `IL-4.4` source bundles and `IL-4.5` extraction objects remain transient, while `IL-4.6` persists only the source-free snapshot-bound projection. `IL-5.4` traversal remains a pure domain operation; `IL-5.5` persists its result only as part of the combined aggregate. `IL-6.4` reconstructs cited explanations statelessly and persists no pack, question, explanation, disclosure or provider result. `IL-6.5` creates only a generated repository evidence report; no checkpoint, credential or provider metric enters SQLite. `IL-6.7` computes its synthetic suggestion set in memory. `IL-7.1` computes a pure `NOT_PERSISTED` evaluation; `IL-7.2` stores immutable ReleaseAssessments and `IL-7.3` stores unsigned one-assessment Passport projections. `IL-8.2` adds fixed-fixture ownership/reset state and `IL-8.3` adds only its constrained golden-workflow pointers. There is no public validation/review intake, Passport mutation, signing, deployment approval, backup/restore UI, corruption repair UI or configurable retention. Outside the exact internally authorized generated demo Project, immutable histories remain undeletable.
