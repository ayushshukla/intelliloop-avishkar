import {
  MAXIMUM_TWIN_PROJECTION_NODES,
  MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS,
  TwinProjectionError,
  assertTwinProjectionRevisionInvariant,
  deserializeTwinProjectionRevision,
  parseStableId,
  parseTwinRevision,
  projectTwinRevision,
  serializeTwinProjectionRevision,
  type Claim,
  type ClaimId,
  type ClaimSupersession,
  type ClaimSupersessionId,
  type EvidenceSource,
  type EvidenceSourceId,
  type GitSnapshot,
  type GitSnapshotId,
  type MissionId,
  type ProjectId,
  type TwinNodeId,
  type TwinProjectionRevision,
  type TwinRelationshipId,
  type TwinRevision,
  type TwinSemanticRelationshipInput,
  type ValidationResult
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";
import type { SqliteCodeMapRepository } from "../code-map/code-map-repository.js";
import type { SqliteClaimRepository } from "../evidence/claim-repository.js";
import type { SqliteEvidenceRepository } from "../evidence/evidence-repository.js";
import type { GitSnapshotService } from "../projects/git-snapshot-service.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";

export interface TwinValidationReadPort {
  listLatestValidations(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<readonly ValidationResult[]>;
}

export const TWIN_REPOSITORY_PAGE_LIMIT = 100;

export const TWIN_REPOSITORY_ERROR_CODES = [
  "TWIN_PROJECT_NOT_FOUND",
  "TWIN_MISSION_NOT_FOUND",
  "TWIN_REVISION_NOT_FOUND",
  "TWIN_PAGE_INVALID",
  "TWIN_SOURCE_LIMIT",
  "TWIN_PREDECESSOR_CONFLICT",
  "TWIN_STORAGE_CONFLICT",
  "TWIN_STORAGE_SCHEMA_INVALID",
  "TWIN_STORAGE_FAILED"
] as const;

export type TwinRepositoryErrorCode =
  (typeof TWIN_REPOSITORY_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<TwinRepositoryErrorCode, string>> =
  Object.freeze({
    TWIN_PROJECT_NOT_FOUND: "Twin Project scope was not found.",
    TWIN_MISSION_NOT_FOUND: "Twin Mission scope was not found.",
    TWIN_REVISION_NOT_FOUND: "Twin revision was not found.",
    TWIN_PAGE_INVALID: "Twin page request is invalid.",
    TWIN_SOURCE_LIMIT: "Twin source collection exceeds its bounded limit.",
    TWIN_PREDECESSOR_CONFLICT:
      "Twin predecessor changed before persistence completed.",
    TWIN_STORAGE_CONFLICT: "Twin storage rejected a conflicting change.",
    TWIN_STORAGE_SCHEMA_INVALID: "Twin stored history failed integrity verification.",
    TWIN_STORAGE_FAILED: "Twin storage could not complete the operation."
  });

export class TwinRepositoryError extends Error {
  readonly code: TwinRepositoryErrorCode;

  constructor(code: TwinRepositoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "TwinRepositoryError";
    this.code = code;
  }
}

interface TwinRevisionRow {
  readonly projection_id: string;
  readonly project_id: string;
  readonly mission_id: string;
  readonly revision: number;
  readonly projection_version: string;
  readonly input_digest: string;
  readonly projection_digest: string;
  readonly recorded_at_utc: string;
  readonly predecessor_revision: number | null;
  readonly predecessor_digest: string | null;
  readonly node_count: number;
  readonly relationship_count: number;
  readonly invalidation_count: number;
  readonly canonical_json: string;
}

export interface TwinRevisionPage {
  readonly items: readonly TwinProjectionRevision[];
  readonly nextCursor: TwinRevision | null;
}

export interface TwinNodePage {
  readonly projection: TwinProjectionRevision;
  readonly items: TwinProjectionRevision["nodes"];
  readonly nextCursor: TwinNodeId | null;
}

export interface TwinRelationshipPage {
  readonly projection: TwinProjectionRevision;
  readonly items: TwinProjectionRevision["relationships"];
  readonly nextCursor: TwinRelationshipId | null;
}

export interface PersistTwinRevisionResult {
  readonly created: boolean;
  readonly projection: TwinProjectionRevision;
}

function storageFailure(error: unknown): TwinRepositoryError {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new TwinRepositoryError("TWIN_STORAGE_CONFLICT");
  }
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB"
  ) {
    return new TwinRepositoryError("TWIN_STORAGE_SCHEMA_INVALID");
  }
  return new TwinRepositoryError("TWIN_STORAGE_FAILED");
}

function pageLimit(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > TWIN_REPOSITORY_PAGE_LIMIT
  ) {
    throw new TwinRepositoryError("TWIN_PAGE_INVALID");
  }
  return value;
}

