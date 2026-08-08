import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  sha256TextDigest,
  type Sha256Digest
} from "./digest.js";
import {
  assertEvidenceSourceInvariant,
  type EvidenceSource,
  type EvidenceSourceId,
  type EvidenceSourceLocator,
  type EvidenceSourceRevision
} from "./evidence-source.js";
import {
  isEpistemicLabel,
  type EpistemicLabel,
  type OriginKind
} from "./record-metadata.js";
import type { MissionId, ProjectId } from "./project.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";

export const CLAIM_NORMALIZATION_VERSION = "claim-normalization.v1";
export const CLAIM_COMPARISON_KEY_VERSION = "claim-comparison-key.v1";
export const CLAIM_APPLICABILITY_KEY_VERSION = "claim-applicability-key.v1";
export const CLAIM_DIGEST_VERSION = "claim-digest.v1";
export const CLAIM_IMPORT_KEY_VERSION = "claim-import-key.v1";
export const CLAIM_SUPERSESSION_DIGEST_VERSION = "claim-supersession-digest.v1";
export const CLAIM_EXTRACTION_METHODS = ["MANUAL_STRUCTURED_INTAKE"] as const;
export const MAXIMUM_CLAIM_TERM_BYTES = 256;
export const MAXIMUM_CLAIM_RAW_TEXT_BYTES = 4_096;
export const MAXIMUM_CLAIM_VALUE_BYTES = 16_384;
export const MAXIMUM_CLAIM_APPLICABILITY_BYTES = 4_096;
export const MAXIMUM_CLAIM_VALUE_DEPTH = 16;
export const MAXIMUM_CLAIM_VALUE_NODES = 256;
export const MAXIMUM_CLAIM_APPLICABILITY_DIMENSIONS = 16;

export const CLAIM_ERROR_CODES = [
  "CLAIM_SCOPE_INVALID",
  "CLAIM_SOURCE_INVALID",
  "CLAIM_TERM_INVALID",
  "CLAIM_RAW_TEXT_INVALID",
  "CLAIM_VALUE_INVALID",
  "CLAIM_APPLICABILITY_INVALID",
  "CLAIM_EXTRACTION_METHOD_INVALID",
  "CLAIM_SUPERSESSION_INVALID",
  "CLAIM_INVALID"
] as const;

export type ClaimErrorCode = (typeof CLAIM_ERROR_CODES)[number];
export type ClaimExtractionMethod = (typeof CLAIM_EXTRACTION_METHODS)[number];
export type ClaimId = StableId<"CLAIM">;
export type ClaimSupersessionId = StableId<"CLAIM_SUPERSESSION">;

declare const claimTermBrand: unique symbol;
export type ClaimTerm = string & { readonly [claimTermBrand]: "CLAIM_TERM" };

export interface ClaimApplicabilityDimension {
  readonly dimension: ClaimTerm;
  readonly value: ClaimTerm;
}

export interface ClaimApplicability {
  readonly dimensions: readonly ClaimApplicabilityDimension[];
  readonly effectiveFromUtc?: UtcTimestamp;
  readonly effectiveUntilUtc?: UtcTimestamp;
}

export interface Claim {
  readonly entityType: "Claim";
  readonly claimId: ClaimId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly importKey: Sha256Digest;
  readonly claimDigest: Sha256Digest;
  readonly normalizationVersion: typeof CLAIM_NORMALIZATION_VERSION;
  readonly origin: OriginKind;
  readonly sourceLocator: EvidenceSourceLocator;
  readonly sourceRevision?: EvidenceSourceRevision;
  readonly sourceContentDigest: Sha256Digest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: ClaimExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly rawText: string;
  readonly subject: ClaimTerm;
  readonly predicate: ClaimTerm;
  readonly comparisonKey: Sha256Digest;
  readonly value: JsonValue;
  readonly applicability: ClaimApplicability;
  readonly applicabilityKey: Sha256Digest;
  readonly supersedesClaimId?: ClaimId;
}

