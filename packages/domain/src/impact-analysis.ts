import { canonicalizeJson } from "./canonical-json.js";
import {
  assertCodeMapProjectionRevisionInvariant,
  codeMapSnapshotDigest,
  type CodeMapAssetId,
  type CodeMapCompleteness,
  type CodeMapEvidenceKind,
  type CodeMapInferenceStatus,
  type CodeMapProjectionRevision
} from "./code-map-projection.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  sha256TextDigest,
  type Sha256Digest
} from "./digest.js";
import { parseEvidenceSourceLocator, parseEvidenceSourceRevision } from "./evidence-source.js";
import {
  assertGitSnapshotInvariant,
  type GitSnapshot,
  type GitSnapshotId
} from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  assertReconciliationReassessmentInvariant,
  type ReconciliationReassessmentResult
} from "./reconciliation-reassessment.js";
import { isEpistemicLabel, isOriginKind, type EpistemicLabel, type OriginKind } from "./record-metadata.js";
import { parseStableId } from "./stable-id.js";
import { parseUtcTimestamp } from "./time.js";
import {
  assertTwinProjectionRevisionInvariant,
  type TwinProjectionMemberReference,
  type TwinProjectionRevision
} from "./twin-projection.js";
import {
  serializeTwinNode,
  serializeTwinRelationship,
  parseTwinExtractionMethod,
  parseTwinSourceReference,
  parseTwinSourceRevision,
  type TwinNode,
  type TwinNodeId,
  type TwinRelationship,
  type TwinRelationshipType,
  type TwinRevision,
  type TwinSourceRevisionOrDigest
} from "./twin-vocabulary.js";
import {
  VALIDATION_RESULT_DIGEST_VERSION,
  VALIDATION_RESULT_EXTRACTION_METHOD,
  VALIDATION_RESULT_STATUSES,
  parseValidationKey,
  type ValidationKey,
  type ValidationResult,
  type ValidationResultStatus
} from "./validation-result.js";

export const IMPACT_ANALYSIS_VERSION = "impact-analysis.v1" as const;
export const IMPACT_ANALYSIS_DIGEST_VERSION = "impact-analysis-digest.v1" as const;
export const IMPACT_ANALYSIS_KEY_VERSION = "impact-analysis-key.v1" as const;
export const IMPACT_TRAVERSAL_POLICY_VERSION = "impact-traversal-policy.v1" as const;
export const IMPACT_REQUIREMENTS_VERSION = "impact-requirements.v1" as const;
export const IMPACT_PATH_KEY_VERSION = "impact-path-key.v1" as const;
export const IMPACT_PATH_DIGEST_VERSION = "impact-path-digest.v1" as const;
export const IMPACT_GAP_FINDING_KEY_VERSION = "impact-gap-finding-key.v1" as const;

export const MAXIMUM_IMPACT_TRAVERSAL_DEPTH = 8;
export const MAXIMUM_IMPACT_ROOTS = 50;
export const MAXIMUM_IMPACT_REQUIREMENTS = 500;
export const MAXIMUM_IMPACT_BASIS_CITATIONS = 50;
export const MAXIMUM_IMPACT_VALIDATION_RESULTS = 500;
export const MAXIMUM_IMPACT_PATHS = 1_000;
export const MAXIMUM_IMPACT_DEPENDENCIES = 5_000;
export const MAXIMUM_IMPACT_ANALYSIS_SERIALIZED_BYTES = 16_777_216;

export const IMPACT_SUPPORT_KINDS = ["IMPLEMENTATION", "VALIDATION"] as const;
export const IMPACT_TRAVERSAL_RELATIONSHIP_TYPES = [
  "AFFECTS",
  "DEPENDS_ON",
  "IMPLEMENTS",
  "VALIDATED_BY"
] as const;
export const IMPACT_TRAVERSAL_DIRECTIONS = ["FORWARD", "REVERSE"] as const;
export const IMPACT_DEPENDENCY_KINDS = [
  "TWIN_PROJECTION",
  "CODE_MAP",
  "REASSESSMENT",
  "TARGET_SNAPSHOT",
  "TRAVERSAL_POLICY",
  "REQUIREMENT_SET",
  "TWIN_MEMBER"
] as const;
export const IMPACT_GAP_REASONS = [
  "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
  "CRITICAL_IMPLEMENTATION_PATH_ABSENT",
  "REQUIRED_VALIDATION_RESULT_ABSENT",
  "REQUIRED_VALIDATION_PATH_ABSENT",
  "IMPLEMENTATION_SUPPORT_UNAVAILABLE"
] as const;
export const IMPACT_ANALYSIS_ERROR_CODES = [
  "IMPACT_SCOPE_INVALID",
  "IMPACT_INPUT_INVALID",
  "IMPACT_TWIN_INVALID",
  "IMPACT_REQUIREMENT_INVALID",
  "IMPACT_LIMIT_EXCEEDED",
  "IMPACT_INTEGRITY_INVALID",
  "IMPACT_SERIALIZATION_INVALID"
] as const;

export type ImpactSupportKind = (typeof IMPACT_SUPPORT_KINDS)[number];
export type ImpactTraversalRelationshipType =
  (typeof IMPACT_TRAVERSAL_RELATIONSHIP_TYPES)[number];
export type ImpactTraversalDirection =
  (typeof IMPACT_TRAVERSAL_DIRECTIONS)[number];
export type ImpactDependencyKind = (typeof IMPACT_DEPENDENCY_KINDS)[number];
export type ImpactGapReason = (typeof IMPACT_GAP_REASONS)[number];
export type ImpactAnalysisErrorCode =
  (typeof IMPACT_ANALYSIS_ERROR_CODES)[number];

export const IMPACT_TRAVERSAL_POLICY = Object.freeze({
  version: IMPACT_TRAVERSAL_POLICY_VERSION,
  requirementAuthority: "EXPLICIT_DECLARATION_ONLY",
  relationshipTypes: IMPACT_TRAVERSAL_RELATIONSHIP_TYPES,
  directions: Object.freeze({
    AFFECTS: "FORWARD",
    DEPENDS_ON: "REVERSE",
    IMPLEMENTS: "TOWARD_SOFTWARE_ASSET",
    VALIDATED_BY: "FORWARD_TERMINAL"
  }),
  traversal: "DETERMINISTIC_BREADTH_FIRST_CANONICAL_SHORTEST_PATH",
  maximumDepth: MAXIMUM_IMPACT_TRAVERSAL_DEPTH,
  cycleControl: "VISIT_EXACT_NODE_REVISION_ONCE_PER_ROOT",
  validationPresence: "STATUS_DOES_NOT_CHANGE_STRUCTURAL_PRESENCE",
  irrelevantRelationships: "EXCLUDED",
  aiAuthority: "NONE"
} as const);

export interface ImpactTraversalPolicyIdentity {
  readonly version: typeof IMPACT_TRAVERSAL_POLICY_VERSION;
  readonly digest: Sha256Digest;
}

export interface ImpactRootInput {
  readonly rootId: string;
  readonly nodeId: TwinNodeId;
}

export interface ImpactRequirementInput {
  readonly requirementId: string;
  readonly rootId: string;
  readonly criticalAssetId: CodeMapAssetId;
  readonly supportKind: ImpactSupportKind;
  readonly validationKey?: string;
  readonly basisCitations: readonly TwinProjectionMemberReference[];
}

export interface ImpactMemberCitation {
  readonly kind: "NODE" | "RELATIONSHIP";
  readonly memberId: TwinProjectionMemberReference["memberId"];
  readonly revision: TwinRevision;
  readonly digest: Sha256Digest;
  readonly sourceReference: string;
  readonly sourceRevisionOrDigest: TwinSourceRevisionOrDigest;
  readonly origin: OriginKind;
  readonly extractionMethod: string;
  readonly epistemicLabel: EpistemicLabel;
}

export interface ImpactRoot {
  readonly rootId: ValidationKey;
  readonly node: ImpactMemberCitation;
}

export interface ImpactRequirement {
  readonly requirementId: ValidationKey;
  readonly rootId: ValidationKey;
  readonly criticalAssetId: CodeMapAssetId;
  readonly supportKind: ImpactSupportKind;
  readonly validationKey?: ValidationKey;
  readonly basisCitations: readonly TwinProjectionMemberReference[];
}

export interface ImpactPathStep {
  readonly stepIndex: number;
  readonly direction: ImpactTraversalDirection;
  readonly relationshipType: ImpactTraversalRelationshipType;
  readonly from: ImpactMemberCitation;
  readonly relationship: ImpactMemberCitation;
  readonly to: ImpactMemberCitation;
}

export interface ImpactPath {
  readonly pathKeyVersion: typeof IMPACT_PATH_KEY_VERSION;
  readonly pathDigestVersion: typeof IMPACT_PATH_DIGEST_VERSION;
  readonly pathKey: Sha256Digest;
  readonly pathDigest: Sha256Digest;
  readonly rootId: ValidationKey;
  readonly requirementId: ValidationKey;
  readonly supportKind: ImpactSupportKind;
  readonly root: ImpactMemberCitation;
  readonly criticalAsset: ImpactMemberCitation;
  readonly terminalValidation?: ImpactMemberCitation;
  readonly validationStatus?: ValidationResultStatus;
  readonly depth: number;
  readonly steps: readonly ImpactPathStep[];
}

