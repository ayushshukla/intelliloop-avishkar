import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { DemoWorkspaceResource } from "@intelliloop/contracts";

import {
  GuidedDemoJourneyView,
  type DemoJourneyContext
} from "../src/GuidedDemoJourney";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MISSION_ID = "00000000-0000-4000-8000-000000000011";
const INITIAL_SNAPSHOT_ID = "00000000-0000-4000-8000-000000000021";
const CORRECTED_SNAPSHOT_ID = "00000000-0000-4000-8000-000000000022";
const STALE_SNAPSHOT_ID = "00000000-0000-4000-8000-000000000023";

const BLOCKED: DemoWorkspaceResource = {
  apiVersion: "v1",
  fixtureId: "loopmart-expanded-cancellation-v1",
  fixtureVersion: "intelliloop-retail-cancellation-fixture.v1",
  ownership: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY",
  status: "READY",
  synthetic: true,
  repositoryExecution: false,
  projectId: PROJECT_ID,
  missionId: MISSION_ID,
  initialSnapshotId: INITIAL_SNAPSHOT_ID,
  codeMapRevision: 1,
  twinRevision: 1,
  reconciliationRevision: 1,
  readinessRevision: 1,
  workflowStage: "INITIAL_BLOCKED",
  readinessStatus: "BLOCKED"
};

const READY: DemoWorkspaceResource = {
  ...BLOCKED,
  correctedSnapshotId: CORRECTED_SNAPSHOT_ID,
  correctedCodeMapRevision: 2,
  correctedTwinRevision: 2,
  correctedReconciliationRevision: 2,
  readyAssessmentRevision: 2,
  passportAssessmentRevision: 2,
  workflowStage: "CORRECTED_READY",
  readinessStatus: "READY"
};

const STALE: DemoWorkspaceResource = {
  ...READY,
  staleSnapshotId: STALE_SNAPSHOT_ID,
  workflowStage: "READY_STALE",
  readinessStatus: "STALE"
};

const CONTEXT: DemoJourneyContext = {
  projectName: "LoopMart controlled demo",
  workItemTitle: "Expand cancellation window",
  repositoryLabel: "loopmart-expanded-cancellation-v1 · LOCAL_GIT",
  branchOrRef: "main",
  currentCommit: "b".repeat(40),
  assessedCommit: "a".repeat(40),
  capturedAtUtc: "2026-08-07T00:00:00.000Z"
};

function render(
  workspace: DemoWorkspaceResource,
  currentPath = "/demo"
): string {
  return renderToStaticMarkup(
    <GuidedDemoJourneyView
      workspace={workspace}
      contextState={{ kind: "ready", context: CONTEXT }}
      currentPath={currentPath}
      onNavigate={() => undefined}
    />
  );
}

describe("guided LoopMart journey", () => {
  it("shows all six navigable steps while keeping workflow and Release Check separate", () => {
    const html = render(BLOCKED);

    for (const label of [
      "Work Item",
      "Linked Evidence",
      "Impact Map",
      "Resolve Conflicts",
      "Release Check",
      "Release Evidence Report"
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Workflow Status");
    expect(html).toContain("Not tracked");
    expect(html).toContain("Release Check");
    expect(html).toContain("Not Ready");
    expect(html).toContain('data-journey-state="ATTENTION"');
    expect(html).toContain("Resolve the cited conflict and request a new deterministic assessment.");
    expect(html).toContain("Prerequisite required");
  });

  it("links Ready to the stored-assessment-backed report without rewriting the earlier steps", () => {
    const html = render(READY, `/missions/${MISSION_ID}/passport`);

    expect(html).toContain("Inspect stored Evidence Report");
    expect(html).toContain(`href="/missions/${MISSION_ID}/passport#release-evidence-report"`);
    expect(html).toContain('data-journey-state="COMPLETE"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Ready");
  });

  it("presents the current and assessed commits with Recheck Needed as attention", () => {
    const html = render(STALE, `/missions/${MISSION_ID}/passport`);

    expect(html).toContain("Current commit");
    expect(html).toContain("Assessed commit");
    expect(html).toContain("b".repeat(40));
    expect(html).toContain("a".repeat(40));
    expect(html).toContain("Recheck Needed");
    expect(html).toContain("CURRENT · ATTENTION");
    expect(html).toContain("The current repository state changed; analyze and run the Release Check again.");
  });

  it("keeps an API context failure explicit and retryable without guessed values", () => {
    const retry = vi.fn();
    const html = renderToStaticMarkup(
      <GuidedDemoJourneyView
        workspace={BLOCKED}
        contextState={{ kind: "error", message: "The local API is unavailable." }}
        currentPath="/demo"
        onNavigate={() => undefined}
        onRetryContext={retry}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Guided context unavailable.");
    expect(html).toContain("No identifier or Release Check is guessed.");
    expect(html).toContain("Retry guided context");
    expect(html).not.toContain("LoopMart controlled demo");
  });
});
