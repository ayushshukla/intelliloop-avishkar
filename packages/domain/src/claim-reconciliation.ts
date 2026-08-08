import { canonicalizeJson } from "./canonical-json.js";
import {
  CLAIM_APPLICABILITY_KEY_VERSION,
  CLAIM_COMPARISON_KEY_VERSION,
  CLAIM_NORMALIZATION_VERSION,
  assertClaimSupersessionInvariant,
  normalizeClaimApplicability,
  normalizeClaimTerm,
  normalizeClaimValue,
  type Claim,
  type ClaimApplicability,
  type ClaimId,
  type ClaimSupersession
} from "./claim.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  RECONCILIATION_RULE_SET_VERSION,
  compareClaims,
  reconciliationRuleSetIdentity,
  type ClaimComparison,
  type ClaimComparisonReason
} from "./reconciliation-comparison.js";
import { parseStableId } from "./stable-id.js";
import { parseUtcTimestamp } from "./time.js";

export const CLAIM_RECONCILIATION_VERSION = "claim-reconciliation.v1";
export const RECONCILIATION_DECISION_POLICY_VERSION =
  "reconciliation-decision-policy.v1";
export const RECONCILIATION_FINDING_KEY_VERSION =
  "reconciliation-finding-key.v1";
export const MAXIMUM_RECONCILIATION_CLAIMS = 100;
export const MAXIMUM_RECONCILIATION_SUPERSESSIONS = 99;

export const CLAIM_PAIR_DISPOSITIONS = [
  "SUPERSEDED_INACTIVE",
  "NOT_COMPARABLE",
  "EQUIVALENT",
  "CONFLICT",
  "AMBIGUOUS"
] as const;
export const CLAIM_RECONCILIATION_FINDING_KINDS = [
  "CONFLICT",
  "AMBIGUOUS"
] as const;
export const RECONCILIATION_ERROR_CODES = [
  "RECONCILIATION_SCOPE_INVALID",
  "RECONCILIATION_INPUT_INVALID",
  "RECONCILIATION_LIMIT_EXCEEDED",
  "RECONCILIATION_SUPERSESSION_INVALID",
  "RECONCILIATION_SUPERSESSION_FORK",
  "RECONCILIATION_SUPERSESSION_CYCLE"
] as const;

export type ClaimPairDisposition = (typeof CLAIM_PAIR_DISPOSITIONS)[number];
export type ClaimReconciliationFindingKind =
  (typeof CLAIM_RECONCILIATION_FINDING_KINDS)[number];
export type ReconciliationErrorCode =
  (typeof RECONCILIATION_ERROR_CODES)[number];

export const RECONCILIATION_DECISION_POLICY = Object.freeze({
  version: RECONCILIATION_DECISION_POLICY_VERSION,
  comparisonRuleSetVersion: RECONCILIATION_RULE_SET_VERSION,
  pairOrder: "CLAIM_ID_ASCENDING",
  activeClaimRule: "NO_VALID_EXPLICIT_SUCCESSOR",
  supersessionRule: "EXACT_APPLICABILITY_VALIDATED_LINK_ONLY",
  incompatiblePair: "OPEN_CONFLICT",
  ambiguousPair: "OPEN_AMBIGUITY",
  equivalentPair: "NO_FINDING",
  notComparablePair: "NO_FINDING",
  timestampAuthority: "NONE",
  sourcePriorityAuthority: "NONE",
  confidenceAuthority: "NONE",
  aiAuthority: "NONE"
} as const);

export interface ReconciliationDecisionPolicyIdentity {
  readonly version: typeof RECONCILIATION_DECISION_POLICY_VERSION;
  readonly digest: Sha256Digest;
}

export interface ReconcileClaimSetInput {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly claims: readonly Claim[];
  readonly supersessions: readonly ClaimSupersession[];
}

export interface ClaimPairDecision {
  readonly claimIds: readonly [ClaimId, ClaimId];
  readonly disposition: ClaimPairDisposition;
  readonly reason: ClaimComparisonReason | "EXPLICIT_VALID_SUPERSESSION";
  readonly comparison?: ClaimComparison;
}

