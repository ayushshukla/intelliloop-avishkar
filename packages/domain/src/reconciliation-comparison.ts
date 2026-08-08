import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  type Sha256Digest
} from "./digest.js";
import {
  CLAIM_COMPARISON_KEY_VERSION,
  type Claim,
  type ClaimApplicability
} from "./claim.js";

export const RECONCILIATION_RULE_SET_VERSION = "reconciliation-rules.v1";
export const CLAIM_APPLICABILITY_OVERLAP_VERSION =
  "claim-applicability-overlap.v1";
export const CLAIM_VALUE_COMPARISON_VERSION = "claim-value-comparison.v1";

export const CLAIM_APPLICABILITY_RELATIONS = ["OVERLAPS", "DISJOINT"] as const;
export const CLAIM_VALUE_RELATIONS = [
  "EQUIVALENT",
  "INCOMPATIBLE",
  "AMBIGUOUS"
] as const;
export const CLAIM_COMPARISON_RELATIONS = [
  "EQUIVALENT",
  "INCOMPATIBLE",
  "AMBIGUOUS",
  "NOT_COMPARABLE"
] as const;

export type ClaimApplicabilityRelation =
  (typeof CLAIM_APPLICABILITY_RELATIONS)[number];
export type ClaimValueRelation = (typeof CLAIM_VALUE_RELATIONS)[number];
export type ClaimComparisonRelation =
  (typeof CLAIM_COMPARISON_RELATIONS)[number];

export type ClaimApplicabilityReason =
  | "NO_DIMENSION_OR_TIME_CONFLICT"
  | "DIMENSION_VALUES_DIFFER"
  | "EFFECTIVE_INTERVALS_DO_NOT_OVERLAP";

export type ClaimValueReason =
  | "CANONICAL_VALUES_EQUAL"
  | "SCALAR_VALUES_DIFFER"
  | "UNKNOWN_VALUE_PRESENT"
  | "VALUE_TYPES_DIFFER_NO_COERCION"
  | "STRUCTURED_VALUE_POLICY_REQUIRED";

export type ClaimComparisonReason =
  | ClaimValueReason
  | "MISSION_SCOPE_DIFFERS"
  | "SUBJECT_OR_PREDICATE_DIFFERS"
  | "COMPARISON_KEY_DIFFERS"
  | "APPLICABILITY_DISJOINT";

export interface ClaimApplicabilityComparison {
  readonly relation: ClaimApplicabilityRelation;
  readonly reason: ClaimApplicabilityReason;
  readonly conflictingDimensions: readonly string[];
}

export interface ClaimValueComparison {
  readonly relation: ClaimValueRelation;
  readonly reason: ClaimValueReason;
}

export interface ClaimComparison {
  readonly ruleSetVersion: typeof RECONCILIATION_RULE_SET_VERSION;
  readonly relation: ClaimComparisonRelation;
  readonly reason: ClaimComparisonReason;
  readonly applicability?: ClaimApplicabilityComparison;
  readonly value?: ClaimValueComparison;
}

export interface ReconciliationRuleSetIdentity {
  readonly version: typeof RECONCILIATION_RULE_SET_VERSION;
  readonly digest: Sha256Digest;
}

export const RECONCILIATION_RULE_SET = Object.freeze({
  version: RECONCILIATION_RULE_SET_VERSION,
  comparisonKeyVersion: CLAIM_COMPARISON_KEY_VERSION,
  applicabilityOverlapVersion: CLAIM_APPLICABILITY_OVERLAP_VERSION,
  valueComparisonVersion: CLAIM_VALUE_COMPARISON_VERSION,
  subjectAndPredicate: "EXACT_NORMALIZED_MATCH",
  applicabilityDimensions: "NO_SHARED_DIMENSION_MAY_DISAGREE",
  effectiveIntervals: "HALF_OPEN",
  scalarValues: "CANONICAL_EXACT_MATCH",
  nullValues: "AMBIGUOUS_UNKNOWN",
  mixedTypes: "AMBIGUOUS_NO_COERCION",
  structuredValueDifferences: "AMBIGUOUS_REQUIRES_EXPLICIT_POLICY",
  fuzzyMatchingAuthority: "NONE"
} as const);

function dimensionMap(
  applicability: ClaimApplicability
): ReadonlyMap<string, string> {
  return new Map(
    applicability.dimensions.map((entry) => [entry.dimension, entry.value])
  );
}

function intervalsOverlap(
  left: ClaimApplicability,
  right: ClaimApplicability
): boolean {
  const leftStartsBeforeRightEnds =
    right.effectiveUntilUtc === undefined ||
    left.effectiveFromUtc === undefined ||
    left.effectiveFromUtc < right.effectiveUntilUtc;
  const rightStartsBeforeLeftEnds =
    left.effectiveUntilUtc === undefined ||
    right.effectiveFromUtc === undefined ||
    right.effectiveFromUtc < left.effectiveUntilUtc;
  return leftStartsBeforeRightEnds && rightStartsBeforeLeftEnds;
}

