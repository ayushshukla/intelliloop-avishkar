import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, readdir, readlink, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, "docs", "evidence", "EV_DEMO_GATE.json");
const FAST = process.argv.includes("--fast");
const SECRET_SENTINEL = "IL85_SECRET_SENTINEL_7F3C9A2E_DO_NOT_PERSIST";
const NARRATION_SECONDS = Object.freeze({
  trustBoundary: 25,
  materialize: 30,
  conflictImpact: 45,
  offlineAnswer: 35,
  correction: 50,
  passport: 35,
  recovery: 35,
  staleness: 45,
  closeAndReset: 20
});
const SOURCE_FILES = Object.freeze([
  "apps/api/src/demo/demo-workspace-service.ts",
  "apps/web/src/DemoWorkspace.tsx",
  "apps/web/e2e/golden-flow.spec.ts",
  "scripts/generate-demo-gate-evidence.mjs",
  "scripts/generate-repo-safety-evidence.mjs",
  "scripts/generate-privacy-evidence.mjs"
]);
const TREE_ROOTS = Object.freeze([
  "apps", "packages", "scripts", "docs", "planning", "README.md", "package.json",
  "package-lock.json", "playwright.config.ts", "tsconfig.base.json",
  "vitest.api.config.ts", "vitest.unit.config.ts"
]);
const IGNORED_TREE_SEGMENTS = new Set(["dist", "node_modules", "test-results"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function sha256File(path) {
  return sha256Bytes(await readFile(join(ROOT, path)));
}

async function availablePort(excluded = new Set()) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await new Promise((resolvePort, reject) => {
      const server = createServer();
      server.unref();
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address === null || typeof address === "string") {
          server.close(() => reject(new Error("Loopback port allocation failed.")));
          return;
        }
        server.close((error) => error === undefined ? resolvePort(address.port) : reject(error));
      });
    });
    if (!excluded.has(port)) return port;
  }
  throw new Error("Distinct loopback ports could not be allocated.");
}

async function collectTreeEntries(absolute, logical, entries) {
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) {
    entries.push(`L\0${logical}\0${await readlink(absolute)}\0`);
    return;
  }
  if (stat.isFile()) {
    entries.push(`F\0${logical}\0${sha256Bytes(await readFile(absolute))}\0`);
    return;
  }
  if (!stat.isDirectory()) return;
  for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    if (IGNORED_TREE_SEGMENTS.has(entry.name)) continue;
    await collectTreeEntries(join(absolute, entry.name), `${logical}/${entry.name}`, entries);
  }
}

async function sourceTreeDigest() {
  const entries = [];
  for (const logical of TREE_ROOTS) await collectTreeEntries(join(ROOT, logical), logical, entries);
  return sha256Bytes(Buffer.from(entries.join(""), "utf8"));
}

async function gitStatusBytes() {
  return new Promise((resolveBytes, reject) => {
    const child = spawn("git", ["status", "--porcelain=v1", "-z", "--untracked-files=normal"], {
      cwd: ROOT,
      shell: false,
      windowsHide: true,
      env: { GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "credential.helper", GIT_CONFIG_VALUE_0: "" }
    });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolveBytes(Buffer.concat(chunks)) : reject(new Error("Git status proof failed.")));
  });
}

function startProcess(label, args, cwd, environment) {
  const child = spawn(process.execPath, args, {
    cwd,
    shell: false,
    windowsHide: true,
    env: environment
  });
  let output = "";
  const append = (chunk) => {
    output += chunk.toString("utf8");
    if (output.length > 2_000_000) output = output.slice(-2_000_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.once("error", (error) => { output += `\n${label} spawn failure: ${error.message}`; });
  return { child, label, output: () => output };
}

async function stopProcess(processState) {
  if (processState.child.exitCode !== null) return;
  processState.child.kill();
  await Promise.race([
    new Promise((resolveClose) => processState.child.once("close", resolveClose)),
    delay(8_000).then(() => { throw new Error(`${processState.label} did not stop within the bounded window.`); })
  ]);
}

async function waitForHealth(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The bounded retry is expected while a local process starts.
    }
    await delay(150);
  }
  throw new Error(`Local health endpoint did not become ready: ${url}`);
}

async function scanDirectoryForSentinel(root) {
  const hits = [];
  const utf8 = Buffer.from(SECRET_SENTINEL, "utf8");
  const utf16 = Buffer.from(SECRET_SENTINEL, "utf16le");
  async function scan(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const target = join(current, entry.name);
      if (entry.isDirectory()) await scan(target);
      else if (entry.isFile()) {
        const body = await readFile(target);
        if (body.includes(utf8) || body.includes(utf16)) hits.push(relative(root, target).replaceAll("\\", "/"));
      }
    }
  }
  await scan(root);
  return hits;
}

