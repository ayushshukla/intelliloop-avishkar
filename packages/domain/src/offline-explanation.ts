import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import {
  assertEvidencePackInvariant,
  parseEvidencePackCitationId,
  resolveEvidencePackCitation,
  type EvidencePack,
  type EvidencePackCitation,
  type EvidencePackCitationId,
  type EvidencePackItem
} from "./evidence-pack.js";
import type { MissionId, ProjectId } from "./project.js";

export const OFFLINE_EXPLANATION_VERSION = "offline-explanation.v1" as const;
export const OFFLINE_EXPLANATION_DIGEST_VERSION =
  "offline-explanation-digest.v1" as const;
export const OFFLINE_EXPLANATION_RENDERER_POLICY_VERSION =
  "offline-explanation-renderer-policy.v1" as const;
export const OFFLINE_EXPLANATION_STATEMENT_VERSION =
  "offline-explanation-statement.v1" as const;
export const OFFLINE_EXPLANATION_TYPE = "DETERMINISTIC_EXPLANATION" as const;
export const OFFLINE_EXPLANATION_AI_STATUS = "AI_OFF" as const;

export const MAXIMUM_OFFLINE_EXPLANATION_STATEMENTS = 256;
export const MAXIMUM_OFFLINE_EXPLANATION_STATEMENT_BYTES = 4_096;
export const MAXIMUM_OFFLINE_EXPLANATION_CITATIONS_PER_STATEMENT = 64;
export const MAXIMUM_OFFLINE_EXPLANATION_SERIALIZED_BYTES = 131_072;

export const OFFLINE_EXPLANATION_STATEMENT_CATEGORIES = [
  "ANSWER",
  "FACT",
  "INFERENCE",
  "CONFLICT",
  "GAP",
  "NEXT_ACTION"
] as const;

export const OFFLINE_EXPLANATION_QUESTIONS = Object.freeze([
  Object.freeze({ kind: "RELEASE", question: "Can we release?" }),
  Object.freeze({ kind: "CONFLICTS", question: "What conflicts are open?" }),
  Object.freeze({ kind: "IMPACT", question: "What is impacted?" }),
  Object.freeze({
    kind: "MISSING_VALIDATION",
    question: "What validation is missing?"
  }),
  Object.freeze({ kind: "NEXT_ACTIONS", question: "What should happen next?" }),
  Object.freeze({
    kind: "POST_CORRECTION",
    question: "What changed after correction?"
  })
] as const);

export const OFFLINE_EXPLANATION_ERROR_CODES = [
  "OFFLINE_EXPLANATION_INPUT_INVALID",
  "OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED",
  "OFFLINE_EXPLANATION_LIMIT_EXCEEDED",
  "OFFLINE_EXPLANATION_CITATION_INVALID",
  "OFFLINE_EXPLANATION_INTEGRITY_INVALID"
] as const;

export type OfflineExplanationStatementCategory =
  (typeof OFFLINE_EXPLANATION_STATEMENT_CATEGORIES)[number];
export type OfflineExplanationQuestionKind =
  (typeof OFFLINE_EXPLANATION_QUESTIONS)[number]["kind"];
