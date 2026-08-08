# IL-2.1 Test Evidence

**Story:** `IL-2.1` - Project and Change Mission domain  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate `CODING_PROMPT_2_1.md` exists

This record covers the pure deterministic domain story only. It does not claim persistence, API, UI, repository registration or a complete `DC-01` workflow.

## Implemented boundary

- branded Project and Mission identities reuse the canonical UUID v4 primitive;
- bounded Project names and Mission titles fail without echoing rejected input;
- immutable Project and Change Mission revisions use injected clocks and identity sources;
- Projects move from `ACTIVE` to terminal `ARCHIVED`;
- missions move from `CURRENT` to terminal `ARCHIVED`;
- current-mission selection is derived from one validated project-scoped collection;
- archive returns a successor revision without mutating retained history;
- stable domain errors reject invalid state, scope, identity and chronology.

## Acceptance evidence

| Requirement | Implemented proof |
|---|---|
| Invariant/state tests | 16 tests cover construction, bounded input, immutable transitions, forged state and terminal archive |
| Cross-project rejection | Collection selection, mission archive and Project archive all reject foreign missions |
| Archive/current-mission behavior | A second current mission rejects; mission archive clears current; a successor may then become current; Project archive requires no current mission |
| Deterministic revisions | Creation is revision 1 and archive is revision 2; prior objects remain unchanged |
| Lifecycle isolation | Duplicate identities, conflicting current records and backwards time reject with stable codes |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | 219 packages installed exactly from the unchanged lockfile |
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 10 files, 72 tests passed, including 16 Project/Mission tests |
| `npm.cmd run test:api` | 0 | 5 files, 29 regression tests passed |
| `npm.cmd run build` | 0 | All workspaces built; Vite transformed 44 modules |
| `npm.cmd run check` | 0 | Typecheck, 101 non-browser tests, build and documentation gate passed |
| `npm.cmd run test:e2e` | 0 | 2 Chromium foundation regressions passed at 1366 x 768 |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities |

## Design decisions

- Current mission is derived, not duplicated on Project state.
- A second current mission fails rather than silently replacing or archiving the first.
- Mission archive must precede Project archive, making history changes explicit.
- Reopen, rename, hard delete and persistence are excluded because no frozen `IL-2.1` transition authorizes them.
- Aggregate chronology includes retained mission history, so a successor or Project archive cannot predate a prior mission archive.

## Integrity and scope

The 15 frozen planning hashes and all six candidate repository baselines remain unchanged. Thirty-one Markdown files have zero broken local links. No sensitive artifact, private absolute path, external non-local runtime URL, temporary E2E directory or leftover development listener was found. The single production SQLite import remains inside the API lifecycle, and the project remains unborn `main` with zero remotes.

No candidate source was read as an implementation template or transferred. No dependency, migration, database table, API route, UI route, fixture, credential, provider call or Git write was added. The unchanged development tree still reports four advisories and the transitive `prebuild-install@7.1.3` deprecation warning; the production-only audit is clean.

## Next boundary

`IL-2.2` may persist and expose these entities through bounded API contracts. It must not create a second lifecycle authority or weaken these invariants.
