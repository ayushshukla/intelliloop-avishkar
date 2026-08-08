# IntelliLoop Pitch and Demo Script

**Document ID:** `DOC-28`  
**Story baseline:** `IL-8.6` / `G5_CORE_DEMONSTRABLE`  
**Scenario:** LoopMart expanded cancellation, IntelliLoop-authored synthetic fixture  
**Live-demo target:** 5–7 minutes

## 60-second pitch

Software teams do not lack information; they lack one trustworthy view of whether requirements, implementation, tests, operational evidence and review still agree. IntelliLoop is an AI-powered Active Software Twin for change impact and release assurance. It builds an attributed, revisioned model of a change, detects conflicting or missing evidence, traces affected software paths, explains the result with citations and evaluates nine fail-closed readiness obligations. The key innovation is separation of authority: deterministic persisted evidence decides `BLOCKED`, candidate `READY` or `STALE`; AI can assist explanation but cannot change findings, approve a release or deploy. In this local synthetic demonstration, external AI is deliberately off. You will see a conflicting cancellation change become BLOCKED, receive cited corrective evidence, become READY with an unsigned Release Passport, and then automatically become STALE when a dependency changes. IntelliLoop turns scattered release knowledge into an inspectable decision trail while preserving accountable human authority.

## Synchronized live narration

| Time | Screen/action | Narration and proof point |
|---|---|---|
| 0:00–0:25 | `/demo`, `EMPTY` | “This is the IntelliLoop-owned synthetic LoopMart fixture. The app is local, AI is off, repository code is never executed, and no screen can approve or deploy a release.” |
| 0:25–0:55 | **Use Demo Project** | “Normal product services create persisted Git, evidence, Twin, reconciliation and readiness history. The candidate is BLOCKED because exact evidence conflicts.” |
| 0:55–1:40 | **Inspect findings and impact** | “IntelliLoop does not choose a convenient winner. It shows open conflict counts, missing support and exact cited paths into affected software and validation.” |
| 1:40–2:15 | Fixed question, **Generate cited answer** | “The answer is deterministic and cited. The provider is disabled, the exact redacted pack is NOT SENT, and canonical state remains unchanged.” |
| 2:15–3:05 | **Apply controlled correction** | “This controlled action commits corrected synthetic code, imports a superseding decision and four snapshot-bound validation results, refreshes the Twin/reconciliation and records an explicitly synthetic review. The nine obligations now pass for these exact inputs.” |
| 3:05–3:40 | **Inspect unsigned Passport** | “The Passport reproduces the immutable READY assessment. It is unsigned and not approval; its digest is integrity evidence, not a release signature.” |
| 3:40–4:15 | Optional judged recovery drill | “If the API stops, the UI says UNAVAILABLE and preserves no inferred green state. After restart, Retry restores the same persisted READY workspace.” |
| 4:15–5:00 | **Demonstrate dependency staleness**, inspect Passport | “A dependency changes. The historical projection still says READY, but its current association is STALE. IntelliLoop invalidates confidence without rewriting history.” |
| 5:00–5:20 | Return to `/demo` | “The result is an inspectable change-to-release trail: reconcile truth, trace impact, explain with citations, fail closed, and preserve human authority.” |
| 5:20–5:45 | Optional questions or reset | “This is verified prototype behavior, not a production deployment or measured ROI. Reset removes only the fixture-owned workspace.” |

The paced executable rehearsal reserves 320 seconds for narration and completes in 5.8 minutes. Do not add unverified product, customer, production-scale or benefit claims to fill time.

## Fallback branch

1. Attempt the bounded recovery in [demo troubleshooting](../demo/DEMO_TROUBLESHOOTING.md).
2. If recovery would require editing persisted truth or deleting data, stop.
3. Say: “I’m switching to recorded synthetic evidence. This is not a live execution or approval.”
4. Open [the standalone recorded sequence](../demo/fallback/index.html) locally and narrate slides 1–7 in order.
5. Use [EV-DEMO-SUPPORT](../evidence/EV_DEMO_SUPPORT.json) and the [asset manifest](../demo/DEMO_ASSET_MANIFEST.json) if a judge asks how freshness or integrity was established.

The fallback viewer contains no external dependency or script. Its generation gate stops the API, loads all seven 1366×768 images from local files, rejects missing images and records hashes, fixture identity, app-source digest and test state.

## Presenter guardrails

- Say “candidate READY,” never “approved,” “safe to deploy” or “certified.”
- Say “synthetic validation result,” not “tests executed,” for fixture-authored validation evidence.
- Say “static inference,” not runtime behavior, for the code map.
- Say “AI-ready and AI-off in this demo,” not “live GPT” or measured model quality.
- Say “projected benefit,” not measured savings, until the controlled metrics story completes.
- Do not enter a credential, private path, customer name or personal repository during the demo.
