# IL-1.4 Test Evidence

**Story:** `IL-1.4` - SQLite lifecycle and migration baseline  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate `CODING_PROMPT_1_4.md` exists

This record contains observed evidence for `IL-1.4` only. It does not claim product-domain persistence.

## Implemented boundary

- API-only `better-sqlite3` ownership;
- absolute OS-user-data directory configuration;
- connection safety pragmas and bounded lock wait;
- forward-only transaction runner and migration `001`;
- version, name, SQL-checksum and canonical-time history validation;
- safe rollback and fail-closed schema/path errors;
- database close on service shutdown and listener failure.

## Acceptance evidence

| Requirement | Implemented proof |
|---|---|
| Empty bootstrap | Version 1, exact history record and connection-policy assertions |
| Restart | One unchanged migration row after reopen |
| Failed migration rolls back | Forced version-2 failure leaves version 1 and no probe table |
| Unknown newer schema refuses startup | Direct lifecycle code plus child API exit and non-revealing log |
| Concurrent startup | Four independent processes, one version-1 history row |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | Clean native-dependency install reproduced; 219 packages installed |
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 9 files, 50 tests passed |
| `npm.cmd run test:api` | 0 | 5 files, 29 tests passed, including seven database-lifecycle cases |
| `npm.cmd run build` | 0 | Domain, contracts, fixtures and API compiled; Vite transformed 42 modules and emitted production assets |
| `npm.cmd run test:e2e` | 0 | 1 Chromium test passed at 1366x768; wrapper removed its temporary database |
| `npm.cmd run check` | 0 | Typecheck, 79 non-browser tests and the production build passed together |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities |

## Migration identity

Migration `001` is named `schema_history_foundation`. Its authored SQL checksum is `sha256:7a95f507fddb90d2f1e3ee71c37a0df4e58707c8b712715dd64857f6510b61bb`.

## Corrected verification events

The first implementation typecheck found an implicit type on the server's lifecycle-handle variable. The explicit `FoundationDatabase` type was added; no compiler rule was weakened.

The first browser command passed its Chromium assertion but failed afterward because Playwright invoked global teardown before stopping its managed API, leaving the SQLite file locked on Windows. Cleanup ownership moved to a cross-platform wrapper: it creates a validated OS-temporary directory, waits for Playwright and the managed web server to exit, applies bounded lock retries and removes only IntelliLoop E2E directories. The rerun passed and left zero matching temp directories or listeners.

## Integrity and safety record

- All 15 R1/R2/R3 planning hashes match the pre-story values.
- All six candidate repositories match their recorded branch, HEAD, tracked-dirty and untracked baselines.
- Twenty-nine Markdown documents have zero broken internal links.
- No `.env`, database, generated log, credential, certificate or private absolute-path artifact remains in the workspace.
- Product source contains one loopback proxy URL and zero external runtime endpoints.
- `better-sqlite3` has exactly one production source import, inside `apps/api`.
- Ports 3100 and 4173 have no listener; no IntelliLoop E2E temp directory remains.
- API and web production outputs exist.
- The Git repository remains unborn on `main` with no remotes; no Git write operation was performed.

## Dependency note

The exact R2-frozen `better-sqlite3 11.10.0` runtime and `@types/better-sqlite3 7.6.13` declaration package are installed. The full development tree reports four advisories and npm reports the transitive `prebuild-install 7.1.3` deprecation; the production-only audit reports zero vulnerabilities. No breaking force-upgrade was performed.

## Scope limit

Migration `001` creates only `schema_migrations`. No Project, Mission, repository, evidence, Twin, readiness, Passport, backup/restore or demo-reset persistence was added.
