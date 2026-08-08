# IL-1.3 Test Evidence

**Story:** `IL-1.3` - Deterministic domain and contract primitives  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate `CODING_PROMPT_1_3.md` exists

This record contains observed evidence for `IL-1.3` only. It does not claim capabilities owned by later stories.

## Implemented boundary

- branded, canonical UUID v4 stable IDs with an injected source;
- canonical UTC timestamps and an injected clock;
- authored, fail-closed canonical JSON serialization;
- UTF-8 SHA-256 text and canonical-JSON digests through Web Crypto;
- mission-scoped foundation metadata with explicit origin, source revision or digest, recorded/effective time, extraction method and epistemic label;
- exhaustive serialization for every implemented origin and revision variant;
- an executable domain dependency-boundary guard.

## Acceptance evidence

| Requirement | Implemented proof |
|---|---|
| Canonical vectors pass | Fixed canonical JSON and SHA-256 vectors |
| Clock and ID tests are deterministic | Injected source sequences and canonical validation |
| Domain imports no app, Fastify or SQLite module | Recursive forbidden-import test, including contracts cycle prevention |
| Serialization is exhaustive | All origin, revision and epistemic variants plus fixed canonical bytes |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | Clean lockfile install reproduced; 180 packages installed |
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 9 files, 50 tests passed |
| `npm.cmd run test:api` | 0 | 4 files, 20 regression tests passed |
| `npm.cmd run build` | 0 | Domain, contracts, fixtures and API compiled; Vite transformed 42 modules and emitted production assets |
| `npm.cmd run test:e2e` | 0 | 1 Chromium test passed at 1366x768 against the localhost API |
| `npm.cmd run check` | 0 | Typecheck, 70 non-browser tests and the production build passed together |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities |

## Fixed vectors

| Input | Canonical or digest result |
|---|---|
| `{ b: 2, a: 1 }` | `{"a":1,"b":2}` |
| UTF-8 text `abc` | `sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| Canonical `{ a: 1, b: 2 }` | `sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777` |

## Corrected verification event

The first package build exposed a TypeScript library mismatch: the contracts declaration build follows imported domain source, while the contracts configuration lacked the DOM declarations used by standard Web Crypto and `TextEncoder`. The contracts configuration was aligned to the domain's `ES2022` plus `DOM` library baseline. No external runtime dependency was added, and the clean full gate then passed.

## Integrity and safety record

- All 15 R1/R2/R3 planning hashes match the pre-story values.
- All six candidate repositories match their recorded branch, HEAD, tracked-dirty and untracked baselines.
- No `.env`, database, generated log, credential, certificate or private absolute-path artifact exists in the product workspace.
- Product source contains one loopback proxy URL and zero external runtime endpoints.
- Ports 3100 and 4173 had no listener after the browser test.
- API and web production outputs exist.
- Twenty-seven Markdown documents have zero broken internal links.
- The Git repository remains unborn on `main` with no remotes; no Git write operation was performed.

## Dependency note

`IL-1.3` adds only an internal workspace dependency from contracts to domain. The full development tree reports four advisories; the production-only audit reports zero vulnerabilities. No breaking force-upgrade was performed.

## Scope limit

No persistence, database, Project/Mission behavior, evidence ingestion, Twin projection, reconciliation, readiness, Passport or AI provider was added.
