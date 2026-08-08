import { canonicalJsonDigest, parseSha256Digest, type Sha256Digest } from "./digest.js";
import {
  EVIDENCE_NORMALIZATION_VERSION,
  assertPreparedEvidenceImportInvariant,
  type EvidenceImportFormat,
  type EvidenceRedactionSummary,
  type PreparedEvidenceImport
} from "./evidence-import.js";
import {
  isEpistemicLabel,
  isOriginKind,
  type EpistemicLabel,
  type OriginKind
} from "./record-metadata.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";
import type { MissionId, ProjectId } from "./project.js";

export const EVIDENCE_IMPORT_KEY_VERSION = "evidence-import-key.v1";
export const EVIDENCE_EXTRACTION_METHODS = ["DIRECT_IMPORT"] as const;
export const EVIDENCE_TIMELINE_EVENT_TYPES = ["EVIDENCE_IMPORTED"] as const;

export const EVIDENCE_SOURCE_ERROR_CODES = [
  "EVIDENCE_SOURCE_LOCATOR_INVALID",
  "EVIDENCE_SOURCE_REVISION_INVALID",
  "EVIDENCE_EXTRACTION_METHOD_INVALID",
  "EVIDENCE_PREPARED_VALUE_INVALID",
  "EVIDENCE_SOURCE_INVALID",
  "EVIDENCE_TIMELINE_EVENT_INVALID"
] as const;

export type EvidenceSourceErrorCode =
  (typeof EVIDENCE_SOURCE_ERROR_CODES)[number];
export type EvidenceExtractionMethod =
  (typeof EVIDENCE_EXTRACTION_METHODS)[number];
export type EvidenceTimelineEventType =
  (typeof EVIDENCE_TIMELINE_EVENT_TYPES)[number];
export type EvidenceSourceId = StableId<"EVIDENCE_SOURCE">;
export type EvidenceTimelineEventId = StableId<"EVIDENCE_TIMELINE_EVENT">;

declare const sourceLocatorBrand: unique symbol;
declare const sourceRevisionBrand: unique symbol;
declare const timelineSequenceBrand: unique symbol;

export type EvidenceSourceLocator = string & {
  readonly [sourceLocatorBrand]: "EVIDENCE_SOURCE_LOCATOR";
};
export type EvidenceSourceRevision = string & {
  readonly [sourceRevisionBrand]: "EVIDENCE_SOURCE_REVISION";
};
export type EvidenceTimelineSequence = number & {
  readonly [timelineSequenceBrand]: "EVIDENCE_TIMELINE_SEQUENCE";
};

export interface EvidenceSource {
  readonly entityType: "EvidenceSource";
  readonly evidenceSourceId: EvidenceSourceId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly importKey: Sha256Digest;
  readonly origin: OriginKind;
  readonly sourceLocator: EvidenceSourceLocator;
  readonly sourceRevision?: EvidenceSourceRevision;
  readonly recordedAtUtc: UtcTimestamp;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: EvidenceExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly prepared: PreparedEvidenceImport;
}

export interface EvidenceTimelineEvent {
  readonly entityType: "EvidenceTimelineEvent";
  readonly timelineEventId: EvidenceTimelineEventId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly sequence: EvidenceTimelineSequence;
  readonly eventType: EvidenceTimelineEventType;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly occurredAtUtc: UtcTimestamp;
}

export interface CreateEvidenceSourceInput {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: EvidenceExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly prepared: PreparedEvidenceImport;
}

export interface EvidenceSourceDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

const ERROR_MESSAGES: Readonly<Record<EvidenceSourceErrorCode, string>> =
  Object.freeze({
    EVIDENCE_SOURCE_LOCATOR_INVALID: "Evidence source locator is invalid.",
    EVIDENCE_SOURCE_REVISION_INVALID: "Evidence source revision is invalid.",
    EVIDENCE_EXTRACTION_METHOD_INVALID:
      "Evidence extraction method is invalid.",
    EVIDENCE_PREPARED_VALUE_INVALID: "Prepared evidence value is invalid.",
    EVIDENCE_SOURCE_INVALID: "Evidence source is invalid.",
    EVIDENCE_TIMELINE_EVENT_INVALID: "Evidence timeline event is invalid."
  });

