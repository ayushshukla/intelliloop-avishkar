import {
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  OPENAI_EVALUATION_DECISIONS,
  assertOpenAiEvaluationCheckpointInvariant,
  createOfflineOpenAiEvaluationCheckpoint
} from "@intelliloop/domain";

const WORKSPACE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "EV_OPENAI_EVAL.json"
);
const CITATIONS_PATH = join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "EV_CITATIONS.json"
);
const RECONCILE_PATH = join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "EV_RECONCILE.json"
);
const PRIVACY_PATH = join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "EV_PRIVACY.json"
);

const FIXED_QUESTIONS = Object.freeze([
  "Can we release?",
  "What conflicts are open?",
  "What is impacted?",
  "What validation is missing?",
  "What should happen next?",
  "What changed after correction?"
]);
const TEXT_EXTENSIONS = new Set([
  "",
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results"
]);
const ALLOWED_SYNTHETIC_TOKENS = new Set([
  "sk-proj-ABCDEFGHIJKLMNOPQRSTUV",
  "sk-proj-abcdefghijklmnopqrstuv"
]);
const CREDENTIAL_LIKE_PATTERN =
  /(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}/gu;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function exactArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function collectTextFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTextFiles(path);
    if (!entry.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      return [];
    }
    return [path];
  });
}

function verifyRepositoryCredentialPatterns() {
  let filesScanned = 0;
  let allowedSyntheticMatches = 0;
  for (const path of collectTextFiles(WORKSPACE_ROOT)) {
    filesScanned += 1;
    const content = readFileSync(path, "utf8");
    for (const match of content.matchAll(CREDENTIAL_LIKE_PATTERN)) {
      const value = match[0];
      assert(
        ALLOWED_SYNTHETIC_TOKENS.has(value),
        "A non-fixture credential-like value is present in a repository text surface."
      );
      allowedSyntheticMatches += 1;
    }
  }
  return { filesScanned, allowedSyntheticMatches };
}

function verifyDocumentation() {
  const expectations = [
    {
      document: "README.md",
      snippets: [
        "IL-6.5",
        "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
        "IL-6.6"
      ]
    },
    {
      document: "docs/security/AI_SAFETY_AND_DATA_TRANSFER.md",
      snippets: [
        "NOT_RUN_NOT_AUTHORIZED",
        "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE"
      ]
    },
    {
      document: "docs/governance/AI_USE_DISCLOSURE.md",
      snippets: ["IL-6.5", "No personal OpenAI call was made"]
    },
    {
      document: "docs/evidence/IL_6_5_TEST_EVIDENCE.md",
      snippets: ["EV-OPENAI-EVAL", "NOT_MEASURED"]
    },
    {
      document: "docs/evidence/TEST_EVIDENCE.md",
      snippets: ["EV_OPENAI_EVAL.json", "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE"]
    }
  ];

  return expectations.map(({ document, snippets }) => {
    const content = readFileSync(join(WORKSPACE_ROOT, document), "utf8");
    for (const snippet of snippets) {
      assert(content.includes(snippet), "OpenAI checkpoint documentation is incomplete.");
    }
    return { document, status: "PASS" };
  });
}

