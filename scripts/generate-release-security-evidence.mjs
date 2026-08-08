import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EVIDENCE_PATH = join(ROOT, "docs", "evidence", "EV_SECURITY_AUDIT.json");
const INVENTORY_PATH = join(ROOT, "docs", "governance", "THIRD_PARTY_INVENTORY.json");
const NOTICES_PATH = join(ROOT, "docs", "governance", "THIRD_PARTY_NOTICES.md");
const REFRESH = process.argv.includes("--refresh");
const VERIFY = process.argv.includes("--verify-existing");
const EVIDENCE_DATE = "2026-08-06";
const CANDIDATE_ROOTS = Object.freeze([
  ".github", "apps", "packages", "scripts", "docs", "planning",
  ".gitignore", ".node-version", "README.md", "package.json", "package-lock.json",
  "playwright.config.ts", "tsconfig.base.json", "vitest.api.config.ts", "vitest.unit.config.ts"
]);
const LOCAL_ONLY_ROOTS = Object.freeze(["discovery", "recovery", "artifacts"]);
const IGNORED_SEGMENTS = new Set([".git", "node_modules", "dist", "test-results", "playwright-report"]);
const TEXT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".ts", ".tsx", ".txt", ".yaml", ".yml"]);
const LICENSE_ALLOWLIST = new Set([
  "0BSD", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "CC-BY-4.0", "ISC", "MIT",
  "MPL-2.0", "(BSD-2-Clause OR MIT OR Apache-2.0)", "(MIT OR WTFPL)"
]);
const SYNTHETIC_SECRET_FILES = new Set([
  "scripts/generate-privacy-evidence.mjs",
  "scripts/generate-openai-evaluation-evidence.mjs",
  "packages/domain/test/evidence-pack.test.ts",
  "packages/domain/test/evidence-import.test.ts",
  "packages/domain/test/provider-adapter.test.ts"
]);
const SYNTHETIC_PRIVATE_PATH_FILES = new Set([
  "apps/api/test/evidence-api.test.ts",
  "apps/api/test/runtime-observation-api.test.ts",
  "apps/web/test/cited-explanation-client.test.tsx",
  "apps/web/test/readiness-passport-client.test.tsx",
  "packages/domain/test/evidence-pack.test.ts",
  "packages/domain/test/provider-adapter.test.ts",
  "packages/domain/test/twin-vocabulary.test.ts"
]);
const SECRET_PATTERNS = Object.freeze([
  ["OPENAI_TOKEN", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/gu],
  ["GITHUB_TOKEN", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gu],
  ["AWS_ACCESS_KEY", /\bAKIA[0-9A-Z]{16}\b/gu],
  ["PRIVATE_KEY", /-----BEGIN [A-Z ]*PRIVATE KEY-----/gu],
  ["CREDENTIAL_URL", /https?:\/\/[^\s/@:]+:[^\s/@]+@/gu]
]);
const PROHIBITED_NAMES = Object.freeze([
  /^\.env(?:\..+)?$/iu, /\.(?:pem|key|pfx|p12|crt|cer|jks)$/iu, /^credentials/iu, /^secrets/iu
]);
const FORBIDDEN_SOURCE_MARKERS = Object.freeze([
  "myteams", "devloop-autopilot", "devloop-os-cockpit", "devforge-memory-ui",
  "chatvault", "forgeos", "pushhpa", "lovable"
]);
const PRE_SANITIZATION_R2_HASHES = Object.freeze({
  "planning/r2-development-readiness-2026-08-03/r2-reuse-manifest.json": "sha256:af2bd739300675f04faf33409f084953f2710ec4cfaf0ba9f70e24ea4e15997a",
  "planning/r2-development-readiness-2026-08-03/r2-feature-maturity.json": "sha256:79cbeaa8d662916fc3f489c8241a4918ae51df7c9e8dce46c2b6cfb03412f8a2"
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function logicalPath(path) {
  return path.replaceAll("\\", "/");
}

function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function sha256File(path) {
  return sha256Bytes(await readFile(path));
}

async function collectFiles(absolute, logical, files) {
  const info = await lstat(absolute);
  if (info.isSymbolicLink()) throw new Error(`Candidate source contains a symbolic link: ${logicalPath(logical)}`);
  if (info.isFile()) {
    files.push({ absolute, logical: logicalPath(logical), size: info.size });
    return;
  }
  if (!info.isDirectory()) return;
  for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    if (IGNORED_SEGMENTS.has(entry.name)) continue;
    await collectFiles(join(absolute, entry.name), join(logical, entry.name), files);
  }
}

async function candidateFiles() {
  const files = [];
  for (const root of CANDIDATE_ROOTS) await collectFiles(join(ROOT, root), root, files);
  return files.filter((file) => ![
    "docs/evidence/EV_RELEASE.json",
    "docs/evidence/EV_SECURITY_AUDIT.json",
    "docs/governance/THIRD_PARTY_INVENTORY.json"
  ].includes(file.logical));
}

async function candidateDigest(files) {
  const rows = [];
  for (const file of files) rows.push(`F\0${file.logical}\0${sha256Bytes(await readFile(file.absolute))}\0`);
  return { sha256: sha256Bytes(Buffer.from(rows.join(""), "utf8")), fileCount: files.length };
}

function isTextFile(path) {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase()) || !extname(path);
}

