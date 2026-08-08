import {
  assertCodeMapProjectionRevisionInvariant,
  deserializeCodeMapProjectionRevision,
  parseStableId,
  serializeCodeMapProjectionRevision,
  type CodeMapProjectionRevision,
  type CodeMapAssetId,
  type CodeMapEdgeId,
  type MissionId,
  type ProjectId
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";

export const CODE_MAP_REPOSITORY_ERROR_CODES = [
  "CODE_MAP_PROJECT_NOT_FOUND",
  "CODE_MAP_MISSION_NOT_FOUND",
  "CODE_MAP_REVISION_NOT_FOUND",
  "CODE_MAP_PAGE_INVALID",
  "CODE_MAP_PREDECESSOR_CONFLICT",
  "CODE_MAP_STORAGE_CONFLICT",
  "CODE_MAP_STORAGE_SCHEMA_INVALID",
  "CODE_MAP_STORAGE_FAILED"
] as const;

export type CodeMapRepositoryErrorCode =
  (typeof CODE_MAP_REPOSITORY_ERROR_CODES)[number];

export class CodeMapRepositoryError extends Error {
  readonly code: CodeMapRepositoryErrorCode;

  constructor(code: CodeMapRepositoryErrorCode) {
    super(code.replaceAll("_", " ").toLowerCase());
    this.name = "CodeMapRepositoryError";
    this.code = code;
  }
}

interface CodeMapRevisionRow {
  readonly projection_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly registration_id: string;
  readonly snapshot_id: string;
  readonly revision: number;
  readonly projection_version: string;
  readonly input_digest: string;
  readonly snapshot_digest: string;
  readonly source_digest: string;
  readonly projection_digest: string;
  readonly recorded_at_utc: string;
  readonly evidence_kind: string;
  readonly inference_status: string;
  readonly completeness: string;
  readonly declared_manifest_id: string | null;
  readonly fallback_reason: string | null;
  readonly predecessor_revision: number | null;
  readonly predecessor_digest: string | null;
  readonly asset_count: number;
  readonly edge_count: number;
  readonly canonical_json: string;
}

export interface PersistCodeMapRevisionResult {
  readonly created: boolean;
  readonly projection: CodeMapProjectionRevision;
}

export interface CodeMapRevisionPage {
  readonly items: readonly CodeMapProjectionRevision[];
  readonly nextCursor: number | null;
}

export interface CodeMapAssetPage {
  readonly projection: CodeMapProjectionRevision;
  readonly items: CodeMapProjectionRevision["assets"];
  readonly nextCursor: CodeMapAssetId | null;
}

export interface CodeMapEdgePage {
  readonly projection: CodeMapProjectionRevision;
  readonly items: CodeMapProjectionRevision["edges"];
  readonly nextCursor: CodeMapEdgeId | null;
}

const CODE_MAP_PAGE_LIMIT = 100;

function pageLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > CODE_MAP_PAGE_LIMIT) {
    throw new CodeMapRepositoryError("CODE_MAP_PAGE_INVALID");
  }
  return value;
}

function revisionCursor(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new CodeMapRepositoryError("CODE_MAP_PAGE_INVALID");
  }
  return value;
}

const SELECT = `
SELECT projection_id, project_id, mission_id, registration_id, snapshot_id,
       revision, projection_version, input_digest, snapshot_digest,
       source_digest, projection_digest, recorded_at_utc, evidence_kind,
       inference_status, completeness, declared_manifest_id, fallback_reason,
       predecessor_revision, predecessor_digest, asset_count, edge_count,
       canonical_json
FROM code_map_revisions
`.trim();

function storageFailure(error: unknown): CodeMapRepositoryError {
  const code =
    typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" ? error.code : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new CodeMapRepositoryError("CODE_MAP_STORAGE_CONFLICT");
  }
  if (["SQLITE_ERROR", "SQLITE_SCHEMA", "SQLITE_CORRUPT", "SQLITE_NOTADB"].includes(code)) {
    return new CodeMapRepositoryError("CODE_MAP_STORAGE_SCHEMA_INVALID");
  }
  return new CodeMapRepositoryError("CODE_MAP_STORAGE_FAILED");
}

