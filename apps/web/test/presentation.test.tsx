import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  OptionalMetadata,
  PRODUCT_TERMS,
  ProvenanceBadge,
  ReleaseCheckBadge,
  WorkflowStatusBadge,
  presentProvenance,
  presentReleaseCheck,
  presentWorkflowStatus
} from "../src/presentation";

describe("central presentation terminology", () => {
  it("defines every approved primary label in one mapping", () => {
    expect(PRODUCT_TERMS).toEqual({
      project: "Project",
      changeMission: "Work Item",
      missionId: "Work Item Key",
      missionType: "Work Item Type",
      evidence: "Linked Evidence",
      activeSoftwareTwin: "Impact Map",
      reconciliation: "Resolve Conflicts",
      findings: "Risks & Checks",
      readiness: "Release Check",
      releasePassport: "Release Evidence Report",
      repositorySnapshot: "Analyzed Commit",
      canonicalClaim: "Accepted Decision",
      unsupportedClaim: "Missing Evidence"
    });
  });

  it.each([
    [undefined, "Not Checked", "neutral"],
    ["BLOCKED", "Not Ready", "danger"],
    ["READY", "Ready", "success"],
    ["STALE", "Recheck Needed", "warning"]
  ] as const)("presents Release Check %s without changing the raw value", (raw, label, tone) => {
    expect(presentReleaseCheck(raw)).toMatchObject({ raw, label, tone });
  });

  it("fails safely for an unknown future Release Check value", () => {
    const raw = "FUTURE_STATE";
    expect(presentReleaseCheck(raw)).toMatchObject({
      raw,
      label: "Status unavailable",
      tone: "unknown"
    });
  });

  it("keeps workflow status and Release Check independent", () => {
    expect(presentWorkflowStatus("IN_REVIEW").label).toBe("In Review");
    expect(presentReleaseCheck("BLOCKED").label).toBe("Not Ready");
    expect(presentWorkflowStatus("BLOCKED").label).toBe("Not available");
    expect(presentReleaseCheck("DONE").label).toBe("Status unavailable");

    const html = renderToStaticMarkup(
      <><WorkflowStatusBadge status="IN_REVIEW" /><ReleaseCheckBadge status="BLOCKED" /></>
    );
    expect(html).toContain("Workflow Status: In Review.");
    expect(html).toContain("Release Check: Not Ready.");
    expect(html).toContain('data-workflow-status="IN_REVIEW"');
    expect(html).toContain('data-release-check="BLOCKED"');
  });

  it("renders honest absent workflow and optional metadata states", () => {
    const html = renderToStaticMarkup(
      <><WorkflowStatusBadge /><OptionalMetadata value={undefined} /><OptionalMetadata value={null} fallback="Not available" /></>
    );
    expect(html).toContain("Workflow Status: Not tracked.");
    expect(html).toContain("Not specified");
    expect(html).toContain("Not available");
  });
});

describe("provenance presentation", () => {
  it.each([
    ["SYSTEM_DERIVATION", "IntelliLoop Native"],
    ["SYNTHETIC_FIXTURE", "Built-in Baseline"],
    ["USER_INPUT", "External Evidence"],
    ["REPOSITORY_OBSERVATION", "External Evidence"],
    ["VALIDATION_RESULT", "External Evidence"],
    ["AI_ADVISORY", "External Evidence"]
  ] as const)("maps known origin %s and preserves provenance", (raw, label) => {
    expect(presentProvenance(raw)).toMatchObject({ raw, label });
  });

  it("makes no provenance claim for an unknown origin", () => {
    const raw = "FUTURE_ORIGIN";
    expect(presentProvenance(raw)).toMatchObject({
      raw,
      label: "Provenance unavailable",
      tone: "unknown"
    });
    const html = renderToStaticMarkup(<ProvenanceBadge origin={raw} />);
    expect(html).toContain("Provenance is unavailable because the origin is not recognized.");
    expect(html).toContain('data-provenance-origin="FUTURE_ORIGIN"');
  });
});
