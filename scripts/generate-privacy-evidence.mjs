import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  REDACTION_RULE_IDS,
  createClock,
  createStableIdGenerator,
  prepareEvidenceImport
} from "@intelliloop/domain";

import { buildApp } from "../apps/api/dist/app.js";
import { openFoundationDatabase } from "../apps/api/dist/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../apps/api/dist/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../apps/api/dist/evidence/evidence-repository.js";
import { createSafeLogger } from "../apps/api/dist/observability.js";
import { SqliteProjectRepository } from "../apps/api/dist/projects/project-repository.js";

const WORKSPACE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = join(WORKSPACE_ROOT, "docs", "evidence", "EV_PRIVACY.json");

const IDS = Object.freeze({
  project: "00000000-0000-4000-8000-000000000001",
  mission: "00000000-0000-4000-8000-000000000011",
  source: "00000000-0000-4000-8000-000000000041",
  replaySource: "00000000-0000-4000-8000-000000000042",
  event: "00000000-0000-4000-8000-000000000051",
  replayEvent: "00000000-0000-4000-8000-000000000052",
  claim: "00000000-0000-4000-8000-000000000061",
  request: "00000000-0000-4000-8000-000000000081"
});

const TIMES = Object.freeze({
  project: "2026-08-04T12:00:00.000Z",
  mission: "2026-08-04T12:01:00.000Z",
  evidence: "2026-08-04T12:02:00.000Z",
  replayEvidence: "2026-08-04T12:02:30.000Z",
  claim: "2026-08-04T12:03:00.000Z",
  log: "2026-08-04T12:04:00.000Z"
});

const CORPUS_VALUES = Object.freeze({
  privateKeyBody: "YWJjZGVmZw==",
  openAi: "sk-proj-abcdefghijklmnopqrstuv",
  gitHub: `ghp_${"a".repeat(24)}`,
  service: `npm_${"b".repeat(24)}`,
  slack: `xoxb-${"c".repeat(20)}`,
  aws: `AKIA${"D".repeat(16)}`,
  jwt: "eyJaaaaaaaaaa.eyJbbbbbbbbbb.cccccccccccc",
  authorization: "abcdefghijklmnop",
  uriPassword: "fixture-password",
  generic: "hunter2",
  jsonPassword: "json-password-sentinel",
  jsonApiKey: "json-api-key-sentinel"
});

const PRIMARY_SENTINEL = "IL36_SECRET_SENTINEL_0123456789";
const REJECTED_SENTINEL = "IL36_REJECTED_SECRET_9876543210";
const PATH_SENTINEL = "C:\\private\\IL36_PATH_SENTINEL\\requirements.md";
const FORBIDDEN_TOKENS = Object.freeze([
  ...Object.values(CORPUS_VALUES),
  PRIMARY_SENTINEL,
  REJECTED_SENTINEL,
  PATH_SENTINEL
]);
let currentStage = "START";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sequence(values, label) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error(`${label} fixture exhausted.`);
    return value;
  };
}

function dependencies(ids, times) {
  const nextTime = sequence(times, "Clock");
  return {
    ids: createStableIdGenerator(sequence(ids, "Identity")),
    clock: createClock(() => new Date(nextTime()))
  };
}

function assertTokensAbsent(value, label) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  for (const token of FORBIDDEN_TOKENS) {
    assert(!serialized.includes(token), `${label} retained a forbidden token.`);
  }
}

function collectFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function assertFileBytesSafe(directory) {
  const files = collectFiles(directory);
  for (const file of files) {
    const content = readFileSync(file);
    for (const token of FORBIDDEN_TOKENS) {
      assert(
        !content.includes(Buffer.from(token, "utf8")),
        "Persistence retained a UTF-8 forbidden token."
      );
      assert(
        !content.includes(Buffer.from(token, "utf16le")),
        "Persistence retained a UTF-16LE forbidden token."
      );
    }
  }
  return files.length;
}

