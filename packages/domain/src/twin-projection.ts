import {
  assertClaimInvariant,
  assertClaimSupersessionInvariant,
  type Claim,
  type ClaimSupersession
} from "./claim.js";
import {
  assertCodeMapProjectionRevisionInvariant,
  codeMapSnapshotDigest,
  type CodeMapProjectionRevision
} from "./code-map-projection.js";
import { canonicalizeJson, type JsonObject } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  sha256TextDigest,
  type Sha256Digest
} from "./digest.js";
import {
  assertEvidenceSourceInvariant,
  type EvidenceSource
} from "./evidence-source.js";
import {
  assertGitSnapshotInvariant,
  type GitSnapshot
} from "./git-snapshot.js";
import { isEpistemicLabel, isOriginKind } from "./record-metadata.js";
import {
  assertChangeMissionInvariant,
  assertProjectInvariant,
  type ChangeMission,
  type MissionId,
  type Project,
  type ProjectId
} from "./project.js";
import {
  createStableIdGenerator,
  parseStableId,
  type StableId
} from "./stable-id.js";
import { parseUtcTimestamp, type UtcTimestamp } from "./time.js";
import {
  TWIN_NODE_TYPES,
  TWIN_RELATIONSHIP_TYPES,
  createTwinNode,
  createTwinRelationship,
  deserializeTwinNode,
  deserializeTwinRelationship,
  parseTwinRevision,
  serializeTwinNode,
  serializeTwinRelationship,
  type TwinNode,
  type TwinNodeId,
  type TwinNodeType,
  type TwinRecordMetadataInput,
  type TwinRelationship,
  type TwinRelationshipId,
  type TwinRelationshipType,
  type TwinRevision
} from "./twin-vocabulary.js";
import {
  assertValidationResultInvariant,
  type ValidationResult
} from "./validation-result.js";

export const TWIN_PROJECTION_VERSION = "twin-projection.v1";
export const TWIN_PROJECTION_DIGEST_VERSION = "twin-projection-digest.v1";
export const TWIN_PROJECTION_INPUT_DIGEST_VERSION =
  "twin-projection-input-digest.v1";
export const TWIN_PROJECTION_ID_VERSION = "twin-projection-id.v1";
export const TWIN_PROJECTION_MEMBER_ID_VERSION =
  "twin-projection-member-id.v1";
export const TWIN_CODE_MAP_BINDING_VERSION = "twin-code-map-binding.v1";
export const MAXIMUM_TWIN_PROJECTION_NODES = 10_000;
export const MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS = 50_000;
export const MAXIMUM_TWIN_PROJECTION_DEPENDENCIES = 100_000;
export const MAXIMUM_TWIN_PROJECTION_SERIALIZED_BYTES = 16_777_216;

export const TWIN_PROJECTION_MEMBER_KINDS = ["NODE", "RELATIONSHIP"] as const;
export const TWIN_INVALIDATION_CHANGE_TYPES = ["CHANGED", "REMOVED"] as const;
export const TWIN_PROJECTED_SOURCE_TYPES = [
  "Project",
  "ChangeMission",
  "EvidenceSource",
  "Claim",
  "SoftwareAsset",
  "GitSnapshot",
  "ValidationResult"
] as const;
export const TWIN_IMPACT_RELATIONSHIP_TYPES = [
  "AFFECTS",
  "DEPENDS_ON",
  "IMPLEMENTS",
  "VALIDATED_BY"
] as const;
export const TWIN_PROJECTION_ERROR_CODES = [
  "TWIN_PROJECTION_SCOPE_INVALID",
  "TWIN_PROJECTION_INPUT_INVALID",
  "TWIN_PROJECTION_DUPLICATE_SOURCE",
  "TWIN_PROJECTION_DEPENDENCY_INVALID",
  "TWIN_PROJECTION_PREDECESSOR_INVALID",
  "TWIN_PROJECTION_LIMIT_EXCEEDED",
  "TWIN_PROJECTION_SERIALIZATION_INVALID",
  "TWIN_PROJECTION_INTEGRITY_INVALID"
] as const;

export type TwinProjectionId = StableId<"TWIN_PROJECTION">;
export type TwinProjectionMemberKind =
  (typeof TWIN_PROJECTION_MEMBER_KINDS)[number];
export type TwinInvalidationChangeType =
  (typeof TWIN_INVALIDATION_CHANGE_TYPES)[number];
export type TwinProjectedSourceType =
  (typeof TWIN_PROJECTED_SOURCE_TYPES)[number];
export type TwinImpactRelationshipType =
  (typeof TWIN_IMPACT_RELATIONSHIP_TYPES)[number];
export type TwinProjectionErrorCode =
  (typeof TWIN_PROJECTION_ERROR_CODES)[number];
export type TwinProjectionMemberId = TwinNodeId | TwinRelationshipId;

export interface TwinProjectionMemberIdentity {
  readonly kind: TwinProjectionMemberKind;
  readonly memberId: TwinProjectionMemberId;
}

export interface TwinProjectionMemberReference
  extends TwinProjectionMemberIdentity {
  readonly revision: TwinRevision;
  readonly digest: Sha256Digest;
}

export interface TwinProjectionNodeSource {
  readonly nodeId: TwinNodeId;
  readonly nodeRevision: TwinRevision;
  readonly sourceType: TwinProjectedSourceType;
  readonly sourceId: StableId;
  readonly sourceDigest: Sha256Digest;
}

export interface TwinDependencyBinding {
  readonly dependency: TwinProjectionMemberIdentity;
  readonly dependent: TwinProjectionMemberIdentity;
}

export interface TwinDependencyInvalidation {
  readonly changeType: TwinInvalidationChangeType;
  readonly dependencyBefore: TwinProjectionMemberReference;
  readonly dependencyAfter?: TwinProjectionMemberReference;
  readonly exactDependents: readonly TwinProjectionMemberReference[];
}

export interface TwinProjectionPredecessor {
  readonly projectionId: TwinProjectionId;
  readonly revision: TwinRevision;
  readonly projectionDigest: Sha256Digest;
}

export interface TwinProjectionRevision {
  readonly projectionVersion: typeof TWIN_PROJECTION_VERSION;
  readonly projectionId: TwinProjectionId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly revision: TwinRevision;
  readonly inputDigest: Sha256Digest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly predecessor?: TwinProjectionPredecessor;
  readonly codeMapBinding?: {
    readonly projectionId: CodeMapProjectionRevision["projectionId"];
    readonly revision: CodeMapProjectionRevision["revision"];
    readonly projectionDigest: Sha256Digest;
  };
  readonly nodes: readonly TwinNode[];
  readonly relationships: readonly TwinRelationship[];
  readonly nodeSources: readonly TwinProjectionNodeSource[];
  readonly dependencyBindings: readonly TwinDependencyBinding[];
  readonly invalidations: readonly TwinDependencyInvalidation[];
  readonly projectionDigest: Sha256Digest;
}

export interface ProjectTwinRevisionInput {
  readonly project: Project;
  readonly mission: ChangeMission;
  readonly evidenceSources: readonly EvidenceSource[];
  readonly claims: readonly Claim[];
  readonly claimSupersessions: readonly ClaimSupersession[];
  readonly snapshots: readonly GitSnapshot[];
  readonly validationResults: readonly ValidationResult[];
  readonly codeMap?: CodeMapProjectionRevision;
  readonly semanticRelationships?: readonly TwinSemanticRelationshipInput[];
}

export interface TwinSemanticRelationshipInput {
  readonly relationshipKey: string;
  readonly relationshipType: TwinImpactRelationshipType;
  readonly from: {
    readonly sourceType: TwinProjectedSourceType;
    readonly sourceId: string;
  };
  readonly to: {
    readonly sourceType: TwinProjectedSourceType;
    readonly sourceId: string;
  };
  readonly attribution: {
    readonly origin: TwinRecordMetadataInput["origin"];
    readonly sourceReference: string;
    readonly recordedAtUtc: string;
    readonly effectiveAtUtc?: string;
    readonly extractionMethod: string;
    readonly epistemicLabel: TwinRecordMetadataInput["epistemicLabel"];
  };
}

interface SourceDescriptor {
  readonly sourceType: TwinProjectedSourceType;
  readonly sourceId: StableId;
  readonly nodeType: TwinNodeType;
  readonly digest: Sha256Digest;
  readonly metadata: TwinRecordMetadataInput;
}

