import { describe, expect, it } from "vitest";

import { canonicalizeJson } from "../src/index.js";

describe("canonical JSON", () => {
  it("sorts object keys recursively and normalizes JSON numbers", () => {
    expect(
      canonicalizeJson({
        z: null,
        a: [3, { b: true, a: "evidence" }],
        n: -0
      })
    ).toBe('{"a":[3,{"a":"evidence","b":true}],"n":0,"z":null}');
  });

  it("produces the same bytes for equivalent insertion orders", () => {
    expect(canonicalizeJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(canonicalizeJson({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it("retains ECMAScript JSON number serialization", () => {
    expect(canonicalizeJson([-0, 1e30, 0.002, 333333333.3333333])).toBe(
      "[0,1e+30,0.002,333333333.3333333]"
    );
  });

  it.each([
    ["undefined", undefined],
    ["non-finite number", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
    ["date object", new Date("2026-08-04T00:00:00.000Z")],
    ["function", () => undefined]
  ])("rejects %s", (_label, value) => {
    expect(() => canonicalizeJson(value)).toThrow(
      "A finite, acyclic JSON value is required."
    );
  });

  it("rejects cycles, sparse arrays and accessors", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    const sparse = new Array<unknown>(1);

    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => "must-not-run"
    });

    expect(() => canonicalizeJson(cyclic)).toThrow(TypeError);
    expect(() => canonicalizeJson(sparse)).toThrow(TypeError);
    expect(() => canonicalizeJson(accessor)).toThrow(TypeError);
  });
});
