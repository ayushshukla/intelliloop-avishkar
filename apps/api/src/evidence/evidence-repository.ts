import { randomUUID } from "node:crypto";

import {
  EvidenceSourceError,
  RuntimeObservationError,
  assertEvidenceSourceInvariant,
  assertEvidenceTimelineEventInvariant,
  canonicalizeJson,
  createClock,
  createEvidenceSource,
  createEvidenceTimelineEvent,
  createRuntimeObservation,
  createStableIdGenerator,
  parseEvidenceExtractionMethod,
  parseEvidenceSourceLocator,
  parseEvidenceSourceRevision,
  parseEvidenceTimelineSequence,
  parseSha256Digest,
  parseStableId,
  parseUtcTimestamp,
  preparedEvidenceFromStorage,
  runtimeObservationFromStorage,
  type CreateEvidenceSourceInput,
  type EpistemicLabel,
  type EvidenceImportFormat,
  type EvidenceRedactionSummary,
  type EvidenceSource,
  type EvidenceSourceDependencies,
  type EvidenceSourceId,
  type EvidenceTimelineEvent,
  type MissionId,
  type OriginKind,
  type ProjectId,
  type PreparedRuntimeObservationImport,
  type RuntimeObservation,
  type RuntimeObservationFreshness,
  type RuntimeObservationId
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";

export const EVIDENCE_REPOSITORY_ERROR_CODES = [
  "EVIDENCE_PROJECT_NOT_FOUND",
  "EVIDENCE_MISSION_NOT_FOUND",
  "EVIDENCE_CROSS_SCOPE",
  "EVIDENCE_MISSION_NOT_CURRENT",
  "EVIDENCE_SOURCE_NOT_FOUND",
  "RUNTIME_OBSERVATION_NOT_FOUND",
  "EVIDENCE_PAGE_INVALID",
  "EVIDENCE_STORAGE_CONFLICT",
  "EVIDENCE_STORAGE_SCHEMA_INVALID",
  "EVIDENCE_STORAGE_FAILED"
] as const;

export type EvidenceRepositoryErrorCode =
  (typeof EVIDENCE_REPOSITORY_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<EvidenceRepositoryErrorCode, string>> =
  Object.freeze({
    EVIDENCE_PROJECT_NOT_FOUND: "Evidence project was not found.",
    EVIDENCE_MISSION_NOT_FOUND: "Evidence mission was not found.",
    EVIDENCE_CROSS_SCOPE: "Cross-scope evidence access is not allowed.",
    EVIDENCE_MISSION_NOT_CURRENT:
      "Evidence can be imported only for a current mission.",
    EVIDENCE_SOURCE_NOT_FOUND: "Evidence source was not found.",
    RUNTIME_OBSERVATION_NOT_FOUND:
      "Runtime observation was not found.",
    EVIDENCE_PAGE_INVALID: "Evidence page request is invalid.",
    EVIDENCE_STORAGE_CONFLICT:
      "Evidence storage rejected a conflicting change.",
    EVIDENCE_STORAGE_SCHEMA_INVALID: "Evidence storage schema is invalid.",
    EVIDENCE_STORAGE_FAILED:
      "Evidence storage could not complete the operation."
  });

export class EvidenceRepositoryError extends Error {
  readonly code: EvidenceRepositoryErrorCode;

  constructor(code: EvidenceRepositoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "EvidenceRepositoryError";
    this.code = code;
  }
}

export interface EvidenceSourcePage {
  readonly items: readonly EvidenceSource[];
  readonly nextCursor: EvidenceSourceId | null;
}

export interface EvidenceTimelinePage {
  readonly items: readonly EvidenceTimelineEvent[];
  readonly nextCursor: number | null;
}

export interface PersistEvidenceResult {
  readonly created: boolean;
  readonly source: EvidenceSource;
  readonly timelineEvent: EvidenceTimelineEvent;
}

export interface PersistRuntimeObservationInput {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly epistemicLabel: EpistemicLabel;
  readonly prepared: PreparedRuntimeObservationImport;
}

export interface RuntimeObservationView {
  readonly observation: RuntimeObservation;
  readonly source: EvidenceSource;
  readonly freshness: RuntimeObservationFreshness;
  readonly newerObservationId?: RuntimeObservationId;
}

export interface PersistRuntimeObservationResult extends RuntimeObservationView {
  readonly created: boolean;
  readonly timelineEvent: EvidenceTimelineEvent;
}

export interface RuntimeObservationPage {
  readonly items: readonly RuntimeObservationView[];
  readonly nextCursor: RuntimeObservationId | null;
}

interface MissionScopeRow {
  readonly project_status: string;
  readonly mission_project_id: string;
  readonly mission_status: string;
}

interface EvidenceSourceRow {
  readonly evidence_source_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly import_key: string;
  readonly origin_kind: string;
  readonly source_locator: string;
  readonly source_revision: string;
  readonly recorded_at_utc: string;
  readonly effective_at_utc: string | null;
  readonly extraction_method: string;
  readonly epistemic_label: string;
  readonly normalization_version: string;
  readonly format: string;
  readonly input_byte_count: number;
  readonly normalized_byte_count: number;
  readonly normalized_content: string;
  readonly content_digest: string;
  readonly redaction_summary_json: string;
}

interface TimelineEventRow {
  readonly timeline_event_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly mission_sequence: number;
  readonly event_type: string;
  readonly evidence_source_id: string;
  readonly occurred_at_utc: string;
}

interface RuntimeObservationRow {
  readonly runtime_observation_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly evidence_source_id: string;
  readonly schema_version: string;
  readonly series_key: string;
  readonly summary_digest: string;
  readonly subject: string;
  readonly environment: string;
  readonly observation_kind: string;
  readonly observed_from_utc: string;
  readonly observed_until_utc: string;
  readonly sample_count: number;
  readonly measurement_count: number;
  readonly recorded_at_utc: string;
}

type ImportTransactionResult =
  | {
      readonly kind: "CREATED";
      readonly source: EvidenceSource;
      readonly timelineEvent: EvidenceTimelineEvent;
    }
  | {
      readonly kind: "EXISTING";
      readonly sourceRow: EvidenceSourceRow;
      readonly eventRow: TimelineEventRow;
    };

interface RuntimeImportTransactionResult {
  readonly created: boolean;
  readonly sourceRow: EvidenceSourceRow;
  readonly eventRow: TimelineEventRow;
  readonly observationRow: RuntimeObservationRow;
}

const EVIDENCE_SOURCE_SELECT = `
SELECT
  evidence_source_id,
  project_id,
  mission_id,
  import_key,
  origin_kind,
  source_locator,
  source_revision,
  recorded_at_utc,
  effective_at_utc,
  extraction_method,
  epistemic_label,
  normalization_version,
  format,
  input_byte_count,
  normalized_byte_count,
  normalized_content,
  content_digest,
  redaction_summary_json
FROM evidence_sources
`.trim();

const TIMELINE_EVENT_SELECT = `
SELECT
  timeline_event_id,
  project_id,
  mission_id,
  mission_sequence,
  event_type,
  evidence_source_id,
  occurred_at_utc
FROM timeline_events
`.trim();

const RUNTIME_OBSERVATION_SELECT = `
SELECT
  runtime_observation_id,
  project_id,
  mission_id,
  evidence_source_id,
  schema_version,
  series_key,
  summary_digest,
  subject,
  environment,
  observation_kind,
  observed_from_utc,
  observed_until_utc,
  sample_count,
  measurement_count,
  recorded_at_utc
FROM runtime_observations
`.trim();

function storageFailure(error: unknown): EvidenceRepositoryError {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new EvidenceRepositoryError("EVIDENCE_STORAGE_CONFLICT");
  }
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB"
  ) {
    return new EvidenceRepositoryError("EVIDENCE_STORAGE_SCHEMA_INVALID");
  }
  return new EvidenceRepositoryError("EVIDENCE_STORAGE_FAILED");
}

