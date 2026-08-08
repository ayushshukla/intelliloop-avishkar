import { describe, expect, it } from "vitest";

import {
  ORIGIN_KINDS,
  TWIN_CONFIDENCE_SEMANTICS,
  TWIN_NODE_TYPES,
  TWIN_RELATIONSHIP_TYPES,
  TWIN_VOCABULARY_VERSION,
  TwinVocabularyError,
  assertTwinNodeInvariant,
  createStableIdGenerator,
  createTwinNode,
  createTwinRelationship,
  deserializeTwinNode,
  deserializeTwinRelationship,
  serializeTwinNode,
  serializeTwinRelationship,
  type TwinNode,
  type TwinRecordMetadataInput,
  type TwinRelationshipType
} from "../src/index.js";

const PROJECT = "00000000-0000-4000-8000-000000000001";
const OTHER_PROJECT = "00000000-0000-4000-8000-000000000002";
const MISSION = "00000000-0000-4000-8000-000000000011";
const OTHER_MISSION = "00000000-0000-4000-8000-000000000012";
const DIGEST = `sha256:${"a".repeat(64)}`;

function ids(start = 100) {
  let sequence = start;
  return createStableIdGenerator(() => {
    const suffix = String(sequence).padStart(12, "0");
    sequence += 1;
    return `00000000-0000-4000-8000-${suffix}`;
  });
}

function metadata(
  overrides: Partial<TwinRecordMetadataInput> = {},
  includeConfidence = true
): TwinRecordMetadataInput {
  const base: TwinRecordMetadataInput = {
    projectId: PROJECT,
    missionId: MISSION,
    origin: "SYSTEM_DERIVATION",
    sourceReference: "projection:mission-11/twin",
    sourceRevisionOrDigest: { kind: "CONTENT_DIGEST", value: DIGEST },
    recordedAtUtc: "2026-08-05T05:30:00.000Z",
    effectiveAtUtc: "2026-08-05T05:00:00.000Z",
    extractionMethod: "DETERMINISTIC_PROJECTION",
    epistemicLabel: "FACT",
    ...overrides
  };
  return includeConfidence
    ? {
        ...base,
        confidence: overrides.confidence ?? {
          kind: "EXTRACTION",
          qualityScoreBasisPoints: 9100,
          semantics: TWIN_CONFIDENCE_SEMANTICS
        }
      }
    : base;
}

function node(
  idSource = ids(),
  overrides: Partial<TwinRecordMetadataInput> = {},
  revision = 1
): TwinNode {
  return createTwinNode(
    { nodeType: "Claim", revision, metadata: metadata(overrides) },
    idSource
  );
}

function relationshipMetadata(
  overrides: Partial<TwinRecordMetadataInput> = {}
): TwinRecordMetadataInput {
  return metadata({
    extractionMethod: "DETERMINISTIC_RELATIONSHIP_MATCH",
    confidence: {
      kind: "RELATIONSHIP_MATCH",
      qualityScoreBasisPoints: 8750,
      semantics: TWIN_CONFIDENCE_SEMANTICS
    },
    ...overrides
  });
}