export interface ClaimSupersession {
  readonly entityType: "ClaimSupersession";
  readonly relationshipType: "SUPERSEDES";
  readonly claimSupersessionId: ClaimSupersessionId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly predecessorClaimId: ClaimId;
  readonly successorClaimId: ClaimId;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly comparisonKey: Sha256Digest;
  readonly applicabilityKey: Sha256Digest;
  readonly origin: OriginKind;
  readonly sourceLocator: EvidenceSourceLocator;
  readonly sourceRevision?: EvidenceSourceRevision;
  readonly sourceContentDigest: Sha256Digest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: ClaimExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly linkDigest: Sha256Digest;
}

export interface ClaimApplicabilityInput {
  readonly dimensions?: readonly {
    readonly dimension: string;
    readonly value: string;
  }[];
  readonly effectiveFromUtc?: string;
  readonly effectiveUntilUtc?: string;
}

export interface CreateClaimInput {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly rawText: string;
  readonly subject: string;
  readonly predicate: string;
  readonly value: unknown;
  readonly applicability?: ClaimApplicabilityInput;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: ClaimExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly supersedesClaimId?: ClaimId;
}

export interface ClaimDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

export interface CreateClaimResult {
  readonly claim: Claim;
  readonly supersession?: ClaimSupersession;
}

const ERROR_MESSAGES: Readonly<Record<ClaimErrorCode, string>> = Object.freeze({
  CLAIM_SCOPE_INVALID: "Claim scope is invalid.",
  CLAIM_SOURCE_INVALID: "Claim evidence source is invalid.",
  CLAIM_TERM_INVALID: "Claim subject or predicate is invalid.",
  CLAIM_RAW_TEXT_INVALID: "Claim source excerpt is invalid.",
  CLAIM_VALUE_INVALID: "Claim value is invalid.",
  CLAIM_APPLICABILITY_INVALID: "Claim applicability is invalid.",
  CLAIM_EXTRACTION_METHOD_INVALID: "Claim extraction method is invalid.",
  CLAIM_SUPERSESSION_INVALID: "Claim supersession is invalid.",
  CLAIM_INVALID: "Claim is invalid."
});

export class ClaimError extends Error {
  readonly code: ClaimErrorCode;

  constructor(code: ClaimErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ClaimError";
    this.code = code;
  }
}

function fail(code: ClaimErrorCode): never {
  throw new ClaimError(code);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function normalizeClaimTerm(value: unknown): ClaimTerm {
  if (typeof value !== "string") return fail("CLAIM_TERM_INVALID");
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, ".")
    .replace(/^\.+|\.+$/gu, "");
  if (
    normalized.length === 0 ||
    byteLength(normalized) > MAXIMUM_CLAIM_TERM_BYTES ||
    !/^[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*$/u.test(normalized)
  ) {
    return fail("CLAIM_TERM_INVALID");
  }
  return normalized as ClaimTerm;
}

function parseExtractionMethod(value: unknown): ClaimExtractionMethod {
  if (value !== "MANUAL_STRUCTURED_INTAKE") {
    return fail("CLAIM_EXTRACTION_METHOD_INVALID");
  }
  return value;
}

function freezeJson(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeJson(entry))) as JsonValue;
  }
  const output: Record<string, JsonValue> = Object.create(null);
  for (const [key, entry] of Object.entries(value)) output[key] = freezeJson(entry);
  return Object.freeze(output);
}

function inspectJsonBounds(
  value: JsonValue,
  depth: number,
  state: { nodes: number }
): void {
  state.nodes += 1;
  if (
    depth > MAXIMUM_CLAIM_VALUE_DEPTH ||
    state.nodes > MAXIMUM_CLAIM_VALUE_NODES
  ) {
    return fail("CLAIM_VALUE_INVALID");
  }
  if (value === null || typeof value !== "object") return;
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) inspectJsonBounds(child, depth + 1, state);
}

