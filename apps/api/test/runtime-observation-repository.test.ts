import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  prepareRuntimeObservationImport,
  type EvidenceSourceDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const S1 = "00000000-0000-4000-8000-000000000041";
const E1 = "00000000-0000-4000-8000-000000000051";
const O1 = "00000000-0000-4000-8000-000000000081";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const T2 = "2026-08-04T10:02:00.000Z";

const directories: string[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];

function sequence<T>(values: readonly T[]): () => T {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function evidenceDependencies(): EvidenceSourceDependencies {
  return {
    ids: createStableIdGenerator(sequence([S1, O1, E1])),
    clock: createClock(() => new Date(T2))
  };
}

function summary() {
  return {
    schemaVersion: "runtime-observation-summary.v1",
    subject: "checkout-api",
    environment: "PRODUCTION",
    observationKind: "http-request-summary",
    observedFromUtc: "2026-08-04T09:00:00.000Z",
    observedUntilUtc: "2026-08-04T09:05:00.000Z",
    sampleCount: 200,
    measurements: [
      { name: "error-rate", unit: "RATIO", value: 0.02 },
      { name: "p95-latency", unit: "MILLISECONDS", value: 180 }
    ]
  };
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("runtime observation persistence", () => {
  it("round-trips across restart and rejects update/delete attempts", async () => {
    const directory = mkdtempSync(join(tmpdir(), "intelliloop-runtime-repo-"));
    directories.push(directory);
    const filePath = join(directory, "intelliloop.sqlite3");
    const database = openFoundationDatabase({ filePath });
    databases.push(database);
    const projects = new SqliteProjectRepository(database.connection, {
      ids: createStableIdGenerator(sequence([P1, M1])),
      clock: createClock(() => new Date(sequence([T0, T1])()))
    });
    const project = projects.createProject("Runtime persistence project");
    const mission = projects.createMission(
      project.projectId,
      "Runtime persistence mission"
    );
    const repository = new SqliteEvidenceRepository(
      database.connection,
      evidenceDependencies()
    );
    const prepared = await prepareRuntimeObservationImport(summary());
    const persisted = await repository.persistRuntimeObservation({
      projectId: project.projectId,
      missionId: mission.missionId,
      origin: "VALIDATION_RESULT",
      sourceLocator: "runtime-summary:checkout/capture-7",
      sourceRevision: "capture-7",
      epistemicLabel: "FACT",
      prepared
    });
    expect(persisted).toMatchObject({
      created: true,
      observation: {
        runtimeObservationId: O1,
        evidenceSourceId: S1
      },
      timelineEvent: { timelineEventId: E1, sequence: 1 },
      freshness: "LATEST_OBSERVED_WINDOW"
    });
    database.close();
    databases.splice(databases.indexOf(database), 1);

    const restarted = openFoundationDatabase({ filePath });
    databases.push(restarted);
    const restartedRepository = new SqliteEvidenceRepository(
      restarted.connection
    );
    const restored = await restartedRepository.getRuntimeObservation(
      parseStableId<"PROJECT">(P1),
      parseStableId<"MISSION">(M1),
      parseStableId<"RUNTIME_OBSERVATION">(O1)
    );
    expect(restored.observation).toEqual(persisted.observation);
    expect(restored.source).toEqual(persisted.source);
    expect(restored.freshness).toBe("LATEST_OBSERVED_WINDOW");

    expect(() =>
      restarted.connection
        .prepare(
          "UPDATE runtime_observations SET sample_count = sample_count + 1 WHERE runtime_observation_id = ?"
        )
        .run(O1)
    ).toThrow(/immutable/u);
    expect(() =>
      restarted.connection
        .prepare(
          "DELETE FROM runtime_observations WHERE runtime_observation_id = ?"
        )
        .run(O1)
    ).toThrow(/immutable/u);
  });
});