export interface ImpactGapFinding {
  readonly entityType: "ReconciliationFinding";
  readonly findingKind: "IMPACT_GAP";
  readonly status: "OPEN";
  readonly findingKeyVersion: typeof IMPACT_GAP_FINDING_KEY_VERSION;
  readonly findingKey: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly requirement: ImpactRequirement;
  readonly reason: ImpactGapReason;
  readonly criticalAsset?: ImpactMemberCitation;
  readonly supportingPathKey?: Sha256Digest;
  readonly basisCitations: readonly TwinProjectionMemberReference[];
  readonly targetSnapshotId: GitSnapshotId;
  readonly traversalPolicyVersion: typeof IMPACT_TRAVERSAL_POLICY_VERSION;
  readonly traversalPolicyDigest: Sha256Digest;
  readonly requirementsDigest: Sha256Digest;
}

export interface ImpactAnalysisDependency {
  readonly dependencyKind: ImpactDependencyKind;
  readonly dependencyKey: string;
  readonly digest: Sha256Digest;
  readonly citation?: ImpactMemberCitation;
}

export interface ImpactAnalysisResult {
  readonly version: typeof IMPACT_ANALYSIS_VERSION;
  readonly digestVersion: typeof IMPACT_ANALYSIS_DIGEST_VERSION;
  readonly analysisKey: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly twinBinding: {
    readonly projectionId: TwinProjectionRevision["projectionId"];
    readonly revision: TwinRevision;
    readonly projectionDigest: Sha256Digest;
  };
  readonly targetSnapshotId: GitSnapshotId;
  readonly codeMapBinding: {
    readonly projectionId: CodeMapProjectionRevision["projectionId"];
    readonly revision: number;
    readonly projectionDigest: Sha256Digest;
    readonly evidenceKind: CodeMapEvidenceKind;
    readonly inferenceStatus: CodeMapInferenceStatus;
    readonly completeness: CodeMapCompleteness;
  };
  readonly reassessmentBinding: {
    readonly reassessmentKey: Sha256Digest;
    readonly revision: number;
    readonly inputDigest: Sha256Digest;
    readonly resultDigest: Sha256Digest;
  };
  readonly traversalPolicyVersion: typeof IMPACT_TRAVERSAL_POLICY_VERSION;
  readonly traversalPolicyDigest: Sha256Digest;
  readonly requirementsDigest: Sha256Digest;
  readonly roots: readonly ImpactRoot[];
  readonly requirements: readonly ImpactRequirement[];
  readonly dependencies: readonly ImpactAnalysisDependency[];
  readonly paths: readonly ImpactPath[];
  readonly impactGapFindings: readonly ImpactGapFinding[];
  readonly inputDigest: Sha256Digest;
  readonly resultDigest: Sha256Digest;
}

export interface AnalyzeChangeImpactInput {
  readonly twin: TwinProjectionRevision;
  readonly reassessment: ReconciliationReassessmentResult;
  readonly codeMap: CodeMapProjectionRevision;
  readonly targetSnapshot: GitSnapshot;
  readonly validationResults: readonly ValidationResult[];
  readonly roots: readonly ImpactRootInput[];
  readonly requirements: readonly ImpactRequirementInput[];
}

const ERROR_MESSAGES: Readonly<Record<ImpactAnalysisErrorCode, string>> =
  Object.freeze({
    IMPACT_SCOPE_INVALID: "Impact analysis scope is invalid.",
    IMPACT_INPUT_INVALID: "Impact analysis input is invalid.",
    IMPACT_TWIN_INVALID: "Impact analysis Twin input is invalid.",
    IMPACT_REQUIREMENT_INVALID: "Impact analysis requirement is invalid.",
    IMPACT_LIMIT_EXCEEDED: "Impact analysis input exceeds a fixed limit.",
    IMPACT_INTEGRITY_INVALID: "Impact analysis integrity check failed.",
    IMPACT_SERIALIZATION_INVALID: "Impact analysis serialization is invalid."
  });

export class ImpactAnalysisError extends Error {
  readonly code: ImpactAnalysisErrorCode;

  constructor(code: ImpactAnalysisErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ImpactAnalysisError";
    this.code = code;
  }
}

function fail(code: ImpactAnalysisErrorCode): never {
  throw new ImpactAnalysisError(code);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function exactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  code: ImpactAnalysisErrorCode
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) return fail(code);
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(record, key)) ||
    keys.some((key) => !allowed.has(key))
  ) return fail(code);
  return record;
}

function boundedArray(
  value: unknown,
  maximum: number,
  code: ImpactAnalysisErrorCode
): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) return fail(code);
  return value;
}

function orderedUnique(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || (values[index - 1]?.localeCompare(value, "en-US") ?? -1) < 0
  );
}

function referenceKey(reference: TwinProjectionMemberReference): string {
  return `${reference.kind}:${reference.memberId}`;
}

function citationReference(citation: ImpactMemberCitation): TwinProjectionMemberReference {
  return Object.freeze({
    kind: citation.kind,
    memberId: citation.memberId,
    revision: citation.revision,
    digest: citation.digest
  });
}

async function nodeCitation(node: TwinNode): Promise<ImpactMemberCitation> {
  return Object.freeze({
    kind: "NODE",
    memberId: node.nodeId,
    revision: node.revision,
    digest: await sha256TextDigest(serializeTwinNode(node)),
    sourceReference: node.metadata.sourceReference,
    sourceRevisionOrDigest: node.metadata.sourceRevisionOrDigest,
    origin: node.metadata.origin.kind,
    extractionMethod: node.metadata.extractionMethod,
    epistemicLabel: node.metadata.epistemicLabel
  });
}

async function relationshipCitation(
  relationship: TwinRelationship,
  from: TwinNode,
  to: TwinNode
): Promise<ImpactMemberCitation> {
  return Object.freeze({
    kind: "RELATIONSHIP",
    memberId: relationship.relationshipId,
    revision: relationship.revision,
    digest: await sha256TextDigest(serializeTwinRelationship(relationship, from, to)),
    sourceReference: relationship.metadata.sourceReference,
    sourceRevisionOrDigest: relationship.metadata.sourceRevisionOrDigest,
    origin: relationship.metadata.origin.kind,
    extractionMethod: relationship.metadata.extractionMethod,
    epistemicLabel: relationship.metadata.epistemicLabel
  });
}

async function exactMemberCitation(
  twin: TwinProjectionRevision,
  reference: TwinProjectionMemberReference
): Promise<ImpactMemberCitation> {
  if (reference.kind === "NODE") {
    const node = twin.nodes.find(
      (value) => value.nodeId === reference.memberId && value.revision === reference.revision
    );
    if (node === undefined) return fail("IMPACT_TWIN_INVALID");
    const citation = await nodeCitation(node);
    if (citation.digest !== reference.digest || citation.origin === "AI_ADVISORY") {
      return fail("IMPACT_TWIN_INVALID");
    }
    return citation;
  }
  const relationship = twin.relationships.find(
    (value) =>
      value.relationshipId === reference.memberId &&
      value.revision === reference.revision
  );
  if (relationship === undefined) return fail("IMPACT_TWIN_INVALID");
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
  if (from === undefined || to === undefined) return fail("IMPACT_TWIN_INVALID");
  const citation = await relationshipCitation(relationship, from, to);
  if (citation.digest !== reference.digest || citation.origin === "AI_ADVISORY") {
    return fail("IMPACT_TWIN_INVALID");
  }
  return citation;
}

function normalizedReference(value: TwinProjectionMemberReference): TwinProjectionMemberReference {
  try {
    if (value.kind !== "NODE" && value.kind !== "RELATIONSHIP") {
      return fail("IMPACT_REQUIREMENT_INVALID");
    }
    const memberId = parseStableId(value.memberId);
    if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
      return fail("IMPACT_REQUIREMENT_INVALID");
    }
    return Object.freeze({
      kind: value.kind,
      memberId,
      revision: value.revision,
      digest: parseSha256Digest(value.digest)
    }) as TwinProjectionMemberReference;
  } catch (error) {
    if (error instanceof ImpactAnalysisError) throw error;
    return fail("IMPACT_REQUIREMENT_INVALID");
  }
}

function nodeByEndpoint(twin: TwinProjectionRevision, endpoint: TwinRelationship["from"]): TwinNode {
  return twin.nodes.find(
    (node) => node.nodeId === endpoint.nodeId && node.revision === endpoint.revision
  ) ?? fail("IMPACT_TWIN_INVALID");
}

function sourceNode(
  twin: TwinProjectionRevision,
  sourceType: "SoftwareAsset" | "ValidationResult" | "GitSnapshot",
  sourceId: string,
  expectedDigest: Sha256Digest
): TwinNode | undefined {
  const bindings = twin.nodeSources.filter(
    (binding) => binding.sourceType === sourceType && binding.sourceId === sourceId
  );
  if (bindings.length === 0) return undefined;
  if (bindings.length !== 1 || bindings[0]?.sourceDigest !== expectedDigest) {
    return fail("IMPACT_TWIN_INVALID");
  }
  const binding = bindings[0];
  const node = twin.nodes.find(
    (value) => value.nodeId === binding.nodeId && value.revision === binding.nodeRevision
  );
  if (node?.nodeType !== sourceType || node.metadata.origin.kind === "AI_ADVISORY") {
    return fail("IMPACT_TWIN_INVALID");
  }
  return node;
}

async function snapshotTwinDigest(snapshot: GitSnapshot): Promise<Sha256Digest> {
  return canonicalJsonDigest({
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
  });
}

function codeMapRelationshipType(
  kind: CodeMapProjectionRevision["edges"][number]["kind"]
): TwinRelationshipType {
  switch (kind) {
    case "IMPORTS":
    case "REEXPORTS":
      return "DEPENDS_ON";
    case "DECLARES_PACKAGE":
    case "DECLARES_CONTRACT":
    case "DECLARES_ROUTE":
      return "EXTRACTED_FROM";
    case "TEST_IMPORTS":
      return "CONCERNS";
  }
}

