import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import { RepositoryRegistrationService } from "../src/projects/repository-registration.js";
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../src/twin/twin-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const T0 = "2026-08-05T10:00:00.000Z";
const T1 = "2026-08-05T10:01:00.000Z";
const T2 = "2026-08-05T10:02:00.000Z";

const directories: string[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];

function sequence<T>(values: readonly T[]): () => T {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function projectDependencies(): ProjectDomainDependencies {
  const time = sequence([T0, T1, T2]);
  return {
    ids: createStableIdGenerator(sequence([P1, M1])),
    clock: createClock(() => new Date(time()))
  };
}

function environment(filePath: string) {
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const evidence = new SqliteEvidenceRepository(database.connection);
  const claims = new SqliteClaimRepository(database.connection);
  const registrations = new RepositoryRegistrationService(
    database.connection,
    filePath
  );
  const snapshots = new GitSnapshotService(
    database.connection,
    registrations
  );
  const twins = new SqliteTwinRepository(database.connection);
  return {
    database,
    projects,
    twins,
    materializer: new TwinMaterializationService({
      projects,
      evidence,
      claims,
      snapshots,
      twins
    })
  };
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Twin revision persistence", () => {
  it("appends deterministic history, paginates exact revisions and survives restart", async () => {
    const directory = mkdtempSync(join(tmpdir(), "intelliloop-twin-repo-"));
    directories.push(directory);
    const filePath = join(directory, "intelliloop.sqlite3");
    const first = environment(filePath);
    const project = first.projects.createProject("Twin persistence project");
    const mission = first.projects.createMission(
      project.projectId,
      "Persisted Twin history"
    );

    const revisionOne = await first.materializer.materialize(mission.missionId);
    expect(revisionOne).toMatchObject({
      created: true,
      projection: { revision: 1, nodes: [{}, {}], relationships: [{}] }
    });
    const replay = await first.materializer.materialize(mission.missionId);
    expect(replay.created).toBe(false);
    expect(replay.projection).toEqual(revisionOne.projection);

    first.projects.archiveMission(project.projectId, mission.missionId);
    const revisionTwo = await first.materializer.materialize(mission.missionId);
    expect(revisionTwo.created).toBe(true);
    expect(revisionTwo.projection).toMatchObject({
      revision: 2,
      predecessor: {
        revision: 1,
        projectionDigest: revisionOne.projection.projectionDigest
      }
    });
    expect(revisionTwo.projection.invalidations.length).toBeGreaterThan(0);

    const firstPage = await first.twins.list(
      project.projectId,
      mission.missionId,
      1
    );
    expect(firstPage.items.map((item) => item.revision)).toEqual([2]);
    expect(firstPage.nextCursor).toBe(2);
    const secondPage = await first.twins.list(
      project.projectId,
      mission.missionId,
      1,
      firstPage.nextCursor ?? undefined
    );
    expect(secondPage.items.map((item) => item.revision)).toEqual([1]);
    expect(secondPage.nextCursor).toBeNull();

    const nodePage = await first.twins.listNodes(
      project.projectId,
      mission.missionId,
      1,
      1
    );
    expect(nodePage.items).toHaveLength(1);
    expect(nodePage.nextCursor).not.toBeNull();

    expect(() =>
      first.database.connection
        .prepare(
          "UPDATE twin_revisions SET node_count = node_count + 1 WHERE mission_id = ?"
        )
        .run(mission.missionId)
    ).toThrow(/immutable/u);
    expect(() =>
      first.database.connection
        .prepare("DELETE FROM twin_revisions WHERE mission_id = ?")
        .run(mission.missionId)
    ).toThrow(/immutable/u);

    first.database.close();
    databases.splice(databases.indexOf(first.database), 1);
    const restarted = openFoundationDatabase({ filePath });
    databases.push(restarted);
    const restored = await new SqliteTwinRepository(restarted.connection).get(
      parseStableId<"PROJECT">(P1),
      parseStableId<"MISSION">(M1),
      1
    );
    expect(restored).toEqual(revisionOne.projection);
  });

  it("fails closed when canonical stored history no longer matches its digest", async () => {
    const directory = mkdtempSync(join(tmpdir(), "intelliloop-twin-integrity-"));
    directories.push(directory);
    const filePath = join(directory, "intelliloop.sqlite3");
    const current = environment(filePath);
    const project = current.projects.createProject("Twin integrity project");
    const mission = current.projects.createMission(
      project.projectId,
      "Detect stored corruption"
    );
    await current.materializer.materialize(mission.missionId);

    current.database.connection.exec(
      "DROP TRIGGER twin_revisions_reject_update"
    );
    current.database.connection
      .prepare(
        `UPDATE twin_revisions
         SET canonical_json = json_set(
           canonical_json,
           '$.nodes[0].metadata.sourceReference',
           'manual:tampered/path'
         )
         WHERE mission_id = ? AND revision = 1`
      )
      .run(mission.missionId);

    await expect(
      current.twins.get(project.projectId, mission.missionId, 1)
    ).rejects.toMatchObject({ code: "TWIN_STORAGE_SCHEMA_INVALID" });
  });
});
