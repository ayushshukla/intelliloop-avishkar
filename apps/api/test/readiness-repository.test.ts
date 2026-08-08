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
  createValidationResult,
  parseStableId,
  parseUtcTimestamp,
  prepareEvidenceImport,
  projectTwinRevision,
  reassessReconciliation,
  serializeTwinNode,
  sha256TextDigest,
  type ProjectDomainDependencies,
  type ReconciliationImpactRevision
} from "@intelliloop/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isReadinessAssessmentResponse,
  isReleasePassportResponse
} from "../../web/src/readiness-passport-client.js";

import { buildApp } from "../src/app.js";
import { SqliteCodeMapRepository } from "../src/code-map/code-map-repository.js";
import {
  openFoundationDatabase,
  type FoundationDatabase
} from "../src/database/database-lifecycle.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { SqlitePassportRepository } from "../src/passports/passport-repository.js";
import { PassportService } from "../src/passports/passport-service.js";
import { FixedGitCommandRunner } from "../src/projects/git-command-runner.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";
import { SqliteReadinessRepository } from "../src/readiness/readiness-repository.js";
import { ReadinessAssessmentService } from "../src/readiness/readiness-service.js";
import { SqliteReconciliationRepository } from "../src/reconciliation/reconciliation-repository.js";
import { SqliteTwinRepository } from "../src/twin/twin-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";
const M1 = "00000000-0000-4000-8000-000000000011";
const M2 = "00000000-0000-4000-8000-000000000012";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";
const S2 = "00000000-0000-4000-8000-000000000032";
const E1 = "00000000-0000-4000-8000-000000000041";
const T1 = "00000000-0000-4000-8000-000000000042";
const V1 = "00000000-0000-4000-8000-000000000051";
const A1 = "00000000-0000-4000-8000-000000000061";
const H1 = "00000000-0000-4000-8000-000000000071";
const A2 = "00000000-0000-4000-8000-000000000062";
const PP1 = "00000000-0000-4000-8000-000000000081";
const PP2 = "00000000-0000-4000-8000-000000000082";
const VALIDATION_KEY = "test:release/core";

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
    clock: createClock(() => new Date("2026-08-06T08:00:00.000Z"))
  };
}

function registrationDependencies(): RepositoryRegistrationDependencies {
  return {
    ids: createStableIdGenerator(() => R1),
    clock: createClock(() => new Date("2026-08-06T08:01:00.000Z"))
  };
}

interface Fixture {
  readonly root: string;
  readonly filePath: string;
  readonly repositoryRoot: string;
  readonly database: FoundationDatabase;
  readonly projects: SqliteProjectRepository;
  readonly snapshots: GitSnapshotService;
  readonly registrations: RepositoryRegistrationService;
  readonly evidence: SqliteEvidenceRepository;
  readonly reconciliations: SqliteReconciliationRepository;
  readonly readiness: SqliteReadinessRepository;
  readonly service: ReadinessAssessmentService;
  readonly passports: SqlitePassportRepository;
  readonly passportService: PassportService;
  readonly aggregate: ReconciliationImpactRevision;
  readonly createSuccessor: () => Promise<ReconciliationImpactRevision>;
}

