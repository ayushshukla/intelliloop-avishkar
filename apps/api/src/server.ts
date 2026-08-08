import { buildApp } from "./app.js";
import { loadApiConfig } from "./config.js";
import {
  openFoundationDatabase,
  type FoundationDatabase
} from "./database/database-lifecycle.js";
import { createSafeLogger } from "./observability.js";
import { SqliteProjectRepository } from "./projects/project-repository.js";
import { GitSnapshotService } from "./projects/git-snapshot-service.js";
import { RepositoryRegistrationService } from "./projects/repository-registration.js";
import { SqliteClaimRepository } from "./evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "./evidence/evidence-repository.js";
import { SqliteCodeMapRepository } from "./code-map/code-map-repository.js";
import { CodeMapScanner } from "./code-map/code-map-scanner.js";
import { CodeMapExtractor } from "./code-map/code-map-extractor.js";
import { CodeMapProjectionService } from "./code-map/code-map-projection-service.js";
import { INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP } from "@intelliloop/demo-fixtures";
import { createClock, createProviderNeutralAdapter } from "@intelliloop/domain";
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "./twin/twin-repository.js";
import { SqliteReconciliationRepository } from "./reconciliation/reconciliation-repository.js";
import { ReconciliationExecutionService } from "./reconciliation/reconciliation-service.js";
import { CitedExplanationService } from "./explanations/cited-explanation-service.js";
import { SqliteReadinessRepository } from "./readiness/readiness-repository.js";
import { ReadinessAssessmentService } from "./readiness/readiness-service.js";
import { SqlitePassportRepository } from "./passports/passport-repository.js";
import { PassportService } from "./passports/passport-service.js";
import { DemoWorkspaceService } from "./demo/demo-workspace-service.js";
import { LocalProjectPilotService } from "./projects/local-project-pilot-service.js";

async function start(): Promise<void> {
  let config;
  try {
    config = loadApiConfig();
  } catch {
    createSafeLogger({
      level: "error",
      write: (line) => process.stderr.write(line)
    }).error({
      event: "api.start_failed",
      errorCode: "CONFIG_INVALID"
    });
    process.exitCode = 1;
    return;
  }

  const logger = createSafeLogger({
    level: config.logLevel,
    write: (line) => process.stdout.write(line)
  });
  let database: FoundationDatabase;
  try {
    database = openFoundationDatabase({
      filePath: config.database.filePath
    });
  } catch {
    createSafeLogger({
      level: "error",
      write: (line) => process.stderr.write(line)
    }).error({
      event: "api.start_failed",
      errorCode: "DATABASE_START_FAILED"
    });
    process.exitCode = 1;
    return;
  }

  const projectRepository = new SqliteProjectRepository(database.connection);
  const evidenceRepository = new SqliteEvidenceRepository(database.connection);
  const claimRepository = new SqliteClaimRepository(database.connection);
  const repositoryRegistration = new RepositoryRegistrationService(
    database.connection,
    config.database.filePath
  );
  const gitSnapshotService = new GitSnapshotService(
    database.connection,
    repositoryRegistration
  );
  const localProjectPilotService = new LocalProjectPilotService(
    database.connection,
    repositoryRegistration,
    config.localProjectPilot
  );
  const twinRepository = new SqliteTwinRepository(database.connection);
  const codeMapRepository = new SqliteCodeMapRepository(database.connection);
  const codeMapProjectionService = new CodeMapProjectionService({
    snapshots: gitSnapshotService,
    scanner: new CodeMapScanner(database.connection, repositoryRegistration),
    extractor: new CodeMapExtractor(),
    repository: codeMapRepository,
    clock: createClock(() => new Date()),
    fallback: {
      enabledForControlledIntelliLoopFixture: true,
      manifest: INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP
    }
  });
  const reconciliationRepository = new SqliteReconciliationRepository(
    database.connection
  );
  const readinessRepository = new SqliteReadinessRepository(
    database.connection,
    {
      evidence: evidenceRepository,
      snapshots: gitSnapshotService,
      reconciliations: reconciliationRepository
    }
  );
  const twinMaterializer = new TwinMaterializationService({
    projects: projectRepository,
    evidence: evidenceRepository,
    claims: claimRepository,
    snapshots: gitSnapshotService,
    twins: twinRepository,
    codeMaps: codeMapRepository,
    validations: readinessRepository
  });
  const reconciliationExecutionService = new ReconciliationExecutionService({
    twins: twinRepository,
    codeMaps: codeMapRepository,
    evidence: evidenceRepository,
    claims: claimRepository,
    snapshots: gitSnapshotService,
    reconciliations: reconciliationRepository,
    validations: readinessRepository
  });
  const readinessAssessmentService = new ReadinessAssessmentService({
    repository: readinessRepository
  });
  const passportRepository = new SqlitePassportRepository(
    database.connection,
    readinessRepository
  );
  const passportService = new PassportService({
    passports: passportRepository,
    readinessRepository,
    readinessService: readinessAssessmentService
  });
  const citedExplanationService = new CitedExplanationService({
    twins: twinRepository,
    evidence: evidenceRepository,
    claims: claimRepository,
    assessments: reconciliationRepository,
    adapter: createProviderNeutralAdapter()
  });
  const demoWorkspaceService = new DemoWorkspaceService({
    connection: database.connection,
    databaseFilePath: config.database.filePath,
    projects: projectRepository,
    registrations: repositoryRegistration,
    snapshots: gitSnapshotService,
    evidence: evidenceRepository,
    claims: claimRepository,
    codeMaps: codeMapProjectionService,
    twins: twinMaterializer,
    reconciliations: reconciliationExecutionService,
    readiness: readinessAssessmentService,
    passports: passportService
  });
  const app = buildApp({
    logger,
    projectRepository,
    evidenceRepository,
    claimRepository,
    repositoryRegistration,
    gitSnapshotService,
    twinRepository,
    twinMaterializer,
    codeMapRepository,
    codeMapProjectionService,
    reconciliationRepository,
    reconciliationExecutionService,
    citedExplanationService,
    readinessRepository,
    readinessService: readinessAssessmentService,
    passportRepository,
    passportService,
    demoWorkspaceService,
    localProjectPilotService
  });
  let stopping = false;

  async function stop(): Promise<void> {
    if (stopping) return;
    stopping = true;
    logger.info({ event: "api.stopping" });
    try {
      await app.close();
    } finally {
      database.close();
      logger.info({ event: "api.stopped" });
    }
  }

  process.once("SIGINT", () => {
    void stop();
  });
  process.once("SIGTERM", () => {
    void stop();
  });

  logger.info({
    event: "api.starting",
    host: config.host,
    port: config.port
  });

  try {
    await app.listen({ host: config.host, port: config.port });
    logger.info({
      event: "api.listening",
      host: config.host,
      port: config.port
    });
  } catch {
    logger.error({
      event: "api.start_failed",
      errorCode: "LISTEN_FAILED"
    });
    try {
      await app.close();
    } finally {
      database.close();
    }
    process.exitCode = 1;
  }
}

await start();
