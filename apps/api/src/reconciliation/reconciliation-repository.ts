import {
  assertReconciliationImpactRevisionInvariant,
  deserializeReconciliationImpactRevision,
  parseSha256Digest,
  serializeReconciliationImpactRevision,
  type MissionId,
  type ProjectId,
  type ReconciliationImpactRevision,
  type Sha256Digest
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";

export const RECONCILIATION_REPOSITORY_PAGE_LIMIT = 100;

export const RECONCILIATION_REPOSITORY_ERROR_CODES = [
  "RECONCILIATION_PROJECT_NOT_FOUND",
  "RECONCILIATION_MISSION_NOT_FOUND",
  "RECONCILIATION_REVISION_NOT_FOUND",
  "RECONCILIATION_PAGE_INVALID",
  "RECONCILIATION_PREDECESSOR_CONFLICT",
  "RECONCILIATION_STORAGE_CONFLICT",
  "RECONCILIATION_STORAGE_SCHEMA_INVALID",
  "RECONCILIATION_STORAGE_FAILED"
] as const;

export type ReconciliationRepositoryErrorCode =
  (typeof RECONCILIATION_REPOSITORY_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<
  Record<ReconciliationRepositoryErrorCode, string>
> = Object.freeze({
  RECONCILIATION_PROJECT_NOT_FOUND:
    "Reconciliation Project scope was not found.",
  RECONCILIATION_MISSION_NOT_FOUND:
    "Reconciliation Mission scope was not found.",
  RECONCILIATION_REVISION_NOT_FOUND:
    "Reconciliation revision was not found.",
  RECONCILIATION_PAGE_INVALID: "Reconciliation page request is invalid.",
  RECONCILIATION_PREDECESSOR_CONFLICT:
    "Reconciliation predecessor changed before persistence completed.",
  RECONCILIATION_STORAGE_CONFLICT:
    "Reconciliation storage rejected a conflicting change.",
  RECONCILIATION_STORAGE_SCHEMA_INVALID:
    "Reconciliation stored history failed integrity verification.",
  RECONCILIATION_STORAGE_FAILED:
    "Reconciliation storage could not complete the operation."
});

export class ReconciliationRepositoryError extends Error {
  readonly code: ReconciliationRepositoryErrorCode;

  constructor(code: ReconciliationRepositoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReconciliationRepositoryError";
    this.code = code;
  }
}

type ClaimFinding =
  ReconciliationImpactRevision["reassessment"]["claimFindings"][number];
type MissingFinding =
  ReconciliationImpactRevision["reassessment"]["missingFindings"][number];
type StaleFinding = NonNullable<
  ReconciliationImpactRevision["reassessment"]["stalePredecessorFinding"]
>;
type ImpactGapFinding =
  ReconciliationImpactRevision["impact"]["impactGapFindings"][number];

export type PersistedReconciliationFinding =
  | ClaimFinding
  | MissingFinding
  | StaleFinding
  | ImpactGapFinding;

export type PersistedImpactPath =
  ReconciliationImpactRevision["impact"]["paths"][number];

interface ReconciliationRevisionRow {
  readonly revision_key: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly revision: number;
  readonly aggregate_version: string;
  readonly input_digest: string;
  readonly result_digest: string;
  readonly twin_projection_id: string;
  readonly twin_revision: number;
  readonly twin_projection_digest: string;
  readonly target_snapshot_id: string;
  readonly code_map_projection_id: string;
  readonly code_map_revision: number;
  readonly code_map_projection_digest: string;
  readonly code_map_evidence_kind: string;
  readonly code_map_inference_status: string;
  readonly code_map_completeness: string;
  readonly reassessment_digest: string;
  readonly impact_digest: string;
  readonly predecessor_revision: number | null;
  readonly predecessor_digest: string | null;
  readonly conflict_finding_count: number;
  readonly ambiguous_finding_count: number;
  readonly missing_finding_count: number;
  readonly stale_finding_count: number;
  readonly impact_gap_finding_count: number;
  readonly total_finding_count: number;
  readonly impact_path_count: number;
  readonly canonical_json: string;
}

export interface PersistReconciliationRevisionResult {
  readonly created: boolean;
  readonly revision: ReconciliationImpactRevision;
}

export interface ReconciliationRevisionPage {
  readonly items: readonly ReconciliationImpactRevision[];
  readonly nextCursor: number | null;
}

export interface ReconciliationFindingPage {
  readonly revision: ReconciliationImpactRevision;
  readonly items: readonly PersistedReconciliationFinding[];
  readonly nextCursor: Sha256Digest | null;
}

export interface ImpactPathPage {
  readonly revision: ReconciliationImpactRevision;
  readonly items: readonly PersistedImpactPath[];
  readonly nextCursor: Sha256Digest | null;
}

const SELECT = `
SELECT revision_key, project_id, mission_id, revision, aggregate_version,
       input_digest, result_digest, twin_projection_id, twin_revision,
       twin_projection_digest, target_snapshot_id, code_map_projection_id,
       code_map_revision, code_map_projection_digest, code_map_evidence_kind,
       code_map_inference_status, code_map_completeness, reassessment_digest,
       impact_digest, predecessor_revision, predecessor_digest,
       conflict_finding_count, ambiguous_finding_count,
       missing_finding_count, stale_finding_count,
       impact_gap_finding_count, total_finding_count, impact_path_count,
       canonical_json
FROM reconciliation_impact_revisions
`.trim();

function storageFailure(error: unknown): ReconciliationRepositoryError {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new ReconciliationRepositoryError(
      "RECONCILIATION_STORAGE_CONFLICT"
    );
  }
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB"
  ) {
    return new ReconciliationRepositoryError(
      "RECONCILIATION_STORAGE_SCHEMA_INVALID"
    );
  }
  return new ReconciliationRepositoryError("RECONCILIATION_STORAGE_FAILED");
}

