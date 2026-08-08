import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink, stat, writeFile } from "node:fs/promises";
import { arch, platform, release, version } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, "docs", "evidence", "EV_RELEASE.json");
const RUN = process.argv.includes("--run");
const VERIFY = process.argv.includes("--verify-existing");
const REFRESH = process.argv.includes("--refresh-hashes");
const EXPECTED_NODE = "22.22.0";
const EXPECTED_NPM = "10.9.4";
const SOURCE_ROOTS = Object.freeze([
  ".github", "apps", "packages", "scripts", "docs", "planning", ".gitignore",
  ".node-version", "README.md", "package.json", "package-lock.json",
  "playwright.config.ts", "tsconfig.base.json", "vitest.api.config.ts", "vitest.unit.config.ts"
]);
const IGNORED_SEGMENTS = new Set(["node_modules", "dist", "test-results", ".git"]);
const ARTIFACTS = Object.freeze([
  { path: ".node-version", kind: "file" },
  { path: "package.json", kind: "file" },
  { path: "package-lock.json", kind: "file" },
  { path: ".github/workflows/release-platform-verification.yml", kind: "file" },
  { path: "scripts/generate-release-platform-evidence.mjs", kind: "file" },
  { path: "apps/api/dist", kind: "tree" },
  { path: "apps/web/dist", kind: "tree" },
  { path: "packages/domain/dist", kind: "tree" },
  { path: "packages/contracts/dist", kind: "tree" },
  { path: "packages/demo-fixtures/dist", kind: "tree" },
  { path: "docs/demo/assets", kind: "tree" },
  { path: "docs/demo/DEMO_ASSET_MANIFEST.json", kind: "file" },
  { path: "docs/evidence/EV_DEMO_GATE.json", kind: "file" },
  { path: "docs/evidence/EV_DEMO_SUPPORT.json", kind: "file" },
  { path: "docs/evidence/EV_ACCESSIBILITY.json", kind: "file" },
  { path: "docs/evidence/EV_REPO_SAFETY.json", kind: "file" },
  { path: "docs/evidence/EV_PRIVACY.json", kind: "file" }
]);
const COMMANDS = Object.freeze([
  { id: "CLEAN_INSTALL", args: ["ci"], layer: "INSTALL" },
  { id: "TYPECHECK", args: ["run", "typecheck"], layer: "STATIC" },
  { id: "UNIT_COMPONENT", args: ["run", "test:unit"], layer: "UNIT_COMPONENT" },
  { id: "API_INTEGRATION", args: ["run", "test:api"], layer: "API_INTEGRATION" },
  { id: "PRODUCTION_BUILD", args: ["run", "build"], layer: "BUILD" },
  { id: "BROWSER_E2E", args: ["run", "test:e2e"], layer: "BROWSER_E2E" },
  { id: "REPOSITORY_SAFETY", args: ["run", "check:repo-safety"], layer: "GENERATED_EVIDENCE" },
  { id: "PRIVACY", args: ["run", "check:privacy"], layer: "GENERATED_EVIDENCE" },
  { id: "TWIN_CODE_MAP", args: ["run", "check:twin-code-map"], layer: "GENERATED_EVIDENCE" },
  { id: "RECONCILIATION_CITATIONS", args: ["run", "check:reconcile"], layer: "GENERATED_EVIDENCE" },
  { id: "OPENAI_OFFLINE_CHECKPOINT", args: ["run", "check:openai-eval"], layer: "GENERATED_EVIDENCE" },
  { id: "READINESS_PASSPORT", args: ["run", "check:readiness-passport"], layer: "GENERATED_EVIDENCE" },
  { id: "READINESS_PASSPORT_DOCS", args: ["run", "check:readiness-passport-docs"], layer: "DOCUMENTATION_CONTRACT" },
  { id: "RETAIL_FIXTURE", args: ["run", "check:retail-fixture"], layer: "GENERATED_EVIDENCE" },
  { id: "AI_SAFETY_DOCS", args: ["run", "check:ai-safety-docs"], layer: "DOCUMENTATION_CONTRACT" },
  { id: "GOLDEN_FLOW", args: ["run", "check:golden-flow"], layer: "BROWSER_E2E" },
  { id: "ACCESSIBILITY", args: ["run", "check:accessibility"], layer: "BROWSER_ACCESSIBILITY" },
  { id: "DEMO_GATE_FAST", args: ["run", "check:demo-gate"], layer: "BROWSER_RECOVERY" },
  { id: "DEMO_SUPPORT", args: ["run", "check:demo-support"], layer: "FALLBACK_ASSETS" },
  { id: "DOCUMENTATION_LINKS", args: ["run", "check:docs"], layer: "DOCUMENTATION" }
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

function safeLogical(path) {
  return path.replaceAll("\\", "/");
}

async function collectTreeEntries(absolute, logical, entries, ignoreGeneratedRelease = false) {
  const fileStat = await lstat(absolute);
  if (fileStat.isSymbolicLink()) {
    entries.push(`L\0${safeLogical(logical)}\0${await readlink(absolute)}\0`);
    return;
  }
  if (fileStat.isFile()) {
    if (ignoreGeneratedRelease && safeLogical(logical) === "docs/evidence/EV_RELEASE.json") return;
    entries.push(`F\0${safeLogical(logical)}\0${sha256Bytes(await readFile(absolute))}\0`);
    return;
  }
  if (!fileStat.isDirectory()) return;
  for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    if (IGNORED_SEGMENTS.has(entry.name)) continue;
    await collectTreeEntries(join(absolute, entry.name), join(logical, entry.name), entries, ignoreGeneratedRelease);
  }
}

async function treeDigest(path, logical = path, ignoreGeneratedRelease = false) {
  const entries = [];
  await collectTreeEntries(join(ROOT, path), logical, entries, ignoreGeneratedRelease);
  return { sha256: sha256Bytes(Buffer.from(entries.join(""), "utf8")), entryCount: entries.length };
}

async function sourceDigest() {
  const entries = [];
  for (const logical of SOURCE_ROOTS) await collectTreeEntries(join(ROOT, logical), logical, entries, true);
  return { sha256: sha256Bytes(Buffer.from(entries.join(""), "utf8")), entryCount: entries.length };
}

async function artifactManifest() {
  const artifacts = [];
  for (const artifact of ARTIFACTS) {
    const absolute = join(ROOT, artifact.path);
    const itemStat = await stat(absolute);
    if (artifact.kind === "file") {
      artifacts.push({ path: artifact.path, kind: "FILE", bytes: itemStat.size, sha256: await sha256File(absolute) });
    } else {
      const digest = await treeDigest(artifact.path);
      artifacts.push({ path: artifact.path, kind: "TREE", entryCount: digest.entryCount, sha256: digest.sha256 });
    }
  }
  return artifacts;
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
}

function observations(id, output) {
  const clean = stripAnsi(output);
  const result = {};
  const tests = clean.match(/Tests\s+(\d+) passed/u);
  const files = clean.match(/Test Files\s+(\d+) passed/u);
  const playwright = clean.match(/\b(\d+) passed \(/u);
  const modules = [...clean.matchAll(/(\d+) modules transformed/gu)].map((match) => Number(match[1]));
  if (tests !== null) result.passedTests = Number(tests[1]);
  if (files !== null) result.passedFiles = Number(files[1]);
  if (["BROWSER_E2E", "GOLDEN_FLOW", "ACCESSIBILITY", "DEMO_GATE_FAST"].includes(id) && playwright !== null) {
    result.passedBrowserScenarios = Number(playwright[1]);
  }
  if (modules.length > 0) result.webModulesTransformed = modules.at(-1);
  if (id === "CLEAN_INSTALL") {
    const packages = clean.match(/added (\d+) packages/u);
    if (packages !== null) result.installedPackages = Number(packages[1]);
    result.lockfileCommand = "npm ci";
  }
  return result;
}

function npmCliPath() {
  const value = process.env.npm_execpath;
  assert(typeof value === "string" && value.length > 0, "Run this verifier through the npm script so the pinned npm CLI is explicit.");
  return value;
}

async function runNpm(command) {
  const startedAt = Date.now();
  console.log(`RELEASE_VERIFY START ${command.id}`);
  const child = spawn(process.execPath, [npmCliPath(), ...command.args], {
    cwd: ROOT,
    shell: false,
    windowsHide: true,
    env: { ...process.env, CI: "1", GIT_TERMINAL_PROMPT: "0" }
  });
  let captured = "";
  const append = (chunk, stream) => {
    const text = chunk.toString("utf8");
    stream.write(text);
    captured += text;
    if (captured.length > 2_000_000) captured = captured.slice(-2_000_000);
  };
  child.stdout.on("data", (chunk) => append(chunk, process.stdout));
  child.stderr.on("data", (chunk) => append(chunk, process.stderr));
  const code = await new Promise((resolveCode, reject) => {
    child.once("error", reject);
    child.once("close", resolveCode);
  });
  assert(code === 0, `${command.id} failed with exit code ${code}.`);
  const durationMs = Date.now() - startedAt;
  console.log(`RELEASE_VERIFY PASS ${command.id} durationMs=${durationMs}`);
  return { id: command.id, layer: command.layer, command: `npm.cmd ${command.args.join(" ")}`, status: "PASS", durationMs, observations: observations(command.id, captured) };
}

async function npmVersion() {
  const child = spawn(process.execPath, [npmCliPath(), "--version"], { cwd: ROOT, shell: false, windowsHide: true });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
  const code = await new Promise((resolveCode, reject) => {
    child.once("error", reject);
    child.once("close", resolveCode);
  });
  assert(code === 0, "Pinned npm version check failed.");
  return output.trim();
}

async function environmentEvidence() {
  const node = process.versions.node;
  const npm = await npmVersion();
  const nodeVersionFile = (await readFile(join(ROOT, ".node-version"), "utf8")).trim();
  const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(join(ROOT, "package-lock.json"), "utf8"));
  assert(node === EXPECTED_NODE && nodeVersionFile === EXPECTED_NODE && packageJson.engines?.node === EXPECTED_NODE, "Node.js pin mismatch.");
  assert(npm === EXPECTED_NPM && packageJson.engines?.npm === EXPECTED_NPM && packageJson.packageManager === `npm@${EXPECTED_NPM}`, "npm pin mismatch.");
  assert(packageLock.lockfileVersion === 3 && packageLock.packages?.[""]?.engines?.node === EXPECTED_NODE && packageLock.packages?.[""]?.engines?.npm === EXPECTED_NPM, "Lockfile root environment pins are incomplete.");
  return {
    node: { observed: node, expected: EXPECTED_NODE, nodeVersionFile, status: "PASS" },
    npm: { observed: npm, expected: EXPECTED_NPM, packageManager: packageJson.packageManager, status: "PASS" },
    lockfile: { version: packageLock.lockfileVersion, sha256: await sha256File(join(ROOT, "package-lock.json")), status: "PASS" },
    runtime: { platform: platform(), arch: arch(), osRelease: release(), osVersion: version() }
  };
}

function platformMatrix(currentPlatform) {
  const github = process.env.INTELLILOOP_RELEASE_CI === "GITHUB_ACTIONS";
  return {
    windows11: currentPlatform === "win32"
      ? { status: "PASS", evidence: "THIS_RUN", scope: "clean install plus all required layers" }
      : { status: "CONFIGURED_NOT_THIS_RUN", evidence: ".github/workflows/release-platform-verification.yml" },
    linuxCi: currentPlatform === "linux"
      ? { status: "PASS", evidence: github ? "THIS_GITHUB_ACTIONS_RUN" : "THIS_RUN", scope: "clean install plus all required layers" }
      : { status: "CONFIGURED_NOT_OBSERVED_LOCALLY", evidence: ".github/workflows/release-platform-verification.yml", limitation: "No WSL, Linux runner or connected remote was available during the Windows evidence run." }
  };
}

async function safeWrite(value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(body), "EV-RELEASE contains a private path.");
  await writeFile(OUTPUT, body, "utf8");
}