function revisionCursor(value?: number): TwinRevision | undefined {
  if (value === undefined) return undefined;
  try {
    return parseTwinRevision(value);
  } catch {
    throw new TwinRepositoryError("TWIN_PAGE_INVALID");
  }
}

async function hydrateRow(row: TwinRevisionRow): Promise<TwinProjectionRevision> {
  try {
    const projection = await deserializeTwinProjectionRevision(row.canonical_json);
    if (
      projection.projectionId !== row.projection_id ||
      projection.projectId !== row.project_id ||
      projection.missionId !== row.mission_id ||
      projection.revision !== row.revision ||
      projection.projectionVersion !== row.projection_version ||
      projection.inputDigest !== row.input_digest ||
      projection.projectionDigest !== row.projection_digest ||
      projection.recordedAtUtc !== row.recorded_at_utc ||
      (projection.predecessor?.revision ?? null) !== row.predecessor_revision ||
      (projection.predecessor?.projectionDigest ?? null) !==
        row.predecessor_digest ||
      projection.nodes.length !== row.node_count ||
      projection.relationships.length !== row.relationship_count ||
      projection.invalidations.length !== row.invalidation_count
    ) {
      throw new TypeError("Twin row metadata does not match canonical history.");
    }
    return projection;
  } catch {
    throw new TwinRepositoryError("TWIN_STORAGE_SCHEMA_INVALID");
  }
}

const TWIN_REVISION_SELECT = `
SELECT projection_id, project_id, mission_id, revision, projection_version,
       input_digest, projection_digest, recorded_at_utc,
       predecessor_revision, predecessor_digest, node_count,
       relationship_count, invalidation_count, canonical_json
FROM twin_revisions
`.trim();

export class SqliteTwinRepository {
  readonly #connection: SqliteConnection;

  constructor(connection: SqliteConnection) {
    this.#connection = connection;
  }