function secretFindings(path, text) {
  const findings = [];
  for (const [kind, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const allowed = SYNTHETIC_SECRET_FILES.has(path) && (
        match[0].includes("example.invalid") ||
        /fixture|abcdefghijklmnopqrstuv/iu.test(match[0]) ||
        kind === "PRIVATE_KEY"
      );
      if (!allowed) findings.push({ path, kind, offset: match.index });
    }
  }
  return findings;
}

function privatePathFindings(path, text) {
  const findings = [];
  const patterns = [/[A-Za-z]:[\\/]Users[\\/]([^\\/\s"']+)[\\/][^\s"']+/gu, /\/(?:Users|home)\/([^/\s"']+)\/[^\s"']+/gu];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const account = match[1]?.toLowerCase();
      const allowed = SYNTHETIC_PRIVATE_PATH_FILES.has(path) && ["fixture", "private"].includes(account);
      if (!allowed) findings.push({ path, kind: "PRIVATE_ABSOLUTE_PATH", offset: match.index });
    }
  }
  return findings;
}

async function scanCandidate(files) {
  const secretProblems = [];
  const privatePathProblems = [];
  const prohibitedFiles = [];
  const similarityMarkers = [];
  const copyrightHeaders = [];
  let textFileCount = 0;
  for (const file of files) {
    if (PROHIBITED_NAMES.some((pattern) => pattern.test(basename(file.logical))) && basename(file.logical) !== ".env.example") prohibitedFiles.push(file.logical);
    if (!isTextFile(file.logical) || file.size > 2_000_000) continue;
    textFileCount += 1;
    const text = await readFile(file.absolute, "utf8");
    secretProblems.push(...secretFindings(file.logical, text));
    privatePathProblems.push(...privatePathFindings(file.logical, text));
    if (/^(?:apps|packages|scripts|\.github)\//u.test(file.logical) && file.logical !== "scripts/generate-release-security-evidence.mjs") {
      const lower = text.toLowerCase();
      for (const marker of FORBIDDEN_SOURCE_MARKERS) if (lower.includes(marker)) similarityMarkers.push({ path: file.logical, marker });
      if (/copyright|all rights reserved|proprietary|confidential/iu.test(text)) copyrightHeaders.push(file.logical);
    }
  }
  assert(secretProblems.length === 0, `Candidate secret scan found ${secretProblems.length} non-fixture match(es).`);
  assert(privatePathProblems.length === 0, `Candidate private-path scan found ${privatePathProblems.length} non-fixture match(es): ${JSON.stringify(privatePathProblems)}.`);
  assert(prohibitedFiles.length === 0, `Candidate contains prohibited secret/config files: ${prohibitedFiles.join(", ")}`);
  assert(similarityMarkers.length === 0 && copyrightHeaders.length === 0, "Candidate implementation contains a prohibited source-origin marker or third-party copyright header.");
  return {
    status: "PASS",
    scannedFileCount: files.length,
    scannedTextFileCount: textFileCount,
    secretPatternCount: SECRET_PATTERNS.length,
    allowedSyntheticSecretFixtureCount: SYNTHETIC_SECRET_FILES.size,
    allowedSyntheticPrivatePathFixtureCount: SYNTHETIC_PRIVATE_PATH_FILES.size,
    nonFixtureSecretFindings: 0,
    nonFixturePrivatePathFindings: 0,
    prohibitedFileFindings: 0
  };
}