async function assertCodeMapTwinMembership(
  twin: TwinProjectionRevision,
  codeMap: CodeMapProjectionRevision,
  targetSnapshot: GitSnapshot
): Promise<void> {
  const snapshotNode = sourceNode(
    twin,
    "GitSnapshot",
    targetSnapshot.snapshotId,
    await snapshotTwinDigest(targetSnapshot)
  );
  if (snapshotNode === undefined) return fail("IMPACT_TWIN_INVALID");
  const projectedAssetIds = twin.nodeSources
    .filter((binding) => binding.sourceType === "SoftwareAsset")
    .map((binding) => String(binding.sourceId))
    .sort((left, right) => left.localeCompare(right, "en-US"));
  const selectedAssetIds = codeMap.assets
    .map((asset) => String(asset.assetId))
    .sort((left, right) => left.localeCompare(right, "en-US"));
  if (canonicalizeJson(projectedAssetIds) !== canonicalizeJson(selectedAssetIds)) {
    return fail("IMPACT_TWIN_INVALID");
  }
  const projectedCodeEdgeReferences = twin.relationships
    .filter((relationship) =>
      relationship.metadata.sourceReference.startsWith("code-map-edge:") &&
      (relationship.relationshipType === "DEPENDS_ON" ||
        relationship.relationshipType === "EXTRACTED_FROM" ||
        relationship.relationshipType === "CONCERNS")
    )
    .map((relationship) => relationship.metadata.sourceReference)
    .sort((left, right) => left.localeCompare(right, "en-US"));
  const selectedCodeEdgeReferences = codeMap.edges
    .map((edge) => `code-map-edge:${edge.edgeId}`)
    .sort((left, right) => left.localeCompare(right, "en-US"));
  if (
    canonicalizeJson(projectedCodeEdgeReferences) !==
    canonicalizeJson(selectedCodeEdgeReferences)
  ) return fail("IMPACT_TWIN_INVALID");
  const assetNodes = new Map<string, TwinNode>();
  for (const asset of codeMap.assets) {
    const node = sourceNode(twin, "SoftwareAsset", asset.assetId, asset.assetDigest);
    if (node === undefined) return fail("IMPACT_TWIN_INVALID");
    assetNodes.set(asset.assetId, node);
    const bindings = twin.relationships.filter(
      (relationship) =>
        relationship.relationshipType === "BOUND_TO" &&
        relationship.from.nodeId === node.nodeId &&
        relationship.from.revision === node.revision &&
        relationship.to.nodeId === snapshotNode.nodeId &&
        relationship.to.revision === snapshotNode.revision
    );
    if (bindings.length !== 1) return fail("IMPACT_TWIN_INVALID");
  }
  for (const edge of codeMap.edges) {
    const from = assetNodes.get(edge.fromAssetId) ?? fail("IMPACT_TWIN_INVALID");
    const to = assetNodes.get(edge.toAssetId) ?? fail("IMPACT_TWIN_INVALID");
    const relationships = twin.relationships.filter(
      (relationship) =>
        relationship.relationshipType === codeMapRelationshipType(edge.kind) &&
        relationship.from.nodeId === from.nodeId &&
        relationship.from.revision === from.revision &&
        relationship.to.nodeId === to.nodeId &&
        relationship.to.revision === to.revision &&
        relationship.metadata.sourceReference === `code-map-edge:${edge.edgeId}`
    );
    if (relationships.length !== 1) return fail("IMPACT_TWIN_INVALID");
  }
}

async function validateValidationResult(
  result: ValidationResult,
  targetSnapshot: GitSnapshot,
  projectId: ProjectId,
  missionId: MissionId
): Promise<void> {
  try {
    if (
      result.entityType !== "ValidationResult" ||
      parseStableId<"VALIDATION_RESULT">(result.validationResultId) !== result.validationResultId ||
      parseStableId(result.evidenceSourceId) !== result.evidenceSourceId ||
      result.projectId !== projectId ||
      result.missionId !== missionId ||
      result.snapshotId !== targetSnapshot.snapshotId ||
      parseValidationKey(result.validationKey) !== result.validationKey ||
      !VALIDATION_RESULT_STATUSES.some((status) => status === result.status) ||
      !isOriginKind(result.origin) ||
      (result.origin !== "VALIDATION_RESULT" && result.origin !== "SYNTHETIC_FIXTURE") ||
      parseEvidenceSourceLocator(result.sourceLocator) !== result.sourceLocator ||
      (result.sourceRevision !== undefined &&
        parseEvidenceSourceRevision(result.sourceRevision) !== result.sourceRevision) ||
      parseSha256Digest(result.sourceContentDigest) !== result.sourceContentDigest ||
      parseUtcTimestamp(result.recordedAtUtc) !== result.recordedAtUtc ||
      result.recordedAtUtc < targetSnapshot.capturedAtUtc ||
      result.extractionMethod !== VALIDATION_RESULT_EXTRACTION_METHOD ||
      !isEpistemicLabel(result.epistemicLabel)
    ) return fail("IMPACT_INPUT_INVALID");
    const effectiveAtUtc =
      result.effectiveAtUtc === undefined
        ? undefined
        : parseUtcTimestamp(result.effectiveAtUtc);
    if (effectiveAtUtc !== undefined && effectiveAtUtc > result.recordedAtUtc) {
      return fail("IMPACT_INPUT_INVALID");
    }
    const expectedDigest = await canonicalJsonDigest({
      digestVersion: VALIDATION_RESULT_DIGEST_VERSION,
      scope: { projectId, missionId },
      evidenceSourceId: result.evidenceSourceId,
      snapshotId: result.snapshotId,
      validationKey: result.validationKey,
      status: result.status,
      sourceContentDigest: result.sourceContentDigest,
      effectiveAtUtc: effectiveAtUtc ?? null,
      extractionMethod: VALIDATION_RESULT_EXTRACTION_METHOD,
      epistemicLabel: result.epistemicLabel
    });
    if (expectedDigest !== result.resultDigest) return fail("IMPACT_INPUT_INVALID");
  } catch (error) {
    if (error instanceof ImpactAnalysisError) throw error;
    return fail("IMPACT_INPUT_INVALID");
  }
}

interface DirectedEdge {
  readonly direction: ImpactTraversalDirection;
  readonly relationshipType: ImpactTraversalRelationshipType;
  readonly from: TwinNode;
  readonly relationship: TwinRelationship;
  readonly to: TwinNode;
}

function directedEdge(
  twin: TwinProjectionRevision,
  relationship: TwinRelationship
): DirectedEdge | undefined {
  if (
    !IMPACT_TRAVERSAL_RELATIONSHIP_TYPES.some(
      (type) => type === relationship.relationshipType
    ) ||
    relationship.metadata.origin.kind === "AI_ADVISORY"
  ) return undefined;
  const from = nodeByEndpoint(twin, relationship.from);
  const to = nodeByEndpoint(twin, relationship.to);
  if (
    from.metadata.origin.kind === "AI_ADVISORY" ||
    to.metadata.origin.kind === "AI_ADVISORY"
  ) return undefined;
  const type = relationship.relationshipType as ImpactTraversalRelationshipType;
  switch (type) {
    case "AFFECTS":
      if (
        (from.nodeType !== "Claim" && from.nodeType !== "SoftwareAsset") ||
        to.nodeType !== "SoftwareAsset"
      ) return fail("IMPACT_TWIN_INVALID");
      return Object.freeze({ direction: "FORWARD", relationshipType: type, from, relationship, to });
    case "DEPENDS_ON":
      if (from.nodeType !== "SoftwareAsset" || to.nodeType !== "SoftwareAsset") {
        return fail("IMPACT_TWIN_INVALID");
      }
      return Object.freeze({
        direction: "REVERSE",
        relationshipType: type,
        from: to,
        relationship,
        to: from
      });
    case "IMPLEMENTS":
      if (from.nodeType === "Claim" && to.nodeType === "SoftwareAsset") {
        return Object.freeze({ direction: "FORWARD", relationshipType: type, from, relationship, to });
      }
      if (from.nodeType === "SoftwareAsset" && to.nodeType === "Claim") {
        return Object.freeze({
          direction: "REVERSE",
          relationshipType: type,
          from: to,
          relationship,
          to: from
        });
      }
      return fail("IMPACT_TWIN_INVALID");
    case "VALIDATED_BY":
      if (from.nodeType !== "SoftwareAsset" || to.nodeType !== "ValidationResult") {
        return fail("IMPACT_TWIN_INVALID");
      }
      return Object.freeze({ direction: "FORWARD", relationshipType: type, from, relationship, to });
  }
}

interface TraversalState {
  readonly node: TwinNode;
  readonly edges: readonly DirectedEdge[];
}

function canonicalPathsFrom(
  twin: TwinProjectionRevision,
  root: TwinNode
): ReadonlyMap<string, TraversalState> {
  const adjacency = new Map<string, DirectedEdge[]>();
  for (const relationship of twin.relationships) {
    const edge = directedEdge(twin, relationship);
    if (edge === undefined) continue;
    const values = adjacency.get(edge.from.nodeId) ?? [];
    values.push(edge);
    adjacency.set(edge.from.nodeId, values);
  }
  for (const values of adjacency.values()) {
    values.sort((left, right) => {
      const typeOrder =
        IMPACT_TRAVERSAL_RELATIONSHIP_TYPES.indexOf(left.relationshipType) -
        IMPACT_TRAVERSAL_RELATIONSHIP_TYPES.indexOf(right.relationshipType);
      if (typeOrder !== 0) return typeOrder;
      const relationshipOrder = left.relationship.relationshipId.localeCompare(
        right.relationship.relationshipId,
        "en-US"
      );
      return relationshipOrder !== 0
        ? relationshipOrder
        : left.to.nodeId.localeCompare(right.to.nodeId, "en-US");
    });
  }
  const discovered = new Map<string, TraversalState>();
  const queue: TraversalState[] = [{ node: root, edges: Object.freeze([]) }];
  discovered.set(root.nodeId, queue[0] as TraversalState);
  for (let index = 0; index < queue.length; index += 1) {
    const state = queue[index];
    if (state === undefined || state.edges.length >= MAXIMUM_IMPACT_TRAVERSAL_DEPTH) continue;
    if (state.node.nodeType === "ValidationResult") continue;
    for (const edge of adjacency.get(state.node.nodeId) ?? []) {
      if (discovered.has(edge.to.nodeId)) continue;
      const successor = Object.freeze({
        node: edge.to,
        edges: Object.freeze([...state.edges, edge])
      });
      discovered.set(edge.to.nodeId, successor);
      queue.push(successor);
    }
  }
  return discovered;
}