function expectCode(operation: () => unknown, code: string): void {
  try {
    operation();
    throw new Error("Expected operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(TwinVocabularyError);
    expect((error as TwinVocabularyError).code).toBe(code);
  }
}

describe("Twin node and relationship vocabulary", () => {
  it("freezes the exact ten-node and thirteen-relationship vocabulary", () => {
    expect(TWIN_NODE_TYPES).toEqual([
      "Project",
      "ChangeMission",
      "EvidenceSource",
      "Claim",
      "SoftwareAsset",
      "GitSnapshot",
      "ValidationResult",
      "ReconciliationFinding",
      "ReleaseAssessment",
      "ReleasePassport"
    ]);
    expect(TWIN_RELATIONSHIP_TYPES).toEqual([
      "SCOPED_TO",
      "EXTRACTED_FROM",
      "ASSERTS",
      "CONCERNS",
      "IMPLEMENTS",
      "AFFECTS",
      "DEPENDS_ON",
      "VALIDATED_BY",
      "CONTRADICTS",
      "SUPERSEDES",
      "DERIVED_FROM",
      "BOUND_TO",
      "BLOCKS"
    ]);
    expect(new Set(TWIN_NODE_TYPES).size).toBe(10);
    expect(new Set(TWIN_RELATIONSHIP_TYPES).size).toBe(13);
  });

  it("round-trips every node type through canonical exhaustive serialization", () => {
    const idSource = ids();
    for (const [index, nodeType] of TWIN_NODE_TYPES.entries()) {
      const value = createTwinNode(
        {
          nodeType,
          revision: index + 1,
          metadata: metadata({
            origin: ORIGIN_KINDS[index % ORIGIN_KINDS.length] ?? "USER_INPUT",
            epistemicLabel: index % 2 === 0 ? "FACT" : "INFERENCE"
          })
        },
        idSource
      );
      const serialized = serializeTwinNode(value);
      const restored = deserializeTwinNode(serialized);
      expect(restored).toEqual(value);
      expect(serializeTwinNode(restored)).toBe(serialized);
      expect(restored.vocabularyVersion).toBe(TWIN_VOCABULARY_VERSION);
      expect(Object.isFrozen(restored)).toBe(true);
      expect(Object.isFrozen(restored.metadata)).toBe(true);
      expect(Object.isFrozen(restored.metadata.scope)).toBe(true);
      expect(Object.isFrozen(restored.metadata.sourceRevisionOrDigest)).toBe(
        true
      );
    }
  });

  it("round-trips every relationship type while binding exact node revisions", () => {
    const idSource = ids(200);
    const from = node(idSource, {}, 2);
    const to = node(idSource, {}, 7);
    for (const [index, relationshipType] of TWIN_RELATIONSHIP_TYPES.entries()) {
      const relationship = createTwinRelationship(
        {
          relationshipType,
          revision: index + 1,
          from,
          to,
          metadata: relationshipMetadata()
        },
        idSource
      );
      const serialized = serializeTwinRelationship(relationship, from, to);
      const restored = deserializeTwinRelationship(serialized, from, to);
      expect(restored).toEqual(relationship);
      expect(serializeTwinRelationship(restored, from, to)).toBe(serialized);
      expect(restored.from).toEqual({ nodeId: from.nodeId, revision: 2 });
      expect(restored.to).toEqual({ nodeId: to.nodeId, revision: 7 });
    }
  });

  it("supports both explicit source revision and content digest attribution", () => {
    const idSource = ids(300);
    const revised = createTwinNode(
      {
        nodeType: "EvidenceSource",
        revision: 1,
        metadata: metadata(
          {
            sourceRevisionOrDigest: {
              kind: "SOURCE_REVISION",
              value: "git:0123456789abcdef"
            }
          },
          false
        )
      },
      idSource
    );
    const digested = node(idSource);
    expect(revised.metadata.sourceRevisionOrDigest.kind).toBe("SOURCE_REVISION");
    expect(digested.metadata.sourceRevisionOrDigest.kind).toBe("CONTENT_DIGEST");
  });

  it("rejects every relationship type across project or mission scope", () => {
    const idSource = ids(400);
    const from = node(idSource);
    const otherProject = node(idSource, { projectId: OTHER_PROJECT });
    const otherMission = node(idSource, { missionId: OTHER_MISSION });
    const attempt = (relationshipType: TwinRelationshipType, to: TwinNode) =>
      createTwinRelationship(
        {
          relationshipType,
          revision: 1,
          from,
          to,
          metadata: relationshipMetadata()
        },
        idSource
      );

    for (const relationshipType of TWIN_RELATIONSHIP_TYPES) {
      expectCode(
        () => attempt(relationshipType, otherProject),
        "TWIN_CROSS_SCOPE_RELATIONSHIP"
      );
      expectCode(
        () => attempt(relationshipType, otherMission),
        "TWIN_CROSS_SCOPE_RELATIONSHIP"
      );
    }
  });

  it("rejects relationship metadata whose scope differs from its endpoints", () => {
    const idSource = ids(500);
    const from = node(idSource);
    const to = node(idSource);
    expectCode(
      () =>
        createTwinRelationship(
          {
            relationshipType: "CONCERNS",
            revision: 1,
            from,
            to,
            metadata: relationshipMetadata({ missionId: OTHER_MISSION })
          },
          idSource
        ),
      "TWIN_CROSS_SCOPE_RELATIONSHIP"
    );
  });

  it("rejects endpoint identity or revision substitution on serialization", () => {
    const idSource = ids(600);
    const from = node(idSource, {}, 1);
    const to = node(idSource, {}, 2);
    const substitute = node(idSource, {}, 2);
    const relationship = createTwinRelationship(
      {
        relationshipType: "DERIVED_FROM",
        revision: 1,
        from,
        to,
        metadata: relationshipMetadata()
      },
      idSource
    );
    expectCode(
      () => serializeTwinRelationship(relationship, from, substitute),
      "TWIN_ENDPOINT_MISMATCH"
    );
  });

  it("limits confidence to extraction quality for nodes and match quality for edges", () => {
    const idSource = ids(700);
    expectCode(
      () =>
        createTwinNode(
          {
            nodeType: "Claim",
            revision: 1,
            metadata: metadata({
              confidence: {
                kind: "RELATIONSHIP_MATCH",
                qualityScoreBasisPoints: 5000,
                semantics: TWIN_CONFIDENCE_SEMANTICS
              }
            })
          },
          idSource
        ),
      "TWIN_CONFIDENCE_INVALID"
    );
    expectCode(
      () =>
        createTwinNode(
          {
            nodeType: "Claim",
            revision: 1,
            metadata: metadata({
              confidence: {
                kind: "EXTRACTION",
                qualityScoreBasisPoints: 10_001,
                semantics: TWIN_CONFIDENCE_SEMANTICS
              }
            })
          },
          idSource
        ),
      "TWIN_CONFIDENCE_INVALID"
    );
    const valid = node(idSource);
    expect(serializeTwinNode(valid)).toContain(
      `\"semantics\":\"${TWIN_CONFIDENCE_SEMANTICS}\"`
    );
    expect(serializeTwinNode(valid)).not.toContain("truthProbability");

    const to = node(idSource);
    const unscoredRelationship = createTwinRelationship(
      {
        relationshipType: "CONCERNS",
        revision: 1,
        from: valid,
        to,
        metadata: metadata(
          { extractionMethod: "DETERMINISTIC_RELATIONSHIP_MATCH" },
          false
        )
      },
      idSource
    );
    expect(unscoredRelationship.metadata).not.toHaveProperty("confidence");
  });

  it("rejects malformed attribution variants with stable metadata errors", () => {
    const invalidMetadata: readonly Partial<TwinRecordMetadataInput>[] = [
      { origin: "UNKNOWN" as "USER_INPUT" },
      { epistemicLabel: "LIKELY" as "FACT" },
      { recordedAtUtc: "2026-08-05" },
      { effectiveAtUtc: "not-a-time" },
      { extractionMethod: "model extraction" },
      { sourceReference: "source:item/../private" },
      {
        sourceRevisionOrDigest: {
          kind: "SOURCE_REVISION",
          value: " invalid"
        }
      },
      {
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: "sha256:invalid"
        }
      }
    ];

    for (const invalid of invalidMetadata) {
      expectCode(
        () =>
          createTwinNode(
            { nodeType: "Claim", revision: 1, metadata: metadata(invalid) },
            ids(750)
          ),
        "TWIN_METADATA_INVALID"
      );
    }
  });

  it("fails closed for unknown fields, variants, versions and revisions", () => {
    const valid = node(ids(800));
    const parsed = JSON.parse(serializeTwinNode(valid)) as Record<string, unknown>;
    parsed["truthProbability"] = 0.99;
    expectCode(
      () => deserializeTwinNode(JSON.stringify(parsed)),
      "TWIN_NODE_INVALID"
    );
    expectCode(
      () =>
        deserializeTwinNode(
          serializeTwinNode(valid).replace(
            TWIN_VOCABULARY_VERSION,
            "twin-vocabulary.v2"
          )
        ),
      "TWIN_NODE_INVALID"
    );
    expectCode(
      () => createTwinNode({ nodeType: "Claim", revision: 0, metadata: metadata() }, ids()),
      "TWIN_REVISION_INVALID"
    );
    expectCode(
      () =>
        createTwinNode(
          {
            nodeType: "Unknown" as "Claim",
            revision: 1,
            metadata: metadata()
          },
          ids()
        ),
      "TWIN_NODE_TYPE_INVALID"
    );

    const idSource = ids(850);
    const from = node(idSource);
    const to = node(idSource);
    expectCode(
      () =>
        createTwinRelationship(
          {
            relationshipType: "UNKNOWN" as "CONCERNS",
            revision: 1,
            from,
            to,
            metadata: relationshipMetadata()
          },
          idSource
        ),
      "TWIN_RELATIONSHIP_TYPE_INVALID"
    );
    expectCode(
      () => deserializeTwinNode(`{\"padding\":\"${"x".repeat(16_384)}\"}`),
      "TWIN_SERIALIZATION_INVALID"
    );
  });

  it("rejects non-logical source references and unsafe metadata without echoing", () => {
    const sentinel = "C:\\Users\\private\\INTELLILOOP_TWIN_SENTINEL";
    try {
      createTwinNode(
        {
          nodeType: "Claim",
          revision: 1,
          metadata: metadata({ sourceReference: sentinel })
        },
        ids(900)
      );
      throw new Error("Expected operation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(TwinVocabularyError);
      expect((error as Error).message).not.toContain(sentinel);
    }
  });

  it("detects mutation-shaped values through public invariant checks", () => {
    const valid = node(ids(950));
    const malformed = {
      ...valid,
      metadata: { ...valid.metadata, effectiveAtUtc: "not-a-time" }
    } as TwinNode;
    expectCode(
      () => assertTwinNodeInvariant(malformed),
      "TWIN_METADATA_INVALID"
    );

    const accessorShaped = { ...valid };
    Object.defineProperty(accessorShaped, "nodeId", {
      enumerable: true,
      get: () => valid.nodeId
    });
    expectCode(
      () => assertTwinNodeInvariant(accessorShaped as TwinNode),
      "TWIN_NODE_INVALID"
    );
  });
});
