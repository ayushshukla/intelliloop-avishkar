# IL-2.6 Test Evidence

**Story:** `IL-2.6` - Repository-safety proof and operator docs  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record closes the Phase-2 `DC-01` proof/documentation boundary. It adds no product route, database migration, repository operation or readiness behavior.

## Reproducible artifact

Run:

```powershell
npm.cmd run evidence:repo-safety
```

The checked-in generator builds the required packages, creates only an IntelliLoop-authored OS-temporary Git fixture, opens its SQLite database outside that fixture, exercises production registration/capture services and HTTP routes, validates the required documentation contract, writes [EV-REPO-SAFETY](EV_REPO_SAFETY.json), then removes all temporary state.

The report is deterministic and secret-safe: it records algorithms, fixed fixture shape, counts and pass/fail results, but no raw absolute root, changed filename or status bytes. Any failed invariant exits nonzero.

## Acceptance evidence

| Requirement | Executable proof |
|---|---|
| `EV-REPO-SAFETY` recorded | Generator emits a schema-versioned `EV-REPO-SAFETY` JSON report with `DC-01`, story boundary, limitations and next authorized story |
| Status equality | Exact production-equivalent NUL-delimited porcelain-v1 bytes match before registration, after registration and after two captures; SHA-256 status equality also passes |
| Digest equality | Complete sorted relative repository entry/path/file/link bytes have one equal SHA-256 digest before and after registration/capture |
| Stable observation | Two immutable captures over unchanged dirty state retain 1 index, 1 worktree, 1 untracked, total 3 and the same changed-files digest |
| Safety negative corpus | Missing/non-Git/relative/traversing/file/symlink roots, database containment, duplicates, cross-Project reuse, archived scope and post-registration substitution reject |
| Pre-execution rejection | Missing registration and archived Mission reject with zero injected Git-runner calls |
| HTTP boundary | Path sentinel is absent from repository JSON; POST/PATCH/DELETE repository methods remain absent; snapshot caller body rejects |
| Operator documentation | API, setup, security, user guide and consolidated evidence contain required current behavior and reproduction guidance |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `node --check scripts/generate-repo-safety-evidence.mjs` | 0 | Evidence generator syntax accepted by the pinned Node runtime |
| `npm.cmd run evidence:repo-safety` | 0 | Generated `EV-REPO-SAFETY: PASS`; repeated runs produced identical SHA-256 `b803ec9a42aa85f3ca0876202447e181a1b5c40f693b9c015dabd1617ae5bd65` and zero leftover proof directories |
| `npm.cmd run check` | 0 | Five workspaces typechecked; 89 unit/component and 61 API tests passed; production builds, repository-safety generation and documentation links passed |
| `npm.cmd run build` (inside aggregate) | 0 | All workspaces built; Vite transformed 51 modules |
| `npm.cmd run check:docs` (inside aggregate) | 0 | 38 Markdown files checked with zero broken local targets |
| `npm.cmd run test:e2e` | 0 | 3 Chromium workflows passed at 1366 x 768, including persisted path-safe Project flow |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across 104 reported production dependencies |

One earlier aggregate invocation reached green output for every subcommand but its outer shell wrapper expired at 180 seconds during a temporarily slow run. No assertion was changed; the complete rerun above exited 0 in 110.5 seconds with a larger wrapper allowance.

## Scope and integrity

- The generator mutates only its authored synthetic fixture while arranging test preconditions. After a root is registered, the production services perform no repository write.
- The post-registration substitution case is performed by the adversarial test harness and proves product revalidation rejects it.
- No candidate, personal, MyTeams, Nisum, employer/client or quarantined repository is used.
- No shell/API command input, checkout/reset, install, repository write or registered-code execution capability is added.
- External AI remains off and no credential or network service is used.
- Official Avishkar requirements remain unverified; this is implementation evidence, not a compliance certification.

## Next boundary

`IL-3.1` is the next authorized story. This implementation stops before evidence ingestion, redaction or persistence work begins.
