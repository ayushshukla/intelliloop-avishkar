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

export const SYNTHETIC_EDGE_CASE_SET_VERSION =
  "synthetic-edge-case-set.v1" as const;
export const SYNTHETIC_EDGE_CASE_SET_DIGEST_VERSION =
  "synthetic-edge-case-set-digest.v1" as const;
export const SYNTHETIC_EDGE_CASE_SUGGESTION_VERSION =
  "synthetic-edge-case-suggestion.v1" as const;
export const SYNTHETIC_EDGE_CASE_POLICY_VERSION =
  "synthetic-edge-case-policy.v1" as const;

export const MAXIMUM_SYNTHETIC_EDGE_CASE_SUGGESTIONS = 32;
export const MAXIMUM_SYNTHETIC_EDGE_CASE_TEXT_BYTES = 2_048;
export const MAXIMUM_SYNTHETIC_EDGE_CASE_CITATIONS = 16;
export const MAXIMUM_SYNTHETIC_EDGE_CASE_SET_BYTES = 65_536;

export const SYNTHETIC_EDGE_CASE_KINDS = [
  "CONFLICT_BOUNDARY",
  "INTERPRETATION_VARIANT",
  "MISSING_EVIDENCE_PAIR",
  "MISSING_VALIDATION_PAIR",
  "DEPENDENCY_CHANGE_REPLAY",
  "IMPLEMENTATION_GAP_VARIANT",
  "VALIDATION_GAP_VARIANT",
  "IMPACT_PATH_INTERRUPTION"
] as const;

export const SYNTHETIC_EDGE_CASE_ERROR_CODES = [
  "SYNTHETIC_EDGE_CASE_INPUT_INVALID",
  "SYNTHETIC_EDGE_CASE_LIMIT_EXCEEDED",
  "SYNTHETIC_EDGE_CASE_CITATION_INVALID",
  "SYNTHETIC_EDGE_CASE_INTEGRITY_INVALID"
] as const;

export type SyntheticEdgeCaseKind =
  (typeof SYNTHETIC_EDGE_CASE_KINDS)[number];