export type OfflineExplanationErrorCode =
  (typeof OFFLINE_EXPLANATION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<OfflineExplanationErrorCode, string>> =
  Object.freeze({
    OFFLINE_EXPLANATION_INPUT_INVALID:
      "Offline explanation input is invalid.",
    OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED:
      "Offline explanation question is not supported.",
    OFFLINE_EXPLANATION_LIMIT_EXCEEDED:
      "Offline explanation limit is exceeded.",
    OFFLINE_EXPLANATION_CITATION_INVALID:
      "Offline explanation citation is invalid.",
    OFFLINE_EXPLANATION_INTEGRITY_INVALID:
      "Offline explanation integrity is invalid."
  });

export class OfflineExplanationError extends Error {
  readonly code: OfflineExplanationErrorCode;

  constructor(code: OfflineExplanationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "OfflineExplanationError";
    this.code = code;
  }
}

export interface OfflineExplanationStatement {
  readonly statementVersion: typeof OFFLINE_EXPLANATION_STATEMENT_VERSION;
  readonly category: OfflineExplanationStatementCategory;
  readonly text: string;
  readonly citationIds: readonly EvidencePackCitationId[];
  readonly statementId: Sha256Digest;
}

export interface OfflineExplanationEngine {
  readonly explanationType: typeof OFFLINE_EXPLANATION_TYPE;
  readonly aiStatus: typeof OFFLINE_EXPLANATION_AI_STATUS;
  readonly provider: "NONE";
  readonly externalCallMade: false;
}

export interface OfflineExplanation {
  readonly version: typeof OFFLINE_EXPLANATION_VERSION;
  readonly digestVersion: typeof OFFLINE_EXPLANATION_DIGEST_VERSION;
  readonly rendererPolicyVersion: typeof OFFLINE_EXPLANATION_RENDERER_POLICY_VERSION;
  readonly rendererPolicyDigest: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidencePackDigest: Sha256Digest;
  readonly questionDigest: Sha256Digest;
  readonly question: string;
  readonly questionKind: OfflineExplanationQuestionKind;
  readonly engine: OfflineExplanationEngine;
  readonly answer: OfflineExplanationStatement;
  readonly facts: readonly OfflineExplanationStatement[];
  readonly inferences: readonly OfflineExplanationStatement[];
  readonly conflicts: readonly OfflineExplanationStatement[];
  readonly gaps: readonly OfflineExplanationStatement[];
  readonly nextActions: readonly OfflineExplanationStatement[];
  readonly citations: readonly EvidencePackCitation[];
  readonly limitations: readonly string[];
  readonly explanationDigest: Sha256Digest;
}

interface MutableSections {
  readonly facts: OfflineExplanationStatement[];
  readonly inferences: OfflineExplanationStatement[];
  readonly conflicts: OfflineExplanationStatement[];
  readonly gaps: OfflineExplanationStatement[];
  readonly nextActions: OfflineExplanationStatement[];
}

interface FindingSummary {
  readonly findingKind: string;
  readonly reason?: string;
  readonly citationId: EvidencePackCitationId;
  readonly requirementSupportKind?: string;
}

const UTF8_ENCODER = new TextEncoder();
const LIMITATIONS = Object.freeze([
  "This deterministic explanation summarizes the cited evidence pack; it does not determine release readiness.",
  "Evidence labels and structurally valid citations do not establish truth, completeness or approval."
]);

function fail(code: OfflineExplanationErrorCode): never {
  throw new OfflineExplanationError(code);
}

function utf8Bytes(value: string): number {
  return UTF8_ENCODER.encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: JsonValue): Record<string, unknown> {
  if (!isRecord(value)) return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  return value;
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.length < 1) {
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value);
}

function requireStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
  return value;
}

function normalizedQuestion(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function parseOfflineExplanationQuestion(
  value: unknown
): OfflineExplanationQuestionKind {
  if (typeof value !== "string") {
    return fail("OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED");
  }
  const normalized = normalizedQuestion(value);
  const matched = OFFLINE_EXPLANATION_QUESTIONS.find(
    (entry) => normalizedQuestion(entry.question) === normalized
  );
  if (matched === undefined) {
    return fail("OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED");
  }
  return matched.kind;
}

async function rendererPolicyDigest(): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: OFFLINE_EXPLANATION_RENDERER_POLICY_VERSION,
    questions: OFFLINE_EXPLANATION_QUESTIONS,
    explanationType: OFFLINE_EXPLANATION_TYPE,
    aiStatus: OFFLINE_EXPLANATION_AI_STATUS,
    statementCategories: OFFLINE_EXPLANATION_STATEMENT_CATEGORIES,
    sourceAuthority: "EVIDENCE_PACK_ONLY",
    readinessAuthority: "NONE",
    limits: {
      statements: MAXIMUM_OFFLINE_EXPLANATION_STATEMENTS,
      statementBytes: MAXIMUM_OFFLINE_EXPLANATION_STATEMENT_BYTES,
      citationsPerStatement:
        MAXIMUM_OFFLINE_EXPLANATION_CITATIONS_PER_STATEMENT,
      serializedBytes: MAXIMUM_OFFLINE_EXPLANATION_SERIALIZED_BYTES
    }
  });
}

