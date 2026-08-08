# Local Setup

**Audience:** Developers and demo operators  
**Status:** `IL-9.3_DOCUMENTATION_VERIFIED / DEMO_RUN_2_LOCAL_PILOT`  
**Evidence date:** 2026-08-08  
**Verified environment:** Windows 11 observed; Linux verification configured in CI

## Prerequisites

- Node.js `22.22.0`
- npm `10.9.4`
- PowerShell or another shell capable of invoking npm scripts

Confirm the exact baseline:

```powershell
node --version
npm.cmd --version
```

On this host, use `npm.cmd` because PowerShell execution policy may block `npm.ps1`.

## Install

```powershell
npm.cmd ci
```

`package-lock.json` is the dependency authority. Installation creates no database and requires no product credential. The database is created only when the API starts.

## Typed API configuration

| Process environment key | Default | Accepted values |
|---|---|---|
| `INTELLILOOP_API_HOST` | `127.0.0.1` | `127.0.0.1` only |
| `INTELLILOOP_API_PORT` | `3100` | Integer `1`-`65535` |
| `INTELLILOOP_LOG_LEVEL` | `info` | `silent`, `error`, `info` |
| `INTELLILOOP_DATA_DIRECTORY` | OS user-data directory | Absolute, non-root directory outside registered repositories |
| `INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED` | `false` | Exact `true` or `false`; enables only the server-side local pilot boundary |
| `INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS` | empty | Up to 16 absolute local Git roots separated by the host path delimiter; never returned to the browser |

Example process-local override:

```powershell
$env:INTELLILOOP_API_PORT = "43100"
$env:INTELLILOOP_LOG_LEVEL = "error"
$env:INTELLILOOP_DATA_DIRECTORY = "C:\IntelliLoopData"
npm.cmd run dev:api
```

Do not create a `.env` file. External AI may be absent or explicitly `false`; enabling it fails startup. Evidence Replay, advisory disagreement and remediation preview are implemented default-off experiments and accept exact `true`/`false` values, with supported aligned opt-ins through isolated launchers.

For an explicitly authorized Local Project Pilot on Windows, set both pilot keys only in the current PowerShell process, keep the data directory outside every candidate repository and then run the ordinary local application:

```powershell
$env:INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED = "true"
$env:INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS = "C:\Authorized\RepositoryA;C:\Authorized\RepositoryB"
npm.cmd run dev
```

Use the platform path delimiter (`;` on Windows, `:` on POSIX). Do not commit machine-specific roots. A configured root must itself be a non-bare Git working repository with a direct real `.git` directory. The capability stays disabled or configuration-required when either prerequisite is absent.

## Run locally

```powershell
npm.cmd run dev
```

To run the optional read-only Evidence Replay Lab against an isolated schema-14 directory:

```powershell
npm.cmd run dev:replay
```

This launcher enables both the API declaration and web presentation flag. Normal `dev` and `dev:demo` runs omit the lab. Evidence Replay uses only existing Twin GET resources and cannot change canonical state or readiness.

To run the optional browser-local Advisory-output Disagreement Lab:

```powershell
npm.cmd run dev:disagreement
```

Complete the controlled demo through `READY`, open its cited explanation, generate an answer, then use the lab below the answer. The lab imports JSON only into browser memory and makes no provider or comparison request.

To run the optional non-applying Guarded Remediation Preview:

```powershell
npm.cmd run dev:remediation
```

Complete the controlled demo through `READY`, generate **What is impacted?**, and use the preview below the cited answer. It produces cited test plans/change intents in browser memory only; it never applies or executes them.

Default endpoints:

