# IntelliLoop Claim-to-Evidence Matrix

**Audience:** Avishkar reviewers, submission maintainers and presenters  
**Status:** `IL-9.4_DRAFT / HUMAN_BENEFIT_PILOT_REQUIRED`  
**Evidence date:** 2026-08-07

Every external statement must use one of four dispositions: `VERIFIED_PROTOTYPE`, `BOUNDED_OBSERVATION`, `PILOT_HYPOTHESIS` or `NOT_CLAIMABLE`.

| ID | External claim | Disposition | Reproducible evidence | Required qualification |
|---|---|---|---|---|
| CE-01 | IntelliLoop runs a complete local synthetic change-to-release workflow | `VERIFIED_PROTOTYPE` | [EV-GOLDEN-FLOW](../evidence/EV_GOLDEN_FLOW.json), [EV-DEMO-GATE](../evidence/EV_DEMO_GATE.json) | Local controlled fixture; not production certification |
| CE-02 | It detects conflicts, missing support, impact gaps and staleness deterministically | `VERIFIED_PROTOTYPE` | [EV-RECONCILE](../evidence/EV_RECONCILE.json), [metrics](../evidence/EV_METRICS.json) | 6/6 authored cases; not unseen-data accuracy |
| CE-03 | It provides cited AI-off explanations | `VERIFIED_PROTOTYPE` | [EV-CITATIONS](../evidence/EV_CITATIONS.json) | Six fixed questions; provider disabled; advisory only |
| CE-04 | Readiness fails closed on controlled negative cases | `VERIFIED_PROTOTYPE` | [EV-READINESS](../evidence/EV_READINESS.json) | 0 false `READY` across 26 controlled negatives; not statistical production accuracy |
| CE-05 | The Release Passport exactly reproduces an assessment | `VERIFIED_PROTOTYPE` | [EV-PASSPORT](../evidence/EV_PASSPORT.json) | Unsigned, non-approving and no deployment authority |
| CE-06 | The judged workflow fits a 5–7 minute demo | `BOUNDED_OBSERVATION` | [EV-DEMO-GATE](../evidence/EV_DEMO_GATE.json) | One paced local rehearsal measured 5.8 minutes |
| CE-07 | Registered repositories remain read-only in the demonstrated flow | `VERIFIED_PROTOTYPE` | [EV-REPO-SAFETY](../evidence/EV_REPO_SAFETY.json), [EV-DEMO-GATE](../evidence/EV_DEMO_GATE.json) | Controlled application/tree equality; not an OS sandbox |
| CE-08 | The demo uses no external AI or browser egress | `VERIFIED_PROTOTYPE` | [EV-DEMO-GATE](../evidence/EV_DEMO_GATE.json), [EV-OPENAI-EVAL](../evidence/EV_OPENAI_EVAL.json) | Product finale is AI-off; no universal host-level network claim |
| CE-09 | The candidate installs and passes the release suite on Windows 11 | `BOUNDED_OBSERVATION` | [EV-RELEASE](../evidence/EV_RELEASE.json) | Linux is configured in CI but not locally observed |
| CE-10 | The submitted >20 hours/month saving is achieved | `PILOT_HYPOTHESIS` | [metrics report](../evidence/METRICS_REPORT.md), [pilot template](../evidence/PILOT_MEASUREMENT_TEMPLATE.json) | Not validated; never state as achieved until paired human data pass the protocol |
| CE-11 | IntelliLoop improves quality, productivity and employee/customer experience | `PILOT_HYPOTHESIS` | [submission commitments](../governance/SUBMISSION_COMMITMENTS.md) | Projected outcomes; no causal organizational measurement yet |
| CE-12 | IntelliLoop is production-ready, fully compliant or guarantees safe release | `NOT_CLAIMABLE` | None | Authentication, enterprise connectors, production scale, approval/signing and deployment authority are excluded |
| CE-13 | IntelliLoop is autonomous or self-healing | `NOT_CLAIMABLE` | None | Product is read-only decision support; no repository mutation or remediation execution |
| CE-14 | IntelliLoop can compare two immutable Twin revisions with cited member differences | `VERIFIED_PROTOTYPE` | [EV-EVIDENCE-REPLAY](../evidence/EV_EVIDENCE_REPLAY.json) | Optional/default-off controlled feature; digest differences are not correctness, readiness or approval |
| CE-15 | IntelliLoop can compare attributed imported advisory recommendations | `VERIFIED_PROTOTYPE` | [EV-ADVISORY-DISAGREEMENT](../evidence/EV_ADVISORY_DISAGREEMENT.json) | Optional/default-off browser-local feature; exact text/citation differences are not semantic contradiction, truth, provider verification or readiness |
| CE-16 | IntelliLoop can produce cited remediation test plans or change-intent previews | `VERIFIED_PROTOTYPE` | [EV-REMEDIATION-PREVIEW](../evidence/EV_REMEDIATION_PREVIEW.json) | Optional/default-off browser-local preview; not source code, execution, validation, autonomous repair, evidence, readiness or approval |

## Presenter rule

If a statement lacks a row and reproducible evidence, qualify it as a future direction or omit it. Say “candidate `READY` for exact persisted inputs,” never “approved” or “safe to deploy.” Say “pilot hypothesis,” never “measured savings,” until `EV-METRICS.humanPilot.status` is `COMPLETE` and the calculation is reviewed.
