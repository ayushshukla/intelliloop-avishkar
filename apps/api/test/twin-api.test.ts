import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
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
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

const directories: string[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];
const apps: ReturnType<typeof buildApp>[] = [];

function sequence<T>(values: readonly T[]): () => T {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function dependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(sequence([P1, M1])),
    clock: createClock(() => new Date(sequence([T0, T1])()))
  };
}

function environment() {
  const directory = mkdtempSync(join(tmpdir(), "intelliloop-twin-api-"));
  directories.push(directory);
  const filePath = join(directory, "intelliloop.sqlite3");
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(database.connection, dependencies());
  const project = projects.createProject("Twin API project");
  const mission = projects.createMission(project.projectId, "Twin API mission");
  const evidence = new SqliteEvidenceRepository(database.connection);
  const claims = new SqliteClaimRepository(database.connection);
  const registrations = new RepositoryRegistrationService(
    database.connection,
    filePath
  );
  const snapshots = new GitSnapshotService(database.connection, registrations);
  const twins = new SqliteTwinRepository(database.connection);
  const twinMaterializer = new TwinMaterializationService({
    projects,
    evidence,
    claims,
    snapshots,
    twins
  });
  const app = buildApp({
    projectRepository: projects,
    evidenceRepository: evidence,
    claimRepository: claims,
    gitSnapshotService: snapshots,
    twinRepository: twins,
    twinMaterializer,
    requestIdFactory: () => REQUEST_ID
  });
  apps.push(app);
  return { app, database, mission };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Twin revision API", () => {
  it("materializes idempotently and retrieves revisions, cited nodes and relationships through bounded pages", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("External network is forbidden."));
    const { app } = environment();

    const created = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/twin/revisions`
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({
      apiVersion: "v1",
      created: true,
      twinRevision: {
        projectId: P1,
        missionId: M1,
        revision: 1,
        nodeCount: 2,
        relationshipCount: 1,
        invalidationCount: 0
      }
    });

    const replay = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/twin/revisions`
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({ ...created.json(), created: false });

    const revisions = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions?limit=1`
    });
    expect(revisions.statusCode).toBe(200);
    expect(revisions.json()).toMatchObject({
      missionId: M1,
      revisions: [{ revision: 1 }],
      page: { limit: 1, nextCursor: null }
    });

    const exact = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions/1`
    });
    expect(exact.statusCode).toBe(200);
    expect(exact.json().twinRevision).toEqual(created.json().twinRevision);

    const nodes = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions/1/nodes?limit=1`
    });
    expect(nodes.statusCode).toBe(200);
    expect(nodes.json()).toMatchObject({
      missionId: M1,
      projectionRevision: 1,
      nodes: [
        {
          nodeRevision: 1,
          memberDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
          attribution: {
            pathCitation: expect.stringMatching(/^(?:project|mission):/u),
            epistemicLabel: "FACT"
          },
          source: { sourceDigest: expect.stringMatching(/^sha256:/u) }
        }
      ],
      page: { limit: 1 }
    });
    expect(nodes.json().page.nextCursor).toMatch(
      /^[0-9a-f-]{36}$/u
    );

    const relationships = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions/1/relationships?limit=100`
    });
    expect(relationships.statusCode).toBe(200);
    expect(relationships.json()).toMatchObject({
      relationships: [
        {
          relationshipType: "SCOPED_TO",
          relationshipRevision: 1,
          memberDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
          attribution: { pathCitation: expect.stringContaining("projection-link:") }
        }
      ],
      page: { nextCursor: null }
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns stable page/not-found errors and a dedicated integrity failure", async () => {
    const { app, database } = environment();
    await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/twin/revisions`
    });

    const invalidPage = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions?limit=101`
    });
    expect(invalidPage.statusCode).toBe(400);
    expect(invalidPage.json().error).toMatchObject({
      code: "INVALID_REQUEST",
      requestId: REQUEST_ID
    });

    const missing = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions/2`
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe("NOT_FOUND");

    database.connection.exec("DROP TRIGGER twin_revisions_reject_update");
    database.connection
      .prepare(
        `UPDATE twin_revisions
         SET canonical_json = json_set(
           canonical_json,
           '$.nodes[0].metadata.sourceReference',
           'manual:private/tamper'
         )
         WHERE mission_id = ?`
      )
      .run(M1);
    const integrity = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions/1/nodes?limit=100`
    });
    expect(integrity.statusCode).toBe(500);
    expect(integrity.json()).toEqual({
      error: {
        version: "v1",
        code: "INTEGRITY_ERROR",
        message: "Stored resource integrity verification failed.",
        requestId: REQUEST_ID
      }
    });
    expect(integrity.body).not.toContain("manual:private/tamper");
  });
});