function citationForItem(
  pack: EvidencePack,
  item: EvidencePackItem
): EvidencePackCitation {
  const index = pack.items.indexOf(item);
  const citation = pack.citations[index];
  if (index < 0 || citation === undefined || citation.itemDigest !== item.itemDigest) {
    return fail("OFFLINE_EXPLANATION_CITATION_INVALID");
  }
  return citation;
}

function orderedCitationIds(
  pack: EvidencePack,
  values: readonly EvidencePackCitationId[]
): readonly EvidencePackCitationId[] {
  const requested = new Set(values);
  const ordered = pack.allowedCitationIds.filter((value) => requested.has(value));
  if (ordered.length !== requested.size || ordered.length < 1) {
    return fail("OFFLINE_EXPLANATION_CITATION_INVALID");
  }
  if (ordered.length > MAXIMUM_OFFLINE_EXPLANATION_CITATIONS_PER_STATEMENT) {
    return fail("OFFLINE_EXPLANATION_LIMIT_EXCEEDED");
  }
  return Object.freeze(ordered);
}

async function statement(
  pack: EvidencePack,
  category: OfflineExplanationStatementCategory,
  text: string,
  citationIds: readonly EvidencePackCitationId[]
): Promise<OfflineExplanationStatement> {
  const normalizedText = text.replace(/\s+/gu, " ").trim().normalize("NFC");
  if (
    normalizedText.length < 1 ||
    utf8Bytes(normalizedText) > MAXIMUM_OFFLINE_EXPLANATION_STATEMENT_BYTES
  ) {
    return fail("OFFLINE_EXPLANATION_LIMIT_EXCEEDED");
  }
  const ordered = orderedCitationIds(pack, citationIds);
  const withoutId = Object.freeze({
    statementVersion: OFFLINE_EXPLANATION_STATEMENT_VERSION,
    category,
    text: normalizedText,
    citationIds: ordered
  });
  return Object.freeze({
    ...withoutId,
    statementId: await canonicalJsonDigest(withoutId)
  });
}

function claimItemById(
  pack: EvidencePack,
  claimId: string
): EvidencePackItem | undefined {
  return pack.items.find(
    (item) => item.itemKind === "CLAIM" && item.itemKey === `claim:${claimId}`
  );
}

function impactPathItemByKey(
  pack: EvidencePack,
  pathKey: string
): EvidencePackItem | undefined {
  return pack.items.find(
    (item) =>
      item.itemKind === "IMPACT_PATH" && item.itemKey === `impact-path:${pathKey}`
  );
}