export function compareClaimApplicability(
  left: ClaimApplicability,
  right: ClaimApplicability
): ClaimApplicabilityComparison {
  const leftDimensions = dimensionMap(left);
  const rightDimensions = dimensionMap(right);
  const conflictingDimensions = [...leftDimensions.entries()]
    .filter(
      ([dimension, value]) =>
        rightDimensions.has(dimension) && rightDimensions.get(dimension) !== value
    )
    .map(([dimension]) => dimension)
    .sort((a, b) => a.localeCompare(b, "en-US"));

  if (conflictingDimensions.length > 0) {
    return Object.freeze({
      relation: "DISJOINT",
      reason: "DIMENSION_VALUES_DIFFER",
      conflictingDimensions: Object.freeze(conflictingDimensions)
    });
  }

  if (!intervalsOverlap(left, right)) {
    return Object.freeze({
      relation: "DISJOINT",
      reason: "EFFECTIVE_INTERVALS_DO_NOT_OVERLAP",
      conflictingDimensions: Object.freeze([])
    });
  }

  return Object.freeze({
    relation: "OVERLAPS",
    reason: "NO_DIMENSION_OR_TIME_CONFLICT",
    conflictingDimensions: Object.freeze([])
  });
}

function valueKind(value: JsonValue):
  | "NULL"
  | "BOOLEAN"
  | "NUMBER"
  | "STRING"
  | "ARRAY"
  | "OBJECT" {
  if (value === null) return "NULL";
  if (Array.isArray(value)) return "ARRAY";
  if (typeof value === "object") return "OBJECT";
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "number") return "NUMBER";
  return "STRING";
}

export function compareClaimValues(
  left: JsonValue,
  right: JsonValue
): ClaimValueComparison {
  if (canonicalizeJson(left) === canonicalizeJson(right)) {
    return Object.freeze({
      relation: "EQUIVALENT",
      reason: "CANONICAL_VALUES_EQUAL"
    });
  }

  const leftKind = valueKind(left);
  const rightKind = valueKind(right);
  if (leftKind === "NULL" || rightKind === "NULL") {
    return Object.freeze({
      relation: "AMBIGUOUS",
      reason: "UNKNOWN_VALUE_PRESENT"
    });
  }
  if (leftKind !== rightKind) {
    return Object.freeze({
      relation: "AMBIGUOUS",
      reason: "VALUE_TYPES_DIFFER_NO_COERCION"
    });
  }
  if (leftKind === "ARRAY" || leftKind === "OBJECT") {
    return Object.freeze({
      relation: "AMBIGUOUS",
      reason: "STRUCTURED_VALUE_POLICY_REQUIRED"
    });
  }
  return Object.freeze({
    relation: "INCOMPATIBLE",
    reason: "SCALAR_VALUES_DIFFER"
  });
}

export function compareClaims(left: Claim, right: Claim): ClaimComparison {
  if (left.projectId !== right.projectId || left.missionId !== right.missionId) {
    return Object.freeze({
      ruleSetVersion: RECONCILIATION_RULE_SET_VERSION,
      relation: "NOT_COMPARABLE",
      reason: "MISSION_SCOPE_DIFFERS"
    });
  }
  if (left.subject !== right.subject || left.predicate !== right.predicate) {
    return Object.freeze({
      ruleSetVersion: RECONCILIATION_RULE_SET_VERSION,
      relation: "NOT_COMPARABLE",
      reason: "SUBJECT_OR_PREDICATE_DIFFERS"
    });
  }
  if (left.comparisonKey !== right.comparisonKey) {
    return Object.freeze({
      ruleSetVersion: RECONCILIATION_RULE_SET_VERSION,
      relation: "NOT_COMPARABLE",
      reason: "COMPARISON_KEY_DIFFERS"
    });
  }

  const applicability = compareClaimApplicability(
    left.applicability,
    right.applicability
  );
  if (applicability.relation === "DISJOINT") {
    return Object.freeze({
      ruleSetVersion: RECONCILIATION_RULE_SET_VERSION,
      relation: "NOT_COMPARABLE",
      reason: "APPLICABILITY_DISJOINT",
      applicability
    });
  }

  const value = compareClaimValues(left.value, right.value);
  return Object.freeze({
    ruleSetVersion: RECONCILIATION_RULE_SET_VERSION,
    relation: value.relation,
    reason: value.reason,
    applicability,
    value
  });
}

export async function reconciliationRuleSetIdentity(): Promise<ReconciliationRuleSetIdentity> {
  return Object.freeze({
    version: RECONCILIATION_RULE_SET_VERSION,
    digest: await canonicalJsonDigest(RECONCILIATION_RULE_SET)
  });
}
