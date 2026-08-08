import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  prepareEvidenceImport,
  type CreateEvidenceSourceInput,
  type EvidenceSourceDependencies,
  type EvidenceSourceId
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import {
  EvidenceRepositoryError,
  SqliteEvidenceRepository
} from "../src/evidence/evidence-repository.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";
const M1 = "00000000-0000-4000-8000-000000000011";
const M2 = "00000000-0000-4000-8000-000000000012";
const S1 = "00000000-0000-4000-8000-000000000041";
const S2 = "00000000-0000-4000-8000-000000000042";
const S3 = "00000000-0000-4000-8000-000000000043";
const E1 = "00000000-0000-4000-8000-000000000051";
const E2 = "00000000-0000-4000-8000-000000000052";
const E3 = "00000000-0000-4000-8000-000000000053";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const T2 = "2026-08-04T10:02:00.000Z";
const T3 = "2026-08-04T10:03:00.000Z";
const T4 = "2026-08-04T10:04:00.000Z";
const directories: string[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];
const rawConnections: Database.Database[] = [];
const encoder = new TextEncoder();

function databasePath(label: string): string {
  const directory = mkdtempSync(join(tmpdir(), `intelliloop-evidence-${label}-`));
  directories.push(directory);
  return join(directory, "intelliloop.sqlite3");
}

