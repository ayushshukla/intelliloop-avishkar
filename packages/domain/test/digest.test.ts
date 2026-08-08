import { describe, expect, it } from "vitest";

import {
  canonicalJsonDigest,
  isSha256Digest,
  parseSha256Digest,
  sha256TextDigest
} from "../src/index.js";

describe("SHA-256 digest", () => {
  it("matches the fixed UTF-8 SHA-256 vector", async () => {
    await expect(sha256TextDigest("abc")).resolves.toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("matches the fixed canonical JSON vector", async () => {
    const expected =
      "sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777";

    await expect(canonicalJsonDigest({ b: 2, a: 1 })).resolves.toBe(expected);
    await expect(canonicalJsonDigest({ a: 1, b: 2 })).resolves.toBe(expected);
  });

  it("accepts only the prefixed lowercase digest form", () => {
    const digest =
      "sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777";

    expect(isSha256Digest(digest)).toBe(true);
    expect(parseSha256Digest(digest)).toBe(digest);
    expect(() => parseSha256Digest(digest.toUpperCase())).toThrow(
      "A canonical lowercase SHA-256 digest is required."
    );
  });
});
