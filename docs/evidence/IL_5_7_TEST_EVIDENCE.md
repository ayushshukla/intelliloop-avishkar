# IL-5.7 deterministic-core proof, documentation and controlled metrics evidence

**Story:** `IL-5.7`  
**Capabilities:** `DC-04`, `DC-05`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Primary generated report:** [EV-RECONCILE](EV_RECONCILE.json)  
**Metrics:** [Controlled metrics report](METRICS_REPORT.md)

## Outcome

The Phase-5 reconciliation and impact core now has a reproducible generated proof rather than a documentation-only completion claim. `npm.cmd run evidence:reconcile` creates an offline temporary SQLite database and IntelliLoop-authored Git repository, uses the production static code-map, Twin, reconciliation, impact, API and persistence implementation, checks exact authored outcomes, writes the bounded machine report and deletes the fixture.

The proof closes the Phase-5 exit authority for `DC-04` and `DC-05`. It deliberately does not claim `G3_DETERMINISTIC_CORE_PROVEN`: the R3 gate is sequenced after the Phase-6 cited-explanation and required citation/mock path through `IL-6.4`.

## Executable acceptance record

| Acceptance | Observed result | Status |
|---|---|---|
| Conflict | Two active applicable scalar claims produced exactly one `CONFLICT` | `PASS` |
| Ambiguity | Null versus known numeric value produced exactly one `AMBIGUOUS` | `PASS` |
| Missing support | One absent evidence locator and one absent validation key produced exactly two `MISSING` findings | `PASS` |
| Impact | One exact depth-zero implementation path, one absent-asset gap and one absent-validation-result gap were retrieved with exact citations | `PASS` |
| Supersession | One explicit persisted `SUPERSEDES` link projected into the successor Twin and removed the corrected active conflict without rewriting history | `PASS` |
| Staleness | The changed exact claim/supersession dependencies appended exactly one digest-linked `STALE` finding | `PASS` |
| Deterministic replay | Exact and reordered declarations reused revision 2 and its result digest; 25 measured replays returned byte-equal success bodies | `PASS` |
| Persistence | Two immutable revisions remained retrievable and revision 2 retained its result digest after SQLite close/reopen | `PASS` |
| Repository/network safety | Registered-repository tree bytes matched before/after; no repository code, install, provider, credential or external call was used | `PASS` |
| Documentation | Domain, trust, testing, evidence, governance, checkpoint and backlog documents identify the implemented and remaining authority exactly | `PASS` |
| Host-safe browser regression | The E2E launcher allocated distinct free loopback ports and all eight Chromium workflows passed while the operator's existing port 4173 process remained untouched | `PASS` |

## Controlled metrics boundary

The authored truth table passed 6/6 exact assertions. That percentage means deterministic rule conformance on this one fixture only. It is not statistical model accuracy and says nothing about unseen evidence, production correctness or organizational outcomes.

The report records one initial run, one correction/stale run and 25 exact replays using a local single Node.js process. No absolute timing threshold affects pass/fail, and no concurrency, scale, cost, monthly-hours, ROI or production-latency extrapolation is made.

## Reproduction

```powershell
npm.cmd run evidence:reconcile
npm.cmd run check
npm.cmd run test:e2e
```

The complete aggregate command regenerates `EV-RECONCILE` after typecheck, unit/component tests, API tests, production builds and the earlier repository/privacy/Twin/code-map reports. The isolated browser suite remains the `IL-5.6` user-workflow authority; `IL-5.7` adds no browser behavior.

Final repository observation: 261 unit/component tests, 143 API tests, a 77-module Vite production build, all generated evidence reports, 66 Markdown files with zero broken local targets, and 8/8 Chromium workflows passed. The first browser attempt correctly exposed that the launcher still defaulted to the operator-occupied port 4173; the runner now allocates distinct temporary loopback ports and the complete rerun passed without stopping the operator's process.

## Residual boundaries

- Persisted validation-result intake is not implemented; the validation case intentionally remains an explicit gap.
- Offline cited-question explanation, provider-neutral advisory handling, readiness and Release Passports are not implemented.
- Runtime AI remains off, and AI cannot create, dismiss, resolve or mutate a canonical finding.
- The next authorized story is `IL-6.1`, the redacted evidence-pack compiler and citation registry.
