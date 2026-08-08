import {
  assertReleasePassportInvariant,
  deserializeReleasePassport,
  serializeReleasePassport,
  type MissionId,
  type ProjectId,
  type ReadinessAssessment,
  type ReleasePassport,
  type ReadinessAssessmentId
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";
import { SqliteReadinessRepository } from "../readiness/readiness-repository.js";

export const PASSPORT_REPOSITORY_PAGE_LIMIT = 100;

export const PASSPORT_REPOSITORY_ERROR_CODES = [
  "PASSPORT_NOT_FOUND",
  "PASSPORT_PAGE_INVALID",
  "PASSPORT_ASSESSMENT_CONFLICT",
  "PASSPORT_STORAGE_CONFLICT",
  "PASSPORT_STORAGE_SCHEMA_INVALID",
  "PASSPORT_STORAGE_FAILED"
] as const;

export type PassportRepositoryErrorCode =
  (typeof PASSPORT_REPOSITORY_ERROR_CODES)[number];

export class PassportRepositoryError extends Error {
  readonly code: PassportRepositoryErrorCode;

  constructor(code: PassportRepositoryErrorCode) {
    super({
      PASSPORT_NOT_FOUND: "Release Passport was not found.",
      PASSPORT_PAGE_INVALID: "Release Passport page request is invalid.",
      PASSPORT_ASSESSMENT_CONFLICT: "Release Passport assessment changed before persistence completed.",
      PASSPORT_STORAGE_CONFLICT: "Release Passport storage rejected a conflicting change.",
      PASSPORT_STORAGE_SCHEMA_INVALID: "Stored Release Passport failed integrity verification.",
      PASSPORT_STORAGE_FAILED: "Release Passport storage could not complete the operation."
    }[code]);
    this.name = "PassportRepositoryError";
    this.code = code;
  }
}

interface PassportRow {
  readonly passport_key: string;
  readonly passport_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly recorded_at_utc: string;
  readonly assessment_id: string;
  readonly assessment_revision: number;
  readonly assessment_digest: string;
  readonly status_at_projection: string;
  readonly evidence_digest: string;
  readonly passport_digest: string;
  readonly canonical_json: string;
}

export interface PersistedReleasePassport {
  readonly created: boolean;
  readonly passport: ReleasePassport;
}

export interface ReleasePassportPage {
  readonly items: readonly ReleasePassport[];
  readonly nextCursor: number | null;
}

const PASSPORT_SELECT = `
SELECT passport_key, passport_id, project_id, mission_id, recorded_at_utc,
       assessment_id, assessment_revision, assessment_digest,
       status_at_projection, evidence_digest, passport_digest, canonical_json
FROM release_passports
`.trim();

function storageFailure(error: unknown): PassportRepositoryError {
  const code = typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" ? error.code : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new PassportRepositoryError("PASSPORT_STORAGE_CONFLICT");
  }
  if (["SQLITE_ERROR", "SQLITE_SCHEMA", "SQLITE_CORRUPT", "SQLITE_NOTADB"].includes(code)) {
    return new PassportRepositoryError("PASSPORT_STORAGE_SCHEMA_INVALID");
  }
  return new PassportRepositoryError("PASSPORT_STORAGE_FAILED");
}

function pageValue(value: number, code: "limit" | "cursor"): number {
  if (!Number.isSafeInteger(value) || value < 1 ||
    (code === "limit" && value > PASSPORT_REPOSITORY_PAGE_LIMIT)) {
    throw new PassportRepositoryError("PASSPORT_PAGE_INVALID");
  }
  return value;
}

export class SqlitePassportRepository {
  readonly #connection: SqliteConnection;
  readonly #readiness: SqliteReadinessRepository;

