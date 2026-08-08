# IL-8.3 Browser Golden Workflow Evidence

**Story:** `IL-8.3`  
**Checkpoint:** `COMPETITION_GOLDEN_WORKFLOW_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Boundary:** One IntelliLoop-authored synthetic LoopMart workspace; local-only, AI-off and unsigned

## Result

The `/demo` browser workspace now drives the real persisted product path from empty state through `BLOCKED`, a controlled correction to `READY`, and an exact dependency change to `STALE`. The sequence uses the normal Git snapshot, evidence, claim, validation, code-map, Twin, reconciliation, readiness and Passport services. No browser state computes a verdict.

The focused Chromium suite runs as one serial persisted workflow. It proves initial conflict and cited impact, a safely bounded deterministic answer to “What conflicts are open?”, corrected evidence and validation bindings, an unsigned `READY` Passport, and the same historical Passport becoming currently `STALE` after the repository snapshot changes.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| `EV-GOLDEN-FLOW` recorded | [Machine-readable report](EV_GOLDEN_FLOW.json) records 17 API/migration and four browser tests | `PASS` |
| Real browser sequence | Chromium records `INITIAL_BLOCKED`, `OFFLINE_EXPLANATION`, `CORRECTED_READY` and `READY_STALE` checkpoints | `PASS` |
| Stretch flags off | External AI, Evidence Replay, Agent Disagreement and Remediation Preview remain frozen `false` | `PASS` |
| No credential | Browser observed zero authorization headers; demo orchestration reads no credential or environment setting | `PASS` |
| No outbound provider request | Every observed browser HTTP request remained on loopback; the answer reports `External call: NO` and `NOT SENT` | `PASS` |
| Safe failure artifacts | Playwright retains traces only on failure and screenshots only on failure under sanitized test-result directories | `PASS` |
| Historical truth | `READY` assessment/Passport bytes remain unchanged when their current association becomes `STALE` | `PASS` |
| Scope authority | Reset has no caller-authored Project/path selector and retains non-demo Projects | `PASS` |

## Focused verification

- Database lifecycle and migration `014`: `15/15` tests.
- Real demo API lifecycle, correction, staleness, restart and reset isolation: `2/2` tests.
- Serial Chromium golden workflow: `4/4` tests in 19.2 seconds.
- Web TypeScript check: `PASS`.
- Controlled fixture evidence regeneration: `PASS`.

Reproduce with `npm.cmd run evidence:golden-flow`. Run only the browser proof with `node scripts/run-e2e.mjs apps/web/e2e/golden-flow.spec.ts` after `npm.cmd run build:packages`.

## Defects found and resolved by the golden gate

1. The initial impact declaration used a single logical root that had no authorized code-map path. Five exact change-surface roots now bind to their real critical assets.
2. Validation results existed but were not connected to assets in the Twin. Exact `VALIDATED_BY` relationships now bind persisted validation-result IDs and digests.
3. Controlled validation records labelled with generic synthetic origin were correctly treated as unavailable authority. They now remain visibly synthetic while using the specific `VALIDATION_RESULT` origin required by deterministic readiness.
4. The broad “Can we release?” evidence pack exceeded the frozen conservative 12,000-byte outbound bound. The demo uses the narrower conflict question instead of weakening that safety limit.

## Honest limits and next authority

The result is competition-demo readiness, not production release readiness. Fixture validations are controlled records with `executed: false`; the review is fictional synthetic input; the Passport is unsigned; and no approval, signing or deployment path exists. `IL-8.4` next owns responsive, accessibility and competition visual polish.
