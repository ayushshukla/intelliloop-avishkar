import type {
  Claim,
  ClaimApplicabilityInput,
  ClaimSupersession,
  EpistemicLabel,
  EvidenceImportFormat,
  EvidenceSource,
  EvidenceTimelineEvent,
  JsonValue,
  OriginKind,
  PreparedEvidenceImport,
  RuntimeObservation,
  RuntimeObservationEnvironment,
  RuntimeObservationFreshness,
  RuntimeObservationId,
  RuntimeObservationUnit
} from "@intelliloop/domain";

import { PROJECT_API_VERSION, type PageMetadata } from "./project-api.js";

export const EVIDENCE_API_VERSION = PROJECT_API_VERSION;

export interface EvidencePreviewRequest {
  readonly format: EvidenceImportFormat;
  readonly content: string;
}

export interface CommitEvidenceRequest extends EvidencePreviewRequest {
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly effectiveAtUtc?: string;
  readonly epistemicLabel: EpistemicLabel;
}

export interface CreateClaimRequest {
  readonly rawText: string;
  readonly subject: string;
  readonly predicate: string;
  readonly value: JsonValue;
  readonly applicability?: ClaimApplicabilityInput;
  readonly effectiveAtUtc?: string;
  readonly epistemicLabel: EpistemicLabel;
}

export interface CreateClaimSuccessorRequest extends CreateClaimRequest {
  readonly evidenceSourceId: string;
}

export interface RuntimeObservationMeasurementInput {
  readonly name: string;
  readonly unit: RuntimeObservationUnit;
  readonly value: number;
}

export interface RuntimeObservationSummaryInput {
  readonly schemaVersion: "runtime-observation-summary.v1";
  readonly subject: string;
  readonly environment: RuntimeObservationEnvironment;
  readonly observationKind: string;
  readonly observedFromUtc: string;
  readonly observedUntilUtc: string;
  readonly sampleCount: number;
  readonly measurements: readonly RuntimeObservationMeasurementInput[];
}

export interface CommitRuntimeObservationRequest {
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly epistemicLabel: EpistemicLabel;
  readonly summary: RuntimeObservationSummaryInput;
}

export interface RedactionRuleCountResource {
  readonly rule: string;
  readonly replacements: number;
}

export interface EvidenceRedactionResource {
  readonly applied: boolean;
  readonly totalReplacements: number;
  readonly ruleCounts: readonly RedactionRuleCountResource[];
}

export interface PreparedEvidenceResource {
  readonly normalizationVersion: string;
  readonly format: EvidenceImportFormat;
  readonly inputByteCount: number;
  readonly normalizedByteCount: number;
  readonly normalizedContent: string;
  readonly contentDigest: string;
  readonly redaction: EvidenceRedactionResource;
}

export interface EvidenceSourceResource {
  readonly evidenceSourceId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly importKey: string;
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: "DIRECT_IMPORT";
  readonly epistemicLabel: EpistemicLabel;
  readonly prepared: PreparedEvidenceResource;
}

export interface EvidenceTimelineEventResource {
  readonly timelineEventId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly sequence: number;
  readonly eventType: "EVIDENCE_IMPORTED";
  readonly evidenceSourceId: string;
  readonly occurredAtUtc: string;
}

export interface ClaimApplicabilityDimensionResource {
  readonly dimension: string;
  readonly value: string;
}

export interface ClaimApplicabilityResource {
  readonly dimensions: readonly ClaimApplicabilityDimensionResource[];
  readonly effectiveFromUtc?: string;
  readonly effectiveUntilUtc?: string;
}

export interface ClaimResource {
  readonly claimId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly evidenceSourceId: string;
  readonly importKey: string;
  readonly claimDigest: string;
  readonly normalizationVersion: string;
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly sourceContentDigest: string;
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: "MANUAL_STRUCTURED_INTAKE";
  readonly epistemicLabel: EpistemicLabel;
  readonly rawText: string;
  readonly subject: string;
  readonly predicate: string;
  readonly comparisonKey: string;
  readonly value: JsonValue;
  readonly applicability: ClaimApplicabilityResource;
  readonly applicabilityKey: string;
  readonly supersedesClaimId?: string;
}