function redactionJson(redaction: EvidenceRedactionSummary): string {
  return canonicalizeJson({
    applied: redaction.applied,
    totalReplacements: redaction.totalReplacements,
    ruleCounts: redaction.ruleCounts.map((entry) => ({
      rule: entry.rule,
      replacements: entry.replacements
    }))
  });
}

function parseRedactionJson(value: string): EvidenceRedactionSummary {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null) {
    throw new TypeError("Invalid redaction data.");
  }
  const candidate = parsed as Partial<EvidenceRedactionSummary>;
  if (!Array.isArray(candidate.ruleCounts)) {
    throw new TypeError("Invalid redaction data.");
  }
  return {
    applied: candidate.applied as boolean,
    totalReplacements: candidate.totalReplacements as number,
    ruleCounts: candidate.ruleCounts as EvidenceRedactionSummary["ruleCounts"]
  };
}

async function hydrateEvidenceSource(
  row: EvidenceSourceRow
): Promise<EvidenceSource> {
  try {
    const prepared = preparedEvidenceFromStorage({
      normalizationVersion: row.normalization_version,
      format: row.format as EvidenceImportFormat,
      inputByteCount: row.input_byte_count,
      normalizedByteCount: row.normalized_byte_count,
      normalizedContent: row.normalized_content,
      contentDigest: row.content_digest,
      redaction: parseRedactionJson(row.redaction_summary_json)
    });
    const base = {
      entityType: "EvidenceSource" as const,
      evidenceSourceId: parseStableId<"EVIDENCE_SOURCE">(
        row.evidence_source_id
      ),
      projectId: parseStableId<"PROJECT">(row.project_id),
      missionId: parseStableId<"MISSION">(row.mission_id),
      importKey: parseSha256Digest(row.import_key),
      origin: row.origin_kind as OriginKind,
      sourceLocator: parseEvidenceSourceLocator(row.source_locator),
      recordedAtUtc: parseUtcTimestamp(row.recorded_at_utc),
      extractionMethod: parseEvidenceExtractionMethod(row.extraction_method),
      epistemicLabel: row.epistemic_label as EpistemicLabel,
      prepared
    };
    const source = Object.freeze({
      ...base,
      ...(row.source_revision.length === 0
        ? {}
        : { sourceRevision: parseEvidenceSourceRevision(row.source_revision) }),
      ...(row.effective_at_utc === null
        ? {}
        : { effectiveAtUtc: parseUtcTimestamp(row.effective_at_utc) })
    });
    await assertEvidenceSourceInvariant(source);
    return source;
  } catch {
    throw new EvidenceRepositoryError("EVIDENCE_STORAGE_SCHEMA_INVALID");
  }
}

