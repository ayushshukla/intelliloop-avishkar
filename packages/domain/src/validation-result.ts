import {
  assertEvidenceSourceInvariant,
  type EvidenceSource,
  type EvidenceSourceId,
  type EvidenceSourceLocator,
  type EvidenceSourceRevision
} from "./evidence-source.js";
import {
  assertGitSnapshotInvariant,
  type GitSnapshot,
  type GitSnapshotId
} from "./git-snapshot.js";
import { canonicalJsonDigest, parseSha256Digest, type Sha256Digest } from "./digest.js";
import type { EpistemicLabel, OriginKind } from "./record-metadata.js";
import type { MissionId, ProjectId } from "./project.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";

export const VALIDATION_RESULT_DIGEST_VERSION = "validation-result-digest.v1";
export const VALIDATION_RESULT_EXTRACTION_METHOD =
  "STRUCTURED_VALIDATION_INTAKE" as const;
export const VALIDATION_RESULT_STATUSES = [
  "PASSED",
  "FAILED",
  "INCONCLUSIVE"
] as const;
export const VALIDATION_RESULT_ERROR_CODES = [
  "VALIDATION_RESULT_SCOPE_INVALID",
  "VALIDATION_RESULT_SOURCE_INVALID",
  "VALIDATION_RESULT_SNAPSHOT_INVALID",
  "VALIDATION_RESULT_KEY_INVALID",
  "VALIDATION_RESULT_STATUS_INVALID",
  "VALIDATION_RESULT_TIME_INVALID",
  "VALIDATION_RESULT_INVALID"
] as const;

export type ValidationResultStatus =
  (typeof VALIDATION_RESULT_STATUSES)[number];
export type ValidationResultErrorCode =
  (typeof VALIDATION_RESULT_ERROR_CODES)[number];
export type ValidationResultId = StableId<"VALIDATION_RESULT">;

declare const validationKeyBrand: unique symbol;
export type ValidationKey = string & {
  readonly [validationKeyBrand]: "VALIDATION_KEY";
};

export interface ValidationResult {
  readonly entityType: "ValidationResult";
  readonly validationResultId: ValidationResultId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly snapshotId: GitSnapshotId;
  readonly validationKey: ValidationKey;
  readonly status: ValidationResultStatus;
  readonly resultDigest: Sha256Digest;
  readonly origin: OriginKind;
  readonly sourceLocator: EvidenceSourceLocator;
  readonly sourceRevision?: EvidenceSourceRevision;
  readonly sourceContentDigest: Sha256Digest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly extractionMethod: typeof VALIDATION_RESULT_EXTRACTION_METHOD;
  readonly epistemicLabel: EpistemicLabel;
}

export interface CreateValidationResultInput {
  readonly validationKey: string;
  readonly status: ValidationResultStatus;
  readonly epistemicLabel: EpistemicLabel;
  readonly effectiveAtUtc?: string;
}

export interface ValidationResultDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

const ERROR_MESSAGES: Readonly<Record<ValidationResultErrorCode, string>> =
  Object.freeze({
    VALIDATION_RESULT_SCOPE_INVALID: "Validation result scope is invalid.",
    VALIDATION_RESULT_SOURCE_INVALID: "Validation result source is invalid.",
    VALIDATION_RESULT_SNAPSHOT_INVALID:
      "Validation result snapshot is invalid.",
    VALIDATION_RESULT_KEY_INVALID: "Validation result key is invalid.",
    VALIDATION_RESULT_STATUS_INVALID: "Validation result status is invalid.",
    VALIDATION_RESULT_TIME_INVALID: "Validation result time is invalid.",
    VALIDATION_RESULT_INVALID: "Validation result is invalid."
  });

export class ValidationResultError extends Error {
  readonly code: ValidationResultErrorCode;

  constructor(code: ValidationResultErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ValidationResultError";
    this.code = code;
  }
}

