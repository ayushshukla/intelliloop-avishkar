import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP } from "@intelliloop/demo-fixtures";
import { createClock } from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { CodeMapExtractor } from "../src/code-map/code-map-extractor.js";
import { CodeMapProjectionService } from "../src/code-map/code-map-projection-service.js";
import { SqliteCodeMapRepository } from "../src/code-map/code-map-repository.js";
import { CodeMapScanner } from "../src/code-map/code-map-scanner.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { DemoWorkspaceService } from "../src/demo/demo-workspace-service.js";
import { SqliteClaimRepository } from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import { RepositoryRegistrationService } from "../src/projects/repository-registration.js";
import { SqlitePassportRepository } from "../src/passports/passport-repository.js";
import { PassportService } from "../src/passports/passport-service.js";
import { SqliteReadinessRepository } from "../src/readiness/readiness-repository.js";
import { ReadinessAssessmentService } from "../src/readiness/readiness-service.js";
import { SqliteReconciliationRepository } from "../src/reconciliation/reconciliation-repository.js";
import { ReconciliationExecutionService } from "../src/reconciliation/reconciliation-service.js";
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../src/twin/twin-repository.js";

const directories: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];

function environment(filePath: string) {
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(database.connection);
  const evidence = new SqliteEvidenceRepository(database.connection);
  const claims = new SqliteClaimRepository(database.connection);
  const registrations = new RepositoryRegistrationService(database.connection, filePath);
  const snapshots = new GitSnapshotService(database.connection, registrations);
  const codeMapRepository = new SqliteCodeMapRepository(database.connection);
  const codeMaps = new CodeMapProjectionService({
    snapshots,
    scanner: new CodeMapScanner(database.connection, registrations),
    extractor: new CodeMapExtractor(),
    repository: codeMapRepository,
    clock: createClock(() => new Date()),
    fallback: {
      enabledForControlledIntelliLoopFixture: true,
      manifest: INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP
    }
  });
  const twinRepository = new SqliteTwinRepository(database.connection);
  const reconciliationRepository = new SqliteReconciliationRepository(database.connection);
  const readinessRepository = new SqliteReadinessRepository(database.connection, {
    evidence,
    snapshots,
    reconciliations: reconciliationRepository
  });
  const twins = new TwinMaterializationService({
    projects,
    evidence,
    claims,
    snapshots,
    twins: twinRepository,
    codeMaps: codeMapRepository,
    validations: readinessRepository
  });
  const reconciliations = new ReconciliationExecutionService({
    twins: twinRepository,
    codeMaps: codeMapRepository,
    evidence,
    claims,
    snapshots,
    reconciliations: reconciliationRepository,
    validations: readinessRepository
  });
  const readiness = new ReadinessAssessmentService({ repository: readinessRepository });
  const passportRepository = new SqlitePassportRepository(database.connection, readinessRepository);
  const passports = new PassportService({
    passports: passportRepository,
    readinessRepository,
    readinessService: readiness
  });
  const demoWorkspaceService = new DemoWorkspaceService({
    connection: database.connection,
    databaseFilePath: filePath,
    projects,
    registrations,
    snapshots,
    evidence,
    claims,
    codeMaps,
    twins,
    reconciliations,
    readiness,
    passports
  });
  const app = buildApp({
    projectRepository: projects,
    demoWorkspaceService,
    requestIdFactory: () => "123e4567-e89b-42d3-a456-426614174000"
  });
  apps.push(app);
  return { app, database, projects, demoWorkspaceService };
}

