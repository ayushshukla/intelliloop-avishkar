import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  TWIN_API_VERSION,
  toTwinNodeResource,
  toTwinRelationshipResource,
  toTwinRevisionSummaryResource,
  type TwinMaterializeResponse,
  type TwinNodeListResponse,
  type TwinRelationshipListResponse,
  type TwinRevisionListResponse,
  type TwinRevisionResponse
} from "@intelliloop/contracts";
import { parseStableId, type MissionId } from "@intelliloop/domain";

import { UUID_V4_SCHEMA } from "../http-schemas.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import {
  type SqliteTwinRepository,
  type TwinMaterializationService
} from "./twin-repository.js";

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

const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: {
    error: {
      type: "object",
      additionalProperties: false,
      required: ["version", "code", "message", "requestId"],
      properties: {
        version: { const: "v1" },
        code: {
          enum: [
            "NOT_FOUND",
            "INVALID_REQUEST",
            "CONFLICT",
            "INTEGRITY_ERROR",
            "INTERNAL_ERROR"
          ]
        },
        message: { type: "string" },
        requestId: { type: "string", minLength: 1 }
      }
    }
  }
} as const;

const errorResponses = {
  400: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  500: errorResponseSchema
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

const sourceVersionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "value"],
  properties: {
    kind: { enum: ["SOURCE_REVISION", "CONTENT_DIGEST"] },
    value: { type: "string", minLength: 1, maxLength: 256 }
  }
} as const;

const attributionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "origin",
    "pathCitation",
    "sourceVersion",
    "recordedAtUtc",
    "extractionMethod",
    "epistemicLabel"
  ],
  properties: {
    origin: {
      enum: [
        "USER_INPUT",
        "REPOSITORY_OBSERVATION",
        "VALIDATION_RESULT",
        "SYSTEM_DERIVATION",
        "SYNTHETIC_FIXTURE",
        "AI_ADVISORY"
      ]
    },
    pathCitation: { type: "string", minLength: 1, maxLength: 512 },
    sourceVersion: sourceVersionSchema,
    recordedAtUtc: { type: "string", format: "date-time" },
    effectiveAtUtc: { type: "string", format: "date-time" },
    extractionMethod: { type: "string", minLength: 1, maxLength: 128 },
    epistemicLabel: { enum: ["FACT", "INFERENCE"] }
  }
} as const;

const revisionSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "projectionId",
    "projectId",
    "missionId",
    "revision",
    "inputDigest",
    "projectionDigest",
    "recordedAtUtc",
    "nodeCount",
    "relationshipCount",
    "invalidationCount"
  ],
  properties: {
    projectionId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    inputDigest: DIGEST_SCHEMA,
    projectionDigest: DIGEST_SCHEMA,
    recordedAtUtc: { type: "string", format: "date-time" },
    codeMapBinding: {
      type: "object",
      additionalProperties: false,
      required: ["projectionId", "revision", "projectionDigest"],
      properties: {
        projectionId: UUID_V4_SCHEMA,
        revision: { type: "integer", minimum: 1 },
        projectionDigest: DIGEST_SCHEMA
      }
    },
    predecessor: {
      type: "object",
      additionalProperties: false,
      required: ["revision", "projectionDigest"],
      properties: {
        revision: { type: "integer", minimum: 1 },
        projectionDigest: DIGEST_SCHEMA
      }
    },
    nodeCount: { type: "integer", minimum: 1, maximum: 10000 },
    relationshipCount: { type: "integer", minimum: 1, maximum: 50000 },
    invalidationCount: { type: "integer", minimum: 0, maximum: 100000 }
  }
} as const;

const revisionResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "twinRevision"],
  properties: {
    apiVersion: { const: TWIN_API_VERSION },
    twinRevision: revisionSummarySchema
  }
} as const;

const materializeResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "created", "twinRevision"],
  properties: {
    apiVersion: { const: TWIN_API_VERSION },
    created: { type: "boolean" },
    twinRevision: revisionSummarySchema
  }
} as const;

const revisionListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "revisions", "page"],
  properties: {
    apiVersion: { const: TWIN_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    revisions: { type: "array", items: revisionSummarySchema },
    page: {
      type: "object",
      additionalProperties: false,
      required: ["limit", "nextCursor"],
      properties: {
        limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
        nextCursor: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] }
      }
    }
  }
} as const;

const nodeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "nodeId",
    "nodeRevision",
    "memberDigest",
    "nodeType",
    "attribution",
    "source"
  ],
  properties: {
    nodeId: UUID_V4_SCHEMA,
    nodeRevision: { type: "integer", minimum: 1 },
    memberDigest: DIGEST_SCHEMA,
    nodeType: {
      enum: [
        "Project",
        "ChangeMission",
        "EvidenceSource",
        "Claim",
        "SoftwareAsset",
        "GitSnapshot",
        "ValidationResult",
        "ReconciliationFinding",
        "ReleaseAssessment",
        "ReleasePassport"
      ]
    },
    attribution: attributionSchema,
    source: {
      type: "object",
      additionalProperties: false,
      required: ["sourceType", "sourceId", "sourceDigest"],
      properties: {
        sourceType: {
          enum: [
            "Project",
            "ChangeMission",
            "EvidenceSource",
            "Claim",
            "SoftwareAsset",
            "GitSnapshot",
            "ValidationResult"
          ]
        },
        sourceId: UUID_V4_SCHEMA,
        sourceDigest: DIGEST_SCHEMA
      }
    }
  }
} as const;

const relationshipSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "relationshipId",
    "relationshipRevision",
    "memberDigest",
    "relationshipType",
    "from",
    "to",
    "attribution"
  ],
  properties: {
    relationshipId: UUID_V4_SCHEMA,
    relationshipRevision: { type: "integer", minimum: 1 },
    memberDigest: DIGEST_SCHEMA,
    relationshipType: {
      enum: [
        "SCOPED_TO",
        "EXTRACTED_FROM",
        "ASSERTS",
        "CONCERNS",
        "IMPLEMENTS",
        "AFFECTS",
        "DEPENDS_ON",
        "VALIDATED_BY",
        "CONTRADICTS",
        "SUPERSEDES",
        "DERIVED_FROM",
        "BOUND_TO",
        "BLOCKS"
      ]
    },
    from: {
      type: "object",
      additionalProperties: false,
      required: ["nodeId", "nodeRevision"],
      properties: {
        nodeId: UUID_V4_SCHEMA,
        nodeRevision: { type: "integer", minimum: 1 }
      }
    },
    to: {
      type: "object",
      additionalProperties: false,
      required: ["nodeId", "nodeRevision"],
      properties: {
        nodeId: UUID_V4_SCHEMA,
        nodeRevision: { type: "integer", minimum: 1 }
      }
    },
    attribution: attributionSchema
  }
} as const;

function memberListResponseSchema(memberName: "nodes" | "relationships") {
  return {
    type: "object",
    additionalProperties: false,
    required: ["apiVersion", "missionId", "projectionRevision", memberName, "page"],
    properties: {
      apiVersion: { const: TWIN_API_VERSION },
      missionId: UUID_V4_SCHEMA,
      projectionRevision: { type: "integer", minimum: 1 },
      [memberName]: {
        type: "array",
        items: memberName === "nodes" ? nodeSchema : relationshipSchema
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
    const error = new Error("Invalid Twin revision.") as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }
  return revision;
}

function rejectRequestBody(body: unknown): void {
  if (body === undefined || body === null) return;
  const error = new Error("Request body is not supported.") as Error & {
    statusCode: number;
  };
  error.statusCode = 400;
  throw error;
}

export function registerTwinRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  twins: SqliteTwinRepository,
  materializer: TwinMaterializationService
): void {
  app.post<{
    Params: MissionParams;
    Body?: unknown;
    Reply: TwinMaterializeResponse;
  }>(
    "/api/v1/missions/:missionId/twin/revisions",
    {
      schema: {
        params: missionParamsSchema,
        response: {
          200: materializeResponseSchema,
          201: materializeResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request, reply) => {
      rejectRequestBody(request.body);
      const result = await materializer.materialize(
        parseStableId<"MISSION">(request.params.missionId)
      );
      reply.code(result.created ? 201 : 200);
      return {
        apiVersion: TWIN_API_VERSION,
        created: result.created,
        twinRevision: toTwinRevisionSummaryResource(result.projection)
      };
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: RevisionPageQuery;
    Reply: TwinRevisionListResponse;
  }>(
    "/api/v1/missions/:missionId/twin/revisions",
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
      const page = await twins.list(
        scope.projectId,
        scope.missionId,
        limit,
        request.query.cursor
      );
      return {
        apiVersion: TWIN_API_VERSION,
        missionId: scope.missionId,
        revisions: page.items.map(toTwinRevisionSummaryResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Reply: TwinRevisionResponse;
  }>(
    "/api/v1/missions/:missionId/twin/revisions/:revision",
    {
      schema: {
        params: revisionParamsSchema,
        response: { 200: revisionResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const projection = await twins.get(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision)
      );
      return {
        apiVersion: TWIN_API_VERSION,
        twinRevision: toTwinRevisionSummaryResource(projection)
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Querystring: MemberPageQuery;
    Reply: TwinNodeListResponse;
  }>(
    "/api/v1/missions/:missionId/twin/revisions/:revision/nodes",
    {
      schema: {
        params: revisionParamsSchema,
        querystring: memberPageQuerySchema,
        response: {
          200: memberListResponseSchema("nodes"),
          ...errorResponses
        }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await twins.listNodes(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision),
        limit,
        request.query.cursor
      );
      return {
        apiVersion: TWIN_API_VERSION,
        missionId: scope.missionId,
        projectionRevision: page.projection.revision,
        nodes: await Promise.all(
          page.items.map((node) => toTwinNodeResource(page.projection, node))
        ),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Querystring: MemberPageQuery;
    Reply: TwinRelationshipListResponse;
  }>(
    "/api/v1/missions/:missionId/twin/revisions/:revision/relationships",
    {
      schema: {
        params: revisionParamsSchema,
        querystring: memberPageQuerySchema,
        response: {
          200: memberListResponseSchema("relationships"),
          ...errorResponses
        }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await twins.listRelationships(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision),
        limit,
        request.query.cursor
      );
      return {
        apiVersion: TWIN_API_VERSION,
        missionId: scope.missionId,
        projectionRevision: page.projection.revision,
        relationships: await Promise.all(
          page.items.map((relationship) =>
            toTwinRelationshipResource(page.projection, relationship)
          )
        ),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );
}
