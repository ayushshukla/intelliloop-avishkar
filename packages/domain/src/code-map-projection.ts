import { canonicalizeJson, type JsonObject } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  sha256TextDigest,
  type Sha256Digest
} from "./digest.js";
import {
  assertGitSnapshotInvariant,
  type GitSnapshot,
  type GitSnapshotId,
  type RepositoryRegistrationId
} from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import { parseStableId, type StableId } from "./stable-id.js";
import { parseUtcTimestamp, type UtcTimestamp } from "./time.js";

export const CODE_MAP_PROJECTION_VERSION = "code-map-projection.v1" as const;
export const CODE_MAP_PROJECTION_DIGEST_VERSION =
  "code-map-projection-digest.v1" as const;
export const CODE_MAP_PROJECTION_INPUT_DIGEST_VERSION =
  "code-map-projection-input-digest.v1" as const;
export const CODE_MAP_PROJECTION_ID_VERSION =
  "code-map-projection-id.v1" as const;
export const CODE_MAP_MEMBER_ID_VERSION = "code-map-member-id.v1" as const;
export const CODE_MAP_SNAPSHOT_DIGEST_VERSION =
  "code-map-snapshot-binding.v1" as const;

export const CODE_MAP_EVIDENCE_KINDS = [
  "STATIC_INFERENCE",
  "DECLARED_INTELLILOOP_FIXTURE"
] as const;
export const CODE_MAP_INFERENCE_STATUSES = [
  "AVAILABLE",
  "UNAVAILABLE_SAFE_FAILURE"
] as const;
export const CODE_MAP_COMPLETENESS = [
  "COMPLETE",
  "PARTIAL",
  "UNAVAILABLE"
] as const;
export const CODE_MAP_ASSET_KINDS = [
  "FILE",
  "PACKAGE",
  "CONTRACT",
  "ROUTE"
] as const;
export const CODE_MAP_EDGE_KINDS = [
  "IMPORTS",
  "REEXPORTS",
  "DECLARES_PACKAGE",
  "DECLARES_CONTRACT",
  "DECLARES_ROUTE",
  "TEST_IMPORTS"
] as const;
export const CODE_MAP_FALLBACK_REASONS = [
  "SCAN_LIMIT_OR_SAFE_FAILURE",
  "EXTRACTION_LIMIT_OR_SAFE_FAILURE"
] as const;

export const MAXIMUM_CODE_MAP_ASSETS = 10_000;
export const MAXIMUM_CODE_MAP_EDGES = 50_000;
export const MAXIMUM_CODE_MAP_SERIALIZED_BYTES = 16_777_216;

export const CODE_MAP_PROJECTION_ERROR_CODES = [
  "CODE_MAP_PROJECTION_INPUT_INVALID",
  "CODE_MAP_PROJECTION_SCOPE_INVALID",
  "CODE_MAP_PROJECTION_SNAPSHOT_INVALID",
  "CODE_MAP_PROJECTION_MODE_INVALID",
  "CODE_MAP_PROJECTION_DUPLICATE_MEMBER",
  "CODE_MAP_PROJECTION_EDGE_INVALID",
  "CODE_MAP_PROJECTION_PREDECESSOR_INVALID",
  "CODE_MAP_PROJECTION_LIMIT_EXCEEDED",
  "CODE_MAP_PROJECTION_SERIALIZATION_INVALID",
  "CODE_MAP_PROJECTION_INTEGRITY_INVALID"
] as const;

export type CodeMapEvidenceKind = (typeof CODE_MAP_EVIDENCE_KINDS)[number];
export type CodeMapInferenceStatus =
  (typeof CODE_MAP_INFERENCE_STATUSES)[number];
export type CodeMapCompleteness = (typeof CODE_MAP_COMPLETENESS)[number];
export type CodeMapAssetKind = (typeof CODE_MAP_ASSET_KINDS)[number];
export type CodeMapEdgeKind = (typeof CODE_MAP_EDGE_KINDS)[number];
export type CodeMapFallbackReason =
  (typeof CODE_MAP_FALLBACK_REASONS)[number];
export type CodeMapProjectionErrorCode =
  (typeof CODE_MAP_PROJECTION_ERROR_CODES)[number];
export type CodeMapProjectionId = StableId<"CODE_MAP_PROJECTION">;
export type CodeMapAssetId = StableId<"CODE_MAP_ASSET">;
export type CodeMapEdgeId = StableId<"CODE_MAP_EDGE">;

export interface CodeMapAssetInput {
  readonly memberKey: string;
  readonly kind: CodeMapAssetKind;
  readonly label: string;
  readonly sourcePath?: string;
  readonly sourceDigest: Sha256Digest;
}

export interface CodeMapEdgeInput {
  readonly memberKey: string;
  readonly kind: CodeMapEdgeKind;
  readonly fromMemberKey: string;
  readonly toMemberKey: string;
}

