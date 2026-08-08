import { spawnSync } from "node:child_process";
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
import { FixedGitCommandRunner } from "../src/projects/git-command-runner.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  GitSnapshotService,
  type GitSnapshotServiceDependencies
} from "../src/projects/git-snapshot-service.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const T2 = "2026-08-04T00:02:00.000Z";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

const directories: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const databases: Array<{ close(): void }> = [];

function ids(values: readonly string[]): () => string {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error("Synthetic ID fixture exhausted.");
    return value;
  };
}

function git(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      LC_ALL: "C"
    }
  });
  if (result.status !== 0) throw new Error("Synthetic Git fixture command failed.");
}

function environment() {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-git-api-"));
  directories.push(root);
  const databasePath = join(root, "data", "intelliloop.sqlite3");
  const repositoryRoot = join(root, "INTELLILOOP_PRIVATE_REPOSITORY_SENTINEL");
  mkdirSync(repositoryRoot, { recursive: true });
  git(repositoryRoot, ["init", "-b", "main"]);
  writeFileSync(
    join(repositoryRoot, "INTELLILOOP_PRIVATE_FILE_SENTINEL.txt"),
    "private fixture\n",
    "utf8"
  );
  const database = openFoundationDatabase({ filePath: databasePath });
  databases.push(database);
  const projectDependencies: ProjectDomainDependencies = {
    ids: createStableIdGenerator(ids([P1, M1])),
    clock: createClock(() => new Date(T0))
  };
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies
  );
  const project = projects.createProject("Controlled project");
  const mission = projects.createMission(project.projectId, "Controlled mission");
  const registrationDependencies: RepositoryRegistrationDependencies = {
    ids: createStableIdGenerator(() => R1),
    clock: createClock(() => new Date(T1))
  };
  const registrations = new RepositoryRegistrationService(
    database.connection,
    databasePath,
    registrationDependencies
  );
  registrations.register(project.projectId, repositoryRoot);
  const snapshotDependencies: GitSnapshotServiceDependencies = {
    ids: createStableIdGenerator(() => S1),
    clock: createClock(() => new Date(T2)),
    runner: new FixedGitCommandRunner()
  };
  const snapshots = new GitSnapshotService(
    database.connection,
    registrations,
    snapshotDependencies
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
    gitSnapshotService: snapshots,
    requestIdFactory: () => REQUEST_ID
  });
  apps.push(app);
  return { app, lines, repositoryRoot, project, mission };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function stableError(code: "INVALID_REQUEST" | "NOT_FOUND") {
  const message = {
    INVALID_REQUEST: "The request could not be accepted.",
    NOT_FOUND: "The requested resource was not found."
  }[code];
  return { error: { version: "v1", code, message, requestId: REQUEST_ID } };
}

describe("Git snapshot JSON API", () => {
  it("captures, lists, and retrieves path-free immutable snapshot evidence", async () => {
    const fixture = environment();
    const captured = await fixture.app.inject({
      method: "POST",
      url: `/api/v1/missions/${fixture.mission.missionId}/git-snapshots`
    });

    expect(captured.statusCode).toBe(201);
    expect(captured.headers["x-request-id"]).toBe(REQUEST_ID);
    expect(captured.json()).toMatchObject({
      apiVersion: "v1",
      snapshot: {
        snapshotId: S1,
        projectId: P1,
        missionId: M1,
        registrationId: R1,
        capturedAtUtc: T2,
        headState: "UNBORN",
        branchName: "main",
        dirty: true,
        indexChangeCount: 0,
        worktreeChangeCount: 0,
        untrackedFileCount: 1,
        changedFileCount: 1
      }
    });
    expect(captured.body).not.toContain(fixture.repositoryRoot);
    expect(captured.body).not.toContain("INTELLILOOP_PRIVATE_FILE_SENTINEL");

    const listed = await fixture.app.inject({
      method: "GET",
      url: `/api/v1/missions/${fixture.mission.missionId}/git-snapshots`
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual({
      apiVersion: "v1",
      missionId: M1,
      snapshots: [captured.json().snapshot],
      page: { limit: 20, nextCursor: null }
    });

    const retrieved = await fixture.app.inject({
      method: "GET",
      url: `/api/v1/git-snapshots/${S1}`
    });
    expect(retrieved.statusCode).toBe(200);
    expect(retrieved.json()).toEqual(captured.json());
    expect(fixture.lines.join("\n")).not.toContain(fixture.repositoryRoot);
    expect(fixture.lines.join("\n")).not.toContain("PRIVATE_FILE_SENTINEL");
  });

  it("rejects request fields and exposes no snapshot update or delete operation", async () => {
    const fixture = environment();
    const extra = await fixture.app.inject({
      method: "POST",
      url: `/api/v1/missions/${fixture.mission.missionId}/git-snapshots`,
      payload: { command: "reset --hard" }
    });
    expect(extra.statusCode).toBe(400);
    expect(extra.json()).toEqual(stableError("INVALID_REQUEST"));

    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      const response = await fixture.app.inject({
        method,
        url: `/api/v1/git-snapshots/${S1}`
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(stableError("NOT_FOUND"));
    }
  });

  it("returns a stable path-free not-found response for a mission without a repository", async () => {
    const fixture = environment();
    const response = await fixture.app.inject({
      method: "POST",
      url: "/api/v1/missions/00000000-0000-4000-8000-000000000099/git-snapshots"
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(stableError("NOT_FOUND"));
    expect(response.body).not.toContain(fixture.repositoryRoot);
  });
});
