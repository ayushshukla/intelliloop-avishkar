import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_DIRECTORY = join(ROOT, "docs", "evidence");
const UNIT_FILES = Object.freeze([
  "packages/domain/test/readiness-evaluation.test.ts",
  "packages/domain/test/readiness-assessment.test.ts",
  "apps/web/test/readiness-passport-client.test.tsx"
]);
const API_FILES = Object.freeze([
  "apps/api/test/readiness-repository.test.ts",
  "apps/api/test/readiness-passport-api.test.ts"
]);
const SOURCE_FILES = Object.freeze([
  "packages/domain/src/readiness-evaluation.ts",
  "packages/domain/src/readiness-assessment.ts",
  "packages/domain/src/release-passport.ts",
  "apps/api/src/readiness/readiness-service.ts",
  "apps/api/src/readiness/readiness-repository.ts",
  "apps/api/src/passports/passport-service.ts",
  "apps/api/src/passports/passport-repository.ts",
  "apps/api/src/readiness/readiness-passport-routes.ts",
  "apps/web/src/readiness-passport-client.ts",
  "apps/web/src/ReadinessPassportWorkspace.tsx"
]);
const E2E_TITLE = "renders server-owned BLOCKED, READY and STALE readiness with an unsigned Passport";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, CI: "1" }
  });
  assert(result.status === 0, `${label} failed.`);
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function runVitest(label, config, files, outputFile) {
  run(label, process.execPath, [
    join(ROOT, "node_modules", "vitest", "vitest.mjs"),
    "run", "--config", config, "--reporter=json", "--outputFile", outputFile, ...files
  ]);
  const report = JSON.parse(readFileSync(outputFile, "utf8"));
  const assertions = (report.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? []).map((entry) => ({
      name: entry.fullName ?? [...(entry.ancestorTitles ?? []), entry.title].join(" "),
      status: entry.status
    }))
  );
  assert(assertions.length > 0, `${label} produced no assertions.`);
  assert(assertions.every((entry) => entry.status === "passed"), `${label} was not fully green.`);
  return Object.freeze({
    files: [...files],
    tests: assertions.length,
    names: assertions.map((entry) => entry.name)
  });
}

function includes(names, fragment) {
  return names.some((name) => name.includes(fragment));
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex")}`;
}

function sourceIntegrity() {
  return Object.fromEntries(SOURCE_FILES.map((path) => [path, sha256(path)]));
}

