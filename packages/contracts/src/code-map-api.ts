import type {
  CodeMapAsset,
  CodeMapAssetKind,
  CodeMapCompleteness,
  CodeMapEdge,
  CodeMapEdgeKind,
  CodeMapEvidenceKind,
  CodeMapFallbackReason,
  CodeMapInferenceStatus,
  CodeMapProjectionRevision,
  Sha256Digest
} from "@intelliloop/domain";

import type { PageMetadata } from "./project-api.js";

export const CODE_MAP_API_VERSION = "v1" as const;
export const CODE_MAP_FALLBACK_MODES = [
  "DISABLED",
  "INTELLILOOP_CONTROLLED_FIXTURE"
] as const;

export type CodeMapFallbackMode =
  (typeof CODE_MAP_FALLBACK_MODES)[number];

export interface RunCodeMapRequest {
  readonly fallbackMode?: CodeMapFallbackMode;
}

export interface CodeMapRevisionPredecessorResource {
  readonly revision: number;
  readonly projectionDigest: Sha256Digest;
}

export interface CodeMapSnapshotBindingResource {
  readonly snapshotId: string;
  readonly capturedAtUtc: string;
  readonly snapshotDigest: Sha256Digest;
}

export interface CodeMapEvidenceModeResource {
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly inferenceStatus: CodeMapInferenceStatus;
  readonly completeness: CodeMapCompleteness;
  readonly sourceDigest: Sha256Digest;
  readonly declaredManifestId?: string;
  readonly fallbackReason?: CodeMapFallbackReason;
}

export interface CodeMapRevisionSummaryResource {
  readonly projectionId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly registrationId: string;
  readonly revision: number;
  readonly inputDigest: Sha256Digest;
  readonly projectionDigest: Sha256Digest;
  readonly recordedAtUtc: string;
  readonly snapshot: CodeMapSnapshotBindingResource;
  readonly evidence: CodeMapEvidenceModeResource;
  readonly predecessor?: CodeMapRevisionPredecessorResource;
  readonly assetCount: number;
  readonly edgeCount: number;
}

export interface CodeMapAssetResource {
  readonly assetId: string;
  readonly kind: CodeMapAssetKind;
  readonly label: string;
  readonly sourcePath?: string;
  readonly sourceDigest: Sha256Digest;
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly assetDigest: Sha256Digest;
}

export interface CodeMapEdgeResource {
  readonly edgeId: string;
  readonly kind: CodeMapEdgeKind;
  readonly fromAssetId: string;
  readonly toAssetId: string;
  readonly evidenceKind: CodeMapEvidenceKind;
  readonly edgeDigest: Sha256Digest;
}

export interface CodeMapRevisionResponse {
  readonly apiVersion: typeof CODE_MAP_API_VERSION;
  readonly codeMapRevision: CodeMapRevisionSummaryResource;
}

export interface CodeMapRunResponse extends CodeMapRevisionResponse {
  readonly created: boolean;
}

export interface CodeMapRevisionListResponse {
  readonly apiVersion: typeof CODE_MAP_API_VERSION;
  readonly missionId: string;
  readonly revisions: readonly CodeMapRevisionSummaryResource[];
  readonly page: {
    readonly limit: number;
    readonly nextCursor: number | null;
  };
}

export interface CodeMapAssetListResponse {
  readonly apiVersion: typeof CODE_MAP_API_VERSION;
  readonly missionId: string;
  readonly projectionRevision: number;
  readonly assets: readonly CodeMapAssetResource[];
  readonly page: PageMetadata;
}

export interface CodeMapEdgeListResponse {
  readonly apiVersion: typeof CODE_MAP_API_VERSION;
  readonly missionId: string;
  readonly projectionRevision: number;
  readonly edges: readonly CodeMapEdgeResource[];
  readonly page: PageMetadata;
}

export function toCodeMapRevisionSummaryResource(
  projection: CodeMapProjectionRevision
): CodeMapRevisionSummaryResource {
  return {
    projectionId: projection.projectionId,
    projectId: projection.projectId,
    missionId: projection.missionId,
    registrationId: projection.registrationId,
    revision: projection.revision,
    inputDigest: projection.inputDigest,
    projectionDigest: projection.projectionDigest,
    recordedAtUtc: projection.recordedAtUtc,
    snapshot: {
      snapshotId: projection.snapshotId,
      capturedAtUtc: projection.snapshotCapturedAtUtc,
      snapshotDigest: projection.snapshotDigest
    },
    evidence: {
      evidenceKind: projection.evidenceKind,
      inferenceStatus: projection.inferenceStatus,
      completeness: projection.completeness,
      sourceDigest: projection.sourceDigest,
      ...(projection.declaredManifestId === undefined
        ? {}
        : { declaredManifestId: projection.declaredManifestId }),
      ...(projection.fallbackReason === undefined
        ? {}
        : { fallbackReason: projection.fallbackReason })
    },
    ...(projection.predecessor === undefined
      ? {}
      : {
          predecessor: {
            revision: projection.predecessor.revision,
            projectionDigest: projection.predecessor.projectionDigest
          }
        }),
    assetCount: projection.assets.length,
    edgeCount: projection.edges.length
  };
}

export function toCodeMapAssetResource(
  asset: CodeMapAsset
): CodeMapAssetResource {
  return {
    assetId: asset.assetId,
    kind: asset.kind,
    label: asset.label,
    ...(asset.sourcePath === undefined ? {} : { sourcePath: asset.sourcePath }),
    sourceDigest: asset.sourceDigest,
    evidenceKind: asset.evidenceKind,
    assetDigest: asset.assetDigest
  };
}

export function toCodeMapEdgeResource(edge: CodeMapEdge): CodeMapEdgeResource {
  return {
    edgeId: edge.edgeId,
    kind: edge.kind,
    fromAssetId: edge.fromAssetId,
    toAssetId: edge.toAssetId,
    evidenceKind: edge.evidenceKind,
    edgeDigest: edge.edgeDigest
  };
}
