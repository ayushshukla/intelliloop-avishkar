# IL-2.5 Test Evidence

**Story:** `IL-2.5` - Project selection and change-overview UI  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record covers the browser workflow over the already implemented Project, Change Mission, repository-registration and Git-snapshot APIs. It does not claim exact changed-file evidence, repository-content inspection, test validation, Twin materialization, reconciliation or release readiness.

## Implemented boundary

- `/` lists real persisted Projects, exposes explicit loading/error/empty states and creates a Project through the local API;
- `/projects/:projectId` retrieves exact Project scope, the current Mission, path-free repository metadata and immutable snapshot history;
- the overview creates one current Mission, performs one-time repository-path submission and captures a snapshot through the bounded APIs;
- successful registration clears and unmounts the path field, while public state shows only `LOCAL_GIT` and `READ_ONLY` metadata;
- snapshots show attributed state, optional branch/HEAD, counts, digest and identity without filenames or root paths;
- `NOT ASSESSED`, observation-only copy and unavailable later stages prevent readiness inference;
- unknown, malformed, failed and empty data never become sample, fallback or green status;
- keyboard navigation, text labels and visible focus cover the implemented path;
- no repository mutation, shell, install, checkout/reset or execution surface was added.

## Acceptance evidence

| Requirement | Executable proof |
|---|---|
| Browser happy path | Chromium creates a real Project and Mission, registers a synthetic Git repository and captures a real dirty/unborn observation through the API |
| Browser failure path | Aborted health and workspace requests show stable failure states with no placeholder Project or connected substitution |
| Restart/retrieval | The full-flow browser case reloads the Project URL and retrieves the same Mission, registration and snapshot identity from persisted SQLite |
| Path-safe display | A unique repository-root and filename sentinel are absent from the DOM after registration and capture; the path field is cleared and removed |
| Honest status | Snapshot state is explicitly an observation, `NOT ASSESSED` is visible and no readiness decision is inferred |
| Keyboard path | The full workflow uses keyboard submission; the skip link moves focus to the main region after reload |
| Typed client | Component tests reject malformed success payloads and fixed-error handling omits response diagnostics |
| Baseline layout | In-app browser inspection at 1366 x 768 finds no horizontal overflow and confirms readable form, state and trust-boundary presentation |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run typecheck` | 0 | All five workspaces passed strict TypeScript checks |
| `npm.cmd run test:unit` | 0 | 15 files, 89 tests passed, including 17 Project-route and strict workspace-client tests |
| `npm.cmd run test:api` | 0 | 11 files, 61 tests passed, including schema v4, read-only Git, restart, privacy and non-mutation regressions |
| `npm.cmd run build` | 0 | All workspaces built; Vite transformed 51 modules |
| `npm.cmd run check:docs` | 0 | 37 Markdown files checked with zero broken local targets |
| `npm.cmd run check` | 0 | Typecheck, 150 non-browser tests, production builds and documentation-link gate passed |
| `npm.cmd run test:e2e` | 0 | 3 Chromium cases passed at 1366 x 768, including the real persisted path-safe workflow |
| In-app visual inspection | 0 | 1366 x 768 Projects route had no horizontal overflow; trust labels, form and state composition were readable |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across 104 reported production dependencies |

## Design decisions

- The API remains authoritative. Browser route state holds only identifiers and retrieved resources; it does not construct substitute domain truth.
- Routing uses the browser history API because the current two-route boundary does not justify a new runtime dependency.
- The repository path is a one-time secret-adjacent input. It is not retained in component state after success and is absent from every success resource.
- Snapshot history is visibly immutable and attributed. Dirty/clean status is not validation, approval or readiness.
- Existing APIs and schema migration `004` are sufficient for this UI story; `IL-2.5` introduces no database migration or API route.

## Integrity and scope

Browser and API tests create only authored synthetic Projects, Missions and OS-temporary Git repositories. Candidate repositories, personal repositories, MyTeams, employer/client material and quarantined discovery roots were not registered, read, copied or changed.

External AI remains off. No credential or live provider call was used. The story adds no package.

## Next boundary

`IL-2.6` owns the next frozen bounded increment. This story stops without beginning that work, and the Phase-2 repository-write and registered-code-execution prohibitions remain in force.
