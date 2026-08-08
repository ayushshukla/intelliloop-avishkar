import {
  RECONCILIATION_RULE_SET,
  RECONCILIATION_RULE_SET_VERSION,
  compareClaimApplicability,
  compareClaimValues,
  compareClaims,
  createClaim,
  createClock,
  createEvidenceSource,
  createStableIdGenerator,
  normalizeClaimApplicability,
  prepareEvidenceImport,
  reconciliationRuleSetIdentity,
  type Claim,
  type ClaimDependencies,
  type CreateClaimInput,
  type EvidenceSource
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const PROJECT = "00000000-0000-4000-8000-000000000001";
const MISSION = "00000000-0000-4000-8000-000000000011";
const SOURCE = "00000000-0000-4000-8000-000000000041";
const CLAIM_1 = "00000000-0000-4000-8000-000000000061";
const CLAIM_2 = "00000000-0000-4000-8000-000000000062";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const encoder = new TextEncoder();

function dependencies(id: string): ClaimDependencies {
  return {
    ids: createStableIdGenerator(() => id),
    clock: createClock(() => new Date(T1))
  };
}

async function source(): Promise<EvidenceSource> {
  return createEvidenceSource(
    {
      projectId: PROJECT as never,
      missionId: MISSION as never,
      origin: "USER_INPUT",
      sourceLocator: "manual:requirements/cancellation-v2",
      sourceRevision: "requirements-v2",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "MARKDOWN",
        content: encoder.encode(
          "Cancellation window is BEFORE_DISPATCH.\nCancellation window is BEFORE_PICKING.\n"
        )
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
  overrides: Partial<CreateClaimInput> = {}
): CreateClaimInput {
  return {
    projectId: evidence.projectId,
    missionId: evidence.missionId,
    evidenceSourceId: evidence.evidenceSourceId,
    rawText: "Cancellation window is BEFORE_DISPATCH.",
    subject: "Order Cancellation",
    predicate: "Allowed Until",
    value: "BEFORE_DISPATCH",
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

async function claimPair(
  rightOverrides: Partial<CreateClaimInput> = {}
): Promise<readonly [Claim, Claim]> {
  const evidence = await source();
  const left = await createClaim(
    input(evidence),
    evidence,
    undefined,
    dependencies(CLAIM_1)
  );
  const right = await createClaim(
    input(evidence, rightOverrides),
    evidence,
    undefined,
    dependencies(CLAIM_2)
  );
  return [left.claim, right.claim];
}

describe("reconciliation rule-set identity", () => {
  it("pins exact deterministic rules and declares no fuzzy authority", async () => {
    const first = await reconciliationRuleSetIdentity();
    const second = await reconciliationRuleSetIdentity();

    expect(first).toEqual(second);
    expect(first.version).toBe("reconciliation-rules.v1");
    expect(first.digest).toBe(
      "sha256:303187e972e24c314eb8153a1101c4182b525b89c8c0322125d8539e3b2628e7"
    );
    expect(RECONCILIATION_RULE_SET_VERSION).toBe(first.version);
    expect(RECONCILIATION_RULE_SET.fuzzyMatchingAuthority).toBe("NONE");
  });
});

describe("claim-value comparison truth vectors", () => {
  it.each([
    [true, true, "EQUIVALENT", "CANONICAL_VALUES_EQUAL"],
    [true, false, "INCOMPATIBLE", "SCALAR_VALUES_DIFFER"],
    [1, 2, "INCOMPATIBLE", "SCALAR_VALUES_DIFFER"],
    ["BEFORE_PICKING", "BEFORE_DISPATCH", "INCOMPATIBLE", "SCALAR_VALUES_DIFFER"],
    [null, "known", "AMBIGUOUS", "UNKNOWN_VALUE_PRESENT"],
    [1, "1", "AMBIGUOUS", "VALUE_TYPES_DIFFER_NO_COERCION"],
    [{ a: 1 }, { a: 2 }, "AMBIGUOUS", "STRUCTURED_VALUE_POLICY_REQUIRED"],
    [["a"], ["b"], "AMBIGUOUS", "STRUCTURED_VALUE_POLICY_REQUIRED"]
  ] as const)(
    "compares %j and %j as %s",
    (left, right, relation, reason) => {
      expect(compareClaimValues(left, right)).toEqual({ relation, reason });
      expect(compareClaimValues(right, left)).toEqual({ relation, reason });
    }
  );

  it("treats canonically equal structured values as equivalent", () => {
    expect(compareClaimValues({ b: 2, a: 1 }, { a: 1, b: 2 })).toEqual({
      relation: "EQUIVALENT",
      reason: "CANONICAL_VALUES_EQUAL"
    });
  });
});

describe("claim-applicability overlap truth vectors", () => {
  it("overlaps a broad scope with a compatible narrower scope", () => {
    const broad = normalizeClaimApplicability({
      dimensions: [{ dimension: "region", value: "india" }]
    });
    const narrow = normalizeClaimApplicability({
      dimensions: [
        { dimension: "channel", value: "web" },
        { dimension: "region", value: "india" }
      ]
    });

    expect(compareClaimApplicability(broad, narrow)).toEqual({
      relation: "OVERLAPS",
      reason: "NO_DIMENSION_OR_TIME_CONFLICT",
      conflictingDimensions: []
    });
  });

  it("rejects a shared dimension with different values deterministically", () => {
    const left = normalizeClaimApplicability({
      dimensions: [
        { dimension: "region", value: "india" },
        { dimension: "channel", value: "web" }
      ]
    });
    const right = normalizeClaimApplicability({
      dimensions: [
        { dimension: "region", value: "uk" },
        { dimension: "channel", value: "store" }
      ]
    });

    expect(compareClaimApplicability(left, right)).toEqual({
      relation: "DISJOINT",
      reason: "DIMENSION_VALUES_DIFFER",
      conflictingDimensions: ["channel", "region"]
    });
  });

  it("uses half-open effective intervals so touching boundaries do not overlap", () => {
    const left = normalizeClaimApplicability({
      effectiveUntilUtc: "2026-08-02T00:00:00.000Z"
    });
    const right = normalizeClaimApplicability({
      effectiveFromUtc: "2026-08-02T00:00:00.000Z"
    });

    expect(compareClaimApplicability(left, right)).toEqual({
      relation: "DISJOINT",
      reason: "EFFECTIVE_INTERVALS_DO_NOT_OVERLAP",
      conflictingDimensions: []
    });
  });
});

describe("claim comparison eligibility", () => {
  it("finds incompatible scalar values only inside matching scope and overlapping applicability", async () => {
    const [left, right] = await claimPair({
      rawText: "Cancellation window is BEFORE_PICKING.",
      value: "BEFORE_PICKING",
      subject: "ORDER-cancellation",
      predicate: "allowed/until",
      applicability: {
        dimensions: [
          { dimension: "region", value: "india" },
          { dimension: "channel", value: "web" },
          { dimension: "customer", value: "retail" }
        ],
        effectiveFromUtc: "2026-09-01T00:00:00.000Z",
        effectiveUntilUtc: "2027-01-01T00:00:00.000Z"
      }
    });

    expect(compareClaims(left, right)).toMatchObject({
      ruleSetVersion: "reconciliation-rules.v1",
      relation: "INCOMPATIBLE",
      reason: "SCALAR_VALUES_DIFFER",
      applicability: { relation: "OVERLAPS" },
      value: { relation: "INCOMPATIBLE" }
    });
    expect(compareClaims(right, left)).toEqual(compareClaims(left, right));
  });

  it.each([
    [
      (claim: Claim) => ({ ...claim, missionId: "00000000-0000-4000-8000-000000000099" as Claim["missionId"] }),
      "MISSION_SCOPE_DIFFERS"
    ],
    [
      (claim: Claim) => ({ ...claim, subject: "order.refund" as Claim["subject"] }),
      "SUBJECT_OR_PREDICATE_DIFFERS"
    ],
    [
      (claim: Claim) => ({ ...claim, comparisonKey: `sha256:${"0".repeat(64)}` as Claim["comparisonKey"] }),
      "COMPARISON_KEY_DIFFERS"
    ]
  ] as const)("does not compare an ineligible pair (%s)", async (change, reason) => {
    const [left, right] = await claimPair();
    expect(compareClaims(left, change(right))).toEqual({
      ruleSetVersion: "reconciliation-rules.v1",
      relation: "NOT_COMPARABLE",
      reason
    });
  });

  it("does not compare matching statements in disjoint applicability", async () => {
    const [left, right] = await claimPair({
      applicability: {
        dimensions: [
          { dimension: "channel", value: "store" },
          { dimension: "region", value: "india" }
        ]
      }
    });

    expect(compareClaims(left, right)).toMatchObject({
      relation: "NOT_COMPARABLE",
      reason: "APPLICABILITY_DISJOINT",
      applicability: {
        relation: "DISJOINT",
        reason: "DIMENSION_VALUES_DIFFER",
        conflictingDimensions: ["channel"]
      }
    });
  });
});
