# IL-8.2 Real-Path Fixture Loader and Scoped Reset Evidence

**Story:** `IL-8.2`  
**Checkpoint:** `CONTROLLED_DEMO_LOADER_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Boundary:** One fixed IntelliLoop-owned LoopMart fixture; initial `BLOCKED` state only

## Result

The production API can create the initial retail demo workspace from empty state through normal Project, Mission, repository registration, Git snapshot, evidence, claim, code-map, Twin, reconciliation and readiness services. The generated repository is written only beneath the API data directory's fixed `demo-workspaces/loopmart-expanded-cancellation-v1/repository` root. IntelliLoop never executes that repository's source or package scripts.

`POST /api/v1/demo/reset` accepts no path, Project ID or fixture selector. Migration `013` records the single owned workspace and permits immutable-row deletion only while an internal single-use authorization exists for that exact recorded Project. The service validates the fixed fixture ID, version, ownership marker and canonical root before recursive filesystem removal.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| Empty-to-initial setup | Real Fastify/SQLite/filesystem/Git integration reaches code-map, Twin, reconciliation and readiness revision 1 with status `BLOCKED` | `PASS` |
| Idempotent setup/reset | A second setup returns the original IDs without new Project/evidence/reconciliation rows; a second reset reports `reset: false` | `PASS` |
| Non-demo isolation | A separately created Project remains addressable after demo reset; the demo Project is absent and `PRAGMA foreign_key_check` is empty | `PASS` |
| Restart | Closing and reopening SQLite restores the same demo Project/Mission and lifecycle summary | `PASS` |
| Reload after reset | Setup succeeds again from empty state and creates a new isolated Project identity | `PASS` |
| Caller scope guard | Reset rejects request bodies, so callers cannot supply another Project ID or filesystem path | `PASS` |
| Immutable-history guard | Direct deletion of evidence without internal reset authorization remains rejected | `PASS` |
| No repository execution | Only fixed filesystem writes and fixed Git init/add/commit commands run; no fixture script or dependency runs | `PASS` |

## Focused verification

- Contracts, demo-fixtures and API TypeScript checks: `PASS`.
- Real demo workspace API integration: `2/2` tests.
- Database lifecycle and migration regression: `15/15` tests.
- Migration `013` bootstrap, retained-version upgrades, failed-forward rollback, newer-schema rejection and concurrent startup: `PASS`.
- API production build: `PASS`.

## Honest limits and next authority

This story proves only the initial `BLOCKED` checkpoint and loader/reset lifecycle. It does not expose a browser setup control, apply the correction revision, persist synthetic validation/review inputs, prove `READY` or `STALE`, create a golden Passport, or produce competition screenshots. Those are owned by `IL-8.3` and later Phase-8 stories. Reset is an explicit exception for this generated fixture; registered user repositories and ordinary immutable histories still have no delete endpoint.
