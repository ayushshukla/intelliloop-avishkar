# Coding Prompt 1.1 — Clean-Room Workspace and Offline Health Slice

Enter **INTELLILOOP IMPLEMENTATION MODE — STORY IL-1.1**.

Use careful, high-depth reasoning. Take ownership of bounded implementation decisions and use conservative defaults where they do not conflict with the frozen architecture. Implement and verify only story `IL-1.1`. Do not silently continue into `IL-1.2` or later stories.

## Project root

`<INTELLILOOP_REPOSITORY_ROOT>`

## Story mission

Create the source-independent npm-workspaces foundation and one honest offline vertical health slice:

- a Fastify API with `GET /api/v1/health`;
- a React/Vite web foundation that calls and renders that local health result;
- pure `domain`, shared `contracts` and `demo-fixtures` package boundaries;
- strict TypeScript, unit/injection/browser smoke tests and production builds;
- initial professional setup, architecture, testing, provenance, AI-use and dependency-notice documentation.

This story proves the selected stack can install, build, test and run. It does not implement Projects, Missions, persistence, repository registration, evidence, Twin, code mapping, reconciliation, impact, AI provider calls, readiness, Passport or demo fixtures.

## Authoritative inputs

Read completely before editing:

1. `planning/r2-development-readiness-2026-08-03/DEVELOPMENT_READINESS_FREEZE.md`
2. `planning/r2-development-readiness-2026-08-03/development-readiness.json`
3. `planning/r2-development-readiness-2026-08-03/r2-reuse-manifest.json`
4. `planning/r3-implementation-backlog-2026-08-03/R3_BACKLOG_GATE.md`
5. `planning/r3-implementation-backlog-2026-08-03/IMPLEMENTATION_BACKLOG.md`
6. `planning/r3-implementation-backlog-2026-08-03/implementation-backlog.json`
7. `planning/r3-implementation-backlog-2026-08-03/DOCUMENTATION_AND_SUBMISSION_PLAN.md`
8. `planning/r3-implementation-backlog-2026-08-03/AVISHKAR_RULES_GAP_REGISTER.md`

Treat the local filesystem, Git metadata and these artifacts as authoritative. If unexpected product source exists before implementation, preserve it, report it and stop rather than overwriting it.

## Preflight checkpoint

Before writing:

1. Record current branch, HEAD/unborn state, remotes and complete status.
2. Confirm the repository contains only `.gitignore`, discovery/recovery/planning artifacts and no product implementation.
3. Hash all R1, R2 and R3 planning artifacts so their immutability can be verified afterward.
4. Confirm runtime versions. The required baseline is Node.js `22.22.0` and npm `10.9.4`.
5. On this Windows host, invoke npm as `npm.cmd` if PowerShell execution policy blocks `npm.ps1`.
6. Do not inspect or reuse candidate application source while implementing this story.

If Node/npm differ, do not silently change the frozen versions. Report the mismatch and use an available version manager only if doing so is safe and within the project root boundary.

## Frozen workspace

Create this shape:

```text
apps/
  api/
  web/
packages/
  contracts/
  demo-fixtures/
  domain/
docs/
  architecture/
  development/
  evidence/
  governance/
  security/
```

Use npm workspaces and ECMAScript modules consistently. Package names must be IntelliLoop-owned and scoped consistently, for example `@intelliloop/domain`; do not reuse candidate project names or internal identifiers.

## Exact runtime and package baseline

Pin exact versions—do not use caret or tilde ranges:

- Node.js `22.22.0`
- npm `10.9.4`
- TypeScript `5.9.3`
- React `18.3.1`
- React DOM `18.3.1`
- Vite `5.4.21`
- Fastify `5.8.5`
- Vitest `2.1.9`
- `@vitejs/plugin-react` `4.7.0`
- `@playwright/test` `1.62.1`
- `@types/node` `22.20.1`
- `@types/react` `18.3.31`
- `@types/react-dom` `18.3.7`
- `tsx` `4.23.5`
- `concurrently` `10.0.4`

