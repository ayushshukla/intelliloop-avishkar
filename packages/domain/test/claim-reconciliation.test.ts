import {
  MAXIMUM_RECONCILIATION_CLAIMS,
  RECONCILIATION_DECISION_POLICY,
  ReconciliationError,
  createClaim,
  createClock,
  createEvidenceSource,
  createStableIdGenerator,
  prepareEvidenceImport,
  reconcileClaimSet,
  reconciliationDecisionPolicyIdentity,
  type Claim,
  type ClaimDependencies,
  type ClaimSupersession,
  type CreateClaimInput,
  type EvidenceSource,
  type ReconciliationErrorCode
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const PROJECT = "00000000-0000-4000-8000-000000000001";
const MISSION = "00000000-0000-4000-8000-000000000011";
const OTHER_MISSION = "00000000-0000-4000-8000-000000000012";
const SOURCE = "00000000-0000-4000-8000-000000000041";
const CLAIM_1 = "00000000-0000-4000-8000-000000000061";
const CLAIM_2 = "00000000-0000-4000-8000-000000000062";
const CLAIM_3 = "00000000-0000-4000-8000-000000000063";
const LINK_1 = "00000000-0000-4000-8000-000000000071";
const LINK_2 = "00000000-0000-4000-8000-000000000072";
const T0 = "2026-08-05T08:00:00.000Z";
const T1 = "2026-08-05T08:01:00.000Z";
const T2 = "2026-08-05T08:02:00.000Z";
const T3 = "2026-08-05T08:03:00.000Z";
const encoder = new TextEncoder();

function sequence(values: readonly string[]): () => string {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function dependencies(ids: readonly string[], time: string): ClaimDependencies {
  return {
    ids: createStableIdGenerator(sequence(ids)),
    clock: createClock(() => new Date(time))
  };
}

async function source(): Promise<EvidenceSource> {
  return createEvidenceSource(
    {
      projectId: PROJECT as never,
      missionId: MISSION as never,
      origin: "USER_INPUT",
      sourceLocator: "manual:requirements/cancellation-reconciliation",
      sourceRevision: "requirements-v3",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "MARKDOWN",
        content: encoder.encode("The cancellation rule is explicitly recorded.\n")
      })
    },
    {
      ids: createStableIdGenerator(() => SOURCE),
      clock: createClock(() => new Date(T0))
    }
  );
}

function input(
  evidence: EvidenceSource,
  value: unknown,
  overrides: Partial<CreateClaimInput> = {}
): CreateClaimInput {
  return {
    projectId: evidence.projectId,
    missionId: evidence.missionId,
    evidenceSourceId: evidence.evidenceSourceId,
    rawText: "The cancellation rule is explicitly recorded.",
    subject: "Order Cancellation",
    predicate: "Allowed Until",
    value,
    applicability: {
      dimensions: [
        { dimension: "channel", value: "web" },
        { dimension: "region", value: "india" }
      ],
      effectiveFromUtc: "2026-08-01T00:00:00.000Z",
      effectiveUntilUtc: "2027-08-01T00:00:00.000Z"
    },
    extractionMethod: "MANUAL_STRUCTURED_INTAKE",
    epistemicLabel: "FACT",
    ...overrides
  };
}

async function claim(
  evidence: EvidenceSource,
  claimId: string,
  value: unknown,
  time: string = T1,
  overrides: Partial<CreateClaimInput> = {}
): Promise<Claim> {
  return (
    await createClaim(
      input(evidence, value, overrides),
      evidence,
      undefined,
      dependencies([claimId], time)
    )
  ).claim;
}

async function successor(
  evidence: EvidenceSource,
  predecessor: Claim,
  claimId: string,
  linkId: string,
  value: unknown,
  time: string
): Promise<{ readonly claim: Claim; readonly link: ClaimSupersession }> {
  const created = await createClaim(
    input(evidence, value, { supersedesClaimId: predecessor.claimId }),
    evidence,
    predecessor,
    dependencies([claimId, linkId], time)
  );
  if (created.supersession === undefined) {
    throw new Error("Expected a supersession fixture.");
  }
  return { claim: created.claim, link: created.supersession };
}

