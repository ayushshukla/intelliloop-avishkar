import { canonicalJsonDigest, type Sha256Digest } from "./digest.js";
import { MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND } from "./evidence-pack.js";
import { OFFLINE_EXPLANATION_QUESTIONS } from "./offline-explanation.js";

export const OPENAI_EVALUATION_CHECKPOINT_VERSION =
  "openai-evaluation-checkpoint.v1" as const;
export const OPENAI_EVALUATION_CHECKPOINT_DIGEST_VERSION =
  "openai-evaluation-checkpoint-digest.v1" as const;

export const OPENAI_EVALUATION_DECISIONS = Object.freeze([
  "USE_LIVE_PROVIDER_IN_FINALE",
  "CORRECT_PROMPT_OR_EVIDENCE_PACK_AND_RETEST",
  "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE"
] as const);

export const OPENAI_EVALUATION_CHECKPOINT_ERROR_CODES = Object.freeze([
  "OPENAI_EVALUATION_CHECKPOINT_INPUT_INVALID",
  "OPENAI_EVALUATION_CHECKPOINT_ENTRY_NOT_MET",
  "OPENAI_EVALUATION_CHECKPOINT_INTEGRITY_INVALID"
] as const);

export type OpenAiEvaluationDecision =
  (typeof OPENAI_EVALUATION_DECISIONS)[number];
export type OpenAiEvaluationCheckpointErrorCode =
  (typeof OPENAI_EVALUATION_CHECKPOINT_ERROR_CODES)[number];

const FIXED_QUESTIONS = Object.freeze(
  OFFLINE_EXPLANATION_QUESTIONS.map(({ question }) => question)
);

const ENTRY_CHECK_IDS = Object.freeze([
  "G3_DETERMINISTIC_CORE_PROVEN",
  "RECONCILIATION_EVIDENCE_PASS",
  "CITATION_EVIDENCE_PASS",
  "PRIVACY_EVIDENCE_PASS",
  "FIXED_QUESTION_SET_VERIFIED",
  "EXACT_REDACTED_PREVIEW_AVAILABLE",
  "TRANSFER_REMAINS_NOT_SENT",
  "PACK_WITHIN_FROZEN_LIMIT",
  "PRODUCTION_PROVIDER_DISABLED",
  "RUNTIME_ONLY_CREDENTIAL_POLICY"
] as const);

const ERROR_MESSAGES: Readonly<
  Record<OpenAiEvaluationCheckpointErrorCode, string>
> = Object.freeze({
  OPENAI_EVALUATION_CHECKPOINT_INPUT_INVALID:
    "OpenAI evaluation checkpoint input is invalid.",
  OPENAI_EVALUATION_CHECKPOINT_ENTRY_NOT_MET:
    "OpenAI evaluation checkpoint entry criteria are not met.",
  OPENAI_EVALUATION_CHECKPOINT_INTEGRITY_INVALID:
    "OpenAI evaluation checkpoint integrity is invalid."
});

export class OpenAiEvaluationCheckpointError extends Error {
  readonly code: OpenAiEvaluationCheckpointErrorCode;

  constructor(code: OpenAiEvaluationCheckpointErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "OpenAiEvaluationCheckpointError";
    this.code = code;
  }
}

export interface CreateOfflineOpenAiEvaluationCheckpointInput {
  readonly g3Status: "PASS";
  readonly reconciliationEvidenceStatus: "PASS";
  readonly citationEvidenceStatus: "PASS";
  readonly privacyEvidenceStatus: "PASS";
  readonly fixedQuestions: readonly string[];
  readonly expectedQuestionCount: number;
  readonly passedQuestionCount: number;
  readonly exactRedactedPackPreviewAvailable: true;
  readonly transferStatus: "NOT_SENT";
  readonly maximumInputTokenUpperBound: number;
  readonly productionProviderOutcome: "DISABLED";
}

export interface OpenAiEvaluationEntryCheck {
  readonly id: (typeof ENTRY_CHECK_IDS)[number];
  readonly status: "PASS";
}

