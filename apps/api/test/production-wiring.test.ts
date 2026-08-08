import {
  ImpactAnalysisError,
  ReassessmentError,
  ReconciliationImpactRevisionError,
  type ReconciliationImpactRevision,
  type TwinProjectionRevision
} from "@intelliloop/domain";
import { createApiErrorResponse } from "@intelliloop/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  ReconciliationRepositoryError,
  type SqliteReconciliationRepository
} from "../src/reconciliation/reconciliation-repository.js";
import {
  ReconciliationExecutionError,
  type ReconciliationExecutionService
} from "../src/reconciliation/reconciliation-service.js";
import type {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../src/twin/twin-repository.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const TWIN_ID = "00000000-0000-4000-8000-000000000021";
const CODE_MAP_ID = "00000000-0000-4000-8000-000000000031";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000041";
const DIGEST = `sha256:${"a".repeat(64)}`;
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

const apps: ReturnType<typeof buildApp>[] = [];

function projects(): SqliteProjectRepository {
  return {
    getMission: () => ({ projectId: PROJECT_ID })
  } as unknown as SqliteProjectRepository;
}

function reconciliationRevision(): ReconciliationImpactRevision {
  return {
    version: "reconciliation-impact-revision.v1",
    revisionKey: DIGEST,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    revision: 1,
    inputDigest: DIGEST,
    resultDigest: DIGEST,
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
      completeness: "COMPLETE"
    },
    reassessment: { resultDigest: DIGEST },
    impact: { resultDigest: DIGEST },
    findingCounts: {
      CONFLICT: 0,
      AMBIGUOUS: 0,
      MISSING: 0,
      STALE: 0,
      IMPACT_GAP: 0,
      total: 0
    },
    impactPathCount: 0
  } as unknown as ReconciliationImpactRevision;
}

function twinRevision(): TwinProjectionRevision {
  return {
    projectionId: TWIN_ID,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    revision: 1,
    inputDigest: DIGEST,
    projectionDigest: DIGEST,
    recordedAtUtc: "2026-08-06T00:00:00.000Z",
    codeMapBinding: {
      projectionId: CODE_MAP_ID,
      revision: 7,
      projectionDigest: DIGEST
    },
    nodes: [{}],
    relationships: [{}],
    invalidations: []
  } as unknown as TwinProjectionRevision;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("production application wiring", () => {
  it("registers reconciliation only with its complete dependency set", async () => {
    const reconciliation = {
      get: async () => reconciliationRevision()
    } as unknown as SqliteReconciliationRepository;
    const partial = buildApp({
      projectRepository: projects(),
      reconciliationRepository: reconciliation,
      requestIdFactory: () => REQUEST_ID
    });
    apps.push(partial);
    const absent = await partial.inject({
      method: "GET",
      url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1`
    });
    expect(absent.statusCode).toBe(404);

    const complete = buildApp({
      projectRepository: projects(),
      reconciliationRepository: reconciliation,
      reconciliationExecutionService: {
        execute: async () => ({
          created: false,
          revision: reconciliationRevision()
        })
      } as unknown as ReconciliationExecutionService,
      requestIdFactory: () => REQUEST_ID
    });
    apps.push(complete);
    const reachable = await complete.inject({
      method: "GET",
      url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1`
    });
    expect(reachable.statusCode, reachable.body).toBe(200);
    expect(reachable.json()).toMatchObject({
      reconciliationRevision: {
        projectId: PROJECT_ID,
        missionId: MISSION_ID,
        revision: 1,
        codeMapBinding: {
          projectionId: CODE_MAP_ID,
          evidenceKind: "STATIC_INFERENCE",
          inferenceStatus: "AVAILABLE",
          completeness: "COMPLETE"
        }
      }
    });
  });

  it("classifies reconciliation failures without leaking internal messages", async () => {
    let failure: Error = new ReconciliationRepositoryError(
      "RECONCILIATION_REVISION_NOT_FOUND"
    );
    const app = buildApp({
      projectRepository: projects(),
      reconciliationRepository: {
        get: async () => {
          throw failure;
        }
      } as unknown as SqliteReconciliationRepository,
      reconciliationExecutionService: {} as ReconciliationExecutionService,
      requestIdFactory: () => REQUEST_ID
    });
    apps.push(app);

    const cases = [
      {
        error: new ReconciliationRepositoryError(
          "RECONCILIATION_REVISION_NOT_FOUND"
        ),
        status: 404,
        code: "NOT_FOUND"
      },
      {
        error: new ReconciliationRepositoryError(
          "RECONCILIATION_PAGE_INVALID"
        ),
        status: 400,
        code: "INVALID_REQUEST"
      },
      {
        error: new ReconciliationRepositoryError(
          "RECONCILIATION_PREDECESSOR_CONFLICT"
        ),
        status: 409,
        code: "CONFLICT"
      },
      {
        error: new ReconciliationRepositoryError(
          "RECONCILIATION_STORAGE_SCHEMA_INVALID"
        ),
        status: 500,
        code: "INTEGRITY_ERROR"
      },
      {
        error: new ReconciliationRepositoryError(
          "RECONCILIATION_STORAGE_FAILED"
        ),
        status: 500,
        code: "INTERNAL_ERROR"
      }
    ] as const;
    for (const item of cases) {
      failure = item.error;
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/missions/${MISSION_ID}/reconciliation/revisions/1`
      });
      expect(response.statusCode, response.body).toBe(item.status);
      expect(response.json()).toEqual(
        createApiErrorResponse(item.code, REQUEST_ID)
      );
      expect(response.body).not.toContain(item.error.message);
    }
  });

  it("classifies execution and domain boundary failures at buildApp", async () => {
    let failure: Error = new ReconciliationExecutionError(
      "RECONCILIATION_EXECUTION_SCOPE_MISMATCH"
    );
    const app = buildApp({
      projectRepository: projects(),
      reconciliationRepository: {} as SqliteReconciliationRepository,
      reconciliationExecutionService: {
        execute: async () => {
          throw failure;
        }
      } as unknown as ReconciliationExecutionService,
      requestIdFactory: () => REQUEST_ID
    });
    apps.push(app);
    const cases = [
      {
        error: new ReconciliationExecutionError(
          "RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH"
        ),
        status: 409,
        code: "CONFLICT"
      },
      {
        error: new ReassessmentError("REASSESSMENT_REQUIREMENT_INVALID"),
        status: 400,
        code: "INVALID_REQUEST"
      },
      {
        error: new ImpactAnalysisError("IMPACT_TWIN_INVALID"),
        status: 409,
        code: "CONFLICT"
      },
      {
        error: new ReconciliationImpactRevisionError(
          "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
        ),
        status: 500,
        code: "INTEGRITY_ERROR"
      }
    ] as const;
    for (const item of cases) {
      failure = item.error;
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
      expect(response.statusCode, response.body).toBe(item.status);
      expect(response.json().error).toMatchObject({
        code: item.code,
        requestId: REQUEST_ID
      });
      expect(response.body).not.toContain(item.error.message);
    }
  });

  it("exposes the exact code-map binding in Twin summaries through buildApp", async () => {
    const twin = twinRevision();
    const app = buildApp({
      projectRepository: projects(),
      twinRepository: {
        get: async () => twin
      } as unknown as SqliteTwinRepository,
      twinMaterializer: {} as TwinMaterializationService,
      requestIdFactory: () => REQUEST_ID
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${MISSION_ID}/twin/revisions/1`
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().twinRevision.codeMapBinding).toEqual({
      projectionId: CODE_MAP_ID,
      revision: 7,
      projectionDigest: DIGEST
    });
  });
});
