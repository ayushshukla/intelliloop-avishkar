import { canonicalizeJson } from "./canonical-json.js";

declare const sha256DigestBrand: unique symbol;

export type Sha256Digest = string & {
  readonly [sha256DigestBrand]: "SHA256";
};

const SHA256_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && SHA256_DIGEST_PATTERN.test(value);
}

export function parseSha256Digest(value: unknown): Sha256Digest {
  if (!isSha256Digest(value)) {
    throw new TypeError("A canonical lowercase SHA-256 digest is required.");
  }
  return value;
}

export async function sha256TextDigest(value: string): Promise<Sha256Digest> {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return parseSha256Digest(`sha256:${hex}`);
}

export async function canonicalJsonDigest(
  value: unknown
): Promise<Sha256Digest> {
  return sha256TextDigest(canonicalizeJson(value));
}