export interface ClaimReconciliationFinding {
  readonly entityType: "ReconciliationFinding";
  readonly findingKeyVersion: typeof RECONCILIATION_FINDING_KEY_VERSION;
  readonly findingKey: Sha256Digest;
  readonly findingKind: ClaimReconciliationFindingKind;
  readonly status: "OPEN";
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly claimIds: readonly [ClaimId, ClaimId];
  readonly claimDigests: readonly [Sha256Digest, Sha256Digest];
  readonly comparisonKey: Sha256Digest;
  readonly reason: ClaimComparisonReason;
  readonly comparisonRuleSetVersion: typeof RECONCILIATION_RULE_SET_VERSION;
  readonly comparisonRuleSetDigest: Sha256Digest;
  readonly decisionPolicyVersion: typeof RECONCILIATION_DECISION_POLICY_VERSION;
  readonly decisionPolicyDigest: Sha256Digest;
}

export interface ClaimReconciliationResult {
  readonly version: typeof CLAIM_RECONCILIATION_VERSION;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly comparisonRuleSetVersion: typeof RECONCILIATION_RULE_SET_VERSION;
  readonly comparisonRuleSetDigest: Sha256Digest;
  readonly decisionPolicyVersion: typeof RECONCILIATION_DECISION_POLICY_VERSION;
  readonly decisionPolicyDigest: Sha256Digest;
  readonly claimIds: readonly ClaimId[];
  readonly activeClaimIds: readonly ClaimId[];
  readonly supersededClaimIds: readonly ClaimId[];
  readonly pairDecisions: readonly ClaimPairDecision[];
  readonly findings: readonly ClaimReconciliationFinding[];
  readonly resultDigest: Sha256Digest;
}

const ERROR_MESSAGES: Readonly<Record<ReconciliationErrorCode, string>> =
  Object.freeze({
    RECONCILIATION_SCOPE_INVALID: "Reconciliation scope is invalid.",
    RECONCILIATION_INPUT_INVALID: "Reconciliation input is invalid.",
    RECONCILIATION_LIMIT_EXCEEDED: "Reconciliation input exceeds a fixed limit.",
    RECONCILIATION_SUPERSESSION_INVALID:
      "Reconciliation supersession is invalid.",
    RECONCILIATION_SUPERSESSION_FORK:
      "Reconciliation supersession topology forks or joins.",
    RECONCILIATION_SUPERSESSION_CYCLE:
      "Reconciliation supersession topology contains a cycle."
  });

export class ReconciliationError extends Error {
  readonly code: ReconciliationErrorCode;

  constructor(code: ReconciliationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReconciliationError";
    this.code = code;
  }
}

function fail(code: ReconciliationErrorCode): never {
  throw new ReconciliationError(code);
}

function applicabilityDocument(applicability: ClaimApplicability) {
  return {
    dimensions: applicability.dimensions.map((entry) => ({
      dimension: entry.dimension,
      value: entry.value
    })),
    effectiveFromUtc: applicability.effectiveFromUtc ?? null,
    effectiveUntilUtc: applicability.effectiveUntilUtc ?? null
  };
}