async function pathFromState(
  projectId: ProjectId,
  missionId: MissionId,
  root: ImpactRoot,
  requirement: ImpactRequirement,
  state: TraversalState,
  criticalAsset: TwinNode,
  terminalValidation?: { readonly node: TwinNode; readonly result: ValidationResult }
): Promise<ImpactPath> {
  const rootCitation = root.node;
  const criticalCitation = await nodeCitation(criticalAsset);
  const steps: ImpactPathStep[] = [];
  for (const [index, edge] of state.edges.entries()) {
    const relationshipFrom = edge.direction === "FORWARD" ? edge.from : edge.to;
    const relationshipTo = edge.direction === "FORWARD" ? edge.to : edge.from;
    steps.push(Object.freeze({
      stepIndex: index,
      direction: edge.direction,
      relationshipType: edge.relationshipType,
      from: await nodeCitation(edge.from),
      relationship: await relationshipCitation(
        edge.relationship,
        relationshipFrom,
        relationshipTo
      ),
      to: await nodeCitation(edge.to)
    }));
  }
  let terminalCitation: ImpactMemberCitation | undefined;
  let validationStatus: ValidationResultStatus | undefined;
  if (terminalValidation !== undefined) {
    terminalCitation = await nodeCitation(terminalValidation.node);
    validationStatus = terminalValidation.result.status;
  }
  const pathKey = await canonicalJsonDigest({
    version: IMPACT_PATH_KEY_VERSION,
    scope: { projectId, missionId },
    rootId: root.rootId,
    requirementId: requirement.requirementId,
    supportKind: requirement.supportKind,
    criticalAssetId: requirement.criticalAssetId,
    terminalValidationId: terminalCitation?.memberId ?? null
  });
  const body = Object.freeze({
    pathKeyVersion: IMPACT_PATH_KEY_VERSION,
    pathDigestVersion: IMPACT_PATH_DIGEST_VERSION,
    pathKey,
    rootId: root.rootId,
    requirementId: requirement.requirementId,
    supportKind: requirement.supportKind,
    root: rootCitation,
    criticalAsset: criticalCitation,
    ...(terminalCitation === undefined ? {} : { terminalValidation: terminalCitation }),
    ...(validationStatus === undefined ? {} : { validationStatus }),
    depth: steps.length,
    steps: Object.freeze(steps)
  });
  return Object.freeze({
    ...body,
    pathDigest: await canonicalJsonDigest({
      version: IMPACT_PATH_DIGEST_VERSION,
      path: body
    })
  });
}

async function gapFinding(
  projectId: ProjectId,
  missionId: MissionId,
  requirement: ImpactRequirement,
  reason: ImpactGapReason,
  targetSnapshotId: GitSnapshotId,
  policy: ImpactTraversalPolicyIdentity,
  requirementsDigest: Sha256Digest,
  criticalAsset?: ImpactMemberCitation,
  supportingPathKey?: Sha256Digest
): Promise<ImpactGapFinding> {
  const findingKey = await canonicalJsonDigest({
    version: IMPACT_GAP_FINDING_KEY_VERSION,
    scope: { projectId, missionId },
    requirement,
    reason,
    targetSnapshotId,
    criticalAsset: criticalAsset === undefined ? null : citationReference(criticalAsset),
    supportingPathKey: supportingPathKey ?? null,
    traversalPolicy: policy,
    requirementsDigest
  });
  return Object.freeze({
    entityType: "ReconciliationFinding",
    findingKind: "IMPACT_GAP",
    status: "OPEN",
    findingKeyVersion: IMPACT_GAP_FINDING_KEY_VERSION,
    findingKey,
    projectId,
    missionId,
    requirement,
    reason,
    ...(criticalAsset === undefined ? {} : { criticalAsset }),
    ...(supportingPathKey === undefined ? {} : { supportingPathKey }),
    basisCitations: requirement.basisCitations,
    targetSnapshotId,
    traversalPolicyVersion: policy.version,
    traversalPolicyDigest: policy.digest,
    requirementsDigest
  });
}

function pathUsesUnavailableSupport(path: ImpactPath): boolean {
  const citations = [
    path.root,
    path.criticalAsset,
    ...(path.terminalValidation === undefined ? [] : [path.terminalValidation]),
    ...path.steps.flatMap((step) => [step.from, step.relationship, step.to])
  ];
  return citations.some(
    (citation) =>
      citation.origin === "SYNTHETIC_FIXTURE" ||
      citation.extractionMethod === "DECLARED_FIXTURE_MANIFEST"
  );
}

function addDependency(
  dependencies: Map<string, ImpactAnalysisDependency>,
  dependency: ImpactAnalysisDependency
): void {
  const prior = dependencies.get(dependency.dependencyKey);
  if (prior !== undefined && prior.digest !== dependency.digest) {
    return fail("IMPACT_INPUT_INVALID");
  }
  dependencies.set(dependency.dependencyKey, dependency);
  if (dependencies.size > MAXIMUM_IMPACT_DEPENDENCIES) {
    return fail("IMPACT_LIMIT_EXCEEDED");
  }
}

function addCitationDependency(
  dependencies: Map<string, ImpactAnalysisDependency>,
  citation: ImpactMemberCitation
): void {
  addDependency(dependencies, Object.freeze({
    dependencyKind: "TWIN_MEMBER",
    dependencyKey: `twin-member:${citation.kind}:${citation.memberId}`,
    digest: citation.digest,
    citation
  }));
}

export async function impactTraversalPolicyIdentity(): Promise<ImpactTraversalPolicyIdentity> {
  return Object.freeze({
    version: IMPACT_TRAVERSAL_POLICY_VERSION,
    digest: await canonicalJsonDigest(IMPACT_TRAVERSAL_POLICY)
  });
}

async function analysisKey(projectId: ProjectId, missionId: MissionId): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: IMPACT_ANALYSIS_KEY_VERSION,
    projectId,
    missionId
  });
}

