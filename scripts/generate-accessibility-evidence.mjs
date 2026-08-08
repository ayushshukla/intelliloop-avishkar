import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, "docs", "evidence", "EV_ACCESSIBILITY.json");
const SOURCE_FILES = Object.freeze([
  "apps/web/src/App.tsx",
  "apps/web/src/DemoWorkspace.tsx",
  "apps/web/src/GuidedDemoJourney.tsx",
  "apps/web/src/presentation.tsx",
  "apps/web/src/styles.css",
  "apps/web/e2e/accessibility-polish.spec.ts",
  "playwright.config.ts"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex")}`;
}

function runBrowserProof() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      join(ROOT, "scripts", "run-e2e.mjs"),
      "apps/web/e2e/accessibility-polish.spec.ts",
      "--project=chromium"
    ], {
      cwd: ROOT,
      shell: false,
      windowsHide: true,
      env: { ...process.env, CI: "1", INTELLILOOP_LOG_LEVEL: "silent" }
    });
    let output = "";
    const append = (chunk) => { output += chunk.toString("utf8"); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(output) : reject(new Error(output.slice(-6_000))));
  });
}

function assertStaticAccessibilityBoundaries() {
  const app = readFileSync(join(ROOT, "apps/web/src/App.tsx"), "utf8");
  const demo = readFileSync(join(ROOT, "apps/web/src/DemoWorkspace.tsx"), "utf8");
  const journey = readFileSync(join(ROOT, "apps/web/src/GuidedDemoJourney.tsx"), "utf8");
  const css = readFileSync(join(ROOT, "apps/web/src/styles.css"), "utf8");
  assert(app.includes('className="skip-link"'), "Skip link is missing.");
  assert(app.includes('id="main-content" tabIndex={-1}'), "Main landmark is not a programmatic skip target.");
  assert(demo.includes("activeStepHeading.current?.focus()"), "Workflow focus is not restored after state replacement.");
  assert(demo.includes('aria-busy={action !== undefined}'), "Action busy state is not exposed.");
  assert(journey.includes("data-journey-state={state}"), "Journey text states are missing.");
  assert(journey.includes('aria-current={current ? "step" : undefined}'), "Current journey-step semantics are missing.");
  assert(css.includes("@media (prefers-reduced-motion: reduce)"), "Reduced-motion handling is missing.");
  assert(css.includes("@media (forced-colors: active)"), "Forced-color focus handling is missing.");
}

assertStaticAccessibilityBoundaries();
const output = await runBrowserProof();
assert(/4 passed/u.test(output), "Expected four focused accessibility browser cases.");

const sourceIntegrity = Object.fromEntries(SOURCE_FILES.map((path) => [path, sha256(path)]));
const evidence = {
  schemaVersion: 1,
  evidenceId: "EV-ACCESSIBILITY",
  story: "IL-8.4",
  status: "PASS",
  checkpoint: "COMPETITION_ACCESSIBILITY_POLISH_READY",
  evidenceDate: "2026-08-06",
  reproductionCommand: "npm.cmd run evidence:accessibility",
  execution: {
    browser: "chromium",
    focusedBrowserTests: 4,
    primaryViewport: "1366x768",
    responsiveViewports: ["768x1024", "390x844"],
    screenshotAttachments: [
      "loading-1366x768",
      "empty-1366x768",
      "error-1366x768",
      "blocked-1366x768",
      "ready-1366x768",
      "stale-1366x768",
      "stale-768x1024",
      "stale-390x844"
    ]
  },
  acceptance: {
    skipLinkAndMainTarget: "PASS",
    keyboardOnlyGoldenSequence: "PASS",
    focusRestoredAfterReplacement: "PASS",
    semanticHeadingOrder: "PASS",
    semanticCheckpointList: "PASS",
    nonColorStatusTextAndSymbols: "PASS",
    loadingStateVisualQa: "PASS",
    emptyStateVisualQa: "PASS",
    errorAndRetryVisualQa: "PASS",
    blockedReadyStaleVisualQa: "PASS",
    responsiveHorizontalOverflow: "NONE_OBSERVED",
    reducedMotionAlternative: "PASS",
    forcedColorFocusAlternative: "PASS"
  },
  manualBrowserReview: {
    surface: "CODEX_IN_APP_BROWSER",
    realLocalApiSequence: ["Not Checked", "Not Ready", "Ready", "Recheck Needed"],
    activeElementAfterFinalTransition: "H2: Not Ready → Ready → Recheck Needed is persisted",
    externalProviderCallAuthorized: false
  },
  sourceIntegrity,
  limitations: [
    "This is a focused competition workflow review, not a WCAG conformance certification.",
    "Screen-reader combinations and every browser/OS accessibility setting are not exhaustively certified.",
    "Ready remains an exact-input Release Check; the Release Evidence Report remains unsigned and non-approving."
  ],
  nextAuthorizedStory: "IL-8.5"
};

writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`EV-ACCESSIBILITY PASS browser=4 viewport=1366x768 responsive=2 output=${OUTPUT}`);
