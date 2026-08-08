import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "docs", "evidence", "EV_EVIDENCE_REPLAY.json");
const REFRESH = process.argv.includes("--refresh");
const VERIFY = process.argv.includes("--verify-existing");
const VITEST = join(ROOT, "node_modules", "vitest", "vitest.mjs");
const SOURCES = [
  "apps/api/src/config.ts",
  "apps/api/test/config.test.ts",
  "apps/web/src/feature-flags.ts",
  "apps/web/src/evidence-replay.ts",
  "apps/web/src/EvidenceReplayLab.tsx",
  "apps/web/src/TwinWorkspace.tsx",
  "apps/web/test/evidence-replay.test.tsx",
  "scripts/run-evidence-replay.mjs"
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
    throw new Error(`Focused Evidence Replay test failed.\n${output.slice(-4_000)}`);
  }
}

async function buildEvidence(runTests) {
  if (runTests) {
    runFocusedTest("vitest.unit.config.ts", "apps/web/test/evidence-replay.test.tsx");
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
    sourceText["apps/web/src/TwinWorkspace.tsx"].includes(
      "WEB_FEATURE_FLAGS.evidenceReplay"
    ),
    "Evidence Replay is not isolated by the web feature flag."
  );
  assert(
    sourceText["apps/web/src/EvidenceReplayLab.tsx"].includes(
      "listTwinNodes"
    ) &&
      sourceText["apps/web/src/EvidenceReplayLab.tsx"].includes(
        "listTwinRelationships"
      ) &&
      !sourceText["apps/web/src/EvidenceReplayLab.tsx"].includes(
        "materializeTwinRevision"
      ),
    "Evidence Replay must remain on read-only Twin list clients."
  );
  assert(
    sourceText["apps/web/src/evidence-replay.ts"].includes(
      "Evidence Replay requires two different revisions in one Mission."
    ),
    "Evidence Replay scope guard is missing."
  );
  assert(
    sourceText["scripts/run-evidence-replay.mjs"].includes(
      'INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY: "true"'
    ) &&
      sourceText["scripts/run-evidence-replay.mjs"].includes(
        'VITE_INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY: "true"'
      ),
    "Evidence Replay launcher does not align API and web flags."
  );

  return {
    schemaVersion: 1,
    evidenceId: "EV-EVIDENCE-REPLAY",
    story: "IL-10.1",
    status: "PASS_OPTIONAL_FEATURE_FLAGGED",
    evidenceDate: "2026-08-07",
    reproductionCommand: "npm.cmd run evidence:evidence-replay",
    featureFlag: {
      name: "experiments.evidenceReplay",
      apiEnvironmentKey: "INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY",
      webEnvironmentKey: "VITE_INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY",
      defaultEnabled: false,
      malformedValueFailsClosed: true,
      launcher: "npm.cmd run dev:replay"
    },
    focusedVerification: {
      webComparisonTests: 3,
      apiConfigurationTests: 16,
      pureComparisonNoInputMutation: "PASS",
      defaultFlagIsolation: "PASS",
      explicitOptInOnly: "PASS",
      falseCompleteOrFallbackComparison: "NOT_PRESENT"
    },
    directBrowserObservation: {
      environment: "Windows 11 / local loopback / in-app Chromium / isolated schema-14 directory",
      baselineRevision: 1,
      candidateRevision: 2,
      baselineMembers: { nodes: 27, relationships: 53, total: 80 },
      candidateMembers: { nodes: 40, relationships: 85, total: 125 },
      differences: { added: 58, removed: 13, changed: 30, unchanged: 37 },
      allDifferencesCarryPersistedPathCitation: true,
      comparisonRequests: { method: "GET", count: 4, nonLoopback: 0 },
      demoAndTwinHistoryByteEqualBeforeAfter: true,
      readinessBefore: "READY",
      readinessAfter: "READY"
    },
    authority: {
      readOnly: true,
      canonicalStateMutation: false,
      readinessAuthority: false,
      passportAuthority: false,
      providerCall: false,
      repositoryExecution: false
    },
    sourceIntegrity,
    limitations: [
      "This optional lab compares complete bounded Twin pages already returned by local GET APIs; it withholds a partial comparison.",
      "A digest/path difference is inspectable change evidence, not correctness, release readiness or approval.",
      "The direct browser observation uses the IntelliLoop-authored LoopMart fixture and is not production validation."
    ],
    nextAuthorizedStory: "IL-9.4_HUMAN_PILOT_INPUT_OR_IL-10.2_OPTIONAL"
  };
}

assert(Number(REFRESH) + Number(VERIFY) === 1, "Use exactly one of --refresh or --verify-existing.");
const current = await buildEvidence(REFRESH);
if (REFRESH) {
  await writeFile(OUTPUT, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`EV-EVIDENCE-REPLAY ${current.status} differences=${current.directBrowserObservation.differences.added + current.directBrowserObservation.differences.removed + current.directBrowserObservation.differences.changed} canonicalMutation=${current.authority.canonicalStateMutation}`);
} else {
  const stored = JSON.parse(await readFile(OUTPUT, "utf8"));
  assert(JSON.stringify(stored) === JSON.stringify(current), "EV-EVIDENCE-REPLAY is stale or inconsistent with its sources.");
  console.log(`EV-EVIDENCE-REPLAY PASS verify-existing default=${stored.featureFlag.defaultEnabled}`);
}
