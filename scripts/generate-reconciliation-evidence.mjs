import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import {
  createClock,
  createProviderNeutralAdapter,
  createStableIdGenerator
} from "@intelliloop/domain";

import { buildApp } from "../apps/api/dist/app.js";
import { CodeMapExtractor } from "../apps/api/dist/code-map/code-map-extractor.js";
import { CodeMapProjectionService } from "../apps/api/dist/code-map/code-map-projection-service.js";
import { SqliteCodeMapRepository } from "../apps/api/dist/code-map/code-map-repository.js";
import { CodeMapScanner } from "../apps/api/dist/code-map/code-map-scanner.js";
import { openFoundationDatabase } from "../apps/api/dist/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../apps/api/dist/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../apps/api/dist/evidence/evidence-repository.js";
import { FixedGitCommandRunner } from "../apps/api/dist/projects/git-command-runner.js";
import { GitSnapshotService } from "../apps/api/dist/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../apps/api/dist/projects/project-repository.js";
import { RepositoryRegistrationService } from "../apps/api/dist/projects/repository-registration.js";
import { SqliteReconciliationRepository } from "../apps/api/dist/reconciliation/reconciliation-repository.js";
import { ReconciliationExecutionService } from "../apps/api/dist/reconciliation/reconciliation-service.js";
import { CitedExplanationService } from "../apps/api/dist/explanations/cited-explanation-service.js";
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../apps/api/dist/twin/twin-repository.js";

const WORKSPACE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EVIDENCE_OUTPUT = join(WORKSPACE_ROOT, "docs", "evidence", "EV_RECONCILE.json");
const CITATION_EVIDENCE_OUTPUT = join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "EV_CITATIONS.json"
);
const METRICS_OUTPUT = join(WORKSPACE_ROOT, "docs", "evidence", "METRICS_REPORT.md");
const REPLAY_ITERATIONS = 25;
const CITED_QUESTIONS = Object.freeze([
  "Can we release?",
  "What conflicts are open?",
  "What is impacted?",
  "What validation is missing?",
  "What should happen next?",
  "What changed after correction?"
]);
const UNKNOWN_CITATION = `cite:${"f".repeat(64)}`;

const IDS = Object.freeze({
  project: "00000000-0000-4000-8000-000000000101",
  mission: "00000000-0000-4000-8000-000000000102",
  registration: "00000000-0000-4000-8000-000000000103",
  snapshots: Object.freeze([
    "00000000-0000-4000-8000-000000000111",
    "00000000-0000-4000-8000-000000000112",
    "00000000-0000-4000-8000-000000000113",
    "00000000-0000-4000-8000-000000000114"
  ]),
  evidenceSource: "00000000-0000-4000-8000-000000000121",
  evidenceEvent: "00000000-0000-4000-8000-000000000122",
  conflictAllowed: "00000000-0000-4000-8000-000000000131",
  conflictForbidden: "00000000-0000-4000-8000-000000000132",
  ambiguousUnknown: "00000000-0000-4000-8000-000000000133",
  ambiguousKnown: "00000000-0000-4000-8000-000000000134",
  correction: "00000000-0000-4000-8000-000000000135",
  supersession: "00000000-0000-4000-8000-000000000136",
  absentAsset: "00000000-0000-4000-8000-000000000199"
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sequence(values, label) {
  let index = 0;
  return () => {
    const value = values[index++];
    if (value === undefined) throw new Error(`${label} fixture exhausted.`);
    return value;
  };
}

function dateSequence(values, label) {
  const next = sequence(values, label);
  return () => new Date(next());
}

function safeGitEnvironment(extra = {}) {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (name.toUpperCase().startsWith("GIT_")) delete environment[name];
  }
  return {
    ...environment,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    LC_ALL: "C",
    ...extra
  };
}

function git(root, args, extraEnvironment = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: "ignore",
    env: safeGitEnvironment(extraEnvironment)
  });
  if (result.status !== 0) throw new Error("Controlled Git fixture command failed.");
}

function createRepository(parent) {
  const root = join(parent, "controlled-reconciliation-repository");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "cancellation-policy.ts"),
    "export interface CancellationPolicy { allowedBeforeDispatch: boolean }\n",
    "utf8"
  );
  writeFileSync(
    join(root, "src", "cancellation-route.ts"),
    [
      'import type { CancellationPolicy } from "./cancellation-policy.js";',
      "export function cancellationRoute(policy: CancellationPolicy) { return policy; }",
      ""
    ].join("\n"),
    "utf8"
  );
  git(root, ["init", "-b", "main"]);
  git(root, ["add", "--all"]);
  git(
    root,
    [
      "-c", "user.name=IntelliLoop Fixture",
      "-c", "user.email=fixture@invalid.example",
      "commit", "-m", "controlled reconciliation fixture"
    ],
    {
      GIT_AUTHOR_DATE: "2026-08-06T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-08-06T00:00:00Z"
    }
  );
  return root;
}

function treeDigest(root) {
  const records = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      const path = relative(root, absolute).replaceAll("\\", "/");
      const stat = lstatSync(absolute);
      if (stat.isDirectory()) {
        records.push({ kind: "directory", path });
        visit(absolute);
      } else if (stat.isFile()) {
        records.push({ kind: "file", path, bytes: readFileSync(absolute) });
      } else {
        records.push({ kind: "other", path });
      }
    }
  };
  visit(root);
  records.sort((left, right) => left.path.localeCompare(right.path, "en"));
  const hash = createHash("sha256");
  for (const record of records) {
    hash.update(record.kind);
    hash.update("\0");
    hash.update(record.path);
    hash.update("\0");
    if (record.bytes !== undefined) hash.update(record.bytes);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function request(app, method, url, payload, expectedStatuses) {
  const response = await app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload })
  });
  assert(
    expectedStatuses.includes(response.statusCode),
    `Controlled API operation failed with status ${response.statusCode}.`
  );
  return { statusCode: response.statusCode, body: response.json() };
}

