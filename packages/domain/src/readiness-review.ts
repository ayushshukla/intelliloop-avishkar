import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import { canonicalJsonDigest, parseSha256Digest, type Sha256Digest } from "./digest.js";
import { assertGitSnapshotInvariant, type GitSnapshot, type GitSnapshotId } from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  assertReconciliationImpactRevisionInvariant,
  type ReconciliationImpactRevision
} from "./reconciliation-impact-revision.js";
import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";

export const READINESS_REVIEW_VERSION = "readiness-review.v1" as const;
export const READINESS_REVIEW_DIGEST_VERSION = "readiness-review-digest.v1" as const;
export const READINESS_REVIEW_ACTOR_KINDS = ["HUMAN", "AI_ADVISORY"] as const;
export const MAXIMUM_READINESS_REVIEW_SERIALIZED_BYTES = 16_384;

export type ReadinessReviewActorKind = (typeof READINESS_REVIEW_ACTOR_KINDS)[number];
export type ReadinessReviewId = StableId<"READINESS_REVIEW">;

export const READINESS_REVIEW_ERROR_CODES = [
  "READINESS_REVIEW_INPUT_INVALID",
  "READINESS_REVIEW_SCOPE_INVALID",
  "READINESS_REVIEW_TIME_INVALID",
  "READINESS_REVIEW_SERIALIZATION_INVALID",
  "READINESS_REVIEW_INTEGRITY_INVALID"
] as const;

export type ReadinessReviewErrorCode = (typeof READINESS_REVIEW_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<ReadinessReviewErrorCode, string>> = Object.freeze({
  READINESS_REVIEW_INPUT_INVALID: "Readiness review input is invalid.",
  READINESS_REVIEW_SCOPE_INVALID: "Readiness review scope is invalid.",
  READINESS_REVIEW_TIME_INVALID: "Readiness review time is invalid.",
  READINESS_REVIEW_SERIALIZATION_INVALID: "Readiness review serialization is invalid.",
  READINESS_REVIEW_INTEGRITY_INVALID: "Readiness review integrity is invalid."
});

export class ReadinessReviewError extends Error {
  readonly code: ReadinessReviewErrorCode;

  constructor(code: ReadinessReviewErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReadinessReviewError";
    this.code = code;
  }
}

export interface ReadinessReviewRecord {
  readonly version: typeof READINESS_REVIEW_VERSION;
  readonly digestVersion: typeof READINESS_REVIEW_DIGEST_VERSION;
  readonly reviewId: ReadinessReviewId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly snapshotId: GitSnapshotId;
  readonly reconciliationRevision: number;
  readonly reconciliationResultDigest: Sha256Digest;
  readonly actorKind: ReadinessReviewActorKind;
  readonly recordedAtUtc: UtcTimestamp;
  readonly reviewDigest: Sha256Digest;
}

export interface CreateReadinessReviewInput {
  readonly actorKind: ReadinessReviewActorKind;
}

export interface ReadinessReviewDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

function fail(code: ReadinessReviewErrorCode): never {
  throw new ReadinessReviewError(code);
}

function exactObject(value: unknown, required: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.getPrototypeOf(record) !== Object.prototype &&
    Object.getPrototypeOf(record) !== null
  ) return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
  const keys = Object.keys(record);
  if (
    required.some((key) => !Object.hasOwn(record, key)) ||
    keys.some((key) => !required.includes(key))
  ) return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
  return record;
}

function actorKind(value: unknown): ReadinessReviewActorKind {
  if (!READINESS_REVIEW_ACTOR_KINDS.some((kind) => kind === value)) {
    return fail("READINESS_REVIEW_INPUT_INVALID");
  }
  return value as ReadinessReviewActorKind;
}

async function digestFor(value: Omit<ReadinessReviewRecord, "reviewDigest">): Promise<Sha256Digest> {
  return canonicalJsonDigest(value as unknown as JsonValue);
}