function valueCountText(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

async function addClaimStatement(
  pack: EvidencePack,
  item: EvidencePackItem,
  sections: MutableSections,
  superseded: boolean
): Promise<void> {
  const payload = requireRecord(item.payload);
  requireString(payload.claimId);
  const rawText = requireString(payload.rawText);
  const epistemicLabel = requireString(payload.epistemicLabel);
  const citationId = citationForItem(pack, item).citationId;
  if (epistemicLabel === "FACT") {
    sections.facts.push(
      await statement(
        pack,
        "FACT",
        superseded
          ? `Historical superseded evidence stated: ${rawText}`
          : `Evidence states: ${rawText}`,
        [citationId]
      )
    );
    return;
  }
  if (epistemicLabel === "INFERENCE") {
    sections.inferences.push(
      await statement(
        pack,
        "INFERENCE",
        superseded
          ? `Historical superseded inference recorded: ${rawText}`
          : `Recorded inference: ${rawText}`,
        [citationId]
      )
    );
    return;
  }
  return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
}

async function addSupersessionStatement(
  pack: EvidencePack,
  item: EvidencePackItem,
  sections: MutableSections
): Promise<void> {
  const payload = requireRecord(item.payload);
  const predecessorClaimId = requireString(payload.predecessorClaimId);
  const successorClaimId = requireString(payload.successorClaimId);
  const predecessor = claimItemById(pack, predecessorClaimId);
  const successor = claimItemById(pack, successorClaimId);
  if (predecessor === undefined || successor === undefined) {
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
  sections.facts.push(
    await statement(
      pack,
      "FACT",
      `An explicit correction supersedes claim ${predecessorClaimId} with claim ${successorClaimId}.`,
      [
        citationForItem(pack, item).citationId,
        citationForItem(pack, predecessor).citationId,
        citationForItem(pack, successor).citationId
      ]
    )
  );
}

function missingText(payload: Record<string, unknown>): {
  readonly text: string;
  readonly supportKind?: string;
} {
  const requirement = payload.requirement;
  if (!isRecord(requirement)) return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  const supportKind = requireString(requirement.supportKind);
  if (supportKind === "EVIDENCE_SOURCE") {
    return {
      text: `Required evidence is missing: ${requireString(requirement.sourceLocator)}.`,
      supportKind
    };
  }
  if (supportKind === "VALIDATION_RESULT") {
    return {
      text: `Required validation is missing: ${requireString(requirement.validationKey)}.`,
      supportKind
    };
  }
  return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
}

function impactGapText(payload: Record<string, unknown>): string {
  const reason = requireString(payload.reason);
  const messages: Readonly<Record<string, string>> = Object.freeze({
    CRITICAL_IMPLEMENTATION_ASSET_ABSENT:
      "A required critical implementation asset is absent from the selected evidence.",
    CRITICAL_IMPLEMENTATION_PATH_ABSENT:
      "No cited implementation path reaches the required critical asset.",
    REQUIRED_VALIDATION_RESULT_ABSENT:
      "A required validation result is absent for the selected snapshot.",
    REQUIRED_VALIDATION_PATH_ABSENT:
      "No cited path reaches the required validation result.",
    IMPLEMENTATION_SUPPORT_UNAVAILABLE:
      "Implementation support is present only as unavailable declared evidence."
  });
  const text = messages[reason];
  if (text === undefined) return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  return text;
}

async function addFindingStatements(
  pack: EvidencePack,
  item: EvidencePackItem,
  sections: MutableSections,
  findings: FindingSummary[]
): Promise<void> {
  const payload = requireRecord(item.payload);
  const findingKind = requireString(payload.findingKind);
  if (payload.status !== "OPEN") return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  const findingCitation = citationForItem(pack, item).citationId;
  if (findingKind === "CONFLICT" || findingKind === "AMBIGUOUS") {
    const claimIds = requireStringArray(payload.claimIds);
    if (claimIds.length !== 2) return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
    const claimCitations = claimIds.map((claimId) => {
      const claim = claimItemById(pack, claimId);
      if (claim === undefined) return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
      return citationForItem(pack, claim).citationId;
    });
    sections.conflicts.push(
      await statement(
        pack,
        "CONFLICT",
        findingKind === "CONFLICT"
          ? "Open conflict: two active applicable claims have incompatible values."
          : "Open ambiguity: two active applicable claims cannot be safely resolved by the deterministic comparison policy.",
        [findingCitation, ...claimCitations]
      )
    );
    sections.nextActions.push(
      await statement(
        pack,
        "NEXT_ACTION",
        "Review the cited active claims and record an explicit correction when justified; this renderer does not choose a winner.",
        [findingCitation, ...claimCitations]
      )
    );
    findings.push({ findingKind, citationId: findingCitation });
    return;
  }
  if (findingKind === "MISSING") {
    const missing = missingText(payload);
    sections.gaps.push(
      await statement(pack, "GAP", missing.text, [findingCitation])
    );
    sections.nextActions.push(
      await statement(
        pack,
        "NEXT_ACTION",
        missing.supportKind === "VALIDATION_RESULT"
          ? "Provide the required snapshot-bound validation result, then rerun reconciliation."
          : "Provide the required attributed evidence source, then rerun reconciliation.",
        [findingCitation]
      )
    );
    findings.push({
      findingKind,
      reason: requireString(payload.reason),
      citationId: findingCitation,
      ...(missing.supportKind === undefined
        ? {}
        : { requirementSupportKind: missing.supportKind })
    });
    return;
  }
  if (findingKind === "STALE") {
    const changes = payload.dependencyChanges;
    if (!Array.isArray(changes) || changes.length < 1) {
      return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
    }
    sections.gaps.push(
      await statement(
        pack,
        "GAP",
        `The predecessor assessment is stale because ${valueCountText(changes.length, "exact dependency changed", "exact dependencies changed")}.`,
        [findingCitation]
      )
    );
    sections.nextActions.push(
      await statement(
        pack,
        "NEXT_ACTION",
        "Rerun reconciliation against the current exact dependencies before relying on the predecessor result.",
        [findingCitation]
      )
    );
    findings.push({
      findingKind,
      reason: requireString(payload.reason),
      citationId: findingCitation
    });
    return;
  }
  if (findingKind === "IMPACT_GAP") {
    const citationIds: EvidencePackCitationId[] = [findingCitation];
    const supportingPathKey = optionalString(payload.supportingPathKey);
    if (supportingPathKey !== undefined) {
      const path = impactPathItemByKey(pack, supportingPathKey);
      if (path === undefined) return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
      citationIds.push(citationForItem(pack, path).citationId);
    }
    const gapText = impactGapText(payload);
    sections.gaps.push(await statement(pack, "GAP", gapText, citationIds));
    sections.nextActions.push(
      await statement(
        pack,
        "NEXT_ACTION",
        "Address the cited impact obligation and rerun impact analysis with exact implementation or validation evidence.",
        citationIds
      )
    );
    findings.push({
      findingKind,
      reason: requireString(payload.reason),
      citationId: findingCitation
    });
    return;
  }
  return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
}

async function addImpactPathStatement(
  pack: EvidencePack,
  item: EvidencePackItem,
  sections: MutableSections
): Promise<void> {
  const payload = requireRecord(item.payload);
  const requirementId = requireString(payload.requirementId);
  const root = payload.root;
  const criticalAsset = payload.criticalAsset;
  if (!isRecord(root) || !isRecord(criticalAsset)) {
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
  const depth = payload.depth;
  if (!Number.isSafeInteger(depth) || (depth as number) < 0) {
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
  sections.facts.push(
    await statement(
      pack,
      "FACT",
      `Deterministic impact path ${requirementId} connects ${requireString(root.sourceReference)} to ${requireString(criticalAsset.sourceReference)} in ${valueCountText(depth as number, "step", "steps")}.`,
      [citationForItem(pack, item).citationId]
    )
  );
}

function validationGapCount(findings: readonly FindingSummary[]): number {
  return findings.filter(
    (finding) =>
      finding.requirementSupportKind === "VALIDATION_RESULT" ||
      finding.reason === "REQUIRED_VALIDATION_RESULT_ABSENT" ||
      finding.reason === "REQUIRED_VALIDATION_PATH_ABSENT"
  ).length;
}

function answerText(
  kind: OfflineExplanationQuestionKind,
  sections: MutableSections,
  findings: readonly FindingSummary[],
  pathCount: number,
  supersessionCount: number
): string {
  const conflictCount = sections.conflicts.length;
  const gapCount = sections.gaps.length;
  switch (kind) {
    case "RELEASE":
      return `This deterministic explanation does not decide release readiness. The evidence pack contains ${valueCountText(conflictCount, "open conflict or ambiguity", "open conflicts or ambiguities")} and ${valueCountText(gapCount, "open gap", "open gaps")} requiring review.`;
    case "CONFLICTS":
      return `The evidence pack contains ${valueCountText(conflictCount, "open conflict or ambiguity", "open conflicts or ambiguities")}.`;
    case "IMPACT":
      return `The evidence pack contains ${valueCountText(pathCount, "cited impact path", "cited impact paths")} and ${valueCountText(findings.filter((finding) => finding.findingKind === "IMPACT_GAP").length, "open impact gap", "open impact gaps")}.`;
    case "MISSING_VALIDATION":
      return `The evidence pack contains ${valueCountText(validationGapCount(findings), "open validation gap", "open validation gaps")}.`;
    case "NEXT_ACTIONS":
      return `The deterministic renderer produced ${valueCountText(sections.nextActions.length, "cited next action", "cited next actions")} from open canonical findings.`;
    case "POST_CORRECTION":
      return `The evidence pack records ${valueCountText(supersessionCount, "explicit correction", "explicit corrections")} and ${valueCountText(findings.filter((finding) => finding.findingKind === "STALE").length, "stale predecessor finding", "stale predecessor findings")}.`;
  }
}

function totalStatements(sections: MutableSections): number {
  return (
    1 +
    sections.facts.length +
    sections.inferences.length +
    sections.conflicts.length +
    sections.gaps.length +
    sections.nextActions.length
  );
}

function usedCitations(
  pack: EvidencePack,
  answer: OfflineExplanationStatement,
  sections: MutableSections
): readonly EvidencePackCitation[] {
  const used = new Set<EvidencePackCitationId>([
    ...answer.citationIds,
    ...sections.facts.flatMap((value) => value.citationIds),
    ...sections.inferences.flatMap((value) => value.citationIds),
    ...sections.conflicts.flatMap((value) => value.citationIds),
    ...sections.gaps.flatMap((value) => value.citationIds),
    ...sections.nextActions.flatMap((value) => value.citationIds)
  ]);
  return Object.freeze(
    pack.citations.filter((citation) => used.has(citation.citationId))
  );
}

async function buildExplanation(pack: EvidencePack): Promise<OfflineExplanation> {
  const questionKind = parseOfflineExplanationQuestion(pack.question);
  const sections: MutableSections = {
    facts: [],
    inferences: [],
    conflicts: [],
    gaps: [],
    nextActions: []
  };
  const findings: FindingSummary[] = [];
  const assessmentItems = pack.items.filter(
    (item) => item.itemKind === "ASSESSMENT"
  );
  const assessmentItem = assessmentItems[0];
  if (assessmentItems.length !== 1 || assessmentItem === undefined) {
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
  const supersededClaimIds = new Set(
    pack.items
      .filter((item) => item.itemKind === "CLAIM_SUPERSESSION")
      .map((item) =>
        requireString(requireRecord(item.payload).predecessorClaimId)
      )
  );
  let pathCount = 0;
  let supersessionCount = 0;
  for (const item of pack.items) {
    switch (item.itemKind) {
      case "ASSESSMENT":
      case "EVIDENCE_SOURCE":
        break;
      case "CLAIM":
        await addClaimStatement(
          pack,
          item,
          sections,
          supersededClaimIds.has(requireString(requireRecord(item.payload).claimId))
        );
        break;
      case "CLAIM_SUPERSESSION":
        supersessionCount += 1;
        await addSupersessionStatement(pack, item, sections);
        break;
      case "RECONCILIATION_FINDING":
        await addFindingStatements(pack, item, sections, findings);
        break;
      case "IMPACT_PATH":
        pathCount += 1;
        await addImpactPathStatement(pack, item, sections);
        break;
    }
  }
  if (totalStatements(sections) > MAXIMUM_OFFLINE_EXPLANATION_STATEMENTS) {
    return fail("OFFLINE_EXPLANATION_LIMIT_EXCEEDED");
  }
  const answer = await statement(
    pack,
    "ANSWER",
    answerText(questionKind, sections, findings, pathCount, supersessionCount),
    [citationForItem(pack, assessmentItem).citationId]
  );
  const withoutDigest = Object.freeze({
    version: OFFLINE_EXPLANATION_VERSION,
    digestVersion: OFFLINE_EXPLANATION_DIGEST_VERSION,
    rendererPolicyVersion: OFFLINE_EXPLANATION_RENDERER_POLICY_VERSION,
    rendererPolicyDigest: await rendererPolicyDigest(),
    projectId: pack.projectId,
    missionId: pack.missionId,
    evidencePackDigest: pack.packDigest,
    questionDigest: pack.questionDigest,
    question: pack.question,
    questionKind,
    engine: Object.freeze({
      explanationType: OFFLINE_EXPLANATION_TYPE,
      aiStatus: OFFLINE_EXPLANATION_AI_STATUS,
      provider: "NONE" as const,
      externalCallMade: false as const
    }),
    answer,
    facts: Object.freeze(sections.facts),
    inferences: Object.freeze(sections.inferences),
    conflicts: Object.freeze(sections.conflicts),
    gaps: Object.freeze(sections.gaps),
    nextActions: Object.freeze(sections.nextActions),
    citations: usedCitations(pack, answer, sections),
    limitations: LIMITATIONS
  });
  const explanation = Object.freeze({
    ...withoutDigest,
    explanationDigest: await canonicalJsonDigest(withoutDigest)
  });
  if (
    utf8Bytes(canonicalizeJson(explanation)) >
    MAXIMUM_OFFLINE_EXPLANATION_SERIALIZED_BYTES
  ) {
    return fail("OFFLINE_EXPLANATION_LIMIT_EXCEEDED");
  }
  return explanation;
}

export function offlineExplanationSerializedByteCount(
  explanation: OfflineExplanation
): number {
  return utf8Bytes(canonicalizeJson(explanation));
}

export async function renderOfflineExplanation(
  pack: EvidencePack
): Promise<OfflineExplanation> {
  try {
    await assertEvidencePackInvariant(pack);
    return await buildExplanation(pack);
  } catch (error) {
    if (error instanceof OfflineExplanationError) throw error;
    return fail("OFFLINE_EXPLANATION_INPUT_INVALID");
  }
}

export async function assertOfflineExplanationInvariant(
  explanation: OfflineExplanation,
  pack: EvidencePack
): Promise<void> {
  try {
    await assertEvidencePackInvariant(pack);
    const expected = await buildExplanation(pack);
    parseSha256Digest(explanation.explanationDigest);
    parseSha256Digest(explanation.rendererPolicyDigest);
    parseSha256Digest(explanation.evidencePackDigest);
    parseSha256Digest(explanation.questionDigest);
    if (canonicalizeJson(explanation) !== canonicalizeJson(expected)) {
      return fail("OFFLINE_EXPLANATION_INTEGRITY_INVALID");
    }
    for (const statementValue of [
      explanation.answer,
      ...explanation.facts,
      ...explanation.inferences,
      ...explanation.conflicts,
      ...explanation.gaps,
      ...explanation.nextActions
    ]) {
      for (const citationId of statementValue.citationIds) {
        parseEvidencePackCitationId(citationId);
        await resolveEvidencePackCitation(pack, citationId);
      }
    }
    if (
      offlineExplanationSerializedByteCount(explanation) >
      MAXIMUM_OFFLINE_EXPLANATION_SERIALIZED_BYTES
    ) {
      return fail("OFFLINE_EXPLANATION_LIMIT_EXCEEDED");
    }
  } catch (error) {
    if (
      error instanceof OfflineExplanationError &&
      error.code === "OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED"
    ) {
      throw error;
    }
    if (
      error instanceof OfflineExplanationError &&
      error.code === "OFFLINE_EXPLANATION_LIMIT_EXCEEDED"
    ) {
      throw error;
    }
    return fail("OFFLINE_EXPLANATION_INTEGRITY_INVALID");
  }
}