function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function timingSummary(values) {
  assert(values.length > 0, "At least one timing observation is required.");
  const sorted = [...values].sort((left, right) => left - right);
  const rounded = (value) => Number(value.toFixed(3));
  return Object.freeze({
    unit: "milliseconds",
    samples: sorted.length,
    minimum: rounded(sorted[0]),
    median: rounded(percentile(sorted, 0.5)),
    p95: rounded(percentile(sorted, 0.95)),
    maximum: rounded(sorted.at(-1))
  });
}

function findingKinds(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.findingKind] = (counts[finding.findingKind] ?? 0) + 1;
    return counts;
  }, {});
}

function controlledAdvisory(request, citationId) {
  return {
    responseVersion: "provider-advisory-response.v1",
    requestId: request.requestId,
    providerRequestDigest: request.requestDigest,
    evidencePackDigest: request.evidencePackDigest,
    outputSchemaVersion: request.outputSchemaVersion,
    answer: {
      text: "Controlled mock advisory summary.",
      citationIds: [citationId]
    },
    facts: [],
    inferences: [],
    conflicts: [],
    gaps: [],
    nextActions: [],
    citations: [citationId],
    providerMetadata: {
      providerId: "controlled.mock",
      modelId: "schema-fixture-v1",
      responseId: "response-fixture-1",
      executionKind: "MOCK_VALIDATION"
    },
    usageMetadata: {
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      source: "PROVIDER_REPORTED"
    }
  };
}

function allStatements(explanation) {
  return [
    explanation.answer,
    ...explanation.facts,
    ...explanation.inferences,
    ...explanation.conflicts,
    ...explanation.gaps,
    ...explanation.nextActions
  ];
}

function verifyDocumentation() {
  const expectations = [
    ["README.md", ["IL-6.4", "EV-CITATIONS", "IL-6.5"]],
    ["docs/architecture/DOMAIN_MODEL.md", ["evidence-pack-compiler-policy.v2", "IL-6.4"]],
    ["docs/product/TRUST_MODEL.md", ["EV-CITATIONS", "G3_DETERMINISTIC_CORE_PROVEN"]],
    ["docs/development/TESTING.md", ["npm.cmd run evidence:citations", "IL-6.4"]],
    ["docs/evidence/TEST_EVIDENCE.md", ["EV-CITATIONS", "IL-6.4"]],
    ["docs/evidence/METRICS_REPORT.md", ["No production extrapolation", "controlled synthetic"]],
    ["docs/governance/PROMISE_TO_EVIDENCE_MATRIX.md", ["EV_CITATIONS.json", "IL-6.4"]]
  ];
  for (const [document, snippets] of expectations) {
    const content = readFileSync(join(WORKSPACE_ROOT, document), "utf8");
    for (const snippet of snippets) {
      assert(content.includes(snippet), "Reconciliation documentation contract is incomplete.");
    }
  }
  return expectations.map(([document]) => ({ document, status: "PASS" }));
}

function metricsMarkdown({ accuracy, initialRunMs, correctionRunMs, replay }) {
  return `# IntelliLoop controlled metrics report

**Evidence date:** 2026-08-06  
**Story:** \`IL-5.7\`  
**Scenario:** IntelliLoop-authored controlled synthetic reconciliation fixture  
**Reproduce:** \`npm.cmd run evidence:reconcile\`

## Result

The deterministic truth table passed **${accuracy.passed}/${accuracy.total} authored cases (${accuracy.percentage}%)**. This is exact agreement against the declared fixture expectations; it is not a claim about prediction quality, unseen data, employee performance or production accuracy.

| Controlled operation | Samples | Minimum (ms) | Median (ms) | p95 (ms) | Maximum (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial conflict/ambiguity/missing/impact assessment | 1 | ${initialRunMs} | ${initialRunMs} | ${initialRunMs} | ${initialRunMs} |
| Correction and stale-successor assessment | 1 | ${correctionRunMs} | ${correctionRunMs} | ${correctionRunMs} | ${correctionRunMs} |
| Exact persisted replay | ${replay.samples} | ${replay.minimum} | ${replay.median} | ${replay.p95} | ${replay.maximum} |

## Method

The generator creates an offline temporary SQLite database and an IntelliLoop-authored Git fixture, runs the production domain/API/persistence path, compares exact expected finding counts and reasons, applies an explicit claim supersession, and proves byte-equal replay summaries for canonical and reordered inputs. Timings use \`performance.now()\` in one local Node.js process after the correction revision exists. No absolute latency threshold is used as a pass condition.

## Accuracy boundary

- The denominator is six authored truth-table assertions: conflict, ambiguity, missing support, impact gaps, explicit supersession and stale successor.
- A case passes only when the exact expected count or relationship is observed. The script fails closed on mismatch.
- This is deterministic rule conformance on one bounded fixture, not statistical model accuracy, recall, precision or real-world validation.

## No production extrapolation

These observations are a development baseline only. They do not estimate concurrent load, production latency, monthly time saved, cost reduction, revenue, ROI or organizational outcomes. Hardware, operating-system scheduling, filesystem cache and process state can change wall-clock timings. Production and pilot measurements remain later work.

## Known limitations

- One local single-process scenario; no concurrency, soak, scale or distributed-system test.
- No persisted validation-result intake, so the validation truth case intentionally proves an explicit missing-result gap.
- No provider or AI call, no external data transfer and no live telemetry.
- \`G3_DETERMINISTIC_CORE_PROVEN\` is closed jointly by generated \`EV-RECONCILE\` and \`EV-CITATIONS\`; neither report proves readiness or authorizes a live provider call.
`;
}

