import { canonicalizeJson, type JsonValue } from "./canonical-json.js";
import { canonicalJsonDigest, type Sha256Digest } from "./digest.js";

export const EVIDENCE_IMPORT_FORMATS = ["MARKDOWN", "TEXT", "JSON"] as const;
export const EVIDENCE_NORMALIZATION_VERSION = "evidence-normalization.v1";
export const MAXIMUM_EVIDENCE_INPUT_BYTES = 262_144;
export const MAXIMUM_EVIDENCE_JSON_DEPTH = 64;
export const MAXIMUM_EVIDENCE_JSON_NODES = 10_000;

export type EvidenceImportFormat = (typeof EVIDENCE_IMPORT_FORMATS)[number];

export const EVIDENCE_IMPORT_ERROR_CODES = [
  "EVIDENCE_FORMAT_UNSUPPORTED",
  "EVIDENCE_CONTENT_TYPE_INVALID",
  "EVIDENCE_CONTENT_SIGNATURE_DENIED",
  "EVIDENCE_EMPTY",
  "EVIDENCE_INPUT_TOO_LARGE",
  "EVIDENCE_UTF8_INVALID",
  "EVIDENCE_CONTROL_CHARACTER_INVALID",
  "EVIDENCE_JSON_INVALID",
  "EVIDENCE_JSON_TYPE_INVALID",
  "EVIDENCE_JSON_LIMIT_EXCEEDED",
  "EVIDENCE_NORMALIZED_TOO_LARGE",
  "EVIDENCE_PREPARED_INVALID"
] as const;

export type EvidenceImportErrorCode =
  (typeof EVIDENCE_IMPORT_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<EvidenceImportErrorCode, string>> =
  Object.freeze({
    EVIDENCE_FORMAT_UNSUPPORTED: "Evidence format is not supported.",
    EVIDENCE_CONTENT_TYPE_INVALID: "Evidence content type is invalid.",
    EVIDENCE_CONTENT_SIGNATURE_DENIED:
      "Evidence content signature is not supported.",
    EVIDENCE_EMPTY: "Evidence content is empty.",
    EVIDENCE_INPUT_TOO_LARGE: "Evidence content exceeds the input limit.",
    EVIDENCE_UTF8_INVALID: "Evidence content is not valid UTF-8.",
    EVIDENCE_CONTROL_CHARACTER_INVALID:
      "Evidence content contains a disallowed control character.",
    EVIDENCE_JSON_INVALID: "JSON evidence is malformed or ambiguous.",
    EVIDENCE_JSON_TYPE_INVALID:
      "JSON evidence must be an object or an array.",
    EVIDENCE_JSON_LIMIT_EXCEEDED:
      "JSON evidence exceeds the structural limit.",
    EVIDENCE_NORMALIZED_TOO_LARGE:
      "Normalized evidence exceeds the output limit.",
    EVIDENCE_PREPARED_INVALID: "Prepared evidence is invalid."
  });

export class EvidenceImportError extends Error {
  readonly code: EvidenceImportErrorCode;

  constructor(code: EvidenceImportErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "EvidenceImportError";
    this.code = code;
  }
}

export const REDACTION_RULE_IDS = [
  "JSON_SECRET_KEY",
  "PRIVATE_KEY",
  "OPENAI_TOKEN",
  "GITHUB_TOKEN",
  "SERVICE_TOKEN",
  "SLACK_TOKEN",
  "AWS_ACCESS_KEY",
  "JWT",
  "AUTHORIZATION",
  "URI_CREDENTIAL",
  "GENERIC_SECRET_ASSIGNMENT"
] as const;

export type RedactionRuleId = (typeof REDACTION_RULE_IDS)[number];

export interface RedactionRuleCount {
  readonly rule: RedactionRuleId;
  readonly replacements: number;
}

export interface EvidenceRedactionSummary {
  readonly applied: boolean;
  readonly totalReplacements: number;
  readonly ruleCounts: readonly RedactionRuleCount[];
}

export interface PrepareEvidenceImportInput {
  readonly format: EvidenceImportFormat;
  readonly content: Uint8Array;
}

export interface PreparedEvidenceImport {
  readonly normalizationVersion: typeof EVIDENCE_NORMALIZATION_VERSION;
  readonly format: EvidenceImportFormat;
  readonly inputByteCount: number;
  readonly normalizedByteCount: number;
  readonly normalizedContent: string;
  readonly contentDigest: Sha256Digest;
  readonly redaction: EvidenceRedactionSummary;
}

interface MutableRedactionState {
  readonly counts: Map<RedactionRuleId, number>;
}

interface TextRedactionRule {
  readonly id: Exclude<RedactionRuleId, "JSON_SECRET_KEY">;
  readonly pattern: RegExp;
  readonly replace: (...matches: string[]) => string;
}

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const UTF8_ENCODER = new TextEncoder();
const DISALLOWED_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const DENIED_CONTENT_SIGNATURES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0x25, 0x50, 0x44, 0x46, 0x2d]),
  Object.freeze([0x50, 0x4b, 0x03, 0x04]),
  Object.freeze([0x50, 0x4b, 0x05, 0x06]),
  Object.freeze([0x50, 0x4b, 0x07, 0x08]),
  Object.freeze([0x89, 0x50, 0x4e, 0x47]),
  Object.freeze([0xff, 0xd8, 0xff]),
  Object.freeze([0x1f, 0x8b])
]);