async function hydrate(row: CodeMapRevisionRow): Promise<CodeMapProjectionRevision> {
  try {
    const projection = await deserializeCodeMapProjectionRevision(row.canonical_json);
    if (
      projection.projectionId !== row.projection_id ||
      projection.projectId !== row.project_id ||
      projection.missionId !== row.mission_id ||
      projection.registrationId !== row.registration_id ||
      projection.snapshotId !== row.snapshot_id ||
      projection.revision !== row.revision ||
      projection.projectionVersion !== row.projection_version ||
      projection.inputDigest !== row.input_digest ||
      projection.snapshotDigest !== row.snapshot_digest ||
      projection.sourceDigest !== row.source_digest ||
      projection.projectionDigest !== row.projection_digest ||
      projection.recordedAtUtc !== row.recorded_at_utc ||
      projection.evidenceKind !== row.evidence_kind ||
      projection.inferenceStatus !== row.inference_status ||
      projection.completeness !== row.completeness ||
      (projection.declaredManifestId ?? null) !== row.declared_manifest_id ||
      (projection.fallbackReason ?? null) !== row.fallback_reason ||
      (projection.predecessor?.revision ?? null) !== row.predecessor_revision ||
      (projection.predecessor?.projectionDigest ?? null) !== row.predecessor_digest ||
      projection.assets.length !== row.asset_count ||
      projection.edges.length !== row.edge_count
    ) {
      throw new TypeError("Code-map row does not match its canonical record.");
    }
    return projection;
  } catch {
    throw new CodeMapRepositoryError("CODE_MAP_STORAGE_SCHEMA_INVALID");
  }
}

export class SqliteCodeMapRepository {
  readonly #connection: SqliteConnection;

