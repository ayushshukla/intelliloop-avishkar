import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  EVIDENCE_API_VERSION,
  MAXIMUM_PAGE_LIMIT,
  createRuntimeObservationResponse,
  toEvidenceSourceResource,
  toRuntimeObservationResource,
  type CommitRuntimeObservationRequest,
  type RuntimeObservationGetResponse,
  type RuntimeObservationListResponse,
  type RuntimeObservationResponse
} from "@intelliloop/contracts";
import {
  EPISTEMIC_LABELS,
  MAXIMUM_RUNTIME_OBSERVATION_MEASUREMENTS,
  MAXIMUM_RUNTIME_OBSERVATION_SAMPLE_COUNT,
  RUNTIME_OBSERVATION_ENVIRONMENTS,
  RUNTIME_OBSERVATION_FRESHNESS,
  RUNTIME_OBSERVATION_SCHEMA_VERSION,
  RUNTIME_OBSERVATION_SOURCE_ORIGINS,
  RUNTIME_OBSERVATION_UNITS,
  parseStableId,
  prepareRuntimeObservationImport
} from "@intelliloop/domain";

import {
  API_ERROR_RESPONSE_SCHEMA,
  UUID_V4_SCHEMA
} from "../http-schemas.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { SqliteEvidenceRepository } from "./evidence-repository.js";

interface MissionParams {
  readonly missionId: string;
}

interface RuntimeObservationParams extends MissionParams {
  readonly runtimeObservationId: string;
}

interface IdentityPageQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

const BODY_LIMIT_BYTES = 2_000_000;
const timestampSchema = { type: "string", format: "date-time" } as const;
const digestSchema = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$"
} as const;
const tokenSchema = {
  type: "string",
  minLength: 1,
  maxLength: 128,
  pattern: "^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*$"
} as const;

const errorResponses = {
  400: API_ERROR_RESPONSE_SCHEMA,
  404: API_ERROR_RESPONSE_SCHEMA,
  409: API_ERROR_RESPONSE_SCHEMA,
  413: API_ERROR_RESPONSE_SCHEMA,
  500: API_ERROR_RESPONSE_SCHEMA
} as const;

const missionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId"],
  properties: { missionId: UUID_V4_SCHEMA }
} as const;

const runtimeObservationParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId", "runtimeObservationId"],
  properties: {
    missionId: UUID_V4_SCHEMA,
    runtimeObservationId: UUID_V4_SCHEMA
  }
} as const;

const identityPageQuerySchema = {
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

const identityPageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "nextCursor"],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
    nextCursor: { anyOf: [UUID_V4_SCHEMA, { type: "null" }] }
  }
} as const;

const measurementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "unit", "value"],
  properties: {
    name: tokenSchema,
    unit: { enum: RUNTIME_OBSERVATION_UNITS },
    value: { type: "number" }
  }
} as const;

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "subject",
    "environment",
    "observationKind",
    "observedFromUtc",
    "observedUntilUtc",
    "sampleCount",
    "measurements"
  ],
  properties: {
    schemaVersion: { enum: [RUNTIME_OBSERVATION_SCHEMA_VERSION] },
    subject: tokenSchema,
    environment: { enum: RUNTIME_OBSERVATION_ENVIRONMENTS },
    observationKind: tokenSchema,
    observedFromUtc: timestampSchema,
    observedUntilUtc: timestampSchema,
    sampleCount: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_RUNTIME_OBSERVATION_SAMPLE_COUNT
    },
    measurements: {
      type: "array",
      minItems: 1,
      maxItems: MAXIMUM_RUNTIME_OBSERVATION_MEASUREMENTS,
      items: measurementSchema
    }
  }
} as const;

const commitBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "origin",
    "sourceLocator",
    "epistemicLabel",
    "summary"
  ],
  properties: {
    origin: { enum: RUNTIME_OBSERVATION_SOURCE_ORIGINS },
    sourceLocator: { type: "string", minLength: 4, maxLength: 512 },
    sourceRevision: { type: "string", minLength: 1, maxLength: 256 },
    epistemicLabel: { enum: EPISTEMIC_LABELS },
    summary: summarySchema
  }
} as const;

const redactionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["applied", "totalReplacements", "ruleCounts"],
  properties: {
    applied: { type: "boolean" },
    totalReplacements: { type: "integer", minimum: 0 },
    ruleCounts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rule", "replacements"],
        properties: {
          rule: { type: "string" },
          replacements: { type: "integer", minimum: 1 }
        }
      }
    }
  }
} as const;

const preparedEvidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "normalizationVersion",
    "format",
    "inputByteCount",
    "normalizedByteCount",
    "normalizedContent",
    "contentDigest",
    "redaction"
  ],
  properties: {
    normalizationVersion: { type: "string" },
    format: { enum: ["JSON"] },
    inputByteCount: { type: "integer", minimum: 1 },
    normalizedByteCount: { type: "integer", minimum: 1 },
    normalizedContent: { type: "string" },
    contentDigest: digestSchema,
    redaction: redactionSchema
  }
} as const;

const evidenceSourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "evidenceSourceId",
    "projectId",
    "missionId",
    "importKey",
    "origin",
    "sourceLocator",
    "recordedAtUtc",
    "effectiveAtUtc",
    "extractionMethod",
    "epistemicLabel",
    "prepared"
  ],
  properties: {
    evidenceSourceId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    importKey: digestSchema,
    origin: { enum: RUNTIME_OBSERVATION_SOURCE_ORIGINS },
    sourceLocator: { type: "string" },
    sourceRevision: { type: "string" },
    recordedAtUtc: timestampSchema,
    effectiveAtUtc: timestampSchema,
    extractionMethod: { enum: ["DIRECT_IMPORT"] },
    epistemicLabel: { enum: EPISTEMIC_LABELS },
    prepared: preparedEvidenceSchema
  }
} as const;

const timelineEventSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "timelineEventId",
    "projectId",
    "missionId",
    "sequence",
    "eventType",
    "evidenceSourceId",
    "occurredAtUtc"
  ],
  properties: {
    timelineEventId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    sequence: { type: "integer", minimum: 1 },
    eventType: { enum: ["EVIDENCE_IMPORTED"] },
    evidenceSourceId: UUID_V4_SCHEMA,
    occurredAtUtc: timestampSchema
  }
} as const;

const runtimeObservationResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "runtimeObservationId",
    "projectId",
    "missionId",
    "evidenceSourceId",
    "seriesKey",
    "summaryDigest",
    "recordedAtUtc",
    "freshness",
    "authority",
    "liveFeed",
    "summary"
  ],
  properties: {
    runtimeObservationId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    evidenceSourceId: UUID_V4_SCHEMA,
    seriesKey: digestSchema,
    summaryDigest: digestSchema,
    recordedAtUtc: timestampSchema,
    freshness: { enum: RUNTIME_OBSERVATION_FRESHNESS },
    newerObservationId: UUID_V4_SCHEMA,
    authority: { enum: ["HISTORICAL_EVIDENCE_ONLY"] },
    liveFeed: { enum: [false] },
    summary: summarySchema
  }
} as const;

const runtimeObservationResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "apiVersion",
    "created",
    "runtimeObservation",
    "evidenceSource",
    "timelineEvent"
  ],
  properties: {
    apiVersion: { enum: [EVIDENCE_API_VERSION] },
    created: { type: "boolean" },
    runtimeObservation: runtimeObservationResourceSchema,
    evidenceSource: evidenceSourceSchema,
    timelineEvent: timelineEventSchema
  }
} as const;

const runtimeObservationGetResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "runtimeObservation", "evidenceSource"],
  properties: {
    apiVersion: { enum: [EVIDENCE_API_VERSION] },
    runtimeObservation: runtimeObservationResourceSchema,
    evidenceSource: evidenceSourceSchema
  }
} as const;

const runtimeObservationListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "runtimeObservations", "page"],
  properties: {
    apiVersion: { enum: [EVIDENCE_API_VERSION] },
    missionId: UUID_V4_SCHEMA,
    runtimeObservations: {
      type: "array",
      items: runtimeObservationResourceSchema
    },
    page: identityPageSchema
  }
} as const;

export function registerRuntimeObservationRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  evidence: SqliteEvidenceRepository
): void {
  app.post<{
    Params: MissionParams;
    Body: CommitRuntimeObservationRequest;
    Reply: RuntimeObservationResponse;
  }>(
    "/api/v1/missions/:missionId/evidence/runtime-observations",
    {
      bodyLimit: BODY_LIMIT_BYTES,
      schema: {
        params: missionParamsSchema,
        body: commitBodySchema,
        response: {
          200: runtimeObservationResponseSchema,
          201: runtimeObservationResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request, reply) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const prepared = await prepareRuntimeObservationImport(
        request.body.summary
      );
      const result = await evidence.persistRuntimeObservation({
        projectId: mission.projectId,
        missionId: mission.missionId,
        origin: request.body.origin,
        sourceLocator: request.body.sourceLocator,
        ...(request.body.sourceRevision === undefined
          ? {}
          : { sourceRevision: request.body.sourceRevision }),
        epistemicLabel: request.body.epistemicLabel,
        prepared
      });
      reply.code(result.created ? 201 : 200);
      return createRuntimeObservationResponse(result);
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: IdentityPageQuery;
    Reply: RuntimeObservationListResponse;
  }>(
    "/api/v1/missions/:missionId/evidence/runtime-observations",
    {
      schema: {
        params: missionParamsSchema,
        querystring: identityPageQuerySchema,
        response: {
          200: runtimeObservationListResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"RUNTIME_OBSERVATION">(request.query.cursor);
      const page = await evidence.listRuntimeObservations(
        mission.projectId,
        mission.missionId,
        limit,
        cursor
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        missionId: mission.missionId,
        runtimeObservations: page.items.map(toRuntimeObservationResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RuntimeObservationParams;
    Reply: RuntimeObservationGetResponse;
  }>(
    "/api/v1/missions/:missionId/evidence/runtime-observations/:runtimeObservationId",
    {
      schema: {
        params: runtimeObservationParamsSchema,
        response: {
          200: runtimeObservationGetResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const view = await evidence.getRuntimeObservation(
        mission.projectId,
        mission.missionId,
        parseStableId<"RUNTIME_OBSERVATION">(
          request.params.runtimeObservationId
        )
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        runtimeObservation: toRuntimeObservationResource(view),
        evidenceSource: toEvidenceSourceResource(view.source)
      };
    }
  );
}