function assertDeterministicAuthorityBoundaries() {
  const evaluator = readFileSync(join(ROOT, "packages/domain/src/readiness-evaluation.ts"), "utf8");
  const passport = readFileSync(join(ROOT, "packages/domain/src/release-passport.ts"), "utf8");
  const routes = readFileSync(
    join(ROOT, "apps/api/src/readiness/readiness-passport-routes.ts"), "utf8"
  );
  const workspace = readFileSync(
    join(ROOT, "apps/web/src/ReadinessPassportWorkspace.tsx"), "utf8"
  );
  assert(!/\bfetch\s*\(/u.test(evaluator), "Readiness evaluator contains a network call.");
  assert(!/\bfetch\s*\(/u.test(passport), "Passport projection contains a network call.");
  assert(!/process\.env|OPENAI|provider/iu.test(passport), "Passport projection contains provider authority.");
  assert(routes.includes("maxProperties: 0"), "Mutation routes do not enforce an empty body.");
  assert(routes.includes("additionalProperties: false"), "Mutation routes accept unknown fields.");
  assert(!workspace.includes("evaluateReadiness"), "Browser workspace recomputes readiness.");
}

function safeWrite(path, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assert(
    !/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\/|\bsk-[A-Za-z0-9_-]{12,}/u.test(serialized),
    "Evidence output contains a private path or credential-shaped value."
  );
  writeFileSync(path, serialized, "utf8");
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "intelliloop-readiness-proof-"));
try {
  const unit = runVitest(
    "Focused readiness, Passport and browser-contract unit proof",
    "vitest.unit.config.ts",
    UNIT_FILES,
    join(temporaryDirectory, "unit.json")
  );
  const api = runVitest(
    "Focused persistence and production-route integration proof",
    "vitest.api.config.ts",
    API_FILES,
    join(temporaryDirectory, "api.json")
  );
  run(
    "Focused readiness and Passport browser proof",
    process.execPath,
    [join(ROOT, "scripts", "run-e2e.mjs"), "--grep", E2E_TITLE]
  );
  assertDeterministicAuthorityBoundaries();

  const allNames = [...unit.names, ...api.names];
  const falseReadyCases = unit.names.filter((name) =>
    /fails closed|maps open .*finding|rejects fallback and incomplete code maps/u.test(name)
  );
  assert(
    includes(unit.names, "returns READY only for every satisfied obligation"),
    "The controlled READY case did not execute."
  );
  assert(falseReadyCases.length >= 20, "The controlled non-READY matrix is incomplete.");
  assert(
    includes(unit.names, "canonical equality and rejects changed projection content or digest"),
    "Passport canonical-equality proof did not execute."
  );
  assert(
    includes(api.names, "fails closed when persisted assessment or Passport canonical bytes are corrupted"),
    "Persistence corruption proof did not execute."
  );
  assert(
    includes(api.names, "through production API and browser contracts across restart without AI or scope leakage"),
    "Cross-layer restart and isolation proof did not execute."
  );

  const common = {
    schemaVersion: 1,
    story: "IL-7.5",
    status: "PASS",
    evidenceDate: "2026-08-06",
    fixtureKind: "CONTROLLED_LOCAL_DETERMINISTIC",
    reproductionCommand: "npm.cmd run evidence:readiness-passport",
    execution: {
      unitFiles: unit.files,
      unitTests: unit.tests,
      apiFiles: api.files,
      apiTests: api.tests,
      browserTests: 1,
      totalFocusedTests: unit.tests + api.tests + 1
    },
    layerCoverage: ["DOMAIN", "SQLITE", "PRODUCTION_API_ROUTES", "BROWSER_DECODER", "BROWSER_UI"],
    sourceIntegrity: sourceIntegrity(),
    safety: {
      externalCallMade: false,
      providerRequired: false,
      sourceBodiesPersistedInEvidence: false,
      absolutePathsPersistedInEvidence: false,
      credentialsPersistedInEvidence: false
    },
    limitations: [
      "This is deterministic local implementation evidence, not a production release approval.",
      "The Passport is an unsigned projection and grants no deployment authority.",
      "Phase 8 owns the final golden-demo fixture and end-to-end operator walkthrough."
    ],
    nextAuthorizedStory: "IL-7.6"
  };

  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  safeWrite(join(OUTPUT_DIRECTORY, "EV_READINESS.json"), {
    ...common,
    evidenceId: "EV-READINESS",
    capability: "DC-07",
    conclusion: "No controlled negative case produced READY, and server-owned state survived restart without project leakage or external AI calls.",
    proofs: {
      readyPositiveCases: 1,
      controlledNonReadyCases: falseReadyCases.length,
      controlledFalseReadyCount: 0,
      persistenceCorruptionFailsClosed: true,
      restartRecovery: true,
      projectAndMissionIsolation: true,
      browserConsumesServerStatusWithoutRecomputation: true,
      mutationInputsAreEmptyAndServerOwned: true
    }
  });
  safeWrite(join(OUTPUT_DIRECTORY, "EV_PASSPORT.json"), {
    ...common,
    evidenceId: "EV-PASSPORT",
    capability: "DC-08",
    conclusion: "The persisted Passport is an exact canonical projection of its assessment and remains explicitly unsigned and non-authoritative across API, browser and restart boundaries.",
    proofs: {
      exactAssessmentProjection: true,
      canonicalEqualityAndDigestBinding: true,
      changedProjectionRejected: true,
      persistenceCorruptionFailsClosed: true,
      restartRecovery: true,
      projectAndMissionIsolation: true,
      browserContractAndPresentation: true,
      signed: false,
      releaseApproval: false,
      deploymentAuthority: false,
      aiAuthority: "NONE"
    }
  });

  console.log(`Readiness and Passport evidence PASS (${unit.tests + api.tests + 1} focused tests).`);
  console.log("Wrote docs/evidence/EV_READINESS.json and docs/evidence/EV_PASSPORT.json.");
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