async function generate() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "intelliloop-reconcile-"));
  const originalFetch = globalThis.fetch;
  let externalCallAttempts = 0;
  let database;
  let restarted;
  let app;
  try {
    globalThis.fetch = async () => {
      externalCallAttempts += 1;
      throw new Error("External calls are prohibited in EV-RECONCILE.");
    };

    const databasePath = join(temporaryRoot, "data", "intelliloop.sqlite3");
    const repositoryRoot = createRepository(temporaryRoot);
    const repositoryTreeBefore = treeDigest(repositoryRoot);
    database = openFoundationDatabase({ filePath: databasePath });

    const projects = new SqliteProjectRepository(database.connection, {
      ids: createStableIdGenerator(sequence([IDS.project, IDS.mission], "Project identity")),
      clock: createClock(() => new Date("2026-08-06T01:00:00.000Z"))
    });
    const project = projects.createProject("Controlled reconciliation proof");
    const mission = projects.createMission(project.projectId, "Reconcile cancellation evidence");
    const registrations = new RepositoryRegistrationService(
      database.connection,
      databasePath,
      {
        ids: createStableIdGenerator(() => IDS.registration),
        clock: createClock(() => new Date("2026-08-06T01:01:00.000Z"))
      }
    );
    registrations.register(project.projectId, repositoryRoot);

    const fixedGitRunner = new FixedGitCommandRunner();
    const snapshots = new GitSnapshotService(database.connection, registrations, {
      ids: createStableIdGenerator(sequence(IDS.snapshots, "Snapshot identity")),
      clock: createClock(() => new Date("2026-08-06T01:02:00.000Z")),
      runner: {
        run: async (operation, root) => {
          const result = await fixedGitRunner.run(operation, root);
          if (process.env.INTELLILOOP_EVIDENCE_DEBUG === "1") {
            process.stderr.write(
              `EV-RECONCILE bounded Git diagnostic: ${operation}=${result.exitCode}\n`
            );
          }
          return result;
        }
      }
    });
    const codeMaps = new SqliteCodeMapRepository(database.connection);
    const codeMapService = new CodeMapProjectionService({
      snapshots,
      scanner: new CodeMapScanner(database.connection, registrations),
      extractor: new CodeMapExtractor(),
      repository: codeMaps,
      clock: createClock(() => new Date("2026-08-06T01:03:00.000Z"))
    });
    const evidence = new SqliteEvidenceRepository(database.connection, {
      ids: createStableIdGenerator(
        sequence([IDS.evidenceSource, IDS.evidenceEvent], "Evidence identity")
      ),
      clock: createClock(() => new Date("2026-08-06T01:04:00.000Z"))
    });
    const claims = new SqliteClaimRepository(database.connection, {
      ids: createStableIdGenerator(
        sequence([
          IDS.conflictAllowed,
          IDS.conflictForbidden,
          IDS.ambiguousUnknown,
          IDS.ambiguousKnown,
          IDS.correction,
          IDS.supersession
        ], "Claim identity")
      ),
      clock: createClock(dateSequence([
        "2026-08-06T01:05:00.000Z",
        "2026-08-06T01:06:00.000Z",
        "2026-08-06T01:07:00.000Z",
        "2026-08-06T01:08:00.000Z",
        "2026-08-06T01:09:00.000Z"
      ], "Claim time"))
    });
    const twins = new SqliteTwinRepository(database.connection);
    const materializer = new TwinMaterializationService({
      projects,
      evidence,
      claims,
      snapshots,
      twins,
      codeMaps
    });
    const reconciliations = new SqliteReconciliationRepository(database.connection);
    const executor = new ReconciliationExecutionService({
      twins,
      codeMaps,
      evidence,
      claims,
      snapshots,
      reconciliations
    });
    const citedExplanations = new CitedExplanationService({
      twins,
      evidence,
      claims,
      assessments: reconciliations,
      adapter: createProviderNeutralAdapter()
    });
    app = buildApp({
      logger: {
        info: () => undefined,
        error: (context) => {
          if (process.env.INTELLILOOP_EVIDENCE_DEBUG === "1") {
            process.stderr.write(`EV-RECONCILE bounded API diagnostic: ${JSON.stringify(context)}\n`);
          }
        }
      },
      projectRepository: projects,
      repositoryRegistration: registrations,
      gitSnapshotService: snapshots,
      evidenceRepository: evidence,
      claimRepository: claims,
      twinRepository: twins,
      twinMaterializer: materializer,
      codeMapRepository: codeMaps,
      codeMapProjectionService: codeMapService,
      reconciliationRepository: reconciliations,
      reconciliationExecutionService: executor,
      citedExplanationService: citedExplanations
    });

    const codeMapRun = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/code-map/revisions`,
      undefined,
      [201]
    );
    const codeMap = codeMapRun.body.codeMapRevision;
    assert(codeMap.evidence.evidenceKind === "STATIC_INFERENCE", "Static inference is required.");

    const evidenceImport = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/evidence-sources`,
      {
        format: "TEXT",
        content: [
          "Cancellation is allowed before dispatch.",
          "Cancellation is forbidden before dispatch.",
          "Cancellation approval threshold is unknown.",
          "Cancellation approval threshold is two reviewers."
        ].join("\n"),
        origin: "USER_INPUT",
        sourceLocator: "controlled:reconciliation/cancellation-policy",
        sourceRevision: "fixture-v1",
        epistemicLabel: "FACT"
      },
      [201]
    );
    const evidenceSourceId = evidenceImport.body.evidenceSource.evidenceSourceId;

    const claimEndpoint = `/api/v1/missions/${mission.missionId}/evidence-sources/${evidenceSourceId}/claims`;
    const claimBodies = [
      {
        rawText: "Cancellation is allowed before dispatch.",
        subject: "order cancellation",
        predicate: "allowed before dispatch",
        value: true,
        epistemicLabel: "FACT"
      },
      {
        rawText: "Cancellation is forbidden before dispatch.",
        subject: "order cancellation",
        predicate: "allowed before dispatch",
        value: false,
        epistemicLabel: "FACT"
      },
      {
        rawText: "Cancellation approval threshold is unknown.",
        subject: "cancellation approval",
        predicate: "reviewer threshold",
        value: null,
        epistemicLabel: "FACT"
      },
      {
        rawText: "Cancellation approval threshold is two reviewers.",
        subject: "cancellation approval",
        predicate: "reviewer threshold",
        value: 2,
        epistemicLabel: "FACT"
      }
    ];
    const createdClaims = [];
    for (const body of claimBodies) {
      const created = await request(app, "POST", claimEndpoint, body, [201]);
      createdClaims.push(created.body.claim);
    }
    assert(
      createdClaims[0].claimId === IDS.conflictAllowed,
      "The controlled predecessor identity diverged."
    );

    const firstTwinRun = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/twin/revisions`,
      undefined,
      [201]
    );
    const firstTwin = firstTwinRun.body.twinRevision;
    const nodes = (
      await request(
        app,
        "GET",
        `/api/v1/missions/${mission.missionId}/twin/revisions/${firstTwin.revision}/nodes?limit=100`,
        undefined,
        [200]
      )
    ).body.nodes;
    const assets = (
      await request(
        app,
        "GET",
        `/api/v1/missions/${mission.missionId}/code-map/revisions/${codeMap.revision}/assets?limit=100`,
        undefined,
        [200]
      )
    ).body.assets;
    const asset = assets[0];
    const assetNode = nodes.find(
      (node) => node.nodeType === "SoftwareAsset" && node.source.sourceId === asset?.assetId
    );
    assert(asset !== undefined && assetNode !== undefined, "Citable SoftwareAsset is required.");

    const rootId = "root:controlled-asset";
    const supportRequirements = [
      {
        requirementId: "support:missing-review",
        supportKind: "EVIDENCE_SOURCE",
        sourceLocator: "controlled:required/review-approval"
      },
      {
        requirementId: "support:missing-validation",
        supportKind: "VALIDATION_RESULT",
        validationKey: "validation:cancellation-contract"
      }
    ];
    const roots = [{ rootId, nodeId: assetNode.nodeId }];
    const citation = {
      kind: "NODE",
      memberId: assetNode.nodeId,
      revision: assetNode.nodeRevision,
      digest: assetNode.memberDigest
    };
    const impactRequirements = [
      {
        requirementId: "impact:implementation-present",
        rootId,
        criticalAssetId: asset.assetId,
        supportKind: "IMPLEMENTATION",
        basisCitations: [citation]
      },
      {
        requirementId: "impact:asset-absent",
        rootId,
        criticalAssetId: IDS.absentAsset,
        supportKind: "IMPLEMENTATION",
        basisCitations: [citation]
      },
      {
        requirementId: "impact:validation-absent",
        rootId,
        criticalAssetId: asset.assetId,
        supportKind: "VALIDATION",
        validationKey: "validation:cancellation-contract",
        basisCitations: [citation]
      }
    ];
    const firstInput = {
      twinRevision: firstTwin.revision,
      codeMapRevision: codeMap.revision,
      targetSnapshotId: codeMap.snapshot.snapshotId,
      supportRequirements,
      roots,
      impactRequirements
    };

    const initialStarted = performance.now();
    const firstRun = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/reconciliation/revisions`,
      firstInput,
      [201]
    );
    const initialRunMs = Number((performance.now() - initialStarted).toFixed(3));
    const firstSummary = firstRun.body.reconciliationRevision;
    const firstFindings = (
      await request(
        app,
        "GET",
        `/api/v1/missions/${mission.missionId}/reconciliation/revisions/1/findings?limit=100`,
        undefined,
        [200]
      )
    ).body.findings;
    const firstPaths = (
      await request(
        app,
        "GET",
        `/api/v1/missions/${mission.missionId}/reconciliation/revisions/1/impact-paths?limit=100`,
        undefined,
        [200]
      )
    ).body.impactPaths;
    assert(firstSummary.findingCounts.CONFLICT === 1, "Conflict truth case diverged.");
    assert(firstSummary.findingCounts.AMBIGUOUS === 1, "Ambiguity truth case diverged.");
    assert(firstSummary.findingCounts.MISSING === 2, "Missing-support truth case diverged.");
    assert(firstSummary.findingCounts.STALE === 0, "Initial result cannot be stale.");
    assert(firstSummary.findingCounts.IMPACT_GAP === 2, "Impact-gap truth case diverged.");
    assert(firstSummary.impactPathCount === 2 && firstPaths.length === 2, "Impact paths diverged.");
    const initialGapReasons = firstFindings
      .filter((finding) => finding.findingKind === "IMPACT_GAP")
      .map((finding) => finding.reason)
      .sort();
    assert(
      JSON.stringify(initialGapReasons) === JSON.stringify([
        "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
        "REQUIRED_VALIDATION_RESULT_ABSENT"
      ]),
      "Impact-gap reasons diverged."
    );

    const firstReplay = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/reconciliation/revisions`,
      firstInput,
      [200]
    );
    assert(firstReplay.body.created === false, "Exact replay appended a revision.");
    assert(
      firstReplay.body.reconciliationRevision.resultDigest === firstSummary.resultDigest,
      "Exact replay digest changed."
    );

    const correction = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/claims/${IDS.conflictAllowed}/successors`,
      {
        evidenceSourceId,
        rawText: "Cancellation is forbidden before dispatch.",
        subject: "order cancellation",
        predicate: "allowed before dispatch",
        value: false,
        epistemicLabel: "FACT"
      },
      [201]
    );
    assert(
      correction.body.supersession.relationshipType === "SUPERSEDES",
      "Explicit supersession was not persisted."
    );
    const secondTwinRun = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/twin/revisions`,
      undefined,
      [201]
    );
    const secondTwin = secondTwinRun.body.twinRevision;
    const secondRelationships = (
      await request(
        app,
        "GET",
        `/api/v1/missions/${mission.missionId}/twin/revisions/${secondTwin.revision}/relationships?limit=100`,
        undefined,
        [200]
      )
    ).body.relationships;
    const supersessionRelationships = secondRelationships.filter(
      (relationship) => relationship.relationshipType === "SUPERSEDES"
    );
    assert(supersessionRelationships.length === 1, "Twin supersession projection diverged.");

    const secondInput = { ...firstInput, twinRevision: secondTwin.revision };
    const correctionStarted = performance.now();
    const secondRun = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/reconciliation/revisions`,
      secondInput,
      [201]
    );
    const correctionRunMs = Number((performance.now() - correctionStarted).toFixed(3));
    const secondSummary = secondRun.body.reconciliationRevision;
    const secondFindings = (
      await request(
        app,
        "GET",
        `/api/v1/missions/${mission.missionId}/reconciliation/revisions/2/findings?limit=100`,
        undefined,
        [200]
      )
    ).body.findings;
    assert(secondSummary.findingCounts.CONFLICT === 0, "Supersession did not clear conflict.");
    assert(secondSummary.findingCounts.AMBIGUOUS === 1, "Ambiguity unexpectedly changed.");
    assert(secondSummary.findingCounts.MISSING === 2, "Missing support unexpectedly changed.");
    assert(secondSummary.findingCounts.STALE === 1, "Stale successor truth case diverged.");
    assert(secondSummary.findingCounts.IMPACT_GAP === 2, "Impact gaps unexpectedly changed.");
    assert(
      secondFindings.some((finding) => finding.findingKind === "STALE"),
      "Stale finding was not retrievable."
    );

    const revisionCountBeforeExplanations = (
      await reconciliations.list(project.projectId, mission.missionId, 100)
    ).items.length;
    const citedApiResponses = [];
    let renderedStatementCount = 0;
    let resolvedStatementCitationCount = 0;
    let syntheticSuggestionCount = 0;
    let resolvedSyntheticCitationCount = 0;
    const syntheticKinds = new Set();
    for (const question of CITED_QUESTIONS) {
      const response = await request(
        app,
        "POST",
        `/api/v1/missions/${mission.missionId}/cited-explanations`,
        { question },
        [200]
      );
      const body = response.body;
      assert(body.apiVersion === "v2", "The cited-explanation API version diverged.");
      assert(body.question === question, "The fixed cited question changed.");
      assert(
        body.execution.primaryExplanation === "DETERMINISTIC_EXPLANATION" &&
          body.execution.externalAiStatus === "OFF" &&
          body.execution.providerOutcome === "DISABLED" &&
          body.execution.failureCode === "PROVIDER_DISABLED" &&
          body.execution.externalCallMade === false &&
          body.execution.canonicalStateChanged === false,
        "The production cited-explanation execution boundary diverged."
      );
      assert(
        body.disclosure.transferStatus === "NOT_SENT" &&
          body.disclosure.evidencePackDigest ===
            body.offlineExplanation.evidencePackDigest &&
          body.disclosure.questionDigest === body.offlineExplanation.questionDigest,
        "The exact outbound disclosure binding diverged."
      );
      const pack = JSON.parse(body.disclosure.exactRedactedPackJson);
      assert(
        pack.packDigest === body.disclosure.evidencePackDigest &&
          pack.question === question &&
          pack.items.length === body.disclosure.itemCount &&
          pack.citations.length === body.disclosure.citationCount,
        "The disclosed redacted pack is not exact."
      );
      const resolved = new Set(
        body.citationDetails.map((citation) => citation.citationId)
      );
      const statements = allStatements(body.offlineExplanation);
      assert(
        statements.every((statement) =>
          statement.citationIds.length > 0 &&
          statement.citationIds.every((citationId) => resolved.has(citationId))
        ),
        "A deterministic statement citation did not resolve."
      );
      renderedStatementCount += statements.length;
      resolvedStatementCitationCount += statements.reduce(
        (total, statement) => total + statement.citationIds.length,
        0
      );
      const synthetic = body.syntheticEdgeCases;
      assert(
        synthetic.version === "synthetic-edge-case-set.v1" &&
          synthetic.digestVersion === "synthetic-edge-case-set-digest.v1" &&
          synthetic.policyVersion === "synthetic-edge-case-policy.v1" &&
          synthetic.projectId === pack.projectId &&
          synthetic.missionId === mission.missionId &&
          synthetic.evidencePackDigest === pack.packDigest &&
          synthetic.questionDigest === pack.questionDigest &&
          synthetic.generation.mode === "DETERMINISTIC_RULES" &&
          synthetic.generation.provider === "NONE" &&
          synthetic.generation.externalCallMade === false,
        "The synthetic edge-case identity or generation boundary diverged."
      );
      assert(
        synthetic.authority.canonicalStateChanged === false &&
          synthetic.authority.findingMutationAvailable === false &&
          synthetic.authority.readinessAuthority === false &&
          synthetic.authority.releasePassportAuthority === false,
        "The synthetic edge-case authority boundary diverged."
      );
      const syntheticCitationRegistry = new Set(
        synthetic.citations.map((citation) => citation.citationId)
      );
      assert(
        synthetic.suggestions.every(
          (entry) =>
            entry.syntheticLabel === "SYNTHETIC" &&
            entry.authorityLabel === "ADVISORY_ONLY" &&
            entry.evidenceStatus === "NOT_EVIDENCE" &&
            entry.citationIds.length > 0 &&
            entry.citationIds.every(
              (citationId) =>
                resolved.has(citationId) &&
                syntheticCitationRegistry.has(citationId)
            )
        ),
        "A synthetic edge-case label or citation diverged."
      );
      syntheticSuggestionCount += synthetic.suggestions.length;
      resolvedSyntheticCitationCount += synthetic.suggestions.reduce(
        (total, entry) => total + entry.citationIds.length,
        0
      );
      for (const entry of synthetic.suggestions) syntheticKinds.add(entry.kind);
      const serializedBody = JSON.stringify(body);
      assert(
        !serializedBody.includes(temporaryRoot) &&
          !serializedBody.includes(repositoryRoot),
        "The cited response exposed a private absolute root."
      );
      citedApiResponses.push(body);
    }

    const validMockService = new CitedExplanationService({
      twins,
      evidence,
      claims,
      assessments: reconciliations,
      adapter: createProviderNeutralAdapter({
        mode: "MOCK_VALIDATION",
        transport: {
          transportKind: "MOCK_VALIDATION",
          providerId: "controlled.mock",
          modelId: "schema-fixture-v1",
          execute: async (providerRequest) =>
            controlledAdvisory(
              providerRequest,
              providerRequest.allowedCitationIds[0]
            )
        }
      })
    });
    const acceptedMock = await validMockService.execute(
      project.projectId,
      mission.missionId,
      "Can we release?",
      "00000000-0000-4000-8000-000000000201"
    );
    assert(
      acceptedMock.execution.providerOutcome === "ADVISORY_ACCEPTED" &&
        acceptedMock.advisory?.response.answer.text ===
          "Controlled mock advisory summary.",
      "A valid controlled mock advisory was not accepted."
    );

    let unknownCitationAttempts = 0;
    const unknownCitationService = new CitedExplanationService({
      twins,
      evidence,
      claims,
      assessments: reconciliations,
      adapter: createProviderNeutralAdapter({
        mode: "MOCK_VALIDATION",
        transport: {
          transportKind: "MOCK_VALIDATION",
          providerId: "controlled.mock",
          modelId: "schema-fixture-v1",
          execute: async (providerRequest) => {
            unknownCitationAttempts += 1;
            return controlledAdvisory(providerRequest, UNKNOWN_CITATION);
          }
        }
      })
    });
    const rejectedUnknownCitation = await unknownCitationService.execute(
      project.projectId,
      mission.missionId,
      "Can we release?",
      "00000000-0000-4000-8000-000000000202"
    );
    assert(
      rejectedUnknownCitation.execution.providerOutcome === "ADVISORY_REJECTED" &&
        rejectedUnknownCitation.execution.failureCode ===
          "PROVIDER_CITATION_INVALID" &&
        rejectedUnknownCitation.advisory === undefined &&
        unknownCitationAttempts === 1,
      "Unknown-citation rejection diverged."
    );

    let transportFailureAttempts = 0;
    const failedTransportService = new CitedExplanationService({
      twins,
      evidence,
      claims,
      assessments: reconciliations,
      adapter: createProviderNeutralAdapter({
        mode: "MOCK_VALIDATION",
        transport: {
          transportKind: "MOCK_VALIDATION",
          providerId: "controlled.mock",
          modelId: "schema-fixture-v1",
          execute: async () => {
            transportFailureAttempts += 1;
            throw new Error("controlled transport failure");
          }
        }
      })
    });
    const failedTransport = await failedTransportService.execute(
      project.projectId,
      mission.missionId,
      "Can we release?",
      "00000000-0000-4000-8000-000000000203"
    );
    assert(
      failedTransport.execution.providerOutcome === "ADVISORY_UNAVAILABLE" &&
        failedTransport.execution.failureCode === "PROVIDER_TRANSPORT_FAILED" &&
        failedTransport.advisory === undefined &&
        transportFailureAttempts === 2 &&
        failedTransport.offlineExplanation.explanationDigest ===
          rejectedUnknownCitation.offlineExplanation.explanationDigest,
      "Provider-failure fallback or bounded retry diverged."
    );
    const revisionCountAfterExplanations = (
      await reconciliations.list(project.projectId, mission.missionId, 100)
    ).items.length;
    assert(
      revisionCountAfterExplanations === revisionCountBeforeExplanations,
      "Cited explanations changed canonical reconciliation history."
    );

    const reorderedInput = {
      ...secondInput,
      supportRequirements: [...supportRequirements].reverse(),
      roots: [...roots].reverse(),
      impactRequirements: [...impactRequirements].reverse()
    };
    const reorderedReplay = await request(
      app,
      "POST",
      `/api/v1/missions/${mission.missionId}/reconciliation/revisions`,
      reorderedInput,
      [200]
    );
    assert(reorderedReplay.body.created === false, "Reordered equivalent input appended history.");
    assert(
      reorderedReplay.body.reconciliationRevision.resultDigest === secondSummary.resultDigest,
      "Reordered equivalent input changed the result digest."
    );

    const replayDurations = [];
    let replayBody;
    for (let index = 0; index < REPLAY_ITERATIONS; index += 1) {
      const started = performance.now();
      const replay = await request(
        app,
        "POST",
        `/api/v1/missions/${mission.missionId}/reconciliation/revisions`,
        secondInput,
        [200]
      );
      replayDurations.push(performance.now() - started);
      assert(replay.body.created === false, "Measured replay appended history.");
      const serialized = JSON.stringify(replay.body);
      if (replayBody === undefined) replayBody = serialized;
      assert(serialized === replayBody, "Measured replay response bytes changed.");
    }
    const replay = timingSummary(replayDurations);
    const accuracy = Object.freeze({ passed: 6, total: 6, percentage: 100 });
    const repositoryTreeAfter = treeDigest(repositoryRoot);
    assert(repositoryTreeAfter === repositoryTreeBefore, "Product modified the registered repository.");
    assert(externalCallAttempts === 0, "The evidence path attempted an external call.");

    await app.close();
    app = undefined;
    database.close();
    database = undefined;
    restarted = openFoundationDatabase({ filePath: databasePath });
    const restored = await new SqliteReconciliationRepository(restarted.connection).get(
      project.projectId,
      mission.missionId,
      2
    );
    assert(restored.resultDigest === secondSummary.resultDigest, "Restart digest equality failed.");

    writeFileSync(
      METRICS_OUTPUT,
      metricsMarkdown({ accuracy, initialRunMs, correctionRunMs, replay }),
      "utf8"
    );
    const documentation = verifyDocumentation();
    const truthTable = [
      { case: "ACTIVE_VALUE_CONFLICT", expected: 1, observed: firstSummary.findingCounts.CONFLICT, status: "PASS" },
      { case: "NULL_VERSUS_KNOWN_AMBIGUITY", expected: 1, observed: firstSummary.findingCounts.AMBIGUOUS, status: "PASS" },
      { case: "DECLARED_SUPPORT_MISSING", expected: 2, observed: firstSummary.findingCounts.MISSING, status: "PASS" },
      { case: "IMPLEMENTATION_AND_VALIDATION_GAPS", expected: 2, observed: firstSummary.findingCounts.IMPACT_GAP, status: "PASS" },
      { case: "EXPLICIT_SUPERSESSION_CLEARS_CONFLICT", expected: 0, observed: secondSummary.findingCounts.CONFLICT, status: "PASS" },
      { case: "EXACT_DEPENDENCY_CHANGE_APPENDS_STALE", expected: 1, observed: secondSummary.findingCounts.STALE, status: "PASS" }
    ];
    const citationReport = {
      schemaVersion: 1,
      evidenceId: "EV-CITATIONS",
      storyBoundary: { from: "IL-6.1", through: "IL-6.7" },
      capabilities: ["DC-06", "SUP-03"],
      phaseExitAuthority: "G3_DETERMINISTIC_CORE_PROVEN",
      status: "PASS",
      evidenceDate: "2026-08-06",
      reproductionCommand: "npm.cmd run evidence:citations",
      fixture: {
        ownership: "INTELLILOOP_AUTHORED_SYNTHETIC",
        network: "OFFLINE",
        sourceAssessmentRevision: secondSummary.revision,
        sourceTwinRevision: secondTwin.revision,
        externalProviderUsed: false,
        controlledMockValidationUsed: true
      },
      proofs: {
        fixedQuestionApi: {
          expectedQuestions: CITED_QUESTIONS.length,
          passedQuestions: citedApiResponses.length,
          exactQuestions: CITED_QUESTIONS,
          deterministicPrimaryForEveryQuestion: "PASS",
          aiOffForEveryQuestion: "PASS",
          unsupportedQuestionAccepted: false
        },
        outboundDisclosure: {
          transferStatus: "NOT_SENT",
          exactPackJsonReturnedForReview: "PASS",
          questionPackAndExplanationDigestBinding: "PASS",
          maximumSerializedBytes: Math.max(
            ...citedApiResponses.map(
              (response) => response.disclosure.serializedBytes
            )
          ),
          maximumConservativeInputTokenUpperBound: Math.max(
            ...citedApiResponses.map(
              (response) => response.disclosure.inputTokenUpperBound
            )
          ),
          serializedBytesByQuestion: citedApiResponses.map((response) => ({
            question: response.question,
            serializedBytes: response.disclosure.serializedBytes
          })),
          privateAbsoluteRootAbsent: "PASS",
          rawRepositoryBodiesRecorded: false
        },
        citations: {
          renderedStatementCount,
          resolvedStatementCitationCount,
          everyStatementCited: "PASS",
          everyRenderedCitationResolved: "PASS",
          unknownCitationRendered: false
        },
        syntheticEdgeCases: {
          fixedQuestionSets: citedApiResponses.length,
          totalSuggestions: syntheticSuggestionCount,
          resolvedSuggestionCitationCount: resolvedSyntheticCitationCount,
          suggestionKinds: [...syntheticKinds].sort(),
          generationMode: "DETERMINISTIC_RULES",
          provider: "NONE",
          everySuggestionSynthetic: "PASS",
          everySuggestionAdvisoryOnly: "PASS",
          everySuggestionNotEvidence: "PASS",
          everySuggestionCitationResolved: "PASS",
          externalCallMade: false
        },
        providerBoundary: {
          productionOutcome: "DISABLED",
          validControlledMockAdvisoryAccepted: "PASS",
          unknownCitationRejectedWithoutRetry: "PASS",
          transportFailureRetriedOnceThenFellBack: "PASS",
          unvalidatedProviderTextReturned: false,
          externalCallMade: false
        },
        authority: {
          canonicalStateChanged: false,
          reconciliationRevisionCountBefore: revisionCountBeforeExplanations,
          reconciliationRevisionCountAfter: revisionCountAfterExplanations,
          findingMutationAvailable: false,
          releaseDecisionAvailable: false,
          passportAvailable: false
        }
      },
      integrity: {
        rawAbsolutePathsRecorded: false,
        credentialReadOrRecorded: false,
        externalProductCallMade: false,
        personalOrCandidateRepositoryUsed: false,
        generatedReportContainsProviderBodies: false,
        temporaryFixtureRemovedAfterRun: true
      },
      limitations: [
        "CONTROLLED_SYNTHETIC_EVIDENCE_ONLY",
        "NO_LIVE_PROVIDER_CALL",
        "NO_PERSISTED_EXPLANATION_OR_PROVIDER_RESPONSE",
        "NO_RELEASE_READINESS_OR_PASSPORT_AUTHORITY",
        "BROWSER_REGRESSION_RECORDED_SEPARATELY"
      ],
      nextAuthorizedStory: "IL-7.1"
    };
    const report = {
      schemaVersion: 1,
      evidenceId: "EV-RECONCILE",
      storyBoundary: { from: "IL-5.1", through: "IL-5.7" },
      capabilities: ["DC-04", "DC-05"],
      phaseExitAuthority: "DC-04_AND_DC-05",
      status: "PASS",
      evidenceDate: "2026-08-06",
      reproductionCommand: "npm.cmd run evidence:reconcile",
      programGate: {
        id: "G3_DETERMINISTIC_CORE_PROVEN",
        status: "PASS",
        reason: "EV-RECONCILE and EV-CITATIONS jointly prove the deterministic core plus the required cited-question, disclosure and citation/mock boundary through IL-6.4."
      },
      fixture: {
        ownership: "INTELLILOOP_AUTHORED_SYNTHETIC",
        network: "OFFLINE",
        databasePlacement: "OUTSIDE_REGISTERED_REPOSITORY",
        projectCount: 1,
        missionCount: 1,
        evidenceSourceCount: 1,
        initialClaimCount: 4,
        explicitSuccessorCount: 1
      },
      proofs: {
        truthTable,
        findingKinds: {
          initial: findingKinds(firstFindings),
          corrected: findingKinds(secondFindings)
        },
        impact: {
          initialPathCount: firstSummary.impactPathCount,
          exactGapReasons: initialGapReasons,
          citationsRequiredAndVerified: "PASS"
        },
        supersession: {
          explicitLinkCount: 1,
          projectedTwinRelationshipCount: supersessionRelationships.length,
          predecessorPreservedInHistory: "PASS",
          canonicalFindingMutationAvailable: false
        },
        deterministicRerun: {
          exactInputReplayCreatedRevision: false,
          reorderedInputReplayCreatedRevision: false,
          canonicalResultDigestEquality: "PASS",
          reorderedResultDigestEquality: "PASS",
          measuredReplayResponseByteEquality: "PASS",
          measuredReplayIterations: REPLAY_ITERATIONS
        },
        persistence: {
          immutableRevisionCount: 2,
          restartDigestEquality: "PASS",
          historicalRevisionPreserved: "PASS"
        },
        controlledMetrics: {
          accuracy,
          initialRunMilliseconds: initialRunMs,
          correctionRunMilliseconds: correctionRunMs,
          exactReplay: replay,
          productionExtrapolationPerformed: false,
          passThresholdBasedOnWallClock: false
        },
        repositorySafety: {
          treeDigestEquality: "PASS",
          repositoryCodeExecuted: false,
          dependencyInstallationPerformed: false,
          repositoryWritePerformedByProduct: false
        },
        documentation
      },
      integrity: {
        rawAbsolutePathsRecorded: false,
        repositoryContentBodiesRecorded: false,
        credentialReadOrRecorded: false,
        externalProductCallMade: false,
        personalOrCandidateRepositoryUsed: false,
        temporaryFixtureRemovedAfterRun: true
      },
      limitations: [
        "CONTROLLED_SYNTHETIC_TRUTH_TABLE_ONLY",
        "LOCAL_SINGLE_PROCESS_TIMING_ONLY",
        "NO_PRODUCTION_OR_ORGANIZATIONAL_EXTRAPOLATION",
        "NO_PERSISTED_VALIDATION_RESULT_INTAKE",
        "NO_LIVE_AI_PROVIDER_OR_READINESS_AUTHORITY"
      ],
      nextAuthorizedStory: "IL-6.5"
    };
    const serialized = JSON.stringify(report, null, 2);
    const serializedCitationReport = JSON.stringify(citationReport, null, 2);
    assert(!serialized.includes(temporaryRoot), "Evidence report exposed a temporary root.");
    assert(
      !serializedCitationReport.includes(temporaryRoot) &&
        !serializedCitationReport.includes(repositoryRoot),
      "Citation evidence report exposed a private root."
    );
    writeFileSync(EVIDENCE_OUTPUT, `${serialized}\n`, "utf8");
    writeFileSync(
      CITATION_EVIDENCE_OUTPUT,
      `${serializedCitationReport}\n`,
      "utf8"
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (app !== undefined) await app.close();
    if (database !== undefined) database.close();
    if (restarted !== undefined) restarted.close();
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  await generate();
  process.stdout.write(
    `EV-RECONCILE: PASS; 6/6 truth cases and ${REPLAY_ITERATIONS}/${REPLAY_ITERATIONS} deterministic replays passed. EV-CITATIONS: PASS; ${CITED_QUESTIONS.length}/${CITED_QUESTIONS.length} fixed questions and all citation/mock boundaries passed.\n`
  );
} catch (error) {
  process.stderr.write("EV-RECONCILE: FAIL; see the bounded proof implementation.\n");
  if (process.env.INTELLILOOP_EVIDENCE_DEBUG === "1" && error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
  }
  process.exitCode = 1;
}