export class EvidenceSourceError extends Error {
  readonly code: EvidenceSourceErrorCode;

  constructor(code: EvidenceSourceErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "EvidenceSourceError";
    this.code = code;
  }
}

function fail(code: EvidenceSourceErrorCode): never {
  throw new EvidenceSourceError(code);
}

export function parseEvidenceSourceLocator(
  value: unknown
): EvidenceSourceLocator {
  if (
    typeof value !== "string" ||
    value.length < 4 ||
    value.length > 512 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f\\@?#%]/u.test(value)
  ) {
    return fail("EVIDENCE_SOURCE_LOCATOR_INVALID");
  }
  const match = /^([a-z][a-z0-9+.-]{1,31}):([A-Za-z0-9][A-Za-z0-9._~/-]*)$/u.exec(
    value
  );
  if (match === null) return fail("EVIDENCE_SOURCE_LOCATOR_INVALID");
  const payload = match[2] ?? "";
  if (
    payload.length > 478 ||
    payload.includes("//") ||
    payload.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return fail("EVIDENCE_SOURCE_LOCATOR_INVALID");
  }
  return value as EvidenceSourceLocator;
}

export function parseEvidenceSourceRevision(
  value: unknown
): EvidenceSourceRevision {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 256 ||
    value.trim() !== value ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/u.test(value)
  ) {
    return fail("EVIDENCE_SOURCE_REVISION_INVALID");
  }
  return value as EvidenceSourceRevision;
}

export function parseEvidenceExtractionMethod(
  value: unknown
): EvidenceExtractionMethod {
  if (value !== "DIRECT_IMPORT") {
    return fail("EVIDENCE_EXTRACTION_METHOD_INVALID");
  }
  return value;
}

export function parseEvidenceTimelineSequence(
  value: unknown
): EvidenceTimelineSequence {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return fail("EVIDENCE_TIMELINE_EVENT_INVALID");
  }
  return value as EvidenceTimelineSequence;
}

function clonePreparedEvidence(
  prepared: PreparedEvidenceImport
): PreparedEvidenceImport {
  const ruleCounts = Object.freeze(
    prepared.redaction.ruleCounts.map((entry) =>
      Object.freeze({ rule: entry.rule, replacements: entry.replacements })
    )
  );
  const redaction: EvidenceRedactionSummary = Object.freeze({
    applied: prepared.redaction.applied,
    totalReplacements: prepared.redaction.totalReplacements,
    ruleCounts
  });
  return Object.freeze({
    normalizationVersion: prepared.normalizationVersion,
    format: prepared.format,
    inputByteCount: prepared.inputByteCount,
    normalizedByteCount: prepared.normalizedByteCount,
    normalizedContent: prepared.normalizedContent,
    contentDigest: prepared.contentDigest,
    redaction
  });
}

async function importKeyFor(input: {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly origin: OriginKind;
  readonly sourceLocator: EvidenceSourceLocator;
  readonly sourceRevision?: EvidenceSourceRevision;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: EvidenceExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly prepared: PreparedEvidenceImport;
}): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    importKeyVersion: EVIDENCE_IMPORT_KEY_VERSION,
    scope: { projectId: input.projectId, missionId: input.missionId },
    attribution: {
      origin: input.origin,
      sourceLocator: input.sourceLocator,
      sourceRevision: input.sourceRevision ?? null,
      effectiveAtUtc: input.effectiveAtUtc ?? null,
      extractionMethod: input.extractionMethod,
      epistemicLabel: input.epistemicLabel
    },
    prepared: {
      normalizationVersion: input.prepared.normalizationVersion,
      format: input.prepared.format,
      inputByteCount: input.prepared.inputByteCount,
      normalizedByteCount: input.prepared.normalizedByteCount,
      contentDigest: input.prepared.contentDigest,
      redaction: {
        applied: input.prepared.redaction.applied,
        totalReplacements: input.prepared.redaction.totalReplacements,
        ruleCounts: input.prepared.redaction.ruleCounts.map((entry) => ({
          rule: entry.rule,
          replacements: entry.replacements
        }))
      }
    }
  });
}