function packageNameFromLockPath(lockPath) {
  return lockPath.split("node_modules/").at(-1);
}

function normalizeLicense(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value.type === "string") return value.type.trim();
  if (Array.isArray(value)) return value.map((item) => normalizeLicense(item)).filter(Boolean).join(" OR ");
  return "UNKNOWN";
}

async function installedMetadata(lockPath) {
  const packagePath = join(ROOT, lockPath, "package.json");
  try {
    const metadata = JSON.parse(await readFile(packagePath, "utf8"));
    let licenseFile = null;
    for (const name of (await readdir(join(ROOT, lockPath))).sort()) {
      if (/^(?:licen[cs]e|copying|notice)(?:\..+)?$/iu.test(name)) {
        const info = await stat(join(ROOT, lockPath, name));
        if (info.isFile()) {
          licenseFile = { name, sha256: await sha256File(join(ROOT, lockPath, name)) };
          break;
        }
      }
    }
    return { metadata, licenseFile, source: "INSTALLED_PACKAGE_JSON" };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function registryMetadata(name, version) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
    headers: { accept: "application/json", "user-agent": "intelliloop-release-license-audit/1" }
  });
  assert(response.ok, `npm registry metadata failed for ${name}@${version}: HTTP ${response.status}`);
  return { metadata: await response.json(), licenseFile: null, source: "NPM_REGISTRY_METADATA" };
}

