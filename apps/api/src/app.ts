import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import {
  createApiErrorResponse,
  createHealthResponse,
  type ApiErrorCode,
  type ApiErrorResponse,
  type HealthResponse
} from "@intelliloop/contracts";
import {
  ClaimError,
  ImpactAnalysisError,
  EvidenceImportError,
  EvidenceSourceError,
  ReassessmentError,
  ReconciliationImpactRevisionError,
  RuntimeObservationError,
  CodeMapProjectionError,
  formatUtcTimestamp,
  ProjectDomainError,
  ReadinessAssessmentError,
  ReadinessEvaluationError,
  ReleasePassportError
} from "@intelliloop/domain";

import {
  API_ERROR_RESPONSE_SCHEMA,
  HEALTH_RESPONSE_SCHEMA
} from "./http-schemas.js";
import { SILENT_LOGGER, type SafeLogger } from "./observability.js";
import {
  ProjectRepositoryError,
  type SqliteProjectRepository
} from "./projects/project-repository.js";
import { registerProjectRoutes } from "./projects/project-routes.js";
import { registerGitSnapshotRoutes } from "./projects/git-snapshot-routes.js";
import {
  GitSnapshotError,
  type GitSnapshotService
} from "./projects/git-snapshot-service.js";
import {
  RepositoryRegistrationError,
  type RepositoryRegistrationService
} from "./projects/repository-registration.js";
import { REQUEST_ID_HEADER, resolveRequestId } from "./request-id.js";
import {
  ClaimRepositoryError,
  type SqliteClaimRepository
} from "./evidence/claim-repository.js";
import {
  EvidenceRepositoryError,
  type SqliteEvidenceRepository
} from "./evidence/evidence-repository.js";
import { registerEvidenceRoutes } from "./evidence/evidence-routes.js";
import { registerRuntimeObservationRoutes } from "./evidence/runtime-observation-routes.js";
import { registerTwinRoutes } from "./twin/twin-routes.js";
import {
  TwinRepositoryError,
  type SqliteTwinRepository,
  type TwinMaterializationService
} from "./twin/twin-repository.js";
import { registerCodeMapRoutes } from "./code-map/code-map-routes.js";
import {
  CodeMapRunError,
  type CodeMapProjectionService
} from "./code-map/code-map-projection-service.js";
import {
  CodeMapRepositoryError,
  type SqliteCodeMapRepository
} from "./code-map/code-map-repository.js";
import { CodeMapScanError } from "./code-map/code-map-scanner.js";
import { CodeMapExtractionError } from "./code-map/code-map-extractor.js";
import {
  ReconciliationRepositoryError,
  type SqliteReconciliationRepository
} from "./reconciliation/reconciliation-repository.js";
import { registerReconciliationRoutes } from "./reconciliation/reconciliation-routes.js";
import {
  ReconciliationExecutionError,
  type ReconciliationExecutionService
} from "./reconciliation/reconciliation-service.js";
import { registerCitedExplanationRoutes } from "./explanations/cited-explanation-routes.js";
import {
  CitedExplanationError,
  type CitedExplanationService
} from "./explanations/cited-explanation-service.js";
import {
  registerReadinessPassportRoutes,
  type PassportApiRepository,
  type PassportApiService,
  type ReadinessApiRepository,
  type ReadinessApiService
} from "./readiness/readiness-passport-routes.js";
import { ReadinessRepositoryError } from "./readiness/readiness-repository.js";
import { ReadinessExecutionError } from "./readiness/readiness-service.js";
import { PassportRepositoryError } from "./passports/passport-repository.js";
import { PassportExecutionError } from "./passports/passport-service.js";
import {
  DemoWorkspaceError,
  type DemoWorkspaceService
} from "./demo/demo-workspace-service.js";
import { registerDemoRoutes } from "./demo/demo-routes.js";
import {
  LocalProjectPilotError,
  type LocalProjectPilotService
} from "./projects/local-project-pilot-service.js";
import { registerLocalProjectPilotRoutes } from "./projects/local-project-pilot-routes.js";

