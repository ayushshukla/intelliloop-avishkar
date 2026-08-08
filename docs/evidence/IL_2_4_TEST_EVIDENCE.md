# IL-2.4 Test Evidence

**Story:** `IL-2.4` - Read-only Git snapshot capture  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record covers immutable branch/HEAD/status-summary observation from an already registered controlled repository. It does not claim exact changed-file evidence, repository-content inspection, test validation, Project UI, Twin materialization, reconciliation or release readiness.

## Implemented boundary

- migration `004` persists path-free immutable `GitSnapshot` rows under exact Project, Mission and registration scope;
- capture recognizes clean/dirty attached, unborn and detached repositories;
- changed status entries are normalized, sorted and represented by one canonical SHA-256 digest plus bounded counts;
- Git execution is limited to fixed symbolic-HEAD, commit and porcelain-status reads with no shell or caller arguments;
- optional locks, prompts, inherited Git environment, global/system config, fsmonitor hooks and untracked-cache updates are disabled;
- each command has a five-second timeout and 1 MiB combined output ceiling;
- HEAD identity is byte-compared before/after status and a change rejects the capture;
- public contracts and structured logs omit the canonical repository root and changed filenames;
- SQLite triggers reject update and delete; list/get return historical inserted records;
- no checkout, reset, patch, commit, push, dependency install, registered-code execution or arbitrary command endpoint exists.

## Acceptance evidence

| Requirement | Executable proof |
|---|---|
| Clean fixture | Real temporary repository returns attached `main`, exact commit, zero counts and `dirty: false` |
| Dirty fixture | Independent staged, worktree and untracked records produce counts 1/1/1 and total 3 |
| Unborn fixture | Real no-commit repository returns `UNBORN`, branch and no commit |
| Detached fixture | Real detached repository returns `DETACHED`, commit and no branch |
| Stable digest | Two observations of unchanged dirty state have different snapshot IDs and the same digest |
| Safe bounds | Fixed runner proves output-limit and real process-timeout errors; injected failures prove safe API/service mapping |
| Race rejection | Changed before/after symbolic HEAD evidence rejects without insertion |
| Immutability/restart | Reopen returns exact snapshot; direct update/delete triggers reject and retain it |
| Repository equality | Complete synthetic repository file digest and porcelain output match before and after actual capture |
| Privacy | API response and safe-log sentinels prove root and filename absence |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 14 files, 81 tests passed, including GitSnapshot invariants and path-free contract serialization |
| `npm.cmd run test:api` | 0 | 11 files, 61 tests passed, including real Git state fixtures, schema v4, restart, timeout, privacy and non-mutation |
| `npm.cmd run build` | 0 | All workspaces built; Vite transformed 48 modules |
| `npm.cmd run check:docs` | 0 | 35 Markdown files checked with zero broken local targets |
| `npm.cmd run check` | 0 | Typecheck, 142 non-browser tests, production builds and documentation-link gate passed |
| `npm.cmd run test:e2e` | 0 | 2 Chromium foundation regressions passed at 1366 x 768 |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across the reported production dependency tree |

## Design decisions

- Capture is Mission-scoped because later evidence and staleness depend on the exact change mission, while registration remains Project-scoped.
- POST accepts no body. A caller cannot supply a path, executable, operation, ref or Git option.
- Status filenames participate in the in-memory digest but are not stored or serialized at this stage.
- Repeated capture is append-only and intentionally produces a new identity even when the observed digest is unchanged.
- Unborn is valid observation state, not an error and never a readiness signal.
- A before/after HEAD check prevents mixed commit identity; it does not claim an atomic filesystem snapshot against every concurrent local writer.

## Integrity and scope

All Git fixtures are created in fresh OS-temporary directories and contain only authored synthetic files. Candidate repositories, personal repositories, MyTeams, employer/client material and quarantined discovery roots were not registered, read, copied or changed.

External AI remains off. No credential or live provider call was used. The implementation uses the already pinned runtime dependencies and adds no package.

## Next boundary

`IL-2.5` owns Project selection and change-overview UI over the current Project, Mission, registration and snapshot APIs. It must show attributed observation truth without inferring readiness and must retain the Phase-2 repository-write and execution prohibitions.
