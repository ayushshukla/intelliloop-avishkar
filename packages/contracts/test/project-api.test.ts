import { describe, expect, it } from "vitest";

import {
  createMissionResponse,
  createProjectResponse,
  toMissionResource,
  toProjectResource
} from "../src/index.js";
import type { ChangeMission, Project } from "@intelliloop/domain";

const project = Object.freeze({
  entityType: "Project",
  projectId: "00000000-0000-4000-8000-000000000001",
  name: "Checkout safety",
  status: "ARCHIVED",
  revision: 2,
  createdAtUtc: "2026-08-04T00:00:00.000Z",
  updatedAtUtc: "2026-08-04T00:02:00.000Z",
  archivedAtUtc: "2026-08-04T00:02:00.000Z"
}) as Project;

const mission = Object.freeze({
  entityType: "ChangeMission",
  missionId: "00000000-0000-4000-8000-000000000011",
  projectId: project.projectId,
  title: "Expand cancellation eligibility",
  status: "ARCHIVED",
  revision: 2,
  createdAtUtc: "2026-08-04T00:01:00.000Z",
  updatedAtUtc: "2026-08-04T00:02:00.000Z",
  archivedAtUtc: "2026-08-04T00:02:00.000Z"
}) as ChangeMission;

describe("project API contracts", () => {
  it("serializes the complete versioned Project response", () => {
    expect(createProjectResponse(project)).toEqual({
      apiVersion: "v1",
      project: toProjectResource(project)
    });
    expect(toProjectResource(project)).toHaveProperty("archivedAtUtc");
  });

  it("serializes the complete versioned ChangeMission response", () => {
    expect(createMissionResponse(mission)).toEqual({
      apiVersion: "v1",
      mission: toMissionResource(mission)
    });
    expect(toMissionResource(mission)).toHaveProperty("archivedAtUtc");
  });
});
