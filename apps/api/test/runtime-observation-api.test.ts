import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  type ClaimDependencies,
  type EvidenceSourceDependencies,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const S1 = "00000000-0000-4000-8000-000000000041";
const S2 = "00000000-0000-4000-8000-000000000042";
const S3 = "00000000-0000-4000-8000-000000000043";
const S4 = "00000000-0000-4000-8000-000000000044";
const E1 = "00000000-0000-4000-8000-000000000051";
const E2 = "00000000-0000-4000-8000-000000000052";
const O1 = "00000000-0000-4000-8000-000000000081";
const O2 = "00000000-0000-4000-8000-000000000082";
const O3 = "00000000-0000-4000-8000-000000000083";
const O4 = "00000000-0000-4000-8000-000000000084";
const C1 = "00000000-0000-4000-8000-000000000061";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const T2 = "2026-08-04T10:02:00.000Z";
const T3 = "2026-08-04T10:03:00.000Z";
const T4 = "2026-08-04T10:04:00.000Z";
const T5 = "2026-08-04T10:05:00.000Z";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const SECRET = "IL37_SECRET_SENTINEL_123456789";
const PRIVATE_PATH = "C:\\Users\\private\\runtime.json";

const directories: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
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

function projectDependencies(): ProjectDomainDependencies {
  const nextTime = sequence([T0, T1]);
  return {
    ids: createStableIdGenerator(sequence([P1, M1])),
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

function claimDependencies(): ClaimDependencies {
  return {
    ids: createStableIdGenerator(() => C1),
    clock: createClock(() => new Date(T5))
  };
}

function environment(options: {
  readonly evidenceIds?: readonly string[];
  readonly evidenceTimes?: readonly string[];
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "intelliloop-runtime-api-"));
  directories.push(directory);
  const database = openFoundationDatabase({
    filePath: join(directory, "intelliloop.sqlite3")
  });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const project = projects.createProject("Runtime observation project");
  const mission = projects.createMission(
    project.projectId,
    "Historical runtime observations"
  );
  const evidence = new SqliteEvidenceRepository(
    database.connection,
    evidenceDependencies(
      options.evidenceIds ?? [S1, O1, E1],
      options.evidenceTimes ?? [T2]
    )
  );
  const claims = new SqliteClaimRepository(
    database.connection,
    claimDependencies()
  );
  const app = buildApp({
    projectRepository: projects,
    evidenceRepository: evidence,
    claimRepository: claims,
    requestIdFactory: () => REQUEST_ID
  });
  apps.push(app);
  return { app, database, mission };
}

function summary(overrides: Record<string, unknown> = {}) {
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
    ],
    ...overrides
  };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    origin: "USER_INPUT",
    sourceLocator: "runtime-summary:checkout/2026-08-04",
    sourceRevision: "capture-7",
    epistemicLabel: "FACT",
    summary: summary(),
    ...overrides
  };
}

function stableError(code: string) {
  const messages: Record<string, string> = {
    INVALID_REQUEST: "The request could not be accepted.",
    NOT_FOUND: "The requested resource was not found."
  };
  return {
    error: {
      version: "v1",
      code,
      message: messages[code],
      requestId: REQUEST_ID
    }
  };
}

