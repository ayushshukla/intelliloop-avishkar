import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { INTELLILOOP_RETAIL_CANCELLATION_FIXTURE as fixture } from
  "../packages/demo-fixtures/dist/index.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, "docs", "evidence", "EV_RETAIL_FIXTURE.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort((left, right) => left.localeCompare(right, "en-US"))
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function manifest(files) {
  return files.map((file) => ({
    path: file.path,
    mediaType: file.mediaType,
    bytes: Buffer.byteLength(file.content, "utf8"),
    sha256: sha256(file.content)
  })).sort((left, right) => left.path.localeCompare(right.path, "en-US"));
}

function treeDigest(fileManifest) {
  return sha256(canonical(fileManifest.map(({ path, sha256: digest }) => ({ path, sha256: digest }))));
}

const initialFiles = [...fixture.repository.initialRevision.files];
const correctedFiles = new Map(initialFiles.map((file) => [file.path, file]));
for (const change of fixture.repository.correctionRevision.changes) {
  correctedFiles.set(change.path, {
    path: change.path,
    mediaType: change.mediaType,
    content: change.content
  });
}
const initialManifest = manifest(initialFiles);
const correctedManifest = manifest([...correctedFiles.values()]);
const evidenceManifest = fixture.evidence.map((entry) => ({
  evidenceKey: entry.evidenceKey,
  phase: entry.phase,
  sourceLocator: entry.sourceLocator,
  bytes: Buffer.byteLength(entry.content, "utf8"),
  sha256: sha256(entry.content)
})).sort((left, right) => left.evidenceKey.localeCompare(right.evidenceKey, "en-US"));

assert(fixture.synthetic === true, "Retail fixture is not marked synthetic.");
assert(fixture.ownership === "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY", "Retail fixture ownership is invalid.");
assert(fixture.requiresNetwork === false && fixture.executesRepositoryCode === false,
  "Retail fixture widens network or execution authority.");
assert(fixture.loaderBoundary.materializationImplemented === false,
  "IL-8.1 must not pre-implement materialization.");
assert(fixture.loaderBoundary.resetImplemented === false, "IL-8.1 must not pre-implement reset.");
assert(initialManifest.length === 9 && correctedManifest.length === 10,
  "Retail repository revision counts are invalid.");
assert(evidenceManifest.length === 9, "Retail evidence count is invalid.");
assert(fixture.claims.length === 7 && fixture.validations.length === 4,
  "Retail claim or validation count is invalid.");
assert(new Set(initialManifest.map((entry) => entry.path)).size === initialManifest.length,
  "Initial repository contains duplicate paths.");
assert(new Set(evidenceManifest.map((entry) => entry.sourceLocator)).size === evidenceManifest.length,
  "Retail evidence contains duplicate locators.");

const serializedFixture = canonical(fixture);
assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(serializedFixture),
  "Retail fixture contains a private absolute path.");
assert(!/\b(?:password|secret|api[_-]?key)\s*[=:]/iu.test(serializedFixture),
  "Retail fixture contains a credential-shaped value.");
assert(!/@nisum\.|\bNisum\b/iu.test(serializedFixture),
  "Retail fixture contains company data.");

const report = {
  schemaVersion: 1,
  evidenceId: "EV-RETAIL-FIXTURE",
  story: "IL-8.1",
  status: "PASS",
  evidenceDate: "2026-08-06",
  fixtureVersion: fixture.fixtureVersion,
  fixtureId: fixture.fixtureId,
  ownership: fixture.ownership,
  synthetic: fixture.synthetic,
  provenance: fixture.provenance,
  scenario: {
    change: fixture.scenario.change,
    expectedStateSequence: fixture.scenario.expectedStateSequence,
    authority: fixture.scenario.authority
  },
  counts: {
    initialRepositoryFiles: initialManifest.length,
    correctedRepositoryFiles: correctedManifest.length,
    correctionChanges: fixture.repository.correctionRevision.changes.length,
    evidenceDrafts: evidenceManifest.length,
    claimDrafts: fixture.claims.length,
    validationDrafts: fixture.validations.length,
    supportRequirements: fixture.supportRequirements.length,
    impactRequirements: fixture.impact.requirements.length
  },
  deterministicIntegrity: {
    fixtureDigest: sha256(serializedFixture),
    initialRepositoryTreeDigest: treeDigest(initialManifest),
    correctedRepositoryTreeDigest: treeDigest(correctedManifest),
    evidenceSetDigest: sha256(canonical(evidenceManifest)),
    initialRepositoryFiles: initialManifest,
    correctedRepositoryFiles: correctedManifest,
    evidenceDrafts: evidenceManifest
  },
  coverage: {
    cancellationConflict: true,
    inventoryOwnershipConflict: true,
    apparentlyGreenReleaseClaim: true,
    initialPartialValidation: true,
    inventoryImpact: true,
    refundImpact: true,
    fulfilmentImpact: true,
    notificationImpact: true,
    supersedingDecision: true,
    correctedImplementation: true,
    missingValidationsAdded: true,
    explicitSyntheticHumanReview: true
  },
  safety: {
    containsPersonalData: fixture.containsPersonalData,
    containsEmployerOrClientData: fixture.containsEmployerOrClientData,
    containsPrivateAbsolutePaths: false,
    containsCredentialShapes: false,
    requiresNetwork: fixture.requiresNetwork,
    executesRepositoryCode: fixture.executesRepositoryCode,
    precomputedProductState: false
  },
  loaderBoundary: fixture.loaderBoundary,
  limitations: [
    "Fixture declarations are inert data; IL-8.2 owns materialization, Git commits and scoped reset.",
    "Validation drafts are attributed synthetic results with executed=false, not observed test executions.",
    "Expected BLOCKED, READY and STALE are demo intentions until the real product path proves them in IL-8.3."
  ],
  nextAuthorizedStory: "IL-8.2"
};

const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
assert(!/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u.test(serializedReport),
  "Retail evidence output contains a private path.");
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, serializedReport, "utf8");
console.log(`Retail fixture evidence PASS (${initialManifest.length} initial files, ${evidenceManifest.length} evidence drafts).`);
console.log("Wrote docs/evidence/EV_RETAIL_FIXTURE.json.");
