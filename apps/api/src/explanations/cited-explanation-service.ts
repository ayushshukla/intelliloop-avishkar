import {
  MAXIMUM_EVIDENCE_PACK_ITEMS,
  MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS,
  canonicalizeJson,
  compileEvidencePack,
  createSyntheticEdgeCaseSuggestions,
  evidencePackSerializedByteCount,
  evidencePackTokenUpperBound,
  parseStableId,
  type Claim,
  type ClaimId,
  type ClaimSupersession,
  type ClaimSupersessionId,
  type EvidenceSource,
  type EvidenceSourceId,
  type MissionId,
  type ProjectId,
  type ProviderAdapterFailureCode,
  type ProviderAdapterSession,
  type ReconciliationImpactRevision,
  type TwinProjectionRevision
} from "@intelliloop/domain";
import {
  CITED_EXPLANATION_API_VERSION,
  CITED_EXPLANATION_DISCLOSURE_VERSION,
  type CitedExplanationProviderOutcome,
  type CitedExplanationQuestion,
  type CitedExplanationResponse
} from "@intelliloop/contracts";

export const CITED_EXPLANATION_ERROR_CODES = [
  "CITED_EXPLANATION_INPUT_INVALID",
  "CITED_EXPLANATION_ASSESSMENT_UNAVAILABLE",
  "CITED_EXPLANATION_SOURCE_UNAVAILABLE",
  "CITED_EXPLANATION_LIMIT_EXCEEDED",
  "CITED_EXPLANATION_INTEGRITY_INVALID"
] as const;

