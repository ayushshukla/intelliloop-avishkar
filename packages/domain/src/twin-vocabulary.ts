import { canonicalizeJson, type JsonObject } from "./canonical-json.js";
import { parseSha256Digest, type Sha256Digest } from "./digest.js";
import {
  isEpistemicLabel,
  isOriginKind,
  type EpistemicLabel,
  type OriginKind
} from "./record-metadata.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type UtcTimestamp } from "./time.js";
import type { MissionId, ProjectId } from "./project.js";

export const TWIN_VOCABULARY_VERSION = "twin-vocabulary.v1";

export const TWIN_NODE_TYPES = [
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
] as const;

export const TWIN_RELATIONSHIP_TYPES = [
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
] as const;

export const TWIN_CONFIDENCE_KINDS = [
  "EXTRACTION",
  "RELATIONSHIP_MATCH"
] as const;

export const TWIN_CONFIDENCE_SEMANTICS =
  "QUALITY_ESTIMATE_NOT_TRUTH_PROBABILITY" as const;

export const MAXIMUM_TWIN_SERIALIZED_BYTES = 16_384;

export const TWIN_VOCABULARY_ERROR_CODES = [
  "TWIN_NODE_TYPE_INVALID",
  "TWIN_RELATIONSHIP_TYPE_INVALID",
  "TWIN_REVISION_INVALID",
  "TWIN_METADATA_INVALID",
  "TWIN_CONFIDENCE_INVALID",
  "TWIN_NODE_INVALID",
  "TWIN_RELATIONSHIP_INVALID",
  "TWIN_ENDPOINT_MISMATCH",
  "TWIN_CROSS_SCOPE_RELATIONSHIP",
  "TWIN_SERIALIZATION_INVALID"
] as const;

export type TwinNodeType = (typeof TWIN_NODE_TYPES)[number];
export type TwinRelationshipType = (typeof TWIN_RELATIONSHIP_TYPES)[number];
export type TwinConfidenceKind = (typeof TWIN_CONFIDENCE_KINDS)[number];
export type TwinVocabularyErrorCode =
  (typeof TWIN_VOCABULARY_ERROR_CODES)[number];
export type TwinNodeId = StableId<"TWIN_NODE">;
export type TwinRelationshipId = StableId<"TWIN_RELATIONSHIP">;

declare const twinRevisionBrand: unique symbol;
declare const twinSourceReferenceBrand: unique symbol;
declare const twinSourceRevisionBrand: unique symbol;
declare const twinExtractionMethodBrand: unique symbol;

export type TwinRevision = number & {
  readonly [twinRevisionBrand]: "TWIN_REVISION";
};
export type TwinSourceReference = string & {
  readonly [twinSourceReferenceBrand]: "TWIN_SOURCE_REFERENCE";
};
export type TwinSourceRevision = string & {
  readonly [twinSourceRevisionBrand]: "TWIN_SOURCE_REVISION";
};
export type TwinExtractionMethod = string & {
  readonly [twinExtractionMethodBrand]: "TWIN_EXTRACTION_METHOD";
};

export type TwinSourceRevisionOrDigest =
  | {
      readonly kind: "SOURCE_REVISION";
      readonly value: TwinSourceRevision;
    }
  | {
      readonly kind: "CONTENT_DIGEST";
      readonly value: Sha256Digest;
    };

export interface TwinConfidence {
  readonly kind: TwinConfidenceKind;
  readonly qualityScoreBasisPoints: number;
  readonly semantics: typeof TWIN_CONFIDENCE_SEMANTICS;
}

export interface TwinRecordMetadata {
  readonly scope: {
    readonly projectId: ProjectId;
    readonly missionId: MissionId;
  };
  readonly origin: { readonly kind: OriginKind };
  readonly sourceReference: TwinSourceReference;
  readonly sourceRevisionOrDigest: TwinSourceRevisionOrDigest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: TwinExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly confidence?: TwinConfidence;
}

export interface TwinEndpointReference {
  readonly nodeId: TwinNodeId;
  readonly revision: TwinRevision;
}

export interface TwinNode {
  readonly vocabularyVersion: typeof TWIN_VOCABULARY_VERSION;
  readonly nodeId: TwinNodeId;
  readonly revision: TwinRevision;
  readonly nodeType: TwinNodeType;
  readonly metadata: TwinRecordMetadata;
}