export interface OpenAiEvaluationCheckpoint {
  readonly version: typeof OPENAI_EVALUATION_CHECKPOINT_VERSION;
  readonly digestVersion: typeof OPENAI_EVALUATION_CHECKPOINT_DIGEST_VERSION;
  readonly story: "IL-6.5";
  readonly gate: "G4_OPENAI_COURSE_CORRECTION";
  readonly mode: "OFFLINE_DECISION";
  readonly runStatus: "NOT_RUN_NOT_AUTHORIZED";
  readonly entryChecklist: readonly OpenAiEvaluationEntryCheck[];
  readonly baseline: {
    readonly fixedQuestions: readonly string[];
    readonly expectedQuestionCount: 6;
    readonly passedQuestionCount: 6;
    readonly transferStatus: "NOT_SENT";
    readonly exactRedactedPackPreviewAvailable: true;
    readonly maximumInputTokenUpperBound: number;
    readonly frozenInputTokenUpperBound: typeof MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND;
    readonly productionProviderOutcome: "DISABLED";
  };
  readonly credentialBoundary: {
    readonly requiredOnlyForLiveBranch: true;
    readonly explicitUserEnablement: false;
    readonly runtimeCredentialInjected: false;
    readonly runtimeCredentialRead: false;
    readonly credentialPersisted: false;
    readonly credentialLogged: false;
  };
  readonly providerMetrics: {
    readonly grounding: "NOT_MEASURED";
    readonly citationValidity: "NOT_MEASURED";
    readonly usefulness: "NOT_MEASURED";
    readonly latencyMs: null;
    readonly inputTokens: null;
    readonly outputTokens: null;
    readonly differenceFromDeterministicExplanation: "NOT_MEASURED";
  };
  readonly allowedDecisions: readonly OpenAiEvaluationDecision[];
  readonly decision: "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE";
  readonly authority: {
    readonly externalCallMade: false;
    readonly canonicalStateChanged: false;
    readonly findingMutationAvailable: false;
    readonly readinessAuthority: false;
    readonly releasePassportAuthority: false;
  };
  readonly checkpointDigest: Sha256Digest;
}

type CheckpointWithoutDigest = Omit<OpenAiEvaluationCheckpoint, "checkpointDigest">;

function fail(code: OpenAiEvaluationCheckpointErrorCode): never {
  throw new OpenAiEvaluationCheckpointError(code);
}

function exactQuestions(values: readonly string[]): boolean {
  return (
    values.length === FIXED_QUESTIONS.length &&
    values.every((value, index) => value === FIXED_QUESTIONS[index])
  );
}

function checkpointBody(
  checkpoint: OpenAiEvaluationCheckpoint
): CheckpointWithoutDigest {
  return {
    version: checkpoint.version,
    digestVersion: checkpoint.digestVersion,
    story: checkpoint.story,
    gate: checkpoint.gate,
    mode: checkpoint.mode,
    runStatus: checkpoint.runStatus,
    entryChecklist: checkpoint.entryChecklist,
    baseline: checkpoint.baseline,
    credentialBoundary: checkpoint.credentialBoundary,
    providerMetrics: checkpoint.providerMetrics,
    allowedDecisions: checkpoint.allowedDecisions,
    decision: checkpoint.decision,
    authority: checkpoint.authority
  };
}

async function digestCheckpoint(
  body: CheckpointWithoutDigest
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    digestVersion: OPENAI_EVALUATION_CHECKPOINT_DIGEST_VERSION,
    checkpoint: body
  });
}

export async function createOfflineOpenAiEvaluationCheckpoint(
  input: CreateOfflineOpenAiEvaluationCheckpointInput
): Promise<OpenAiEvaluationCheckpoint> {
  if (
    input === null ||
    typeof input !== "object" ||
    !Array.isArray(input.fixedQuestions) ||
    input.fixedQuestions.some((question) => typeof question !== "string") ||
    !Number.isSafeInteger(input.maximumInputTokenUpperBound) ||
    input.maximumInputTokenUpperBound < 1
  ) {
    return fail("OPENAI_EVALUATION_CHECKPOINT_INPUT_INVALID");
  }

  if (
    input.g3Status !== "PASS" ||
    input.reconciliationEvidenceStatus !== "PASS" ||
    input.citationEvidenceStatus !== "PASS" ||
    input.privacyEvidenceStatus !== "PASS" ||
    !exactQuestions(input.fixedQuestions) ||
    input.expectedQuestionCount !== FIXED_QUESTIONS.length ||
    input.passedQuestionCount !== FIXED_QUESTIONS.length ||
    input.exactRedactedPackPreviewAvailable !== true ||
    input.transferStatus !== "NOT_SENT" ||
    input.maximumInputTokenUpperBound >
      MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND ||
    input.productionProviderOutcome !== "DISABLED"
  ) {
    return fail("OPENAI_EVALUATION_CHECKPOINT_ENTRY_NOT_MET");
  }

  const body: CheckpointWithoutDigest = {
    version: OPENAI_EVALUATION_CHECKPOINT_VERSION,
    digestVersion: OPENAI_EVALUATION_CHECKPOINT_DIGEST_VERSION,
    story: "IL-6.5",
    gate: "G4_OPENAI_COURSE_CORRECTION",
    mode: "OFFLINE_DECISION",
    runStatus: "NOT_RUN_NOT_AUTHORIZED",
    entryChecklist: Object.freeze(
      ENTRY_CHECK_IDS.map((id) => Object.freeze({ id, status: "PASS" as const }))
    ),
    baseline: Object.freeze({
      fixedQuestions: Object.freeze([...FIXED_QUESTIONS]),
      expectedQuestionCount: 6,
      passedQuestionCount: 6,
      transferStatus: "NOT_SENT",
      exactRedactedPackPreviewAvailable: true,
      maximumInputTokenUpperBound: input.maximumInputTokenUpperBound,
      frozenInputTokenUpperBound:
        MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND,
      productionProviderOutcome: "DISABLED"
    }),
    credentialBoundary: Object.freeze({
      requiredOnlyForLiveBranch: true,
      explicitUserEnablement: false,
      runtimeCredentialInjected: false,
      runtimeCredentialRead: false,
      credentialPersisted: false,
      credentialLogged: false
    }),
    providerMetrics: Object.freeze({
      grounding: "NOT_MEASURED",
      citationValidity: "NOT_MEASURED",
      usefulness: "NOT_MEASURED",
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      differenceFromDeterministicExplanation: "NOT_MEASURED"
    }),
    allowedDecisions: OPENAI_EVALUATION_DECISIONS,
    decision: "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
    authority: Object.freeze({
      externalCallMade: false,
      canonicalStateChanged: false,
      findingMutationAvailable: false,
      readinessAuthority: false,
      releasePassportAuthority: false
    })
  };

  const checkpoint = Object.freeze({
    ...body,
    checkpointDigest: await digestCheckpoint(body)
  });
  await assertOpenAiEvaluationCheckpointInvariant(checkpoint);
  return checkpoint;
}

