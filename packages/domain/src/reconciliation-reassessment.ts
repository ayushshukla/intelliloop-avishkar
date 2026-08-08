import {
  assertClaimInvariant,
  type Claim,
  type ClaimSupersession
} from "./claim.js";
import {
  CLAIM_RECONCILIATION_VERSION,
  MAXIMUM_RECONCILIATION_CLAIMS,
  RECONCILIATION_FINDING_KEY_VERSION,
  RECONCILIATION_DECISION_POLICY_VERSION,
  reconciliationDecisionPolicyIdentity,
  reconcileClaimSet,
  type ClaimReconciliationFinding
} from "./claim-reconciliation.js";
import { canonicalizeJson } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  sha256TextDigest,
  type Sha256Digest
} from "./digest.js";
import {
  assertEvidenceSourceInvariant,
  parseEvidenceSourceLocator,
  type EvidenceSource,
  type EvidenceSourceLocator
} from "./evidence-source.js";
import {
  assertGitSnapshotInvariant,
  type GitSnapshot,
  type GitSnapshotId
} from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  RECONCILIATION_RULE_SET_VERSION,
  reconciliationRuleSetIdentity
} from "./reconciliation-comparison.js";
import { parseStableId } from "./stable-id.js";
import {
  assertTwinProjectionRevisionInvariant,
  type TwinProjectedSourceType,
  type TwinProjectionMemberReference,
  type TwinProjectionRevision
} from "./twin-projection.js";
import {
  serializeTwinNode,
  serializeTwinRelationship,
  parseTwinRevision,
  type TwinNode,
  type TwinRelationship
} from "./twin-vocabulary.js";
import {
  assertValidationResultInvariant,
  parseValidationKey,
  type ValidationKey,
  type ValidationResult
} from "./validation-result.js";

export const RECONCILIATION_REASSESSMENT_VERSION =
  "reconciliation-reassessment.v1";
export const RECONCILIATION_REASSESSMENT_DIGEST_VERSION =
  "reconciliation-reassessment-digest.v1";
export const RECONCILIATION_REASSESSMENT_KEY_VERSION =
  "reconciliation-reassessment-key.v1";
export const RECONCILIATION_SUPPORT_POLICY_VERSION =
  "reconciliation-support-policy.v1";
export const RECONCILIATION_SUPPORT_REQUIREMENTS_VERSION =
  "reconciliation-support-requirements.v1";
export const RECONCILIATION_MISSING_FINDING_KEY_VERSION =
  "reconciliation-missing-finding-key.v1";
export const RECONCILIATION_STALE_FINDING_KEY_VERSION =
  "reconciliation-stale-finding-key.v1";

export const MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS = 50;
export const MAXIMUM_RECONCILIATION_EVIDENCE_SOURCES = 500;
export const MAXIMUM_RECONCILIATION_VALIDATION_RESULTS = 500;
export const MAXIMUM_RECONCILIATION_DEPENDENCIES = 1_000;
export const MAXIMUM_RECONCILIATION_REASSESSMENT_SERIALIZED_BYTES =
  16_777_216;

export const RECONCILIATION_SUPPORT_KINDS = [
  "EVIDENCE_SOURCE",
  "VALIDATION_RESULT"
] as const;
export const RECONCILIATION_DEPENDENCY_KINDS = [
  "SOURCE",
  "SNAPSHOT",
  "RELATIONSHIP",
  "VALIDATION",
  "RULE_SET",
  "DECISION_POLICY",
  "REQUIREMENT_SET",
  "CLAIM_RECONCILIATION"
] as const;
export const RECONCILIATION_DEPENDENCY_CHANGE_TYPES = [
  "ADDED",
  "CHANGED",
  "REMOVED"
] as const;
export const REASSESSMENT_ERROR_CODES = [
  "REASSESSMENT_SCOPE_INVALID",
  "REASSESSMENT_INPUT_INVALID",
  "REASSESSMENT_TWIN_INVALID",
  "REASSESSMENT_REQUIREMENT_INVALID",
  "REASSESSMENT_LIMIT_EXCEEDED",
  "REASSESSMENT_PREDECESSOR_INVALID",
  "REASSESSMENT_SERIALIZATION_INVALID",
  "REASSESSMENT_INTEGRITY_INVALID"
] as const;

export type ReconciliationSupportKind =
  (typeof RECONCILIATION_SUPPORT_KINDS)[number];
export type ReconciliationDependencyKind =
  (typeof RECONCILIATION_DEPENDENCY_KINDS)[number];
export type ReconciliationDependencyChangeType =
  (typeof RECONCILIATION_DEPENDENCY_CHANGE_TYPES)[number];
export type ReassessmentErrorCode =
  (typeof REASSESSMENT_ERROR_CODES)[number];

export const RECONCILIATION_SUPPORT_POLICY = Object.freeze({
  version: RECONCILIATION_SUPPORT_POLICY_VERSION,
  requirementAuthority: "EXPLICIT_DECLARATION_ONLY",
  evidenceMatch: "EXACT_NORMALIZED_SOURCE_LOCATOR",
  validationMatch: "EXACT_VALIDATION_KEY_AND_TARGET_SNAPSHOT",
  validationPresence: "STATUS_DOES_NOT_CHANGE_PRESENCE",
  missingRule: "NO_MATCHING_CURRENT_SUPPORT",
  dependencyStaleness: "EXACT_DEPENDENCY_DIFF_ONLY",
  unrelatedTwinChange: "REASSESS_WITHOUT_STALING_PREDECESSOR",
  historyMutation: "NONE",
  aiAuthority: "NONE"
} as const);

export interface ReconciliationSupportPolicyIdentity {
  readonly version: typeof RECONCILIATION_SUPPORT_POLICY_VERSION;
  readonly digest: Sha256Digest;
}

export interface EvidenceSupportRequirementInput {
  readonly requirementId: string;
  readonly supportKind: "EVIDENCE_SOURCE";
  readonly sourceLocator: string;
}

export interface ValidationSupportRequirementInput {
  readonly requirementId: string;
  readonly supportKind: "VALIDATION_RESULT";
  readonly validationKey: string;
}

export type ReconciliationSupportRequirementInput =
  | EvidenceSupportRequirementInput
  | ValidationSupportRequirementInput;

export interface EvidenceSupportRequirement {
  readonly requirementId: ValidationKey;
  readonly supportKind: "EVIDENCE_SOURCE";
  readonly sourceLocator: EvidenceSourceLocator;
}

export interface ValidationSupportRequirement {
  readonly requirementId: ValidationKey;
  readonly supportKind: "VALIDATION_RESULT";
  readonly validationKey: ValidationKey;
}