export interface TwinRelationship {
  readonly vocabularyVersion: typeof TWIN_VOCABULARY_VERSION;
  readonly relationshipId: TwinRelationshipId;
  readonly revision: TwinRevision;
  readonly relationshipType: TwinRelationshipType;
  readonly from: TwinEndpointReference;
  readonly to: TwinEndpointReference;
  readonly metadata: TwinRecordMetadata;
}

export interface TwinSourceRevisionInput {
  readonly kind: "SOURCE_REVISION";
  readonly value: string;
}

export interface TwinContentDigestInput {
  readonly kind: "CONTENT_DIGEST";
  readonly value: string;
}

export interface TwinConfidenceInput {
  readonly kind: TwinConfidenceKind;
  readonly qualityScoreBasisPoints: number;
  readonly semantics: typeof TWIN_CONFIDENCE_SEMANTICS;
}

export interface TwinRecordMetadataInput {
  readonly projectId: string;
  readonly missionId: string;
  readonly origin: OriginKind;
  readonly sourceReference: string;
  readonly sourceRevisionOrDigest:
    | TwinSourceRevisionInput
    | TwinContentDigestInput;
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: string;
  readonly epistemicLabel: EpistemicLabel;
  readonly confidence?: TwinConfidenceInput;
}

export interface CreateTwinNodeInput {
  readonly nodeType: TwinNodeType;
  readonly revision: number;
  readonly metadata: TwinRecordMetadataInput;
}

export interface CreateTwinRelationshipInput {
  readonly relationshipType: TwinRelationshipType;
  readonly revision: number;
  readonly from: TwinNode;
  readonly to: TwinNode;
  readonly metadata: TwinRecordMetadataInput;
}

const ERROR_MESSAGES: Readonly<Record<TwinVocabularyErrorCode, string>> =
  Object.freeze({
    TWIN_NODE_TYPE_INVALID: "Twin node type is invalid.",
    TWIN_RELATIONSHIP_TYPE_INVALID: "Twin relationship type is invalid.",
    TWIN_REVISION_INVALID: "Twin revision is invalid.",
    TWIN_METADATA_INVALID: "Twin metadata is invalid.",
    TWIN_CONFIDENCE_INVALID: "Twin confidence is invalid.",
    TWIN_NODE_INVALID: "Twin node is invalid.",
    TWIN_RELATIONSHIP_INVALID: "Twin relationship is invalid.",
    TWIN_ENDPOINT_MISMATCH: "Twin relationship endpoint is invalid.",
    TWIN_CROSS_SCOPE_RELATIONSHIP:
      "Twin relationship endpoints must share exact scope.",
    TWIN_SERIALIZATION_INVALID: "Twin serialized value is invalid."
  });

export class TwinVocabularyError extends Error {
  readonly code: TwinVocabularyErrorCode;

  constructor(code: TwinVocabularyErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "TwinVocabularyError";
    this.code = code;
  }
}

function fail(code: TwinVocabularyErrorCode): never {
  throw new TwinVocabularyError(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  code: TwinVocabularyErrorCode
): Record<string, unknown> {
  if (!isPlainObject(value)) return fail(code);
  const allowed = new Set([...required, ...optional]);
  const keys = Reflect.ownKeys(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.has(key)) ||
    keys.some((key) => {
      if (typeof key !== "string") return true;
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      );
    }) ||
    required.some(
      (key) => !Object.prototype.hasOwnProperty.call(value, key)
    )
  ) {
    return fail(code);
  }
  return value;
}

export function parseTwinNodeType(value: unknown): TwinNodeType {
  if (!TWIN_NODE_TYPES.some((nodeType) => nodeType === value)) {
    return fail("TWIN_NODE_TYPE_INVALID");
  }
  return value as TwinNodeType;
}

export function parseTwinRelationshipType(
  value: unknown
): TwinRelationshipType {
  if (
    !TWIN_RELATIONSHIP_TYPES.some(
      (relationshipType) => relationshipType === value
    )
  ) {
    return fail("TWIN_RELATIONSHIP_TYPE_INVALID");
  }
  return value as TwinRelationshipType;
}

export function parseTwinRevision(value: unknown): TwinRevision {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return fail("TWIN_REVISION_INVALID");
  }
  return value as TwinRevision;
}

export function parseTwinSourceReference(
  value: unknown
): TwinSourceReference {
  if (
    typeof value !== "string" ||
    value.length < 4 ||
    value.length > 512 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f\\@?#%]/u.test(value)
  ) {
    return fail("TWIN_METADATA_INVALID");
  }
  const match = /^([a-z][a-z0-9+.-]{1,31}):([A-Za-z0-9][A-Za-z0-9._~/-]*)$/u.exec(
    value
  );
  const payload = match?.[2];
  if (
    payload === undefined ||
    payload.length > 478 ||
    payload.includes("//") ||
    payload.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return fail("TWIN_METADATA_INVALID");
  }
  return value as TwinSourceReference;
}

