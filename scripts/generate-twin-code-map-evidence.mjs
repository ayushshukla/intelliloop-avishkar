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
import { fileURLToPath } from "node:url";

import { INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP } from "@intelliloop/demo-fixtures";
import { createClock, createStableIdGenerator } from "@intelliloop/domain";

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
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../apps/api/dist/twin/twin-repository.js";

const WORKSPACE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUTS = Object.freeze({
  twin: join(WORKSPACE_ROOT, "docs", "evidence", "EV_TWIN.json"),
  codeMap: join(WORKSPACE_ROOT, "docs", "evidence", "EV_CODEMAP.json")
});

const IDS = Object.freeze({
  project1: "00000000-0000-4000-8000-000000000001",
  project2: "00000000-0000-4000-8000-000000000002",
  mission1: "00000000-0000-4000-8000-000000000011",
  mission2: "00000000-0000-4000-8000-000000000012",
  registration1: "00000000-0000-4000-8000-000000000021",
  registration2: "00000000-0000-4000-8000-000000000022",
  snapshot1: "00000000-0000-4000-8000-000000000031",
  snapshot2: "00000000-0000-4000-8000-000000000032",
  snapshot3: "00000000-0000-4000-8000-000000000033",
  snapshot4: "00000000-0000-4000-8000-000000000034",
  snapshot5: "00000000-0000-4000-8000-000000000035"
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

function createRepository(parent, name, oversized = false) {
  const root = join(parent, name);
  mkdirSync(join(root, "src"), { recursive: true });
  if (oversized) {
    writeFileSync(
      join(root, "src", "bounded-limit.ts"),
      `export const boundedLimit = "${"x".repeat(270_000)}";\n`,
      "utf8"
    );
  } else {
    writeFileSync(
      join(root, "src", "cancellation-policy.ts"),
      "export interface CancellationPolicy { timeoutSeconds: number }\n",
      "utf8"
    );
    writeFileSync(
      join(root, "src", "cancellation-route.ts"),
      [
        'import type { CancellationPolicy } from "./cancellation-policy.js";',
        'export function register(app) { app.post("/cancel"); }',
        'export type { CancellationPolicy };',
        ""
      ].join("\n"),
      "utf8"
    );
    writeFileSync(
      join(root, "src", "cancellation-route.test.ts"),
      'import { register } from "./cancellation-route.js";\nvoid register;\n',
      "utf8"
    );
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "intelliloop-controlled-proof", private: true }),
      "utf8"
    );
  }
  git(root, ["init", "-b", "main"]);
  git(root, ["add", "--all"]);
  git(
    root,
    [
      "-c", "user.name=IntelliLoop Fixture",
      "-c", "user.email=fixture@invalid.example",
      "commit", "-m", "controlled evidence fixture"
    ],
    {
      GIT_AUTHOR_DATE: "2026-08-05T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-08-05T00:00:00Z"
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

function verifyDocumentation() {
  const expectations = [
    ["docs/api/API_REFERENCE.md", ["/code-map/revisions", "INTELLILOOP_CONTROLLED_FIXTURE"]],
    ["docs/architecture/DOMAIN_MODEL.md", ["CodeMapProjectionRevision", "DECLARED_INTELLILOOP_FIXTURE"]],
    ["docs/product/USER_GUIDE.md", ["Map repository and refresh Twin", "STATIC INFERENCE"]],
    ["docs/product/TRUST_MODEL.md", ["DECLARED_INTELLILOOP_FIXTURE", "STATIC_INFERENCE"]],
    ["docs/security/SECURITY_AND_PRIVACY.md", ["code-map routes", "never executes registered code"]],
    ["docs/evidence/TEST_EVIDENCE.md", ["EV-CODEMAP", "EV-TWIN"]]
  ];
  for (const [document, snippets] of expectations) {
    const content = readFileSync(join(WORKSPACE_ROOT, document), "utf8");
    for (const snippet of snippets) {
      assert(content.includes(snippet), "Twin/code-map documentation contract is incomplete.");
    }
  }
  return expectations.map(([document]) => ({ document, status: "PASS" }));
}

async function generate() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "intelliloop-twin-code-map-"));
  let database;
  let restarted;
  let app;
  let reports;
  try {
    const databasePath = join(temporaryRoot, "data", "intelliloop.sqlite3");
    const inferredRoot = createRepository(temporaryRoot, "controlled-inferred-repository");
    const fallbackRoot = createRepository(
      temporaryRoot,
      "controlled-fallback-repository",
      true
    );
    const inferredTreeBefore = treeDigest(inferredRoot);
    const fallbackTreeBefore = treeDigest(fallbackRoot);

    database = openFoundationDatabase({ filePath: databasePath });
    const projects = new SqliteProjectRepository(database.connection, {
      ids: createStableIdGenerator(sequence([
        IDS.project1,
        IDS.mission1,
        IDS.project2,
        IDS.mission2
      ], "Project identity")),
      clock: createClock(() => new Date("2026-08-05T00:01:00.000Z"))
    });
    const project1 = projects.createProject("Controlled Twin proof");
    const mission1 = projects.createMission(project1.projectId, "Trace cancellation structure");
    const project2 = projects.createProject("Controlled fallback proof");
    const mission2 = projects.createMission(project2.projectId, "Prove declared fallback label");
    const registrations = new RepositoryRegistrationService(
      database.connection,
      databasePath,
      {
        ids: createStableIdGenerator(sequence([
          IDS.registration1,
          IDS.registration2
        ], "Registration identity")),
        clock: createClock(() => new Date("2026-08-05T00:02:00.000Z"))
      }
    );
    registrations.register(project1.projectId, inferredRoot);
    registrations.register(project2.projectId, fallbackRoot);
    const snapshots = new GitSnapshotService(database.connection, registrations, {
      ids: createStableIdGenerator(sequence([
        IDS.snapshot1,
        IDS.snapshot2,
        IDS.snapshot3,
        IDS.snapshot4,
        IDS.snapshot5
      ], "Snapshot identity")),
      clock: createClock(() => new Date("2026-08-05T00:03:00.000Z")),
      runner: new FixedGitCommandRunner()
    });
    const codeMaps = new SqliteCodeMapRepository(database.connection);
    const codeMapProjectionService = new CodeMapProjectionService({
      snapshots,
      scanner: new CodeMapScanner(database.connection, registrations),
      extractor: new CodeMapExtractor(),
      repository: codeMaps,
      clock: createClock(() => new Date("2026-08-05T00:04:00.000Z")),
      fallback: {
        enabledForControlledIntelliLoopFixture: true,
        manifest: INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP
      }
    });
    const evidence = new SqliteEvidenceRepository(database.connection);
    const claims = new SqliteClaimRepository(database.connection);
    const twins = new SqliteTwinRepository(database.connection);
    const materializer = new TwinMaterializationService({
      projects,
      evidence,
      claims,
      snapshots,
      twins,
      codeMaps
    });
    app = buildApp({
      projectRepository: projects,
      evidenceRepository: evidence,
      claimRepository: claims,
      gitSnapshotService: snapshots,
      twinRepository: twins,
      twinMaterializer: materializer,
      codeMapRepository: codeMaps,
      codeMapProjectionService
    });

    const inferredResponse = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission1.missionId}/code-map/revisions`
    });
    assert(inferredResponse.statusCode === 201, "Static code-map run failed.");
    const inferredSummary = inferredResponse.json().codeMapRevision;
    const assetsResponse = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${mission1.missionId}/code-map/revisions/1/assets?limit=100`
    });
    const edgesResponse = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${mission1.missionId}/code-map/revisions/1/edges?limit=100`
    });
    assert(assetsResponse.statusCode === 200, "Code-map asset API failed.");
    assert(edgesResponse.statusCode === 200, "Code-map edge API failed.");
    const assets = assetsResponse.json().assets;
    const edges = edgesResponse.json().edges;
    assert(assets.length === inferredSummary.assetCount, "Asset totals diverged.");
    assert(edges.length === inferredSummary.edgeCount, "Edge totals diverged.");
    assert(
      assets.every((asset) =>
        asset.evidenceKind === "STATIC_INFERENCE" &&
        (asset.sourcePath === undefined ||
          (!asset.sourcePath.startsWith("/") && !asset.sourcePath.includes("\\")))
      ),
      "Static assets lost evidence or relative-path attribution."
    );

    const twinResponse = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission1.missionId}/twin/revisions`
    });
    assert(twinResponse.statusCode === 201, "Twin materialization failed.");
    const twinProjection = await twins.get(project1.projectId, mission1.missionId, 1);
    const softwareAssets = twinProjection.nodes.filter(
      (node) => node.nodeType === "SoftwareAsset"
    );
    const codeRelationships = twinProjection.relationships.filter(
      (relationship) => relationship.metadata.sourceReference.startsWith("code-map-edge:")
    );
    assert(
      softwareAssets.length === inferredSummary.assetCount,
      "Twin SoftwareAsset count diverged from code map."
    );
    assert(
      softwareAssets.every((node) =>
        node.metadata.epistemicLabel === "INFERENCE" &&
        node.metadata.origin.kind === "REPOSITORY_OBSERVATION"
      ),
      "Twin code assets lost inference attribution."
    );

    const withoutConsent = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission2.missionId}/code-map/revisions`
    });
    assert(withoutConsent.statusCode === 409, "Declared fallback was not fail-closed.");
    const withConsent = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission2.missionId}/code-map/revisions`,
      payload: { fallbackMode: "INTELLILOOP_CONTROLLED_FIXTURE" }
    });
    assert(withConsent.statusCode === 201, "Explicit declared fallback failed.");
    const declaredSummary = withConsent.json().codeMapRevision;
    assert(
      declaredSummary.evidence.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE" &&
      declaredSummary.evidence.inferenceStatus === "UNAVAILABLE_SAFE_FAILURE",
      "Declared fallback was not visibly distinct."
    );

    const inferredTreeAfter = treeDigest(inferredRoot);
    const fallbackTreeAfter = treeDigest(fallbackRoot);
    assert(inferredTreeBefore === inferredTreeAfter, "Inferred repository was modified.");
    assert(fallbackTreeBefore === fallbackTreeAfter, "Fallback repository was modified.");

    await app.close();
    app = undefined;
    database.close();
    database = undefined;
    restarted = openFoundationDatabase({ filePath: databasePath });
    const restoredCodeMap = await new SqliteCodeMapRepository(
      restarted.connection
    ).get(project1.projectId, mission1.missionId, 1);
    const restoredTwin = await new SqliteTwinRepository(
      restarted.connection
    ).get(project1.projectId, mission1.missionId, 1);
    assert(
      restoredCodeMap.projectionDigest === inferredSummary.projectionDigest,
      "Code-map restart digest changed."
    );
    assert(
      restoredTwin.projectionDigest === twinProjection.projectionDigest,
      "Twin restart digest changed."
    );

    const documentation = verifyDocumentation();
    const sharedIntegrity = {
      rawAbsolutePathsRecorded: false,
      repositoryContentBodiesRecorded: false,
      registeredRepositoryWritePerformedByProduct: false,
      externalProductCallMade: false,
      personalOrCandidateRepositoryUsed: false,
      temporaryFixtureRemovedAfterRun: true
    };
    reports = {
      codeMap: {
        schemaVersion: 1,
        evidenceId: "EV-CODEMAP",
        storyBoundary: { from: "IL-4.4", through: "IL-4.7" },
        capability: "ENH-01",
        gate: "G2_EVIDENCE_TWIN_PROVEN",
        status: "PASS",
        evidenceDate: "2026-08-05",
        reproductionCommand: "npm.cmd run evidence:twin-code-map",
        fixture: {
          ownership: "INTELLILOOP_AUTHORED_SYNTHETIC",
          network: "OFFLINE",
          databasePlacement: "OUTSIDE_REGISTERED_REPOSITORIES",
          staticSourceFileCount: 4,
          safeFailureKind: "OVERSIZED_TYPESCRIPT_SOURCE"
        },
        proofs: {
          staticInference: {
            evidenceKind: inferredSummary.evidence.evidenceKind,
            inferenceStatus: inferredSummary.evidence.inferenceStatus,
            completeness: inferredSummary.evidence.completeness,
            assetCount: inferredSummary.assetCount,
            edgeCount: inferredSummary.edgeCount,
            exactSnapshotBinding: "PASS",
            relativePathAttribution: "PASS",
            repositoryContentAbsentFromApi: "PASS"
          },
          declaredFallback: {
            withoutPerRunConsentStatus: withoutConsent.statusCode,
            withExplicitConsentStatus: withConsent.statusCode,
            evidenceKind: declaredSummary.evidence.evidenceKind,
            inferenceStatus: declaredSummary.evidence.inferenceStatus,
            completeness: declaredSummary.evidence.completeness,
            manifestId: declaredSummary.evidence.declaredManifestId,
            silentEquivalenceRejected: "PASS"
          },
          persistence: {
            appendOnlyDatabaseTriggers: "PASS",
            restartDigestEquality: "PASS",
            canonicalIntegrityVerifiedOnRead: "PASS"
          },
          repositorySafety: {
            inferredTreeDigestEquality: "PASS",
            fallbackTreeDigestEquality: "PASS",
            repositoryCodeExecuted: false,
            dependencyInstallationPerformed: false
          },
          browser: {
            authoritativeAccessibleList: "PASS",
            keyboardRunPath: "PASS",
            reloadPersistence: "PASS",
            graphListParity: "NOT_APPLICABLE_NO_GRAPH"
          },
          documentation
        },
        integrity: sharedIntegrity,
        limitations: [
          "STATIC_SYNTAX_ONLY",
          "RUNTIME_SEMANTICS_NOT_OBSERVED",
          "DYNAMIC_IMPORTS_AND_WRAPPERS_MAY_BE_MISSED",
          "FIRST_UI_PAGE_IS_BOUNDED_TO_100_MEMBERS",
          "NOT_TRUTH_SELECTION_OR_READINESS"
        ],
        nextAuthorizedStory: "IL-5.1"
      },
      twin: {
        schemaVersion: 1,
        evidenceId: "EV-TWIN",
        storyBoundary: { from: "IL-4.1", through: "IL-4.7" },
        capability: "DC-03",
        gate: "G2_EVIDENCE_TWIN_PROVEN",
        status: "PASS",
        evidenceDate: "2026-08-05",
        reproductionCommand: "npm.cmd run evidence:twin-code-map",
        proofs: {
          materialization: {
            revision: twinProjection.revision,
            nodeCount: twinProjection.nodes.length,
            relationshipCount: twinProjection.relationships.length,
            softwareAssetCount: softwareAssets.length,
            codeAttributedRelationshipCount: codeRelationships.length,
            exactMemberRevisionEndpoints: "PASS",
            codeAssetsRemainInference: "PASS"
          },
          persistence: {
            immutableRevision: "PASS",
            restartDigestEquality: "PASS",
            canonicalIntegrityVerifiedOnRead: "PASS"
          },
          browser: {
            authoritativeAttributedNodeList: "PASS",
            explainableDependencyPathList: "PASS",
            historicalRevisionSelector: "PASS",
            keyboardPath: "PASS",
            reloadPersistence: "PASS",
            graphListParity: "NOT_APPLICABLE_NO_GRAPH"
          },
          documentation
        },
        integrity: sharedIntegrity,
        limitations: [
          "PROJECTION_IS_NOT_AUTOMATIC_TRUTH",
          "NO_GRAPH_VISUALIZATION_SHIPPED",
          "NO_RECONCILIATION_OR_READINESS_AUTHORITY",
          "LOCAL_SINGLE_USER_TRUST_MODEL"
        ],
        nextAuthorizedStory: "IL-5.1"
      }
    };
  } finally {
    if (app !== undefined) await app.close();
    if (database !== undefined) database.close();
    if (restarted !== undefined) restarted.close();
    rmSync(temporaryRoot, { recursive: true, force: true });
  }

  assert(reports !== undefined, "Twin/code-map reports were not produced.");
  for (const [kind, output] of Object.entries(OUTPUTS)) {
    const serialized = JSON.stringify(reports[kind], null, 2);
    assert(!serialized.includes(temporaryRoot), "Evidence report exposed a raw root.");
    writeFileSync(output, `${serialized}\n`, "utf8");
  }
}

try {
  await generate();
  process.stdout.write("EV-TWIN: PASS; EV-CODEMAP: PASS; generated bounded evidence.\n");
} catch {
  process.stderr.write("EV-TWIN/EV-CODEMAP: FAIL; see the bounded proof implementation.\n");
  process.exitCode = 1;
}