const TEXT_REDACTION_RULES: readonly TextRedactionRule[] = Object.freeze([
  {
    id: "PRIVATE_KEY",
    pattern:
      /-----BEGIN ((?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY)-----[\s\S]*?-----END \1-----/gu,
    replace: () => "[REDACTED:PRIVATE_KEY]"
  },
  {
    id: "OPENAI_TOKEN",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/gu,
    replace: () => "[REDACTED:OPENAI_TOKEN]"
  },
  {
    id: "GITHUB_TOKEN",
    pattern: /\bgh[opusr]_[A-Za-z0-9]{20,}\b/gu,
    replace: () => "[REDACTED:GITHUB_TOKEN]"
  },
  {
    id: "SERVICE_TOKEN",
    pattern:
      /\b(?:npm_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|[sr]k_live_[A-Za-z0-9]{16,})\b/gu,
    replace: () => "[REDACTED:SERVICE_TOKEN]"
  },
  {
    id: "SLACK_TOKEN",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/gu,
    replace: () => "[REDACTED:SLACK_TOKEN]"
  },
  {
    id: "AWS_ACCESS_KEY",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/gu,
    replace: () => "[REDACTED:AWS_ACCESS_KEY]"
  },
  {
    id: "JWT",
    pattern:
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu,
    replace: () => "[REDACTED:JWT]"
  },
  {
    id: "AUTHORIZATION",
    pattern:
      /\b(authorization\s*:\s*)(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]{4,}/giu,
    replace: (_match, prefix) => `${prefix}[REDACTED:AUTHORIZATION]`
  },
  {
    id: "AUTHORIZATION",
    pattern: /\b(Bearer\s+)[A-Za-z0-9+/_=.-]{12,}/giu,
    replace: (_match, prefix) => `${prefix}[REDACTED:AUTHORIZATION]`
  },
  {
    id: "URI_CREDENTIAL",
    pattern: /\b(https?:\/\/)[^/\s:@]+:[^/\s@]+@/giu,
    replace: (_match, scheme) => `${scheme}[REDACTED:URI_CREDENTIAL]@`
  },
  {
    id: "GENERIC_SECRET_ASSIGNMENT",
    pattern:
      /\b(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret[_-]?access[_-]?key|secret|token)(\s*[:=]\s*)(["'])([^\r\n]*?)\3/giu,
    replace: (_match, key, separator, quote) =>
      `${key}${separator}${quote}[REDACTED:GENERIC_SECRET_ASSIGNMENT]${quote}`
  },
  {
    id: "GENERIC_SECRET_ASSIGNMENT",
    pattern:
      /\b(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret[_-]?access[_-]?key|secret|token)(\s*[:=]\s*)([^\s,;]{4,})/giu,
    replace: (_match, key, separator) =>
      `${key}${separator}[REDACTED:GENERIC_SECRET_ASSIGNMENT]`
  }
]);

const SECRET_JSON_KEYS = new Set([
  "apikey",
  "accesstoken",
  "authtoken",
  "authorization",
  "clientsecret",
  "credential",
  "credentials",
  "password",
  "passwd",
  "privatekey",
  "secret",
  "secretaccesskey",
  "token"
]);

function increment(
  state: MutableRedactionState,
  rule: RedactionRuleId,
  count = 1
): void {
  state.counts.set(rule, (state.counts.get(rule) ?? 0) + count);
}

function redactText(value: string, state: MutableRedactionState): string {
  let redacted = value;
  for (const rule of TEXT_REDACTION_RULES) {
    let replacements = 0;
    redacted = redacted.replace(rule.pattern, (...matches: string[]) => {
      replacements += 1;
      return rule.replace(...matches);
    });
    if (replacements > 0) increment(state, rule.id, replacements);
  }
  return redacted;
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function normalizeString(value: string): string {
  if (hasUnpairedSurrogate(value)) {
    throw new EvidenceImportError("EVIDENCE_UTF8_INVALID");
  }
  const normalized = value.replace(/\r\n?/gu, "\n").normalize("NFC");
  if (DISALLOWED_CONTROL_PATTERN.test(normalized)) {
    throw new EvidenceImportError("EVIDENCE_CONTROL_CHARACTER_INVALID");
  }
  return normalized;
}

function assertFormat(value: unknown): asserts value is EvidenceImportFormat {
  if (!EVIDENCE_IMPORT_FORMATS.some((format) => format === value)) {
    throw new EvidenceImportError("EVIDENCE_FORMAT_UNSUPPORTED");
  }
}

function hasSignatureAt(
  content: Uint8Array,
  signature: readonly number[],
  offset: number
): boolean {
  return signature.every((byte, index) => content[offset + index] === byte);
}

function assertContentSignature(content: Uint8Array): void {
  const offset =
    content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf ? 3 : 0;
  if (
    DENIED_CONTENT_SIGNATURES.some((signature) =>
      hasSignatureAt(content, signature, offset)
    )
  ) {
    throw new EvidenceImportError("EVIDENCE_CONTENT_SIGNATURE_DENIED");
  }
}

function decodeInput(content: unknown): { readonly bytes: number; readonly text: string } {
  if (!(content instanceof Uint8Array)) {
    throw new EvidenceImportError("EVIDENCE_CONTENT_TYPE_INVALID");
  }
  if (content.byteLength === 0) {
    throw new EvidenceImportError("EVIDENCE_EMPTY");
  }
  if (content.byteLength > MAXIMUM_EVIDENCE_INPUT_BYTES) {
    throw new EvidenceImportError("EVIDENCE_INPUT_TOO_LARGE");
  }
  assertContentSignature(content);
  let decoded: string;
  try {
    decoded = UTF8_DECODER.decode(content);
  } catch {
    throw new EvidenceImportError("EVIDENCE_UTF8_INVALID");
  }
  const withoutBom = decoded.startsWith("\uFEFF") ? decoded.slice(1) : decoded;
  const normalized = normalizeString(withoutBom);
  if (normalized.trim().length === 0) {
    throw new EvidenceImportError("EVIDENCE_EMPTY");
  }
  return { bytes: content.byteLength, text: normalized };
}

class JsonStructureScanner {
  readonly #source: string;
  #index = 0;
  #nodes = 0;

  constructor(source: string) {
    this.#source = source;
  }

  scan(): void {
    this.#skipWhitespace();
    this.#value(0);
    this.#skipWhitespace();
    if (this.#index !== this.#source.length) this.#invalid();
  }

  #invalid(): never {
    throw new EvidenceImportError("EVIDENCE_JSON_INVALID");
  }

  #limit(): never {
    throw new EvidenceImportError("EVIDENCE_JSON_LIMIT_EXCEEDED");
  }

  #skipWhitespace(): void {
    while (
      this.#index < this.#source.length &&
      /[\u0009\u000a\u000d\u0020]/u.test(this.#source[this.#index] ?? "")
    ) {
      this.#index += 1;
    }
  }

  #value(depth: number): void {
    if (depth > MAXIMUM_EVIDENCE_JSON_DEPTH) this.#limit();
    this.#nodes += 1;
    if (this.#nodes > MAXIMUM_EVIDENCE_JSON_NODES) this.#limit();
    const current = this.#source[this.#index];
    switch (current) {
      case "{":
        this.#object(depth + 1);
        return;
      case "[":
        this.#array(depth + 1);
        return;
      case '"':
        this.#string();
        return;
      case "t":
        this.#literal("true");
        return;
      case "f":
        this.#literal("false");
        return;
      case "n":
        this.#literal("null");
        return;
      default:
        this.#number();
    }
  }

  #object(depth: number): void {
    this.#index += 1;
    this.#skipWhitespace();
    if (this.#source[this.#index] === "}") {
      this.#index += 1;
      return;
    }
    const keys = new Set<string>();
    for (;;) {
      if (this.#source[this.#index] !== '"') this.#invalid();
      const key = this.#string().normalize("NFC");
      if (keys.has(key)) this.#invalid();
      keys.add(key);
      this.#skipWhitespace();
      if (this.#source[this.#index] !== ":") this.#invalid();
      this.#index += 1;
      this.#skipWhitespace();
      this.#value(depth);
      this.#skipWhitespace();
      const delimiter = this.#source[this.#index];
      if (delimiter === "}") {
        this.#index += 1;
        return;
      }
      if (delimiter !== ",") this.#invalid();
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #array(depth: number): void {
    this.#index += 1;
    this.#skipWhitespace();
    if (this.#source[this.#index] === "]") {
      this.#index += 1;
      return;
    }
    for (;;) {
      this.#value(depth);
      this.#skipWhitespace();
      const delimiter = this.#source[this.#index];
      if (delimiter === "]") {
        this.#index += 1;
        return;
      }
      if (delimiter !== ",") this.#invalid();
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #string(): string {
    const start = this.#index;
    this.#index += 1;
    for (;;) {
      const current = this.#source[this.#index];
      if (current === undefined) this.#invalid();
      if (current === '"') {
        this.#index += 1;
        try {
          const parsed = JSON.parse(this.#source.slice(start, this.#index));
          if (typeof parsed !== "string" || hasUnpairedSurrogate(parsed)) {
            this.#invalid();
          }
          return parsed;
        } catch (error) {
          if (error instanceof EvidenceImportError) throw error;
          this.#invalid();
        }
      }
      if (current === "\\") {
        this.#index += 1;
        const escaped = this.#source[this.#index];
        if (escaped === "u") {
          const hex = this.#source.slice(this.#index + 1, this.#index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(hex)) this.#invalid();
          this.#index += 5;
          continue;
        }
        if (escaped === undefined || !/["\\/bfnrt]/u.test(escaped)) {
          this.#invalid();
        }
        this.#index += 1;
        continue;
      }
      if (current.charCodeAt(0) < 0x20) this.#invalid();
      this.#index += 1;
    }
  }

  #literal(expected: string): void {
    if (this.#source.slice(this.#index, this.#index + expected.length) !== expected) {
      this.#invalid();
    }
    this.#index += expected.length;
  }

  #number(): void {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(
      this.#source.slice(this.#index)
    );
    if (match === null) this.#invalid();
    this.#index += match[0].length;
  }
}

function normalizedJsonValue(
  value: unknown,
  state: MutableRedactionState
): JsonValue {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new EvidenceImportError("EVIDENCE_JSON_INVALID");
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return redactText(normalizeString(value), state);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizedJsonValue(item, state));
  }
  if (typeof value === "object") {
    const output: Record<string, JsonValue> = Object.create(null);
    for (const [rawKey, rawValue] of Object.entries(value)) {
      const key = normalizeString(rawKey);
      if (Object.hasOwn(output, key)) {
        throw new EvidenceImportError("EVIDENCE_JSON_INVALID");
      }
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/gu, "");
      if (SECRET_JSON_KEYS.has(normalizedKey)) {
        output[key] = "[REDACTED:JSON_SECRET_KEY]";
        increment(state, "JSON_SECRET_KEY");
      } else {
        output[key] = normalizedJsonValue(rawValue, state);
      }
    }
    return output;
  }
  throw new EvidenceImportError("EVIDENCE_JSON_INVALID");
}

function normalizeJson(value: string, state: MutableRedactionState): string {
  new JsonStructureScanner(value).scan();
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new EvidenceImportError("EVIDENCE_JSON_INVALID");
  }
  if (parsed === null || (typeof parsed !== "object" && !Array.isArray(parsed))) {
    throw new EvidenceImportError("EVIDENCE_JSON_TYPE_INVALID");
  }
  return canonicalizeJson(normalizedJsonValue(parsed, state));
}

function redactionSummary(state: MutableRedactionState): EvidenceRedactionSummary {
  const ruleCounts = REDACTION_RULE_IDS.flatMap((rule) => {
    const replacements = state.counts.get(rule) ?? 0;
    return replacements === 0
      ? []
      : [Object.freeze({ rule, replacements }) satisfies RedactionRuleCount];
  });
  const totalReplacements = ruleCounts.reduce(
    (total, current) => total + current.replacements,
    0
  );
  return Object.freeze({
    applied: totalReplacements > 0,
    totalReplacements,
    ruleCounts: Object.freeze(ruleCounts)
  });
}

function assertRedactionSummary(
  value: unknown
): asserts value is EvidenceRedactionSummary {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Invalid redaction summary.");
  }
  const candidate = value as Partial<EvidenceRedactionSummary>;
  if (
    typeof candidate.applied !== "boolean" ||
    !Number.isSafeInteger(candidate.totalReplacements) ||
    (candidate.totalReplacements as number) < 0 ||
    !Array.isArray(candidate.ruleCounts)
  ) {
    throw new TypeError("Invalid redaction summary.");
  }

  let total = 0;
  let priorRuleIndex = -1;
  for (const entry of candidate.ruleCounts) {
    if (typeof entry !== "object" || entry === null) {
      throw new TypeError("Invalid redaction summary.");
    }
    const parsed = entry as Partial<RedactionRuleCount>;
    const ruleIndex = REDACTION_RULE_IDS.findIndex(
      (rule) => rule === parsed.rule
    );
    if (
      ruleIndex <= priorRuleIndex ||
      !Number.isSafeInteger(parsed.replacements) ||
      (parsed.replacements as number) < 1
    ) {
      throw new TypeError("Invalid redaction summary.");
    }
    priorRuleIndex = ruleIndex;
    total += parsed.replacements as number;
    if (!Number.isSafeInteger(total)) {
      throw new TypeError("Invalid redaction summary.");
    }
  }

  if (
    total !== candidate.totalReplacements ||
    candidate.applied !== (total > 0)
  ) {
    throw new TypeError("Invalid redaction summary.");
  }
}