  constructor(connection: SqliteConnection, readiness: SqliteReadinessRepository) {
    this.#connection = connection;
    this.#readiness = readiness;
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PassportRepositoryError) throw error;
      throw storageFailure(error);
    }
  }

  async #hydrate(row: PassportRow): Promise<ReleasePassport> {
    try {
      const assessment = await this.#readiness.getAssessment(
        row.project_id as ProjectId,
        row.mission_id as MissionId,
        row.assessment_revision
      );
      if (
        assessment.assessmentId !== row.assessment_id ||
        assessment.assessmentDigest !== row.assessment_digest
      ) throw new TypeError("Passport assessment row is inconsistent.");
      const passport = await deserializeReleasePassport(row.canonical_json, assessment);
      if (
        passport.passportKey !== row.passport_key ||
        passport.passportId !== row.passport_id ||
        passport.projectId !== row.project_id ||
        passport.missionId !== row.mission_id ||
        passport.recordedAtUtc !== row.recorded_at_utc ||
        passport.assessment.assessmentId !== row.assessment_id ||
        passport.assessment.revision !== row.assessment_revision ||
        passport.assessment.assessmentDigest !== row.assessment_digest ||
        passport.status !== row.status_at_projection ||
        passport.evidenceDigest !== row.evidence_digest ||
        passport.passportDigest !== row.passport_digest
      ) throw new TypeError("Passport row does not match canonical JSON.");
      return passport;
    } catch (error) {
      if (error instanceof PassportRepositoryError) throw error;
      throw new PassportRepositoryError("PASSPORT_STORAGE_SCHEMA_INVALID");
    }
  }

  async byAssessment(
    projectId: ProjectId,
    missionId: MissionId,
    assessmentId: ReadinessAssessmentId
  ): Promise<ReleasePassport | undefined> {
    return this.#guard(async () => {
      const row = this.#connection.prepare(
        `${PASSPORT_SELECT} WHERE project_id = ? AND mission_id = ? AND assessment_id = ?`
      ).get(projectId, missionId, assessmentId) as PassportRow | undefined;
      return row === undefined ? undefined : this.#hydrate(row);
    });
  }

  async persist(
    candidate: ReleasePassport,
    assessment: ReadinessAssessment
  ): Promise<PersistedReleasePassport> {
    return this.#guard(async () => {
      const authoritative = await this.#readiness.getAssessment(
        candidate.projectId, candidate.missionId, candidate.assessment.revision
      );
      if (
        authoritative.assessmentId !== assessment.assessmentId ||
        authoritative.assessmentDigest !== assessment.assessmentDigest ||
        candidate.assessment.assessmentId !== authoritative.assessmentId
      ) throw new PassportRepositoryError("PASSPORT_ASSESSMENT_CONFLICT");
      await assertReleasePassportInvariant(candidate, authoritative);
      const serialized = await serializeReleasePassport(candidate);
      const result = this.#connection.transaction(() => {
        const existing = this.#connection.prepare(
          `${PASSPORT_SELECT} WHERE assessment_id = ?`
        ).get(authoritative.assessmentId) as PassportRow | undefined;
        if (existing !== undefined) return { created: false, row: existing };
        const current = this.#connection.prepare(
          `SELECT assessment_id, assessment_digest, input_fingerprint_digest, evaluated_status
           FROM release_assessments
           WHERE project_id = ? AND mission_id = ? AND revision = ?`
        ).get(candidate.projectId, candidate.missionId, candidate.assessment.revision) as
          | {
              readonly assessment_id: string;
              readonly assessment_digest: string;
              readonly input_fingerprint_digest: string;
              readonly evaluated_status: string;
            }
          | undefined;
        if (
          current?.assessment_id !== candidate.assessment.assessmentId ||
          current.assessment_digest !== candidate.assessment.assessmentDigest ||
          current.input_fingerprint_digest !== candidate.evidenceDigest ||
          current.evaluated_status !== candidate.status
        ) throw new PassportRepositoryError("PASSPORT_ASSESSMENT_CONFLICT");
        this.#connection.prepare(
          `INSERT INTO release_passports (
             passport_key, passport_id, project_id, mission_id, recorded_at_utc,
             assessment_id, assessment_revision, assessment_digest,
             status_at_projection, evidence_digest, passport_digest, canonical_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          candidate.passportKey, candidate.passportId, candidate.projectId,
          candidate.missionId, candidate.recordedAtUtc,
          candidate.assessment.assessmentId, candidate.assessment.revision,
          candidate.assessment.assessmentDigest, candidate.status,
          candidate.evidenceDigest, candidate.passportDigest, serialized
        );
        return { created: true, row: undefined };
      }).immediate();
      return result.created
        ? Object.freeze({ created: true, passport: candidate })
        : Object.freeze({ created: false, passport: await this.#hydrate(result.row!) });
    });
  }

  async get(
    projectId: ProjectId,
    missionId: MissionId,
    assessmentRevision: number
  ): Promise<ReleasePassport> {
    return this.#guard(async () => {
      pageValue(assessmentRevision, "cursor");
      await this.#readiness.getAssessment(projectId, missionId, assessmentRevision);
      const row = this.#connection.prepare(
        `${PASSPORT_SELECT} WHERE project_id = ? AND mission_id = ? AND assessment_revision = ?`
      ).get(projectId, missionId, assessmentRevision) as PassportRow | undefined;
      if (row === undefined) throw new PassportRepositoryError("PASSPORT_NOT_FOUND");
      return this.#hydrate(row);
    });
  }

  async list(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<ReleasePassportPage> {
    return this.#guard(async () => {
      const parsedLimit = pageValue(limit, "limit");
      const parsedCursor = cursor === undefined ? undefined : pageValue(cursor, "cursor");
      await this.#readiness.latestAssessment(projectId, missionId);
      const rows = this.#connection.prepare(
        `${PASSPORT_SELECT} WHERE project_id = ? AND mission_id = ?
         AND (? IS NULL OR assessment_revision < ?)
         ORDER BY assessment_revision DESC LIMIT ?`
      ).all(
        projectId, missionId, parsedCursor ?? null, parsedCursor ?? null, parsedLimit + 1
      ) as PassportRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(rows.slice(0, parsedLimit).map((row) => this.#hydrate(row)));
      return Object.freeze({
        items: Object.freeze(items),
        nextCursor: hasNext && items.length > 0
          ? items.at(-1)?.assessment.revision ?? null
          : null
      });
    });
  }
}