export interface ClaimSupersessionResource {
  readonly claimSupersessionId: string;
  readonly relationshipType: "SUPERSEDES";
  readonly projectId: string;
  readonly missionId: string;
  readonly predecessorClaimId: string;
  readonly successorClaimId: string;
  readonly evidenceSourceId: string;
  readonly comparisonKey: string;
  readonly applicabilityKey: string;
  readonly origin: OriginKind;
  readonly sourceLocator: string;
  readonly sourceRevision?: string;
  readonly sourceContentDigest: string;
  readonly recordedAtUtc: string;
  readonly effectiveAtUtc?: string;
  readonly extractionMethod: "MANUAL_STRUCTURED_INTAKE";
  readonly epistemicLabel: EpistemicLabel;
  readonly linkDigest: string;
}

export interface RuntimeObservationMeasurementResource {
  readonly name: string;
  readonly unit: RuntimeObservationUnit;
  readonly value: number;
}

export interface RuntimeObservationSummaryResource {
  readonly schemaVersion: "runtime-observation-summary.v1";
  readonly subject: string;
  readonly environment: RuntimeObservationEnvironment;
  readonly observationKind: string;
  readonly observedFromUtc: string;
  readonly observedUntilUtc: string;
  readonly sampleCount: number;
  readonly measurements: readonly RuntimeObservationMeasurementResource[];
}

export interface RuntimeObservationResource {
  readonly runtimeObservationId: string;
  readonly projectId: string;
  readonly missionId: string;
  readonly evidenceSourceId: string;
  readonly seriesKey: string;
  readonly summaryDigest: string;
  readonly recordedAtUtc: string;
  readonly freshness: RuntimeObservationFreshness;
  readonly newerObservationId?: string;
  readonly authority: "HISTORICAL_EVIDENCE_ONLY";
  readonly liveFeed: false;
  readonly summary: RuntimeObservationSummaryResource;
}

export interface EvidencePreviewResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly preview: PreparedEvidenceResource;
}

export interface EvidenceSourceResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly created: boolean;
  readonly evidenceSource: EvidenceSourceResource;
  readonly timelineEvent: EvidenceTimelineEventResource;
}

export interface EvidenceSourceGetResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly evidenceSource: EvidenceSourceResource;
}

export interface EvidenceSourceListResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly missionId: string;
  readonly evidenceSources: readonly EvidenceSourceResource[];
  readonly page: PageMetadata;
}

export interface EvidenceTimelineResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly missionId: string;
  readonly timelineEvents: readonly EvidenceTimelineEventResource[];
  readonly page: {
    readonly limit: number;
    readonly nextCursor: number | null;
  };
}

export interface ClaimResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly created: boolean;
  readonly claim: ClaimResource;
  readonly supersession?: ClaimSupersessionResource;
}

export interface ClaimGetResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly claim: ClaimResource;
}

export interface ClaimListResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly missionId: string;
  readonly claims: readonly ClaimResource[];
  readonly page: PageMetadata;
}

export interface ClaimSupersessionListResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly missionId: string;
  readonly supersessions: readonly ClaimSupersessionResource[];
  readonly page: PageMetadata;
}

export interface RuntimeObservationResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly created: boolean;
  readonly runtimeObservation: RuntimeObservationResource;
  readonly evidenceSource: EvidenceSourceResource;
  readonly timelineEvent: EvidenceTimelineEventResource;
}

export interface RuntimeObservationGetResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly runtimeObservation: RuntimeObservationResource;
  readonly evidenceSource: EvidenceSourceResource;
}

