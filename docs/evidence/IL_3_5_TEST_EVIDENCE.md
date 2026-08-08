# IL-3.5 Evidence and Timeline UI Evidence

**Evidence ID:** `EV-IL-3.5`  
**Story:** `IL-3.5` - Evidence and timeline UI  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Execution boundary:** Local React browser route over the existing loopback evidence/claim API

## Scope and authority

The frozen R3 outcome requires an operator to preview redaction, import evidence and inspect provenance, revisions, epistemic labels and supersession history. Acceptance requires successful browser import/restart, honest invalid import, keyboard operation and explicit integrity/empty states. DOC-15 is the [User guide](../product/USER_GUIDE.md); DOC-16 is the [Trust model](../product/TRUST_MODEL.md).

This story consumes the `IL-3.4` API and adds no migration or API route. It does not authorize file upload, automated extraction, browser claim authoring, inferred supersession, conflict resolution, Twin projection, validation, readiness or provider calls. Imported material and `FACT`/`INFERENCE` labels remain evidence, not truth or readiness authority.

## Implemented proof surface

| Surface | Implemented boundary |
|---|---|
| Route | `/missions/:missionId/evidence` loads one exact Mission and the first bounded source/event/claim/supersession pages |
| Preview | Markdown, text or JSON draft is prepared through the local API; normalized redacted content, counts and digest are reviewable but not persisted |
| Commit | Enabled only for the exact current preview; the API repeats preparation and the browser clears raw content/preview after success |
| Source/timeline | Immutable origin, logical locator, revision, recorded/effective time, digest and mission-sequenced import event are visible |
| Claims/history | Existing claim values, explicit `FACT`/`INFERENCE`, predecessor metadata and only persisted `SUPERSEDES` links are visible |
| Integrity | Exact resource validators plus cross-scope/source/link checks fail the whole lineage surface closed as `INTEGRITY ERROR` |
| Honesty/accessibility | Separate `EMPTY` states, text authority labels, semantic forms, visible focus, keyboard path and no placeholder success |
| Limits | UTF-8 draft is checked at 256 KiB; each collection requests 100 and visibly discloses a continuation |

## Acceptance evidence

| R3 acceptance | Observed proof | Result |
|---|---|---|
| Browser import and restart | Chromium created real Project/Mission scope, previewed a synthetic authorization value, imported only its redacted form and retrieved the same source/event after reload | `PASS` |
| Invalid import is honest | Duplicate-key JSON produced a stable visible error, no preview, disabled import and no source/timeline record | `PASS` |
| Keyboard flow | Project/Mission creation, evidence navigation, preview and import were completed with keyboard-operable semantic controls | `PASS` |
| Integrity and empty states are explicit | Four collection-specific `EMPTY` states render; a forged success resource produces `INTEGRITY ERROR` and no partial lineage | `PASS` |

## Client and component proof

The strict web client rejects unknown fields, invalid IDs/times/digests, pagination above 100, mismatched source/event attribution, impossible normalized UTF-8 byte counts, unknown/duplicate redaction rules, incoherent replacement totals and over-bounded claim JSON. The route additionally rejects duplicate collection identities/sequences, wrong Project/Mission scope, missing source references and inconsistent claim/supersession attribution.

Component coverage confirms that the Mission evidence URL is recognized as implemented, exposes explicit loading/current-route semantics and never renders a readiness state. HTTP status `413` is mapped to the stable invalid-request presentation rather than a generic success or crash.

## Browser proof

The managed Playwright suite contains five workflows:

1. connected empty foundation plus honest failed-network/retry;
2. persisted Project/Mission/repository/snapshot keyboard and reload workflow;
3. evidence empty state, redaction preview/import, raw-sentinel clearing, reload and explicit claim/successor history;
4. malformed JSON rejection; and
5. forged lineage response rejection as `INTEGRITY ERROR`.

The evidence workflow asserts no `READY` text and no horizontal overflow at 1366 x 768. A separate live in-app browser review at that viewport confirmed the project, Mission and evidence screens, redacted import, source/timeline cards and lower empty claim/supersession panels. Document/body width remained 1351 CSS pixels inside the scrollbar-adjusted viewport, and the browser console contained no warnings or errors.

## Verification record

| Gate | Observed result | Result |
|---|---|---|
| Focused web tests | 3 files with 23 tests passed after strengthening prepared-byte and redaction-rule validation | `PASS` |
| Aggregate `npm.cmd run check` | Five workspaces typechecked; 20 unit/component files with 149 tests and 14 API files with 86 tests passed; all production builds passed | `PASS` |
| Production web build | Vite transformed 58 modules and emitted the production bundle | `PASS` |
| Repository safety | `EV-REPO-SAFETY` regenerated with exact status/tree equality and the negative corpus | `PASS` |
| Documentation | 44 Markdown files checked with zero broken local targets | `PASS` |
| Browser `npm.cmd run test:e2e` | 5 Chromium workflows passed at 1366 x 768 after documentation closure | `PASS` |
| Production audit | 0 vulnerabilities across all severities and 104 production dependencies | `PASS` |
| Runtime cleanup | Ports 3100/4173 are clear; E2E fixtures were removed; one exact synthetic visual-QA temp directory remains under the disclosed execution-policy deletion exception | `PASS WITH EXCEPTION` |

## Trust decisions

- Preview is reviewable transient state, not persisted evidence and not proof that every sensitive value was recognized.
- Import invalidates when draft content or format changes; server re-preparation remains authoritative.
- Successful import clears the raw draft and preview from the component but makes no secure-memory-erasure claim.
- Browser validators defend the presentation boundary; SQLite/domain/API remain the persistence and invariant authorities.
- A later timestamp does not imply supersession. Only an explicit persisted link appears in the history panel.
- Source and claim `FACT` mean declared epistemic metadata, not certainty, priority, approval or release readiness.
- A collection continuation is disclosed as partial; the browser does not silently imply completeness beyond its first 100 records.

## Data and runtime evidence

`IL-3.5` adds no persistence migration. Schema version remains 6. The browser uses only relative `/api/v1` routes through the local proxy and adds no provider or non-local runtime URL. No product credential is read.

The retained visual-QA directory is named `intelliloop-visual-il35-f50a5d1bef8c421298dfc0c0cd428ffa`. Its absolute target was resolved, verified inside the operating-system temp root and limited to synthetic IL-3.5 review data; the exact API/web process tree was stopped first. Recursive removal was then blocked by the execution policy, so no alternate deletion mechanism was used. This is separate from the previously disclosed schema-only `IL-3.2` operating-system temporary directory and does not change the story acceptance result.

## Limitations and handoff

`IL-3.6` is the next bounded story and owns `EV-PRIVACY` across logs, database, API, exports and AI-pack fixtures. `IL-5.1`/`IL-5.2` own compatibility, applicability overlap, conflict, ambiguity and supersession semantics. `IL-4.1` owns generalized Twin vocabulary.

Official Avishkar rules remain unverified. This evidence demonstrates only the frozen local story acceptance and is not an eligibility, privacy, security or competition-compliance certification.