async function assertClaimEnvelope(
  claim: Claim,
  projectId: ProjectId,
  missionId: MissionId
): Promise<void> {
  try {
    if (
      claim.entityType !== "Claim" ||
      claim.normalizationVersion !== CLAIM_NORMALIZATION_VERSION ||
      claim.projectId !== projectId ||
      claim.missionId !== missionId ||
      parseStableId<"CLAIM">(claim.claimId) !== claim.claimId ||
      parseStableId<"EVIDENCE_SOURCE">(claim.evidenceSourceId) !==
        claim.evidenceSourceId
    ) {
      return fail("RECONCILIATION_INPUT_INVALID");
    }
    parseSha256Digest(claim.importKey);
    parseSha256Digest(claim.claimDigest);
    parseSha256Digest(claim.comparisonKey);
    parseSha256Digest(claim.applicabilityKey);
    parseSha256Digest(claim.sourceContentDigest);
    parseUtcTimestamp(claim.recordedAtUtc);
    if (claim.effectiveAtUtc !== undefined) {
      parseUtcTimestamp(claim.effectiveAtUtc);
    }
    if (claim.supersedesClaimId !== undefined) {
      parseStableId<"CLAIM">(claim.supersedesClaimId);
    }
    const expectedComparisonKey = await canonicalJsonDigest({
      version: CLAIM_COMPARISON_KEY_VERSION,
      subject: claim.subject,
      predicate: claim.predicate
    });
    const expectedApplicabilityKey = await canonicalJsonDigest({
      version: CLAIM_APPLICABILITY_KEY_VERSION,
      applicability: applicabilityDocument(claim.applicability)
    });
    if (
      normalizeClaimTerm(claim.subject) !== claim.subject ||
      normalizeClaimTerm(claim.predicate) !== claim.predicate ||
      canonicalizeJson(normalizeClaimValue(claim.value)) !==
        canonicalizeJson(claim.value) ||
      canonicalizeJson(
        normalizeClaimApplicability({
          dimensions: claim.applicability.dimensions,
          ...(claim.applicability.effectiveFromUtc === undefined
            ? {}
            : { effectiveFromUtc: claim.applicability.effectiveFromUtc }),
          ...(claim.applicability.effectiveUntilUtc === undefined
            ? {}
            : { effectiveUntilUtc: claim.applicability.effectiveUntilUtc })
        })
      ) !== canonicalizeJson(claim.applicability) ||
      claim.comparisonKey !== expectedComparisonKey ||
      claim.applicabilityKey !== expectedApplicabilityKey
    ) {
      return fail("RECONCILIATION_INPUT_INVALID");
    }
  } catch (error) {
    if (error instanceof ReconciliationError) throw error;
    return fail("RECONCILIATION_INPUT_INVALID");
  }
}

function detectCycle(successorByPredecessor: ReadonlyMap<ClaimId, ClaimId>): void {
  const completed = new Set<ClaimId>();
  for (const startingClaimId of successorByPredecessor.keys()) {
    if (completed.has(startingClaimId)) continue;
    const path = new Set<ClaimId>();
    let currentClaimId: ClaimId | undefined = startingClaimId;
    while (currentClaimId !== undefined) {
      if (path.has(currentClaimId)) {
        return fail("RECONCILIATION_SUPERSESSION_CYCLE");
      }
      if (completed.has(currentClaimId)) break;
      path.add(currentClaimId);
      currentClaimId = successorByPredecessor.get(currentClaimId);
    }
    for (const claimId of path) completed.add(claimId);
  }
}

async function validateSupersessions(
  claimsById: ReadonlyMap<ClaimId, Claim>,
  supersessions: readonly ClaimSupersession[]
): Promise<ReadonlyMap<ClaimId, ClaimId>> {
  const successorByPredecessor = new Map<ClaimId, ClaimId>();
  const predecessorBySuccessor = new Map<ClaimId, ClaimId>();
  const linkIds = new Set<string>();
  const orderedLinks = [...supersessions].sort((left, right) =>
    left.claimSupersessionId.localeCompare(right.claimSupersessionId, "en-US")
  );

  for (const link of orderedLinks) {
    let linkId: string;
    let predecessorClaimId: ClaimId;
    let successorClaimId: ClaimId;
    try {
      linkId = parseStableId<"CLAIM_SUPERSESSION">(link.claimSupersessionId);
      predecessorClaimId = parseStableId<"CLAIM">(link.predecessorClaimId);
      successorClaimId = parseStableId<"CLAIM">(link.successorClaimId);
    } catch {
      return fail("RECONCILIATION_SUPERSESSION_INVALID");
    }
    if (
      linkIds.has(linkId) ||
      predecessorClaimId === successorClaimId ||
      !claimsById.has(predecessorClaimId) ||
      !claimsById.has(successorClaimId)
    ) {
      return fail("RECONCILIATION_SUPERSESSION_INVALID");
    }
    linkIds.add(linkId);
    if (
      successorByPredecessor.has(predecessorClaimId) ||
      predecessorBySuccessor.has(successorClaimId)
    ) {
      return fail("RECONCILIATION_SUPERSESSION_FORK");
    }
    const successor = claimsById.get(successorClaimId);
    if (successor?.supersedesClaimId !== predecessorClaimId) {
      return fail("RECONCILIATION_SUPERSESSION_INVALID");
    }
    successorByPredecessor.set(predecessorClaimId, successorClaimId);
    predecessorBySuccessor.set(successorClaimId, predecessorClaimId);
  }

  for (const claim of claimsById.values()) {
    const linkedPredecessor = predecessorBySuccessor.get(claim.claimId);
    if (claim.supersedesClaimId !== linkedPredecessor) {
      return fail("RECONCILIATION_SUPERSESSION_INVALID");
    }
  }

  detectCycle(successorByPredecessor);

  for (const link of orderedLinks) {
    const predecessor = claimsById.get(link.predecessorClaimId);
    const successor = claimsById.get(link.successorClaimId);
    if (predecessor === undefined || successor === undefined) {
      return fail("RECONCILIATION_SUPERSESSION_INVALID");
    }
    try {
      await assertClaimSupersessionInvariant(link, successor, predecessor);
    } catch {
      return fail("RECONCILIATION_SUPERSESSION_INVALID");
    }
  }
  return successorByPredecessor;
}

