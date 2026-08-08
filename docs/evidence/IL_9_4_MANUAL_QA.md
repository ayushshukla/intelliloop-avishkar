# IL-9.4 Interactive Manual QA Observation

**Audience:** Product owner, demo operator and Avishkar reviewer  
**Status:** `PASS_CONTROLLED_PRODUCT_QA / NOT_A_BENEFIT_PILOT`  
**Evidence date:** 2026-08-07  
**Environment:** Windows 11, local loopback, in-app Chromium, isolated schema-14 data directory

## Result

The complete leadership workflow passed through direct browser interaction against fresh local state. This observation validates product behavior and presentation only. It is not a developer, technical-lead or manager timing/feedback sample and does not validate the submitted time-saving hypothesis.

| Case | Direct observation | Result |
|---|---|---|
| Trust boundary | Header displayed `Local only` and `AI off`; fixture displayed `SYNTHETIC / AI OFF` | `PASS` |
| Empty start | Fresh/restarted workspace displayed `EMPTY / Awaiting the controlled fixture` | `PASS` |
| Initial assessment | Start action produced `BLOCKED / Conflict requires correction` | `PASS` |
| Findings and impact | Revision 1 displayed 2 conflicts, 5 missing-support findings, 3 impact gaps and 5 cited impact paths | `PASS` |
| AI-off explanation | Fixed conflict question displayed provider `DISABLED`, external call `NO`, canonical change `NO`, disclosure `NOT SENT` and resolved numbered citations | `PASS` |
| Correction | Controlled correction produced candidate `READY`, Twin/reconciliation revision 2 and nine satisfied obligations | `PASS` |
| Passport | Projection/current association were `READY`; `UNSIGNED / NOT APPROVAL` and exact digest/citations were visible | `PASS` |
| Staleness | Dependency change produced current `STALE`; historical Passport remained projection `READY` with association `STALE` | `PASS` |
| Failure/recovery | With the API stopped, the web UI displayed `UNAVAILABLE` and stated no readiness was inferred/preserved; retry after restart recovered persisted `STALE` | `PASS` |
| Scoped reset/restart | Reset reported other Projects unchanged; API restart returned the controlled workspace to `EMPTY` | `PASS` |

## Startup finding and resolution

The machine's existing default development database correctly failed closed. A read-only diagnostic found schema version 10 with a migration-10 checksum mismatch against the current source, consistent with stale pre-release development state. No file was deleted, downgraded or edited. A fresh isolated data directory migrated to schema 14 and passed the complete workflow.

To make the safe judged path one command, `npm.cmd run dev:demo` now launches the normal application with a schema-14-specific operating-system temporary-data directory. Normal `npm.cmd run dev` behavior and migration integrity checks remain unchanged.

## Boundary

- No credential, private repository, participant identity or external provider was used.
- No screenshot or DOM observation is treated as production certification.
- The default development database was inspected read-only and preserved.
- Manual product QA cannot substitute for the six paired human benefit-pilot runs required to close `IL-9.4`.