export interface BuildAppOptions {
  readonly clock?: () => Date;
  readonly logger?: SafeLogger;
  readonly projectRepository?: SqliteProjectRepository;
  readonly repositoryRegistration?: RepositoryRegistrationService;
  readonly gitSnapshotService?: GitSnapshotService;
  readonly evidenceRepository?: SqliteEvidenceRepository;
  readonly claimRepository?: SqliteClaimRepository;
  readonly twinRepository?: SqliteTwinRepository;
  readonly twinMaterializer?: TwinMaterializationService;
  readonly codeMapRepository?: SqliteCodeMapRepository;
  readonly codeMapProjectionService?: CodeMapProjectionService;
  readonly reconciliationRepository?: SqliteReconciliationRepository;
  readonly reconciliationExecutionService?: ReconciliationExecutionService;
  readonly citedExplanationService?: CitedExplanationService;
  readonly readinessRepository?: ReadinessApiRepository;
  readonly readinessService?: ReadinessApiService;
  readonly passportRepository?: PassportApiRepository;
  readonly passportService?: PassportApiService;
  readonly demoWorkspaceService?: DemoWorkspaceService;
  readonly localProjectPilotService?: LocalProjectPilotService;
  readonly requestIdFactory?: () => string;
}

function classifyError(error: unknown): {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
} {
  if (error instanceof LocalProjectPilotError) {
    switch (error.code) {
      case "LOCAL_PROJECT_CONTEXT_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "LOCAL_PROJECT_FEATURE_DISABLED":
      case "LOCAL_PROJECT_CONFIGURATION_REQUIRED":
      case "LOCAL_PROJECT_PREFLIGHT_REJECTED":
        return { code: "INVALID_REQUEST", statusCode: 400 };
    }
  }
  if (error instanceof DemoWorkspaceError) {
    switch (error.code) {
      case "DEMO_WORKSPACE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "DEMO_WORKSPACE_INTEGRITY_INVALID":
      case "DEMO_WORKSPACE_GIT_FAILED":
      case "DEMO_WORKSPACE_SETUP_FAILED":
      case "DEMO_WORKSPACE_RESET_FAILED":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ProjectRepositoryError) {
    switch (error.code) {
      case "PROJECT_NOT_FOUND":
      case "MISSION_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "PROJECT_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "PROJECT_STORAGE_SCHEMA_INVALID":
      case "PROJECT_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof RepositoryRegistrationError) {
    switch (error.code) {
      case "REPOSITORY_PROJECT_NOT_FOUND":
      case "REPOSITORY_NOT_REGISTERED":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "REPOSITORY_PROJECT_ARCHIVED":
      case "REPOSITORY_DATABASE_CONFLICT":
      case "REPOSITORY_ALREADY_REGISTERED":
        return { code: "CONFLICT", statusCode: 409 };
      case "REPOSITORY_PATH_INVALID":
      case "REPOSITORY_PATH_NOT_FOUND":
      case "REPOSITORY_NOT_GIT":
      case "REPOSITORY_SYMLINK_REJECTED":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "REPOSITORY_STORAGE_SCHEMA_INVALID":
      case "REPOSITORY_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof GitSnapshotError) {
    switch (error.code) {
      case "GIT_MISSION_NOT_FOUND":
      case "GIT_REPOSITORY_NOT_REGISTERED":
      case "GIT_SNAPSHOT_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "GIT_MISSION_ARCHIVED":
      case "GIT_REPOSITORY_CHANGED":
        return { code: "CONFLICT", statusCode: 409 };
      case "GIT_EXECUTABLE_UNAVAILABLE":
      case "GIT_CAPTURE_TIMEOUT":
      case "GIT_OUTPUT_LIMIT":
      case "GIT_CAPTURE_FAILED":
      case "GIT_STATUS_INVALID":
      case "GIT_STORAGE_SCHEMA_INVALID":
      case "GIT_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ProjectDomainError) {
    switch (error.code) {
      case "INVALID_PROJECT_NAME":
      case "INVALID_MISSION_TITLE":
      case "INVALID_ENTITY":
      case "NON_MONOTONIC_TIME":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "PROJECT_ARCHIVED":
      case "PROJECT_ALREADY_ARCHIVED":
      case "MISSION_ALREADY_ARCHIVED":
      case "CURRENT_MISSION_EXISTS":
      case "CURRENT_MISSION_CONFLICT":
      case "PROJECT_HAS_CURRENT_MISSION":
      case "CROSS_PROJECT_REFERENCE":
      case "DUPLICATE_MISSION_ID":
        return { code: "CONFLICT", statusCode: 409 };
    }
  }
  if (error instanceof EvidenceImportError) {
    return { code: "INVALID_REQUEST", statusCode: 400 };
  }
  if (error instanceof EvidenceSourceError) {
    return { code: "INVALID_REQUEST", statusCode: 400 };
  }
  if (error instanceof RuntimeObservationError) {
    return { code: "INVALID_REQUEST", statusCode: 400 };
  }
  if (error instanceof EvidenceRepositoryError) {
    switch (error.code) {
      case "EVIDENCE_PROJECT_NOT_FOUND":
      case "EVIDENCE_MISSION_NOT_FOUND":
      case "EVIDENCE_SOURCE_NOT_FOUND":
      case "RUNTIME_OBSERVATION_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "EVIDENCE_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "EVIDENCE_CROSS_SCOPE":
      case "EVIDENCE_MISSION_NOT_CURRENT":
      case "EVIDENCE_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "EVIDENCE_STORAGE_SCHEMA_INVALID":
      case "EVIDENCE_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ClaimError) {
    return error.code === "CLAIM_SUPERSESSION_INVALID"
      ? { code: "CONFLICT", statusCode: 409 }
      : { code: "INVALID_REQUEST", statusCode: 400 };
  }
  if (error instanceof ClaimRepositoryError) {
    switch (error.code) {
      case "CLAIM_PROJECT_NOT_FOUND":
      case "CLAIM_MISSION_NOT_FOUND":
      case "CLAIM_SOURCE_NOT_FOUND":
      case "CLAIM_NOT_FOUND":
      case "CLAIM_PREDECESSOR_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "CLAIM_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "CLAIM_CROSS_SCOPE":
      case "CLAIM_MISSION_NOT_CURRENT":
      case "CLAIM_SUPERSESSION_CONFLICT":
      case "CLAIM_HISTORY_LIMIT":
      case "CLAIM_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "CLAIM_STORAGE_SCHEMA_INVALID":
      case "CLAIM_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof TwinRepositoryError) {
    switch (error.code) {
      case "TWIN_PROJECT_NOT_FOUND":
      case "TWIN_MISSION_NOT_FOUND":
      case "TWIN_REVISION_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "TWIN_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "TWIN_SOURCE_LIMIT":
      case "TWIN_PREDECESSOR_CONFLICT":
      case "TWIN_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "TWIN_STORAGE_SCHEMA_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
      case "TWIN_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof CodeMapRepositoryError) {
    switch (error.code) {
      case "CODE_MAP_PROJECT_NOT_FOUND":
      case "CODE_MAP_MISSION_NOT_FOUND":
      case "CODE_MAP_REVISION_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "CODE_MAP_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "CODE_MAP_PREDECESSOR_CONFLICT":
      case "CODE_MAP_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "CODE_MAP_STORAGE_SCHEMA_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
      case "CODE_MAP_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof CodeMapRunError) {
    return error.code === "CODE_MAP_RUN_FALLBACK_MANIFEST_INVALID"
      ? { code: "INTERNAL_ERROR", statusCode: 500 }
      : { code: "CONFLICT", statusCode: 409 };
  }
  if (error instanceof CodeMapScanError) {
    switch (error.code) {
      case "CODE_MAP_MISSION_NOT_FOUND":
      case "CODE_MAP_REPOSITORY_NOT_REGISTERED":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "CODE_MAP_MISSION_ARCHIVED":
      case "CODE_MAP_ROOT_UNSAFE":
      case "CODE_MAP_TRAVERSAL_REJECTED":
      case "CODE_MAP_SYMLINK_REJECTED":
      case "CODE_MAP_ENTRY_TYPE_UNSUPPORTED":
      case "CODE_MAP_FILE_LIMIT_EXCEEDED":
      case "CODE_MAP_FILE_BYTES_EXCEEDED":
      case "CODE_MAP_AGGREGATE_BYTES_EXCEEDED":
      case "CODE_MAP_SCAN_TIMEOUT":
      case "CODE_MAP_FILE_ENCODING_INVALID":
      case "CODE_MAP_REPOSITORY_CHANGED":
        return { code: "CONFLICT", statusCode: 409 };
      case "CODE_MAP_READ_FAILED":
      case "CODE_MAP_SCAN_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof CodeMapExtractionError) {
    switch (error.code) {
      case "CODE_MAP_EXTRACTION_NODE_LIMIT_EXCEEDED":
      case "CODE_MAP_EXTRACTION_RECORD_LIMIT_EXCEEDED":
      case "CODE_MAP_EXTRACTION_TIMEOUT":
        return { code: "CONFLICT", statusCode: 409 };
      case "CODE_MAP_EXTRACTION_INPUT_INVALID":
      case "CODE_MAP_EXTRACTION_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof CodeMapProjectionError) {
    return { code: "INTERNAL_ERROR", statusCode: 500 };
  }
  if (error instanceof ReconciliationRepositoryError) {
    switch (error.code) {
      case "RECONCILIATION_PROJECT_NOT_FOUND":
      case "RECONCILIATION_MISSION_NOT_FOUND":
      case "RECONCILIATION_REVISION_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "RECONCILIATION_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "RECONCILIATION_PREDECESSOR_CONFLICT":
      case "RECONCILIATION_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "RECONCILIATION_STORAGE_SCHEMA_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
      case "RECONCILIATION_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ReconciliationExecutionError) {
    return { code: "CONFLICT", statusCode: 409 };
  }
  if (error instanceof ReassessmentError) {
    switch (error.code) {
      case "REASSESSMENT_INPUT_INVALID":
      case "REASSESSMENT_REQUIREMENT_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "REASSESSMENT_SCOPE_INVALID":
      case "REASSESSMENT_TWIN_INVALID":
      case "REASSESSMENT_LIMIT_EXCEEDED":
      case "REASSESSMENT_PREDECESSOR_INVALID":
        return { code: "CONFLICT", statusCode: 409 };
      case "REASSESSMENT_SERIALIZATION_INVALID":
      case "REASSESSMENT_INTEGRITY_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ImpactAnalysisError) {
    switch (error.code) {
      case "IMPACT_INPUT_INVALID":
      case "IMPACT_REQUIREMENT_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "IMPACT_SCOPE_INVALID":
      case "IMPACT_TWIN_INVALID":
      case "IMPACT_LIMIT_EXCEEDED":
        return { code: "CONFLICT", statusCode: 409 };
      case "IMPACT_INTEGRITY_INVALID":
      case "IMPACT_SERIALIZATION_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ReconciliationImpactRevisionError) {
    return { code: "INTEGRITY_ERROR", statusCode: 500 };
  }
  if (error instanceof CitedExplanationError) {
    switch (error.code) {
      case "CITED_EXPLANATION_INPUT_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "CITED_EXPLANATION_ASSESSMENT_UNAVAILABLE":
      case "CITED_EXPLANATION_LIMIT_EXCEEDED":
        return { code: "CONFLICT", statusCode: 409 };
      case "CITED_EXPLANATION_SOURCE_UNAVAILABLE":
      case "CITED_EXPLANATION_INTEGRITY_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ReadinessRepositoryError) {
    switch (error.code) {
      case "READINESS_PROJECT_NOT_FOUND":
      case "READINESS_MISSION_NOT_FOUND":
      case "READINESS_VALIDATION_NOT_FOUND":
      case "READINESS_REVIEW_NOT_FOUND":
      case "READINESS_ASSESSMENT_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "READINESS_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "READINESS_PREDECESSOR_CONFLICT":
      case "READINESS_DEPENDENCY_CONFLICT":
      case "READINESS_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "READINESS_STORAGE_SCHEMA_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
      case "READINESS_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof ReadinessExecutionError) {
    switch (error.code) {
      case "READINESS_EXECUTION_ASSESSMENT_MISSING":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "READINESS_EXECUTION_RECONCILIATION_MISSING":
      case "READINESS_EXECUTION_SNAPSHOT_MISSING":
        return { code: "CONFLICT", statusCode: 409 };
      case "READINESS_EXECUTION_VALIDATION_CATALOG_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof PassportRepositoryError) {
    switch (error.code) {
      case "PASSPORT_NOT_FOUND":
        return { code: "NOT_FOUND", statusCode: 404 };
      case "PASSPORT_PAGE_INVALID":
        return { code: "INVALID_REQUEST", statusCode: 400 };
      case "PASSPORT_ASSESSMENT_CONFLICT":
      case "PASSPORT_STORAGE_CONFLICT":
        return { code: "CONFLICT", statusCode: 409 };
      case "PASSPORT_STORAGE_SCHEMA_INVALID":
        return { code: "INTEGRITY_ERROR", statusCode: 500 };
      case "PASSPORT_STORAGE_FAILED":
        return { code: "INTERNAL_ERROR", statusCode: 500 };
    }
  }
  if (error instanceof PassportExecutionError) {
    return { code: "CONFLICT", statusCode: 409 };
  }
  if (
    error instanceof ReadinessAssessmentError ||
    error instanceof ReadinessEvaluationError ||
    error instanceof ReleasePassportError
  ) {
    return { code: "INTEGRITY_ERROR", statusCode: 500 };
  }
  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;

  if (
    statusCode !== undefined &&
    statusCode >= 400 &&
    statusCode < 500
  ) {
    return { code: "INVALID_REQUEST", statusCode };
  }
  return { code: "INTERNAL_ERROR", statusCode: 500 };
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const clock = options.clock ?? (() => new Date());
  const logger = options.logger ?? SILENT_LOGGER;
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
    ajv: { customOptions: { removeAdditional: false } },
    genReqId: (request) =>
      resolveRequestId(
        request.headers[REQUEST_ID_HEADER],
        options.requestIdFactory
      )
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    logger.info({
      event: "api.request.completed",
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url ?? "UNMATCHED",
      statusCode: reply.statusCode
    });
  });

  app.setNotFoundHandler(
    async (request, reply): Promise<ApiErrorResponse> => {
      reply.code(404);
      return createApiErrorResponse("NOT_FOUND", request.id);
    }
  );

  app.setErrorHandler((error, request, reply) => {
    const classified = classifyError(error);
    const domainErrorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      /^[A-Z][A-Z0-9_]{2,127}$/u.test(error.code)
        ? error.code
        : undefined;
    logger.error({
      event: "api.request.failed",
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url ?? "UNMATCHED",
      statusCode: classified.statusCode,
      errorCode: classified.code,
      ...(domainErrorCode === undefined ? {} : { domainErrorCode })
    });

    reply
      .code(classified.statusCode)
      .type("application/json")
      .send(createApiErrorResponse(classified.code, request.id));
  });

  app.get<{ Reply: HealthResponse }>(
    "/api/v1/health",
    {
      schema: {
        response: {
          200: HEALTH_RESPONSE_SCHEMA,
          500: API_ERROR_RESPONSE_SCHEMA
        }
      }
    },
    async () => createHealthResponse(formatUtcTimestamp(clock()))
  );

  if (options.projectRepository !== undefined) {
    registerProjectRoutes(
      app,
      options.projectRepository,
      options.repositoryRegistration
    );
  }
  if (options.localProjectPilotService !== undefined) {
    registerLocalProjectPilotRoutes(app, options.localProjectPilotService);
  }
  if (options.gitSnapshotService !== undefined) {
    registerGitSnapshotRoutes(app, options.gitSnapshotService);
  }
  if (
    options.projectRepository !== undefined &&
    options.evidenceRepository !== undefined &&
    options.claimRepository !== undefined
  ) {
    registerEvidenceRoutes(
      app,
      options.projectRepository,
      options.evidenceRepository,
      options.claimRepository
    );
    registerRuntimeObservationRoutes(
      app,
      options.projectRepository,
      options.evidenceRepository
    );
  }
  if (
    options.projectRepository !== undefined &&
    options.twinRepository !== undefined &&
    options.twinMaterializer !== undefined
  ) {
    registerTwinRoutes(
      app,
      options.projectRepository,
      options.twinRepository,
      options.twinMaterializer
    );
  }
  if (
    options.projectRepository !== undefined &&
    options.codeMapRepository !== undefined &&
    options.codeMapProjectionService !== undefined
  ) {
    registerCodeMapRoutes(
      app,
      options.projectRepository,
      options.codeMapRepository,
      options.codeMapProjectionService
    );
  }
  if (
    options.projectRepository !== undefined &&
    options.reconciliationRepository !== undefined &&
    options.reconciliationExecutionService !== undefined
  ) {
    registerReconciliationRoutes(
      app,
      options.projectRepository,
      options.reconciliationRepository,
      options.reconciliationExecutionService
    );
  }
  if (
    options.projectRepository !== undefined &&
    options.citedExplanationService !== undefined
  ) {
    registerCitedExplanationRoutes(
      app,
      options.projectRepository,
      options.citedExplanationService
    );
  }
  if (
    options.projectRepository !== undefined &&
    options.readinessRepository !== undefined &&
    options.readinessService !== undefined &&
    options.passportRepository !== undefined &&
    options.passportService !== undefined
  ) {
    registerReadinessPassportRoutes(
      app,
      options.projectRepository,
      options.readinessRepository,
      options.readinessService,
      options.passportRepository,
      options.passportService
    );
  }
  if (options.demoWorkspaceService !== undefined) {
    registerDemoRoutes(app, options.demoWorkspaceService);
  }

  return app;
}
