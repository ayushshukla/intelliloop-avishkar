import { randomUUID } from "node:crypto";

import {
  ProjectDomainError,
  archiveChangeMission,
  archiveProject,
  assertChangeMissionInvariant,
  assertProjectInvariant,
  createChangeMission,
  createClock,
  createProject,
  createStableIdGenerator,
  parseMissionTitle,
  parseProjectName,
  parseStableId,
  parseUtcTimestamp,
  type ChangeMission,
  type EntityRevision,
  type MissionId,
  type MissionStatus,
  type MissionTitle,
  type Project,
  type ProjectDomainDependencies,
  type ProjectId,
  type ProjectName,
  type ProjectStatus
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";

export const PROJECT_REPOSITORY_ERROR_CODES = [
  "PROJECT_NOT_FOUND",
  "MISSION_NOT_FOUND",
  "PROJECT_STORAGE_CONFLICT",
  "PROJECT_STORAGE_SCHEMA_INVALID",
  "PROJECT_STORAGE_FAILED"
] as const;

export type ProjectRepositoryErrorCode =
  (typeof PROJECT_REPOSITORY_ERROR_CODES)[number];

const REPOSITORY_ERROR_MESSAGES: Readonly<
  Record<ProjectRepositoryErrorCode, string>
> = Object.freeze({
  PROJECT_NOT_FOUND: "Project was not found.",
  MISSION_NOT_FOUND: "Mission was not found.",
  PROJECT_STORAGE_CONFLICT: "Project storage rejected a conflicting change.",
  PROJECT_STORAGE_SCHEMA_INVALID: "Project storage schema is invalid.",
  PROJECT_STORAGE_FAILED: "Project storage could not complete the operation."
});

export class ProjectRepositoryError extends Error {
  readonly code: ProjectRepositoryErrorCode;

  constructor(code: ProjectRepositoryErrorCode) {
    super(REPOSITORY_ERROR_MESSAGES[code]);
    this.name = "ProjectRepositoryError";
    this.code = code;
  }
}

export interface EntityPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

interface ProjectHeadRow {
  readonly project_id: string;
  readonly head_revision: number;
  readonly head_status: string;
  readonly head_created_at_utc: string;
  readonly head_updated_at_utc: string;
  readonly revision: number;
  readonly name: string;
  readonly lifecycle_status: string;
  readonly created_at_utc: string;
  readonly updated_at_utc: string;
  readonly archived_at_utc: string | null;
}

interface MissionHeadRow {
  readonly mission_id: string;
  readonly project_id: string;
  readonly head_revision: number;
  readonly head_status: string;
  readonly head_created_at_utc: string;
  readonly head_updated_at_utc: string;
  readonly revision: number;
  readonly title: string;
  readonly lifecycle_status: string;
  readonly created_at_utc: string;
  readonly updated_at_utc: string;
  readonly archived_at_utc: string | null;
}

function storageFailure(error: unknown): ProjectRepositoryError {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (code.startsWith("SQLITE_CONSTRAINT")) {
    return new ProjectRepositoryError("PROJECT_STORAGE_CONFLICT");
  }
  if (
    code === "SQLITE_ERROR" ||
    code === "SQLITE_SCHEMA" ||
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB"
  ) {
    return new ProjectRepositoryError("PROJECT_STORAGE_SCHEMA_INVALID");
  }
  return new ProjectRepositoryError("PROJECT_STORAGE_FAILED");
}

function hydrateProject(row: ProjectHeadRow): Project {
  try {
    if (
      row.head_revision !== row.revision ||
      row.head_status !== row.lifecycle_status ||
      row.head_created_at_utc !== row.created_at_utc ||
      row.head_updated_at_utc !== row.updated_at_utc
    ) {
      throw new TypeError("Invalid head projection.");
    }

    const base = {
      entityType: "Project" as const,
      projectId: parseStableId<"PROJECT">(row.project_id),
      name: parseProjectName(row.name) as ProjectName,
      status: row.lifecycle_status as ProjectStatus,
      revision: row.revision as EntityRevision,
      createdAtUtc: parseUtcTimestamp(row.created_at_utc),
      updatedAtUtc: parseUtcTimestamp(row.updated_at_utc)
    };
    const project = Object.freeze(
      row.archived_at_utc === null
        ? base
        : {
            ...base,
            archivedAtUtc: parseUtcTimestamp(row.archived_at_utc)
          }
    );
    assertProjectInvariant(project);
    return project;
  } catch {
    throw new ProjectRepositoryError("PROJECT_STORAGE_SCHEMA_INVALID");
  }
}

function hydrateMission(row: MissionHeadRow): ChangeMission {
  try {
    if (
      row.head_revision !== row.revision ||
      row.head_status !== row.lifecycle_status ||
      row.head_created_at_utc !== row.created_at_utc ||
      row.head_updated_at_utc !== row.updated_at_utc
    ) {
      throw new TypeError("Invalid head projection.");
    }

    const base = {
      entityType: "ChangeMission" as const,
      missionId: parseStableId<"MISSION">(row.mission_id),
      projectId: parseStableId<"PROJECT">(row.project_id),
      title: parseMissionTitle(row.title) as MissionTitle,
      status: row.lifecycle_status as MissionStatus,
      revision: row.revision as EntityRevision,
      createdAtUtc: parseUtcTimestamp(row.created_at_utc),
      updatedAtUtc: parseUtcTimestamp(row.updated_at_utc)
    };
    const mission = Object.freeze(
      row.archived_at_utc === null
        ? base
        : {
            ...base,
            archivedAtUtc: parseUtcTimestamp(row.archived_at_utc)
          }
    );
    assertChangeMissionInvariant(mission);
    return mission;
  } catch {
    throw new ProjectRepositoryError("PROJECT_STORAGE_SCHEMA_INVALID");
  }
}

const PROJECT_HEAD_SELECT = `
SELECT
  p.project_id,
  p.current_revision AS head_revision,
  p.lifecycle_status AS head_status,
  p.created_at_utc AS head_created_at_utc,
  p.updated_at_utc AS head_updated_at_utc,
  r.revision,
  r.name,
  r.lifecycle_status,
  r.created_at_utc,
  r.updated_at_utc,
  r.archived_at_utc
FROM projects p
JOIN project_revisions r
  ON r.project_id = p.project_id AND r.revision = p.current_revision
`.trim();

const MISSION_HEAD_SELECT = `
SELECT
  m.mission_id,
  m.project_id,
  m.current_revision AS head_revision,
  m.lifecycle_status AS head_status,
  m.created_at_utc AS head_created_at_utc,
  m.updated_at_utc AS head_updated_at_utc,
  r.revision,
  r.title,
  r.lifecycle_status,
  r.created_at_utc,
  r.updated_at_utc,
  r.archived_at_utc
FROM missions m
JOIN mission_revisions r
  ON r.mission_id = m.mission_id AND r.revision = m.current_revision
`.trim();

export class SqliteProjectRepository {
  readonly #connection: SqliteConnection;
  readonly #dependencies: ProjectDomainDependencies;

  constructor(
    connection: SqliteConnection,
    dependencies: ProjectDomainDependencies = {
      ids: createStableIdGenerator(() => randomUUID()),
      clock: createClock(() => new Date())
    }
  ) {
    this.#connection = connection;
    this.#dependencies = dependencies;
  }

  #read<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      if (
        error instanceof ProjectRepositoryError ||
        error instanceof ProjectDomainError
      ) {
        throw error;
      }
      throw storageFailure(error);
    }
  }

  #write<T>(operation: () => T): T {
    try {
      return this.#connection.transaction(operation).immediate();
    } catch (error) {
      if (
        error instanceof ProjectRepositoryError ||
        error instanceof ProjectDomainError
      ) {
        throw error;
      }
      throw storageFailure(error);
    }
  }

  #project(projectId: ProjectId): Project | undefined {
    const row = this.#connection
      .prepare(`${PROJECT_HEAD_SELECT} WHERE p.project_id = ?`)
      .get(projectId) as ProjectHeadRow | undefined;
    return row === undefined ? undefined : hydrateProject(row);
  }

  #mission(missionId: MissionId): ChangeMission | undefined {
    const row = this.#connection
      .prepare(`${MISSION_HEAD_SELECT} WHERE m.mission_id = ?`)
      .get(missionId) as MissionHeadRow | undefined;
    return row === undefined ? undefined : hydrateMission(row);
  }

  #missionsForProject(projectId: ProjectId): readonly ChangeMission[] {
    const rows = this.#connection
      .prepare(
        `${MISSION_HEAD_SELECT} WHERE m.project_id = ? ORDER BY m.mission_id`
      )
      .all(projectId) as MissionHeadRow[];
    return rows.map(hydrateMission);
  }

  #insertProject(project: Project): void {
    this.#connection
      .prepare(
        `INSERT INTO projects (
          project_id, current_revision, lifecycle_status, created_at_utc, updated_at_utc
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        project.projectId,
        project.revision,
        project.status,
        project.createdAtUtc,
        project.updatedAtUtc
      );
    this.#insertProjectRevision(project);
  }

  #insertProjectRevision(project: Project): void {
    this.#connection
      .prepare(
        `INSERT INTO project_revisions (
          project_id, revision, name, lifecycle_status,
          created_at_utc, updated_at_utc, archived_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        project.projectId,
        project.revision,
        project.name,
        project.status,
        project.createdAtUtc,
        project.updatedAtUtc,
        project.archivedAtUtc ?? null
      );
  }

  #insertMission(mission: ChangeMission): void {
    this.#connection
      .prepare(
        `INSERT INTO missions (
          mission_id, project_id, current_revision, lifecycle_status,
          created_at_utc, updated_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        mission.missionId,
        mission.projectId,
        mission.revision,
        mission.status,
        mission.createdAtUtc,
        mission.updatedAtUtc
      );
    this.#insertMissionRevision(mission);
  }

  #insertMissionRevision(mission: ChangeMission): void {
    this.#connection
      .prepare(
        `INSERT INTO mission_revisions (
          mission_id, project_id, revision, title, lifecycle_status,
          created_at_utc, updated_at_utc, archived_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        mission.missionId,
        mission.projectId,
        mission.revision,
        mission.title,
        mission.status,
        mission.createdAtUtc,
        mission.updatedAtUtc,
        mission.archivedAtUtc ?? null
      );
  }

  createProject(name: string): Project {
    const project = createProject({ name }, this.#dependencies);
    return this.#write(() => {
      this.#insertProject(project);
      return project;
    });
  }

  getProject(projectId: ProjectId): Project {
    return this.#read(() => {
      const project = this.#project(projectId);
      if (project === undefined) {
        throw new ProjectRepositoryError("PROJECT_NOT_FOUND");
      }
      return project;
    });
  }

  listProjects(
    limit: number,
    cursor?: ProjectId
  ): EntityPage<Project> {
    return this.#read(() => {
      const rows = this.#connection
        .prepare(
          `${PROJECT_HEAD_SELECT}
           WHERE (? IS NULL OR p.project_id > ?)
           ORDER BY p.project_id
           LIMIT ?`
        )
        .all(cursor ?? null, cursor ?? null, limit + 1) as ProjectHeadRow[];
      const hasNext = rows.length > limit;
      const projects = rows.slice(0, limit).map(hydrateProject);
      return {
        items: Object.freeze(projects),
        nextCursor:
          hasNext && projects.length > 0
            ? (projects[projects.length - 1]?.projectId ?? null)
            : null
      };
    });
  }

  createMission(projectId: ProjectId, title: string): ChangeMission {
    return this.#write(() => {
      const project = this.#project(projectId);
      if (project === undefined) {
        throw new ProjectRepositoryError("PROJECT_NOT_FOUND");
      }
      const existingMissions = this.#missionsForProject(projectId);
      const mission = createChangeMission(
        project,
        existingMissions,
        { title },
        this.#dependencies
      );
      this.#insertMission(mission);
      return mission;
    });
  }

  getMission(missionId: MissionId): ChangeMission {
    return this.#read(() => {
      const mission = this.#mission(missionId);
      if (mission === undefined) {
        throw new ProjectRepositoryError("MISSION_NOT_FOUND");
      }
      return mission;
    });
  }

  listMissions(
    projectId: ProjectId,
    limit: number,
    cursor?: MissionId
  ): EntityPage<ChangeMission> {
    return this.#read(() => {
      if (this.#project(projectId) === undefined) {
        throw new ProjectRepositoryError("PROJECT_NOT_FOUND");
      }
      const rows = this.#connection
        .prepare(
          `${MISSION_HEAD_SELECT}
           WHERE m.project_id = ? AND (? IS NULL OR m.mission_id > ?)
           ORDER BY m.mission_id
           LIMIT ?`
        )
        .all(projectId, cursor ?? null, cursor ?? null, limit + 1) as MissionHeadRow[];
      const hasNext = rows.length > limit;
      const missions = rows.slice(0, limit).map(hydrateMission);
      return {
        items: Object.freeze(missions),
        nextCursor:
          hasNext && missions.length > 0
            ? (missions[missions.length - 1]?.missionId ?? null)
            : null
      };
    });
  }

  archiveMission(projectId: ProjectId, missionId: MissionId): ChangeMission {
    return this.#write(() => {
      const project = this.#project(projectId);
      if (project === undefined) {
        throw new ProjectRepositoryError("PROJECT_NOT_FOUND");
      }
      const mission = this.#mission(missionId);
      if (mission === undefined) {
        throw new ProjectRepositoryError("MISSION_NOT_FOUND");
      }
      const archived = archiveChangeMission(
        project,
        mission,
        this.#dependencies.clock
      );
      this.#insertMissionRevision(archived);
      const result = this.#connection
        .prepare(
          `UPDATE missions
           SET current_revision = ?, lifecycle_status = ?, updated_at_utc = ?
           WHERE mission_id = ? AND current_revision = ?`
        )
        .run(
          archived.revision,
          archived.status,
          archived.updatedAtUtc,
          archived.missionId,
          mission.revision
        );
      if (result.changes !== 1) {
        throw new ProjectRepositoryError("PROJECT_STORAGE_CONFLICT");
      }
      return archived;
    });
  }

  archiveProject(projectId: ProjectId): Project {
    return this.#write(() => {
      const project = this.#project(projectId);
      if (project === undefined) {
        throw new ProjectRepositoryError("PROJECT_NOT_FOUND");
      }
      const archived = archiveProject(
        project,
        this.#missionsForProject(projectId),
        this.#dependencies.clock
      );
      this.#insertProjectRevision(archived);
      const result = this.#connection
        .prepare(
          `UPDATE projects
           SET current_revision = ?, lifecycle_status = ?, updated_at_utc = ?
           WHERE project_id = ? AND current_revision = ?`
        )
        .run(
          archived.revision,
          archived.status,
          archived.updatedAtUtc,
          archived.projectId,
          project.revision
        );
      if (result.changes !== 1) {
        throw new ProjectRepositoryError("PROJECT_STORAGE_CONFLICT");
      }
      return archived;
    });
  }
}
