# IL-9.4 Controlled Metrics and Claim-Evidence Dossier

**Audience:** Product owner, Avishkar reviewer, pilot operator and submission maintainer  
**Status:** `IMPLEMENTATION_COMPLETE / EXTERNAL_HUMAN_PILOT_INPUT_REQUIRED`  
**Evidence date:** 2026-08-07

## Result

The reproducible product-measurement and claim-control portion of `IL-9.4` is complete. [EV-METRICS](EV_METRICS.json) binds the representative scenario, reconciliation/path/citation/readiness/Passport results, release counts, local action timing, safety boundaries and benefit formula to hashed source evidence. The [interactive manual QA record](IL_9_4_MANUAL_QA.md) passes the ten leadership-demo cases, including API-off recovery and reset/restart. The [management proof guide](../product/MANAGEMENT_PROOF_AND_PILOT_GUIDE.md), [claim matrix](../submission/CLAIM_EVIDENCE_MATRIX.md) and [submission copy](../submission/SUBMISSION_COPY.md) are ready.

The story cannot truthfully receive a final `PASS` yet because no real developer, technical-lead or manager paired timing/feedback sample or sourced monthly cadence has been supplied. The submitted time-saving hypothesis remains `NOT_VALIDATED`; this is an evidence gap, not a software failure.

## Acceptance status

| Acceptance | Evidence | Result |
|---|---|---|
| Representative change/release count | Fixed one-change/one-candidate-release LoopMart scenario | `PASS` |
| Interactive leadership-demo QA | Ten direct browser cases from empty through failure/recovery and reset/restart | `PASS` |
| Assisted phase timing | Four system actions measured in the paced rehearsal; 8.730 s total | `PASS_WITH_HUMAN_TIME_LIMIT` |
| Manual and comparable assisted human timing | Six-run paired template exists; no human observations supplied | `INPUT_REQUIRED` |
| Path and citation validity | 2 cited impact paths; 56 cited statements and 78 resolved citation references | `PASS_CONTROLLED` |
| Readiness and Passport fidelity | 1 positive, 26 non-ready, 0 false `READY`; exact Passport projection/digest binding | `PASS_CONTROLLED` |
| Developer/lead/manager feedback | Anonymous role-level fields exist; no responses supplied | `INPUT_REQUIRED` |
| Monthly team-hour calculation | Deterministic formula and sensitivity table implemented; result withheld without inputs | `PASS_PROTOCOL / NO_RESULT` |
| Pilot-input integrity | All required timing, quality, feedback and sourced-cadence fields are enumerated; malformed or falsely complete input rejects | `PASS` |
| No surveillance or production extrapolation | No names/rankings; generator prohibits surveillance and reports no production extrapolation | `PASS` |

## Reproduction

```powershell
npm.cmd run evidence:metrics
npm.cmd run check:metrics
npm.cmd run test:pilot-measurement
npm.cmd run check:docs
```

The in-memory pilot self-test proves a complete calculation path and rejects negative timing plus an incomplete pilot mislabeled `COMPLETE`. Its values are explicitly synthetic and are never written to `PILOT_MEASUREMENT_TEMPLATE.json`, `EV-METRICS.json` or any benefit claim.

To close the two input-required rows, run the paired protocol in the [management proof guide](../product/MANAGEMENT_PROOF_AND_PILOT_GUIDE.md), populate [the template](PILOT_MEASUREMENT_TEMPLATE.json), mark it `COMPLETE`, and regenerate the evidence. Do not invent or backfill participant data.

`INTELLILOOP_IL_9_4_PRODUCT_DOSSIER_READY_HUMAN_PILOT_INPUT_REQUIRED`
