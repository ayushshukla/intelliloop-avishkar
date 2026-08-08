import {
  assertReadinessAssessmentInvariant,
  assertReadinessReviewInvariant,
  assertValidationResultInvariant,
  canonicalizeJson,
  deserializeReadinessAssessment,
  deserializeReadinessReview,
  parseStableId,
  serializeReadinessAssessment,
  serializeReadinessReview,
  type EvaluateReadinessInput,
  type EvidenceSource,
  type GitSnapshot,
  type GitSnapshotId,
  type MissionId,
  type ProjectId,
  type ReadinessAssessment,
  type ReadinessReviewRecord,
  type ValidationKey,
  type ValidationResult,
  type ValidationResultId
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";

export const READINESS_REPOSITORY_PAGE_LIMIT = 100;

export const READINESS_REPOSITORY_ERROR_CODES = [
  "READINESS_PROJECT_NOT_FOUND",
  "READINESS_MISSION_NOT_FOUND",
  "READINESS_VALIDATION_NOT_FOUND",
  "READINESS_REVIEW_NOT_FOUND",
  "READINESS_ASSESSMENT_NOT_FOUND",
  "READINESS_PAGE_INVALID",
  "READINESS_PREDECESSOR_CONFLICT",
  "READINESS_DEPENDENCY_CONFLICT",
  "READINESS_STORAGE_CONFLICT",
  "READINESS_STORAGE_SCHEMA_INVALID",
  "READINESS_STORAGE_FAILED"
] as const;

export type ReadinessRepositoryErrorCode =
  (typeof READINESS_REPOSITORY_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<ReadinessRepositoryErrorCode, string>> =
  Object.freeze({
    READINESS_PROJECT_NOT_FOUND: "Readiness Project scope was not found.",
    READINESS_MISSION_NOT_FOUND: "Readiness Mission scope was not found.",
    READINESS_VALIDATION_NOT_FOUND: "Readiness validation result was not found.",
    READINESS_REVIEW_NOT_FOUND: "Readiness review was not found.",
    READINESS_ASSESSMENT_NOT_FOUND: "Release assessment was not found.",
    READINESS_PAGE_INVALID: "Release assessment page request is invalid.",
    READINESS_PREDECESSOR_CONFLICT: "Release assessment predecessor changed before persistence completed.",
    READINESS_DEPENDENCY_CONFLICT: "Release assessment dependencies changed before persistence completed.",
    READINESS_STORAGE_CONFLICT: "Readiness storage rejected a conflicting change.",
    READINESS_STORAGE_SCHEMA_INVALID: "Readiness stored history failed integrity verification.",
    READINESS_STORAGE_FAILED: "Readiness storage could not complete the operation."
  });

export class ReadinessRepositoryError extends Error {
  readonly code: ReadinessRepositoryErrorCode;

  constructor(code: ReadinessRepositoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReadinessRepositoryError";
    this.code = code;
  }
}

export interface ReadinessEvidenceSourcePort {
  getEvidenceSource(
    projectId: ProjectId,
    missionId: MissionId,
    evidenceSourceId: ValidationResult["evidenceSourceId"]
  ): Promise<EvidenceSource>;
}

export interface ReadinessSnapshotPort {
  get(snapshotId: GitSnapshotId): GitSnapshot;
}

export interface ReadinessReconciliationPort {
  latest(projectId: ProjectId, missionId: MissionId): Promise<EvaluateReadinessInput["reconciliation"] | undefined>;
  get(projectId: ProjectId, missionId: MissionId, revision: number): Promise<EvaluateReadinessInput["reconciliation"]>;
}

export interface ReadinessRepositoryDependencies {
  readonly evidence: ReadinessEvidenceSourcePort;
  readonly snapshots: ReadinessSnapshotPort;
  readonly reconciliations: ReadinessReconciliationPort;
}

interface ValidationRow {
  readonly validation_result_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly evidence_source_id: string;
  readonly snapshot_id: string;
  readonly validation_key: string;
  readonly status: string;
  readonly origin_kind: string;
  readonly result_digest: string;
  readonly recorded_at_utc: string;
  readonly canonical_json: string;
}

interface ReviewRow {
  readonly review_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly snapshot_id: string;
  readonly reconciliation_revision: number;
  readonly reconciliation_result_digest: string;
  readonly actor_kind: string;
  readonly recorded_at_utc: string;
  readonly review_digest: string;
  readonly canonical_json: string;
}

interface AssessmentRow {
  readonly assessment_key: string;
  readonly assessment_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly revision: number;
  readonly recorded_at_utc: string;
  readonly input_fingerprint_digest: string;
  readonly evaluated_status: string;
  readonly reconciliation_revision_key: string;
  readonly reconciliation_revision: number;
  readonly reconciliation_result_digest: string;
  readonly target_snapshot_id: string;
  readonly current_snapshot_id: string;
  readonly review_id: string | null;
  readonly validation_evidence_count: number;
  readonly predecessor_revision: number | null;
  readonly predecessor_digest: string | null;
  readonly assessment_digest: string;
  readonly canonical_json: string;
}

export interface PersistedValidationResult {
  readonly created: boolean;
  readonly validation: ValidationResult;
}

export interface PersistedReadinessReview {
  readonly created: boolean;
  readonly review: ReadinessReviewRecord;
}

export interface PersistedReadinessAssessment {
  readonly created: boolean;
  readonly assessment: ReadinessAssessment;
}

export interface ReadinessAssessmentPage {
  readonly items: readonly ReadinessAssessment[];
  readonly nextCursor: number | null;
}

const VALIDATION_SELECT = `
SELECT validation_result_id, project_id, mission_id, evidence_source_id,
       snapshot_id, validation_key, status, origin_kind, result_digest,
       recorded_at_utc, canonical_json
FROM validation_results
`.trim();

const REVIEW_SELECT = `
SELECT review_id, project_id, mission_id, snapshot_id,
       reconciliation_revision, reconciliation_result_digest, actor_kind,
       recorded_at_utc, review_digest, canonical_json
FROM readiness_reviews
`.trim();

const ASSESSMENT_SELECT = `
SELECT assessment_key, assessment_id, project_id, mission_id, revision,
       recorded_at_utc, input_fingerprint_digest, evaluated_status,
       reconciliation_revision_key, reconciliation_revision,
       reconciliation_result_digest, target_snapshot_id, current_snapshot_id,
       review_id, validation_evidence_count, predecessor_revision,
       predecessor_digest, assessment_digest, canonical_json
FROM release_assessments
`.trim();

function storageFailure(error: unknown): ReadinessRepositoryError {
  const code = typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" ? error.code : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new ReadinessRepositoryError("READINESS_STORAGE_CONFLICT");
  }
  if (["SQLITE_ERROR", "SQLITE_SCHEMA", "SQLITE_CORRUPT", "SQLITE_NOTADB"].includes(code)) {
    return new ReadinessRepositoryError("READINESS_STORAGE_SCHEMA_INVALID");
  }
  return new ReadinessRepositoryError("READINESS_STORAGE_FAILED");
}

function pageLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > READINESS_REPOSITORY_PAGE_LIMIT) {
    throw new ReadinessRepositoryError("READINESS_PAGE_INVALID");
  }
  return value;
}

