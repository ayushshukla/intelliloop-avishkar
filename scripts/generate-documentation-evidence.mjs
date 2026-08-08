import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "docs", "evidence", "EV_DOCUMENTATION.json");
const REFRESH = process.argv.includes("--refresh");
const VERIFY = process.argv.includes("--verify-existing");

const CANONICAL_DOCUMENTS = Object.freeze([
  "README.md",
  "docs/INDEX.md",
  "docs/architecture/ARCHITECTURE.md",
  "docs/architecture/DOMAIN_MODEL.md",
  "docs/architecture/DATA_AND_MIGRATIONS.md",
  "docs/api/API_REFERENCE.md",
  "docs/development/SETUP.md",
  "docs/development/TESTING.md",
  "docs/development/CONTRIBUTING.md",
  "docs/security/SECURITY_AND_PRIVACY.md",
  "docs/product/USER_GUIDE.md",
  "docs/product/PRODUCT_TARGET.md",
  "docs/product/EXECUTION_STATE.md",
  "docs/product/TRUST_MODEL.md",
  "docs/product/READINESS_AND_PASSPORT_GUIDE.md",
  "docs/demo/DEMO_TROUBLESHOOTING.md",
  "docs/submission/SUBMISSION_MANIFEST.md"
]);

const REQUIRED_PACKAGE_SCRIPTS = Object.freeze([
  "dev",
  "typecheck",
  "test",
  "test:unit",
  "test:api",
  "test:e2e",
  "build",
  "check",
  "check:docs",
  "check:documentation",
  "check:demo-support",
  "check:release-platform",
  "check:release-security",
  "evidence:documentation",
  "evidence:demo-support",
  "evidence:release-platform",
  "evidence:release-security"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function documentationRecords() {
  const records = [];
  const allText = [];
  for (const logicalPath of CANONICAL_DOCUMENTS) {
    const path = join(ROOT, logicalPath);
    const content = await readFile(path, "utf8");
    assert(/^#\s+\S/mu.test(content), `${logicalPath} has no title.`);
    assert(/\*\*Audience:\*\*/u.test(content), `${logicalPath} has no audience metadata.`);
    assert(/\*\*(?:Status|Product status):\*\*/u.test(content), `${logicalPath} has no status metadata.`);
    assert(/\*\*Evidence date:\*\*/u.test(content), `${logicalPath} has no evidence date.`);
    assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(content), `${logicalPath} contains a private absolute path.`);
    records.push({ path: logicalPath, bytes: Buffer.byteLength(content), sha256: sha256(content) });
    allText.push(content);
  }

  const joined = allText.join("\n");
  const staleStatements = [
    "frozen development tree retains the previously recorded Vite/Vitest advisories",
    "migrations `001`-`012` before listening",
    "the final Phase-8 demo fixture/reset workflow",
    "Active engineering policy through `IL-4.6`",
    "The web application has seven implemented routes"
  ].filter((statement) => joined.includes(statement));
  assert(staleStatements.length === 0, `Stale release documentation statement(s): ${staleStatements.join(" | ")}`);

  const deferredMarkers = [
    "public validation/review intake",
    "release approval",
    "signing",
    "deployment authority",
    "live provider"
  ];
  for (const marker of deferredMarkers) {
    assert(joined.toLowerCase().includes(marker.toLowerCase()), `Missing deferred-capability marker: ${marker}`);
  }
  assert(joined.includes("IL-9.3"), "Canonical documentation does not identify the IL-9.3 finalization checkpoint.");
  return { records, joined, deferredMarkers };
}

async function packageCommandEvidence(joinedDocumentation) {
  const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  const scripts = packageJson.scripts ?? {};
  for (const script of REQUIRED_PACKAGE_SCRIPTS) {
    assert(typeof scripts[script] === "string" && scripts[script].length > 0, `Missing package script ${script}.`);
  }
  const documentedScripts = [...joinedDocumentation.matchAll(/npm\.cmd run ([a-z0-9:-]+)/giu)].map((match) => match[1]);
  const uniqueDocumentedScripts = [...new Set(documentedScripts)].sort();
  const missing = uniqueDocumentedScripts.filter((script) => typeof scripts[script] !== "string");
  assert(missing.length === 0, `Documented npm script(s) do not exist: ${missing.join(", ")}`);
  return { requiredScripts: [...REQUIRED_PACKAGE_SCRIPTS], documentedScripts: uniqueDocumentedScripts };
}

async function apiRouteEvidence(apiReference) {
  const sourceFiles = (await collectFiles(join(ROOT, "apps", "api", "src"))).filter((path) => path.endsWith(".ts"));
  const routes = [];
  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");
    const callPattern = /\bapp\.(get|post|put|patch|delete)\b/gu;
    for (const match of source.matchAll(callPattern)) {
      const segment = source.slice(match.index, match.index + 1800);
      const pathMatch = segment.match(/["'`](\/api\/v1\/[^"'`]+)["'`]/u);
      assert(pathMatch !== null, `Could not resolve route after ${match[0]} in ${relative(ROOT, sourceFile)}.`);
      routes.push(`${match[1].toUpperCase()} ${pathMatch[1]}`);
    }
  }
  const uniqueRoutes = [...new Set(routes)].sort();
  assert(uniqueRoutes.length === routes.length, "Duplicate API route registrations were found.");
  for (const route of uniqueRoutes) {
    const [method, path] = route.split(" ", 2);
    assert(apiReference.includes(path), `API reference omits ${method} ${path}.`);
  }
  return uniqueRoutes;
}

function pngDimensions(bytes) {
  assert(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Invalid PNG signature.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function screenshotEvidence() {
  const manifest = JSON.parse(await readFile(join(ROOT, "docs", "demo", "DEMO_ASSET_MANIFEST.json"), "utf8"));
  assert(manifest.status === "PASS" && manifest.story === "IL-8.6", "Demo asset manifest is not passing IL-8.6.");
  assert(Array.isArray(manifest.assets) && manifest.assets.length === 7, "Exactly seven demo screenshots are required.");
  const records = [];
  for (const asset of manifest.assets) {
    const logicalPath = `docs/demo/assets/${asset.file}`;
    const bytes = await readFile(join(ROOT, logicalPath));
    const dimensions = pngDimensions(bytes);
    assert(bytes.length === asset.bytes, `${logicalPath} byte count drifted.`);
    assert(sha256(bytes) === asset.sha256, `${logicalPath} digest drifted.`);
    assert(dimensions.width === asset.dimensions?.width && dimensions.height === asset.dimensions?.height, `${logicalPath} dimensions drifted.`);
    records.push({ path: logicalPath, bytes: bytes.length, sha256: asset.sha256, ...dimensions, workflowStage: asset.workflowStage });
  }
  const diskAssets = (await readdir(join(ROOT, "docs", "demo", "assets"))).filter((name) => name.endsWith(".png")).sort();
  assert(JSON.stringify(diskAssets) === JSON.stringify(records.map((record) => record.path.split("/").at(-1)).sort()), "Screenshot directory and manifest differ.");
  return { manifest: "docs/demo/DEMO_ASSET_MANIFEST.json", captureDate: manifest.captureDate, appRevision: manifest.appRevision.digest, assets: records };
}

async function buildEvidence() {
  const documentation = await documentationRecords();
  const apiReference = await readFile(join(ROOT, "docs", "api", "API_REFERENCE.md"), "utf8");
  return {
    schemaVersion: 1,
    evidenceId: "EV-DOCUMENTATION",
    story: "IL-9.3",
    status: "PASS",
    checkpoint: "FINAL_CANONICAL_DOCUMENTATION_SYNCHRONIZED",
    evidenceDate: "2026-08-06",
    reproductionCommand: "npm.cmd run evidence:documentation",
    canonicalDocuments: { status: "PASS", count: documentation.records.length, records: documentation.records },
    commands: { status: "PASS", ...await packageCommandEvidence(documentation.joined) },
    apiReference: { status: "PASS", routes: await apiRouteEvidence(apiReference) },
    deferredCapabilities: { status: "PASS", markers: documentation.deferredMarkers },
    screenshots: { status: "PASS", ...await screenshotEvidence() },
    limitations: [
      "Command verification proves documented npm script names exist; runtime execution results are recorded in IL-9.1 through IL-9.3 evidence.",
      "Screenshot freshness is bound to the IL-8.6 source-file-set manifest and verify-existing gate; recapture remains an IL-9.6 release-candidate action.",
      "Documentation describes a local prototype and is not production certification, release approval or official Avishkar compliance."
    ],
    nextAuthorizedStory: "IL-9.4"
  };
}

assert(Number(REFRESH) + Number(VERIFY) === 1, "Use exactly one of --refresh or --verify-existing.");
const current = await buildEvidence();
if (REFRESH) {
  await writeFile(OUTPUT, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`EV-DOCUMENTATION PASS docs=${current.canonicalDocuments.count} routes=${current.apiReference.routes.length} screenshots=${current.screenshots.assets.length}`);
} else {
  const stored = JSON.parse(await readFile(OUTPUT, "utf8"));
  assert(JSON.stringify(stored) === JSON.stringify(current), "EV-DOCUMENTATION is stale or inconsistent with the current candidate.");
  console.log(`EV-DOCUMENTATION PASS verify-existing docs=${stored.canonicalDocuments.count} routes=${stored.apiReference.routes.length} screenshots=${stored.screenshots.assets.length}`);
}
