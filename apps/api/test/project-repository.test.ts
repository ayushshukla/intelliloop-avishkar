import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import {
  ProjectRepositoryError,
  SqliteProjectRepository
} from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";
const P3 = "00000000-0000-4000-8000-000000000003";
const M1 = "00000000-0000-4000-8000-000000000011";
const M2 = "00000000-0000-4000-8000-000000000012";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const T2 = "2026-08-04T00:02:00.000Z";
const T3 = "2026-08-04T00:03:00.000Z";

const directories: string[] = [];
const databases: Array<{ close(): void }> = [];

function databasePath(label: string): string {
  const directory = mkdtempSync(join(tmpdir(), `intelliloop-repository-${label}-`));
  directories.push(directory);
  return join(directory, "intelliloop.sqlite3");
}

function dependencies(ids: string[], times: string[]): ProjectDomainDependencies {
  const remainingIds = [...ids];
  const remainingTimes = [...times];
  return {
    ids: createStableIdGenerator(() => {
      const id = remainingIds.shift();
      if (id === undefined) throw new Error("Identity source exhausted.");
      return id;
    }),
    clock: createClock(() => {
      const time = remainingTimes.shift();
      if (time === undefined) throw new Error("Clock source exhausted.");
      return new Date(time);
    })
  };
}

function openRepository(
  filePath: string,
  ids: string[],
  times: string[]
): { database: ReturnType<typeof openFoundationDatabase>; repository: SqliteProjectRepository } {
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  return {
    database,
    repository: new SqliteProjectRepository(database.connection, dependencies(ids, times))
  };
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("project and mission SQLite repository", () => {
  it("round-trips exact records across a database restart", () => {
    const filePath = databasePath("restart");
    const first = openRepository(filePath, [P1, M1], [T0, T1]);
    const project = first.repository.createProject("Retail cancellation control");
    const mission = first.repository.createMission(
      project.projectId,
      "Expand cancellation eligibility"
    );

    first.database.close();
    databases.splice(databases.indexOf(first.database), 1);
    const reopened = openRepository(filePath, [], []);

    expect(reopened.repository.getProject(project.projectId)).toEqual(project);
    expect(reopened.repository.getMission(mission.missionId)).toEqual(mission);
  });

  it("retains immutable revision history while moving transactional heads", () => {
    const opened = openRepository(databasePath("history"), [P1, M1], [T0, T1, T2, T3]);
    const project = opened.repository.createProject("Retail cancellation control");
    const mission = opened.repository.createMission(project.projectId, "Expand eligibility");
    const archivedMission = opened.repository.archiveMission(project.projectId, mission.missionId);
    const archivedProject = opened.repository.archiveProject(project.projectId);

    expect(archivedMission).toMatchObject({ status: "ARCHIVED", revision: 2, archivedAtUtc: T2 });
    expect(archivedProject).toMatchObject({ status: "ARCHIVED", revision: 2, archivedAtUtc: T3 });
    expect(opened.database.connection.prepare(
      "SELECT revision, lifecycle_status FROM mission_revisions WHERE mission_id = ? ORDER BY revision"
    ).all(M1)).toEqual([
      { revision: 1, lifecycle_status: "CURRENT" },
      { revision: 2, lifecycle_status: "ARCHIVED" }
    ]);
    expect(opened.database.connection.prepare(
      "SELECT revision, lifecycle_status FROM project_revisions WHERE project_id = ? ORDER BY revision"
    ).all(P1)).toEqual([
      { revision: 1, lifecycle_status: "ACTIVE" },
      { revision: 2, lifecycle_status: "ARCHIVED" }
    ]);
  });

  it("enforces one current mission and allows a successor after archival", () => {
    const opened = openRepository(databasePath("current"), [P1, M1, M2], [T0, T1, T2, T3]);
    const project = opened.repository.createProject("Checkout safety");
    const first = opened.repository.createMission(project.projectId, "First mission");

    expect(() => opened.repository.createMission(project.projectId, "Conflicting mission"))
      .toThrowError(expect.objectContaining({ code: "CURRENT_MISSION_EXISTS" }));
    opened.repository.archiveMission(project.projectId, first.missionId);
    expect(opened.repository.createMission(project.projectId, "Successor mission"))
      .toMatchObject({ missionId: M2, status: "CURRENT" });
  });

  it("serializes concurrent current-mission attempts so exactly one wins", async () => {
    const filePath = databasePath("concurrent-mission");
    const opened = openRepository(filePath, [P1], [T0]);
    opened.repository.createProject("Concurrent project");
    const barrierPath = join(filePath, "..", "mission-start.barrier");
    const fixturePath = fileURLToPath(
      new URL("./fixtures/create-mission-process.ts", import.meta.url)
    );

    const completions = [M1, M2].map(
      (missionId) =>
        new Promise<string>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            ["--import", "tsx", fixturePath, filePath, barrierPath, P1, missionId],
            { stdio: ["ignore", "pipe", "pipe"] }
          );
          let output = "";
          child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString("utf8")));
          child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString("utf8")));
          child.once("error", reject);
          child.once("close", (status) =>
            status === 0 ? resolve(output) : reject(new Error(output))
          );
        })
    );
    writeFileSync(barrierPath, "start", { encoding: "utf8" });
    const results = (await Promise.all(completions)).sort();

    expect(results.filter((result) => result.startsWith("created:"))).toHaveLength(1);
    expect(results.filter((result) => result === "rejected:CURRENT_MISSION_EXISTS"))
      .toHaveLength(1);
    expect(opened.repository.listMissions(parseStableId<"PROJECT">(P1), 10).items)
      .toHaveLength(1);
  }, 30_000);

  it("rejects cross-project mutation without changing either record", () => {
    const opened = openRepository(databasePath("scope"), [P1, P2, M1], [T0, T1, T2]);
    const firstProject = opened.repository.createProject("First project");
    const secondProject = opened.repository.createProject("Second project");
    const mission = opened.repository.createMission(firstProject.projectId, "Scoped mission");

    expect(() => opened.repository.archiveMission(secondProject.projectId, mission.missionId))
      .toThrowError(expect.objectContaining({ code: "CROSS_PROJECT_REFERENCE" }));
    expect(opened.repository.getMission(mission.missionId)).toEqual(mission);
  });

  it("paginates in stable identity order with a bounded cursor", () => {
    const opened = openRepository(databasePath("pages"), [P3, P1, P2], [T0, T1, T2]);
    opened.repository.createProject("Third insertion");
    opened.repository.createProject("First identity");
    opened.repository.createProject("Second identity");

    const firstPage = opened.repository.listProjects(2);
    const secondPage = opened.repository.listProjects(
      2,
      parseStableId<"PROJECT">(firstPage.nextCursor!)
    );
    expect(firstPage.items.map(({ projectId }) => projectId)).toEqual([P1, P2]);
    expect(firstPage.nextCursor).toBe(P2);
    expect(secondPage.items.map(({ projectId }) => projectId)).toEqual([P3]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("maps missing schema failures to a stable, non-diagnostic error", () => {
    const connection = new Database(":memory:");
    databases.push(connection);
    const repository = new SqliteProjectRepository(connection, dependencies([], []));

    let captured: unknown;
    try {
      repository.getProject(parseStableId<"PROJECT">(P1));
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(ProjectRepositoryError);
    expect(captured).toMatchObject({
      code: "PROJECT_STORAGE_SCHEMA_INVALID",
      message: "Project storage schema is invalid."
    });
    expect(String(captured)).not.toContain("SELECT");
  });
});