- Web: `http://127.0.0.1:4173`
- Health API: `http://127.0.0.1:3100/api/v1/health`
- Projects API: `http://127.0.0.1:3100/api/v1/projects`
- Web workflow: create/select a Project at `/`, then use `/projects/:projectId`
- Twin/code-map workflow: register a controlled repository, open the current Mission's **Active Software Twin**, then use **Map repository and refresh Twin**
- Reconciliation/impact workflow: open the current Mission's findings-and-impact review; the same immutable resources are available through Mission-scoped `/api/v1/missions/:missionId/reconciliation/revisions` routes
- Cited explanation workflow: after a reconciliation revision exists, use **Open cited explanation** or `/missions/:missionId/explanation`, select one of the six fixed questions and review the deterministic answer, citations and exact `NOT SENT` pack disclosure
- Readiness/Passport workflow: after a reconciliation revision exists, use **Readiness and Passport** or `/missions/:missionId/passport` to create a repository-derived assessment, inspect history and create/download an unsigned Passport
- Controlled demo: open `/demo`, use the fixed setup/correction/staleness actions, and follow the [demo runbook](../demo/DEMO_RUNBOOK.md); no path, credential or external AI is required
- Local Project Pilot: when explicitly enabled and allowlisted, open `/local-pilot`, preflight one root, create/select one Project and Work Item, and run the exact-commit source-free workflow; the ordinary `npm.cmd run dev` remains default-off

The web surface needs the API for its connected and workspace states. Without it, the UI displays a stable unavailable/error state rather than fake data.

## Local data

On Windows the default database is `intelliloop.sqlite3` under the current user's `AppData\Local\IntelliLoop` directory. On other supported development hosts it is under `.local/share/intelliloop` in the current home directory. The API creates the directory and applies migrations `001`-`014` before listening.

Use an absolute `INTELLILOOP_DATA_DIRECTORY` override for isolated development. Never point it at this source tree, a candidate repository or a directory that may later be registered. The database may contain Project names, mission titles and private canonical roots; do not use sensitive values. For the controlled competition workflow, `npm.cmd run dev:demo` supplies a schema-14-specific operating-system temporary-data directory automatically; it does not weaken migration checksum validation for normal databases.

Repository registration is reachable only through the enabled Local Project Pilot. It accepts one absolute Git root that is lexically and canonically contained by the server allowlist and whose `.git` marker is a direct, non-symlink directory. Use the synthetic LoopMart repository for shared competition artifacts; use a real local repository only with explicit authorization and keep screenshots/evidence source-free. The configured data directory must remain outside it. The API stores the canonical root privately and returns only path-free registration metadata.

Registration is permanent in the current boundary: there is no replace or removal operation. After registration, snapshot capture runs only fixed read-only Git identity/status operations. Code Map analysis reads supported content from the captured commit with fixed `ls-tree`/`cat-file` operations; working-tree-only changes are excluded and reported only as a count. Do not move the registered root or replace it with a junction/symlink; revalidation will reject later reads. Do not place credentials in Project/Mission names or repository filenames used for demonstrations.

See [Data and migrations](../architecture/DATA_AND_MIGRATIONS.md) for upgrade and refusal behavior.

## Verify and build

For the Phase-9 release-candidate proof, use the single deterministic entrypoint:

```powershell
npm.cmd run evidence:release-platform
```

It verifies the pinned runtime, performs a clean lockfile install, runs all 20 required static, unit/component, API/integration, build, browser, safety, demo and documentation gates, checks lockfile equality, and writes source/artifact hashes to [EV-RELEASE](../evidence/EV_RELEASE.json). The checked-in GitHub Actions matrix repeats this path on explicit `windows-2025` and `ubuntu-24.04` hosted runners. This host directly passed Windows 11; Linux is `CONFIGURED_NOT_OBSERVED_LOCALLY` until a CI or Linux-host artifact is collected. Use `npm.cmd run check:release-platform` to reject drift in the existing evidence record without rerunning the complete suite.

`IL-9.2` remediated the prior development-tool advisories with exact compatible versions. Both `npm.cmd audit --json` and `npm.cmd audit --omit=dev --json` now report zero vulnerabilities. Use `npm.cmd run check:release-security` for the lockfile-bound license, provenance, candidate-privacy and safety verification; registry advisory data must still be refreshed at final freeze.