async function mapLimited(values, limit, worker) {
  const result = new Array(values.length);
  let cursor = 0;
  async function run() {
    while (cursor < values.length) {
      const index = cursor++;
      result[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run));
  return result;
}

async function generateInventory() {
  const lock = JSON.parse(await readFile(join(ROOT, "package-lock.json"), "utf8"));
  const rows = Object.entries(lock.packages)
    .filter(([path, entry]) => path.includes("node_modules/") && !entry.link)
    .map(([path, entry]) => ({ path: logicalPath(path), name: packageNameFromLockPath(logicalPath(path)), entry }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const installed = await mapLimited(rows, 12, (row) => installedMetadata(row.path));
  const missingKeys = [...new Set(rows.map((row, index) => installed[index] ? null : `${row.name}\0${row.entry.version}`).filter(Boolean))];
  const registryRows = await mapLimited(missingKeys, 8, async (key) => {
    const [name, version] = key.split("\0");
    return [key, await registryMetadata(name, version)];
  });
  const registry = new Map(registryRows);
  const packages = rows.map((row, index) => {
    const source = installed[index] ?? registry.get(`${row.name}\0${row.entry.version}`);
    assert(source, `No license metadata for ${row.name}@${row.entry.version}.`);
    const license = normalizeLicense(source.metadata.license ?? source.metadata.licenses);
    assert(LICENSE_ALLOWLIST.has(license), `Unapproved or unknown license ${license} for ${row.name}@${row.entry.version}.`);
    return {
      lockPath: row.path,
      name: row.name,
      version: row.entry.version,
      dependencyClass: row.entry.dev ? "DEVELOPMENT" : "PRODUCTION",
      optional: Boolean(row.entry.optional),
      license,
      licenseMetadataSource: source.source,
      licenseFile: source.licenseFile,
      integrity: row.entry.integrity ?? null,
      resolvedRegistryHost: typeof row.entry.resolved === "string" ? new URL(row.entry.resolved).host : null
    };
  });
  const uniquePackageVersions = new Set(packages.map((item) => `${item.name}@${item.version}`)).size;
  const licenseCounts = Object.fromEntries([...new Set(packages.map((item) => item.license))].sort().map((license) => [license, packages.filter((item) => item.license === license).length]));
  const inventory = {
    schemaVersion: 1,
    inventoryId: "INTELLILOOP-THIRD-PARTY-INVENTORY-IL-9.2",
    evidenceDate: EVIDENCE_DATE,
    status: "PASS",
    lockfileSha256: await sha256File(join(ROOT, "package-lock.json")),
    packageInstanceCount: packages.length,
    uniquePackageVersionCount: uniquePackageVersions,
    productionInstanceCount: packages.filter((item) => item.dependencyClass === "PRODUCTION").length,
    developmentInstanceCount: packages.filter((item) => item.dependencyClass === "DEVELOPMENT").length,
    optionalInstanceCount: packages.filter((item) => item.optional).length,
    installedLicenseMetadataCount: packages.filter((item) => item.licenseMetadataSource === "INSTALLED_PACKAGE_JSON").length,
    registryLicenseMetadataCount: packages.filter((item) => item.licenseMetadataSource === "NPM_REGISTRY_METADATA").length,
    unknownOrUnapprovedLicenseCount: 0,
    licenseCounts,
    packages
  };
  await writeFile(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  await writeFile(NOTICES_PATH, renderNotices(inventory), "utf8");
  return inventory;
}

function renderNotices(inventory) {
  const merged = new Map();
  for (const item of inventory.packages) {
    const key = `${item.name}@${item.version}`;
    const current = merged.get(key) ?? { name: item.name, version: item.version, license: item.license, production: false, development: false, optional: false };
    current.production ||= item.dependencyClass === "PRODUCTION";
    current.development ||= item.dependencyClass === "DEVELOPMENT";
    current.optional ||= item.optional;
    merged.set(key, current);
  }
  const rows = [...merged.values()].sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));
  const body = rows.map((item) => `| \`${item.name}\` | \`${item.version}\` | \`${item.license}\` | ${item.production ? "yes" : "no"} | ${item.development ? "yes" : "no"} | ${item.optional ? "yes" : "no"} |`).join("\n");
  return `# Third-Party Dependency and Notice Inventory\n\n**Document ID:** \`DOC-14\`  \n**Status:** \`IL-9.2_RELEASE_INVENTORY_PASS\`  \n**Evidence date:** ${EVIDENCE_DATE}\n\nThis release inventory is generated from the exact npm lockfile. It covers ${inventory.packageInstanceCount} dependency instances and ${inventory.uniquePackageVersionCount} unique package/version pairs, including development and cross-platform optional packages. Internal private \`@intelliloop/*\` workspaces are excluded. The machine-readable [inventory](THIRD_PARTY_INVENTORY.json) records lock paths, integrity values, dependency class, optionality, metadata source and installed license-file hashes where present.\n\nAll declared licenses are approved for this bounded source/prototype distribution. No unknown, unlicensed or proprietary package was found. Upstream package license files remain authoritative; a downstream binary or bundled-node_modules distribution must retain the applicable upstream license/notice files and rerun this audit. MPL-2.0-covered files must remain under MPL-2.0 when distributed or modified; IntelliLoop source is not relicensed by mere dependency aggregation.\n\n## License summary\n\n| SPDX expression | Instances |\n|---|---:|\n${Object.entries(inventory.licenseCounts).map(([license, count]) => `| \`${license}\` | ${count} |`).join("\n")}\n\n## Complete package/version notice table\n\n| Package | Version | Declared license | Production | Development | Optional |\n|---|---:|---|---|---|---|\n${body}\n\n## Verification\n\nRun \`npm.cmd run check:release-security\` to verify lockfile equality, complete inventory coverage, approved licenses, candidate privacy scans and the bound security evidence. Refreshing registry advisory/license observations is an explicit release action: \`npm.cmd run evidence:release-security\`.\n\nThe npm advisory result is recorded separately in [EV-SECURITY-AUDIT](../evidence/EV_SECURITY_AUDIT.json) because vulnerability data changes over time.\n`;
}

async function runNpmAudit(args) {
  const npmPath = process.env.npm_execpath;
  assert(typeof npmPath === "string" && npmPath.length > 0, "Run through the npm script so the pinned npm CLI is explicit.");
  const child = spawn(process.execPath, [npmPath, "audit", ...args, "--json"], { cwd: ROOT, shell: false, windowsHide: true });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { output += chunk.toString("utf8"); });
  const code = await new Promise((resolveCode, reject) => {
    child.once("error", reject);
    child.once("close", resolveCode);
  });
  const report = JSON.parse(output);
  const vulnerabilities = report.metadata?.vulnerabilities;
  assert(vulnerabilities && typeof vulnerabilities.total === "number", "npm audit did not return vulnerability metadata.");
  assert(code === 0 && vulnerabilities.total === 0, `npm audit found ${vulnerabilities.total} vulnerability finding(s): ${JSON.stringify(report.vulnerabilities)}.`);
  return { status: "PASS", reportVersion: report.auditReportVersion, vulnerabilities, dependencyMetadata: report.metadata.dependencies };
}