export async function reconciliationDecisionPolicyIdentity(): Promise<ReconciliationDecisionPolicyIdentity> {
  return Object.freeze({
    version: RECONCILIATION_DECISION_POLICY_VERSION,
    digest: await canonicalJsonDigest(RECONCILIATION_DECISION_POLICY)
  });
}

async function createFinding(
  left: Claim,
  right: Claim,
  findingKind: ClaimReconciliationFindingKind,
  reason: ClaimComparisonReason,
  comparisonRuleSetDigest: Sha256Digest,
  decisionPolicyDigest: Sha256Digest
): Promise<ClaimReconciliationFinding> {
  const claimIds = Object.freeze([left.claimId, right.claimId]) as readonly [
    ClaimId,
    ClaimId
  ];
  const claimDigests = Object.freeze([
    left.claimDigest,
    right.claimDigest
  ]) as readonly [Sha256Digest, Sha256Digest];
  const findingKey = await canonicalJsonDigest({
    version: RECONCILIATION_FINDING_KEY_VERSION,
    scope: { projectId: left.projectId, missionId: left.missionId },
    findingKind,
    claimIds,
    claimDigests,
    comparisonKey: left.comparisonKey,
    reason,
    comparisonRuleSet: {
      version: RECONCILIATION_RULE_SET_VERSION,
      digest: comparisonRuleSetDigest
    },
    decisionPolicy: {
      version: RECONCILIATION_DECISION_POLICY_VERSION,
      digest: decisionPolicyDigest
    }
  });
  return Object.freeze({
    entityType: "ReconciliationFinding",
    findingKeyVersion: RECONCILIATION_FINDING_KEY_VERSION,
    findingKey,
    findingKind,
    status: "OPEN",
    projectId: left.projectId,
    missionId: left.missionId,
    claimIds,
    claimDigests,
    comparisonKey: left.comparisonKey,
    reason,
    comparisonRuleSetVersion: RECONCILIATION_RULE_SET_VERSION,
    comparisonRuleSetDigest,
    decisionPolicyVersion: RECONCILIATION_DECISION_POLICY_VERSION,
    decisionPolicyDigest
  });
}

function dispositionFor(comparison: ClaimComparison): Exclude<
  ClaimPairDisposition,
  "SUPERSEDED_INACTIVE"
> {
  switch (comparison.relation) {
    case "NOT_COMPARABLE":
      return "NOT_COMPARABLE";
    case "EQUIVALENT":
      return "EQUIVALENT";
    case "INCOMPATIBLE":
      return "CONFLICT";
    case "AMBIGUOUS":
      return "AMBIGUOUS";
  }
}