export async function createReadinessReviewRecord(
  input: CreateReadinessReviewInput,
  reconciliation: ReconciliationImpactRevision,
  snapshot: GitSnapshot,
  dependencies: ReadinessReviewDependencies
): Promise<ReadinessReviewRecord> {
  try {
    await assertReconciliationImpactRevisionInvariant(reconciliation);
    assertGitSnapshotInvariant(snapshot);
  } catch {
    return fail("READINESS_REVIEW_INTEGRITY_INVALID");
  }
  if (
    reconciliation.projectId !== snapshot.projectId ||
    reconciliation.missionId !== snapshot.missionId ||
    reconciliation.targetSnapshotId !== snapshot.snapshotId
  ) return fail("READINESS_REVIEW_SCOPE_INVALID");

  let reviewId: ReadinessReviewId;
  let recordedAtUtc: UtcTimestamp;
  try {
    reviewId = dependencies.ids<"READINESS_REVIEW">();
    recordedAtUtc = dependencies.clock.now();
  } catch {
    return fail("READINESS_REVIEW_INPUT_INVALID");
  }
  if (recordedAtUtc < snapshot.capturedAtUtc) {
    return fail("READINESS_REVIEW_TIME_INVALID");
  }
  const withoutDigest = Object.freeze({
    version: READINESS_REVIEW_VERSION,
    digestVersion: READINESS_REVIEW_DIGEST_VERSION,
    reviewId,
    projectId: reconciliation.projectId,
    missionId: reconciliation.missionId,
    snapshotId: snapshot.snapshotId,
    reconciliationRevision: reconciliation.revision,
    reconciliationResultDigest: reconciliation.resultDigest,
    actorKind: actorKind(input.actorKind),
    recordedAtUtc
  });
  return Object.freeze({
    ...withoutDigest,
    reviewDigest: await digestFor(withoutDigest)
  });
}

export async function assertReadinessReviewInvariant(
  review: ReadinessReviewRecord,
  reconciliation: ReconciliationImpactRevision,
  snapshot: GitSnapshot
): Promise<void> {
  try {
    const expected = await createReadinessReviewRecord(
      { actorKind: review.actorKind },
      reconciliation,
      snapshot,
      {
        ids: (() => parseStableId<"READINESS_REVIEW">(review.reviewId)) as StableIdGenerator,
        clock: { now: () => parseUtcTimestamp(review.recordedAtUtc) }
      }
    );
    if (canonicalizeJson(review as unknown as JsonValue) !== canonicalizeJson(expected as unknown as JsonValue)) {
      return fail("READINESS_REVIEW_INTEGRITY_INVALID");
    }
    parseSha256Digest(review.reviewDigest);
  } catch (error) {
    if (error instanceof ReadinessReviewError) throw error;
    return fail("READINESS_REVIEW_INTEGRITY_INVALID");
  }
}

export async function serializeReadinessReview(review: ReadinessReviewRecord): Promise<string> {
  const serialized = canonicalizeJson(review as unknown as JsonValue);
  if (new TextEncoder().encode(serialized).byteLength > MAXIMUM_READINESS_REVIEW_SERIALIZED_BYTES) {
    return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
  }
  return serialized;
}

export async function deserializeReadinessReview(
  serialized: string,
  reconciliation: ReconciliationImpactRevision,
  snapshot: GitSnapshot
): Promise<ReadinessReviewRecord> {
  try {
    if (
      typeof serialized !== "string" ||
      new TextEncoder().encode(serialized).byteLength > MAXIMUM_READINESS_REVIEW_SERIALIZED_BYTES
    ) return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
    const record = exactObject(JSON.parse(serialized), [
      "version", "digestVersion", "reviewId", "projectId", "missionId",
      "snapshotId", "reconciliationRevision", "reconciliationResultDigest",
      "actorKind", "recordedAtUtc", "reviewDigest"
    ]);
    const review = Object.freeze(record as unknown as ReadinessReviewRecord);
    await assertReadinessReviewInvariant(review, reconciliation, snapshot);
    if (canonicalizeJson(review as unknown as JsonValue) !== serialized) {
      return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
    }
    return review;
  } catch (error) {
    if (error instanceof ReadinessReviewError) throw error;
    return fail("READINESS_REVIEW_SERIALIZATION_INVALID");
  }
}
