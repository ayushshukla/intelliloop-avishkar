import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAXIMUM_IMPACT_ROOTS,
  type ReconciliationImpactRevision
} from "@intelliloop/domain";

import { registerReconciliationRoutes } from "../src/reconciliation/reconciliation-routes.js";
import type { SqliteReconciliationRepository } from "../src/reconciliation/reconciliation-repository.js";
import type { ReconciliationExecutionService } from "../src/reconciliation/reconciliation-service.js";
import type { SqliteProjectRepository } from "../src/projects/project-repository.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const TWIN_ID = "00000000-0000-4000-8000-000000000021";
const CODE_MAP_ID = "00000000-0000-4000-8000-000000000031";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000041";
const DIGEST = `sha256:${"a".repeat(64)}`;

function revision(): ReconciliationImpactRevision {
  return {
    version: "reconciliation-impact-revision.v1",
    digestVersion: "reconciliation-impact-revision-digest.v1",
    revisionKey: DIGEST,
    revision: 1,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    twinBinding: {
      projectionId: TWIN_ID,
      revision: 1,
      projectionDigest: DIGEST
    },
    targetSnapshotId: SNAPSHOT_ID,
    codeMapBinding: {
      projectionId: CODE_MAP_ID,
      revision: 1,
      projectionDigest: DIGEST,
      evidenceKind: "STATIC_INFERENCE",
      inferenceStatus: "AVAILABLE",
      completeness: "PARTIAL"
    },
    reassessment: { resultDigest: DIGEST },
    impact: { resultDigest: DIGEST },
    inputDigest: DIGEST,
    findingCounts: {
      CONFLICT: 0,
      AMBIGUOUS: 0,
      MISSING: 0,
      STALE: 0,
      IMPACT_GAP: 0,
      total: 0
    },
    impactPathCount: 0,
    resultDigest: DIGEST
  } as unknown as ReconciliationImpactRevision;
}

