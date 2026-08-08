import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { INTELLILOOP_RETAIL_CANCELLATION_FIXTURE } from "@intelliloop/demo-fixtures";
import {
  createClock,
  createStableIdGenerator,
  createValidationResult,
  prepareEvidenceImport,
  serializeTwinNode,
  sha256TextDigest,
  type Clock,
  type CodeMapProjectionRevision,
  type MissionId,
  type ProjectId,
  type TwinProjectionMemberReference,
  type TwinProjectionRevision
} from "@intelliloop/domain";

import type { CodeMapProjectionService } from "../code-map/code-map-projection-service.js";
import type { SqliteConnection } from "../database/database-lifecycle.js";
import type { SqliteClaimRepository } from "../evidence/claim-repository.js";
import type { SqliteEvidenceRepository } from "../evidence/evidence-repository.js";
import type { GitSnapshotService } from "../projects/git-snapshot-service.js";
import type { PassportService } from "../passports/passport-service.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { RepositoryRegistrationService } from "../projects/repository-registration.js";
import type { ReadinessAssessmentService } from "../readiness/readiness-service.js";
import type {
  ExecuteReconciliationInput,
  ReconciliationExecutionService
} from "../reconciliation/reconciliation-service.js";
import type { TwinMaterializationService } from "../twin/twin-repository.js";

const FIXTURE = INTELLILOOP_RETAIL_CANCELLATION_FIXTURE;
const WORKSPACE_DIRECTORY = "demo-workspaces";
const REPOSITORY_DIRECTORY = "repository";
const MARKER_FILE = "workspace.json";
const INITIAL_PHASE = "INITIAL_BLOCKED";
const CORRECTED_PHASE = "CORRECTED_READY_INPUTS";
const PROJECT_NAME = "LoopMart controlled retail demo";
const MISSION_TITLE = "Expand cancellation after picking";
const STALE_MARKER_PATH = "demo/stale-input-change.json";
const STALE_MARKER_CONTENT = `${JSON.stringify({
  schemaVersion: "intelliloop-demo-stale-trigger.v1",
  fixtureId: "loopmart-expanded-cancellation-v1",
  reason: "Controlled post-Passport dependency change",
  synthetic: true
}, null, 2)}\n`;

export const DEMO_WORKSPACE_ERROR_CODES = [
  "DEMO_WORKSPACE_CONFLICT",
  "DEMO_WORKSPACE_INTEGRITY_INVALID",
  "DEMO_WORKSPACE_GIT_FAILED",
  "DEMO_WORKSPACE_SETUP_FAILED",
  "DEMO_WORKSPACE_RESET_FAILED"
] as const;

export type DemoWorkspaceErrorCode =
  (typeof DEMO_WORKSPACE_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<DemoWorkspaceErrorCode, string>> =
  Object.freeze({
    DEMO_WORKSPACE_CONFLICT: "The controlled demo workspace is busy or conflicts with retained state.",
    DEMO_WORKSPACE_INTEGRITY_INVALID: "The controlled demo workspace failed its ownership or path integrity check.",
    DEMO_WORKSPACE_GIT_FAILED: "The controlled demo Git repository could not be materialized.",
    DEMO_WORKSPACE_SETUP_FAILED: "The controlled demo workspace could not be loaded.",
    DEMO_WORKSPACE_RESET_FAILED: "The controlled demo workspace could not be reset safely."
  });

export class DemoWorkspaceError extends Error {
  readonly code: DemoWorkspaceErrorCode;

  constructor(code: DemoWorkspaceErrorCode, options?: ErrorOptions) {
    super(ERROR_MESSAGES[code], options);
    this.name = "DemoWorkspaceError";
    this.code = code;
  }
}

type WorkspaceLifecycleStatus = "MATERIALIZED" | "LOADING" | "READY";

interface WorkspaceRow {
  readonly fixture_id: string;
  readonly fixture_version: string;
  readonly ownership: string;
  readonly lifecycle_status: WorkspaceLifecycleStatus;
  readonly canonical_root: string;
  readonly project_id: string | null;
  readonly mission_id: string | null;
  readonly initial_snapshot_id: string | null;
  readonly code_map_revision: number | null;
  readonly twin_revision: number | null;
  readonly reconciliation_revision: number | null;
  readonly readiness_revision: number | null;
  readonly workflow_stage: "INITIAL_BLOCKED" | "CORRECTED_READY" | "READY_STALE";
  readonly corrected_snapshot_id: string | null;
  readonly corrected_code_map_revision: number | null;
  readonly corrected_twin_revision: number | null;
  readonly corrected_reconciliation_revision: number | null;
  readonly ready_assessment_revision: number | null;
  readonly passport_assessment_revision: number | null;
  readonly stale_snapshot_id: string | null;
  readonly created_at_utc: string;
  readonly updated_at_utc: string;
}

export interface DemoWorkspaceState {
  readonly apiVersion: "v1";
  readonly fixtureId: typeof FIXTURE.fixtureId;
  readonly fixtureVersion: typeof FIXTURE.fixtureVersion;
  readonly ownership: typeof FIXTURE.ownership;
  readonly status: "EMPTY" | "READY";
  readonly synthetic: true;
  readonly repositoryExecution: false;
  readonly projectId?: string;
  readonly missionId?: string;
  readonly initialSnapshotId?: string;
  readonly codeMapRevision?: number;
  readonly twinRevision?: number;
  readonly reconciliationRevision?: number;
  readonly readinessRevision?: number;
  readonly workflowStage?: "INITIAL_BLOCKED" | "CORRECTED_READY" | "READY_STALE";
  readonly readinessStatus?: "BLOCKED" | "READY" | "STALE";
  readonly correctedSnapshotId?: string;
  readonly correctedCodeMapRevision?: number;
  readonly correctedTwinRevision?: number;
  readonly correctedReconciliationRevision?: number;
  readonly readyAssessmentRevision?: number;
  readonly passportAssessmentRevision?: number;
  readonly staleSnapshotId?: string;
}

export interface DemoSetupResult extends DemoWorkspaceState {
  readonly created: boolean;
}

export interface DemoResetResult extends DemoWorkspaceState {
  readonly reset: boolean;
}

export interface DemoTransitionResult extends DemoWorkspaceState {
  readonly changed: boolean;
}

interface MaterializationMarker {
  readonly fixtureId: string;
  readonly fixtureVersion: string;
  readonly ownership: string;
  readonly repositoryDirectory: typeof REPOSITORY_DIRECTORY;
}

function inside(parent: string, child: string): boolean {
  const difference = relative(parent, child);
  return difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference));
}