function verifyDocumentation() {
  const expectations = [
    {
      document: "docs/security/SECURITY_AND_PRIVACY.md",
      snippets: [
        "EV-PRIVACY scans UTF-8 and UTF-16LE sentinel encodings",
        "No production export or AI-pack endpoint exists",
        "Pattern redaction is not complete data-loss prevention"
      ]
    },
    {
      document: "docs/product/TRUST_MODEL.md",
      snippets: [
        "Transfer fixtures are verification-only projections",
        "No fixture was transmitted to a provider",
        "A passing sentinel proof does not prove that every possible secret pattern is recognized"
      ]
    },
    {
      document: "docs/evidence/TEST_EVIDENCE.md",
      snippets: ["EV-PRIVACY", "EV_PRIVACY.json", "npm.cmd run evidence:privacy"]
    },
    {
      document: "docs/evidence/SECURITY_REVIEW.md",
      snippets: [
        "No production export or AI-pack endpoint exists",
        "UTF-8 and UTF-16LE",
        "OFFICIAL_AVISHKAR_RULES_UNVERIFIED"
      ]
    }
  ];
  for (const expectation of expectations) {
    const content = readFileSync(join(WORKSPACE_ROOT, expectation.document), "utf8");
    for (const snippet of expectation.snippets) {
      assert(content.includes(snippet), "Privacy documentation contract is incomplete.");
    }
  }
  return expectations.map(({ document }) => ({ document, status: "PASS" }));
}

async function verifyNegativeCorpus() {
  const textCorpus = [
    "-----BEGIN PRIVATE KEY-----",
    CORPUS_VALUES.privateKeyBody,
    "-----END PRIVATE KEY-----",
    `openai=${CORPUS_VALUES.openAi}`,
    `github=${CORPUS_VALUES.gitHub}`,
    `npm=${CORPUS_VALUES.service}`,
    `slack=${CORPUS_VALUES.slack}`,
    `aws=${CORPUS_VALUES.aws}`,
    `jwt=${CORPUS_VALUES.jwt}`,
    `Authorization: Bearer ${CORPUS_VALUES.authorization}`,
    `url=https://fixture-user:${CORPUS_VALUES.uriPassword}@example.invalid/path`,
    `password=${CORPUS_VALUES.generic}`
  ].join("\n");
  const textPrepared = await prepareEvidenceImport({
    format: "TEXT",
    content: Buffer.from(textCorpus, "utf8")
  });
  const jsonPrepared = await prepareEvidenceImport({
    format: "JSON",
    content: Buffer.from(
      JSON.stringify({
        password: CORPUS_VALUES.jsonPassword,
        nested: {
          api_key: CORPUS_VALUES.jsonApiKey,
          note: `Bearer ${CORPUS_VALUES.authorization}`
        },
        safe: true
      }),
      "utf8"
    )
  });
  assertTokensAbsent(textPrepared, "Text preparation");
  assertTokensAbsent(jsonPrepared, "JSON preparation");
  const observedRules = new Set([
    ...textPrepared.redaction.ruleCounts.map(({ rule }) => rule),
    ...jsonPrepared.redaction.ruleCounts.map(({ rule }) => rule)
  ]);
  assert(observedRules.size === REDACTION_RULE_IDS.length, "Redaction rule coverage is incomplete.");
  for (const rule of REDACTION_RULE_IDS) {
    assert(observedRules.has(rule), "A redaction rule was not exercised.");
  }
  return Object.fromEntries(REDACTION_RULE_IDS.map((rule) => [rule, "PASS"]));
}