export type SyntheticEdgeCaseErrorCode =
  (typeof SYNTHETIC_EDGE_CASE_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<SyntheticEdgeCaseErrorCode, string>> =
  Object.freeze({
    SYNTHETIC_EDGE_CASE_INPUT_INVALID:
      "Synthetic edge-case input is invalid.",
    SYNTHETIC_EDGE_CASE_LIMIT_EXCEEDED:
      "Synthetic edge-case limit is exceeded.",
    SYNTHETIC_EDGE_CASE_CITATION_INVALID:
      "Synthetic edge-case citation is invalid.",
    SYNTHETIC_EDGE_CASE_INTEGRITY_INVALID:
      "Synthetic edge-case integrity is invalid."
  });

export class SyntheticEdgeCaseError extends Error {
  readonly code: SyntheticEdgeCaseErrorCode;

  constructor(code: SyntheticEdgeCaseErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "SyntheticEdgeCaseError";
    this.code = code;
  }
}

export interface SyntheticEdgeCaseSuggestion {
  readonly suggestionVersion: typeof SYNTHETIC_EDGE_CASE_SUGGESTION_VERSION;
  readonly suggestionId: Sha256Digest;
  readonly kind: SyntheticEdgeCaseKind;
  readonly title: string;
  readonly scenario: string;
  readonly expectedObservation: string;
  readonly syntheticLabel: "SYNTHETIC";
  readonly authorityLabel: "ADVISORY_ONLY";
  readonly evidenceStatus: "NOT_EVIDENCE";
  readonly citationIds: readonly EvidencePackCitationId[];
}

export interface SyntheticEdgeCaseSet {
  readonly version: typeof SYNTHETIC_EDGE_CASE_SET_VERSION;
  readonly digestVersion: typeof SYNTHETIC_EDGE_CASE_SET_DIGEST_VERSION;
  readonly policyVersion: typeof SYNTHETIC_EDGE_CASE_POLICY_VERSION;
  readonly policyDigest: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly evidencePackDigest: Sha256Digest;
  readonly questionDigest: Sha256Digest;
  readonly generation: {
    readonly mode: "DETERMINISTIC_RULES";
    readonly provider: "NONE";
    readonly externalCallMade: false;
  };
  readonly authority: {
    readonly canonicalStateChanged: false;
    readonly findingMutationAvailable: false;
    readonly readinessAuthority: false;
    readonly releasePassportAuthority: false;
  };
  readonly suggestions: readonly SyntheticEdgeCaseSuggestion[];
  readonly citations: readonly EvidencePackCitation[];
  readonly limitations: readonly string[];
  readonly setDigest: Sha256Digest;
}

const UTF8_ENCODER = new TextEncoder();
const LIMITATIONS = Object.freeze([
  "Synthetic edge cases are advisory test ideas, not observed behavior, evidence, findings or release approval.",
  "A cited pack item grounds why a case was suggested; it does not prove the synthetic outcome or source truth."
]);

function fail(code: SyntheticEdgeCaseErrorCode): never {
  throw new SyntheticEdgeCaseError(code);
}

function utf8Bytes(value: string): number {
  return UTF8_ENCODER.encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function payloadRecord(item: EvidencePackItem): Record<string, unknown> {
  if (!isRecord(item.payload)) return fail("SYNTHETIC_EDGE_CASE_INPUT_INVALID");
  return item.payload;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length < 1) {
    return fail("SYNTHETIC_EDGE_CASE_INPUT_INVALID");
  }
  return value;
}

function checkedText(value: string): string {
  const normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (
    normalized.length < 1 ||
    utf8Bytes(normalized) > MAXIMUM_SYNTHETIC_EDGE_CASE_TEXT_BYTES
  ) {
    return fail("SYNTHETIC_EDGE_CASE_LIMIT_EXCEEDED");
  }
  return normalized;
}

function citationForItem(
  pack: EvidencePack,
  item: EvidencePackItem
): EvidencePackCitation {
  const index = pack.items.indexOf(item);
  const citation = pack.citations[index];
  if (
    index < 0 ||
    citation === undefined ||
    citation.itemDigest !== item.itemDigest
  ) {
    return fail("SYNTHETIC_EDGE_CASE_CITATION_INVALID");
  }
  return citation;
}

async function policyDigest(): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: SYNTHETIC_EDGE_CASE_POLICY_VERSION,
    source: "VERIFIED_REDACTED_EVIDENCE_PACK_ONLY",
    kinds: SYNTHETIC_EDGE_CASE_KINDS,
    labels: {
      synthetic: "SYNTHETIC",
      authority: "ADVISORY_ONLY",
      evidence: "NOT_EVIDENCE"
    },
    provider: "NONE",
    limits: {
      suggestions: MAXIMUM_SYNTHETIC_EDGE_CASE_SUGGESTIONS,
      textBytes: MAXIMUM_SYNTHETIC_EDGE_CASE_TEXT_BYTES,
      citationsPerSuggestion: MAXIMUM_SYNTHETIC_EDGE_CASE_CITATIONS,
      serializedBytes: MAXIMUM_SYNTHETIC_EDGE_CASE_SET_BYTES
    },
    authority: {
      findingMutation: false,
      readiness: false,
      releasePassport: false
    }
  });
}

