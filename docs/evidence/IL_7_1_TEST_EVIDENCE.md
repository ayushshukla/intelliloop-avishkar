# IL-7.1 readiness obligation catalog and evaluator evidence

**Story:** `IL-7.1`  
**Checkpoint:** `READINESS_EVALUATOR_CONTRACT_READY`  
**Status:** `PASS`  
**Capability:** `DC-07` domain contract only  
**Evidence date:** 2026-08-06

## Delivered outcome

`readiness.v1` is a pure deterministic domain evaluator with nine fixed obligations: verified integrity, exact scope, current snapshot, clear current findings, all required validations passing, persisted human review, current dependencies, canonical complete inputs and persisted source records.

The output is one of `BLOCKED`, candidate `READY` or `STALE`, with canonical policy/input/result digests, ordered obligation results and stable blocker codes. The evaluation records `evaluationPersistence: NOT_PERSISTED` and `EVALUATION_ONLY_UNTIL_PERSISTED`; it cannot decide release, create a Release Passport, deploy, call a provider, access infrastructure or appear as authoritative browser state. `IL-7.2` owns assessment persistence and historical dependency staleness.

## Acceptance matrix

| Requirement | Executable evidence | Result |
|---|---|---|
| Exhaustive fail-closed truth table | 31 evaluator assertions cover the ready vector, every obligation family, all finding kinds, status precedence, ordering, limits, malformed input and tampering | `PASS` |
| Sample/fallback/AI cannot create `READY` | `SAMPLE_PLACEHOLDER`, declared/unavailable fallback, incomplete maps, AI input, AI validation and AI review all block | `PASS` |
| Unpersisted input cannot create `READY` | Reconciliation, required validation and human review persistence are separate mandatory checks | `PASS` |
| Stale/unknown evidence cannot create `READY` | Changed snapshot, stale validation/review and changed dependencies return `STALE`; unknown freshness returns `BLOCKED` | `PASS` |
| Exact scope and validation | Cross-Project/Mission validation, missing/failed/inconclusive result, empty catalog and non-validation origin block | `PASS` |
| Rule identity and ordering | `readiness.v1`, policy digest, fixed obligation order, canonical validation order and result digest are deterministic | `PASS` |
| Non-authority boundary | Static boundary test excludes network, environment, provider, database, web/API and Passport/deployment primitives | `PASS` |

## Important temporal rule

The current reconciliation aggregate can contain a `STALE` finding that records an exact change to its predecessor. That historical finding does not make the new current evaluation stale. Current `STALE` is emitted only when the evaluated snapshot, validation, review or dependency input is no longer current. `IL-7.2` will persist and retain those exact historical relationships.

## Focused reproduction

```powershell
npm.cmd run typecheck -w @intelliloop/domain
npm.cmd run test:unit -- --run packages/domain/test/readiness-evaluation.test.ts packages/domain/test/boundaries.test.ts
```

The focused run passed 36/36 assertions across two files. Repository-wide test/build/evidence/documentation results are recorded in the [consolidated evidence dossier](TEST_EVIDENCE.md).

## Complete repository verification

| Gate | Observed result |
|---|---|
| Workspace typechecks | All five workspaces passed |
| Unit/component tests | 359/359 across 40 files |
| API/integration tests | 149/149 across 29 files |
| Production build | Passed; web transformed 86 modules |
| Generated evidence | `EV-REPO-SAFETY`, `EV-PRIVACY`, `EV-TWIN`, `EV-CODEMAP`, `EV-RECONCILE`, `EV-CITATIONS` and `EV-OPENAI-EVAL` passed |
| Reconciliation replay | 6/6 truth cases and 25/25 deterministic replays |
| AI safety/documentation | AI-safety contract passed; 75 Markdown files, zero broken local targets |
| Isolated Chromium regression | 8/8 workflows passed |

During the complete gate, the product tests and build passed, then two generated-evidence documentation guards correctly stopped because the refreshed README had omitted historical `EV-CITATIONS` / `IL-6.5` / `IL-6.6` lifecycle markers. The accurate references were restored and both generators passed on rerun. No product authority or test limit was widened.

## Limitations and next authority

- No migration, SQLite repository, transaction, restart behavior or concurrency behavior is added.
- No readiness endpoint, browser route, persisted review intake or validation-result intake is added.
- A candidate `READY` calculation is not yet an authoritative persisted assessment and must not be shown as release approval.
- No Release Passport projection or digest exists; that begins only after persisted assessments in `IL-7.3`.
- The evaluator checks supplied persisted/current bindings; `IL-7.2` must derive and preserve them from authoritative repositories rather than trusting a caller.

The next dependency-eligible story is `IL-7.2`, assessment persistence and dependency staleness.