export function parseTwinSourceRevision(value: unknown): TwinSourceRevision {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 256 ||
    value.trim() !== value ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/u.test(value)
  ) {
    return fail("TWIN_METADATA_INVALID");
  }
  return value as TwinSourceRevision;
}

export function parseTwinExtractionMethod(
  value: unknown
): TwinExtractionMethod {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 64 ||
    !/^[A-Z][A-Z0-9_]*$/u.test(value)
  ) {
    return fail("TWIN_METADATA_INVALID");
  }
  return value as TwinExtractionMethod;
}

function parseSourceRevisionOrDigest(
  value: unknown
): TwinSourceRevisionOrDigest {
  const record = exactObject(
    value,
    ["kind", "value"],
    [],
    "TWIN_METADATA_INVALID"
  );
  switch (record.kind) {
    case "SOURCE_REVISION":
      return Object.freeze({
        kind: record.kind,
        value: parseTwinSourceRevision(record.value)
      });
    case "CONTENT_DIGEST":
      try {
        return Object.freeze({
          kind: record.kind,
          value: parseSha256Digest(record.value)
        });
      } catch {
        return fail("TWIN_METADATA_INVALID");
      }
    default:
      return fail("TWIN_METADATA_INVALID");
  }
}

function parseConfidence(
  value: unknown,
  expectedKind: TwinConfidenceKind
): TwinConfidence {
  const record = exactObject(
    value,
    ["kind", "qualityScoreBasisPoints", "semantics"],
    [],
    "TWIN_CONFIDENCE_INVALID"
  );
  if (
    record.kind !== expectedKind ||
    !Number.isSafeInteger(record.qualityScoreBasisPoints) ||
    (record.qualityScoreBasisPoints as number) < 0 ||
    (record.qualityScoreBasisPoints as number) > 10_000 ||
    record.semantics !== TWIN_CONFIDENCE_SEMANTICS
  ) {
    return fail("TWIN_CONFIDENCE_INVALID");
  }
  return Object.freeze({
    kind: expectedKind,
    qualityScoreBasisPoints: record.qualityScoreBasisPoints as number,
    semantics: TWIN_CONFIDENCE_SEMANTICS
  });
}

function parseMetadata(
  value: unknown,
  expectedConfidenceKind: TwinConfidenceKind
): TwinRecordMetadata {
  const record = exactObject(
    value,
    [
      "scope",
      "origin",
      "sourceReference",
      "sourceRevisionOrDigest",
      "recordedAtUtc",
      "extractionMethod",
      "epistemicLabel"
    ],
    ["effectiveAtUtc", "confidence"],
    "TWIN_METADATA_INVALID"
  );
  const scope = exactObject(
    record.scope,
    ["projectId", "missionId"],
    [],
    "TWIN_METADATA_INVALID"
  );
  const origin = exactObject(
    record.origin,
    ["kind"],
    [],
    "TWIN_METADATA_INVALID"
  );
  if (!isOriginKind(origin.kind) || !isEpistemicLabel(record.epistemicLabel)) {
    return fail("TWIN_METADATA_INVALID");
  }

  try {
    const base = {
      scope: Object.freeze({
        projectId: parseStableId<"PROJECT">(scope.projectId),
        missionId: parseStableId<"MISSION">(scope.missionId)
      }),
      origin: Object.freeze({ kind: origin.kind }),
      sourceReference: parseTwinSourceReference(record.sourceReference),
      sourceRevisionOrDigest: parseSourceRevisionOrDigest(
        record.sourceRevisionOrDigest
      ),
      recordedAtUtc: parseUtcTimestamp(record.recordedAtUtc),
      extractionMethod: parseTwinExtractionMethod(record.extractionMethod),
      epistemicLabel: record.epistemicLabel,
      ...(record.effectiveAtUtc === undefined
        ? {}
        : { effectiveAtUtc: parseUtcTimestamp(record.effectiveAtUtc) }),
      ...(record.confidence === undefined
        ? {}
        : { confidence: parseConfidence(record.confidence, expectedConfidenceKind) })
    };
    return Object.freeze(base);
  } catch (error) {
    if (error instanceof TwinVocabularyError) throw error;
    return fail("TWIN_METADATA_INVALID");
  }
}

