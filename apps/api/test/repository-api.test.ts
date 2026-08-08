import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { createSafeLogger } from "../src/observability.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";
import { LocalProjectPilotService } from "../src/projects/local-project-pilot-service.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const R1 = "00000000-0000-4000-8000-000000000021";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

const directories: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const databases: Array<{ close(): void }> = [];

function projectDependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(() => P1),
    clock: createClock(() => new Date(T0))
  };
}

function registrationDependencies(): RepositoryRegistrationDependencies {
  return {
    ids: createStableIdGenerator(() => R1),
    clock: createClock(() => new Date(T1))
  };
}

function environment() {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-repository-api-"));
  directories.push(root);
  const databasePath = join(root, "data", "intelliloop.sqlite3");
  const repositoryRoot = join(root, "INTELLILOOP_PRIVATE_PATH_SENTINEL");
  mkdirSync(repositoryRoot, { recursive: true });
  writeFileSync(join(repositoryRoot, "README.md"), "# Controlled fixture\n", "utf8");
  execFileSync("git", ["init", "-b", "main"], { cwd: repositoryRoot, stdio: "ignore" });
  execFileSync("git", ["add", "--all"], { cwd: repositoryRoot, stdio: "ignore" });
  execFileSync("git", [
    "-c", "user.name=IntelliLoop Fixture", "-c",
    "user.email=fixture@invalid.example", "commit", "-m", "fixture"
  ], { cwd: repositoryRoot, stdio: "ignore" });
  const database = openFoundationDatabase({ filePath: databasePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(database.connection, projectDependencies());
  const registrations = new RepositoryRegistrationService(
    database.connection,
    databasePath,
    registrationDependencies()
  );
  const lines: string[] = [];
  const logger = createSafeLogger({
    level: "info",
    clock: () => new Date(T0),
    write: (line) => lines.push(line)
  });
  const app = buildApp({
    logger,
    projectRepository: projects,
    repositoryRegistration: registrations,
    localProjectPilotService: new LocalProjectPilotService(
      database.connection,
      registrations,
      { enabled: true, allowedRoots: [repositoryRoot] }
    ),
    requestIdFactory: () => REQUEST_ID
  });
  apps.push(app);
  const project = projects.createProject("Controlled project");
  return { app, lines, project, repositoryRoot };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function stableError(code: "INVALID_REQUEST" | "NOT_FOUND" | "CONFLICT") {
  const message = {
    INVALID_REQUEST: "The request could not be accepted.",
    NOT_FOUND: "The requested resource was not found.",
    CONFLICT: "The request conflicts with current resource state."
  }[code];
  return {
    error: { version: "v1", code, message, requestId: REQUEST_ID }
  };
}

describe("Project repository registration JSON API", () => {
  it("registers and retrieves a path-free read-only resource", async () => {
    const { app, lines, project, repositoryRoot } = environment();
    const created = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/repository`,
      payload: { rootPath: repositoryRoot }
    });

    expect(created.statusCode).toBe(201);
    expect(created.headers["x-request-id"]).toBe(REQUEST_ID);
    expect(created.json()).toEqual({
      apiVersion: "v1",
      repository: {
        registrationId: R1,
        projectId: P1,
        repositoryKind: "LOCAL_GIT",
        accessMode: "READ_ONLY",
        registeredAtUtc: T1
      }
    });
    expect(created.body).not.toContain(repositoryRoot);

    const retrieved = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.projectId}/repository`
    });
    expect(retrieved.statusCode).toBe(200);
    expect(retrieved.json()).toEqual(created.json());
    expect(lines.join("\n")).not.toContain(repositoryRoot);
    expect(lines.join("\n")).not.toContain("INTELLILOOP_PRIVATE_PATH_SENTINEL");
  });

  it("returns stable errors without echoing invalid or duplicate paths", async () => {
    const { app, project, repositoryRoot } = environment();
    const missingPath = join(repositoryRoot, "missing-secret-sentinel");
    const invalid = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/repository`,
      payload: { rootPath: missingPath }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual(stableError("INVALID_REQUEST"));
    expect(invalid.body).not.toContain(missingPath);

    await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/repository`,
      payload: { rootPath: repositoryRoot }
    });
    const duplicate = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/repository`,
      payload: { rootPath: repositoryRoot }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual(stableError("CONFLICT"));
    expect(duplicate.body).not.toContain(repositoryRoot);
  });

  it("rejects extra body fields and exposes no mutation operation", async () => {
    const { app, project, repositoryRoot } = environment();
    const extra = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/repository`,
      payload: { rootPath: repositoryRoot, writeAccess: true }
    });
    expect(extra.statusCode).toBe(400);
    expect(extra.json()).toEqual(stableError("INVALID_REQUEST"));

    for (const method of ["POST", "PATCH", "DELETE"] as const) {
      const response = await app.inject({
        method,
        url: `/api/v1/projects/${project.projectId}/repository`
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(stableError("NOT_FOUND"));
    }
  });
});
