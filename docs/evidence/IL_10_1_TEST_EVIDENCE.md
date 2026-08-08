# IL-10.1 Evidence Replay Lab

**Audience:** Product owner, reviewer, developer and demo operator  
**Status:** `PASS_OPTIONAL_FEATURE_FLAGGED`  
**Evidence date:** 2026-08-07

## Result

The optional Evidence Replay Lab compares two immutable Twin revisions without creating a server write route or changing canonical state. It is absent by default and requires the strict `experiments.evidenceReplay` opt-in through `npm.cmd run dev:replay`. The UI retrieves complete bounded node and relationship pages through existing local GET APIs, compares canonical member digests and displays baseline/candidate path citations for every difference.

The direct controlled-browser observation compared LoopMart Twin revision 1 (27 nodes, 53 relationships) with revision 2 (40 nodes, 85 relationships). The result contained 58 added, 13 removed, 30 changed and 37 unchanged members. The demo/readiness response and complete Twin revision-list response were byte-equal before and after comparison. The four comparison requests were GET-only, local loopback calls.

The complete workspace verification passed 383 unit/component tests across 44 files, 165 API/integration tests across 32 files and the default-off 82-module production build. Default competition golden-flow, accessibility, fast demo-gate and regenerated seven-asset demo-support checks also pass.

## Acceptance

| Acceptance | Evidence | Result |
|---|---|---|
| Flag-off isolation | API/web defaults are false; malformed values reject; Twin workspace renders no lab without explicit opt-in | `PASS` |
| Canonical state unchanged | Before/after demo and Twin-history JSON were byte-equal; comparison uses four existing GET requests | `PASS` |
| Diff citations resolve | Every added/removed/changed member carries its persisted node or relationship path citation | `PASS` |
| Feature omits cleanly | Default `npm.cmd run dev`/`dev:demo` behavior is unchanged; optional launcher aligns both flags | `PASS` |
| No authority widening | UI labels the result advisory; no readiness, Passport, provider, repository-execution or mutation API exists | `PASS` |
| Existing product regression | 383 unit/component, 165 API/integration, production build and default-off demo/accessibility/support gates | `PASS` |

## Reproduction

```powershell
npm.cmd run evidence:evidence-replay
npm.cmd run check:evidence-replay
npm.cmd run dev:replay
```

Open `/demo`, create the initial and corrected revisions, then open **Active Software Twin → Evidence Replay Lab**. A partial history/member page withholds comparison instead of presenting an incomplete diff.

Machine-readable proof: [EV-EVIDENCE-REPLAY](EV_EVIDENCE_REPLAY.json).

`INTELLILOOP_IL_10_1_EVIDENCE_REPLAY_PASS_OPTIONAL_FLAGGED`