  constructor(connection: SqliteConnection) {
    this.#connection = connection;
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CodeMapRepositoryError) throw error;
      throw storageFailure(error);
    }
  }

  #assertScope(projectId: ProjectId, missionId: MissionId): void {
    if (this.#connection.prepare("SELECT 1 FROM projects WHERE project_id = ?").get(projectId) === undefined) {
      throw new CodeMapRepositoryError("CODE_MAP_PROJECT_NOT_FOUND");
    }
    if (
      this.#connection.prepare(
        "SELECT 1 FROM missions WHERE mission_id = ? AND project_id = ?"
      ).get(missionId, projectId) === undefined
    ) {
      throw new CodeMapRepositoryError("CODE_MAP_MISSION_NOT_FOUND");
    }
  }

  #latestRow(missionId: MissionId): CodeMapRevisionRow | undefined {
    return this.#connection.prepare(
      `${SELECT} WHERE mission_id = ? ORDER BY revision DESC LIMIT 1`
    ).get(missionId) as CodeMapRevisionRow | undefined;
  }

  async latest(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<CodeMapProjectionRevision | undefined> {
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
  ): Promise<CodeMapProjectionRevision> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new CodeMapRepositoryError("CODE_MAP_REVISION_NOT_FOUND");
      }
      const row = this.#connection.prepare(
        `${SELECT} WHERE project_id = ? AND mission_id = ? AND revision = ?`
      ).get(projectId, missionId, revision) as CodeMapRevisionRow | undefined;
      if (row === undefined) {
        throw new CodeMapRepositoryError("CODE_MAP_REVISION_NOT_FOUND");
      }
      return hydrate(row);
    });
  }

  async list(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<CodeMapRevisionPage> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsedLimit = pageLimit(limit);
      const parsedCursor = revisionCursor(cursor);
      const rows = this.#connection.prepare(
        `${SELECT} WHERE project_id = ? AND mission_id = ?
         AND (? IS NULL OR revision < ?)
         ORDER BY revision DESC LIMIT ?`
      ).all(
        projectId,
        missionId,
        parsedCursor ?? null,
        parsedCursor ?? null,
        parsedLimit + 1
      ) as CodeMapRevisionRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(rows.slice(0, parsedLimit).map(hydrate));
      return Object.freeze({
        items: Object.freeze(items),
        nextCursor: hasNext && items.length > 0
          ? (items.at(-1)?.revision ?? null)
          : null
      });
    });
  }

  async listAssets(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<CodeMapAssetPage> {
    const projection = await this.get(projectId, missionId, revision);
    const parsedLimit = pageLimit(limit);
    let parsedCursor: CodeMapAssetId | undefined;
    try {
      parsedCursor = cursor === undefined
        ? undefined
        : parseStableId<"CODE_MAP_ASSET">(cursor);
    } catch {
      throw new CodeMapRepositoryError("CODE_MAP_PAGE_INVALID");
    }
    const candidates = projection.assets.filter(
      (asset) => parsedCursor === undefined || asset.assetId > parsedCursor
    );
    const hasNext = candidates.length > parsedLimit;
    const items = Object.freeze(candidates.slice(0, parsedLimit));
    return Object.freeze({
      projection,
      items,
      nextCursor: hasNext && items.length > 0
        ? (items.at(-1)?.assetId ?? null)
        : null
    });
  }

  async listEdges(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<CodeMapEdgePage> {
    const projection = await this.get(projectId, missionId, revision);
    const parsedLimit = pageLimit(limit);
    let parsedCursor: CodeMapEdgeId | undefined;
    try {
      parsedCursor = cursor === undefined
        ? undefined
        : parseStableId<"CODE_MAP_EDGE">(cursor);
    } catch {
      throw new CodeMapRepositoryError("CODE_MAP_PAGE_INVALID");
    }
    const candidates = projection.edges.filter(
      (edge) => parsedCursor === undefined || edge.edgeId > parsedCursor
    );
    const hasNext = candidates.length > parsedLimit;
    const items = Object.freeze(candidates.slice(0, parsedLimit));
    return Object.freeze({
      projection,
      items,
      nextCursor: hasNext && items.length > 0
        ? (items.at(-1)?.edgeId ?? null)
        : null
    });
  }

  async persist(
    projection: CodeMapProjectionRevision
  ): Promise<PersistCodeMapRevisionResult> {
    return this.#guard(async () => {
      await assertCodeMapProjectionRevisionInvariant(projection);
      const serialized = await serializeCodeMapProjectionRevision(projection);
      const result = this.#connection.transaction(():
        | { readonly kind: "CREATED" }
        | { readonly kind: "EXISTING"; readonly row: CodeMapRevisionRow } => {
        this.#assertScope(projection.projectId, projection.missionId);
        const latest = this.#latestRow(projection.missionId);
        if (latest?.input_digest === projection.inputDigest) {
          return { kind: "EXISTING", row: latest };
        }
        if (
          (latest === undefined && projection.revision !== 1) ||
          (latest !== undefined &&
            (projection.revision !== latest.revision + 1 ||
              projection.predecessor?.revision !== latest.revision ||
              projection.predecessor.projectionDigest !== latest.projection_digest))
        ) {
          throw new CodeMapRepositoryError("CODE_MAP_PREDECESSOR_CONFLICT");
        }
        this.#connection.prepare(
          `INSERT INTO code_map_revisions (
             projection_id, project_id, mission_id, registration_id, snapshot_id,
             revision, projection_version, input_digest, snapshot_digest,
             source_digest, projection_digest, recorded_at_utc, evidence_kind,
             inference_status, completeness, declared_manifest_id, fallback_reason,
             predecessor_revision, predecessor_digest, asset_count, edge_count,
             canonical_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          projection.projectionId,
          projection.projectId,
          projection.missionId,
          projection.registrationId,
          projection.snapshotId,
          projection.revision,
          projection.projectionVersion,
          projection.inputDigest,
          projection.snapshotDigest,
          projection.sourceDigest,
          projection.projectionDigest,
          projection.recordedAtUtc,
          projection.evidenceKind,
          projection.inferenceStatus,
          projection.completeness,
          projection.declaredManifestId ?? null,
          projection.fallbackReason ?? null,
          projection.predecessor?.revision ?? null,
          projection.predecessor?.projectionDigest ?? null,
          projection.assets.length,
          projection.edges.length,
          serialized
        );
        return { kind: "CREATED" };
      }).immediate();
      return result.kind === "CREATED"
        ? Object.freeze({ created: true, projection })
        : Object.freeze({ created: false, projection: await hydrate(result.row) });
    });
  }
}
