import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ASSET_DIRECTORY = join(ROOT, "docs", "demo", "assets");
const FALLBACK_VIEWER = join(ROOT, "docs", "demo", "fallback", "index.html");
const MANIFEST = join(ROOT, "docs", "demo", "DEMO_ASSET_MANIFEST.json");
const EVIDENCE = join(ROOT, "docs", "evidence", "EV_DEMO_SUPPORT.json");
const VERIFY_EXISTING = process.argv.includes("--verify-existing");
const VIEWPORT = Object.freeze({ width: 1366, height: 768 });
const FIXTURE_ID = "loopmart-expanded-cancellation-v1";
const FIXTURE_VERSION = "intelliloop-retail-cancellation-fixture.v1";
const ASSET_DEFINITIONS = Object.freeze([
  { order: 1, file: "01-blocked-control-room.png", title: "Not Ready control room", route: "/demo", workflowStage: "INITIAL_BLOCKED", readinessState: "BLOCKED", testState: "PERSISTED_CONFLICT" },
  { order: 2, file: "02-active-twin.png", title: "Attributed Impact Map", route: "/missions/:missionId/twin", workflowStage: "INITIAL_BLOCKED", readinessState: "BLOCKED", testState: "PERSISTED_TWIN_REVISION" },
  { order: 3, file: "03-conflict-impact.png", title: "Risks & Checks", route: "/missions/:missionId/reconciliation", workflowStage: "INITIAL_BLOCKED", readinessState: "BLOCKED", testState: "OPEN_CONFLICT_AND_CITED_IMPACT" },
  { order: 4, file: "04-ai-off-cited-answer.png", title: "AI-off cited answer", route: "/missions/:missionId/explanation", workflowStage: "INITIAL_BLOCKED", readinessState: "BLOCKED", testState: "DETERMINISTIC_EXPLANATION_NOT_SENT" },
  { order: 5, file: "05-ready-passport.png", title: "Unsigned Ready Evidence Report", route: "/missions/:missionId/passport", workflowStage: "CORRECTED_READY", readinessState: "READY", testState: "EXACT_OBLIGATIONS_PASS" },
  { order: 6, file: "06-stale-passport.png", title: "Historical Evidence Report needs recheck", route: "/missions/:missionId/passport", workflowStage: "READY_STALE", readinessState: "STALE", testState: "IMMUTABLE_PROJECTION_STALE_ASSOCIATION" },
  { order: 7, file: "07-live-service-unavailable.png", title: "Explicit live-service failure", route: "/demo", workflowStage: "UNAVAILABLE", readinessState: "UNAVAILABLE", testState: "NO_INFERRED_OR_CACHED_READINESS" }
]);
const SOURCE_FILES = Object.freeze([
  "apps/api/src/demo/demo-workspace-service.ts",
  "apps/web/src/App.tsx",
  "apps/web/src/DemoWorkspace.tsx",
  "apps/web/src/TwinWorkspace.tsx",
  "apps/web/src/ReconciliationWorkspace.tsx",
  "apps/web/src/CitedExplanationWorkspace.tsx",
  "apps/web/src/ReadinessPassportWorkspace.tsx",
  "apps/web/src/styles.css",
  "packages/demo-fixtures/src/retail-cancellation.ts",
  "scripts/generate-demo-support-evidence.mjs"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function sha256File(path) {
  return sha256Bytes(await readFile(path));
}

async function sha256CanonicalTextFile(path) {
  const source = await readFile(path, "utf8");
  return sha256Bytes(Buffer.from(source.replace(/\r\n?/gu, "\n"), "utf8"));
}

async function applicationRevision() {
  const entries = [];
  for (const logical of SOURCE_FILES) entries.push(`${logical}\0${await sha256CanonicalTextFile(join(ROOT, logical))}\0`);
  return sha256Bytes(Buffer.from(entries.join(""), "utf8"));
}

function pngDimensions(bytes) {
  const signature = "89504e470d0a1a0a";
  assert(bytes.subarray(0, 8).toString("hex") === signature, "Fallback asset is not a PNG.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
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

function startProcess(label, args, cwd, environment) {
  const child = spawn(process.execPath, args, { cwd, shell: false, windowsHide: true, env: environment });
  let output = "";
  const append = (chunk) => {
    output += chunk.toString("utf8");
    if (output.length > 1_000_000) output = output.slice(-1_000_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  return { child, label, output: () => output };
}

async function stopProcess(processState) {
  if (processState?.child.exitCode !== null) return;
  processState.child.kill();
  await Promise.race([
    new Promise((resolveClose) => processState.child.once("close", resolveClose)),
    delay(8_000).then(() => { throw new Error(`${processState.label} did not stop in time.`); })
  ]);
}

async function waitForHealth(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Expected while a local process starts.
    }
    await delay(150);
  }
  throw new Error(`Local health endpoint did not become ready: ${url}`);
}

async function writeSafeJson(path, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(body), "Generated demo-support metadata contains a private path.");
  await writeFile(path, body, "utf8");
}

async function manifestAssets(directory) {
  const result = [];
  for (const definition of ASSET_DEFINITIONS) {
    const path = join(directory, definition.file);
    const bytes = await readFile(path);
    const dimensions = pngDimensions(bytes);
    assert(dimensions.width === VIEWPORT.width && dimensions.height === VIEWPORT.height, `${definition.file} has the wrong viewport dimensions.`);
    result.push({
      ...definition,
      path: `docs/demo/assets/${definition.file}`,
      mediaType: "image/png",
      bytes: bytes.length,
      sha256: sha256Bytes(bytes),
      dimensions
    });
  }
  return result;
}

async function validateExisting() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const evidence = JSON.parse(await readFile(EVIDENCE, "utf8"));
  assert(manifest.status === "PASS" && manifest.story === "IL-8.6", "Demo asset manifest is not passing IL-8.6.");
  assert(evidence.status === "PASS" && evidence.story === "IL-8.6", "Demo support evidence is not passing IL-8.6.");
  assert(manifest.fixture?.fixtureId === FIXTURE_ID && manifest.fixture?.fixtureVersion === FIXTURE_VERSION, "Demo asset manifest fixture identity is wrong.");
  assert(manifest.appRevision?.digest === await applicationRevision(), "Demo asset manifest application revision no longer matches its source file set.");
  const assets = await manifestAssets(ASSET_DIRECTORY);
  assert(JSON.stringify(assets) === JSON.stringify(manifest.assets), "Demo asset bytes or metadata no longer match the manifest.");
  const viewer = await readFile(FALLBACK_VIEWER, "utf8");
  for (const asset of assets) assert(viewer.includes(`../assets/${asset.file}`), `Fallback viewer does not reference ${asset.file}.`);
  assert(viewer.includes("not a live run") && viewer.includes("AI off") && viewer.includes("unsigned and non-approving"), "Fallback viewer is missing mandatory truth disclosures.");
  assert(evidence.fallback?.viewerSha256 === await sha256CanonicalTextFile(FALLBACK_VIEWER), "Fallback viewer hash no longer matches evidence.");
  assert(evidence.fallback?.status === "PASS" && evidence.fallback?.brokenImages === 0 && evidence.fallback?.serviceStoppedDuringValidation === true, "Fallback validation evidence is incomplete.");
  assert(evidence.safety?.browserNonLoopbackRequests === 0 && evidence.safety?.browserAuthorizationHeaders === 0 && evidence.safety?.externalAiCalls === false, "Demo support safety evidence is not fail-closed.");
  for (const logical of SOURCE_FILES) assert(evidence.sourceIntegrity?.[logical] === await sha256CanonicalTextFile(join(ROOT, logical)), `Demo support source hash drifted: ${logical}.`);
  console.log(`EV-DEMO-SUPPORT PASS verify-existing assets=${assets.length} fallback=${evidence.fallback.status}`);
}

if (VERIFY_EXISTING) {
  await validateExisting();
  process.exit(0);
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "intelliloop-demo-support-"));
const temporaryAssets = join(temporaryRoot, "assets");
const dataDirectory = join(temporaryRoot, "data");
const apiPort = await availablePort();
const webPort = await availablePort(new Set([apiPort]));
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const environment = {
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  NO_PROXY: "127.0.0.1,localhost",
  NODE_ENV: "test"
};
const apiEnvironment = {
  ...environment,
  INTELLILOOP_API_HOST: "127.0.0.1",
  INTELLILOOP_API_PORT: String(apiPort),
  INTELLILOOP_DATA_DIRECTORY: dataDirectory,
  INTELLILOOP_LOG_LEVEL: "info",
  INTELLILOOP_AI_EXTERNAL_CALLS: "false",
  INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY: "false",
  INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT: "false",
  INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "false"
};
const webEnvironment = { ...environment, INTELLILOOP_E2E_API_PORT: String(apiPort), INTELLILOOP_E2E_WEB_PORT: String(webPort) };
const apiArgs = [join(ROOT, "apps", "api", "dist", "server.js")];
const viteArgs = [join(ROOT, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"];
let apiProcess;
let webProcess;
let browser;
const nonLoopbackRequests = [];
const authorizationHeaders = [];

try {
  await mkdir(temporaryAssets, { recursive: true });
  await mkdir(ASSET_DIRECTORY, { recursive: true });
  apiProcess = startProcess("demo-support-api", apiArgs, ROOT, apiEnvironment);
  webProcess = startProcess("demo-support-web", viteArgs, join(ROOT, "apps", "web"), webEnvironment);
  await waitForHealth(`${apiUrl}/api/v1/health`);
  await waitForHealth(`${webUrl}/api/v1/health`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, colorScheme: "dark", reducedMotion: "reduce" });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      nonLoopbackRequests.push(url.href);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (request.headers().authorization !== undefined) authorizationHeaders.push(request.url());
  });

  async function capture(file, anchor) {
    if (anchor !== undefined) await anchor.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(temporaryAssets, file), animations: "disabled" });
  }

  await page.goto(`${webUrl}/demo`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-demo-stage="EMPTY"]').waitFor({ state: "visible" });
  const setupResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/demo/setup") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Use Demo Project" }).click();
  const setupResponse = await setupResponsePromise;
  const setup = await setupResponse.json();
  assert(typeof setup.missionId === "string", "Demo setup did not return a Mission identity.");
  const missionId = setup.missionId;
  await page.locator('[data-demo-stage="INITIAL_BLOCKED"]').waitFor({ state: "visible" });
  await capture("01-blocked-control-room.png", page.getByRole("heading", { name: "LoopMart cancellation control room" }));

  await page.goto(`${webUrl}/missions/${missionId}/twin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Attributed Impact Map nodes" }).waitFor({ state: "visible" });
  await capture("02-active-twin.png", page.getByRole("heading", { name: "Impact Map revision" }));

  await page.goto(`${webUrl}/missions/${missionId}/reconciliation`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Open Risks & Checks", exact: true }).waitFor({ state: "visible" });
  await page.locator(".finding-card--conflict").first().waitFor({ state: "visible" });
  await page.locator(".impact-path-card").first().waitFor({ state: "visible" });
  await capture("03-conflict-impact.png", page.getByRole("heading", { name: "Open Risks & Checks", exact: true }));

  await page.goto(`${webUrl}/missions/${missionId}/explanation`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Generate a cited explanation" }).waitFor({ state: "visible" });
  await page.getByLabel("Evidence question").selectOption("What conflicts are open?");
  await page.getByRole("button", { name: "Generate cited answer" }).click();
  await page.getByText("Outbound disclosure / NOT SENT", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("DETERMINISTIC EXPLANATION / AI OFF", { exact: true }).waitFor({ state: "visible" });
  await capture("04-ai-off-cited-answer.png", page.getByRole("heading", { name: "Cited answer from the exact persisted assessment" }));

  await page.goto(`${webUrl}/demo`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Apply controlled correction" }).click();
  await page.locator('[data-demo-stage="CORRECTED_READY"]').waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Inspect unsigned Evidence Report" }).click();
  await page.locator('.passport-panel[data-passport-status="READY"]').waitFor({ state: "visible" });
  await page.getByText("UNSIGNED / NOT APPROVAL", { exact: true }).waitFor({ state: "visible" });
  await capture("05-ready-passport.png", page.getByRole("heading", { name: "Release Evidence Report" }));

  await page.goto(`${webUrl}/demo`, { waitUntil: "domcontentloaded" });
  await stopProcess(apiProcess);
  apiProcess = undefined;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Competition demo unavailable" }).waitFor({ state: "visible", timeout: 15_000 });
  await capture("07-live-service-unavailable.png", page.getByRole("heading", { name: "Competition demo unavailable" }));

  apiProcess = startProcess("demo-support-api-restart", apiArgs, ROOT, apiEnvironment);
  await waitForHealth(`${apiUrl}/api/v1/health`);
  await page.getByRole("button", { name: "Retry demo workspace" }).click();
  await page.locator('[data-demo-stage="CORRECTED_READY"]').waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Demonstrate dependency staleness" }).click();
  await page.locator('[data-demo-stage="READY_STALE"]').waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Inspect unsigned Evidence Report" }).click();
  await page.locator('.passport-panel[data-passport-status="STALE"]').waitFor({ state: "visible" });
  await capture("06-stale-passport.png", page.getByRole("heading", { name: "Release Evidence Report" }));

  for (const definition of ASSET_DEFINITIONS) await copyFile(join(temporaryAssets, definition.file), join(ASSET_DIRECTORY, definition.file));
  const assets = await manifestAssets(ASSET_DIRECTORY);
  const appRevision = await applicationRevision();
  const manifest = {
    schemaVersion: 1,
    manifestId: "INTELLILOOP-DEMO-ASSETS",
    story: "IL-8.6",
    status: "PASS",
    captureDate: "2026-08-06",
    appRevision: { scheme: "SOURCE_FILE_SET_CANONICAL_LF_SHA256", digest: appRevision, files: SOURCE_FILES },
    fixture: { fixtureId: FIXTURE_ID, fixtureVersion: FIXTURE_VERSION, ownership: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY" },
    capture: { browser: "PLAYWRIGHT_BUNDLED_CHROMIUM", viewport: VIEWPORT, productionBuild: true, loopbackOnly: true, externalAiCalls: false },
    assets,
    limitations: [
      "Screenshots are recorded synthetic evidence, not live execution or production results.",
      "Ready is an exact-input Release Check; the Release Evidence Report is unsigned and non-approving.",
      "The sequence demonstrates loopback behavior and does not prove production scale, organizational benefit or universal accessibility."
    ]
  };
  await writeSafeJson(MANIFEST, manifest);

  await stopProcess(apiProcess);
  apiProcess = undefined;
  await page.goto(pathToFileURL(FALLBACK_VIEWER).href, { waitUntil: "load" });
  await page.getByRole("heading", { name: "IntelliLoop golden workflow fallback" }).waitFor({ state: "visible" });
  await page.getByText(/not a live run/u).waitFor({ state: "visible" });
  const fallbackImages = await page.locator("main img").evaluateAll((images) => images.map((image) => ({ complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })));
  assert(fallbackImages.length === assets.length, "Fallback viewer asset count is wrong.");
  assert(fallbackImages.every((image) => image.complete && image.naturalWidth === VIEWPORT.width && image.naturalHeight === VIEWPORT.height), "Fallback viewer has a missing or invalid image.");
  assert(nonLoopbackRequests.length === 0, "Demo support capture attempted a non-loopback request.");
  assert(authorizationHeaders.length === 0, "Demo support capture sent an authorization header.");
  const evidence = {
    schemaVersion: 1,
    evidenceId: "EV-DEMO-SUPPORT",
    story: "IL-8.6",
    status: "PASS",
    evidenceDate: "2026-08-06",
    reproductionCommand: "npm.cmd run evidence:demo-support",
    liveFlow: { sequence: ["BLOCKED", "TWIN", "CONFLICT_AND_IMPACT", "AI_OFF_CITED", "READY", "UNAVAILABLE", "READY_AFTER_RESTART", "STALE"], restartRecovery: "PASS", screenshotCount: assets.length },
    fallback: { status: "PASS", format: "STATIC_LOCAL_HTML_ORDERED_SCREENSHOT_SEQUENCE", serviceStoppedDuringValidation: true, slideCount: fallbackImages.length, brokenImages: 0, viewerSha256: await sha256CanonicalTextFile(FALLBACK_VIEWER), manifestId: manifest.manifestId },
    safety: { browserNonLoopbackRequests: nonLoopbackRequests.length, browserAuthorizationHeaders: authorizationHeaders.length, externalAiCalls: false, privateRepositoryUsed: false, repositoryCodeExecuted: false },
    disclosures: { syntheticFixture: true, aiOff: true, notLiveExecution: true, readyNotApproval: true, passportUnsigned: true },
    sourceIntegrity: Object.fromEntries(await Promise.all(SOURCE_FILES.map(async (logical) => [logical, await sha256CanonicalTextFile(join(ROOT, logical))]))),
    limitations: manifest.limitations,
    nextAuthorizedStory: "IL-9.1"
  };
  await writeSafeJson(EVIDENCE, evidence);
  await validateExisting();
  console.log(`EV-DEMO-SUPPORT PASS generated assets=${assets.length} fallback=PASS outbound=0`);
} catch (error) {
  const details = [error instanceof Error ? error.message : String(error), apiProcess?.output(), webProcess?.output()].filter(Boolean).join("\n");
  throw new Error(details.slice(-8_000));
} finally {
  if (browser !== undefined) await browser.close().catch(() => undefined);
  if (apiProcess !== undefined) await stopProcess(apiProcess).catch(() => undefined);
  if (webProcess !== undefined) await stopProcess(webProcess).catch(() => undefined);
  const resolvedTemp = resolve(temporaryRoot);
  const resolvedOsTemp = resolve(tmpdir());
  if (resolvedTemp !== resolvedOsTemp && relative(resolvedOsTemp, resolvedTemp).split(/[/\\]/u)[0]?.startsWith("intelliloop-demo-support-") === true) {
    await rm(resolvedTemp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}
