import {
  ClaimError,
  assertClaimInvariant,
  createClaim,
  createClock,
  createEvidenceSource,
  createStableIdGenerator,
  normalizeClaimApplicability,
  normalizeClaimTerm,
  normalizeClaimValue,
  prepareEvidenceImport,
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
const LINK_1 = "00000000-0000-4000-8000-000000000071";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T10:01:00.000Z";
const T2 = "2026-08-04T10:02:00.000Z";
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
      sourceLocator: "manual:requirements/cancellation-v2",
      sourceRevision: "requirements-v2",
      effectiveAtUtc: "2026-08-01T00:00:00.000Z",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: await prepareEvidenceImport({
        format: "MARKDOWN",
        content: encoder.encode(
          "Cancellation is allowed before dispatch.\nCancellation is forbidden before dispatch.\n"
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
    rawText: "Cancellation is allowed before dispatch.",
    subject: "Order Cancellation",
    predicate: "Allowed Before",
    value: "dispatch",
    applicability: {
      dimensions: [
        { dimension: "Channel", value: "Web" },
        { dimension: "Region", value: "India" }
      ],
      effectiveFromUtc: "2026-08-01T00:00:00.000Z",
      effectiveUntilUtc: "2027-08-01T00:00:00.000Z"
    },
    effectiveAtUtc: "2026-08-01T00:00:00.000Z",
    extractionMethod: "MANUAL_STRUCTURED_INTAKE",
    epistemicLabel: "FACT",
    ...overrides
  };
}

async function expectCode(
  operation: () => Promise<unknown> | unknown,
  code: ClaimError["code"]
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected claim rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(ClaimError);
    expect(error).toMatchObject({ code });
  }
}

describe("bounded claim normalization", () => {
  it.each([
    [" Order  Cancellation ", "order.cancellation"],
    ["ORDER-cancellation", "order.cancellation"],
    ["Order／Cancellation", "order.cancellation"],
    ["Café  Éligibilité", "café.éligibilité"]
  ])("normalizes %s to %s", (raw, expected) => {
    expect(normalizeClaimTerm(raw)).toBe(expected);
  });

  it("produces stable comparison and applicability keys independent of spelling and dimension order", async () => {
    const evidence = await source();
    const first = await createClaim(
      input(evidence),
      evidence,
      undefined,
      dependencies([CLAIM_1], T1)
    );
    const second = await createClaim(
      input(evidence, {
        subject: "ORDER-cancellation",
        predicate: "allowed/before",
        applicability: {
          dimensions: [
            { dimension: "REGION", value: "INDIA" },
            { dimension: "channel", value: "web" }
          ],
          effectiveFromUtc: "2026-08-01T00:00:00.000Z",
          effectiveUntilUtc: "2027-08-01T00:00:00.000Z"
        }
      }),
      evidence,
      undefined,
      dependencies([CLAIM_2], T2)
    );

    expect(second.claim.comparisonKey).toBe(first.claim.comparisonKey);
    expect(second.claim.applicabilityKey).toBe(first.claim.applicabilityKey);
    expect(second.claim.applicability.dimensions).toEqual([
      { dimension: "channel", value: "web" },
      { dimension: "region", value: "india" }
    ]);
  });

  it("preserves conflicting source text as separate claims without choosing a winner", async () => {
    const evidence = await source();
    const allowed = await createClaim(
      input(evidence),
      evidence,
      undefined,
      dependencies([CLAIM_1], T1)
    );
    const forbidden = await createClaim(
      input(evidence, {
        rawText: "Cancellation is forbidden before dispatch.",
        value: false
      }),
      evidence,
      undefined,
      dependencies([CLAIM_2], T2)
    );

    expect(forbidden.claim.comparisonKey).toBe(allowed.claim.comparisonKey);
    expect(forbidden.claim.applicabilityKey).toBe(
      allowed.claim.applicabilityKey
    );
    expect(forbidden.claim.rawText).toBe(
      "Cancellation is forbidden before dispatch."
    );
    expect(allowed.claim.rawText).toBe(
      "Cancellation is allowed before dispatch."
    );
    expect(forbidden.claim.claimDigest).not.toBe(allowed.claim.claimDigest);
  });

  it("retains an explicit inference label without promoting it to fact", async () => {
    const evidence = await source();
    const result = await createClaim(
      input(evidence, { epistemicLabel: "INFERENCE" }),
      evidence,
      undefined,
      dependencies([CLAIM_1], T1)
    );

    expect(result.claim.epistemicLabel).toBe("INFERENCE");
    expect(Object.isFrozen(result.claim)).toBe(true);
    expect(Object.isFrozen(result.claim.value)).toBe(true);
    expect(Object.isFrozen(result.claim.applicability.dimensions)).toBe(true);
  });

  it("rejects claim recording time before its evidence source", async () => {
    const evidence = await source();
    await expectCode(
      () =>
        createClaim(
          input(evidence),
          evidence,
          undefined,
          dependencies([CLAIM_1], "2026-08-04T09:59:59.999Z")
        ),
      "CLAIM_INVALID"
    );
  });

  it("rejects invented excerpts, duplicate dimensions and unbounded values", async () => {
    const evidence = await source();
    await expectCode(
      () =>
        createClaim(
          input(evidence, { rawText: "invented raw statement" }),
          evidence,
          undefined,
          dependencies([CLAIM_1], T1)
        ),
      "CLAIM_RAW_TEXT_INVALID"
    );
    expect(() =>
      normalizeClaimApplicability({
        dimensions: [
          { dimension: "region", value: "india" },
          { dimension: "REGION", value: "uk" }
        ]
      })
    ).toThrowError(expect.objectContaining({ code: "CLAIM_APPLICABILITY_INVALID" }));
    expect(() =>
      normalizeClaimApplicability({
        effectiveFromUtc: "2027-08-01T00:00:00.000Z",
        effectiveUntilUtc: "2026-08-01T00:00:00.000Z"
      })
    ).toThrowError(expect.objectContaining({ code: "CLAIM_APPLICABILITY_INVALID" }));
    await expectCode(
      () =>
        createClaim(
          input(evidence, { value: "x".repeat(16_385) }),
          evidence,
          undefined,
          dependencies([CLAIM_1], T1)
        ),
      "CLAIM_VALUE_INVALID"
    );
    let deepValue: unknown = "leaf";
    for (let depth = 0; depth < 17; depth += 1) deepValue = [deepValue];
    expect(() => normalizeClaimValue(deepValue)).toThrowError(
      expect.objectContaining({ code: "CLAIM_VALUE_INVALID" })
    );
    expect(() => normalizeClaimValue(Array.from({ length: 257 }, () => 1))).toThrowError(
      expect.objectContaining({ code: "CLAIM_VALUE_INVALID" })
    );
  });
});

describe("explicit claim supersession", () => {
  it("appends an attributed successor link while leaving the predecessor intact", async () => {
    const evidence = await source();
    const predecessor = (
      await createClaim(
        input(evidence),
        evidence,
        undefined,
        dependencies([CLAIM_1], T1)
      )
    ).claim;
    const before = JSON.stringify(predecessor);
    const successor = await createClaim(
      input(evidence, {
        rawText: "Cancellation is forbidden before dispatch.",
        value: false,
        supersedesClaimId: predecessor.claimId
      }),
      evidence,
      predecessor,
      dependencies([CLAIM_2, LINK_1], T2)
    );

    expect(successor.claim.supersedesClaimId).toBe(predecessor.claimId);
    expect(successor.supersession).toMatchObject({
      relationshipType: "SUPERSEDES",
      predecessorClaimId: predecessor.claimId,
      successorClaimId: successor.claim.claimId,
      epistemicLabel: "FACT"
    });
    expect(JSON.stringify(predecessor)).toBe(before);
  });

  it.each([
    { subject: "Refund", code: "comparison" },
    {
      applicability: { dimensions: [{ dimension: "region", value: "uk" }] },
      code: "applicability"
    }
  ])("rejects mismatched $code supersession", async (override) => {
    const evidence = await source();
    const predecessor = (
      await createClaim(
        input(evidence),
        evidence,
        undefined,
        dependencies([CLAIM_1], T1)
      )
    ).claim;
    await expectCode(
      () =>
        createClaim(
          input(evidence, {
            ...override,
            rawText: "Cancellation is forbidden before dispatch.",
            supersedesClaimId: predecessor.claimId
          }),
          evidence,
          predecessor,
          dependencies([CLAIM_2], T2)
        ),
      "CLAIM_SUPERSESSION_INVALID"
    );
  });

  it("rejects a forged claim digest and same-identity successor", async () => {
    const evidence = await source();
    const predecessor = (
      await createClaim(
        input(evidence),
        evidence,
        undefined,
        dependencies([CLAIM_1], T1)
      )
    ).claim;
    await expectCode(
      () =>
        createClaim(
          input(evidence, { supersedesClaimId: predecessor.claimId }),
          evidence,
          predecessor,
          dependencies([CLAIM_1], T2)
        ),
      "CLAIM_SUPERSESSION_INVALID"
    );
    await expectCode(
      () =>
        assertClaimInvariant(
          {
            ...predecessor,
            claimDigest: `sha256:${"0".repeat(64)}` as Claim["claimDigest"]
          },
          evidence
        ),
      "CLAIM_INVALID"
    );
  });

  it("rejects a successor whose recording time moves backwards", async () => {
    const evidence = await source();
    const predecessor = (
      await createClaim(
        input(evidence),
        evidence,
        undefined,
        dependencies([CLAIM_1], T2)
      )
    ).claim;

    await expectCode(
      () =>
        createClaim(
          input(evidence, {
            rawText: "Cancellation is forbidden before dispatch.",
            value: false,
            supersedesClaimId: predecessor.claimId
          }),
          evidence,
          predecessor,
          dependencies([CLAIM_2], T1)
        ),
      "CLAIM_SUPERSESSION_INVALID"
    );
  });
});