async function parsedInput(input: CreateEvidenceSourceInput): Promise<{
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly origin: OriginKind;
  readonly sourceLocator: EvidenceSourceLocator;
  readonly sourceRevision?: EvidenceSourceRevision;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: EvidenceExtractionMethod;
  readonly epistemicLabel: EpistemicLabel;
  readonly prepared: PreparedEvidenceImport;
}> {
  let projectId: ProjectId;
  let missionId: MissionId;
  try {
    projectId = parseStableId<"PROJECT">(input.projectId);
    missionId = parseStableId<"MISSION">(input.missionId);
  } catch {
    return fail("EVIDENCE_SOURCE_INVALID");
  }
  if (!isOriginKind(input.origin) || !isEpistemicLabel(input.epistemicLabel)) {
    return fail("EVIDENCE_SOURCE_INVALID");
  }
  try {
    await assertPreparedEvidenceImportInvariant(input.prepared);
  } catch {
    return fail("EVIDENCE_PREPARED_VALUE_INVALID");
  }
  const sourceLocator = parseEvidenceSourceLocator(input.sourceLocator);
  const sourceRevision =
    input.sourceRevision === undefined
      ? undefined
      : parseEvidenceSourceRevision(input.sourceRevision);
  let effectiveAtUtc: UtcTimestamp | undefined;
  try {
    effectiveAtUtc =
      input.effectiveAtUtc === undefined
        ? undefined
        : parseUtcTimestamp(input.effectiveAtUtc);
  } catch {
    return fail("EVIDENCE_SOURCE_INVALID");
  }
  const extractionMethod = parseEvidenceExtractionMethod(
    input.extractionMethod
  );
  const prepared = clonePreparedEvidence(input.prepared);
  return {
    projectId,
    missionId,
    origin: input.origin,
    sourceLocator,
    ...(sourceRevision === undefined ? {} : { sourceRevision }),
    ...(effectiveAtUtc === undefined ? {} : { effectiveAtUtc }),
    extractionMethod,
    epistemicLabel: input.epistemicLabel,
    prepared
  };
}

export async function createEvidenceSource(
  input: CreateEvidenceSourceInput,
  dependencies: EvidenceSourceDependencies
): Promise<EvidenceSource> {
  const parsed = await parsedInput(input);
  const importKey = await importKeyFor(parsed);
  let evidenceSourceId: EvidenceSourceId;
  let recordedAtUtc: UtcTimestamp;
  try {
    evidenceSourceId = dependencies.ids<"EVIDENCE_SOURCE">();
    recordedAtUtc = dependencies.clock.now();
  } catch {
    return fail("EVIDENCE_SOURCE_INVALID");
  }
  const source = Object.freeze({
    entityType: "EvidenceSource" as const,
    evidenceSourceId,
    ...parsed,
    importKey,
    recordedAtUtc
  });
  await assertEvidenceSourceInvariant(source);
  return source;
}

