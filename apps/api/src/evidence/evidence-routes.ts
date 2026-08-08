import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  EVIDENCE_API_VERSION,
  MAXIMUM_PAGE_LIMIT,
  createClaimResponse,
  createEvidencePreviewResponse,
  createEvidenceSourceResponse,
  toClaimResource,
  toClaimSupersessionResource,
  toEvidenceSourceResource,
  toEvidenceTimelineEventResource,
  type ClaimGetResponse,
  type ClaimListResponse,
  type ClaimResponse,
  type ClaimSupersessionListResponse,
  type CommitEvidenceRequest,
  type CreateClaimRequest,
  type CreateClaimSuccessorRequest,
  type EvidencePreviewRequest,
  type EvidencePreviewResponse,
  type EvidenceSourceGetResponse,
  type EvidenceSourceListResponse,
  type EvidenceSourceResponse,
  type EvidenceTimelineResponse
} from "@intelliloop/contracts";
import {
  EPISTEMIC_LABELS,
  EVIDENCE_IMPORT_FORMATS,
  MAXIMUM_CLAIM_APPLICABILITY_DIMENSIONS,
  MAXIMUM_CLAIM_RAW_TEXT_BYTES,
  MAXIMUM_CLAIM_TERM_BYTES,
  MAXIMUM_EVIDENCE_INPUT_BYTES,
  ORIGIN_KINDS,
  REDACTION_RULE_IDS,
  EvidenceImportError,
  parseStableId,
  prepareEvidenceImport,
  type ClaimId,
  type EvidenceSourceId
} from "@intelliloop/domain";

import {
  API_ERROR_RESPONSE_SCHEMA,
  UUID_V4_SCHEMA
} from "../http-schemas.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { SqliteClaimRepository } from "./claim-repository.js";
import type { SqliteEvidenceRepository } from "./evidence-repository.js";

interface MissionParams {
  readonly missionId: string;
}

interface EvidenceSourceParams extends MissionParams {
  readonly evidenceSourceId: string;
}

interface ClaimParams extends MissionParams {
  readonly claimId: string;
}

interface IdentityPageQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

interface TimelinePageQuery {
  readonly limit?: number;
  readonly cursor?: number;
}

const BODY_LIMIT_BYTES = 2_000_000;
const timestampSchema = { type: "string", format: "date-time" } as const;
const digestSchema = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$"
} as const;
const epistemicSchema = { enum: EPISTEMIC_LABELS } as const;
const originSchema = { enum: ORIGIN_KINDS } as const;
const formatSchema = { enum: EVIDENCE_IMPORT_FORMATS } as const;

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

const evidenceSourceParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId", "evidenceSourceId"],
  properties: {
    missionId: UUID_V4_SCHEMA,
    evidenceSourceId: UUID_V4_SCHEMA
  }
} as const;

const claimParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId", "claimId"],
  properties: {
    missionId: UUID_V4_SCHEMA,
    claimId: UUID_V4_SCHEMA
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

const timelinePageQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_PAGE_LIMIT,
      default: DEFAULT_PAGE_LIMIT
    },
    cursor: { type: "integer", minimum: 0 }
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

const timelinePageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "nextCursor"],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
    nextCursor: {
      anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }]
    }
  }
} as const;

const previewBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["format", "content"],
  properties: {
    format: formatSchema,
    content: {
      type: "string",
      minLength: 1,
      maxLength: MAXIMUM_EVIDENCE_INPUT_BYTES
    }
  }
} as const;

const commitBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "format",
    "content",
    "origin",
    "sourceLocator",
    "epistemicLabel"
  ],
  properties: {
    ...previewBodySchema.properties,
    origin: originSchema,
    sourceLocator: { type: "string", minLength: 4, maxLength: 512 },
    sourceRevision: { type: "string", minLength: 1, maxLength: 256 },
    effectiveAtUtc: timestampSchema,
    epistemicLabel: epistemicSchema
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
      maxItems: REDACTION_RULE_IDS.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rule", "replacements"],
        properties: {
          rule: { enum: REDACTION_RULE_IDS },
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
    normalizationVersion: { const: "evidence-normalization.v1" },
    format: formatSchema,
    inputByteCount: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_EVIDENCE_INPUT_BYTES
    },
    normalizedByteCount: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_EVIDENCE_INPUT_BYTES
    },
    normalizedContent: {
      type: "string",
      minLength: 1,
      maxLength: MAXIMUM_EVIDENCE_INPUT_BYTES
    },
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
    "extractionMethod",
    "epistemicLabel",
    "prepared"
  ],
  properties: {
    evidenceSourceId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    importKey: digestSchema,
    origin: originSchema,
    sourceLocator: { type: "string", minLength: 4, maxLength: 512 },
    sourceRevision: { type: "string", minLength: 1, maxLength: 256 },
    recordedAtUtc: timestampSchema,
    effectiveAtUtc: timestampSchema,
    extractionMethod: { const: "DIRECT_IMPORT" },
    epistemicLabel: epistemicSchema,
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
    eventType: { const: "EVIDENCE_IMPORTED" },
    evidenceSourceId: UUID_V4_SCHEMA,
    occurredAtUtc: timestampSchema
  }
} as const;

const previewResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "preview"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    preview: preparedEvidenceSchema
  }
} as const;

const evidenceSourceResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "created", "evidenceSource", "timelineEvent"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    created: { type: "boolean" },
    evidenceSource: evidenceSourceSchema,
    timelineEvent: timelineEventSchema
  }
} as const;

const evidenceSourceGetResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "evidenceSource"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    evidenceSource: evidenceSourceSchema
  }
} as const;

const evidenceSourceListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "evidenceSources", "page"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    evidenceSources: { type: "array", items: evidenceSourceSchema },
    page: identityPageSchema
  }
} as const;

const timelineResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "timelineEvents", "page"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    timelineEvents: { type: "array", items: timelineEventSchema },
    page: timelinePageSchema
  }
} as const;

const claimApplicabilityInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    dimensions: {
      type: "array",
      maxItems: MAXIMUM_CLAIM_APPLICABILITY_DIMENSIONS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dimension", "value"],
        properties: {
          dimension: {
            type: "string",
            minLength: 1,
            maxLength: MAXIMUM_CLAIM_TERM_BYTES
          },
          value: {
            type: "string",
            minLength: 1,
            maxLength: MAXIMUM_CLAIM_TERM_BYTES
          }
        }
      }
    },
    effectiveFromUtc: timestampSchema,
    effectiveUntilUtc: timestampSchema
  }
} as const;

const jsonValueResponseSchema = {} as const;

const claimBodyProperties = {
  rawText: {
    type: "string",
    minLength: 1,
    maxLength: MAXIMUM_CLAIM_RAW_TEXT_BYTES
  },
  subject: {
    type: "string",
    minLength: 1,
    maxLength: MAXIMUM_CLAIM_TERM_BYTES
  },
  predicate: {
    type: "string",
    minLength: 1,
    maxLength: MAXIMUM_CLAIM_TERM_BYTES
  },
  value: jsonValueResponseSchema,
  applicability: claimApplicabilityInputSchema,
  effectiveAtUtc: timestampSchema,
  epistemicLabel: epistemicSchema
} as const;

const claimBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "rawText",
    "subject",
    "predicate",
    "value",
    "epistemicLabel"
  ],
  properties: claimBodyProperties
} as const;

const successorBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "evidenceSourceId",
    "rawText",
    "subject",
    "predicate",
    "value",
    "epistemicLabel"
  ],
  properties: {
    evidenceSourceId: UUID_V4_SCHEMA,
    ...claimBodyProperties
  }
} as const;

const claimApplicabilityResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["dimensions"],
  properties: {
    dimensions: {
      type: "array",
      maxItems: MAXIMUM_CLAIM_APPLICABILITY_DIMENSIONS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dimension", "value"],
        properties: {
          dimension: { type: "string", minLength: 1 },
          value: { type: "string", minLength: 1 }
        }
      }
    },
    effectiveFromUtc: timestampSchema,
    effectiveUntilUtc: timestampSchema
  }
} as const;

const claimResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "claimId",
    "projectId",
    "missionId",
    "evidenceSourceId",
    "importKey",
    "claimDigest",
    "normalizationVersion",
    "origin",
    "sourceLocator",
    "sourceContentDigest",
    "recordedAtUtc",
    "extractionMethod",
    "epistemicLabel",
    "rawText",
    "subject",
    "predicate",
    "comparisonKey",
    "value",
    "applicability",
    "applicabilityKey"
  ],
  properties: {
    claimId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    evidenceSourceId: UUID_V4_SCHEMA,
    importKey: digestSchema,
    claimDigest: digestSchema,
    normalizationVersion: { const: "claim-normalization.v1" },
    origin: originSchema,
    sourceLocator: { type: "string", minLength: 4, maxLength: 512 },
    sourceRevision: { type: "string", minLength: 1, maxLength: 256 },
    sourceContentDigest: digestSchema,
    recordedAtUtc: timestampSchema,
    effectiveAtUtc: timestampSchema,
    extractionMethod: { const: "MANUAL_STRUCTURED_INTAKE" },
    epistemicLabel: epistemicSchema,
    rawText: {
      type: "string",
      minLength: 1,
      maxLength: MAXIMUM_CLAIM_RAW_TEXT_BYTES
    },
    subject: { type: "string", minLength: 1 },
    predicate: { type: "string", minLength: 1 },
    comparisonKey: digestSchema,
    value: jsonValueResponseSchema,
    applicability: claimApplicabilityResourceSchema,
    applicabilityKey: digestSchema,
    supersedesClaimId: UUID_V4_SCHEMA
  }
} as const;

const supersessionResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "claimSupersessionId",
    "relationshipType",
    "projectId",
    "missionId",
    "predecessorClaimId",
    "successorClaimId",
    "evidenceSourceId",
    "comparisonKey",
    "applicabilityKey",
    "origin",
    "sourceLocator",
    "sourceContentDigest",
    "recordedAtUtc",
    "extractionMethod",
    "epistemicLabel",
    "linkDigest"
  ],
  properties: {
    claimSupersessionId: UUID_V4_SCHEMA,
    relationshipType: { const: "SUPERSEDES" },
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    predecessorClaimId: UUID_V4_SCHEMA,
    successorClaimId: UUID_V4_SCHEMA,
    evidenceSourceId: UUID_V4_SCHEMA,
    comparisonKey: digestSchema,
    applicabilityKey: digestSchema,
    origin: originSchema,
    sourceLocator: { type: "string", minLength: 4, maxLength: 512 },
    sourceRevision: { type: "string", minLength: 1, maxLength: 256 },
    sourceContentDigest: digestSchema,
    recordedAtUtc: timestampSchema,
    effectiveAtUtc: timestampSchema,
    extractionMethod: { const: "MANUAL_STRUCTURED_INTAKE" },
    epistemicLabel: epistemicSchema,
    linkDigest: digestSchema
  }
} as const;

const claimResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "created", "claim"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    created: { type: "boolean" },
    claim: claimResourceSchema,
    supersession: supersessionResourceSchema
  }
} as const;

const claimGetResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "claim"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    claim: claimResourceSchema
  }
} as const;

const claimListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "claims", "page"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    claims: { type: "array", items: claimResourceSchema },
    page: identityPageSchema
  }
} as const;

const supersessionListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "supersessions", "page"],
  properties: {
    apiVersion: { const: EVIDENCE_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    supersessions: { type: "array", items: supersessionResourceSchema },
    page: identityPageSchema
  }
} as const;

function pageLimit(query: { readonly limit?: number }): number {
  return query.limit ?? DEFAULT_PAGE_LIMIT;
}

