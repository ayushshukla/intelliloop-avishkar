import { describe, expect, it } from "vitest";

import {
  createHealthResponse,
  isHealthResponse
} from "../src/index.js";

describe("health contract", () => {
  it("constructs the exact foundation-only response", () => {
    const response = createHealthResponse("2026-08-04T00:00:00.000Z");

    expect(response).toEqual({
      service: "intelliloop-api",
      apiVersion: "v1",
      status: "ok",
      serverTimeUtc: "2026-08-04T00:00:00.000Z",
      productMode: "FOUNDATION_ONLY",
      externalAi: "OFF"
    });
    expect(isHealthResponse(response)).toBe(true);
  });

  it("rejects an operational response that claims more than foundation state", () => {
    expect(
      isHealthResponse({
        service: "intelliloop-api",
        apiVersion: "v1",
        status: "ready",
        serverTimeUtc: "2026-08-04T00:00:00.000Z",
        productMode: "FOUNDATION_ONLY",
        externalAi: "OFF"
      })
    ).toBe(false);
  });
});