async function generate() {
  const citations = readJson(CITATIONS_PATH);
  const reconcile = readJson(RECONCILE_PATH);
  const privacy = readJson(PRIVACY_PATH);

  assert(citations.evidenceId === "EV-CITATIONS" && citations.status === "PASS",
    "Citation evidence is not passing.");
  assert(reconcile.evidenceId === "EV-RECONCILE" && reconcile.status === "PASS",
    "Reconciliation evidence is not passing.");
  assert(
    reconcile.programGate?.id === "G3_DETERMINISTIC_CORE_PROVEN" &&
      reconcile.programGate?.status === "PASS",
    "The deterministic-core gate is not closed."
  );
  assert(privacy.evidenceId === "EV-PRIVACY" && privacy.status === "PASS",
    "Privacy evidence is not passing.");
  assert(
    privacy.proofs?.negativeCorpus?.OPENAI_TOKEN === "PASS" &&
      privacy.proofs?.surfaces?.logs?.rawSentinelAbsent === "PASS" &&
      privacy.proofs?.surfaces?.persistence?.sqliteAndSidecarFilesScanned === "PASS" &&
      privacy.integrity?.providerCredentialRead === false,
    "Credential safety evidence is incomplete."
  );

  const fixedQuestionApi = citations.proofs?.fixedQuestionApi;
  const disclosure = citations.proofs?.outboundDisclosure;
  const providerBoundary = citations.proofs?.providerBoundary;
  assert(
    fixedQuestionApi?.expectedQuestions === 6 &&
      fixedQuestionApi?.passedQuestions === 6 &&
      exactArray(fixedQuestionApi?.exactQuestions, FIXED_QUESTIONS),
    "The fixed evaluation set is incomplete."
  );
  assert(
    disclosure?.transferStatus === "NOT_SENT" &&
      disclosure?.exactPackJsonReturnedForReview === "PASS" &&
      Number.isSafeInteger(disclosure?.maximumConservativeInputTokenUpperBound),
    "The exact redacted preview evidence is incomplete."
  );
  assert(
    providerBoundary?.productionOutcome === "DISABLED" &&
      providerBoundary?.externalCallMade === false,
    "The production provider boundary is not disabled."
  );

  const sizeRows = disclosure.serializedBytesByQuestion;
  assert(Array.isArray(sizeRows) && sizeRows.length === FIXED_QUESTIONS.length,
    "Question size evidence is incomplete.");
  const sizeByQuestion = new Map(
    sizeRows.map((row) => [row.question, row.serializedBytes])
  );
  for (const question of FIXED_QUESTIONS) {
    const size = sizeByQuestion.get(question);
    assert(Number.isSafeInteger(size) && size > 0 && size <= 12_000,
      "A fixed-question preview is missing or exceeds the frozen boundary.");
  }

  const checkpoint = await createOfflineOpenAiEvaluationCheckpoint({
    g3Status: "PASS",
    reconciliationEvidenceStatus: "PASS",
    citationEvidenceStatus: "PASS",
    privacyEvidenceStatus: "PASS",
    fixedQuestions: FIXED_QUESTIONS,
    expectedQuestionCount: fixedQuestionApi.expectedQuestions,
    passedQuestionCount: fixedQuestionApi.passedQuestions,
    exactRedactedPackPreviewAvailable: true,
    transferStatus: "NOT_SENT",
    maximumInputTokenUpperBound:
      disclosure.maximumConservativeInputTokenUpperBound,
    productionProviderOutcome: "DISABLED"
  });
  await assertOpenAiEvaluationCheckpointInvariant(checkpoint);

  const credentialPatternScan = verifyRepositoryCredentialPatterns();
  const documentation = verifyDocumentation();
  const fixedSetResults = FIXED_QUESTIONS.map((question) => ({
    question,
    redactedPackPreview: "AVAILABLE_NOT_SENT",
    serializedBytes: sizeByQuestion.get(question),
    providerEvaluationStatus: "NOT_RUN_NOT_AUTHORIZED",
    grounding: "NOT_MEASURED",
    citationValidity: "NOT_MEASURED",
    usefulness: "NOT_MEASURED",
    latencyMs: null,
    inputTokens: null,
    outputTokens: null,
    differenceFromDeterministicExplanation: "NOT_MEASURED"
  }));

  const report = {
    schemaVersion: 1,
    evidenceId: "EV-OPENAI-EVAL",
    story: "IL-6.5",
    capability: ["DC-06", "SUP-04"],
    status: "PASS",
    evidenceDate: "2026-08-06",
    reproductionCommand: "npm.cmd run evidence:openai-eval",
    programGate: {
      id: "G4_OPENAI_COURSE_CORRECTION",
      status: "PASS_OFFLINE_DECISION",
      liveEvaluationRequiredForSelectedDecision: false
    },
    sourceEvidence: {
      reconciliation: { evidenceId: "EV-RECONCILE", status: "PASS" },
      citations: { evidenceId: "EV-CITATIONS", status: "PASS" },
      privacy: { evidenceId: "EV-PRIVACY", status: "PASS" }
    },
    checkpoint,
    proofs: {
      entryChecklist: checkpoint.entryChecklist,
      fixedSetResults,
      deterministicBaseline: {
        renderedStatementCount:
          citations.proofs?.citations?.renderedStatementCount,
        resolvedStatementCitationCount:
          citations.proofs?.citations?.resolvedStatementCitationCount,
        maximumInputTokenUpperBound:
          disclosure.maximumConservativeInputTokenUpperBound,
        providerMeasurementsClaimed: false
      },
      credentialSafety: {
        selectedBranchRequiresCredential: false,
        runtimeCredentialRequested: false,
        runtimeCredentialRead: false,
        credentialPersisted: false,
        credentialLogged: false,
        repositoryPatternScan: "PASS",
        repositoryTextFilesScanned: credentialPatternScan.filesScanned,
        allowedSyntheticFixtureMatches:
          credentialPatternScan.allowedSyntheticMatches,
        logAndPersistenceSentinelEvidence: "PASS"
      },
      decision: {
        allowedDecisions: OPENAI_EVALUATION_DECISIONS,
        selected: "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
        frozenByCheckpointDigest: checkpoint.checkpointDigest
      },
      documentation
    },
    integrity: {
      externalCallMade: false,
      providerCredentialReadOrRecorded: false,
      providerPromptOrResponseBodyRecorded: false,
      exactPackBodyCopiedIntoReport: false,
      canonicalStateChanged: false,
      readinessOrPassportAuthorityCreated: false
    },
    limitations: [
      "LIVE_PROVIDER_EVALUATION_NOT_RUN_NOT_AUTHORIZED",
      "PROVIDER_GROUNDING_CITATION_USEFULNESS_LATENCY_AND_TOKENS_NOT_MEASURED",
      "REPOSITORY_PATTERN_SCAN_IS_NOT_COMPLETE_SECRET_DETECTION",
      "CONTROLLED_SYNTHETIC_BASELINE_ONLY",
      "NO_RELEASE_READINESS_OR_PASSPORT_AUTHORITY"
    ],
    nextAuthorizedStory: "IL-6.6"
  };

  const serialized = JSON.stringify(report, null, 2);
  assert(!CREDENTIAL_LIKE_PATTERN.test(serialized),
    "The generated report contains a credential-like value.");
  CREDENTIAL_LIKE_PATTERN.lastIndex = 0;
  assert(
    !serialized.includes("exactRedactedPackJson") &&
      !/[A-Za-z]:\\Users\\|\/Users\/|\/home\//u.test(serialized),
    "The generated report contains a pack body or private path."
  );
  writeFileSync(OUTPUT, `${serialized}\n`, "utf8");
  return { filesScanned: credentialPatternScan.filesScanned };
}

try {
  const result = await generate();
  process.stdout.write(
    `EV-OPENAI-EVAL: PASS; offline decision recorded after ${FIXED_QUESTIONS.length}/${FIXED_QUESTIONS.length} fixed previews and ${result.filesScanned} repository text files scanned.\n`
  );
} catch {
  process.stderr.write(
    "EV-OPENAI-EVAL: FAIL; the bounded offline checkpoint was not recorded.\n"
  );
  process.exitCode = 1;
}