export type ReconciliationSupportRequirement =
  | EvidenceSupportRequirement
  | ValidationSupportRequirement;

export interface ReconciliationDependency {
  readonly dependencyKind: ReconciliationDependencyKind;
  readonly dependencyKey: string;
  readonly digest: Sha256Digest;
  readonly twinMember?: TwinProjectionMemberReference;
}

export interface ReconciliationDependencyChange {
  readonly changeType: ReconciliationDependencyChangeType;
  readonly dependencyKind: ReconciliationDependencyKind;
  readonly dependencyKey: string;
  readonly beforeDigest?: Sha256Digest;
  readonly afterDigest?: Sha256Digest;
}

export interface MissingSupportFinding {
  readonly entityType: "ReconciliationFinding";
  readonly findingKind: "MISSING";
  readonly status: "OPEN";
  readonly findingKeyVersion: typeof RECONCILIATION_MISSING_FINDING_KEY_VERSION;
  readonly findingKey: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly requirement: ReconciliationSupportRequirement;
  readonly reason:
    | "REQUIRED_EVIDENCE_ABSENT"
    | "REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT";
  readonly targetSnapshotId: GitSnapshotId;
  readonly requirementsDigest: Sha256Digest;
  readonly supportPolicyVersion: typeof RECONCILIATION_SUPPORT_POLICY_VERSION;
  readonly supportPolicyDigest: Sha256Digest;
}

export interface StaleReconciliationFinding {
  readonly entityType: "ReconciliationFinding";
  readonly findingKind: "STALE";
  readonly status: "OPEN";
  readonly findingKeyVersion: typeof RECONCILIATION_STALE_FINDING_KEY_VERSION;
  readonly findingKey: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly predecessorRevision: number;
  readonly predecessorDigest: Sha256Digest;
  readonly dependencyChanges: readonly ReconciliationDependencyChange[];
  readonly reason: "EXACT_DEPENDENCY_CHANGED";
}

export interface ReconciliationReassessmentPredecessor {
  readonly reassessmentKey: Sha256Digest;
  readonly revision: number;
  readonly resultDigest: Sha256Digest;
}

export interface ReconciliationReassessmentResult {
  readonly version: typeof RECONCILIATION_REASSESSMENT_VERSION;
  readonly digestVersion: typeof RECONCILIATION_REASSESSMENT_DIGEST_VERSION;
  readonly reassessmentKey: Sha256Digest;
  readonly revision: number;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly twinBinding: {
    readonly projectionId: TwinProjectionRevision["projectionId"];
    readonly revision: TwinProjectionRevision["revision"];
    readonly projectionDigest: Sha256Digest;
  };
  readonly targetSnapshotId: GitSnapshotId;
  readonly claimReconciliationVersion: typeof CLAIM_RECONCILIATION_VERSION;
  readonly claimReconciliationDigest: Sha256Digest;
  readonly supportPolicyVersion: typeof RECONCILIATION_SUPPORT_POLICY_VERSION;
  readonly supportPolicyDigest: Sha256Digest;
  readonly requirementsDigest: Sha256Digest;
  readonly dependencies: readonly ReconciliationDependency[];
  readonly inputDigest: Sha256Digest;
  readonly claimFindings: readonly ClaimReconciliationFinding[];
  readonly missingFindings: readonly MissingSupportFinding[];
  readonly predecessor?: ReconciliationReassessmentPredecessor;
  readonly stalePredecessorFinding?: StaleReconciliationFinding;
  readonly resultDigest: Sha256Digest;
}

export interface ReassessReconciliationInput {
  readonly twin: TwinProjectionRevision;
  readonly evidenceSources: readonly EvidenceSource[];
  readonly claims: readonly Claim[];
  readonly claimSupersessions: readonly ClaimSupersession[];
  readonly targetSnapshot: GitSnapshot;
  readonly validationResults: readonly ValidationResult[];
  readonly requirements: readonly ReconciliationSupportRequirementInput[];
}

const ERROR_MESSAGES: Readonly<Record<ReassessmentErrorCode, string>> =
  Object.freeze({
    REASSESSMENT_SCOPE_INVALID: "Reassessment scope is invalid.",
    REASSESSMENT_INPUT_INVALID: "Reassessment input is invalid.",
    REASSESSMENT_TWIN_INVALID: "Reassessment Twin input is invalid.",
    REASSESSMENT_REQUIREMENT_INVALID:
      "Reassessment support requirement is invalid.",
    REASSESSMENT_LIMIT_EXCEEDED: "Reassessment input exceeds a fixed limit.",
    REASSESSMENT_PREDECESSOR_INVALID:
      "Reassessment predecessor is invalid.",
    REASSESSMENT_SERIALIZATION_INVALID:
      "Reassessment serialization is invalid.",
    REASSESSMENT_INTEGRITY_INVALID: "Reassessment integrity is invalid."
  });

export class ReassessmentError extends Error {
  readonly code: ReassessmentErrorCode;

  constructor(code: ReassessmentErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReassessmentError";
    this.code = code;
  }
}

function fail(code: ReassessmentErrorCode): never {
  throw new ReassessmentError(code);
}

function positiveRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return fail("REASSESSMENT_PREDECESSOR_INVALID");
  }
  return value as number;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  code: ReassessmentErrorCode
): Record<string, unknown> {
  if (!plainRecord(value)) return fail(code);
  const allowed = new Set([...required, ...optional]);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.has(key)) ||
    keys.some((key) => {
      if (typeof key !== "string") return true;
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      );
    }) ||
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    return fail(code);
  }
  return value;
}

function boundedArray(
  value: unknown,
  maximum: number,
  code: ReassessmentErrorCode
): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) return fail(code);
  return value;
}

function strictlySorted(values: readonly string[]): boolean {
  return values.every(
    (value, index) =>
      index === 0 ||
      (values[index - 1]?.localeCompare(value, "en-US") ?? -1) < 0
  );
}

function deepFreezeJson<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreezeJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

function parseRequirements(
  inputs: readonly ReconciliationSupportRequirementInput[]
): readonly ReconciliationSupportRequirement[] {
  if (inputs.length > MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS) {
    return fail("REASSESSMENT_LIMIT_EXCEEDED");
  }
  try {
    const requirements = inputs.map((input) => {
      const requirementId = parseValidationKey(input.requirementId);
      if (input.supportKind === "EVIDENCE_SOURCE") {
        return Object.freeze({
          requirementId,
          supportKind: input.supportKind,
          sourceLocator: parseEvidenceSourceLocator(input.sourceLocator)
        });
      }
      if (input.supportKind === "VALIDATION_RESULT") {
        return Object.freeze({
          requirementId,
          supportKind: input.supportKind,
          validationKey: parseValidationKey(input.validationKey)
        });
      }
      return fail("REASSESSMENT_REQUIREMENT_INVALID");
    });
    requirements.sort((left, right) =>
      left.requirementId.localeCompare(right.requirementId, "en-US")
    );
    if (
      requirements.some(
        (requirement, index) =>
          index > 0 &&
          requirement.requirementId === requirements[index - 1]?.requirementId
      )
    ) {
      return fail("REASSESSMENT_REQUIREMENT_INVALID");
    }
    return Object.freeze(requirements);
  } catch (error) {
    if (error instanceof ReassessmentError) throw error;
    return fail("REASSESSMENT_REQUIREMENT_INVALID");
  }
}

