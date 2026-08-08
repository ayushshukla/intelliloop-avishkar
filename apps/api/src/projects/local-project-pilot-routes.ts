import type { FastifyInstance } from "fastify";

import {
  LOCAL_PROJECT_PILOT_API_VERSION,
  createRepositoryResponse,
  type LocalProjectContextResponse,
  type LocalProjectPilotCapabilityResponse,
  type LocalProjectPreflightRequest,
  type LocalProjectPreflightResponse,
  type RegisterRepositoryRequest,
  type RepositoryResponse
} from "@intelliloop/contracts";
import { parseStableId } from "@intelliloop/domain";

import { API_ERROR_RESPONSE_SCHEMA, UUID_V4_SCHEMA } from "../http-schemas.js";
import type { LocalProjectPilotService } from "./local-project-pilot-service.js";

interface ProjectParams { readonly projectId: string }

const safeRepositorySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "displayName", "repositoryState", "headState", "ref", "exactCommit",
    "commitTimestampUtc", "uncommittedChanges", "excludedChangeCount",
    "captureReady", "accessMode", "sourcePersistence"
  ],
  properties: {
    displayName: { type: "string", minLength: 1, maxLength: 120 },
    repositoryState: { const: "RECOGNIZED_GIT" },
    headState: { enum: ["ATTACHED", "DETACHED"] },
    ref: { type: "string", minLength: 1, maxLength: 255 },
    exactCommit: { type: "string", pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$" },
    commitTimestampUtc: { type: "string", format: "date-time" },
    uncommittedChanges: { enum: ["NONE", "EXCLUDED"] },
    excludedChangeCount: { type: "integer", minimum: 0 },
    captureReady: { const: true },
    accessMode: { const: "READ_ONLY" },
    sourcePersistence: { const: "SOURCE_FREE" }
  }
} as const;

const repositoryResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "repository"],
  properties: {
    apiVersion: { const: "v1" },
    repository: {
      type: "object",
      additionalProperties: false,
      required: ["registrationId", "projectId", "repositoryKind", "accessMode", "registeredAtUtc"],
      properties: {
        registrationId: UUID_V4_SCHEMA,
        projectId: UUID_V4_SCHEMA,
        repositoryKind: { const: "LOCAL_GIT" },
        accessMode: { const: "READ_ONLY" },
        registeredAtUtc: { type: "string", format: "date-time" }
      }
    }
  }
} as const;

export function registerLocalProjectPilotRoutes(
  app: FastifyInstance,
  service: LocalProjectPilotService
): void {
  app.get<{ Reply: LocalProjectPilotCapabilityResponse }>(
    "/api/v1/local-project-pilot/capability",
    async () => service.capability()
  );

  app.post<{ Body: LocalProjectPreflightRequest; Reply: LocalProjectPreflightResponse }>(
    "/api/v1/local-project-pilot/preflight",
    {
      schema: {
        body: {
          type: "object", additionalProperties: false, required: ["rootPath"],
          properties: { rootPath: { type: "string", minLength: 1, maxLength: 4096 } }
        },
        response: {
          200: {
            type: "object", additionalProperties: false, required: ["apiVersion", "preflight"],
            properties: {
              apiVersion: { const: LOCAL_PROJECT_PILOT_API_VERSION },
              preflight: {
                oneOf: [
                  {
                    type: "object", additionalProperties: false, required: ["status", "repository"],
                    properties: { status: { const: "READY" }, repository: safeRepositorySchema }
                  },
                  {
                    type: "object", additionalProperties: false, required: ["status", "reason", "recovery"],
                    properties: {
                      status: { const: "REJECTED" },
                      reason: { enum: [
                        "FEATURE_DISABLED", "CONFIGURATION_REQUIRED", "PATH_NOT_AUTHORIZED",
                        "PATH_INVALID", "REPOSITORY_NOT_FOUND", "REPOSITORY_NOT_GIT",
                        "UNSAFE_LINK", "COMMIT_UNAVAILABLE", "GIT_TIMEOUT", "GIT_UNAVAILABLE",
                        "INTEGRITY_CHECK_FAILED"
                      ] },
                      recovery: { type: "string", minLength: 1, maxLength: 240 }
                    }
                  }
                ]
              }
            }
          },
          400: API_ERROR_RESPONSE_SCHEMA,
          500: API_ERROR_RESPONSE_SCHEMA
        }
      }
    },
    async (request) => service.preflight(request.body.rootPath)
  );

  app.put<{ Params: ProjectParams; Body: RegisterRepositoryRequest; Reply: RepositoryResponse }>(
    "/api/v1/projects/:projectId/repository",
    {
      schema: {
        params: {
          type: "object", additionalProperties: false, required: ["projectId"],
          properties: { projectId: UUID_V4_SCHEMA }
        },
        body: {
          type: "object", additionalProperties: false, required: ["rootPath"],
          properties: { rootPath: { type: "string", minLength: 1, maxLength: 4096 } }
        },
        response: {
          201: repositoryResponseSchema,
          400: API_ERROR_RESPONSE_SCHEMA,
          404: API_ERROR_RESPONSE_SCHEMA,
          409: API_ERROR_RESPONSE_SCHEMA,
          500: API_ERROR_RESPONSE_SCHEMA
        }
      }
    },
    async (request, reply) => {
      const registration = await service.register(
        parseStableId<"PROJECT">(request.params.projectId),
        request.body.rootPath
      );
      reply.code(201);
      return createRepositoryResponse(registration);
    }
  );

  app.get<{ Params: ProjectParams; Reply: LocalProjectContextResponse }>(
    "/api/v1/projects/:projectId/local-project-pilot-context",
    {
      schema: {
        params: {
          type: "object", additionalProperties: false, required: ["projectId"],
          properties: { projectId: UUID_V4_SCHEMA }
        },
        response: {
          200: {
            type: "object", additionalProperties: false,
            required: ["apiVersion", "projectId", "repository"],
            properties: {
              apiVersion: { const: LOCAL_PROJECT_PILOT_API_VERSION },
              projectId: UUID_V4_SCHEMA,
              repository: safeRepositorySchema
            }
          },
          404: API_ERROR_RESPONSE_SCHEMA,
          500: API_ERROR_RESPONSE_SCHEMA
        }
      }
    },
    async (request) => {
      const projectId = parseStableId<"PROJECT">(request.params.projectId);
      return {
        apiVersion: LOCAL_PROJECT_PILOT_API_VERSION,
        projectId,
        repository: await service.context(projectId)
      };
    }
  );
}