describe("reconciliation route request authority", () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map(async (app) => app.close()));
  });

  async function appFor(
    execute: ReturnType<typeof vi.fn>,
    overrides: {
      readonly projects?: SqliteProjectRepository;
      readonly reconciliations?: SqliteReconciliationRepository;
    } = {}
  ) {
    const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
    apps.push(app);
    app.setErrorHandler((error, request, reply) => {
      void request;
      const statusCode = (error as { readonly statusCode?: number }).statusCode ?? 500;
      reply.code(statusCode).send({
        error: {
          version: "v1",
          code: "INVALID_REQUEST",
          message: error instanceof Error ? error.message : "Request is invalid.",
          requestId: "route-test"
        }
      });
    });
    const projects =
      overrides.projects ??
      ({ getMission: () => ({ projectId: PROJECT_ID }) } as unknown as SqliteProjectRepository);
    const reconciliations =
      overrides.reconciliations ?? ({} as SqliteReconciliationRepository);
    const executor = { execute } as unknown as ReconciliationExecutionService;
    registerReconciliationRoutes(
      app,
      projects,
      reconciliations,
      executor
    );
    await app.ready();
    return app;
  }

  it("accepts explicit empty impact declarations and preserves code-map trust metadata", async () => {
    const execute = vi.fn(async (..._arguments: unknown[]) => ({
      created: true,
      revision: revision()
    }));
    const app = await appFor(execute);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions`,
      payload: {
        twinRevision: 1,
        codeMapRevision: 1,
        targetSnapshotId: SNAPSHOT_ID,
        supportRequirements: [],
        roots: [],
        impactRequirements: []
      }
    });

    expect(response.statusCode, response.body).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[2]).toMatchObject({
      supportRequirements: [],
      roots: [],
      impactRequirements: []
    });
    expect(response.json().reconciliationRevision.codeMapBinding).toEqual({
      projectionId: CODE_MAP_ID,
      revision: 1,
      projectionDigest: DIGEST,
      evidenceKind: "STATIC_INFERENCE",
      inferenceStatus: "AVAILABLE",
      completeness: "PARTIAL"
    });
    expect(execute.mock.calls[0]?.slice(0, 2)).toEqual([PROJECT_ID, MISSION_ID]);
  });

  it("returns 200 when deterministic persistence reuses an existing revision", async () => {
    const execute = vi.fn(async (..._arguments: unknown[]) => ({
      created: false,
      revision: revision()
    }));
    const app = await appFor(execute);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions`,
      payload: {
        twinRevision: 1,
        codeMapRevision: 1,
        targetSnapshotId: SNAPSHOT_ID,
        supportRequirements: [],
        roots: [],
        impactRequirements: []
      }
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      apiVersion: "v1",
      created: false,
      reconciliationRevision: { revision: 1, resultDigest: DIGEST }
    });
  });

  it("rejects caller-authored links, findings and paths before execution", async () => {
    const execute = vi.fn();
    const app = await appFor(execute);
    for (const forbidden of [
      { semanticRelationships: [] },
      { findings: [] },
      { impactPaths: [] }
    ]) {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions`,
        payload: {
          twinRevision: 1,
          codeMapRevision: 1,
          targetSnapshotId: SNAPSHOT_ID,
          supportRequirements: [],
          roots: [],
          impactRequirements: [],
          ...forbidden
        }
      });
      expect(response.statusCode, response.body).toBe(400);
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("enforces the exact validation-impact requirement shape", async () => {
    const execute = vi.fn();
    const app = await appFor(execute);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions`,
      payload: {
        twinRevision: 1,
        codeMapRevision: 1,
        targetSnapshotId: SNAPSHOT_ID,
        supportRequirements: [],
        roots: [{ rootId: "changed-rule", nodeId: TWIN_ID }],
        impactRequirements: [
          {
            requirementId: "validation-gap",
            rootId: "changed-rule",
            criticalAssetId: CODE_MAP_ID,
            supportKind: "VALIDATION",
            basisCitations: [
              { kind: "NODE", memberId: TWIN_ID, revision: 1, digest: DIGEST }
            ]
          }
        ]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("serves exact, revision-list, finding and impact-path reads in resolved mission scope", async () => {
    const get = vi.fn(async () => revision());
    const list = vi.fn(async () => ({
      items: [revision()],
      nextCursor: null
    }));
    const listFindings = vi.fn(async () => ({
      revision: revision(),
      items: [],
      nextCursor: null
    }));
    const listImpactPaths = vi.fn(async () => ({
      revision: revision(),
      items: [],
      nextCursor: null
    }));
    const reconciliations = {
      get,
      list,
      listFindings,
      listImpactPaths
    } as unknown as SqliteReconciliationRepository;
    const app = await appFor(vi.fn(), { reconciliations });

    const [exact, revisions, findings, paths] = await Promise.all([
      app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1`
      }),
      app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions?limit=7`
      }),
      app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1/findings?limit=8`
      }),
      app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1/impact-paths?limit=9`
      })
    ]);

    expect(exact.statusCode, exact.body).toBe(200);
    expect(revisions.statusCode, revisions.body).toBe(200);
    expect(findings.statusCode, findings.body).toBe(200);
    expect(paths.statusCode, paths.body).toBe(200);
    expect(exact.json().reconciliationRevision).toMatchObject({
      revision: 1,
      projectId: PROJECT_ID,
      missionId: MISSION_ID
    });
    expect(revisions.json()).toMatchObject({
      missionId: MISSION_ID,
      revisions: [{ revision: 1 }],
      page: { limit: 7, nextCursor: null }
    });
    expect(findings.json()).toMatchObject({
      reconciliationRevision: 1,
      findings: [],
      page: { limit: 8, nextCursor: null }
    });
    expect(paths.json()).toMatchObject({
      reconciliationRevision: 1,
      impactPaths: [],
      page: { limit: 9, nextCursor: null }
    });
    expect(get).toHaveBeenCalledWith(PROJECT_ID, MISSION_ID, 1);
    expect(list).toHaveBeenCalledWith(PROJECT_ID, MISSION_ID, 7, undefined);
    expect(listFindings).toHaveBeenCalledWith(
      PROJECT_ID,
      MISSION_ID,
      1,
      8,
      undefined
    );
    expect(listImpactPaths).toHaveBeenCalledWith(
      PROJECT_ID,
      MISSION_ID,
      1,
      9,
      undefined
    );
  });

  it("rejects over-limit declarations and malformed member cursors before execution or reads", async () => {
    const execute = vi.fn();
    const listFindings = vi.fn();
    const reconciliations = {
      listFindings
    } as unknown as SqliteReconciliationRepository;
    const app = await appFor(execute, { reconciliations });
    const tooManyRoots = Array.from(
      { length: MAXIMUM_IMPACT_ROOTS + 1 },
      (_, index) => ({ rootId: `root-${index}`, nodeId: TWIN_ID })
    );

    const [overLimit, badCursor, unknownQuery] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions`,
        payload: {
          twinRevision: 1,
          codeMapRevision: 1,
          targetSnapshotId: SNAPSHOT_ID,
          supportRequirements: [],
          roots: tooManyRoots,
          impactRequirements: []
        }
      }),
      app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1/findings?cursor=not-a-digest`
      }),
      app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1/findings?unknown=true`
      })
    ]);

    expect(overLimit.statusCode, overLimit.body).toBe(400);
    expect(badCursor.statusCode, badCursor.body).toBe(400);
    expect(unknownQuery.statusCode, unknownQuery.body).toBe(400);
    expect(execute).not.toHaveBeenCalled();
    expect(listFindings).not.toHaveBeenCalled();
  });

  it("preserves a mission lookup status error before any reconciliation operation", async () => {
    const notFound = Object.assign(new Error("Mission not found."), {
      statusCode: 404
    });
    const projects = {
      getMission: vi.fn(() => {
        throw notFound;
      })
    } as unknown as SqliteProjectRepository;
    const execute = vi.fn();
    const app = await appFor(execute, { projects });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions`,
      payload: {
        twinRevision: 1,
        codeMapRevision: 1,
        targetSnapshotId: SNAPSHOT_ID,
        supportRequirements: [],
        roots: [],
        impactRequirements: []
      }
    });

    expect(response.statusCode, response.body).toBe(404);
    expect(response.json().error.message).toBe("Mission not found.");
    expect(execute).not.toHaveBeenCalled();
  });
});