async function reconcile(
  claims: readonly Claim[],
  supersessions: readonly ClaimSupersession[] = []
) {
  return reconcileClaimSet({
    projectId: PROJECT as never,
    missionId: MISSION as never,
    claims,
    supersessions
  });
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: ReconciliationErrorCode
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected reconciliation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ReconciliationError);
    if (!(error instanceof ReconciliationError)) throw error;
    expect(error.code).toBe(code);
    expect(error.message).not.toContain(PROJECT);
  }
}

describe("reconciliation decision policy identity", () => {
  it("pins explicit-only supersession and denies timestamp, source, confidence and AI authority", async () => {
    const first = await reconciliationDecisionPolicyIdentity();
    const second = await reconciliationDecisionPolicyIdentity();

    expect(first).toEqual(second);
    expect(first).toEqual({
      version: "reconciliation-decision-policy.v1",
      digest: "sha256:969c93260d99bbae724f027b8b993a220e28a9a68df946044fd427e972576b70"
    });
    expect(RECONCILIATION_DECISION_POLICY).toMatchObject({
      activeClaimRule: "NO_VALID_EXPLICIT_SUCCESSOR",
      timestampAuthority: "NONE",
      sourcePriorityAuthority: "NONE",
      confidenceAuthority: "NONE",
      aiAuthority: "NONE"
    });
  });
});

