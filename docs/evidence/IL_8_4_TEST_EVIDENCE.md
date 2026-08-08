# IL-8.4 Competition Visual and Accessibility Evidence

**Story:** `IL-8.4`  
**Checkpoint:** `COMPETITION_ACCESSIBILITY_POLISH_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06

## Result

The `/demo` route now presents a compact, non-color-only three-state story and preserves keyboard focus across every state replacement. Loading, empty, unavailable/retry, `BLOCKED`, `READY` and `STALE` presentations were reviewed at 1366×768; tablet and mobile layouts were checked for horizontal overflow. The production path was also replayed in the local in-app browser from `EMPTY` through the final persisted `STALE` state.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| `EV-ACCESSIBILITY` recorded | [Machine-readable evidence](EV_ACCESSIBILITY.json) with source hashes and bounded limitations | `PASS` |
| Keyboard and focus | Skip link, main target and keyboard-only transitions; focus lands on each replacement heading | `PASS` |
| Semantic headings | One main `h1`, ordered `h2` steps and no skipped heading level | `PASS` |
| Non-color trust | Words, symbols, checkpoint state labels and explanatory text accompany every color | `PASS` |
| Loading/empty/error QA | Busy/loading, neutral empty, explicit unavailable and successful retry assertions plus screenshots | `PASS` |
| Trust-state QA | `BLOCKED`, `READY` and `STALE` assertions plus screenshots at 1366×768 | `PASS` |
| Responsive QA | No horizontal overflow at 1366×768, 768×1024 or 390×844 | `PASS` |

## Focused verification

- Accessibility/responsive Chromium suite: `4/4`.
- Existing real-service golden workflow regression: `4/4`.
- Existing focused API/migration golden-flow regression: `17/17`.
- Web TypeScript and production build: `PASS`.
- Local in-app browser, real API: `EMPTY → BLOCKED → READY → STALE`; final active element is the completion heading.
- Markdown links and machine-readable evidence parsing: `PASS`.

The regenerated golden-flow guard also identified that fixed local Git commands inherited the parent process environment. The generated fixture path never contacted a remote, but inheriting unrelated environment data was unnecessary. The demo now supplies a fixed Git-only environment, disables prompting and clears credential-helper use; the unchanged 21-test real Git/SQLite/API/Chromium proof passes afterward.

Reproduce the evidence with `npm.cmd run evidence:accessibility`. See the full [competition accessibility review](ACCESSIBILITY_REVIEW.md) for the keyboard path, semantic inventory, state matrix and limitations.

## Honest boundary and next authority

This focused review is not a WCAG certification and does not claim exhaustive screen-reader coverage. It adds no provider, credential, approval, signature, deployment or release-authority path. `IL-8.5` next owns non-functional safety, restart and timed rehearsal proof.
