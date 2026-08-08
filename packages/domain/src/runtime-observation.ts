import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import {
  prepareEvidenceImport,
  type PreparedEvidenceImport
} from "./evidence-import.js";
import {
  assertEvidenceSourceInvariant,
  type EvidenceSource,
  type EvidenceSourceId
} from "./evidence-source.js";
import type { OriginKind } from "./record-metadata.js";
import {
  parseStableId,
  type StableId,
  type StableIdGenerator
} from "./stable-id.js";
import { parseUtcTimestamp, type UtcTimestamp } from "./time.js";
import type { MissionId, ProjectId } from "./project.js";

export const RUNTIME_OBSERVATION_SCHEMA_VERSION =
  "runtime-observation-summary.v1";
export const RUNTIME_OBSERVATION_DIGEST_VERSION =
  "runtime-observation-digest.v1";
export const RUNTIME_OBSERVATION_SERIES_KEY_VERSION =
  "runtime-observation-series-key.v1";
export const MAXIMUM_RUNTIME_OBSERVATION_INPUT_BYTES = 32_768;
export const MAXIMUM_RUNTIME_OBSERVATION_MEASUREMENTS = 32;
export const MAXIMUM_RUNTIME_OBSERVATION_SAMPLE_COUNT = 1_000_000_000;
export const MAXIMUM_RUNTIME_OBSERVATION_WINDOW_MS = 31 * 24 * 60 * 60 * 1_000;

export const RUNTIME_OBSERVATION_ENVIRONMENTS = [
  "DEVELOPMENT",
  "TEST",
  "STAGING",
  "PRODUCTION"
] as const;

export const RUNTIME_OBSERVATION_UNITS = [
  "COUNT",
  "MILLISECONDS",
  "RATIO",
  "PERCENT",
  "BYTES"
] as const;

export const RUNTIME_OBSERVATION_SOURCE_ORIGINS = [
  "USER_INPUT",
  "VALIDATION_RESULT",
  "SYNTHETIC_FIXTURE"
] as const satisfies readonly OriginKind[];

export const RUNTIME_OBSERVATION_FRESHNESS = [
  "LATEST_OBSERVED_WINDOW",
  "STALE_BY_NEWER_WINDOW"
] as const;

export const RUNTIME_OBSERVATION_ERROR_CODES = [
  "RUNTIME_OBSERVATION_INPUT_INVALID",
  "RUNTIME_OBSERVATION_SCHEMA_UNSUPPORTED",
  "RUNTIME_OBSERVATION_SIZE_LIMIT",
  "RUNTIME_OBSERVATION_VALUE_INVALID",
  "RUNTIME_OBSERVATION_WINDOW_INVALID",
  "RUNTIME_OBSERVATION_SOURCE_INVALID",
  "RUNTIME_OBSERVATION_INVALID"
] as const;

export type RuntimeObservationEnvironment =
  (typeof RUNTIME_OBSERVATION_ENVIRONMENTS)[number];
export type RuntimeObservationUnit =
  (typeof RUNTIME_OBSERVATION_UNITS)[number];
export type RuntimeObservationFreshness =
  (typeof RUNTIME_OBSERVATION_FRESHNESS)[number];
export type RuntimeObservationErrorCode =
  (typeof RUNTIME_OBSERVATION_ERROR_CODES)[number];
export type RuntimeObservationId = StableId<"RUNTIME_OBSERVATION">;

declare const runtimeObservationTokenBrand: unique symbol;
export type RuntimeObservationToken = string & {
  readonly [runtimeObservationTokenBrand]: "RUNTIME_OBSERVATION_TOKEN";
};

export interface RuntimeObservationMeasurement {
  readonly name: RuntimeObservationToken;
  readonly unit: RuntimeObservationUnit;
  readonly value: number;
}

export interface RuntimeObservationSummary {
  readonly schemaVersion: typeof RUNTIME_OBSERVATION_SCHEMA_VERSION;
  readonly subject: RuntimeObservationToken;
  readonly environment: RuntimeObservationEnvironment;
  readonly observationKind: RuntimeObservationToken;
  readonly observedFromUtc: UtcTimestamp;
  readonly observedUntilUtc: UtcTimestamp;
  readonly sampleCount: number;
  readonly measurements: readonly RuntimeObservationMeasurement[];
}

export interface PreparedRuntimeObservationImport {
  readonly summary: RuntimeObservationSummary;
  readonly prepared: PreparedEvidenceImport;
}

