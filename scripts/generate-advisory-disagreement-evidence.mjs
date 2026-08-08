import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "docs", "evidence", "EV_ADVISORY_DISAGREEMENT.json");
const REFRESH = process.argv.includes("--refresh");
const VERIFY = process.argv.includes("--verify-existing");
const VITEST = join(ROOT, "node_modules", "vitest", "vitest.mjs");
const SOURCES = [
  "apps/api/src/config.ts",
  "apps/api/test/config.test.ts",
  "apps/web/src/feature-flags.ts",
  "apps/web/src/advisory-disagreement.ts",
  "apps/web/src/AdvisoryDisagreementLab.tsx",
  "apps/web/src/CitedExplanationWorkspace.tsx",
  "apps/web/test/advisory-disagreement.test.tsx",
  "scripts/run-advisory-disagreement.mjs"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function runFocusedTest(config, testFile) {
  const result = spawnSync(
    process.execPath,
    [VITEST, "run", "--config", config, testFile],
    {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: "1" },
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    }
  );
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `Focused Advisory-output Disagreement test failed.\n${output.slice(-4_000)}`
    );
  }
}

async function buildEvidence(runTests) {
  if (runTests) {
    runFocusedTest(
      "vitest.unit.config.ts",
      "apps/web/test/advisory-disagreement.test.tsx"
    );
    runFocusedTest("vitest.api.config.ts", "apps/api/test/config.test.ts");
  }

  const sourceIntegrity = {};
  const sourceText = {};
  for (const path of SOURCES) {
    const bytes = await readFile(join(ROOT, path));
    sourceIntegrity[path] = sha256(bytes);
    sourceText[path] = bytes.toString("utf8");
  }

  assert(
    sourceText["apps/web/src/CitedExplanationWorkspace.tsx"].includes(
      "WEB_FEATURE_FLAGS.agentDisagreement"
    ),
    "The disagreement lab is not isolated by its web feature flag."
  );
  assert(
    !/\b(?:fetch|requestJson|createCitedExplanation)\s*\(/u.test(
      sourceText["apps/web/src/AdvisoryDisagreementLab.tsx"]
    ),
    "The disagreement lab must not contain a network request surface."
  );
  assert(
    sourceText["apps/web/src/advisory-disagreement.ts"].includes(
      'semanticContradictionInferred: false'
    ) &&
      sourceText["apps/web/src/advisory-disagreement.ts"].includes(
        'readinessAuthority: false'
      ) &&
      sourceText["apps/web/src/advisory-disagreement.ts"].includes(
        'liveOrchestration: false'
      ),
    "The disagreement result lacks its explicit non-authority boundary."
  );
  assert(
    sourceText["scripts/run-advisory-disagreement.mjs"].includes(
      'INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT: "true"'
    ) &&
      sourceText["scripts/run-advisory-disagreement.mjs"].includes(
        'VITE_INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT: "true"'
      ),
    "The isolated launcher does not align API and web feature flags."
  );

  return {
    schemaVersion: 1,
    evidenceId: "EV-ADVISORY-DISAGREEMENT",
    story: "IL-10.2",
    status: "PASS_OPTIONAL_FEATURE_FLAGGED",
    evidenceDate: "2026-08-07",
    reproductionCommand: "npm.cmd run evidence:advisory-disagreement",
    featureFlag: {
      name: "experiments.agentDisagreement",
      apiEnvironmentKey: "INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT",
      webEnvironmentKey: "VITE_INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT",
      defaultEnabled: false,
      malformedValueFailsClosed: true,
      launcher: "npm.cmd run dev:disagreement"
    },
    focusedVerification: {
      webImportAndComparisonTests: 4,
      apiConfigurationTests: 16,
      scopeAndCitationRejection: "PASS",
      forbiddenAuthorityRejection: "PASS",
      pureComparisonNoInputMutation: "PASS",
      defaultFlagIsolation: "PASS"
    },
    directBrowserObservation: {
      environment:
        "Windows 11 / local loopback / in-app Chromium / isolated schema-14 directory",
      importedOutputs: 2,
      exactTextGroups: 3,
      alignedExactly: 0,
      citationVariance: 1,
      outputOnly: 2,
      comparisonNetworkRequests: 0,
      nonLoopbackRequests: 0,
      readinessBefore: "READY",
      readinessAfter: "READY",
      controlledExampleLabelVisible: true
    },
    authority: {
      browserMemoryOnly: true,
      semanticContradictionInferred: false,
      canonicalStateMutation: false,
      readinessAuthority: false,
      passportAuthority: false,
      providerCall: false,
      liveOrchestration: false,
      repositoryExecution: false
    },
    sourceIntegrity,
    limitations: [
      "The comparator detects normalized exact-text membership and citation-set variance; it does not infer semantic agreement, contradiction, quality or truth.",
      "Imported attribution is operator supplied and is not identity verification or provider attestation.",
      "The direct browser observation uses IntelliLoop-authored controlled demonstration data and is not production validation."
    ],
    nextAuthorizedStory: "IL-9.4_HUMAN_PILOT_INPUT_OR_IL-10.3_OPTIONAL"
  };
}

assert(
  Number(REFRESH) + Number(VERIFY) === 1,
  "Use exactly one of --refresh or --verify-existing."
);
const current = await buildEvidence(REFRESH);
if (REFRESH) {
  await writeFile(OUTPUT, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(
    `EV-ADVISORY-DISAGREEMENT ${current.status} differences=${current.directBrowserObservation.exactTextGroups} externalCalls=${current.authority.providerCall}`
  );
} else {
  const stored = JSON.parse(await readFile(OUTPUT, "utf8"));
  assert(
    JSON.stringify(stored) === JSON.stringify(current),
    "EV-ADVISORY-DISAGREEMENT is stale or inconsistent with its sources."
  );
  console.log(
    `EV-ADVISORY-DISAGREEMENT PASS verify-existing default=${stored.featureFlag.defaultEnabled}`
  );
}
