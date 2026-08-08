import { randomUUID } from "node:crypto";

import {
  CLAIM_NORMALIZATION_VERSION,
  ClaimError,
  assertClaimSupersessionInvariant,
  canonicalizeJson,
  claimFromStorage,
  createClaim,
  createClock,
  createStableIdGenerator,
  normalizeClaimApplicability,
  normalizeClaimTerm,
  normalizeClaimValue,
  parseEvidenceSourceLocator,
  parseEvidenceSourceRevision,
  parseSha256Digest,
  parseStableId,
  parseUtcTimestamp,
  type Claim,
  type ClaimDependencies,
  type ClaimExtractionMethod,
  type ClaimId,
  type ClaimSupersession,
  type ClaimSupersessionId,
  type CreateClaimInput,
  type EpistemicLabel,
  type MissionId,
  type OriginKind,
  type ProjectId
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";
import {
  EvidenceRepositoryError,
  SqliteEvidenceRepository
} from "./evidence-repository.js";

export const CLAIM_REPOSITORY_ERROR_CODES = [
  "CLAIM_PROJECT_NOT_FOUND",
  "CLAIM_MISSION_NOT_FOUND",
  "CLAIM_CROSS_SCOPE",
  "CLAIM_MISSION_NOT_CURRENT",
  "CLAIM_SOURCE_NOT_FOUND",
  "CLAIM_NOT_FOUND",
  "CLAIM_PREDECESSOR_NOT_FOUND",
  "CLAIM_SUPERSESSION_CONFLICT",
  "CLAIM_HISTORY_LIMIT",
  "CLAIM_PAGE_INVALID",
  "CLAIM_STORAGE_CONFLICT",
  "CLAIM_STORAGE_SCHEMA_INVALID",
  "CLAIM_STORAGE_FAILED"
] as const;

export type ClaimRepositoryErrorCode =
  (typeof CLAIM_REPOSITORY_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<ClaimRepositoryErrorCode, string>> =
  Object.freeze({
    CLAIM_PROJECT_NOT_FOUND: "Claim project was not found.",
    CLAIM_MISSION_NOT_FOUND: "Claim mission was not found.",
    CLAIM_CROSS_SCOPE: "Cross-scope claim access is not allowed.",
    CLAIM_MISSION_NOT_CURRENT:
      "Claims can be recorded only for a current mission.",
    CLAIM_SOURCE_NOT_FOUND: "Claim evidence source was not found.",
    CLAIM_NOT_FOUND: "Claim was not found.",
    CLAIM_PREDECESSOR_NOT_FOUND: "Predecessor claim was not found.",
    CLAIM_SUPERSESSION_CONFLICT:
      "Predecessor claim already has an explicit successor.",
    CLAIM_HISTORY_LIMIT: "Claim supersession history limit was reached.",
    CLAIM_PAGE_INVALID: "Claim page request is invalid.",
    CLAIM_STORAGE_CONFLICT: "Claim storage rejected a conflicting change.",
    CLAIM_STORAGE_SCHEMA_INVALID: "Claim storage schema is invalid.",
    CLAIM_STORAGE_FAILED: "Claim storage could not complete the operation."
  });

export class ClaimRepositoryError extends Error {
  readonly code: ClaimRepositoryErrorCode;

  constructor(code: ClaimRepositoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ClaimRepositoryError";
    this.code = code;
  }
}

export interface PersistClaimResult {
  readonly created: boolean;
  readonly claim: Claim;
  readonly supersession?: ClaimSupersession;
}

export interface ClaimPage {
  readonly items: readonly Claim[];
  readonly nextCursor: ClaimId | null;
}

export interface ClaimSupersessionPage {
  readonly items: readonly ClaimSupersession[];
  readonly nextCursor: ClaimSupersessionId | null;
}

interface MissionScopeRow {
  readonly project_status: string;
  readonly mission_project_id: string;
  readonly mission_status: string;
}

interface ClaimRow {
  readonly claim_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly evidence_source_id: string;
  readonly import_key: string;
  readonly claim_digest: string;
  readonly normalization_version: string;
  readonly origin_kind: string;
  readonly source_locator: string;
  readonly source_revision: string;
  readonly source_content_digest: string;
  readonly recorded_at_utc: string;
  readonly effective_at_utc: string | null;
  readonly extraction_method: string;
  readonly epistemic_label: string;
  readonly raw_text: string;
  readonly subject_term: string;
  readonly predicate_term: string;
  readonly comparison_key: string;
  readonly value_json: string;
  readonly applicability_json: string;
  readonly applicability_key: string;
}

interface ClaimSupersessionRow {
  readonly claim_supersession_id: string;
  readonly relationship_type: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly predecessor_claim_id: string;
  readonly successor_claim_id: string;
  readonly evidence_source_id: string;
  readonly comparison_key: string;
  readonly applicability_key: string;
  readonly origin_kind: string;
  readonly source_locator: string;
  readonly source_revision: string;
  readonly source_content_digest: string;
  readonly recorded_at_utc: string;
  readonly effective_at_utc: string | null;
  readonly extraction_method: string;
  readonly epistemic_label: string;
  readonly link_digest: string;
}

type PersistTransactionResult =
  | { readonly kind: "CREATED"; readonly value: PersistClaimResult }
  | { readonly kind: "EXISTING"; readonly claimRow: ClaimRow };

const CLAIM_SELECT = `
SELECT
  claim_id,
  project_id,
  mission_id,
  evidence_source_id,
  import_key,
  claim_digest,
  normalization_version,
  origin_kind,
  source_locator,
  source_revision,
  source_content_digest,
  recorded_at_utc,
  effective_at_utc,
  extraction_method,
  epistemic_label,
  raw_text,
  subject_term,
  predicate_term,
  comparison_key,
  value_json,
  applicability_json,
  applicability_key
FROM claims
`.trim();

const CLAIM_SUPERSESSION_SELECT = `
SELECT
  claim_supersession_id,
  relationship_type,
  project_id,
  mission_id,
  predecessor_claim_id,
  successor_claim_id,
  evidence_source_id,
  comparison_key,
  applicability_key,
  origin_kind,
  source_locator,
  source_revision,
  source_content_digest,
  recorded_at_utc,
  effective_at_utc,
  extraction_method,
  epistemic_label,
  link_digest
FROM claim_supersessions
`.trim();

const MAXIMUM_CLAIM_HISTORY_DEPTH = 100;

function storageFailure(error: unknown): ClaimRepositoryError {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new ClaimRepositoryError("CLAIM_STORAGE_CONFLICT");
  }
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB"
  ) {
    return new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
  }
  return new ClaimRepositoryError("CLAIM_STORAGE_FAILED");
}

function parsePageLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new ClaimRepositoryError("CLAIM_PAGE_INVALID");
  }
  return value;
}

function parseClaimCursor(value: ClaimId | undefined): ClaimId | undefined {
  if (value === undefined) return undefined;
  try {
    return parseStableId<"CLAIM">(value);
  } catch {
    throw new ClaimRepositoryError("CLAIM_PAGE_INVALID");
  }
}

function parseSupersessionCursor(
  value: ClaimSupersessionId | undefined
): ClaimSupersessionId | undefined {
  if (value === undefined) return undefined;
  try {
    return parseStableId<"CLAIM_SUPERSESSION">(value);
  } catch {
    throw new ClaimRepositoryError("CLAIM_PAGE_INVALID");
  }
}

function applicabilityJson(claim: Claim): string {
  return canonicalizeJson({
    dimensions: claim.applicability.dimensions.map((entry) => ({
      dimension: entry.dimension,
      value: entry.value
    })),
    effectiveFromUtc: claim.applicability.effectiveFromUtc ?? null,
    effectiveUntilUtc: claim.applicability.effectiveUntilUtc ?? null
  });
}

function parseApplicabilityJson(value: string): Claim["applicability"] {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null) {
    throw new TypeError("Invalid claim applicability.");
  }
  const candidate = parsed as {
    readonly dimensions?: unknown;
    readonly effectiveFromUtc?: unknown;
    readonly effectiveUntilUtc?: unknown;
  };
  if (!Array.isArray(candidate.dimensions)) {
    throw new TypeError("Invalid claim applicability.");
  }
  return normalizeClaimApplicability({
    dimensions: candidate.dimensions as never,
    ...(candidate.effectiveFromUtc === null
      ? {}
      : { effectiveFromUtc: candidate.effectiveFromUtc as string }),
    ...(candidate.effectiveUntilUtc === null
      ? {}
      : { effectiveUntilUtc: candidate.effectiveUntilUtc as string })
  });
}