function snapshotProjectionDocument(snapshot: GitSnapshot) {
  return {
    sourceType: "GitSnapshot",
    snapshotId: snapshot.snapshotId,
    projectId: snapshot.projectId,
    missionId: snapshot.missionId,
    registrationId: snapshot.registrationId,
    capturedAtUtc: snapshot.capturedAtUtc,
    headState: snapshot.headState,
    branchName: snapshot.branchName ?? null,
    headCommit: snapshot.headCommit ?? null,
    dirty: snapshot.dirty,
    indexChangeCount: snapshot.indexChangeCount,
    worktreeChangeCount: snapshot.worktreeChangeCount,
    untrackedFileCount: snapshot.untrackedFileCount,
    changedFileCount: snapshot.changedFileCount,
    changedFilesDigest: snapshot.changedFilesDigest
  };
}

function freezeMember(
  kind: "NODE" | "RELATIONSHIP",
  memberId: TwinProjectionMemberReference["memberId"],
  revision: TwinProjectionMemberReference["revision"],
  digest: Sha256Digest
): TwinProjectionMemberReference {
  return Object.freeze({ kind, memberId, revision, digest });
}

async function nodeReference(node: TwinNode): Promise<TwinProjectionMemberReference> {
  return freezeMember(
    "NODE",
    node.nodeId,
    node.revision,
    await sha256TextDigest(serializeTwinNode(node))
  );
}

async function relationshipReference(
  twin: TwinProjectionRevision,
  relationship: TwinRelationship
): Promise<TwinProjectionMemberReference> {
  const from = twin.nodes.find(
    (node) =>
      node.nodeId === relationship.from.nodeId &&
      node.revision === relationship.from.revision
  );
  const to = twin.nodes.find(
    (node) =>
      node.nodeId === relationship.to.nodeId &&
      node.revision === relationship.to.revision
  );
  if (from === undefined || to === undefined) {
    return fail("REASSESSMENT_TWIN_INVALID");
  }
  return freezeMember(
    "RELATIONSHIP",
    relationship.relationshipId,
    relationship.revision,
    await sha256TextDigest(serializeTwinRelationship(relationship, from, to))
  );
}

function sourceBindingKey(sourceType: TwinProjectedSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

async function requireSourceDependency(
  twin: TwinProjectionRevision,
  sourceType: TwinProjectedSourceType,
  sourceId: string,
  expectedSourceDigest: Sha256Digest,
  dependencyKind: ReconciliationDependencyKind
): Promise<ReconciliationDependency> {
  const bindings = twin.nodeSources.filter(
    (binding) =>
      binding.sourceType === sourceType && binding.sourceId === sourceId
  );
  if (
    bindings.length !== 1 ||
    bindings[0]?.sourceDigest !== expectedSourceDigest
  ) {
    return fail("REASSESSMENT_TWIN_INVALID");
  }
  const binding = bindings[0];
  const nodes = twin.nodes.filter(
    (node) =>
      node.nodeId === binding.nodeId && node.revision === binding.nodeRevision
  );
  const node = nodes[0];
  if (nodes.length !== 1 || node === undefined || node.nodeType !== sourceType) {
    return fail("REASSESSMENT_TWIN_INVALID");
  }
  const twinMember = await nodeReference(node);
  return Object.freeze({
    dependencyKind,
    dependencyKey: `twin-source:${sourceBindingKey(sourceType, sourceId)}`,
    digest: twinMember.digest,
    twinMember
  });
}

async function requireSupersessionDependency(
  twin: TwinProjectionRevision,
  link: ClaimSupersession
): Promise<ReconciliationDependency> {
  const predecessorBinding = twin.nodeSources.find(
    (binding) =>
      binding.sourceType === "Claim" &&
      binding.sourceId === link.predecessorClaimId
  );
  const successorBinding = twin.nodeSources.find(
    (binding) =>
      binding.sourceType === "Claim" && binding.sourceId === link.successorClaimId
  );
  if (predecessorBinding === undefined || successorBinding === undefined) {
    return fail("REASSESSMENT_TWIN_INVALID");
  }
  const relationships = twin.relationships.filter(
    (relationship) =>
      relationship.relationshipType === "SUPERSEDES" &&
      relationship.from.nodeId === successorBinding.nodeId &&
      relationship.from.revision === successorBinding.nodeRevision &&
      relationship.to.nodeId === predecessorBinding.nodeId &&
      relationship.to.revision === predecessorBinding.nodeRevision
  );
  const relationship = relationships[0];
  if (relationships.length !== 1 || relationship === undefined) {
    return fail("REASSESSMENT_TWIN_INVALID");
  }
  const twinMember = await relationshipReference(twin, relationship);
  return Object.freeze({
    dependencyKind: "RELATIONSHIP",
    dependencyKey: `twin-supersession:${link.claimSupersessionId}`,
    digest: twinMember.digest,
    twinMember
  });
}

function addDependency(
  values: Map<string, ReconciliationDependency>,
  dependency: ReconciliationDependency
): void {
  const prior = values.get(dependency.dependencyKey);
  if (prior !== undefined && prior.digest !== dependency.digest) {
    return fail("REASSESSMENT_INPUT_INVALID");
  }
  values.set(dependency.dependencyKey, dependency);
  if (values.size > MAXIMUM_RECONCILIATION_DEPENDENCIES) {
    return fail("REASSESSMENT_LIMIT_EXCEEDED");
  }
}

function dependencyMap(
  values: readonly ReconciliationDependency[]
): ReadonlyMap<string, ReconciliationDependency> {
  const map = new Map<string, ReconciliationDependency>();
  for (const value of values) {
    parseSha256Digest(value.digest);
    if (
      !RECONCILIATION_DEPENDENCY_KINDS.some(
        (kind) => kind === value.dependencyKind
      ) ||
      value.dependencyKey.length === 0 ||
      map.has(value.dependencyKey)
    ) {
      return fail("REASSESSMENT_INPUT_INVALID");
    }
    map.set(value.dependencyKey, value);
  }
  return map;
}

export function diffReconciliationDependencies(
  before: readonly ReconciliationDependency[],
  after: readonly ReconciliationDependency[]
): readonly ReconciliationDependencyChange[] {
  const beforeMap = dependencyMap(before);
  const afterMap = dependencyMap(after);
  const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort(
    (left, right) => left.localeCompare(right, "en-US")
  );
  const changes: ReconciliationDependencyChange[] = [];
  for (const dependencyKey of keys) {
    const beforeValue = beforeMap.get(dependencyKey);
    const afterValue = afterMap.get(dependencyKey);
    if (beforeValue?.digest === afterValue?.digest) continue;
    const dependencyKind =
      beforeValue?.dependencyKind ??
      afterValue?.dependencyKind ??
      fail("REASSESSMENT_INPUT_INVALID");
    if (
      beforeValue !== undefined &&
      afterValue !== undefined &&
      beforeValue.dependencyKind !== afterValue.dependencyKind
    ) {
      return fail("REASSESSMENT_INPUT_INVALID");
    }
    changes.push(
      Object.freeze({
        changeType:
          beforeValue === undefined
            ? "ADDED"
            : afterValue === undefined
              ? "REMOVED"
              : "CHANGED",
        dependencyKind,
        dependencyKey,
        ...(beforeValue === undefined
          ? {}
          : { beforeDigest: beforeValue.digest }),
        ...(afterValue === undefined ? {} : { afterDigest: afterValue.digest })
      })
    );
  }
  return Object.freeze(changes);
}

export async function reconciliationSupportPolicyIdentity(): Promise<ReconciliationSupportPolicyIdentity> {
  return Object.freeze({
    version: RECONCILIATION_SUPPORT_POLICY_VERSION,
    digest: await canonicalJsonDigest(RECONCILIATION_SUPPORT_POLICY)
  });
}

async function reassessmentKey(
  projectId: ProjectId,
  missionId: MissionId
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: RECONCILIATION_REASSESSMENT_KEY_VERSION,
    projectId,
    missionId
  });
}