export interface RuntimeObservation {
  readonly entityType: "RuntimeObservation";
  readonly runtimeObservationId: RuntimeObservationId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidenceSourceId: EvidenceSourceId;
  readonly seriesKey: Sha256Digest;
  readonly summaryDigest: Sha256Digest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly summary: RuntimeObservationSummary;
}

const ERROR_MESSAGES: Readonly<Record<RuntimeObservationErrorCode, string>> =
  Object.freeze({
    RUNTIME_OBSERVATION_INPUT_INVALID:
      "Runtime observation input is invalid.",
    RUNTIME_OBSERVATION_SCHEMA_UNSUPPORTED:
      "Runtime observation schema is unsupported.",
    RUNTIME_OBSERVATION_SIZE_LIMIT:
      "Runtime observation exceeds a fixed limit.",
    RUNTIME_OBSERVATION_VALUE_INVALID:
      "Runtime observation value is invalid.",
    RUNTIME_OBSERVATION_WINDOW_INVALID:
      "Runtime observation window is invalid.",
    RUNTIME_OBSERVATION_SOURCE_INVALID:
      "Runtime observation source is invalid.",
    RUNTIME_OBSERVATION_INVALID: "Runtime observation is invalid."
  });

export class RuntimeObservationError extends Error {
  readonly code: RuntimeObservationErrorCode;

  constructor(code: RuntimeObservationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "RuntimeObservationError";
    this.code = code;
  }
}

function fail(code: RuntimeObservationErrorCode): never {
  throw new RuntimeObservationError(code);
}

function exactObject(
  value: unknown,
  requiredKeys: readonly string[]
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("RUNTIME_OBSERVATION_INPUT_INVALID");
  }
  const candidate = value as Record<string, unknown>;
  const actual = Object.keys(candidate).sort();
  const expected = [...requiredKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    return fail("RUNTIME_OBSERVATION_INPUT_INVALID");
  }
  return candidate;
}

function parseToken(value: unknown): RuntimeObservationToken {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    !/^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*$/u.test(value)
  ) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  return value as RuntimeObservationToken;
}

function parseEnvironment(value: unknown): RuntimeObservationEnvironment {
  if (
    !RUNTIME_OBSERVATION_ENVIRONMENTS.some(
      (environment) => environment === value
    )
  ) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  return value as RuntimeObservationEnvironment;
}

function parseUnit(value: unknown): RuntimeObservationUnit {
  if (!RUNTIME_OBSERVATION_UNITS.some((unit) => unit === value)) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  return value as RuntimeObservationUnit;
}

function parseMeasurement(value: unknown): RuntimeObservationMeasurement {
  const candidate = exactObject(value, ["name", "unit", "value"]);
  const name = parseToken(candidate.name);
  const unit = parseUnit(candidate.unit);
  const measurementValue = candidate.value;
  if (
    typeof measurementValue !== "number" ||
    !Number.isFinite(measurementValue) ||
    Math.abs(measurementValue) > 1_000_000_000_000_000
  ) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  if (
    (unit === "COUNT" || unit === "BYTES") &&
    (!Number.isSafeInteger(measurementValue) || measurementValue < 0)
  ) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  if (unit === "MILLISECONDS" && measurementValue < 0) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  if (unit === "RATIO" && (measurementValue < 0 || measurementValue > 1)) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  if (
    unit === "PERCENT" &&
    (measurementValue < 0 || measurementValue > 100)
  ) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  return Object.freeze({ name, unit, value: measurementValue });
}