interface RelationshipMetadata {
  readonly origin: TwinRecordMetadataInput["origin"];
  readonly sourceReference: string;
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: string;
  readonly epistemicLabel: TwinRecordMetadataInput["epistemicLabel"];
}

const ERROR_MESSAGES: Readonly<Record<TwinProjectionErrorCode, string>> =
  Object.freeze({
    TWIN_PROJECTION_SCOPE_INVALID: "Twin projection scope is invalid.",
    TWIN_PROJECTION_INPUT_INVALID: "Twin projection input is invalid.",
    TWIN_PROJECTION_DUPLICATE_SOURCE:
      "Twin projection contains duplicate source identity.",
    TWIN_PROJECTION_DEPENDENCY_INVALID:
      "Twin projection dependency is invalid.",
    TWIN_PROJECTION_PREDECESSOR_INVALID:
      "Twin projection predecessor is invalid.",
    TWIN_PROJECTION_LIMIT_EXCEEDED: "Twin projection limit is exceeded.",
    TWIN_PROJECTION_SERIALIZATION_INVALID:
      "Twin projection serialization is invalid.",
    TWIN_PROJECTION_INTEGRITY_INVALID: "Twin projection integrity is invalid."
  });

export class TwinProjectionError extends Error {
  readonly code: TwinProjectionErrorCode;

  constructor(code: TwinProjectionErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "TwinProjectionError";
    this.code = code;
  }
}

function fail(code: TwinProjectionErrorCode): never {
  throw new TwinProjectionError(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  code: TwinProjectionErrorCode
): Record<string, unknown> {
  if (!isPlainObject(value)) return fail(code);
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

function exactArray(
  value: unknown,
  maximum: number,
  code: TwinProjectionErrorCode
): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) return fail(code);
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => {
      if (key === "length") return false;
      if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/u.test(key)) {
        return true;
      }
      const index = Number(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        !Number.isSafeInteger(index) ||
        index >= value.length ||
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      );
    })
  ) {
    return fail(code);
  }
  return value;
}

function nextRevision(previous?: TwinRevision): TwinRevision {
  if (previous === Number.MAX_SAFE_INTEGER) {
    return fail("TWIN_PROJECTION_PREDECESSOR_INVALID");
  }
  return parseTwinRevision(previous === undefined ? 1 : previous + 1);
}

async function deterministicId<Tag extends string>(
  namespace: string,
  value: JsonObject
): Promise<StableId<Tag>> {
  const digest = await sha256TextDigest(
    canonicalizeJson({ namespace, value })
  );
  const hex = digest.slice("sha256:".length);
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16
  )}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return parseStableId<Tag>(uuid);
}

async function projectDigest(value: JsonObject): Promise<Sha256Digest> {
  return canonicalJsonDigest(value);
}

function maximumTime(values: readonly UtcTimestamp[]): UtcTimestamp {
  const sorted = [...values].sort();
  const latest = sorted.at(-1);
  if (latest === undefined) return fail("TWIN_PROJECTION_INPUT_INVALID");
  return latest;
}

function assertUnique(values: readonly string[]): void {
  if (new Set(values).size !== values.length) {
    return fail("TWIN_PROJECTION_DUPLICATE_SOURCE");
  }
}

function assertStrictlySorted(values: readonly string[]): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      previous === undefined ||
      current === undefined ||
      previous.localeCompare(current) >= 0
    ) {
      return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
    }
  }
}