The exact R2 product versions and the compatible testing/tool versions above were verified as registry-resolvable on 2026-08-03. `better-sqlite3` is frozen for the architecture but must not be installed until the database story needs it.

Create and retain `package-lock.json`. Set the root package `private: true`, `packageManager: "npm@10.9.4"`, exact Node/npm engines and workspace paths. Add a `.node-version` with `22.22.0`.

## Required implementation

### 1. Root orchestration

Provide root scripts with clear exit behavior:

- `dev`
- `dev:api`
- `dev:web`
- `typecheck`
- `test`
- `test:unit`
- `test:api`
- `test:e2e`
- `build`
- `check` that runs typecheck, non-browser tests and build

Do not hide failing commands with permissive shell operators. Keep platform behavior compatible with Windows PowerShell and ordinary CI shells.

### 2. TypeScript configuration and package direction

- Enable strict TypeScript including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` unless a concrete compiler incompatibility is demonstrated.
- Use project references or an equally explicit build ordering.
- `packages/domain` must not import React, Vite, Fastify, SQLite or any app module.
- `packages/contracts` may define the health response contract without server or browser dependencies.
- Apps may depend on packages; packages may not depend on apps.
- Add a lightweight executable boundary test or static assertion that catches forbidden domain/app imports.

### 3. Shared health contract

Define a minimal versioned response shared by web and API. It may contain only operational facts appropriate to story `IL-1.1`, such as:

- service identifier;
- API version;
- status `ok`;
- current UTC server time;
- product mode `FOUNDATION_ONLY`;
- external AI state `OFF`.

Do not return readiness, project counts, database state, evidence counts or implemented-feature claims.

Validate or construct the response through authored TypeScript logic. Do not add a broad schema framework unless needed by a frozen later boundary.

### 4. Fastify API

- Export an application factory so injection tests do not open a port.
- Provide `GET /api/v1/health` with the shared contract.
- Provide a separate startup entry point bound to `127.0.0.1` only.
- Do not enable CORS broadly. For local development, use the Vite proxy or a narrowly justified same-origin arrangement.
- Do not add database, filesystem scanning, Git, shell, credential or external-network behavior.
- Keep logs free of environment dumps and request bodies.

### 5. React/Vite web foundation

- Render an original, professional IntelliLoop foundation screen—not a copied or generic candidate layout.
- Include product name, concise evidence-reconciled subtitle, an explicit `Foundation setup` status and visible `AI off` state.
- Fetch `/api/v1/health` through a small typed API client.
- Implement honest loading, healthy and unavailable states.
- Do not display fake projects, graphs, conflicts, readiness badges, metrics or demo records.
- Use semantic HTML, visible focus, keyboard access and text/icon state communication rather than color alone.
- Establish a restrained design-token baseline in authored CSS without adding a UI framework unless materially necessary.

### 6. Package foundations

- `packages/domain`: infrastructure-free public entry point and one small deterministic utility/invariant sufficient to prove the package/test pipeline; do not invent later domain entities.
- `packages/contracts`: health contract and any small shared result/error type required by this story.
- `packages/demo-fixtures`: empty typed boundary with documentation that controlled fixtures arrive in `IL-8.1`; do not add fake data.

### 7. Tests

At minimum implement:

- domain deterministic unit test;
- contract construction/shape test;
- Fastify injection test for `GET /api/v1/health` success and content type;
- failure-safe web client/UI behavior test at the most appropriate current layer;
- Playwright Chromium smoke proving the web application loads, reaches the local API and shows `Foundation setup` plus `AI off`;
- forbidden-import/package-boundary test.

Configure the Playwright web server(s) reproducibly. Install only the Chromium browser needed for the smoke test. Do not make a live external service call during tests.

### 8. Initial professional documentation

Create:

- `README.md`
- `docs/INDEX.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/development/SETUP.md`
- `docs/development/TESTING.md`
- `docs/development/CONTRIBUTING.md`
- `docs/security/SECURITY_AND_PRIVACY.md`
- `docs/governance/PROVENANCE.md`
- `docs/governance/AI_USE_DISCLOSURE.md`
- `docs/governance/THIRD_PARTY_NOTICES.md`
- `docs/evidence/TEST_EVIDENCE.md`

Documentation rules:

- Mark capability status as `FOUNDATION_ONLY`.
- Use commands actually executed on this host.
- Explain the source-independent build and `directSourceCopyAuthorized: false` boundary.
- State that official Avishkar rules are not yet verified and do not claim eligibility/compliance.
- State that the product contains no live provider call and external AI is off.
- Record direct dependencies and their licenses only after verifying package metadata; distinguish this working inventory from the final transitive audit.
- Do not copy R1/R2 prose wholesale. Write implementation-facing documents in original language and link the planning source.
- In `TEST_EVIDENCE.md`, record environment versions, exact commands, exit states, story ID and current limitations.

## Authorized writes

Write only within the project root, limited to:

- root workspace/tooling files required by this story;
- `apps/api/**`;
- `apps/web/**`;
- `packages/domain/**`;
- `packages/contracts/**`;
- `packages/demo-fixtures/**`;
- the documentation files listed above;
- additive `.gitignore` entries needed for local/generated output.

Do not modify discovery, recovery or planning artifacts. Do not create a database or any product data directory in this story.

## Non-negotiable safety and scope

- Do not copy or adapt candidate application source, schemas, prompts, tests, prose, assets or UI composition.
- Do not open MyTeams, employer, client, Nisum-internal, Pushhpa, credential-bearing or quarantined roots.
- Do not read or print `.env` values, credentials, private URLs, certificates, keystores or database contents.
- Do not use a real OpenAI credential or make a live provider call.
- Do not implement Projects, Missions, repository registration, Git snapshot, evidence, Twin, code map, reconciliation, impact, readiness, Passport, demo reset or stretch features.
- Do not add shell, repository-write, Git-write, patch, deployment or arbitrary-execution endpoints.
- Do not use Git reset, clean, checkout, stash, revert, commit, merge, fetch, pull or push.
- Do not edit candidate repositories.
- Do not claim the product is Avishkar compliant, submission-ready or functionally complete.
- Preserve unexpected state and report it.

## Verification

Run and record at minimum:

1. `node --version`
2. `npm.cmd --version`
3. clean dependency installation using the created lockfile
4. `npm.cmd run typecheck`
5. `npm.cmd run test:unit`
6. `npm.cmd run test:api`
7. `npm.cmd run build`
8. Playwright Chromium installation if not present, without installing unrelated browsers
9. `npm.cmd run test:e2e`
10. `npm.cmd run check`

Then:

- verify the web and API production outputs exist;
- inspect the rendered page at 1366×768;
- verify loading/healthy/unavailable states are readable;
- search source and generated logs/evidence for common secret patterns and unexpected absolute private paths;
- confirm no `.env`, credential, database or product fixture was created;
- confirm all R1/R2/R3 planning hashes remain unchanged;
- confirm no candidate repository changed;
- inspect `git status --short --branch` and report every created path category.

If a verification command fails, diagnose and correct only within story `IL-1.1`. Do not weaken tests or silently skip Playwright. If an environmental blocker cannot be corrected safely, return the review marker with exact evidence.

## Final response

Return:

1. Story decision
2. Preflight and repository state
3. Files and workspace created
4. Runtime and exact dependency versions
5. API health slice
6. Web foundation and accessibility baseline
7. Package boundaries
8. Tests and commands with exit results
9. Documentation created
10. Security, privacy, network and credential posture
11. Source-independence and provenance confirmation
12. Avishkar rules posture
13. Remaining limitations
14. Next story, without executing it

End with exactly one:

`INTELLILOOP_STORY_1_1_COMPLETE`

`INTELLILOOP_STORY_1_1_REQUIRES_REVIEW`