export async function assertOpenAiEvaluationCheckpointInvariant(
  checkpoint: OpenAiEvaluationCheckpoint
): Promise<void> {
  if (
    checkpoint.version !== OPENAI_EVALUATION_CHECKPOINT_VERSION ||
    checkpoint.digestVersion !== OPENAI_EVALUATION_CHECKPOINT_DIGEST_VERSION ||
    checkpoint.story !== "IL-6.5" ||
    checkpoint.gate !== "G4_OPENAI_COURSE_CORRECTION" ||
    checkpoint.mode !== "OFFLINE_DECISION" ||
    checkpoint.runStatus !== "NOT_RUN_NOT_AUTHORIZED" ||
    checkpoint.entryChecklist.length !== ENTRY_CHECK_IDS.length ||
    checkpoint.entryChecklist.some(
      (entry, index) =>
        entry.id !== ENTRY_CHECK_IDS[index] || entry.status !== "PASS"
    ) ||
    !exactQuestions(checkpoint.baseline.fixedQuestions) ||
    checkpoint.baseline.expectedQuestionCount !== 6 ||
    checkpoint.baseline.passedQuestionCount !== 6 ||
    checkpoint.baseline.transferStatus !== "NOT_SENT" ||
    checkpoint.baseline.exactRedactedPackPreviewAvailable !== true ||
    checkpoint.baseline.maximumInputTokenUpperBound < 1 ||
    checkpoint.baseline.maximumInputTokenUpperBound >
      MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND ||
    checkpoint.baseline.frozenInputTokenUpperBound !==
      MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND ||
    checkpoint.baseline.productionProviderOutcome !== "DISABLED" ||
    checkpoint.credentialBoundary.requiredOnlyForLiveBranch !== true ||
    checkpoint.credentialBoundary.explicitUserEnablement !== false ||
    checkpoint.credentialBoundary.runtimeCredentialInjected !== false ||
    checkpoint.credentialBoundary.runtimeCredentialRead !== false ||
    checkpoint.credentialBoundary.credentialPersisted !== false ||
    checkpoint.credentialBoundary.credentialLogged !== false ||
    checkpoint.providerMetrics.grounding !== "NOT_MEASURED" ||
    checkpoint.providerMetrics.citationValidity !== "NOT_MEASURED" ||
    checkpoint.providerMetrics.usefulness !== "NOT_MEASURED" ||
    checkpoint.providerMetrics.latencyMs !== null ||
    checkpoint.providerMetrics.inputTokens !== null ||
    checkpoint.providerMetrics.outputTokens !== null ||
    checkpoint.providerMetrics.differenceFromDeterministicExplanation !==
      "NOT_MEASURED" ||
    checkpoint.allowedDecisions.length !== OPENAI_EVALUATION_DECISIONS.length ||
    checkpoint.allowedDecisions.some(
      (decision, index) => decision !== OPENAI_EVALUATION_DECISIONS[index]
    ) ||
    checkpoint.decision !== "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE" ||
    checkpoint.authority.externalCallMade !== false ||
    checkpoint.authority.canonicalStateChanged !== false ||
    checkpoint.authority.findingMutationAvailable !== false ||
    checkpoint.authority.readinessAuthority !== false ||
    checkpoint.authority.releasePassportAuthority !== false ||
    (await digestCheckpoint(checkpointBody(checkpoint))) !==
      checkpoint.checkpointDigest
  ) {
    return fail("OPENAI_EVALUATION_CHECKPOINT_INTEGRITY_INVALID");
  }
}