async function validateInput(input: ProjectTwinRevisionInput): Promise<void> {
  try {
    assertProjectInvariant(input.project);
    assertChangeMissionInvariant(input.mission);
  } catch {
    return fail("TWIN_PROJECTION_INPUT_INVALID");
  }
  if (input.mission.projectId !== input.project.projectId) {
    return fail("TWIN_PROJECTION_SCOPE_INVALID");
  }
  const arrays = [
    input.evidenceSources,
    input.claims,
    input.claimSupersessions,
    input.snapshots,
    input.validationResults
  ];
  if (arrays.some((value) => !Array.isArray(value))) {
    return fail("TWIN_PROJECTION_INPUT_INVALID");
  }
  if (
    input.semanticRelationships !== undefined &&
    !Array.isArray(input.semanticRelationships)
  ) {
    return fail("TWIN_PROJECTION_INPUT_INVALID");
  }
  const totalSources =
    arrays.reduce((total, value) => total + value.length, 2) +
    (input.codeMap?.assets.length ?? 0);
  if (totalSources > MAXIMUM_TWIN_PROJECTION_NODES) {
    return fail("TWIN_PROJECTION_LIMIT_EXCEEDED");
  }

  assertUnique(input.evidenceSources.map((source) => source.evidenceSourceId));
  assertUnique(input.claims.map((claim) => claim.claimId));
  assertUnique(input.snapshots.map((snapshot) => snapshot.snapshotId));
  assertUnique(
    input.validationResults.map((result) => result.validationResultId)
  );
  assertUnique(
    input.claimSupersessions.map((link) => link.claimSupersessionId)
  );
  const semanticRelationships = input.semanticRelationships ?? [];
  if (
    semanticRelationships.length > MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS
  ) {
    return fail("TWIN_PROJECTION_LIMIT_EXCEEDED");
  }
  if (
    semanticRelationships.some(
      (relationship) =>
        !isPlainObject(relationship) ||
        !isPlainObject(relationship.from) ||
        !isPlainObject(relationship.to) ||
        !isPlainObject(relationship.attribution)
    )
  ) {
    return fail("TWIN_PROJECTION_INPUT_INVALID");
  }
  assertUnique(
    semanticRelationships.map((relationship) => relationship.relationshipKey)
  );
  assertUnique(
    semanticRelationships.map(
      (relationship) =>
        `${relationship.relationshipType}:${relationship.from.sourceType}:${relationship.from.sourceId}>${relationship.to.sourceType}:${relationship.to.sourceId}`
    )
  );

  const sourceById = new Map(
    input.evidenceSources.map((source) => [source.evidenceSourceId, source])
  );
  const claimById = new Map(input.claims.map((claim) => [claim.claimId, claim]));
  const snapshotById = new Map(
    input.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot])
  );

  for (const source of input.evidenceSources) {
    if (
      source.projectId !== input.project.projectId ||
      source.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_SCOPE_INVALID");
    }
    try {
      await assertEvidenceSourceInvariant(source);
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
  }
  for (const snapshot of input.snapshots) {
    if (
      snapshot.projectId !== input.project.projectId ||
      snapshot.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_SCOPE_INVALID");
    }
    try {
      assertGitSnapshotInvariant(snapshot);
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
  }
  for (const claim of input.claims) {
    if (
      claim.projectId !== input.project.projectId ||
      claim.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_SCOPE_INVALID");
    }
    const source = sourceById.get(claim.evidenceSourceId);
    if (source === undefined) return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
    const predecessor =
      claim.supersedesClaimId === undefined
        ? undefined
        : claimById.get(claim.supersedesClaimId);
    if (claim.supersedesClaimId !== undefined && predecessor === undefined) {
      return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
    }
    try {
      await assertClaimInvariant(claim, source, predecessor);
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
  }
  for (const link of input.claimSupersessions) {
    if (
      link.projectId !== input.project.projectId ||
      link.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_SCOPE_INVALID");
    }
    const predecessor = claimById.get(link.predecessorClaimId);
    const successor = claimById.get(link.successorClaimId);
    if (predecessor === undefined || successor === undefined) {
      return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
    }
    try {
      await assertClaimSupersessionInvariant(link, successor, predecessor);
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
  }
  for (const result of input.validationResults) {
    if (
      result.projectId !== input.project.projectId ||
      result.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_SCOPE_INVALID");
    }
    const source = sourceById.get(result.evidenceSourceId);
    const snapshot = snapshotById.get(result.snapshotId);
    if (source === undefined || snapshot === undefined) {
      return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
    }
    try {
      await assertValidationResultInvariant(result, source, snapshot);
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
  }
  if (input.codeMap !== undefined) {
    try {
      await assertCodeMapProjectionRevisionInvariant(input.codeMap);
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
    if (
      input.codeMap.projectId !== input.project.projectId ||
      input.codeMap.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_SCOPE_INVALID");
    }
    const snapshot = snapshotById.get(input.codeMap.snapshotId);
    if (
      snapshot === undefined ||
      snapshot.registrationId !== input.codeMap.registrationId ||
      (await codeMapSnapshotDigest(snapshot)) !== input.codeMap.snapshotDigest
    ) {
      return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
    }
  }
  for (const relationship of semanticRelationships) {
    if (
      typeof relationship.relationshipKey !== "string" ||
      relationship.relationshipKey.length < 3 ||
      relationship.relationshipKey.length > 512 ||
      relationship.relationshipKey !== relationship.relationshipKey.trim() ||
      /[\u0000-\u001f\u007f]/u.test(relationship.relationshipKey) ||
      !TWIN_IMPACT_RELATIONSHIP_TYPES.some(
        (value) => value === relationship.relationshipType
      ) ||
      !TWIN_PROJECTED_SOURCE_TYPES.some(
        (value) => value === relationship.from.sourceType
      ) ||
      !TWIN_PROJECTED_SOURCE_TYPES.some(
        (value) => value === relationship.to.sourceType
      ) ||
      !isOriginKind(relationship.attribution.origin) ||
      relationship.attribution.origin === "AI_ADVISORY" ||
      !isEpistemicLabel(relationship.attribution.epistemicLabel) ||
      typeof relationship.attribution.sourceReference !== "string" ||
      relationship.attribution.sourceReference.length === 0 ||
      relationship.attribution.sourceReference.length > 2_048 ||
      relationship.attribution.sourceReference !==
        relationship.attribution.sourceReference.trim() ||
      typeof relationship.attribution.extractionMethod !== "string" ||
      relationship.attribution.extractionMethod.length === 0 ||
      relationship.attribution.extractionMethod.length > 256 ||
      relationship.attribution.extractionMethod !==
        relationship.attribution.extractionMethod.trim()
    ) {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
    try {
      parseStableId(relationship.from.sourceId);
      parseStableId(relationship.to.sourceId);
      parseUtcTimestamp(relationship.attribution.recordedAtUtc);
      if (relationship.attribution.effectiveAtUtc !== undefined) {
        parseUtcTimestamp(relationship.attribution.effectiveAtUtc);
      }
    } catch {
      return fail("TWIN_PROJECTION_INPUT_INVALID");
    }
    const fromIsClaim = relationship.from.sourceType === "Claim";
    const fromIsAsset = relationship.from.sourceType === "SoftwareAsset";
    const toIsClaim = relationship.to.sourceType === "Claim";
    const toIsAsset = relationship.to.sourceType === "SoftwareAsset";
    const endpointShapeValid =
      (relationship.relationshipType === "AFFECTS" &&
        (fromIsClaim || fromIsAsset) &&
        toIsAsset) ||
      (relationship.relationshipType === "DEPENDS_ON" &&
        fromIsAsset &&
        toIsAsset) ||
      (relationship.relationshipType === "IMPLEMENTS" &&
        ((fromIsAsset && toIsClaim) || (fromIsClaim && toIsAsset))) ||
      (relationship.relationshipType === "VALIDATED_BY" &&
        fromIsAsset &&
        relationship.to.sourceType === "ValidationResult");
    if (!endpointShapeValid) {
      return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
    }
  }
}

async function projectSourceDescriptors(
  input: ProjectTwinRevisionInput
): Promise<readonly SourceDescriptor[]> {
  const projectEntityDigest = await projectDigest({
    sourceType: "Project",
    projectId: input.project.projectId,
    name: input.project.name,
    status: input.project.status,
    revision: input.project.revision,
    createdAtUtc: input.project.createdAtUtc,
    updatedAtUtc: input.project.updatedAtUtc,
    archivedAtUtc: input.project.archivedAtUtc ?? null
  });
  const missionEntityDigest = await projectDigest({
    sourceType: "ChangeMission",
    missionId: input.mission.missionId,
    projectId: input.mission.projectId,
    title: input.mission.title,
    status: input.mission.status,
    revision: input.mission.revision,
    createdAtUtc: input.mission.createdAtUtc,
    updatedAtUtc: input.mission.updatedAtUtc,
    archivedAtUtc: input.mission.archivedAtUtc ?? null
  });
  const snapshotDigests = new Map<string, Sha256Digest>();
  for (const snapshot of input.snapshots) {
    snapshotDigests.set(
      snapshot.snapshotId,
      await projectDigest({
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
      })
    );
  }

  const descriptors: SourceDescriptor[] = [
    {
      sourceType: "Project",
      sourceId: input.project.projectId,
      nodeType: "Project",
      digest: projectEntityDigest,
      metadata: {
        projectId: input.project.projectId,
        missionId: input.mission.missionId,
        origin: "USER_INPUT",
        sourceReference: `project:${input.project.projectId}`,
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: projectEntityDigest
        },
        recordedAtUtc: input.project.updatedAtUtc,
        extractionMethod: "DETERMINISTIC_PROJECTION",
        epistemicLabel: "FACT"
      }
    },
    {
      sourceType: "ChangeMission",
      sourceId: input.mission.missionId,
      nodeType: "ChangeMission",
      digest: missionEntityDigest,
      metadata: {
        projectId: input.project.projectId,
        missionId: input.mission.missionId,
        origin: "USER_INPUT",
        sourceReference: `mission:${input.mission.missionId}`,
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: missionEntityDigest
        },
        recordedAtUtc: input.mission.updatedAtUtc,
        extractionMethod: "DETERMINISTIC_PROJECTION",
        epistemicLabel: "FACT"
      }
    }
  ];

  for (const source of input.evidenceSources) {
    descriptors.push({
      sourceType: "EvidenceSource",
      sourceId: source.evidenceSourceId,
      nodeType: "EvidenceSource",
      digest: source.importKey,
      metadata: {
        projectId: source.projectId,
        missionId: source.missionId,
        origin: source.origin,
        sourceReference: source.sourceLocator,
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: source.importKey
        },
        recordedAtUtc: source.recordedAtUtc,
        ...(source.effectiveAtUtc === undefined
          ? {}
          : { effectiveAtUtc: source.effectiveAtUtc }),
        extractionMethod: source.extractionMethod,
        epistemicLabel: source.epistemicLabel
      }
    });
  }
  for (const claim of input.claims) {
    descriptors.push({
      sourceType: "Claim",
      sourceId: claim.claimId,
      nodeType: "Claim",
      digest: claim.claimDigest,
      metadata: {
        projectId: claim.projectId,
        missionId: claim.missionId,
        origin: claim.origin,
        sourceReference: claim.sourceLocator,
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: claim.claimDigest
        },
        recordedAtUtc: claim.recordedAtUtc,
        ...(claim.effectiveAtUtc === undefined
          ? {}
          : { effectiveAtUtc: claim.effectiveAtUtc }),
        extractionMethod: claim.extractionMethod,
        epistemicLabel: claim.epistemicLabel
      }
    });
  }
  for (const snapshot of input.snapshots) {
    const digest = snapshotDigests.get(snapshot.snapshotId);
    if (digest === undefined) return fail("TWIN_PROJECTION_INPUT_INVALID");
    descriptors.push({
      sourceType: "GitSnapshot",
      sourceId: snapshot.snapshotId,
      nodeType: "GitSnapshot",
      digest,
      metadata: {
        projectId: snapshot.projectId,
        missionId: snapshot.missionId,
        origin: "REPOSITORY_OBSERVATION",
        sourceReference: `git-snapshot:${snapshot.snapshotId}`,
        sourceRevisionOrDigest: { kind: "CONTENT_DIGEST", value: digest },
        recordedAtUtc: snapshot.capturedAtUtc,
        extractionMethod: "READ_ONLY_GIT_SNAPSHOT",
        epistemicLabel: "FACT"
      }
    });
  }
  for (const result of input.validationResults) {
    descriptors.push({
      sourceType: "ValidationResult",
      sourceId: result.validationResultId,
      nodeType: "ValidationResult",
      digest: result.resultDigest,
      metadata: {
        projectId: result.projectId,
        missionId: result.missionId,
        origin: result.origin,
        sourceReference: result.sourceLocator,
        sourceRevisionOrDigest: {
          kind: "CONTENT_DIGEST",
          value: result.resultDigest
        },
        recordedAtUtc: result.recordedAtUtc,
        ...(result.effectiveAtUtc === undefined
          ? {}
          : { effectiveAtUtc: result.effectiveAtUtc }),
        extractionMethod: result.extractionMethod,
        epistemicLabel: result.epistemicLabel
      }
    });
  }
  if (input.codeMap !== undefined) {
    const origin =
      input.codeMap.evidenceKind === "STATIC_INFERENCE"
        ? "REPOSITORY_OBSERVATION" as const
        : "SYNTHETIC_FIXTURE" as const;
    const extractionMethod =
      input.codeMap.evidenceKind === "STATIC_INFERENCE"
        ? "STATIC_CODE_EXTRACTION"
        : "DECLARED_FIXTURE_MANIFEST";
    for (const asset of input.codeMap.assets) {
      descriptors.push({
        sourceType: "SoftwareAsset",
        sourceId: asset.assetId,
        nodeType: "SoftwareAsset",
        digest: asset.assetDigest,
        metadata: {
          projectId: input.codeMap.projectId,
          missionId: input.codeMap.missionId,
          origin,
          sourceReference: `code-map-asset:${asset.assetId}`,
          sourceRevisionOrDigest: {
            kind: "CONTENT_DIGEST",
            value: asset.assetDigest
          },
          recordedAtUtc: input.codeMap.recordedAtUtc,
          extractionMethod,
          epistemicLabel: "INFERENCE"
        }
      });
    }
  }
  return descriptors.sort((left, right) => {
    const typeOrder =
      TWIN_NODE_TYPES.indexOf(left.nodeType) -
      TWIN_NODE_TYPES.indexOf(right.nodeType);
    return typeOrder !== 0
      ? typeOrder
      : left.sourceId.localeCompare(right.sourceId);
  });
}

function nodeDigest(node: TwinNode): Sha256Digest {
  if (node.metadata.sourceRevisionOrDigest.kind !== "CONTENT_DIGEST") {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }
  return node.metadata.sourceRevisionOrDigest.value;
}

function relationshipDigest(relationship: TwinRelationship): Sha256Digest {
  if (relationship.metadata.sourceRevisionOrDigest.kind !== "CONTENT_DIGEST") {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }
  return relationship.metadata.sourceRevisionOrDigest.value;
}

function memberKey(value: TwinProjectionMemberIdentity): string {
  return `${value.kind}:${value.memberId}`;
}

function memberReference(
  member: TwinNode | TwinRelationship
): TwinProjectionMemberReference {
  return Object.freeze(
    "nodeId" in member
      ? {
          kind: "NODE" as const,
          memberId: member.nodeId,
          revision: member.revision,
          digest: nodeDigest(member)
        }
      : {
          kind: "RELATIONSHIP" as const,
          memberId: member.relationshipId,
          revision: member.revision,
          digest: relationshipDigest(member)
        }
  );
}

function memberMap(
  projection: Pick<TwinProjectionRevision, "nodes" | "relationships">
): Map<string, TwinProjectionMemberReference> {
  const entries = [
    ...projection.nodes.map((node) => memberReference(node)),
    ...projection.relationships.map((relationship) =>
      memberReference(relationship)
    )
  ];
  return new Map(entries.map((entry) => [memberKey(entry), entry]));
}

function freezeIdentity(
  kind: TwinProjectionMemberKind,
  memberId: TwinProjectionMemberId
): TwinProjectionMemberIdentity {
  return Object.freeze({ kind, memberId });
}

function sortedBindings(
  bindings: readonly TwinDependencyBinding[]
): readonly TwinDependencyBinding[] {
  const byKey = new Map<string, TwinDependencyBinding>();
  for (const binding of bindings) {
    const key = `${memberKey(binding.dependency)}>${memberKey(
      binding.dependent
    )}`;
    byKey.set(key, binding);
  }
  return Object.freeze(
    [...byKey.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, binding]) => binding)
  );
}