async function assertPrevious(
  previous: ReconciliationReassessmentResult,
  expectedKey: Sha256Digest,
  projectId: ProjectId,
  missionId: MissionId
): Promise<void> {
  try {
    if (
      previous.version !== RECONCILIATION_REASSESSMENT_VERSION ||
      previous.digestVersion !== RECONCILIATION_REASSESSMENT_DIGEST_VERSION ||
      previous.reassessmentKey !== expectedKey ||
      previous.projectId !== projectId ||
      previous.missionId !== missionId
    ) {
      return fail("REASSESSMENT_PREDECESSOR_INVALID");
    }
    positiveRevision(previous.revision);
    parseSha256Digest(previous.resultDigest);
    dependencyMap(previous.dependencies);
    const { resultDigest: _resultDigest, ...withoutDigest } = previous;
    if (
      (await canonicalJsonDigest(withoutDigest)) !== previous.resultDigest
    ) {
      return fail("REASSESSMENT_PREDECESSOR_INVALID");
    }
  } catch (error) {
    if (error instanceof ReassessmentError) throw error;
    return fail("REASSESSMENT_PREDECESSOR_INVALID");
  }
}

async function missingFinding(
  projectId: ProjectId,
  missionId: MissionId,
  requirement: ReconciliationSupportRequirement,
  targetSnapshotId: GitSnapshotId,
  requirementsDigest: Sha256Digest,
  supportPolicy: ReconciliationSupportPolicyIdentity
): Promise<MissingSupportFinding> {
  const reason =
    requirement.supportKind === "EVIDENCE_SOURCE"
      ? "REQUIRED_EVIDENCE_ABSENT" as const
      : "REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT" as const;
  const findingKey = await canonicalJsonDigest({
    version: RECONCILIATION_MISSING_FINDING_KEY_VERSION,
    scope: { projectId, missionId },
    requirement,
    targetSnapshotId,
    requirementsDigest,
    supportPolicy
  });
  return Object.freeze({
    entityType: "ReconciliationFinding",
    findingKind: "MISSING",
    status: "OPEN",
    findingKeyVersion: RECONCILIATION_MISSING_FINDING_KEY_VERSION,
    findingKey,
    projectId,
    missionId,
    requirement,
    reason,
    targetSnapshotId,
    requirementsDigest,
    supportPolicyVersion: supportPolicy.version,
    supportPolicyDigest: supportPolicy.digest
  });
}

async function staleFinding(
  projectId: ProjectId,
  missionId: MissionId,
  previous: ReconciliationReassessmentResult,
  changes: readonly ReconciliationDependencyChange[]
): Promise<StaleReconciliationFinding> {
  const findingKey = await canonicalJsonDigest({
    version: RECONCILIATION_STALE_FINDING_KEY_VERSION,
    scope: { projectId, missionId },
    predecessorRevision: previous.revision,
    predecessorDigest: previous.resultDigest,
    dependencyChanges: changes
  });
  return Object.freeze({
    entityType: "ReconciliationFinding",
    findingKind: "STALE",
    status: "OPEN",
    findingKeyVersion: RECONCILIATION_STALE_FINDING_KEY_VERSION,
    findingKey,
    projectId,
    missionId,
    predecessorRevision: previous.revision,
    predecessorDigest: previous.resultDigest,
    dependencyChanges: changes,
    reason: "EXACT_DEPENDENCY_CHANGED"
  });
}

