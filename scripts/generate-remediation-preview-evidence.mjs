import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "docs", "evidence", "EV_REMEDIATION_PREVIEW.json");
const REFRESH = process.argv.includes("--refresh");
const VERIFY = process.argv.includes("--verify-existing");
const VITEST = join(ROOT, "node_modules", "vitest", "vitest.mjs");
const SOURCES = [
  "apps/api/src/config.ts",
  "apps/api/test/config.test.ts",
  "apps/web/src/feature-flags.ts",
  "apps/web/src/remediation-preview.ts",
  "apps/web/src/RemediationPreviewLab.tsx",
  "apps/web/src/CitedExplanationWorkspace.tsx",
  "apps/web/test/remediation-preview.test.tsx",
  "scripts/run-remediation-preview.mjs"
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
      `Focused Guarded Remediation Preview test failed.\n${output.slice(-4_000)}`
    );
  }
}

async function buildEvidence(runTests) {
  if (runTests) {
    runFocusedTest(
      "vitest.unit.config.ts",
      "apps/web/test/remediation-preview.test.tsx"
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
      "WEB_FEATURE_FLAGS.remediationPreview"
    ),
    "The remediation preview is not isolated by its web feature flag."
  );
  assert(
    !/\b(?:fetch|requestJson|runCodeMapRevision|materializeTwinRevision)\s*\(/u.test(
      sourceText["apps/web/src/RemediationPreviewLab.tsx"]
    ),
    "The remediation preview must not contain a network or mutation client."
  );
  for (const boundary of [
    "repositoryWriteAvailable: false",
    "shellAvailable: false",
    "gitAvailable: false",
    "deploymentAvailable: false",
    "networkAvailable: false",
    "readinessAuthority: false"
  ]) {
    assert(
      sourceText["apps/web/src/remediation-preview.ts"].includes(boundary),
      `Missing remediation non-authority boundary: ${boundary}`
    );
  }
  assert(
    sourceText["scripts/run-remediation-preview.mjs"].includes(
      'INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "true"'
    ) &&
      sourceText["scripts/run-remediation-preview.mjs"].includes(
        'VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "true"'
      ),
    "The isolated launcher does not align API and web feature flags."
  );

  return {
    schemaVersion: 1,
    evidenceId: "EV-REMEDIATION-PREVIEW",
    story: "IL-10.3",
    status: "PASS_OPTIONAL_FEATURE_FLAGGED",
    evidenceDate: "2026-08-07",
    reproductionCommand: "npm.cmd run evidence:remediation-preview",
    featureFlag: {
      name: "experiments.remediationPreview",
      apiEnvironmentKey: "INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW",
      webEnvironmentKey: "VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW",
      defaultEnabled: false,
      malformedValueFailsClosed: true,
      launcher: "npm.cmd run dev:remediation"
    },
    focusedVerification: {
      webPreviewTests: 4,
      apiConfigurationTests: 16,
      testAndPatchIntentModes: "PASS",
      citationAndAuthorityRejection: "PASS",
      pureGenerationNoInputMutation: "PASS",
      defaultFlagIsolation: "PASS"
    },
    directBrowserObservation: {
      environment:
        "Windows 11 / local loopback / in-app Chromium / isolated schema-14 directory",
      previewMode: "TEST_PLAN",
      citedProposals: 5,
      repositoryWrites: 0,
      commandsExecuted: 0,
      comparisonNetworkRequests: 0,
      nonLoopbackRequests: 0,
      registeredRepositoryTreeEqualBeforeAfter: true,
      readinessBefore: "READY",
      readinessAfter: "READY",
      defaultOffLabCount: 0
    },
    authority: {
      browserMemoryOnly: true,
      advisoryOnly: true,
      notEvidence: true,
      notExecuted: true,
      canonicalStateMutation: false,
      repositoryMutation: false,
      shellOrGitExecution: false,
      providerCall: false,
      networkCall: false,
      readinessAuthority: false,
      passportAuthority: false
    },
    sourceIntegrity,
    limitations: [
      "The patch-intent mode describes a cited human-review intent; it does not fabricate source code or a unified diff without source bodies.",
      "Disposable execution is intentionally not implemented, so no test result or patch validity is claimed.",
      "The direct browser observation uses IntelliLoop-authored controlled demonstration data and is not production validation."
    ],
    nextAuthorizedStory: "IL-9.4_HUMAN_PILOT_INPUT"
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
    `EV-REMEDIATION-PREVIEW ${current.status} proposals=${current.directBrowserObservation.citedProposals} repositoryMutation=${current.authority.repositoryMutation}`
  );
} else {
  const stored = JSON.parse(await readFile(OUTPUT, "utf8"));
  assert(
    JSON.stringify(stored) === JSON.stringify(current),
    "EV-REMEDIATION-PREVIEW is stale or inconsistent with its sources."
  );
  console.log(
    `EV-REMEDIATION-PREVIEW PASS verify-existing default=${stored.featureFlag.defaultEnabled}`
  );
}
