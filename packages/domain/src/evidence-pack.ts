import {
  assertClaimInvariant,
  assertClaimSupersessionInvariant,
  type Claim,
  type ClaimSupersession
} from "./claim.js";
import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import {
  prepareEvidenceImport,
  REDACTION_RULE_IDS,
  type RedactionRuleId
} from "./evidence-import.js";
import {
  assertEvidenceSourceInvariant,
  type EvidenceSource
} from "./evidence-source.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  assertReconciliationImpactRevisionInvariant,
  type ReconciliationImpactRevision
} from "./reconciliation-impact-revision.js";
import { parseStableId } from "./stable-id.js";
import {
  assertTwinProjectionRevisionInvariant,
  type TwinProjectionRevision
} from "./twin-projection.js";

export const EVIDENCE_PACK_VERSION = "evidence-pack.v1" as const;
export const EVIDENCE_PACK_DIGEST_VERSION = "evidence-pack-digest.v1" as const;
export const EVIDENCE_PACK_ITEM_VERSION = "evidence-pack-item.v1" as const;
export const EVIDENCE_PACK_CITATION_REGISTRY_VERSION =
  "evidence-pack-citation-registry.v1" as const;
export const EVIDENCE_PACK_CITATION_LOCATOR_VERSION =
  "evidence-pack-citation-locator.v1" as const;
export const EVIDENCE_PACK_COMPILER_POLICY_VERSION =
  "evidence-pack-compiler-policy.v2" as const;
export const EVIDENCE_PACK_QUESTION_DIGEST_VERSION =
  "evidence-pack-question-digest.v1" as const;

export const MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES = 2_048;
export const MAXIMUM_EVIDENCE_PACK_SOURCE_ITEM_BYTES = 16_384;
export const MAXIMUM_EVIDENCE_PACK_ITEM_BYTES = 4_096;
export const MAXIMUM_EVIDENCE_PACK_ITEMS = 256;
export const MAXIMUM_EVIDENCE_PACK_SERIALIZED_BYTES = 65_536;
export const MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND = 12_000;

export const EVIDENCE_PACK_ITEM_KINDS = [
  "ASSESSMENT",
  "EVIDENCE_SOURCE",
  "CLAIM",
  "CLAIM_SUPERSESSION",
  "RECONCILIATION_FINDING",
  "IMPACT_PATH"
] as const;

export const TRANSFER_REDACTION_RULE_IDS = [
  "PRIVATE_PATH",
  ...REDACTION_RULE_IDS
] as const;

export const EVIDENCE_PACK_ERROR_CODES = [
  "EVIDENCE_PACK_INPUT_INVALID",
  "EVIDENCE_PACK_SCOPE_INVALID",
  "EVIDENCE_PACK_LIMIT_EXCEEDED",
  "EVIDENCE_PACK_INTEGRITY_INVALID",
  "EVIDENCE_PACK_CITATION_NOT_FOUND"
] as const;

export type EvidencePackItemKind = (typeof EVIDENCE_PACK_ITEM_KINDS)[number];
export type TransferRedactionRuleId =
  (typeof TRANSFER_REDACTION_RULE_IDS)[number];
export type EvidencePackErrorCode =
  (typeof EVIDENCE_PACK_ERROR_CODES)[number];

declare const evidencePackCitationIdBrand: unique symbol;
export type EvidencePackCitationId = string & {
  readonly [evidencePackCitationIdBrand]: "EVIDENCE_PACK_CITATION_ID";
};

const ERROR_MESSAGES: Readonly<Record<EvidencePackErrorCode, string>> =
  Object.freeze({
    EVIDENCE_PACK_INPUT_INVALID: "Evidence-pack input is invalid.",
    EVIDENCE_PACK_SCOPE_INVALID: "Evidence-pack scope is invalid.",
    EVIDENCE_PACK_LIMIT_EXCEEDED: "Evidence-pack limit is exceeded.",
    EVIDENCE_PACK_INTEGRITY_INVALID: "Evidence-pack integrity is invalid.",
    EVIDENCE_PACK_CITATION_NOT_FOUND:
      "Evidence-pack citation is not allowlisted."
  });

export class EvidencePackError extends Error {
  readonly code: EvidencePackErrorCode;

  constructor(code: EvidencePackErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "EvidencePackError";
    this.code = code;
  }
}

export interface TransferRedactionRuleCount {
  readonly rule: TransferRedactionRuleId;
  readonly replacements: number;
}

export interface TransferRedactionSummary {
  readonly applied: boolean;
  readonly totalReplacements: number;
  readonly ruleCounts: readonly TransferRedactionRuleCount[];
}