function metadataInputValue(input: TwinRecordMetadataInput): JsonObject {
  return {
    scope: { projectId: input.projectId, missionId: input.missionId },
    origin: { kind: input.origin },
    sourceReference: input.sourceReference,
    sourceRevisionOrDigest: {
      kind: input.sourceRevisionOrDigest.kind,
      value: input.sourceRevisionOrDigest.value
    },
    recordedAtUtc: input.recordedAtUtc,
    extractionMethod: input.extractionMethod,
    epistemicLabel: input.epistemicLabel,
    ...(input.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: input.effectiveAtUtc }),
    ...(input.confidence === undefined
      ? {}
      : {
          confidence: {
            kind: input.confidence.kind,
            qualityScoreBasisPoints: input.confidence.qualityScoreBasisPoints,
            semantics: input.confidence.semantics
          }
        })
  };
}

function metadataJson(metadata: TwinRecordMetadata): JsonObject {
  return {
    scope: {
      projectId: metadata.scope.projectId,
      missionId: metadata.scope.missionId
    },
    origin: { kind: metadata.origin.kind },
    sourceReference: metadata.sourceReference,
    sourceRevisionOrDigest: {
      kind: metadata.sourceRevisionOrDigest.kind,
      value: metadata.sourceRevisionOrDigest.value
    },
    recordedAtUtc: metadata.recordedAtUtc,
    extractionMethod: metadata.extractionMethod,
    epistemicLabel: metadata.epistemicLabel,
    ...(metadata.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: metadata.effectiveAtUtc }),
    ...(metadata.confidence === undefined
      ? {}
      : {
          confidence: {
            kind: metadata.confidence.kind,
            qualityScoreBasisPoints:
              metadata.confidence.qualityScoreBasisPoints,
            semantics: metadata.confidence.semantics
          }
        })
  };
}

function parseNodeObject(value: unknown): TwinNode {
  const record = exactObject(
    value,
    ["vocabularyVersion", "nodeId", "revision", "nodeType", "metadata"],
    [],
    "TWIN_NODE_INVALID"
  );
  if (record.vocabularyVersion !== TWIN_VOCABULARY_VERSION) {
    return fail("TWIN_NODE_INVALID");
  }
  try {
    return Object.freeze({
      vocabularyVersion: TWIN_VOCABULARY_VERSION,
      nodeId: parseStableId<"TWIN_NODE">(record.nodeId),
      revision: parseTwinRevision(record.revision),
      nodeType: parseTwinNodeType(record.nodeType),
      metadata: parseMetadata(record.metadata, "EXTRACTION")
    });
  } catch (error) {
    if (error instanceof TwinVocabularyError) throw error;
    return fail("TWIN_NODE_INVALID");
  }
}

function parseEndpoint(value: unknown): TwinEndpointReference {
  const record = exactObject(
    value,
    ["nodeId", "revision"],
    [],
    "TWIN_RELATIONSHIP_INVALID"
  );
  try {
    return Object.freeze({
      nodeId: parseStableId<"TWIN_NODE">(record.nodeId),
      revision: parseTwinRevision(record.revision)
    });
  } catch (error) {
    if (error instanceof TwinVocabularyError) throw error;
    return fail("TWIN_RELATIONSHIP_INVALID");
  }
}

function parseRelationshipObject(value: unknown): TwinRelationship {
  const record = exactObject(
    value,
    [
      "vocabularyVersion",
      "relationshipId",
      "revision",
      "relationshipType",
      "from",
      "to",
      "metadata"
    ],
    [],
    "TWIN_RELATIONSHIP_INVALID"
  );
  if (record.vocabularyVersion !== TWIN_VOCABULARY_VERSION) {
    return fail("TWIN_RELATIONSHIP_INVALID");
  }
  try {
    return Object.freeze({
      vocabularyVersion: TWIN_VOCABULARY_VERSION,
      relationshipId: parseStableId<"TWIN_RELATIONSHIP">(
        record.relationshipId
      ),
      revision: parseTwinRevision(record.revision),
      relationshipType: parseTwinRelationshipType(record.relationshipType),
      from: parseEndpoint(record.from),
      to: parseEndpoint(record.to),
      metadata: parseMetadata(record.metadata, "RELATIONSHIP_MATCH")
    });
  } catch (error) {
    if (error instanceof TwinVocabularyError) throw error;
    return fail("TWIN_RELATIONSHIP_INVALID");
  }
}