function sequence<T>(values: readonly T[]): () => T {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function evidenceDependencies(
  ids: readonly string[],
  times: readonly string[]
): EvidenceSourceDependencies {
  const nextTime = sequence(times);
  return {
    ids: createStableIdGenerator(sequence(ids)),
    clock: createClock(() => new Date(nextTime()))
  };
}

function openDatabase(filePath: string) {
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  return database;
}

function createScope(
  database: ReturnType<typeof openFoundationDatabase>,
  projectIds: readonly string[] = [P1],
  missionIds: readonly string[] = [M1],
  times: readonly string[] = [T0, T1]
) {
  const repository = new SqliteProjectRepository(database.connection, {
    ids: createStableIdGenerator(sequence([...projectIds, ...missionIds])),
    clock: createClock(() => new Date(sequence(times)()))
  });
  const projects = projectIds.map((_, index) =>
    repository.createProject(`Evidence project ${index + 1}`)
  );
  const missions = missionIds.map((_, index) =>
    repository.createMission(
      projects[index]?.projectId ?? projects[0]!.projectId,
      `Evidence mission ${index + 1}`
    )
  );
  return { repository, projects, missions };
}

async function importInput(
  projectId = P1,
  missionId = M1,
  content = "Requirement: cancel before dispatch.\n",
  overrides: Partial<CreateEvidenceSourceInput> = {}
): Promise<CreateEvidenceSourceInput> {
  return {
    projectId: parseStableId<"PROJECT">(projectId),
    missionId: parseStableId<"MISSION">(missionId),
    origin: "USER_INPUT",
    sourceLocator: "manual:requirements/cancellation-v2",
    sourceRevision: "requirements-v2",
    effectiveAtUtc: "2026-08-01T00:00:00.000Z",
    extractionMethod: "DIRECT_IMPORT",
    epistemicLabel: "FACT",
    prepared: await prepareEvidenceImport({
      format: "MARKDOWN",
      content: encoder.encode(content)
    }),
    ...overrides
  };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: EvidenceRepositoryError["code"]
): Promise<EvidenceRepositoryError> {
  try {
    await operation();
    throw new Error("Expected evidence repository rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(EvidenceRepositoryError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof EvidenceRepositoryError)) throw error;
    return error;
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const connection of rawConnections.splice(0)) connection.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("append-only evidence persistence", () => {
  it("deduplicates the same redacted import with one source and timeline event", async () => {
    const filePath = databasePath("idempotent");
    const database = openDatabase(filePath);
    createScope(database);
    const repository = new SqliteEvidenceRepository(
      database.connection,
      evidenceDependencies([S1, E1, S2], [T2, T3])
    );
    const sentinel = "IL32_RAW_SECRET_SENTINEL";
    const input = await importInput(
      P1,
      M1,
      `Requirement.\npassword=${sentinel}\n`
    );

    const first = await repository.persistEvidence(input);
    const duplicate = await repository.persistEvidence(input);

    expect(first.created).toBe(true);
    expect(duplicate).toEqual({ ...first, created: false });
    expect(first.source.prepared.normalizedContent).not.toContain(sentinel);
    expect(database.connection.prepare("SELECT COUNT(*) AS count FROM evidence_sources").get())
      .toEqual({ count: 1 });
    expect(database.connection.prepare("SELECT COUNT(*) AS count FROM timeline_events").get())
      .toEqual({ count: 1 });

    database.close();
    databases.splice(databases.indexOf(database), 1);
    expect(readFileSync(filePath).includes(Buffer.from(sentinel, "utf8"))).toBe(false);
  });

  it("round-trips immutable attribution and timeline identity across restart", async () => {
    const filePath = databasePath("restart");
    const firstDatabase = openDatabase(filePath);
    createScope(firstDatabase);
    const firstRepository = new SqliteEvidenceRepository(
      firstDatabase.connection,
      evidenceDependencies([S1, E1], [T2])
    );
    const persisted = await firstRepository.persistEvidence(
      await importInput(P1, M1, '{"decision":"cancel","revision":2}', {
        origin: "SYNTHETIC_FIXTURE",
        sourceLocator: "fixture:retail/decision-v2",
        sourceRevision: "decision-v2",
        extractionMethod: "DIRECT_IMPORT",
        epistemicLabel: "INFERENCE",
        prepared: await prepareEvidenceImport({
          format: "JSON",
          content: encoder.encode('{"decision":"cancel","revision":2}')
        })
      })
    );

    firstDatabase.close();
    databases.splice(databases.indexOf(firstDatabase), 1);
    const restartedDatabase = openDatabase(filePath);
    const restarted = new SqliteEvidenceRepository(restartedDatabase.connection);

    expect(
      await restarted.getEvidenceSource(
        parseStableId<"PROJECT">(P1),
        parseStableId<"MISSION">(M1),
        parseStableId<"EVIDENCE_SOURCE">(S1)
      )
    ).toEqual(persisted.source);
    expect(
      await restarted.listTimelineEvents(
        parseStableId<"PROJECT">(P1),
        parseStableId<"MISSION">(M1),
        10
      )
    ).toEqual({ items: [persisted.timelineEvent], nextCursor: null });
  });

  it("enforces exact Project/Mission isolation", async () => {
    const database = openDatabase(databasePath("scope"));
    createScope(database, [P1, P2], [M1, M2], [T0, T1, T2, T3]);
    const repository = new SqliteEvidenceRepository(
      database.connection,
      evidenceDependencies([S1, E1, S2], [T4, T4])
    );
    const persisted = await repository.persistEvidence(await importInput());

    await expectCode(
      async () =>
        repository.persistEvidence(await importInput(P2, M1, "cross scope")),
      "EVIDENCE_CROSS_SCOPE"
    );
    await expectCode(
      () =>
        repository.getEvidenceSource(
          parseStableId<"PROJECT">(P2),
          parseStableId<"MISSION">(M2),
          persisted.source.evidenceSourceId
        ),
      "EVIDENCE_SOURCE_NOT_FOUND"
    );
    expect(database.connection.prepare("SELECT COUNT(*) AS count FROM evidence_sources").get())
      .toEqual({ count: 1 });
  });

  it("rejects new imports after mission archival while retaining history", async () => {
    const database = openDatabase(databasePath("archive"));
    const scope = createScope(database, [P1], [M1], [T0, T1, T3]);
    const repository = new SqliteEvidenceRepository(
      database.connection,
      evidenceDependencies([S1, E1, S2], [T2, T4])
    );
    const persisted = await repository.persistEvidence(await importInput());
    scope.repository.archiveMission(
      parseStableId<"PROJECT">(P1),
      parseStableId<"MISSION">(M1)
    );

    await expectCode(
      async () =>
        repository.persistEvidence(await importInput(P1, M1, "new evidence")),
      "EVIDENCE_MISSION_NOT_CURRENT"
    );
    expect(
      await repository.getEvidenceSource(
        parseStableId<"PROJECT">(P1),
        parseStableId<"MISSION">(M1),
        persisted.source.evidenceSourceId
      )
    ).toEqual(persisted.source);
  });

  it("paginates sources by identity and timeline by mission sequence", async () => {
    const database = openDatabase(databasePath("pages"));
    createScope(database);
    const repository = new SqliteEvidenceRepository(
      database.connection,
      evidenceDependencies([S3, E3, S1, E1, S2, E2], [T2, T3, T4])
    );
    for (const [index, locator] of [
      "manual:source/three",
      "manual:source/one",
      "manual:source/two"
    ].entries()) {
      await repository.persistEvidence(
        await importInput(P1, M1, `evidence ${index}`, {
          sourceLocator: locator,
          sourceRevision: `r${index}`
        })
      );
    }

    const projectId = parseStableId<"PROJECT">(P1);
    const missionId = parseStableId<"MISSION">(M1);
    const firstSources = await repository.listEvidenceSources(
      projectId,
      missionId,
      2
    );
    const lastSource = await repository.listEvidenceSources(
      projectId,
      missionId,
      2,
      firstSources.nextCursor ?? undefined
    );
    expect(firstSources.items.map((item) => item.evidenceSourceId)).toEqual([
      S1,
      S2
    ]);
    expect(firstSources.nextCursor).toBe(S2);
    expect(lastSource.items.map((item) => item.evidenceSourceId)).toEqual([S3]);
    expect(lastSource.nextCursor).toBeNull();

    const firstEvents = await repository.listTimelineEvents(
      projectId,
      missionId,
      2
    );
    const lastEvent = await repository.listTimelineEvents(
      projectId,
      missionId,
      2,
      firstEvents.nextCursor ?? undefined
    );
    expect(firstEvents.items.map((item) => item.sequence)).toEqual([1, 2]);
    expect(firstEvents.nextCursor).toBe(2);
    expect(lastEvent.items.map((item) => item.sequence)).toEqual([3]);
    expect(lastEvent.nextCursor).toBeNull();
  });

  it("rejects update/delete attempts for sources and timeline events", async () => {
    const database = openDatabase(databasePath("immutable"));
    createScope(database);
    const repository = new SqliteEvidenceRepository(
      database.connection,
      evidenceDependencies([S1, E1], [T2])
    );
    await repository.persistEvidence(await importInput());

    for (const sql of [
      "UPDATE evidence_sources SET source_locator = 'manual:changed' WHERE evidence_source_id = ?",
      "DELETE FROM evidence_sources WHERE evidence_source_id = ?",
      "UPDATE timeline_events SET mission_sequence = 2 WHERE evidence_source_id = ?",
      "DELETE FROM timeline_events WHERE evidence_source_id = ?"
    ]) {
      expect(() => database.connection.prepare(sql).run(S1)).toThrow();
    }
    expect(database.connection.prepare("SELECT COUNT(*) AS count FROM evidence_sources").get())
      .toEqual({ count: 1 });
    expect(database.connection.prepare("SELECT COUNT(*) AS count FROM timeline_events").get())
      .toEqual({ count: 1 });
  });

  it("converges concurrent same-import attempts across two connections", async () => {
    const filePath = databasePath("concurrent");
    const firstDatabase = openDatabase(filePath);
    createScope(firstDatabase);
    const secondDatabase = openDatabase(filePath);
    const first = new SqliteEvidenceRepository(
      firstDatabase.connection,
      evidenceDependencies([S1, E1], [T2])
    );
    const second = new SqliteEvidenceRepository(
      secondDatabase.connection,
      evidenceDependencies([S2, E2], [T3])
    );
    const input = await importInput();

    const results = await Promise.all([
      first.persistEvidence(input),
      second.persistEvidence(input)
    ]);

    expect(results.map((result) => result.created).sort()).toEqual([false, true]);
    expect(results[0]?.source).toEqual(results[1]?.source);
    expect(results[0]?.timelineEvent).toEqual(results[1]?.timelineEvent);
    expect(firstDatabase.connection.prepare("SELECT COUNT(*) AS count FROM evidence_sources").get())
      .toEqual({ count: 1 });
  });

  it("maps missing schema and invalid pages to stable non-diagnostic errors", async () => {
    const connection = new Database(":memory:");
    rawConnections.push(connection);
    const missing = new SqliteEvidenceRepository(connection);
    const projectId = parseStableId<"PROJECT">(P1);
    const missionId = parseStableId<"MISSION">(M1);
    const error = await expectCode(
      () => missing.listEvidenceSources(projectId, missionId, 10),
      "EVIDENCE_STORAGE_SCHEMA_INVALID"
    );
    expect(String(error)).not.toContain("SELECT");

    const database = openDatabase(databasePath("bad-page"));
    createScope(database);
    const repository = new SqliteEvidenceRepository(database.connection);
    await expectCode(
      () => repository.listEvidenceSources(projectId, missionId, 0),
      "EVIDENCE_PAGE_INVALID"
    );
    await expectCode(
      () => repository.listTimelineEvents(projectId, missionId, 10, -1),
      "EVIDENCE_PAGE_INVALID"
    );
    await expectCode(
      () =>
        repository.listEvidenceSources(
          projectId,
          missionId,
          10,
          "not-a-uuid" as EvidenceSourceId
        ),
      "EVIDENCE_PAGE_INVALID"
    );
  });
});
