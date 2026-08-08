# IL-5.1 Test Evidence - Deterministic Comparison Contract

**Story:** `IL-5.1` - Comparison keys, claim values and rule-set contract  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Authority boundary:** Pure domain comparison only

## Implemented outcome

`reconciliation-rules.v1` defines exact comparison eligibility, deterministic applicability overlap and conservative value relations. The rule identity digest is:

```text
sha256:303187e972e24c314eb8153a1101c4182b525b89c8c0322125d8539e3b2628e7
```

The comparison contract requires the same Project/Mission, exact normalized subject/predicate identity, the same versioned comparison key and overlapping applicability. It gives fuzzy matching no canonical authority.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| Stable rule version and identity | Exact version and full canonical digest are pinned in the focused test | `PASS` |
| Subject/predicate eligibility | Normalized spelling variants compare; term and comparison-key mismatches do not | `PASS` |
| Mission isolation | A cross-Mission pair is `NOT_COMPARABLE` | `PASS` |
| Applicability dimensions | Compatible broad/narrow scopes overlap; shared unequal values are disjoint and sorted deterministically | `PASS` |
| Effective-time applicability | Half-open interval boundaries that only touch are disjoint | `PASS` |
| Canonical equality | Equal primitive and object values, including reordered object keys, are `EQUIVALENT` | `PASS` |
| Scalar incompatibility | Unequal same-type boolean, number and string values are `INCOMPATIBLE` symmetrically | `PASS` |
| Ambiguity preservation | Unknown null, mixed types and unequal arrays/objects remain `AMBIGUOUS` | `PASS` |
| No premature authority | No finding, winner, supersession effect, persistence, route, UI, impact or readiness code was added | `PASS` |

## Focused verification

```powershell
npm.cmd run typecheck -w @intelliloop/domain
npx.cmd vitest run packages/domain/test/reconciliation-comparison.test.ts --config vitest.unit.config.ts
npm.cmd run build -w @intelliloop/domain
```

Observed result: domain typecheck and build passed; the focused file passed all 18 tests.

## Aggregate and safety verification

The final verification observed 204 unit/component tests, 122 API tests, 7 isolated Chromium workflows, a 70-module Vite production build, regenerated passing repository-safety/privacy/Twin/code-map evidence, 59 Markdown files with zero broken links and zero production dependency vulnerabilities. `IL-5.1` changes no repository adapter, filesystem behavior, API route, database schema, browser flow, provider path or runtime network setting. The consolidated results and development-tool advisories are recorded in the [test evidence dossier](TEST_EVIDENCE.md).

## Explicit exclusions

`INCOMPATIBLE` is a pairwise relation, not a persisted `CONFLICT`. `IL-5.2` still owns conflict/supersession/ambiguity findings. Staleness, missing support, impact, explanations, readiness and Release Passport remain later stories.