export async function reconcileClaimSet(
  input: ReconcileClaimSetInput
): Promise<ClaimReconciliationResult> {
  let projectId: ProjectId;
  let missionId: MissionId;
  try {
    projectId = parseStableId<"PROJECT">(input.projectId);
    missionId = parseStableId<"MISSION">(input.missionId);
  } catch {
    return fail("RECONCILIATION_SCOPE_INVALID");
  }
  if (
    input.claims.length > MAXIMUM_RECONCILIATION_CLAIMS ||
    input.supersessions.length > MAXIMUM_RECONCILIATION_SUPERSESSIONS
  ) {
    return fail("RECONCILIATION_LIMIT_EXCEEDED");
  }

  const claims = [...input.claims].sort((left, right) =>
    left.claimId.localeCompare(right.claimId, "en-US")
  );
  const claimsById = new Map<ClaimId, Claim>();
  for (const claim of claims) {
    await assertClaimEnvelope(claim, projectId, missionId);
    if (claimsById.has(claim.claimId)) {
      return fail("RECONCILIATION_INPUT_INVALID");
    }
    claimsById.set(claim.claimId, claim);
  }

  const successorByPredecessor = await validateSupersessions(
    claimsById,
    input.supersessions
  );
  const supersededClaimIds = Object.freeze(
    [...successorByPredecessor.keys()].sort((left, right) =>
      left.localeCompare(right, "en-US")
    )
  );
  const supersededClaims = new Set(supersededClaimIds);
  const activeClaimIds = Object.freeze(
    claims
      .filter((claim) => !supersededClaims.has(claim.claimId))
      .map((claim) => claim.claimId)
  );
  const comparisonRuleSet = await reconciliationRuleSetIdentity();
  const decisionPolicy = await reconciliationDecisionPolicyIdentity();
  const pairDecisions: ClaimPairDecision[] = [];
  const findings: ClaimReconciliationFinding[] = [];

  for (let leftIndex = 0; leftIndex < claims.length; leftIndex += 1) {
    const left = claims[leftIndex];
    if (left === undefined) return fail("RECONCILIATION_INPUT_INVALID");
    for (let rightIndex = leftIndex + 1; rightIndex < claims.length; rightIndex += 1) {
      const right = claims[rightIndex];
      if (right === undefined) return fail("RECONCILIATION_INPUT_INVALID");
      const claimIds = Object.freeze([left.claimId, right.claimId]) as readonly [
        ClaimId,
        ClaimId
      ];
      if (
        supersededClaims.has(left.claimId) ||
        supersededClaims.has(right.claimId)
      ) {
        pairDecisions.push(
          Object.freeze({
            claimIds,
            disposition: "SUPERSEDED_INACTIVE",
            reason: "EXPLICIT_VALID_SUPERSESSION"
          })
        );
        continue;
      }

      const comparison = compareClaims(left, right);
      const disposition = dispositionFor(comparison);
      pairDecisions.push(
        Object.freeze({
          claimIds,
          disposition,
          reason: comparison.reason,
          comparison
        })
      );
      if (disposition === "CONFLICT" || disposition === "AMBIGUOUS") {
        findings.push(
          await createFinding(
            left,
            right,
            disposition,
            comparison.reason,
            comparisonRuleSet.digest,
            decisionPolicy.digest
          )
        );
      }
    }
  }

  const resultWithoutDigest = Object.freeze({
    version: CLAIM_RECONCILIATION_VERSION,
    projectId,
    missionId,
    comparisonRuleSetVersion: comparisonRuleSet.version,
    comparisonRuleSetDigest: comparisonRuleSet.digest,
    decisionPolicyVersion: decisionPolicy.version,
    decisionPolicyDigest: decisionPolicy.digest,
    claimIds: Object.freeze(claims.map((claim) => claim.claimId)),
    activeClaimIds,
    supersededClaimIds,
    pairDecisions: Object.freeze(pairDecisions),
    findings: Object.freeze(findings)
  });
  return Object.freeze({
    ...resultWithoutDigest,
    resultDigest: await canonicalJsonDigest(resultWithoutDigest)
  });
}