function exactInvalidations(
  previous: TwinProjectionRevision,
  current: Pick<TwinProjectionRevision, "nodes" | "relationships">
): readonly TwinDependencyInvalidation[] {
  const before = memberMap(previous);
  const after = memberMap(current);
  const adjacency = new Map<string, string[]>();
  for (const binding of previous.dependencyBindings) {
    const dependencyKey = memberKey(binding.dependency);
    const dependentKey = memberKey(binding.dependent);
    const values = adjacency.get(dependencyKey) ?? [];
    values.push(dependentKey);
    adjacency.set(dependencyKey, values);
  }

  const invalidations: TwinDependencyInvalidation[] = [];
  for (const [key, dependencyBefore] of [...before.entries()].sort()) {
    const dependencyAfter = after.get(key);
    if (
      dependencyAfter !== undefined &&
      dependencyAfter.digest === dependencyBefore.digest
    ) {
      continue;
    }
    const visited = new Set<string>();
    const queue = [...(adjacency.get(key) ?? [])].sort();
    while (queue.length > 0) {
      const dependentKey = queue.shift();
      if (dependentKey === undefined || visited.has(dependentKey)) continue;
      visited.add(dependentKey);
      queue.push(...(adjacency.get(dependentKey) ?? []));
      queue.sort();
    }
    const exactDependents = [...visited]
      .map((dependentKey) => before.get(dependentKey))
      .filter(
        (value): value is TwinProjectionMemberReference => value !== undefined
      )
      .sort((left, right) => memberKey(left).localeCompare(memberKey(right)));
    if (exactDependents.length === 0) continue;
    invalidations.push(
      Object.freeze({
        changeType:
          dependencyAfter === undefined ? ("REMOVED" as const) : ("CHANGED" as const),
        dependencyBefore,
        ...(dependencyAfter === undefined ? {} : { dependencyAfter }),
        exactDependents: Object.freeze(exactDependents)
      })
    );
  }
  return Object.freeze(invalidations);
}