async function closeEnvironment(value: ReturnType<typeof environment>): Promise<void> {
  await value.app.close();
  apps.splice(apps.indexOf(value.app), 1);
  value.database.close();
  databases.splice(databases.indexOf(value.database), 1);
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) {
    if (database.connection.open) database.close();
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("controlled retail demo workspace API", () => {
  it("loads through real product paths, survives restart and resets only its owned scope", async () => {
    const directory = mkdtempSync(join(tmpdir(), "intelliloop-demo-workspace-"));
    directories.push(directory);
    const filePath = join(directory, "data", "intelliloop.sqlite3");
    const first = environment(filePath);
    const retainedProject = first.projects.createProject("Retained non-demo project");

    const setup = await first.app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    expect(setup.statusCode, setup.body).toBe(201);
    const initial = setup.json();
    expect(initial).toMatchObject({
      apiVersion: "v1",
      created: true,
      fixtureId: "loopmart-expanded-cancellation-v1",
      ownership: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY",
      status: "READY",
      synthetic: true,
      repositoryExecution: false,
      codeMapRevision: 1,
      twinRevision: 1,
      reconciliationRevision: 1,
      readinessRevision: 1,
      readinessStatus: "BLOCKED"
    });
    expect(() => first.database.connection.prepare(
      "DELETE FROM evidence_sources WHERE project_id = ?"
    ).run(initial.projectId)).toThrow(/immutable/u);
    expect(existsSync(join(directory, "data", "demo-workspaces", initial.fixtureId, "repository", ".git"))).toBe(true);

    const countsBefore = first.database.connection.prepare(
      `SELECT
         (SELECT COUNT(*) FROM projects) AS projects,
         (SELECT COUNT(*) FROM evidence_sources) AS evidence,
         (SELECT COUNT(*) FROM reconciliation_impact_revisions) AS reconciliations`
    ).get();
    const repeated = await first.app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    expect(repeated.statusCode, repeated.body).toBe(200);
    expect(repeated.json()).toMatchObject({ created: false, projectId: initial.projectId, missionId: initial.missionId });
    expect(first.database.connection.prepare(
      `SELECT
         (SELECT COUNT(*) FROM projects) AS projects,
         (SELECT COUNT(*) FROM evidence_sources) AS evidence,
         (SELECT COUNT(*) FROM reconciliation_impact_revisions) AS reconciliations`
    ).get()).toEqual(countsBefore);

    const correction = await first.app.inject({ method: "POST", url: "/api/v1/demo/correction" });
    expect(correction.statusCode, correction.body).toBe(200);
    expect(correction.json()).toMatchObject({
      changed: true,
      workflowStage: "CORRECTED_READY",
      readinessStatus: "READY",
      correctedCodeMapRevision: 2,
      correctedTwinRevision: 2,
      correctedReconciliationRevision: 2,
      readyAssessmentRevision: 2,
      passportAssessmentRevision: 2
    });
    const repeatedCorrection = await first.app.inject({ method: "POST", url: "/api/v1/demo/correction" });
    expect(repeatedCorrection.statusCode, repeatedCorrection.body).toBe(200);
    expect(repeatedCorrection.json()).toMatchObject({ changed: false, workflowStage: "CORRECTED_READY" });

    const stale = await first.app.inject({ method: "POST", url: "/api/v1/demo/staleness" });
    expect(stale.statusCode, stale.body).toBe(200);
    expect(stale.json()).toMatchObject({
      changed: true,
      workflowStage: "READY_STALE",
      readinessStatus: "STALE"
    });
    const repeatedStale = await first.app.inject({ method: "POST", url: "/api/v1/demo/staleness" });
    expect(repeatedStale.statusCode, repeatedStale.body).toBe(200);
    expect(repeatedStale.json()).toMatchObject({ changed: false, workflowStage: "READY_STALE" });

    await closeEnvironment(first);
    const restarted = environment(filePath);
    const restartStatus = await restarted.app.inject({ method: "GET", url: "/api/v1/demo" });
    expect(restartStatus.statusCode, restartStatus.body).toBe(200);
    expect(restartStatus.json()).toMatchObject({
      status: "READY",
      projectId: initial.projectId,
      missionId: initial.missionId,
      workflowStage: "READY_STALE",
      readinessStatus: "STALE"
    });

    const reset = await restarted.app.inject({ method: "POST", url: "/api/v1/demo/reset" });
    expect(reset.statusCode, reset.body).toBe(200);
    expect(reset.json()).toMatchObject({ reset: true, status: "EMPTY" });
    expect(restarted.projects.getProject(retainedProject.projectId)).toMatchObject({
      projectId: retainedProject.projectId,
      name: "Retained non-demo project"
    });
    expect(restarted.database.connection.prepare(
      "SELECT 1 FROM projects WHERE project_id = ?"
    ).get(initial.projectId)).toBeUndefined();
    expect(restarted.database.connection.pragma("foreign_key_check")).toEqual([]);

    const repeatedReset = await restarted.app.inject({ method: "POST", url: "/api/v1/demo/reset" });
    expect(repeatedReset.statusCode, repeatedReset.body).toBe(200);
    expect(repeatedReset.json()).toMatchObject({ reset: false, status: "EMPTY" });

    const reloaded = await restarted.app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    expect(reloaded.statusCode, reloaded.body).toBe(201);
    expect(reloaded.json()).toMatchObject({ created: true, status: "READY", readinessStatus: "BLOCKED" });
    expect(reloaded.json().projectId).not.toBe(initial.projectId);
  // This lifecycle performs 35 individually bounded Git reads across setup,
  // correction, staleness, restart and reload. Keep the outer test deadline
  // above their aggregate bound so teardown cannot race an active request.
  }, 240_000);

  it("rejects caller-controlled reset parameters and keeps immutable non-demo records protected", async () => {
    const directory = mkdtempSync(join(tmpdir(), "intelliloop-demo-guard-"));
    directories.push(directory);
    const value = environment(join(directory, "data", "intelliloop.sqlite3"));
    const nonDemo = value.projects.createProject("Immutable non-demo project");

    const rejected = await value.app.inject({
      method: "POST",
      url: "/api/v1/demo/reset",
      payload: { projectId: nonDemo.projectId, path: directory }
    });
    expect(rejected.statusCode).toBe(400);
    expect(value.projects.getProject(nonDemo.projectId).projectId).toBe(nonDemo.projectId);
  });
});
