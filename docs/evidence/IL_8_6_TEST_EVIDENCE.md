# IL-8.6 Demo Support Package Evidence

**Story:** `IL-8.6`  
**Status:** `PASS`  
**Checkpoint:** `G5_CORE_DEMONSTRABLE` / Phase 8 complete  
**Evidence date:** 2026-08-06

## Acceptance result

| Acceptance criterion | Reproducible evidence | Result |
|---|---|---|
| Runbook rehearsal passes | `EV-DEMO-GATE` records a paced 5.8-minute production-build path; the synchronized script preserves its nine phases and truth labels | `PASS` |
| Fallback path is tested | `EV-DEMO-SUPPORT` stops the live API, verifies explicit `UNAVAILABLE`, restarts/reuses persisted READY, then stops the API and loads the standalone local viewer with all seven images | `PASS` |
| Asset metadata is recorded | `DEMO_ASSET_MANIFEST.json` records capture date, fixture ID/version/ownership, source-file-set revision, browser/viewport, route, workflow state, dimensions, byte count and SHA-256 for every asset | `PASS` |
| AI-off path and limitations are explicit | Runbook, fallback viewer, judge Q&A and pitch script disclose synthetic data, `NOT SENT`, no external call, candidate-only READY, unsigned Passport and unmeasured production/benefit limits | `PASS` |

## Generated proof

[EV-DEMO-SUPPORT](EV_DEMO_SUPPORT.json) was produced by:

```powershell
npm.cmd run evidence:demo-support
```

The production-build browser sequence captured:

1. persisted `BLOCKED` control room;
2. attributed Active Software Twin;
3. conflict/impact reconciliation;
4. deterministic AI-off cited answer;
5. unsigned READY Passport;
6. the same historical Passport with a `STALE` association;
7. explicit live-service `UNAVAILABLE` state.

The live sequence recovered `READY` after an API restart against the same isolated database before proceeding to `STALE`. Browser interception observed zero non-loopback requests and zero authorization headers. After the API was stopped again, Chromium loaded the script-free [fallback viewer](../demo/fallback/index.html) from local files and verified seven complete 1366×768 images with zero broken images.

The checked-in [asset manifest](../demo/DEMO_ASSET_MANIFEST.json) binds the screenshot bytes to the exact fixture and application source-file set. `npm.cmd run check:demo-support` rehashes every asset, revalidates PNG dimensions and viewer references, and rejects manifest/evidence drift without recapturing the workflow.

## Visual review

All seven captured frames were inspected at original resolution. Text is legible at the judging viewport, state depends on words and symbols rather than color, the AI-off panel remains visible where applicable, READY and STALE show distinct current associations, and the unavailable frame clearly states that no readiness was inferred or preserved.

## Documentation completion

- `DOC-18`: exact live and fallback branches in the demo runbook.
- `DOC-19`: evidence-preserving recovery and tested fallback instructions.
- `DOC-20`: concise judge answers covering innovation, AI, evidence, value, scale and limits.
- `DOC-24`: durable fallback semantic/visual review added to the accessibility record.
- `DOC-25`: support-package release item passed while Phase-9 items remain pending.
- `DOC-28`: 60-second pitch plus synchronized 5–7 minute narration and presenter guardrails.

## Limits

The screenshots and viewer are recorded synthetic evidence, not a live execution, customer result, production pilot, approval or deployment authorization. Screenshot hashes establish byte identity, not semantic truth or authenticity. The fallback was validated with bundled Chromium on this Windows environment; it is not exhaustive assistive-technology or cross-platform certification. Official Avishkar rules remain unverified and are still owned by `IL-9.5`.

`IL-8.6_COMPLETE_PHASE_8_SUPPORT_PACKAGE_VERIFIED`