function projectionNodeKey(sourceType: TwinProjectedSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

async function buildNodes(
  descriptors: readonly SourceDescriptor[],
  previous?: TwinProjectionRevision
): Promise<{
  readonly nodes: readonly TwinNode[];
  readonly nodeSources: readonly TwinProjectionNodeSource[];
  readonly bySource: ReadonlyMap<string, TwinNode>;
}> {
  const previousById = new Map(previous?.nodes.map((node) => [node.nodeId, node]));
  const nodes: TwinNode[] = [];
  const nodeSources: TwinProjectionNodeSource[] = [];
  const bySource = new Map<string, TwinNode>();
  for (const descriptor of descriptors) {
    const nodeId = await deterministicId<"TWIN_NODE">(
      TWIN_PROJECTION_MEMBER_ID_VERSION,
      {
        memberKind: "NODE",
        nodeType: descriptor.nodeType,
        sourceType: descriptor.sourceType,
        sourceId: descriptor.sourceId
      }
    );
    const prior = previousById.get(nodeId);
    const revision =
      prior === undefined
        ? parseTwinRevision(1)
        : nodeDigest(prior) === descriptor.digest
          ? prior.revision
          : nextRevision(prior.revision);
    const node = createTwinNode(
      { nodeType: descriptor.nodeType, revision, metadata: descriptor.metadata },
      createStableIdGenerator(() => nodeId)
    );
    nodes.push(node);
    nodeSources.push(
      Object.freeze({
        nodeId,
        nodeRevision: revision,
        sourceType: descriptor.sourceType,
        sourceId: descriptor.sourceId,
        sourceDigest: descriptor.digest
      })
    );
    bySource.set(
      projectionNodeKey(descriptor.sourceType, descriptor.sourceId),
      node
    );
  }
  const ordered = nodes
    .map((node, index) => ({ node, source: nodeSources[index] }))
    .sort((left, right) => {
      const typeOrder =
        TWIN_NODE_TYPES.indexOf(left.node.nodeType) -
        TWIN_NODE_TYPES.indexOf(right.node.nodeType);
      return typeOrder !== 0
        ? typeOrder
        : left.node.nodeId.localeCompare(right.node.nodeId);
    });
  return {
    nodes: Object.freeze(ordered.map((entry) => entry.node)),
    nodeSources: Object.freeze(
      ordered.map(
        (entry) =>
          entry.source ?? fail("TWIN_PROJECTION_INTEGRITY_INVALID")
      )
    ),
    bySource
  };
}

async function buildRelationships(
  input: ProjectTwinRevisionInput,
  bySource: ReadonlyMap<string, TwinNode>,
  previous?: TwinProjectionRevision
): Promise<{
  readonly relationships: readonly TwinRelationship[];
  readonly bindings: readonly TwinDependencyBinding[];
}> {
  const previousById = new Map(
    previous?.relationships.map((relationship) => [
      relationship.relationshipId,
      relationship
    ])
  );
  const relationships: TwinRelationship[] = [];
  const bindings: TwinDependencyBinding[] = [];
  const requireNode = (
    sourceType: TwinProjectedSourceType,
    sourceId: string
  ): TwinNode => {
    const node = bySource.get(projectionNodeKey(sourceType, sourceId));
    return node ?? fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
  };
  const addBinding = (dependency: TwinNode, dependent: TwinNode): void => {
    bindings.push(
      Object.freeze({
        dependency: freezeIdentity("NODE", dependency.nodeId),
        dependent: freezeIdentity("NODE", dependent.nodeId)
      })
    );
  };
  const addRelationship = async (
    relationshipType: TwinRelationshipType,
    relationKey: string,
    from: TwinNode,
    to: TwinNode,
    metadata: RelationshipMetadata
  ): Promise<void> => {
    if (relationships.length >= MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS) {
      return fail("TWIN_PROJECTION_LIMIT_EXCEEDED");
    }
    const relationshipId = await deterministicId<"TWIN_RELATIONSHIP">(
      TWIN_PROJECTION_MEMBER_ID_VERSION,
      { memberKind: "RELATIONSHIP", relationshipType, relationKey }
    );
    const digest = await projectDigest({
      projectionVersion: TWIN_PROJECTION_VERSION,
      relationshipType,
      relationKey,
      from: {
        nodeId: from.nodeId,
        revision: from.revision,
        digest: nodeDigest(from)
      },
      to: {
        nodeId: to.nodeId,
        revision: to.revision,
        digest: nodeDigest(to)
      },
      attribution: {
        origin: metadata.origin,
        sourceReference: metadata.sourceReference,
        recordedAtUtc: metadata.recordedAtUtc,
        effectiveAtUtc: metadata.effectiveAtUtc ?? null,
        extractionMethod: metadata.extractionMethod,
        epistemicLabel: metadata.epistemicLabel
      }
    });
    const prior = previousById.get(relationshipId);
    const revision =
      prior === undefined
        ? parseTwinRevision(1)
        : relationshipDigest(prior) === digest
          ? prior.revision
          : nextRevision(prior.revision);
    const relationship = createTwinRelationship(
      {
        relationshipType,
        revision,
        from,
        to,
        metadata: {
          projectId: input.project.projectId,
          missionId: input.mission.missionId,
          origin: metadata.origin,
          sourceReference: metadata.sourceReference,
          sourceRevisionOrDigest: { kind: "CONTENT_DIGEST", value: digest },
          recordedAtUtc: metadata.recordedAtUtc,
          ...(metadata.effectiveAtUtc === undefined
            ? {}
            : { effectiveAtUtc: metadata.effectiveAtUtc }),
          extractionMethod: metadata.extractionMethod,
          epistemicLabel: metadata.epistemicLabel
        }
      },
      createStableIdGenerator(() => relationshipId)
    );
    relationships.push(relationship);
    const relationshipIdentity = freezeIdentity(
      "RELATIONSHIP",
      relationship.relationshipId
    );
    bindings.push(
      Object.freeze({
        dependency: freezeIdentity("NODE", from.nodeId),
        dependent: relationshipIdentity
      }),
      Object.freeze({
        dependency: freezeIdentity("NODE", to.nodeId),
        dependent: relationshipIdentity
      })
    );
  };

  const projectNode = requireNode("Project", input.project.projectId);
  const missionNode = requireNode("ChangeMission", input.mission.missionId);
  const derivedMetadata = (
    relationshipType: TwinRelationshipType,
    relationKey: string,
    from: TwinNode,
    to: TwinNode
  ): RelationshipMetadata => ({
    origin: "SYSTEM_DERIVATION",
    sourceReference: `projection-link:${relationshipType
      .toLowerCase()
      .replaceAll("_", "-")}/${relationKey}`,
    recordedAtUtc: maximumTime([
      from.metadata.recordedAtUtc,
      to.metadata.recordedAtUtc
    ]),
    extractionMethod: "DETERMINISTIC_PROJECTION",
    epistemicLabel: "FACT"
  });

  const missionScopeKey = `${input.mission.missionId}/${input.project.projectId}`;
  await addRelationship(
    "SCOPED_TO",
    `mission/${missionScopeKey}`,
    missionNode,
    projectNode,
    derivedMetadata("SCOPED_TO", `mission/${missionScopeKey}`, missionNode, projectNode)
  );
  addBinding(projectNode, missionNode);

  for (const source of [...input.evidenceSources].sort((left, right) =>
    left.evidenceSourceId.localeCompare(right.evidenceSourceId)
  )) {
    const sourceNode = requireNode("EvidenceSource", source.evidenceSourceId);
    const relationKey = `evidence/${source.evidenceSourceId}/${input.mission.missionId}`;
    await addRelationship(
      "SCOPED_TO",
      relationKey,
      sourceNode,
      missionNode,
      derivedMetadata("SCOPED_TO", relationKey, sourceNode, missionNode)
    );
    addBinding(missionNode, sourceNode);
  }
  for (const snapshot of [...input.snapshots].sort((left, right) =>
    left.snapshotId.localeCompare(right.snapshotId)
  )) {
    const snapshotNode = requireNode("GitSnapshot", snapshot.snapshotId);
    const relationKey = `snapshot/${snapshot.snapshotId}/${input.mission.missionId}`;
    await addRelationship(
      "SCOPED_TO",
      relationKey,
      snapshotNode,
      missionNode,
      derivedMetadata("SCOPED_TO", relationKey, snapshotNode, missionNode)
    );
    addBinding(missionNode, snapshotNode);
  }
  for (const claim of [...input.claims].sort((left, right) =>
    left.claimId.localeCompare(right.claimId)
  )) {
    const claimNode = requireNode("Claim", claim.claimId);
    const sourceNode = requireNode("EvidenceSource", claim.evidenceSourceId);
    const scopeKey = `claim/${claim.claimId}/${input.mission.missionId}`;
    await addRelationship(
      "SCOPED_TO",
      scopeKey,
      claimNode,
      missionNode,
      derivedMetadata("SCOPED_TO", scopeKey, claimNode, missionNode)
    );
    const extractionKey = `claim/${claim.claimId}/source/${claim.evidenceSourceId}`;
    await addRelationship(
      "EXTRACTED_FROM",
      extractionKey,
      claimNode,
      sourceNode,
      derivedMetadata("EXTRACTED_FROM", extractionKey, claimNode, sourceNode)
    );
    const assertionKey = `source/${claim.evidenceSourceId}/claim/${claim.claimId}`;
    await addRelationship(
      "ASSERTS",
      assertionKey,
      sourceNode,
      claimNode,
      derivedMetadata("ASSERTS", assertionKey, sourceNode, claimNode)
    );
    addBinding(sourceNode, claimNode);
  }
  for (const result of [...input.validationResults].sort((left, right) =>
    left.validationResultId.localeCompare(right.validationResultId)
  )) {
    const resultNode = requireNode("ValidationResult", result.validationResultId);
    const sourceNode = requireNode("EvidenceSource", result.evidenceSourceId);
    const snapshotNode = requireNode("GitSnapshot", result.snapshotId);
    const scopeKey = `validation/${result.validationResultId}/${input.mission.missionId}`;
    await addRelationship(
      "SCOPED_TO",
      scopeKey,
      resultNode,
      missionNode,
      derivedMetadata("SCOPED_TO", scopeKey, resultNode, missionNode)
    );
    const extractionKey = `validation/${result.validationResultId}/source/${result.evidenceSourceId}`;
    await addRelationship(
      "EXTRACTED_FROM",
      extractionKey,
      resultNode,
      sourceNode,
      derivedMetadata("EXTRACTED_FROM", extractionKey, resultNode, sourceNode)
    );
    const bindingKey = `validation/${result.validationResultId}/snapshot/${result.snapshotId}`;
    await addRelationship(
      "BOUND_TO",
      bindingKey,
      resultNode,
      snapshotNode,
      derivedMetadata("BOUND_TO", bindingKey, resultNode, snapshotNode)
    );
    addBinding(sourceNode, resultNode);
    addBinding(snapshotNode, resultNode);
  }
  for (const link of [...input.claimSupersessions].sort((left, right) =>
    left.claimSupersessionId.localeCompare(right.claimSupersessionId)
  )) {
    const predecessorNode = requireNode("Claim", link.predecessorClaimId);
    const successorNode = requireNode("Claim", link.successorClaimId);
    const relationKey = `supersession/${link.claimSupersessionId}`;
    await addRelationship(
      "SUPERSEDES",
      relationKey,
      successorNode,
      predecessorNode,
      {
        origin: link.origin,
        sourceReference: link.sourceLocator,
        recordedAtUtc: link.recordedAtUtc,
        ...(link.effectiveAtUtc === undefined
          ? {}
          : { effectiveAtUtc: link.effectiveAtUtc }),
        extractionMethod: link.extractionMethod,
        epistemicLabel: link.epistemicLabel
      }
    );
  }
  if (input.codeMap !== undefined) {
    const snapshotNode = requireNode("GitSnapshot", input.codeMap.snapshotId);
    const origin =
      input.codeMap.evidenceKind === "STATIC_INFERENCE"
        ? "REPOSITORY_OBSERVATION" as const
        : "SYNTHETIC_FIXTURE" as const;
    const extractionMethod =
      input.codeMap.evidenceKind === "STATIC_INFERENCE"
        ? "STATIC_CODE_EXTRACTION"
        : "DECLARED_FIXTURE_MANIFEST";
    const codeMetadata = (
      memberKind: "asset" | "edge",
      memberId: string
    ): RelationshipMetadata => ({
      origin,
      sourceReference: `code-map-${memberKind}:${memberId}`,
      recordedAtUtc: input.codeMap?.recordedAtUtc ?? input.mission.updatedAtUtc,
      extractionMethod,
      epistemicLabel: "INFERENCE"
    });
    for (const asset of input.codeMap.assets) {
      const assetNode = requireNode("SoftwareAsset", asset.assetId);
      const scopeKey = `code-asset/${asset.assetId}/${input.mission.missionId}`;
      await addRelationship(
        "SCOPED_TO",
        scopeKey,
        assetNode,
        missionNode,
        codeMetadata("asset", asset.assetId)
      );
      const bindingKey = `code-asset/${asset.assetId}/snapshot/${input.codeMap.snapshotId}`;
      await addRelationship(
        "BOUND_TO",
        bindingKey,
        assetNode,
        snapshotNode,
        codeMetadata("asset", asset.assetId)
      );
      addBinding(missionNode, assetNode);
      addBinding(snapshotNode, assetNode);
    }
    const relationshipType = (kind: CodeMapProjectionRevision["edges"][number]["kind"]): TwinRelationshipType => {
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
    };
    for (const edge of input.codeMap.edges) {
      await addRelationship(
        relationshipType(edge.kind),
        `code-edge/${edge.edgeId}`,
        requireNode("SoftwareAsset", edge.fromAssetId),
        requireNode("SoftwareAsset", edge.toAssetId),
        codeMetadata("edge", edge.edgeId)
      );
    }
  }

  for (const declaration of [...(input.semanticRelationships ?? [])].sort(
    (left, right) =>
      left.relationshipKey.localeCompare(right.relationshipKey, "en-US")
  )) {
    await addRelationship(
      declaration.relationshipType,
      `semantic/${declaration.relationshipKey}`,
      requireNode(declaration.from.sourceType, declaration.from.sourceId),
      requireNode(declaration.to.sourceType, declaration.to.sourceId),
      declaration.attribution
    );
  }

  relationships.sort((left, right) => {
    const typeOrder =
      TWIN_RELATIONSHIP_TYPES.indexOf(left.relationshipType) -
      TWIN_RELATIONSHIP_TYPES.indexOf(right.relationshipType);
    return typeOrder !== 0
      ? typeOrder
      : left.relationshipId.localeCompare(right.relationshipId);
  });
  return {
    relationships: Object.freeze(relationships),
    bindings: sortedBindings(bindings)
  };
}

function identityJson(identity: TwinProjectionMemberIdentity): JsonObject {
  return { kind: identity.kind, memberId: identity.memberId };
}

function referenceJson(reference: TwinProjectionMemberReference): JsonObject {
  return {
    ...identityJson(reference),
    revision: reference.revision,
    digest: reference.digest
  };
}

function projectionBodyJson(
  projection: Omit<TwinProjectionRevision, "projectionDigest">
): JsonObject {
  return {
    projectionVersion: projection.projectionVersion,
    projectionId: projection.projectionId,
    projectId: projection.projectId,
    missionId: projection.missionId,
    revision: projection.revision,
    inputDigest: projection.inputDigest,
    recordedAtUtc: projection.recordedAtUtc,
    predecessor:
      projection.predecessor === undefined
        ? null
        : {
            projectionId: projection.predecessor.projectionId,
            revision: projection.predecessor.revision,
            projectionDigest: projection.predecessor.projectionDigest
          },
    ...(projection.codeMapBinding === undefined
      ? {}
      : {
          codeMapBinding: {
            projectionId: projection.codeMapBinding.projectionId,
            revision: projection.codeMapBinding.revision,
            projectionDigest: projection.codeMapBinding.projectionDigest
          }
        }),
    nodes: projection.nodes.map((node) =>
      JSON.parse(serializeTwinNode(node)) as JsonObject
    ),
    relationships: projection.relationships.map((relationship) => {
      const from = projection.nodes.find(
        (node) =>
          node.nodeId === relationship.from.nodeId &&
          node.revision === relationship.from.revision
      );
      const to = projection.nodes.find(
        (node) =>
          node.nodeId === relationship.to.nodeId &&
          node.revision === relationship.to.revision
      );
      if (from === undefined || to === undefined) {
        return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
      }
      return JSON.parse(
        serializeTwinRelationship(relationship, from, to)
      ) as JsonObject;
    }),
    nodeSources: projection.nodeSources.map((source) => ({
      nodeId: source.nodeId,
      nodeRevision: source.nodeRevision,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceDigest: source.sourceDigest
    })),
    dependencyBindings: projection.dependencyBindings.map((binding) => ({
      dependency: identityJson(binding.dependency),
      dependent: identityJson(binding.dependent)
    })),
    invalidations: projection.invalidations.map((invalidation) => ({
      changeType: invalidation.changeType,
      dependencyBefore: referenceJson(invalidation.dependencyBefore),
      dependencyAfter:
        invalidation.dependencyAfter === undefined
          ? null
          : referenceJson(invalidation.dependencyAfter),
      exactDependents: invalidation.exactDependents.map(referenceJson)
    }))
  };
}

async function projectionDigestFor(
  projection: Omit<TwinProjectionRevision, "projectionDigest">
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    digestVersion: TWIN_PROJECTION_DIGEST_VERSION,
    projection: projectionBodyJson(projection)
  });
}

