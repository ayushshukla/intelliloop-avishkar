# IL-8.5 Non-Functional Demo Gate Evidence

**Story:** `IL-8.5`  
**Checkpoint:** `G5_CORE_DEMONSTRABLE`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Paced rehearsal:** 5.8 minutes

## Result

The combined release-critical demo gate passes. It reruns registered-repository byte equality and the privacy negative corpus, then exercises the complete browser workflow against production-built local services. The API is deliberately stopped at `READY`; the browser reports the unavailable state, the same database restarts, and the visible retry action restores the exact persisted workflow. The sequence continues to `STALE`, resets, restarts again and remains `EMPTY`.

The paced run lasts 347,892 milliseconds (5.8 minutes), inside the required five-to-seven-minute window. Three API process starts occur. Browser egress blocking observes zero non-loopback attempts and zero authorization headers. The fixed environment sentinel is absent from logs, response bodies, rendered text and every generated data-directory file. Application source-tree and Git-status bytes match before and after runtime; the separately generated registered-repository proof also records complete tree equality.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| Repository before/after match | Application source digest equality, Git-status byte equality and regenerated [EV-REPO-SAFETY](EV_REPO_SAFETY.json) registered-tree equality | `PASS` |
| Default network blocked | Chromium blocks non-loopback requests; observed attempts `0`; privacy fetch trap `0`; AI remains off | `PASS` |
| Secret sentinel absent | Logs, JSON/text responses, rendered page and UTF-8/UTF-16LE data-directory scan | `PASS` |
| Restart E2E | `READY → UNAVAILABLE → READY_AFTER_RESTART` on the same SQLite data | `PASS` |
| Recovery drill | Visible unavailable state and operator Retry path recover without deletion or rewritten truth | `PASS` |
| Clean reset/restart | `STALE → EMPTY → EMPTY_AFTER_RESET_AND_RESTART` | `PASS` |
| Five-to-seven-minute rehearsal | Nine paced phases, 320 narration seconds, 5.8 minutes wall clock | `PASS` |
| G5 gate | Golden flow, Passport staleness, reset, restart and non-mutation evidence combined | `PASS` |

## Reproduction

Run the evidence-producing gate:

```powershell
npm.cmd run evidence:demo-gate
```

This command performs the production build, regenerates repository-safety and privacy evidence, then runs the paced browser rehearsal. For a fast implementation diagnostic without writing paced evidence, run `npm.cmd run check:demo-gate`.

## Defects caught and resolved

1. The runbook used port `5173`; the configured local web port is `4173`. Runbook and troubleshooting commands now match runtime.
2. Vite dependency-cache updates initially polluted the source-tree equality calculation. The proof now excludes only dependency/build/test caches while retaining all authored application, package, script, documentation, planning and root configuration files plus exact Git-status bytes.
3. The repository-safety documentation guard still expected an older broad “repository-write” sentence after the guide had strengthened it to “registered-user-repository write.” The guard now binds the current stricter statement and reports sanitized contract failures.

## Honest limits and next authority

The browser is actively blocked from non-loopback egress and production provider paths remain off, but this is not an operating-system network sandbox. Sentinel absence is not universal DLP. The fixture is synthetic; its generated repository is intentionally modified only inside the disposable API data directory. Candidate `READY` remains exact-input readiness, and the Passport remains unsigned and non-approving. `IL-8.6` next owns judge Q&A, final fallback assets and the completed demo-support package.
