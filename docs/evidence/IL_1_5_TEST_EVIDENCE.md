# IL-1.5 Test Evidence

**Story:** `IL-1.5` - Web trust shell and API client states  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate `CODING_PROMPT_1_5.md` exists

This record is closed from observed clean-install, command and integrity results. It does not claim a product workflow or accessibility conformance certification.

## Implemented boundary

- one real welcome route and semantic application shell;
- current-route navigation plus seven non-interactive planned stages;
- skip navigation, visible focus and keyboard-reachable current route;
- explicit `LOADING`, `CONNECTED`, `ERROR`, `EMPTY` and `AI_OFF` states;
- retryable local health request with shared-contract validation;
- persistent honest-scope disclosure and no Project/readiness placeholder.

## Acceptance evidence

| Requirement | Implemented proof |
|---|---|
| Component tests pass | Semantic markup and all five trust states rendered independently |
| Keyboard navigation works | Chromium skip-link/current-route focus sequence |
| Health integration works | Shared response accepted in unit test and real local API connected in Chromium |
| Network failure is honest | Aborted request shows alert/no substitute; retry recovers after local route restoration |
| No green placeholder or fake product data | Exact `READY` absent; future stages unavailable; empty state disclaims samples and inference |

## Verification record

| Gate | Observed result |
|---|---|
| `npm ci` | PASS - 219 packages installed from the lockfile; npm reported four development-graph advisories and one transitive deprecation warning |
| `npm run typecheck` | PASS - API, web, contracts, demo-fixtures and domain workspaces |
| `npm run test:unit` | PASS - 9 files, 56 tests |
| `npm run test:api` | PASS - 5 files, 29 tests |
| `npm run build` | PASS - all workspaces; Vite transformed 43 modules |
| `npm run test:e2e` | PASS - 2 Chromium tests at the 1366 x 768 baseline |
| `npm run check` | PASS - typecheck, 85 non-browser tests and production build |
| `npm audit --omit=dev --json` | PASS - 0 production vulnerabilities |

Integrity verification also passed:

- all 15 frozen planning files matched their recorded SHA-256 hashes;
- all six candidate repositories matched their read-only branch, head and dirty-state baselines;
- 30 Markdown files produced zero broken local links;
- zero sensitive artifacts, external non-local URLs, private absolute paths, E2E temporary directories, leftover development listeners or UI mojibake hits were found;
- the API retains exactly one production SQLite module import, both API and web build outputs exist, and the project remains on unborn `main` with zero remotes.

### Corrected verification event

One clean E2E attempt used an exact-text locator against a planned-route element that also contains the nested text `Not available`. The shell state was correct and the network-failure test passed. The assertion was narrowed to the planned-route element containing the frozen label, after which the complete suite passed 2/2. No application behavior was changed for this correction.

## Scope limit

No router, Project/Mission record, product endpoint, evidence view, Twin, reconciliation, readiness, Passport or provider behavior was added. Full accessibility audit and visual polish remain later backlog work.