export type CodeMapProjectionModeInput =
  | {
      readonly evidenceKind: "STATIC_INFERENCE";
      readonly completeness: "COMPLETE" | "PARTIAL";
      readonly sourceDigest: Sha256Digest;
    }
  | {
      readonly evidenceKind: "DECLARED_INTELLILOOP_FIXTURE";
      readonly completeness: "UNAVAILABLE";
      readonly sourceDigest: Sha256Digest;
      readonly declaredManifestId: string;
      readonly fallbackReason: CodeMapFallbackReason;
    };

export interface CreateCodeMapProjectionInput {
  readonly snapshot: GitSnapshot;
  readonly recordedAtUtc: UtcTimestamp;
  readonly mode: CodeMapProjectionModeInput;
  readonly assets: readonly CodeMapAssetInput[];
  readonly edges: readonly CodeMapEdgeInput[];
}

export interface CodeMapAsset {
  readonly assetId: CodeMapAssetId;
  readonly memberKey: string;
  readonly kind: CodeMapAssetKind;
  readonly label: string;
  readonly sourcePath?: string;
  readonly sourceDigest: Sha256Digest;
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly assetDigest: Sha256Digest;
}

export interface CodeMapEdge {
  readonly edgeId: CodeMapEdgeId;
  readonly memberKey: string;
  readonly kind: CodeMapEdgeKind;
  readonly fromAssetId: CodeMapAssetId;
  readonly toAssetId: CodeMapAssetId;
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly edgeDigest: Sha256Digest;
}

export interface CodeMapProjectionPredecessor {
  readonly projectionId: CodeMapProjectionId;
  readonly revision: number;
  readonly projectionDigest: Sha256Digest;
}

export interface CodeMapProjectionRevision {
  readonly projectionVersion: typeof CODE_MAP_PROJECTION_VERSION;
  readonly projectionId: CodeMapProjectionId;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly registrationId: RepositoryRegistrationId;
  readonly revision: number;
  readonly inputDigest: Sha256Digest;
  readonly recordedAtUtc: UtcTimestamp;
  readonly snapshotId: GitSnapshotId;
  readonly snapshotCapturedAtUtc: UtcTimestamp;
  readonly snapshotDigest: Sha256Digest;
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly inferenceStatus: CodeMapInferenceStatus;
  readonly completeness: CodeMapCompleteness;
  readonly sourceDigest: Sha256Digest;
  readonly declaredManifestId?: string;
  readonly fallbackReason?: CodeMapFallbackReason;
  readonly predecessor?: CodeMapProjectionPredecessor;
  readonly assets: readonly CodeMapAsset[];
  readonly edges: readonly CodeMapEdge[];
  readonly projectionDigest: Sha256Digest;
}

const MESSAGES: Readonly<Record<CodeMapProjectionErrorCode, string>> =
  Object.freeze({
    CODE_MAP_PROJECTION_INPUT_INVALID: "Code-map projection input is invalid.",
    CODE_MAP_PROJECTION_SCOPE_INVALID: "Code-map projection scope is invalid.",
    CODE_MAP_PROJECTION_SNAPSHOT_INVALID:
      "Code-map projection snapshot binding is invalid.",
    CODE_MAP_PROJECTION_MODE_INVALID:
      "Code-map inferred and declared evidence modes are not interchangeable.",
    CODE_MAP_PROJECTION_DUPLICATE_MEMBER:
      "Code-map projection contains duplicate members.",
    CODE_MAP_PROJECTION_EDGE_INVALID: "Code-map projection edge is invalid.",
    CODE_MAP_PROJECTION_PREDECESSOR_INVALID:
      "Code-map projection predecessor is invalid.",
    CODE_MAP_PROJECTION_LIMIT_EXCEEDED: "Code-map projection limit is exceeded.",
    CODE_MAP_PROJECTION_SERIALIZATION_INVALID:
      "Code-map projection serialization is invalid.",
    CODE_MAP_PROJECTION_INTEGRITY_INVALID:
      "Code-map projection integrity is invalid."
  });

export class CodeMapProjectionError extends Error {
  readonly code: CodeMapProjectionErrorCode;

  constructor(code: CodeMapProjectionErrorCode) {
    super(MESSAGES[code]);
    this.name = "CodeMapProjectionError";
    this.code = code;
  }
}

function fail(code: CodeMapProjectionErrorCode): never {
  throw new CodeMapProjectionError(code);
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
  code: CodeMapProjectionErrorCode
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
      return descriptor === undefined || !descriptor.enumerable || !("value" in descriptor);
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
  code: CodeMapProjectionErrorCode
): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) return fail(code);
  return value;
}

function validToken(value: unknown, maximum = 512): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maximum &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function validPath(value: unknown): value is string {
  return (
    validToken(value, 1_024) &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  );
}