function fail(code: ValidationResultErrorCode): never {
  throw new ValidationResultError(code);
}

export function parseValidationKey(value: unknown): ValidationKey {
  if (
    typeof value !== "string" ||
    value.length < 3 ||
    value.length > 256 ||
    value.trim() !== value ||
    !/^[a-z0-9][a-z0-9._:/-]*$/u.test(value) ||
    value.includes("//") ||
    value.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return fail("VALIDATION_RESULT_KEY_INVALID");
  }
  return value as ValidationKey;
}

function parseStatus(value: unknown): ValidationResultStatus {
  if (!VALIDATION_RESULT_STATUSES.some((status) => status === value)) {
    return fail("VALIDATION_RESULT_STATUS_INVALID");
  }
  return value as ValidationResultStatus;
}

async function resultDigestFor(input: {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly snapshotId: GitSnapshotId;
  readonly validationKey: ValidationKey;
  readonly status: ValidationResultStatus;
  readonly sourceContentDigest: Sha256Digest;
  readonly effectiveAtUtc?: UtcTimestamp;
  readonly epistemicLabel: EpistemicLabel;
}): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    digestVersion: VALIDATION_RESULT_DIGEST_VERSION,
    scope: { projectId: input.projectId, missionId: input.missionId },
    evidenceSourceId: input.evidenceSourceId,
    snapshotId: input.snapshotId,
    validationKey: input.validationKey,
    status: input.status,
    sourceContentDigest: input.sourceContentDigest,
    effectiveAtUtc: input.effectiveAtUtc ?? null,
    extractionMethod: VALIDATION_RESULT_EXTRACTION_METHOD,
    epistemicLabel: input.epistemicLabel
  });
}

function assertScope(source: EvidenceSource, snapshot: GitSnapshot): void {
  if (
    source.projectId !== snapshot.projectId ||
    source.missionId !== snapshot.missionId
  ) {
    return fail("VALIDATION_RESULT_SCOPE_INVALID");
  }
  if (
    source.origin !== "VALIDATION_RESULT" &&
    source.origin !== "SYNTHETIC_FIXTURE"
  ) {
    return fail("VALIDATION_RESULT_SOURCE_INVALID");
  }
}

export async function createValidationResult(
  input: CreateValidationResultInput,
  source: EvidenceSource,
  snapshot: GitSnapshot,
  dependencies: ValidationResultDependencies
): Promise<ValidationResult> {
  try {
    await assertEvidenceSourceInvariant(source);
  } catch {
    return fail("VALIDATION_RESULT_SOURCE_INVALID");
  }
  try {
    assertGitSnapshotInvariant(snapshot);
  } catch {
    return fail("VALIDATION_RESULT_SNAPSHOT_INVALID");
  }
  assertScope(source, snapshot);
  const validationKey = parseValidationKey(input.validationKey);
  const status = parseStatus(input.status);
  if (input.epistemicLabel !== "FACT" && input.epistemicLabel !== "INFERENCE") {
    return fail("VALIDATION_RESULT_INVALID");
  }

  let effectiveAtUtc: UtcTimestamp | undefined;
  let recordedAtUtc: UtcTimestamp;
  let validationResultId: ValidationResultId;
  try {
    effectiveAtUtc =
      input.effectiveAtUtc === undefined
        ? source.effectiveAtUtc
        : parseUtcTimestamp(input.effectiveAtUtc);
    recordedAtUtc = dependencies.clock.now();
    validationResultId = dependencies.ids<"VALIDATION_RESULT">();
  } catch {
    return fail("VALIDATION_RESULT_INVALID");
  }
  if (
    recordedAtUtc < source.recordedAtUtc ||
    recordedAtUtc < snapshot.capturedAtUtc ||
    (effectiveAtUtc !== undefined && effectiveAtUtc > recordedAtUtc)
  ) {
    return fail("VALIDATION_RESULT_TIME_INVALID");
  }

  const digestInput = {
    projectId: source.projectId,
    missionId: source.missionId,
    evidenceSourceId: source.evidenceSourceId,
    snapshotId: snapshot.snapshotId,
    validationKey,
    status,
    sourceContentDigest: source.prepared.contentDigest,
    ...(effectiveAtUtc === undefined ? {} : { effectiveAtUtc }),
    epistemicLabel: input.epistemicLabel
  };
  const result = Object.freeze({
    entityType: "ValidationResult" as const,
    validationResultId,
    projectId: source.projectId,
    missionId: source.missionId,
    evidenceSourceId: source.evidenceSourceId,
    snapshotId: snapshot.snapshotId,
    validationKey,
    status,
    resultDigest: await resultDigestFor(digestInput),
    origin: source.origin,
    sourceLocator: source.sourceLocator,
    ...(source.sourceRevision === undefined
      ? {}
      : { sourceRevision: source.sourceRevision }),
    sourceContentDigest: source.prepared.contentDigest,
    recordedAtUtc,
    ...(effectiveAtUtc === undefined ? {} : { effectiveAtUtc }),
    extractionMethod: VALIDATION_RESULT_EXTRACTION_METHOD,
    epistemicLabel: input.epistemicLabel
  });
  await assertValidationResultInvariant(result, source, snapshot);
  return result;
}

