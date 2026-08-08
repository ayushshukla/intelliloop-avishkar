import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  prepareEvidenceImport,
  type ClaimDependencies,
  type CreateClaimInput,
  type CreateEvidenceSourceInput,
  type EvidenceSourceDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import {
  ClaimRepositoryError,
  SqliteClaimRepository
} from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";
const M1 = "00000000-0000-4000-8000-000000000011";
const M2 = "00000000-0000-4000-8000-000000000012";
const S1 = "00000000-0000-4000-8000-000000000041";
const E1 = "00000000-0000-4000-8000-000000000051";
const C1 = "00000000-0000-4000-8000-000000000061";
const C2 = "00000000-0000-4000-8000-000000000062";
const C3 = "00000000-0000-4000-8000-000000000063";
const C4 = "00000000-0000-4000-8000-000000000064";
const L1 = "00000000-0000-4000-8000-000000000071";
const L2 = "00000000-0000-4000-8000-000000000072";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const T2 = "2026-08-04T10:02:00.000Z";
const T3 = "2026-08-04T10:03:00.000Z";
const T4 = "2026-08-04T10:04:00.000Z";
const T5 = "2026-08-04T10:05:00.000Z";
const T6 = "2026-08-04T10:06:00.000Z";
const encoder = new TextEncoder();
const directories: string[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];
const rawConnections: Database.Database[] = [];

const CONTENT = [
  "Cancellation is allowed before dispatch.",
  "Cancellation is forbidden before dispatch.",
  "Cancellation requires approval before dispatch."
].join("\n");

function sequence<T>(values: readonly T[]): () => T {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function databasePath(label: string): string {
  const directory = mkdtempSync(join(tmpdir(), `intelliloop-claims-${label}-`));
  directories.push(directory);
  return join(directory, "intelliloop.sqlite3");
}

function openDatabase(filePath: string) {
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  return database;
}

function dependencies(
  ids: readonly string[],
  times: readonly string[]
): ClaimDependencies {
  const nextTime = sequence(times);
  return {
    ids: createStableIdGenerator(sequence(ids)),
    clock: createClock(() => new Date(nextTime()))
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
    repository.createProject(`Claim project ${index + 1}`)
  );
  const missions = missionIds.map((_, index) =>
    repository.createMission(
      projects[index]?.projectId ?? projects[0]!.projectId,
      `Claim mission ${index + 1}`
    )
  );
  return { repository, projects, missions };
}

async function evidenceInput(
  projectId = P1,
  missionId = M1,
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
      content: encoder.encode(CONTENT)
    }),
    ...overrides
  };
}

async function persistedSource(
  database: ReturnType<typeof openFoundationDatabase>,
  input?: CreateEvidenceSourceInput,
  ids: readonly string[] = [S1, E1],
  times: readonly string[] = [T2]
) {
  const repository = new SqliteEvidenceRepository(
    database.connection,
    evidenceDependencies(ids, times)
  );
  return (await repository.persistEvidence(input ?? (await evidenceInput())))
    .source;
}

function claimInput(
  source: Awaited<ReturnType<typeof persistedSource>>,
  overrides: Partial<CreateClaimInput> = {}
): CreateClaimInput {
  return {
    projectId: source.projectId,
    missionId: source.missionId,
    evidenceSourceId: source.evidenceSourceId,
    rawText: "Cancellation is allowed before dispatch.",
    subject: "Order Cancellation",
    predicate: "Allowed Before",
    value: "dispatch",
    applicability: {
      dimensions: [
        { dimension: "region", value: "india" },
        { dimension: "channel", value: "web" }
      ],
      effectiveFromUtc: "2026-08-01T00:00:00.000Z",
      effectiveUntilUtc: "2027-08-01T00:00:00.000Z"
    },
    effectiveAtUtc: "2026-08-01T00:00:00.000Z",
    extractionMethod: "MANUAL_STRUCTURED_INTAKE",
    epistemicLabel: "FACT",
    ...overrides
  };
}

