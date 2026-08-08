import type {
  EvidencePackItemKind,
  OfflineExplanation,
  ProviderAdapterFailureCode,
  Sha256Digest,
  SyntheticEdgeCaseSet,
  TransferRedactionSummary,
  ValidatedProviderAdvisoryResponse
} from "@intelliloop/domain";

export const CITED_EXPLANATION_API_VERSION = "v2" as const;
export const CITED_EXPLANATION_DISCLOSURE_VERSION =
  "cited-explanation-disclosure.v1" as const;

export const CITED_EXPLANATION_QUESTIONS = Object.freeze([
  "Can we release?",
  "What conflicts are open?",
  "What is impacted?",
  "What validation is missing?",
  "What should happen next?",
  "What changed after correction?"
] as const);

export const CITED_EXPLANATION_PROVIDER_OUTCOMES = Object.freeze([
  "DISABLED",
  "ADVISORY_ACCEPTED",
  "ADVISORY_UNAVAILABLE",
  "ADVISORY_REJECTED"
] as const);

export type CitedExplanationQuestion =
  (typeof CITED_EXPLANATION_QUESTIONS)[number];
export type CitedExplanationProviderOutcome =
  (typeof CITED_EXPLANATION_PROVIDER_OUTCOMES)[number];

export interface CreateCitedExplanationRequest {
  readonly question: CitedExplanationQuestion;
}

export interface CitedExplanationExecutionResource {
  readonly primaryExplanation: "DETERMINISTIC_EXPLANATION";
  readonly externalAiStatus: "OFF";
  readonly providerOutcome: CitedExplanationProviderOutcome;
  readonly externalCallMade: false;
  readonly canonicalStateChanged: false;
  readonly authority: "ADVISORY_ONLY_NO_RELEASE_DECISION";
  readonly failureCode?: ProviderAdapterFailureCode;
}

export interface CitedExplanationDisclosureResource {
  readonly disclosureVersion: typeof CITED_EXPLANATION_DISCLOSURE_VERSION;
  readonly transferStatus: "NOT_SENT";
  readonly evidencePackDigest: Sha256Digest;
  readonly questionDigest: Sha256Digest;
  readonly itemCount: number;
  readonly citationCount: number;
  readonly serializedBytes: number;
  readonly inputTokenUpperBound: number;
  readonly redaction: TransferRedactionSummary;
  readonly exactRedactedPackJson: string;
}

export interface CitedExplanationCitationResource {
  readonly citationId: string;
  readonly itemKind: EvidencePackItemKind;
  readonly itemKey: string;
  readonly itemDigest: Sha256Digest;
  readonly payloadJson: string;
}

export interface CitedExplanationResponse {
  readonly apiVersion: typeof CITED_EXPLANATION_API_VERSION;
  readonly missionId: string;
  readonly question: CitedExplanationQuestion;
  readonly execution: CitedExplanationExecutionResource;
  readonly disclosure: CitedExplanationDisclosureResource;
  readonly offlineExplanation: OfflineExplanation;
  readonly syntheticEdgeCases: SyntheticEdgeCaseSet;
  readonly citationDetails: readonly CitedExplanationCitationResource[];
  readonly advisory?: ValidatedProviderAdvisoryResponse;
}