function safeFilePath(repositoryRoot: string, fixturePath: string): string {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,511}$/u.test(fixturePath) ||
    fixturePath.includes("\\") ||
    fixturePath.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
  }
  const target = resolve(repositoryRoot, ...fixturePath.split("/"));
  if (!inside(repositoryRoot, target) || target === repositoryRoot) {
    throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
  }
  return target;
}

function controlledGitEnvironment(timestamp = "2026-08-01T10:00:00Z"): NodeJS.ProcessEnv {
  return {
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "",
    GIT_AUTHOR_DATE: timestamp,
    GIT_COMMITTER_DATE: timestamp,
    LC_ALL: "C"
  };
}

function runGit(repositoryRoot: string, args: readonly string[], timestamp = "2026-08-01T10:00:00Z"): void {
  const result = spawnSync("git", [...args], {
    cwd: repositoryRoot,
    shell: false,
    windowsHide: true,
    stdio: "ignore",
    env: controlledGitEnvironment(timestamp)
  });
  if (result.status !== 0) {
    throw new DemoWorkspaceError("DEMO_WORKSPACE_GIT_FAILED");
  }
}

class RetailDemoMaterializer {
  readonly workspaceRoot: string;
  readonly repositoryRoot: string;
  readonly #markerPath: string;

  constructor(databaseFilePath: string) {
    if (!isAbsolute(databaseFilePath)) {
      throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
    }
    const base = resolve(dirname(databaseFilePath), WORKSPACE_DIRECTORY);
    this.workspaceRoot = resolve(base, FIXTURE.fixtureId);
    this.repositoryRoot = resolve(this.workspaceRoot, REPOSITORY_DIRECTORY);
    this.#markerPath = resolve(this.workspaceRoot, MARKER_FILE);
    if (!inside(base, this.workspaceRoot) || !inside(this.workspaceRoot, this.repositoryRoot)) {
      throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
    }
  }