async function deterministicId<Tag extends string>(
  namespace: string,
  value: JsonObject
): Promise<StableId<Tag>> {
  const digest = await sha256TextDigest(canonicalizeJson({ namespace, value }));
  const hex = digest.slice("sha256:".length);
  return parseStableId<Tag>(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  );
}

export async function codeMapSnapshotDigest(
  snapshot: GitSnapshot
): Promise<Sha256Digest> {
  try {
    assertGitSnapshotInvariant(snapshot);
  } catch {
    return fail("CODE_MAP_PROJECTION_SNAPSHOT_INVALID");
  }
  return canonicalJsonDigest({
    digestVersion: CODE_MAP_SNAPSHOT_DIGEST_VERSION,
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

function modeFields(mode: CodeMapProjectionModeInput): {
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly inferenceStatus: CodeMapInferenceStatus;
  readonly completeness: CodeMapCompleteness;
  readonly sourceDigest: Sha256Digest;
  readonly declaredManifestId?: string;
  readonly fallbackReason?: CodeMapFallbackReason;
} {
  try {
    parseSha256Digest(mode.sourceDigest);
  } catch {
    return fail("CODE_MAP_PROJECTION_MODE_INVALID");
  }
  if (
    mode.evidenceKind === "STATIC_INFERENCE" &&
    (mode.completeness === "COMPLETE" || mode.completeness === "PARTIAL")
  ) {
    return Object.freeze({
      evidenceKind: mode.evidenceKind,
      inferenceStatus: "AVAILABLE" as const,
      completeness: mode.completeness,
      sourceDigest: mode.sourceDigest
    });
  }
  if (
    mode.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE" &&
    mode.completeness === "UNAVAILABLE" &&
    validToken(mode.declaredManifestId, 128) &&
    CODE_MAP_FALLBACK_REASONS.some((reason) => reason === mode.fallbackReason)
  ) {
    return Object.freeze({
      evidenceKind: mode.evidenceKind,
      inferenceStatus: "UNAVAILABLE_SAFE_FAILURE" as const,
      completeness: mode.completeness,
      sourceDigest: mode.sourceDigest,
      declaredManifestId: mode.declaredManifestId,
      fallbackReason: mode.fallbackReason
    });
  }
  return fail("CODE_MAP_PROJECTION_MODE_INVALID");
}

async function buildAssets(
  scope: { readonly projectId: ProjectId; readonly missionId: MissionId },
  evidenceKind: CodeMapEvidenceKind,
  inputs: readonly CodeMapAssetInput[]
): Promise<readonly CodeMapAsset[]> {
  if (!Array.isArray(inputs) || inputs.length > MAXIMUM_CODE_MAP_ASSETS) {
    return fail("CODE_MAP_PROJECTION_LIMIT_EXCEEDED");
  }
  const keys = new Set<string>();
  const assets: CodeMapAsset[] = [];
  for (const input of inputs) {
    if (
      !isPlainObject(input) ||
      !validToken(input.memberKey) ||
      keys.has(input.memberKey) ||
      !CODE_MAP_ASSET_KINDS.some((kind) => kind === input.kind) ||
      !validToken(input.label, 256) ||
      (input.sourcePath !== undefined && !validPath(input.sourcePath))
    ) {
      return fail(
        keys.has(input.memberKey)
          ? "CODE_MAP_PROJECTION_DUPLICATE_MEMBER"
          : "CODE_MAP_PROJECTION_INPUT_INVALID"
      );
    }
    let sourceDigest: Sha256Digest;
    try {
      sourceDigest = parseSha256Digest(input.sourceDigest);
    } catch {
      return fail("CODE_MAP_PROJECTION_INPUT_INVALID");
    }
    keys.add(input.memberKey);
    const assetKind = input.kind as CodeMapAssetKind;
    const assetId = await deterministicId<"CODE_MAP_ASSET">(
      CODE_MAP_MEMBER_ID_VERSION,
      {
        memberKind: "ASSET",
        projectId: scope.projectId,
        missionId: scope.missionId,
        evidenceKind,
        memberKey: input.memberKey
      }
    );
    const base = {
      assetId,
      memberKey: input.memberKey,
      kind: assetKind,
      label: input.label,
      ...(input.sourcePath === undefined ? {} : { sourcePath: input.sourcePath }),
      sourceDigest,
      evidenceKind
    };
    assets.push(
      Object.freeze({
        ...base,
        assetDigest: await canonicalJsonDigest({
          digestVersion: CODE_MAP_PROJECTION_DIGEST_VERSION,
          asset: base
        })
      })
    );
  }
  return Object.freeze(
    assets.sort((left, right) => left.assetId.localeCompare(right.assetId))
  );
}

async function buildEdges(
  scope: { readonly projectId: ProjectId; readonly missionId: MissionId },
  evidenceKind: CodeMapEvidenceKind,
  assets: readonly CodeMapAsset[],
  inputs: readonly CodeMapEdgeInput[]
): Promise<readonly CodeMapEdge[]> {
  if (!Array.isArray(inputs) || inputs.length > MAXIMUM_CODE_MAP_EDGES) {
    return fail("CODE_MAP_PROJECTION_LIMIT_EXCEEDED");
  }
  const assetsByKey = new Map(assets.map((asset) => [asset.memberKey, asset]));
  const keys = new Set<string>();
  const edges: CodeMapEdge[] = [];
  for (const input of inputs) {
    const from = assetsByKey.get(input.fromMemberKey);
    const to = assetsByKey.get(input.toMemberKey);
    if (
      !isPlainObject(input) ||
      !validToken(input.memberKey) ||
      keys.has(input.memberKey) ||
      !CODE_MAP_EDGE_KINDS.some((kind) => kind === input.kind) ||
      from === undefined ||
      to === undefined ||
      from.assetId === to.assetId
    ) {
      return fail(
        keys.has(input.memberKey)
          ? "CODE_MAP_PROJECTION_DUPLICATE_MEMBER"
          : "CODE_MAP_PROJECTION_EDGE_INVALID"
      );
    }
    keys.add(input.memberKey);
    const edgeKind = input.kind as CodeMapEdgeKind;
    const edgeId = await deterministicId<"CODE_MAP_EDGE">(
      CODE_MAP_MEMBER_ID_VERSION,
      {
        memberKind: "EDGE",
        projectId: scope.projectId,
        missionId: scope.missionId,
        evidenceKind,
        memberKey: input.memberKey
      }
    );
    const base = {
      edgeId,
      memberKey: input.memberKey,
      kind: edgeKind,
      fromAssetId: from.assetId,
      toAssetId: to.assetId,
      evidenceKind
    };
    edges.push(
      Object.freeze({
        ...base,
        edgeDigest: await canonicalJsonDigest({
          digestVersion: CODE_MAP_PROJECTION_DIGEST_VERSION,
          edge: base
        })
      })
    );
  }
  return Object.freeze(
    edges.sort((left, right) => left.edgeId.localeCompare(right.edgeId))
  );
}

function projectionBody(
  projection: Omit<CodeMapProjectionRevision, "projectionDigest">
): JsonObject {
  return {
    projectionVersion: projection.projectionVersion,
    projectionId: projection.projectionId,
    projectId: projection.projectId,
    missionId: projection.missionId,
    registrationId: projection.registrationId,
    revision: projection.revision,
    inputDigest: projection.inputDigest,
    recordedAtUtc: projection.recordedAtUtc,
    snapshotId: projection.snapshotId,
    snapshotCapturedAtUtc: projection.snapshotCapturedAtUtc,
    snapshotDigest: projection.snapshotDigest,
    evidenceKind: projection.evidenceKind,
    inferenceStatus: projection.inferenceStatus,
    completeness: projection.completeness,
    sourceDigest: projection.sourceDigest,
    declaredManifestId: projection.declaredManifestId ?? null,
    fallbackReason: projection.fallbackReason ?? null,
    predecessor:
      projection.predecessor === undefined
        ? null
        : {
            projectionId: projection.predecessor.projectionId,
            revision: projection.predecessor.revision,
            projectionDigest: projection.predecessor.projectionDigest
          },
    assets: projection.assets.map((asset) => ({
      assetId: asset.assetId,
      memberKey: asset.memberKey,
      kind: asset.kind,
      label: asset.label,
      sourcePath: asset.sourcePath ?? null,
      sourceDigest: asset.sourceDigest,
      evidenceKind: asset.evidenceKind,
      assetDigest: asset.assetDigest
    })),
    edges: projection.edges.map((edge) => ({
      edgeId: edge.edgeId,
      memberKey: edge.memberKey,
      kind: edge.kind,
      fromAssetId: edge.fromAssetId,
      toAssetId: edge.toAssetId,
      evidenceKind: edge.evidenceKind,
      edgeDigest: edge.edgeDigest
    }))
  };
}

export async function createCodeMapProjectionRevision(
  input: CreateCodeMapProjectionInput,
  previous?: CodeMapProjectionRevision
): Promise<CodeMapProjectionRevision> {
  let recordedAtUtc: UtcTimestamp;
  try {
    assertGitSnapshotInvariant(input.snapshot);
    recordedAtUtc = parseUtcTimestamp(input.recordedAtUtc);
  } catch {
    return fail("CODE_MAP_PROJECTION_INPUT_INVALID");
  }
  if (recordedAtUtc < input.snapshot.capturedAtUtc) {
    return fail("CODE_MAP_PROJECTION_SNAPSHOT_INVALID");
  }
  const mode = modeFields(input.mode);
  const scope = {
    projectId: input.snapshot.projectId,
    missionId: input.snapshot.missionId
  };
  const snapshotDigest = await codeMapSnapshotDigest(input.snapshot);
  const assets = await buildAssets(scope, mode.evidenceKind, input.assets);
  const edges = await buildEdges(scope, mode.evidenceKind, assets, input.edges);
  const projectionId = await deterministicId<"CODE_MAP_PROJECTION">(
    CODE_MAP_PROJECTION_ID_VERSION,
    scope
  );
  if (previous !== undefined) {
    await assertCodeMapProjectionRevisionInvariant(previous);
    if (
      previous.projectionId !== projectionId ||
      previous.projectId !== scope.projectId ||
      previous.missionId !== scope.missionId ||
      previous.revision >= Number.MAX_SAFE_INTEGER
    ) {
      return fail("CODE_MAP_PROJECTION_PREDECESSOR_INVALID");
    }
  }
  const inputDigest = await canonicalJsonDigest({
    digestVersion: CODE_MAP_PROJECTION_INPUT_DIGEST_VERSION,
    scope,
    registrationId: input.snapshot.registrationId,
    snapshotId: input.snapshot.snapshotId,
    snapshotDigest,
    evidenceKind: mode.evidenceKind,
    inferenceStatus: mode.inferenceStatus,
    completeness: mode.completeness,
    sourceDigest: mode.sourceDigest,
    declaredManifestId: mode.declaredManifestId ?? null,
    fallbackReason: mode.fallbackReason ?? null,
    assets: assets.map((asset) => ({ assetId: asset.assetId, digest: asset.assetDigest })),
    edges: edges.map((edge) => ({ edgeId: edge.edgeId, digest: edge.edgeDigest }))
  });
  if (previous?.inputDigest === inputDigest) return previous;
  const predecessor =
    previous === undefined
      ? undefined
      : Object.freeze({
          projectionId: previous.projectionId,
          revision: previous.revision,
          projectionDigest: previous.projectionDigest
        });
  const withoutDigest = Object.freeze({
    projectionVersion: CODE_MAP_PROJECTION_VERSION,
    projectionId,
    projectId: scope.projectId,
    missionId: scope.missionId,
    registrationId: input.snapshot.registrationId,
    revision: previous === undefined ? 1 : previous.revision + 1,
    inputDigest,
    recordedAtUtc,
    snapshotId: input.snapshot.snapshotId,
    snapshotCapturedAtUtc: input.snapshot.capturedAtUtc,
    snapshotDigest,
    ...mode,
    ...(predecessor === undefined ? {} : { predecessor }),
    assets,
    edges
  });
  const projection = Object.freeze({
    ...withoutDigest,
    projectionDigest: await canonicalJsonDigest({
      digestVersion: CODE_MAP_PROJECTION_DIGEST_VERSION,
      projection: projectionBody(withoutDigest)
    })
  });
  await assertCodeMapProjectionRevisionInvariant(projection);
  return projection;
}

export async function assertCodeMapProjectionRevisionInvariant(
  projection: CodeMapProjectionRevision
): Promise<void> {
  try {
    if (
      projection.projectionVersion !== CODE_MAP_PROJECTION_VERSION ||
      parseStableId<"CODE_MAP_PROJECTION">(projection.projectionId) !== projection.projectionId ||
      parseStableId<"PROJECT">(projection.projectId) !== projection.projectId ||
      parseStableId<"MISSION">(projection.missionId) !== projection.missionId ||
      parseStableId<"REPOSITORY_REGISTRATION">(projection.registrationId) !== projection.registrationId ||
      parseStableId<"GIT_SNAPSHOT">(projection.snapshotId) !== projection.snapshotId ||
      !Number.isSafeInteger(projection.revision) ||
      projection.revision < 1 ||
      parseUtcTimestamp(projection.recordedAtUtc) !== projection.recordedAtUtc ||
      parseUtcTimestamp(projection.snapshotCapturedAtUtc) !== projection.snapshotCapturedAtUtc ||
      projection.recordedAtUtc < projection.snapshotCapturedAtUtc ||
      parseSha256Digest(projection.inputDigest) !== projection.inputDigest ||
      parseSha256Digest(projection.snapshotDigest) !== projection.snapshotDigest ||
      parseSha256Digest(projection.sourceDigest) !== projection.sourceDigest ||
      parseSha256Digest(projection.projectionDigest) !== projection.projectionDigest ||
      projection.assets.length > MAXIMUM_CODE_MAP_ASSETS ||
      projection.edges.length > MAXIMUM_CODE_MAP_EDGES
    ) {
      return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
    }
  } catch (error) {
    if (error instanceof CodeMapProjectionError) throw error;
    return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
  }
  const expectedProjectionId = await deterministicId<"CODE_MAP_PROJECTION">(
    CODE_MAP_PROJECTION_ID_VERSION,
    { projectId: projection.projectId, missionId: projection.missionId }
  );
  if (expectedProjectionId !== projection.projectionId) {
    return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
  }
  if (
    !CODE_MAP_EVIDENCE_KINDS.some((kind) => kind === projection.evidenceKind) ||
    !CODE_MAP_INFERENCE_STATUSES.some((status) => status === projection.inferenceStatus) ||
    !CODE_MAP_COMPLETENESS.some((value) => value === projection.completeness) ||
    (projection.evidenceKind === "STATIC_INFERENCE" &&
      (projection.inferenceStatus !== "AVAILABLE" ||
        (projection.completeness !== "COMPLETE" && projection.completeness !== "PARTIAL") ||
        projection.declaredManifestId !== undefined ||
        projection.fallbackReason !== undefined)) ||
    (projection.evidenceKind === "DECLARED_INTELLILOOP_FIXTURE" &&
      (projection.inferenceStatus !== "UNAVAILABLE_SAFE_FAILURE" ||
        projection.completeness !== "UNAVAILABLE" ||
        !validToken(projection.declaredManifestId, 128) ||
        !CODE_MAP_FALLBACK_REASONS.some((reason) => reason === projection.fallbackReason)))
  ) {
    return fail("CODE_MAP_PROJECTION_MODE_INVALID");
  }
  if (
    (projection.revision === 1 && projection.predecessor !== undefined) ||
    (projection.revision > 1 &&
      (projection.predecessor === undefined ||
        projection.predecessor.projectionId !== projection.projectionId ||
        projection.predecessor.revision !== projection.revision - 1))
  ) {
    return fail("CODE_MAP_PROJECTION_PREDECESSOR_INVALID");
  }
  if (projection.predecessor !== undefined) {
    try {
      if (
        parseStableId<"CODE_MAP_PROJECTION">(projection.predecessor.projectionId) !==
          projection.predecessor.projectionId ||
        parseSha256Digest(projection.predecessor.projectionDigest) !==
          projection.predecessor.projectionDigest
      ) {
        return fail("CODE_MAP_PROJECTION_PREDECESSOR_INVALID");
      }
    } catch {
      return fail("CODE_MAP_PROJECTION_PREDECESSOR_INVALID");
    }
  }
  const assetIds = new Set<string>();
  const assetKeys = new Set<string>();
  let lastAssetId = "";
  for (const asset of projection.assets) {
    try {
      if (
        parseStableId<"CODE_MAP_ASSET">(asset.assetId) !== asset.assetId ||
        !validToken(asset.memberKey) ||
        !CODE_MAP_ASSET_KINDS.some((kind) => kind === asset.kind) ||
        !validToken(asset.label, 256) ||
        (asset.sourcePath !== undefined && !validPath(asset.sourcePath)) ||
        parseSha256Digest(asset.sourceDigest) !== asset.sourceDigest ||
        parseSha256Digest(asset.assetDigest) !== asset.assetDigest
      ) {
        return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
      }
    } catch {
      return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
    }
    const expectedId = await deterministicId<"CODE_MAP_ASSET">(
      CODE_MAP_MEMBER_ID_VERSION,
      {
        memberKind: "ASSET",
        projectId: projection.projectId,
        missionId: projection.missionId,
        evidenceKind: projection.evidenceKind,
        memberKey: asset.memberKey
      }
    );
    const { assetDigest: _assetDigest, ...base } = asset;
    const expectedDigest = await canonicalJsonDigest({
      digestVersion: CODE_MAP_PROJECTION_DIGEST_VERSION,
      asset: base
    });
    if (
      expectedId !== asset.assetId ||
      expectedDigest !== asset.assetDigest ||
      asset.evidenceKind !== projection.evidenceKind ||
      asset.assetId <= lastAssetId ||
      assetIds.has(asset.assetId) ||
      assetKeys.has(asset.memberKey)
    ) {
      return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
    }
    lastAssetId = asset.assetId;
    assetIds.add(asset.assetId);
    assetKeys.add(asset.memberKey);
  }
  const edgeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  let lastEdgeId = "";
  for (const edge of projection.edges) {
    try {
      if (
        parseStableId<"CODE_MAP_EDGE">(edge.edgeId) !== edge.edgeId ||
        !validToken(edge.memberKey) ||
        !CODE_MAP_EDGE_KINDS.some((kind) => kind === edge.kind) ||
        parseStableId<"CODE_MAP_ASSET">(edge.fromAssetId) !== edge.fromAssetId ||
        parseStableId<"CODE_MAP_ASSET">(edge.toAssetId) !== edge.toAssetId ||
        parseSha256Digest(edge.edgeDigest) !== edge.edgeDigest
      ) {
        return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
      }
    } catch {
      return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
    }
    const expectedId = await deterministicId<"CODE_MAP_EDGE">(
      CODE_MAP_MEMBER_ID_VERSION,
      {
        memberKind: "EDGE",
        projectId: projection.projectId,
        missionId: projection.missionId,
        evidenceKind: projection.evidenceKind,
        memberKey: edge.memberKey
      }
    );
    const { edgeDigest: _edgeDigest, ...base } = edge;
    const expectedDigest = await canonicalJsonDigest({
      digestVersion: CODE_MAP_PROJECTION_DIGEST_VERSION,
      edge: base
    });
    if (
      expectedId !== edge.edgeId ||
      expectedDigest !== edge.edgeDigest ||
      edge.evidenceKind !== projection.evidenceKind ||
      edge.edgeId <= lastEdgeId ||
      edgeIds.has(edge.edgeId) ||
      edgeKeys.has(edge.memberKey) ||
      !assetIds.has(edge.fromAssetId) ||
      !assetIds.has(edge.toAssetId) ||
      edge.fromAssetId === edge.toAssetId
    ) {
      return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
    }
    lastEdgeId = edge.edgeId;
    edgeIds.add(edge.edgeId);
    edgeKeys.add(edge.memberKey);
  }
  const expectedInputDigest = await canonicalJsonDigest({
    digestVersion: CODE_MAP_PROJECTION_INPUT_DIGEST_VERSION,
    scope: { projectId: projection.projectId, missionId: projection.missionId },
    registrationId: projection.registrationId,
    snapshotId: projection.snapshotId,
    snapshotDigest: projection.snapshotDigest,
    evidenceKind: projection.evidenceKind,
    inferenceStatus: projection.inferenceStatus,
    completeness: projection.completeness,
    sourceDigest: projection.sourceDigest,
    declaredManifestId: projection.declaredManifestId ?? null,
    fallbackReason: projection.fallbackReason ?? null,
    assets: projection.assets.map((asset) => ({
      assetId: asset.assetId,
      digest: asset.assetDigest
    })),
    edges: projection.edges.map((edge) => ({
      edgeId: edge.edgeId,
      digest: edge.edgeDigest
    }))
  });
  if (expectedInputDigest !== projection.inputDigest) {
    return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
  }
  const { projectionDigest: _projectionDigest, ...withoutDigest } = projection;
  const expectedDigest = await canonicalJsonDigest({
    digestVersion: CODE_MAP_PROJECTION_DIGEST_VERSION,
    projection: projectionBody(withoutDigest)
  });
  if (expectedDigest !== projection.projectionDigest) {
    return fail("CODE_MAP_PROJECTION_INTEGRITY_INVALID");
  }
}

export async function serializeCodeMapProjectionRevision(
  projection: CodeMapProjectionRevision
): Promise<string> {
  await assertCodeMapProjectionRevisionInvariant(projection);
  const serialized = canonicalizeJson({
    ...projectionBody(projection),
    projectionDigest: projection.projectionDigest
  });
  if (new TextEncoder().encode(serialized).byteLength > MAXIMUM_CODE_MAP_SERIALIZED_BYTES) {
    return fail("CODE_MAP_PROJECTION_LIMIT_EXCEEDED");
  }
  return serialized;
}

export async function deserializeCodeMapProjectionRevision(
  serialized: string
): Promise<CodeMapProjectionRevision> {
  if (
    typeof serialized !== "string" ||
    new TextEncoder().encode(serialized).byteLength > MAXIMUM_CODE_MAP_SERIALIZED_BYTES
  ) {
    return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
  }
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
  }
  const record = exactObject(
    value,
    [
      "projectionVersion", "projectionId", "projectId", "missionId",
      "registrationId", "revision", "inputDigest", "recordedAtUtc",
      "snapshotId", "snapshotCapturedAtUtc", "snapshotDigest", "evidenceKind",
      "inferenceStatus", "completeness", "sourceDigest", "declaredManifestId",
      "fallbackReason", "predecessor", "assets", "edges", "projectionDigest"
    ],
    [],
    "CODE_MAP_PROJECTION_SERIALIZATION_INVALID"
  );
  try {
    const evidenceKind = record.evidenceKind as CodeMapEvidenceKind;
    const assetValues = exactArray(
      record.assets,
      MAXIMUM_CODE_MAP_ASSETS,
      "CODE_MAP_PROJECTION_LIMIT_EXCEEDED"
    );
    const assets = Object.freeze(assetValues.map((value) => {
      const asset = exactObject(
        value,
        ["assetId", "memberKey", "kind", "label", "sourcePath", "sourceDigest", "evidenceKind", "assetDigest"],
        [],
        "CODE_MAP_PROJECTION_SERIALIZATION_INVALID"
      );
      if (
        !validToken(asset.memberKey) ||
        !CODE_MAP_ASSET_KINDS.some((kind) => kind === asset.kind) ||
        !validToken(asset.label, 256) ||
        (asset.sourcePath !== null && !validPath(asset.sourcePath))
      ) return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
      return Object.freeze({
        assetId: parseStableId<"CODE_MAP_ASSET">(asset.assetId),
        memberKey: asset.memberKey,
        kind: asset.kind,
        label: asset.label,
        ...(asset.sourcePath === null ? {} : { sourcePath: asset.sourcePath }),
        sourceDigest: parseSha256Digest(asset.sourceDigest),
        evidenceKind: asset.evidenceKind as CodeMapEvidenceKind,
        assetDigest: parseSha256Digest(asset.assetDigest)
      }) as CodeMapAsset;
    }));
    const edgeValues = exactArray(
      record.edges,
      MAXIMUM_CODE_MAP_EDGES,
      "CODE_MAP_PROJECTION_LIMIT_EXCEEDED"
    );
    const edges = Object.freeze(edgeValues.map((value) => {
      const edge = exactObject(
        value,
        ["edgeId", "memberKey", "kind", "fromAssetId", "toAssetId", "evidenceKind", "edgeDigest"],
        [],
        "CODE_MAP_PROJECTION_SERIALIZATION_INVALID"
      );
      if (!validToken(edge.memberKey) || !CODE_MAP_EDGE_KINDS.some((kind) => kind === edge.kind)) {
        return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
      }
      return Object.freeze({
        edgeId: parseStableId<"CODE_MAP_EDGE">(edge.edgeId),
        memberKey: edge.memberKey,
        kind: edge.kind,
        fromAssetId: parseStableId<"CODE_MAP_ASSET">(edge.fromAssetId),
        toAssetId: parseStableId<"CODE_MAP_ASSET">(edge.toAssetId),
        evidenceKind: edge.evidenceKind as CodeMapEvidenceKind,
        edgeDigest: parseSha256Digest(edge.edgeDigest)
      }) as CodeMapEdge;
    }));
    let predecessor: CodeMapProjectionPredecessor | undefined;
    if (record.predecessor !== null) {
      const prior = exactObject(
        record.predecessor,
        ["projectionId", "revision", "projectionDigest"],
        [],
        "CODE_MAP_PROJECTION_SERIALIZATION_INVALID"
      );
      if (!Number.isSafeInteger(prior.revision) || (prior.revision as number) < 1) {
        return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
      }
      predecessor = Object.freeze({
        projectionId: parseStableId<"CODE_MAP_PROJECTION">(prior.projectionId),
        revision: prior.revision as number,
        projectionDigest: parseSha256Digest(prior.projectionDigest)
      });
    }
    if (!Number.isSafeInteger(record.revision) || (record.revision as number) < 1) {
      return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
    }
    const projection = Object.freeze({
      projectionVersion: record.projectionVersion,
      projectionId: parseStableId<"CODE_MAP_PROJECTION">(record.projectionId),
      projectId: parseStableId<"PROJECT">(record.projectId),
      missionId: parseStableId<"MISSION">(record.missionId),
      registrationId: parseStableId<"REPOSITORY_REGISTRATION">(record.registrationId),
      revision: record.revision as number,
      inputDigest: parseSha256Digest(record.inputDigest),
      recordedAtUtc: parseUtcTimestamp(record.recordedAtUtc),
      snapshotId: parseStableId<"GIT_SNAPSHOT">(record.snapshotId),
      snapshotCapturedAtUtc: parseUtcTimestamp(record.snapshotCapturedAtUtc),
      snapshotDigest: parseSha256Digest(record.snapshotDigest),
      evidenceKind,
      inferenceStatus: record.inferenceStatus as CodeMapInferenceStatus,
      completeness: record.completeness as CodeMapCompleteness,
      sourceDigest: parseSha256Digest(record.sourceDigest),
      ...(record.declaredManifestId === null ? {} : { declaredManifestId: record.declaredManifestId as string }),
      ...(record.fallbackReason === null ? {} : { fallbackReason: record.fallbackReason as CodeMapFallbackReason }),
      ...(predecessor === undefined ? {} : { predecessor }),
      assets,
      edges,
      projectionDigest: parseSha256Digest(record.projectionDigest)
    }) as CodeMapProjectionRevision;
    if (projection.projectionVersion !== CODE_MAP_PROJECTION_VERSION) {
      return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
    }
    await assertCodeMapProjectionRevisionInvariant(projection);
    if (canonicalizeJson(JSON.parse(serialized) as unknown) !== serialized) {
      return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
    }
    return projection;
  } catch (error) {
    if (error instanceof CodeMapProjectionError) throw error;
    return fail("CODE_MAP_PROJECTION_SERIALIZATION_INVALID");
  }
}
