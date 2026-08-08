# IntelliLoop Demo Troubleshooting

**Audience:** Demo operators, reviewers and local evaluators  
**Status:** `IL-9.3_DOCUMENTATION_SYNCHRONIZED`  
**Evidence date:** 2026-08-06

Use these recovery steps in order. Preserve failure traces and do not manually edit SQLite or delete registered repositories.

## Application does not open

- Confirm Node.js `22.22.0` and npm `10.9.4` with `node --version` and `npm.cmd --version`.
- From the repository root, run `npm.cmd ci`, then `npm.cmd run dev`.
- Wait for both API and web startup messages before opening `http://127.0.0.1:4173/demo`.
- If the default ports are occupied, stop the conflicting local process; do not expose the API on a non-loopback host.

## Demo workspace says unavailable

- Confirm `http://127.0.0.1:4173/api/v1/health` returns a healthy response.
- Use the page’s **Retry demo workspace** action after the API is ready.
- Do not add a request body, Project ID or path to demo reset/setup endpoints; their scope is server-owned.

## A checkpoint is not the expected state

- Read the visible action error; IntelliLoop fails closed instead of forcing the expected demo state.
- Use **Reset controlled demo**, confirm `EMPTY`, then restart the run.
- If reset cannot validate ownership, stop. Do not recursively delete the data directory. Preserve the database and logs for review.

## Cited answer is rejected

- Use the fixed question **What conflicts are open?** for the initial golden workflow.
- A broad question can exceed the conservative 12,000-byte evidence-pack bound; the product intentionally rejects it rather than truncating evidence or weakening the bound.
- Confirm the page remains `AI OFF`; no credential is needed and adding one is not a recovery step.

## Playwright proof fails

1. Keep the generated `test-results/<sanitized-test-id>/trace.zip` and failure screenshot.
2. Reproduce with `npm.cmd run evidence:golden-flow` or the focused command in [IL-8.3 evidence](../evidence/IL_8_3_TEST_EVIDENCE.md).
3. Inspect the trace locally with `npx.cmd playwright show-trace <trace.zip>`.
4. Share only reviewed artifacts. Traces can contain rendered synthetic fixture data and local request metadata; they must not contain credentials or private repositories.

## Safe fallback for a live review

If the local service cannot be recovered without changing persisted truth, stop the interactive path. State: “I’m switching to recorded synthetic evidence. This is not a live execution or approval.” Open `docs/demo/fallback/index.html` in a local browser and present its seven slides in order. The viewer is script-free and has no external resource.

Use [EV-DEMO-SUPPORT](../evidence/EV_DEMO_SUPPORT.json) and the [asset manifest](DEMO_ASSET_MANIFEST.json) when asked about freshness or integrity. Each image is bound to the capture date, fixture version, application source-file-set digest, exact route/state, 1366×768 viewport and SHA-256. `npm.cmd run check:demo-support` verifies the existing package without starting services; `npm.cmd run evidence:demo-support` rebuilds and recaptures it.

## Practise the bounded recovery drill

Use `npm.cmd run check:demo-gate` for an unpaced diagnostic. The full `npm.cmd run evidence:demo-gate` rehearsal intentionally makes the API unavailable after `READY`, verifies that the browser invents no replacement state, restarts against the same database and recovers through the visible retry action. Do not rehearse recovery by deleting the database or generated repository.

The support-package gate separately tests the presenter fallback with the API stopped. A broken image, changed asset hash, wrong viewport, missing truth disclosure or external request fails the gate rather than silently degrading the fallback.