function hydrateTimelineEvent(row: TimelineEventRow): EvidenceTimelineEvent {
  try {
    const event = Object.freeze({
      entityType: "EvidenceTimelineEvent" as const,
      timelineEventId: parseStableId<"EVIDENCE_TIMELINE_EVENT">(
        row.timeline_event_id
      ),
      projectId: parseStableId<"PROJECT">(row.project_id),
      missionId: parseStableId<"MISSION">(row.mission_id),
      sequence: parseEvidenceTimelineSequence(row.mission_sequence),
      eventType: row.event_type as "EVIDENCE_IMPORTED",
      evidenceSourceId: parseStableId<"EVIDENCE_SOURCE">(
        row.evidence_source_id
      ),
      occurredAtUtc: parseUtcTimestamp(row.occurred_at_utc)
    });
    assertEvidenceTimelineEventInvariant(event);
    return event;
  } catch {
    throw new EvidenceRepositoryError("EVIDENCE_STORAGE_SCHEMA_INVALID");
  }
}

async function hydrateRuntimeObservation(
  row: RuntimeObservationRow,
  source: EvidenceSource
): Promise<RuntimeObservation> {
  try {
    const observation = await runtimeObservationFromStorage({
      runtimeObservationId: row.runtime_observation_id,
      seriesKey: row.series_key,
      summaryDigest: row.summary_digest,
      source
    });
    const summary = observation.summary;
    if (
      row.project_id !== observation.projectId ||
      row.mission_id !== observation.missionId ||
      row.evidence_source_id !== observation.evidenceSourceId ||
      row.schema_version !== summary.schemaVersion ||
      row.subject !== summary.subject ||
      row.environment !== summary.environment ||
      row.observation_kind !== summary.observationKind ||
      row.observed_from_utc !== summary.observedFromUtc ||
      row.observed_until_utc !== summary.observedUntilUtc ||
      row.sample_count !== summary.sampleCount ||
      row.measurement_count !== summary.measurements.length ||
      row.recorded_at_utc !== observation.recordedAtUtc
    ) {
      throw new TypeError("Invalid runtime observation data.");
    }
    return observation;
  } catch {
    throw new EvidenceRepositoryError("EVIDENCE_STORAGE_SCHEMA_INVALID");
  }
}

function parsePageLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new EvidenceRepositoryError("EVIDENCE_PAGE_INVALID");
  }
  return value;
}

function parseTimelineCursor(value: number | undefined): number {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < 0)
  ) {
    throw new EvidenceRepositoryError("EVIDENCE_PAGE_INVALID");
  }
  return value ?? 0;
}

function parseEvidenceCursor(
  value: EvidenceSourceId | undefined
): EvidenceSourceId | undefined {
  if (value === undefined) return undefined;
  try {
    return parseStableId<"EVIDENCE_SOURCE">(value);
  } catch {
    throw new EvidenceRepositoryError("EVIDENCE_PAGE_INVALID");
  }
}

function parseRuntimeObservationCursor(
  value: RuntimeObservationId | undefined
): RuntimeObservationId | undefined {
  if (value === undefined) return undefined;
  try {
    return parseStableId<"RUNTIME_OBSERVATION">(value);
  } catch {
    throw new EvidenceRepositoryError("EVIDENCE_PAGE_INVALID");
  }
}

export class SqliteEvidenceRepository {
  readonly #connection: SqliteConnection;
  readonly #dependencies: EvidenceSourceDependencies;

  constructor(
    connection: SqliteConnection,
    dependencies: EvidenceSourceDependencies = {
      ids: createStableIdGenerator(() => randomUUID()),
      clock: createClock(() => new Date())
    }
  ) {
    this.#connection = connection;
    this.#dependencies = dependencies;
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof EvidenceRepositoryError ||
        error instanceof EvidenceSourceError ||
        error instanceof RuntimeObservationError
      ) {
        throw error;
      }
      throw storageFailure(error);
    }
  }

  #assertScope(
    projectId: ProjectId,
    missionId: MissionId,
    requireCurrent: boolean
  ): void {
    const project = this.#connection
      .prepare("SELECT lifecycle_status FROM projects WHERE project_id = ?")
      .get(projectId) as { readonly lifecycle_status: string } | undefined;
    if (project === undefined) {
      throw new EvidenceRepositoryError("EVIDENCE_PROJECT_NOT_FOUND");
    }
    const mission = this.#connection
      .prepare(
        `SELECT
           p.lifecycle_status AS project_status,
           m.project_id AS mission_project_id,
           m.lifecycle_status AS mission_status
         FROM missions m
         JOIN projects p ON p.project_id = m.project_id
         WHERE m.mission_id = ?`
      )
      .get(missionId) as MissionScopeRow | undefined;
    if (mission === undefined) {
      throw new EvidenceRepositoryError("EVIDENCE_MISSION_NOT_FOUND");
    }
    if (mission.mission_project_id !== projectId) {
      throw new EvidenceRepositoryError("EVIDENCE_CROSS_SCOPE");
    }
    if (
      requireCurrent &&
      (project.lifecycle_status !== "ACTIVE" ||
        mission.project_status !== "ACTIVE" ||
        mission.mission_status !== "CURRENT")
    ) {
      throw new EvidenceRepositoryError("EVIDENCE_MISSION_NOT_CURRENT");
    }
  }

  #timelineForSource(evidenceSourceId: EvidenceSourceId): TimelineEventRow {
    const row = this.#connection
      .prepare(
        `${TIMELINE_EVENT_SELECT}
         WHERE event_type = 'EVIDENCE_IMPORTED' AND evidence_source_id = ?`
      )
      .get(evidenceSourceId) as TimelineEventRow | undefined;
    if (row === undefined) {
      throw new EvidenceRepositoryError("EVIDENCE_STORAGE_SCHEMA_INVALID");
    }
    return row;
  }

  #insertSource(source: EvidenceSource): void {
    this.#connection
      .prepare(
        `INSERT INTO evidence_sources (
          evidence_source_id, project_id, mission_id, import_key,
          origin_kind, source_locator, source_revision,
          recorded_at_utc, effective_at_utc, extraction_method,
          epistemic_label, normalization_version, format,
          input_byte_count, normalized_byte_count, normalized_content,
          content_digest, redaction_summary_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        source.evidenceSourceId,
        source.projectId,
        source.missionId,
        source.importKey,
        source.origin,
        source.sourceLocator,
        source.sourceRevision ?? "",
        source.recordedAtUtc,
        source.effectiveAtUtc ?? null,
        source.extractionMethod,
        source.epistemicLabel,
        source.prepared.normalizationVersion,
        source.prepared.format,
        source.prepared.inputByteCount,
        source.prepared.normalizedByteCount,
        source.prepared.normalizedContent,
        source.prepared.contentDigest,
        redactionJson(source.prepared.redaction)
      );
  }

  #insertTimelineEvent(event: EvidenceTimelineEvent): void {
    this.#connection
      .prepare(
        `INSERT INTO timeline_events (
          timeline_event_id, project_id, mission_id, mission_sequence,
          event_type, evidence_source_id, occurred_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.timelineEventId,
        event.projectId,
        event.missionId,
        event.sequence,
        event.eventType,
        event.evidenceSourceId,
        event.occurredAtUtc
      );
  }

  #sourceRow(evidenceSourceId: EvidenceSourceId): EvidenceSourceRow {
    const row = this.#connection
      .prepare(`${EVIDENCE_SOURCE_SELECT} WHERE evidence_source_id = ?`)
      .get(evidenceSourceId) as EvidenceSourceRow | undefined;
    if (row === undefined) {
      throw new EvidenceRepositoryError("EVIDENCE_STORAGE_SCHEMA_INVALID");
    }
    return row;
  }

  #runtimeObservationRowForSource(
    evidenceSourceId: EvidenceSourceId
  ): RuntimeObservationRow | undefined {
    return this.#connection
      .prepare(
        `${RUNTIME_OBSERVATION_SELECT} WHERE evidence_source_id = ?`
      )
      .get(evidenceSourceId) as RuntimeObservationRow | undefined;
  }

  #insertRuntimeObservation(
    observation: RuntimeObservation,
    sourceRow: EvidenceSourceRow
  ): void {
    this.#connection
      .prepare(
        `INSERT INTO runtime_observations (
          runtime_observation_id, project_id, mission_id, evidence_source_id,
          schema_version, series_key, summary_digest, subject, environment,
          observation_kind, observed_from_utc, observed_until_utc,
          sample_count, measurement_count, recorded_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        observation.runtimeObservationId,
        sourceRow.project_id,
        sourceRow.mission_id,
        sourceRow.evidence_source_id,
        observation.summary.schemaVersion,
        observation.seriesKey,
        observation.summaryDigest,
        observation.summary.subject,
        observation.summary.environment,
        observation.summary.observationKind,
        observation.summary.observedFromUtc,
        observation.summary.observedUntilUtc,
        observation.summary.sampleCount,
        observation.summary.measurements.length,
        sourceRow.recorded_at_utc
      );
  }

  async #runtimeObservationView(
    row: RuntimeObservationRow,
    providedSource?: EvidenceSource
  ): Promise<RuntimeObservationView> {
    const source =
      providedSource ??
      (await hydrateEvidenceSource(
        this.#sourceRow(
          parseStableId<"EVIDENCE_SOURCE">(row.evidence_source_id)
        )
      ));
    const observation = await hydrateRuntimeObservation(row, source);
    const newer = this.#connection
      .prepare(
        `${RUNTIME_OBSERVATION_SELECT}
         WHERE project_id = ? AND mission_id = ? AND series_key = ?
           AND observed_until_utc > ?
         ORDER BY observed_until_utc DESC, runtime_observation_id
         LIMIT 1`
      )
      .get(
        row.project_id,
        row.mission_id,
        row.series_key,
        row.observed_until_utc
      ) as RuntimeObservationRow | undefined;
    if (newer === undefined) {
      return Object.freeze({
        observation,
        source,
        freshness: "LATEST_OBSERVED_WINDOW" as const
      });
    }
    return Object.freeze({
      observation,
      source,
      freshness: "STALE_BY_NEWER_WINDOW" as const,
      newerObservationId: parseStableId<"RUNTIME_OBSERVATION">(
        newer.runtime_observation_id
      )
    });
  }

  async persistEvidence(
    input: CreateEvidenceSourceInput
  ): Promise<PersistEvidenceResult> {
    return this.#guard(async () => {
      const candidate = await createEvidenceSource(input, this.#dependencies);
      const transactionResult = this.#connection
        .transaction((): ImportTransactionResult => {
          this.#assertScope(candidate.projectId, candidate.missionId, true);
          const existing = this.#connection
            .prepare(
              `${EVIDENCE_SOURCE_SELECT}
               WHERE project_id = ? AND mission_id = ? AND import_key = ?`
            )
            .get(
              candidate.projectId,
              candidate.missionId,
              candidate.importKey
            ) as EvidenceSourceRow | undefined;
          if (existing !== undefined) {
            return {
              kind: "EXISTING",
              sourceRow: existing,
              eventRow: this.#timelineForSource(
                parseStableId<"EVIDENCE_SOURCE">(
                  existing.evidence_source_id
                )
              )
            };
          }

          const sequenceRow = this.#connection
            .prepare(
              `SELECT COALESCE(MAX(mission_sequence), 0) + 1 AS next_sequence
               FROM timeline_events
               WHERE mission_id = ?`
            )
            .get(candidate.missionId) as {
              readonly next_sequence: number;
            };
          const timelineEvent = createEvidenceTimelineEvent(
            candidate,
            sequenceRow.next_sequence,
            this.#dependencies.ids
          );
          this.#insertSource(candidate);
          this.#insertTimelineEvent(timelineEvent);
          return { kind: "CREATED", source: candidate, timelineEvent };
        })
        .immediate();

      if (transactionResult.kind === "CREATED") {
        return Object.freeze({
          created: true,
          source: transactionResult.source,
          timelineEvent: transactionResult.timelineEvent
        });
      }
      const source = await hydrateEvidenceSource(transactionResult.sourceRow);
      const timelineEvent = hydrateTimelineEvent(transactionResult.eventRow);
      assertEvidenceTimelineEventInvariant(timelineEvent, source);
      return Object.freeze({ created: false, source, timelineEvent });
    });
  }

  async persistRuntimeObservation(
    input: PersistRuntimeObservationInput
  ): Promise<PersistRuntimeObservationResult> {
    return this.#guard(async () => {
      const candidateSource = await createEvidenceSource(
        {
          projectId: input.projectId,
          missionId: input.missionId,
          origin: input.origin,
          sourceLocator: input.sourceLocator,
          ...(input.sourceRevision === undefined
            ? {}
            : { sourceRevision: input.sourceRevision }),
          effectiveAtUtc: input.prepared.summary.observedUntilUtc,
          extractionMethod: "DIRECT_IMPORT",
          epistemicLabel: input.epistemicLabel,
          prepared: input.prepared.prepared
        },
        this.#dependencies
      );
      const candidateObservation = await createRuntimeObservation(
        candidateSource,
        input.prepared.summary,
        this.#dependencies.ids
      );
      const transactionResult = this.#connection
        .transaction((): RuntimeImportTransactionResult => {
          this.#assertScope(
            candidateSource.projectId,
            candidateSource.missionId,
            true
          );
          let created = false;
          let sourceRow = this.#connection
            .prepare(
              `${EVIDENCE_SOURCE_SELECT}
               WHERE project_id = ? AND mission_id = ? AND import_key = ?`
            )
            .get(
              candidateSource.projectId,
              candidateSource.missionId,
              candidateSource.importKey
            ) as EvidenceSourceRow | undefined;
          let eventRow: TimelineEventRow;

          if (sourceRow === undefined) {
            const sequenceRow = this.#connection
              .prepare(
                `SELECT COALESCE(MAX(mission_sequence), 0) + 1 AS next_sequence
                 FROM timeline_events
                 WHERE mission_id = ?`
              )
              .get(candidateSource.missionId) as {
                readonly next_sequence: number;
              };
            const timelineEvent = createEvidenceTimelineEvent(
              candidateSource,
              sequenceRow.next_sequence,
              this.#dependencies.ids
            );
            this.#insertSource(candidateSource);
            this.#insertTimelineEvent(timelineEvent);
            created = true;
            sourceRow = this.#sourceRow(candidateSource.evidenceSourceId);
            eventRow = this.#timelineForSource(candidateSource.evidenceSourceId);
          } else {
            eventRow = this.#timelineForSource(
              parseStableId<"EVIDENCE_SOURCE">(
                sourceRow.evidence_source_id
              )
            );
          }

          let observationRow = this.#runtimeObservationRowForSource(
            parseStableId<"EVIDENCE_SOURCE">(sourceRow.evidence_source_id)
          );
          if (observationRow === undefined) {
            this.#insertRuntimeObservation(candidateObservation, sourceRow);
            observationRow = this.#runtimeObservationRowForSource(
              parseStableId<"EVIDENCE_SOURCE">(
                sourceRow.evidence_source_id
              )
            );
          }
          if (observationRow === undefined) {
            throw new EvidenceRepositoryError(
              "EVIDENCE_STORAGE_SCHEMA_INVALID"
            );
          }
          return { created, sourceRow, eventRow, observationRow };
        })
        .immediate();

      const source = await hydrateEvidenceSource(transactionResult.sourceRow);
      const timelineEvent = hydrateTimelineEvent(transactionResult.eventRow);
      assertEvidenceTimelineEventInvariant(timelineEvent, source);
      const view = await this.#runtimeObservationView(
        transactionResult.observationRow,
        source
      );
      return Object.freeze({
        created: transactionResult.created,
        ...view,
        timelineEvent
      });
    });
  }

  async getEvidenceSource(
    projectId: ProjectId,
    missionId: MissionId,
    evidenceSourceId: EvidenceSourceId
  ): Promise<EvidenceSource> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId, false);
      const row = this.#connection
        .prepare(
          `${EVIDENCE_SOURCE_SELECT}
           WHERE project_id = ? AND mission_id = ? AND evidence_source_id = ?`
        )
        .get(projectId, missionId, evidenceSourceId) as
        | EvidenceSourceRow
        | undefined;
      if (row === undefined) {
        throw new EvidenceRepositoryError("EVIDENCE_SOURCE_NOT_FOUND");
      }
      return hydrateEvidenceSource(row);
    });
  }

  async getRuntimeObservation(
    projectId: ProjectId,
    missionId: MissionId,
    runtimeObservationId: RuntimeObservationId
  ): Promise<RuntimeObservationView> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId, false);
      const parsedId = parseStableId<"RUNTIME_OBSERVATION">(
        runtimeObservationId
      );
      const row = this.#connection
        .prepare(
          `${RUNTIME_OBSERVATION_SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND runtime_observation_id = ?`
        )
        .get(projectId, missionId, parsedId) as
        | RuntimeObservationRow
        | undefined;
      if (row === undefined) {
        throw new EvidenceRepositoryError(
          "RUNTIME_OBSERVATION_NOT_FOUND"
        );
      }
      return this.#runtimeObservationView(row);
    });
  }

  async listRuntimeObservations(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: RuntimeObservationId
  ): Promise<RuntimeObservationPage> {
    return this.#guard(async () => {
      const parsedLimit = parsePageLimit(limit);
      const parsedCursor = parseRuntimeObservationCursor(cursor);
      this.#assertScope(projectId, missionId, false);
      const rows = this.#connection
        .prepare(
          `${RUNTIME_OBSERVATION_SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND (? IS NULL OR runtime_observation_id > ?)
           ORDER BY runtime_observation_id
           LIMIT ?`
        )
        .all(
          projectId,
          missionId,
          parsedCursor ?? null,
          parsedCursor ?? null,
          parsedLimit + 1
        ) as RuntimeObservationRow[];
      const hasNext = rows.length > parsedLimit;
      const views = await Promise.all(
        rows.slice(0, parsedLimit).map((row) =>
          this.#runtimeObservationView(row)
        )
      );
      return Object.freeze({
        items: Object.freeze(views),
        nextCursor:
          hasNext && views.length > 0
            ? (views[views.length - 1]?.observation.runtimeObservationId ??
              null)
            : null
      });
    });
  }

  async listEvidenceSources(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: EvidenceSourceId
  ): Promise<EvidenceSourcePage> {
    return this.#guard(async () => {
      const parsedLimit = parsePageLimit(limit);
      const parsedCursor = parseEvidenceCursor(cursor);
      this.#assertScope(projectId, missionId, false);
      const rows = this.#connection
        .prepare(
          `${EVIDENCE_SOURCE_SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND (? IS NULL OR evidence_source_id > ?)
           ORDER BY evidence_source_id
           LIMIT ?`
        )
        .all(
          projectId,
          missionId,
          parsedCursor ?? null,
          parsedCursor ?? null,
          parsedLimit + 1
        ) as EvidenceSourceRow[];
      const hasNext = rows.length > parsedLimit;
      const sources = await Promise.all(
        rows.slice(0, parsedLimit).map(hydrateEvidenceSource)
      );
      return Object.freeze({
        items: Object.freeze(sources),
        nextCursor:
          hasNext && sources.length > 0
            ? (sources[sources.length - 1]?.evidenceSourceId ?? null)
            : null
      });
    });
  }

  async listTimelineEvents(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<EvidenceTimelinePage> {
    return this.#guard(() => {
      const parsedLimit = parsePageLimit(limit);
      const parsedCursor = parseTimelineCursor(cursor);
      this.#assertScope(projectId, missionId, false);
      const rows = this.#connection
        .prepare(
          `${TIMELINE_EVENT_SELECT}
           WHERE project_id = ? AND mission_id = ? AND mission_sequence > ?
           ORDER BY mission_sequence
           LIMIT ?`
        )
        .all(projectId, missionId, parsedCursor, parsedLimit + 1) as TimelineEventRow[];
      const hasNext = rows.length > parsedLimit;
      const events = rows.slice(0, parsedLimit).map(hydrateTimelineEvent);
      return Object.freeze({
        items: Object.freeze(events),
        nextCursor:
          hasNext && events.length > 0
            ? (events[events.length - 1]?.sequence ?? null)
            : null
      });
    });
  }
}