async function verifyInventory(inventory) {
  const lock = JSON.parse(await readFile(join(ROOT, "package-lock.json"), "utf8"));
  const lockRows = Object.entries(lock.packages).filter(([path, entry]) => path.includes("node_modules/") && !entry.link);
  assert(inventory.status === "PASS" && inventory.lockfileSha256 === await sha256File(join(ROOT, "package-lock.json")), "Third-party inventory lockfile binding has drifted.");
  assert(inventory.packageInstanceCount === lockRows.length && inventory.packages.length === lockRows.length, "Third-party inventory coverage is incomplete.");
  assert(inventory.packages.every((item) => LICENSE_ALLOWLIST.has(item.license)), "Third-party inventory contains an unapproved license.");
  assert(inventory.unknownOrUnapprovedLicenseCount === 0, "Third-party inventory has unknown or unapproved licenses.");
}

async function localOnlyBoundary() {
  const ignore = await readFile(join(ROOT, ".gitignore"), "utf8");
  for (const root of LOCAL_ONLY_ROOTS) assert(ignore.split(/\r?\n/u).includes(`${root}/`), `${root}/ is not excluded from candidate versioning.`);
  return { status: "PASS", excludedRoots: LOCAL_ONLY_ROOTS, releaseAuthority: "CANDIDATE_ALLOWLIST_ONLY" };
}

async function provenanceEvidence() {
  const manifestPath = join(ROOT, "planning", "r2-development-readiness-2026-08-03", "r2-reuse-manifest.json");
  const maturityPath = join(ROOT, "planning", "r2-development-readiness-2026-08-03", "r2-feature-maturity.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const serialized = `${await readFile(manifestPath, "utf8")}\n${await readFile(maturityPath, "utf8")}`;
  assert(manifest.decision === "SOURCE_INDEPENDENT_BUILD" && manifest.directSourceCopyAuthorized === false, "Source-independent decision is missing.");
  assert(Array.isArray(manifest.reuse) && manifest.reuse.length === 0 && Array.isArray(manifest.adapt) && manifest.adapt.length === 0, "Reuse/adapt manifest is not empty.");
  assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(serialized), "R2 release planning still contains a private absolute path.");
  return {
    status: "PASS",
    decision: manifest.decision,
    directSourceCopyAuthorized: false,
    reuseCount: 0,
    adaptCount: 0,
    releaseSanitization: {
      reason: "Machine-local absolute roots were replaced with logical local-reference identifiers without changing source-use dispositions.",
      originalArtifactHashes: PRE_SANITIZATION_R2_HASHES,
      sanitizedArtifactHashes: {
        "planning/r2-development-readiness-2026-08-03/r2-reuse-manifest.json": await sha256File(manifestPath),
        "planning/r2-development-readiness-2026-08-03/r2-feature-maturity.json": await sha256File(maturityPath)
      }
    }
  };
}

async function safetyEvidence() {
  const privacyPath = join(ROOT, "docs", "evidence", "EV_PRIVACY.json");
  const repositoryPath = join(ROOT, "docs", "evidence", "EV_REPO_SAFETY.json");
  const privacy = JSON.parse(await readFile(privacyPath, "utf8"));
  const repository = JSON.parse(await readFile(repositoryPath, "utf8"));
  assert(privacy.status === "PASS" && repository.status === "PASS", "Privacy or repository-safety evidence is not passing.");
  return {
    status: "PASS",
    privacy: { status: privacy.status, sha256: await sha256File(privacyPath) },
    repositoryMutation: { status: repository.status, sha256: await sha256File(repositoryPath) },
    productExternalProviderCalls: 0,
    productRegisteredRepositoryWrites: 0
  };
}