export async function reassessReconciliation(
  input: ReassessReconciliationInput,
  previous?: ReconciliationReassessmentResult
): Promise<ReconciliationReassessmentResult> {
  if (
    input.evidenceSources.length > MAXIMUM_RECONCILIATION_EVIDENCE_SOURCES ||
    input.validationResults.length >
      MAXIMUM_RECONCILIATION_VALIDATION_RESULTS
  ) {
    return fail("REASSESSMENT_LIMIT_EXCEEDED");
  }
  try {
    await assertTwinProjectionRevisionInvariant(input.twin);
  } catch {
    return fail("REASSESSMENT_TWIN_INVALID");
  }
  try {
    assertGitSnapshotInvariant(input.targetSnapshot);
  } catch {
    return fail("REASSESSMENT_INPUT_INVALID");
  }
  const projectId = parseStableId<"PROJECT">(input.twin.projectId);
  const missionId = parseStableId<"MISSION">(input.twin.missionId);
  if (
    input.targetSnapshot.projectId !== projectId ||
    input.targetSnapshot.missionId !== missionId
  ) {
    return fail("REASSESSMENT_SCOPE_INVALID");
  }

  const evidenceById = new Map<string, EvidenceSource>();
  for (const source of input.evidenceSources) {
    try {
      await assertEvidenceSourceInvariant(source);
    } catch {
      return fail("REASSESSMENT_INPUT_INVALID");
    }
    if (
      source.projectId !== projectId ||
      source.missionId !== missionId ||
      evidenceById.has(source.evidenceSourceId)
    ) {
      return fail("REASSESSMENT_SCOPE_INVALID");
    }
    evidenceById.set(source.evidenceSourceId, source);
  }

  const predecessorBySuccessor = new Map<string, Claim>();
  const claimsById = new Map(input.claims.map((claim) => [claim.claimId, claim]));
  for (const link of input.claimSupersessions) {
    const predecessor = claimsById.get(link.predecessorClaimId);
    if (predecessor === undefined) return fail("REASSESSMENT_INPUT_INVALID");
    predecessorBySuccessor.set(link.successorClaimId, predecessor);
  }
  for (const claim of input.claims) {
    const source = evidenceById.get(claim.evidenceSourceId);
    if (source === undefined) return fail("REASSESSMENT_INPUT_INVALID");
    try {
      await assertClaimInvariant(
        claim,
        source,
        predecessorBySuccessor.get(claim.claimId)
      );
    } catch {
      return fail("REASSESSMENT_INPUT_INVALID");
    }
  }

  const validationById = new Map<string, ValidationResult>();
  for (const result of input.validationResults) {
    const source = evidenceById.get(result.evidenceSourceId);
    if (
      source === undefined ||
      result.snapshotId !== input.targetSnapshot.snapshotId ||
      validationById.has(result.validationResultId)
    ) {
      return fail("REASSESSMENT_INPUT_INVALID");
    }
    try {
      await assertValidationResultInvariant(
        result,
        source,
        input.targetSnapshot
      );
    } catch {
      return fail("REASSESSMENT_INPUT_INVALID");
    }
    validationById.set(result.validationResultId, result);
  }

  const requirements = parseRequirements(input.requirements);
  const requirementsDigest = await canonicalJsonDigest({
    version: RECONCILIATION_SUPPORT_REQUIREMENTS_VERSION,
    requirements
  });
  const supportPolicy = await reconciliationSupportPolicyIdentity();
  const claimReconciliation = await reconcileClaimSet({
    projectId,
    missionId,
    claims: input.claims,
    supersessions: input.claimSupersessions
  });
  const dependencies = new Map<string, ReconciliationDependency>();
  addDependency(
    dependencies,
    Object.freeze({
      dependencyKind: "CLAIM_RECONCILIATION",
      dependencyKey: "claim-reconciliation:current",
      digest: claimReconciliation.resultDigest
    })
  );
  addDependency(
    dependencies,
    Object.freeze({
      dependencyKind: "RULE_SET",
      dependencyKey: `rule-set:${RECONCILIATION_RULE_SET_VERSION}`,
      digest: claimReconciliation.comparisonRuleSetDigest
    })
  );
  addDependency(
    dependencies,
    Object.freeze({
      dependencyKind: "DECISION_POLICY",
      dependencyKey: `decision-policy:${RECONCILIATION_DECISION_POLICY_VERSION}`,
      digest: claimReconciliation.decisionPolicyDigest
    })
  );
  addDependency(
    dependencies,
    Object.freeze({
      dependencyKind: "REQUIREMENT_SET",
      dependencyKey: `requirement-set:${RECONCILIATION_SUPPORT_REQUIREMENTS_VERSION}`,
      digest: requirementsDigest
    })
  );

  for (const claim of input.claims) {
    addDependency(
      dependencies,
      await requireSourceDependency(
        input.twin,
        "Claim",
        claim.claimId,
        claim.claimDigest,
        "SOURCE"
      )
    );
    const source = evidenceById.get(claim.evidenceSourceId);
    if (source === undefined) return fail("REASSESSMENT_INPUT_INVALID");
    addDependency(
      dependencies,
      await requireSourceDependency(
        input.twin,
        "EvidenceSource",
        source.evidenceSourceId,
        source.importKey,
        "SOURCE"
      )
    );
  }
  for (const link of input.claimSupersessions) {
    addDependency(
      dependencies,
      await requireSupersessionDependency(input.twin, link)
    );
  }
  const snapshotDigest = await canonicalJsonDigest(
    snapshotProjectionDocument(input.targetSnapshot)
  );
  addDependency(
    dependencies,
    await requireSourceDependency(
      input.twin,
      "GitSnapshot",
      input.targetSnapshot.snapshotId,
      snapshotDigest,
      "SNAPSHOT"
    )
  );

  const missingFindings: MissingSupportFinding[] = [];
  for (const requirement of requirements) {
    if (requirement.supportKind === "EVIDENCE_SOURCE") {
      const matches = input.evidenceSources.filter(
        (source) => source.sourceLocator === requirement.sourceLocator
      );
      for (const source of matches) {
        addDependency(
          dependencies,
          await requireSourceDependency(
            input.twin,
            "EvidenceSource",
            source.evidenceSourceId,
            source.importKey,
            "SOURCE"
          )
        );
      }
      if (matches.length === 0) {
        missingFindings.push(
          await missingFinding(
            projectId,
            missionId,
            requirement,
            input.targetSnapshot.snapshotId,
            requirementsDigest,
            supportPolicy
          )
        );
      }
      continue;
    }
    const matches = input.validationResults.filter(
      (result) => result.validationKey === requirement.validationKey
    );
    for (const result of matches) {
      addDependency(
        dependencies,
        await requireSourceDependency(
          input.twin,
          "ValidationResult",
          result.validationResultId,
          result.resultDigest,
          "VALIDATION"
        )
      );
      const source = evidenceById.get(result.evidenceSourceId);
      if (source === undefined) return fail("REASSESSMENT_INPUT_INVALID");
      addDependency(
        dependencies,
        await requireSourceDependency(
          input.twin,
          "EvidenceSource",
          source.evidenceSourceId,
          source.importKey,
          "SOURCE"
        )
      );
    }
    if (matches.length === 0) {
      missingFindings.push(
        await missingFinding(
          projectId,
          missionId,
          requirement,
          input.targetSnapshot.snapshotId,
          requirementsDigest,
          supportPolicy
        )
      );
    }
  }

  const orderedDependencies = Object.freeze(
    [...dependencies.values()].sort((left, right) =>
      left.dependencyKey.localeCompare(right.dependencyKey, "en-US")
    )
  );
  const key = await reassessmentKey(projectId, missionId);
  if (previous !== undefined) {
    await assertPrevious(previous, key, projectId, missionId);
  }
  const twinBinding = Object.freeze({
    projectionId: input.twin.projectionId,
    revision: input.twin.revision,
    projectionDigest: input.twin.projectionDigest
  });
  const inputDigest = await canonicalJsonDigest({
    version: RECONCILIATION_REASSESSMENT_VERSION,
    scope: { projectId, missionId },
    twinBinding,
    targetSnapshotId: input.targetSnapshot.snapshotId,
    claimReconciliationDigest: claimReconciliation.resultDigest,
    supportPolicy,
    requirementsDigest,
    dependencies: orderedDependencies
  });
  if (previous?.inputDigest === inputDigest) return previous;

  const revision = previous === undefined ? 1 : positiveRevision(previous.revision) + 1;
  const predecessor =
    previous === undefined
      ? undefined
      : Object.freeze({
          reassessmentKey: previous.reassessmentKey,
          revision: previous.revision,
          resultDigest: previous.resultDigest
        });
  const dependencyChanges =
    previous === undefined
      ? Object.freeze([])
      : diffReconciliationDependencies(
          previous.dependencies,
          orderedDependencies
        );
  const stalePredecessorFinding =
    previous === undefined || dependencyChanges.length === 0
      ? undefined
      : await staleFinding(
          projectId,
          missionId,
          previous,
          dependencyChanges
        );
  const withoutDigest = Object.freeze({
    version: RECONCILIATION_REASSESSMENT_VERSION,
    digestVersion: RECONCILIATION_REASSESSMENT_DIGEST_VERSION,
    reassessmentKey: key,
    revision,
    projectId,
    missionId,
    twinBinding,
    targetSnapshotId: input.targetSnapshot.snapshotId,
    claimReconciliationVersion: CLAIM_RECONCILIATION_VERSION,
    claimReconciliationDigest: claimReconciliation.resultDigest,
    supportPolicyVersion: supportPolicy.version,
    supportPolicyDigest: supportPolicy.digest,
    requirementsDigest,
    dependencies: orderedDependencies,
    inputDigest,
    claimFindings: claimReconciliation.findings,
    missingFindings: Object.freeze(missingFindings),
    ...(predecessor === undefined ? {} : { predecessor }),
    ...(stalePredecessorFinding === undefined
      ? {}
      : { stalePredecessorFinding })
  });
  const result = Object.freeze({
    ...withoutDigest,
    resultDigest: await canonicalJsonDigest(withoutDigest)
  });
  await assertPrevious(result, key, projectId, missionId);
  return result;
}

