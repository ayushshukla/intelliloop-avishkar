import type { FastifyInstance } from "fastify";

import {
  CODE_MAP_API_VERSION,
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  toCodeMapAssetResource,
  toCodeMapEdgeResource,
  toCodeMapRevisionSummaryResource,
  type CodeMapAssetListResponse,
  type CodeMapEdgeListResponse,
  type CodeMapRevisionListResponse,
  type CodeMapRevisionResponse,
  type CodeMapRunResponse,
  type RunCodeMapRequest
} from "@intelliloop/contracts";
import { parseStableId, type MissionId } from "@intelliloop/domain";

import { API_ERROR_RESPONSE_SCHEMA, UUID_V4_SCHEMA } from "../http-schemas.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { CodeMapProjectionService } from "./code-map-projection-service.js";
import type { SqliteCodeMapRepository } from "./code-map-repository.js";

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

interface MemberPageQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

const DIGEST_SCHEMA = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$"
} as const;

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

const revisionPageQuerySchema = {
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

const memberPageQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_PAGE_LIMIT,
      default: DEFAULT_PAGE_LIMIT
    },
    cursor: UUID_V4_SCHEMA
  }
} as const;

const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "evidenceKind",
    "inferenceStatus",
    "completeness",
    "sourceDigest"
  ],
  properties: {
    evidenceKind: {
      enum: ["STATIC_INFERENCE", "DECLARED_INTELLILOOP_FIXTURE"]
    },
    inferenceStatus: { enum: ["AVAILABLE", "UNAVAILABLE_SAFE_FAILURE"] },
    completeness: { enum: ["COMPLETE", "PARTIAL", "UNAVAILABLE"] },
    sourceDigest: DIGEST_SCHEMA,
    declaredManifestId: { type: "string", minLength: 1, maxLength: 128 },
    fallbackReason: {
      enum: [
        "SCAN_LIMIT_OR_SAFE_FAILURE",
        "EXTRACTION_LIMIT_OR_SAFE_FAILURE"
      ]
    }
  }
} as const;

const revisionSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "projectionId",
    "projectId",
    "missionId",
    "registrationId",
    "revision",
    "inputDigest",
    "projectionDigest",
    "recordedAtUtc",
    "snapshot",
    "evidence",
    "assetCount",
    "edgeCount"
  ],
  properties: {
    projectionId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    registrationId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    inputDigest: DIGEST_SCHEMA,
    projectionDigest: DIGEST_SCHEMA,
    recordedAtUtc: { type: "string", format: "date-time" },
    snapshot: {
      type: "object",
      additionalProperties: false,
      required: ["snapshotId", "capturedAtUtc", "snapshotDigest"],
      properties: {
        snapshotId: UUID_V4_SCHEMA,
        capturedAtUtc: { type: "string", format: "date-time" },
        snapshotDigest: DIGEST_SCHEMA
      }
    },
    evidence: evidenceSchema,
    predecessor: {
      type: "object",
      additionalProperties: false,
      required: ["revision", "projectionDigest"],
      properties: {
        revision: { type: "integer", minimum: 1 },
        projectionDigest: DIGEST_SCHEMA
      }
    },
    assetCount: { type: "integer", minimum: 0, maximum: 10000 },
    edgeCount: { type: "integer", minimum: 0, maximum: 50000 }
  }
} as const;

const runResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "created", "codeMapRevision"],
  properties: {
    apiVersion: { const: CODE_MAP_API_VERSION },
    created: { type: "boolean" },
    codeMapRevision: revisionSummarySchema
  }
} as const;

const revisionResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "codeMapRevision"],
  properties: {
    apiVersion: { const: CODE_MAP_API_VERSION },
    codeMapRevision: revisionSummarySchema
  }
} as const;

const revisionListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "revisions", "page"],
  properties: {
    apiVersion: { const: CODE_MAP_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    revisions: { type: "array", items: revisionSummarySchema },
    page: {
      type: "object",
      additionalProperties: false,
      required: ["limit", "nextCursor"],
      properties: {
        limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
        nextCursor: {
          anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }]
        }
      }
    }
  }
} as const;

const assetSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "assetId",
    "kind",
    "label",
    "sourceDigest",
    "evidenceKind",
    "assetDigest"
  ],
  properties: {
    assetId: UUID_V4_SCHEMA,
    kind: { enum: ["FILE", "PACKAGE", "CONTRACT", "ROUTE"] },
    label: { type: "string", minLength: 1, maxLength: 256 },
    sourcePath: { type: "string", minLength: 1, maxLength: 1024 },
    sourceDigest: DIGEST_SCHEMA,
    evidenceKind: {
      enum: ["STATIC_INFERENCE", "DECLARED_INTELLILOOP_FIXTURE"]
    },
    assetDigest: DIGEST_SCHEMA
  }
} as const;

const edgeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "edgeId",
    "kind",
    "fromAssetId",
    "toAssetId",
    "evidenceKind",
    "edgeDigest"
  ],
  properties: {
    edgeId: UUID_V4_SCHEMA,
    kind: {
      enum: [
        "IMPORTS",
        "REEXPORTS",
        "DECLARES_PACKAGE",
        "DECLARES_CONTRACT",
        "DECLARES_ROUTE",
        "TEST_IMPORTS"
      ]
    },
    fromAssetId: UUID_V4_SCHEMA,
    toAssetId: UUID_V4_SCHEMA,
    evidenceKind: {
      enum: ["STATIC_INFERENCE", "DECLARED_INTELLILOOP_FIXTURE"]
    },
    edgeDigest: DIGEST_SCHEMA
  }
} as const;