  #marker(): MaterializationMarker {
    return Object.freeze({
      fixtureId: FIXTURE.fixtureId,
      fixtureVersion: FIXTURE.fixtureVersion,
      ownership: FIXTURE.ownership,
      repositoryDirectory: REPOSITORY_DIRECTORY
    });
  }

  #assertOwnedMarker(): void {
    try {
      if (!existsSync(this.workspaceRoot) || lstatSync(this.workspaceRoot).isSymbolicLink()) {
        throw new Error("missing workspace");
      }
      const marker = JSON.parse(readFileSync(this.#markerPath, "utf8")) as unknown;
      if (JSON.stringify(marker) !== JSON.stringify(this.#marker())) {
        throw new Error("invalid marker");
      }
    } catch {
      throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
    }
  }

  assertMaterialized(): void {
    this.#assertOwnedMarker();
    try {
      if (
        !existsSync(this.repositoryRoot) ||
        lstatSync(this.repositoryRoot).isSymbolicLink() ||
        !existsSync(resolve(this.repositoryRoot, ".git"))
      ) {
        throw new Error("missing repository");
      }
    } catch {
      throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
    }
  }

  materialize(): void {
    if (existsSync(this.workspaceRoot)) {
      this.#assertOwnedMarker();
      try {
        this.assertMaterialized();
        return;
      } catch {
        rmSync(this.workspaceRoot, { recursive: true, force: false });
      }
    }
    try {
      mkdirSync(this.workspaceRoot, { recursive: true });
      writeFileSync(this.#markerPath, JSON.stringify(this.#marker(), null, 2), {
        encoding: "utf8",
        flag: "wx"
      });
      mkdirSync(this.repositoryRoot);
      for (const file of FIXTURE.repository.initialRevision.files) {
        const target = safeFilePath(this.repositoryRoot, file.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.content, { encoding: "utf8", flag: "wx" });
      }
      runGit(this.repositoryRoot, ["init", "-b", "main"]);
      runGit(this.repositoryRoot, ["add", "--all"]);
      runGit(this.repositoryRoot, [
        "-c", "user.name=IntelliLoop Fixture",
        "-c", "user.email=fixture@invalid.example",
        "commit", "-m", FIXTURE.repository.initialRevision.commitMessage
      ]);
    } catch (error) {
      if (error instanceof DemoWorkspaceError) throw error;
      throw new DemoWorkspaceError("DEMO_WORKSPACE_SETUP_FAILED");
    }
    this.assertMaterialized();
  }

  applyCorrection(): void {
    this.assertMaterialized();
    try {
      for (const change of FIXTURE.repository.correctionRevision.changes) {
        const target = safeFilePath(this.repositoryRoot, change.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, change.content, { encoding: "utf8" });
      }
      runGit(this.repositoryRoot, ["add", "--all"], "2026-08-02T10:15:00Z");
      const staged = spawnSync("git", ["diff", "--cached", "--quiet"], {
        cwd: this.repositoryRoot,
        shell: false,
        windowsHide: true,
        stdio: "ignore",
        env: controlledGitEnvironment("2026-08-02T10:15:00Z")
      });
      if (staged.status === 1) {
        runGit(this.repositoryRoot, [
          "-c", "user.name=IntelliLoop Fixture",
          "-c", "user.email=fixture@invalid.example",
          "commit", "-m", FIXTURE.repository.correctionRevision.commitMessage
        ], "2026-08-02T10:15:00Z");
      } else if (staged.status !== 0) {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_GIT_FAILED");
      }
    } catch (error) {
      if (error instanceof DemoWorkspaceError) throw error;
      throw new DemoWorkspaceError("DEMO_WORKSPACE_SETUP_FAILED", { cause: error });
    }
  }

  introduceStaleChange(): void {
    this.assertMaterialized();
    const target = safeFilePath(this.repositoryRoot, STALE_MARKER_PATH);
    try {
      mkdirSync(dirname(target), { recursive: true });
      if (existsSync(target) && readFileSync(target, "utf8") !== STALE_MARKER_CONTENT) {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      }
      if (!existsSync(target)) writeFileSync(target, STALE_MARKER_CONTENT, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (error instanceof DemoWorkspaceError) throw error;
      throw new DemoWorkspaceError("DEMO_WORKSPACE_SETUP_FAILED", { cause: error });
    }
  }

  reset(): boolean {
    if (!existsSync(this.workspaceRoot)) return false;
    this.#assertOwnedMarker();
    rmSync(this.workspaceRoot, { recursive: true, force: false });
    return true;
  }
}

export interface DemoWorkspaceServiceDependencies {
  readonly connection: SqliteConnection;
  readonly databaseFilePath: string;
  readonly projects: SqliteProjectRepository;
  readonly registrations: RepositoryRegistrationService;
  readonly snapshots: GitSnapshotService;
  readonly evidence: SqliteEvidenceRepository;
  readonly claims: SqliteClaimRepository;
  readonly codeMaps: CodeMapProjectionService;
  readonly twins: TwinMaterializationService;
  readonly reconciliations: ReconciliationExecutionService;
  readonly readiness: ReadinessAssessmentService;
  readonly passports: PassportService;
  readonly clock?: Clock;
}

function emptyState(): DemoWorkspaceState {
  return Object.freeze({
    apiVersion: "v1",
    fixtureId: FIXTURE.fixtureId,
    fixtureVersion: FIXTURE.fixtureVersion,
    ownership: FIXTURE.ownership,
    status: "EMPTY",
    synthetic: true,
    repositoryExecution: false
  });
}

function readyState(row: WorkspaceRow): DemoWorkspaceState {
  if (
    row.lifecycle_status !== "READY" ||
    row.project_id === null || row.mission_id === null ||
    row.initial_snapshot_id === null || row.code_map_revision === null ||
    row.twin_revision === null || row.reconciliation_revision === null ||
    row.readiness_revision === null
  ) {
    throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
  }
  const corrected = row.workflow_stage !== "INITIAL_BLOCKED";
  const stale = row.workflow_stage === "READY_STALE";
  if (corrected && (
    row.corrected_snapshot_id === null || row.corrected_code_map_revision === null ||
    row.corrected_twin_revision === null || row.corrected_reconciliation_revision === null ||
    row.ready_assessment_revision === null || row.passport_assessment_revision === null
  )) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
  if (stale && row.stale_snapshot_id === null) {
    throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
  }
  return Object.freeze({
    ...emptyState(),
    status: "READY",
    projectId: row.project_id,
    missionId: row.mission_id,
    initialSnapshotId: row.initial_snapshot_id,
    codeMapRevision: row.code_map_revision,
    twinRevision: row.twin_revision,
    reconciliationRevision: row.reconciliation_revision,
    readinessRevision: row.readiness_revision,
    workflowStage: row.workflow_stage,
    readinessStatus: row.workflow_stage === "INITIAL_BLOCKED"
      ? "BLOCKED"
      : row.workflow_stage === "CORRECTED_READY" ? "READY" : "STALE",
    ...(row.corrected_snapshot_id === null ? {} : { correctedSnapshotId: row.corrected_snapshot_id }),
    ...(row.corrected_code_map_revision === null ? {} : { correctedCodeMapRevision: row.corrected_code_map_revision }),
    ...(row.corrected_twin_revision === null ? {} : { correctedTwinRevision: row.corrected_twin_revision }),
    ...(row.corrected_reconciliation_revision === null ? {} : { correctedReconciliationRevision: row.corrected_reconciliation_revision }),
    ...(row.ready_assessment_revision === null ? {} : { readyAssessmentRevision: row.ready_assessment_revision }),
    ...(row.passport_assessment_revision === null ? {} : { passportAssessmentRevision: row.passport_assessment_revision }),
    ...(row.stale_snapshot_id === null ? {} : { staleSnapshotId: row.stale_snapshot_id })
  });
}

export class DemoWorkspaceService {
  readonly #dependencies: DemoWorkspaceServiceDependencies;
  readonly #materializer: RetailDemoMaterializer;
  readonly #clock: Clock;
  #tail: Promise<void> = Promise.resolve();

  constructor(dependencies: DemoWorkspaceServiceDependencies) {
    this.#dependencies = dependencies;
    this.#materializer = new RetailDemoMaterializer(dependencies.databaseFilePath);
    this.#clock = dependencies.clock ?? createClock(() => new Date());
  }

  async #exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const before = this.#tail;
    let release = (): void => undefined;
    this.#tail = new Promise<void>((resolveTail) => { release = resolveTail; });
    await before;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  #row(): WorkspaceRow | undefined {
    return this.#dependencies.connection.prepare(
      `SELECT fixture_id, fixture_version, ownership, lifecycle_status,
              canonical_root, project_id, mission_id, initial_snapshot_id,
              code_map_revision, twin_revision, reconciliation_revision,
              readiness_revision, workflow_stage, corrected_snapshot_id,
              corrected_code_map_revision, corrected_twin_revision,
              corrected_reconciliation_revision, ready_assessment_revision,
              passport_assessment_revision, stale_snapshot_id,
              created_at_utc, updated_at_utc
       FROM demo_workspaces WHERE fixture_id = ?`
    ).get(FIXTURE.fixtureId) as WorkspaceRow | undefined;
  }

  #assertRowIdentity(row: WorkspaceRow): void {
    if (
      row.fixture_id !== FIXTURE.fixtureId ||
      row.fixture_version !== FIXTURE.fixtureVersion ||
      row.ownership !== FIXTURE.ownership ||
      resolve(row.canonical_root) !== this.#materializer.repositoryRoot
    ) {
      throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
    }
  }

  status(): DemoWorkspaceState {
    const row = this.#row();
    if (row === undefined) return emptyState();
    this.#assertRowIdentity(row);
    if (row.lifecycle_status !== "READY") return emptyState();
    this.#materializer.assertMaterialized();
    this.#dependencies.projects.getProject(row.project_id as ProjectId);
    this.#dependencies.projects.getMission(row.mission_id as MissionId);
    return readyState(row);
  }

  async setup(): Promise<DemoSetupResult> {
    return this.#exclusive(async () => {
      const retained = this.#row();
      if (retained?.lifecycle_status === "READY") {
        return Object.freeze({ ...this.status(), created: false });
      }
      if (retained !== undefined) await this.#resetInternal();

      try {
        this.#materializer.materialize();
        const now = this.#clock.now();
        this.#dependencies.connection.prepare(
          `INSERT INTO demo_workspaces (
             fixture_id, fixture_version, ownership, lifecycle_status,
             canonical_root, created_at_utc, updated_at_utc
           ) VALUES (?, ?, ?, 'MATERIALIZED', ?, ?, ?)`
        ).run(
          FIXTURE.fixtureId,
          FIXTURE.fixtureVersion,
          FIXTURE.ownership,
          this.#materializer.repositoryRoot,
          now,
          now
        );

        const project = this.#dependencies.connection.transaction(() => {
          const created = this.#dependencies.projects.createProject(PROJECT_NAME);
          const owned = this.#dependencies.connection.prepare(
            `UPDATE demo_workspaces
             SET lifecycle_status = 'LOADING', project_id = ?, updated_at_utc = ?
             WHERE fixture_id = ? AND lifecycle_status = 'MATERIALIZED'`
          ).run(created.projectId, this.#clock.now(), FIXTURE.fixtureId);
          if (owned.changes !== 1) throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
          return created;
        }).immediate();
        const mission = this.#dependencies.connection.transaction(() => {
          const created = this.#dependencies.projects.createMission(project.projectId, MISSION_TITLE);
          const owned = this.#dependencies.connection.prepare(
            "UPDATE demo_workspaces SET mission_id = ?, updated_at_utc = ? WHERE fixture_id = ? AND project_id = ?"
          ).run(created.missionId, this.#clock.now(), FIXTURE.fixtureId, project.projectId);
          if (owned.changes !== 1) throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
          return created;
        }).immediate();
        this.#dependencies.registrations.register(project.projectId, this.#materializer.repositoryRoot);

        const evidenceByKey = new Map<string, Awaited<ReturnType<SqliteEvidenceRepository["persistEvidence"]>>["source"]>();
        for (const draft of FIXTURE.evidence.filter((item) => item.phase === INITIAL_PHASE)) {
          const prepared = await prepareEvidenceImport({
            format: draft.format,
            content: new TextEncoder().encode(draft.content)
          });
          const persisted = await this.#dependencies.evidence.persistEvidence({
            projectId: project.projectId,
            missionId: mission.missionId,
            origin: draft.origin,
            sourceLocator: draft.sourceLocator,
            sourceRevision: draft.sourceRevision,
            effectiveAtUtc: draft.effectiveAtUtc,
            extractionMethod: "DIRECT_IMPORT",
            epistemicLabel: draft.epistemicLabel,
            prepared
          });
          evidenceByKey.set(draft.evidenceKey, persisted.source);
        }

        const claimsByKey = new Map<string, Awaited<ReturnType<SqliteClaimRepository["persistClaim"]>>["claim"]>();
        for (const draft of FIXTURE.claims.filter((item) => item.phase === INITIAL_PHASE)) {
          const source = evidenceByKey.get(draft.evidenceKey);
          if (source === undefined) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
          const persisted = await this.#dependencies.claims.persistClaim({
            projectId: project.projectId,
            missionId: mission.missionId,
            evidenceSourceId: source.evidenceSourceId,
            rawText: draft.rawText,
            subject: draft.subject,
            predicate: draft.predicate,
            value: draft.value,
            applicability: draft.applicability,
            effectiveAtUtc: draft.effectiveAtUtc,
            extractionMethod: "MANUAL_STRUCTURED_INTAKE",
            epistemicLabel: draft.epistemicLabel
          });
          claimsByKey.set(draft.claimKey, persisted.claim);
        }

        const codeMapResult = await this.#dependencies.codeMaps.run(mission.missionId);
        const twinResult = await this.#dependencies.twins.materialize(mission.missionId);
        const reconciliationResult = await this.#dependencies.reconciliations.execute(
          project.projectId,
          mission.missionId,
          await this.#reconciliationInput(codeMapResult.projection, twinResult.projection, claimsByKey)
        );
        const readinessResult = await this.#dependencies.readiness.assess(project.projectId, mission.missionId);
        if (readinessResult.assessment.evaluatedStatus !== "BLOCKED") {
          throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
        }

        const updated = this.#dependencies.connection.prepare(
          `UPDATE demo_workspaces SET
             lifecycle_status = 'READY', initial_snapshot_id = ?,
             code_map_revision = ?, twin_revision = ?, reconciliation_revision = ?,
             readiness_revision = ?, updated_at_utc = ?
           WHERE fixture_id = ? AND lifecycle_status = 'LOADING'
             AND project_id = ? AND mission_id = ?`
        ).run(
          codeMapResult.projection.snapshotId,
          codeMapResult.projection.revision,
          twinResult.projection.revision,
          reconciliationResult.revision.revision,
          readinessResult.assessment.revision,
          this.#clock.now(),
          FIXTURE.fixtureId,
          project.projectId,
          mission.missionId
        );
        if (updated.changes !== 1) throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
        return Object.freeze({ ...this.status(), created: true });
      } catch (error) {
        try {
          await this.#resetInternal();
        } catch {
          throw new DemoWorkspaceError("DEMO_WORKSPACE_RESET_FAILED", { cause: error });
        }
        if (error instanceof DemoWorkspaceError) throw error;
        throw new DemoWorkspaceError("DEMO_WORKSPACE_SETUP_FAILED", { cause: error });
      }
    });
  }

  async #persistAllFixtureData(projectId: ProjectId, missionId: MissionId) {
    const evidenceByKey = new Map<string, Awaited<ReturnType<SqliteEvidenceRepository["persistEvidence"]>>["source"]>();
    for (const draft of FIXTURE.evidence) {
      const prepared = await prepareEvidenceImport({
        format: draft.format,
        content: new TextEncoder().encode(draft.content)
      });
      const persisted = await this.#dependencies.evidence.persistEvidence({
        projectId,
        missionId,
        origin: draft.origin,
        sourceLocator: draft.sourceLocator,
        sourceRevision: draft.sourceRevision,
        effectiveAtUtc: draft.effectiveAtUtc,
        extractionMethod: "DIRECT_IMPORT",
        epistemicLabel: draft.epistemicLabel,
        prepared
      });
      evidenceByKey.set(draft.evidenceKey, persisted.source);
    }

    const claimsByKey = new Map<string, Awaited<ReturnType<SqliteClaimRepository["persistClaim"]>>["claim"]>();
    for (const draft of FIXTURE.claims) {
      const source = evidenceByKey.get(draft.evidenceKey);
      const predecessor = draft.supersedesClaimKey === undefined
        ? undefined
        : claimsByKey.get(draft.supersedesClaimKey);
      if (source === undefined || (draft.supersedesClaimKey !== undefined && predecessor === undefined)) {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      }
      const persisted = await this.#dependencies.claims.persistClaim({
        projectId,
        missionId,
        evidenceSourceId: source.evidenceSourceId,
        rawText: draft.rawText,
        subject: draft.subject,
        predicate: draft.predicate,
        value: draft.value,
        applicability: draft.applicability,
        effectiveAtUtc: draft.effectiveAtUtc,
        extractionMethod: "MANUAL_STRUCTURED_INTAKE",
        epistemicLabel: draft.epistemicLabel,
        ...(predecessor === undefined ? {} : { supersedesClaimId: predecessor.claimId })
      });
      claimsByKey.set(draft.claimKey, persisted.claim);
    }
    return Object.freeze({ evidenceByKey, claimsByKey });
  }

  async applyCorrection(): Promise<DemoTransitionResult> {
    return this.#exclusive(async () => {
      const row = this.#row();
      if (row === undefined || row.lifecycle_status !== "READY") {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
      }
      this.#assertRowIdentity(row);
      if (row.workflow_stage !== "INITIAL_BLOCKED") {
        return Object.freeze({ ...this.status(), changed: false });
      }
      const projectId = row.project_id as ProjectId;
      const missionId = row.mission_id as MissionId;
      try {
        this.#materializer.applyCorrection();
        const { evidenceByKey, claimsByKey } = await this.#persistAllFixtureData(projectId, missionId);
        const codeMapResult = await this.#dependencies.codeMaps.run(missionId);
        const correctedSnapshot = this.#dependencies.snapshots.get(codeMapResult.projection.snapshotId);

        for (const draft of FIXTURE.validations) {
          const source = evidenceByKey.get(draft.evidenceKey);
          if (source === undefined) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
          const existing = this.#dependencies.connection.prepare(
            `SELECT validation_result_id FROM validation_results
             WHERE project_id = ? AND mission_id = ? AND evidence_source_id = ?
               AND snapshot_id = ? AND validation_key = ? LIMIT 1`
          ).get(projectId, missionId, source.evidenceSourceId, correctedSnapshot.snapshotId, draft.validationKey);
          if (existing !== undefined) continue;
          const validation = await createValidationResult(
            {
              validationKey: draft.validationKey,
              status: draft.status,
              epistemicLabel: "FACT",
              effectiveAtUtc: draft.phase === CORRECTED_PHASE
                ? draft.evidenceKey === "VALIDATION_INVENTORY"
                  ? "2026-08-02T10:00:00.000Z"
                  : "2026-08-02T10:01:00.000Z"
                : draft.evidenceKey === "VALIDATION_ORDER"
                  ? "2026-08-01T10:05:00.000Z"
                  : "2026-08-01T10:06:00.000Z"
            },
            source,
            correctedSnapshot,
            { ids: createStableIdGenerator(() => randomUUID()), clock: this.#clock }
          );
          await this.#dependencies.readiness.persistValidation(validation);
        }

        const validations = await this.#dependencies.readiness.listLatestValidations(projectId, missionId);
        const validationAssetPaths: Readonly<Record<string, string>> = Object.freeze({
          "test:order/cancellation-window": FIXTURE.impact.assetAliases.ORDER_CANCELLATION_SERVICE,
          "test:refund/initiation": FIXTURE.impact.assetAliases.REFUND_HANDLER,
          "test:inventory/post-picking-release": FIXTURE.impact.assetAliases.INVENTORY_RESERVATION_CONSUMER,
          "test:fulfilment/post-picking-stop": FIXTURE.impact.assetAliases.FULFILMENT_COORDINATOR
        });
        const assetByPath = new Map(codeMapResult.projection.assets.map((asset) => [asset.sourcePath, asset]));
        const semanticRelationships = validations.map((validation) => {
          const assetPath = validationAssetPaths[validation.validationKey];
          const asset = assetPath === undefined ? undefined : assetByPath.get(assetPath);
          if (asset === undefined) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
          return Object.freeze({
            relationshipKey: `controlled-validation/${validation.validationKey}`,
            relationshipType: "VALIDATED_BY" as const,
            from: Object.freeze({ sourceType: "SoftwareAsset" as const, sourceId: asset.assetId }),
            to: Object.freeze({
              sourceType: "ValidationResult" as const,
              sourceId: validation.validationResultId
            }),
            attribution: Object.freeze({
              origin: validation.origin,
              sourceReference: validation.sourceLocator,
              recordedAtUtc: validation.recordedAtUtc,
              ...(validation.effectiveAtUtc === undefined
                ? {}
                : { effectiveAtUtc: validation.effectiveAtUtc }),
              extractionMethod: "CONTROLLED_FIXTURE_VALIDATION_BINDING",
              epistemicLabel: "FACT" as const
            })
          });
        });
        const twinResult = await this.#dependencies.twins.materialize(missionId, {
          semanticRelationships: Object.freeze(semanticRelationships)
        });
        const reconciliationResult = await this.#dependencies.reconciliations.execute(
          projectId,
          missionId,
          await this.#reconciliationInput(codeMapResult.projection, twinResult.projection, claimsByKey)
        );
        const existingReview = this.#dependencies.connection.prepare(
          `SELECT review_id FROM readiness_reviews
           WHERE project_id = ? AND mission_id = ? AND snapshot_id = ?
             AND reconciliation_revision = ? AND actor_kind = 'HUMAN' LIMIT 1`
        ).get(projectId, missionId, correctedSnapshot.snapshotId, reconciliationResult.revision.revision);
        if (existingReview === undefined) {
          await this.#dependencies.readiness.recordReview(projectId, missionId, FIXTURE.review.actorKind);
        }
        const readinessResult = await this.#dependencies.readiness.assess(projectId, missionId);
        if (readinessResult.assessment.evaluatedStatus !== "READY") {
          throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID", {
            cause: new Error(JSON.stringify({
              blockers: readinessResult.assessment.evaluation.blockers,
              impactGaps: reconciliationResult.revision.impact.impactGapFindings
            }))
          });
        }
        const passportResult = await this.#dependencies.passports.project(
          projectId, missionId, readinessResult.assessment.revision
        );
        if (passportResult.passport.status !== "READY") {
          throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
        }
        const updated = this.#dependencies.connection.prepare(
          `UPDATE demo_workspaces SET workflow_stage = 'CORRECTED_READY',
             corrected_snapshot_id = ?, corrected_code_map_revision = ?,
             corrected_twin_revision = ?, corrected_reconciliation_revision = ?,
             ready_assessment_revision = ?, passport_assessment_revision = ?, updated_at_utc = ?
           WHERE fixture_id = ? AND workflow_stage = 'INITIAL_BLOCKED'`
        ).run(
          correctedSnapshot.snapshotId, codeMapResult.projection.revision,
          twinResult.projection.revision, reconciliationResult.revision.revision,
          readinessResult.assessment.revision, passportResult.passport.assessment.revision,
          this.#clock.now(), FIXTURE.fixtureId
        );
        if (updated.changes !== 1) throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
        return Object.freeze({ ...this.status(), changed: true });
      } catch (error) {
        if (error instanceof DemoWorkspaceError) throw error;
        throw new DemoWorkspaceError("DEMO_WORKSPACE_SETUP_FAILED", { cause: error });
      }
    });
  }

  async demonstrateStaleness(): Promise<DemoTransitionResult> {
    return this.#exclusive(async () => {
      const row = this.#row();
      if (row === undefined || row.lifecycle_status !== "READY" || row.workflow_stage === "INITIAL_BLOCKED") {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
      }
      this.#assertRowIdentity(row);
      if (row.workflow_stage === "READY_STALE") {
        return Object.freeze({ ...this.status(), changed: false });
      }
      const projectId = row.project_id as ProjectId;
      const missionId = row.mission_id as MissionId;
      this.#materializer.introduceStaleChange();
      const snapshot = await this.#dependencies.snapshots.capture(missionId);
      const assessmentState = await this.#dependencies.readiness.state(
        projectId, missionId, row.ready_assessment_revision as number
      );
      const passportState = await this.#dependencies.passports.state(
        projectId, missionId, row.passport_assessment_revision as number
      );
      if (assessmentState.state.status !== "STALE" || passportState.state.status !== "STALE") {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      }
      const updated = this.#dependencies.connection.prepare(
        `UPDATE demo_workspaces SET workflow_stage = 'READY_STALE', stale_snapshot_id = ?, updated_at_utc = ?
         WHERE fixture_id = ? AND workflow_stage = 'CORRECTED_READY'`
      ).run(snapshot.snapshotId, this.#clock.now(), FIXTURE.fixtureId);
      if (updated.changes !== 1) throw new DemoWorkspaceError("DEMO_WORKSPACE_CONFLICT");
      return Object.freeze({ ...this.status(), changed: true });
    });
  }

  async #reconciliationInput(
    codeMap: CodeMapProjectionRevision,
    twin: TwinProjectionRevision,
    claimsByKey: ReadonlyMap<string, { readonly claimId: string }>
  ): Promise<ExecuteReconciliationInput> {
    const nodeBySource = new Map(twin.nodeSources.map((binding) => [
      `${binding.sourceType}:${binding.sourceId}`,
      binding
    ]));
    const assetByPath = new Map(codeMap.assets.map((asset) => [asset.sourcePath, asset]));
    const assetNode = (path: string) => {
      const asset = assetByPath.get(path);
      const binding = asset === undefined ? undefined : nodeBySource.get(`SoftwareAsset:${asset.assetId}`);
      if (asset === undefined || binding === undefined) {
        throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      }
      return { asset, binding };
    };
    const citationForClaim = async (claimKey: string): Promise<TwinProjectionMemberReference> => {
      const claim = claimsByKey.get(claimKey);
      const binding = claim === undefined ? undefined : nodeBySource.get(`Claim:${claim.claimId}`);
      if (binding === undefined) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      const node = twin.nodes.find((candidate) =>
        candidate.nodeId === binding.nodeId && candidate.revision === binding.nodeRevision
      );
      if (node === undefined) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      return Object.freeze({
        kind: "NODE" as const,
        memberId: binding.nodeId,
        revision: binding.nodeRevision,
        digest: await sha256TextDigest(serializeTwinNode(node))
      });
    };
    const roots = FIXTURE.impact.roots.map((root) => Object.freeze({
      rootId: root.rootAlias.toLocaleLowerCase("en-US").replaceAll("_", "-"),
      nodeId: assetNode(root.assetPath).binding.nodeId
    }));
    const rootIdByAlias = new Map(FIXTURE.impact.roots.map((root, index) => [
      root.rootAlias,
      roots[index]?.rootId
    ]));
    const impactRequirements: ExecuteReconciliationInput["impactRequirements"][number][] = [];
    for (const requirement of FIXTURE.impact.requirements) {
      const rootId = rootIdByAlias.get(requirement.rootAlias);
      const assetPath = FIXTURE.impact.assetAliases[requirement.criticalAssetAlias];
      if (rootId === undefined) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
      impactRequirements.push(Object.freeze({
        requirementId: requirement.requirementId,
        rootId,
        criticalAssetId: assetNode(assetPath).asset.assetId,
        supportKind: requirement.supportKind,
        ...(requirement.validationKey === undefined ? {} : { validationKey: requirement.validationKey }),
        basisCitations: Object.freeze(await Promise.all(requirement.basisClaimKeys.map(citationForClaim)))
      }));
    }
    const supportRequirements: ExecuteReconciliationInput["supportRequirements"] =
      Object.freeze(FIXTURE.supportRequirements.map((requirement) =>
        requirement.supportKind === "EVIDENCE_SOURCE"
          ? Object.freeze({
              requirementId: requirement.requirementId,
              supportKind: "EVIDENCE_SOURCE" as const,
              sourceLocator: requirement.sourceLocator ?? ""
            })
          : Object.freeze({
              requirementId: requirement.requirementId,
              supportKind: "VALIDATION_RESULT" as const,
              validationKey: requirement.validationKey ?? ""
            })
      ));
    return Object.freeze({
      twinRevision: twin.revision,
      codeMapRevision: codeMap.revision,
      targetSnapshotId: codeMap.snapshotId,
      supportRequirements,
      roots: Object.freeze(roots),
      impactRequirements: Object.freeze(impactRequirements)
    });
  }

  async reset(): Promise<DemoResetResult> {
    return this.#exclusive(async () => {
      const reset = await this.#resetInternal();
      return Object.freeze({ ...emptyState(), reset });
    });
  }

  async #resetInternal(): Promise<boolean> {
    const row = this.#row();
    if (row === undefined) return this.#materializer.reset();
    this.#assertRowIdentity(row);
    const projectId = row.project_id;
    try {
      if (projectId === null) {
        this.#dependencies.connection.prepare(
          "DELETE FROM demo_workspaces WHERE fixture_id = ?"
        ).run(FIXTURE.fixtureId);
      } else {
        this.#dependencies.connection.pragma("defer_foreign_keys = ON");
        this.#dependencies.connection.transaction(() => {
          this.#dependencies.connection.prepare(
            "INSERT INTO demo_reset_authorizations (project_id, fixture_id, authorized_at_utc) VALUES (?, ?, ?)"
          ).run(projectId, FIXTURE.fixtureId, this.#clock.now());
          this.#dependencies.connection.prepare(
            "DELETE FROM demo_workspaces WHERE fixture_id = ? AND project_id = ?"
          ).run(FIXTURE.fixtureId, projectId);
          const scopedTables = [
            "release_passports", "release_assessments", "readiness_reviews",
            "validation_results", "reconciliation_impact_revisions", "twin_revisions",
            "code_map_revisions", "runtime_observations", "claim_supersessions",
            "claims", "timeline_events", "evidence_sources", "git_snapshots",
            "repositories", "mission_revisions", "missions", "project_revisions"
          ] as const;
          for (const table of scopedTables) {
            this.#dependencies.connection.prepare(`DELETE FROM ${table} WHERE project_id = ?`).run(projectId);
          }
          const deleted = this.#dependencies.connection.prepare(
            "DELETE FROM projects WHERE project_id = ?"
          ).run(projectId);
          if (deleted.changes !== 1) throw new DemoWorkspaceError("DEMO_WORKSPACE_INTEGRITY_INVALID");
          this.#dependencies.connection.prepare(
            "DELETE FROM demo_reset_authorizations WHERE project_id = ?"
          ).run(projectId);
        }).immediate();
      }
      this.#materializer.reset();
      return true;
    } catch (error) {
      if (error instanceof DemoWorkspaceError) throw error;
      throw new DemoWorkspaceError("DEMO_WORKSPACE_RESET_FAILED", { cause: error });
    }
  }
}
