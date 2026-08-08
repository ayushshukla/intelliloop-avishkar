import { describe, expect, it } from "vitest";

import {
  API_ERROR_CODES,
  createApiErrorResponse,
  isApiErrorResponse
} from "../src/index.js";

describe("API error contract", () => {
  it.each(API_ERROR_CODES)("constructs the stable %s response", (code) => {
    const response = createApiErrorResponse(
      code,
      "123e4567-e89b-42d3-a456-426614174000"
    );

    expect(isApiErrorResponse(response)).toBe(true);
    expect(response.error).toMatchObject({
      version: "v1",
      code,
      requestId: "123e4567-e89b-42d3-a456-426614174000"
    });
  });

  it("rejects added fields and unstable messages", () => {
    expect(
      isApiErrorResponse({
        ...createApiErrorResponse(
          "NOT_FOUND",
          "123e4567-e89b-42d3-a456-426614174000"
        ),
        path: "C:/private/example"
      })
    ).toBe(false);

    expect(
      isApiErrorResponse({
        error: {
          version: "v1",
          code: "NOT_FOUND",
          message: "A variable message",
          requestId: "123e4567-e89b-42d3-a456-426614174000"
        }
      })
    ).toBe(false);
  });
});
