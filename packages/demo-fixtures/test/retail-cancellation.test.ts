import { describe, expect, it } from "vitest";

import { INTELLILOOP_RETAIL_CANCELLATION_FIXTURE as fixture } from "../src/retail-cancellation.js";

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function correctedFiles(): ReadonlyMap<string, string> {
  const files = new Map(fixture.repository.initialRevision.files.map((file) => [file.path, file.content]));
  for (const change of fixture.repository.correctionRevision.changes) files.set(change.path, change.content);
  return files;
}

describe("controlled retail cancellation fixture", () => {
  it("is explicitly synthetic, source-independent, offline and loader-inert", () => {
    expect(fixture).toMatchObject({
      ownership: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY",
      synthetic: true,
      containsPersonalData: false,
      containsEmployerOrClientData: false,
      requiresNetwork: false,
      executesRepositoryCode: false,
      loaderBoundary: {
        materializationImplemented: false,
        resetImplemented: false,
        owningStory: "IL-8.2"
      }
    });
    expect(fixture.provenance).toMatchObject({
      sourceStrategy: "SOURCE_INDEPENDENT_BUILD",
      externalSourceTransfer: "NONE"
    });
  });

  it("defines unique bounded repository revisions and a complete corrected tree", () => {
    const initialPaths = fixture.repository.initialRevision.files.map((file) => file.path);
    const changedPaths = fixture.repository.correctionRevision.changes.map((file) => file.path);
    expect(unique(initialPaths)).toBe(true);
    expect(unique(changedPaths)).toBe(true);
    expect(initialPaths).toHaveLength(9);
    expect(changedPaths).toHaveLength(5);
    expect(correctedFiles().size).toBe(10);
    expect([...correctedFiles().keys()].every((path) =>
      !path.startsWith("/") && !/^[A-Za-z]:[\\/]/u.test(path) && !path.includes("..")
    )).toBe(true);
  });

  it("binds every claim excerpt to its evidence and every correction to a matching predecessor", () => {
    const evidence = new Map(fixture.evidence.map((entry) => [entry.evidenceKey, entry]));
    const claims = new Map(fixture.claims.map((entry) => [entry.claimKey, entry]));
    expect(unique([...evidence.keys()])).toBe(true);
    expect(unique([...claims.keys()])).toBe(true);
    for (const claim of fixture.claims) {
      expect(evidence.get(claim.evidenceKey)?.content).toContain(claim.rawText);
      if (claim.supersedesClaimKey !== undefined) {
        const predecessor = claims.get(claim.supersedesClaimKey);
        expect(predecessor).toBeDefined();
        expect(claim.subject).toBe(predecessor?.subject);
        expect(claim.predicate).toBe(predecessor?.predicate);
        expect(claim.applicability).toEqual(predecessor?.applicability);
      }
    }
  });

  it("makes initial validation partial and correction inputs complete without claiming execution", () => {
    const validations = new Map(fixture.validations.map((entry) => [entry.validationKey, entry]));
    const initialMissing = fixture.supportRequirements.filter((entry) => entry.expectedInitially === "MISSING");
    expect(initialMissing.map((entry) => entry.requirementId)).toEqual([
      "support:decision/cancellation-v2",
      "validation:inventory/post-picking-release",
      "validation:fulfilment/post-picking-stop"
    ]);
    expect(fixture.supportRequirements.every((entry) => entry.expectedAfterCorrection === "PRESENT")).toBe(true);
    expect(fixture.validations.every((entry) => entry.executed === false)).toBe(true);
    for (const requirement of fixture.supportRequirements) {
      if (requirement.validationKey !== undefined && requirement.expectedAfterCorrection === "PRESENT") {
        expect(validations.has(requirement.validationKey)).toBe(true);
      }
    }
  });

  it("covers the frozen impact aliases and never precomputes product state", () => {
    const corrected = correctedFiles();
    expect(Object.values(fixture.impact.assetAliases).every((path) => corrected.has(path))).toBe(true);
    expect(fixture.impact.requirements.map((entry) => entry.criticalAssetAlias)).toEqual([
      "ORDER_CANCELLATION_SERVICE",
      "INVENTORY_RESERVATION_CONSUMER",
      "REFUND_HANDLER",
      "FULFILMENT_COORDINATOR",
      "CUSTOMER_NOTIFIER"
    ]);
    expect(fixture.scenario.expectedStateSequence).toEqual(["BLOCKED", "READY", "STALE"]);
    expect(fixture.scenario.authority).toBe("EXPECTED_DEMO_SEQUENCE_NOT_PRECOMPUTED_PRODUCT_STATE");
  });

  it("contains no private paths, credential shapes or company data", () => {
    const serialized = JSON.stringify(fixture);
    expect(serialized).not.toMatch(/[A-Za-z]:[\\/]Users[\\/]|\/(?:Users|home)\//u);
    expect(serialized).not.toMatch(/\b(?:password|secret|api[_-]?key)\s*[=:]/iu);
    expect(serialized).not.toMatch(/@nisum\.|\bNisum\b/iu);
  });
});
