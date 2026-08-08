import type { ChangeMission, Project } from "@intelliloop/domain";

export const PROJECT_API_VERSION = "v1" as const;
export const DEFAULT_PAGE_LIMIT = 20 as const;
export const MAXIMUM_PAGE_LIMIT = 100 as const;

export interface CreateProjectRequest {
  readonly name: string;
}

export interface CreateMissionRequest {
  readonly title: string;
}

export interface ProjectResource {
  readonly projectId: string;
  readonly name: string;
  readonly status: Project["status"];
  readonly revision: number;
  readonly createdAtUtc: string;
  readonly updatedAtUtc: string;
  readonly archivedAtUtc?: string;
}

export interface MissionResource {
  readonly missionId: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: ChangeMission["status"];
  readonly revision: number;
  readonly createdAtUtc: string;
  readonly updatedAtUtc: string;
  readonly archivedAtUtc?: string;
}

export interface PageMetadata {
  readonly limit: number;
  readonly nextCursor: string | null;
}

export interface ProjectResponse {
  readonly apiVersion: typeof PROJECT_API_VERSION;
  readonly project: ProjectResource;
}

export interface ProjectListResponse {
  readonly apiVersion: typeof PROJECT_API_VERSION;
  readonly projects: readonly ProjectResource[];
  readonly page: PageMetadata;
}

export interface MissionResponse {
  readonly apiVersion: typeof PROJECT_API_VERSION;
  readonly mission: MissionResource;
}

export interface MissionListResponse {
  readonly apiVersion: typeof PROJECT_API_VERSION;
  readonly projectId: string;
  readonly missions: readonly MissionResource[];
  readonly page: PageMetadata;
}

export function toProjectResource(project: Project): ProjectResource {
  const resource = {
    projectId: project.projectId,
    name: project.name,
    status: project.status,
    revision: project.revision,
    createdAtUtc: project.createdAtUtc,
    updatedAtUtc: project.updatedAtUtc
  } as const;

  return project.archivedAtUtc === undefined
    ? resource
    : { ...resource, archivedAtUtc: project.archivedAtUtc };
}

export function toMissionResource(mission: ChangeMission): MissionResource {
  const resource = {
    missionId: mission.missionId,
    projectId: mission.projectId,
    title: mission.title,
    status: mission.status,
    revision: mission.revision,
    createdAtUtc: mission.createdAtUtc,
    updatedAtUtc: mission.updatedAtUtc
  } as const;

  return mission.archivedAtUtc === undefined
    ? resource
    : { ...resource, archivedAtUtc: mission.archivedAtUtc };
}

export function createProjectResponse(project: Project): ProjectResponse {
  return { apiVersion: PROJECT_API_VERSION, project: toProjectResource(project) };
}

export function createMissionResponse(
  mission: ChangeMission
): MissionResponse {
  return { apiVersion: PROJECT_API_VERSION, mission: toMissionResource(mission) };
}
