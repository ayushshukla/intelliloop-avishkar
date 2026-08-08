import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  PROJECT_API_VERSION,
  createGitSnapshotResponse,
  toGitSnapshotResource,
  type GitSnapshotListResponse,
  type GitSnapshotResponse
} from "@intelliloop/contracts";
import { parseStableId } from "@intelliloop/domain";

import { API_ERROR_RESPONSE_SCHEMA, UUID_V4_SCHEMA } from "../http-schemas.js";
import type { GitSnapshotService } from "./git-snapshot-service.js";

interface MissionParams {
  readonly missionId: string;
}

interface SnapshotParams {
  readonly snapshotId: string;
}

interface PageQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

const timestampSchema = { type: "string", format: "date-time" } as const;

const snapshotResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "snapshotId",
    "projectId",
    "missionId",
    "registrationId",
    "capturedAtUtc",
    "headState",
    "dirty",
    "indexChangeCount",
    "worktreeChangeCount",
    "untrackedFileCount",
    "changedFileCount",
    "changedFilesDigest"
  ],
  properties: {
    snapshotId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    registrationId: UUID_V4_SCHEMA,
    capturedAtUtc: timestampSchema,
    headState: { enum: ["ATTACHED", "DETACHED", "UNBORN"] },
    branchName: { type: "string", minLength: 1, maxLength: 255 },
    headCommit: {
      type: "string",
      pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$"
    },
    dirty: { type: "boolean" },
    indexChangeCount: { type: "integer", minimum: 0 },
    worktreeChangeCount: { type: "integer", minimum: 0 },
    untrackedFileCount: { type: "integer", minimum: 0 },
    changedFileCount: { type: "integer", minimum: 0 },
    changedFilesDigest: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" }
  }
} as const;

const snapshotResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "snapshot"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    snapshot: snapshotResourceSchema
  }
} as const;

const snapshotListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "snapshots", "page"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    snapshots: { type: "array", items: snapshotResourceSchema },
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

const errorResponses = {
  400: API_ERROR_RESPONSE_SCHEMA,
  404: API_ERROR_RESPONSE_SCHEMA,
  409: API_ERROR_RESPONSE_SCHEMA,
  500: API_ERROR_RESPONSE_SCHEMA
} as const;

const missionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId"],
  properties: { missionId: UUID_V4_SCHEMA }
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
    cursor: UUID_V4_SCHEMA
  }
} as const;

function rejectRequestBody(body: unknown): void {
  if (body === undefined) return;
  const error = new Error("Snapshot capture does not accept a request body.") as
    Error & { statusCode: number };
  error.statusCode = 400;
  throw error;
}

export function registerGitSnapshotRoutes(
  app: FastifyInstance,
  snapshots: GitSnapshotService
): void {
  app.post<{ Params: MissionParams; Body?: unknown; Reply: GitSnapshotResponse }>(
    "/api/v1/missions/:missionId/git-snapshots",
    {
      schema: {
        params: missionParamsSchema,
        response: { 201: snapshotResponseSchema, ...errorResponses }
      }
    },
    async (request, reply) => {
      rejectRequestBody(request.body);
      const snapshot = await snapshots.capture(
        parseStableId<"MISSION">(request.params.missionId)
      );
      reply.code(201);
      return createGitSnapshotResponse(snapshot);
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: PageQuery;
    Reply: GitSnapshotListResponse;
  }>(
    "/api/v1/missions/:missionId/git-snapshots",
    {
      schema: {
        params: missionParamsSchema,
        querystring: pageQuerySchema,
        response: { 200: snapshotListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const missionId = parseStableId<"MISSION">(request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"GIT_SNAPSHOT">(request.query.cursor);
      const page = snapshots.list(missionId, limit, cursor);
      return {
        apiVersion: PROJECT_API_VERSION,
        missionId,
        snapshots: page.items.map(toGitSnapshotResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{ Params: SnapshotParams; Reply: GitSnapshotResponse }>(
    "/api/v1/git-snapshots/:snapshotId",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["snapshotId"],
          properties: { snapshotId: UUID_V4_SCHEMA }
        },
        response: { 200: snapshotResponseSchema, ...errorResponses }
      }
    },
    async (request) =>
      createGitSnapshotResponse(
        snapshots.get(
          parseStableId<"GIT_SNAPSHOT">(request.params.snapshotId)
        )
      )
  );
}
