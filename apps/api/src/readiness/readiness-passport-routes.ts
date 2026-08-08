import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  READINESS_PASSPORT_API_VERSION,
  createReleasePassportExportResponse,
  toReadinessAssessmentResource,
  toReadinessAssessmentSummaryResource,
  toReleasePassportResource,
  toReleasePassportSummaryResource,
  type ReadinessAssessmentListResponse,
  type ReadinessAssessmentResponse,
  type ReleasePassportExportResponse,
  type ReleasePassportListResponse,
  type ReleasePassportResponse
} from "@intelliloop/contracts";
import {
  ORIGIN_KINDS,
  READINESS_ASSESSMENT_STALE_REASONS,
  READINESS_BLOCKER_CODES,
  READINESS_OBLIGATION_IDS,
  VALIDATION_RESULT_STATUSES,
  parseStableId,
  type MissionId,
  type ProjectId,
  type ReadinessAssessment,
  type ReleasePassport
} from "@intelliloop/domain";

import { API_ERROR_RESPONSE_SCHEMA, UUID_V4_SCHEMA } from "../http-schemas.js";
import type { SqlitePassportRepository } from "../passports/passport-repository.js";
import type { PassportService } from "../passports/passport-service.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { SqliteReadinessRepository } from "./readiness-repository.js";
import type { ReadinessAssessmentService } from "./readiness-service.js";

interface MissionParams {
  readonly missionId: string;
}

interface RevisionParams extends MissionParams {
  readonly revision: string;
}

interface RevisionPageQuery {
  readonly limit?: number;
  readonly cursor?: number;
}

interface EmptyBody {}

export interface ReadinessApiRepository {
  listAssessments(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): ReturnType<SqliteReadinessRepository["listAssessments"]>;
}

export interface ReadinessApiService {
  assess: ReadinessAssessmentService["assess"];
  state: ReadinessAssessmentService["state"];
}

export interface PassportApiRepository {
  list(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): ReturnType<SqlitePassportRepository["list"]>;
}

export interface PassportApiService {
  project: PassportService["project"];
  state: PassportService["state"];
}

const DIGEST_SCHEMA = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$"
} as const;

const TIMESTAMP_SCHEMA = {
  type: "string",
  pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$"
} as const;

const IDENTIFIER_SCHEMA = {
  type: "string",
  minLength: 3,
  maxLength: 256,
  pattern: "^(?!.*//)(?!.*(?:^|/)\\.{1,2}(?:/|$))[a-z0-9][a-z0-9._:/-]*$"
} as const;

const STATUS_SCHEMA = { enum: ["BLOCKED", "READY", "STALE"] } as const;

const missionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId"],
  properties: { missionId: UUID_V4_SCHEMA }
} as const;

const revisionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId", "revision"],
  properties: {
    missionId: UUID_V4_SCHEMA,
    revision: { type: "string", pattern: "^[1-9][0-9]{0,14}$" }
  }
} as const;

const pageQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_PAGE_LIMIT,
      default: DEFAULT_PAGE_LIMIT
    },
    cursor: { type: "integer", minimum: 1 }
  }
} as const;

const emptyBodySchema = {
  type: "object",
  additionalProperties: false,
  maxProperties: 0
} as const;

const pageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "nextCursor"],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
    nextCursor: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] }
  }
} as const;

const staleReasonsSchema = {
  type: "array",
  maxItems: READINESS_ASSESSMENT_STALE_REASONS.length,
  uniqueItems: true,
  items: { enum: READINESS_ASSESSMENT_STALE_REASONS }
} as const;

const findingCountsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP", "total"],
  properties: {
    CONFLICT: { type: "integer", minimum: 0 },
    AMBIGUOUS: { type: "integer", minimum: 0 },
    MISSING: { type: "integer", minimum: 0 },
    STALE: { type: "integer", minimum: 0 },
    IMPACT_GAP: { type: "integer", minimum: 0 },
    total: { type: "integer", minimum: 0 }
  }
} as const;

const blockerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code", "obligationId"],
  properties: {
    code: { enum: READINESS_BLOCKER_CODES },
    obligationId: { enum: READINESS_OBLIGATION_IDS }
  }
} as const;

const obligationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["obligationId", "category", "requirement", "status", "blockerCodes"],
  properties: {
    obligationId: { enum: READINESS_OBLIGATION_IDS },
    category: { enum: ["INTEGRITY", "SCOPE", "SNAPSHOT", "FINDINGS", "VALIDATIONS", "REVIEW", "FRESHNESS", "AUTHORITY", "PERSISTENCE"] },
    requirement: { type: "string", minLength: 1, maxLength: 512 },
    status: { enum: ["SATISFIED", "UNSATISFIED"] },
    blockerCodes: {
      type: "array",
      maxItems: READINESS_BLOCKER_CODES.length,
      uniqueItems: true,
      items: { enum: READINESS_BLOCKER_CODES }
    }
  }
} as const;

const validationRequirementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requirementId", "validationKey"],
  properties: {
    requirementId: IDENTIFIER_SCHEMA,
    validationKey: IDENTIFIER_SCHEMA
  }
} as const;

const validationEvidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "validationResultId", "requirementId", "validationKey", "projectId", "missionId",
    "snapshotId", "status", "origin", "resultDigest", "persistence"
  ],
  properties: {
    validationResultId: UUID_V4_SCHEMA,
    requirementId: IDENTIFIER_SCHEMA,
    validationKey: IDENTIFIER_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    snapshotId: UUID_V4_SCHEMA,
    status: { enum: VALIDATION_RESULT_STATUSES },
    origin: { enum: ORIGIN_KINDS },
    resultDigest: DIGEST_SCHEMA,
    persistence: { const: "PERSISTED" }
  }
} as const;

const validationsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requirements", "evidence"],
  properties: {
    requirements: { type: "array", maxItems: 256, items: validationRequirementSchema },
    evidence: { type: "array", maxItems: 256, items: validationEvidenceSchema }
  }
} as const;

const reviewSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["status"],
      properties: { status: { const: "MISSING" } }
    },
    {
      type: "object",
      additionalProperties: false,
      required: [
        "status", "reviewId", "actorKind", "projectId", "missionId", "snapshotId",
        "reconciliationResultDigest", "reviewDigest", "persistence"
      ],
      properties: {
        status: { const: "RECORDED" },
        reviewId: UUID_V4_SCHEMA,
        actorKind: { enum: ["HUMAN", "AI_ADVISORY"] },
        projectId: UUID_V4_SCHEMA,
        missionId: UUID_V4_SCHEMA,
        snapshotId: UUID_V4_SCHEMA,
        reconciliationResultDigest: DIGEST_SCHEMA,
        reviewDigest: DIGEST_SCHEMA,
        persistence: { const: "PERSISTED" }
      }
    }
  ]
} as const;

const assessmentSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "assessmentId", "revision", "recordedAtUtc", "evaluatedStatus", "currentStatus",
    "staleReasons", "assessmentDigest", "stateDigest"
  ],
  properties: {
    assessmentId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    recordedAtUtc: TIMESTAMP_SCHEMA,
    evaluatedStatus: STATUS_SCHEMA,
    currentStatus: STATUS_SCHEMA,
    staleReasons: staleReasonsSchema,
    assessmentDigest: DIGEST_SCHEMA,
    stateDigest: DIGEST_SCHEMA
  }
} as const;

const assessmentResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    ...assessmentSummarySchema.required,
    "version", "projectId", "missionId", "inputFingerprint", "snapshot", "reconciliation",
    "rule", "obligations", "blockers", "findings", "validations", "review", "authority"
  ],
  properties: {
    ...assessmentSummarySchema.properties,
    version: { const: "release-assessment.v1" },
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    inputFingerprint: {
      type: "object",
      additionalProperties: false,
      required: ["evaluatedDigest", "currentDigest"],
      properties: { evaluatedDigest: DIGEST_SCHEMA, currentDigest: DIGEST_SCHEMA }
    },
    snapshot: {
      type: "object",
      additionalProperties: false,
      required: ["targetSnapshotId", "currentSnapshotIdAtAssessment"],
      properties: {
        targetSnapshotId: UUID_V4_SCHEMA,
        currentSnapshotIdAtAssessment: UUID_V4_SCHEMA
      }
    },
    reconciliation: {
      type: "object",
      additionalProperties: false,
      required: ["revision", "revisionKey", "resultDigest"],
      properties: {
        revision: { type: "integer", minimum: 1 },
        revisionKey: DIGEST_SCHEMA,
        resultDigest: DIGEST_SCHEMA
      }
    },
    rule: {
      type: "object",
      additionalProperties: false,
      required: ["policyVersion", "policyDigest"],
      properties: {
        policyVersion: { const: "readiness.v1" },
        policyDigest: DIGEST_SCHEMA
      }
    },
    obligations: { type: "array", minItems: 9, maxItems: 9, items: obligationSchema },
    blockers: { type: "array", maxItems: READINESS_BLOCKER_CODES.length, items: blockerSchema },
    findings: findingCountsSchema,
    validations: validationsSchema,
    review: reviewSchema,
    predecessor: {
      type: "object",
      additionalProperties: false,
      required: ["assessmentId", "revision", "assessmentDigest"],
      properties: {
        assessmentId: UUID_V4_SCHEMA,
        revision: { type: "integer", minimum: 1 },
        assessmentDigest: DIGEST_SCHEMA
      }
    },
    authority: {
      type: "object",
      additionalProperties: false,
      required: [
        "assessmentPersistence", "readinessStatusAuthority", "currentStateDerivation",
        "storedAssessmentChanged", "releaseApproval", "releasePassport",
        "deploymentAuthority", "aiAuthority"
      ],
      properties: {
        assessmentPersistence: { const: "PERSISTED_IMMUTABLE" },
        readinessStatusAuthority: { const: "DETERMINISTIC_ASSESSMENT" },
        currentStateDerivation: { const: "EXACT_DEPENDENCY_COMPARISON" },
        storedAssessmentChanged: { const: false },
        releaseApproval: { const: false },
        releasePassport: { const: false },
        deploymentAuthority: { const: false },
        aiAuthority: { const: "NONE" }
      }
    }
  }
} as const;

const citationSchema = {
  oneOf: [
    {
      type: "object", additionalProperties: false,
      required: ["kind", "referenceId", "referenceDigest"],
      properties: { kind: { const: "ASSESSMENT" }, referenceId: UUID_V4_SCHEMA, referenceDigest: DIGEST_SCHEMA }
    },
    {
      type: "object", additionalProperties: false,
      required: ["kind", "referenceId", "referenceRevision", "referenceDigest"],
      properties: {
        kind: { const: "RECONCILIATION" }, referenceId: DIGEST_SCHEMA,
        referenceRevision: { type: "integer", minimum: 1 }, referenceDigest: DIGEST_SCHEMA
      }
    },
    {
      type: "object", additionalProperties: false,
      required: ["kind", "referenceId"],
      properties: { kind: { enum: ["TARGET_SNAPSHOT", "CURRENT_SNAPSHOT"] }, referenceId: UUID_V4_SCHEMA }
    },
    {
      type: "object", additionalProperties: false,
      required: ["kind", "referenceId", "referenceDigest"],
      properties: { kind: { const: "VALIDATION_RESULT" }, referenceId: UUID_V4_SCHEMA, referenceDigest: DIGEST_SCHEMA }
    },
    {
      type: "object", additionalProperties: false,
      required: ["kind", "referenceId", "referenceDigest"],
      properties: { kind: { const: "READINESS_REVIEW" }, referenceId: UUID_V4_SCHEMA, referenceDigest: DIGEST_SCHEMA }
    }
  ]
} as const;

const passportSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "passportId", "assessmentId", "assessmentRevision", "recordedAtUtc",
    "statusAtProjection", "currentStatus", "staleReasons", "passportDigest", "stateDigest"
  ],
  properties: {
    passportId: UUID_V4_SCHEMA,
    assessmentId: UUID_V4_SCHEMA,
    assessmentRevision: { type: "integer", minimum: 1 },
    recordedAtUtc: TIMESTAMP_SCHEMA,
    statusAtProjection: STATUS_SCHEMA,
    currentStatus: STATUS_SCHEMA,
    staleReasons: staleReasonsSchema,
    passportDigest: DIGEST_SCHEMA,
    stateDigest: DIGEST_SCHEMA
  }
} as const;

const passportResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    ...passportSummarySchema.required,
    "version", "projectionVersion", "passportKey", "projectId", "missionId", "assessment",
    "snapshot", "rule", "evidenceDigest", "obligations", "blockers", "findings",
    "validations", "review", "citations", "authority"
  ],
  properties: {
    ...passportSummarySchema.properties,
    version: { const: "release-passport.v1" },
    projectionVersion: { const: "release-passport-projection.v1" },
    passportKey: DIGEST_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    assessment: {
      type: "object", additionalProperties: false,
      required: ["assessmentId", "revision", "assessmentDigest", "inputFingerprintDigest"],
      properties: {
        assessmentId: UUID_V4_SCHEMA,
        revision: { type: "integer", minimum: 1 },
        assessmentDigest: DIGEST_SCHEMA,
        inputFingerprintDigest: DIGEST_SCHEMA
      }
    },
    snapshot: {
      type: "object", additionalProperties: false,
      required: ["targetSnapshotId", "currentSnapshotId"],
      properties: { targetSnapshotId: UUID_V4_SCHEMA, currentSnapshotId: UUID_V4_SCHEMA }
    },
    rule: {
      type: "object", additionalProperties: false,
      required: ["policyVersion", "policyDigest"],
      properties: { policyVersion: { const: "readiness.v1" }, policyDigest: DIGEST_SCHEMA }
    },
    evidenceDigest: DIGEST_SCHEMA,
    obligations: { type: "array", minItems: 9, maxItems: 9, items: obligationSchema },
    blockers: { type: "array", maxItems: READINESS_BLOCKER_CODES.length, items: blockerSchema },
    findings: findingCountsSchema,
    validations: validationsSchema,
    review: reviewSchema,
    citations: { type: "array", minItems: 4, maxItems: 262, items: citationSchema },
    authority: {
      type: "object", additionalProperties: false,
      required: [
        "source", "projection", "historicalRecord", "stateAssociation", "passportChanged",
        "readinessRecomputed", "signed", "releaseApproval", "deploymentAuthority", "aiAuthority"
      ],
      properties: {
        source: { const: "ONE_PERSISTED_RELEASE_ASSESSMENT" },
        projection: { const: "REPRODUCED_NOT_RECOMPUTED" },
        historicalRecord: { const: "IMMUTABLE" },
        stateAssociation: { const: "ASSESSMENT_STATE_REFERENCE" },
        passportChanged: { const: false },
        readinessRecomputed: { const: false },
        signed: { const: false },
        releaseApproval: { const: false },
        deploymentAuthority: { const: false },
        aiAuthority: { const: "NONE" }
      }
    }
  }
} as const;

const assessmentResponseSchema = {
  type: "object", additionalProperties: false,
  required: ["apiVersion", "assessment"],
  properties: {
    apiVersion: { const: READINESS_PASSPORT_API_VERSION },
    created: { type: "boolean" },
    assessment: assessmentResourceSchema
  }
} as const;

