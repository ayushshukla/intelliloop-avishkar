import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const openApps: ReturnType<typeof buildApp>[] = [];
const GENERATED_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe("GET /api/v1/health", () => {
  it("returns the shared foundation-only health contract", async () => {
    const app = buildApp({
      clock: () => new Date("2026-08-04T00:00:00.000Z"),
      requestIdFactory: () => GENERATED_REQUEST_ID
    });
    openApps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(
      /^application\/json(?:;|$)/
    );
    expect(response.headers["x-request-id"]).toBe(GENERATED_REQUEST_ID);
    expect(response.json()).toEqual({
      service: "intelliloop-api",
      apiVersion: "v1",
      status: "ok",
      serverTimeUtc: "2026-08-04T00:00:00.000Z",
      productMode: "FOUNDATION_ONLY",
      externalAi: "OFF"
    });
  });

  it("returns a stable error instead of exposing unrelated product routes", async () => {
    const app = buildApp({ requestIdFactory: () => GENERATED_REQUEST_ID });
    openApps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/not-implemented"
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["x-request-id"]).toBe(GENERATED_REQUEST_ID);
    expect(response.json()).toEqual({
      error: {
        version: "v1",
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        requestId: GENERATED_REQUEST_ID
      }
    });
  });
});