function pageLimit(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > RECONCILIATION_REPOSITORY_PAGE_LIMIT
  ) {
    throw new ReconciliationRepositoryError("RECONCILIATION_PAGE_INVALID");
  }
  return value;
}

function revisionCursor(value?: number): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ReconciliationRepositoryError("RECONCILIATION_PAGE_INVALID");
  }
  return value;
}

function digestCursor(value?: string): Sha256Digest | undefined {
  if (value === undefined) return undefined;
  try {
    return parseSha256Digest(value);
  } catch {
    throw new ReconciliationRepositoryError("RECONCILIATION_PAGE_INVALID");
  }
}

function findings(
  revision: ReconciliationImpactRevision
): readonly PersistedReconciliationFinding[] {
  const combined: PersistedReconciliationFinding[] = [
    ...revision.reassessment.claimFindings,
    ...revision.reassessment.missingFindings,
    ...(revision.reassessment.stalePredecessorFinding === undefined
      ? []
      : [revision.reassessment.stalePredecessorFinding]),
    ...revision.impact.impactGapFindings
  ];
  combined.sort((left, right) =>
    left.findingKey < right.findingKey
      ? -1
      : left.findingKey > right.findingKey
        ? 1
        : 0
  );
  return Object.freeze(combined);
}

function paths(
  revision: ReconciliationImpactRevision
): readonly PersistedImpactPath[] {
  return Object.freeze(
    [...revision.impact.paths].sort((left, right) =>
      left.pathKey < right.pathKey
        ? -1
        : left.pathKey > right.pathKey
          ? 1
          : 0
    )
  );
}

async function hydrate(
  row: ReconciliationRevisionRow
): Promise<ReconciliationImpactRevision> {
  try {
    const revision = await deserializeReconciliationImpactRevision(
      row.canonical_json
    );
    await assertReconciliationImpactRevisionInvariant(revision);
    if (
      (await serializeReconciliationImpactRevision(revision)) !==
        row.canonical_json ||
      revision.revisionKey !== row.revision_key ||
      revision.projectId !== row.project_id ||
      revision.missionId !== row.mission_id ||
      revision.revision !== row.revision ||
      revision.version !== row.aggregate_version ||
      revision.inputDigest !== row.input_digest ||
      revision.resultDigest !== row.result_digest ||
      revision.twinBinding.projectionId !== row.twin_projection_id ||
      revision.twinBinding.revision !== row.twin_revision ||
      revision.twinBinding.projectionDigest !== row.twin_projection_digest ||
      revision.targetSnapshotId !== row.target_snapshot_id ||
      revision.codeMapBinding.projectionId !== row.code_map_projection_id ||
      revision.codeMapBinding.revision !== row.code_map_revision ||
      revision.codeMapBinding.projectionDigest !==
        row.code_map_projection_digest ||
      revision.codeMapBinding.evidenceKind !== row.code_map_evidence_kind ||
      revision.codeMapBinding.inferenceStatus !==
        row.code_map_inference_status ||
      revision.codeMapBinding.completeness !== row.code_map_completeness ||
      revision.reassessment.resultDigest !== row.reassessment_digest ||
      revision.impact.resultDigest !== row.impact_digest ||
      (revision.predecessor?.revision ?? null) !== row.predecessor_revision ||
      (revision.predecessor?.resultDigest ?? null) !== row.predecessor_digest ||
      revision.findingCounts.CONFLICT !== row.conflict_finding_count ||
      revision.findingCounts.AMBIGUOUS !== row.ambiguous_finding_count ||
      revision.findingCounts.MISSING !== row.missing_finding_count ||
      revision.findingCounts.STALE !== row.stale_finding_count ||
      revision.findingCounts.IMPACT_GAP !== row.impact_gap_finding_count ||
      revision.findingCounts.total !== row.total_finding_count ||
      revision.impactPathCount !== row.impact_path_count ||
      findings(revision).length !== row.total_finding_count ||
      paths(revision).length !== row.impact_path_count
    ) {
      throw new TypeError(
        "Reconciliation row does not match its canonical revision."
      );
    }
    return revision;
  } catch {
    throw new ReconciliationRepositoryError(
      "RECONCILIATION_STORAGE_SCHEMA_INVALID"
    );
  }
}