export interface RuntimeObservationListResponse {
  readonly apiVersion: typeof EVIDENCE_API_VERSION;
  readonly missionId: string;
  readonly runtimeObservations: readonly RuntimeObservationResource[];
  readonly page: PageMetadata;
}

export function toPreparedEvidenceResource(
  prepared: PreparedEvidenceImport
): PreparedEvidenceResource {
  return {
    normalizationVersion: prepared.normalizationVersion,
    format: prepared.format,
    inputByteCount: prepared.inputByteCount,
    normalizedByteCount: prepared.normalizedByteCount,
    normalizedContent: prepared.normalizedContent,
    contentDigest: prepared.contentDigest,
    redaction: {
      applied: prepared.redaction.applied,
      totalReplacements: prepared.redaction.totalReplacements,
      ruleCounts: prepared.redaction.ruleCounts.map((entry) => ({
        rule: entry.rule,
        replacements: entry.replacements
      }))
    }
  };
}

export function toEvidenceSourceResource(
  source: EvidenceSource
): EvidenceSourceResource {
  return {
    evidenceSourceId: source.evidenceSourceId,
    projectId: source.projectId,
    missionId: source.missionId,
    importKey: source.importKey,
    origin: source.origin,
    sourceLocator: source.sourceLocator,
    ...(source.sourceRevision === undefined
      ? {}
      : { sourceRevision: source.sourceRevision }),
    recordedAtUtc: source.recordedAtUtc,
    ...(source.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: source.effectiveAtUtc }),
    extractionMethod: source.extractionMethod,
    epistemicLabel: source.epistemicLabel,
    prepared: toPreparedEvidenceResource(source.prepared)
  };
}

export function toEvidenceTimelineEventResource(
  event: EvidenceTimelineEvent
): EvidenceTimelineEventResource {
  return {
    timelineEventId: event.timelineEventId,
    projectId: event.projectId,
    missionId: event.missionId,
    sequence: event.sequence,
    eventType: event.eventType,
    evidenceSourceId: event.evidenceSourceId,
    occurredAtUtc: event.occurredAtUtc
  };
}

export function toClaimResource(claim: Claim): ClaimResource {
  return {
    claimId: claim.claimId,
    projectId: claim.projectId,
    missionId: claim.missionId,
    evidenceSourceId: claim.evidenceSourceId,
    importKey: claim.importKey,
    claimDigest: claim.claimDigest,
    normalizationVersion: claim.normalizationVersion,
    origin: claim.origin,
    sourceLocator: claim.sourceLocator,
    ...(claim.sourceRevision === undefined
      ? {}
      : { sourceRevision: claim.sourceRevision }),
    sourceContentDigest: claim.sourceContentDigest,
    recordedAtUtc: claim.recordedAtUtc,
    ...(claim.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: claim.effectiveAtUtc }),
    extractionMethod: claim.extractionMethod,
    epistemicLabel: claim.epistemicLabel,
    rawText: claim.rawText,
    subject: claim.subject,
    predicate: claim.predicate,
    comparisonKey: claim.comparisonKey,
    value: claim.value,
    applicability: {
      dimensions: claim.applicability.dimensions.map((entry) => ({
        dimension: entry.dimension,
        value: entry.value
      })),
      ...(claim.applicability.effectiveFromUtc === undefined
        ? {}
        : { effectiveFromUtc: claim.applicability.effectiveFromUtc }),
      ...(claim.applicability.effectiveUntilUtc === undefined
        ? {}
        : { effectiveUntilUtc: claim.applicability.effectiveUntilUtc })
    },
    applicabilityKey: claim.applicabilityKey,
    ...(claim.supersedesClaimId === undefined
      ? {}
      : { supersedesClaimId: claim.supersedesClaimId })
  };
}