export function normalizeClaimValue(value: unknown): JsonValue {
  let canonical: string;
  try {
    canonical = canonicalizeJson(value);
  } catch {
    return fail("CLAIM_VALUE_INVALID");
  }
  if (byteLength(canonical) > MAXIMUM_CLAIM_VALUE_BYTES) {
    return fail("CLAIM_VALUE_INVALID");
  }
  const parsed = JSON.parse(canonical) as JsonValue;
  inspectJsonBounds(parsed, 1, { nodes: 0 });
  return freezeJson(parsed);
}

export function normalizeClaimApplicability(
  input: ClaimApplicabilityInput | undefined
): ClaimApplicability {
  try {
    const dimensions = (input?.dimensions ?? []).map((entry) =>
      Object.freeze({
        dimension: normalizeClaimTerm(entry.dimension),
        value: normalizeClaimTerm(entry.value)
      })
    );
    if (dimensions.length > MAXIMUM_CLAIM_APPLICABILITY_DIMENSIONS) {
      return fail("CLAIM_APPLICABILITY_INVALID");
    }
    dimensions.sort((left, right) =>
      left.dimension === right.dimension
        ? left.value.localeCompare(right.value, "en-US")
        : left.dimension.localeCompare(right.dimension, "en-US")
    );
    if (
      dimensions.some(
        (entry, index) =>
          index > 0 && entry.dimension === dimensions[index - 1]?.dimension
      )
    ) {
      return fail("CLAIM_APPLICABILITY_INVALID");
    }
    const effectiveFromUtc =
      input?.effectiveFromUtc === undefined
        ? undefined
        : parseUtcTimestamp(input.effectiveFromUtc);
    const effectiveUntilUtc =
      input?.effectiveUntilUtc === undefined
        ? undefined
        : parseUtcTimestamp(input.effectiveUntilUtc);
    if (
      effectiveFromUtc !== undefined &&
      effectiveUntilUtc !== undefined &&
      effectiveFromUtc >= effectiveUntilUtc
    ) {
      return fail("CLAIM_APPLICABILITY_INVALID");
    }
    const result = Object.freeze({
      dimensions: Object.freeze(dimensions),
      ...(effectiveFromUtc === undefined ? {} : { effectiveFromUtc }),
      ...(effectiveUntilUtc === undefined ? {} : { effectiveUntilUtc })
    });
    if (
      byteLength(canonicalizeJson(applicabilityDocument(result))) >
      MAXIMUM_CLAIM_APPLICABILITY_BYTES
    ) {
      return fail("CLAIM_APPLICABILITY_INVALID");
    }
    return result;
  } catch (error) {
    if (error instanceof ClaimError) throw error;
    return fail("CLAIM_APPLICABILITY_INVALID");
  }
}

function applicabilityDocument(applicability: ClaimApplicability): JsonValue {
  return {
    dimensions: applicability.dimensions.map((entry) => ({
      dimension: entry.dimension,
      value: entry.value
    })),
    effectiveFromUtc: applicability.effectiveFromUtc ?? null,
    effectiveUntilUtc: applicability.effectiveUntilUtc ?? null
  };
}

