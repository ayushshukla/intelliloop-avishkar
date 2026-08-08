# IL-5.2 Test Evidence - Conflict, Supersession and Ambiguity Rules

**Story:** `IL-5.2` - Conflict, supersession and ambiguity rules  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Boundary:** Pure bounded domain evaluation; no persistence, API, UI, impact, staleness, missing-support or readiness authority

## Implemented contract

`claim-reconciliation.v1` evaluates at most 100 invariant-checked claims and 99 explicit supersession links in one Project/Mission. `reconciliation-decision-policy.v1` has canonical digest `sha256:969c93260d99bbae724f027b8b993a220e28a9a68df946044fd427e972576b70` and fixes these rules:

- caller collection order does not affect pair order, finding keys or the result digest;
- only a validated explicit exact-applicability successor link deactivates its predecessor;
- missing, forged, forked/joined or cyclic supersession topology fails the complete evaluation;
- recording time, source priority, confidence, epistemic label and AI have no winner authority;
- active incompatible pairs create open `CONFLICT` findings;
- active unknown, mixed-type or structured-policy pairs create open `AMBIGUOUS` findings;
- equivalent, non-comparable and inactive historical pairs create no open finding; and
- finding keys bind the exact claim IDs/digests, comparison key, comparison rules and decision policy.

## Focused executable evidence

```powershell
npm.cmd run typecheck -w @intelliloop/domain
npx.cmd vitest run packages/domain/test/claim-reconciliation.test.ts --config vitest.unit.config.ts
```

Result: one file and 18 tests passed. The vectors cover policy identity, equivalent/conflict/ambiguity/non-comparable truth cases, deterministic input order, no timestamp winner, one-step and multi-step successor chains, ambiguity after correction, missing links, forks, cycles, forged applicability/linkage, recomputed comparison-critical keys, duplicate/cross-Mission input and the pre-quadratic fixed claim limit.

## Repository verification

```powershell
npm.cmd run check
$env:INTELLILOOP_E2E_WEB_PORT='4174'
$env:INTELLILOOP_E2E_API_PORT='3101'
npm.cmd run test:e2e
```

The final verification observed 222 unit/component tests, 122 API tests, 7 isolated Chromium workflows, a 71-module Vite production build, regenerated passing repository-safety/privacy/Twin/code-map evidence and 60 Markdown files with zero broken links. `IL-5.2` changes no repository adapter, filesystem behavior, API route, database schema, browser workflow, provider path or runtime network setting. The consolidated results and dependency-audit boundary are recorded in the [test evidence dossier](TEST_EVIDENCE.md).

## Claim boundary

`OPEN` is a deterministic current-domain disposition, not proof that a finding was stored or shown to a user. `IL-5.3` subsequently composes these outputs into pure stale/missing-support reassessment values; its separate evidence record does not alter this historical `IL-5.2` result. `IL-5.5` owns immutable reconciliation/impact persistence and API, and `IL-5.6` owns browser presentation. No `IL-5.2` output establishes truth, waives ambiguity, blocks or approves a release, or mutates evidence/Twin history.