async function fixture(serviceIds: readonly string[] = [A1, H1, A2]): Promise<Fixture> {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-readiness-"));
  directories.push(root);
  const repositoryRoot = join(root, "repository");
  mkdirSync(join(repositoryRoot, "src"), { recursive: true });
  writeFileSync(join(repositoryRoot, "src", "release.ts"), "export const release = true;\n", "utf8");
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
  const projects = new SqliteProjectRepository(database.connection, projectDependencies());
  const project = projects.createProject("Readiness persistence");
  const mission = projects.createMission(project.projectId, "Persist immutable assessment");
  const registrations = new RepositoryRegistrationService(
    database.connection, filePath, registrationDependencies()
  );
  registrations.register(project.projectId, repositoryRoot);
  const snapshots = new GitSnapshotService(database.connection, registrations, {
    ids: createStableIdGenerator(() => S1),
    clock: createClock(() => new Date("2026-08-06T08:02:00.000Z")),
    runner: new FixedGitCommandRunner()
  });
  const snapshot = await snapshots.capture(mission.missionId);
  const codeMaps = new SqliteCodeMapRepository(database.connection);
  const codeMap = await createCodeMapProjectionRevision({
    snapshot,
    recordedAtUtc: parseUtcTimestamp("2026-08-06T08:03:00.000Z"),
    mode: {
      evidenceKind: "STATIC_INFERENCE",
      completeness: "COMPLETE",
      sourceDigest: await sha256TextDigest("readiness-source-v1")
    },
    assets: [{
      memberKey: "module:src/release.ts",
      kind: "FILE",
      label: "src/release.ts",
      sourcePath: "src/release.ts",
      sourceDigest: await sha256TextDigest("export const release = true;")
    }],
    edges: []
  });
  await codeMaps.persist(codeMap);
  const twin = await projectTwinRevision({
    project, mission, evidenceSources: [], claims: [], claimSupersessions: [],
    snapshots: [snapshot], validationResults: [], codeMap
  });
  await new SqliteTwinRepository(database.connection).persist(twin);
  const reassessment = await reassessReconciliation({
    twin, evidenceSources: [], claims: [], claimSupersessions: [],
    targetSnapshot: snapshot, validationResults: [], requirements: []
  });
  const asset = codeMap.assets[0];
  if (asset === undefined) throw new Error("Fixture asset is absent.");
  const assetNode = twin.nodes.find(
    (node) => node.nodeType === "SoftwareAsset" &&
      node.metadata.sourceReference === `code-map-asset:${asset.assetId}`
  );
  if (assetNode === undefined) throw new Error("Fixture asset node is absent.");
  const basis = Object.freeze({
    kind: "NODE" as const,
    memberId: assetNode.nodeId,
    revision: assetNode.revision,
    digest: await sha256TextDigest(serializeTwinNode(assetNode))
  });
  const impact = await analyzeChangeImpact({
    twin, reassessment, codeMap, targetSnapshot: snapshot,
    validationResults: [],
    roots: [{ rootId: "root:release", nodeId: assetNode.nodeId }],
    requirements: [{
      requirementId: "release:core",
      rootId: "root:release",
      criticalAssetId: asset.assetId,
      supportKind: "VALIDATION",
      validationKey: VALIDATION_KEY,
      basisCitations: [basis]
    }]
  });
  const aggregate = await createReconciliationImpactRevision({ reassessment, impact });
  const reconciliations = new SqliteReconciliationRepository(database.connection);
  await reconciliations.persist(aggregate);
  const evidence = new SqliteEvidenceRepository(database.connection, {
    ids: createStableIdGenerator(sequence([E1, T1])),
    clock: createClock(() => new Date("2026-08-06T08:04:00.000Z"))
  });
  const readiness = new SqliteReadinessRepository(database.connection, {
    evidence, snapshots, reconciliations
  });
  const service = new ReadinessAssessmentService({
    repository: readiness,
    ids: createStableIdGenerator(sequence(serviceIds)),
    clock: createClock(() => new Date("2026-08-06T08:10:00.000Z"))
  });
  const passports = new SqlitePassportRepository(database.connection, readiness);
  const passportService = new PassportService({
    passports,
    readinessRepository: readiness,
    readinessService: service,
    ids: createStableIdGenerator(sequence([PP1, PP2])),
    clock: createClock(() => new Date("2026-08-06T08:12:00.000Z"))
  });

  return {
    root, filePath, repositoryRoot, database, projects, snapshots, registrations,
    evidence, reconciliations, readiness, service, passports, passportService, aggregate,
    createSuccessor: async () => {
      const successorImpact = await analyzeChangeImpact({
        twin, reassessment, codeMap, targetSnapshot: snapshot,
        validationResults: [],
        roots: [{ rootId: "root:release", nodeId: assetNode.nodeId }],
        requirements: [{
          requirementId: "release:core:implementation",
          rootId: "root:release",
          criticalAssetId: asset.assetId,
          supportKind: "IMPLEMENTATION",
          basisCitations: [basis]
        }]
      });
      return createReconciliationImpactRevision(
        { reassessment, impact: successorImpact }, aggregate
      );
    }
  };
}