async function derivedClaimFields(input: {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly source: EvidenceSource;
  readonly rawText: string;
  readonly subject: ClaimTerm;
  readonly predicate: ClaimTerm;
  readonly value: JsonValue;
  readonly applicability: ClaimApplicability;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: ClaimExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly supersedesClaimId?: ClaimId;
}): Promise<{
  readonly comparisonKey: Sha256Digest;
  readonly applicabilityKey: Sha256Digest;
  readonly claimDigest: Sha256Digest;
  readonly importKey: Sha256Digest;
}> {
  const comparisonKey = await canonicalJsonDigest({
    version: CLAIM_COMPARISON_KEY_VERSION,
    subject: input.subject,
    predicate: input.predicate
  });
  const applicabilityKey = await canonicalJsonDigest({
    version: CLAIM_APPLICABILITY_KEY_VERSION,
    applicability: applicabilityDocument(input.applicability)
  });
  const claimDigest = await canonicalJsonDigest({
    version: CLAIM_DIGEST_VERSION,
    normalizationVersion: CLAIM_NORMALIZATION_VERSION,
    source: {
      evidenceSourceId: input.source.evidenceSourceId,
      sourceContentDigest: input.source.prepared.contentDigest,
      rawTextDigest: await sha256TextDigest(input.rawText)
    },
    statement: {
      subject: input.subject,
      predicate: input.predicate,
      value: input.value,
      comparisonKey,
      applicability: applicabilityDocument(input.applicability),
      applicabilityKey
    },
    effectiveAtUtc: input.effectiveAtUtc ?? null,
    extractionMethod: input.extractionMethod,
    epistemicLabel: input.epistemicLabel
  });
  const importKey = await canonicalJsonDigest({
    version: CLAIM_IMPORT_KEY_VERSION,
    scope: { projectId: input.projectId, missionId: input.missionId },
    claimDigest,
    supersedesClaimId: input.supersedesClaimId ?? null
  });
  return { comparisonKey, applicabilityKey, claimDigest, importKey };
}

async function parseInput(
  input: CreateClaimInput,
  source: EvidenceSource
): Promise<{
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly source: EvidenceSource;
  readonly rawText: string;
  readonly subject: ClaimTerm;
  readonly predicate: ClaimTerm;
  readonly value: JsonValue;
  readonly applicability: ClaimApplicability;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: ClaimExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly supersedesClaimId?: ClaimId;
}> {
  try {
    await assertEvidenceSourceInvariant(source);
    const projectId = parseStableId<"PROJECT">(input.projectId);
    const missionId = parseStableId<"MISSION">(input.missionId);
    const evidenceSourceId = parseStableId<"EVIDENCE_SOURCE">(
      input.evidenceSourceId
    );
    if (
      projectId !== source.projectId ||
      missionId !== source.missionId ||
      evidenceSourceId !== source.evidenceSourceId
    ) {
      return fail("CLAIM_SCOPE_INVALID");
    }
    if (
      typeof input.rawText !== "string" ||
      input.rawText.length === 0 ||
      byteLength(input.rawText) > MAXIMUM_CLAIM_RAW_TEXT_BYTES ||
      !source.prepared.normalizedContent.includes(input.rawText)
    ) {
      return fail("CLAIM_RAW_TEXT_INVALID");
    }
    if (!isEpistemicLabel(input.epistemicLabel)) return fail("CLAIM_INVALID");
    const effectiveAtUtc =
      input.effectiveAtUtc === undefined
        ? undefined
        : parseUtcTimestamp(input.effectiveAtUtc);
    const supersedesClaimId =
      input.supersedesClaimId === undefined
        ? undefined
        : parseStableId<"CLAIM">(input.supersedesClaimId);
    return {
      projectId,
      missionId,
      source,
      rawText: input.rawText,
      subject: normalizeClaimTerm(input.subject),
      predicate: normalizeClaimTerm(input.predicate),
      value: normalizeClaimValue(input.value),
      applicability: normalizeClaimApplicability(input.applicability),
      ...(effectiveAtUtc === undefined ? {} : { effectiveAtUtc }),
      extractionMethod: parseExtractionMethod(input.extractionMethod),
      epistemicLabel: input.epistemicLabel,
      ...(supersedesClaimId === undefined ? {} : { supersedesClaimId })
    };
  } catch (error) {
    if (error instanceof ClaimError) throw error;
    return fail("CLAIM_SOURCE_INVALID");
  }
}