async function commit(
  app: ReturnType<typeof buildApp>,
  payload: Record<string, unknown> = body()
) {
  return app.inject({
    method: "POST",
    url: `/api/v1/missions/${M1}/evidence/runtime-observations`,
    payload
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("runtime observation evidence API", () => {
  it("imports offline, deduplicates exactly and derives historical staleness without readiness authority", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network use is forbidden in this proof."));
    const { app, database } = environment({
      evidenceIds: [S1, O1, E1, S2, O2, S3, O3, E2],
      evidenceTimes: [T2, T3, T4]
    });

    const first = await commit(app);
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({
      apiVersion: "v1",
      created: true,
      runtimeObservation: {
        runtimeObservationId: O1,
        evidenceSourceId: S1,
        freshness: "LATEST_OBSERVED_WINDOW",
        authority: "HISTORICAL_EVIDENCE_ONLY",
        liveFeed: false,
        summary: {
          schemaVersion: "runtime-observation-summary.v1",
          subject: "checkout-api",
          observedUntilUtc: "2026-08-04T09:05:00.000Z"
        }
      },
      evidenceSource: {
        evidenceSourceId: S1,
        effectiveAtUtc: "2026-08-04T09:05:00.000Z",
        extractionMethod: "DIRECT_IMPORT"
      },
      timelineEvent: { timelineEventId: E1, sequence: 1 }
    });

    const replay = await commit(app);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({ ...first.json(), created: false });

    const newer = await commit(
      app,
      body({
        sourceRevision: "capture-8",
        summary: summary({
          observedFromUtc: "2026-08-04T09:05:00.000Z",
          observedUntilUtc: "2026-08-04T09:10:00.000Z",
          sampleCount: 240,
          measurements: [
            { name: "error-rate", unit: "RATIO", value: 0.01 },
            { name: "p95-latency", unit: "MILLISECONDS", value: 160 }
          ]
        })
      })
    );
    expect(newer.statusCode).toBe(201);
    expect(newer.json()).toMatchObject({
      created: true,
      runtimeObservation: {
        runtimeObservationId: O3,
        freshness: "LATEST_OBSERVED_WINDOW"
      },
      timelineEvent: { timelineEventId: E2, sequence: 2 }
    });

    const historical = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence/runtime-observations/${O1}`
    });
    expect(historical.statusCode).toBe(200);
    expect(historical.json()).toMatchObject({
      runtimeObservation: {
        runtimeObservationId: O1,
        freshness: "STALE_BY_NEWER_WINDOW",
        newerObservationId: O3,
        authority: "HISTORICAL_EVIDENCE_ONLY",
        liveFeed: false
      }
    });

    const page = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence/runtime-observations?limit=1`
    });
    expect(page.statusCode).toBe(200);
    expect(page.json()).toMatchObject({
      missionId: M1,
      runtimeObservations: [
        {
          runtimeObservationId: O1,
          freshness: "STALE_BY_NEWER_WINDOW",
          newerObservationId: O3
        }
      ],
      page: { limit: 1, nextCursor: O1 }
    });
    const secondPage = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence/runtime-observations?limit=1&cursor=${O1}`
    });
    expect(secondPage.json()).toMatchObject({
      runtimeObservations: [
        { runtimeObservationId: O3, freshness: "LATEST_OBSERVED_WINDOW" }
      ],
      page: { limit: 1, nextCursor: null }
    });

    expect(
      database.connection
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM evidence_sources) AS sources,
             (SELECT COUNT(*) FROM runtime_observations) AS observations,
             (SELECT COUNT(*) FROM timeline_events) AS events`
        )
        .get()
    ).toEqual({ sources: 2, observations: 2, events: 2 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify([first.json(), newer.json(), historical.json()])).not.toContain(
      "READY"
    );
  });

  it("rejects unsupported source, readiness-shaped schema and private locator without disclosure", async () => {
    const { app } = environment({
      evidenceIds: [S1, O1, E1, S2, O2, S3, O3, S4, O4],
      evidenceTimes: [T2, T3, T4, T5]
    });
    const cases = [
      body({ origin: "AI_ADVISORY" }),
      body({
        summary: { ...summary(), readiness: "READY", token: SECRET }
      }),
      body({ sourceLocator: PRIVATE_PATH }),
      body({ summary: summary({ schemaVersion: "runtime-observation-summary.v2" }) })
    ];
    for (const payload of cases) {
      const response = await commit(app, payload);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual(stableError("INVALID_REQUEST"));
      expect(response.body).not.toContain(SECRET);
      expect(response.body).not.toContain(PRIVATE_PATH);
      expect(response.body).not.toContain("AI_ADVISORY");
    }
  });

  it("returns stable not-found and rejects unowned methods", async () => {
    const { app } = environment();
    const missing = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence/runtime-observations/${O4}`
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual(stableError("NOT_FOUND"));

    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      const response = await app.inject({
        method,
        url: `/api/v1/missions/${M1}/evidence/runtime-observations/${O4}`,
        payload: body()
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(stableError("NOT_FOUND"));
    }
  });
});