export function parseRuntimeObservationSummary(
  value: unknown
): RuntimeObservationSummary {
  const candidate = exactObject(value, [
    "schemaVersion",
    "subject",
    "environment",
    "observationKind",
    "observedFromUtc",
    "observedUntilUtc",
    "sampleCount",
    "measurements"
  ]);
  if (candidate.schemaVersion !== RUNTIME_OBSERVATION_SCHEMA_VERSION) {
    return fail("RUNTIME_OBSERVATION_SCHEMA_UNSUPPORTED");
  }
  let observedFromUtc: UtcTimestamp;
  let observedUntilUtc: UtcTimestamp;
  try {
    observedFromUtc = parseUtcTimestamp(candidate.observedFromUtc);
    observedUntilUtc = parseUtcTimestamp(candidate.observedUntilUtc);
  } catch {
    return fail("RUNTIME_OBSERVATION_WINDOW_INVALID");
  }
  const fromTime = Date.parse(observedFromUtc);
  const untilTime = Date.parse(observedUntilUtc);
  if (
    fromTime > untilTime ||
    untilTime - fromTime > MAXIMUM_RUNTIME_OBSERVATION_WINDOW_MS
  ) {
    return fail("RUNTIME_OBSERVATION_WINDOW_INVALID");
  }
  if (
    !Number.isSafeInteger(candidate.sampleCount) ||
    (candidate.sampleCount as number) < 1 ||
    (candidate.sampleCount as number) > MAXIMUM_RUNTIME_OBSERVATION_SAMPLE_COUNT
  ) {
    return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
  }
  if (
    !Array.isArray(candidate.measurements) ||
    candidate.measurements.length < 1 ||
    candidate.measurements.length > MAXIMUM_RUNTIME_OBSERVATION_MEASUREMENTS
  ) {
    return fail("RUNTIME_OBSERVATION_SIZE_LIMIT");
  }
  const measurements = candidate.measurements.map(parseMeasurement);
  for (let index = 1; index < measurements.length; index += 1) {
    if ((measurements[index - 1]?.name ?? "") >= (measurements[index]?.name ?? "")) {
      return fail("RUNTIME_OBSERVATION_VALUE_INVALID");
    }
  }
  return Object.freeze({
    schemaVersion: RUNTIME_OBSERVATION_SCHEMA_VERSION,
    subject: parseToken(candidate.subject),
    environment: parseEnvironment(candidate.environment),
    observationKind: parseToken(candidate.observationKind),
    observedFromUtc,
    observedUntilUtc,
    sampleCount: candidate.sampleCount as number,
    measurements: Object.freeze(measurements)
  });
}

function summaryJson(summary: RuntimeObservationSummary): JsonValue {
  return {
    schemaVersion: summary.schemaVersion,
    subject: summary.subject,
    environment: summary.environment,
    observationKind: summary.observationKind,
    observedFromUtc: summary.observedFromUtc,
    observedUntilUtc: summary.observedUntilUtc,
    sampleCount: summary.sampleCount,
    measurements: summary.measurements.map((measurement) => ({
      name: measurement.name,
      unit: measurement.unit,
      value: measurement.value
    }))
  };
}

export function serializeRuntimeObservationSummary(
  summary: RuntimeObservationSummary
): string {
  return canonicalizeJson(summaryJson(summary));
}

export async function prepareRuntimeObservationImport(
  input: unknown
): Promise<PreparedRuntimeObservationImport> {
  let raw: string | undefined;
  try {
    raw = JSON.stringify(input);
  } catch {
    return fail("RUNTIME_OBSERVATION_INPUT_INVALID");
  }
  if (raw === undefined) {
    return fail("RUNTIME_OBSERVATION_INPUT_INVALID");
  }
  const content = new TextEncoder().encode(raw);
  if (content.byteLength > MAXIMUM_RUNTIME_OBSERVATION_INPUT_BYTES) {
    return fail("RUNTIME_OBSERVATION_SIZE_LIMIT");
  }
  const prepared = await prepareEvidenceImport({ format: "JSON", content });
  if (prepared.normalizedByteCount > MAXIMUM_RUNTIME_OBSERVATION_INPUT_BYTES) {
    return fail("RUNTIME_OBSERVATION_SIZE_LIMIT");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(prepared.normalizedContent);
  } catch {
    return fail("RUNTIME_OBSERVATION_INPUT_INVALID");
  }
  const summary = parseRuntimeObservationSummary(parsed);
  if (serializeRuntimeObservationSummary(summary) !== prepared.normalizedContent) {
    return fail("RUNTIME_OBSERVATION_INPUT_INVALID");
  }
  return Object.freeze({ summary, prepared });
}

async function digestFor(
  summary: RuntimeObservationSummary
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    digestVersion: RUNTIME_OBSERVATION_DIGEST_VERSION,
    summary: summaryJson(summary)
  });
}

async function seriesKeyFor(
  summary: RuntimeObservationSummary
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    seriesKeyVersion: RUNTIME_OBSERVATION_SERIES_KEY_VERSION,
    subject: summary.subject,
    environment: summary.environment,
    observationKind: summary.observationKind
  });
}

function isAllowedSourceOrigin(origin: OriginKind): boolean {
  return RUNTIME_OBSERVATION_SOURCE_ORIGINS.some(
    (allowed) => allowed === origin
  );
}