const assessmentListResponseSchema = {
  type: "object", additionalProperties: false,
  required: ["apiVersion", "missionId", "assessments", "page"],
  properties: {
    apiVersion: { const: READINESS_PASSPORT_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    assessments: { type: "array", maxItems: MAXIMUM_PAGE_LIMIT, items: assessmentSummarySchema },
    page: pageSchema
  }
} as const;

const passportResponseSchema = {
  type: "object", additionalProperties: false,
  required: ["apiVersion", "passport"],
  properties: {
    apiVersion: { const: READINESS_PASSPORT_API_VERSION },
    created: { type: "boolean" },
    passport: passportResourceSchema
  }
} as const;

const passportListResponseSchema = {
  type: "object", additionalProperties: false,
  required: ["apiVersion", "missionId", "passports", "page"],
  properties: {
    apiVersion: { const: READINESS_PASSPORT_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    passports: { type: "array", maxItems: MAXIMUM_PAGE_LIMIT, items: passportSummarySchema },
    page: pageSchema
  }
} as const;

const exportResponseSchema = {
  type: "object", additionalProperties: false,
  required: ["apiVersion", "exportVersion", "contentClassification", "passport", "safety", "warnings"],
  properties: {
    apiVersion: { const: READINESS_PASSPORT_API_VERSION },
    exportVersion: { const: "release-passport-export.v1" },
    contentClassification: { const: "CONTROLLED_STRUCTURAL_METADATA" },
    passport: passportResourceSchema,
    safety: {
      type: "object", additionalProperties: false,
      required: [
        "containsSourceBodies", "containsAbsolutePaths", "containsCredentials",
        "signed", "releaseApproval", "deploymentAuthority"
      ],
      properties: {
        containsSourceBodies: { const: false },
        containsAbsolutePaths: { const: false },
        containsCredentials: { const: false },
        signed: { const: false },
        releaseApproval: { const: false },
        deploymentAuthority: { const: false }
      }
    },
    warnings: {
      type: "array", minItems: 3, maxItems: 3,
      prefixItems: [
        { const: "UNSIGNED_LOCAL_RECORD" },
        { const: "NOT_RELEASE_APPROVAL" },
        { const: "VERIFY_CURRENT_STATUS_BEFORE_USE" }
      ],
      items: false
    }
  }
} as const;

function positiveRevision(raw: string): number {
  const revision = Number(raw);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw Object.assign(new Error("Invalid revision."), { statusCode: 400 });
  }
  return revision;
}

function missionScope(projects: SqliteProjectRepository, raw: string) {
  const missionId = parseStableId<"MISSION">(raw);
  const mission = projects.getMission(missionId);
  return { projectId: mission.projectId, missionId };
}

async function assessmentResource(
  service: ReadinessApiService,
  projectId: ProjectId,
  missionId: MissionId,
  revision: number
) {
  const value = await service.state(projectId, missionId, revision);
  return toReadinessAssessmentResource(value.assessment, value.state);
}

async function passportResource(
  service: PassportApiService,
  projectId: ProjectId,
  missionId: MissionId,
  revision: number
) {
  const value = await service.state(projectId, missionId, revision);
  return toReleasePassportResource(value.passport, value.state);
}

export function registerReadinessPassportRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  readinessRepository: ReadinessApiRepository,
  readinessService: ReadinessApiService,
  passportRepository: PassportApiRepository,
  passportService: PassportApiService
): void {
  app.post<{ Params: MissionParams; Body: EmptyBody; Reply: ReadinessAssessmentResponse }>(
    "/api/v1/missions/:missionId/readiness/assessments",
    { schema: { params: missionParamsSchema, body: emptyBodySchema, response: { 200: assessmentResponseSchema, 201: assessmentResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request, reply) => {
      const scope = missionScope(projects, request.params.missionId);
      const persisted = await readinessService.assess(scope.projectId, scope.missionId);
      const resource = await assessmentResource(
        readinessService, scope.projectId, scope.missionId, persisted.assessment.revision
      );
      reply.code(persisted.created ? 201 : 200);
      return { apiVersion: READINESS_PASSPORT_API_VERSION, created: persisted.created, assessment: resource };
    }
  );

  app.get<{ Params: MissionParams; Querystring: RevisionPageQuery; Reply: ReadinessAssessmentListResponse }>(
    "/api/v1/missions/:missionId/readiness/assessments",
    { schema: { params: missionParamsSchema, querystring: pageQuerySchema, response: { 200: assessmentListResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await readinessRepository.listAssessments(
        scope.projectId, scope.missionId, limit, request.query.cursor
      );
      const assessments = await Promise.all(page.items.map(async (item: ReadinessAssessment) => {
        const resource = await assessmentResource(
          readinessService, scope.projectId, scope.missionId, item.revision
        );
        if (resource.assessmentId !== item.assessmentId || resource.assessmentDigest !== item.assessmentDigest) {
          throw new TypeError("Readiness history changed during retrieval.");
        }
        return toReadinessAssessmentSummaryResource(resource);
      }));
      return {
        apiVersion: READINESS_PASSPORT_API_VERSION,
        missionId: scope.missionId,
        assessments,
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{ Params: RevisionParams; Reply: ReadinessAssessmentResponse }>(
    "/api/v1/missions/:missionId/readiness/assessments/:revision",
    { schema: { params: revisionParamsSchema, response: { 200: assessmentResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      return {
        apiVersion: READINESS_PASSPORT_API_VERSION,
        assessment: await assessmentResource(
          readinessService, scope.projectId, scope.missionId, positiveRevision(request.params.revision)
        )
      };
    }
  );

  app.post<{ Params: RevisionParams; Body: EmptyBody; Reply: ReleasePassportResponse }>(
    "/api/v1/missions/:missionId/readiness/assessments/:revision/passport",
    { schema: { params: revisionParamsSchema, body: emptyBodySchema, response: { 200: passportResponseSchema, 201: passportResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request, reply) => {
      const scope = missionScope(projects, request.params.missionId);
      const persisted = await passportService.project(
        scope.projectId, scope.missionId, positiveRevision(request.params.revision)
      );
      const resource = await passportResource(
        passportService, scope.projectId, scope.missionId, persisted.passport.assessment.revision
      );
      reply.code(persisted.created ? 201 : 200);
      return { apiVersion: READINESS_PASSPORT_API_VERSION, created: persisted.created, passport: resource };
    }
  );

  app.get<{ Params: MissionParams; Querystring: RevisionPageQuery; Reply: ReleasePassportListResponse }>(
    "/api/v1/missions/:missionId/readiness/passports",
    { schema: { params: missionParamsSchema, querystring: pageQuerySchema, response: { 200: passportListResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await passportRepository.list(
        scope.projectId, scope.missionId, limit, request.query.cursor
      );
      const passports = await Promise.all(page.items.map(async (item: ReleasePassport) => {
        const resource = await passportResource(
          passportService, scope.projectId, scope.missionId, item.assessment.revision
        );
        if (resource.passportId !== item.passportId || resource.passportDigest !== item.passportDigest) {
          throw new TypeError("Passport history changed during retrieval.");
        }
        return toReleasePassportSummaryResource(resource);
      }));
      return {
        apiVersion: READINESS_PASSPORT_API_VERSION,
        missionId: scope.missionId,
        passports,
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{ Params: RevisionParams; Reply: ReleasePassportResponse }>(
    "/api/v1/missions/:missionId/readiness/passports/:revision",
    { schema: { params: revisionParamsSchema, response: { 200: passportResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      return {
        apiVersion: READINESS_PASSPORT_API_VERSION,
        passport: await passportResource(
          passportService, scope.projectId, scope.missionId, positiveRevision(request.params.revision)
        )
      };
    }
  );

  app.get<{ Params: RevisionParams; Reply: ReleasePassportExportResponse }>(
    "/api/v1/missions/:missionId/readiness/passports/:revision/export",
    { schema: { params: revisionParamsSchema, response: { 200: exportResponseSchema, 400: API_ERROR_RESPONSE_SCHEMA, 404: API_ERROR_RESPONSE_SCHEMA, 409: API_ERROR_RESPONSE_SCHEMA, 500: API_ERROR_RESPONSE_SCHEMA } } },
    async (request, reply) => {
      const scope = missionScope(projects, request.params.missionId);
      const revision = positiveRevision(request.params.revision);
      const resource = await passportResource(passportService, scope.projectId, scope.missionId, revision);
      reply.header(
        "Content-Disposition",
        `attachment; filename="intelliloop-release-passport-r${revision}.json"`
      );
      return createReleasePassportExportResponse(resource);
    }
  );
}