export async function assertEvidenceSourceInvariant(
  source: EvidenceSource
): Promise<void> {
  try {
    if (source.entityType !== "EvidenceSource") {
      return fail("EVIDENCE_SOURCE_INVALID");
    }
    parseStableId<"EVIDENCE_SOURCE">(source.evidenceSourceId);
    const parsed = await parsedInput({
      projectId: source.projectId,
      missionId: source.missionId,
      origin: source.origin,
      sourceLocator: source.sourceLocator,
      ...(source.sourceRevision === undefined
        ? {}
        : { sourceRevision: source.sourceRevision }),
      ...(source.effectiveAtUtc === undefined
        ? {}
        : { effectiveAtUtc: source.effectiveAtUtc }),
      extractionMethod: source.extractionMethod,
      epistemicLabel: source.epistemicLabel,
      prepared: source.prepared
    });
    parseUtcTimestamp(source.recordedAtUtc);
    parseSha256Digest(source.importKey);
    if ((await importKeyFor(parsed)) !== source.importKey) {
      return fail("EVIDENCE_SOURCE_INVALID");
    }
  } catch (error) {
    if (error instanceof EvidenceSourceError) throw error;
    return fail("EVIDENCE_SOURCE_INVALID");
  }
}

export function createEvidenceTimelineEvent(
  source: EvidenceSource,
  sequence: number,
  ids: StableIdGenerator
): EvidenceTimelineEvent {
  const event = Object.freeze({
    entityType: "EvidenceTimelineEvent" as const,
    timelineEventId: ids<"EVIDENCE_TIMELINE_EVENT">(),
    projectId: source.projectId,
    missionId: source.missionId,
    sequence: parseEvidenceTimelineSequence(sequence),
    eventType: "EVIDENCE_IMPORTED" as const,
    evidenceSourceId: source.evidenceSourceId,
    occurredAtUtc: source.recordedAtUtc
  });
  assertEvidenceTimelineEventInvariant(event, source);
  return event;
}

export function assertEvidenceTimelineEventInvariant(
  event: EvidenceTimelineEvent,
  source?: EvidenceSource
): void {
  try {
    if (
      event.entityType !== "EvidenceTimelineEvent" ||
      !EVIDENCE_TIMELINE_EVENT_TYPES.some(
        (eventType) => eventType === event.eventType
      )
    ) {
      return fail("EVIDENCE_TIMELINE_EVENT_INVALID");
    }
    parseStableId<"EVIDENCE_TIMELINE_EVENT">(event.timelineEventId);
    parseStableId<"PROJECT">(event.projectId);
    parseStableId<"MISSION">(event.missionId);
    parseStableId<"EVIDENCE_SOURCE">(event.evidenceSourceId);
    parseEvidenceTimelineSequence(event.sequence);
    parseUtcTimestamp(event.occurredAtUtc);
    if (
      source !== undefined &&
      (event.projectId !== source.projectId ||
        event.missionId !== source.missionId ||
        event.evidenceSourceId !== source.evidenceSourceId ||
        event.occurredAtUtc !== source.recordedAtUtc)
    ) {
      return fail("EVIDENCE_TIMELINE_EVENT_INVALID");
    }
  } catch (error) {
    if (error instanceof EvidenceSourceError) throw error;
    return fail("EVIDENCE_TIMELINE_EVENT_INVALID");
  }
}

export function preparedEvidenceFromStorage(input: {
  readonly normalizationVersion: string;
  readonly format: EvidenceImportFormat;
  readonly inputByteCount: number;
  readonly normalizedByteCount: number;
  readonly normalizedContent: string;
  readonly contentDigest: string;
  readonly redaction: EvidenceRedactionSummary;
}): PreparedEvidenceImport {
  if (input.normalizationVersion !== EVIDENCE_NORMALIZATION_VERSION) {
    return fail("EVIDENCE_PREPARED_VALUE_INVALID");
  }
  return clonePreparedEvidence({
    normalizationVersion: EVIDENCE_NORMALIZATION_VERSION,
    format: input.format,
    inputByteCount: input.inputByteCount,
    normalizedByteCount: input.normalizedByteCount,
    normalizedContent: input.normalizedContent,
    contentDigest: parseSha256Digest(input.contentDigest),
    redaction: input.redaction
  });
}
