import { describe, expect, it } from "vitest";

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
  currentMissionFor,
  type ChangeMission,
  type Project,
  type ProjectDomainDependencies,
  type ProjectDomainErrorCode
} from "../src/index.js";

const PROJECT_ONE = "00000000-0000-4000-8000-000000000001";
const PROJECT_TWO = "00000000-0000-4000-8000-000000000002";
const MISSION_ONE = "00000000-0000-4000-8000-000000000011";
const MISSION_TWO = "00000000-0000-4000-8000-000000000012";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const T2 = "2026-08-04T00:02:00.000Z";
const T3 = "2026-08-04T00:03:00.000Z";

function dependencies(
  identities: string[],
  timestamps: string[]
): ProjectDomainDependencies {
  const remainingIdentities = [...identities];
  const remainingTimestamps = [...timestamps];
  return {
    ids: createStableIdGenerator(() => {
      const identity = remainingIdentities.shift();
      if (identity === undefined) throw new Error("Identity source exhausted.");
      return identity;
    }),
    clock: createClock(() => {
      const timestamp = remainingTimestamps.shift();
      if (timestamp === undefined) throw new Error("Clock source exhausted.");
      return new Date(timestamp);
    })
  };
}

function clockAt(timestamp: string) {
  return createClock(() => new Date(timestamp));
}

