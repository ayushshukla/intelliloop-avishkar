# IL-1.2 Test Evidence

**Story:** `IL-1.2` - Safe configuration, errors, request IDs, logging and flags  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate `CODING_PROMPT_1_2.md` exists

This record contains observed evidence for `IL-1.2` only. It does not claim capabilities owned by later stories.

## Implemented boundary

- typed host, port and log-level configuration;
- strict IPv4 loopback binding;
- frozen external-AI, CodeMap and experiment defaults;
- fail-closed external/experiment enablement;
- UUID request-ID validation, generation and response propagation;
- stable shared error response contracts;
- safe allowlisted JSON-line lifecycle and request logs;
- no request body, header, query value, raw URL, exception message or environment value in normal logs.

## Acceptance evidence

| Requirement | Observed proof |
|---|---|
| Invalid configuration fails safely | Invalid cases passed; spawned API exited 1 with `CONFIG_INVALID` and did not print the sentinel |
| Request IDs propagate | Valid inbound UUID was preserved; unsafe ID was replaced; health and error responses carried the resolved ID |
| Secret sentinel absent from logs | Header, query, unsafe request-ID, thrown-error and invalid-config cases passed |
| External and experiment flags default off | Exact frozen defaults passed; current enablement attempts failed closed |
| Stable errors | Contract tests plus 404, validation and internal-error injection cases passed |

## Final command record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | Clean lockfile install reproduced; 180 packages installed |
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 5 files, 12 tests passed |
| `npm.cmd run test:api` | 0 | 4 files, 20 tests passed |
| `npm.cmd run build` | 0 | Packages/API compiled; Vite transformed 36 modules and emitted production assets |
| `npm.cmd run test:e2e` | 0 | 1 Chromium test passed against the logged localhost API |
| `npm.cmd run check` | 0 | Typecheck, 32 non-browser tests and production build passed together |
| `npm.cmd audit --omit=dev` | 0 | 0 production vulnerabilities |

## Corrected verification events

The first typecheck exposed two Fastify 5 type-boundary mistakes: a not-found overload was given unsupported schema options, and the error handler input was treated as `FastifyError` instead of `unknown`. The code was corrected without weakening the response assertions.

A subsequent unit run completed 11 assertions but Vitest reported the recurring Windows vite-node temporary SSR-cache `UNKNOWN` error. Both Vitest configurations now set `fileParallelism: false`, retaining file isolation and all tests while removing the concurrent temp-cache race. Two consecutive unit runs then passed 12 tests, followed by the final full command chain.

## Integrity and safety record

- All 15 R1/R2/R3 planning hashes match the pre-story values.
- All six candidate repositories match their recorded branch, HEAD, tracked-dirty and untracked baselines.
- No `.env`, database, generated log, credential, product fixture or active application listener exists.
- No secret pattern, unexpected private path or external runtime URL was found.
- API and web production outputs exist.
- Twelve Markdown documents have zero broken internal links.
- The Git repository remains unborn on `main` with no remotes; no Git write operation was performed.

## Dependency note

No dependency was added or upgraded. The full frozen development tree retains the four advisories recorded in `IL-1.1`; the production-only audit remains clear. No force-upgrade was performed.

## Scope limit

No database, repository access, stable domain-ID system, canonical JSON/digest, evidence workflow, Twin, reconciliation, readiness, Passport, provider or experiment behavior was implemented.
