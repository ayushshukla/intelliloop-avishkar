import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  type ClaimDependencies,
  type EvidenceSourceDependencies,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { createSafeLogger } from "../src/observability.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const S1 = "00000000-0000-4000-8000-000000000041";
const S2 = "00000000-0000-4000-8000-000000000042";
const S3 = "00000000-0000-4000-8000-000000000043";
const S4 = "00000000-0000-4000-8000-000000000044";
const E1 = "00000000-0000-4000-8000-000000000051";
const E2 = "00000000-0000-4000-8000-000000000052";
const E3 = "00000000-0000-4000-8000-000000000053";
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
const T7 = "2026-08-04T10:07:00.000Z";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const INCOMING_REQUEST_ID = "987e6543-e21b-42d3-a456-426614174999";
const SECRET = "IL34_SECRET_SENTINEL_123456789";
const RAW_PATH = "C:\\Users\\private\\requirements.md";

const CONTENT = [
  "Cancellation is allowed before dispatch.",
  "Cancellation is forbidden before dispatch.",
  "Cancellation requires approval before dispatch."
].join("\n");

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

function projectDependencies(
  ids: readonly string[] = [P1, M1],
  times: readonly string[] = [T0, T1]
): ProjectDomainDependencies {
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

function claimDependencies(
  ids: readonly string[],
  times: readonly string[]
): ClaimDependencies {
  const nextTime = sequence(times);
  return {
    ids: createStableIdGenerator(sequence(ids)),
    clock: createClock(() => new Date(nextTime()))
  };
}

function environment(options: {
  readonly evidenceIds?: readonly string[];
  readonly evidenceTimes?: readonly string[];
  readonly claimIds?: readonly string[];
  readonly claimTimes?: readonly string[];
  readonly logLines?: string[];
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "intelliloop-evidence-api-"));
  directories.push(directory);
  const filePath = join(directory, "intelliloop.sqlite3");
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const project = projects.createProject("Evidence API project");
  const mission = projects.createMission(
    project.projectId,
    "Cancellation evidence API"
  );
  const evidence = new SqliteEvidenceRepository(
    database.connection,
    evidenceDependencies(
      options.evidenceIds ?? [S1, E1],
      options.evidenceTimes ?? [T2]
    )
  );
  const claims = new SqliteClaimRepository(
    database.connection,
    claimDependencies(
      options.claimIds ?? [C1],
      options.claimTimes ?? [T3]
    )
  );
  const logger =
    options.logLines === undefined
      ? undefined
      : createSafeLogger({
          level: "info",
          clock: () => new Date(T7),
          write: (line) => options.logLines?.push(line)
        });
  const app = buildApp({
    projectRepository: projects,
    evidenceRepository: evidence,
    claimRepository: claims,
    requestIdFactory: () => REQUEST_ID,
    ...(logger === undefined ? {} : { logger })
  });
  apps.push(app);
  return { app, database, filePath, projects, project, mission };
}

function evidenceBody(overrides: Record<string, unknown> = {}) {
  return {
    format: "MARKDOWN",
    content: CONTENT,
    origin: "USER_INPUT",
    sourceLocator: "manual:requirements/cancellation-v2",
    sourceRevision: "requirements-v2",
    effectiveAtUtc: "2026-08-01T00:00:00.000Z",
    epistemicLabel: "FACT",
    ...overrides
  };
}

function claimBody(overrides: Record<string, unknown> = {}) {
  return {
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
    epistemicLabel: "FACT",
    ...overrides
  };
}

function stableError(code: string, requestId = REQUEST_ID) {
  const messages: Record<string, string> = {
    INVALID_REQUEST: "The request could not be accepted.",
    NOT_FOUND: "The requested resource was not found.",
    CONFLICT: "The request conflicts with current resource state.",
    INTERNAL_ERROR: "The service could not complete the request."
  };
  return {
    error: {
      version: "v1",
      code,
      message: messages[code],
      requestId
    }
  };
}