export async function analyzeChangeImpact(
  input: AnalyzeChangeImpactInput
): Promise<ImpactAnalysisResult> {
  if (
    input.roots.length > MAXIMUM_IMPACT_ROOTS ||
    input.requirements.length > MAXIMUM_IMPACT_REQUIREMENTS ||
    input.validationResults.length > MAXIMUM_IMPACT_VALIDATION_RESULTS
  ) return fail("IMPACT_LIMIT_EXCEEDED");
  try {
    await assertTwinProjectionRevisionInvariant(input.twin);
  } catch {
    return fail("IMPACT_TWIN_INVALID");
  }
  try {
    await assertReconciliationReassessmentInvariant(input.reassessment);
    await assertCodeMapProjectionRevisionInvariant(input.codeMap);
    assertGitSnapshotInvariant(input.targetSnapshot);
  } catch {
    return fail("IMPACT_INPUT_INVALID");
  }
  const projectId = input.twin.projectId;
  const missionId = input.twin.missionId;
  if (
    input.reassessment.projectId !== projectId ||
    input.reassessment.missionId !== missionId ||
    input.reassessment.twinBinding.projectionId !== input.twin.projectionId ||
    input.reassessment.twinBinding.revision !== input.twin.revision ||
    input.reassessment.twinBinding.projectionDigest !== input.twin.projectionDigest ||
    input.reassessment.targetSnapshotId !== input.targetSnapshot.snapshotId ||
    input.codeMap.projectId !== projectId ||
    input.codeMap.missionId !== missionId ||
    input.targetSnapshot.projectId !== projectId ||
    input.targetSnapshot.missionId !== missionId ||
    input.codeMap.snapshotId !== input.targetSnapshot.snapshotId ||
    input.codeMap.registrationId !== input.targetSnapshot.registrationId ||
    input.codeMap.snapshotDigest !== await codeMapSnapshotDigest(input.targetSnapshot)
  ) return fail("IMPACT_SCOPE_INVALID");
  if (
    input.twin.codeMapBinding === undefined ||
    input.twin.codeMapBinding.projectionId !== input.codeMap.projectionId ||
    input.twin.codeMapBinding.revision !== input.codeMap.revision ||
    input.twin.codeMapBinding.projectionDigest !== input.codeMap.projectionDigest
  ) return fail("IMPACT_TWIN_INVALID");
  await assertCodeMapTwinMembership(input.twin, input.codeMap, input.targetSnapshot);

  const policy = await impactTraversalPolicyIdentity();
  const rootIds = new Set<string>();
  const roots: ImpactRoot[] = [];
  for (const inputRoot of input.roots) {
    let rootId: ValidationKey;
    let nodeId: TwinNodeId;
    try {
      rootId = parseValidationKey(inputRoot.rootId);
      nodeId = parseStableId<"TWIN_NODE">(inputRoot.nodeId);
    } catch {
      return fail("IMPACT_REQUIREMENT_INVALID");
    }
    if (rootIds.has(rootId)) return fail("IMPACT_REQUIREMENT_INVALID");
    const node = input.twin.nodes.find((value) => value.nodeId === nodeId);
    if (
      node === undefined ||
      (node.nodeType !== "Claim" && node.nodeType !== "SoftwareAsset") ||
      node.metadata.origin.kind === "AI_ADVISORY"
    ) return fail("IMPACT_REQUIREMENT_INVALID");
    rootIds.add(rootId);
    roots.push(Object.freeze({ rootId, node: await nodeCitation(node) }));
  }
  roots.sort((left, right) => left.rootId.localeCompare(right.rootId, "en-US"));

  const requirements: ImpactRequirement[] = [];
  const requirementIds = new Set<string>();
  const requirementLogicalKeys = new Set<string>();
  for (const inputRequirement of input.requirements) {
    let requirementId: ValidationKey;
    let rootId: ValidationKey;
    let criticalAssetId: CodeMapAssetId;
    try {
      requirementId = parseValidationKey(inputRequirement.requirementId);
      rootId = parseValidationKey(inputRequirement.rootId);
      criticalAssetId = parseStableId<"CODE_MAP_ASSET">(inputRequirement.criticalAssetId);
    } catch {
      return fail("IMPACT_REQUIREMENT_INVALID");
    }
    if (
      requirementIds.has(requirementId) ||
      !rootIds.has(rootId) ||
      !IMPACT_SUPPORT_KINDS.some((kind) => kind === inputRequirement.supportKind) ||
      inputRequirement.basisCitations.length === 0 ||
      inputRequirement.basisCitations.length > MAXIMUM_IMPACT_BASIS_CITATIONS
    ) return fail("IMPACT_REQUIREMENT_INVALID");
    let validationKey: ValidationKey | undefined;
    if (inputRequirement.supportKind === "VALIDATION") {
      try {
        validationKey = parseValidationKey(inputRequirement.validationKey);
      } catch {
        return fail("IMPACT_REQUIREMENT_INVALID");
      }
    } else if (inputRequirement.validationKey !== undefined) {
      return fail("IMPACT_REQUIREMENT_INVALID");
    }
    const basis = inputRequirement.basisCitations.map(normalizedReference);
    basis.sort((left, right) => referenceKey(left).localeCompare(referenceKey(right), "en-US"));
    if (!orderedUnique(basis.map(referenceKey))) return fail("IMPACT_REQUIREMENT_INVALID");
    for (const reference of basis) await exactMemberCitation(input.twin, reference);
    const logicalKey = `${rootId}:${criticalAssetId}:${inputRequirement.supportKind}:${validationKey ?? ""}`;
    if (requirementLogicalKeys.has(logicalKey)) return fail("IMPACT_REQUIREMENT_INVALID");
    requirementIds.add(requirementId);
    requirementLogicalKeys.add(logicalKey);
    requirements.push(Object.freeze({
      requirementId,
      rootId,
      criticalAssetId,
      supportKind: inputRequirement.supportKind,
      ...(validationKey === undefined ? {} : { validationKey }),
      basisCitations: Object.freeze(basis)
    }));
  }
  requirements.sort((left, right) =>
    left.requirementId.localeCompare(right.requirementId, "en-US")
  );
  const requirementsDigest = await canonicalJsonDigest({
    version: IMPACT_REQUIREMENTS_VERSION,
    roots,
    requirements
  });

  const validationIds = new Set<string>();
  const validationById = new Map<string, ValidationResult>();
  for (const result of input.validationResults) {
    if (validationIds.has(result.validationResultId)) return fail("IMPACT_INPUT_INVALID");
    await validateValidationResult(result, input.targetSnapshot, projectId, missionId);
    const node = sourceNode(input.twin, "ValidationResult", result.validationResultId, result.resultDigest);
    if (node === undefined) return fail("IMPACT_TWIN_INVALID");
    validationIds.add(result.validationResultId);
    validationById.set(result.validationResultId, result);
  }

  const dependencies = new Map<string, ImpactAnalysisDependency>();
  addDependency(dependencies, Object.freeze({
    dependencyKind: "TWIN_PROJECTION",
    dependencyKey: `twin-projection:${input.twin.projectionId}`,
    digest: input.twin.projectionDigest
  }));
  addDependency(dependencies, Object.freeze({
    dependencyKind: "CODE_MAP",
    dependencyKey: `code-map:${input.codeMap.projectionId}`,
    digest: input.codeMap.projectionDigest
  }));
  addDependency(dependencies, Object.freeze({
    dependencyKind: "REASSESSMENT",
    dependencyKey: `reassessment:${input.reassessment.reassessmentKey}`,
    digest: input.reassessment.inputDigest
  }));
  addDependency(dependencies, Object.freeze({
    dependencyKind: "TARGET_SNAPSHOT",
    dependencyKey: `snapshot:${input.targetSnapshot.snapshotId}`,
    digest: input.codeMap.snapshotDigest
  }));
  addDependency(dependencies, Object.freeze({
    dependencyKind: "TRAVERSAL_POLICY",
    dependencyKey: `traversal-policy:${policy.version}`,
    digest: policy.digest
  }));
  addDependency(dependencies, Object.freeze({
    dependencyKind: "REQUIREMENT_SET",
    dependencyKey: `requirement-set:${IMPACT_REQUIREMENTS_VERSION}`,
    digest: requirementsDigest
  }));
  for (const root of roots) addCitationDependency(dependencies, root.node);
  for (const requirement of requirements) {
    for (const reference of requirement.basisCitations) {
      addCitationDependency(dependencies, await exactMemberCitation(input.twin, reference));
    }
  }

  const rootById = new Map(roots.map((root) => [root.rootId, root]));
  const paths: ImpactPath[] = [];
  const findings: ImpactGapFinding[] = [];
  const pushPath = (path: ImpactPath): void => {
    if (paths.length >= MAXIMUM_IMPACT_PATHS) return fail("IMPACT_LIMIT_EXCEEDED");
    paths.push(path);
  };
  for (const requirement of requirements) {
    const root = rootById.get(requirement.rootId) ?? fail("IMPACT_REQUIREMENT_INVALID");
    const rootNode = input.twin.nodes.find(
      (node) => node.nodeId === root.node.memberId && node.revision === root.node.revision
    ) ?? fail("IMPACT_TWIN_INVALID");
    const asset = input.codeMap.assets.find(
      (value) => value.assetId === requirement.criticalAssetId
    );
    if (asset === undefined) {
      findings.push(await gapFinding(
        projectId,
        missionId,
        requirement,
        "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
        input.targetSnapshot.snapshotId,
        policy,
        requirementsDigest
      ));
      continue;
    }
    const assetNode = sourceNode(input.twin, "SoftwareAsset", asset.assetId, asset.assetDigest);
    if (assetNode === undefined) return fail("IMPACT_TWIN_INVALID");
    const assetCitation = await nodeCitation(assetNode);
    addCitationDependency(dependencies, assetCitation);
    const traversal = canonicalPathsFrom(input.twin, rootNode);
    const state = traversal.get(assetNode.nodeId);
    if (state === undefined) {
      findings.push(await gapFinding(
        projectId,
        missionId,
        requirement,
        "CRITICAL_IMPLEMENTATION_PATH_ABSENT",
        input.targetSnapshot.snapshotId,
        policy,
        requirementsDigest,
        assetCitation
      ));
      continue;
    }
    const implementationPath = await pathFromState(
      projectId,
      missionId,
      root,
      requirement,
      state,
      assetNode
    );
    if (
      input.codeMap.inferenceStatus !== "AVAILABLE" ||
      pathUsesUnavailableSupport(implementationPath)
    ) {
      findings.push(await gapFinding(
        projectId,
        missionId,
        requirement,
        "IMPLEMENTATION_SUPPORT_UNAVAILABLE",
        input.targetSnapshot.snapshotId,
        policy,
        requirementsDigest,
        assetCitation,
        implementationPath.pathKey
      ));
      pushPath(implementationPath);
      continue;
    }
    if (requirement.supportKind === "IMPLEMENTATION") {
      pushPath(implementationPath);
      continue;
    }
    const matches = [...validationById.values()]
      .filter((result) => result.validationKey === requirement.validationKey)
      .sort((left, right) =>
        left.validationResultId.localeCompare(right.validationResultId, "en-US")
      );
    if (matches.length === 0) {
      findings.push(await gapFinding(
        projectId,
        missionId,
        requirement,
        "REQUIRED_VALIDATION_RESULT_ABSENT",
        input.targetSnapshot.snapshotId,
        policy,
        requirementsDigest,
        assetCitation,
        implementationPath.pathKey
      ));
      pushPath(implementationPath);
      continue;
    }
    let linked = false;
    let trustedLinked = false;
    let unavailablePathKey: Sha256Digest | undefined;
    for (const result of matches) {
      const resultNode = sourceNode(
        input.twin,
        "ValidationResult",
        result.validationResultId,
        result.resultDigest
      );
      if (resultNode === undefined) return fail("IMPACT_TWIN_INVALID");
      const resultCitation = await nodeCitation(resultNode);
      addCitationDependency(dependencies, resultCitation);
      const validationEdge = input.twin.relationships
        .filter(
          (relationship) =>
            relationship.relationshipType === "VALIDATED_BY" &&
            relationship.from.nodeId === assetNode.nodeId &&
            relationship.from.revision === assetNode.revision &&
            relationship.to.nodeId === resultNode.nodeId &&
            relationship.to.revision === resultNode.revision &&
            relationship.metadata.origin.kind !== "AI_ADVISORY"
        )
        .sort((left, right) =>
          left.relationshipId.localeCompare(right.relationshipId, "en-US")
        )[0];
      if (
        validationEdge === undefined ||
        state.edges.length >= MAXIMUM_IMPACT_TRAVERSAL_DEPTH
      ) continue;
      linked = true;
      const validationState = Object.freeze({
        node: resultNode,
        edges: Object.freeze([
          ...state.edges,
          Object.freeze({
            direction: "FORWARD" as const,
            relationshipType: "VALIDATED_BY" as const,
            from: assetNode,
            relationship: validationEdge,
            to: resultNode
          })
        ])
      });
      const validationPath = await pathFromState(
        projectId,
        missionId,
        root,
        requirement,
        validationState,
        assetNode,
        { node: resultNode, result }
      );
      pushPath(validationPath);
      if (pathUsesUnavailableSupport(validationPath)) {
        unavailablePathKey ??= validationPath.pathKey;
      } else {
        trustedLinked = true;
      }
    }
    if (!linked) {
      findings.push(await gapFinding(
        projectId,
        missionId,
        requirement,
        "REQUIRED_VALIDATION_PATH_ABSENT",
        input.targetSnapshot.snapshotId,
        policy,
        requirementsDigest,
        assetCitation,
        implementationPath.pathKey
      ));
      pushPath(implementationPath);
    } else if (!trustedLinked) {
      findings.push(await gapFinding(
        projectId,
        missionId,
        requirement,
        "IMPLEMENTATION_SUPPORT_UNAVAILABLE",
        input.targetSnapshot.snapshotId,
        policy,
        requirementsDigest,
        assetCitation,
        unavailablePathKey ?? implementationPath.pathKey
      ));
    }
  }
  paths.sort((left, right) => {
    const requirementOrder = left.requirementId.localeCompare(right.requirementId, "en-US");
    return requirementOrder !== 0
      ? requirementOrder
      : left.pathKey.localeCompare(right.pathKey, "en-US");
  });
  findings.sort((left, right) => {
    const requirementOrder = left.requirement.requirementId.localeCompare(
      right.requirement.requirementId,
      "en-US"
    );
    return requirementOrder !== 0
      ? requirementOrder
      : left.findingKey.localeCompare(right.findingKey, "en-US");
  });
  for (const path of paths) {
    addCitationDependency(dependencies, path.root);
    addCitationDependency(dependencies, path.criticalAsset);
    if (path.terminalValidation !== undefined) addCitationDependency(dependencies, path.terminalValidation);
    for (const step of path.steps) {
      addCitationDependency(dependencies, step.from);
      addCitationDependency(dependencies, step.relationship);
      addCitationDependency(dependencies, step.to);
    }
  }
  const orderedDependencies = Object.freeze(
    [...dependencies.values()].sort((left, right) =>
      left.dependencyKey.localeCompare(right.dependencyKey, "en-US")
    )
  );
  const twinBinding = Object.freeze({
    projectionId: input.twin.projectionId,
    revision: input.twin.revision,
    projectionDigest: input.twin.projectionDigest
  });
  const codeMapBinding = Object.freeze({
    projectionId: input.codeMap.projectionId,
    revision: input.codeMap.revision,
    projectionDigest: input.codeMap.projectionDigest,
    evidenceKind: input.codeMap.evidenceKind,
    inferenceStatus: input.codeMap.inferenceStatus,
    completeness: input.codeMap.completeness
  });
  const reassessmentBinding = Object.freeze({
    reassessmentKey: input.reassessment.reassessmentKey,
    revision: input.reassessment.revision,
    inputDigest: input.reassessment.inputDigest,
    resultDigest: input.reassessment.resultDigest
  });
  const inputDigest = await canonicalJsonDigest({
    version: IMPACT_ANALYSIS_VERSION,
    scope: { projectId, missionId },
    twinBinding,
    targetSnapshotId: input.targetSnapshot.snapshotId,
    codeMapBinding,
    reassessmentInputDigest: input.reassessment.inputDigest,
    traversalPolicy: policy,
    requirementsDigest,
    roots,
    requirements,
    dependencies: orderedDependencies
  });
  const withoutDigest = Object.freeze({
    version: IMPACT_ANALYSIS_VERSION,
    digestVersion: IMPACT_ANALYSIS_DIGEST_VERSION,
    analysisKey: await analysisKey(projectId, missionId),
    projectId,
    missionId,
    twinBinding,
    targetSnapshotId: input.targetSnapshot.snapshotId,
    codeMapBinding,
    reassessmentBinding,
    traversalPolicyVersion: policy.version,
    traversalPolicyDigest: policy.digest,
    requirementsDigest,
    roots: Object.freeze(roots),
    requirements: Object.freeze(requirements),
    dependencies: orderedDependencies,
    paths: Object.freeze(paths),
    impactGapFindings: Object.freeze(findings),
    inputDigest
  });
  const result = Object.freeze({
    ...withoutDigest,
    resultDigest: await canonicalJsonDigest(withoutDigest)
  });
  await assertImpactAnalysisResultInvariant(result);
  return result;
}

