import type {
  EpistemicLabel,
  OriginKind,
  Sha256Digest,
  TwinNode,
  TwinNodeType,
  TwinProjectedSourceType,
  TwinProjectionRevision,
  TwinRelationship,
  TwinRelationshipType
} from "@intelliloop/domain";
import {
  serializeTwinNode,
  serializeTwinRelationship,
  sha256TextDigest
} from "@intelliloop/domain";

import type { PageMetadata } from "./project-api.js";

export const TWIN_API_VERSION = "v1" as const;

export interface TwinSourceVersionResource {
  readonly kind: "SOURCE_REVISION" | "CONTENT_DIGEST";
  readonly value: string;
}

export interface TwinAttributionResource {
  readonly origin: OriginKind;
  readonly pathCitation: string;
  readonly sourceVersion: TwinSourceVersionResource;
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: string;
  readonly epistemicLabel: EpistemicLabel;
}

export interface TwinRevisionPredecessorResource {
  readonly revision: number;
  readonly projectionDigest: Sha256Digest;
}

export interface TwinCodeMapBindingResource {
  readonly projectionId: string;
  readonly revision: number;
  readonly projectionDigest: Sha256Digest;
}

export interface TwinRevisionSummaryResource {
  readonly projectionId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly revision: number;
  readonly inputDigest: Sha256Digest;
  readonly projectionDigest: Sha256Digest;
  readonly recordedAtUtc: string;
  readonly codeMapBinding?: TwinCodeMapBindingResource;
  readonly predecessor?: TwinRevisionPredecessorResource;
  readonly nodeCount: number;
  readonly relationshipCount: number;
  readonly invalidationCount: number;
}

export interface TwinNodeSourceResource {
  readonly sourceType: TwinProjectedSourceType;
  readonly sourceId: string;
  readonly sourceDigest: Sha256Digest;
}

export interface TwinNodeResource {
  readonly nodeId: string;
  readonly nodeRevision: number;
  readonly memberDigest: Sha256Digest;
  readonly nodeType: TwinNodeType;
  readonly attribution: TwinAttributionResource;
  readonly source: TwinNodeSourceResource;
}

export interface TwinEndpointResource {
  readonly nodeId: string;
  readonly nodeRevision: number;
}

export interface TwinRelationshipResource {
  readonly relationshipId: string;
  readonly relationshipRevision: number;
  readonly memberDigest: Sha256Digest;
  readonly relationshipType: TwinRelationshipType;
  readonly from: TwinEndpointResource;
  readonly to: TwinEndpointResource;
  readonly attribution: TwinAttributionResource;
}

export interface TwinRevisionResponse {
  readonly apiVersion: typeof TWIN_API_VERSION;
  readonly twinRevision: TwinRevisionSummaryResource;
}

export interface TwinMaterializeResponse extends TwinRevisionResponse {
  readonly created: boolean;
}

export interface TwinRevisionListResponse {
  readonly apiVersion: typeof TWIN_API_VERSION;
  readonly missionId: string;
  readonly revisions: readonly TwinRevisionSummaryResource[];
  readonly page: {
    readonly limit: number;
    readonly nextCursor: number | null;
  };
}

export interface TwinNodeListResponse {
  readonly apiVersion: typeof TWIN_API_VERSION;
  readonly missionId: string;
  readonly projectionRevision: number;
  readonly nodes: readonly TwinNodeResource[];
  readonly page: PageMetadata;
}

export interface TwinRelationshipListResponse {
  readonly apiVersion: typeof TWIN_API_VERSION;
  readonly missionId: string;
  readonly projectionRevision: number;
  readonly relationships: readonly TwinRelationshipResource[];
  readonly page: PageMetadata;
}

function toAttributionResource(
  metadata: TwinNode["metadata"] | TwinRelationship["metadata"]
): TwinAttributionResource {
  return {
    origin: metadata.origin.kind,
    pathCitation: metadata.sourceReference,
    sourceVersion: {
      kind: metadata.sourceRevisionOrDigest.kind,
      value: metadata.sourceRevisionOrDigest.value
    },
    recordedAtUtc: metadata.recordedAtUtc,
    ...(metadata.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: metadata.effectiveAtUtc }),
    extractionMethod: metadata.extractionMethod,
    epistemicLabel: metadata.epistemicLabel
  };
}

export function toTwinRevisionSummaryResource(
  projection: TwinProjectionRevision
): TwinRevisionSummaryResource {
  return {
    projectionId: projection.projectionId,
    projectId: projection.projectId,
    missionId: projection.missionId,
    revision: projection.revision,
    inputDigest: projection.inputDigest,
    projectionDigest: projection.projectionDigest,
    recordedAtUtc: projection.recordedAtUtc,
    ...(projection.codeMapBinding === undefined
      ? {}
      : { codeMapBinding: projection.codeMapBinding }),
    ...(projection.predecessor === undefined
      ? {}
      : {
          predecessor: {
            revision: projection.predecessor.revision,
            projectionDigest: projection.predecessor.projectionDigest
          }
        }),
    nodeCount: projection.nodes.length,
    relationshipCount: projection.relationships.length,
    invalidationCount: projection.invalidations.length
  };
}

export async function toTwinNodeResource(
  projection: TwinProjectionRevision,
  node: TwinNode
): Promise<TwinNodeResource> {
  const source = projection.nodeSources.find(
    (candidate) =>
      candidate.nodeId === node.nodeId &&
      candidate.nodeRevision === node.revision
  );
  if (source === undefined) {
    throw new TypeError("Twin node source binding is missing.");
  }
  return {
    nodeId: node.nodeId,
    nodeRevision: node.revision,
    memberDigest: await sha256TextDigest(serializeTwinNode(node)),
    nodeType: node.nodeType,
    attribution: toAttributionResource(node.metadata),
    source: {
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceDigest: source.sourceDigest
    }
  };
}

export async function toTwinRelationshipResource(
  projection: TwinProjectionRevision,
  relationship: TwinRelationship
): Promise<TwinRelationshipResource> {
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
    throw new TypeError("Twin relationship endpoint is missing.");
  }
  return {
    relationshipId: relationship.relationshipId,
    relationshipRevision: relationship.revision,
    memberDigest: await sha256TextDigest(
      serializeTwinRelationship(relationship, from, to)
    ),
    relationshipType: relationship.relationshipType,
    from: {
      nodeId: relationship.from.nodeId,
      nodeRevision: relationship.from.revision
    },
    to: {
      nodeId: relationship.to.nodeId,
      nodeRevision: relationship.to.revision
    },
    attribution: toAttributionResource(relationship.metadata)
  };
}