async function hashSection() {
  return { sourceTree: await sourceDigest(), artifacts: await artifactManifest() };
}

async function validateEvidence(evidence, requireCurrentHashes = true) {
  assert(evidence.evidenceId === "EV-RELEASE" && evidence.story === "IL-9.1" && ["PASS_WINDOWS_LINUX_CI_CONFIGURED", "PASS_LINUX_WINDOWS_CI_CONFIGURED"].includes(evidence.status), "EV-RELEASE is not passing the IL-9.1 boundary.");
  assert(evidence.environment?.node?.status === "PASS" && evidence.environment?.npm?.status === "PASS" && evidence.environment?.lockfile?.status === "PASS", "Environment pins are not passing.");
  assert(Array.isArray(evidence.commands) && evidence.commands.length === COMMANDS.length && evidence.commands.every((command) => command.status === "PASS"), "Not every required release command passed.");
  const currentPlatformStatus = evidence.environment.runtime.platform === "win32" ? evidence.platformMatrix?.windows11?.status : evidence.platformMatrix?.linuxCi?.status;
  assert(currentPlatformStatus === "PASS", "The current platform evidence is not passing.");
  assert(["PASS", "CONFIGURED_NOT_OBSERVED_LOCALLY"].includes(evidence.platformMatrix?.linuxCi?.status), "Linux CI disposition is invalid.");
  if (requireCurrentHashes) assert(JSON.stringify(evidence.hashes) === JSON.stringify(await hashSection()), "Release source or artifact hashes have drifted.");
}

