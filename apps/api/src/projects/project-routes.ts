import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  PROJECT_API_VERSION,
  createMissionResponse,
  createProjectResponse,
  createRepositoryResponse,
  toMissionResource,
  toProjectResource,
  type CreateMissionRequest,
  type CreateProjectRequest,
  type MissionListResponse,
  type MissionResponse,
  type ProjectListResponse,
  type ProjectResponse,
  type RepositoryResponse
} from "@intelliloop/contracts";
import { parseStableId } from "@intelliloop/domain";

import {
  API_ERROR_RESPONSE_SCHEMA,
  UUID_V4_SCHEMA
} from "../http-schemas.js";
import type { SqliteProjectRepository } from "./project-repository.js";
import type { RepositoryRegistrationService } from "./repository-registration.js";

interface ProjectParams {
  readonly projectId: string;
}

interface MissionParams {
  readonly missionId: string;
}

interface PageQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

const timestampSchema = { type: "string", format: "date-time" } as const;

const projectResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "projectId",
    "name",
    "status",
    "revision",
    "createdAtUtc",
    "updatedAtUtc"
  ],
  properties: {
    projectId: UUID_V4_SCHEMA,
    name: { type: "string", minLength: 1, maxLength: 120 },
    status: { enum: ["ACTIVE", "ARCHIVED"] },
    revision: { type: "integer", minimum: 1 },
    createdAtUtc: timestampSchema,
    updatedAtUtc: timestampSchema,
    archivedAtUtc: timestampSchema
  }
} as const;

const missionResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "missionId",
    "projectId",
    "title",
    "status",
    "revision",
    "createdAtUtc",
    "updatedAtUtc"
  ],
  properties: {
    missionId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    title: { type: "string", minLength: 1, maxLength: 160 },
    status: { enum: ["CURRENT", "ARCHIVED"] },
    revision: { type: "integer", minimum: 1 },
    createdAtUtc: timestampSchema,
    updatedAtUtc: timestampSchema,
    archivedAtUtc: timestampSchema
  }
} as const;

const pageMetadataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "nextCursor"],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
    nextCursor: { anyOf: [UUID_V4_SCHEMA, { type: "null" }] }
  }
} as const;

const projectResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "project"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    project: projectResourceSchema
  }
} as const;

const missionResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "mission"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    mission: missionResourceSchema
  }
} as const;

const repositoryResourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "registrationId",
    "projectId",
    "repositoryKind",
    "accessMode",
    "registeredAtUtc"
  ],
  properties: {
    registrationId: UUID_V4_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    repositoryKind: { const: "LOCAL_GIT" },
    accessMode: { const: "READ_ONLY" },
    registeredAtUtc: timestampSchema
  }
} as const;

const repositoryResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "repository"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    repository: repositoryResourceSchema
  }
} as const;

const projectListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "projects", "page"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    projects: { type: "array", items: projectResourceSchema },
    page: pageMetadataSchema
  }
} as const;

const missionListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "projectId", "missions", "page"],
  properties: {
    apiVersion: { const: PROJECT_API_VERSION },
    projectId: UUID_V4_SCHEMA,
    missions: { type: "array", items: missionResourceSchema },
    page: pageMetadataSchema
  }
} as const;

const errorResponses = {
  400: API_ERROR_RESPONSE_SCHEMA,
  404: API_ERROR_RESPONSE_SCHEMA,
  409: API_ERROR_RESPONSE_SCHEMA,
  500: API_ERROR_RESPONSE_SCHEMA
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

function pageLimit(query: PageQuery): number {
  return query.limit ?? DEFAULT_PAGE_LIMIT;
}

export function registerProjectRoutes(
  app: FastifyInstance,
  repository: SqliteProjectRepository,
  repositoryRegistration?: RepositoryRegistrationService
): void {
  app.post<{ Body: CreateProjectRequest; Reply: ProjectResponse }>(
    "/api/v1/projects",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 }
          }
        },
        response: { 201: projectResponseSchema, ...errorResponses }
      }
    },
    async (request, reply) => {
      const project = repository.createProject(request.body.name);
      reply.code(201);
      return createProjectResponse(project);
    }
  );

  app.get<{ Querystring: PageQuery; Reply: ProjectListResponse }>(
    "/api/v1/projects",
    {
      schema: {
        querystring: pageQuerySchema,
        response: { 200: projectListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const limit = pageLimit(request.query);
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"PROJECT">(request.query.cursor);
      const page = repository.listProjects(limit, cursor);
      return {
        apiVersion: PROJECT_API_VERSION,
        projects: page.items.map(toProjectResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{ Params: ProjectParams; Reply: ProjectResponse }>(
    "/api/v1/projects/:projectId",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["projectId"],
          properties: { projectId: UUID_V4_SCHEMA }
        },
        response: { 200: projectResponseSchema, ...errorResponses }
      }
    },
    async (request) =>
      createProjectResponse(
        repository.getProject(
          parseStableId<"PROJECT">(request.params.projectId)
        )
      )
  );

  if (repositoryRegistration !== undefined) {
    app.get<{ Params: ProjectParams; Reply: RepositoryResponse }>(
      "/api/v1/projects/:projectId/repository",
      {
        schema: {
          params: {
            type: "object",
            additionalProperties: false,
            required: ["projectId"],
            properties: { projectId: UUID_V4_SCHEMA }
          },
          response: { 200: repositoryResponseSchema, ...errorResponses }
        }
      },
      async (request) =>
        createRepositoryResponse(
          repositoryRegistration.get(
            parseStableId<"PROJECT">(request.params.projectId)
          )
        )
    );
  }

  app.post<{
    Params: ProjectParams;
    Body: CreateMissionRequest;
    Reply: MissionResponse;
  }>(
    "/api/v1/projects/:projectId/missions",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["projectId"],
          properties: { projectId: UUID_V4_SCHEMA }
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["title"],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 160 }
          }
        },
        response: { 201: missionResponseSchema, ...errorResponses }
      }
    },
    async (request, reply) => {
      const mission = repository.createMission(
        parseStableId<"PROJECT">(request.params.projectId),
        request.body.title
      );
      reply.code(201);
      return createMissionResponse(mission);
    }
  );

  app.get<{
    Params: ProjectParams;
    Querystring: PageQuery;
    Reply: MissionListResponse;
  }>(
    "/api/v1/projects/:projectId/missions",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["projectId"],
          properties: { projectId: UUID_V4_SCHEMA }
        },
        querystring: pageQuerySchema,
        response: { 200: missionListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const projectId = parseStableId<"PROJECT">(request.params.projectId);
      const limit = pageLimit(request.query);
      const cursor =
        request.query.cursor === undefined
          ? undefined
          : parseStableId<"MISSION">(request.query.cursor);
      const page = repository.listMissions(projectId, limit, cursor);
      return {
        apiVersion: PROJECT_API_VERSION,
        projectId,
        missions: page.items.map(toMissionResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{ Params: MissionParams; Reply: MissionResponse }>(
    "/api/v1/missions/:missionId",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["missionId"],
          properties: { missionId: UUID_V4_SCHEMA }
        },
        response: { 200: missionResponseSchema, ...errorResponses }
      }
    },
    async (request) =>
      createMissionResponse(
        repository.getMission(
          parseStableId<"MISSION">(request.params.missionId)
        )
      )
  );
}
