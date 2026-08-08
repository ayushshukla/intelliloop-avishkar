import { parseStableId, type StableId, type StableIdGenerator } from "./stable-id.js";
import { parseUtcTimestamp, type Clock, type UtcTimestamp } from "./time.js";

export const PROJECT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const MISSION_STATUSES = ["CURRENT", "ARCHIVED"] as const;

export const PROJECT_DOMAIN_ERROR_CODES = [
  "INVALID_PROJECT_NAME",
  "INVALID_MISSION_TITLE",
  "INVALID_ENTITY",
  "PROJECT_ARCHIVED",
  "PROJECT_ALREADY_ARCHIVED",
  "MISSION_ALREADY_ARCHIVED",
  "CURRENT_MISSION_EXISTS",
  "CURRENT_MISSION_CONFLICT",
  "PROJECT_HAS_CURRENT_MISSION",
  "CROSS_PROJECT_REFERENCE",
  "DUPLICATE_MISSION_ID",
  "NON_MONOTONIC_TIME"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MissionStatus = (typeof MISSION_STATUSES)[number];
export type ProjectDomainErrorCode =
  (typeof PROJECT_DOMAIN_ERROR_CODES)[number];
export type ProjectId = StableId<"PROJECT">;
export type MissionId = StableId<"MISSION">;

declare const projectNameBrand: unique symbol;
declare const missionTitleBrand: unique symbol;
declare const entityRevisionBrand: unique symbol;

export type ProjectName = string & {
  readonly [projectNameBrand]: "PROJECT_NAME";
};

export type MissionTitle = string & {
  readonly [missionTitleBrand]: "MISSION_TITLE";
};

export type EntityRevision = number & {
  readonly [entityRevisionBrand]: "ENTITY_REVISION";
};

export interface Project {
  readonly entityType: "Project";
  readonly projectId: ProjectId;
  readonly name: ProjectName;
  readonly status: ProjectStatus;
  readonly revision: EntityRevision;
  readonly createdAtUtc: UtcTimestamp;
  readonly updatedAtUtc: UtcTimestamp;
  readonly archivedAtUtc?: UtcTimestamp;
}

export interface ChangeMission {
  readonly entityType: "ChangeMission";
  readonly missionId: MissionId;
  readonly projectId: ProjectId;
  readonly title: MissionTitle;
  readonly status: MissionStatus;
  readonly revision: EntityRevision;
  readonly createdAtUtc: UtcTimestamp;
  readonly updatedAtUtc: UtcTimestamp;
  readonly archivedAtUtc?: UtcTimestamp;
}

export interface ProjectDomainDependencies {
  readonly ids: StableIdGenerator;
  readonly clock: Clock;
}

export interface CreateProjectInput {
  readonly name: string;
}

export interface CreateChangeMissionInput {
  readonly title: string;
}

const ERROR_MESSAGES: Readonly<Record<ProjectDomainErrorCode, string>> =
  Object.freeze({
    INVALID_PROJECT_NAME: "Project name is invalid.",
    INVALID_MISSION_TITLE: "Mission title is invalid.",
    INVALID_ENTITY: "Project domain entity is invalid.",
    PROJECT_ARCHIVED: "Archived projects cannot accept lifecycle changes.",
    PROJECT_ALREADY_ARCHIVED: "Project is already archived.",
    MISSION_ALREADY_ARCHIVED: "Mission is already archived.",
    CURRENT_MISSION_EXISTS: "Project already has a current mission.",
    CURRENT_MISSION_CONFLICT: "Project has conflicting current missions.",
    PROJECT_HAS_CURRENT_MISSION:
      "Project cannot be archived while a current mission exists.",
    CROSS_PROJECT_REFERENCE: "Cross-project mission reference is not allowed.",
    DUPLICATE_MISSION_ID: "Mission identity already exists in the project.",
    NON_MONOTONIC_TIME: "Lifecycle time cannot move backwards."
  });

export class ProjectDomainError extends Error {
  readonly code: ProjectDomainErrorCode;

  constructor(code: ProjectDomainErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ProjectDomainError";
    this.code = code;
  }
}

function fail(code: ProjectDomainErrorCode): never {
  throw new ProjectDomainError(code);
}

function parseBoundedLabel(
  value: unknown,
  maximumLength: number,
  errorCode: "INVALID_PROJECT_NAME" | "INVALID_MISSION_TITLE"
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fail(errorCode);
  }
  return value;
}