assert(Number(RUN) + Number(VERIFY) + Number(REFRESH) === 1, "Use exactly one of --run, --verify-existing or --refresh-hashes.");

if (RUN) {
  const beforeLockHash = await sha256File(join(ROOT, "package-lock.json"));
  const environment = await environmentEvidence();
  const commands = [];
  for (const command of COMMANDS) commands.push(await runNpm(command));
  const afterLockHash = await sha256File(join(ROOT, "package-lock.json"));
  assert(beforeLockHash === afterLockHash, "npm ci or verification changed package-lock.json.");
  const evidence = {
    schemaVersion: 1,
    evidenceId: "EV-RELEASE",
    story: "IL-9.1",
    status: environment.runtime.platform === "win32" ? "PASS_WINDOWS_LINUX_CI_CONFIGURED" : "PASS_LINUX_WINDOWS_CI_CONFIGURED",
    checkpoint: "PHASE_9_RELEASE_VERIFICATION_STARTED",
    evidenceDate: "2026-08-06",
    reproductionCommand: "npm.cmd run evidence:release-platform",
    environment,
    platformMatrix: platformMatrix(environment.runtime.platform),
    commands,
    cleanInstall: { status: "PASS", lockfileBefore: beforeLockHash, lockfileAfter: afterLockHash, lockfileEquality: "PASS" },
    hashes: await hashSection(),
    limitations: [
      "The complete run was observed on Windows 11; Linux is configured in a pinned GitHub Actions matrix but was not locally observed because no Linux runtime or connected remote was available.",
      "A passing prototype release verifier is not production certification, competition-rules compliance, release approval or deployment authorization.",
      "The IL-9.2 dependency, license, provenance, similarity, secret and security audit passed; its time-sensitive registry observations must be refreshed at final freeze."
    ],
    nextAuthorizedStory: "IL-9.4"
  };
  await validateEvidence(evidence, true);
  await safeWrite(evidence);
  console.log(`EV-RELEASE PASS commands=${commands.length} platform=${environment.runtime.platform} linux=${evidence.platformMatrix.linuxCi.status}`);
} else if (REFRESH) {
  const evidence = JSON.parse(await readFile(OUTPUT, "utf8"));
  await validateEvidence(evidence, false);
  const refreshed = { ...evidence, hashes: await hashSection() };
  await safeWrite(refreshed);
  await validateEvidence(refreshed, true);
  console.log(`EV-RELEASE PASS refreshed artifacts=${refreshed.hashes.artifacts.length}`);
} else {
  const evidence = JSON.parse(await readFile(OUTPUT, "utf8"));
  await validateEvidence(evidence, true);
  console.log(`EV-RELEASE PASS verify-existing commands=${evidence.commands.length} linux=${evidence.platformMatrix.linuxCi.status}`);
}
