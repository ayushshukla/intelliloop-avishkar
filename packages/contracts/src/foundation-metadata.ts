import {
  EPISTEMIC_LABELS,
  ORIGIN_KINDS,
  canonicalizeJson,
  isEpistemicLabel,
  isOriginKind,
  parseSha256Digest,
  parseStableId,
  parseUtcTimestamp,
  type JsonObject,
  type MissionId,
  type OriginKind,
  type EpistemicLabel,
  type ProjectId,
  type Sha256Digest,
  type StableId,
  type UtcTimestamp
} from "@intelliloop/domain";

export { EPISTEMIC_LABELS, ORIGIN_KINDS };
export type { EpistemicLabel, OriginKind } from "@intelliloop/domain";
export type { MissionId, ProjectId } from "@intelliloop/domain";
export type RecordId = StableId<"RECORD">;

declare const sourceReferenceBrand: unique symbol;
declare const sourceRevisionBrand: unique symbol;
declare const extractionMethodBrand: unique symbol;

export type SourceReference = string & {
  readonly [sourceReferenceBrand]: "SOURCE_REFERENCE";
};

export type SourceRevision = string & {
  readonly [sourceRevisionBrand]: "SOURCE_REVISION";
};

export type ExtractionMethod = string & {
  readonly [extractionMethodBrand]: "EXTRACTION_METHOD";
};

export interface MissionScope {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
}

export interface SourceOrigin {
  readonly kind: OriginKind;
}

export type SourceRevisionOrDigest =
  | {
      readonly kind: "SOURCE_REVISION";
      readonly value: SourceRevision;
    }
  | {
      readonly kind: "CONTENT_DIGEST";
      readonly value: Sha256Digest;
    };

export interface FoundationRecordMetadata {
  readonly stableId: RecordId;
  readonly scope: MissionScope;
  readonly origin: SourceOrigin;
  readonly sourceReference: SourceReference;
  readonly sourceRevisionOrDigest: SourceRevisionOrDigest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: ExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
}

export interface FoundationRecordMetadataInput {
  readonly stableId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly origin: OriginKind;
  readonly sourceReference: string;
  readonly sourceRevisionOrDigest:
    | { readonly kind: "SOURCE_REVISION"; readonly value: string }
    | { readonly kind: "CONTENT_DIGEST"; readonly value: string };
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: string;
  readonly epistemicLabel: EpistemicLabel;
}

function assertNever(value: never): never {
  void value;
  throw new TypeError("Unsupported contract variant.");
}

function parseBoundedText(
  value: unknown,
  label: string,
  maximumLength: number
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new TypeError(`${label} is invalid.`);
  }
  return value;
}

export function parseSourceReference(value: unknown): SourceReference {
  return parseBoundedText(value, "Source reference", 512) as SourceReference;
}

export function parseSourceRevision(value: unknown): SourceRevision {
  const parsed = parseBoundedText(value, "Source revision", 256);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/.test(parsed)) {
    throw new TypeError("Source revision is invalid.");
  }
  return parsed as SourceRevision;
}

export function parseExtractionMethod(value: unknown): ExtractionMethod {
  const parsed = parseBoundedText(value, "Extraction method", 64);
  if (!/^[A-Z][A-Z0-9_]*$/.test(parsed)) {
    throw new TypeError("Extraction method is invalid.");
  }
  return parsed as ExtractionMethod;
}

function parseRevision(
  revision: FoundationRecordMetadataInput["sourceRevisionOrDigest"]
): SourceRevisionOrDigest {
  switch (revision.kind) {
    case "SOURCE_REVISION":
      return {
        kind: "SOURCE_REVISION",
        value: parseSourceRevision(revision.value)
      };
    case "CONTENT_DIGEST":
      return {
        kind: "CONTENT_DIGEST",
        value: parseSha256Digest(revision.value)
      };
    default:
      return assertNever(revision);
  }
}

export function createFoundationRecordMetadata(
  input: FoundationRecordMetadataInput
): FoundationRecordMetadata {
  if (!isOriginKind(input.origin)) {
    throw new TypeError("Origin kind is invalid.");
  }
  if (!isEpistemicLabel(input.epistemicLabel)) {
    throw new TypeError("Epistemic label is invalid.");
  }

  const base = {
    stableId: parseStableId<"RECORD">(input.stableId),
    scope: Object.freeze({
      projectId: parseStableId<"PROJECT">(input.projectId),
      missionId: parseStableId<"MISSION">(input.missionId)
    }),
    origin: Object.freeze({ kind: input.origin }),
    sourceReference: parseSourceReference(input.sourceReference),
    sourceRevisionOrDigest: Object.freeze(
      parseRevision(input.sourceRevisionOrDigest)
    ),
    recordedAtUtc: parseUtcTimestamp(input.recordedAtUtc),
    extractionMethod: parseExtractionMethod(input.extractionMethod),
    epistemicLabel: input.epistemicLabel
  } as const;

  if (input.effectiveAtUtc === undefined) {
    return Object.freeze(base);
  }

  return Object.freeze({
    ...base,
    effectiveAtUtc: parseUtcTimestamp(input.effectiveAtUtc)
  });
}

function serializeOrigin(origin: SourceOrigin): JsonObject {
  switch (origin.kind) {
    case "USER_INPUT":
    case "REPOSITORY_OBSERVATION":
    case "VALIDATION_RESULT":
    case "SYSTEM_DERIVATION":
    case "SYNTHETIC_FIXTURE":
    case "AI_ADVISORY":
      return { kind: origin.kind };
    default:
      return assertNever(origin.kind);
  }
}

function serializeRevision(revision: SourceRevisionOrDigest): JsonObject {
  switch (revision.kind) {
    case "SOURCE_REVISION":
      return { kind: revision.kind, value: revision.value };
    case "CONTENT_DIGEST":
      return { kind: revision.kind, value: revision.value };
    default:
      return assertNever(revision);
  }
}

export function serializeFoundationRecordMetadata(
  metadata: FoundationRecordMetadata
): JsonObject {
  const serialized: JsonObject = {
    stableId: metadata.stableId,
    scope: {
      projectId: metadata.scope.projectId,
      missionId: metadata.scope.missionId
    },
    origin: serializeOrigin(metadata.origin),
    sourceReference: metadata.sourceReference,
    sourceRevisionOrDigest: serializeRevision(
      metadata.sourceRevisionOrDigest
    ),
    recordedAtUtc: metadata.recordedAtUtc,
    extractionMethod: metadata.extractionMethod,
    epistemicLabel: metadata.epistemicLabel
  };

  if (metadata.effectiveAtUtc === undefined) {
    return serialized;
  }

  return { ...serialized, effectiveAtUtc: metadata.effectiveAtUtc };
}

export function canonicalizeFoundationRecordMetadata(
  metadata: FoundationRecordMetadata
): string {
  return canonicalizeJson(serializeFoundationRecordMetadata(metadata));
}
