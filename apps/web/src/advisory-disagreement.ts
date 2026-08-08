export const IMPORTED_ADVISORY_OUTPUT_VERSION =
  "imported-advisory-output.v1" as const;
export const ADVISORY_DISAGREEMENT_VERSION =
  "advisory-disagreement.v1" as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const CITATION_PATTERN = /^cite:[0-9a-f]{64}$/u;
const ATTRIBUTION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,63}$/u;
const OUTPUT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const PRIVATE_PATH_PATTERN =
  /(?:\b[A-Za-z]:[\\/]|\\\\[^\\\s]+[\\/][^\\\s]+|\/(?:Users|home|private|var\/folders|tmp)\/)/u;
const AUTHORITY_CLAIM_PATTERN =
  /\b(?:release\s+(?:is\s+)?approved|approve(?:d|s)?\s+(?:the\s+)?release|waive(?:d|s)?\s+(?:the\s+)?(?:finding|evidence|validation)|issue(?:d|s)?\s+(?:a\s+)?release passport)\b/iu;
const MAX_IMPORT_BYTES = 65_536;
const MAX_OUTPUTS = 4;
const MAX_RECOMMENDATIONS = 32;
const MAX_RECOMMENDATION_BYTES = 2_048;
const MAX_CITATIONS_PER_RECOMMENDATION = 16;

type JsonRecord = Readonly<Record<string, unknown>>;

export interface AdvisoryRecommendationImport {
  readonly text: string;
  readonly citationIds: readonly string[];
}

export interface ImportedAdvisoryOutput {
  readonly importVersion: typeof IMPORTED_ADVISORY_OUTPUT_VERSION;
  readonly attribution: {
    readonly agentLabel: string;
    readonly providerId: string;
    readonly modelId: string;
    readonly outputId: string;
  };
  readonly binding: {
    readonly missionId: string;
    readonly questionDigest: string;
    readonly evidencePackDigest: string;
  };
  readonly authority: "ADVISORY_ONLY";
  readonly recommendations: readonly AdvisoryRecommendationImport[];
}

export interface AdvisoryImportScope {
  readonly missionId: string;
  readonly questionDigest: string;
  readonly evidencePackDigest: string;
  readonly allowedCitationIds: ReadonlySet<string>;
}

export type AdvisoryDifferenceKind =
  | "ALIGNED_EXACTLY"
  | "CITATION_VARIANCE"
  | "OUTPUT_ONLY";

export interface AdvisoryDifference {
  readonly kind: AdvisoryDifferenceKind;
  readonly text: string;
  readonly occurrences: readonly {
    readonly outputId: string;
    readonly agentLabel: string;
    readonly citationIds: readonly string[];
  }[];
}

export interface AdvisoryDisagreementComparison {
  readonly version: typeof ADVISORY_DISAGREEMENT_VERSION;
  readonly outputCount: number;
  readonly alignedCount: number;
  readonly citationVarianceCount: number;
  readonly outputOnlyCount: number;
  readonly differences: readonly AdvisoryDifference[];
  readonly authority: {
    readonly advisoryOnly: true;
    readonly semanticContradictionInferred: false;
    readonly canonicalStateChanged: false;
    readonly readinessAuthority: false;
    readonly releasePassportAuthority: false;
    readonly liveOrchestration: false;
    readonly externalCallMade: false;
  };
}

export class AdvisoryImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdvisoryImportError";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: JsonRecord,
  required: readonly string[]
): boolean {
  const allowed = new Set(required);
  const keys = Object.keys(value);
  return keys.length === required.length &&
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key));
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function invalid(message: string): never {
  throw new AdvisoryImportError(message);
}

function canonicalText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