function assertRelationshipBinding(
  relationship: TwinRelationship,
  from: TwinNode,
  to: TwinNode
): void {
  if (
    relationship.from.nodeId !== from.nodeId ||
    relationship.from.revision !== from.revision ||
    relationship.to.nodeId !== to.nodeId ||
    relationship.to.revision !== to.revision
  ) {
    return fail("TWIN_ENDPOINT_MISMATCH");
  }
  const scopes = [
    relationship.metadata.scope,
    from.metadata.scope,
    to.metadata.scope
  ];
  const expected = scopes[0];
  if (
    expected === undefined ||
    scopes.some(
      (scope) =>
        scope.projectId !== expected.projectId ||
        scope.missionId !== expected.missionId
    )
  ) {
    return fail("TWIN_CROSS_SCOPE_RELATIONSHIP");
  }
}

function nodeJson(node: TwinNode): JsonObject {
  return {
    vocabularyVersion: node.vocabularyVersion,
    nodeId: node.nodeId,
    revision: node.revision,
    nodeType: node.nodeType,
    metadata: metadataJson(node.metadata)
  };
}

function relationshipJson(relationship: TwinRelationship): JsonObject {
  return {
    vocabularyVersion: relationship.vocabularyVersion,
    relationshipId: relationship.relationshipId,
    revision: relationship.revision,
    relationshipType: relationship.relationshipType,
    from: {
      nodeId: relationship.from.nodeId,
      revision: relationship.from.revision
    },
    to: {
      nodeId: relationship.to.nodeId,
      revision: relationship.to.revision
    },
    metadata: metadataJson(relationship.metadata)
  };
}

function parseSerializedJson(serialized: string): unknown {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    new TextEncoder().encode(serialized).byteLength >
      MAXIMUM_TWIN_SERIALIZED_BYTES
  ) {
    return fail("TWIN_SERIALIZATION_INVALID");
  }
  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    return fail("TWIN_SERIALIZATION_INVALID");
  }
}

export function createTwinNode(
  input: CreateTwinNodeInput,
  ids: StableIdGenerator
): TwinNode {
  try {
    return parseNodeObject({
      vocabularyVersion: TWIN_VOCABULARY_VERSION,
      nodeId: ids<"TWIN_NODE">(),
      revision: input.revision,
      nodeType: input.nodeType,
      metadata: metadataInputValue(input.metadata)
    });
  } catch (error) {
    if (error instanceof TwinVocabularyError) throw error;
    return fail("TWIN_NODE_INVALID");
  }
}

export function createTwinRelationship(
  input: CreateTwinRelationshipInput,
  ids: StableIdGenerator
): TwinRelationship {
  let relationship: TwinRelationship;
  try {
    relationship = parseRelationshipObject({
      vocabularyVersion: TWIN_VOCABULARY_VERSION,
      relationshipId: ids<"TWIN_RELATIONSHIP">(),
      revision: input.revision,
      relationshipType: input.relationshipType,
      from: { nodeId: input.from.nodeId, revision: input.from.revision },
      to: { nodeId: input.to.nodeId, revision: input.to.revision },
      metadata: metadataInputValue(input.metadata)
    });
  } catch (error) {
    if (error instanceof TwinVocabularyError) throw error;
    return fail("TWIN_RELATIONSHIP_INVALID");
  }
  assertTwinRelationshipInvariant(relationship, input.from, input.to);
  return relationship;
}

export function assertTwinNodeInvariant(node: TwinNode): void {
  parseNodeObject(node);
}

export function assertTwinRelationshipInvariant(
  relationship: TwinRelationship,
  from: TwinNode,
  to: TwinNode
): void {
  const parsedRelationship = parseRelationshipObject(relationship);
  const parsedFrom = parseNodeObject(from);
  const parsedTo = parseNodeObject(to);
  assertRelationshipBinding(parsedRelationship, parsedFrom, parsedTo);
}

export function serializeTwinNode(node: TwinNode): string {
  const parsed = parseNodeObject(node);
  return canonicalizeJson(nodeJson(parsed));
}

export function deserializeTwinNode(serialized: string): TwinNode {
  return parseNodeObject(parseSerializedJson(serialized));
}

export function serializeTwinRelationship(
  relationship: TwinRelationship,
  from: TwinNode,
  to: TwinNode
): string {
  const parsed = parseRelationshipObject(relationship);
  assertTwinRelationshipInvariant(parsed, from, to);
  return canonicalizeJson(relationshipJson(parsed));
}

export function deserializeTwinRelationship(
  serialized: string,
  from: TwinNode,
  to: TwinNode
): TwinRelationship {
  const relationship = parseRelationshipObject(parseSerializedJson(serialized));
  assertTwinRelationshipInvariant(relationship, from, to);
  return relationship;
}