export function parseProjectName(value: unknown): ProjectName {
  return parseBoundedLabel(value, 120, "INVALID_PROJECT_NAME") as ProjectName;
}

export function parseMissionTitle(value: unknown): MissionTitle {
  return parseBoundedLabel(value, 160, "INVALID_MISSION_TITLE") as MissionTitle;
}

function parseRevision(value: unknown): EntityRevision {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return fail("INVALID_ENTITY");
  }
  return value as EntityRevision;
}

function nextRevision(value: EntityRevision): EntityRevision {
  if (value === Number.MAX_SAFE_INTEGER) {
    return fail("INVALID_ENTITY");
  }
  return (value + 1) as EntityRevision;
}

function assertOrderedTime(
  earlier: UtcTimestamp,
  later: UtcTimestamp
): void {
  if (later < earlier) {
    fail("NON_MONOTONIC_TIME");
  }
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return PROJECT_STATUSES.some((status) => status === value);
}

function isMissionStatus(value: unknown): value is MissionStatus {
  return MISSION_STATUSES.some((status) => status === value);
}

export function assertProjectInvariant(project: Project): void {
  try {
    if (project.entityType !== "Project" || !isProjectStatus(project.status)) {
      fail("INVALID_ENTITY");
    }
    parseStableId<"PROJECT">(project.projectId);
    parseProjectName(project.name);
    parseRevision(project.revision);
    parseUtcTimestamp(project.createdAtUtc);
    parseUtcTimestamp(project.updatedAtUtc);
    assertOrderedTime(project.createdAtUtc, project.updatedAtUtc);

    if (project.status === "ACTIVE") {
      if (project.revision !== 1 || project.archivedAtUtc !== undefined) {
        fail("INVALID_ENTITY");
      }
      return;
    }

    if (project.revision < 2 || project.archivedAtUtc === undefined) {
      fail("INVALID_ENTITY");
    }
    parseUtcTimestamp(project.archivedAtUtc);
    if (project.archivedAtUtc !== project.updatedAtUtc) {
      fail("INVALID_ENTITY");
    }
  } catch (error) {
    if (error instanceof ProjectDomainError) {
      throw error;
    }
    fail("INVALID_ENTITY");
  }
}

export function assertChangeMissionInvariant(mission: ChangeMission): void {
  try {
    if (
      mission.entityType !== "ChangeMission" ||
      !isMissionStatus(mission.status)
    ) {
      fail("INVALID_ENTITY");
    }
    parseStableId<"MISSION">(mission.missionId);
    parseStableId<"PROJECT">(mission.projectId);
    parseMissionTitle(mission.title);
    parseRevision(mission.revision);
    parseUtcTimestamp(mission.createdAtUtc);
    parseUtcTimestamp(mission.updatedAtUtc);
    assertOrderedTime(mission.createdAtUtc, mission.updatedAtUtc);

    if (mission.status === "CURRENT") {
      if (mission.revision !== 1 || mission.archivedAtUtc !== undefined) {
        fail("INVALID_ENTITY");
      }
      return;
    }

    if (mission.revision < 2 || mission.archivedAtUtc === undefined) {
      fail("INVALID_ENTITY");
    }
    parseUtcTimestamp(mission.archivedAtUtc);
    if (mission.archivedAtUtc !== mission.updatedAtUtc) {
      fail("INVALID_ENTITY");
    }
  } catch (error) {
    if (error instanceof ProjectDomainError) {
      throw error;
    }
    fail("INVALID_ENTITY");
  }
}

function validateMissionCollection(
  project: Project,
  missions: readonly ChangeMission[]
): {
  readonly currentMission: ChangeMission | undefined;
  readonly latestUpdatedAtUtc: UtcTimestamp;
} {
  assertProjectInvariant(project);
  const identities = new Set<MissionId>();
  let currentMission: ChangeMission | undefined;
  let latestUpdatedAtUtc = project.updatedAtUtc;

  for (const mission of missions) {
    assertChangeMissionInvariant(mission);
    if (mission.projectId !== project.projectId) {
      fail("CROSS_PROJECT_REFERENCE");
    }
    if (identities.has(mission.missionId)) {
      fail("DUPLICATE_MISSION_ID");
    }
    identities.add(mission.missionId);
    assertOrderedTime(project.createdAtUtc, mission.createdAtUtc);
    if (mission.updatedAtUtc > latestUpdatedAtUtc) {
      latestUpdatedAtUtc = mission.updatedAtUtc;
    }

    if (mission.status === "CURRENT") {
      if (currentMission !== undefined) {
        fail("CURRENT_MISSION_CONFLICT");
      }
      currentMission = mission;
    }
  }

  if (project.status === "ARCHIVED" && currentMission !== undefined) {
    fail("INVALID_ENTITY");
  }

  return { currentMission, latestUpdatedAtUtc };
}