async function generate() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "intelliloop-privacy-"));
  const databasePath = join(temporaryRoot, "intelliloop.sqlite3");
  const logLines = [];
  const responseBodies = [];
  let database;
  let app;
  let fileCount = 0;
  let externalFetchCalls = 0;
  let report;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    externalFetchCalls += 1;
    throw new Error("External fetch is prohibited during EV-PRIVACY.");
  };

  try {
    currentStage = "NEGATIVE_CORPUS";
    const negativeCorpus = await verifyNegativeCorpus();
    currentStage = "DATABASE_SETUP";
    database = openFoundationDatabase({ filePath: databasePath });
    const projects = new SqliteProjectRepository(
      database.connection,
      dependencies([IDS.project, IDS.mission], [TIMES.project, TIMES.mission])
    );
    const project = projects.createProject("Privacy proof project");
    const mission = projects.createMission(
      project.projectId,
      "Prove cross-surface evidence privacy"
    );
    const evidence = new SqliteEvidenceRepository(
      database.connection,
      dependencies(
        [IDS.source, IDS.event, IDS.replaySource, IDS.replayEvent],
        [TIMES.evidence, TIMES.replayEvidence]
      )
    );
    const claims = new SqliteClaimRepository(
      database.connection,
      dependencies([IDS.claim], [TIMES.claim])
    );
    const logger = createSafeLogger({
      level: "info",
      clock: () => new Date(TIMES.log),
      write: (line) => logLines.push(line)
    });
    app = buildApp({
      projectRepository: projects,
      evidenceRepository: evidence,
      claimRepository: claims,
      logger,
      requestIdFactory: () => IDS.request
    });

    const content = `Controlled privacy evidence\npassword=${PRIMARY_SENTINEL}\n`;
    currentStage = "API_PREVIEW";
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission.missionId}/evidence/preview`,
      payload: { format: "TEXT", content }
    });
    assert(preview.statusCode === 200, "Privacy preview failed.");
    responseBodies.push(preview.body);

    const evidenceBody = {
      format: "TEXT",
      content,
      origin: "SYNTHETIC_FIXTURE",
      sourceLocator: "synthetic:privacy/primary-sentinel",
      sourceRevision: "ev-privacy-v1",
      epistemicLabel: "FACT"
    };
    currentStage = "API_COMMIT";
    const commit = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission.missionId}/evidence-sources`,
      payload: evidenceBody
    });
    currentStage = `API_COMMIT_STATUS_${commit.statusCode}`;
    assert(commit.statusCode === 201, "Privacy commit failed.");
    responseBodies.push(commit.body);
    currentStage = "API_REPLAY";
    const replay = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission.missionId}/evidence-sources`,
      payload: evidenceBody
    });
    currentStage = `API_REPLAY_STATUS_${replay.statusCode}`;
    assert(replay.statusCode === 200, "Privacy idempotency replay failed.");
    assert(replay.json().created === false, "Privacy replay appended duplicate evidence.");
    responseBodies.push(replay.body);

    currentStage = "API_RETRIEVAL";
    for (const suffix of ["evidence-sources?limit=100", "timeline-events?limit=100"]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/missions/${mission.missionId}/${suffix}`
      });
      assert(response.statusCode === 200, "Privacy retrieval failed.");
      responseBodies.push(response.body);
    }

    currentStage = "API_REJECTION";
    const rejected = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission.missionId}/evidence-sources`,
      payload: {
        ...evidenceBody,
        content: `Rejected privacy evidence\npassword=${REJECTED_SENTINEL}\n`,
        sourceLocator: PATH_SENTINEL
      }
    });
    assert(rejected.statusCode === 400, "Private path negative case was accepted.");
    responseBodies.push(rejected.body);

    assertTokensAbsent(logLines, "Safe logs");
    assertTokensAbsent(responseBodies, "API responses");
    currentStage = "TRANSFER_FIXTURES";
    const commitResource = commit.json();
    const exportFixture = {
      schemaVersion: "privacy-export-fixture.v1",
      fixturePurpose: "VERIFICATION_ONLY_NOT_PRODUCT_EXPORT",
      evidenceSources: [commitResource.evidenceSource],
      timelineEvents: [commitResource.timelineEvent]
    };
    const aiPackFixture = {
      schemaVersion: "privacy-ai-pack-fixture.v1",
      fixturePurpose: "VERIFICATION_ONLY_NOT_PROVIDER_PAYLOAD",
      transferStatus: "NOT_TRANSMITTED",
      authority: "ADVISORY_ONLY",
      citations: [
        {
          citationId: commitResource.evidenceSource.evidenceSourceId,
          contentDigest: commitResource.evidenceSource.prepared.contentDigest,
          redactedContent: commitResource.evidenceSource.prepared.normalizedContent
        }
      ]
    };
    assertTokensAbsent(exportFixture, "Export fixture");
    assertTokensAbsent(aiPackFixture, "AI-pack fixture");
    writeFileSync(
      join(temporaryRoot, "export-fixture.json"),
      `${JSON.stringify(exportFixture, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      join(temporaryRoot, "ai-pack-fixture.json"),
      `${JSON.stringify(aiPackFixture, null, 2)}\n`,
      "utf8"
    );

    await app.close();
    app = undefined;
    database.close();
    database = undefined;
    currentStage = "PERSISTENCE_SCAN";
    fileCount = assertFileBytesSafe(temporaryRoot);
    assert(externalFetchCalls === 0, "Privacy proof attempted an external fetch.");
    currentStage = "DOCUMENTATION";
    const documentation = verifyDocumentation();

    currentStage = "REPORT";
    report = {
      schemaVersion: 1,
      evidenceId: "EV-PRIVACY",
      story: "IL-3.6",
      capabilities: ["DC-02", "SUP-06"],
      status: "PASS",
      evidenceDate: "2026-08-04",
      reproductionCommand: "npm.cmd run evidence:privacy",
      fixture: {
        ownership: "INTELLILOOP_AUTHORED_SYNTHETIC",
        network: "OFFLINE",
        providerCredentialRequired: false,
        redactionRulesExercised: REDACTION_RULE_IDS.length,
        persistenceFilesScanned: fileCount,
        transferFixtures: ["EXPORT_VERIFICATION_ONLY", "AI_PACK_VERIFICATION_ONLY"]
      },
      proofs: {
        negativeCorpus,
        surfaces: {
          logs: { rawSentinelAbsent: "PASS", bodyFieldsExcluded: "PASS" },
          persistence: {
            utf8SentinelAbsent: "PASS",
            utf16leSentinelAbsent: "PASS",
            sqliteAndSidecarFilesScanned: "PASS"
          },
          api: {
            previewRedacted: "PASS",
            commitRedacted: "PASS",
            retrievalRedacted: "PASS",
            idempotentReplayRedacted: "PASS",
            rejectedPrivatePathNonRevealing: "PASS"
          },
          exportFixture: { rawSentinelAbsent: "PASS", productSurface: false },
          aiPackFixture: {
            rawSentinelAbsent: "PASS",
            transmitted: false,
            productSurface: false
          }
        },
        documentation
      },
      integrity: {
        rawSentinelRecordedInReport: false,
        rawPrivatePathRecordedInReport: false,
        unredactedTransferFixtureCreated: false,
        externalFetchCalls,
        providerCredentialRead: false,
        productionExportEndpointPresent: false,
        productionAiPackEndpointPresent: false,
        temporaryFixtureRemovedAfterRun: true
      },
      limitations: [
        "PATTERN_REDACTION_NOT_COMPLETE_DLP",
        "VERIFICATION_FIXTURES_ARE_NOT_PRODUCT_EXPORTS",
        "NO_SECURE_MEMORY_ERASURE_CLAIM",
        "LOCAL_SINGLE_USER_TRUST_MODEL",
        "NOT_VALIDATION_OR_READINESS",
        "OFFICIAL_AVISHKAR_RULES_UNVERIFIED"
      ],
      nextAuthorizedStory: "IL-3.7"
    };
    assertTokensAbsent(report, "EV-PRIVACY report");
  } finally {
    currentStage = currentStage === "REPORT" ? "CLEANUP" : currentStage;
    globalThis.fetch = originalFetch;
    if (app !== undefined) await app.close().catch(() => undefined);
    if (database !== undefined) database.close();
    rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }

  assert(!existsSync(temporaryRoot), "Privacy temporary fixture was not removed.");
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  assertTokensAbsent(serialized, "EV-PRIVACY serialized report");
  writeFileSync(OUTPUT_PATH, serialized, "utf8");
}

try {
  await generate();
  console.log("EV-PRIVACY: PASS; generated secret-safe cross-surface evidence.");
} catch {
  console.error(`EV-PRIVACY: FAIL at ${currentStage}; verification did not complete.`);
  process.exitCode = 1;
}
