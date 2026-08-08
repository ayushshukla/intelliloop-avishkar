export const UUID_V4_SCHEMA = {
  type: "string",
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
} as const;

export const API_ERROR_RESPONSE_SCHEMA = {
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

export const HEALTH_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "service",
    "apiVersion",
    "status",
    "serverTimeUtc",
    "productMode",
    "externalAi"
  ],
  properties: {
    service: { const: "intelliloop-api" },
    apiVersion: { const: "v1" },
    status: { const: "ok" },
    serverTimeUtc: { type: "string", format: "date-time" },
    productMode: { const: "FOUNDATION_ONLY" },
    externalAi: { const: "OFF" }
  }
} as const;
