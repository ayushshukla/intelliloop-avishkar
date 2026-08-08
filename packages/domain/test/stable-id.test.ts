import { describe, expect, it } from "vitest";

import {
  createStableIdGenerator,
  isStableId,
  parseStableId
} from "../src/index.js";

describe("stable IDs", () => {
  it("parses UUID v4 values into one lowercase representation", () => {
    const input = "123E4567-E89B-42D3-A456-426614174000";

    expect(isStableId(input)).toBe(true);
    expect(parseStableId<"PROJECT">(input)).toBe(
      "123e4567-e89b-42d3-a456-426614174000"
    );
  });

  it("uses an injected source deterministically", () => {
    const values = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002"
    ];
    const generator = createStableIdGenerator(() => {
      const value = values.shift();
      if (value === undefined) throw new Error("Test source exhausted.");
      return value;
    });

    expect(generator<"PROJECT">()).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
    expect(generator<"MISSION">()).toBe(
      "00000000-0000-4000-8000-000000000002"
    );
  });

  it.each([
    "",
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-42d3-7456-426614174000",
    "not-a-uuid"
  ])("rejects the invalid value without echoing it", (value) => {
    expect(() => parseStableId(value)).toThrow(
      "A canonical UUID v4 stable ID is required."
    );
    try {
      parseStableId(value);
    } catch (error) {
      expect(String(error)).not.toContain(value || "not-present");
    }
  });
});