function assertPredecessor(
  parsed: Awaited<ReturnType<typeof parseInput>>,
  predecessor: Claim | undefined,
  recordedAtUtc: UtcTimestamp,
  derived: Awaited<ReturnType<typeof derivedClaimFields>>
): void {
  if ((parsed.supersedesClaimId === undefined) !== (predecessor === undefined)) {
    return fail("CLAIM_SUPERSESSION_INVALID");
  }
  if (predecessor === undefined) return;
  if (
    parsed.supersedesClaimId !== predecessor.claimId ||
    predecessor.projectId !== parsed.projectId ||
    predecessor.missionId !== parsed.missionId ||
    predecessor.recordedAtUtc > recordedAtUtc ||
    predecessor.comparisonKey !== derived.comparisonKey ||
    predecessor.applicabilityKey !== derived.applicabilityKey
  ) {
    return fail("CLAIM_SUPERSESSION_INVALID");
  }
}

async function supersessionDigest(
  claim: Claim,
  predecessorClaimId: ClaimId
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: CLAIM_SUPERSESSION_DIGEST_VERSION,
    relationshipType: "SUPERSEDES",
    scope: { projectId: claim.projectId, missionId: claim.missionId },
    predecessorClaimId,
    successorClaimId: claim.claimId,
    evidenceSourceId: claim.evidenceSourceId,
    comparisonKey: claim.comparisonKey,
    applicabilityKey: claim.applicabilityKey,
    sourceContentDigest: claim.sourceContentDigest,
    recordedAtUtc: claim.recordedAtUtc
  });
}

function claimObject(input: {
  readonly claimId: ClaimId;
  readonly parsed: Awaited<ReturnType<typeof parseInput>>;
  readonly recordedAtUtc: UtcTimestamp;
  readonly derived: Awaited<ReturnType<typeof derivedClaimFields>>;
}): Claim {
  const { parsed } = input;
  return Object.freeze({
    entityType: "Claim" as const,
    claimId: input.claimId,
    projectId: parsed.projectId,
    missionId: parsed.missionId,
    evidenceSourceId: parsed.source.evidenceSourceId,
    importKey: input.derived.importKey,
    claimDigest: input.derived.claimDigest,
    normalizationVersion: CLAIM_NORMALIZATION_VERSION,
    origin: parsed.source.origin,
    sourceLocator: parsed.source.sourceLocator,
    ...(parsed.source.sourceRevision === undefined
      ? {}
      : { sourceRevision: parsed.source.sourceRevision }),
    sourceContentDigest: parsed.source.prepared.contentDigest,
    recordedAtUtc: input.recordedAtUtc,
    ...(parsed.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: parsed.effectiveAtUtc }),
    extractionMethod: parsed.extractionMethod,
    epistemicLabel: parsed.epistemicLabel,
    rawText: parsed.rawText,
    subject: parsed.subject,
    predicate: parsed.predicate,
    comparisonKey: input.derived.comparisonKey,
    value: parsed.value,
    applicability: parsed.applicability,
    applicabilityKey: input.derived.applicabilityKey,
    ...(parsed.supersedesClaimId === undefined
      ? {}
      : { supersedesClaimId: parsed.supersedesClaimId })
  });
}

async function supersessionObject(
  claimSupersessionId: ClaimSupersessionId,
  claim: Claim,
  predecessorClaimId: ClaimId
): Promise<ClaimSupersession> {
  return Object.freeze({
    entityType: "ClaimSupersession" as const,
    relationshipType: "SUPERSEDES" as const,
    claimSupersessionId,
    projectId: claim.projectId,
    missionId: claim.missionId,
    predecessorClaimId,
    successorClaimId: claim.claimId,
    evidenceSourceId: claim.evidenceSourceId,
    comparisonKey: claim.comparisonKey,
    applicabilityKey: claim.applicabilityKey,
    origin: claim.origin,
    sourceLocator: claim.sourceLocator,
    ...(claim.sourceRevision === undefined
      ? {}
      : { sourceRevision: claim.sourceRevision }),
    sourceContentDigest: claim.sourceContentDigest,
    recordedAtUtc: claim.recordedAtUtc,
    ...(claim.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: claim.effectiveAtUtc }),
    extractionMethod: claim.extractionMethod,
    epistemicLabel: claim.epistemicLabel,
    linkDigest: await supersessionDigest(claim, predecessorClaimId)
  });
}

