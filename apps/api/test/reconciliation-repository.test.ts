import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  analyzeChangeImpact,
  createClock,
  createCodeMapProjectionRevision,
  createReconciliationImpactRevision,
  createStableIdGenerator,
  parseUtcTimestamp,
  projectTwinRevision,
  reassessReconciliation,
  sha256TextDigest,
  serializeTwinNode,
  type ProjectDomainDependencies,
  type ReconciliationImpactRevision
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { SqliteCodeMapRepository } from "../src/code-map/code-map-repository.js";
import {
  openFoundationDatabase,
  type FoundationDatabase
} from "../src/database/database-lifecycle.js";
import { FixedGitCommandRunner } from "../src/projects/git-command-runner.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";
import {
  ReconciliationRepositoryError,
  SqliteReconciliationRepository
} from "../src/reconciliation/reconciliation-repository.js";
import { SqliteTwinRepository } from "../src/twin/twin-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";

const directories: string[] = [];
const databases: FoundationDatabase[] = [];

function sequence(values: readonly string[]): () => string {
  let index = 0;
  return () => values[index++] ?? "fixture-exhausted";
}

function git(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: "ignore",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1" }
  });
  if (result.status !== 0) throw new Error("Git fixture command failed.");
}

function projectDependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(sequence([P1, M1])),
    clock: createClock(() => new Date("2026-08-05T10:00:00.000Z"))
  };
}

function registrationDependencies(): RepositoryRegistrationDependencies {
  return {
    ids: createStableIdGenerator(() => R1),
    clock: createClock(() => new Date("2026-08-05T10:01:00.000Z"))
  };
}

interface Fixture {
  readonly root: string;
  readonly filePath: string;
  readonly database: FoundationDatabase;
  readonly aggregate: ReconciliationImpactRevision;
  readonly createSuccessor: () => Promise<ReconciliationImpactRevision>;
}

