# IntelliLoop controlled metrics report

**Evidence date:** 2026-08-06  
**Story:** `IL-5.7`  
**Scenario:** IntelliLoop-authored controlled synthetic reconciliation fixture  
**Reproduce:** `npm.cmd run evidence:reconcile`

## Result

The deterministic truth table passed **6/6 authored cases (100%)**. This is exact agreement against the declared fixture expectations; it is not a claim about prediction quality, unseen data, employee performance or production accuracy.

| Controlled operation | Samples | Minimum (ms) | Median (ms) | p95 (ms) | Maximum (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial conflict/ambiguity/missing/impact assessment | 1 | 108.8 | 108.8 | 108.8 | 108.8 |
| Correction and stale-successor assessment | 1 | 129.789 | 129.789 | 129.789 | 129.789 |
| Exact persisted replay | 25 | 84.984 | 97.552 | 115.28 | 122.561 |

## Method

The generator creates an offline temporary SQLite database and an IntelliLoop-authored Git fixture, runs the production domain/API/persistence path, compares exact expected finding counts and reasons, applies an explicit claim supersession, and proves byte-equal replay summaries for canonical and reordered inputs. Timings use `performance.now()` in one local Node.js process after the correction revision exists. No absolute latency threshold is used as a pass condition.

## Accuracy boundary

- The denominator is six authored truth-table assertions: conflict, ambiguity, missing support, impact gaps, explicit supersession and stale successor.
- A case passes only when the exact expected count or relationship is observed. The script fails closed on mismatch.
- This is deterministic rule conformance on one bounded fixture, not statistical model accuracy, recall, precision or real-world validation.

## No production extrapolation

These observations are a development baseline only. They do not estimate concurrent load, production latency, monthly time saved, cost reduction, revenue, ROI or organizational outcomes. Hardware, operating-system scheduling, filesystem cache and process state can change wall-clock timings. Production and pilot measurements remain later work.

## Known limitations

- One local single-process scenario; no concurrency, soak, scale or distributed-system test.
- No persisted validation-result intake, so the validation truth case intentionally proves an explicit missing-result gap.
- No provider or AI call, no external data transfer and no live telemetry.
- `G3_DETERMINISTIC_CORE_PROVEN` is closed jointly by generated `EV-RECONCILE` and `EV-CITATIONS`; neither report proves readiness or authorizes a live provider call.