describe("active claim reconciliation truth table", () => {
  it.each([
    ["BEFORE_DISPATCH", "BEFORE_DISPATCH", "EQUIVALENT", undefined],
    ["BEFORE_DISPATCH", "BEFORE_PICKING", "CONFLICT", "CONFLICT"],
    [null, "BEFORE_PICKING", "AMBIGUOUS", "AMBIGUOUS"],
    [1, "1", "AMBIGUOUS", "AMBIGUOUS"],
    [{ stage: 1 }, { stage: 2 }, "AMBIGUOUS", "AMBIGUOUS"]
  ] as const)(
    "classifies %j versus %j as %s without choosing a winner",
    async (leftValue, rightValue, disposition, findingKind) => {
      const evidence = await source();
      const left = await claim(evidence, CLAIM_1, leftValue, T1);
      const right = await claim(evidence, CLAIM_2, rightValue, T2);
      const result = await reconcile([right, left]);

      expect(result.claimIds).toEqual([left.claimId, right.claimId]);
      expect(result.activeClaimIds).toEqual([left.claimId, right.claimId]);
      expect(result.supersededClaimIds).toEqual([]);
      expect(result.pairDecisions).toHaveLength(1);
      expect(result.pairDecisions[0]).toMatchObject({ disposition });
      expect(result.findings.map((finding) => finding.findingKind)).toEqual(
        findingKind === undefined ? [] : [findingKind]
      );
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.findings)).toBe(true);
    }
  );

  it("does not compare claims whose applicability is disjoint", async () => {
    const evidence = await source();
    const left = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH");
    const right = await claim(evidence, CLAIM_2, "BEFORE_PICKING", T2, {
      applicability: {
        dimensions: [
          { dimension: "channel", value: "store" },
          { dimension: "region", value: "india" }
        ]
      }
    });

    const result = await reconcile([left, right]);
    expect(result.pairDecisions[0]).toMatchObject({
      disposition: "NOT_COMPARABLE",
      reason: "APPLICABILITY_DISJOINT"
    });
    expect(result.findings).toEqual([]);
  });

  it("is input-order independent and keeps an unlinked newer claim conflicting", async () => {
    const evidence = await source();
    const older = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const newer = await claim(evidence, CLAIM_2, "BEFORE_PICKING", T3);

    const forward = await reconcile([older, newer]);
    const reverse = await reconcile([newer, older]);

    expect(reverse).toEqual(forward);
    expect(forward.findings).toHaveLength(1);
    expect(forward.findings[0]).toMatchObject({
      entityType: "ReconciliationFinding",
      findingKind: "CONFLICT",
      status: "OPEN",
      claimIds: [older.claimId, newer.claimId]
    });
    expect(forward.findings[0]?.findingKey).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(forward.resultDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe("explicit supersession authority", () => {
  it("deactivates only the exact predecessor and reconciles the active successor", async () => {
    const evidence = await source();
    const predecessor = await claim(
      evidence,
      CLAIM_1,
      "BEFORE_DISPATCH",
      T1
    );
    const replacement = await successor(
      evidence,
      predecessor,
      CLAIM_2,
      LINK_1,
      "BEFORE_PICKING",
      T2
    );
    const corroborating = await claim(
      evidence,
      CLAIM_3,
      "BEFORE_PICKING",
      T3
    );

    const result = await reconcile(
      [corroborating, replacement.claim, predecessor],
      [replacement.link]
    );

    expect(result.supersededClaimIds).toEqual([predecessor.claimId]);
    expect(result.activeClaimIds).toEqual([
      replacement.claim.claimId,
      corroborating.claimId
    ]);
    expect(result.pairDecisions.map((pair) => pair.disposition)).toEqual([
      "SUPERSEDED_INACTIVE",
      "SUPERSEDED_INACTIVE",
      "EQUIVALENT"
    ]);
    expect(result.findings).toEqual([]);
  });

  it("preserves ambiguity between the active successor and another active claim", async () => {
    const evidence = await source();
    const predecessor = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const replacement = await successor(
      evidence,
      predecessor,
      CLAIM_2,
      LINK_1,
      null,
      T2
    );
    const known = await claim(evidence, CLAIM_3, "BEFORE_PICKING", T3);

    const result = await reconcile(
      [predecessor, replacement.claim, known],
      [replacement.link]
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      findingKind: "AMBIGUOUS",
      reason: "UNKNOWN_VALUE_PRESENT",
      claimIds: [replacement.claim.claimId, known.claimId]
    });
  });

  it("follows a valid chain so only its head remains active", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const second = await successor(
      evidence,
      first,
      CLAIM_2,
      LINK_1,
      "BEFORE_PICKING",
      T2
    );
    const third = await successor(
      evidence,
      second.claim,
      CLAIM_3,
      LINK_2,
      "AFTER_PICKING",
      T3
    );

    const result = await reconcile(
      [third.claim, first, second.claim],
      [third.link, second.link]
    );
    expect(result.supersededClaimIds).toEqual([first.claimId, second.claim.claimId]);
    expect(result.activeClaimIds).toEqual([third.claim.claimId]);
    expect(result.pairDecisions.every((pair) => pair.disposition === "SUPERSEDED_INACTIVE")).toBe(true);
    expect(result.findings).toEqual([]);
  });
});

describe("supersession topology rejection", () => {
  it("rejects a successor claim when its attributed link is missing", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const second = await successor(
      evidence,
      first,
      CLAIM_2,
      LINK_1,
      "BEFORE_PICKING",
      T2
    );

    await expectCode(
      () => reconcile([first, second.claim]),
      "RECONCILIATION_SUPERSESSION_INVALID"
    );
  });

  it("rejects a fork before any branch can become an implicit winner", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const second = await successor(
      evidence,
      first,
      CLAIM_2,
      LINK_1,
      "BEFORE_PICKING",
      T2
    );
    const independent = await claim(evidence, CLAIM_3, "AFTER_PICKING", T3);
    const forkedClaim = Object.freeze({
      ...independent,
      supersedesClaimId: first.claimId
    }) as Claim;
    const forkedLink = Object.freeze({
      ...second.link,
      claimSupersessionId: LINK_2 as ClaimSupersession["claimSupersessionId"],
      successorClaimId: forkedClaim.claimId
    }) as ClaimSupersession;

    await expectCode(
      () => reconcile([first, second.claim, forkedClaim], [second.link, forkedLink]),
      "RECONCILIATION_SUPERSESSION_FORK"
    );
  });

  it("rejects a cycle even when every claim names its linked predecessor", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const second = await successor(
      evidence,
      first,
      CLAIM_2,
      LINK_1,
      "BEFORE_PICKING",
      T2
    );
    const cyclicFirst = Object.freeze({
      ...first,
      supersedesClaimId: second.claim.claimId
    }) as Claim;
    const reverseLink = Object.freeze({
      ...second.link,
      claimSupersessionId: LINK_2 as ClaimSupersession["claimSupersessionId"],
      predecessorClaimId: second.claim.claimId,
      successorClaimId: cyclicFirst.claimId
    }) as ClaimSupersession;

    await expectCode(
      () => reconcile([cyclicFirst, second.claim], [second.link, reverseLink]),
      "RECONCILIATION_SUPERSESSION_CYCLE"
    );
  });

  it("rejects a forged link whose exact applicability does not match", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH", T1);
    const valid = await successor(
      evidence,
      first,
      CLAIM_2,
      LINK_1,
      "BEFORE_PICKING",
      T2
    );
    const differentScope = await claim(evidence, CLAIM_3, "AFTER_PICKING", T3, {
      applicability: {
        dimensions: [{ dimension: "region", value: "uk" }]
      }
    });
    const forgedClaim = Object.freeze({
      ...differentScope,
      supersedesClaimId: first.claimId
    }) as Claim;
    const forgedLink = Object.freeze({
      ...valid.link,
      claimSupersessionId: LINK_2 as ClaimSupersession["claimSupersessionId"],
      successorClaimId: forgedClaim.claimId
    }) as ClaimSupersession;

    await expectCode(
      () => reconcile([first, forgedClaim], [forgedLink]),
      "RECONCILIATION_SUPERSESSION_INVALID"
    );
  });
});