function memberListSchema(memberName: "assets" | "edges") {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "apiVersion",
      "missionId",
      "projectionRevision",
      memberName,
      "page"
    ],
    properties: {
      apiVersion: { const: CODE_MAP_API_VERSION },
      missionId: UUID_V4_SCHEMA,
      projectionRevision: { type: "integer", minimum: 1 },
      [memberName]: {
        type: "array",
        items: memberName === "assets" ? assetSchema : edgeSchema
      },
      page: {
        type: "object",
        additionalProperties: false,
        required: ["limit", "nextCursor"],
        properties: {
          limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
          nextCursor: { anyOf: [UUID_V4_SCHEMA, { type: "null" }] }
        }
      }
    }
  } as const;
}

const errorResponses = {
  400: API_ERROR_RESPONSE_SCHEMA,
  404: API_ERROR_RESPONSE_SCHEMA,
  409: API_ERROR_RESPONSE_SCHEMA,
  500: API_ERROR_RESPONSE_SCHEMA
} as const;

function missionScope(
  projects: SqliteProjectRepository,
  missionValue: string
): { readonly projectId: ReturnType<typeof parseStableId<"PROJECT">>; readonly missionId: MissionId } {
  const missionId = parseStableId<"MISSION">(missionValue);
  const mission = projects.getMission(missionId);
  return { projectId: mission.projectId, missionId };
}

function revisionValue(value: string): number {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    const error = new Error("Invalid code-map revision.") as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }
  return revision;
}

function fallbackConsent(body: unknown): boolean {
  if (body === undefined || body === null) return false;
  if (
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.getPrototypeOf(body) !== Object.prototype
  ) {
    const error = new Error("Invalid code-map run request.") as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }
  const record = body as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  if (
    keys.some((key) => key !== "fallbackMode") ||
    (record.fallbackMode !== undefined &&
      record.fallbackMode !== "DISABLED" &&
      record.fallbackMode !== "INTELLILOOP_CONTROLLED_FIXTURE")
  ) {
    const error = new Error("Invalid code-map run request.") as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }
  return record.fallbackMode === "INTELLILOOP_CONTROLLED_FIXTURE";
}

export function registerCodeMapRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  codeMaps: SqliteCodeMapRepository,
  runner: CodeMapProjectionService
): void {
  app.post<{
    Params: MissionParams;
    Body?: RunCodeMapRequest;
    Reply: CodeMapRunResponse;
  }>(
    "/api/v1/missions/:missionId/code-map/revisions",
    {
      schema: {
        params: missionParamsSchema,
        response: { 200: runResponseSchema, 201: runResponseSchema, ...errorResponses }
      }
    },
    async (request, reply) => {
      const result = await runner.run(
        parseStableId<"MISSION">(request.params.missionId),
        {
          allowDeclaredIntelliLoopFixtureFallback:
            fallbackConsent(request.body)
        }
      );
      reply.code(result.created ? 201 : 200);
      return {
        apiVersion: CODE_MAP_API_VERSION,
        created: result.created,
        codeMapRevision: toCodeMapRevisionSummaryResource(result.projection)
      };
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: RevisionPageQuery;
    Reply: CodeMapRevisionListResponse;
  }>(
    "/api/v1/missions/:missionId/code-map/revisions",
    {
      schema: {
        params: missionParamsSchema,
        querystring: revisionPageQuerySchema,
        response: { 200: revisionListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await codeMaps.list(
        scope.projectId,
        scope.missionId,
        limit,
        request.query.cursor
      );
      return {
        apiVersion: CODE_MAP_API_VERSION,
        missionId: scope.missionId,
        revisions: page.items.map(toCodeMapRevisionSummaryResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Reply: CodeMapRevisionResponse;
  }>(
    "/api/v1/missions/:missionId/code-map/revisions/:revision",
    {
      schema: {
        params: revisionParamsSchema,
        response: { 200: revisionResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const projection = await codeMaps.get(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision)
      );
      return {
        apiVersion: CODE_MAP_API_VERSION,
        codeMapRevision: toCodeMapRevisionSummaryResource(projection)
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Querystring: MemberPageQuery;
    Reply: CodeMapAssetListResponse;
  }>(
    "/api/v1/missions/:missionId/code-map/revisions/:revision/assets",
    {
      schema: {
        params: revisionParamsSchema,
        querystring: memberPageQuerySchema,
        response: { 200: memberListSchema("assets"), ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await codeMaps.listAssets(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision),
        limit,
        request.query.cursor
      );
      return {
        apiVersion: CODE_MAP_API_VERSION,
        missionId: scope.missionId,
        projectionRevision: page.projection.revision,
        assets: page.items.map(toCodeMapAssetResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Querystring: MemberPageQuery;
    Reply: CodeMapEdgeListResponse;
  }>(
    "/api/v1/missions/:missionId/code-map/revisions/:revision/edges",
    {
      schema: {
        params: revisionParamsSchema,
        querystring: memberPageQuerySchema,
        response: { 200: memberListSchema("edges"), ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await codeMaps.listEdges(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision),
        limit,
        request.query.cursor
      );
      return {
        apiVersion: CODE_MAP_API_VERSION,
        missionId: scope.missionId,
        projectionRevision: page.projection.revision,
        edges: page.items.map(toCodeMapEdgeResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );
}