export type CitedExplanationErrorCode =
  (typeof CITED_EXPLANATION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<CitedExplanationErrorCode, string>> =
  Object.freeze({
    CITED_EXPLANATION_INPUT_INVALID:
      "The cited-explanation request is invalid.",
    CITED_EXPLANATION_ASSESSMENT_UNAVAILABLE:
      "A persisted reconciliation assessment is required.",
    CITED_EXPLANATION_SOURCE_UNAVAILABLE:
      "An exact source bound by the selected assessment is unavailable.",
    CITED_EXPLANATION_LIMIT_EXCEEDED:
      "The cited-explanation source reconstruction exceeds a fixed limit.",
    CITED_EXPLANATION_INTEGRITY_INVALID:
      "The cited-explanation input failed integrity validation."
  });

export class CitedExplanationError extends Error {
  readonly code: CitedExplanationErrorCode;

  constructor(code: CitedExplanationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "CitedExplanationError";
    this.code = code;
  }
}

export interface CitedExplanationTwinPort {
  get(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<TwinProjectionRevision>;
}

export interface CitedExplanationEvidencePort {
  getEvidenceSource(
    projectId: ProjectId,
    missionId: MissionId,
    evidenceSourceId: EvidenceSourceId
  ): Promise<EvidenceSource>;
}

export interface CitedExplanationClaimPort {
  getClaim(
    projectId: ProjectId,
    missionId: MissionId,
    claimId: ClaimId
  ): Promise<Claim>;
  listSupersessions(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: ClaimSupersessionId
  ): Promise<{
    readonly items: readonly ClaimSupersession[];
    readonly nextCursor: ClaimSupersessionId | null;
  }>;
}

export interface CitedExplanationAssessmentPort {
  latest(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<ReconciliationImpactRevision | undefined>;
}

const PAGE_LIMIT = 100;
const REJECTED_RESPONSE_CODES = new Set<ProviderAdapterFailureCode>([
  "PROVIDER_RESPONSE_LIMIT_EXCEEDED",
  "PROVIDER_RESPONSE_SCHEMA_INVALID",
  "PROVIDER_REQUEST_ID_MISMATCH",
  "PROVIDER_PACK_DIGEST_MISMATCH",
  "PROVIDER_OUTPUT_SCHEMA_MISMATCH",
  "PROVIDER_CITATION_INVALID",
  "PROVIDER_RESPONSE_CONTENT_UNSAFE",
  "PROVIDER_READINESS_AUTHORITY_INVALID",
  "PROVIDER_USAGE_LIMIT_EXCEEDED"
]);

function fail(code: CitedExplanationErrorCode): never {
  throw new CitedExplanationError(code);
}

function providerOutcome(
  failureCode: ProviderAdapterFailureCode | undefined,
  hasAdvisory: boolean
): CitedExplanationProviderOutcome {
  if (hasAdvisory) return "ADVISORY_ACCEPTED";
  if (failureCode === "PROVIDER_DISABLED") return "DISABLED";
  if (failureCode !== undefined && REJECTED_RESPONSE_CODES.has(failureCode)) {
    return "ADVISORY_REJECTED";
  }
  return "ADVISORY_UNAVAILABLE";
}

async function exactSupersessions(
  claims: CitedExplanationClaimPort,
  projectId: ProjectId,
  missionId: MissionId,
  assessment: ReconciliationImpactRevision
): Promise<readonly ClaimSupersession[]> {
  const expectedIds = new Set(
    assessment.reassessment.dependencies.flatMap((dependency) =>
      dependency.dependencyKind === "RELATIONSHIP" &&
      dependency.dependencyKey.startsWith("twin-supersession:")
        ? [dependency.dependencyKey.slice("twin-supersession:".length)]
        : []
    )
  );
  if (expectedIds.size > MAXIMUM_EVIDENCE_PACK_ITEMS) {
    return fail("CITED_EXPLANATION_LIMIT_EXCEEDED");
  }
  if (expectedIds.size === 0) return Object.freeze([]);

  const values: ClaimSupersession[] = [];
  let cursor: ClaimSupersessionId | undefined;
  let inspected = 0;
  do {
    const page = await claims.listSupersessions(
      projectId,
      missionId,
      PAGE_LIMIT,
      cursor
    );
    inspected += page.items.length;
    if (inspected > MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS) {
      return fail("CITED_EXPLANATION_LIMIT_EXCEEDED");
    }
    for (const link of page.items) {
      if (expectedIds.has(link.claimSupersessionId)) values.push(link);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);

  if (
    values.length !== expectedIds.size ||
    new Set(values.map((value) => value.claimSupersessionId)).size !==
      expectedIds.size
  ) {
    return fail("CITED_EXPLANATION_SOURCE_UNAVAILABLE");
  }
  return Object.freeze(
    values.sort((left, right) =>
      left.claimSupersessionId.localeCompare(
        right.claimSupersessionId,
        "en-US"
      )
    )
  );
}

export class CitedExplanationService {
  readonly #twins: CitedExplanationTwinPort;
  readonly #evidence: CitedExplanationEvidencePort;
  readonly #claims: CitedExplanationClaimPort;
  readonly #assessments: CitedExplanationAssessmentPort;
  readonly #adapter: ProviderAdapterSession;

  constructor(input: {
    readonly twins: CitedExplanationTwinPort;
    readonly evidence: CitedExplanationEvidencePort;
    readonly claims: CitedExplanationClaimPort;
    readonly assessments: CitedExplanationAssessmentPort;
    readonly adapter: ProviderAdapterSession;
  }) {
    this.#twins = input.twins;
    this.#evidence = input.evidence;
    this.#claims = input.claims;
    this.#assessments = input.assessments;
    this.#adapter = input.adapter;
  }

  async execute(
    projectId: ProjectId,
    missionId: MissionId,
    question: CitedExplanationQuestion,
    requestId: string
  ): Promise<CitedExplanationResponse> {
    try {
      parseStableId<"PROJECT">(projectId);
      parseStableId<"MISSION">(missionId);
      parseStableId<"PROVIDER_REQUEST">(requestId);
      const assessment = await this.#assessments.latest(projectId, missionId);
      if (assessment === undefined) {
        return fail("CITED_EXPLANATION_ASSESSMENT_UNAVAILABLE");
      }
      const twin = await this.#twins.get(
        projectId,
        missionId,
        assessment.twinBinding.revision
      );
      const sourceBindings = twin.nodeSources.filter(
        (binding) => binding.sourceType === "EvidenceSource"
      );
      const claimBindings = twin.nodeSources.filter(
        (binding) => binding.sourceType === "Claim"
      );
      if (
        sourceBindings.length > MAXIMUM_EVIDENCE_PACK_ITEMS ||
        claimBindings.length > MAXIMUM_EVIDENCE_PACK_ITEMS
      ) {
        return fail("CITED_EXPLANATION_LIMIT_EXCEEDED");
      }
      const [evidenceSources, claims, claimSupersessions] = await Promise.all([
        Promise.all(
          sourceBindings.map((binding) =>
            this.#evidence.getEvidenceSource(
              projectId,
              missionId,
              parseStableId<"EVIDENCE_SOURCE">(binding.sourceId)
            )
          )
        ),
        Promise.all(
          claimBindings.map((binding) =>
            this.#claims.getClaim(
              projectId,
              missionId,
              parseStableId<"CLAIM">(binding.sourceId)
            )
          )
        ),
        exactSupersessions(
          this.#claims,
          projectId,
          missionId,
          assessment
        )
      ]);
      const pack = await compileEvidencePack({
        question,
        assessment,
        twin,
        evidenceSources,
        claims,
        claimSupersessions
      });
      const syntheticEdgeCases = await createSyntheticEdgeCaseSuggestions(pack);
      const adapterExecution = await this.#adapter.execute({
        requestId,
        evidencePack: pack
      });
      const advisory = adapterExecution.advisory;
      const failureCode = adapterExecution.failure?.code;
      const usedCitationIds = new Set([
        ...adapterExecution.offlineExplanation.citations.map(
          (citation) => citation.citationId
        ),
        ...syntheticEdgeCases.citations.map((citation) => citation.citationId),
        ...(advisory?.response.citations ?? [])
      ]);
      const citationDetails = pack.citations.flatMap((citation, index) => {
        if (!usedCitationIds.has(citation.citationId)) return [];
        const item = pack.items[index];
        if (item === undefined || item.itemDigest !== citation.itemDigest) {
          return fail("CITED_EXPLANATION_INTEGRITY_INVALID");
        }
        return [
          Object.freeze({
            citationId: citation.citationId,
            itemKind: item.itemKind,
            itemKey: item.itemKey,
            itemDigest: item.itemDigest,
            payloadJson: canonicalizeJson(item.payload)
          })
        ];
      });
      const exactRedactedPackJson = canonicalizeJson(pack);
      return Object.freeze({
        apiVersion: CITED_EXPLANATION_API_VERSION,
        missionId,
        question,
        execution: Object.freeze({
          primaryExplanation: "DETERMINISTIC_EXPLANATION" as const,
          externalAiStatus: "OFF" as const,
          providerOutcome: providerOutcome(failureCode, advisory !== undefined),
          externalCallMade: false as const,
          canonicalStateChanged: false as const,
          authority: "ADVISORY_ONLY_NO_RELEASE_DECISION" as const,
          ...(failureCode === undefined ? {} : { failureCode })
        }),
        disclosure: Object.freeze({
          disclosureVersion: CITED_EXPLANATION_DISCLOSURE_VERSION,
          transferStatus: "NOT_SENT" as const,
          evidencePackDigest: pack.packDigest,
          questionDigest: pack.questionDigest,
          itemCount: pack.items.length,
          citationCount: pack.citations.length,
          serializedBytes: evidencePackSerializedByteCount(pack),
          inputTokenUpperBound: evidencePackTokenUpperBound(pack),
          redaction: pack.redaction,
          exactRedactedPackJson
        }),
        offlineExplanation: adapterExecution.offlineExplanation,
        syntheticEdgeCases,
        citationDetails: Object.freeze(citationDetails),
        ...(advisory === undefined ? {} : { advisory })
      });
    } catch (error) {
      if (error instanceof CitedExplanationError) throw error;
      return fail("CITED_EXPLANATION_INTEGRITY_INVALID");
    }
  }
}
