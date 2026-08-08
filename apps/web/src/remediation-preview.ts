import type { CitedExplanationResponse } from "@intelliloop/contracts";

export const REMEDIATION_PREVIEW_VERSION = "remediation-preview.v1" as const;
export const REMEDIATION_PROPOSAL_VERSION = "remediation-proposal.v1" as const;

const PRIVATE_PATH_PATTERN =
  /(?:\b[A-Za-z]:[\\/]|\\\\[^\\\s]+[\\/][^\\\s]+|\/(?:Users|home|private|var\/folders|tmp)\/)/u;
const EXECUTION_PATTERN =
  /\b(?:git\s+(?:commit|push|reset|checkout)|rm\s+-rf|powershell|cmd\.exe|bash|deploy(?:ment)?|execute\s+(?:the\s+)?(?:command|script)|apply\s+(?:the\s+)?patch)\b/iu;
const CITATION_PATTERN = /^cite:[0-9a-f]{64}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MAX_PROPOSALS = 8;
const MAX_TEXT_BYTES = 2_048;

export type RemediationPreviewMode = "TEST_PLAN" | "PATCH_INTENT";

export interface RemediationProposal {
  readonly proposalVersion: typeof REMEDIATION_PROPOSAL_VERSION;
  readonly proposalId: string;
  readonly kind: RemediationPreviewMode;
  readonly title: string;
  readonly rationale: string;
  readonly proposedSteps: readonly string[];
  readonly expectedObservation: string;
  readonly citationIds: readonly string[];
  readonly labels: readonly ["ADVISORY_ONLY", "NOT_EVIDENCE", "NOT_EXECUTED"];
}

export interface RemediationPreview {
  readonly version: typeof REMEDIATION_PREVIEW_VERSION;
  readonly missionId: string;
  readonly questionDigest: string;
  readonly evidencePackDigest: string;
  readonly mode: RemediationPreviewMode;
  readonly status: "PREVIEW_ONLY";
  readonly proposals: readonly RemediationProposal[];
  readonly authority: {
    readonly canonicalStateChanged: false;
    readonly repositoryWriteAvailable: false;
    readonly shellAvailable: false;
    readonly gitAvailable: false;
    readonly deploymentAvailable: false;
    readonly networkAvailable: false;
    readonly externalCallMade: false;
    readonly readinessAuthority: false;
    readonly releasePassportAuthority: false;
  };
  readonly limitations: readonly string[];
}

export class RemediationPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemediationPreviewError";
  }
}

function invalid(message: string): never {
  throw new RemediationPreviewError(message);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function safeText(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    byteLength(value) <= MAX_TEXT_BYTES &&
    !PRIVATE_PATH_PATTERN.test(value) &&
    !EXECUTION_PATTERN.test(value);
}

function proposalSources(
  response: CitedExplanationResponse,
  mode: RemediationPreviewMode
): readonly {
  readonly text: string;
  readonly expected: string;
  readonly citationIds: readonly string[];
  readonly sourceKind: string;
}[] {
  if (mode === "TEST_PLAN" && response.syntheticEdgeCases.suggestions.length > 0) {
    return response.syntheticEdgeCases.suggestions.slice(0, MAX_PROPOSALS).map(
      (suggestion) => ({
        text: suggestion.scenario,
        expected: suggestion.expectedObservation,
        citationIds: suggestion.citationIds,
        sourceKind: suggestion.kind.replaceAll("_", " ").toLocaleLowerCase("en-US")
      })
    );
  }
  const offline = response.offlineExplanation;
  const statements = [
    ...offline.nextActions,
    ...offline.gaps,
    ...offline.conflicts,
    offline.answer
  ];
  const unique: typeof statements = [];
  const seen = new Set<string>();
  for (const statement of statements) {
    const key = statement.text.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(statement);
    }
    if (unique.length === MAX_PROPOSALS) break;
  }
  return unique.map((statement) => ({
    text: statement.text,
    expected:
      mode === "TEST_PLAN"
        ? "Record the observed result against the cited boundary before any readiness review."
        : "A human reviewer confirms whether the proposed intent is appropriate before any separate authorized implementation.",
    citationIds: statement.citationIds,
    sourceKind: statement.category.replaceAll("_", " ").toLocaleLowerCase("en-US")
  }));
}

function stepsFor(
  mode: RemediationPreviewMode,
  sourceKind: string
): readonly string[] {
  return mode === "TEST_PLAN"
    ? Object.freeze([
        `Prepare a disposable controlled fixture for the cited ${sourceKind} boundary.`,
        "Exercise only the cited condition and record actual versus expected behavior.",
        "Import a real validation result through the authorized evidence workflow only after human review."
      ])
    : Object.freeze([
        `Review the cited ${sourceKind} boundary and identify the smallest intended change.`,
        "Draft the change separately without applying it to the registered repository.",
        "Require human review and independent validation before any authorized implementation workflow."
      ]);
}