async function suggestion(
  kind: SyntheticEdgeCaseKind,
  title: string,
  scenario: string,
  expectedObservation: string,
  citationIds: readonly EvidencePackCitationId[]
): Promise<SyntheticEdgeCaseSuggestion> {
  if (
    citationIds.length < 1 ||
    citationIds.length > MAXIMUM_SYNTHETIC_EDGE_CASE_CITATIONS ||
    new Set(citationIds).size !== citationIds.length
  ) {
    return fail("SYNTHETIC_EDGE_CASE_CITATION_INVALID");
  }
  const withoutId = Object.freeze({
    suggestionVersion: SYNTHETIC_EDGE_CASE_SUGGESTION_VERSION,
    kind,
    title: checkedText(title),
    scenario: checkedText(scenario),
    expectedObservation: checkedText(expectedObservation),
    syntheticLabel: "SYNTHETIC" as const,
    authorityLabel: "ADVISORY_ONLY" as const,
    evidenceStatus: "NOT_EVIDENCE" as const,
    citationIds: Object.freeze([...citationIds])
  });
  return Object.freeze({
    suggestionVersion: withoutId.suggestionVersion,
    suggestionId: await canonicalJsonDigest(withoutId as unknown as JsonValue),
    kind: withoutId.kind,
    title: withoutId.title,
    scenario: withoutId.scenario,
    expectedObservation: withoutId.expectedObservation,
    syntheticLabel: withoutId.syntheticLabel,
    authorityLabel: withoutId.authorityLabel,
    evidenceStatus: withoutId.evidenceStatus,
    citationIds: withoutId.citationIds
  });
}

function missingSupportKind(payload: Record<string, unknown>): string {
  if (!isRecord(payload.requirement)) {
    return fail("SYNTHETIC_EDGE_CASE_INPUT_INVALID");
  }
  return requiredString(payload.requirement.supportKind);
}

async function suggestionForFinding(
  pack: EvidencePack,
  item: EvidencePackItem
): Promise<SyntheticEdgeCaseSuggestion> {
  const payload = payloadRecord(item);
  const findingKind = requiredString(payload.findingKind);
  const citationId = citationForItem(pack, item).citationId;
  if (findingKind === "CONFLICT") {
    return suggestion(
      "CONFLICT_BOUNDARY",
      "Conflicting cancellation-rule boundary",
      "Create synthetic cancellation requests at the disputed rule boundary and immediately on either side of it; keep both cited interpretations visible.",
      "Verify deterministic reconciliation retains the incompatible applicable claims until an explicit correction is recorded.",
      [citationId]
    );
  }
  if (findingKind === "AMBIGUOUS") {
    return suggestion(
      "INTERPRETATION_VARIANT",
      "Ambiguous cancellation interpretation pair",
      "Create two synthetic cancellation cases, one for each cited interpretation, without assigning either interpretation higher authority.",
      "Verify the ambiguity remains explicit and no timestamp, confidence score or advisory text selects a winner.",
      [citationId]
    );
  }
  if (findingKind === "MISSING") {
    const supportKind = missingSupportKind(payload);
    if (supportKind === "VALIDATION_RESULT") {
      return suggestion(
        "MISSING_VALIDATION_PAIR",
        "Validation absent/present pair",
        "Create one synthetic cancellation fixture without the required snapshot-bound validation and one with an explicitly attributed validation result.",
        "Verify the missing-validation gap is present only when exact validation support is absent; this suggestion does not supply that support.",
        [citationId]
      );
    }
    if (supportKind === "EVIDENCE_SOURCE") {
      return suggestion(
        "MISSING_EVIDENCE_PAIR",
        "Evidence absent/present pair",
        "Create one synthetic cancellation fixture without the required attributed source and one with a separately imported synthetic source.",
        "Verify missing evidence remains explicit until the exact source is present; the suggestion itself is not evidence.",
        [citationId]
      );
    }
    return fail("SYNTHETIC_EDGE_CASE_INPUT_INVALID");
  }
  if (findingKind === "STALE") {
    return suggestion(
      "DEPENDENCY_CHANGE_REPLAY",
      "Synthetic dependency-change replay",
      "Create a synthetic successor fixture that changes exactly one cited dependency while retaining the historical predecessor assessment.",
      "Verify the predecessor stays immutable and stale while a new deterministic assessment binds the changed dependency.",
      [citationId]
    );
  }
  if (findingKind === "IMPACT_GAP") {
    const reason = requiredString(payload.reason);
    const validationReasons = new Set([
      "REQUIRED_VALIDATION_RESULT_ABSENT",
      "REQUIRED_VALIDATION_PATH_ABSENT"
    ]);
    const implementationReasons = new Set([
      "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
      "CRITICAL_IMPLEMENTATION_PATH_ABSENT",
      "IMPLEMENTATION_SUPPORT_UNAVAILABLE"
    ]);
    if (!validationReasons.has(reason) && !implementationReasons.has(reason)) {
      return fail("SYNTHETIC_EDGE_CASE_INPUT_INVALID");
    }
    const validationGap = validationReasons.has(reason);
    return suggestion(
      validationGap ? "VALIDATION_GAP_VARIANT" : "IMPLEMENTATION_GAP_VARIANT",
      validationGap
        ? "Cancellation validation-gap variant"
        : "Cancellation implementation-gap variant",
      validationGap
        ? "Create synthetic cancellation cases with the cited validation obligation absent, failing and explicitly passing under the same snapshot binding."
        : "Create synthetic cancellation cases with the cited critical implementation support absent and then explicitly restored in a successor fixture.",
      validationGap
        ? "Verify deterministic impact analysis distinguishes missing, failed and passing validation without treating this advisory case as a validation result."
        : "Verify deterministic impact analysis reports the exact implementation gap until cited implementation support exists.",
      [citationId]
    );
  }
  return fail("SYNTHETIC_EDGE_CASE_INPUT_INVALID");
}

