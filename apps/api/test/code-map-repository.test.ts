import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { CodeMapExtractor } from "../src/code-map/code-map-extractor.js";
import { CodeMapProjectionService } from "../src/code-map/code-map-projection-service.js";
import { SqliteCodeMapRepository } from "../src/code-map/code-map-repository.js";
import { CodeMapScanner } from "../src/code-map/code-map-scanner.js";
import {
  openFoundationDatabase,
  type FoundationDatabase
} from "../src/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { FixedGitCommandRunner } from "../src/projects/git-command-runner.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../src/twin/twin-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";
const S2 = "00000000-0000-4000-8000-000000000032";

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

afterEach(() => {
  for (const database of databases.splice(0)) {
    if (database.connection.open) database.close();
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("code-map revision persistence and Twin projection", () => {
  it("persists real extraction, materializes SoftwareAssets, survives restart and detects tampering", async () => {
    const root = mkdtempSync(join(tmpdir(), "intelliloop-code-map-repository-"));
    directories.push(root);
    const repositoryRoot = join(root, "repository");
    mkdirSync(join(repositoryRoot, "src"), { recursive: true });
    writeFileSync(
      join(repositoryRoot, "src", "policy.ts"),
      "export interface Policy { timeout: number }\n",
      "utf8"
    );
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
    const project = projects.createProject("Code map project");
    const mission = projects.createMission(project.projectId, "Map code safely");
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
        ids: createStableIdGenerator(sequence([S1, S2])),
        clock: createClock(() => new Date("2026-08-05T10:02:00.000Z")),
        runner: new FixedGitCommandRunner()
      }
    );
    const codeMaps = new SqliteCodeMapRepository(database.connection);
    const run = await new CodeMapProjectionService({
      snapshots,
      scanner: new CodeMapScanner(database.connection, registrations),
      extractor: new CodeMapExtractor(),
      repository: codeMaps,
      clock: createClock(() => new Date("2026-08-05T10:03:00.000Z"))
    }).run(mission.missionId);
    expect(run).toMatchObject({
      created: true,
      projection: {
        revision: 1,
        snapshotId: S2,
        evidenceKind: "STATIC_INFERENCE",
        inferenceStatus: "AVAILABLE"
      }
    });
    expect(run.projection.assets.some((asset) => asset.kind === "CONTRACT")).toBe(true);

    const twins = new SqliteTwinRepository(database.connection);
    const materialized = await new TwinMaterializationService({
      projects,
      evidence: new SqliteEvidenceRepository(database.connection),
      claims: new SqliteClaimRepository(database.connection),
      snapshots,
      twins,
      codeMaps
    }).materialize(mission.missionId);
    const softwareNodes = materialized.projection.nodes.filter(
      (node) => node.nodeType === "SoftwareAsset"
    );
    expect(softwareNodes.length).toBeGreaterThan(0);
    expect(
      materialized.projection.relationships.filter(
        (relationship) =>
          relationship.relationshipType === "BOUND_TO" &&
          softwareNodes.some((node) => node.nodeId === relationship.from.nodeId)
      )
    ).toHaveLength(softwareNodes.length);

    expect(() => database.connection.prepare(
      "UPDATE code_map_revisions SET asset_count = asset_count + 1 WHERE mission_id = ?"
    ).run(mission.missionId)).toThrow(/immutable/u);
    expect(() => database.connection.prepare(
      "DELETE FROM code_map_revisions WHERE mission_id = ?"
    ).run(mission.missionId)).toThrow(/immutable/u);

    database.close();
    databases.splice(databases.indexOf(database), 1);
    const restarted = openFoundationDatabase({ filePath });
    databases.push(restarted);
    const restoredRepository = new SqliteCodeMapRepository(restarted.connection);
    const restored = await restoredRepository.get(
      parseStableId<"PROJECT">(P1),
      parseStableId<"MISSION">(M1),
      1
    );
    expect(restored).toEqual(run.projection);

    restarted.connection.exec("DROP TRIGGER code_map_revisions_reject_update");
    restarted.connection.prepare(
      `UPDATE code_map_revisions
       SET canonical_json = json_set(canonical_json, '$.assets[0].label', 'tampered')
       WHERE mission_id = ? AND revision = 1`
    ).run(M1);
    await expect(
      restoredRepository.get(
        parseStableId<"PROJECT">(P1),
        parseStableId<"MISSION">(M1),
        1
      )
    ).rejects.toMatchObject({ code: "CODE_MAP_STORAGE_SCHEMA_INVALID" });
  });
});
