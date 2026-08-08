import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, "docs", "evidence", "EV_GOLDEN_FLOW.json");
const API_FILES = Object.freeze([
  "apps/api/test/demo-workspace-api.test.ts",
  "apps/api/test/database-lifecycle.test.ts"
]);
const SOURCE_FILES = Object.freeze([
  "packages/demo-fixtures/src/retail-cancellation.ts",
  "apps/api/src/database/migrations/014-demo-golden-workflow.ts",
  "apps/api/src/demo/demo-workspace-service.ts",
  "apps/api/src/demo/demo-routes.ts",
  "apps/web/src/demo-client.ts",
  "apps/web/src/DemoWorkspace.tsx",
  "apps/web/e2e/golden-flow.spec.ts",
  "playwright.config.ts"
]);
const CHECKPOINTS = Object.freeze([
  "checkpoint=INITIAL_BLOCKED assertions=passed outbound=0 credentials=0",
  "checkpoint=OFFLINE_EXPLANATION assertions=passed outbound=0 credentials=0",
  "checkpoint=CORRECTED_READY assertions=passed outbound=0 credentials=0",
  "checkpoint=READY_STALE assertions=passed outbound=0 credentials=0"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(label, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: false,
      windowsHide: true,
      env: { ...process.env, CI: "1", INTELLILOOP_LOG_LEVEL: "silent" }
    });
    let output = "";
    const append = (chunk) => {
      output += chunk.toString("utf8");
      if (output.length > 24 * 1024 * 1024) output = output.slice(-24 * 1024 * 1024);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${label} failed.\n${output.slice(-4_000)}`));
    });
  });
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex")}`;
}

function assertStaticBoundaries() {
  const config = readFileSync(join(ROOT, "apps/api/src/config.ts"), "utf8");
  const demo = readFileSync(join(ROOT, "apps/api/src/demo/demo-workspace-service.ts"), "utf8");
  const browser = readFileSync(join(ROOT, "apps/web/e2e/golden-flow.spec.ts"), "utf8");
  const playwright = readFileSync(join(ROOT, "playwright.config.ts"), "utf8");
  for (const flag of [
    '"ai.externalCalls": false',
    '"experiments.evidenceReplay": false',
    '"experiments.agentDisagreement": false',
    '"experiments.remediationPreview": false'
  ]) assert(config.includes(flag), `Protected flag is not frozen off: ${flag}`);
  assert(!/process\.env|OPENAI_API_KEY|ANTHROPIC_API_KEY/u.test(demo), "Demo orchestration reads a credential or environment setting.");
  assert(browser.includes("unexpectedOutboundRequests"), "Browser proof does not audit outbound requests.");
  assert(browser.includes("credentialBearingRequests"), "Browser proof does not audit credential-bearing requests.");
  assert(playwright.includes('trace: "retain-on-failure"'), "Failure traces are not retained safely.");
  assert(playwright.includes('screenshot: "only-on-failure"'), "Failure screenshots are not bounded to failures.");
}

function safeWrite(value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\/|\bsk-[A-Za-z0-9_-]{12,}/u.test(serialized),
    "Golden-flow evidence contains a private path or credential-shaped value.");
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, serialized, "utf8");
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "intelliloop-golden-proof-"));
try {
  const apiReportPath = join(temporaryDirectory, "api.json");
  const [, browserOutput] = await Promise.all([
    run("Golden-flow API and migration proof", process.execPath, [
      join(ROOT, "node_modules", "vitest", "vitest.mjs"),
      "run", "--config", "vitest.api.config.ts", "--reporter=json", "--outputFile", apiReportPath,
      ...API_FILES
    ]),
    run("Serial browser golden workflow", process.execPath, [
      join(ROOT, "scripts", "run-e2e.mjs"),
      "apps/web/e2e/golden-flow.spec.ts", "--reporter=line"
    ])
  ]);
  const apiReport = JSON.parse(readFileSync(apiReportPath, "utf8"));
  const apiTests = (apiReport.testResults ?? []).flatMap((suite) => suite.assertionResults ?? []);
  assert(apiTests.length === 17 && apiTests.every((entry) => entry.status === "passed"),
    "The 17-test API/migration proof did not pass completely.");

  for (const checkpoint of CHECKPOINTS) {
    assert(browserOutput.includes(checkpoint), `Browser checkpoint was not recorded: ${checkpoint}`);
  }
  assert(/4 passed/u.test(browserOutput), "The four-test browser workflow did not pass completely.");
  assertStaticBoundaries();

  safeWrite({
    schemaVersion: 1,
    evidenceId: "EV-GOLDEN-FLOW",
    story: "IL-8.3",
    status: "PASS",
    checkpoint: "COMPETITION_GOLDEN_WORKFLOW_READY",
    evidenceDate: "2026-08-06",
    reproductionCommand: "npm.cmd run evidence:golden-flow",
    fixture: {
      fixtureId: "loopmart-expanded-cancellation-v1",
      fixtureVersion: "intelliloop-retail-cancellation-fixture.v1",
      ownership: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY",
      repositoryExecution: false
    },
    execution: {
      apiFiles: API_FILES,
      apiTests: apiTests.length,
      browserFile: "apps/web/e2e/golden-flow.spec.ts",
      browserTests: 4,
      totalFocusedTests: apiTests.length + 4,
      browser: "chromium",
      viewport: "1366x768"
    },
    demonstratedSequence: [
      "EMPTY_TO_INITIAL_BLOCKED",
      "CONFLICT_AND_CITED_IMPACT",
      "DETERMINISTIC_AI_OFF_CITED_ANSWER",
      "CONTROLLED_CORRECTION_TO_READY",
      "UNSIGNED_READY_PASSPORT",
      "DEPENDENCY_CHANGE_TO_STALE",
      "HISTORICAL_PASSPORT_CURRENTLY_STALE"
    ],
    acceptance: {
      persistedStateSequence: ["BLOCKED", "READY", "STALE"],
      allStretchFlagsOff: true,
      externalAiCalls: false,
      unexpectedOutboundBrowserRequests: 0,
      credentialBearingBrowserRequests: 0,
      credentialRequired: false,
      failureTracePolicy: "RETAIN_ON_FAILURE",
      screenshotPolicy: "ONLY_ON_FAILURE",
      failureArtifactRoot: "test-results/<sanitized-test-id>",
      resetScopeCallerControlled: false
    },
    featureFlags: {
      "ai.externalCalls": false,
      "experiments.evidenceReplay": false,
      "experiments.agentDisagreement": false,
      "experiments.remediationPreview": false
    },
    sourceIntegrity: Object.fromEntries(SOURCE_FILES.map((path) => [path, sha256(path)])),
    limitations: [
      "The fixture, review and validation inputs are synthetic and do not prove production safety.",
      "READY applies only to the exact persisted inputs and is not release approval.",
      "The Passport is unsigned and grants no deployment authority.",
      "The demonstrated cited answer is deterministic and provider-off; no evidence is sent externally."
    ],
    nextAuthorizedStory: "IL-8.4"
  });
  console.log(`Golden-flow evidence PASS (${apiTests.length + 4} focused tests).`);
  console.log("Wrote docs/evidence/EV_GOLDEN_FLOW.json.");
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
