import type { FastifyInstance } from "fastify";

import type {
  DemoResetResponse,
  DemoSetupResponse,
  DemoTransitionResponse,
  DemoWorkspaceResource
} from "@intelliloop/contracts";

import { API_ERROR_RESPONSE_SCHEMA } from "../http-schemas.js";
import type { DemoWorkspaceService } from "./demo-workspace-service.js";

const workspaceProperties = {
  apiVersion: { const: "v1" },
  fixtureId: { const: "loopmart-expanded-cancellation-v1" },
  fixtureVersion: { const: "intelliloop-retail-cancellation-fixture.v1" },
  ownership: { const: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY" },
  status: { enum: ["EMPTY", "READY"] },
  synthetic: { const: true },
  repositoryExecution: { const: false },
  projectId: { type: "string", pattern: "^[0-9a-f-]{36}$" },
  missionId: { type: "string", pattern: "^[0-9a-f-]{36}$" },
  initialSnapshotId: { type: "string", pattern: "^[0-9a-f-]{36}$" },
  codeMapRevision: { type: "integer", minimum: 1 },
  twinRevision: { type: "integer", minimum: 1 },
  reconciliationRevision: { type: "integer", minimum: 1 },
  readinessRevision: { type: "integer", minimum: 1 },
  workflowStage: { enum: ["INITIAL_BLOCKED", "CORRECTED_READY", "READY_STALE"] },
  readinessStatus: { enum: ["BLOCKED", "READY", "STALE"] },
  correctedSnapshotId: { type: "string", pattern: "^[0-9a-f-]{36}$" },
  correctedCodeMapRevision: { type: "integer", minimum: 1 },
  correctedTwinRevision: { type: "integer", minimum: 1 },
  correctedReconciliationRevision: { type: "integer", minimum: 1 },
  readyAssessmentRevision: { type: "integer", minimum: 1 },
  passportAssessmentRevision: { type: "integer", minimum: 1 },
  staleSnapshotId: { type: "string", pattern: "^[0-9a-f-]{36}$" }
} as const;

const requiredWorkspaceProperties = [
  "apiVersion", "fixtureId", "fixtureVersion", "ownership", "status",
  "synthetic", "repositoryExecution"
] as const;

const workspaceSchema = {
  type: "object",
  additionalProperties: false,
  required: requiredWorkspaceProperties,
  properties: workspaceProperties
} as const;

const setupSchema = {
  ...workspaceSchema,
  required: [...requiredWorkspaceProperties, "created"],
  properties: { ...workspaceProperties, created: { type: "boolean" } }
} as const;

const resetSchema = {
  ...workspaceSchema,
  required: [...requiredWorkspaceProperties, "reset"],
  properties: { ...workspaceProperties, reset: { type: "boolean" } }
} as const;

const transitionSchema = {
  ...workspaceSchema,
  required: [...requiredWorkspaceProperties, "changed"],
  properties: { ...workspaceProperties, changed: { type: "boolean" } }
} as const;

function rejectBody(body: unknown): void {
  if (body === undefined || body === null) return;
  const error = new Error("Request body is not supported.") as Error & {
    statusCode: number;
  };
  error.statusCode = 400;
  throw error;
}

export function registerDemoRoutes(
  app: FastifyInstance,
  service: DemoWorkspaceService
): void {
  const errors = {
    400: API_ERROR_RESPONSE_SCHEMA,
    409: API_ERROR_RESPONSE_SCHEMA,
    500: API_ERROR_RESPONSE_SCHEMA
  } as const;

  app.get<{ Reply: DemoWorkspaceResource }>(
    "/api/v1/demo",
    { schema: { response: { 200: workspaceSchema, ...errors } } },
    async () => service.status()
  );

  app.post<{ Body: never; Reply: DemoSetupResponse }>(
    "/api/v1/demo/setup",
    { schema: { response: { 200: setupSchema, 201: setupSchema, ...errors } } },
    async (request, reply) => {
      rejectBody(request.body);
      const result = await service.setup();
      reply.code(result.created ? 201 : 200);
      return result;
    }
  );

  app.post<{ Body: never; Reply: DemoResetResponse }>(
    "/api/v1/demo/reset",
    { schema: { response: { 200: resetSchema, ...errors } } },
    async (request) => {
      rejectBody(request.body);
      return service.reset();
    }
  );

  app.post<{ Body: never; Reply: DemoTransitionResponse }>(
    "/api/v1/demo/correction",
    { schema: { response: { 200: transitionSchema, ...errors } } },
    async (request) => {
      rejectBody(request.body);
      return service.applyCorrection();
    }
  );

  app.post<{ Body: never; Reply: DemoTransitionResponse }>(
    "/api/v1/demo/staleness",
    { schema: { response: { 200: transitionSchema, ...errors } } },
    async (request) => {
      rejectBody(request.body);
      return service.demonstrateStaleness();
    }
  );
}