async function suggestionForImpactPath(
  pack: EvidencePack,
  item: EvidencePackItem
): Promise<SyntheticEdgeCaseSuggestion> {
  payloadRecord(item);
  return suggestion(
    "IMPACT_PATH_INTERRUPTION",
    "Cited cancellation-impact path interruption",
    "Create a synthetic successor fixture with the cited impact path intact, then remove exactly one declared relationship from that path.",
    "Verify deterministic traversal reports only the path supported by the exact current relationships and never invents a replacement edge.",
    [citationForItem(pack, item).citationId]
  );
}

async function setDigest(
  value: Omit<SyntheticEdgeCaseSet, "setDigest">
): Promise<Sha256Digest> {
  return canonicalJsonDigest(value as unknown as JsonValue);
}

export async function createSyntheticEdgeCaseSuggestions(
  pack: EvidencePack
): Promise<SyntheticEdgeCaseSet> {
  await assertEvidencePackInvariant(pack);
  const suggestions: SyntheticEdgeCaseSuggestion[] = [];
  for (const item of pack.items) {
    if (item.itemKind === "RECONCILIATION_FINDING") {
      suggestions.push(await suggestionForFinding(pack, item));
    } else if (item.itemKind === "IMPACT_PATH") {
      suggestions.push(await suggestionForImpactPath(pack, item));
    }
    if (suggestions.length > MAXIMUM_SYNTHETIC_EDGE_CASE_SUGGESTIONS) {
      return fail("SYNTHETIC_EDGE_CASE_LIMIT_EXCEEDED");
    }
  }
  const used = new Set(suggestions.flatMap((entry) => entry.citationIds));
  const citations = Object.freeze(
    pack.citations.filter((citation) => used.has(citation.citationId))
  );
  if (citations.length !== used.size) {
    return fail("SYNTHETIC_EDGE_CASE_CITATION_INVALID");
  }
  const withoutDigest = Object.freeze({
    version: SYNTHETIC_EDGE_CASE_SET_VERSION,
    digestVersion: SYNTHETIC_EDGE_CASE_SET_DIGEST_VERSION,
    policyVersion: SYNTHETIC_EDGE_CASE_POLICY_VERSION,
    policyDigest: await policyDigest(),
    projectId: pack.projectId,
    missionId: pack.missionId,
    evidencePackDigest: pack.packDigest,
    questionDigest: pack.questionDigest,
    generation: Object.freeze({
      mode: "DETERMINISTIC_RULES" as const,
      provider: "NONE" as const,
      externalCallMade: false as const
    }),
    authority: Object.freeze({
      canonicalStateChanged: false as const,
      findingMutationAvailable: false as const,
      readinessAuthority: false as const,
      releasePassportAuthority: false as const
    }),
    suggestions: Object.freeze(suggestions),
    citations,
    limitations: LIMITATIONS
  });
  const result = Object.freeze({
    ...withoutDigest,
    setDigest: await setDigest(withoutDigest)
  });
  if (
    utf8Bytes(canonicalizeJson(result as unknown as JsonValue)) >
    MAXIMUM_SYNTHETIC_EDGE_CASE_SET_BYTES
  ) {
    return fail("SYNTHETIC_EDGE_CASE_LIMIT_EXCEEDED");
  }
  return result;
}

