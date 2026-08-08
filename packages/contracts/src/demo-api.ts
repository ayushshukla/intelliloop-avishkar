export const DEMO_API_VERSION = "v1" as const;
export const RETAIL_DEMO_FIXTURE_ID = "loopmart-expanded-cancellation-v1" as const;
export const RETAIL_DEMO_FIXTURE_VERSION =
  "intelliloop-retail-cancellation-fixture.v1" as const;
export const RETAIL_DEMO_OWNERSHIP =
  "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY" as const;

export interface DemoWorkspaceResource {
  readonly apiVersion: typeof DEMO_API_VERSION;
  readonly fixtureId: typeof RETAIL_DEMO_FIXTURE_ID;
  readonly fixtureVersion: typeof RETAIL_DEMO_FIXTURE_VERSION;
  readonly ownership: typeof RETAIL_DEMO_OWNERSHIP;
  readonly status: "EMPTY" | "READY";
  readonly synthetic: true;
  readonly repositoryExecution: false;
  readonly projectId?: string;
  readonly missionId?: string;
  readonly initialSnapshotId?: string;
  readonly codeMapRevision?: number;
  readonly twinRevision?: number;
  readonly reconciliationRevision?: number;
  readonly readinessRevision?: number;
  readonly workflowStage?: "INITIAL_BLOCKED" | "CORRECTED_READY" | "READY_STALE";
  readonly readinessStatus?: "BLOCKED" | "READY" | "STALE";
  readonly correctedSnapshotId?: string;
  readonly correctedCodeMapRevision?: number;
  readonly correctedTwinRevision?: number;
  readonly correctedReconciliationRevision?: number;
  readonly readyAssessmentRevision?: number;
  readonly passportAssessmentRevision?: number;
  readonly staleSnapshotId?: string;
}

export interface DemoSetupResponse extends DemoWorkspaceResource {
  readonly created: boolean;
}

export interface DemoResetResponse extends DemoWorkspaceResource {
  readonly reset: boolean;
}

export interface DemoTransitionResponse extends DemoWorkspaceResource {
  readonly changed: boolean;
}