export async function createClaim(
  input: CreateClaimInput,
  source: EvidenceSource,
  predecessor: Claim | undefined,
  dependencies: ClaimDependencies
): Promise<CreateClaimResult> {
  const parsed = await parseInput(input, source);
  const derived = await derivedClaimFields(parsed);
  let claimId: ClaimId;
  let recordedAtUtc: UtcTimestamp;
  try {
    claimId = dependencies.ids<"CLAIM">();
    recordedAtUtc = dependencies.clock.now();
  } catch {
    return fail("CLAIM_INVALID");
  }
  assertPredecessor(parsed, predecessor, recordedAtUtc, derived);
  if (recordedAtUtc < source.recordedAtUtc) return fail("CLAIM_INVALID");
  const claim = claimObject({ claimId, parsed, recordedAtUtc, derived });
  if (predecessor !== undefined && claim.claimId === predecessor.claimId) {
    return fail("CLAIM_SUPERSESSION_INVALID");
  }
  if (predecessor === undefined) {
    await assertClaimInvariant(claim, source);
    return Object.freeze({ claim });
  }
  let claimSupersessionId: ClaimSupersessionId;
  try {
    claimSupersessionId = dependencies.ids<"CLAIM_SUPERSESSION">();
  } catch {
    return fail("CLAIM_INVALID");
  }
  const supersession = await supersessionObject(
    claimSupersessionId,
    claim,
    predecessor.claimId
  );
  await assertClaimInvariant(claim, source, predecessor);
  await assertClaimSupersessionInvariant(supersession, claim, predecessor);
  return Object.freeze({ claim, supersession });
}

export async function assertClaimInvariant(
  claim: Claim,
  source: EvidenceSource,
  predecessor?: Claim
): Promise<void> {
  try {
    if (
      claim.entityType !== "Claim" ||
      claim.normalizationVersion !== CLAIM_NORMALIZATION_VERSION
    ) {
      return fail("CLAIM_INVALID");
    }
    const parsed = await parseInput(
      {
        projectId: claim.projectId,
        missionId: claim.missionId,
        evidenceSourceId: claim.evidenceSourceId,
        rawText: claim.rawText,
        subject: claim.subject,
        predicate: claim.predicate,
        value: claim.value,
        applicability: {
          dimensions: claim.applicability.dimensions,
          ...(claim.applicability.effectiveFromUtc === undefined
            ? {}
            : { effectiveFromUtc: claim.applicability.effectiveFromUtc }),
          ...(claim.applicability.effectiveUntilUtc === undefined
            ? {}
            : { effectiveUntilUtc: claim.applicability.effectiveUntilUtc })
        },
        ...(claim.effectiveAtUtc === undefined
          ? {}
          : { effectiveAtUtc: claim.effectiveAtUtc }),
        extractionMethod: claim.extractionMethod,
        epistemicLabel: claim.epistemicLabel,
        ...(claim.supersedesClaimId === undefined
          ? {}
          : { supersedesClaimId: claim.supersedesClaimId })
      },
      source
    );
    const derived = await derivedClaimFields(parsed);
    parseStableId<"CLAIM">(claim.claimId);
    parseUtcTimestamp(claim.recordedAtUtc);
    parseSha256Digest(claim.importKey);
    parseSha256Digest(claim.claimDigest);
    parseSha256Digest(claim.comparisonKey);
    parseSha256Digest(claim.applicabilityKey);
    parseSha256Digest(claim.sourceContentDigest);
    assertPredecessor(parsed, predecessor, claim.recordedAtUtc, derived);
    if (claim.recordedAtUtc < source.recordedAtUtc) {
      return fail("CLAIM_INVALID");
    }
    if (predecessor !== undefined && claim.claimId === predecessor.claimId) {
      return fail("CLAIM_SUPERSESSION_INVALID");
    }
    if (
      claim.origin !== source.origin ||
      claim.sourceLocator !== source.sourceLocator ||
      claim.sourceRevision !== source.sourceRevision ||
      claim.sourceContentDigest !== source.prepared.contentDigest ||
      canonicalizeJson(claim.value) !== canonicalizeJson(parsed.value) ||
      canonicalizeJson(applicabilityDocument(claim.applicability)) !==
        canonicalizeJson(applicabilityDocument(parsed.applicability)) ||
      claim.comparisonKey !== derived.comparisonKey ||
      claim.applicabilityKey !== derived.applicabilityKey ||
      claim.claimDigest !== derived.claimDigest ||
      claim.importKey !== derived.importKey
    ) {
      return fail("CLAIM_INVALID");
    }
  } catch (error) {
    if (error instanceof ClaimError) throw error;
    return fail("CLAIM_INVALID");
  }
}