export class SqliteClaimRepository {
  readonly #connection: SqliteConnection;
  readonly #dependencies: ClaimDependencies;
  readonly #evidence: SqliteEvidenceRepository;

  constructor(
    connection: SqliteConnection,
    dependencies: ClaimDependencies = {
      ids: createStableIdGenerator(() => randomUUID()),
      clock: createClock(() => new Date())
    }
  ) {
    this.#connection = connection;
    this.#dependencies = dependencies;
    this.#evidence = new SqliteEvidenceRepository(connection);
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ClaimRepositoryError || error instanceof ClaimError) {
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
      throw new ClaimRepositoryError("CLAIM_PROJECT_NOT_FOUND");
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
      throw new ClaimRepositoryError("CLAIM_MISSION_NOT_FOUND");
    }
    if (mission.mission_project_id !== projectId) {
      throw new ClaimRepositoryError("CLAIM_CROSS_SCOPE");
    }
    if (
      requireCurrent &&
      (project.lifecycle_status !== "ACTIVE" ||
        mission.project_status !== "ACTIVE" ||
        mission.mission_status !== "CURRENT")
    ) {
      throw new ClaimRepositoryError("CLAIM_MISSION_NOT_CURRENT");
    }
  }

  #claimRow(
    projectId: ProjectId,
    missionId: MissionId,
    claimId: ClaimId
  ): ClaimRow | undefined {
    return this.#connection
      .prepare(
        `${CLAIM_SELECT}
         WHERE project_id = ? AND mission_id = ? AND claim_id = ?`
      )
      .get(projectId, missionId, claimId) as ClaimRow | undefined;
  }

  #supersessionRowForSuccessor(
    successorClaimId: ClaimId
  ): ClaimSupersessionRow | undefined {
    return this.#connection
      .prepare(
        `${CLAIM_SUPERSESSION_SELECT}
         WHERE successor_claim_id = ?`
      )
      .get(successorClaimId) as ClaimSupersessionRow | undefined;
  }

  #historyDepth(claimId: ClaimId): number {
    let current = claimId;
    const seen = new Set<string>();
    for (let depth = 1; depth <= MAXIMUM_CLAIM_HISTORY_DEPTH; depth += 1) {
      if (seen.has(current)) {
        throw new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
      }
      seen.add(current);
      const link = this.#supersessionRowForSuccessor(current);
      if (link === undefined) return depth;
      current = parseStableId<"CLAIM">(link.predecessor_claim_id);
    }
    throw new ClaimRepositoryError("CLAIM_HISTORY_LIMIT");
  }

  #linkValue(row: ClaimSupersessionRow): ClaimSupersession {
    return Object.freeze({
      entityType: "ClaimSupersession" as const,
      relationshipType: row.relationship_type as "SUPERSEDES",
      claimSupersessionId: parseStableId<"CLAIM_SUPERSESSION">(
        row.claim_supersession_id
      ),
      projectId: parseStableId<"PROJECT">(row.project_id),
      missionId: parseStableId<"MISSION">(row.mission_id),
      predecessorClaimId: parseStableId<"CLAIM">(
        row.predecessor_claim_id
      ),
      successorClaimId: parseStableId<"CLAIM">(row.successor_claim_id),
      evidenceSourceId: parseStableId<"EVIDENCE_SOURCE">(
        row.evidence_source_id
      ),
      comparisonKey: parseSha256Digest(row.comparison_key),
      applicabilityKey: parseSha256Digest(row.applicability_key),
      origin: row.origin_kind as OriginKind,
      sourceLocator: parseEvidenceSourceLocator(row.source_locator),
      ...(row.source_revision.length === 0
        ? {}
        : { sourceRevision: parseEvidenceSourceRevision(row.source_revision) }),
      sourceContentDigest: parseSha256Digest(row.source_content_digest),
      recordedAtUtc: parseUtcTimestamp(row.recorded_at_utc),
      ...(row.effective_at_utc === null
        ? {}
        : { effectiveAtUtc: parseUtcTimestamp(row.effective_at_utc) }),
      extractionMethod: row.extraction_method as ClaimExtractionMethod,
      epistemicLabel: row.epistemic_label as EpistemicLabel,
      linkDigest: parseSha256Digest(row.link_digest)
    });
  }

  async #sourceFor(row: ClaimRow) {
    try {
      return await this.#evidence.getEvidenceSource(
        parseStableId<"PROJECT">(row.project_id),
        parseStableId<"MISSION">(row.mission_id),
        parseStableId<"EVIDENCE_SOURCE">(row.evidence_source_id)
      );
    } catch (error) {
      if (
        error instanceof EvidenceRepositoryError &&
        error.code === "EVIDENCE_SOURCE_NOT_FOUND"
      ) {
        throw new ClaimRepositoryError("CLAIM_SOURCE_NOT_FOUND");
      }
      throw new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
    }
  }

  async #hydrateClaim(
    row: ClaimRow,
    seen: ReadonlySet<string> = new Set()
  ): Promise<Claim> {
    if (
      seen.size >= MAXIMUM_CLAIM_HISTORY_DEPTH ||
      seen.has(row.claim_id)
    ) {
      throw new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
    }
    try {
      const projectId = parseStableId<"PROJECT">(row.project_id);
      const missionId = parseStableId<"MISSION">(row.mission_id);
      const claimId = parseStableId<"CLAIM">(row.claim_id);
      const linkRow = this.#supersessionRowForSuccessor(claimId);
      let predecessor: Claim | undefined;
      let supersedesClaimId: ClaimId | undefined;
      if (linkRow !== undefined) {
        supersedesClaimId = parseStableId<"CLAIM">(
          linkRow.predecessor_claim_id
        );
        const predecessorRow = this.#claimRow(
          projectId,
          missionId,
          supersedesClaimId
        );
        if (predecessorRow === undefined) {
          throw new TypeError("Missing claim predecessor.");
        }
        predecessor = await this.#hydrateClaim(
          predecessorRow,
          new Set([...seen, row.claim_id])
        );
      }
      const source = await this.#sourceFor(row);
      const stored = Object.freeze({
        entityType: "Claim" as const,
        claimId,
        projectId,
        missionId,
        evidenceSourceId: parseStableId<"EVIDENCE_SOURCE">(
          row.evidence_source_id
        ),
        importKey: parseSha256Digest(row.import_key),
        claimDigest: parseSha256Digest(row.claim_digest),
        normalizationVersion: row.normalization_version as typeof CLAIM_NORMALIZATION_VERSION,
        origin: row.origin_kind as OriginKind,
        sourceLocator: parseEvidenceSourceLocator(row.source_locator),
        ...(row.source_revision.length === 0
          ? {}
          : { sourceRevision: parseEvidenceSourceRevision(row.source_revision) }),
        sourceContentDigest: parseSha256Digest(row.source_content_digest),
        recordedAtUtc: parseUtcTimestamp(row.recorded_at_utc),
        ...(row.effective_at_utc === null
          ? {}
          : { effectiveAtUtc: parseUtcTimestamp(row.effective_at_utc) }),
        extractionMethod: row.extraction_method as ClaimExtractionMethod,
        epistemicLabel: row.epistemic_label as EpistemicLabel,
        rawText: row.raw_text,
        subject: normalizeClaimTerm(row.subject_term),
        predicate: normalizeClaimTerm(row.predicate_term),
        comparisonKey: parseSha256Digest(row.comparison_key),
        value: normalizeClaimValue(JSON.parse(row.value_json)),
        applicability: parseApplicabilityJson(row.applicability_json),
        applicabilityKey: parseSha256Digest(row.applicability_key),
        ...(supersedesClaimId === undefined ? {} : { supersedesClaimId })
      });
      const claim = await claimFromStorage(stored, source, predecessor);
      if (linkRow !== undefined && predecessor !== undefined) {
        await assertClaimSupersessionInvariant(
          this.#linkValue(linkRow),
          claim,
          predecessor
        );
      }
      return claim;
    } catch (error) {
      if (error instanceof ClaimRepositoryError) throw error;
      throw new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
    }
  }

  async #hydrateSupersession(
    row: ClaimSupersessionRow
  ): Promise<ClaimSupersession> {
    try {
      const projectId = parseStableId<"PROJECT">(row.project_id);
      const missionId = parseStableId<"MISSION">(row.mission_id);
      const predecessorId = parseStableId<"CLAIM">(
        row.predecessor_claim_id
      );
      const successorId = parseStableId<"CLAIM">(row.successor_claim_id);
      const predecessorRow = this.#claimRow(projectId, missionId, predecessorId);
      const successorRow = this.#claimRow(projectId, missionId, successorId);
      if (predecessorRow === undefined || successorRow === undefined) {
        throw new TypeError("Missing linked claim.");
      }
      const predecessor = await this.#hydrateClaim(predecessorRow);
      const successor = await this.#hydrateClaim(successorRow);
      const link = this.#linkValue(row);
      await assertClaimSupersessionInvariant(link, successor, predecessor);
      return link;
    } catch (error) {
      if (error instanceof ClaimRepositoryError) throw error;
      throw new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
    }
  }

  #insertClaim(claim: Claim): void {
    this.#connection
      .prepare(
        `INSERT INTO claims (
          claim_id, project_id, mission_id, evidence_source_id,
          import_key, claim_digest, normalization_version,
          origin_kind, source_locator, source_revision, source_content_digest,
          recorded_at_utc, effective_at_utc, extraction_method,
          epistemic_label, raw_text, subject_term, predicate_term,
          comparison_key, value_json, applicability_json, applicability_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        claim.claimId,
        claim.projectId,
        claim.missionId,
        claim.evidenceSourceId,
        claim.importKey,
        claim.claimDigest,
        claim.normalizationVersion,
        claim.origin,
        claim.sourceLocator,
        claim.sourceRevision ?? "",
        claim.sourceContentDigest,
        claim.recordedAtUtc,
        claim.effectiveAtUtc ?? null,
        claim.extractionMethod,
        claim.epistemicLabel,
        claim.rawText,
        claim.subject,
        claim.predicate,
        claim.comparisonKey,
        canonicalizeJson(claim.value),
        applicabilityJson(claim),
        claim.applicabilityKey
      );
  }

  #insertSupersession(link: ClaimSupersession): void {
    this.#connection
      .prepare(
        `INSERT INTO claim_supersessions (
          claim_supersession_id, relationship_type, project_id, mission_id,
          predecessor_claim_id, successor_claim_id, evidence_source_id,
          comparison_key, applicability_key, origin_kind, source_locator,
          source_revision, source_content_digest, recorded_at_utc,
          effective_at_utc, extraction_method, epistemic_label, link_digest
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        link.claimSupersessionId,
        link.relationshipType,
        link.projectId,
        link.missionId,
        link.predecessorClaimId,
        link.successorClaimId,
        link.evidenceSourceId,
        link.comparisonKey,
        link.applicabilityKey,
        link.origin,
        link.sourceLocator,
        link.sourceRevision ?? "",
        link.sourceContentDigest,
        link.recordedAtUtc,
        link.effectiveAtUtc ?? null,
        link.extractionMethod,
        link.epistemicLabel,
        link.linkDigest
      );
  }

  async #evidenceForInput(input: CreateClaimInput) {
    try {
      return await this.#evidence.getEvidenceSource(
        input.projectId,
        input.missionId,
        input.evidenceSourceId
      );
    } catch (error) {
      if (
        error instanceof EvidenceRepositoryError &&
        error.code === "EVIDENCE_SOURCE_NOT_FOUND"
      ) {
        throw new ClaimRepositoryError("CLAIM_SOURCE_NOT_FOUND");
      }
      if (error instanceof EvidenceRepositoryError) {
        throw new ClaimRepositoryError("CLAIM_STORAGE_SCHEMA_INVALID");
      }
      throw error;
    }
  }

  async persistClaim(input: CreateClaimInput): Promise<PersistClaimResult> {
    return this.#guard(async () => {
      this.#assertScope(input.projectId, input.missionId, true);
      const source = await this.#evidenceForInput(input);
      let predecessor: Claim | undefined;
      if (input.supersedesClaimId !== undefined) {
        const row = this.#claimRow(
          input.projectId,
          input.missionId,
          input.supersedesClaimId
        );
        if (row === undefined) {
          throw new ClaimRepositoryError("CLAIM_PREDECESSOR_NOT_FOUND");
        }
        predecessor = await this.#hydrateClaim(row);
        if (
          this.#historyDepth(predecessor.claimId) >=
          MAXIMUM_CLAIM_HISTORY_DEPTH
        ) {
          throw new ClaimRepositoryError("CLAIM_HISTORY_LIMIT");
        }
      }
      const candidate = await createClaim(
        input,
        source,
        predecessor,
        this.#dependencies
      );
      const transaction = this.#connection
        .transaction((): PersistTransactionResult => {
          this.#assertScope(input.projectId, input.missionId, true);
          const existing = this.#connection
            .prepare(
              `${CLAIM_SELECT}
               WHERE project_id = ? AND mission_id = ? AND import_key = ?`
            )
            .get(
              candidate.claim.projectId,
              candidate.claim.missionId,
              candidate.claim.importKey
            ) as ClaimRow | undefined;
          if (existing !== undefined) {
            return { kind: "EXISTING", claimRow: existing };
          }
          if (candidate.supersession !== undefined) {
            const existingSuccessor = this.#connection
              .prepare(
                "SELECT successor_claim_id FROM claim_supersessions WHERE predecessor_claim_id = ?"
              )
              .get(candidate.supersession.predecessorClaimId);
            if (existingSuccessor !== undefined) {
              throw new ClaimRepositoryError("CLAIM_SUPERSESSION_CONFLICT");
            }
          }
          this.#insertClaim(candidate.claim);
          if (candidate.supersession !== undefined) {
            this.#insertSupersession(candidate.supersession);
          }
          return {
            kind: "CREATED",
            value: Object.freeze({
              created: true,
              claim: candidate.claim,
              ...(candidate.supersession === undefined
                ? {}
                : { supersession: candidate.supersession })
            })
          };
        })
        .immediate();

      if (transaction.kind === "CREATED") return transaction.value;
      const claim = await this.#hydrateClaim(transaction.claimRow);
      const linkRow = this.#supersessionRowForSuccessor(claim.claimId);
      const supersession =
        linkRow === undefined
          ? undefined
          : await this.#hydrateSupersession(linkRow);
      return Object.freeze({
        created: false,
        claim,
        ...(supersession === undefined ? {} : { supersession })
      });
    });
  }

  async getClaim(
    projectId: ProjectId,
    missionId: MissionId,
    claimId: ClaimId
  ): Promise<Claim> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId, false);
      const row = this.#claimRow(projectId, missionId, claimId);
      if (row === undefined) {
        throw new ClaimRepositoryError("CLAIM_NOT_FOUND");
      }
      return this.#hydrateClaim(row);
    });
  }

  async listClaims(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: ClaimId
  ): Promise<ClaimPage> {
    return this.#guard(async () => {
      const parsedLimit = parsePageLimit(limit);
      const parsedCursor = parseClaimCursor(cursor);
      this.#assertScope(projectId, missionId, false);
      const rows = this.#connection
        .prepare(
          `${CLAIM_SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND (? IS NULL OR claim_id > ?)
           ORDER BY claim_id
           LIMIT ?`
        )
        .all(
          projectId,
          missionId,
          parsedCursor ?? null,
          parsedCursor ?? null,
          parsedLimit + 1
        ) as ClaimRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(
        rows.slice(0, parsedLimit).map((row) => this.#hydrateClaim(row))
      );
      return Object.freeze({
        items: Object.freeze(items),
        nextCursor:
          hasNext && items.length > 0
            ? (items[items.length - 1]?.claimId ?? null)
            : null
      });
    });
  }

  async listSupersessions(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: ClaimSupersessionId
  ): Promise<ClaimSupersessionPage> {
    return this.#guard(async () => {
      const parsedLimit = parsePageLimit(limit);
      const parsedCursor = parseSupersessionCursor(cursor);
      this.#assertScope(projectId, missionId, false);
      const rows = this.#connection
        .prepare(
          `${CLAIM_SUPERSESSION_SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND (? IS NULL OR claim_supersession_id > ?)
           ORDER BY claim_supersession_id
           LIMIT ?`
        )
        .all(
          projectId,
          missionId,
          parsedCursor ?? null,
          parsedCursor ?? null,
          parsedLimit + 1
        ) as ClaimSupersessionRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(
        rows.slice(0, parsedLimit).map((row) =>
          this.#hydrateSupersession(row)
        )
      );
      return Object.freeze({
        items: Object.freeze(items),
        nextCursor:
          hasNext && items.length > 0
            ? (items[items.length - 1]?.claimSupersessionId ?? null)
            : null
      });
    });
  }
}
