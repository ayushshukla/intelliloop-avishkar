# IL-7.3 Release Passport Projection and Digest Evidence

**Story:** `IL-7.3`  
**Checkpoint:** `RELEASE_PASSPORT_PROJECTION_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Boundary:** Internal immutable, unsigned projection of one persisted ReleaseAssessment; no readiness/Passport API or UI, release approval, deployment or provider authority

## Outcome

`IL-7.3` adds `release-passport.v1`, a thin immutable projection of exactly one persisted `release-assessment.v1`. The projection copies—not recalculates—the assessment scope, target/current snapshot binding, readiness rule version/digest, complete assessment-input digest, evaluated status, ordered obligations and blockers, finding counts, validation requirements/evidence, review and structural citation manifest. Its own key and digest bind the exact assessment identity, revision and digest.

The citation manifest contains only identifiers/digests already carried by the assessment: assessment, reconciliation, target/current snapshots, validation results and optional explicit review. It is not a substitute evidence pack and adds no unstored claim, finding or approval.

`release-passport-state.v1` associates the immutable Passport with its owning derived assessment state. A later dependency change yields `STALE` and exact assessment stale reasons while `passportChanged` remains false. This association does not rewrite Passport bytes and the Passport module does not invoke the readiness evaluator.

## Persistence controls

Migration `012` adds one append-only `release_passports` table. Each row is unique for one assessment and stores exact scope, assessment revision/digest, assessed status, complete input/evidence digest and canonical Passport digest. An insertion trigger requires an existing same-scope ReleaseAssessment with all duplicated binding fields equal. Update and delete operations reject.

The repository rehydrates the owning assessment through the IL-7.2 invariant chain, deserializes the Passport against that exact assessment and compares every duplicated SQL field with canonical JSON. Projection is idempotent; concurrent requests for the same assessment converge on one Passport. Bounded history is ordered by assessment revision and survives restart.

## Focused proof

| Proof | Observation | Result |
|---|---|---|
| Exact projection | Scope, snapshots, rule, evidence digest, status, obligations, blockers, findings, validations and review equal the persisted assessment | `PASS` |
| No recomputation | Passport authority is `REPRODUCED_NOT_RECOMPUTED`; the domain module imports no evaluator, infrastructure, provider or deployment primitive | `PASS` |
| Canonical equality | Same assessment plus fixed ID/time produces exact object/byte/digest equality | `PASS` |
| Tamper failure | Changed status/projection content with the old digest fails invariant deserialization | `PASS` |
| Citation manifest | Assessment/reconciliation/snapshot/validation/review references reproduce exact stored identifiers and digests | `PASS` |
| Stale association | Dependency change produces derived Passport `STALE` with exact assessment reasons and unchanged historical bytes | `PASS` |
| Binding failure | A state for another assessment cannot be associated with the Passport | `PASS` |
| Persistence/restart | Two Passports persist for assessment revisions 1/2, retrieve in order and reload byte-equal | `PASS` |
| Idempotency/concurrency | Repeated and concurrent same-assessment projection produce one stable Passport row | `PASS` |
| Immutability | SQL update and delete triggers reject changes | `PASS` |
| Migration lifecycle | Empty bootstrap, retained upgrades, rollback, newer-version refusal and four-process startup converge on schema 12 | `PASS` |

Focused commands:

```text
npx.cmd vitest run packages/domain/test/readiness-assessment.test.ts --config vitest.unit.config.ts
npx.cmd vitest run apps/api/test/readiness-repository.test.ts apps/api/test/database-lifecycle.test.ts apps/api/test/startup.test.ts --config vitest.api.config.ts
```

Observed focused result: 8/8 combined assessment/Passport domain vectors and 21/21 persistence/migration/startup vectors passed.

## Complete repository gate

The completed `IL-7.3` gate passed all workspace typechecks, 367/367 unit/component tests across 41 files, 153/153 API/integration tests across 30 files, an 89-module production web build, all seven generated repository-safety/privacy/Twin/code-map/reconciliation/citation/offline-checkpoint reports, the AI-safety documentation contract, 77 Markdown files with zero broken local targets and 8/8 isolated Chromium workflows.

The reconciliation and offline-checkpoint documentation guards initially detected missing historical README proof markers. The accurate `EV-CITATIONS`, `IL-6.5` and `IL-6.6` context was restored; both generators then passed without changing a product rule, test expectation or resource limit. The first unit-suite attempt was also blocked before test collection by the Windows sandbox denying Vitest's local esbuild child process; the unchanged suite passed after that process permission was granted.

## Authority statement

- A Passport is an unsigned local record, not a certificate, attestation or signed enterprise artifact.
- It reproduces the exact assessed status; it cannot approve, waive, deploy or set readiness.
- `READY` means only that the persisted assessment satisfied `readiness.v1` for its exact historical inputs.
- A derived stale association never edits the Passport or its owning assessment.
- No provider, AI output or caller-supplied field participates in projection.
- No readiness/Passport route, export or browser surface exists. `IL-7.4` owns those supported boundaries.

## Next checkpoint

The next dependency-eligible story is `IL-7.4`, readiness and Passport API/UI. It must expose only repository-hydrated assessment/Passport history, preserve the derived stale association, and never recompute readiness or projection in the browser.