function deepFreeze(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return Object.freeze(value);
  }
  for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  return Object.freeze(value);
}

function parseCitation(value: unknown): ImpactMemberCitation {
  const record = exactRecord(
    value,
    [
      "kind", "memberId", "revision", "digest", "sourceReference",
      "sourceRevisionOrDigest", "origin", "extractionMethod", "epistemicLabel"
    ],
    [],
    "IMPACT_INTEGRITY_INVALID"
  );
  try {
    if (
      (record.kind !== "NODE" && record.kind !== "RELATIONSHIP") ||
      !Number.isSafeInteger(record.revision) ||
      (record.revision as number) < 1 ||
      typeof record.sourceReference !== "string" ||
      record.sourceReference.length === 0 ||
      typeof record.extractionMethod !== "string" ||
      record.extractionMethod.length === 0 ||
      !isOriginKind(record.origin) ||
      record.origin === "AI_ADVISORY" ||
      !isEpistemicLabel(record.epistemicLabel)
    ) return fail("IMPACT_INTEGRITY_INVALID");
    parseStableId(record.memberId);
    parseSha256Digest(record.digest);
    parseTwinSourceReference(record.sourceReference);
    parseTwinExtractionMethod(record.extractionMethod);
    const source = exactRecord(
      record.sourceRevisionOrDigest,
      ["kind", "value"],
      [],
      "IMPACT_INTEGRITY_INVALID"
    );
    if (
      (source.kind !== "SOURCE_REVISION" && source.kind !== "CONTENT_DIGEST") ||
      typeof source.value !== "string" ||
      (source.kind === "CONTENT_DIGEST" && parseSha256Digest(source.value) !== source.value) ||
      (source.kind === "SOURCE_REVISION" &&
        parseTwinSourceRevision(source.value) !== source.value)
    ) return fail("IMPACT_INTEGRITY_INVALID");
  } catch (error) {
    if (error instanceof ImpactAnalysisError) throw error;
    return fail("IMPACT_INTEGRITY_INVALID");
  }
  return record as unknown as ImpactMemberCitation;
}

function parseStoredRequirement(value: unknown): ImpactRequirement {
  const record = exactRecord(
    value,
    ["requirementId", "rootId", "criticalAssetId", "supportKind", "basisCitations"],
    ["validationKey"],
    "IMPACT_INTEGRITY_INVALID"
  );
  try {
    const requirementId = parseValidationKey(record.requirementId);
    const rootId = parseValidationKey(record.rootId);
    const criticalAssetId = parseStableId<"CODE_MAP_ASSET">(record.criticalAssetId);
    if (!IMPACT_SUPPORT_KINDS.some((kind) => kind === record.supportKind)) {
      return fail("IMPACT_INTEGRITY_INVALID");
    }
    const supportKind = record.supportKind as ImpactSupportKind;
    const validationKey =
      record.validationKey === undefined ? undefined : parseValidationKey(record.validationKey);
    if (
      (supportKind === "VALIDATION" && validationKey === undefined) ||
      (supportKind === "IMPLEMENTATION" && validationKey !== undefined)
    ) return fail("IMPACT_INTEGRITY_INVALID");
    const basisCitations = boundedArray(
      record.basisCitations,
      MAXIMUM_IMPACT_BASIS_CITATIONS,
      "IMPACT_INTEGRITY_INVALID"
    ).map((reference) => {
      const member = exactRecord(
        reference,
        ["kind", "memberId", "revision", "digest"],
        [],
        "IMPACT_INTEGRITY_INVALID"
      );
      return normalizedReference(member as unknown as TwinProjectionMemberReference);
    });
    if (basisCitations.length === 0 || !orderedUnique(basisCitations.map(referenceKey))) {
      return fail("IMPACT_INTEGRITY_INVALID");
    }
    return {
      requirementId,
      rootId,
      criticalAssetId,
      supportKind,
      ...(validationKey === undefined ? {} : { validationKey }),
      basisCitations
    };
  } catch (error) {
    if (error instanceof ImpactAnalysisError) throw error;
    return fail("IMPACT_INTEGRITY_INVALID");
  }
}