async function buildEvidence(inventory) {
  const files = await candidateFiles();
  const scan = await scanCandidate(files);
  const evidence = {
    schemaVersion: 1,
    evidenceId: "EV-SECURITY-AUDIT",
    story: "IL-9.2",
    status: "PASS",
    checkpoint: "RELEASE_SECURITY_AUDIT_COMPLETE",
    evidenceDate: EVIDENCE_DATE,
    reproductionCommand: "npm.cmd run evidence:release-security",
    candidate: { ...(await candidateDigest(files)), boundary: await localOnlyBoundary() },
    dependencies: {
      status: "PASS",
      fullAudit: await runNpmAudit([]),
      productionAudit: await runNpmAudit(["--omit=dev"]),
      inventory: {
        path: "docs/governance/THIRD_PARTY_INVENTORY.json",
        sha256: await sha256File(INVENTORY_PATH),
        packageInstanceCount: inventory.packageInstanceCount,
        uniquePackageVersionCount: inventory.uniquePackageVersionCount,
        productionInstanceCount: inventory.productionInstanceCount,
        developmentInstanceCount: inventory.developmentInstanceCount,
        optionalInstanceCount: inventory.optionalInstanceCount,
        unknownOrUnapprovedLicenseCount: inventory.unknownOrUnapprovedLicenseCount
      }
    },
    candidatePrivacyScan: scan,
    provenance: await provenanceEvidence(),
    similarityReview: {
      status: "PASS_BOUNDED_REVIEW",
      implementationFileMarkerFindings: 0,
      thirdPartyCopyrightHeaderFindings: 0,
      method: "Static marker/header scan plus the frozen zero-reuse/zero-adapt clean-room manifest.",
      limitation: "No external proprietary source corpus was imported or compared; this is not a universal plagiarism determination."
    },
    networkAndMutation: await safetyEvidence(),
    limitations: [
      "npm advisory data is time-sensitive and must be refreshed at final freeze.",
      "Pattern scans and bounded marker review cannot prove absence of every transformed secret or similarity.",
      "This is a source/prototype release audit, not a penetration test, OS sandbox certification, legal opinion or production approval."
    ],
    nextAuthorizedStory: "IL-9.4"
  };
  assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(JSON.stringify(evidence)), "Security evidence contains a private absolute path.");
  return evidence;
}

async function verifyEvidence(evidence, inventory) {
  await verifyInventory(inventory);
  const files = await candidateFiles();
  await scanCandidate(files);
  assert(evidence.evidenceId === "EV-SECURITY-AUDIT" && evidence.story === "IL-9.2" && evidence.status === "PASS", "IL-9.2 evidence is not passing.");
  assert(evidence.dependencies?.fullAudit?.vulnerabilities?.total === 0 && evidence.dependencies?.productionAudit?.vulnerabilities?.total === 0, "Recorded npm audit is not clean.");
  assert(evidence.dependencies.inventory.sha256 === await sha256File(INVENTORY_PATH), "Third-party inventory hash has drifted.");
  assert(JSON.stringify(evidence.candidate) === JSON.stringify({ ...(await candidateDigest(files)), boundary: await localOnlyBoundary() }), "Candidate digest or boundary has drifted.");
  assert(JSON.stringify(evidence.provenance) === JSON.stringify(await provenanceEvidence()), "Provenance evidence has drifted.");
  assert(JSON.stringify(evidence.networkAndMutation) === JSON.stringify(await safetyEvidence()), "Network or mutation evidence has drifted.");
  assert(evidence.nextAuthorizedStory === "IL-9.4", "Next story authority is incorrect.");
}

assert(Number(REFRESH) + Number(VERIFY) === 1, "Use exactly one of --refresh or --verify-existing.");

if (REFRESH) {
  const inventory = await generateInventory();
  await verifyInventory(inventory);
  const evidence = await buildEvidence(inventory);
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await verifyEvidence(evidence, inventory);
  console.log(`EV-SECURITY-AUDIT PASS packages=${inventory.packageInstanceCount} vulnerabilities=0 secrets=0 similarity=PASS_BOUNDED_REVIEW`);
} else {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
  const evidence = JSON.parse(await readFile(EVIDENCE_PATH, "utf8"));
  await verifyEvidence(evidence, inventory);
  console.log(`EV-SECURITY-AUDIT PASS verify-existing packages=${inventory.packageInstanceCount} vulnerabilities=0`);
}
