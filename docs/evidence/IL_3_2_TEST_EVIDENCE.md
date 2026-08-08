# IL-3.2 Test Evidence

**Story:** `IL-3.2` - Evidence persistence, attribution, idempotency and timeline  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record covers attributed append-only evidence sources and mission timeline events. It adds no import/retrieval HTTP route, browser workflow, claim normalization, supersession, Twin projection, reconciliation, readiness behavior or external provider call.

## Implemented boundary

The persistence service accepts only an `IL-3.1` prepared value and revalidates its normalization, redaction summary shape, byte count and digest. It combines that redacted representation with exact Project/Mission scope, origin, logical locator, optional revision/effective time, recorded time, direct-import method and source-level epistemic label.

Migration `005` stores immutable `evidence_sources` and `timeline_events`. One immediate transaction checks active/current scope, returns the exact prior pair for `evidence-import-key.v1`, or appends one source plus one mission-sequenced `EVIDENCE_IMPORTED` event. Raw input and raw-input hashes are absent.

## Acceptance evidence

| Requirement | Executable proof |
|---|---|
| Same-import idempotency | Sequential retry and two-connection concurrency return one exact source/event pair with one row in each table |
| Project/Mission isolation | Cross-scope import rejects and scoped retrieval cannot return another Mission's source |
| Restart | Source identity, attribution, redacted prepared representation, import key and timeline event round-trip exactly |
| Immutable attribution | Deep-frozen domain values plus update/delete rejection triggers protect sources and events |
| Pagination | Source UUID cursor and Mission timeline-sequence cursor are bounded, ordered and stable |
| Atomic lineage | Source/event append together; unique keys prevent duplicate imports, duplicate event subjects and duplicate Mission sequences |
| Privacy | Secret sentinel is absent from the prepared result and closed SQLite file; unsafe locators reject without echo |
| Lifecycle | Only a current Mission accepts imports; archived history remains retrievable |
| Migration | Empty and retained version 1-4 databases reach version 5; failed version 6 rolls back; concurrent startup converges |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| Domain and contracts focused typecheck/build | 0 | Unified metadata authority and evidence entities compile under strict TypeScript |
| Focused domain/contract Vitest | 0 | 3 files and 54 tests passed, including 11 EvidenceSource tests |
| API typecheck | 0 | Migration and evidence repository compile under strict TypeScript |
| Focused migration/evidence Vitest | 0 | 2 files and 19 tests passed, including 8 evidence repository and 11 lifecycle tests |
| `npm.cmd run check` | 0 | Five workspaces typechecked; 127 unit/component and 70 API tests passed; all builds, repository-safety generation and documentation links passed |
| `npm.cmd run build` (inside aggregate) | 0 | All workspaces built; Vite transformed 54 modules |
| `npm.cmd run check:docs` (inside aggregate) | 0 | 41 Markdown files checked with zero broken local targets |
| `npm.cmd run test:e2e` | 0 | 3 Chromium workflows passed at 1366 x 768, including persisted path-safe Project flow |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across 104 reported production dependencies |

## Trust and integrity interpretation

- Import-key equality means equality under the exact redacted representation and immutable attribution contract; it is not truth, approval or provenance proof.
- The source-level `FACT` label records direct artifact intake and does not make statements inside the source factual.
- Redaction can deliberately collapse different matched secret values; no raw-input hash is retained to distinguish or dictionary-test them.
- Timeline sequence is append-oriented local ordering, not a cryptographic event chain.
- Claims, correction/supersession and source applicability remain unimplemented until their owning stories.
- External AI remains off and no evidence leaves the process.
- Official Avishkar requirements remain unverified; this is bounded implementation evidence, not a compliance certification.

## Environmental cleanup note

The final successful aggregate and browser runs left no development-port listener or current-run evidence/E2E fixture. An earlier pre-final migration expectation failure left one schema-only `intelliloop-bootstrap-*` directory in the operating-system temporary area; automated deletion was denied by the execution policy. It contains only an empty synthetic 159,744-byte SQLite schema database and no source, imported evidence, credential or private product data. Remove it through an authorized local cleanup before a release-candidate cleanliness proof.

## Next boundary

`IL-3.3` is next and owns claim normalization and explicit supersession intake. It has not started.