async function phase(name, narrationSeconds, action, timings) {
  const startedAt = Date.now();
  await action();
  const actionMs = Date.now() - startedAt;
  const pauseMs = FAST ? 0 : narrationSeconds * 1_000;
  console.log(`REHEARSAL phase=${name} actionMs=${actionMs} narrationSeconds=${FAST ? 0 : narrationSeconds}`);
  if (pauseMs > 0) await delay(pauseMs);
  timings.push({ name, actionMs, narrationSeconds: FAST ? 0 : narrationSeconds, totalMs: Date.now() - startedAt });
}

async function waitForStage(page, stage, timeoutMs = 20_000) {
  await page.locator(`[data-demo-stage="${stage}"]`).waitFor({ state: "visible", timeout: timeoutMs });
}

function readEvidence(path, expectedId) {
  return readFile(join(ROOT, path), "utf8").then((text) => {
    const value = JSON.parse(text);
    assert(value.evidenceId === expectedId && value.status === "PASS", `${expectedId} is not passing.`);
    return value;
  });
}

async function safeWrite(value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assert(!serialized.includes(SECRET_SENTINEL), "Demo-gate report contains the secret sentinel.");
  assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(serialized), "Demo-gate report contains a private path.");
  await writeFile(OUTPUT, serialized, "utf8");
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "intelliloop-demo-gate-"));
const dataDirectory = join(temporaryRoot, "data");
const apiPort = await availablePort();
const webPort = await availablePort(new Set([apiPort]));
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const commonEnvironment = {
  INTELLILOOP_IL85_SECRET_SENTINEL: SECRET_SENTINEL,
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  NO_PROXY: "127.0.0.1,localhost",
  NODE_ENV: "test"
};
const apiEnvironment = {
  ...commonEnvironment,
  INTELLILOOP_API_HOST: "127.0.0.1",
  INTELLILOOP_API_PORT: String(apiPort),
  INTELLILOOP_DATA_DIRECTORY: dataDirectory,
  INTELLILOOP_LOG_LEVEL: "info",
  INTELLILOOP_AI_EXTERNAL_CALLS: "false",
  INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY: "false",
  INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT: "false",
  INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "false"
};
const webEnvironment = {
  ...commonEnvironment,
  INTELLILOOP_E2E_API_PORT: String(apiPort),
  INTELLILOOP_E2E_WEB_PORT: String(webPort)
};
const apiArgs = [join(ROOT, "apps", "api", "dist", "server.js")];
const viteArgs = [join(ROOT, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"];
const timings = [];
const unexpectedOutboundRequests = [];
const credentialBearingRequests = [];
const browserResponses = [];
const apiRuns = [];
let webProcess;
let apiProcess;
let browser;
let sourceBefore;
let sourceAfter;
let statusBefore;
let statusAfter;
let databaseSentinelHits = [];
const rehearsalStartedAt = Date.now();

try {
  sourceBefore = await sourceTreeDigest();
  statusBefore = await gitStatusBytes();
  apiProcess = startProcess("api-1", apiArgs, ROOT, apiEnvironment);
  apiRuns.push(apiProcess);
  webProcess = startProcess("web", viteArgs, join(ROOT, "apps", "web"), webEnvironment);
  await waitForHealth(`${apiUrl}/api/v1/health`);
  await waitForHealth(`${webUrl}/api/v1/health`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      unexpectedOutboundRequests.push(route.request().url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (request.headers().authorization !== undefined) credentialBearingRequests.push(request.url());
  });
  page.on("response", async (response) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json") && !contentType.includes("text")) return;
    try {
      const text = await response.text();
      if (browserResponses.join("").length < 2_000_000) browserResponses.push(text);
    } catch {
      // Navigation can invalidate a response body; other sentinel surfaces remain checked.
    }
  });

  await phase("TRUST_BOUNDARY", NARRATION_SECONDS.trustBoundary, async () => {
    await page.goto(`${webUrl}/demo`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "LoopMart cancellation control room" }).waitFor({ state: "visible" });
    await page.getByText("SYNTHETIC / AI OFF", { exact: true }).waitFor({ state: "visible" });
    await waitForStage(page, "EMPTY");
  }, timings);

  await phase("MATERIALIZE_BLOCKED", NARRATION_SECONDS.materialize, async () => {
    await page.getByRole("button", { name: "Use Demo Project" }).click();
    await waitForStage(page, "INITIAL_BLOCKED");
    await page.getByRole("status", { name: /Current Release Check: Not Ready/u }).waitFor({ state: "visible" });
  }, timings);

  await phase("CONFLICT_AND_IMPACT", NARRATION_SECONDS.conflictImpact, async () => {
    await page.getByRole("button", { name: "Inspect Risks & Checks" }).click();
    await page.getByRole("heading", { name: "Open Risks & Checks", exact: true }).waitFor({ state: "visible" });
    await page.locator(".finding-card--conflict").first().waitFor({ state: "visible" });
    await page.locator(".impact-path-card").first().waitFor({ state: "visible" });
    await page.goto(`${webUrl}/demo`);
    await waitForStage(page, "INITIAL_BLOCKED");
  }, timings);

  await phase("OFFLINE_CITED_ANSWER", NARRATION_SECONDS.offlineAnswer, async () => {
    await page.getByRole("button", { name: /Ask/u }).click();
    await page.getByRole("heading", { name: "Generate a cited explanation" }).waitFor({ state: "visible" });
    await page.getByLabel("Evidence question").selectOption("What conflicts are open?");
    await page.getByRole("button", { name: "Generate cited answer" }).click();
    await page.getByText("Outbound disclosure / NOT SENT", { exact: true }).waitFor({ state: "visible" });
    await page.goto(`${webUrl}/demo`);
    await waitForStage(page, "INITIAL_BLOCKED");
  }, timings);

  await phase("CORRECTION_TO_READY", NARRATION_SECONDS.correction, async () => {
    await page.getByRole("button", { name: "Apply controlled correction" }).click();
    await waitForStage(page, "CORRECTED_READY");
    await page.getByRole("status", { name: /Current Release Check: Ready/u }).waitFor({ state: "visible" });
  }, timings);

  await phase("UNSIGNED_PASSPORT", NARRATION_SECONDS.passport, async () => {
    await page.getByRole("button", { name: "Inspect unsigned Evidence Report" }).click();
    await page.getByText("UNSIGNED / NOT APPROVAL", { exact: true }).waitFor({ state: "visible" });
    await page.locator('.passport-panel[data-passport-status="READY"]').waitFor({ state: "visible" });
    await page.goto(`${webUrl}/demo`);
    await waitForStage(page, "CORRECTED_READY");
  }, timings);

  await phase("RESTART_AND_RECOVERY", NARRATION_SECONDS.recovery, async () => {
    await stopProcess(apiProcess);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Competition demo unavailable" }).waitFor({ state: "visible", timeout: 15_000 });
    apiProcess = startProcess("api-2", apiArgs, ROOT, apiEnvironment);
    apiRuns.push(apiProcess);
    await waitForHealth(`${apiUrl}/api/v1/health`);
    await page.getByRole("button", { name: "Retry demo workspace" }).click();
    await waitForStage(page, "CORRECTED_READY");
  }, timings);

  await phase("DEPENDENCY_TO_STALE", NARRATION_SECONDS.staleness, async () => {
    await page.getByRole("button", { name: "Demonstrate dependency staleness" }).click();
    await waitForStage(page, "READY_STALE");
    await page.getByRole("status", { name: /Current Release Check: Recheck Needed/u }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Inspect unsigned Evidence Report" }).click();
    await page.locator('.passport-panel[data-passport-status="STALE"]').waitFor({ state: "visible" });
    await page.goto(`${webUrl}/demo`);
    await waitForStage(page, "READY_STALE");
  }, timings);

  await phase("CLOSE_RESET_RESTART", NARRATION_SECONDS.closeAndReset, async () => {
    await page.getByRole("button", { name: "Reset controlled demo" }).click();
    await page.getByRole("button", { name: "Confirm controlled reset" }).click();
    await waitForStage(page, "EMPTY");
    await stopProcess(apiProcess);
    apiProcess = startProcess("api-3", apiArgs, ROOT, apiEnvironment);
    apiRuns.push(apiProcess);
    await waitForHealth(`${apiUrl}/api/v1/health`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForStage(page, "EMPTY");
  }, timings);

  const renderedText = await page.locator("body").innerText();
  assert(!renderedText.includes(SECRET_SENTINEL), "Secret sentinel reached rendered browser text.");
  assert(unexpectedOutboundRequests.length === 0, "A non-loopback browser request was attempted.");
  assert(credentialBearingRequests.length === 0, "A browser request carried an authorization header.");
  assert(!browserResponses.join("").includes(SECRET_SENTINEL), "Secret sentinel reached an HTTP response body.");
  await browser.close();
  browser = undefined;
  await stopProcess(apiProcess);
  await stopProcess(webProcess);
  databaseSentinelHits = await scanDirectoryForSentinel(dataDirectory);
  assert(databaseSentinelHits.length === 0, "Secret sentinel reached the generated data directory.");
  for (const run of apiRuns) assert(!run.output().includes(SECRET_SENTINEL), "Secret sentinel reached API logs.");
  assert(!webProcess.output().includes(SECRET_SENTINEL), "Secret sentinel reached web logs.");

  sourceAfter = await sourceTreeDigest();
  statusAfter = await gitStatusBytes();
  assert(sourceBefore === sourceAfter, "Application source tree changed during the runtime rehearsal.");
  assert(statusBefore.equals(statusAfter), "Git status bytes changed during the runtime rehearsal.");

  const repoSafety = await readEvidence("docs/evidence/EV_REPO_SAFETY.json", "EV-REPO-SAFETY");
  const privacy = await readEvidence("docs/evidence/EV_PRIVACY.json", "EV-PRIVACY");
  assert(repoSafety.proofs?.registration?.completeTreeDigestEquality === "PASS", "Registered repository equality did not pass.");
  assert(privacy.integrity?.externalFetchCalls === 0, "Privacy proof observed a network call.");

  const elapsedMs = Date.now() - rehearsalStartedAt;
  if (!FAST) assert(elapsedMs >= 300_000 && elapsedMs <= 420_000, `Paced rehearsal was outside 5-7 minutes: ${elapsedMs}ms.`);
  const sourceIntegrity = Object.fromEntries(await Promise.all(SOURCE_FILES.map(async (path) => [path, await sha256File(path)])));
  const evidence = {
    schemaVersion: 1,
    evidenceId: "EV-DEMO-GATE",
    story: "IL-8.5",
    status: "PASS",
    checkpoint: "G5_CORE_DEMONSTRABLE",
    evidenceDate: "2026-08-06",
    reproductionCommand: "npm.cmd run evidence:demo-gate",
    mode: FAST ? "FAST_DIAGNOSTIC" : "PACED_REHEARSAL",
    rehearsal: {
      elapsedMs,
      elapsedMinutes: Number((elapsedMs / 60_000).toFixed(2)),
      targetMinutes: { minimum: 5, maximum: 7 },
      narrationSeconds: FAST ? 0 : Object.values(NARRATION_SECONDS).reduce((sum, value) => sum + value, 0),
      phases: timings
    },
    workflow: {
      sequence: ["EMPTY", "BLOCKED", "READY", "UNAVAILABLE", "READY_AFTER_RESTART", "STALE", "EMPTY_AFTER_RESET_AND_RESTART"],
      apiProcessStarts: apiRuns.length,
      recoveryDrill: "PASS",
      resetAfterRestart: "PASS",
      historicalPassportStaleness: "PASS"
    },
    safety: {
      applicationSourceTreeBefore: sourceBefore,
      applicationSourceTreeAfter: sourceAfter,
      applicationSourceTreeEquality: "PASS",
      gitStatusByteEquality: "PASS",
      registeredRepositoryCompleteTreeEquality: "PASS",
      browserNonLoopbackRequests: unexpectedOutboundRequests.length,
      browserAuthorizationHeaders: credentialBearingRequests.length,
      privacyProofFetchCalls: privacy.integrity.externalFetchCalls,
      secretSentinelInLogs: false,
      secretSentinelInResponses: false,
      secretSentinelInRenderedText: false,
      secretSentinelInDataDirectory: false,
      dataDirectorySentinelHits: databaseSentinelHits,
      externalAiCalls: false
    },
    evidenceDependencies: {
      repositorySafety: { status: repoSafety.status, evidenceId: repoSafety.evidenceId },
      privacy: { status: privacy.status, evidenceId: privacy.evidenceId }
    },
    sourceIntegrity,
    limitations: [
      "The rehearsal uses an IntelliLoop-authored synthetic fixture on loopback and does not prove production performance or universal DLP.",
      "Browser egress is actively blocked and server-side product paths are source-checked/provider-off; this is not an operating-system network sandbox.",
      "The generated demo repository is intentionally changed inside the isolated data directory; registered repositories and application source remain unchanged.",
      "Ready remains an exact-input Release Check and the Release Evidence Report remains unsigned and non-approving."
    ],
    nextAuthorizedStory: "IL-8.6"
  };
  if (!FAST) await safeWrite(evidence);
  console.log(`EV-DEMO-GATE PASS mode=${evidence.mode} elapsedMinutes=${evidence.rehearsal.elapsedMinutes} apiStarts=${apiRuns.length} outbound=0 sentinel=0`);
} finally {
  if (browser !== undefined) await browser.close().catch(() => undefined);
  if (apiProcess !== undefined) await stopProcess(apiProcess).catch(() => undefined);
  if (webProcess !== undefined) await stopProcess(webProcess).catch(() => undefined);
  const resolvedTemp = resolve(temporaryRoot);
  const resolvedOsTemp = resolve(tmpdir());
  if (resolvedTemp !== resolvedOsTemp && relative(resolvedOsTemp, resolvedTemp).split(/[/\\]/u)[0]?.startsWith("intelliloop-demo-gate-") === true) {
    await rm(resolvedTemp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}
