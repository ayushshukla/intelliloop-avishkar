# IL-7.2 Assessment Persistence and Dependency Staleness Evidence

**Story:** `IL-7.2`  
**Checkpoint:** `READINESS_ASSESSMENT_PERSISTENCE_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Boundary:** Internal immutable assessment persistence and derived historical staleness; no readiness API/UI, Release Passport, release approval, deployment or provider authority

## Outcome

`IL-7.2` persists one canonical `release-assessment.v1` envelope around an exact invariant-checked `readiness.v1` evaluation. The assessment records its stable Mission key, revision, identity, input fingerprint, evaluated status, complete evaluation, predecessor and canonical digest. Exact same-input replay returns the existing revision. Changed input appends a digest-linked successor only when its live predecessor still matches.

The persistence service derives evaluator inputs from authoritative repositories: latest verified reconciliation, latest Mission Git snapshot, exact validation requirements in the persisted impact result, latest stored ValidationResult per required key and latest explicit stored review. It fixes integrity, attribution and persistence classifications internally. No caller-authored persistence or freshness assertion crosses HTTP; this story adds no route.

Historical state is a derived `release-assessment-state.v1` value. A fresh repository-derived evaluation is compared with the stored evaluation. Reconciliation, snapshot, finding, validation catalog/evidence, review, integrity, authority, persistence, freshness or complete input-fingerprint differences return `STALE`. The stored assessment's original evaluated status, canonical bytes and digest are never changed.

## Persistence controls

Migration `011` creates three strict append-only stores:

| Store | Exact binding | Mutation policy |
|---|---|---|
| `validation_results` | Existing evidence source and Git snapshot in the same Project/Mission | Update/delete rejected |
| `readiness_reviews` | Exact reconciliation revision/result and its target snapshot | Update/delete rejected |
| `release_assessments` | Exact reconciliation, target/current snapshots, selected review, every validation reference and predecessor | Update/delete rejected |

Assessment insertion uses `BEGIN IMMEDIATE` and rechecks the latest reconciliation revision/result, current Mission snapshot, latest review, latest validation for every required key and live assessment predecessor. A dependency race fails without a partial row. Same-input concurrency converges on one canonical assessment.

Repository hydration re-runs domain invariants and canonical serialization checks. It resolves the full predecessor chain, verifies every duplicated SQL envelope field, rehydrates every validation through its EvidenceSource/GitSnapshot binding and rehydrates the review through its reconciliation/snapshot binding. Malformed or mismatched stored history fails as `READINESS_STORAGE_SCHEMA_INVALID`.

## Focused proof

| Proof | Observation | Result |
|---|---|---|
| Domain envelope | `release-assessment.v1` preserves exact input/status/digest and denies release, Passport, deployment and AI authority | `PASS` |
| Deterministic history | Same input returns the prior object; changed input appends revision 2 with exact predecessor | `PASS` |
| Stale derivation | Snapshot and validation changes produce ordered reasons including the complete input-fingerprint change | `PASS` |
| Canonical integrity | Assessment/review round-trip succeeds and changed canonical content rejects | `PASS` |
| Schema lifecycle | Fresh bootstrap, retained upgrades, rollback, newer-version refusal and four-process startup converge on schema 11 | `PASS` |
| Repository workflow | Stored assessment is idempotent, dependency changes make revision 1 historical `STALE`, a truthful `STALE` successor retains its exact historical review binding, and revision-1 canonical bytes remain equal | `PASS` |
| Dependency matrix | Review, validation, snapshot and reconciliation changes are detected; reconciliation change also detects validation-catalog change | `PASS` |
| Restart | Closed/reopened SQLite returns the exact original ReleaseAssessment | `PASS` |
| Concurrency | Two identical assessment requests produce one row, one stable identity and created flags `true`/`false` | `PASS` |
| Atomic failure | Forced successor insertion failure retains exactly the prior assessment row | `PASS` |
| Scope isolation | Unknown Project access fails before cross-scope assessment retrieval | `PASS` |

Focused commands:

```text
npx.cmd vitest run packages/domain/test/readiness-assessment.test.ts --config vitest.unit.config.ts
npx.cmd vitest run apps/api/test/readiness-repository.test.ts --config vitest.api.config.ts
npx.cmd vitest run apps/api/test/database-lifecycle.test.ts --config vitest.api.config.ts
```

Observed focused result: 4/4 domain vectors, 3/3 repository/service vectors and 15/15 database-lifecycle vectors passed.

## Complete repository gate

| Gate | Observation | Result |
|---|---|---|
| Type safety | All workspace typechecks | `PASS` |
| Unit/component | 363/363 tests across 41 files | `PASS` |
| API/integration | 152/152 tests across 30 files | `PASS` |
| Production build | Web bundle completed with 88 transformed modules | `PASS` |
| Generated evidence | Repository safety, privacy, Twin, code map, reconciliation, citations and offline OpenAI checkpoint | `PASS` |
| AI documentation | Offline finale posture, transfer inventory, authority limits, checkpoint evidence and sensitive-body guards | `PASS` |
| Documentation | 76 Markdown files; zero broken local targets | `PASS` |
| Browser regression | 8/8 isolated Chromium workflows | `PASS` |

The final API rerun includes the regression that persists a `STALE` successor after the reconciliation digest changes while retaining the exact older review. SQL insertion and repository hydration compare that review's identity, actor, scope, snapshot, reconciliation digest and review digest; they do not misrepresent it as a review of the newer reconciliation.

The repository-safety and Twin/code-map generators initially encountered the Windows sandbox boundary while creating Git history inside disposable synthetic repositories. Both passed without code or limit changes after permission was granted for those isolated fixture operations. No candidate or personal repository was used or modified.

## Authority statement

- The embedded `readiness.v1` evaluation remains `NOT_PERSISTED`; the enclosing assessment alone is `PERSISTED_IMMUTABLE`.
- `READY` in a stored assessment is deterministic readiness for its exact bound inputs, not human release approval or deployment authorization.
- `AI_ADVISORY` review is attributed but cannot satisfy the human-review obligation.
- Derived `STALE` never overwrites the old assessed status or canonical record.
- No Release Passport exists. `IL-7.3` owns projection from exactly one persisted assessment and must not recompute readiness.
- No readiness/validation/review route or browser surface exists. `IL-7.4` owns supported API/UI.
- No provider, credential, network call, registered-repository mutation or execution path was added.

## Next checkpoint

The next dependency-eligible story is `IL-7.3`, Release Passport projection and digest. It must consume exactly one persisted ReleaseAssessment, reproduce rather than recompute readiness, retain the assessment binding and expose any later stale association without changing historical Passport bytes.
