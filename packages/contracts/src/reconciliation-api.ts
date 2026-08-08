import type {
  ReconciliationImpactRevision,
  Sha256Digest
} from "@intelliloop/domain";

import type { PageMetadata } from "./project-api.js";

export const RECONCILIATION_API_VERSION = "v1" as const;

export interface EvidenceSupportRequirementRequest {
  readonly requirementId: string;
  readonly supportKind: "EVIDENCE_SOURCE";
  readonly sourceLocator: string;
}

export interface ValidationSupportRequirementRequest {
  readonly requirementId: string;
  readonly supportKind: "VALIDATION_RESULT";
  readonly validationKey: string;
}

export type ReconciliationSupportRequirementRequest =
  | EvidenceSupportRequirementRequest
  | ValidationSupportRequirementRequest;

export interface TwinMemberCitationRequest {
  readonly kind: "NODE" | "RELATIONSHIP";
  readonly memberId: string;
  readonly revision: number;
  readonly digest: Sha256Digest;
}

export interface ChangeImpactRootRequest {
  readonly rootId: string;
  readonly nodeId: string;
}

interface ChangeImpactRequirementRequestBase {
  readonly requirementId: string;
  readonly rootId: string;
  readonly criticalAssetId: string;
  readonly basisCitations: readonly TwinMemberCitationRequest[];
}

export interface ImplementationChangeImpactRequirementRequest
  extends ChangeImpactRequirementRequestBase {
  readonly supportKind: "IMPLEMENTATION";
  readonly validationKey?: never;
}

export interface ValidationChangeImpactRequirementRequest
  extends ChangeImpactRequirementRequestBase {
  readonly supportKind: "VALIDATION";
  readonly validationKey: string;
}

export type ChangeImpactRequirementRequest =
  | ImplementationChangeImpactRequirementRequest
  | ValidationChangeImpactRequirementRequest;

export interface RunReconciliationRequest {
  readonly twinRevision: number;
  readonly codeMapRevision: number;
  readonly targetSnapshotId: string;
  readonly supportRequirements: readonly ReconciliationSupportRequirementRequest[];
  readonly roots: readonly ChangeImpactRootRequest[];
  readonly impactRequirements: readonly ChangeImpactRequirementRequest[];
}

export interface ReconciliationProjectionBindingResource {
  readonly projectionId: string;
  readonly revision: number;
  readonly projectionDigest: Sha256Digest;
}

export interface ReconciliationCodeMapBindingResource
  extends ReconciliationProjectionBindingResource {
  readonly evidenceKind: "STATIC_INFERENCE" | "DECLARED_INTELLILOOP_FIXTURE";
  readonly inferenceStatus: "AVAILABLE" | "UNAVAILABLE_SAFE_FAILURE";
  readonly completeness: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
}

export interface ReconciliationRevisionPredecessorResource {
  readonly revision: number;
  readonly resultDigest: Sha256Digest;
}

export interface ReconciliationFindingCountsResource {
  readonly CONFLICT: number;
  readonly AMBIGUOUS: number;
  readonly MISSING: number;
  readonly STALE: number;
  readonly IMPACT_GAP: number;
  readonly total: number;
}

export interface ReconciliationRevisionSummaryResource {
  readonly revisionKey: Sha256Digest;
  readonly version: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly revision: number;
  readonly inputDigest: Sha256Digest;
  readonly resultDigest: Sha256Digest;
  readonly twinBinding: ReconciliationProjectionBindingResource;
  readonly targetSnapshotId: string;
  readonly codeMapBinding: ReconciliationCodeMapBindingResource;
  readonly reassessmentDigest: Sha256Digest;
  readonly impactDigest: Sha256Digest;
  readonly predecessor?: ReconciliationRevisionPredecessorResource;
  readonly findingCounts: ReconciliationFindingCountsResource;
  readonly impactPathCount: number;
}

type Reassessment = ReconciliationImpactRevision["reassessment"];

export type ReconciliationFindingResource =
  | Reassessment["claimFindings"][number]
  | Reassessment["missingFindings"][number]
  | NonNullable<Reassessment["stalePredecessorFinding"]>
  | ReconciliationImpactRevision["impact"]["impactGapFindings"][number];

export type ReconciliationImpactPathResource =
  ReconciliationImpactRevision["impact"]["paths"][number];

export interface ReconciliationRevisionResponse {
  readonly apiVersion: typeof RECONCILIATION_API_VERSION;
  readonly reconciliationRevision: ReconciliationRevisionSummaryResource;
}

export interface ReconciliationRunResponse
  extends ReconciliationRevisionResponse {
  readonly created: boolean;
}

export interface ReconciliationRevisionListResponse {
  readonly apiVersion: typeof RECONCILIATION_API_VERSION;
  readonly missionId: string;
  readonly revisions: readonly ReconciliationRevisionSummaryResource[];
  readonly page: {
    readonly limit: number;
    readonly nextCursor: number | null;
  };
}

export interface ReconciliationFindingListResponse {
  readonly apiVersion: typeof RECONCILIATION_API_VERSION;
  readonly missionId: string;
  readonly reconciliationRevision: number;
  readonly findings: readonly ReconciliationFindingResource[];
  readonly page: PageMetadata;
}

export interface ReconciliationImpactPathListResponse {
  readonly apiVersion: typeof RECONCILIATION_API_VERSION;
  readonly missionId: string;
  readonly reconciliationRevision: number;
  readonly impactPaths: readonly ReconciliationImpactPathResource[];
  readonly page: PageMetadata;
}

export function toReconciliationRevisionSummaryResource(
  value: ReconciliationImpactRevision
): ReconciliationRevisionSummaryResource {
  return {
    revisionKey: value.revisionKey,
    version: value.version,
    projectId: value.projectId,
    missionId: value.missionId,
    revision: value.revision,
    inputDigest: value.inputDigest,
    resultDigest: value.resultDigest,
    twinBinding: value.twinBinding,
    targetSnapshotId: value.targetSnapshotId,
    codeMapBinding: value.codeMapBinding,
    reassessmentDigest: value.reassessment.resultDigest,
    impactDigest: value.impact.resultDigest,
    ...(value.predecessor === undefined
      ? {}
      : {
          predecessor: {
            revision: value.predecessor.revision,
            resultDigest: value.predecessor.resultDigest
          }
        }),
    findingCounts: value.findingCounts,
    impactPathCount: value.impactPathCount
  };
}