function parseStoredMemberReference(value: unknown): void {
  const member = exactRecord(
    value,
    ["kind", "memberId", "revision", "digest"],
    [],
    "REASSESSMENT_INTEGRITY_INVALID"
  );
  if (member.kind !== "NODE" && member.kind !== "RELATIONSHIP") {
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
  try {
    parseStableId(member.memberId);
    parseTwinRevision(member.revision);
    parseSha256Digest(member.digest);
  } catch {
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
}

async function assertStoredClaimFinding(
  value: unknown,
  projectId: ProjectId,
  missionId: MissionId,
  comparisonRuleSetDigest: Sha256Digest,
  decisionPolicyDigest: Sha256Digest
): Promise<string> {
  const finding = exactRecord(
    value,
    [
      "entityType",
      "findingKeyVersion",
      "findingKey",
      "findingKind",
      "status",
      "projectId",
      "missionId",
      "claimIds",
      "claimDigests",
      "comparisonKey",
      "reason",
      "comparisonRuleSetVersion",
      "comparisonRuleSetDigest",
      "decisionPolicyVersion",
      "decisionPolicyDigest"
    ],
    [],
    "REASSESSMENT_INTEGRITY_INVALID"
  );
  const claimIds = boundedArray(
    finding.claimIds,
    2,
    "REASSESSMENT_INTEGRITY_INVALID"
  );
  const claimDigests = boundedArray(
    finding.claimDigests,
    2,
    "REASSESSMENT_INTEGRITY_INVALID"
  );
  if (
    finding.entityType !== "ReconciliationFinding" ||
    finding.findingKeyVersion !== RECONCILIATION_FINDING_KEY_VERSION ||
    (finding.findingKind !== "CONFLICT" &&
      finding.findingKind !== "AMBIGUOUS") ||
    finding.status !== "OPEN" ||
    finding.projectId !== projectId ||
    finding.missionId !== missionId ||
    claimIds.length !== 2 ||
    claimDigests.length !== 2 ||
    typeof finding.reason !== "string" ||
    finding.reason.length === 0 ||
    finding.comparisonRuleSetVersion !== RECONCILIATION_RULE_SET_VERSION ||
    finding.comparisonRuleSetDigest !== comparisonRuleSetDigest ||
    finding.decisionPolicyVersion !== RECONCILIATION_DECISION_POLICY_VERSION ||
    finding.decisionPolicyDigest !== decisionPolicyDigest
  ) {
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
  try {
    const parsedClaimIds = claimIds.map((claimId) =>
      parseStableId<"CLAIM">(claimId)
    );
    if (!strictlySorted(parsedClaimIds)) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }
    claimDigests.forEach(parseSha256Digest);
    parseSha256Digest(finding.findingKey);
    parseSha256Digest(finding.comparisonKey);
    const expected = await canonicalJsonDigest({
      version: RECONCILIATION_FINDING_KEY_VERSION,
      scope: { projectId, missionId },
      findingKind: finding.findingKind,
      claimIds: parsedClaimIds,
      claimDigests,
      comparisonKey: finding.comparisonKey,
      reason: finding.reason,
      comparisonRuleSet: {
        version: RECONCILIATION_RULE_SET_VERSION,
        digest: comparisonRuleSetDigest
      },
      decisionPolicy: {
        version: RECONCILIATION_DECISION_POLICY_VERSION,
        digest: decisionPolicyDigest
      }
    });
    if (expected !== finding.findingKey) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }
    return `${parsedClaimIds[0]}:${parsedClaimIds[1]}`;
  } catch (error) {
    if (error instanceof ReassessmentError) throw error;
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
}

async function assertStoredMissingFinding(
  value: unknown,
  projectId: ProjectId,
  missionId: MissionId,
  targetSnapshotId: GitSnapshotId,
  requirementsDigest: Sha256Digest,
  supportPolicy: ReconciliationSupportPolicyIdentity
): Promise<string> {
  const finding = exactRecord(
    value,
    [
      "entityType",
      "findingKind",
      "status",
      "findingKeyVersion",
      "findingKey",
      "projectId",
      "missionId",
      "requirement",
      "reason",
      "targetSnapshotId",
      "requirementsDigest",
      "supportPolicyVersion",
      "supportPolicyDigest"
    ],
    [],
    "REASSESSMENT_INTEGRITY_INVALID"
  );
  const requirementRecord = exactRecord(
    finding.requirement,
    ["requirementId", "supportKind"],
    ["sourceLocator", "validationKey"],
    "REASSESSMENT_INTEGRITY_INVALID"
  );
  let requirement: ReconciliationSupportRequirement | undefined;
  try {
    requirement = parseRequirements([
      requirementRecord as unknown as ReconciliationSupportRequirementInput
    ])[0];
  } catch {
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
  if (requirement === undefined) {
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
  const expectedReason =
    requirement.supportKind === "EVIDENCE_SOURCE"
      ? "REQUIRED_EVIDENCE_ABSENT"
      : "REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT";
  if (
    finding.entityType !== "ReconciliationFinding" ||
    finding.findingKind !== "MISSING" ||
    finding.status !== "OPEN" ||
    finding.findingKeyVersion !== RECONCILIATION_MISSING_FINDING_KEY_VERSION ||
    finding.projectId !== projectId ||
    finding.missionId !== missionId ||
    finding.reason !== expectedReason ||
    finding.targetSnapshotId !== targetSnapshotId ||
    finding.requirementsDigest !== requirementsDigest ||
    finding.supportPolicyVersion !== supportPolicy.version ||
    finding.supportPolicyDigest !== supportPolicy.digest
  ) {
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
  try {
    parseSha256Digest(finding.findingKey);
    const expectedKey = await canonicalJsonDigest({
      version: RECONCILIATION_MISSING_FINDING_KEY_VERSION,
      scope: { projectId, missionId },
      requirement,
      targetSnapshotId,
      requirementsDigest,
      supportPolicy
    });
    if (expectedKey !== finding.findingKey) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }
  } catch (error) {
    if (error instanceof ReassessmentError) throw error;
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
  return requirement.requirementId;
}

/**
 * Verifies a hydrated reassessment independently of any repository row.
 * This is deliberately stricter than predecessor acceptance: persisted bytes
 * must retain exact structure, deterministic ordering and all stable digests.
 */
export async function assertReconciliationReassessmentInvariant(
  result: ReconciliationReassessmentResult
): Promise<void> {
  try {
    const record = exactRecord(
      result,
      [
        "version",
        "digestVersion",
        "reassessmentKey",
        "revision",
        "projectId",
        "missionId",
        "twinBinding",
        "targetSnapshotId",
        "claimReconciliationVersion",
        "claimReconciliationDigest",
        "supportPolicyVersion",
        "supportPolicyDigest",
        "requirementsDigest",
        "dependencies",
        "inputDigest",
        "claimFindings",
        "missingFindings",
        "resultDigest"
      ],
      ["predecessor", "stalePredecessorFinding"],
      "REASSESSMENT_INTEGRITY_INVALID"
    );
    if (
      record.version !== RECONCILIATION_REASSESSMENT_VERSION ||
      record.digestVersion !== RECONCILIATION_REASSESSMENT_DIGEST_VERSION ||
      record.claimReconciliationVersion !== CLAIM_RECONCILIATION_VERSION ||
      record.supportPolicyVersion !== RECONCILIATION_SUPPORT_POLICY_VERSION
    ) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }
    const projectId = parseStableId<"PROJECT">(record.projectId);
    const missionId = parseStableId<"MISSION">(record.missionId);
    const targetSnapshotId = parseStableId<"GIT_SNAPSHOT">(
      record.targetSnapshotId
    );
    const revision = positiveRevision(record.revision);
    const key = await reassessmentKey(projectId, missionId);
    const twinBinding = exactRecord(
      record.twinBinding,
      ["projectionId", "revision", "projectionDigest"],
      [],
      "REASSESSMENT_INTEGRITY_INVALID"
    );
    parseStableId<"TWIN_PROJECTION">(twinBinding.projectionId);
    parseTwinRevision(twinBinding.revision);
    parseSha256Digest(twinBinding.projectionDigest);
    const claimReconciliationDigest = parseSha256Digest(
      record.claimReconciliationDigest
    );
    const requirementsDigest = parseSha256Digest(record.requirementsDigest);
    const inputDigest = parseSha256Digest(record.inputDigest);
    parseSha256Digest(record.resultDigest);
    if (record.reassessmentKey !== key) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }

    const supportPolicy = await reconciliationSupportPolicyIdentity();
    const ruleSet = await reconciliationRuleSetIdentity();
    const decisionPolicy = await reconciliationDecisionPolicyIdentity();
    if (
      record.supportPolicyDigest !== supportPolicy.digest ||
      record.supportPolicyVersion !== supportPolicy.version
    ) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }

    const dependencyValues = boundedArray(
      record.dependencies,
      MAXIMUM_RECONCILIATION_DEPENDENCIES,
      "REASSESSMENT_LIMIT_EXCEEDED"
    );
    const dependencies = dependencyValues.map((value) => {
      const dependency = exactRecord(
        value,
        ["dependencyKind", "dependencyKey", "digest"],
        ["twinMember"],
        "REASSESSMENT_INTEGRITY_INVALID"
      );
      if (
        !RECONCILIATION_DEPENDENCY_KINDS.some(
          (kind) => kind === dependency.dependencyKind
        ) ||
        typeof dependency.dependencyKey !== "string" ||
        dependency.dependencyKey.length === 0 ||
        dependency.dependencyKey.length > 1_024
      ) {
        return fail("REASSESSMENT_INTEGRITY_INVALID");
      }
      parseSha256Digest(dependency.digest);
      if (dependency.twinMember !== undefined) {
        parseStoredMemberReference(dependency.twinMember);
      }
      return dependency as unknown as ReconciliationDependency;
    });
    if (
      !strictlySorted(
        dependencies.map((dependency) => dependency.dependencyKey)
      ) ||
      dependencies.some(
        (dependency) =>
          (dependency.dependencyKind === "RULE_SET" &&
            dependency.digest !== ruleSet.digest) ||
          (dependency.dependencyKind === "DECISION_POLICY" &&
            dependency.digest !== decisionPolicy.digest) ||
          (dependency.dependencyKind === "REQUIREMENT_SET" &&
            dependency.digest !== requirementsDigest) ||
          (dependency.dependencyKind === "CLAIM_RECONCILIATION" &&
            dependency.digest !== claimReconciliationDigest)
      )
    ) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }

    const expectedInputDigest = await canonicalJsonDigest({
      version: RECONCILIATION_REASSESSMENT_VERSION,
      scope: { projectId, missionId },
      twinBinding,
      targetSnapshotId,
      claimReconciliationDigest,
      supportPolicy,
      requirementsDigest,
      dependencies
    });
    if (expectedInputDigest !== inputDigest) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }

    const claimFindingValues = boundedArray(
      record.claimFindings,
      (MAXIMUM_RECONCILIATION_CLAIMS *
        (MAXIMUM_RECONCILIATION_CLAIMS - 1)) /
        2,
      "REASSESSMENT_LIMIT_EXCEEDED"
    );
    const claimFindingOrder: string[] = [];
    for (const finding of claimFindingValues) {
      claimFindingOrder.push(
        await assertStoredClaimFinding(
          finding,
          projectId,
          missionId,
          ruleSet.digest,
          decisionPolicy.digest
        )
      );
    }
    if (!strictlySorted(claimFindingOrder)) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }

    const missingFindingValues = boundedArray(
      record.missingFindings,
      MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS,
      "REASSESSMENT_LIMIT_EXCEEDED"
    );
    const missingFindingOrder: string[] = [];
    for (const finding of missingFindingValues) {
      missingFindingOrder.push(
        await assertStoredMissingFinding(
          finding,
          projectId,
          missionId,
          targetSnapshotId,
          requirementsDigest,
          supportPolicy
        )
      );
    }
    if (!strictlySorted(missingFindingOrder)) {
      return fail("REASSESSMENT_INTEGRITY_INVALID");
    }

    if (record.predecessor === undefined) {
      if (revision !== 1 || record.stalePredecessorFinding !== undefined) {
        return fail("REASSESSMENT_INTEGRITY_INVALID");
      }
    } else {
      const predecessor = exactRecord(
        record.predecessor,
        ["reassessmentKey", "revision", "resultDigest"],
        [],
        "REASSESSMENT_INTEGRITY_INVALID"
      );
      if (
        predecessor.reassessmentKey !== key ||
        positiveRevision(predecessor.revision) !== revision - 1
      ) {
        return fail("REASSESSMENT_INTEGRITY_INVALID");
      }
      parseSha256Digest(predecessor.resultDigest);

      if (record.stalePredecessorFinding !== undefined) {
        const stale = exactRecord(
          record.stalePredecessorFinding,
          [
            "entityType",
            "findingKind",
            "status",
            "findingKeyVersion",
            "findingKey",
            "projectId",
            "missionId",
            "predecessorRevision",
            "predecessorDigest",
            "dependencyChanges",
            "reason"
          ],
          [],
          "REASSESSMENT_INTEGRITY_INVALID"
        );
        if (
          stale.entityType !== "ReconciliationFinding" ||
          stale.findingKind !== "STALE" ||
          stale.status !== "OPEN" ||
          stale.findingKeyVersion !== RECONCILIATION_STALE_FINDING_KEY_VERSION ||
          stale.projectId !== projectId ||
          stale.missionId !== missionId ||
          stale.predecessorRevision !== predecessor.revision ||
          stale.predecessorDigest !== predecessor.resultDigest ||
          stale.reason !== "EXACT_DEPENDENCY_CHANGED"
        ) {
          return fail("REASSESSMENT_INTEGRITY_INVALID");
        }
        const changes = boundedArray(
          stale.dependencyChanges,
          MAXIMUM_RECONCILIATION_DEPENDENCIES,
          "REASSESSMENT_LIMIT_EXCEEDED"
        ).map((changeValue) => {
          const change = exactRecord(
            changeValue,
            ["changeType", "dependencyKind", "dependencyKey"],
            ["beforeDigest", "afterDigest"],
            "REASSESSMENT_INTEGRITY_INVALID"
          );
          if (
            !RECONCILIATION_DEPENDENCY_CHANGE_TYPES.some(
              (kind) => kind === change.changeType
            ) ||
            !RECONCILIATION_DEPENDENCY_KINDS.some(
              (kind) => kind === change.dependencyKind
            ) ||
            typeof change.dependencyKey !== "string"
          ) {
            return fail("REASSESSMENT_INTEGRITY_INVALID");
          }
          if (change.beforeDigest !== undefined) {
            parseSha256Digest(change.beforeDigest);
          }
          if (change.afterDigest !== undefined) {
            parseSha256Digest(change.afterDigest);
          }
          if (
            (change.changeType === "ADDED" &&
              (change.beforeDigest !== undefined ||
                change.afterDigest === undefined)) ||
            (change.changeType === "REMOVED" &&
              (change.beforeDigest === undefined ||
                change.afterDigest !== undefined)) ||
            (change.changeType === "CHANGED" &&
              (change.beforeDigest === undefined ||
                change.afterDigest === undefined ||
                change.beforeDigest === change.afterDigest))
          ) {
            return fail("REASSESSMENT_INTEGRITY_INVALID");
          }
          return change;
        });
        if (
          changes.length === 0 ||
          !strictlySorted(
            changes.map((change) => String(change.dependencyKey))
          )
        ) {
          return fail("REASSESSMENT_INTEGRITY_INVALID");
        }
        const expectedStaleKey = await canonicalJsonDigest({
          version: RECONCILIATION_STALE_FINDING_KEY_VERSION,
          scope: { projectId, missionId },
          predecessorRevision: predecessor.revision,
          predecessorDigest: predecessor.resultDigest,
          dependencyChanges: changes
        });
        if (expectedStaleKey !== stale.findingKey) {
          return fail("REASSESSMENT_INTEGRITY_INVALID");
        }
      }
    }
    await assertPrevious(
      result,
      key,
      projectId,
      missionId
    );
  } catch (error) {
    if (
      error instanceof ReassessmentError &&
      (error.code === "REASSESSMENT_LIMIT_EXCEEDED" ||
        error.code === "REASSESSMENT_INTEGRITY_INVALID")
    ) {
      throw error;
    }
    return fail("REASSESSMENT_INTEGRITY_INVALID");
  }
}

export async function serializeReconciliationReassessmentResult(
  result: ReconciliationReassessmentResult
): Promise<string> {
  await assertReconciliationReassessmentInvariant(result);
  return canonicalizeJson(result);
}

export async function deserializeReconciliationReassessmentResult(
  serialized: string
): Promise<ReconciliationReassessmentResult> {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    new TextEncoder().encode(serialized).byteLength >
      MAXIMUM_RECONCILIATION_REASSESSMENT_SERIALIZED_BYTES
  ) {
    return fail("REASSESSMENT_SERIALIZATION_INVALID");
  }
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    return fail("REASSESSMENT_SERIALIZATION_INVALID");
  }
  try {
    const result = deepFreezeJson(
      value
    ) as ReconciliationReassessmentResult;
    await assertReconciliationReassessmentInvariant(result);
    return result;
  } catch (error) {
    if (
      error instanceof ReassessmentError &&
      error.code === "REASSESSMENT_LIMIT_EXCEEDED"
    ) {
      throw error;
    }
    return fail("REASSESSMENT_SERIALIZATION_INVALID");
  }
}