export interface EvidencePackItem {
  readonly itemVersion: typeof EVIDENCE_PACK_ITEM_VERSION;
  readonly itemKind: EvidencePackItemKind;
  readonly itemKey: string;
  readonly payload: JsonValue;
  readonly itemDigest: Sha256Digest;
}

export interface EvidencePackCitationLocator {
  readonly locatorVersion: typeof EVIDENCE_PACK_CITATION_LOCATOR_VERSION;
  readonly itemKind: EvidencePackItemKind;
  readonly itemKey: string;
}

export interface EvidencePackCitation {
  readonly citationId: EvidencePackCitationId;
  readonly locator: EvidencePackCitationLocator;
  readonly itemDigest: Sha256Digest;
}

export interface EvidencePackAssessmentBinding {
  readonly revisionKey: Sha256Digest;
  readonly revision: number;
  readonly resultDigest: Sha256Digest;
  readonly twinProjectionId: TwinProjectionRevision["projectionId"];
  readonly twinRevision: TwinProjectionRevision["revision"];
  readonly twinProjectionDigest: Sha256Digest;
  readonly targetSnapshotId: ReconciliationImpactRevision["targetSnapshotId"];
}

export interface EvidencePack {
  readonly version: typeof EVIDENCE_PACK_VERSION;
  readonly digestVersion: typeof EVIDENCE_PACK_DIGEST_VERSION;
  readonly citationRegistryVersion: typeof EVIDENCE_PACK_CITATION_REGISTRY_VERSION;
  readonly compilerPolicyVersion: typeof EVIDENCE_PACK_COMPILER_POLICY_VERSION;
  readonly compilerPolicyDigest: Sha256Digest;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly question: string;
  readonly questionDigest: Sha256Digest;
  readonly assessmentBinding: EvidencePackAssessmentBinding;
  readonly items: readonly EvidencePackItem[];
  readonly citations: readonly EvidencePackCitation[];
  readonly allowedCitationIds: readonly EvidencePackCitationId[];
  readonly redaction: TransferRedactionSummary;
  readonly packDigest: Sha256Digest;
}

export interface CompileEvidencePackInput {
  readonly question: string;
  readonly assessment: ReconciliationImpactRevision;
  readonly twin: TwinProjectionRevision;
  readonly evidenceSources: readonly EvidenceSource[];
  readonly claims: readonly Claim[];
  readonly claimSupersessions: readonly ClaimSupersession[];
}

export interface ResolvedEvidencePackCitation {
  readonly citation: EvidencePackCitation;
  readonly item: EvidencePackItem;
}

interface MutableRedactionCounts {
  readonly values: Map<TransferRedactionRuleId, number>;
}

interface RedactedValue<T> {
  readonly value: T;
  readonly counts: ReadonlyMap<TransferRedactionRuleId, number>;
}

const UTF8_ENCODER = new TextEncoder();
const CITATION_ID_PATTERN = /^cite:[0-9a-f]{64}$/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN =
  /\b[A-Za-z]:[\\/][^\r\n\t <>"']+/gu;
const UNC_PATH_PATTERN = /\\\\[^\\\s<>"']+\\[^\\\s<>"']+(?:\\[^\s<>"']*)?/gu;
const POSIX_PRIVATE_PATH_PATTERN =
  /\/(?:Users|home|tmp)\/[^\s<>"']+|\/private\/var\/folders\/[^\s<>"']+/gu;

function fail(code: EvidencePackErrorCode): never {
  throw new EvidencePackError(code);
}

function utf8Bytes(value: string): number {
  return UTF8_ENCODER.encode(value).byteLength;
}

function increment(
  counts: Map<TransferRedactionRuleId, number>,
  rule: TransferRedactionRuleId,
  replacements: number
): void {
  if (replacements < 1) return;
  const next = (counts.get(rule) ?? 0) + replacements;
  if (!Number.isSafeInteger(next)) return fail("EVIDENCE_PACK_LIMIT_EXCEEDED");
  counts.set(rule, next);
}

function redactPrivatePaths(
  value: string,
  counts: Map<TransferRedactionRuleId, number>
): string {
  let result = value;
  for (const pattern of [
    UNC_PATH_PATTERN,
    WINDOWS_ABSOLUTE_PATH_PATTERN,
    POSIX_PRIVATE_PATH_PATTERN
  ]) {
    let replacements = 0;
    result = result.replace(pattern, () => {
      replacements += 1;
      return "[REDACTED:PRIVATE_PATH]";
    });
    increment(counts, "PRIVATE_PATH", replacements);
  }
  return result;
}

function redactPathsInJson(
  value: JsonValue,
  counts: Map<TransferRedactionRuleId, number>
): JsonValue {
  if (typeof value === "string") return redactPrivatePaths(value, counts);
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => redactPathsInJson(entry, counts));
  }
  const output: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    const redactedKey = redactPrivatePaths(key, counts);
    if (Object.hasOwn(output, redactedKey)) {
      return fail("EVIDENCE_PACK_INPUT_INVALID");
    }
    output[redactedKey] = redactPathsInJson(entry, counts);
  }
  return output;
}

function deepFreezeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    for (const entry of value) deepFreezeJson(entry);
    return Object.freeze(value);
  }
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) deepFreezeJson(entry);
    return Object.freeze(value);
  }
  return value;
}

function addPreparedCounts(
  counts: Map<TransferRedactionRuleId, number>,
  values: readonly { readonly rule: RedactionRuleId; readonly replacements: number }[]
): void {
  for (const value of values) increment(counts, value.rule, value.replacements);
}

async function redactQuestion(value: unknown): Promise<RedactedValue<string>> {
  if (typeof value !== "string" || utf8Bytes(value) > MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES) {
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
  const counts = new Map<TransferRedactionRuleId, number>();
  const withoutPaths = redactPrivatePaths(value, counts);
  const prepared = await prepareEvidenceImport({
    format: "TEXT",
    content: UTF8_ENCODER.encode(withoutPaths)
  });
  if (prepared.normalizedByteCount > MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES) {
    return fail("EVIDENCE_PACK_LIMIT_EXCEEDED");
  }
  addPreparedCounts(counts, prepared.redaction.ruleCounts);
  return Object.freeze({ value: prepared.normalizedContent, counts });
}

async function redactPayload(value: unknown): Promise<RedactedValue<JsonValue>> {
  const serialized = canonicalizeJson(value);
  if (utf8Bytes(serialized) > MAXIMUM_EVIDENCE_PACK_SOURCE_ITEM_BYTES) {
    return fail("EVIDENCE_PACK_LIMIT_EXCEEDED");
  }
  const parsed = JSON.parse(serialized) as JsonValue;
  const counts = new Map<TransferRedactionRuleId, number>();
  const withoutPaths = redactPathsInJson(parsed, counts);
  const textPrepared = await prepareEvidenceImport({
    format: "TEXT",
    content: UTF8_ENCODER.encode(canonicalizeJson(withoutPaths))
  });
  addPreparedCounts(counts, textPrepared.redaction.ruleCounts);
  const prepared = await prepareEvidenceImport({
    format: "JSON",
    content: UTF8_ENCODER.encode(textPrepared.normalizedContent)
  });
  if (prepared.normalizedByteCount > MAXIMUM_EVIDENCE_PACK_ITEM_BYTES) {
    return fail("EVIDENCE_PACK_LIMIT_EXCEEDED");
  }
  addPreparedCounts(counts, prepared.redaction.ruleCounts);
  return Object.freeze({
    value: deepFreezeJson(JSON.parse(prepared.normalizedContent) as JsonValue),
    counts
  });
}

function addCounts(
  target: MutableRedactionCounts,
  source: ReadonlyMap<TransferRedactionRuleId, number>
): void {
  for (const [rule, replacements] of source) {
    increment(target.values, rule, replacements);
  }
}

function redactionSummary(
  counts: ReadonlyMap<TransferRedactionRuleId, number>
): TransferRedactionSummary {
  const ruleCounts = TRANSFER_REDACTION_RULE_IDS.flatMap((rule) => {
    const replacements = counts.get(rule) ?? 0;
    return replacements < 1
      ? []
      : [Object.freeze({ rule, replacements })];
  });
  const totalReplacements = ruleCounts.reduce(
    (total, value) => total + value.replacements,
    0
  );
  return Object.freeze({
    applied: totalReplacements > 0,
    totalReplacements,
    ruleCounts: Object.freeze(ruleCounts)
  });
}

function assertRedactionSummary(value: TransferRedactionSummary): void {
  let priorIndex = -1;
  let total = 0;
  for (const count of value.ruleCounts) {
    const index = TRANSFER_REDACTION_RULE_IDS.findIndex(
      (rule) => rule === count.rule
    );
    if (
      index <= priorIndex ||
      !Number.isSafeInteger(count.replacements) ||
      count.replacements < 1
    ) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    priorIndex = index;
    total += count.replacements;
  }
  if (
    !Number.isSafeInteger(value.totalReplacements) ||
    value.totalReplacements !== total ||
    value.applied !== (total > 0)
  ) {
    return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
  }
}

function itemKindIndex(value: EvidencePackItemKind): number {
  return EVIDENCE_PACK_ITEM_KINDS.findIndex((kind) => kind === value);
}

function compareItems(left: EvidencePackItem, right: EvidencePackItem): number {
  const kindDifference = itemKindIndex(left.itemKind) - itemKindIndex(right.itemKind);
  return kindDifference === 0
    ? left.itemKey < right.itemKey
      ? -1
      : left.itemKey > right.itemKey
        ? 1
        : 0
    : kindDifference;
}

async function createItem(
  itemKind: EvidencePackItemKind,
  itemKey: string,
  sourcePayload: unknown,
  counts: MutableRedactionCounts
): Promise<EvidencePackItem> {
  if (itemKey.length < 1 || itemKey.length > 256) {
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
  const redacted = await redactPayload(sourcePayload);
  addCounts(counts, redacted.counts);
  const withoutDigest = Object.freeze({
    itemVersion: EVIDENCE_PACK_ITEM_VERSION,
    itemKind,
    itemKey,
    payload: redacted.value
  });
  return Object.freeze({
    ...withoutDigest,
    itemDigest: await canonicalJsonDigest(withoutDigest)
  });
}

async function citationFor(item: EvidencePackItem): Promise<EvidencePackCitation> {
  const locator = Object.freeze({
    locatorVersion: EVIDENCE_PACK_CITATION_LOCATOR_VERSION,
    itemKind: item.itemKind,
    itemKey: item.itemKey
  });
  const locatorDigest = await canonicalJsonDigest(locator);
  return Object.freeze({
    citationId: parseEvidencePackCitationId(`cite:${locatorDigest.slice(7)}`),
    locator,
    itemDigest: item.itemDigest
  });
}

function sourcePayload(source: EvidenceSource): unknown {
  return {
    evidenceSourceId: source.evidenceSourceId,
    contentDigest: source.prepared.contentDigest,
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
    epistemicLabel: source.epistemicLabel
  };
}

function claimPayload(claim: Claim): unknown {
  return {
    claimId: claim.claimId,
    evidenceSourceId: claim.evidenceSourceId,
    rawText: claim.rawText,
    value: claim.value,
    epistemicLabel: claim.epistemicLabel,
    ...(claim.supersedesClaimId === undefined
      ? {}
      : { supersedesClaimId: claim.supersedesClaimId })
  };
}

type PackFinding =
  | ReconciliationImpactRevision["reassessment"]["claimFindings"][number]
  | ReconciliationImpactRevision["reassessment"]["missingFindings"][number]
  | NonNullable<
      ReconciliationImpactRevision["reassessment"]["stalePredecessorFinding"]
    >
  | ReconciliationImpactRevision["impact"]["impactGapFindings"][number];

function findingPayload(finding: PackFinding): unknown {
  const common = {
    findingKind: finding.findingKind,
    status: finding.status,
    reason: finding.reason
  };
  switch (finding.findingKind) {
    case "CONFLICT":
    case "AMBIGUOUS":
      return { ...common, claimIds: finding.claimIds };
    case "MISSING":
      return { ...common, requirement: finding.requirement };
    case "STALE":
      return {
        ...common,
        dependencyChanges: finding.dependencyChanges.map((change) => ({
          changeType: change.changeType,
          dependencyKind: change.dependencyKind,
          dependencyKey: change.dependencyKey
        }))
      };
    case "IMPACT_GAP":
      return {
        ...common,
        requirement: {
          requirementId: finding.requirement.requirementId,
          supportKind: finding.requirement.supportKind,
          ...(finding.requirement.validationKey === undefined
            ? {}
            : { validationKey: finding.requirement.validationKey })
        },
        ...(finding.supportingPathKey === undefined
          ? {}
          : { supportingPathKey: finding.supportingPathKey })
      };
  }
}

function impactPathPayload(
  path: ReconciliationImpactRevision["impact"]["paths"][number]
): unknown {
  return {
    requirementId: path.requirementId,
    supportKind: path.supportKind,
    root: { sourceReference: path.root.sourceReference },
    criticalAsset: { sourceReference: path.criticalAsset.sourceReference },
    depth: path.depth
  };
}

interface PackSelection {
  readonly evidenceSources: readonly EvidenceSource[];
  readonly claims: readonly Claim[];
  readonly claimSupersessions: readonly ClaimSupersession[];
  readonly findings: readonly PackFinding[];
  readonly paths: ReconciliationImpactRevision["impact"]["paths"];
}

function questionSelection(input: CompileEvidencePackInput): PackSelection {
  const allFindings: readonly PackFinding[] = [
    ...input.assessment.reassessment.claimFindings,
    ...input.assessment.reassessment.missingFindings,
    ...(input.assessment.reassessment.stalePredecessorFinding === undefined
      ? []
      : [input.assessment.reassessment.stalePredecessorFinding]),
    ...input.assessment.impact.impactGapFindings
  ];
  let findings = allFindings;
  let includeAllPaths = false;
  let includeSupersessions = false;
  switch (input.question) {
    case "Can we release?":
    case "What should happen next?":
      break;
    case "What conflicts are open?":
      findings = allFindings.filter(
        (finding) =>
          finding.findingKind === "CONFLICT" ||
          finding.findingKind === "AMBIGUOUS"
      );
      break;
    case "What is impacted?":
      findings = allFindings.filter(
        (finding) => finding.findingKind === "IMPACT_GAP"
      );
      includeAllPaths = true;
      break;
    case "What validation is missing?":
      findings = allFindings.filter(
        (finding) =>
          (finding.findingKind === "MISSING" &&
            finding.requirement.supportKind === "VALIDATION_RESULT") ||
          (finding.findingKind === "IMPACT_GAP" &&
            (finding.reason === "REQUIRED_VALIDATION_RESULT_ABSENT" ||
              finding.reason === "REQUIRED_VALIDATION_PATH_ABSENT"))
      );
      break;
    case "What changed after correction?":
      findings = allFindings.filter(
        (finding) => finding.findingKind === "STALE"
      );
      includeSupersessions = true;
      break;
    default:
      includeAllPaths = true;
      includeSupersessions = true;
  }

  const claimIds = new Set<string>();
  for (const finding of findings) {
    if (
      finding.findingKind === "CONFLICT" ||
      finding.findingKind === "AMBIGUOUS"
    ) {
      for (const claimId of finding.claimIds) claimIds.add(claimId);
    }
  }
  const claimSupersessions = includeSupersessions
    ? input.claimSupersessions
    : Object.freeze([]);
  for (const link of claimSupersessions) {
    claimIds.add(link.predecessorClaimId);
    claimIds.add(link.successorClaimId);
  }
  const claims = input.claims.filter((claim) => claimIds.has(claim.claimId));
  const evidenceSourceIds = new Set(
    claims.map((claim) => claim.evidenceSourceId)
  );
  const evidenceSources = input.evidenceSources.filter((source) =>
    evidenceSourceIds.has(source.evidenceSourceId)
  );
  const referencedPathKeys = new Set(
    findings.flatMap((finding) =>
      finding.findingKind === "IMPACT_GAP" &&
      finding.supportingPathKey !== undefined
        ? [finding.supportingPathKey]
        : []
    )
  );
  const paths = includeAllPaths
    ? input.assessment.impact.paths
    : input.assessment.impact.paths.filter((path) =>
        referencedPathKeys.has(path.pathKey)
      );
  return Object.freeze({
    evidenceSources: Object.freeze(evidenceSources),
    claims: Object.freeze(claims),
    claimSupersessions: Object.freeze([...claimSupersessions]),
    findings: Object.freeze([...findings]),
    paths: Object.freeze([...paths])
  });
}

function assessmentPayload(value: ReconciliationImpactRevision): unknown {
  return {
    revisionKey: value.revisionKey,
    revision: value.revision,
    resultDigest: value.resultDigest,
    targetSnapshotId: value.targetSnapshotId,
    findingCounts: value.findingCounts,
    impactPathCount: value.impactPathCount
  };
}

function exactSourceInputs(input: CompileEvidencePackInput): void {
  const sourceBindings = input.twin.nodeSources.filter(
    (binding) => binding.sourceType === "EvidenceSource"
  );
  const claimBindings = input.twin.nodeSources.filter(
    (binding) => binding.sourceType === "Claim"
  );
  if (
    sourceBindings.length !== input.evidenceSources.length ||
    claimBindings.length !== input.claims.length ||
    input.evidenceSources.length > MAXIMUM_EVIDENCE_PACK_ITEMS ||
    input.claims.length > MAXIMUM_EVIDENCE_PACK_ITEMS
  ) {
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
  const sourceById = new Map<string, EvidenceSource>(
    input.evidenceSources.map((source) => [source.evidenceSourceId, source])
  );
  const claimById = new Map<string, Claim>(
    input.claims.map((claim) => [claim.claimId, claim])
  );
  if (
    sourceById.size !== input.evidenceSources.length ||
    claimById.size !== input.claims.length
  ) {
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
  for (const binding of sourceBindings) {
    const source = sourceById.get(binding.sourceId);
    if (source === undefined || source.importKey !== binding.sourceDigest) {
      return fail("EVIDENCE_PACK_INPUT_INVALID");
    }
  }
  for (const binding of claimBindings) {
    const claim = claimById.get(binding.sourceId);
    if (claim === undefined || claim.claimDigest !== binding.sourceDigest) {
      return fail("EVIDENCE_PACK_INPUT_INVALID");
    }
  }
}

async function assertCompileInputs(input: CompileEvidencePackInput): Promise<void> {
  await assertReconciliationImpactRevisionInvariant(input.assessment);
  await assertTwinProjectionRevisionInvariant(input.twin);
  if (
    input.assessment.projectId !== input.twin.projectId ||
    input.assessment.missionId !== input.twin.missionId
  ) {
    return fail("EVIDENCE_PACK_SCOPE_INVALID");
  }
  if (
    input.assessment.twinBinding.projectionId !== input.twin.projectionId ||
    input.assessment.twinBinding.revision !== input.twin.revision ||
    input.assessment.twinBinding.projectionDigest !== input.twin.projectionDigest
  ) {
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
  exactSourceInputs(input);

  const sourceById = new Map(input.evidenceSources.map((source) => [source.evidenceSourceId, source]));
  const claimById = new Map(input.claims.map((claim) => [claim.claimId, claim]));
  for (const source of input.evidenceSources) {
    await assertEvidenceSourceInvariant(source);
    if (
      source.projectId !== input.assessment.projectId ||
      source.missionId !== input.assessment.missionId
    ) {
      return fail("EVIDENCE_PACK_SCOPE_INVALID");
    }
  }
  for (const claim of input.claims) {
    const source = sourceById.get(claim.evidenceSourceId);
    if (source === undefined) return fail("EVIDENCE_PACK_INPUT_INVALID");
    const predecessor =
      claim.supersedesClaimId === undefined
        ? undefined
        : claimById.get(claim.supersedesClaimId);
    await assertClaimInvariant(claim, source, predecessor);
    if (
      claim.projectId !== input.assessment.projectId ||
      claim.missionId !== input.assessment.missionId
    ) {
      return fail("EVIDENCE_PACK_SCOPE_INVALID");
    }
  }

  const supersessionDependencies = input.assessment.reassessment.dependencies.filter(
    (dependency) => dependency.dependencyKey.startsWith("twin-supersession:")
  );
  if (
    supersessionDependencies.length !== input.claimSupersessions.length ||
    new Set(input.claimSupersessions.map((link) => link.claimSupersessionId)).size !==
      input.claimSupersessions.length
  ) {
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
  for (const link of input.claimSupersessions) {
    const successor = claimById.get(link.successorClaimId);
    const predecessor = claimById.get(link.predecessorClaimId);
    if (successor === undefined || predecessor === undefined) {
      return fail("EVIDENCE_PACK_INPUT_INVALID");
    }
    await assertClaimSupersessionInvariant(link, successor, predecessor);
    if (
      !supersessionDependencies.some(
        (dependency) =>
          dependency.dependencyKind === "RELATIONSHIP" &&
          dependency.dependencyKey ===
            `twin-supersession:${link.claimSupersessionId}`
      )
    ) {
      return fail("EVIDENCE_PACK_INPUT_INVALID");
    }
  }
}

async function compilerPolicyDigest(): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: EVIDENCE_PACK_COMPILER_POLICY_VERSION,
    selection:
      "exact-question-directed-minimized-source-claim-assessment-finding-and-path-projections",
    sourceContent: "omitted-use-claim-excerpts",
    redaction: TRANSFER_REDACTION_RULE_IDS,
    ordering: EVIDENCE_PACK_ITEM_KINDS,
    limits: {
      questionBytes: MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES,
      sourceItemBytes: MAXIMUM_EVIDENCE_PACK_SOURCE_ITEM_BYTES,
      itemBytes: MAXIMUM_EVIDENCE_PACK_ITEM_BYTES,
      items: MAXIMUM_EVIDENCE_PACK_ITEMS,
      serializedBytes: MAXIMUM_EVIDENCE_PACK_SERIALIZED_BYTES,
      tokenUpperBound: MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND,
      tokenUpperBoundMethod: "utf8-byte-count"
    }
  });
}

function packDocument(pack: Omit<EvidencePack, "packDigest">): unknown {
  return pack;
}

export function parseEvidencePackCitationId(value: unknown): EvidencePackCitationId {
  if (typeof value !== "string" || !CITATION_ID_PATTERN.test(value)) {
    throw new TypeError("A canonical evidence-pack citation ID is required.");
  }
  return value as EvidencePackCitationId;
}

export function evidencePackSerializedByteCount(pack: EvidencePack): number {
  return utf8Bytes(canonicalizeJson(pack));
}

export function evidencePackTokenUpperBound(pack: EvidencePack): number {
  return evidencePackSerializedByteCount(pack);
}

export async function compileEvidencePack(
  input: CompileEvidencePackInput
): Promise<EvidencePack> {
  try {
    await assertCompileInputs(input);
    const question = await redactQuestion(input.question);
    const counts: MutableRedactionCounts = { values: new Map() };
    addCounts(counts, question.counts);
    const selection = questionSelection(input);

    const items: EvidencePackItem[] = [];
    items.push(
      await createItem(
        "ASSESSMENT",
        `assessment:${input.assessment.revisionKey}:${input.assessment.revision}`,
        assessmentPayload(input.assessment),
        counts
      )
    );
    for (const source of selection.evidenceSources) {
      items.push(
        await createItem(
          "EVIDENCE_SOURCE",
          `evidence-source:${source.evidenceSourceId}`,
          sourcePayload(source),
          counts
        )
      );
    }
    for (const claim of selection.claims) {
      items.push(
        await createItem(
          "CLAIM",
          `claim:${claim.claimId}`,
          claimPayload(claim),
          counts
        )
      );
    }
    for (const link of selection.claimSupersessions) {
      items.push(
        await createItem(
          "CLAIM_SUPERSESSION",
          `claim-supersession:${link.claimSupersessionId}`,
          link,
          counts
        )
      );
    }
    for (const finding of selection.findings) {
      items.push(
        await createItem(
          "RECONCILIATION_FINDING",
          `finding:${finding.findingKind}:${finding.findingKey}`,
          findingPayload(finding),
          counts
        )
      );
    }
    for (const path of selection.paths) {
      items.push(
        await createItem(
          "IMPACT_PATH",
          `impact-path:${path.pathKey}`,
          impactPathPayload(path),
          counts
        )
      );
    }
    if (items.length > MAXIMUM_EVIDENCE_PACK_ITEMS) {
      return fail("EVIDENCE_PACK_LIMIT_EXCEEDED");
    }
    items.sort(compareItems);
    if (new Set(items.map((item) => `${item.itemKind}:${item.itemKey}`)).size !== items.length) {
      return fail("EVIDENCE_PACK_INPUT_INVALID");
    }
    const frozenItems = Object.freeze(items);
    const citations = Object.freeze(
      await Promise.all(frozenItems.map((item) => citationFor(item)))
    );
    const allowedCitationIds = Object.freeze(
      citations.map((citation) => citation.citationId)
    );
    const assessmentBinding = Object.freeze({
      revisionKey: input.assessment.revisionKey,
      revision: input.assessment.revision,
      resultDigest: input.assessment.resultDigest,
      twinProjectionId: input.twin.projectionId,
      twinRevision: input.twin.revision,
      twinProjectionDigest: input.twin.projectionDigest,
      targetSnapshotId: input.assessment.targetSnapshotId
    });
    const withoutDigest = Object.freeze({
      version: EVIDENCE_PACK_VERSION,
      digestVersion: EVIDENCE_PACK_DIGEST_VERSION,
      citationRegistryVersion: EVIDENCE_PACK_CITATION_REGISTRY_VERSION,
      compilerPolicyVersion: EVIDENCE_PACK_COMPILER_POLICY_VERSION,
      compilerPolicyDigest: await compilerPolicyDigest(),
      projectId: input.assessment.projectId,
      missionId: input.assessment.missionId,
      question: question.value,
      questionDigest: await canonicalJsonDigest({
        version: EVIDENCE_PACK_QUESTION_DIGEST_VERSION,
        question: question.value
      }),
      assessmentBinding,
      items: frozenItems,
      citations,
      allowedCitationIds,
      redaction: redactionSummary(counts.values)
    });
    const pack = Object.freeze({
      ...withoutDigest,
      packDigest: await canonicalJsonDigest(packDocument(withoutDigest))
    });
    await assertEvidencePackInvariant(pack);
    return pack;
  } catch (error) {
    if (error instanceof EvidencePackError) throw error;
    return fail("EVIDENCE_PACK_INPUT_INVALID");
  }
}

export async function assertEvidencePackInvariant(pack: EvidencePack): Promise<void> {
  try {
    if (
      pack.version !== EVIDENCE_PACK_VERSION ||
      pack.digestVersion !== EVIDENCE_PACK_DIGEST_VERSION ||
      pack.citationRegistryVersion !== EVIDENCE_PACK_CITATION_REGISTRY_VERSION ||
      pack.compilerPolicyVersion !== EVIDENCE_PACK_COMPILER_POLICY_VERSION ||
      pack.compilerPolicyDigest !== (await compilerPolicyDigest())
    ) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    parseStableId<"PROJECT">(pack.projectId);
    parseStableId<"MISSION">(pack.missionId);
    parseSha256Digest(pack.questionDigest);
    parseSha256Digest(pack.packDigest);
    parseSha256Digest(pack.assessmentBinding.revisionKey);
    parseSha256Digest(pack.assessmentBinding.resultDigest);
    parseSha256Digest(pack.assessmentBinding.twinProjectionDigest);
    parseStableId<"TWIN_PROJECTION">(pack.assessmentBinding.twinProjectionId);
    if (
      !Number.isSafeInteger(pack.assessmentBinding.revision) ||
      pack.assessmentBinding.revision < 1 ||
      !Number.isSafeInteger(pack.assessmentBinding.twinRevision) ||
      pack.assessmentBinding.twinRevision < 1 ||
      utf8Bytes(pack.question) > MAXIMUM_EVIDENCE_PACK_QUESTION_BYTES ||
      pack.question.trim().length < 1 ||
      pack.questionDigest !==
        (await canonicalJsonDigest({
          version: EVIDENCE_PACK_QUESTION_DIGEST_VERSION,
          question: pack.question
        }))
    ) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    const canonicalQuestion = await redactQuestion(pack.question);
    if (canonicalQuestion.value !== pack.question) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    if (
      !Array.isArray(pack.items) ||
      pack.items.length < 1 ||
      pack.items.length > MAXIMUM_EVIDENCE_PACK_ITEMS ||
      !Array.isArray(pack.citations) ||
      !Array.isArray(pack.allowedCitationIds) ||
      pack.citations.length !== pack.items.length ||
      pack.allowedCitationIds.length !== pack.items.length
    ) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    assertRedactionSummary(pack.redaction);
    const identities = new Set<string>();
    for (let index = 0; index < pack.items.length; index += 1) {
      const item = pack.items[index];
      const citation = pack.citations[index];
      if (item === undefined || citation === undefined) {
        return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
      }
      if (
        item.itemVersion !== EVIDENCE_PACK_ITEM_VERSION ||
        itemKindIndex(item.itemKind) < 0 ||
        item.itemKey.length < 1 ||
        item.itemKey.length > 256 ||
        (index > 0 && compareItems(pack.items[index - 1] as EvidencePackItem, item) >= 0)
      ) {
        return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
      }
      const identity = `${item.itemKind}:${item.itemKey}`;
      if (identities.has(identity)) return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
      identities.add(identity);
      const normalizedPayload = await redactPayload(item.payload);
      if (canonicalizeJson(normalizedPayload.value) !== canonicalizeJson(item.payload)) {
        return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
      }
      const expectedItemDigest = await canonicalJsonDigest({
        itemVersion: EVIDENCE_PACK_ITEM_VERSION,
        itemKind: item.itemKind,
        itemKey: item.itemKey,
        payload: item.payload
      });
      if (item.itemDigest !== expectedItemDigest) {
        return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
      }
      const expectedCitation = await citationFor(item);
      if (
        citation.citationId !== expectedCitation.citationId ||
        citation.itemDigest !== item.itemDigest ||
        canonicalizeJson(citation.locator) !== canonicalizeJson(expectedCitation.locator) ||
        pack.allowedCitationIds[index] !== citation.citationId
      ) {
        return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
      }
    }
    if (new Set(pack.allowedCitationIds).size !== pack.allowedCitationIds.length) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    const { packDigest: _packDigest, ...withoutDigest } = pack;
    if (pack.packDigest !== (await canonicalJsonDigest(packDocument(withoutDigest)))) {
      return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
    }
    if (
      evidencePackSerializedByteCount(pack) > MAXIMUM_EVIDENCE_PACK_SERIALIZED_BYTES ||
      evidencePackTokenUpperBound(pack) > MAXIMUM_EVIDENCE_PACK_TOKEN_UPPER_BOUND
    ) {
      return fail("EVIDENCE_PACK_LIMIT_EXCEEDED");
    }
  } catch (error) {
    if (error instanceof EvidencePackError) throw error;
    return fail("EVIDENCE_PACK_INTEGRITY_INVALID");
  }
}

export async function resolveEvidencePackCitation(
  pack: EvidencePack,
  citationId: unknown
): Promise<ResolvedEvidencePackCitation> {
  await assertEvidencePackInvariant(pack);
  let parsed: EvidencePackCitationId;
  try {
    parsed = parseEvidencePackCitationId(citationId);
  } catch {
    return fail("EVIDENCE_PACK_CITATION_NOT_FOUND");
  }
  const index = pack.allowedCitationIds.indexOf(parsed);
  const citation = pack.citations[index];
  const item = pack.items[index];
  if (index < 0 || citation === undefined || item === undefined) {
    return fail("EVIDENCE_PACK_CITATION_NOT_FOUND");
  }
  return Object.freeze({ citation, item });
}
