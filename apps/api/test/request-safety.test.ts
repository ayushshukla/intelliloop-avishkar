import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createSafeLogger } from "../src/observability.js";

const GENERATED_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const INCOMING_REQUEST_ID = "987e6543-e21b-42d3-a456-426614174999";
const SECRET_SENTINEL = "INTELLILOOP_SECRET_SENTINEL_DO_NOT_LOG";
const openApps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe("request safety foundation", () => {
  it("propagates a validated caller request ID", async () => {
    const app = buildApp({ requestIdFactory: () => GENERATED_REQUEST_ID });
    openApps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
      headers: { "x-request-id": INCOMING_REQUEST_ID }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe(INCOMING_REQUEST_ID);
  });

  it("replaces unsafe caller IDs and omits secret-bearing request data from logs", async () => {
    const lines: string[] = [];
    const logger = createSafeLogger({
      level: "info",
      clock: () => new Date("2026-08-04T01:02:03.000Z"),
      write: (line) => lines.push(line)
    });
    const app = buildApp({
      logger,
      requestIdFactory: () => GENERATED_REQUEST_ID
    });
    openApps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/not-present?token=${SECRET_SENTINEL}`,
      headers: {
        authorization: `Bearer ${SECRET_SENTINEL}`,
        "x-request-id": SECRET_SENTINEL
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["x-request-id"]).toBe(GENERATED_REQUEST_ID);
    expect(response.json()).toMatchObject({
      error: { code: "NOT_FOUND", requestId: GENERATED_REQUEST_ID }
    });
    expect(lines.join("\n")).not.toContain(SECRET_SENTINEL);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "{}")).toEqual({
      timeUtc: "2026-08-04T01:02:03.000Z",
      level: "info",
      event: "api.request.completed",
      requestId: GENERATED_REQUEST_ID,
      method: "GET",
      route: "UNMATCHED",
      statusCode: 404
    });
  });

  it("maps internal failures to a stable response without logging the error message", async () => {
    const lines: string[] = [];
    const logger = createSafeLogger({
      level: "info",
      clock: () => new Date("2026-08-04T01:02:03.000Z"),
      write: (line) => lines.push(line)
    });
    const app = buildApp({
      logger,
      requestIdFactory: () => GENERATED_REQUEST_ID
    });
    app.get("/__test-internal-error", async () => {
      throw new Error(SECRET_SENTINEL);
    });
    openApps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/__test-internal-error"
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        version: "v1",
        code: "INTERNAL_ERROR",
        message: "The service could not complete the request.",
        requestId: GENERATED_REQUEST_ID
      }
    });
    expect(lines.join("\n")).not.toContain(SECRET_SENTINEL);
    expect(lines.map((line) => JSON.parse(line))).toContainEqual({
      timeUtc: "2026-08-04T01:02:03.000Z",
      level: "error",
      event: "api.request.failed",
      requestId: GENERATED_REQUEST_ID,
      method: "GET",
      route: "/__test-internal-error",
      statusCode: 500,
      errorCode: "INTERNAL_ERROR"
    });
  });

  it("maps schema validation failures to the stable invalid-request contract", async () => {
    const app = buildApp({ requestIdFactory: () => GENERATED_REQUEST_ID });
    app.post(
      "/__test-validation",
      {
        schema: {
          body: {
            type: "object",
            additionalProperties: false,
            required: ["name"],
            properties: { name: { type: "string", minLength: 1 } }
          }
        }
      },
      async () => ({ accepted: true })
    );
    openApps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/__test-validation",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["x-request-id"]).toBe(GENERATED_REQUEST_ID);
    expect(response.json()).toEqual({
      error: {
        version: "v1",
        code: "INVALID_REQUEST",
        message: "The request could not be accepted.",
        requestId: GENERATED_REQUEST_ID
      }
    });
  });
});