export async function assertSyntheticEdgeCaseSuggestionsInvariant(
  value: SyntheticEdgeCaseSet,
  pack: EvidencePack
): Promise<void> {
  await assertEvidencePackInvariant(pack);
  if (
    value.version !== SYNTHETIC_EDGE_CASE_SET_VERSION ||
    value.digestVersion !== SYNTHETIC_EDGE_CASE_SET_DIGEST_VERSION ||
    value.policyVersion !== SYNTHETIC_EDGE_CASE_POLICY_VERSION ||
    value.projectId !== pack.projectId ||
    value.missionId !== pack.missionId ||
    value.evidencePackDigest !== pack.packDigest ||
    value.questionDigest !== pack.questionDigest ||
    value.generation.mode !== "DETERMINISTIC_RULES" ||
    value.generation.provider !== "NONE" ||
    value.generation.externalCallMade !== false ||
    value.authority.canonicalStateChanged !== false ||
    value.authority.findingMutationAvailable !== false ||
    value.authority.readinessAuthority !== false ||
    value.authority.releasePassportAuthority !== false ||
    value.policyDigest !== (await policyDigest()) ||
    value.suggestions.length > MAXIMUM_SYNTHETIC_EDGE_CASE_SUGGESTIONS
  ) {
    return fail("SYNTHETIC_EDGE_CASE_INTEGRITY_INVALID");
  }
  parseSha256Digest(value.setDigest);
  for (const entry of value.suggestions) {
    if (
      entry.suggestionVersion !== SYNTHETIC_EDGE_CASE_SUGGESTION_VERSION ||
      !(SYNTHETIC_EDGE_CASE_KINDS as readonly string[]).includes(entry.kind) ||
      entry.syntheticLabel !== "SYNTHETIC" ||
      entry.authorityLabel !== "ADVISORY_ONLY" ||
      entry.evidenceStatus !== "NOT_EVIDENCE" ||
      entry.citationIds.length < 1 ||
      entry.citationIds.length > MAXIMUM_SYNTHETIC_EDGE_CASE_CITATIONS ||
      new Set(entry.citationIds).size !== entry.citationIds.length ||
      [entry.title, entry.scenario, entry.expectedObservation].some(
        (text) =>
          typeof text !== "string" ||
          text.length < 1 ||
          utf8Bytes(text) > MAXIMUM_SYNTHETIC_EDGE_CASE_TEXT_BYTES
      )
    ) {
      return fail("SYNTHETIC_EDGE_CASE_INTEGRITY_INVALID");
    }
    parseSha256Digest(entry.suggestionId);
    for (const citationId of entry.citationIds) {
      try {
        parseEvidencePackCitationId(citationId);
        await resolveEvidencePackCitation(pack, citationId);
      } catch {
        return fail("SYNTHETIC_EDGE_CASE_CITATION_INVALID");
      }
    }
  }
  const expected = await createSyntheticEdgeCaseSuggestions(pack);
  if (
    canonicalizeJson(value as unknown as JsonValue) !==
    canonicalizeJson(expected as unknown as JsonValue)
  ) {
    return fail("SYNTHETIC_EDGE_CASE_INTEGRITY_INVALID");
  }
}