async function persistValidation(value: Fixture): Promise<void> {
  const imported = await value.evidence.persistEvidence({
    projectId: parseStableId<"PROJECT">(P1),
    missionId: parseStableId<"MISSION">(M1),
    origin: "VALIDATION_RESULT",
    sourceLocator: "validation:release/core",
    sourceRevision: "run:1",
    extractionMethod: "DIRECT_IMPORT",
    epistemicLabel: "FACT",
    prepared: await prepareEvidenceImport({
      format: "JSON",
      content: new TextEncoder().encode('{"suite":"release-core","status":"passed"}')
    })
  });
  const validation = await createValidationResult(
    { validationKey: VALIDATION_KEY, status: "PASSED", epistemicLabel: "FACT" },
    imported.source,
    value.snapshots.get(parseStableId<"GIT_SNAPSHOT">(S1)),
    {
      ids: createStableIdGenerator(() => V1),
      clock: createClock(() => new Date("2026-08-06T08:05:00.000Z"))
    }
  );
  await value.service.persistValidation(validation);
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    if (database.connection.open) database.close();
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("release assessment persistence and staleness", () => {
  it("persists exact dependencies, remains byte-immutable, and recovers history after restart", async () => {
    const value = await fixture();
    const first = await value.service.assess(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1)
    );
    expect(first).toMatchObject({
      created: true,
      assessment: { revision: 1, evaluatedStatus: "BLOCKED" }
    });
    expect(first.assessment.evaluation.blockers.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["OPEN_IMPACT_GAP", "VALIDATION_MISSING", "REVIEW_MISSING"])
    );
    const firstPassport = await value.passportService.project(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    expect(firstPassport).toMatchObject({
      created: true,
      passport: {
        passportId: PP1,
        status: "BLOCKED",
        assessment: {
          assessmentId: first.assessment.assessmentId,
          assessmentDigest: first.assessment.assessmentDigest
        }
      }
    });
    expect(await value.passportService.project(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    )).toMatchObject({ created: false, passport: { passportId: PP1 } });
    const passportBefore = value.database.connection.prepare(
      "SELECT canonical_json FROM release_passports WHERE passport_id = ?"
    ).get(PP1) as { readonly canonical_json: string };
    expect(await value.service.assess(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1)
    )).toMatchObject({ created: false, assessment: { assessmentId: first.assessment.assessmentId } });
    const before = value.database.connection.prepare(
      "SELECT canonical_json FROM release_assessments WHERE assessment_id = ?"
    ).get(first.assessment.assessmentId) as { readonly canonical_json: string };

    await value.service.recordReview(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), "HUMAN"
    );
    await persistValidation(value);
    const dependencyState = await value.service.state(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    expect(dependencyState.state.status).toBe("STALE");
    expect(dependencyState.state.staleReasons).toEqual(expect.arrayContaining([
      "VALIDATION_EVIDENCE_CHANGED", "REVIEW_CHANGED", "INPUT_FINGERPRINT_CHANGED"
    ]));
    const passportState = await value.passportService.state(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    expect(passportState.state).toMatchObject({
      statusAtProjection: "BLOCKED",
      status: "STALE",
      passportChanged: false,
      authority: { readinessRecomputed: false, persistenceMutation: false }
    });

    const laterSnapshots = new GitSnapshotService(
      value.database.connection, value.registrations,
      {
        ids: createStableIdGenerator(() => S2),
        clock: createClock(() => new Date("2026-08-06T08:11:00.000Z")),
        runner: new FixedGitCommandRunner()
      }
    );
    await laterSnapshots.capture(parseStableId<"MISSION">(M1));
    const snapshotState = await value.service.state(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    expect(snapshotState.state.staleReasons).toContain("SNAPSHOT_CHANGED");

    await value.reconciliations.persist(await value.createSuccessor());
    const reconciliationState = await value.service.state(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    expect(reconciliationState.state.staleReasons).toEqual(expect.arrayContaining([
      "RECONCILIATION_CHANGED", "VALIDATION_CATALOG_CHANGED", "INPUT_FINGERPRINT_CHANGED"
    ]));
    const staleSuccessor = await value.service.assess(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1)
    );
    expect(staleSuccessor).toMatchObject({
      created: true,
      assessment: {
        revision: 2,
        evaluatedStatus: "STALE",
        predecessor: {
          assessmentId: first.assessment.assessmentId,
          assessmentDigest: first.assessment.assessmentDigest
        }
      }
    });
    expect(staleSuccessor.assessment.evaluation.review).toMatchObject({
      status: "RECORDED",
      reviewId: H1,
      reconciliationResultDigest: value.aggregate.resultDigest
    });
    const secondPassport = await value.passportService.project(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 2
    );
    expect(secondPassport).toMatchObject({
      created: true,
      passport: {
        passportId: PP2,
        status: "STALE",
        assessment: { assessmentId: staleSuccessor.assessment.assessmentId }
      }
    });
    const after = value.database.connection.prepare(
      "SELECT canonical_json FROM release_assessments WHERE assessment_id = ?"
    ).get(first.assessment.assessmentId) as { readonly canonical_json: string };
    expect(after.canonical_json).toBe(before.canonical_json);
    expect((value.database.connection.prepare(
      "SELECT canonical_json FROM release_passports WHERE passport_id = ?"
    ).get(PP1) as { readonly canonical_json: string }).canonical_json).toBe(
      passportBefore.canonical_json
    );
    expect(() => value.database.connection.prepare(
      "UPDATE release_passports SET status_at_projection = 'READY' WHERE passport_id = ?"
    ).run(PP1)).toThrow();
    expect(() => value.database.connection.prepare(
      "DELETE FROM release_passports WHERE passport_id = ?"
    ).run(PP1)).toThrow();

    value.database.close();
    const restarted = openFoundationDatabase({ filePath: value.filePath });
    databases.push(restarted);
    const evidence = new SqliteEvidenceRepository(restarted.connection);
    const registrations = new RepositoryRegistrationService(restarted.connection, value.filePath);
    const snapshots = new GitSnapshotService(restarted.connection, registrations);
    const reconciliations = new SqliteReconciliationRepository(restarted.connection);
    const readiness = new SqliteReadinessRepository(restarted.connection, {
      evidence, snapshots, reconciliations
    });
    const passports = new SqlitePassportRepository(restarted.connection, readiness);
    const recovered = await readiness.getAssessment(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    expect(recovered).toEqual(first.assessment);
    expect((await readiness.listAssessments(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 10
    )).items).toHaveLength(2);
    expect(await passports.get(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    )).toEqual(firstPassport.passport);
    expect((await passports.list(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 10
    )).items).toEqual([secondPassport.passport, firstPassport.passport]);
  });

  it("serializes concurrent identical assessment requests into one canonical revision", async () => {
    const value = await fixture([A1]);
    const competing = new ReadinessAssessmentService({
      repository: value.readiness,
      ids: createStableIdGenerator(() => A2),
      clock: createClock(() => new Date("2026-08-06T08:10:00.000Z"))
    });
    const results = await Promise.all([
      value.service.assess(parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1)),
      competing.assess(parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1))
    ]);
    expect(results.map((entry) => entry.created).sort()).toEqual([false, true]);
    expect(new Set(results.map((entry) => entry.assessment.assessmentId)).size).toBe(1);
    expect(value.database.connection.prepare(
      "SELECT COUNT(*) AS count FROM release_assessments"
    ).get()).toEqual({ count: 1 });
  });

  it("serializes concurrent Passport projection into one immutable record", async () => {
    const value = await fixture();
    await value.service.assess(parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1));
    const competing = new PassportService({
      passports: value.passports,
      readinessRepository: value.readiness,
      readinessService: value.service,
      ids: createStableIdGenerator(() => PP2),
      clock: createClock(() => new Date("2026-08-06T08:12:00.000Z"))
    });
    const results = await Promise.all([
      value.passportService.project(parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1),
      competing.project(parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1)
    ]);
    expect(results.map((entry) => entry.created).sort()).toEqual([false, true]);
    expect(new Set(results.map((entry) => entry.passport.passportId)).size).toBe(1);
    expect(value.database.connection.prepare(
      "SELECT COUNT(*) AS count FROM release_passports"
    ).get()).toEqual({ count: 1 });
  });

  it("rolls back a rejected successor and keeps project scope isolated", async () => {
    const value = await fixture();
    await value.service.assess(parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1));
    await value.service.recordReview(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), "HUMAN"
    );
    value.database.connection.exec(`
      CREATE TRIGGER readiness_forced_rollback
      BEFORE INSERT ON release_assessments
      BEGIN SELECT RAISE(ABORT, 'forced readiness rollback'); END;
    `);
    await expect(value.service.assess(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1)
    )).rejects.toMatchObject({ code: "READINESS_STORAGE_CONFLICT" });
    expect(value.database.connection.prepare(
      "SELECT COUNT(*) AS count FROM release_assessments"
    ).get()).toEqual({ count: 1 });
    await expect(value.readiness.latestAssessment(
      parseStableId<"PROJECT">("00000000-0000-4000-8000-000000000099"),
      parseStableId<"MISSION">(M1)
    )).rejects.toMatchObject({ code: "READINESS_PROJECT_NOT_FOUND" });
  });

  it("fails closed when persisted assessment or Passport canonical bytes are corrupted", async () => {
    const value = await fixture();
    const persisted = await value.service.assess(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1)
    );
    const projected = await value.passportService.project(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    );
    const passportRow = value.database.connection.prepare(
      "SELECT canonical_json FROM release_passports WHERE passport_id = ?"
    ).get(projected.passport.passportId) as { readonly canonical_json: string };
    value.database.connection.exec("DROP TRIGGER release_passports_reject_update");
    const corruptedPassportJson = passportRow.canonical_json.replace(
      '"code":"REVIEW_MISSING"', '"code":"REVIEW_NOT_HUMAN"'
    );
    expect(corruptedPassportJson).not.toBe(passportRow.canonical_json);
    value.database.connection.prepare(
      "UPDATE release_passports SET canonical_json = ? WHERE passport_id = ?"
    ).run(corruptedPassportJson, projected.passport.passportId);
    await expect(value.passports.get(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    )).rejects.toMatchObject({ code: "PASSPORT_STORAGE_SCHEMA_INVALID" });

    value.database.connection.prepare(
      "UPDATE release_passports SET canonical_json = ? WHERE passport_id = ?"
    ).run(passportRow.canonical_json, projected.passport.passportId);
    const assessmentRow = value.database.connection.prepare(
      "SELECT canonical_json FROM release_assessments WHERE assessment_id = ?"
    ).get(persisted.assessment.assessmentId) as { readonly canonical_json: string };
    value.database.connection.exec("DROP TRIGGER release_assessments_reject_update");
    const corruptedAssessmentJson = assessmentRow.canonical_json.replace(
      '"code":"REVIEW_MISSING"', '"code":"REVIEW_NOT_HUMAN"'
    );
    expect(corruptedAssessmentJson).not.toBe(assessmentRow.canonical_json);
    value.database.connection.prepare(
      "UPDATE release_assessments SET canonical_json = ? WHERE assessment_id = ?"
    ).run(corruptedAssessmentJson, persisted.assessment.assessmentId);
    await expect(value.readiness.getAssessment(
      parseStableId<"PROJECT">(P1), parseStableId<"MISSION">(M1), 1
    )).rejects.toMatchObject({ code: "READINESS_STORAGE_SCHEMA_INVALID" });
  });

  it("carries exact DB state through production API and browser contracts across restart without AI or scope leakage", async () => {
    const value = await fixture();
    const otherProjects = new SqliteProjectRepository(value.database.connection, {
      ids: createStableIdGenerator(sequence([P2, M2])),
      clock: createClock(() => new Date("2026-08-06T08:20:00.000Z"))
    });
    const otherProject = otherProjects.createProject("Isolated readiness scope");
    const otherMission = otherProjects.createMission(otherProject.projectId, "No shared assessment");
    const fetchSpy = vi.fn(() => {
      throw new Error("Readiness proof attempted an external call.");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const app = buildApp({
      projectRepository: value.projects,
      readinessRepository: value.readiness,
      readinessService: value.service,
      passportRepository: value.passports,
      passportService: value.passportService
    });
    try {
      const created = await app.inject({
        method: "POST",
        url: `/api/v1/missions/${M1}/readiness/assessments`,
        payload: {}
      });
      expect(created.statusCode, created.body).toBe(201);
      const assessmentResponse = created.json();
      expect(isReadinessAssessmentResponse(assessmentResponse)).toBe(true);
      if (!isReadinessAssessmentResponse(assessmentResponse)) {
        throw new Error("Browser rejected the persisted assessment resource.");
      }

      const projected = await app.inject({
        method: "POST",
        url: `/api/v1/missions/${M1}/readiness/assessments/1/passport`,
        payload: {}
      });
      expect(projected.statusCode, projected.body).toBe(201);
      const passportResponse = projected.json();
      expect(isReleasePassportResponse(passportResponse)).toBe(true);
      if (!isReleasePassportResponse(passportResponse)) {
        throw new Error("Browser rejected the persisted Passport resource.");
      }
      expect(passportResponse.passport).toMatchObject({
        assessmentId: assessmentResponse.assessment.assessmentId,
        assessmentRevision: assessmentResponse.assessment.revision,
        statusAtProjection: assessmentResponse.assessment.evaluatedStatus,
        currentStatus: assessmentResponse.assessment.currentStatus,
        snapshot: {
          targetSnapshotId: assessmentResponse.assessment.snapshot.targetSnapshotId,
          currentSnapshotId: assessmentResponse.assessment.snapshot.currentSnapshotIdAtAssessment
        },
        rule: assessmentResponse.assessment.rule,
        obligations: assessmentResponse.assessment.obligations,
        blockers: assessmentResponse.assessment.blockers,
        findings: assessmentResponse.assessment.findings,
        validations: assessmentResponse.assessment.validations,
        review: assessmentResponse.assessment.review
      });
      expect(passportResponse.passport.authority).toMatchObject({
        projection: "REPRODUCED_NOT_RECOMPUTED",
        readinessRecomputed: false,
        signed: false,
        releaseApproval: false,
        deploymentAuthority: false,
        aiAuthority: "NONE"
      });

      const isolated = await app.inject({
        method: "GET",
        url: `/api/v1/missions/${otherMission.missionId}/readiness/assessments/1`
      });
      expect(isolated.statusCode, isolated.body).toBe(404);
      expect(isolated.body).not.toContain(assessmentResponse.assessment.assessmentId);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
      vi.unstubAllGlobals();
    }

    value.database.close();
    const restarted = openFoundationDatabase({ filePath: value.filePath });
    databases.push(restarted);
    const restartedProjects = new SqliteProjectRepository(restarted.connection);
    const restartedRegistrations = new RepositoryRegistrationService(
      restarted.connection, value.filePath
    );
    const restartedSnapshots = new GitSnapshotService(
      restarted.connection, restartedRegistrations
    );
    const restartedEvidence = new SqliteEvidenceRepository(restarted.connection);
    const restartedReconciliations = new SqliteReconciliationRepository(restarted.connection);
    const restartedReadiness = new SqliteReadinessRepository(restarted.connection, {
      evidence: restartedEvidence,
      snapshots: restartedSnapshots,
      reconciliations: restartedReconciliations
    });
    const restartedService = new ReadinessAssessmentService({ repository: restartedReadiness });
    const restartedPassports = new SqlitePassportRepository(
      restarted.connection, restartedReadiness
    );
    const restartedPassportService = new PassportService({
      passports: restartedPassports,
      readinessRepository: restartedReadiness,
      readinessService: restartedService
    });
    const restartedApp = buildApp({
      projectRepository: restartedProjects,
      readinessRepository: restartedReadiness,
      readinessService: restartedService,
      passportRepository: restartedPassports,
      passportService: restartedPassportService
    });
    try {
      const recoveredAssessment = await restartedApp.inject({
        method: "GET",
        url: `/api/v1/missions/${M1}/readiness/assessments/1`
      });
      const recoveredPassport = await restartedApp.inject({
        method: "GET",
        url: `/api/v1/missions/${M1}/readiness/passports/1`
      });
      expect(recoveredAssessment.statusCode, recoveredAssessment.body).toBe(200);
      expect(recoveredPassport.statusCode, recoveredPassport.body).toBe(200);
      expect(isReadinessAssessmentResponse(recoveredAssessment.json())).toBe(true);
      expect(isReleasePassportResponse(recoveredPassport.json())).toBe(true);
    } finally {
      await restartedApp.close();
    }
  });
});