export async function projectTwinRevision(
  input: ProjectTwinRevisionInput,
  previous?: TwinProjectionRevision
): Promise<TwinProjectionRevision> {
  await validateInput(input);
  if (previous !== undefined) {
    await assertTwinProjectionRevisionInvariant(previous);
    if (
      previous.projectId !== input.project.projectId ||
      previous.missionId !== input.mission.missionId
    ) {
      return fail("TWIN_PROJECTION_PREDECESSOR_INVALID");
    }
  }
  const descriptors = await projectSourceDescriptors(input);
  const inputDigest = await canonicalJsonDigest({
    digestVersion: TWIN_PROJECTION_INPUT_DIGEST_VERSION,
    scope: {
      projectId: input.project.projectId,
      missionId: input.mission.missionId
    },
    sources: descriptors.map((descriptor) => ({
      sourceType: descriptor.sourceType,
      sourceId: descriptor.sourceId,
      digest: descriptor.digest
    })),
    supersessions: [...input.claimSupersessions]
      .sort((left, right) =>
        left.claimSupersessionId.localeCompare(right.claimSupersessionId)
      )
      .map((link) => ({
        claimSupersessionId: link.claimSupersessionId,
        linkDigest: link.linkDigest
      })),
    codeMapProjectionDigest: input.codeMap?.projectionDigest ?? null,
    ...(input.codeMap === undefined
      ? {}
      : { codeMapBindingContractVersion: TWIN_CODE_MAP_BINDING_VERSION }),
    semanticRelationships: [...(input.semanticRelationships ?? [])]
      .sort((left, right) =>
        left.relationshipKey.localeCompare(right.relationshipKey, "en-US")
      )
      .map((relationship) => ({
        relationshipKey: relationship.relationshipKey,
        relationshipType: relationship.relationshipType,
        from: relationship.from,
        to: relationship.to,
        attribution: {
          ...relationship.attribution,
          effectiveAtUtc:
            relationship.attribution.effectiveAtUtc ?? null
        }
      }))
  });
  if (previous?.inputDigest === inputDigest) return previous;

  const projectionId = await deterministicId<"TWIN_PROJECTION">(
    TWIN_PROJECTION_ID_VERSION,
    { projectId: input.project.projectId, missionId: input.mission.missionId }
  );
  if (previous !== undefined && previous.projectionId !== projectionId) {
    return fail("TWIN_PROJECTION_PREDECESSOR_INVALID");
  }
  const builtNodes = await buildNodes(descriptors, previous);
  const builtRelationships = await buildRelationships(
    input,
    builtNodes.bySource,
    previous
  );
  if (
    builtNodes.nodes.length > MAXIMUM_TWIN_PROJECTION_NODES ||
    builtRelationships.relationships.length >
      MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS ||
    builtRelationships.bindings.length > MAXIMUM_TWIN_PROJECTION_DEPENDENCIES
  ) {
    return fail("TWIN_PROJECTION_LIMIT_EXCEEDED");
  }
  const recordedAtUtc = maximumTime(
    descriptors.map((descriptor) =>
      parseUtcTimestamp(descriptor.metadata.recordedAtUtc)
    )
  );
  const revision = nextRevision(previous?.revision);
  const predecessor =
    previous === undefined
      ? undefined
      : Object.freeze({
          projectionId: previous.projectionId,
          revision: previous.revision,
          projectionDigest: previous.projectionDigest
        });
  const invalidations =
    previous === undefined
      ? Object.freeze([])
      : exactInvalidations(previous, {
          nodes: builtNodes.nodes,
          relationships: builtRelationships.relationships
        });
  const codeMapBinding =
    input.codeMap === undefined
      ? undefined
      : Object.freeze({
          projectionId: input.codeMap.projectionId,
          revision: input.codeMap.revision,
          projectionDigest: input.codeMap.projectionDigest
        });
  const withoutDigest = Object.freeze({
    projectionVersion: TWIN_PROJECTION_VERSION,
    projectionId,
    projectId: input.project.projectId,
    missionId: input.mission.missionId,
    revision,
    inputDigest,
    recordedAtUtc,
    ...(predecessor === undefined ? {} : { predecessor }),
    ...(codeMapBinding === undefined ? {} : { codeMapBinding }),
    nodes: builtNodes.nodes,
    relationships: builtRelationships.relationships,
    nodeSources: builtNodes.nodeSources,
    dependencyBindings: builtRelationships.bindings,
    invalidations
  });
  const projection = Object.freeze({
    ...withoutDigest,
    projectionDigest: await projectionDigestFor(withoutDigest)
  });
  await assertTwinProjectionRevisionInvariant(projection);
  return projection;
}