Use `npm.cmd run check:documentation` to verify the synchronized canonical document hashes, documented npm script names, complete local API route inventory, deferred-feature labels and the seven screenshot files against their manifest. Use `npm.cmd run evidence:documentation` only when intentionally refreshing the `IL-9.3` record after reviewed documentation changes.

From the repository root, the clean foundation proof path is:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run evidence:repo-safety
npm.cmd run evidence:privacy
npm.cmd run evidence:twin-code-map
npm.cmd run evidence:citations
npm.cmd run evidence:readiness-passport
npm.cmd run test:e2e
npm.cmd audit --omit=dev
```

`npm.cmd run check` performs strict typechecking, all non-browser tests, the production build, generated repository/privacy/Twin/code-map/reconciliation/citation/OpenAI-checkpoint/readiness/Passport proofs and the documentation-link check. `npm.cmd run evidence:repo-safety` independently builds its required packages, creates only an OS-temporary synthetic Git fixture, verifies exact status and complete-tree digest equality plus the negative corpus, writes the path-safe [EV-REPO-SAFETY report](../evidence/EV_REPO_SAFETY.json), and removes the fixture. `npm.cmd run evidence:privacy` builds the same production boundaries, creates an OS-temporary synthetic database, proves fixed secret-sentinel absence across current logs/API/persistence and offline transfer fixtures, writes [EV-PRIVACY](../evidence/EV_PRIVACY.json), and removes the fixture. `npm.cmd run evidence:twin-code-map` drives production scanner/extractor/API/SQLite/Twin code over controlled temporary repositories, proves explicit fallback distinction plus restart and repository equality, writes [EV-CODEMAP](../evidence/EV_CODEMAP.json) and [EV-TWIN](../evidence/EV_TWIN.json), then removes its fixtures. `npm.cmd run evidence:citations` uses the controlled reconciliation fixture to regenerate [EV-RECONCILE](../evidence/EV_RECONCILE.json) and [EV-CITATIONS](../evidence/EV_CITATIONS.json), with external fetch trapped and no provider credential. `npm.cmd run evidence:openai-eval` rebuilds packages, refreshes privacy/reconciliation/citation prerequisites, scans repository text and writes the safe offline [EV-OPENAI-EVAL](../evidence/EV_OPENAI_EVAL.json) decision report without reading a credential or contacting a provider. `npm.cmd run evidence:readiness-passport` builds the required packages/API, runs the focused 56-test cross-layer matrix and regenerates [EV-READINESS](../evidence/EV_READINESS.json) and [EV-PASSPORT](../evidence/EV_PASSPORT.json). `npm.cmd run test:e2e` starts isolated localhost API/web processes, uses a temporary database directory and synthetic Git roots, verifies connected/failure, Project/evidence/Twin/code-map/reconciliation/cited-explanation/readiness workflows, and removes temporary state after shutdown.

Runtime-observation summaries require no connector or credential. They are accepted only through the documented local JSON API and remain historical evidence in the same SQLite file. Use controlled synthetic summaries; do not import real production, employer, client or personal telemetry.

Reconciliation runs also require no connector or credential. They select exact persisted Twin, code-map and Git-snapshot revisions and accept only explicit bounded support, root and impact-requirement declarations. Use the [API reference](../api/API_REFERENCE.md) for the request shape. Public validation-result intake and reconstruction through the reconciliation route are not implemented; do not edit SQLite or fabricate validation rows to bypass that boundary. Internal schema-`011` validation storage exists only for repository-derived readiness composition and controlled proof.

The `IL-6.4` local cited-question route is usable after a reconciliation revision exists. It accepts no arbitrary prompt or provider selection, defaults to `DISABLED`, reads no provider environment variable or credential and has no live network transport. The outbound section is a review of what a future provider request could contain and is fixed to `NOT SENT`; do not interpret the presence of exact pack JSON as a transfer. Do not flip `INTELLILOOP_AI_EXTERNAL_CALLS` or substitute a transport. Any personal OpenAI evaluation remains the separately gated `IL-6.5` decision and requires explicit user enablement before its live-call branch.

The `IL-6.5` checkpoint is now frozen offline and `IL-6.6` finalizes that operating posture. The supported finale remains the local deterministic `AI_OFF` path. Do not treat a ChatGPT login, subscription or locally available credential as authority to supersede it.

If Chromium is not already installed for the pinned Playwright version, run `npx.cmd playwright install chromium` once before the E2E command. This is a development-time download, not a product-runtime request.

Production outputs are generated under each workspace's `dist/` directory and ignored by Git.

`IL-7.2`-`IL-8.3` require no credential or external runtime. Opening the application database upgrades it forward to schema `014`, which includes immutable validation, explicit-review, ReleaseAssessment and Release Passport stores plus the narrowly scoped controlled-demo lifecycle. The supported Mission route `/missions/:missionId/passport` creates repository-derived assessments, lists history, projects unsigned Passports and downloads verified structural JSON. It cannot create validation/review inputs and must not be presented as release approval. The visible application footer remains operational context, not a readiness result. See the [Readiness and Release Passport guide](../product/READINESS_AND_PASSPORT_GUIDE.md).

## Troubleshooting

- **`CONFIG_INVALID` at startup:** check only the documented keys and accepted values. Supplied values are intentionally not printed.
- **Port occupied:** select another valid localhost port for API-only work; keep the Vite proxy at the default during combined web/API development.
- **Web reports unavailable:** confirm the API is running on the Vite proxy target and health returns HTTP 200.
- **`DATABASE_START_FAILED` at startup:** verify the data directory is writable and the database is not from a newer or altered schema. The raw path and SQLite error are intentionally withheld; preserve the file and consult the migration evidence before recovery. Do not delete or downgrade it as a troubleshooting shortcut.
- **A pre-release development database fails checksum validation:** preserve it for diagnosis and start the controlled fixture with `npm.cmd run dev:demo`. Do not edit migration history or reuse that isolated demo directory for private data.
- **Windows Vitest temp error:** the checked-in configuration serializes test files while retaining isolation; do not remove this supported-platform control without replacement evidence.
- **Playwright browser missing:** install only Chromium with `npx.cmd playwright install chromium`.
- **Local Project entry is unavailable:** confirm the exact enable flag is `true` and the server allowlist is non-empty. The browser cannot enumerate configured roots, so correct configuration in the launching process and restart the API.
- **Repository preflight/registration rejected:** confirm the path is absolute, is path-aware contained by one configured root, has a direct real `.git` directory and committed HEAD, contains no explicit `..` segment or symlink/junction component and does not contain the IntelliLoop database. Network/device roots and sibling-prefix matches reject. The stable UI/API error intentionally omits submitted and configured paths.
- **Registered repository no longer resolves:** restore the originally registered canonical root. Replacement/removal is not authorized; do not edit the SQLite file as a workaround.
- **Code map returns a conflict:** confirm the Mission is current, the root has not moved, supported committed source is within 2,000 files/256 KiB each/5 MiB total and exact-object acquisition/extraction completes within five seconds. Oversized supported files fail closed; unsupported extensions and generic sensitive/private-configuration names are counted without reading/persisting their content. The browser deliberately does not substitute the declared demo fixture.
- **Reconciliation returns a conflict:** confirm the selected Twin, code map and snapshot share the same Project/Mission and exact persisted bindings. A stale predecessor, mismatched code-map projection, unavailable Twin-bound source or currently unreconstructable validation-result state also fails closed. Re-materialize through normal APIs; do not repair lineage by editing the database.
- **Synthetic edge cases are empty:** the selected fixed question's minimized pack contains no reconciliation finding or impact path eligible for a suggestion. This is an honest empty advisory state; do not create evidence or findings merely to populate it.
- **Synthetic edge cases are rejected:** regenerate the cited answer from current persisted state. The client deliberately rejects changed labels, unknown citations, identity/digest drift, private paths and authority-bearing values.