function expectDomainError(
  operation: () => unknown,
  code: ProjectDomainErrorCode
): void {
  try {
    operation();
    throw new Error("Expected a project-domain failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(ProjectDomainError);
    expect((error as ProjectDomainError).code).toBe(code);
  }
}

function createProjectOne(): Project {
  return createProject(
    { name: "Retail cancellation control" },
    dependencies([PROJECT_ONE], [T0])
  );
}

function createMissionOne(project: Project): ChangeMission {
  return createChangeMission(
    project,
    [],
    { title: "Expand cancellation eligibility" },
    dependencies([MISSION_ONE], [T1])
  );
}

describe("Project and Change Mission domain", () => {
  it("creates a deterministic immutable Project at revision 1", () => {
    const project = createProjectOne();

    expect(project).toEqual({
      entityType: "Project",
      projectId: PROJECT_ONE,
      name: "Retail cancellation control",
      status: "ACTIVE",
      revision: 1,
      createdAtUtc: T0,
      updatedAtUtc: T0
    });
    expect(Object.isFrozen(project)).toBe(true);
    expect(() => assertProjectInvariant(project)).not.toThrow();
  });

  it.each(["", " leading", "trailing ", "line\nbreak", "x".repeat(121)])(
    "rejects invalid Project names without echoing input",
    (name) => {
      expectDomainError(
        () =>
          createProject(
            { name },
            dependencies([PROJECT_ONE], [T0])
          ),
        "INVALID_PROJECT_NAME"
      );
      try {
        createProject({ name }, dependencies([PROJECT_ONE], [T0]));
      } catch (error) {
        expect(String(error)).not.toContain(name || "not-present");
      }
    }
  );

  it("creates exactly one project-scoped current mission", () => {
    const project = createProjectOne();
    const mission = createMissionOne(project);

    expect(mission).toEqual({
      entityType: "ChangeMission",
      missionId: MISSION_ONE,
      projectId: PROJECT_ONE,
      title: "Expand cancellation eligibility",
      status: "CURRENT",
      revision: 1,
      createdAtUtc: T1,
      updatedAtUtc: T1
    });
    expect(Object.isFrozen(mission)).toBe(true);
    expect(currentMissionFor(project, [mission])).toBe(mission);
    expect(() => assertChangeMissionInvariant(mission)).not.toThrow();
  });

  it("rejects a second current mission", () => {
    const project = createProjectOne();
    const mission = createMissionOne(project);

    expectDomainError(
      () =>
        createChangeMission(
          project,
          [mission],
          { title: "Another current change" },
          dependencies([MISSION_TWO], [T2])
        ),
      "CURRENT_MISSION_EXISTS"
    );
  });

  it("archives a mission immutably and increments only its revision", () => {
    const project = createProjectOne();
    const current = createMissionOne(project);
    const archived = archiveChangeMission(project, current, clockAt(T2));

    expect(archived).toEqual({
      ...current,
      status: "ARCHIVED",
      revision: 2,
      updatedAtUtc: T2,
      archivedAtUtc: T2
    });
    expect(current.status).toBe("CURRENT");
    expect(current.revision).toBe(1);
    expect(project.revision).toBe(1);
    expect(Object.isFrozen(archived)).toBe(true);
    expect(currentMissionFor(project, [archived])).toBeUndefined();
  });

  it("allows a new current mission only after preserving the archived one", () => {
    const project = createProjectOne();
    const archived = archiveChangeMission(
      project,
      createMissionOne(project),
      clockAt(T2)
    );
    const next = createChangeMission(
      project,
      [archived],
      { title: "Validate fulfilment coverage" },
      dependencies([MISSION_TWO], [T3])
    );

    expect(archived.status).toBe("ARCHIVED");
    expect(next.status).toBe("CURRENT");
    expect(next.revision).toBe(1);
    expect(currentMissionFor(project, [archived, next])).toBe(next);
  });

  it("requires the current mission to be archived before the project", () => {
    const project = createProjectOne();
    const current = createMissionOne(project);

    expectDomainError(
      () => archiveProject(project, [current], clockAt(T2)),
      "PROJECT_HAS_CURRENT_MISSION"
    );

    const archivedMission = archiveChangeMission(project, current, clockAt(T2));
    const archivedProject = archiveProject(
      project,
      [archivedMission],
      clockAt(T3)
    );
    expect(archivedProject).toEqual({
      ...project,
      status: "ARCHIVED",
      revision: 2,
      updatedAtUtc: T3,
      archivedAtUtc: T3
    });
    expect(project.status).toBe("ACTIVE");
  });

  it("treats archive as terminal for projects and missions", () => {
    const project = createProjectOne();
    const mission = createMissionOne(project);
    const archivedMission = archiveChangeMission(project, mission, clockAt(T2));
    const archivedProject = archiveProject(
      project,
      [archivedMission],
      clockAt(T3)
    );

    expectDomainError(
      () => archiveChangeMission(project, archivedMission, clockAt(T3)),
      "MISSION_ALREADY_ARCHIVED"
    );
    expectDomainError(
      () => archiveProject(archivedProject, [archivedMission], clockAt(T3)),
      "PROJECT_ALREADY_ARCHIVED"
    );
    expectDomainError(
      () =>
        createChangeMission(
          archivedProject,
          [archivedMission],
          { title: "Not permitted" },
          dependencies([MISSION_TWO], [T3])
        ),
      "PROJECT_ARCHIVED"
    );
  });

  it("rejects cross-project mission collections and transitions", () => {
    const projectOne = createProjectOne();
    const projectTwo = createProject(
      { name: "Another workspace" },
      dependencies([PROJECT_TWO], [T0])
    );
    const missionTwo = createChangeMission(
      projectTwo,
      [],
      { title: "Different project change" },
      dependencies([MISSION_TWO], [T1])
    );

    expectDomainError(
      () => currentMissionFor(projectOne, [missionTwo]),
      "CROSS_PROJECT_REFERENCE"
    );
    expectDomainError(
      () => archiveChangeMission(projectOne, missionTwo, clockAt(T2)),
      "CROSS_PROJECT_REFERENCE"
    );
    expectDomainError(
      () => archiveProject(projectOne, [missionTwo], clockAt(T2)),
      "CROSS_PROJECT_REFERENCE"
    );
  });

  it("rejects duplicate mission identities and conflicting current missions", () => {
    const project = createProjectOne();
    const missionOne = createMissionOne(project);
    const missionTwo = createChangeMission(
      project,
      [],
      { title: "Second independently constructed change" },
      dependencies([MISSION_TWO], [T2])
    );

    expectDomainError(
      () => currentMissionFor(project, [missionOne, missionOne]),
      "DUPLICATE_MISSION_ID"
    );
    expectDomainError(
      () => currentMissionFor(project, [missionOne, missionTwo]),
      "CURRENT_MISSION_CONFLICT"
    );

    const archived = archiveChangeMission(project, missionOne, clockAt(T2));
    expectDomainError(
      () =>
        createChangeMission(
          project,
          [archived],
          { title: "Colliding identity" },
          dependencies([MISSION_ONE], [T3])
        ),
      "DUPLICATE_MISSION_ID"
    );
  });

  it("rejects lifecycle clocks that move backwards", () => {
    const project = createProjectOne();
    const mission = createMissionOne(project);

    expectDomainError(
      () => archiveChangeMission(project, mission, clockAt(T0)),
      "NON_MONOTONIC_TIME"
    );
    expectDomainError(
      () =>
        createChangeMission(
          project,
          [],
          { title: "Created before project" },
          dependencies([MISSION_TWO], ["2026-08-03T23:59:59.000Z"])
        ),
      "NON_MONOTONIC_TIME"
    );

    const archivedMission = archiveChangeMission(project, mission, clockAt(T2));
    expectDomainError(
      () =>
        createChangeMission(
          project,
          [archivedMission],
          { title: "Created before prior archive" },
          dependencies([MISSION_TWO], [T1])
        ),
      "NON_MONOTONIC_TIME"
    );
    expectDomainError(
      () => archiveProject(project, [archivedMission], clockAt(T1)),
      "NON_MONOTONIC_TIME"
    );
  });

  it("fails closed for forged lifecycle state", () => {
    const project = createProjectOne();
    const mission = createMissionOne(project);

    expectDomainError(
      () =>
        assertProjectInvariant({
          ...project,
          status: "ARCHIVED",
          revision: 2,
          archivedAtUtc: T1
        } as Project),
      "INVALID_ENTITY"
    );
    expectDomainError(
      () =>
        assertChangeMissionInvariant({
          ...mission,
          revision: 2
        } as ChangeMission),
      "INVALID_ENTITY"
    );

    const archivedProject = archiveProject(project, [], clockAt(T2));
    expectDomainError(
      () => currentMissionFor(archivedProject, [mission]),
      "INVALID_ENTITY"
    );
  });
});