function parseMemberIdentity(value: unknown): TwinProjectionMemberIdentity {
  const record = exactObject(
    value,
    ["kind", "memberId"],
    [],
    "TWIN_PROJECTION_SERIALIZATION_INVALID"
  );
  if (record.kind !== "NODE" && record.kind !== "RELATIONSHIP") {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
  try {
    return freezeIdentity(record.kind, parseStableId(record.memberId));
  } catch {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
}

function parseMemberReference(value: unknown): TwinProjectionMemberReference {
  const record = exactObject(
    value,
    ["kind", "memberId", "revision", "digest"],
    [],
    "TWIN_PROJECTION_SERIALIZATION_INVALID"
  );
  const identity = parseMemberIdentity({
    kind: record.kind,
    memberId: record.memberId
  });
  try {
    return Object.freeze({
      ...identity,
      revision: parseTwinRevision(record.revision),
      digest: parseSha256Digest(record.digest)
    });
  } catch {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
}

async function hydrateProjection(value: unknown): Promise<TwinProjectionRevision> {
  const record = exactObject(
    value,
    [
      "projectionVersion",
      "projectionId",
      "projectId",
      "missionId",
      "revision",
      "inputDigest",
      "recordedAtUtc",
      "predecessor",
      "nodes",
      "relationships",
      "nodeSources",
      "dependencyBindings",
      "invalidations",
      "projectionDigest"
    ],
    ["codeMapBinding"],
    "TWIN_PROJECTION_SERIALIZATION_INVALID"
  );
  if (record.projectionVersion !== TWIN_PROJECTION_VERSION) {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
  let projectionId: TwinProjectionId;
  let projectId: ProjectId;
  let missionId: MissionId;
  let revision: TwinRevision;
  let inputDigest: Sha256Digest;
  let recordedAtUtc: UtcTimestamp;
  let projectionDigestValue: Sha256Digest;
  try {
    projectionId = parseStableId<"TWIN_PROJECTION">(record.projectionId);
    projectId = parseStableId<"PROJECT">(record.projectId);
    missionId = parseStableId<"MISSION">(record.missionId);
    revision = parseTwinRevision(record.revision);
    inputDigest = parseSha256Digest(record.inputDigest);
    recordedAtUtc = parseUtcTimestamp(record.recordedAtUtc);
    projectionDigestValue = parseSha256Digest(record.projectionDigest);
  } catch {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
  const expectedProjectionId = await deterministicId<"TWIN_PROJECTION">(
    TWIN_PROJECTION_ID_VERSION,
    { projectId, missionId }
  );
  if (expectedProjectionId !== projectionId) {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }

  let predecessor: TwinProjectionPredecessor | undefined;
  if (record.predecessor !== null) {
    const parsed = exactObject(
      record.predecessor,
      ["projectionId", "revision", "projectionDigest"],
      [],
      "TWIN_PROJECTION_SERIALIZATION_INVALID"
    );
    try {
      predecessor = Object.freeze({
        projectionId: parseStableId<"TWIN_PROJECTION">(parsed.projectionId),
        revision: parseTwinRevision(parsed.revision),
        projectionDigest: parseSha256Digest(parsed.projectionDigest)
      });
    } catch {
      return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
    }
  }
  if (
    (revision === 1 && predecessor !== undefined) ||
    (revision > 1 &&
      (predecessor === undefined ||
        predecessor.projectionId !== projectionId ||
        predecessor.revision !== revision - 1))
  ) {
    return fail("TWIN_PROJECTION_PREDECESSOR_INVALID");
  }

  let codeMapBinding: TwinProjectionRevision["codeMapBinding"];
  if (record.codeMapBinding !== undefined) {
    const parsed = exactObject(
      record.codeMapBinding,
      ["projectionId", "revision", "projectionDigest"],
      [],
      "TWIN_PROJECTION_SERIALIZATION_INVALID"
    );
    try {
      codeMapBinding = Object.freeze({
        projectionId: parseStableId<"CODE_MAP_PROJECTION">(
          parsed.projectionId
        ),
        revision: parseTwinRevision(parsed.revision),
        projectionDigest: parseSha256Digest(parsed.projectionDigest)
      });
    } catch {
      return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
    }
  }

  const nodeValues = exactArray(
    record.nodes,
    MAXIMUM_TWIN_PROJECTION_NODES,
    "TWIN_PROJECTION_LIMIT_EXCEEDED"
  );
  const nodes = Object.freeze(
    nodeValues.map((node) => deserializeTwinNode(canonicalizeJson(node)))
  );
  assertUnique(nodes.map((node) => node.nodeId));
  assertStrictlySorted(
    nodes.map(
      (node) =>
        `${String(TWIN_NODE_TYPES.indexOf(node.nodeType)).padStart(2, "0")}:${
          node.nodeId
        }`
    )
  );
  const nodeByReference = new Map(
    nodes.map((node) => [`${node.nodeId}:${node.revision}`, node])
  );
  const relationshipValues = exactArray(
    record.relationships,
    MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS,
    "TWIN_PROJECTION_LIMIT_EXCEEDED"
  );
  const relationships = Object.freeze(
    relationshipValues.map((relationshipValue) => {
      const relationshipRecord = exactObject(
        relationshipValue,
        [
          "vocabularyVersion",
          "relationshipId",
          "revision",
          "relationshipType",
          "from",
          "to",
          "metadata"
        ],
        [],
        "TWIN_PROJECTION_SERIALIZATION_INVALID"
      );
      const fromRecord = exactObject(
        relationshipRecord.from,
        ["nodeId", "revision"],
        [],
        "TWIN_PROJECTION_SERIALIZATION_INVALID"
      );
      const toRecord = exactObject(
        relationshipRecord.to,
        ["nodeId", "revision"],
        [],
        "TWIN_PROJECTION_SERIALIZATION_INVALID"
      );
      const from = nodeByReference.get(`${String(fromRecord.nodeId)}:${String(fromRecord.revision)}`);
      const to = nodeByReference.get(`${String(toRecord.nodeId)}:${String(toRecord.revision)}`);
      if (from === undefined || to === undefined) {
        return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
      }
      return deserializeTwinRelationship(
        canonicalizeJson(relationshipValue),
        from,
        to
      );
    })
  );
  assertUnique(
    relationships.map((relationship) => relationship.relationshipId)
  );
  assertStrictlySorted(
    relationships.map(
      (relationship) =>
        `${String(
          TWIN_RELATIONSHIP_TYPES.indexOf(relationship.relationshipType)
        ).padStart(2, "0")}:${relationship.relationshipId}`
    )
  );

  const nodeSourceValues = exactArray(
    record.nodeSources,
    MAXIMUM_TWIN_PROJECTION_NODES,
    "TWIN_PROJECTION_LIMIT_EXCEEDED"
  );
  const nodeSources = Object.freeze(
    nodeSourceValues.map((sourceValue) => {
      const source = exactObject(
        sourceValue,
        [
          "nodeId",
          "nodeRevision",
          "sourceType",
          "sourceId",
          "sourceDigest"
        ],
        [],
        "TWIN_PROJECTION_SERIALIZATION_INVALID"
      );
      if (
        !TWIN_PROJECTED_SOURCE_TYPES.some(
          (sourceType) => sourceType === source.sourceType
        )
      ) {
        return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
      }
      try {
        const parsed = Object.freeze({
          nodeId: parseStableId<"TWIN_NODE">(source.nodeId),
          nodeRevision: parseTwinRevision(source.nodeRevision),
          sourceType: source.sourceType as TwinProjectedSourceType,
          sourceId: parseStableId(source.sourceId),
          sourceDigest: parseSha256Digest(source.sourceDigest)
        });
        const node = nodeByReference.get(
          `${parsed.nodeId}:${parsed.nodeRevision}`
        );
        if (
          node === undefined ||
          node.nodeType !== parsed.sourceType ||
          nodeDigest(node) !== parsed.sourceDigest
        ) {
          return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
        }
        return parsed;
      } catch (error) {
        if (error instanceof TwinProjectionError) throw error;
        return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
      }
    })
  );
  if (nodeSources.length !== nodes.length) {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }
  assertUnique(nodeSources.map((source) => source.nodeId));
  if (
    nodeSources.some(
      (source, index) =>
        source.nodeId !== nodes[index]?.nodeId ||
        source.nodeRevision !== nodes[index]?.revision
    )
  ) {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }

  const currentMembers = memberMap({ nodes, relationships });
  const dependencyValues = exactArray(
    record.dependencyBindings,
    MAXIMUM_TWIN_PROJECTION_DEPENDENCIES,
    "TWIN_PROJECTION_LIMIT_EXCEEDED"
  );
  const parsedDependencyBindings = dependencyValues.map((bindingValue) => {
      const binding = exactObject(
        bindingValue,
        ["dependency", "dependent"],
        [],
        "TWIN_PROJECTION_SERIALIZATION_INVALID"
      );
      const parsed = Object.freeze({
        dependency: parseMemberIdentity(binding.dependency),
        dependent: parseMemberIdentity(binding.dependent)
      });
      if (
        memberKey(parsed.dependency) === memberKey(parsed.dependent) ||
        !currentMembers.has(memberKey(parsed.dependency)) ||
        !currentMembers.has(memberKey(parsed.dependent))
      ) {
        return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
      }
      return parsed;
    });
  const dependencyBindings = sortedBindings(parsedDependencyBindings);
  if (dependencyBindings.length !== dependencyValues.length) {
    return fail("TWIN_PROJECTION_DEPENDENCY_INVALID");
  }
  if (
    parsedDependencyBindings.some(
      (binding, index) =>
        `${memberKey(binding.dependency)}>${memberKey(binding.dependent)}` !==
        `${memberKey(
          dependencyBindings[index]?.dependency ?? binding.dependency
        )}>${memberKey(
          dependencyBindings[index]?.dependent ?? binding.dependent
        )}`
    )
  ) {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }

  const invalidationValues = exactArray(
    record.invalidations,
    MAXIMUM_TWIN_PROJECTION_DEPENDENCIES,
    "TWIN_PROJECTION_LIMIT_EXCEEDED"
  );
  const invalidations = Object.freeze(
    invalidationValues.map((invalidationValue) => {
      const invalidation = exactObject(
        invalidationValue,
        [
          "changeType",
          "dependencyBefore",
          "dependencyAfter",
          "exactDependents"
        ],
        [],
        "TWIN_PROJECTION_SERIALIZATION_INVALID"
      );
      if (
        invalidation.changeType !== "CHANGED" &&
        invalidation.changeType !== "REMOVED"
      ) {
        return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
      }
      const dependencyAfter =
        invalidation.dependencyAfter === null
          ? undefined
          : parseMemberReference(invalidation.dependencyAfter);
      if (
        (invalidation.changeType === "CHANGED" &&
          dependencyAfter === undefined) ||
        (invalidation.changeType === "REMOVED" &&
          dependencyAfter !== undefined)
      ) {
        return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
      }
      const exactDependents = Object.freeze(
        exactArray(
          invalidation.exactDependents,
          MAXIMUM_TWIN_PROJECTION_DEPENDENCIES,
          "TWIN_PROJECTION_LIMIT_EXCEEDED"
        ).map(parseMemberReference)
      );
      if (exactDependents.length === 0) {
        return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
      }
      assertStrictlySorted(exactDependents.map(memberKey));
      return Object.freeze({
        changeType: invalidation.changeType,
        dependencyBefore: parseMemberReference(invalidation.dependencyBefore),
        ...(dependencyAfter === undefined ? {} : { dependencyAfter }),
        exactDependents
      });
    })
  );
  assertStrictlySorted(
    invalidations.map((invalidation) => memberKey(invalidation.dependencyBefore))
  );

  const withoutDigest = Object.freeze({
    projectionVersion: TWIN_PROJECTION_VERSION,
    projectionId,
    projectId,
    missionId,
    revision,
    inputDigest,
    recordedAtUtc,
    ...(predecessor === undefined ? {} : { predecessor }),
    ...(codeMapBinding === undefined ? {} : { codeMapBinding }),
    nodes,
    relationships,
    nodeSources,
    dependencyBindings,
    invalidations
  });
  if ((await projectionDigestFor(withoutDigest)) !== projectionDigestValue) {
    return fail("TWIN_PROJECTION_INTEGRITY_INVALID");
  }
  return Object.freeze({ ...withoutDigest, projectionDigest: projectionDigestValue });
}

export async function assertTwinProjectionRevisionInvariant(
  projection: TwinProjectionRevision
): Promise<void> {
  await hydrateProjection({
    ...projectionBodyJson(projection),
    projectionDigest: projection.projectionDigest
  });
}

export async function serializeTwinProjectionRevision(
  projection: TwinProjectionRevision
): Promise<string> {
  await assertTwinProjectionRevisionInvariant(projection);
  return canonicalizeJson({
    ...projectionBodyJson(projection),
    projectionDigest: projection.projectionDigest
  });
}

export async function deserializeTwinProjectionRevision(
  serialized: string
): Promise<TwinProjectionRevision> {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    new TextEncoder().encode(serialized).byteLength >
      MAXIMUM_TWIN_PROJECTION_SERIALIZED_BYTES
  ) {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    return fail("TWIN_PROJECTION_SERIALIZATION_INVALID");
  }
  return hydrateProjection(value);
}