async function commitEvidence(
  app: ReturnType<typeof buildApp>,
  body = evidenceBody()
) {
  return app.inject({
    method: "POST",
    url: `/api/v1/missions/${M1}/evidence-sources`,
    payload: body
  });
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("evidence and claim JSON API", () => {
  it("previews deterministic redaction without persistence or secret/log leakage", async () => {
    const lines: string[] = [];
    const { app, database } = environment({ logLines: lines });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/evidence/preview`,
      headers: { "x-request-id": INCOMING_REQUEST_ID },
      payload: {
        format: "TEXT",
        content: `Requirement\npassword=${SECRET}\n`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe(INCOMING_REQUEST_ID);
    expect(response.json()).toMatchObject({
      apiVersion: "v1",
      preview: {
        normalizationVersion: "evidence-normalization.v1",
        format: "TEXT",
        redaction: { applied: true, totalReplacements: 1 }
      }
    });
    expect(response.body).toContain("[REDACTED:GENERIC_SECRET_ASSIGNMENT]");
    expect(response.body).not.toContain(SECRET);
    expect(lines.join("\n")).not.toContain(SECRET);
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM evidence_sources")
        .get()
    ).toEqual({ count: 0 });
  });

  it("commits idempotently and retrieves only redacted attributed source/timeline data", async () => {
    const lines: string[] = [];
    const { app, database, filePath } = environment({
      evidenceIds: [S1, E1, S2],
      evidenceTimes: [T2, T3],
      logLines: lines
    });
    const body = evidenceBody({
      content: `${CONTENT}\npassword=${SECRET}\n`
    });

    const created = await commitEvidence(app, body);
    const duplicate = await commitEvidence(app, body);

    expect(created.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(200);
    expect(created.headers["x-request-id"]).toBe(REQUEST_ID);
    expect(created.json()).toMatchObject({
      apiVersion: "v1",
      created: true,
      evidenceSource: {
        evidenceSourceId: S1,
        projectId: P1,
        missionId: M1,
        origin: "USER_INPUT",
        sourceLocator: "manual:requirements/cancellation-v2",
        sourceRevision: "requirements-v2",
        extractionMethod: "DIRECT_IMPORT",
        epistemicLabel: "FACT"
      },
      timelineEvent: {
        timelineEventId: E1,
        missionId: M1,
        sequence: 1,
        eventType: "EVIDENCE_IMPORTED",
        evidenceSourceId: S1
      }
    });
    expect(duplicate.json()).toEqual({ ...created.json(), created: false });
    expect(created.body).toContain("[REDACTED:GENERIC_SECRET_ASSIGNMENT]");
    expect(created.body).not.toContain(SECRET);

    const exact = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence-sources/${S1}`
    });
    expect(exact.statusCode).toBe(200);
    expect(exact.json().evidenceSource).toEqual(
      created.json().evidenceSource
    );
    const sources = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence-sources`
    });
    expect(sources.json()).toMatchObject({
      missionId: M1,
      evidenceSources: [{ evidenceSourceId: S1 }],
      page: { limit: 20, nextCursor: null }
    });
    const timeline = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/timeline-events`
    });
    expect(timeline.json()).toMatchObject({
      missionId: M1,
      timelineEvents: [{ timelineEventId: E1, sequence: 1 }],
      page: { limit: 20, nextCursor: null }
    });
    expect(lines.join("\n")).not.toContain(SECRET);

    await app.close();
    apps.splice(apps.indexOf(app), 1);
    database.close();
    databases.splice(databases.indexOf(database), 1);
    expect(readFileSync(filePath).includes(Buffer.from(SECRET, "utf8"))).toBe(
      false
    );
  });

  it("creates, retrieves and explicitly supersedes claims without implicit truth selection", async () => {
    const { app } = environment({
      evidenceIds: [S1, E1],
      evidenceTimes: [T2],
      claimIds: [C1, C2, L1, C3, C4],
      claimTimes: [T3, T4, T5]
    });
    await commitEvidence(app);

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/evidence-sources/${S1}/claims`,
      payload: claimBody({
        value: {
          mode: "dispatch",
          policy: { allowed: true },
          channels: ["web"]
        }
      })
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({
      apiVersion: "v1",
      created: true,
      claim: {
        claimId: C1,
        evidenceSourceId: S1,
        rawText: "Cancellation is allowed before dispatch.",
        subject: "order.cancellation",
        predicate: "allowed.before",
        value: {
          mode: "dispatch",
          policy: { allowed: true },
          channels: ["web"]
        },
        epistemicLabel: "FACT",
        applicability: {
          dimensions: [
            { dimension: "channel", value: "web" },
            { dimension: "region", value: "india" }
          ]
        }
      }
    });
    expect(first.json()).not.toHaveProperty("supersession");

    const successorPayload = {
      evidenceSourceId: S1,
      ...claimBody({
        rawText: "Cancellation is forbidden before dispatch.",
        value: false,
        epistemicLabel: "INFERENCE"
      })
    };
    const successor = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/claims/${C1}/successors`,
      payload: successorPayload
    });
    const duplicate = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/claims/${C1}/successors`,
      payload: successorPayload
    });

    expect(successor.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(200);
    expect(successor.json()).toMatchObject({
      created: true,
      claim: {
        claimId: C2,
        value: false,
        epistemicLabel: "INFERENCE",
        supersedesClaimId: C1
      },
      supersession: {
        claimSupersessionId: L1,
        relationshipType: "SUPERSEDES",
        predecessorClaimId: C1,
        successorClaimId: C2
      }
    });
    expect(duplicate.json()).toEqual({ ...successor.json(), created: false });

    const exact = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/claims/${C1}`
    });
    expect(exact.json().claim).toEqual(first.json().claim);
    const listed = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/claims`
    });
    expect(listed.json().claims.map((claim: { claimId: string }) => claim.claimId))
      .toEqual([C1, C2]);
    const links = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/claim-supersessions`
    });
    expect(links.json()).toMatchObject({
      supersessions: [
        { predecessorClaimId: C1, successorClaimId: C2 }
      ],
      page: { limit: 20, nextCursor: null }
    });
  });

  it("returns stable request-scoped errors without echoing secrets or raw paths", async () => {
    const lines: string[] = [];
    const { app } = environment({
      evidenceIds: [S1, E1],
      evidenceTimes: [T2],
      claimIds: [C1, C2],
      claimTimes: [T3, T4],
      logLines: lines
    });
    await commitEvidence(app);
    await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/evidence-sources/${S1}/claims`,
      payload: claimBody()
    });

    const invalidSchema = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/evidence/preview`,
      headers: { "x-request-id": INCOMING_REQUEST_ID },
      payload: { format: "TEXT", content: SECRET, unexpected: RAW_PATH }
    });
    expect(invalidSchema.statusCode).toBe(400);
    expect(invalidSchema.json()).toEqual(
      stableError("INVALID_REQUEST", INCOMING_REQUEST_ID)
    );

    const invalidLocator = await commitEvidence(
      app,
      evidenceBody({
        content: `Requirement ${SECRET}`,
        sourceLocator: RAW_PATH
      })
    );
    expect(invalidLocator.statusCode).toBe(400);
    expect(invalidLocator.json()).toEqual(stableError("INVALID_REQUEST"));

    const missingSource = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/evidence-sources/${S4}/claims`,
      payload: claimBody()
    });
    expect(missingSource.statusCode).toBe(404);
    expect(missingSource.json()).toEqual(stableError("NOT_FOUND"));

    const mismatch = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/claims/${C1}/successors`,
      payload: {
        evidenceSourceId: S1,
        ...claimBody({
          subject: "Refund",
          rawText: "Cancellation is forbidden before dispatch.",
          value: false
        })
      }
    });
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json()).toEqual(stableError("CONFLICT"));

    for (const response of [invalidSchema, invalidLocator, missingSource, mismatch]) {
      expect(response.body).not.toContain(SECRET);
      expect(response.body).not.toContain(RAW_PATH);
    }
    expect(lines.join("\n")).not.toContain(SECRET);
    expect(lines.join("\n")).not.toContain(RAW_PATH);
  });

  it("enforces bounded identity and timeline pagination across API collections", async () => {
    const { app } = environment({
      evidenceIds: [S3, E3, S1, E1, S2, E2],
      evidenceTimes: [T2, T3, T4],
      claimIds: [C3, C1, L1, C2, L2],
      claimTimes: [T5, T6, T7]
    });
    for (const [index, sourceLocator] of [
      "manual:source/three",
      "manual:source/one",
      "manual:source/two"
    ].entries()) {
      const committed = await commitEvidence(
        app,
        evidenceBody({
          content: `${CONTENT}\nSource ${index}`,
          sourceLocator,
          sourceRevision: `r${index}`
        })
      );
      expect(committed.statusCode).toBe(201);
    }

    const firstClaim = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/evidence-sources/${S3}/claims`,
      payload: claimBody()
    });
    expect(firstClaim.statusCode).toBe(201);
    const secondClaim = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/claims/${C3}/successors`,
      payload: {
        evidenceSourceId: S1,
        ...claimBody({
          rawText: "Cancellation is forbidden before dispatch.",
          value: false
        })
      }
    });
    expect(secondClaim.statusCode).toBe(201);
    const thirdClaim = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/claims/${C1}/successors`,
      payload: {
        evidenceSourceId: S2,
        ...claimBody({
          rawText: "Cancellation requires approval before dispatch.",
          value: "approval"
        })
      }
    });
    expect(thirdClaim.statusCode).toBe(201);

    const firstSources = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence-sources?limit=2`
    });
    expect(firstSources.json()).toMatchObject({
      evidenceSources: [{ evidenceSourceId: S1 }, { evidenceSourceId: S2 }],
      page: { limit: 2, nextCursor: S2 }
    });
    const lastSources = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/evidence-sources?limit=2&cursor=${S2}`
    });
    expect(lastSources.json()).toMatchObject({
      evidenceSources: [{ evidenceSourceId: S3 }],
      page: { limit: 2, nextCursor: null }
    });

    const timeline = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/timeline-events?limit=2`
    });
    expect(timeline.json()).toMatchObject({
      timelineEvents: [{ sequence: 1 }, { sequence: 2 }],
      page: { limit: 2, nextCursor: 2 }
    });
    const lastTimeline = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/timeline-events?limit=2&cursor=2`
    });
    expect(lastTimeline.json()).toMatchObject({
      timelineEvents: [{ sequence: 3 }],
      page: { limit: 2, nextCursor: null }
    });

    const claims = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/claims?limit=2`
    });
    expect(claims.json()).toMatchObject({
      claims: [{ claimId: C1 }, { claimId: C2 }],
      page: { limit: 2, nextCursor: C2 }
    });
    const links = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/claim-supersessions?limit=1`
    });
    expect(links.json()).toMatchObject({
      supersessions: [{ claimSupersessionId: L1 }],
      page: { limit: 1, nextCursor: L1 }
    });

    for (const url of [
      `/api/v1/missions/${M1}/evidence-sources?limit=0`,
      `/api/v1/missions/${M1}/timeline-events?limit=101`,
      `/api/v1/missions/${M1}/claims?extra=true`,
      `/api/v1/missions/${M1}/claim-supersessions?cursor=not-a-uuid`
    ]) {
      const invalid = await app.inject({ method: "GET", url });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual(stableError("INVALID_REQUEST"));
    }
  });

  it("keeps unowned methods and mutation-shaped payloads outside the API", async () => {
    const { app } = environment();
    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      const response = await app.inject({
        method,
        url: `/api/v1/missions/${M1}/evidence-sources/${S1}`
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(stableError("NOT_FOUND"));
    }
    const callerPrepared = await commitEvidence(
      app,
      evidenceBody({ prepared: { normalizedContent: "forged" } })
    );
    expect(callerPrepared.statusCode).toBe(400);
    expect(callerPrepared.json()).toEqual(stableError("INVALID_REQUEST"));
  });
});