export async function assertClaimSupersessionInvariant(
  link: ClaimSupersession,
  successor: Claim,
  predecessor: Claim
): Promise<void> {
  try {
    if (
      link.entityType !== "ClaimSupersession" ||
      link.relationshipType !== "SUPERSEDES" ||
      link.predecessorClaimId === link.successorClaimId
    ) {
      return fail("CLAIM_SUPERSESSION_INVALID");
    }
    parseStableId<"CLAIM_SUPERSESSION">(link.claimSupersessionId);
    parseSha256Digest(link.linkDigest);
    if (
      successor.supersedesClaimId !== predecessor.claimId ||
      link.predecessorClaimId !== predecessor.claimId ||
      link.successorClaimId !== successor.claimId ||
      link.projectId !== successor.projectId ||
      link.missionId !== successor.missionId ||
      predecessor.projectId !== successor.projectId ||
      predecessor.missionId !== successor.missionId ||
      link.evidenceSourceId !== successor.evidenceSourceId ||
      link.comparisonKey !== successor.comparisonKey ||
      link.applicabilityKey !== successor.applicabilityKey ||
      predecessor.comparisonKey !== successor.comparisonKey ||
      predecessor.applicabilityKey !== successor.applicabilityKey ||
      link.origin !== successor.origin ||
      link.sourceLocator !== successor.sourceLocator ||
      link.sourceRevision !== successor.sourceRevision ||
      link.sourceContentDigest !== successor.sourceContentDigest ||
      link.recordedAtUtc !== successor.recordedAtUtc ||
      link.effectiveAtUtc !== successor.effectiveAtUtc ||
      link.extractionMethod !== successor.extractionMethod ||
      link.epistemicLabel !== successor.epistemicLabel ||
      link.linkDigest !==
        (await supersessionDigest(successor, predecessor.claimId))
    ) {
      return fail("CLAIM_SUPERSESSION_INVALID");
    }
  } catch (error) {
    if (error instanceof ClaimError) throw error;
    return fail("CLAIM_SUPERSESSION_INVALID");
  }
}

export async function claimFromStorage(
  stored: Claim,
  source: EvidenceSource,
  predecessor?: Claim
): Promise<Claim> {
  await assertClaimInvariant(stored, source, predecessor);
  return Object.freeze({
    ...stored,
    value: normalizeClaimValue(stored.value),
    applicability: normalizeClaimApplicability({
      dimensions: stored.applicability.dimensions,
      ...(stored.applicability.effectiveFromUtc === undefined
        ? {}
        : { effectiveFromUtc: stored.applicability.effectiveFromUtc }),
      ...(stored.applicability.effectiveUntilUtc === undefined
        ? {}
        : { effectiveUntilUtc: stored.applicability.effectiveUntilUtc })
    })
  });
}