async function fixture(): Promise<Fixture> {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-reconciliation-"));
  directories.push(root);
  const repositoryRoot = join(root, "repository");
  mkdirSync(join(repositoryRoot, "src"), { recursive: true });
  writeFileSync(join(repositoryRoot, "src", "a.ts"), "export const a = 1;\n", "utf8");
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, [
    "-c", "user.name=IntelliLoop Fixture",
    "-c", "user.email=fixture@invalid.example",
    "commit", "-m", "fixture"
  ]);

  const filePath = join(root, "data", "intelliloop.sqlite3");
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const project = projects.createProject("Reconciliation persistence");
  const mission = projects.createMission(project.projectId, "Persist findings");
  const registrations = new RepositoryRegistrationService(
    database.connection,
    filePath,
    registrationDependencies()
  );
  registrations.register(project.projectId, repositoryRoot);
  const snapshots = new GitSnapshotService(
    database.connection,
    registrations,
    {
      ids: createStableIdGenerator(() => S1),
      clock: createClock(() => new Date("2026-08-05T10:02:00.000Z")),
      runner: new FixedGitCommandRunner()
    }
  );
  const snapshot = await snapshots.capture(mission.missionId);
  const codeMaps = new SqliteCodeMapRepository(database.connection);
  const assetSourceDigest = await sha256TextDigest("export const a = 1;");
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-05T10:03:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: await sha256TextDigest("source-v1")
    },
    assets: [
      {
        memberKey: "module:src/a.ts",
        kind: "FILE",
        label: "src/a.ts",
        sourcePath: "src/a.ts",
        sourceDigest: assetSourceDigest
      }
    ],
    edges: []
  });
  await codeMaps.persist(codeMap);
  const twin = await projectTwinRevision({
    project,
    mission,
    evidenceSources: [],
    claims: [],
    claimSupersessions: [],
    snapshots: [snapshot],
    validationResults: [],
    codeMap
  });
  await new SqliteTwinRepository(database.connection).persist(twin);
  const reassessment = await reassessReconciliation({
    twin,
    evidenceSources: [],
    claims: [],
    claimSupersessions: [],
    targetSnapshot: snapshot,
    validationResults: [],
    requirements: [
      {
        requirementId: "required:evidence:approval",
        supportKind: "EVIDENCE_SOURCE",
        sourceLocator: "requirement:approval/review"
      },
      {
        requirementId: "required:evidence:security",
        supportKind: "EVIDENCE_SOURCE",
        sourceLocator: "requirement:security/review"
      }
    ]
  });
  const asset = codeMap.assets[0];
  if (asset === undefined) throw new Error("Fixture asset is absent.");
  const assetNode = twin.nodes.find(
    (node) =>
      node.nodeType === "SoftwareAsset" &&
      node.metadata.sourceReference === `code-map-asset:${asset.assetId}`
  );
  if (assetNode === undefined) throw new Error("Fixture asset node is absent.");
  const impact = await analyzeChangeImpact({
    twin,
    reassessment,
    codeMap,
    targetSnapshot: snapshot,
    validationResults: [],
    roots: [{ rootId: "impact:asset", nodeId: assetNode.nodeId }],
    requirements: []
  });
  const aggregate = await createReconciliationImpactRevision({
    reassessment,
    impact
  });

  return {
    root,
    filePath,
    database,
    aggregate,
    createSuccessor: async () => {
      const assetReference = {
        kind: "NODE" as const,
        memberId: assetNode.nodeId,
        revision: assetNode.revision,
        digest: await sha256TextDigest(serializeTwinNode(assetNode))
      };
      const successorImpact = await analyzeChangeImpact({
        twin,
        reassessment,
        codeMap,
        targetSnapshot: snapshot,
        validationResults: [],
        roots: [{ rootId: "impact:asset", nodeId: assetNode.nodeId }],
        requirements: [
          {
            requirementId: "impact:implementation",
            rootId: "impact:asset",
            criticalAssetId: asset.assetId,
            supportKind: "IMPLEMENTATION",
            basisCitations: [assetReference]
          }
        ]
      });
      return createReconciliationImpactRevision(
        { reassessment, impact: successorImpact },
        aggregate
      );
    }
  };
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    if (database.connection.open) database.close();
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("reconciliation impact persistence", () => {
  it("persists canonical history, pages findings and survives restart", async () => {
    const value = await fixture();
    const repository = new SqliteReconciliationRepository(
      value.database.connection
    );
    expect(await repository.persist(value.aggregate)).toMatchObject({
      created: true,
      revision: { revision: 1 }
    });
    expect(await repository.persist(value.aggregate)).toMatchObject({
      created: false,
      revision: { revision: 1 }
    });
    const firstFindings = await repository.listFindings(
      value.aggregate.projectId,
      value.aggregate.missionId,
      1,
      1
    );
    expect(firstFindings.items).toMatchObject([
      { findingKind: "MISSING", reason: "REQUIRED_EVIDENCE_ABSENT" }
    ]);
    expect(firstFindings.nextCursor).not.toBeNull();
    const secondFindings = await repository.listFindings(
      value.aggregate.projectId,
      value.aggregate.missionId,
      1,
      1,
      firstFindings.nextCursor ?? undefined
    );
    expect(secondFindings.items).toMatchObject([
      { findingKind: "MISSING", reason: "REQUIRED_EVIDENCE_ABSENT" }
    ]);
    expect(secondFindings.items[0]?.findingKey).not.toBe(
      firstFindings.items[0]?.findingKey
    );
    expect(secondFindings.nextCursor).toBeNull();
    expect((await repository.listImpactPaths(
      value.aggregate.projectId,
      value.aggregate.missionId,
      1,
      1
    )).items).toEqual([]);

    value.database.close();
    databases.splice(databases.indexOf(value.database), 1);
    const restarted = openFoundationDatabase({ filePath: value.filePath });
    databases.push(restarted);
    const stored = await new SqliteReconciliationRepository(
      restarted.connection
    ).get(value.aggregate.projectId, value.aggregate.missionId, 1);
    expect(stored).toEqual(value.aggregate);
    expect(Object.isFrozen(stored)).toBe(true);
  });

  it("appends one successor and returns an exact historical replay", async () => {
    const value = await fixture();
    const repository = new SqliteReconciliationRepository(
      value.database.connection
    );
    await repository.persist(value.aggregate);
    const successor = await value.createSuccessor();
    expect(await repository.persist(successor)).toMatchObject({
      created: true,
      revision: { revision: 2 }
    });

    const historicalCandidate = await createReconciliationImpactRevision(
      {
        reassessment: value.aggregate.reassessment,
        impact: value.aggregate.impact
      },
      successor
    );
    expect(historicalCandidate.revision).toBe(3);
    const replay = await repository.persist(historicalCandidate);
    const page = await repository.list(
      value.aggregate.projectId,
      value.aggregate.missionId,
      10
    );
    expect(replay).toMatchObject({ created: false, revision: { revision: 1 } });
    expect(page.items.map((item) => item.revision)).toEqual([2, 1]);
    expect(page.items[0]?.predecessor?.resultDigest).toBe(
      value.aggregate.resultDigest
    );
    const impactPaths = await repository.listImpactPaths(
      value.aggregate.projectId,
      value.aggregate.missionId,
      2,
      1
    );
    expect(impactPaths.items).toMatchObject([
      { supportKind: "IMPLEMENTATION", depth: 0 }
    ]);
    expect(impactPaths.nextCursor).toBeNull();
  });

  it("rolls back a forced write failure and enforces immutable rows", async () => {
    const value = await fixture();
    const repository = new SqliteReconciliationRepository(
      value.database.connection
    );
    await repository.persist(value.aggregate);
    const successor = await value.createSuccessor();
    value.database.connection.exec(`
      CREATE TRIGGER reconciliation_forced_abort
      BEFORE INSERT ON reconciliation_impact_revisions
      BEGIN
        SELECT RAISE(ABORT, 'forced reconciliation failure');
      END;
    `);
    await expect(repository.persist(successor)).rejects.toMatchObject({
      code: "RECONCILIATION_STORAGE_CONFLICT"
    });
    expect(
      value.database.connection
        .prepare("SELECT COUNT(*) AS count FROM reconciliation_impact_revisions")
        .get()
    ).toEqual({ count: 1 });
    expect(() =>
      value.database.connection
        .prepare("UPDATE reconciliation_impact_revisions SET revision = 2")
        .run()
    ).toThrow(/immutable/u);
    expect(() =>
      value.database.connection
        .prepare("DELETE FROM reconciliation_impact_revisions")
        .run()
    ).toThrow(/immutable/u);
  });

  it("fails closed when stored JSON is valid but not canonical", async () => {
    const value = await fixture();
    const repository = new SqliteReconciliationRepository(
      value.database.connection
    );
    await repository.persist(value.aggregate);
    value.database.connection.exec("DROP TRIGGER reconciliation_impact_reject_update");
    const canonical = value.database.connection
      .prepare(
        "SELECT canonical_json FROM reconciliation_impact_revisions WHERE mission_id = ?"
      )
      .get(M1) as { canonical_json: string };
    const missingVersion = JSON.parse(canonical.canonical_json) as Record<
      string,
      unknown
    >;
    delete missingVersion.version;
    expect(() =>
      value.database.connection
        .prepare(
          "UPDATE reconciliation_impact_revisions SET canonical_json = ? WHERE mission_id = ?"
        )
        .run(JSON.stringify(missingVersion), M1)
    ).toThrow(/CHECK constraint failed/u);
    value.database.connection
      .prepare(
        "UPDATE reconciliation_impact_revisions SET canonical_json = ? WHERE mission_id = ?"
      )
      .run(` ${canonical.canonical_json}`, M1);

    await expect(
      repository.get(value.aggregate.projectId, value.aggregate.missionId, 1)
    ).rejects.toBeInstanceOf(
      ReconciliationRepositoryError
    );
    await expect(
      repository.get(value.aggregate.projectId, value.aggregate.missionId, 1)
    ).rejects.toMatchObject({
      code: "RECONCILIATION_STORAGE_SCHEMA_INVALID"
    });
  });
});