export async function assertImpactAnalysisResultInvariant(
  result: ImpactAnalysisResult
): Promise<void> {
  try {
    const record = exactRecord(
      result,
      [
        "version", "digestVersion", "analysisKey", "projectId", "missionId",
        "twinBinding", "targetSnapshotId", "codeMapBinding", "reassessmentBinding",
        "traversalPolicyVersion", "traversalPolicyDigest", "requirementsDigest",
        "roots", "requirements", "dependencies", "paths", "impactGapFindings",
        "inputDigest", "resultDigest"
      ],
      [],
      "IMPACT_INTEGRITY_INVALID"
    );
    if (
      record.version !== IMPACT_ANALYSIS_VERSION ||
      record.digestVersion !== IMPACT_ANALYSIS_DIGEST_VERSION ||
      record.traversalPolicyVersion !== IMPACT_TRAVERSAL_POLICY_VERSION
    ) return fail("IMPACT_INTEGRITY_INVALID");
    const projectId = parseStableId<"PROJECT">(record.projectId);
    const missionId = parseStableId<"MISSION">(record.missionId);
    const targetSnapshotId = parseStableId<"GIT_SNAPSHOT">(record.targetSnapshotId);
    parseSha256Digest(record.analysisKey);
    parseSha256Digest(record.traversalPolicyDigest);
    parseSha256Digest(record.requirementsDigest);
    parseSha256Digest(record.inputDigest);
    parseSha256Digest(record.resultDigest);
    const policy = await impactTraversalPolicyIdentity();
    if (
      record.analysisKey !== await analysisKey(projectId, missionId) ||
      record.traversalPolicyDigest !== policy.digest
    ) return fail("IMPACT_INTEGRITY_INVALID");
    const twinBinding = exactRecord(
      record.twinBinding,
      ["projectionId", "revision", "projectionDigest"],
      [],
      "IMPACT_INTEGRITY_INVALID"
    );
    const codeMapBinding = exactRecord(
      record.codeMapBinding,
      ["projectionId", "revision", "projectionDigest", "evidenceKind", "inferenceStatus", "completeness"],
      [],
      "IMPACT_INTEGRITY_INVALID"
    );
    const reassessmentBinding = exactRecord(
      record.reassessmentBinding,
      ["reassessmentKey", "revision", "inputDigest", "resultDigest"],
      [],
      "IMPACT_INTEGRITY_INVALID"
    );
    parseStableId(twinBinding.projectionId);
    parseSha256Digest(twinBinding.projectionDigest);
    parseStableId(codeMapBinding.projectionId);
    parseSha256Digest(codeMapBinding.projectionDigest);
    if (
      (codeMapBinding.evidenceKind !== "STATIC_INFERENCE" &&
        codeMapBinding.evidenceKind !== "DECLARED_INTELLILOOP_FIXTURE") ||
      (codeMapBinding.inferenceStatus !== "AVAILABLE" &&
        codeMapBinding.inferenceStatus !== "UNAVAILABLE_SAFE_FAILURE") ||
      (codeMapBinding.completeness !== "COMPLETE" &&
        codeMapBinding.completeness !== "PARTIAL" &&
        codeMapBinding.completeness !== "UNAVAILABLE")
    ) return fail("IMPACT_INTEGRITY_INVALID");
    parseSha256Digest(reassessmentBinding.reassessmentKey);
    parseSha256Digest(reassessmentBinding.inputDigest);
    parseSha256Digest(reassessmentBinding.resultDigest);
    for (const binding of [twinBinding, codeMapBinding, reassessmentBinding]) {
      if (!Number.isSafeInteger(binding.revision) || (binding.revision as number) < 1) {
        return fail("IMPACT_INTEGRITY_INVALID");
      }
    }
    const roots = boundedArray(record.roots, MAXIMUM_IMPACT_ROOTS, "IMPACT_LIMIT_EXCEEDED")
      .map((value) => {
        const root = exactRecord(value, ["rootId", "node"], [], "IMPACT_INTEGRITY_INVALID");
        return { rootId: parseValidationKey(root.rootId), node: parseCitation(root.node) };
      });
    if (!orderedUnique(roots.map((root) => root.rootId))) return fail("IMPACT_INTEGRITY_INVALID");
    const requirements = boundedArray(
      record.requirements,
      MAXIMUM_IMPACT_REQUIREMENTS,
      "IMPACT_LIMIT_EXCEEDED"
    ).map(parseStoredRequirement);
    if (!orderedUnique(requirements.map((requirement) => requirement.requirementId))) {
      return fail("IMPACT_INTEGRITY_INVALID");
    }
    if (requirements.some(
      (requirement) => !roots.some((root) => root.rootId === requirement.rootId)
    )) return fail("IMPACT_INTEGRITY_INVALID");
    const expectedRequirementsDigest = await canonicalJsonDigest({
      version: IMPACT_REQUIREMENTS_VERSION,
      roots,
      requirements
    });
    if (expectedRequirementsDigest !== record.requirementsDigest) {
      return fail("IMPACT_INTEGRITY_INVALID");
    }
    const dependencies = boundedArray(
      record.dependencies,
      MAXIMUM_IMPACT_DEPENDENCIES,
      "IMPACT_LIMIT_EXCEEDED"
    ).map((value) => {
      const dependency = exactRecord(
        value,
        ["dependencyKind", "dependencyKey", "digest"],
        ["citation"],
        "IMPACT_INTEGRITY_INVALID"
      );
      if (
        !IMPACT_DEPENDENCY_KINDS.some((kind) => kind === dependency.dependencyKind) ||
        typeof dependency.dependencyKey !== "string" ||
        dependency.dependencyKey.length === 0
      ) return fail("IMPACT_INTEGRITY_INVALID");
      parseSha256Digest(dependency.digest);
      if (dependency.citation !== undefined) {
        const citation = parseCitation(dependency.citation);
        if (citation.digest !== dependency.digest) return fail("IMPACT_INTEGRITY_INVALID");
      }
      return dependency;
    });
    if (!orderedUnique(dependencies.map((dependency) => String(dependency.dependencyKey)))) {
      return fail("IMPACT_INTEGRITY_INVALID");
    }
    const dependencyByKey = new Map(
      dependencies.map((dependency) => [String(dependency.dependencyKey), dependency])
    );
    const exactDependency = (
      key: string,
      kind: ImpactDependencyKind,
      digest: unknown
    ): void => {
      const dependency = dependencyByKey.get(key);
      if (
        dependency?.dependencyKind !== kind ||
        dependency.digest !== digest
      ) return fail("IMPACT_INTEGRITY_INVALID");
    };
    exactDependency(
      `twin-projection:${String(twinBinding.projectionId)}`,
      "TWIN_PROJECTION",
      twinBinding.projectionDigest
    );
    exactDependency(
      `code-map:${String(codeMapBinding.projectionId)}`,
      "CODE_MAP",
      codeMapBinding.projectionDigest
    );
    exactDependency(
      `reassessment:${String(reassessmentBinding.reassessmentKey)}`,
      "REASSESSMENT",
      reassessmentBinding.inputDigest
    );
    exactDependency(
      `traversal-policy:${IMPACT_TRAVERSAL_POLICY_VERSION}`,
      "TRAVERSAL_POLICY",
      policy.digest
    );
    exactDependency(
      `requirement-set:${IMPACT_REQUIREMENTS_VERSION}`,
      "REQUIREMENT_SET",
      record.requirementsDigest
    );
    if (
      dependencyByKey.get(`snapshot:${targetSnapshotId}`)?.dependencyKind !==
      "TARGET_SNAPSHOT"
    ) return fail("IMPACT_INTEGRITY_INVALID");
    const assertCitationDependency = (citation: ImpactMemberCitation): void => {
      const dependency = dependencyByKey.get(
        `twin-member:${citation.kind}:${citation.memberId}`
      );
      if (
        dependency?.dependencyKind !== "TWIN_MEMBER" ||
        dependency.digest !== citation.digest ||
        canonicalizeJson(dependency.citation) !== canonicalizeJson(citation)
      ) return fail("IMPACT_INTEGRITY_INVALID");
    };
    for (const root of roots) assertCitationDependency(root.node);
    for (const requirement of requirements) {
      for (const reference of requirement.basisCitations) {
        const dependency = dependencyByKey.get(
          `twin-member:${reference.kind}:${reference.memberId}`
        );
        if (
          dependency?.dependencyKind !== "TWIN_MEMBER" ||
          dependency.digest !== reference.digest
        ) return fail("IMPACT_INTEGRITY_INVALID");
      }
    }
    const paths = boundedArray(record.paths, MAXIMUM_IMPACT_PATHS, "IMPACT_LIMIT_EXCEEDED");
    const pathOrder: string[] = [];
    const pathKeys = new Set<string>();
    for (const value of paths) {
      const path = exactRecord(
        value,
        [
          "pathKeyVersion", "pathDigestVersion", "pathKey", "pathDigest", "rootId",
          "requirementId", "supportKind", "root", "criticalAsset", "depth", "steps"
        ],
        ["terminalValidation", "validationStatus"],
        "IMPACT_INTEGRITY_INVALID"
      );
      if (
        path.pathKeyVersion !== IMPACT_PATH_KEY_VERSION ||
        path.pathDigestVersion !== IMPACT_PATH_DIGEST_VERSION ||
        !IMPACT_SUPPORT_KINDS.some((kind) => kind === path.supportKind) ||
        !Number.isSafeInteger(path.depth) ||
        (path.depth as number) < 0 ||
        (path.depth as number) > MAXIMUM_IMPACT_TRAVERSAL_DEPTH
      ) return fail("IMPACT_INTEGRITY_INVALID");
      const rootId = parseValidationKey(path.rootId);
      const requirementId = parseValidationKey(path.requirementId);
      const rootCitation = parseCitation(path.root);
      const criticalAsset = parseCitation(path.criticalAsset);
      const terminalValidation =
        path.terminalValidation === undefined ? undefined : parseCitation(path.terminalValidation);
      const declaredRoot = roots.find((entry) => entry.rootId === rootId);
      if (
        declaredRoot === undefined ||
        canonicalizeJson(declaredRoot.node) !== canonicalizeJson(rootCitation) ||
        rootCitation.kind !== "NODE" ||
        criticalAsset.kind !== "NODE" ||
        (terminalValidation !== undefined && terminalValidation.kind !== "NODE") ||
        (path.supportKind === "IMPLEMENTATION" &&
          (terminalValidation !== undefined || path.validationStatus !== undefined)) ||
        (path.supportKind === "VALIDATION" &&
          ((terminalValidation === undefined) !== (path.validationStatus === undefined))) ||
        (path.validationStatus !== undefined &&
          !VALIDATION_RESULT_STATUSES.some((status) => status === path.validationStatus))
      ) return fail("IMPACT_INTEGRITY_INVALID");
      const steps = boundedArray(
        path.steps,
        MAXIMUM_IMPACT_TRAVERSAL_DEPTH,
        "IMPACT_INTEGRITY_INVALID"
      ).map((stepValue, index) => {
        const step = exactRecord(
          stepValue,
          ["stepIndex", "direction", "relationshipType", "from", "relationship", "to"],
          [],
          "IMPACT_INTEGRITY_INVALID"
        );
        if (
          step.stepIndex !== index ||
          !IMPACT_TRAVERSAL_DIRECTIONS.some((direction) => direction === step.direction) ||
          !IMPACT_TRAVERSAL_RELATIONSHIP_TYPES.some((type) => type === step.relationshipType)
        ) return fail("IMPACT_INTEGRITY_INVALID");
        return {
          ...step,
          from: parseCitation(step.from),
          relationship: parseCitation(step.relationship),
          to: parseCitation(step.to)
        };
      });
      if (
        steps.length !== path.depth ||
        (steps[0]?.from.memberId ?? rootCitation.memberId) !== rootCitation.memberId ||
        steps.some(
          (step, index) =>
            step.relationship.kind !== "RELATIONSHIP" ||
            step.from.kind !== "NODE" ||
            step.to.kind !== "NODE" ||
            (index > 0 && steps[index - 1]?.to.memberId !== step.from.memberId)
        ) ||
        (terminalValidation === undefined
          ? (steps.at(-1)?.to.memberId ?? rootCitation.memberId) !== criticalAsset.memberId
          : steps.at(-1)?.to.memberId !== terminalValidation.memberId)
      ) return fail("IMPACT_INTEGRITY_INVALID");
      const requirement = requirements.find((entry) => entry.requirementId === requirementId);
      if (requirement === undefined || requirement.rootId !== rootId || requirement.supportKind !== path.supportKind) {
        return fail("IMPACT_INTEGRITY_INVALID");
      }
      const expectedPathKey = await canonicalJsonDigest({
        version: IMPACT_PATH_KEY_VERSION,
        scope: { projectId, missionId },
        rootId,
        requirementId,
        supportKind: path.supportKind,
        criticalAssetId: requirement.criticalAssetId,
        terminalValidationId: terminalValidation?.memberId ?? null
      });
      const { pathDigest: _pathDigest, ...pathWithoutDigest } = path;
      const expectedPathDigest = await canonicalJsonDigest({
        version: IMPACT_PATH_DIGEST_VERSION,
        path: pathWithoutDigest
      });
      if (
        path.pathKey !== expectedPathKey ||
        path.pathDigest !== expectedPathDigest ||
        pathKeys.has(String(path.pathKey))
      ) return fail("IMPACT_INTEGRITY_INVALID");
      pathKeys.add(String(path.pathKey));
      pathOrder.push(`${requirementId}:${String(path.pathKey)}`);
      assertCitationDependency(rootCitation);
      assertCitationDependency(criticalAsset);
      if (terminalValidation !== undefined) assertCitationDependency(terminalValidation);
      for (const step of steps) {
        assertCitationDependency(step.from);
        assertCitationDependency(step.relationship);
        assertCitationDependency(step.to);
      }
    }
    if (!orderedUnique(pathOrder)) return fail("IMPACT_INTEGRITY_INVALID");
    const findings = boundedArray(
      record.impactGapFindings,
      MAXIMUM_IMPACT_REQUIREMENTS,
      "IMPACT_LIMIT_EXCEEDED"
    );
    const findingOrder: string[] = [];
    for (const value of findings) {
      const finding = exactRecord(
        value,
        [
          "entityType", "findingKind", "status", "findingKeyVersion", "findingKey",
          "projectId", "missionId", "requirement", "reason", "basisCitations",
          "targetSnapshotId", "traversalPolicyVersion", "traversalPolicyDigest",
          "requirementsDigest"
        ],
        ["criticalAsset", "supportingPathKey"],
        "IMPACT_INTEGRITY_INVALID"
      );
      const requirement = parseStoredRequirement(finding.requirement);
      const criticalAsset =
        finding.criticalAsset === undefined ? undefined : parseCitation(finding.criticalAsset);
      const supportingPathKey =
        finding.supportingPathKey === undefined
          ? undefined
          : parseSha256Digest(finding.supportingPathKey);
      const reason = finding.reason as ImpactGapReason;
      if (
        finding.entityType !== "ReconciliationFinding" ||
        finding.findingKind !== "IMPACT_GAP" ||
        finding.status !== "OPEN" ||
        finding.findingKeyVersion !== IMPACT_GAP_FINDING_KEY_VERSION ||
        finding.projectId !== projectId ||
        finding.missionId !== missionId ||
        !IMPACT_GAP_REASONS.some((reason) => reason === finding.reason) ||
        ((reason === "REQUIRED_VALIDATION_RESULT_ABSENT" ||
          reason === "REQUIRED_VALIDATION_PATH_ABSENT") &&
          requirement.supportKind !== "VALIDATION") ||
        (reason === "CRITICAL_IMPLEMENTATION_ASSET_ABSENT" &&
          (criticalAsset !== undefined || supportingPathKey !== undefined)) ||
        (reason === "CRITICAL_IMPLEMENTATION_PATH_ABSENT" &&
          (criticalAsset === undefined || supportingPathKey !== undefined)) ||
        ((reason === "REQUIRED_VALIDATION_RESULT_ABSENT" ||
          reason === "REQUIRED_VALIDATION_PATH_ABSENT" ||
          reason === "IMPLEMENTATION_SUPPORT_UNAVAILABLE") &&
          (criticalAsset === undefined ||
            supportingPathKey === undefined ||
            !pathKeys.has(supportingPathKey))) ||
        finding.targetSnapshotId !== targetSnapshotId ||
        finding.traversalPolicyVersion !== policy.version ||
        finding.traversalPolicyDigest !== policy.digest ||
        finding.requirementsDigest !== record.requirementsDigest ||
        canonicalizeJson(finding.basisCitations) !== canonicalizeJson(requirement.basisCitations) ||
        !requirements.some(
          (entry) => canonicalizeJson(entry) === canonicalizeJson(requirement)
        )
      ) return fail("IMPACT_INTEGRITY_INVALID");
      const expectedFindingKey = await canonicalJsonDigest({
        version: IMPACT_GAP_FINDING_KEY_VERSION,
        scope: { projectId, missionId },
        requirement,
        reason,
        targetSnapshotId,
        criticalAsset: criticalAsset === undefined ? null : citationReference(criticalAsset),
        supportingPathKey: supportingPathKey ?? null,
        traversalPolicy: policy,
        requirementsDigest: record.requirementsDigest
      });
      if (expectedFindingKey !== finding.findingKey) return fail("IMPACT_INTEGRITY_INVALID");
      findingOrder.push(`${requirement.requirementId}:${String(finding.findingKey)}`);
    }
    if (!orderedUnique(findingOrder)) return fail("IMPACT_INTEGRITY_INVALID");
    const expectedInputDigest = await canonicalJsonDigest({
      version: IMPACT_ANALYSIS_VERSION,
      scope: { projectId, missionId },
      twinBinding,
      targetSnapshotId,
      codeMapBinding,
      reassessmentInputDigest: reassessmentBinding.inputDigest,
      traversalPolicy: policy,
      requirementsDigest: record.requirementsDigest,
      roots,
      requirements,
      dependencies
    });
    if (expectedInputDigest !== record.inputDigest) return fail("IMPACT_INTEGRITY_INVALID");
    const { resultDigest: _resultDigest, ...withoutDigest } = record;
    if (await canonicalJsonDigest(withoutDigest) !== record.resultDigest) {
      return fail("IMPACT_INTEGRITY_INVALID");
    }
  } catch (error) {
    if (error instanceof ImpactAnalysisError) throw error;
    return fail("IMPACT_INTEGRITY_INVALID");
  }
}

