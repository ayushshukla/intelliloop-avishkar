# IL-2.2 Test Evidence

**Story:** `IL-2.2` - Project and Mission persistence and API  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record covers only Project/ChangeMission persistence and bounded `/api/v1` JSON contracts. It does not claim a Project UI, repository registration, evidence ingestion, Twin behavior, provider integration or readiness.

## Implemented boundary

- forward-only migration `002` with Project/Mission head tables and append-only revision tables;
- API-owned SQLite repository that hydrates the `IL-2.1` domain authority;
- bounded WAL-initialization retry for transient Windows multi-process `BUSY/LOCKED` results;
- atomic creation and archive transitions with expected-revision head updates;
- database-enforced one-current-mission-per-Project invariant;
- exact restart round trips, Project isolation and stable storage failures;
- strict versioned JSON routes with request IDs and bounded cursor pagination;
- `CONFLICT` added to the shared non-revealing error contract.

## Acceptance evidence

| Requirement | Implemented proof |
|---|---|
| Database integration | Migration bootstrap/upgrade plus repository create, retrieve, archive and immutable revision assertions |
| Stable schema failures | Missing storage schema and malformed API inputs return fixed codes/messages without SQL, paths or submitted values |
| Restart equality | A closed and reopened SQLite file returns exact Project and ChangeMission objects |
| Bounded pagination | UUID-ordered Project/Mission pages enforce limits 1-100, continuation cursors and `null` termination |
| Isolation and conflicts | Cross-Project archive changes nothing; second-current creation returns a conflict |
| Concurrent attempts | Two independent Node processes create against one Project; exactly one commits and one receives `CURRENT_MISSION_EXISTS` |
| HTTP contracts | Seven implemented `/api/v1` routes validate bodies, paths, queries, success schemas and stable errors |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | 219 packages installed exactly from the lockfile |
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 11 files, 75 tests passed, including Project API contract serialization |
| `npm.cmd run test:api` | 0 | 7 files, 40 tests passed, including migration, repository, restart, concurrency and HTTP integration |
| `npm.cmd run build` | 0 | All workspaces built; Vite transformed 45 modules |
| `npm.cmd run check` | 0 | Typecheck, 115 non-browser tests, production build and documentation-link gate passed |
| `npm.cmd run test:e2e` | 0 | 2 Chromium foundation regressions passed at 1366 x 768 |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities |

## Design decisions

- The pure domain remains the lifecycle authority; persistence reconstructs and validates domain objects.
- Stable identity and current head are stored separately from immutable revisions.
- Current-mission safety is enforced both transactionally and by a partial unique database index.
- Cursor ordering uses immutable UUID identity, so concurrent timestamp equality cannot destabilize pages.
- Unknown JSON/query properties reject; they are not silently stripped.
- No idempotency-key behavior was invented because the frozen route contract does not define one.
- Archive service operations exist to prove history and invariants, but no unapproved archive endpoint was added.

## Integrity and scope

The 15 frozen planning hashes and all six candidate repository baselines remain unchanged. No candidate source was copied or modified. Runtime external AI remains off, no credential or external product URL was added, and SQLite access remains inside `apps/api`. No database, temporary test directory or development listener is retained in the repository.

The clean development install still reports four known development-tree advisories and the transitive `prebuild-install@7.1.3` deprecation warning; the production-only audit is clean. No Git write, dependency change, repository operation, shell endpoint, registered-code execution or deployment occurred.

## Next boundary

`IL-2.3` may add repository registration and metadata only. It must not add repository writes, checkout/reset, shell execution, dependency installation or execution of registered code.