describe("reconciliation input boundaries", () => {
  it("rejects cross-Mission claims and duplicate identities", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH");
    const crossMission = Object.freeze({
      ...first,
      claimId: CLAIM_2 as Claim["claimId"],
      missionId: OTHER_MISSION as Claim["missionId"]
    }) as Claim;

    await expectCode(
      () => reconcile([crossMission]),
      "RECONCILIATION_INPUT_INVALID"
    );
    await expectCode(
      () => reconcile([first, first]),
      "RECONCILIATION_INPUT_INVALID"
    );
  });

  it("recomputes and rejects forged comparison-critical claim keys", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH");
    const forgedComparisonKey = Object.freeze({
      ...first,
      comparisonKey: `sha256:${"0".repeat(64)}` as Claim["comparisonKey"]
    }) as Claim;
    const forgedApplicabilityKey = Object.freeze({
      ...first,
      applicabilityKey: `sha256:${"1".repeat(64)}` as Claim["applicabilityKey"]
    }) as Claim;

    await expectCode(
      () => reconcile([forgedComparisonKey]),
      "RECONCILIATION_INPUT_INVALID"
    );
    await expectCode(
      () => reconcile([forgedApplicabilityKey]),
      "RECONCILIATION_INPUT_INVALID"
    );
  });

  it("fails before quadratic work when the fixed claim limit is exceeded", async () => {
    const evidence = await source();
    const first = await claim(evidence, CLAIM_1, "BEFORE_DISPATCH");
    const oversized = Array.from(
      { length: MAXIMUM_RECONCILIATION_CLAIMS + 1 },
      () => first
    );

    await expectCode(
      () => reconcile(oversized),
      "RECONCILIATION_LIMIT_EXCEEDED"
    );
  });
});
