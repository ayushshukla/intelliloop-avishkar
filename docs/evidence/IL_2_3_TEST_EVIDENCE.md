# IL-2.3 Test Evidence

**Story:** `IL-2.3` - Safe local repository registration  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record covers canonical read-only registration metadata only. It does not claim Git identity/status capture, repository-content scanning, Project UI, evidence ingestion, code mapping or release readiness.

## Implemented boundary

- migration `003` persists one stable canonical root per active Project with fixed `READ_ONLY` mode;
- registration accepts only an existing direct Git root and makes its exact real path the allowlist;
- relative paths, explicit traversal, symlink redirection and database containment fail closed;
- duplicate Project/root bindings reject transactionally;
- the canonical root is private storage state and is omitted from response resources and safe logs;
- the registered root is revalidated before future read access;
- no Git command, repository-content read, dependency install, code execution or repository mutation exists.

## Acceptance evidence

| Requirement | Implemented proof |
|---|---|
| Missing and non-Git rejection | Missing directory, ordinary directory and plain-file cases return stable registration errors |
| Traversal and symlink escape | Relative/parent traversal, root junction, `.git` junction and post-registration symlink substitution reject |
| Database outside repository | Registration rejects when the live SQLite file is within the proposed root |
| Duplicate binding | Same-Project and cross-Project reuse of a canonical root reject without replacing state |
| Restart retrieval | Closed/reopened SQLite returns the exact stable private registration |
| Path-safe API | PUT and GET return only identity, Project scope, kind, read-only mode and timestamp |
| No write endpoint | POST/PATCH/DELETE return `404`; repository tree digest is identical before and after service/API registration |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd ci` | 0 | 219 packages installed exactly from the unchanged lockfile |
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 12 files, 76 tests passed, including path-free repository contract serialization |
| `npm.cmd run test:api` | 0 | 9 files, 51 tests passed, including migration, path safety, restart, privacy and route integration |
| `npm.cmd run build` | 0 | All workspaces built; Vite transformed 46 modules |
| `npm.cmd run check` | 0 | Typecheck, 127 non-browser tests, build and documentation-link gate passed |
| `npm.cmd run test:e2e` | 0 | 2 Chromium foundation regressions passed at 1366 x 768 |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities |

## Design decisions

- The R2 route family is Project-scoped; every mission under that Project inherits the same exact repository boundary.
- A `.git` directory is required. Worktree/submodule `.git` files are conservatively rejected until explicitly supported.
- Registration stores the canonical absolute root because later read-only capture needs it, but the public contract deliberately has no path field.
- PUT creates once and duplicate input conflicts; replacement/removal semantics were not invented.
- Filesystem metadata checks establish registration only. Git identity and status remain owned by `IL-2.4`.

## Integrity and scope

The frozen planning artifacts and candidate repository baselines remain untouched. Tests use fresh OS-temporary synthetic roots containing no private source. No candidate, MyTeams, employer, client or personal repository was registered or read.

External AI remains off. No credential, dependency, Git write, shell endpoint, repository-content execution, deployment or Git repository write occurred. The clean development installation retains the four previously documented development-tree advisories; the production-only audit is clean.

## Next boundary

`IL-2.4` may capture branch/detached state, HEAD and bounded status through read-only Git operations. It must preserve before/after repository equality and must not add checkout, reset, patch, commit, push, install or code execution.