export async function assertValidationResultInvariant(
  result: ValidationResult,
  source: EvidenceSource,
  snapshot: GitSnapshot
): Promise<void> {
  try {
    await assertEvidenceSourceInvariant(source);
    assertGitSnapshotInvariant(snapshot);
    assertScope(source, snapshot);
    if (
      result.entityType !== "ValidationResult" ||
      parseStableId<"VALIDATION_RESULT">(result.validationResultId) !==
        result.validationResultId ||
      result.projectId !== source.projectId ||
      result.missionId !== source.missionId ||
      result.evidenceSourceId !== source.evidenceSourceId ||
      result.snapshotId !== snapshot.snapshotId ||
      parseValidationKey(result.validationKey) !== result.validationKey ||
      parseStatus(result.status) !== result.status ||
      result.origin !== source.origin ||
      result.sourceLocator !== source.sourceLocator ||
      result.sourceRevision !== source.sourceRevision ||
      result.sourceContentDigest !== source.prepared.contentDigest ||
      parseUtcTimestamp(result.recordedAtUtc) !== result.recordedAtUtc ||
      result.recordedAtUtc < source.recordedAtUtc ||
      result.recordedAtUtc < snapshot.capturedAtUtc ||
      result.extractionMethod !== VALIDATION_RESULT_EXTRACTION_METHOD ||
      (result.epistemicLabel !== "FACT" &&
        result.epistemicLabel !== "INFERENCE")
    ) {
      return fail("VALIDATION_RESULT_INVALID");
    }
    const effectiveAtUtc =
      result.effectiveAtUtc === undefined
        ? undefined
        : parseUtcTimestamp(result.effectiveAtUtc);
    if (effectiveAtUtc !== undefined && effectiveAtUtc > result.recordedAtUtc) {
      return fail("VALIDATION_RESULT_TIME_INVALID");
    }
    parseSha256Digest(result.resultDigest);
    const expected = await resultDigestFor({
      projectId: result.projectId,
      missionId: result.missionId,
      evidenceSourceId: result.evidenceSourceId,
      snapshotId: result.snapshotId,
      validationKey: result.validationKey,
      status: result.status,
      sourceContentDigest: result.sourceContentDigest,
      ...(effectiveAtUtc === undefined ? {} : { effectiveAtUtc }),
      epistemicLabel: result.epistemicLabel
    });
    if (expected !== result.resultDigest) {
      return fail("VALIDATION_RESULT_INVALID");
    }
  } catch (error) {
    if (error instanceof ValidationResultError) throw error;
    return fail("VALIDATION_RESULT_INVALID");
  }
}