export async function serializeImpactAnalysisResult(
  result: ImpactAnalysisResult
): Promise<string> {
  await assertImpactAnalysisResultInvariant(result);
  const serialized = canonicalizeJson(result);
  if (byteLength(serialized) > MAXIMUM_IMPACT_ANALYSIS_SERIALIZED_BYTES) {
    return fail("IMPACT_LIMIT_EXCEEDED");
  }
  return serialized;
}

export async function deserializeImpactAnalysisResult(
  serialized: string
): Promise<ImpactAnalysisResult> {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    byteLength(serialized) > MAXIMUM_IMPACT_ANALYSIS_SERIALIZED_BYTES
  ) return fail("IMPACT_SERIALIZATION_INVALID");
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    return fail("IMPACT_SERIALIZATION_INVALID");
  }
  try {
    if (canonicalizeJson(value) !== serialized) return fail("IMPACT_SERIALIZATION_INVALID");
    const result = deepFreeze(value) as ImpactAnalysisResult;
    await assertImpactAnalysisResultInvariant(result);
    return result;
  } catch (error) {
    if (error instanceof ImpactAnalysisError) {
      if (error.code === "IMPACT_LIMIT_EXCEEDED") throw error;
      return fail("IMPACT_SERIALIZATION_INVALID");
    }
    return fail("IMPACT_SERIALIZATION_INVALID");
  }
}