function parseRecommendation(
  value: unknown,
  scope: AdvisoryImportScope
): AdvisoryRecommendationImport {
  if (!isRecord(value) || !hasOnlyKeys(value, ["text", "citationIds"])) {
    return invalid("Each recommendation must use only text and citationIds.");
  }
  if (
    typeof value.text !== "string" ||
    value.text.trim().length === 0 ||
    byteLength(value.text) > MAX_RECOMMENDATION_BYTES ||
    PRIVATE_PATH_PATTERN.test(value.text) ||
    AUTHORITY_CLAIM_PATTERN.test(value.text)
  ) {
    return invalid(
      "Recommendation text is empty, oversized, private-path shaped, or claims forbidden release authority."
    );
  }
  if (
    !Array.isArray(value.citationIds) ||
    value.citationIds.length === 0 ||
    value.citationIds.length > MAX_CITATIONS_PER_RECOMMENDATION ||
    !value.citationIds.every(
      (citationId) =>
        typeof citationId === "string" &&
        CITATION_PATTERN.test(citationId) &&
        scope.allowedCitationIds.has(citationId)
    ) ||
    new Set(value.citationIds).size !== value.citationIds.length
  ) {
    return invalid("Every recommendation requires unique allowlisted citations.");
  }
  return Object.freeze({
    text: value.text.trim().replace(/\s+/gu, " "),
    citationIds: Object.freeze([...value.citationIds] as string[])
  });
}

function parseOutput(
  value: unknown,
  scope: AdvisoryImportScope
): ImportedAdvisoryOutput {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "importVersion",
      "attribution",
      "binding",
      "authority",
      "recommendations"
    ]) ||
    value.importVersion !== IMPORTED_ADVISORY_OUTPUT_VERSION ||
    value.authority !== "ADVISORY_ONLY"
  ) {
    return invalid("Each imported output must match imported-advisory-output.v1 and remain ADVISORY_ONLY.");
  }
  if (!isRecord(value.attribution)) {
    return invalid("Every output requires bounded agent, provider, model, and output attribution.");
  }
  const attribution = value.attribution;
  if (
    !hasOnlyKeys(attribution, [
      "agentLabel",
      "providerId",
      "modelId",
      "outputId"
    ]) ||
    !["agentLabel", "providerId", "modelId"].every(
      (key) =>
        typeof attribution[key] === "string" &&
        ATTRIBUTION_PATTERN.test(attribution[key] as string)
    ) ||
    typeof attribution.outputId !== "string" ||
    !OUTPUT_ID_PATTERN.test(attribution.outputId)
  ) {
    return invalid("Every output requires bounded agent, provider, model, and output attribution.");
  }
  if (
    !isRecord(value.binding) ||
    !hasOnlyKeys(value.binding, [
      "missionId",
      "questionDigest",
      "evidencePackDigest"
    ]) ||
    typeof value.binding.missionId !== "string" ||
    !UUID_PATTERN.test(value.binding.missionId) ||
    typeof value.binding.questionDigest !== "string" ||
    !DIGEST_PATTERN.test(value.binding.questionDigest) ||
    typeof value.binding.evidencePackDigest !== "string" ||
    !DIGEST_PATTERN.test(value.binding.evidencePackDigest) ||
    value.binding.missionId !== scope.missionId ||
    value.binding.questionDigest !== scope.questionDigest ||
    value.binding.evidencePackDigest !== scope.evidencePackDigest
  ) {
    return invalid("Imported output scope does not match this exact Mission, question, and evidence pack.");
  }
  if (
    !Array.isArray(value.recommendations) ||
    value.recommendations.length === 0 ||
    value.recommendations.length > MAX_RECOMMENDATIONS
  ) {
    return invalid(`Each output must contain 1-${MAX_RECOMMENDATIONS} recommendations.`);
  }
  const recommendations = value.recommendations.map((entry) =>
    parseRecommendation(entry, scope)
  );
  if (
    new Set(recommendations.map((entry) => canonicalText(entry.text))).size !==
    recommendations.length
  ) {
    return invalid("One output cannot repeat the same normalized recommendation.");
  }
  return Object.freeze({
    importVersion: IMPORTED_ADVISORY_OUTPUT_VERSION,
    attribution: Object.freeze({
      agentLabel: attribution.agentLabel as string,
      providerId: attribution.providerId as string,
      modelId: attribution.modelId as string,
      outputId: attribution.outputId as string
    }),
    binding: Object.freeze({
      missionId: value.binding.missionId as string,
      questionDigest: value.binding.questionDigest as string,
      evidencePackDigest: value.binding.evidencePackDigest as string
    }),
    authority: "ADVISORY_ONLY",
    recommendations: Object.freeze(recommendations)
  });
}