async function expectRepositoryCode(
  operation: () => Promise<unknown>,
  code: ClaimRepositoryError["code"]
): Promise<ClaimRepositoryError> {
  try {
    await operation();
    throw new Error("Expected claim repository rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(ClaimRepositoryError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof ClaimRepositoryError)) throw error;
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

describe("append-only claim persistence", () => {
  it("deduplicates exact intake without losing explicit inference metadata", async () => {
    const database = openDatabase(databasePath("idempotent"));
    createScope(database);
    const source = await persistedSource(database);
    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2], [T3, T4])
    );
    const input = claimInput(source, { epistemicLabel: "INFERENCE" });

    const first = await repository.persistClaim(input);
    const duplicate = await repository.persistClaim(input);

    expect(first.created).toBe(true);
    expect(duplicate).toEqual({ ...first, created: false });
    expect(first.claim.epistemicLabel).toBe("INFERENCE");
    expect(
      database.connection.prepare("SELECT COUNT(*) AS count FROM claims").get()
    ).toEqual({ count: 1 });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM claim_supersessions")
        .get()
    ).toEqual({ count: 0 });
  });

  it("preserves conflicting raw text and values as separate claims", async () => {
    const database = openDatabase(databasePath("conflicting"));
    createScope(database);
    const source = await persistedSource(database);
    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2], [T3, T4])
    );

    const allowed = await repository.persistClaim(claimInput(source));
    const forbidden = await repository.persistClaim(
      claimInput(source, {
        rawText: "Cancellation is forbidden before dispatch.",
        value: false
      })
    );

    expect(forbidden.claim.comparisonKey).toBe(allowed.claim.comparisonKey);
    expect(forbidden.claim.applicabilityKey).toBe(
      allowed.claim.applicabilityKey
    );
    expect(forbidden.claim.value).toBe(false);
    expect(forbidden.claim.rawText).toContain("forbidden");
    expect(allowed.claim.rawText).toContain("allowed");
    expect(
      database.connection.prepare("SELECT COUNT(*) AS count FROM claims").get()
    ).toEqual({ count: 2 });
  });

  it("round-trips a complete successor chain across restart with all history intact", async () => {
    const filePath = databasePath("restart-history");
    const database = openDatabase(filePath);
    createScope(database);
    const source = await persistedSource(database);
    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2, L1, C3, L2], [T3, T4, T5])
    );
    const first = await repository.persistClaim(claimInput(source));
    const second = await repository.persistClaim(
      claimInput(source, {
        rawText: "Cancellation is forbidden before dispatch.",
        value: false,
        supersedesClaimId: first.claim.claimId
      })
    );
    const third = await repository.persistClaim(
      claimInput(source, {
        rawText: "Cancellation requires approval before dispatch.",
        value: "approval",
        supersedesClaimId: second.claim.claimId
      })
    );

    database.close();
    databases.splice(databases.indexOf(database), 1);
    const restartedDatabase = openDatabase(filePath);
    const restarted = new SqliteClaimRepository(restartedDatabase.connection);
    const projectId = parseStableId<"PROJECT">(P1);
    const missionId = parseStableId<"MISSION">(M1);

    expect(
      (await restarted.listClaims(projectId, missionId, 10)).items.map(
        (claim) => claim.claimId
      )
    ).toEqual([C1, C2, C3]);
    const links = await restarted.listSupersessions(projectId, missionId, 10);
    expect(
      links.items.map((link) => [
        link.predecessorClaimId,
        link.successorClaimId
      ])
    ).toEqual([
      [C1, C2],
      [C2, C3]
    ]);
    expect(
      await restarted.getClaim(projectId, missionId, first.claim.claimId)
    ).toEqual(first.claim);
    expect(third.claim.supersedesClaimId).toBe(second.claim.claimId);
  });

  it("rejects missing, mismatched and already-superseded predecessors", async () => {
    const database = openDatabase(databasePath("invalid-successor"));
    createScope(database);
    const source = await persistedSource(database);
    const missingRepository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1], [T3])
    );
    await expectRepositoryCode(
      () =>
        missingRepository.persistClaim(
          claimInput(source, {
            supersedesClaimId: parseStableId<"CLAIM">(C4)
          })
        ),
      "CLAIM_PREDECESSOR_NOT_FOUND"
    );

    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2, C3, L1, C4, L2], [T3, T4, T5, T6])
    );
    const first = await repository.persistClaim(claimInput(source));
    await expect(
      repository.persistClaim(
        claimInput(source, {
          subject: "Refund",
          rawText: "Cancellation is forbidden before dispatch.",
          value: false,
          supersedesClaimId: first.claim.claimId
        })
      )
    ).rejects.toMatchObject({
      code: "CLAIM_SUPERSESSION_INVALID"
    });
    await repository.persistClaim(
      claimInput(source, {
        rawText: "Cancellation is forbidden before dispatch.",
        value: false,
        supersedesClaimId: first.claim.claimId
      })
    );
    await expectRepositoryCode(
      () =>
        repository.persistClaim(
          claimInput(source, {
            rawText: "Cancellation requires approval before dispatch.",
            value: "approval",
            supersedesClaimId: first.claim.claimId
          })
        ),
      "CLAIM_SUPERSESSION_CONFLICT"
    );
    expect(
      database.connection.prepare("SELECT COUNT(*) AS count FROM claims").get()
    ).toEqual({ count: 2 });
  });

  it("enforces source scope and retains readable history after mission archive", async () => {
    const database = openDatabase(databasePath("scope-archive"));
    const scope = createScope(
      database,
      [P1, P2],
      [M1, M2],
      [T0, T1, T2, T3]
    );
    const source = await persistedSource(database, await evidenceInput(), [S1, E1], [T4]);
    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2], [T5, T6])
    );
    const persisted = await repository.persistClaim(claimInput(source));
    await expect(
      repository.persistClaim({
        ...claimInput(source),
        projectId: parseStableId<"PROJECT">(P2),
        missionId: parseStableId<"MISSION">(M2)
      })
    ).rejects.toMatchObject({ code: "CLAIM_SOURCE_NOT_FOUND" });

    scope.repository.archiveMission(
      parseStableId<"PROJECT">(P1),
      parseStableId<"MISSION">(M1)
    );
    await expectRepositoryCode(
      () =>
        repository.persistClaim(
          claimInput(source, {
            rawText: "Cancellation is forbidden before dispatch.",
            value: false
          })
        ),
      "CLAIM_MISSION_NOT_CURRENT"
    );
    expect(
      await repository.getClaim(
        parseStableId<"PROJECT">(P1),
        parseStableId<"MISSION">(M1),
        persisted.claim.claimId
      )
    ).toEqual(persisted.claim);
  });

  it("rejects direct update/delete attempts for claims and links", async () => {
    const database = openDatabase(databasePath("immutable"));
    createScope(database);
    const source = await persistedSource(database);
    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2, L1], [T3, T4])
    );
    const first = await repository.persistClaim(claimInput(source));
    const second = await repository.persistClaim(
      claimInput(source, {
        rawText: "Cancellation is forbidden before dispatch.",
        value: false,
        supersedesClaimId: first.claim.claimId
      })
    );

    const immutableMutations: readonly (readonly [string, string])[] = [
      ["UPDATE claims SET raw_text = 'changed' WHERE claim_id = ?", C1],
      ["DELETE FROM claims WHERE claim_id = ?", C1],
      [
        "UPDATE claim_supersessions SET relationship_type = 'SUPERSEDES' WHERE claim_supersession_id = ?",
        L1
      ],
      ["DELETE FROM claim_supersessions WHERE claim_supersession_id = ?", L1]
    ];
    for (const [sql, id] of immutableMutations) {
      expect(() => database.connection.prepare(sql).run(id)).toThrow();
    }
    expect(
      database.connection.prepare("SELECT COUNT(*) AS count FROM claims").get()
    ).toEqual({ count: 2 });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM claim_supersessions")
        .get()
    ).toEqual({ count: 1 });

    database.connection.exec("DROP TRIGGER claim_supersessions_reject_update");
    database.connection
      .prepare(
        "UPDATE claim_supersessions SET link_digest = ? WHERE claim_supersession_id = ?"
      )
      .run(`sha256:${"0".repeat(64)}`, L1);
    await expectRepositoryCode(
      () =>
        repository.getClaim(
          parseStableId<"PROJECT">(P1),
          parseStableId<"MISSION">(M1),
          second.claim.claimId
        ),
      "CLAIM_STORAGE_SCHEMA_INVALID"
    );
  });

  it("rolls back the claim when successor-link persistence fails", async () => {
    const database = openDatabase(databasePath("atomic"));
    createScope(database);
    const source = await persistedSource(database);
    const repository = new SqliteClaimRepository(
      database.connection,
      dependencies([C1, C2, L1], [T3, T4])
    );
    const first = await repository.persistClaim(claimInput(source));
    database.connection.exec(`
      CREATE TRIGGER test_reject_claim_supersession
      BEFORE INSERT ON claim_supersessions
      BEGIN
        SELECT RAISE(ABORT, 'forced test failure');
      END;
    `);

    await expectRepositoryCode(
      () =>
        repository.persistClaim(
          claimInput(source, {
            rawText: "Cancellation is forbidden before dispatch.",
            value: false,
            supersedesClaimId: first.claim.claimId
          })
        ),
      "CLAIM_STORAGE_CONFLICT"
    );
    expect(
      database.connection.prepare("SELECT COUNT(*) AS count FROM claims").get()
    ).toEqual({ count: 1 });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM claim_supersessions")
        .get()
    ).toEqual({ count: 0 });
  });

  it("converges concurrent exact intake across two connections", async () => {
    const filePath = databasePath("concurrent");
    const firstDatabase = openDatabase(filePath);
    createScope(firstDatabase);
    const source = await persistedSource(firstDatabase);
    const secondDatabase = openDatabase(filePath);
    const first = new SqliteClaimRepository(
      firstDatabase.connection,
      dependencies([C1], [T3])
    );
    const second = new SqliteClaimRepository(
      secondDatabase.connection,
      dependencies([C2], [T4])
    );

    const results = await Promise.all([
      first.persistClaim(claimInput(source)),
      second.persistClaim(claimInput(source))
    ]);

    expect(results.map((result) => result.created).sort()).toEqual([
      false,
      true
    ]);
    expect(results[0]?.claim).toEqual(results[1]?.claim);
    expect(
      firstDatabase.connection
        .prepare("SELECT COUNT(*) AS count FROM claims")
        .get()
    ).toEqual({ count: 1 });
  });

  it("maps missing schema and invalid pagination to stable non-diagnostic errors", async () => {
    const missingConnection = new Database(":memory:");
    rawConnections.push(missingConnection);
    const missing = new SqliteClaimRepository(missingConnection);
    const projectId = parseStableId<"PROJECT">(P1);
    const missionId = parseStableId<"MISSION">(M1);
    const missingError = await expectRepositoryCode(
      () => missing.listClaims(projectId, missionId, 10),
      "CLAIM_STORAGE_SCHEMA_INVALID"
    );
    expect(String(missingError)).not.toContain("SELECT");

    const database = openDatabase(databasePath("pages"));
    createScope(database);
    const repository = new SqliteClaimRepository(database.connection);

    await expectRepositoryCode(
      () => repository.listClaims(projectId, missionId, 0),
      "CLAIM_PAGE_INVALID"
    );
    await expectRepositoryCode(
      () =>
        repository.listSupersessions(
          projectId,
          missionId,
          10,
          "bad-cursor" as never
        ),
      "CLAIM_PAGE_INVALID"
    );
  });
});