export async function createRuntimeObservation(
  source: EvidenceSource,
  summary: RuntimeObservationSummary,
  ids: StableIdGenerator
): Promise<RuntimeObservation> {
  try {
    await assertEvidenceSourceInvariant(source);
    const parsedSummary = parseRuntimeObservationSummary(summaryJson(summary));
    if (
      source.prepared.format !== "JSON" ||
      source.prepared.normalizedContent !==
        serializeRuntimeObservationSummary(parsedSummary) ||
      source.extractionMethod !== "DIRECT_IMPORT" ||
      source.effectiveAtUtc !== parsedSummary.observedUntilUtc ||
      Date.parse(parsedSummary.observedUntilUtc) > Date.parse(source.recordedAtUtc) ||
      !isAllowedSourceOrigin(source.origin)
    ) {
      return fail("RUNTIME_OBSERVATION_SOURCE_INVALID");
    }
    const observation = Object.freeze({
      entityType: "RuntimeObservation" as const,
      runtimeObservationId: ids<"RUNTIME_OBSERVATION">(),
      projectId: source.projectId,
      missionId: source.missionId,
      evidenceSourceId: source.evidenceSourceId,
      seriesKey: await seriesKeyFor(parsedSummary),
      summaryDigest: await digestFor(parsedSummary),
      recordedAtUtc: source.recordedAtUtc,
      summary: parsedSummary
    });
    await assertRuntimeObservationInvariant(observation, source);
    return observation;
  } catch (error) {
    if (error instanceof RuntimeObservationError) throw error;
    return fail("RUNTIME_OBSERVATION_SOURCE_INVALID");
  }
}

export async function assertRuntimeObservationInvariant(
  observation: RuntimeObservation,
  source: EvidenceSource
): Promise<void> {
  try {
    if (observation.entityType !== "RuntimeObservation") {
      return fail("RUNTIME_OBSERVATION_INVALID");
    }
    parseStableId<"RUNTIME_OBSERVATION">(observation.runtimeObservationId);
    parseStableId<"PROJECT">(observation.projectId);
    parseStableId<"MISSION">(observation.missionId);
    parseStableId<"EVIDENCE_SOURCE">(observation.evidenceSourceId);
    parseUtcTimestamp(observation.recordedAtUtc);
    parseSha256Digest(observation.seriesKey);
    parseSha256Digest(observation.summaryDigest);
    const summary = parseRuntimeObservationSummary(summaryJson(observation.summary));
    if (
      observation.projectId !== source.projectId ||
      observation.missionId !== source.missionId ||
      observation.evidenceSourceId !== source.evidenceSourceId ||
      observation.recordedAtUtc !== source.recordedAtUtc ||
      source.prepared.normalizedContent !== serializeRuntimeObservationSummary(summary) ||
      source.effectiveAtUtc !== summary.observedUntilUtc ||
      !isAllowedSourceOrigin(source.origin) ||
      observation.seriesKey !== (await seriesKeyFor(summary)) ||
      observation.summaryDigest !== (await digestFor(summary))
    ) {
      return fail("RUNTIME_OBSERVATION_INVALID");
    }
  } catch (error) {
    if (error instanceof RuntimeObservationError) throw error;
    return fail("RUNTIME_OBSERVATION_INVALID");
  }
}

export async function runtimeObservationFromStorage(input: {
  readonly runtimeObservationId: string;
  readonly seriesKey: string;
  readonly summaryDigest: string;
  readonly source: EvidenceSource;
}): Promise<RuntimeObservation> {
  try {
    const parsed = JSON.parse(input.source.prepared.normalizedContent) as unknown;
    const summary = parseRuntimeObservationSummary(parsed);
    const observation = Object.freeze({
      entityType: "RuntimeObservation" as const,
      runtimeObservationId: parseStableId<"RUNTIME_OBSERVATION">(
        input.runtimeObservationId
      ),
      projectId: input.source.projectId,
      missionId: input.source.missionId,
      evidenceSourceId: input.source.evidenceSourceId,
      seriesKey: parseSha256Digest(input.seriesKey),
      summaryDigest: parseSha256Digest(input.summaryDigest),
      recordedAtUtc: input.source.recordedAtUtc,
      summary
    });
    await assertRuntimeObservationInvariant(observation, input.source);
    return observation;
  } catch (error) {
    if (error instanceof RuntimeObservationError) throw error;
    return fail("RUNTIME_OBSERVATION_INVALID");
  }
}