export function parseImportedAdvisoryOutputs(
  rawJson: string,
  scope: AdvisoryImportScope
): readonly ImportedAdvisoryOutput[] {
  if (rawJson.trim().length === 0 || byteLength(rawJson) > MAX_IMPORT_BYTES) {
    return invalid("Import JSON is empty or exceeds the 65,536-byte browser-local limit.");
  }
  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    return invalid("Import JSON is not valid JSON.");
  }
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_OUTPUTS) {
    return invalid(`Import an array containing 2-${MAX_OUTPUTS} advisory outputs.`);
  }
  const outputs = value.map((entry) => parseOutput(entry, scope));
  if (
    new Set(outputs.map((output) => output.attribution.outputId)).size !==
    outputs.length
  ) {
    return invalid("Imported outputId values must be unique.");
  }
  return Object.freeze(outputs);
}

export function compareImportedAdvisoryOutputs(
  outputs: readonly ImportedAdvisoryOutput[]
): AdvisoryDisagreementComparison {
  if (outputs.length < 2 || outputs.length > MAX_OUTPUTS) {
    return invalid(`Comparison requires 2-${MAX_OUTPUTS} imported outputs.`);
  }
  const byText = new Map<
    string,
    { text: string; occurrences: AdvisoryDifference["occurrences"] }
  >();
  for (const output of outputs) {
    for (const recommendation of output.recommendations) {
      const key = canonicalText(recommendation.text);
      const prior = byText.get(key);
      const occurrence = Object.freeze({
        outputId: output.attribution.outputId,
        agentLabel: output.attribution.agentLabel,
        citationIds: Object.freeze([...recommendation.citationIds])
      });
      byText.set(key, {
        text: prior?.text ?? recommendation.text,
        occurrences: Object.freeze([...(prior?.occurrences ?? []), occurrence])
      });
    }
  }

  const differences = Object.freeze(
    [...byText.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "en-US"))
      .map(([, entry]): AdvisoryDifference => {
        const citationSets = new Set(
          entry.occurrences.map((occurrence) =>
            [...occurrence.citationIds].sort().join("|")
          )
        );
        const kind: AdvisoryDifferenceKind =
          entry.occurrences.length !== outputs.length
            ? "OUTPUT_ONLY"
            : citationSets.size > 1
              ? "CITATION_VARIANCE"
              : "ALIGNED_EXACTLY";
        return Object.freeze({ kind, text: entry.text, occurrences: entry.occurrences });
      })
  );
  return Object.freeze({
    version: ADVISORY_DISAGREEMENT_VERSION,
    outputCount: outputs.length,
    alignedCount: differences.filter((entry) => entry.kind === "ALIGNED_EXACTLY").length,
    citationVarianceCount: differences.filter(
      (entry) => entry.kind === "CITATION_VARIANCE"
    ).length,
    outputOnlyCount: differences.filter((entry) => entry.kind === "OUTPUT_ONLY").length,
    differences,
    authority: Object.freeze({
      advisoryOnly: true,
      semanticContradictionInferred: false,
      canonicalStateChanged: false,
      readinessAuthority: false,
      releasePassportAuthority: false,
      liveOrchestration: false,
      externalCallMade: false
    })
  });
}
