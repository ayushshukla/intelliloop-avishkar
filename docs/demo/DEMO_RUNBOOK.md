# IntelliLoop Competition Demo Runbook

**Implemented through:** `IL-8.6`  
**Target duration:** 5–7 minutes  
**Scenario:** LoopMart expanded cancellation, an IntelliLoop-authored synthetic fixture

## Before the demonstration

1. From the repository root, run `npm.cmd ci` if dependencies are not installed.
2. Run `npm.cmd run dev`.
3. Open `http://127.0.0.1:4173/demo`.
4. Confirm the top bar says `Local only` and `AI off`.
5. If an earlier run exists, select **Reset controlled demo** and confirm the checkpoint is `EMPTY`.

Do not configure an AI credential, use a private repository, or replace the fixed fixture. The golden workflow needs none of them.

## 5–7 minute reviewer path

### 1. Establish the trust boundary — 30 seconds

Point out `SYNTHETIC / AI OFF`. Explain that IntelliLoop owns the fictional fixture, never executes its repository code, and cannot approve, sign or deploy a release.

### 2. Materialize real state — 45 seconds

Select **Use Demo Project**. The checkpoint must become `BLOCKED`. Explain that this action created real Git history and persisted the Project, Mission, evidence, claims, code map, Twin, reconciliation and readiness assessment through normal services.

### 3. Show conflict and impact — 60 seconds

Select **Inspect findings and impact**. Show at least one `CONFLICT` card and one cited impact path. Emphasize that no winning claim is silently chosen and every path is bound to exact nodes and revisions.

### 4. Show the AI-off answer — 45 seconds

Return to **Competition demo**, select **Ask “What conflicts are open?” offline**, then **Generate cited answer**. Show `DETERMINISTIC EXPLANATION / AI OFF`, `Outbound disclosure / NOT SENT`, `External call: NO`, and the numbered citations.

### 5. Apply the controlled correction — 75 seconds

Return to **Competition demo** and select **Apply controlled correction**. The checkpoint must become `READY`. Explain that the action commits corrected code, imports the superseding ADR and four snapshot-bound controlled validation results, refreshes the Twin and reconciliation, records the explicitly synthetic review fixture, evaluates readiness and projects a Passport.

### 6. Inspect the Passport — 45 seconds

Select **Inspect unsigned Passport**. Show `READY`, the exact assessment binding and `UNSIGNED / NOT APPROVAL`. State clearly that the Passport is an immutable projection, not release approval.

### 7. Prove staleness — 60 seconds

Return to **Competition demo** and select **Demonstrate dependency staleness**. The checkpoint must become `STALE`. Reopen the Passport and show that its projection status remains `READY` while its current association is `STALE`; historical bytes were not rewritten.

### 8. Close — 20 seconds

Summarize: IntelliLoop reconciles fragmented change evidence, shows exact impact, explains with citations, fails closed on unresolved truth, and invalidates stale readiness automatically. It does not replace accountable human release authority.

## Expected checkpoints

| Demo action | Persisted workflow stage | Current readiness |
|---|---|---|
| Start | `INITIAL_BLOCKED` | `BLOCKED` |
| Correct | `CORRECTED_READY` | `READY` |
| Change dependency | `READY_STALE` | `STALE` |

## After the demonstration

Use **Reset controlled demo**. It removes only the fixture-owned generated workspace and cannot target another Project or caller-selected path. See [troubleshooting](DEMO_TROUBLESHOOTING.md) before any manual filesystem action.

## Rehearsal and recovery gate

Before the judged demonstration, run `npm.cmd run evidence:demo-gate`. The paced gate executes this story at 1366×768, deliberately restarts the API at `READY`, confirms the explicit unavailable state, recovers through **Retry demo workspace**, continues to `STALE`, resets, restarts again and confirms `EMPTY`. It must finish between five and seven minutes with zero non-loopback browser requests, zero authorization headers and no secret sentinel in logs, responses, rendered text or the isolated database.

## Tested fallback branch

Before presentation day, also run `npm.cmd run evidence:demo-support`. It captures the current production build, records hashes and metadata, stops the API, verifies explicit `UNAVAILABLE`, recovers the persisted READY workspace, and finally proves the script-free [recorded fallback](fallback/index.html) loads all seven images from local files while the API is stopped.

If live recovery would require editing SQLite, deleting data or changing the expected truth, stop. Say: “I’m switching to recorded synthetic evidence. This is not a live execution or approval.” Then present the fallback slides in order and use the [synchronized narration](../submission/PITCH_AND_DEMO_SCRIPT.md). The [asset manifest](DEMO_ASSET_MANIFEST.json) identifies the exact fixture, source-file-set revision, route, workflow state, viewport, size and SHA-256 of every frame.

## Presenter preparation

- Read the [judge Q&A](JUDGE_QA.md) and keep its one-sentence answers available.
- Keep the live `/demo` tab and local fallback viewer open before screen sharing.
- Do not enter a credential, customer name, private repository or caller-selected path.
- Describe `READY` as exact-input candidate readiness and the Passport as unsigned/non-approving.
- Describe the screenshots as recorded synthetic evidence, never as a hidden live run.