function revisionCursor(value?: number): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ReadinessRepositoryError("READINESS_PAGE_INVALID");
  }
  return value;
}

function assessmentInput(
  assessment: ReadinessAssessment,
  reconciliation: EvaluateReadinessInput["reconciliation"]
): EvaluateReadinessInput {
  return {
    projectId: assessment.projectId,
    missionId: assessment.missionId,
    reconciliation,
    integrity: assessment.evaluation.integrity,
    currentSnapshotId: assessment.evaluation.currentSnapshotId,
    inputAuthority: assessment.evaluation.inputAuthority,
    reconciliationPersistence: assessment.evaluation.reconciliationPersistence,
    validationRequirements: assessment.evaluation.validationRequirements,
    validationEvidence: assessment.evaluation.validationEvidence,
    review: assessment.evaluation.review,
    freshness: assessment.evaluation.freshness
  };
}

export class SqliteReadinessRepository {
  readonly #connection: SqliteConnection;
  readonly #dependencies: ReadinessRepositoryDependencies;

  constructor(connection: SqliteConnection, dependencies: ReadinessRepositoryDependencies) {
    this.#connection = connection;
    this.#dependencies = dependencies;
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ReadinessRepositoryError) throw error;
      throw storageFailure(error);
    }
  }

  #assertScope(projectId: ProjectId, missionId: MissionId): void {
    if (this.#connection.prepare("SELECT 1 FROM projects WHERE project_id = ?").get(projectId) === undefined) {
      throw new ReadinessRepositoryError("READINESS_PROJECT_NOT_FOUND");
    }
    if (this.#connection.prepare(
      "SELECT 1 FROM missions WHERE mission_id = ? AND project_id = ?"
    ).get(missionId, projectId) === undefined) {
      throw new ReadinessRepositoryError("READINESS_MISSION_NOT_FOUND");
    }
  }

  async #hydrateValidation(row: ValidationRow): Promise<ValidationResult> {
    try {
      const validation = JSON.parse(row.canonical_json) as ValidationResult;
      const source = await this.#dependencies.evidence.getEvidenceSource(
        parseStableId<"PROJECT">(row.project_id),
        parseStableId<"MISSION">(row.mission_id),
        parseStableId<"EVIDENCE_SOURCE">(row.evidence_source_id)
      );
      const snapshot = this.#dependencies.snapshots.get(parseStableId<"GIT_SNAPSHOT">(row.snapshot_id));
      await assertValidationResultInvariant(validation, source, snapshot);
      if (
        canonicalizeJson(validation) !== row.canonical_json ||
        validation.validationResultId !== row.validation_result_id ||
        validation.projectId !== row.project_id || validation.missionId !== row.mission_id ||
        validation.evidenceSourceId !== row.evidence_source_id ||
        validation.snapshotId !== row.snapshot_id || validation.validationKey !== row.validation_key ||
        validation.status !== row.status || validation.origin !== row.origin_kind ||
        validation.resultDigest !== row.result_digest || validation.recordedAtUtc !== row.recorded_at_utc
      ) throw new TypeError("Validation row does not match its canonical record.");
      return Object.freeze(validation);
    } catch {
      throw new ReadinessRepositoryError("READINESS_STORAGE_SCHEMA_INVALID");
    }
  }

  async #hydrateReview(row: ReviewRow): Promise<ReadinessReviewRecord> {
    try {
      const projectId = parseStableId<"PROJECT">(row.project_id);
      const missionId = parseStableId<"MISSION">(row.mission_id);
      const reconciliation = await this.#dependencies.reconciliations.get(projectId, missionId, row.reconciliation_revision);
      const snapshot = this.#dependencies.snapshots.get(parseStableId<"GIT_SNAPSHOT">(row.snapshot_id));
      const review = await deserializeReadinessReview(row.canonical_json, reconciliation, snapshot);
      if (
        review.reviewId !== row.review_id || review.projectId !== row.project_id ||
        review.missionId !== row.mission_id || review.snapshotId !== row.snapshot_id ||
        review.reconciliationRevision !== row.reconciliation_revision ||
        review.reconciliationResultDigest !== row.reconciliation_result_digest ||
        review.actorKind !== row.actor_kind || review.recordedAtUtc !== row.recorded_at_utc ||
        review.reviewDigest !== row.review_digest
      ) throw new TypeError("Review row does not match its canonical record.");
      return review;
    } catch {
      throw new ReadinessRepositoryError("READINESS_STORAGE_SCHEMA_INVALID");
    }
  }

  async #hydrateAssessmentRow(row: AssessmentRow): Promise<ReadinessAssessment> {
    try {
      const rows = this.#connection.prepare(
        `${ASSESSMENT_SELECT} WHERE assessment_key = ? AND revision <= ? ORDER BY revision ASC`
      ).all(row.assessment_key, row.revision) as AssessmentRow[];
      if (rows.length !== row.revision) throw new TypeError("Assessment history is discontinuous.");
      let previous: ReadinessAssessment | undefined;
      for (const currentRow of rows) {
        const parsed = JSON.parse(currentRow.canonical_json) as ReadinessAssessment;
        const reconciliation = await this.#dependencies.reconciliations.get(
          parseStableId<"PROJECT">(currentRow.project_id),
          parseStableId<"MISSION">(currentRow.mission_id),
          currentRow.reconciliation_revision
        );
        const assessment = await deserializeReadinessAssessment(
          currentRow.canonical_json,
          assessmentInput(parsed, reconciliation),
          previous
        );
        if (
          assessment.assessmentKey !== currentRow.assessment_key ||
          assessment.assessmentId !== currentRow.assessment_id ||
          assessment.projectId !== currentRow.project_id || assessment.missionId !== currentRow.mission_id ||
          assessment.revision !== currentRow.revision || assessment.recordedAtUtc !== currentRow.recorded_at_utc ||
          assessment.inputFingerprintDigest !== currentRow.input_fingerprint_digest ||
          assessment.evaluatedStatus !== currentRow.evaluated_status ||
          assessment.evaluation.reconciliationBinding.revisionKey !== currentRow.reconciliation_revision_key ||
          assessment.evaluation.reconciliationBinding.revision !== currentRow.reconciliation_revision ||
          assessment.evaluation.reconciliationBinding.resultDigest !== currentRow.reconciliation_result_digest ||
          assessment.evaluation.targetSnapshotId !== currentRow.target_snapshot_id ||
          assessment.evaluation.currentSnapshotId !== currentRow.current_snapshot_id ||
          (assessment.evaluation.review.status === "RECORDED" ? assessment.evaluation.review.reviewId : null) !== currentRow.review_id ||
          assessment.evaluation.validationEvidence.length !== currentRow.validation_evidence_count ||
          (assessment.predecessor?.revision ?? null) !== currentRow.predecessor_revision ||
          (assessment.predecessor?.assessmentDigest ?? null) !== currentRow.predecessor_digest ||
          assessment.assessmentDigest !== currentRow.assessment_digest
        ) throw new TypeError("Assessment row does not match its canonical record.");
        for (const evidence of assessment.evaluation.validationEvidence) {
          const validationRow = this.#connection.prepare(
            `${VALIDATION_SELECT} WHERE validation_result_id = ?`
          ).get(evidence.validationResultId) as ValidationRow | undefined;
          if (validationRow === undefined) throw new TypeError("Assessment validation is missing.");
          const validation = await this.#hydrateValidation(validationRow);
          if (
            validation.projectId !== evidence.projectId || validation.missionId !== evidence.missionId ||
            validation.snapshotId !== evidence.snapshotId || validation.validationKey !== evidence.validationKey ||
            validation.status !== evidence.status || validation.origin !== evidence.origin ||
            validation.resultDigest !== evidence.resultDigest
          ) throw new TypeError("Assessment validation binding is invalid.");
        }
        if (assessment.evaluation.review.status === "RECORDED") {
          const reviewRow = this.#connection.prepare(`${REVIEW_SELECT} WHERE review_id = ?`)
            .get(assessment.evaluation.review.reviewId) as ReviewRow | undefined;
          if (reviewRow === undefined) throw new TypeError("Assessment review is missing.");
          const review = await this.#hydrateReview(reviewRow);
          if (
            review.reviewId !== assessment.evaluation.review.reviewId ||
            review.actorKind !== assessment.evaluation.review.actorKind ||
            review.projectId !== assessment.evaluation.review.projectId ||
            review.missionId !== assessment.evaluation.review.missionId ||
            review.snapshotId !== assessment.evaluation.review.snapshotId ||
            review.reconciliationResultDigest !==
              assessment.evaluation.review.reconciliationResultDigest ||
            review.reviewDigest !== assessment.evaluation.review.reviewDigest
          ) {
            throw new TypeError("Assessment review binding is invalid.");
          }
        }
        previous = assessment;
      }
      const hydrated = previous;
      if (hydrated === undefined || hydrated.assessmentId !== row.assessment_id) {
        throw new TypeError("Assessment history does not resolve to requested row.");
      }
      return hydrated;
    } catch (error) {
      if (error instanceof ReadinessRepositoryError) throw error;
      throw new ReadinessRepositoryError("READINESS_STORAGE_SCHEMA_INVALID");
    }
  }

  latestSnapshot(projectId: ProjectId, missionId: MissionId): GitSnapshot | undefined {
    this.#assertScope(projectId, missionId);
    const row = this.#connection.prepare(
      `SELECT snapshot_id FROM git_snapshots
       WHERE project_id = ? AND mission_id = ?
       ORDER BY captured_at_utc DESC, snapshot_id DESC LIMIT 1`
    ).get(projectId, missionId) as { readonly snapshot_id: string } | undefined;
    return row === undefined ? undefined : this.#dependencies.snapshots.get(parseStableId<"GIT_SNAPSHOT">(row.snapshot_id));
  }

  reconciliationLatest(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<EvaluateReadinessInput["reconciliation"] | undefined> {
    return this.#dependencies.reconciliations.latest(projectId, missionId);
  }

  snapshot(snapshotId: GitSnapshotId): GitSnapshot {
    return this.#dependencies.snapshots.get(snapshotId);
  }

  async persistValidation(validation: ValidationResult): Promise<PersistedValidationResult> {
    return this.#guard(async () => {
      this.#assertScope(validation.projectId, validation.missionId);
      const source = await this.#dependencies.evidence.getEvidenceSource(
        validation.projectId, validation.missionId, validation.evidenceSourceId
      );
      const snapshot = this.#dependencies.snapshots.get(validation.snapshotId);
      await assertValidationResultInvariant(validation, source, snapshot);
      const serialized = canonicalizeJson(validation);
      const result = this.#connection.transaction(() => {
        this.#assertScope(validation.projectId, validation.missionId);
        const existing = this.#connection.prepare(`${VALIDATION_SELECT} WHERE validation_result_id = ?`)
          .get(validation.validationResultId) as ValidationRow | undefined;
        if (existing !== undefined) {
          if (existing.canonical_json !== serialized) {
            throw new ReadinessRepositoryError("READINESS_STORAGE_CONFLICT");
          }
          return { created: false, row: existing };
        }
        this.#connection.prepare(
          `INSERT INTO validation_results (
             validation_result_id, project_id, mission_id, evidence_source_id,
             snapshot_id, validation_key, status, origin_kind, result_digest,
             recorded_at_utc, canonical_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          validation.validationResultId, validation.projectId, validation.missionId,
          validation.evidenceSourceId, validation.snapshotId, validation.validationKey,
          validation.status, validation.origin, validation.resultDigest,
          validation.recordedAtUtc, serialized
        );
        return { created: true, row: undefined };
      }).immediate();
      return result.created
        ? Object.freeze({ created: true, validation })
        : Object.freeze({ created: false, validation: await this.#hydrateValidation(result.row!) });
    });
  }

  async getValidation(
    projectId: ProjectId,
    missionId: MissionId,
    validationResultId: ValidationResultId
  ): Promise<ValidationResult> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const row = this.#connection.prepare(
        `${VALIDATION_SELECT} WHERE project_id = ? AND mission_id = ? AND validation_result_id = ?`
      ).get(projectId, missionId, validationResultId) as ValidationRow | undefined;
      if (row === undefined) {
        throw new ReadinessRepositoryError("READINESS_VALIDATION_NOT_FOUND");
      }
      return this.#hydrateValidation(row);
    });
  }

  async listLatestValidations(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<readonly ValidationResult[]> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const rows = this.#connection.prepare(
        `${VALIDATION_SELECT} WHERE project_id = ? AND mission_id = ?
         ORDER BY validation_key, recorded_at_utc DESC, validation_result_id DESC`
      ).all(projectId, missionId) as ValidationRow[];
      const latest = new Map<string, ValidationRow>();
      for (const row of rows) {
        if (!latest.has(row.validation_key)) latest.set(row.validation_key, row);
      }
      if (latest.size > 256) {
        throw new ReadinessRepositoryError("READINESS_STORAGE_SCHEMA_INVALID");
      }
      return Object.freeze(await Promise.all(
        [...latest.values()].map((row) => this.#hydrateValidation(row))
      ));
    });
  }

  async latestValidation(
    projectId: ProjectId,
    missionId: MissionId,
    validationKey: ValidationKey
  ): Promise<ValidationResult | undefined> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const row = this.#connection.prepare(
        `${VALIDATION_SELECT} WHERE project_id = ? AND mission_id = ? AND validation_key = ?
         ORDER BY recorded_at_utc DESC, validation_result_id DESC LIMIT 1`
      ).get(projectId, missionId, validationKey) as ValidationRow | undefined;
      return row === undefined ? undefined : this.#hydrateValidation(row);
    });
  }

  async persistReview(review: ReadinessReviewRecord): Promise<PersistedReadinessReview> {
    return this.#guard(async () => {
      this.#assertScope(review.projectId, review.missionId);
      const reconciliation = await this.#dependencies.reconciliations.get(
        review.projectId, review.missionId, review.reconciliationRevision
      );
      const snapshot = this.#dependencies.snapshots.get(review.snapshotId);
      await assertReadinessReviewInvariant(review, reconciliation, snapshot);
      const serialized = await serializeReadinessReview(review);
      const result = this.#connection.transaction(() => {
        this.#assertScope(review.projectId, review.missionId);
        const existing = this.#connection.prepare(`${REVIEW_SELECT} WHERE review_id = ?`)
          .get(review.reviewId) as ReviewRow | undefined;
        if (existing !== undefined) {
          if (existing.canonical_json !== serialized) {
            throw new ReadinessRepositoryError("READINESS_STORAGE_CONFLICT");
          }
          return { created: false, row: existing };
        }
        this.#connection.prepare(
          `INSERT INTO readiness_reviews (
             review_id, project_id, mission_id, snapshot_id,
             reconciliation_revision, reconciliation_result_digest, actor_kind,
             recorded_at_utc, review_digest, canonical_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          review.reviewId, review.projectId, review.missionId, review.snapshotId,
          review.reconciliationRevision, review.reconciliationResultDigest,
          review.actorKind, review.recordedAtUtc, review.reviewDigest, serialized
        );
        return { created: true, row: undefined };
      }).immediate();
      return result.created
        ? Object.freeze({ created: true, review })
        : Object.freeze({ created: false, review: await this.#hydrateReview(result.row!) });
    });
  }

  async latestReview(projectId: ProjectId, missionId: MissionId): Promise<ReadinessReviewRecord | undefined> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const row = this.#connection.prepare(
        `${REVIEW_SELECT} WHERE project_id = ? AND mission_id = ?
         ORDER BY recorded_at_utc DESC, review_id DESC LIMIT 1`
      ).get(projectId, missionId) as ReviewRow | undefined;
      return row === undefined ? undefined : this.#hydrateReview(row);
    });
  }

  async latestAssessment(projectId: ProjectId, missionId: MissionId): Promise<ReadinessAssessment | undefined> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const row = this.#connection.prepare(
        `${ASSESSMENT_SELECT} WHERE project_id = ? AND mission_id = ? ORDER BY revision DESC LIMIT 1`
      ).get(projectId, missionId) as AssessmentRow | undefined;
      return row === undefined ? undefined : this.#hydrateAssessmentRow(row);
    });
  }

  async getAssessment(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<ReadinessAssessment> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsed = revisionCursor(revision);
      const row = this.#connection.prepare(
        `${ASSESSMENT_SELECT} WHERE project_id = ? AND mission_id = ? AND revision = ?`
      ).get(projectId, missionId, parsed) as AssessmentRow | undefined;
      if (row === undefined) throw new ReadinessRepositoryError("READINESS_ASSESSMENT_NOT_FOUND");
      return this.#hydrateAssessmentRow(row);
    });
  }

  async listAssessments(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<ReadinessAssessmentPage> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsedLimit = pageLimit(limit);
      const parsedCursor = revisionCursor(cursor);
      const rows = this.#connection.prepare(
        `${ASSESSMENT_SELECT} WHERE project_id = ? AND mission_id = ?
         AND (? IS NULL OR revision < ?) ORDER BY revision DESC LIMIT ?`
      ).all(projectId, missionId, parsedCursor ?? null, parsedCursor ?? null, parsedLimit + 1) as AssessmentRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(rows.slice(0, parsedLimit).map((row) => this.#hydrateAssessmentRow(row)));
      return Object.freeze({
        items: Object.freeze(items),
        nextCursor: hasNext && items.length > 0 ? items.at(-1)?.revision ?? null : null
      });
    });
  }

  async persistAssessment(candidate: ReadinessAssessment): Promise<PersistedReadinessAssessment> {
    return this.#guard(async () => {
      this.#assertScope(candidate.projectId, candidate.missionId);
      const existing = this.#connection.prepare(
        `${ASSESSMENT_SELECT} WHERE mission_id = ? AND input_fingerprint_digest = ?`
      ).get(candidate.missionId, candidate.inputFingerprintDigest) as AssessmentRow | undefined;
      if (existing !== undefined) {
        return Object.freeze({
          created: false,
          assessment: await this.#hydrateAssessmentRow(existing)
        });
      }
      const reconciliation = await this.#dependencies.reconciliations.get(
        candidate.projectId, candidate.missionId, candidate.evaluation.reconciliationBinding.revision
      );
      const observedLatest = await this.latestAssessment(candidate.projectId, candidate.missionId);
      await assertReadinessAssessmentInvariant(candidate, assessmentInput(candidate, reconciliation), observedLatest);
      const serialized = await serializeReadinessAssessment(candidate);
      const result = this.#connection.transaction(() => {
        this.#assertScope(candidate.projectId, candidate.missionId);
        const existing = this.#connection.prepare(
          `${ASSESSMENT_SELECT} WHERE mission_id = ? AND input_fingerprint_digest = ?`
        ).get(candidate.missionId, candidate.inputFingerprintDigest) as AssessmentRow | undefined;
        if (existing !== undefined) return { kind: "EXISTING" as const, row: existing };
        const latest = this.#connection.prepare(
          `${ASSESSMENT_SELECT} WHERE mission_id = ? ORDER BY revision DESC LIMIT 1`
        ).get(candidate.missionId) as AssessmentRow | undefined;
        if (
          (latest === undefined && candidate.revision !== 1) ||
          (latest !== undefined && (
            candidate.revision !== latest.revision + 1 ||
            candidate.predecessor?.revision !== latest.revision ||
            candidate.predecessor?.assessmentDigest !== latest.assessment_digest
          ))
        ) throw new ReadinessRepositoryError("READINESS_PREDECESSOR_CONFLICT");
        const currentReconciliation = this.#connection.prepare(
          `SELECT revision, result_digest FROM reconciliation_impact_revisions
           WHERE project_id = ? AND mission_id = ?
           ORDER BY revision DESC LIMIT 1`
        ).get(
          candidate.projectId, candidate.missionId
        ) as { readonly revision: number; readonly result_digest: string } | undefined;
        const currentSnapshot = this.#connection.prepare(
          `SELECT snapshot_id FROM git_snapshots
           WHERE project_id = ? AND mission_id = ?
           ORDER BY captured_at_utc DESC, snapshot_id DESC LIMIT 1`
        ).get(candidate.projectId, candidate.missionId) as { readonly snapshot_id: string } | undefined;
        const currentReview = this.#connection.prepare(
          `SELECT review_id FROM readiness_reviews
           WHERE project_id = ? AND mission_id = ?
           ORDER BY recorded_at_utc DESC, review_id DESC LIMIT 1`
        ).get(candidate.projectId, candidate.missionId) as { readonly review_id: string } | undefined;
        const expectedReviewId = candidate.evaluation.review.status === "RECORDED"
          ? candidate.evaluation.review.reviewId : undefined;
        if (
          currentReconciliation?.revision !== candidate.evaluation.reconciliationBinding.revision ||
          currentReconciliation.result_digest !== candidate.evaluation.reconciliationBinding.resultDigest ||
          currentSnapshot?.snapshot_id !== candidate.evaluation.currentSnapshotId ||
          currentReview?.review_id !== expectedReviewId
        ) {
          throw new ReadinessRepositoryError("READINESS_DEPENDENCY_CONFLICT");
        }
        const evidenceByKey = new Map(
          candidate.evaluation.validationEvidence.map((entry) => [entry.validationKey, entry.validationResultId])
        );
        for (const requirement of candidate.evaluation.validationRequirements) {
          const latestValidation = this.#connection.prepare(
            `SELECT validation_result_id FROM validation_results
             WHERE project_id = ? AND mission_id = ? AND validation_key = ?
             ORDER BY recorded_at_utc DESC, validation_result_id DESC LIMIT 1`
          ).get(
            candidate.projectId, candidate.missionId, requirement.validationKey
          ) as { readonly validation_result_id: string } | undefined;
          if (latestValidation?.validation_result_id !== evidenceByKey.get(requirement.validationKey)) {
            throw new ReadinessRepositoryError("READINESS_DEPENDENCY_CONFLICT");
          }
        }
        this.#connection.prepare(
          `INSERT INTO release_assessments (
             assessment_key, assessment_id, project_id, mission_id, revision,
             recorded_at_utc, input_fingerprint_digest, evaluated_status,
             reconciliation_revision_key, reconciliation_revision,
             reconciliation_result_digest, target_snapshot_id, current_snapshot_id,
             review_id, validation_evidence_count, predecessor_revision,
             predecessor_digest, assessment_digest, canonical_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          candidate.assessmentKey, candidate.assessmentId, candidate.projectId,
          candidate.missionId, candidate.revision, candidate.recordedAtUtc,
          candidate.inputFingerprintDigest, candidate.evaluatedStatus,
          candidate.evaluation.reconciliationBinding.revisionKey,
          candidate.evaluation.reconciliationBinding.revision,
          candidate.evaluation.reconciliationBinding.resultDigest,
          candidate.evaluation.targetSnapshotId, candidate.evaluation.currentSnapshotId,
          candidate.evaluation.review.status === "RECORDED" ? candidate.evaluation.review.reviewId : null,
          candidate.evaluation.validationEvidence.length,
          candidate.predecessor?.revision ?? null,
          candidate.predecessor?.assessmentDigest ?? null,
          candidate.assessmentDigest, serialized
        );
        return { kind: "CREATED" as const };
      }).immediate();
      return result.kind === "CREATED"
        ? Object.freeze({ created: true, assessment: candidate })
        : Object.freeze({ created: false, assessment: await this.#hydrateAssessmentRow(result.row) });
    });
  }
}