function utf8Content(value: string): Uint8Array {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        throw new EvidenceImportError("EVIDENCE_UTF8_INVALID");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new EvidenceImportError("EVIDENCE_UTF8_INVALID");
    }
  }
  return new TextEncoder().encode(value);
}

function claimInput(
  body: CreateClaimRequest,
  scope: {
    readonly projectId: ReturnType<SqliteProjectRepository["getMission"]>["projectId"];
    readonly missionId: ReturnType<SqliteProjectRepository["getMission"]>["missionId"];
  },
  evidenceSourceId: EvidenceSourceId,
  supersedesClaimId?: ClaimId
) {
  return {
    projectId: scope.projectId,
    missionId: scope.missionId,
    evidenceSourceId,
    rawText: body.rawText,
    subject: body.subject,
    predicate: body.predicate,
    value: body.value,
    ...(body.applicability === undefined
      ? {}
      : { applicability: body.applicability }),
    ...(body.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: body.effectiveAtUtc }),
    extractionMethod: "MANUAL_STRUCTURED_INTAKE" as const,
    epistemicLabel: body.epistemicLabel,
    ...(supersedesClaimId === undefined ? {} : { supersedesClaimId })
  };
}

export function registerEvidenceRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  evidence: SqliteEvidenceRepository,
  claims: SqliteClaimRepository
): void {
  app.post<{
    Params: MissionParams;
    Body: EvidencePreviewRequest;
    Reply: EvidencePreviewResponse;
  }>(
    "/api/v1/missions/:missionId/evidence/preview",
    {
      bodyLimit: BODY_LIMIT_BYTES,
      schema: {
        params: missionParamsSchema,
        body: previewBodySchema,
        response: { 200: previewResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      projects.getMission(parseStableId<"MISSION">(request.params.missionId));
      return createEvidencePreviewResponse(
        await prepareEvidenceImport({
          format: request.body.format,
          content: utf8Content(request.body.content)
        })
      );
    }
  );

  app.post<{
    Params: MissionParams;
    Body: CommitEvidenceRequest;
    Reply: EvidenceSourceResponse;
  }>(
    "/api/v1/missions/:missionId/evidence-sources",
    {
      bodyLimit: BODY_LIMIT_BYTES,
      schema: {
        params: missionParamsSchema,
        body: commitBodySchema,
        response: {
          200: evidenceSourceResponseSchema,
          201: evidenceSourceResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request, reply) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const prepared = await prepareEvidenceImport({
        format: request.body.format,
        content: utf8Content(request.body.content)
      });
      const result = await evidence.persistEvidence({
        projectId: mission.projectId,
        missionId: mission.missionId,
        origin: request.body.origin,
        sourceLocator: request.body.sourceLocator,
        ...(request.body.sourceRevision === undefined
          ? {}
          : { sourceRevision: request.body.sourceRevision }),
        ...(request.body.effectiveAtUtc === undefined
          ? {}
          : { effectiveAtUtc: request.body.effectiveAtUtc }),
        extractionMethod: "DIRECT_IMPORT",
        epistemicLabel: request.body.epistemicLabel,
        prepared
      });
      reply.code(result.created ? 201 : 200);
      return createEvidenceSourceResponse(result);
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: IdentityPageQuery;
    Reply: EvidenceSourceListResponse;
  }>(
    "/api/v1/missions/:missionId/evidence-sources",
    {
      schema: {
        params: missionParamsSchema,
        querystring: identityPageQuerySchema,
        response: { 200: evidenceSourceListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const limit = pageLimit(request.query);
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"EVIDENCE_SOURCE">(request.query.cursor);
      const page = await evidence.listEvidenceSources(
        mission.projectId,
        mission.missionId,
        limit,
        cursor
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        missionId: mission.missionId,
        evidenceSources: page.items.map(toEvidenceSourceResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: EvidenceSourceParams;
    Reply: EvidenceSourceGetResponse;
  }>(
    "/api/v1/missions/:missionId/evidence-sources/:evidenceSourceId",
    {
      schema: {
        params: evidenceSourceParamsSchema,
        response: { 200: evidenceSourceGetResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const source = await evidence.getEvidenceSource(
        mission.projectId,
        mission.missionId,
        parseStableId<"EVIDENCE_SOURCE">(request.params.evidenceSourceId)
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        evidenceSource: toEvidenceSourceResource(source)
      };
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: TimelinePageQuery;
    Reply: EvidenceTimelineResponse;
  }>(
    "/api/v1/missions/:missionId/timeline-events",
    {
      schema: {
        params: missionParamsSchema,
        querystring: timelinePageQuerySchema,
        response: { 200: timelineResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const limit = pageLimit(request.query);
      const page = await evidence.listTimelineEvents(
        mission.projectId,
        mission.missionId,
        limit,
        request.query.cursor
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        missionId: mission.missionId,
        timelineEvents: page.items.map(toEvidenceTimelineEventResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.post<{
    Params: EvidenceSourceParams;
    Body: CreateClaimRequest;
    Reply: ClaimResponse;
  }>(
    "/api/v1/missions/:missionId/evidence-sources/:evidenceSourceId/claims",
    {
      schema: {
        params: evidenceSourceParamsSchema,
        body: claimBodySchema,
        response: {
          200: claimResponseSchema,
          201: claimResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request, reply) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const result = await claims.persistClaim(
        claimInput(
          request.body,
          mission,
          parseStableId<"EVIDENCE_SOURCE">(
            request.params.evidenceSourceId
          )
        )
      );
      reply.code(result.created ? 201 : 200);
      return createClaimResponse(result);
    }
  );

  app.post<{
    Params: ClaimParams;
    Body: CreateClaimSuccessorRequest;
    Reply: ClaimResponse;
  }>(
    "/api/v1/missions/:missionId/claims/:claimId/successors",
    {
      schema: {
        params: claimParamsSchema,
        body: successorBodySchema,
        response: {
          200: claimResponseSchema,
          201: claimResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request, reply) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const result = await claims.persistClaim(
        claimInput(
          request.body,
          mission,
          parseStableId<"EVIDENCE_SOURCE">(request.body.evidenceSourceId),
          parseStableId<"CLAIM">(request.params.claimId)
        )
      );
      reply.code(result.created ? 201 : 200);
      return createClaimResponse(result);
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: IdentityPageQuery;
    Reply: ClaimListResponse;
  }>(
    "/api/v1/missions/:missionId/claims",
    {
      schema: {
        params: missionParamsSchema,
        querystring: identityPageQuerySchema,
        response: { 200: claimListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const limit = pageLimit(request.query);
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"CLAIM">(request.query.cursor);
      const page = await claims.listClaims(
        mission.projectId,
        mission.missionId,
        limit,
        cursor
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        missionId: mission.missionId,
        claims: page.items.map(toClaimResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{ Params: ClaimParams; Reply: ClaimGetResponse }>(
    "/api/v1/missions/:missionId/claims/:claimId",
    {
      schema: {
        params: claimParamsSchema,
        response: { 200: claimGetResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const claim = await claims.getClaim(
        mission.projectId,
        mission.missionId,
        parseStableId<"CLAIM">(request.params.claimId)
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        claim: toClaimResource(claim)
      };
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: IdentityPageQuery;
    Reply: ClaimSupersessionListResponse;
  }>(
    "/api/v1/missions/:missionId/claim-supersessions",
    {
      schema: {
        params: missionParamsSchema,
        querystring: identityPageQuerySchema,
        response: { 200: supersessionListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const mission = projects.getMission(
        parseStableId<"MISSION">(request.params.missionId)
      );
      const limit = pageLimit(request.query);
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"CLAIM_SUPERSESSION">(request.query.cursor);
      const page = await claims.listSupersessions(
        mission.projectId,
        mission.missionId,
        limit,
        cursor
      );
      return {
        apiVersion: EVIDENCE_API_VERSION,
        missionId: mission.missionId,
        supersessions: page.items.map(toClaimSupersessionResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );
}