export async function assertPreparedEvidenceImportInvariant(
  value: unknown
): Promise<void> {
  try {
    if (typeof value !== "object" || value === null) {
      throw new TypeError("Invalid prepared evidence.");
    }
    const candidate = value as Partial<PreparedEvidenceImport>;
    assertFormat(candidate.format);
    if (
      candidate.normalizationVersion !== EVIDENCE_NORMALIZATION_VERSION ||
      !Number.isSafeInteger(candidate.inputByteCount) ||
      (candidate.inputByteCount as number) < 1 ||
      (candidate.inputByteCount as number) > MAXIMUM_EVIDENCE_INPUT_BYTES ||
      typeof candidate.normalizedContent !== "string" ||
      candidate.normalizedContent.trim().length === 0 ||
      !Number.isSafeInteger(candidate.normalizedByteCount) ||
      (candidate.normalizedByteCount as number) < 1 ||
      (candidate.normalizedByteCount as number) > MAXIMUM_EVIDENCE_INPUT_BYTES ||
      typeof candidate.contentDigest !== "string"
    ) {
      throw new TypeError("Invalid prepared evidence.");
    }

    const byteCount = UTF8_ENCODER.encode(candidate.normalizedContent).byteLength;
    if (byteCount !== candidate.normalizedByteCount) {
      throw new TypeError("Invalid prepared evidence.");
    }
    const state: MutableRedactionState = { counts: new Map() };
    const canonicalContent =
      candidate.format === "JSON"
        ? normalizeJson(candidate.normalizedContent, state)
        : redactText(normalizeString(candidate.normalizedContent), state);
    if (canonicalContent !== candidate.normalizedContent) {
      throw new TypeError("Invalid prepared evidence.");
    }
    assertRedactionSummary(candidate.redaction);

    const expectedDigest = await canonicalJsonDigest({
      normalizationVersion: EVIDENCE_NORMALIZATION_VERSION,
      format: candidate.format,
      normalizedContent: candidate.normalizedContent
    });
    if (candidate.contentDigest !== expectedDigest) {
      throw new TypeError("Invalid prepared evidence.");
    }
  } catch {
    throw new EvidenceImportError("EVIDENCE_PREPARED_INVALID");
  }
}

export async function prepareEvidenceImport(
  input: PrepareEvidenceImportInput
): Promise<PreparedEvidenceImport> {
  assertFormat(input.format);
  const decoded = decodeInput(input.content);
  const state: MutableRedactionState = { counts: new Map() };
  const normalizedContent =
    input.format === "JSON"
      ? normalizeJson(decoded.text, state)
      : redactText(decoded.text, state);
  const normalizedByteCount = UTF8_ENCODER.encode(normalizedContent).byteLength;
  if (normalizedByteCount > MAXIMUM_EVIDENCE_INPUT_BYTES) {
    throw new EvidenceImportError("EVIDENCE_NORMALIZED_TOO_LARGE");
  }
  const contentDigest = await canonicalJsonDigest({
    normalizationVersion: EVIDENCE_NORMALIZATION_VERSION,
    format: input.format,
    normalizedContent
  });
  return Object.freeze({
    normalizationVersion: EVIDENCE_NORMALIZATION_VERSION,
    format: input.format,
    inputByteCount: decoded.bytes,
    normalizedByteCount,
    normalizedContent,
    contentDigest,
    redaction: redactionSummary(state)
  });
}
