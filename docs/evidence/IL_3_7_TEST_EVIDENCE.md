# IL-3.7 Imported Runtime-Observation Summary Evidence

**Evidence ID:** `EV-IL-3.7`  
**Story:** `IL-3.7` - Imported runtime-observation summaries  
**Capability:** `SUP-02`  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Execution boundary:** Offline domain, SQLite and Fastify proof over IntelliLoop-authored synthetic summaries

## Scope and authority

The frozen R3 outcome permits bounded attributed JSON summaries to enter through evidence paths and remain historical observations, never a live production feed. Acceptance requires schema, size and source tests; duplicate and stale behavior; offline-only proof; and no direct readiness authority. Dependencies `IL-3.4` and `IL-3.6` are complete.

This story adds no browser feature, live connector, polling, streaming, background worker, learning/retraining loop, automated invalidation, Twin projection, reconciliation rule, validation result, readiness decision, provider call or credential path. It stops before `IL-4.1`.

## Implemented boundary

| Surface | Implemented proof boundary |
|---|---|
| Domain schema | Exact `runtime-observation-summary.v1`; bounded stable tokens, source origins, environment, UTC window, sample count and ordered numeric measurements |
| Resource ceilings | 32,768 UTF-8 bytes, 32 measurements, 31-day window and 1,000,000,000 samples |
| Evidence path | JSON is prepared/redacted through the existing pipeline before any source or observation persistence |
| Attribution | Exact Project/Mission, logical locator, optional revision, allowed origin, epistemic label, effective/recorded times and evidence-source identity |
| Persistence | Migration `007`; immutable one-to-one observation projection linked to an immutable source and import event |
| Idempotency | Exact content and attribution replay returns the original source, event and observation without a new row |
| Freshness | Strictly later window in one subject/environment/kind series makes older rows `STALE_BY_NEWER_WINDOW`; history is retained |
| Authority | Every resource returns `HISTORICAL_EVIDENCE_ONLY` and `liveFeed: false`; readiness-shaped input rejects |
| Network | Focused API proof traps `fetch` and observes zero calls |

## Acceptance evidence

| R3 acceptance | Executable proof | Result |
|---|---|---|
| Schema/size/source tests | Domain negative corpus plus strict Fastify source/schema requests | `PASS` |
| Duplicate behavior | Two exact POSTs return one source/event/observation; second response is byte-equivalent except `created: false` | `PASS` |
| Stale behavior | Later same-series window leaves the first row readable and derives its explicit newer-observation reference | `PASS` |
| Offline-only proof | Fetch trap receives zero calls; implementation contains no connector, polling or background path | `PASS` |
| No readiness authority | Extra readiness field rejects; accepted resources fix evidence-only authority and contain no readiness state | `PASS` |

## Focused verification record

| Gate | Observed result | Result |
|---|---|---|
| Domain runtime-observation suite | 5 schema, size, window, source, privacy-safe-error and invariant tests | `PASS` |
| API/runtime repository focused suites | 17 tests across migration, JSON API, offline/idempotency/staleness and restart/immutability | `PASS` |
| Complete non-browser suites | 154 unit/component tests in 21 files and 91 API tests in 16 files | `PASS` |
| Aggregate `npm.cmd run check` | Five workspaces typechecked; 154 unit/component tests in 21 files and 91 API tests in 16 files passed; production builds completed with 59 Vite modules; repository-safety/privacy evidence regenerated; 47 Markdown files had zero broken local targets | `PASS` |
| Browser `npm.cmd run test:e2e` | Five Chromium workflows passed at 1366 x 768 | `PASS` |
| Production audit | Zero vulnerabilities across all severities and 104 production dependencies | `PASS` |
| Runtime cleanup | Ports 3100/4173 are clear; no runtime/evidence/privacy/E2E temporary directory or repository database, sidecar or log artifact remains | `PASS` |

The previously disclosed schema-only `IL-3.2` and synthetic visual-QA `IL-3.5` operating-system temporary directories remain under their recorded execution-policy deletion exceptions. This story neither created nor modified them.

## Trust interpretation and limitations

An imported observation proves only that IntelliLoop accepted the attributed summary under this schema. It does not prove that instrumentation was correct, the source system is authentic, the samples are representative, the newest window is best, or release is safe. `LATEST_OBSERVED_WINDOW` is recency within one exact series key, not truth or readiness. Equal-window disagreement remains co-latest for later reconciliation rather than being silently resolved.

The next authorized story is `IL-4.1`, Twin node/relationship domain vocabulary. Official Avishkar rules remain unverified; this record is not a compliance or production-observability certification.
