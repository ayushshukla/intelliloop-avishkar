import { describe, expect, it } from "vitest";

import {
  createClock,
  formatUtcTimestamp,
  parseUtcTimestamp
} from "../src/index.js";

describe("formatUtcTimestamp", () => {
  it("returns a deterministic UTC representation", () => {
    expect(
      formatUtcTimestamp(new Date("2026-08-04T05:30:00.000+05:30"))
    ).toBe("2026-08-04T00:00:00.000Z");
  });

  it("fails closed for an invalid date", () => {
    expect(() => formatUtcTimestamp(new Date(Number.NaN))).toThrow(
      "A valid date is required."
    );
  });

  it("reads deterministic UTC timestamps from an injected clock source", () => {
    const instants = [
      new Date("2026-08-04T00:00:00.000Z"),
      new Date("2026-08-04T00:00:01.000Z")
    ];
    const clock = createClock(() => {
      const instant = instants.shift();
      if (instant === undefined) throw new Error("Test clock exhausted.");
      return instant;
    });

    expect(clock.now()).toBe("2026-08-04T00:00:00.000Z");
    expect(clock.now()).toBe("2026-08-04T00:00:01.000Z");
  });

  it.each([
    "2026-08-04T00:00:00Z",
    "2026-08-04T00:00:00.000+00:00",
    "not-a-time"
  ])("rejects the non-canonical timestamp %s", (value) => {
    expect(() => parseUtcTimestamp(value)).toThrow(
      "A canonical UTC timestamp is required."
    );
  });
});
