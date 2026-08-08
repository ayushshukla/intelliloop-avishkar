# IL-3.3 Claim Normalization and Supersession Evidence

**Evidence ID:** `EV-IL-3.3`  
**Story:** `IL-3.3` - Claim normalization and explicit supersession intake  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Execution boundary:** Domain and in-process API persistence only

## Scope and authority

The frozen R3 outcome requires bounded claims with comparison keys, applicability and explicit successor links while raw evidence remains preserved. Acceptance requires normalization vectors, invalid-supersession rejection, intact history and explicit inference labeling. `IL-3.2` is the dependency.

This implementation adds no evidence/claim HTTP route, browser import control, automated extractor, conflict winner, Twin projection, reconciliation finding, readiness decision or external provider call. Those remain with their owning later stories. Imported sources and normalized claims are evidence, not automatically true and not readiness authority.

## Implemented proof surface

| Surface | Implemented boundary |
|---|---|
| Domain | Immutable `Claim` and `ClaimSupersession`; bounded terms, values, applicability, excerpts and stable error codes |
| Normalization | `claim-normalization.v1` with NFKC/lowercase/dot terms, canonical JSON values and sorted unique applicability dimensions |
| Identity | Version-framed comparison, applicability, claim, import and successor-link SHA-256 digests |
| Attribution | Exact Project/Mission/source identity, origin, locator, revision/content digest, recorded/effective time, extraction method and epistemic label |
| Source integrity | Claim excerpt must occur verbatim in the source's redacted normalized content |
| Supersession | Explicit same-scope/same-comparison/same-applicability predecessor link with non-decreasing record time and no direct fork |
| Persistence | Forward migration `006`; strict immutable `claims` and `claim_supersessions` tables with source/claim foreign keys and validation triggers |
| Retrieval | In-process exact get plus bounded identity-cursor claim/link lists; full invariant rehydration after restart |

## Acceptance evidence

| R3 acceptance | Observed proof | Result |
|---|---|---|
| Normalization vectors pass | Case, spacing, ASCII/full-width punctuation and Unicode variants converge; reordered applicability dimensions produce the same key | `PASS` |
| Conflicting raw text preserved | Opposing source excerpts with one comparison/applicability key persist as distinct claims and retain their exact redacted-source text/value | `PASS` |
| Invalid supersession rejects | Missing, self, backwards-time, mismatched comparison/applicability and already-successored predecessors reject | `PASS` |
| History remains intact | A three-claim/two-link chain round-trips after database restart; predecessor/link update and delete attempts reject | `PASS` |
| Inference is labeled | `INFERENCE` is stored and rehydrated explicitly without promotion to `FACT`, confidence or truth | `PASS` |

## Focused verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run build -w @intelliloop/domain` | 0 | Claim domain compiled |
| `npx.cmd vitest run packages/domain/test/claim.test.ts --config vitest.unit.config.ts` | 0 | 14 claim normalization/supersession tests passed |
| `npm.cmd run typecheck -w @intelliloop/api` | 0 | Claim repository and migration tests typechecked |
| `npx.cmd vitest run apps/api/test/claim-repository.test.ts --config vitest.api.config.ts` | 0 | 9 claim persistence tests passed |
| `npx.cmd vitest run apps/api/test/database-lifecycle.test.ts --config vitest.api.config.ts` | 0 | 12 bootstrap/upgrade/rollback/refusal/concurrency tests passed |

The repository tests additionally prove exact retry and two-connection convergence, rollback of a successor when forced link insertion fails, archived-scope read retention, cross-scope source rejection and stable non-diagnostic storage/page failures.

## Aggregate verification record

| Gate | Observed result | Result |
|---|---|---|
| `npm.cmd run check` | Five workspaces typechecked; 18 unit/component files with 141 tests and 13 API files with 80 tests passed; all production builds passed | `PASS` |
| Production web build | Vite transformed 55 modules and emitted the production bundle | `PASS` |
| Repository safety | `EV-REPO-SAFETY` regenerated with exact status/tree equality and the negative corpus | `PASS` |
| Documentation | 42 Markdown files checked with zero broken local targets | `PASS` |
| Browser | 3 Chromium workflows passed against managed localhost API/web processes | `PASS` |
| Production audit | 0 vulnerabilities across all severities and 104 production dependencies | `PASS` |
| Runtime cleanup | No listener remained on ports 3100 or 4173; no current-run evidence/E2E fixture remained | `PASS` |

The previously disclosed schema-only operating-system temporary directory from an `IL-3.2` pre-final failed assertion remains subject to the execution-policy cleanup exception recorded in the [IL-3.2 evidence](IL_3_2_TEST_EVIDENCE.md). It was not created or modified by this story and contains no product data.

## Trust decisions

- `comparisonKey` covers normalized subject/predicate only. It is comparison eligibility, never value compatibility or a truth decision.
- `applicabilityKey` covers exact normalized dimensions/time window. Overlap semantics remain owned by `IL-5.1`/`IL-5.2`.
- Different raw text or values remain distinct even when comparison/applicability keys match.
- A newer timestamp without an explicit link has no supersession effect.
- `FACT`/`INFERENCE` is declared epistemic metadata, not truth probability, source priority, approval or readiness.
- The direct-successor uniqueness rule is a conservative intake invariant. Later conflict semantics may consume the chain but must not rewrite it.

## Data and migration evidence

Migration `006` has authored checksum `sha256:304073b353710dc5c306813a9bdadffbf0478bb46a0c5e6fa30df7317c0ce60c`. Empty databases and every retained schema version 1 through 5 upgrade to version 6. Failed version 7 migration rolls back without a partial table; unknown version 7 refuses; four cold-start processes converge on six migration records.

Claim insertion runs under an immediate transaction. The source attribution composite foreign key prevents detached/mismatched evidence metadata. The successor validation trigger binds the link to both scoped claims and the successor's complete stored attribution. Both new tables reject update and delete.

## Limitations and handoff

`IL-3.4` is the next bounded story and owns evidence/claim preview, commit, retrieval, timeline and supersession HTTP contracts. This record does not authorize those routes. `IL-5.1`/`IL-5.2` own value compatibility, applicability overlap, conflict, ambiguity and the semantic effect of supersession. `IL-4.1` owns generalized Twin node/relationship vocabulary.

Official Avishkar rules remain unverified. This evidence demonstrates the frozen local story acceptance only; it is not an eligibility, security, privacy or competition-compliance certification.
