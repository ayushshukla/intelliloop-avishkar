# Competition Accessibility Review

**Story:** `IL-8.4`, refreshed by `IL-8.6` fallback review  
**Review date:** 2026-08-06  
**Primary viewport:** 1366×768  
**Additional viewports:** 768×1024 and 390×844  
**Result:** `PASS` for the bounded competition workflow  
**Machine evidence:** [EV-ACCESSIBILITY](EV_ACCESSIBILITY.json)

## Review objective

The LoopMart competition route must explain the controlled `BLOCKED → READY → STALE` story within two minutes, remain keyboard-operable at the judging viewport and never communicate trust through color alone. This is a focused product review, not a WCAG certification.

## Two-minute story

The first 1366×768 view presents one purpose statement, the local/synthetic boundary, three numbered checkpoints and the current action. Every checkpoint carries a number, verdict word, plain-language meaning and explicit `NEXT`, `CURRENT` or `COMPLETE` label. The current badge adds a symbol and explanation:

| State | Visible meaning | Trust interpretation |
|---|---|---|
| `EMPTY` | Awaiting the controlled fixture | No readiness inferred |
| `BLOCKED` | Conflict requires correction | Candidate cannot advance |
| `READY` | Exact evidence gates satisfied | Candidate readiness only |
| `STALE` | A dependency no longer matches | Historical result is preserved but no longer current |

The page repeats `SYNTHETIC / AI OFF`, `OFF / NOT SENT`, `local` and `unsigned`; it does not present approval, signing or deployment authority.

## Keyboard and focus review

The verified keyboard path is:

1. `Tab` exposes **Skip to main content**.
2. `Enter` moves focus to the `main` landmark.
3. `Tab`, then `Enter`, starts the controlled workflow.
4. When a state-changing button is removed, focus moves to the next action heading rather than falling back to the document body.
5. One `Tab`, then `Enter`, applies the correction.
6. Focus moves to **Prove that READY is not permanent**.
7. One `Tab`, then `Enter`, demonstrates staleness.
8. Focus lands on **BLOCKED → READY → STALE is persisted**.

Links, buttons, inputs and programmatically focused step headings receive a three-pixel high-contrast outline. Busy actions expose `aria-busy`; success and failure messages use live `status` and `alert` semantics. Reduced-motion mode removes the loading animation, and forced-colors mode preserves focus and state boundaries.

## Semantic review

- One `h1` names the competition control room; step titles use `h2` without skipped levels.
- The application exposes banner, navigation, complementary, main and content-info landmarks.
- The three checkpoints are an ordered list with three list items; the active item uses `aria-current="step"`.
- The current checkpoint is a named status region.
- Loading is a labelled busy region; unavailable state is an alert with a retry action.
- Synthetic/AI-off scope is a note, and action cards are labelled regions.

## Visual-state matrix

| State | Visual QA | Functional assertion |
|---|---|---|
| Loading | Label, explanatory copy and bounded activity bar | `aria-busy="true"`; reduced-motion alternative |
| Empty | Neutral `○ EMPTY`, all checkpoints `○ NEXT`, one primary action | No readiness state inferred |
| Error | `! UNAVAILABLE`, explicit no-inference guidance, retry | Alert announced; retry returns to empty |
| Blocked | `× BLOCKED`, red boundary plus text, `▶ CURRENT` | Focus advances to correction heading |
| Ready | `✓ READY`, aqua boundary plus text, prior step `✓ COMPLETE` | Focus advances to invalidation heading |
| Stale | `! STALE`, amber boundary plus text, prior steps complete | Historical READY and current STALE both remain explicit |

Passing Chromium runs attach screenshots for loading, empty, error, `BLOCKED`, `READY` and `STALE` at 1366×768, plus `STALE` at tablet and mobile sizes. `IL-8.6` additionally checks in seven release-candidate fallback frames at 1366×768. Their [manifest](../demo/DEMO_ASSET_MANIFEST.json) records exact hashes, dimensions, fixture/source revision and state rather than treating an unlabeled image as evidence.

## Recorded fallback review

The standalone [fallback viewer](../demo/fallback/index.html) uses a `main` landmark, one ordered list, seven labelled articles, sequential headings, descriptive image alternatives and visible captions. It contains no script, animation, external font, network dependency or color-only verdict. The opening disclosure identifies recorded synthetic evidence, AI-off operation, candidate-only READY and the unsigned Passport. Print styling preserves each slide as a unit where the print engine permits.

The executable support gate loads the viewer from `file:` with the API stopped and requires seven complete 1366×768 images with non-zero natural dimensions. Original-resolution visual inspection confirmed readable labels and distinct READY/STALE/unavailable language. This is a bounded semantic and visual review, not screen-reader or PDF-export certification.

## Responsive review

No horizontal document overflow was observed at 1366×768, 768×1024 or 390×844. At 720 pixels and below, unavailable stage links are removed from the compact navigation while Projects, Competition demo and the AI boundary remain visible. Checkpoints stack vertically; the status badge and action areas use the available width.

## Reproduction

Run:

```powershell
npm.cmd run evidence:accessibility
npm.cmd run check:demo-support
```

The command runs four focused Chromium cases, records viewport screenshots as test attachments, verifies static focus/motion/forced-color guards and regenerates `EV_ACCESSIBILITY.json` with source hashes.

## Limits

This review does not certify every assistive-technology, browser and operating-system combination. It does not change IntelliLoop authority: the fixture is synthetic, external AI remains off, `READY` is exact-input candidate readiness, and the Passport remains unsigned and non-approving.