export class SqliteReconciliationRepository {
  readonly #connection: SqliteConnection;

  constructor(connection: SqliteConnection) {
    this.#connection = connection;
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ReconciliationRepositoryError) throw error;
      throw storageFailure(error);
    }
  }

  #assertScope(projectId: ProjectId, missionId: MissionId): void {
    if (
      this.#connection
        .prepare("SELECT 1 AS present FROM projects WHERE project_id = ?")
        .get(projectId) === undefined
    ) {
      throw new ReconciliationRepositoryError(
        "RECONCILIATION_PROJECT_NOT_FOUND"
      );
    }
    if (
      this.#connection
        .prepare(
          "SELECT 1 AS present FROM missions WHERE mission_id = ? AND project_id = ?"
        )
        .get(missionId, projectId) === undefined
    ) {
      throw new ReconciliationRepositoryError(
        "RECONCILIATION_MISSION_NOT_FOUND"
      );
    }
  }

  #latestRow(missionId: MissionId): ReconciliationRevisionRow | undefined {
    return this.#connection
      .prepare(
        `${SELECT} WHERE mission_id = ? ORDER BY revision DESC LIMIT 1`
      )
      .get(missionId) as ReconciliationRevisionRow | undefined;
  }

  #rowByInputDigest(
    missionId: MissionId,
    inputDigest: Sha256Digest
  ): ReconciliationRevisionRow | undefined {
    return this.#connection
      .prepare(`${SELECT} WHERE mission_id = ? AND input_digest = ?`)
      .get(missionId, inputDigest) as ReconciliationRevisionRow | undefined;
  }

  async latest(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<ReconciliationImpactRevision | undefined> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const row = this.#latestRow(missionId);
      return row === undefined ? undefined : hydrate(row);
    });
  }

  async get(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<ReconciliationImpactRevision> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsedRevision = revisionCursor(revision);
      const row = this.#connection
        .prepare(
          `${SELECT}
           WHERE project_id = ? AND mission_id = ? AND revision = ?`
        )
        .get(projectId, missionId, parsedRevision) as
        | ReconciliationRevisionRow
        | undefined;
      if (row === undefined) {
        throw new ReconciliationRepositoryError(
          "RECONCILIATION_REVISION_NOT_FOUND"
        );
      }
      return hydrate(row);
    });
  }

  async list(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<ReconciliationRevisionPage> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsedLimit = pageLimit(limit);
      const parsedCursor = revisionCursor(cursor);
      const rows = this.#connection
        .prepare(
          `${SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND (? IS NULL OR revision < ?)
           ORDER BY revision DESC LIMIT ?`
        )
        .all(
          projectId,
          missionId,
          parsedCursor ?? null,
          parsedCursor ?? null,
          parsedLimit + 1
        ) as ReconciliationRevisionRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(
        rows.slice(0, parsedLimit).map(async (row) => hydrate(row))
      );
      return Object.freeze({
        items: Object.freeze(items),
        nextCursor:
          hasNext && items.length > 0
            ? (items.at(-1)?.revision ?? null)
            : null
      });
    });
  }

  async listFindings(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<ReconciliationFindingPage> {
    const stored = await this.get(projectId, missionId, revision);
    const parsedLimit = pageLimit(limit);
    const parsedCursor = digestCursor(cursor);
    const candidates = findings(stored).filter(
      (finding) =>
        parsedCursor === undefined || finding.findingKey > parsedCursor
    );
    const hasNext = candidates.length > parsedLimit;
    const items = Object.freeze(candidates.slice(0, parsedLimit));
    return Object.freeze({
      revision: stored,
      items,
      nextCursor:
        hasNext && items.length > 0
          ? (items.at(-1)?.findingKey ?? null)
          : null
    });
  }

  async listImpactPaths(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<ImpactPathPage> {
    const stored = await this.get(projectId, missionId, revision);
    const parsedLimit = pageLimit(limit);
    const parsedCursor = digestCursor(cursor);
    const candidates = paths(stored).filter(
      (path) => parsedCursor === undefined || path.pathKey > parsedCursor
    );
    const hasNext = candidates.length > parsedLimit;
    const items = Object.freeze(candidates.slice(0, parsedLimit));
    return Object.freeze({
      revision: stored,
      items,
      nextCursor:
        hasNext && items.length > 0 ? (items.at(-1)?.pathKey ?? null) : null
    });
  }

  async persist(
    candidate: ReconciliationImpactRevision
  ): Promise<PersistReconciliationRevisionResult> {
    return this.#guard(async () => {
      await assertReconciliationImpactRevisionInvariant(candidate);
      const serialized = await serializeReconciliationImpactRevision(candidate);
      this.#assertScope(candidate.projectId, candidate.missionId);
      const observedLatest = this.#latestRow(candidate.missionId);
      if (observedLatest !== undefined) await hydrate(observedLatest);
      const result = this.#connection
        .transaction(():
          | { readonly kind: "CREATED" }
          | {
              readonly kind: "EXISTING";
              readonly row: ReconciliationRevisionRow;
            } => {
          this.#assertScope(candidate.projectId, candidate.missionId);
          const existing = this.#rowByInputDigest(
            candidate.missionId,
            candidate.inputDigest
          );
          if (existing !== undefined) {
            return { kind: "EXISTING", row: existing };
          }
          const latest = this.#latestRow(candidate.missionId);
          const predecessor = candidate.predecessor;
          if (
            (latest === undefined && candidate.revision !== 1) ||
            (latest !== undefined &&
              (candidate.revision !== latest.revision + 1 ||
                predecessor?.revision !== latest.revision ||
                predecessor?.resultDigest !== latest.result_digest))
          ) {
            throw new ReconciliationRepositoryError(
              "RECONCILIATION_PREDECESSOR_CONFLICT"
            );
          }
          this.#connection
            .prepare(
              `INSERT INTO reconciliation_impact_revisions (
                 revision_key, project_id, mission_id, revision,
                 aggregate_version, input_digest, result_digest,
                 twin_projection_id, twin_revision, twin_projection_digest,
                 target_snapshot_id, code_map_projection_id,
                 code_map_revision, code_map_projection_digest,
                 code_map_evidence_kind, code_map_inference_status,
                 code_map_completeness,
                 reassessment_digest, impact_digest, predecessor_revision,
                 predecessor_digest, conflict_finding_count,
                 ambiguous_finding_count, missing_finding_count,
                 stale_finding_count, impact_gap_finding_count,
                 total_finding_count, impact_path_count, canonical_json
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              candidate.revisionKey,
              candidate.projectId,
              candidate.missionId,
              candidate.revision,
              candidate.version,
              candidate.inputDigest,
              candidate.resultDigest,
              candidate.twinBinding.projectionId,
              candidate.twinBinding.revision,
              candidate.twinBinding.projectionDigest,
              candidate.targetSnapshotId,
              candidate.codeMapBinding.projectionId,
              candidate.codeMapBinding.revision,
              candidate.codeMapBinding.projectionDigest,
              candidate.codeMapBinding.evidenceKind,
              candidate.codeMapBinding.inferenceStatus,
              candidate.codeMapBinding.completeness,
              candidate.reassessment.resultDigest,
              candidate.impact.resultDigest,
              candidate.predecessor?.revision ?? null,
              candidate.predecessor?.resultDigest ?? null,
              candidate.findingCounts.CONFLICT,
              candidate.findingCounts.AMBIGUOUS,
              candidate.findingCounts.MISSING,
              candidate.findingCounts.STALE,
              candidate.findingCounts.IMPACT_GAP,
              candidate.findingCounts.total,
              candidate.impactPathCount,
              serialized
            );
          return { kind: "CREATED" };
        })
        .immediate();

      return result.kind === "CREATED"
        ? Object.freeze({ created: true, revision: candidate })
        : Object.freeze({
            created: false,
            revision: await hydrate(result.row)
          });
    });
  }
}
