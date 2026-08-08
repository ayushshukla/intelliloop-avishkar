import { describe, expect, it } from "vitest";

import {
  EPISTEMIC_LABELS,
  ORIGIN_KINDS,
  canonicalizeFoundationRecordMetadata,
  createFoundationRecordMetadata,
  serializeFoundationRecordMetadata,
  type FoundationRecordMetadataInput,
  type OriginKind
} from "../src/index.js";

const CONTENT_DIGEST =
  "sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777";

const BASE_INPUT: FoundationRecordMetadataInput = {
  stableId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  missionId: "00000000-0000-4000-8000-000000000003",
  origin: "USER_INPUT",
  sourceReference: "requirement:checkout-v1",
  sourceRevisionOrDigest: {
    kind: "SOURCE_REVISION",
    value: "rev:0001"
  },
  recordedAtUtc: "2026-08-04T00:00:00.000Z",
  effectiveAtUtc: "2026-08-03T12:00:00.000Z",
  extractionMethod: "USER_AUTHORED",
  epistemicLabel: "FACT"
};

describe("foundation record metadata", () => {
  it("constructs scoped, attributed and revisioned metadata", () => {
    const metadata = createFoundationRecordMetadata(BASE_INPUT);

    expect(metadata).toEqual({
      stableId: "00000000-0000-4000-8000-000000000001",
      scope: {
        projectId: "00000000-0000-4000-8000-000000000002",
        missionId: "00000000-0000-4000-8000-000000000003"
      },
      origin: { kind: "USER_INPUT" },
      sourceReference: "requirement:checkout-v1",
      sourceRevisionOrDigest: {
        kind: "SOURCE_REVISION",
        value: "rev:0001"
      },
      recordedAtUtc: "2026-08-04T00:00:00.000Z",
      effectiveAtUtc: "2026-08-03T12:00:00.000Z",
      extractionMethod: "USER_AUTHORED",
      epistemicLabel: "FACT"
    });
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(metadata.scope)).toBe(true);
  });

  it.each(ORIGIN_KINDS)("serializes origin %s exhaustively", (origin) => {
    const serialized = serializeFoundationRecordMetadata(
      createFoundationRecordMetadata({ ...BASE_INPUT, origin })
    );

    expect(serialized.origin).toEqual({ kind: origin });
  });

  it.each(EPISTEMIC_LABELS)(
    "retains epistemic label %s without inferring truth",
    (epistemicLabel) => {
      const serialized = serializeFoundationRecordMetadata(
        createFoundationRecordMetadata({ ...BASE_INPUT, epistemicLabel })
      );

      expect(serialized.epistemicLabel).toBe(epistemicLabel);
    }
  );

  it("serializes both revision variants and omits an absent effective time", () => {
    const { effectiveAtUtc, ...withoutEffectiveTime } = BASE_INPUT;
    void effectiveAtUtc;
    const revision = serializeFoundationRecordMetadata(
      createFoundationRecordMetadata(BASE_INPUT)
    );
    const digest = serializeFoundationRecordMetadata(
      createFoundationRecordMetadata({
        ...withoutEffectiveTime,
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: CONTENT_DIGEST
        }
      })
    );

    expect(revision.sourceRevisionOrDigest).toEqual({
      kind: "SOURCE_REVISION",
      value: "rev:0001"
    });
    expect(digest.sourceRevisionOrDigest).toEqual({
      kind: "CONTENT_DIGEST",
      value: CONTENT_DIGEST
    });
    expect(digest).not.toHaveProperty("effectiveAtUtc");
  });

  it("has one fixed canonical serialization", () => {
    expect(
      canonicalizeFoundationRecordMetadata(
        createFoundationRecordMetadata(BASE_INPUT)
      )
    ).toBe(
      '{"effectiveAtUtc":"2026-08-03T12:00:00.000Z","epistemicLabel":"FACT","extractionMethod":"USER_AUTHORED","origin":{"kind":"USER_INPUT"},"recordedAtUtc":"2026-08-04T00:00:00.000Z","scope":{"missionId":"00000000-0000-4000-8000-000000000003","projectId":"00000000-0000-4000-8000-000000000002"},"sourceReference":"requirement:checkout-v1","sourceRevisionOrDigest":{"kind":"SOURCE_REVISION","value":"rev:0001"},"stableId":"00000000-0000-4000-8000-000000000001"}'
    );
  });

  it.each([
    ["origin", { ...BASE_INPUT, origin: "UNKNOWN" as OriginKind }],
    [
      "stable ID",
      { ...BASE_INPUT, stableId: "not-a-uuid" }
    ],
    [
      "timestamp",
      { ...BASE_INPUT, recordedAtUtc: "2026-08-04T00:00:00Z" }
    ],
    [
      "source reference",
      { ...BASE_INPUT, sourceReference: " leading-space" }
    ],
    [
      "extraction method",
      { ...BASE_INPUT, extractionMethod: "user-authored" }
    ]
  ] as const)("rejects invalid %s", (_label, input) => {
    expect(() =>
      createFoundationRecordMetadata(input as FoundationRecordMetadataInput)
    ).toThrow(TypeError);
  });
});