export function currentMissionFor(
  project: Project,
  missions: readonly ChangeMission[]
): ChangeMission | undefined {
  return validateMissionCollection(project, missions).currentMission;
}

export function createProject(
  input: CreateProjectInput,
  dependencies: ProjectDomainDependencies
): Project {
  const name = parseProjectName(input.name);
  const createdAtUtc = dependencies.clock.now();
  const project = Object.freeze({
    entityType: "Project" as const,
    projectId: dependencies.ids<"PROJECT">(),
    name,
    status: "ACTIVE" as const,
    revision: 1 as EntityRevision,
    createdAtUtc,
    updatedAtUtc: createdAtUtc
  });
  assertProjectInvariant(project);
  return project;
}

export function createChangeMission(
  project: Project,
  existingMissions: readonly ChangeMission[],
  input: CreateChangeMissionInput,
  dependencies: ProjectDomainDependencies
): ChangeMission {
  const { currentMission, latestUpdatedAtUtc } = validateMissionCollection(
    project,
    existingMissions
  );
  if (project.status === "ARCHIVED") {
    fail("PROJECT_ARCHIVED");
  }
  if (currentMission !== undefined) {
    fail("CURRENT_MISSION_EXISTS");
  }

  const title = parseMissionTitle(input.title);
  const createdAtUtc = dependencies.clock.now();
  assertOrderedTime(latestUpdatedAtUtc, createdAtUtc);
  const missionId = dependencies.ids<"MISSION">();
  if (existingMissions.some((mission) => mission.missionId === missionId)) {
    fail("DUPLICATE_MISSION_ID");
  }

  const mission = Object.freeze({
    entityType: "ChangeMission" as const,
    missionId,
    projectId: project.projectId,
    title,
    status: "CURRENT" as const,
    revision: 1 as EntityRevision,
    createdAtUtc,
    updatedAtUtc: createdAtUtc
  });
  assertChangeMissionInvariant(mission);
  return mission;
}

export function archiveChangeMission(
  project: Project,
  mission: ChangeMission,
  clock: Clock
): ChangeMission {
  assertProjectInvariant(project);
  assertChangeMissionInvariant(mission);
  if (mission.projectId !== project.projectId) {
    fail("CROSS_PROJECT_REFERENCE");
  }
  if (project.status === "ARCHIVED") {
    fail("PROJECT_ARCHIVED");
  }
  if (mission.status === "ARCHIVED") {
    fail("MISSION_ALREADY_ARCHIVED");
  }

  const archivedAtUtc = clock.now();
  assertOrderedTime(mission.updatedAtUtc, archivedAtUtc);
  const archived = Object.freeze({
    ...mission,
    status: "ARCHIVED" as const,
    revision: nextRevision(mission.revision),
    updatedAtUtc: archivedAtUtc,
    archivedAtUtc
  });
  assertChangeMissionInvariant(archived);
  return archived;
}

export function archiveProject(
  project: Project,
  missions: readonly ChangeMission[],
  clock: Clock
): Project {
  const { currentMission, latestUpdatedAtUtc } = validateMissionCollection(
    project,
    missions
  );
  if (project.status === "ARCHIVED") {
    fail("PROJECT_ALREADY_ARCHIVED");
  }
  if (currentMission !== undefined) {
    fail("PROJECT_HAS_CURRENT_MISSION");
  }

  const archivedAtUtc = clock.now();
  assertOrderedTime(latestUpdatedAtUtc, archivedAtUtc);
  const archived = Object.freeze({
    ...project,
    status: "ARCHIVED" as const,
    revision: nextRevision(project.revision),
    updatedAtUtc: archivedAtUtc,
    archivedAtUtc
  });
  assertProjectInvariant(archived);
  return archived;
}