export function validateRemediationPreview(
  preview: RemediationPreview,
  response: CitedExplanationResponse
): void {
  const allowed = new Set(
    response.citationDetails.map((citation) => citation.citationId)
  );
  if (
    preview.version !== REMEDIATION_PREVIEW_VERSION ||
    preview.missionId !== response.missionId ||
    preview.questionDigest !== response.disclosure.questionDigest ||
    preview.evidencePackDigest !== response.disclosure.evidencePackDigest ||
    !UUID_PATTERN.test(preview.missionId) ||
    !DIGEST_PATTERN.test(preview.questionDigest) ||
    !DIGEST_PATTERN.test(preview.evidencePackDigest) ||
    !["TEST_PLAN", "PATCH_INTENT"].includes(preview.mode) ||
    preview.status !== "PREVIEW_ONLY" ||
    preview.proposals.length < 1 ||
    preview.proposals.length > MAX_PROPOSALS
  ) {
    return invalid("Remediation preview scope or bounded structure is invalid.");
  }
  if (
    !preview.authority ||
    Object.values(preview.authority).some((value) => value !== false)
  ) {
    return invalid("Remediation preview attempted to acquire execution or release authority.");
  }
  if (
    preview.limitations.length < 2 ||
    !preview.limitations.every(safeText) ||
    new Set(preview.proposals.map((proposal) => proposal.proposalId)).size !==
      preview.proposals.length
  ) {
    return invalid("Remediation preview limitations or proposal identities are invalid.");
  }
  for (const proposal of preview.proposals) {
    if (
      proposal.proposalVersion !== REMEDIATION_PROPOSAL_VERSION ||
      proposal.kind !== preview.mode ||
      !/^preview:(?:test-plan|patch-intent):[1-8]$/u.test(proposal.proposalId) ||
      !safeText(proposal.title) ||
      !safeText(proposal.rationale) ||
      !safeText(proposal.expectedObservation) ||
      proposal.proposedSteps.length !== 3 ||
      !proposal.proposedSteps.every(safeText) ||
      proposal.labels.join("|") !==
        "ADVISORY_ONLY|NOT_EVIDENCE|NOT_EXECUTED" ||
      proposal.citationIds.length < 1 ||
      proposal.citationIds.length > 16 ||
      new Set(proposal.citationIds).size !== proposal.citationIds.length ||
      !proposal.citationIds.every(
        (citationId) =>
          CITATION_PATTERN.test(citationId) && allowed.has(citationId)
      )
    ) {
      return invalid("Remediation proposal text, labels, or citations are invalid.");
    }
  }
}

export function createRemediationPreview(
  response: CitedExplanationResponse,
  mode: RemediationPreviewMode
): RemediationPreview {
  const sources = proposalSources(response, mode);
  if (sources.length === 0) {
    return invalid("The cited explanation contains no source for a remediation preview.");
  }
  const proposals = Object.freeze(
    sources.map((source, index): RemediationProposal =>
      Object.freeze({
        proposalVersion: REMEDIATION_PROPOSAL_VERSION,
        proposalId: `preview:${mode.toLocaleLowerCase("en-US").replace("_", "-")}:${index + 1}`,
        kind: mode,
        title:
          mode === "TEST_PLAN"
            ? `Proposed controlled test ${index + 1}`
            : `Proposed change intent ${index + 1}`,
        rationale: source.text,
        proposedSteps: stepsFor(mode, source.sourceKind),
        expectedObservation: source.expected,
        citationIds: Object.freeze([...source.citationIds]),
        labels: Object.freeze([
          "ADVISORY_ONLY",
          "NOT_EVIDENCE",
          "NOT_EXECUTED"
        ]) as RemediationProposal["labels"]
      })
    )
  );
  const preview = Object.freeze({
    version: REMEDIATION_PREVIEW_VERSION,
    missionId: response.missionId,
    questionDigest: response.disclosure.questionDigest,
    evidencePackDigest: response.disclosure.evidencePackDigest,
    mode,
    status: "PREVIEW_ONLY" as const,
    proposals,
    authority: Object.freeze({
      canonicalStateChanged: false as const,
      repositoryWriteAvailable: false as const,
      shellAvailable: false as const,
      gitAvailable: false as const,
      deploymentAvailable: false as const,
      networkAvailable: false as const,
      externalCallMade: false as const,
      readinessAuthority: false as const,
      releasePassportAuthority: false as const
    }),
    limitations: Object.freeze([
      "This is a cited advisory preview, not source code, evidence, validation, approval, or an applied change.",
      "Disposable execution is not implemented; a human must use a separately authorized workflow for any later implementation or validation."
    ])
  });
  validateRemediationPreview(preview, response);
  return preview;
}