  async #guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof TwinRepositoryError) throw error;
      throw storageFailure(error);
    }
  }

  #assertScope(projectId: ProjectId, missionId: MissionId): void {
    const project = this.#connection
      .prepare("SELECT 1 AS present FROM projects WHERE project_id = ?")
      .get(projectId);
    if (project === undefined) {
      throw new TwinRepositoryError("TWIN_PROJECT_NOT_FOUND");
    }
    const mission = this.#connection
      .prepare(
        "SELECT 1 AS present FROM missions WHERE mission_id = ? AND project_id = ?"
      )
      .get(missionId, projectId);
    if (mission === undefined) {
      throw new TwinRepositoryError("TWIN_MISSION_NOT_FOUND");
    }
  }

  #latestRow(missionId: MissionId): TwinRevisionRow | undefined {
    return this.#connection
      .prepare(
        `${TWIN_REVISION_SELECT}
         WHERE mission_id = ?
         ORDER BY revision DESC
         LIMIT 1`
      )
      .get(missionId) as TwinRevisionRow | undefined;
  }

  async latest(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<TwinProjectionRevision | undefined> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const row = this.#latestRow(missionId);
      return row === undefined ? undefined : hydrateRow(row);
    });
  }

  async persist(
    projection: TwinProjectionRevision
  ): Promise<PersistTwinRevisionResult> {
    return this.#guard(async () => {
      await assertTwinProjectionRevisionInvariant(projection);
      const serialized = await serializeTwinProjectionRevision(projection);
      const result = this.#connection
        .transaction(():
          | { readonly kind: "CREATED" }
          | { readonly kind: "EXISTING"; readonly row: TwinRevisionRow } => {
          this.#assertScope(projection.projectId, projection.missionId);
          const latest = this.#latestRow(projection.missionId);
          if (
            latest !== undefined &&
            latest.input_digest === projection.inputDigest
          ) {
            return { kind: "EXISTING", row: latest };
          }
          if (
            (latest === undefined && projection.revision !== 1) ||
            (latest !== undefined &&
              (projection.revision !== latest.revision + 1 ||
                projection.predecessor?.revision !== latest.revision ||
                projection.predecessor.projectionDigest !==
                  latest.projection_digest))
          ) {
            throw new TwinRepositoryError("TWIN_PREDECESSOR_CONFLICT");
          }
          this.#connection
            .prepare(
              `INSERT INTO twin_revisions (
                 projection_id, project_id, mission_id, revision,
                 projection_version, input_digest, projection_digest,
                 recorded_at_utc, predecessor_revision, predecessor_digest,
                 node_count, relationship_count, invalidation_count,
                 canonical_json
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              projection.projectionId,
              projection.projectId,
              projection.missionId,
              projection.revision,
              projection.projectionVersion,
              projection.inputDigest,
              projection.projectionDigest,
              projection.recordedAtUtc,
              projection.predecessor?.revision ?? null,
              projection.predecessor?.projectionDigest ?? null,
              projection.nodes.length,
              projection.relationships.length,
              projection.invalidations.length,
              serialized
            );
          return { kind: "CREATED" };
        })
        .immediate();

      if (result.kind === "CREATED") {
        return Object.freeze({ created: true, projection });
      }
      return Object.freeze({
        created: false,
        projection: await hydrateRow(result.row)
      });
    });
  }

  async get(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<TwinProjectionRevision> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsedRevision = parseTwinRevision(revision);
      const row = this.#connection
        .prepare(
          `${TWIN_REVISION_SELECT}
           WHERE project_id = ? AND mission_id = ? AND revision = ?`
        )
        .get(projectId, missionId, parsedRevision) as
        | TwinRevisionRow
        | undefined;
      if (row === undefined) {
        throw new TwinRepositoryError("TWIN_REVISION_NOT_FOUND");
      }
      return hydrateRow(row);
    });
  }

  async list(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<TwinRevisionPage> {
    return this.#guard(async () => {
      this.#assertScope(projectId, missionId);
      const parsedLimit = pageLimit(limit);
      const parsedCursor = revisionCursor(cursor);
      const rows = this.#connection
        .prepare(
          `${TWIN_REVISION_SELECT}
           WHERE project_id = ? AND mission_id = ?
             AND (? IS NULL OR revision < ?)
           ORDER BY revision DESC
           LIMIT ?`
        )
        .all(
          projectId,
          missionId,
          parsedCursor ?? null,
          parsedCursor ?? null,
          parsedLimit + 1
        ) as TwinRevisionRow[];
      const hasNext = rows.length > parsedLimit;
      const items = await Promise.all(
        rows.slice(0, parsedLimit).map(hydrateRow)
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

  async listNodes(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<TwinNodePage> {
    const projection = await this.get(projectId, missionId, revision);
    const parsedLimit = pageLimit(limit);
    let parsedCursor: TwinNodeId | undefined;
    try {
      parsedCursor =
        cursor === undefined ? undefined : parseStableId<"TWIN_NODE">(cursor);
    } catch {
      throw new TwinRepositoryError("TWIN_PAGE_INVALID");
    }
    const candidates = projection.nodes.filter(
      (node) => parsedCursor === undefined || node.nodeId > parsedCursor
    );
    const hasNext = candidates.length > parsedLimit;
    const items = Object.freeze(candidates.slice(0, parsedLimit));
    return Object.freeze({
      projection,
      items,
      nextCursor:
        hasNext && items.length > 0 ? (items.at(-1)?.nodeId ?? null) : null
    });
  }

  async listRelationships(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<TwinRelationshipPage> {
    const projection = await this.get(projectId, missionId, revision);
    const parsedLimit = pageLimit(limit);
    let parsedCursor: TwinRelationshipId | undefined;
    try {
      parsedCursor =
        cursor === undefined
          ? undefined
          : parseStableId<"TWIN_RELATIONSHIP">(cursor);
    } catch {
      throw new TwinRepositoryError("TWIN_PAGE_INVALID");
    }
    const candidates = projection.relationships.filter(
      (relationship) =>
        parsedCursor === undefined ||
        relationship.relationshipId > parsedCursor
    );
    const hasNext = candidates.length > parsedLimit;
    const items = Object.freeze(candidates.slice(0, parsedLimit));
    return Object.freeze({
      projection,
      items,
      nextCursor:
        hasNext && items.length > 0
          ? (items.at(-1)?.relationshipId ?? null)
          : null
    });
  }
}

async function allEvidence(
  repository: SqliteEvidenceRepository,
  projectId: ProjectId,
  missionId: MissionId
): Promise<readonly EvidenceSource[]> {
  const items: EvidenceSource[] = [];
  let cursor: EvidenceSourceId | undefined;
  do {
    const page = await repository.listEvidenceSources(
      projectId,
      missionId,
      TWIN_REPOSITORY_PAGE_LIMIT,
      cursor
    );
    items.push(...page.items);
    if (items.length > MAXIMUM_TWIN_PROJECTION_NODES) {
      throw new TwinRepositoryError("TWIN_SOURCE_LIMIT");
    }
    cursor =
      page.nextCursor === null
        ? undefined
        : parseStableId<"EVIDENCE_SOURCE">(page.nextCursor);
  } while (cursor !== undefined);
  return Object.freeze(items);
}

async function allClaims(
  repository: SqliteClaimRepository,
  projectId: ProjectId,
  missionId: MissionId
): Promise<readonly Claim[]> {
  const items: Claim[] = [];
  let cursor: ClaimId | undefined;
  do {
    const page = await repository.listClaims(
      projectId,
      missionId,
      TWIN_REPOSITORY_PAGE_LIMIT,
      cursor
    );
    items.push(...page.items);
    if (items.length > MAXIMUM_TWIN_PROJECTION_NODES) {
      throw new TwinRepositoryError("TWIN_SOURCE_LIMIT");
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return Object.freeze(items);
}

async function allSupersessions(
  repository: SqliteClaimRepository,
  projectId: ProjectId,
  missionId: MissionId
): Promise<readonly ClaimSupersession[]> {
  const items: ClaimSupersession[] = [];
  let cursor: ClaimSupersessionId | undefined;
  do {
    const page = await repository.listSupersessions(
      projectId,
      missionId,
      TWIN_REPOSITORY_PAGE_LIMIT,
      cursor
    );
    items.push(...page.items);
    if (items.length > MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS) {
      throw new TwinRepositoryError("TWIN_SOURCE_LIMIT");
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return Object.freeze(items);
}

function allSnapshots(
  service: GitSnapshotService,
  missionId: MissionId
): readonly GitSnapshot[] {
  const items: GitSnapshot[] = [];
  let cursor: GitSnapshotId | undefined;
  do {
    const page = service.list(missionId, TWIN_REPOSITORY_PAGE_LIMIT, cursor);
    items.push(...page.items);
    if (items.length > MAXIMUM_TWIN_PROJECTION_NODES) {
      throw new TwinRepositoryError("TWIN_SOURCE_LIMIT");
    }
    cursor =
      page.nextCursor === null
        ? undefined
        : parseStableId<"GIT_SNAPSHOT">(page.nextCursor);
  } while (cursor !== undefined);
  return Object.freeze(items);
}

export class TwinMaterializationService {
  readonly #projects: SqliteProjectRepository;
  readonly #evidence: SqliteEvidenceRepository;
  readonly #claims: SqliteClaimRepository;
  readonly #snapshots: GitSnapshotService;
  readonly #twins: SqliteTwinRepository;
  readonly #codeMaps: SqliteCodeMapRepository | undefined;
  readonly #validations: TwinValidationReadPort | undefined;

  constructor(input: {
    readonly projects: SqliteProjectRepository;
    readonly evidence: SqliteEvidenceRepository;
    readonly claims: SqliteClaimRepository;
    readonly snapshots: GitSnapshotService;
    readonly twins: SqliteTwinRepository;
    readonly codeMaps?: SqliteCodeMapRepository;
    readonly validations?: TwinValidationReadPort;
  }) {
    this.#projects = input.projects;
    this.#evidence = input.evidence;
    this.#claims = input.claims;
    this.#snapshots = input.snapshots;
    this.#twins = input.twins;
    this.#codeMaps = input.codeMaps;
    this.#validations = input.validations;
  }

  async materialize(
    missionId: MissionId,
    options: { readonly semanticRelationships?: readonly TwinSemanticRelationshipInput[] } = {}
  ): Promise<PersistTwinRevisionResult> {
    try {
      const mission = this.#projects.getMission(missionId);
      const project = this.#projects.getProject(mission.projectId);
      const previous = await this.#twins.latest(project.projectId, missionId);
      const [evidenceSources, claims, claimSupersessions, validationResults] = await Promise.all([
        allEvidence(this.#evidence, project.projectId, missionId),
        allClaims(this.#claims, project.projectId, missionId),
        allSupersessions(this.#claims, project.projectId, missionId),
        this.#validations?.listLatestValidations(project.projectId, missionId) ?? Promise.resolve(Object.freeze([]))
      ]);
      const codeMap = await this.#codeMaps?.latest(project.projectId, missionId);
      const projection = await projectTwinRevision(
        {
          project,
          mission,
          evidenceSources,
          claims,
          claimSupersessions,
          snapshots: allSnapshots(this.#snapshots, missionId),
          validationResults,
          ...(options.semanticRelationships === undefined
            ? {}
            : { semanticRelationships: options.semanticRelationships }),
          ...(codeMap === undefined ? {} : { codeMap })
        },
        previous
      );
      return this.#twins.persist(projection);
    } catch (error) {
      if (error instanceof TwinRepositoryError) throw error;
      if (error instanceof TwinProjectionError) {
        throw new TwinRepositoryError("TWIN_STORAGE_SCHEMA_INVALID");
      }
      throw error;
    }
  }
}