export function toClaimSupersessionResource(
  link: ClaimSupersession
): ClaimSupersessionResource {
  return {
    claimSupersessionId: link.claimSupersessionId,
    relationshipType: link.relationshipType,
    projectId: link.projectId,
    missionId: link.missionId,
    predecessorClaimId: link.predecessorClaimId,
    successorClaimId: link.successorClaimId,
    evidenceSourceId: link.evidenceSourceId,
    comparisonKey: link.comparisonKey,
    applicabilityKey: link.applicabilityKey,
    origin: link.origin,
    sourceLocator: link.sourceLocator,
    ...(link.sourceRevision === undefined
      ? {}
      : { sourceRevision: link.sourceRevision }),
    sourceContentDigest: link.sourceContentDigest,
    recordedAtUtc: link.recordedAtUtc,
    ...(link.effectiveAtUtc === undefined
      ? {}
      : { effectiveAtUtc: link.effectiveAtUtc }),
    extractionMethod: link.extractionMethod,
    epistemicLabel: link.epistemicLabel,
    linkDigest: link.linkDigest
  };
}

export function toRuntimeObservationResource(input: {
  readonly observation: RuntimeObservation;
  readonly freshness: RuntimeObservationFreshness;
  readonly newerObservationId?: RuntimeObservationId;
}): RuntimeObservationResource {
  const observation = input.observation;
  return {
    runtimeObservationId: observation.runtimeObservationId,
    projectId: observation.projectId,
    missionId: observation.missionId,
    evidenceSourceId: observation.evidenceSourceId,
    seriesKey: observation.seriesKey,
    summaryDigest: observation.summaryDigest,
    recordedAtUtc: observation.recordedAtUtc,
    freshness: input.freshness,
    ...(input.newerObservationId === undefined
      ? {}
      : { newerObservationId: input.newerObservationId }),
    authority: "HISTORICAL_EVIDENCE_ONLY",
    liveFeed: false,
    summary: {
      schemaVersion: observation.summary.schemaVersion,
      subject: observation.summary.subject,
      environment: observation.summary.environment,
      observationKind: observation.summary.observationKind,
      observedFromUtc: observation.summary.observedFromUtc,
      observedUntilUtc: observation.summary.observedUntilUtc,
      sampleCount: observation.summary.sampleCount,
      measurements: observation.summary.measurements.map((measurement) => ({
        name: measurement.name,
        unit: measurement.unit,
        value: measurement.value
      }))
    }
  };
}

export function createEvidencePreviewResponse(
  prepared: PreparedEvidenceImport
): EvidencePreviewResponse {
  return {
    apiVersion: EVIDENCE_API_VERSION,
    preview: toPreparedEvidenceResource(prepared)
  };
}

export function createEvidenceSourceResponse(input: {
  readonly created: boolean;
  readonly source: EvidenceSource;
  readonly timelineEvent: EvidenceTimelineEvent;
}): EvidenceSourceResponse {
  return {
    apiVersion: EVIDENCE_API_VERSION,
    created: input.created,
    evidenceSource: toEvidenceSourceResource(input.source),
    timelineEvent: toEvidenceTimelineEventResource(input.timelineEvent)
  };
}

export function createClaimResponse(input: {
  readonly created: boolean;
  readonly claim: Claim;
  readonly supersession?: ClaimSupersession;
}): ClaimResponse {
  return {
    apiVersion: EVIDENCE_API_VERSION,
    created: input.created,
    claim: toClaimResource(input.claim),
    ...(input.supersession === undefined
      ? {}
      : { supersession: toClaimSupersessionResource(input.supersession) })
  };
}

export function createRuntimeObservationResponse(input: {
  readonly created: boolean;
  readonly observation: RuntimeObservation;
  readonly freshness: RuntimeObservationFreshness;
  readonly newerObservationId?: RuntimeObservationId;
  readonly source: EvidenceSource;
  readonly timelineEvent: EvidenceTimelineEvent;
}): RuntimeObservationResponse {
  return {
    apiVersion: EVIDENCE_API_VERSION,
    created: input.created,
    runtimeObservation: toRuntimeObservationResource(input),
    evidenceSource: toEvidenceSourceResource(input.source),
    timelineEvent: toEvidenceTimelineEventResource(input.timelineEvent)
  };
}
