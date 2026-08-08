# IntelliLoop Management Proof and Manual Pilot Guide

**Audience:** Demo operator, developer, technical lead, manager and Avishkar reviewer  
**Status:** `MANUAL_QA_READY / BENEFIT_PILOT_NOT_RUN`  
**Evidence date:** 2026-08-07

## What this review proves

Use this guide to demonstrate that IntelliLoop performs the promised controlled workflow, produces inspectable evidence and fails honestly. Product verification and benefit validation are separate:

- the product proof checks observable states, citations, integrity, safety and recovery;
- the benefit pilot compares the same bounded task with and without IntelliLoop; and
- neither activity proves production readiness, release approval or Nisum-wide savings.

## Start the application

From the repository root, with Node.js 22.22.0, npm 10.9.4 and Git available:

```powershell
npm.cmd ci
npm.cmd run dev:demo
```

Open `http://127.0.0.1:4173/demo`. Keep the terminal visible. Stop both local processes with `Ctrl+C` after the review. Do not enter a credential or private repository.

`dev:demo` uses a schema-14-specific directory below the operating system's temporary-data location. This prevents an older development database from blocking a judged run while preserving the normal fail-closed schema-integrity rule. Use `npm.cmd run dev` for ordinary development against the configured/default database.

Before involving reviewers, run the short evidence gates:

```powershell
npm.cmd run check:metrics
npm.cmd run check:demo-support
npm.cmd run check:release-security
npm.cmd run check:release-platform
```

## Manual QA scorecard

Record pass/fail and a screenshot or short note for each case. Start from **Reset controlled demo** and confirm `EMPTY`.

| ID | Operator action | Required observable result | Management meaning |
|---|---|---|---|
| QA-01 | Inspect the `/demo` header | `SYNTHETIC`, `LOCAL ONLY`, `AI OFF`; no key requested | Safe bounded demonstration |
| QA-02 | Select **Use Demo Project** | Stage `INITIAL_BLOCKED`; readiness `BLOCKED` | Contradictory evidence cannot become green |
| QA-03 | Select **Inspect findings and impact** | At least one conflict and a cited impact path | Change impact is inspectable, not a black-box score |
| QA-04 | Ask **What conflicts are open?** and generate the answer | `AI OFF`, `NOT SENT`, external call `NO`, numbered citations | Useful explanation does not own truth or require GPT |
| QA-05 | Select **Apply controlled correction** | Stage `CORRECTED_READY`; all nine obligations pass | Exact corrective evidence can satisfy candidate readiness |
| QA-06 | Select **Inspect unsigned Passport** | Assessment binding matches; `UNSIGNED / NOT APPROVAL` visible | Immutable handoff record without fake authority |
| QA-07 | Select **Demonstrate dependency staleness** | Current association becomes `STALE`; historical Passport projection stays `READY` | A later dependency change invalidates current confidence without rewriting history |
| QA-08 | Stop the API during `READY`, then restart and retry | UI shows `UNAVAILABLE`, then recovers the persisted workspace | Failure is explicit; no invented green state |
| QA-09 | Reset, restart and reopen `/demo` | Stage returns to `EMPTY` | Repeatable judge/demo environment |
| QA-10 | Review the browser/network and data boundaries via evidence gate | Zero non-loopback browser requests, zero registered-repository writes and no sentinel leakage | Controlled safety evidence |

Any unexpected `READY`, unknown citation, missing non-approval warning, private-path exposure or silent recovery is a stop condition. Do not explain it away during a demonstration.

## Manager-ready proof pack

Present these five artifacts in order:

1. Live `/demo` workflow using [the competition runbook](../demo/DEMO_RUNBOOK.md).
2. [EV-METRICS](../evidence/EV_METRICS.json) for machine-verifiable counts and boundaries.
3. [Controlled metrics report](../evidence/METRICS_REPORT.md) for the concise scorecard and claim limits.
4. [Claim-evidence matrix](../submission/CLAIM_EVIDENCE_MATRIX.md) to answer “what can you honestly claim?”
5. [Pilot template](../evidence/PILOT_MEASUREMENT_TEMPLATE.json) to show how the benefit hypothesis will be tested.

The strongest current statement is: “IntelliLoop reproducibly completes a local synthetic change-to-release assurance workflow with cited evidence, zero controlled false-ready outcomes and an exact unsigned Passport projection.” Do not convert that into a production accuracy, savings or ROI claim.

## Paired benefit pilot

Use the same one-change/one-candidate-release LoopMart scenario in both modes. Randomize which mode each role performs first to reduce learning bias. Give the developer, technical lead and manager the same task brief and stop conditions. Use one visible timer; measure only the four fixed phases.

### Manual mode

Provide the synthetic requirements, decision records, repository structure, validation records and review note as separate artifacts. The participant must locate relevant context, identify impacted paths and gaps, check evidence support and prepare a candidate-release summary without IntelliLoop.

### IntelliLoop-assisted mode

Start from `EMPTY`, run the golden workflow and let the participant use findings/impact, cited explanation, readiness obligations and the unsigned Passport. Do not coach toward a result unavailable in manual mode.

### Record

For each paired run, enter phase minutes plus:

- non-negative integer counts for valid impact paths, invalid citations, false `READY` outcomes and Passport mismatches (enter `0` when none occur);
- assisted usefulness and trust-clarity ratings on a fixed 1–5 scale;
- whether the role would use the product in a controlled pilot; and
- one required sanitized note of at most 500 characters without names, customer data or performance evaluation.

Enter the team’s documented representative change cadence, cite its source, mark the template `COMPLETE`, then run:

```powershell
npm.cmd run evidence:metrics
npm.cmd run check:metrics
```

Report role-level medians and aggregated feedback. Do not rank participants or use the pilot for employee monitoring. If the observed result is below zero, inconclusive or below the submitted threshold, report that result unchanged.

The evidence generator rejects negative time, fractional observation counts, out-of-range ratings, duplicate or mislabeled role-mode runs, incomplete assisted feedback and cadence values without a source. A partially populated template must remain `NOT_RUN`; changing it to `COMPLETE` cannot bypass these checks.

## Go/no-go criteria

The product is ready for a leadership demo when QA-01 through QA-10 pass. The benefit claim is ready only when six comparable runs, three role feedback responses and a sourced cadence produce a reproducible calculation. Production rollout remains a separate future decision requiring authentication, enterprise data/connectors, authorization, security review, scale testing and accountable release governance.

The 2026-08-07 local QA executed QA-01 through QA-10 against a fresh isolated schema-14 directory and passed. Its browser observations are recorded in [the manual QA record](../evidence/IL_9_4_MANUAL_QA.md). This operator verification is not a developer/lead/manager benefit-pilot response.
