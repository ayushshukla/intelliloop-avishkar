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

import { buildApp } from "../src/app.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";
const P3 = "00000000-0000-4000-8000-000000000003";
const M1 = "00000000-0000-4000-8000-000000000011";
const M2 = "00000000-0000-4000-8000-000000000012";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const T2 = "2026-08-04T00:02:00.000Z";
const T3 = "2026-08-04T00:03:00.000Z";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

const directories: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const databases: Array<{ close(): void }> = [];

function dependencies(ids: string[], times: string[]): ProjectDomainDependencies {
  const remainingIds = [...ids];
  const remainingTimes = [...times];
  return {
    ids: createStableIdGenerator(() => remainingIds.shift() ?? "identity-source-exhausted"),
    clock: createClock(() => new Date(remainingTimes.shift() ?? "invalid-clock"))
  };
}

function environment(ids: string[], times: string[]) {
  const directory = mkdtempSync(join(tmpdir(), "intelliloop-project-api-"));
  directories.push(directory);
  const database = openFoundationDatabase({ filePath: join(directory, "intelliloop.sqlite3") });
  databases.push(database);
  const repository = new SqliteProjectRepository(database.connection, dependencies(ids, times));
  const app = buildApp({ projectRepository: repository, requestIdFactory: () => REQUEST_ID });
  apps.push(app);
  return { app, repository };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function stableError(code: string) {
  const messages: Record<string, string> = {
    INVALID_REQUEST: "The request could not be accepted.",
    NOT_FOUND: "The requested resource was not found.",
    CONFLICT: "The request conflicts with current resource state."
  };
  return {
    error: {
      version: "v1",
      code,
      message: messages[code],
      requestId: REQUEST_ID
    }
  };
}

describe("Project and ChangeMission JSON API", () => {
  it("creates and retrieves exact versioned Project and Mission resources", async () => {
    const { app } = environment([P1, M1], [T0, T1]);

    const createdProject = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      payload: { name: "Retail cancellation control" }
    });
    expect(createdProject.statusCode).toBe(201);
    expect(createdProject.headers["x-request-id"]).toBe(REQUEST_ID);
    expect(createdProject.json()).toEqual({
      apiVersion: "v1",
      project: {
        projectId: P1,
        name: "Retail cancellation control",
        status: "ACTIVE",
        revision: 1,
        createdAtUtc: T0,
        updatedAtUtc: T0
      }
    });

    const createdMission = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${P1}/missions`,
      payload: { title: "Expand cancellation eligibility" }
    });
    expect(createdMission.statusCode).toBe(201);
    expect(createdMission.json()).toEqual({
      apiVersion: "v1",
      mission: {
        missionId: M1,
        projectId: P1,
        title: "Expand cancellation eligibility",
        status: "CURRENT",
        revision: 1,
        createdAtUtc: T1,
        updatedAtUtc: T1
      }
    });

    expect((await app.inject({ method: "GET", url: `/api/v1/projects/${P1}` })).json())
      .toEqual(createdProject.json());
    expect((await app.inject({ method: "GET", url: `/api/v1/missions/${M1}` })).json())
      .toEqual(createdMission.json());
  });

  it("returns stable errors for malformed, missing, and conflicting requests", async () => {
    const { app } = environment([P1, M1, M2], [T0, T1, T2]);
    await app.inject({ method: "POST", url: "/api/v1/projects", payload: { name: "Checkout" } });
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${P1}/missions`,
      payload: { title: "First mission" }
    });

    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      payload: { name: "", unexpected: true }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual(stableError("INVALID_REQUEST"));

    const malformedId = await app.inject({ method: "GET", url: "/api/v1/projects/not-a-uuid" });
    expect(malformedId.statusCode).toBe(400);
    expect(malformedId.json()).toEqual(stableError("INVALID_REQUEST"));

    const missing = await app.inject({ method: "GET", url: `/api/v1/projects/${P2}` });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual(stableError("NOT_FOUND"));

    const conflict = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${P1}/missions`,
      payload: { title: "Conflicting mission" }
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual(stableError("CONFLICT"));
  });

  it("uses bounded cursor pagination for projects and missions", async () => {
    const { app, repository } = environment(
      [P3, P1, P2, M1, M2],
      [T0, T1, T2, T3, "2026-08-04T00:04:00.000Z", "2026-08-04T00:05:00.000Z"]
    );
    for (const name of ["Third insertion", "First identity", "Second identity"]) {
      await app.inject({ method: "POST", url: "/api/v1/projects", payload: { name } });
    }

    const firstProjects = await app.inject({ method: "GET", url: "/api/v1/projects?limit=2" });
    expect(firstProjects.statusCode).toBe(200);
    expect(firstProjects.json()).toMatchObject({
      apiVersion: "v1",
      projects: [{ projectId: P1 }, { projectId: P2 }],
      page: { limit: 2, nextCursor: P2 }
    });
    const secondProjects = await app.inject({
      method: "GET",
      url: `/api/v1/projects?limit=2&cursor=${P2}`
    });
    expect(secondProjects.json()).toMatchObject({
      projects: [{ projectId: P3 }],
      page: { limit: 2, nextCursor: null }
    });

    const firstMissionResponse = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${P1}/missions`,
      payload: { title: "Archived mission" }
    });
    repository.archiveMission(
      parseStableId<"PROJECT">(P1),
      parseStableId<"MISSION">(M1)
    );
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${P1}/missions`,
      payload: { title: "Current mission" }
    });
    expect(firstMissionResponse.statusCode).toBe(201);

    const firstMissions = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${P1}/missions?limit=1`
    });
    expect(firstMissions.json()).toMatchObject({
      projectId: P1,
      missions: [{ missionId: M1, status: "ARCHIVED" }],
      page: { limit: 1, nextCursor: M1 }
    });
    const secondMissions = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${P1}/missions?limit=1&cursor=${M1}`
    });
    expect(secondMissions.json()).toMatchObject({
      missions: [{ missionId: M2, status: "CURRENT" }],
      page: { limit: 1, nextCursor: null }
    });

    for (const query of ["limit=0", "limit=101", `cursor=${M1}&extra=true`]) {
      const invalid = await app.inject({ method: "GET", url: `/api/v1/projects?${query}` });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual(stableError("INVALID_REQUEST"));
    }
  });
});
