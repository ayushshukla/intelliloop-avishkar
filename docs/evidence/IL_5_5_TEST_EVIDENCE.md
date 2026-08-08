# IL-5.5 Test Evidence - Reconciliation/Impact Persistence and API

**Story:** `IL-5.5` - Reconciliation and impact persistence and API  
**Status:** `PASS`  
**Checkpoint:** `RECONCILIATION_IMPACT_API_READY`  
**Evidence date:** 2026-08-05  
**Boundary:** Immutable local aggregate persistence and strict Mission-scoped API; no reconciliation UI, persisted validation-result intake, provider call or readiness authority

## Implemented contract

`reconciliation-impact-revision.v1` combines one invariant-checked reassessment with its exact deterministic impact analysis. It binds:

- one Project/Mission lineage key and positive aggregate revision;
- the exact Twin projection identity, revision and digest;
- the exact target Git snapshot;
- the exact code-map projection identity, revision, digest, evidence kind, inference status and completeness;
- complete reassessment and impact results plus their input/result identities;
- an optional immediately preceding aggregate revision/result digest;
- deterministic counts for `CONFLICT`, `AMBIGUOUS`, `MISSING`, `STALE` and `IMPACT_GAP`; and
- the exact persisted impact-path count and complete aggregate result digest.

Exact replay of the latest input returns the same aggregate object. A changed canonical input appends one successor without modifying its predecessor. If a previously persisted input is requested again after later revisions exist, persistence returns that exact historical row with `created: false`; it does not duplicate the input or rewrite history.

Migration `010`, `reconciliation_impact_revisions`, has authored SQL checksum:

```text
sha256:0d41e3f0b3da56dad9e5e8dfd9b4d56ed25bca6dea82156dda386111947083ff
```

The table stores the complete canonical aggregate and independently constrained envelope/count fields. Foreign keys and insertion checks require exact same-scope Twin, code-map and snapshot rows, exact code-map trust metadata and an unbroken predecessor chain. Update/delete triggers reject mutation. Hydration deserializes and verifies the complete domain value, reserializes it canonically and compares every stored envelope/count field before returning any revision, finding or path.

## API boundary

Five localhost routes are implemented:

| Method and path | Result |
|---|---|
| `POST /api/v1/missions/:missionId/reconciliation/revisions` | New immutable revision (`201`) or exact current/historical input replay (`200`) |
| `GET /api/v1/missions/:missionId/reconciliation/revisions` | Newest-first bounded revision summaries |
| `GET /api/v1/missions/:missionId/reconciliation/revisions/:revision` | Exact verified summary |
| `GET /api/v1/missions/:missionId/reconciliation/revisions/:revision/findings` | Digest-ordered bounded canonical findings |
| `GET /api/v1/missions/:missionId/reconciliation/revisions/:revision/impact-paths` | Digest-ordered bounded cited impact paths |

The POST body requires exact persisted Twin/code-map/snapshot selectors plus explicit support requirements, impact roots and impact requirements. Explicit empty arrays are valid and create no implicit obligation. Callers cannot submit semantic relationships, findings, paths, aggregate identity, predecessor metadata, timestamps or readiness state. Request arrays use domain limits; member pages default to 20 and cap at 100.

The execution service reconstructs evidence sources, claims and supersession links only from the exact selected Twin. It verifies the Twin's exact code-map binding, asset digests, code-derived relationships, snapshot and registration before evaluation. Persisted validation-result intake is not implemented: no result is invented or accepted from the caller, and a selected Twin containing validation state that cannot be reconstructed fails closed with a stable conflict.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| Exact aggregate binding | Component scope, Twin, snapshot, code-map trust tuple and reassessment binding are revalidated before creation and hydration | `PASS` |
| Same-input idempotency | Current replay returns the original aggregate; database uniqueness and lookup return an exact previously stored input | `PASS` |
| Historical replay | Revision 1 input replay after revision 2 returns byte-identical revision 1 without appending | `PASS` |
| Baseline → `SUPERSEDES` successor → replay | The service first persists the no-link baseline, reconstructs only the exact selected-Twin `SUPERSEDES` edge for the successor run, appends once and returns that exact successor on replay | `PASS` |
| Successor lineage | Changed impact input appends revision 2 with exact predecessor result digest even when reassessment revision is unchanged | `PASS` |
| Transaction failure | A forced insert abort leaves the aggregate count unchanged | `PASS` |
| Immutability | Direct update/delete attempts fail under database triggers | `PASS` |
| Restart and integrity | Close/reopen preserves exact canonical history; valid-but-noncanonical stored JSON rejects before return | `PASS` |
| Finding/path pagination | Stable digest order, bounded pages and exact cursors are verified | `PASS` |
| Strict route contract | POST `201/200`, exact/list/findings/path reads, unknown fields, over-limit roots and malformed cursor behavior are verified | `PASS` |
| Production wiring | Routes register only with complete repository/execution dependencies; build-app errors remain stable and non-revealing, and exact code-map bindings survive the production response boundary | `PASS` |
| Exact execution inputs | Only selected-Twin source identities are loaded; code-map mismatch and unreconstructable validation state fail closed | `PASS` |
| Schema lifecycle | Empty bootstrap, restart, retained-version upgrades through `009`, rollback and unknown-newer refusal target schema version 10 | `PASS` |

## Executed verification

```powershell
npm.cmd run build:packages
npm.cmd run typecheck
npx.cmd vitest run --config vitest.unit.config.ts packages/domain/test/impact-analysis.test.ts packages/domain/test/reconciliation-impact-revision.test.ts
npx.cmd vitest run --config vitest.api.config.ts apps/api/test/database-lifecycle.test.ts apps/api/test/reconciliation-repository.test.ts apps/api/test/reconciliation-service.test.ts apps/api/test/reconciliation-routes.test.ts apps/api/test/production-wiring.test.ts apps/api/test/reconciliation-supersession-rerun.test.ts
```

Observed results on 2026-08-05:

- package build completed successfully;
- all five workspace typechecks passed;
- 17 focused domain tests passed: 14 impact-analysis vectors and 3 aggregate-lineage vectors; and
- 34 focused API tests passed: 15 database-lifecycle vectors, 4 reconciliation-repository vectors, 3 execution-service vectors, 7 route-contract vectors, 4 production-wiring/error-classification vectors and 1 exact supersession-rerun vector.

These are focused story observations. This record does not invent or claim a new final full-suite, browser, audit or production-build count; the release-wide aggregate remains subject to the owning gate commands.

## Authority and delivery boundary

The aggregate proves deterministic derivation, exact lineage and storage/API integrity for the supplied bounded local inputs. It does not prove that a source, static code edge, claim, finding or path is semantically true. `OPEN`, `MISSING`, `STALE` and `IMPACT_GAP` are evidence states, not release decisions.

`IL-5.6` still owns reconciliation/impact browser presentation. Persisted validation-result intake, cited explanations, provider integration, readiness and Release Passport behavior remain unimplemented. No AI system creates, removes or resolves a canonical finding, supplies a validation result or authorizes release.
