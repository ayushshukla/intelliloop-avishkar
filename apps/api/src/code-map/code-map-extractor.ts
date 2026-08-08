import { createHash } from "node:crypto";
import { posix } from "node:path";
import { performance } from "node:perf_hooks";

import {
  canonicalJsonDigest,
  parseSha256Digest,
  type MissionId,
  type ProjectId,
  type Sha256Digest
} from "@intelliloop/domain";
import * as ts from "typescript";

import {
  CODE_MAP_ALLOWED_EXTENSIONS,
  CODE_MAP_SCAN_LIMITS,
  CODE_MAP_SCAN_VERSION,
  type CodeMapScannedSourceFile,
  type CodeMapSkippedDirectory,
  type CodeMapSkippedExtension,
  type CodeMapSourceExtension,
  type CodeMapSourceScan
} from "./code-map-scanner.js";
import type { RepositoryRegistrationId } from "../projects/repository-registration.js";

export const CODE_MAP_EXTRACTION_VERSION = "code-map-extraction.v1" as const;

export const CODE_MAP_EXTRACTION_LIMITS = Object.freeze({
  maximumAstNodes: 250_000,
  maximumDiagnostics: 100,
  maximumRecords: 20_000,
  maximumMilliseconds: 5_000,
  maximumSpecifierCharacters: 512,
  maximumRouteCharacters: 512,
  maximumNameCharacters: 256
});

export const CODE_MAP_EXTRACTION_ERROR_CODES = [
  "CODE_MAP_EXTRACTION_INPUT_INVALID",
  "CODE_MAP_EXTRACTION_NODE_LIMIT_EXCEEDED",
  "CODE_MAP_EXTRACTION_RECORD_LIMIT_EXCEEDED",
  "CODE_MAP_EXTRACTION_TIMEOUT",
  "CODE_MAP_EXTRACTION_FAILED"
] as const;

export type CodeMapExtractionErrorCode =
  (typeof CODE_MAP_EXTRACTION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<CodeMapExtractionErrorCode, string>> =
  Object.freeze({
    CODE_MAP_EXTRACTION_INPUT_INVALID:
      "Code-map extraction input is invalid.",
    CODE_MAP_EXTRACTION_NODE_LIMIT_EXCEEDED:
      "Code-map extraction exceeded its syntax node limit.",
    CODE_MAP_EXTRACTION_RECORD_LIMIT_EXCEEDED:
      "Code-map extraction exceeded its record limit.",
    CODE_MAP_EXTRACTION_TIMEOUT:
      "Code-map extraction exceeded its time limit.",
    CODE_MAP_EXTRACTION_FAILED: "Code-map extraction could not be completed."
  });

export class CodeMapExtractionError extends Error {
  readonly code: CodeMapExtractionErrorCode;

  constructor(code: CodeMapExtractionErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "CodeMapExtractionError";
    this.code = code;
  }
}

export interface CodeMapExtractedFile {
  readonly sourcePath: string;
  readonly extension: CodeMapSourceExtension;
  readonly byteLength: number;
  readonly contentDigest: Sha256Digest;
  readonly fileKind: "SOURCE" | "JSON" | "MANIFEST" | "TEST";
  readonly parseStatus: "PARSED" | "SYNTAX_ERROR";
}

export interface CodeMapManifestDependency {
  readonly name: string;
  readonly declaredRange: string | null;
  readonly rangeDisposition: "RECORDED" | "OMITTED_UNSAFE";
}

export interface CodeMapManifestDependencyGroup {
  readonly kind:
    | "DEPENDENCY"
    | "DEV_DEPENDENCY"
    | "OPTIONAL_DEPENDENCY"
    | "PEER_DEPENDENCY";
  readonly packages: readonly CodeMapManifestDependency[];
}

export interface CodeMapPackageManifest {
  readonly sourcePath: string;
  readonly contentDigest: Sha256Digest;
  readonly name: string | null;
  readonly version: string | null;
  readonly private: boolean | null;
  readonly moduleType: "module" | "commonjs" | null;
  readonly scriptNames: readonly string[];
  readonly dependencyGroups: readonly CodeMapManifestDependencyGroup[];
  readonly workspacePatterns: readonly string[];
}

export interface CodeMapStaticImport {
  readonly sourcePath: string;
  readonly sourceDigest: Sha256Digest;
  readonly specifier: string;
  readonly importKind: "STATIC_IMPORT";
  readonly typeOnly: boolean;
  readonly sideEffectOnly: boolean;
  readonly importedNames: readonly string[];
  readonly resolvedTargetPath: string | null;
}

export interface CodeMapStaticExport {
  readonly sourcePath: string;
  readonly sourceDigest: Sha256Digest;
  readonly exportKind:
    | "DECLARATION"
    | "DEFAULT"
    | "NAMED"
    | "REEXPORT"
    | "EXPORT_ALL";
  readonly exportedName: string;
  readonly localName: string | null;
  readonly specifier: string | null;
  readonly resolvedTargetPath: string | null;
  readonly typeOnly: boolean;
}

export interface CodeMapStaticContract {
  readonly sourcePath: string;
  readonly sourceDigest: Sha256Digest;
  readonly name: string;
  readonly exportedName: string;
  readonly contractKind: "INTERFACE" | "TYPE_ALIAS" | "ENUM";
  readonly line: number;
  readonly character: number;
}

export interface CodeMapRecognizedRoute {
  readonly sourcePath: string;
  readonly sourceDigest: Sha256Digest;
  readonly receiverName: string;
  readonly method: string;
  readonly routePath: string;
  readonly recognition:
    | "DIRECT_FASTIFY_CALL"
    | "DIRECT_FASTIFY_ROUTE_OBJECT";
  readonly line: number;
  readonly character: number;
  readonly runtimeSemantics: "NOT_OBSERVED";
}

export interface CodeMapTestAssociation {
  readonly testSourcePath: string;
  readonly testSourceDigest: Sha256Digest;
  readonly targetSourcePath: string;
  readonly targetSourceDigest: Sha256Digest;
  readonly specifier: string;
  readonly basis: "STATIC_TEST_IMPORT";
}

export interface CodeMapExtractionDiagnostic {
  readonly sourcePath: string;
  readonly code: string;
  readonly line: number | null;
  readonly character: number | null;
  readonly message: string;
}

export interface CodeMapExtractionSourceCoverage {
  readonly allowedExtensions: readonly CodeMapSourceExtension[];
  readonly scanLimits: typeof CODE_MAP_SCAN_LIMITS;
  readonly extractionLimits: typeof CODE_MAP_EXTRACTION_LIMITS;
  readonly encounteredFileCount: number;
  readonly scannedFileCount: number;
  readonly scannedByteCount: number;
  readonly skippedUnsupportedFileCount: number;
  readonly skippedExtensions: readonly CodeMapSkippedExtension[];
  readonly skippedDirectories: readonly CodeMapSkippedDirectory[];
}

export interface CodeMapExtraction {
  readonly extractionVersion: typeof CODE_MAP_EXTRACTION_VERSION;
  readonly authority: "STATIC_SYNTAX_ONLY";
  readonly runtimeSemantics: "NOT_OBSERVED";
  readonly completeness: "COMPLETE" | "PARTIAL";
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly registrationId: RepositoryRegistrationId;
  readonly sourceScanVersion: typeof CODE_MAP_SCAN_VERSION;
  readonly sourceCoverage: CodeMapExtractionSourceCoverage;
  readonly sourceFileCount: number;
  readonly sourceByteCount: number;
  readonly files: readonly CodeMapExtractedFile[];
  readonly manifests: readonly CodeMapPackageManifest[];
  readonly imports: readonly CodeMapStaticImport[];
  readonly exports: readonly CodeMapStaticExport[];
  readonly contracts: readonly CodeMapStaticContract[];
  readonly routes: readonly CodeMapRecognizedRoute[];
  readonly testAssociations: readonly CodeMapTestAssociation[];
  readonly diagnostics: readonly CodeMapExtractionDiagnostic[];
  readonly diagnosticsTruncated: boolean;
  readonly extractionDigest: Sha256Digest;
}

export interface CodeMapExtractionDependencies {
  readonly monotonicNow: () => number;
}

const DEFAULT_DEPENDENCIES: CodeMapExtractionDependencies = Object.freeze({
  monotonicNow: () => performance.now()
});

const SOURCE_EXTENSIONS = new Set<CodeMapSourceExtension>([
  ".js",
  ".jsx",
  ".ts",
  ".tsx"
]);
const ROUTE_METHODS = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put"
]);
const MANIFEST_DEPENDENCY_SECTIONS = Object.freeze([
  ["dependencies", "DEPENDENCY"],
  ["devDependencies", "DEV_DEPENDENCY"],
  ["optionalDependencies", "OPTIONAL_DEPENDENCY"],
  ["peerDependencies", "PEER_DEPENDENCY"]
] as const);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNullableText(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return compareText(left, right);
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

function digestText(content: string): Sha256Digest {
  return parseSha256Digest(
    `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`
  );
}

function equalArray<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function safeRelativePath(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 4_096 &&
    value === value.normalize("NFC") &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    value.split("/").every(
      (segment) => segment !== "" && segment !== "." && segment !== ".."
    ) &&
    posix.normalize(value) === value
  );
}

function expectedExtension(path: string): CodeMapSourceExtension | null {
  const extension = posix.extname(path).toLowerCase();
  return CODE_MAP_ALLOWED_EXTENSIONS.includes(
    extension as CodeMapSourceExtension
  )
    ? (extension as CodeMapSourceExtension)
    : null;
}

function assertFiniteInteger(value: number, minimum = 0): boolean {
  return Number.isSafeInteger(value) && value >= minimum;
}

interface ValidatedScanInput {
  readonly files: readonly CodeMapScannedSourceFile[];
  readonly coverage: CodeMapExtractionSourceCoverage;
}

function validateScan(
  scan: CodeMapSourceScan,
  budget: ExtractionBudget
): ValidatedScanInput {
  budget.check();
  if (
    scan === null ||
    typeof scan !== "object" ||
    !Array.isArray(scan.allowedExtensions) ||
    !isRecord(scan.limits) ||
    !Array.isArray(scan.files) ||
    !Array.isArray(scan.skippedExtensions) ||
    !Array.isArray(scan.skippedDirectories) ||
    typeof scan.projectId !== "string" ||
    typeof scan.missionId !== "string" ||
    typeof scan.registrationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      scan.projectId
    ) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      scan.missionId
    ) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      scan.registrationId
    ) ||
    scan.scanVersion !== CODE_MAP_SCAN_VERSION ||
    !equalArray(scan.allowedExtensions, CODE_MAP_ALLOWED_EXTENSIONS) ||
    scan.limits.maximumFiles !== CODE_MAP_SCAN_LIMITS.maximumFiles ||
    scan.limits.maximumAggregateBytes !==
      CODE_MAP_SCAN_LIMITS.maximumAggregateBytes ||
    scan.limits.maximumFileBytes !== CODE_MAP_SCAN_LIMITS.maximumFileBytes ||
    scan.limits.maximumMilliseconds !== CODE_MAP_SCAN_LIMITS.maximumMilliseconds ||
    !assertFiniteInteger(scan.encounteredFileCount) ||
    !assertFiniteInteger(scan.scannedFileCount) ||
    !assertFiniteInteger(scan.scannedByteCount) ||
    !assertFiniteInteger(scan.skippedUnsupportedFileCount) ||
    scan.encounteredFileCount > CODE_MAP_SCAN_LIMITS.maximumFiles ||
    scan.scannedFileCount !== scan.files.length ||
    scan.skippedUnsupportedFileCount !==
      scan.encounteredFileCount - scan.scannedFileCount
  ) {
    throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
  }

  const seen = new Set<string>();
  let bytes = 0;
  for (const file of scan.files) {
    budget.check();
    if (
      !isRecord(file) ||
      typeof file.relativePath !== "string" ||
      typeof file.extension !== "string" ||
      typeof file.byteLength !== "number" ||
      typeof file.contentDigest !== "string" ||
      typeof file.content !== "string"
    ) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
    }
    const reencoded = Buffer.from(file.content, "utf8");
    const extension = expectedExtension(file.relativePath);
    if (
      !safeRelativePath(file.relativePath) ||
      seen.has(file.relativePath) ||
      extension === null ||
      extension !== file.extension ||
      !assertFiniteInteger(file.byteLength) ||
      file.byteLength > CODE_MAP_SCAN_LIMITS.maximumFileBytes ||
      reencoded.byteLength !== file.byteLength ||
      reencoded.toString("utf8") !== file.content ||
      digestText(file.content) !== file.contentDigest
    ) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
    }
    seen.add(file.relativePath);
    bytes += file.byteLength;
  }
  budget.check();
  if (
    bytes !== scan.scannedByteCount ||
    bytes > CODE_MAP_SCAN_LIMITS.maximumAggregateBytes
  ) {
    throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
  }

  const skippedExtensions: CodeMapSkippedExtension[] = [];
  const seenExtensionLabels = new Set<string>();
  let skippedExtensionFiles = 0;
  for (const item of scan.skippedExtensions) {
    budget.check();
    if (
      !isRecord(item) ||
      typeof item.extension !== "string" ||
      typeof item.fileCount !== "number" ||
      !assertFiniteInteger(item.fileCount, 1) ||
      !(
        item.extension === "[no-extension]" ||
        item.extension === "[other-extension]" ||
        item.extension === "[sensitive-name]" ||
        /^\.[a-z0-9][a-z0-9+_-]{0,30}$/u.test(item.extension)
      ) ||
      CODE_MAP_ALLOWED_EXTENSIONS.includes(
        item.extension as CodeMapSourceExtension
      ) ||
      seenExtensionLabels.has(item.extension)
    ) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
    }
    seenExtensionLabels.add(item.extension);
    skippedExtensionFiles += item.fileCount;
    budget.record();
    skippedExtensions.push(Object.freeze({
      extension: item.extension,
      fileCount: item.fileCount
    }));
  }
  if (skippedExtensionFiles !== scan.skippedUnsupportedFileCount) {
    throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
  }
  skippedExtensions.sort((left, right) =>
    compareText(left.extension, right.extension)
  );

  const skippedDirectories: CodeMapSkippedDirectory[] = [];
  const seenDirectoryNames = new Set<string>();
  for (const item of scan.skippedDirectories) {
    budget.check();
    if (
      !isRecord(item) ||
      (item.directoryName !== ".git" && item.directoryName !== "node_modules") ||
      typeof item.directoryCount !== "number" ||
      !assertFiniteInteger(item.directoryCount, 1) ||
      seenDirectoryNames.has(item.directoryName)
    ) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_INPUT_INVALID");
    }
    seenDirectoryNames.add(item.directoryName);
    budget.record();
    skippedDirectories.push(Object.freeze({
      directoryName: item.directoryName,
      directoryCount: item.directoryCount
    }));
  }
  skippedDirectories.sort((left, right) =>
    compareText(left.directoryName, right.directoryName)
  );
  budget.record();
  return Object.freeze({
    files: Object.freeze(
      [...scan.files].sort((left, right) =>
        compareText(left.relativePath, right.relativePath)
      )
    ),
    coverage: Object.freeze({
      allowedExtensions: CODE_MAP_ALLOWED_EXTENSIONS,
      scanLimits: CODE_MAP_SCAN_LIMITS,
      extractionLimits: CODE_MAP_EXTRACTION_LIMITS,
      encounteredFileCount: scan.encounteredFileCount,
      scannedFileCount: scan.scannedFileCount,
      scannedByteCount: scan.scannedByteCount,
      skippedUnsupportedFileCount: scan.skippedUnsupportedFileCount,
      skippedExtensions: Object.freeze(skippedExtensions),
      skippedDirectories: Object.freeze(skippedDirectories)
    })
  });
}

class ExtractionBudget {
  readonly #now: () => number;
  readonly #startedAt: number;
  #nodes = 0;
  #records = 0;

  constructor(now: () => number) {
    this.#now = now;
    this.#startedAt = now();
    if (!Number.isFinite(this.#startedAt) || this.#startedAt < 0) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_FAILED");
    }
  }

  check(): void {
    const current = this.#now();
    if (!Number.isFinite(current) || current < this.#startedAt) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_FAILED");
    }
    if (
      current - this.#startedAt >=
      CODE_MAP_EXTRACTION_LIMITS.maximumMilliseconds
    ) {
      throw new CodeMapExtractionError("CODE_MAP_EXTRACTION_TIMEOUT");
    }
  }

  node(): void {
    this.check();
    this.#nodes += 1;
    if (this.#nodes > CODE_MAP_EXTRACTION_LIMITS.maximumAstNodes) {
      throw new CodeMapExtractionError(
        "CODE_MAP_EXTRACTION_NODE_LIMIT_EXCEEDED"
      );
    }
  }

  record(): void {
    this.check();
    this.#records += 1;
    if (this.#records > CODE_MAP_EXTRACTION_LIMITS.maximumRecords) {
      throw new CodeMapExtractionError(
        "CODE_MAP_EXTRACTION_RECORD_LIMIT_EXCEEDED"
      );
    }
  }
}

class DiagnosticCollector {
  readonly items: CodeMapExtractionDiagnostic[] = [];
  truncated = false;

  add(diagnostic: CodeMapExtractionDiagnostic): void {
    if (
      this.items.length >= CODE_MAP_EXTRACTION_LIMITS.maximumDiagnostics
    ) {
      this.truncated = true;
      return;
    }
    this.items.push(Object.freeze(diagnostic));
  }
}

function isTestPath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    /(?:^|\/)(?:__tests__|test|tests)(?:\/|$)/u.test(lower) ||
    /\.(?:spec|test)\.(?:js|jsx|ts|tsx)$/u.test(lower)
  );
}

function fileKind(
  file: CodeMapScannedSourceFile
): CodeMapExtractedFile["fileKind"] {
  if (isTestPath(file.relativePath)) return "TEST";
  if (file.extension !== ".json") return "SOURCE";
  return posix.basename(file.relativePath).toLowerCase() === "package.json"
    ? "MANIFEST"
    : "JSON";
}

function scriptKind(extension: CodeMapSourceExtension): ts.ScriptKind {
  switch (extension) {
    case ".js":
      return ts.ScriptKind.JS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".ts":
      return ts.ScriptKind.TS;
    case ".json":
      return ts.ScriptKind.JSON;
  }
}

function nodeLocation(
  sourceFile: ts.SourceFile,
  node: ts.Node
): { readonly line: number; readonly character: number } {
  const location = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile, false)
  );
  return Object.freeze({
    line: location.line + 1,
    character: location.character + 1
  });
}

function diagnosticLocation(
  sourceFile: ts.SourceFile,
  start: number | undefined
): { readonly line: number | null; readonly character: number | null } {
  if (start === undefined) return Object.freeze({ line: null, character: null });
  const location = sourceFile.getLineAndCharacterOfPosition(start);
  return Object.freeze({
    line: location.line + 1,
    character: location.character + 1
  });
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false);
}

function stringLiteralValue(node: ts.Expression | undefined): string | null {
  if (node === undefined) return null;
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : null;
}

function boundedValue(
  value: string,
  maximumCharacters: number,
  file: CodeMapScannedSourceFile,
  diagnostics: DiagnosticCollector,
  code: string
): string | null {
  if (
    value.length <= maximumCharacters &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return value;
  }
  diagnostics.add({
    sourcePath: file.relativePath,
    code,
    line: null,
    character: null,
    message: "A static value was omitted because it exceeded its safe boundary."
  });
  return null;
}

function resolveRelativeSpecifier(
  sourcePath: string,
  specifier: string,
  paths: ReadonlySet<string>
): string | null {
  if (
    !(specifier === "." || specifier === ".." || specifier.startsWith("./") ||
      specifier.startsWith("../")) ||
    specifier.includes("\\") ||
    /[?#\u0000-\u001f\u007f]/u.test(specifier)
  ) {
    return null;
  }
  const base = posix.normalize(posix.join(posix.dirname(sourcePath), specifier));
  if (
    base === ".." ||
    base.startsWith("../") ||
    base.startsWith("/") ||
    !safeRelativePath(base)
  ) {
    return null;
  }
  const directExtension = expectedExtension(base);
  const candidates = directExtension === null
    ? [
        ...CODE_MAP_ALLOWED_EXTENSIONS.map((extension) => `${base}${extension}`),
        ...CODE_MAP_ALLOWED_EXTENSIONS.map(
          (extension) => `${base}/index${extension}`
        )
      ]
    : [base];
  const matches = candidates.filter((candidate) => paths.has(candidate));
  return matches.length === 1 ? matches[0] ?? null : null;
}

function propertyNameText(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
    ? name.text
    : null;
}

function validName(value: string): boolean {
  return value.length >= 1 &&
    value.length <= CODE_MAP_EXTRACTION_LIMITS.maximumNameCharacters &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}

function freezeSortedStrings(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareText));
}

interface LocalContract {
  readonly name: string;
  readonly contractKind: CodeMapStaticContract["contractKind"];
  readonly node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration;
  readonly directlyExported: boolean;
}

interface SourceFacts {
  readonly imports: CodeMapStaticImport[];
  readonly exports: CodeMapStaticExport[];
  readonly contracts: CodeMapStaticContract[];
  readonly routes: CodeMapRecognizedRoute[];
}

function extractSourceFacts(
  file: CodeMapScannedSourceFile,
  sourceFile: ts.SourceFile,
  allPaths: ReadonlySet<string>,
  diagnostics: DiagnosticCollector,
  budget: ExtractionBudget
): SourceFacts {
  const imports: CodeMapStaticImport[] = [];
  const exports: CodeMapStaticExport[] = [];
  const contracts: CodeMapStaticContract[] = [];
  const routes: CodeMapRecognizedRoute[] = [];
  const localContracts = new Map<string, LocalContract>();
  const localContractExports = new Map<string, Set<string>>();
  const fastifyFactories = new Set<string>();
  const fastifyInstanceTypes = new Set<string>();

  const addRecord = <T>(target: T[], record: T): void => {
    budget.record();
    target.push(Object.freeze(record));
  };

  for (const statement of sourceFile.statements) {
    budget.node();
    if (ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)) {
      const boundedSpecifier = boundedValue(
        statement.moduleSpecifier.text,
        CODE_MAP_EXTRACTION_LIMITS.maximumSpecifierCharacters,
        file,
        diagnostics,
        "STATIC_SPECIFIER_OMITTED"
      );
      if (boundedSpecifier !== null) {
        const clause = statement.importClause;
        const importedNames: string[] = [];
        if (clause?.name !== undefined) importedNames.push("default");
        if (clause?.namedBindings !== undefined) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            importedNames.push("*");
          } else {
            for (const element of clause.namedBindings.elements) {
              const importedName = (element.propertyName ?? element.name).text;
              const boundedName = boundedValue(
                importedName,
                CODE_MAP_EXTRACTION_LIMITS.maximumNameCharacters,
                file,
                diagnostics,
                "STATIC_NAME_OMITTED"
              );
              if (boundedName !== null) importedNames.push(boundedName);
            }
          }
        }
        const elements = clause?.namedBindings !== undefined &&
          ts.isNamedImports(clause.namedBindings)
          ? clause.namedBindings.elements
          : [];
        addRecord(imports, {
          sourcePath: file.relativePath,
          sourceDigest: file.contentDigest,
          specifier: boundedSpecifier,
          importKind: "STATIC_IMPORT",
          typeOnly: clause?.isTypeOnly === true ||
            (elements.length > 0 && elements.every((element) => element.isTypeOnly)),
          sideEffectOnly: clause === undefined,
          importedNames: freezeSortedStrings(importedNames),
          resolvedTargetPath: resolveRelativeSpecifier(
            file.relativePath,
            boundedSpecifier,
            allPaths
          )
        });

        if (boundedSpecifier === "fastify" && clause !== undefined) {
          if (clause.name !== undefined && validName(clause.name.text)) {
            fastifyFactories.add(clause.name.text);
          }
          if (clause.namedBindings !== undefined &&
            ts.isNamedImports(clause.namedBindings)) {
            for (const element of clause.namedBindings.elements) {
              const imported = (element.propertyName ?? element.name).text;
              if (imported === "fastify" && validName(element.name.text)) {
                fastifyFactories.add(element.name.text);
              }
              if (imported === "FastifyInstance" &&
                validName(element.name.text)) {
                fastifyInstanceTypes.add(element.name.text);
              }
            }
          }
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      const rawSpecifier = statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null;
      const specifier = rawSpecifier === null
        ? null
        : boundedValue(
            rawSpecifier,
            CODE_MAP_EXTRACTION_LIMITS.maximumSpecifierCharacters,
            file,
            diagnostics,
            "STATIC_SPECIFIER_OMITTED"
          );
      if (rawSpecifier !== null && specifier === null) continue;
      if (statement.exportClause === undefined) {
        addRecord(exports, {
          sourcePath: file.relativePath,
          sourceDigest: file.contentDigest,
          exportKind: "EXPORT_ALL",
          exportedName: "*",
          localName: null,
          specifier,
          resolvedTargetPath: specifier === null
            ? null
            : resolveRelativeSpecifier(file.relativePath, specifier, allPaths),
          typeOnly: statement.isTypeOnly
        });
      } else if (ts.isNamespaceExport(statement.exportClause)) {
        if (!validName(statement.exportClause.name.text)) {
          boundedValue(
            statement.exportClause.name.text,
            CODE_MAP_EXTRACTION_LIMITS.maximumNameCharacters,
            file,
            diagnostics,
            "STATIC_NAME_OMITTED"
          );
          continue;
        }
        addRecord(exports, {
          sourcePath: file.relativePath,
          sourceDigest: file.contentDigest,
          exportKind: "REEXPORT",
          exportedName: statement.exportClause.name.text,
          localName: "*",
          specifier,
          resolvedTargetPath: specifier === null
            ? null
            : resolveRelativeSpecifier(file.relativePath, specifier, allPaths),
          typeOnly: statement.isTypeOnly
        });
      } else {
        for (const element of statement.exportClause.elements) {
          const localName = (element.propertyName ?? element.name).text;
          const exportedName = element.name.text;
          if (!validName(localName) || !validName(exportedName)) continue;
          addRecord(exports, {
            sourcePath: file.relativePath,
            sourceDigest: file.contentDigest,
            exportKind: specifier === null ? "NAMED" : "REEXPORT",
            exportedName,
            localName,
            specifier,
            resolvedTargetPath: specifier === null
              ? null
              : resolveRelativeSpecifier(file.relativePath, specifier, allPaths),
            typeOnly: statement.isTypeOnly || element.isTypeOnly
          });
          if (specifier === null) {
            const names = localContractExports.get(localName) ?? new Set<string>();
            names.add(exportedName);
            localContractExports.set(localName, names);
          }
        }
      }
      continue;
    }

    if (ts.isExportAssignment(statement)) {
      addRecord(exports, {
        sourcePath: file.relativePath,
        sourceDigest: file.contentDigest,
        exportKind: "DEFAULT",
        exportedName: "default",
        localName: ts.isIdentifier(statement.expression)
          ? (validName(statement.expression.text)
              ? statement.expression.text
              : null)
          : null,
        specifier: null,
        resolvedTargetPath: null,
        typeOnly: false
      });
      continue;
    }

    const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    const defaultExport = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
    const addDeclarationExport = (
      name: string | null,
      typeOnly: boolean
    ): void => {
      if (!exported || (name !== null && !validName(name))) return;
      addRecord(exports, {
        sourcePath: file.relativePath,
        sourceDigest: file.contentDigest,
        exportKind: defaultExport ? "DEFAULT" : "DECLARATION",
        exportedName: defaultExport ? "default" : (name ?? "default"),
        localName: name,
        specifier: null,
        resolvedTargetPath: null,
        typeOnly
      });
    };

    if (ts.isVariableStatement(statement)) {
      if (exported) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            addDeclarationExport(declaration.name.text, false);
          }
        }
      }
    } else if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement)
    ) {
      addDeclarationExport(statement.name?.text ?? null, false);
    } else if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      const name = statement.name.text;
      addDeclarationExport(name, true);
      if (!validName(name)) {
        boundedValue(
          name,
          CODE_MAP_EXTRACTION_LIMITS.maximumNameCharacters,
          file,
          diagnostics,
          "STATIC_NAME_OMITTED"
        );
        continue;
      }
      localContracts.set(name, {
        name,
        contractKind: ts.isInterfaceDeclaration(statement)
          ? "INTERFACE"
          : ts.isTypeAliasDeclaration(statement)
            ? "TYPE_ALIAS"
            : "ENUM",
        node: statement,
        directlyExported: exported
      });
    }
  }

  for (const contract of localContracts.values()) {
    const exportedNames = new Set<string>();
    if (contract.directlyExported) {
      exportedNames.add(
        hasModifier(contract.node, ts.SyntaxKind.DefaultKeyword)
          ? "default"
          : contract.name
      );
    }
    for (const alias of localContractExports.get(contract.name) ?? []) {
      exportedNames.add(alias);
    }
    const location = nodeLocation(sourceFile, contract.node);
    for (const exportedName of [...exportedNames].sort(compareText)) {
      addRecord(contracts, {
        sourcePath: file.relativePath,
        sourceDigest: file.contentDigest,
        name: contract.name,
        exportedName,
        contractKind: contract.contractKind,
        line: location.line,
        character: location.character
      });
    }
  }

  const typedFastifyParameter = (parameter: ts.ParameterDeclaration): boolean => {
    if (!ts.isIdentifier(parameter.name) || !validName(parameter.name.text) ||
      parameter.type === undefined) {
      return false;
    }
    return ts.isTypeReferenceNode(parameter.type) &&
      ts.isIdentifier(parameter.type.typeName) &&
      fastifyInstanceTypes.has(parameter.type.typeName.text);
  };

  const factoryReceiverName = (
    declaration: ts.VariableDeclaration
  ): string | null => {
    if (!ts.isIdentifier(declaration.name) || !validName(declaration.name.text) ||
      declaration.initializer === undefined ||
      !ts.isCallExpression(declaration.initializer) ||
      !ts.isIdentifier(declaration.initializer.expression) ||
      !fastifyFactories.has(declaration.initializer.expression.text)) {
      return null;
    }
    return declaration.name.text;
  };

  const addRoute = (
    call: ts.CallExpression,
    receivers: ReadonlySet<string>
  ): void => {
    if (!ts.isPropertyAccessExpression(call.expression) ||
      !ts.isIdentifier(call.expression.expression)) return;
    const receiverName = call.expression.expression.text;
    if (!receivers.has(receiverName)) return;
    const operation = call.expression.name.text;
    let method: string | null = null;
    let routePath: string | null = null;
    let recognition: CodeMapRecognizedRoute["recognition"] | null = null;

    if (ROUTE_METHODS.has(operation)) {
      method = operation.toUpperCase();
      routePath = stringLiteralValue(call.arguments[0]);
      recognition = "DIRECT_FASTIFY_CALL";
    } else if (operation === "route" && call.arguments.length >= 1) {
      const options = call.arguments[0];
      if (options !== undefined && ts.isObjectLiteralExpression(options)) {
        for (const property of options.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name = propertyNameText(property.name);
          if (name === "method") method = stringLiteralValue(property.initializer);
          if (name === "url") routePath = stringLiteralValue(property.initializer);
        }
        if (method !== null) method = method.toUpperCase();
        recognition = "DIRECT_FASTIFY_ROUTE_OBJECT";
      }
    }
    if (method === null || routePath === null || recognition === null ||
      method.length > 32 || !/^[A-Z]+$/u.test(method)) return;
    const boundedRoute = boundedValue(
      routePath,
      CODE_MAP_EXTRACTION_LIMITS.maximumRouteCharacters,
      file,
      diagnostics,
      "STATIC_ROUTE_OMITTED"
    );
    if (boundedRoute === null || !boundedRoute.startsWith("/")) return;
    const location = nodeLocation(sourceFile, call);
    addRecord(routes, {
      sourcePath: file.relativePath,
      sourceDigest: file.contentDigest,
      receiverName,
      method,
      routePath: boundedRoute,
      recognition,
      line: location.line,
      character: location.character,
      runtimeSemantics: "NOT_OBSERVED"
    });
  };

  const visit = (node: ts.Node, inheritedReceivers: ReadonlySet<string>): void => {
    budget.node();
    if (ts.isFunctionLike(node)) {
      const receivers = new Set(inheritedReceivers);
      for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name)) receivers.delete(parameter.name.text);
        if (typedFastifyParameter(parameter) && ts.isIdentifier(parameter.name)) {
          receivers.add(parameter.name.text);
        }
      }
      const body = (
        node as ts.SignatureDeclaration & { readonly body?: ts.ConciseBody }
      ).body;
      ts.forEachChild(node, (child) =>
        visit(child, child === body ? receivers : inheritedReceivers)
      );
      return;
    }
    if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node)) {
      const receivers = new Set(inheritedReceivers);
      for (const statement of node.statements) {
        if ((ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement)) && statement.name !== undefined) {
          receivers.delete(statement.name.text);
        }
        if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) continue;
            receivers.delete(declaration.name.text);
            const safeName = factoryReceiverName(declaration);
            if (safeName !== null) receivers.add(safeName);
          }
        }
        visit(statement, receivers);
      }
      return;
    }
    if (ts.isCallExpression(node)) addRoute(node, inheritedReceivers);
    ts.forEachChild(node, (child) => visit(child, inheritedReceivers));
  };
  visit(sourceFile, new Set<string>());

  return { imports, exports, contracts, routes };
}

function manifestDiagnostic(
  file: CodeMapScannedSourceFile,
  diagnostics: DiagnosticCollector,
  code: string
): void {
  diagnostics.add({
    sourcePath: file.relativePath,
    code,
    line: null,
    character: null,
    message: "Package metadata contained an unsupported or invalid field."
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function manifestString(
  value: unknown,
  pattern: RegExp,
  maximum: number,
  file: CodeMapScannedSourceFile,
  diagnostics: DiagnosticCollector
): string | null {
  if (value === undefined) return null;
  if (typeof value === "string" && value.length <= maximum && pattern.test(value)) {
    return value;
  }
  manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
  return null;
}

function parseManifest(
  file: CodeMapScannedSourceFile,
  value: unknown,
  diagnostics: DiagnosticCollector,
  budget: ExtractionBudget
): CodeMapPackageManifest | null {
  if (!isRecord(value)) {
    manifestDiagnostic(file, diagnostics, "MANIFEST_OBJECT_REQUIRED");
    return null;
  }
  const name = manifestString(
    value.name,
    /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/iu,
    214,
    file,
    diagnostics
  );
  const version = manifestString(
    value.version,
    /^[0-9A-Za-z.+_-]+$/u,
    64,
    file,
    diagnostics
  );
  let privateValue: boolean | null = null;
  if (value.private !== undefined) {
    if (typeof value.private === "boolean") privateValue = value.private;
    else manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
  }
  let moduleType: "module" | "commonjs" | null = null;
  if (value.type !== undefined) {
    if (value.type === "module" || value.type === "commonjs") {
      moduleType = value.type;
    } else {
      manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
    }
  }

  const scriptNames: string[] = [];
  if (value.scripts !== undefined) {
    if (!isRecord(value.scripts)) {
      manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
    } else {
      for (const [scriptName, command] of Object.entries(value.scripts)) {
        budget.check();
        if (validName(scriptName) && typeof command === "string") {
          scriptNames.push(scriptName);
        } else {
          manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
        }
      }
    }
  }

  const dependencyGroups: CodeMapManifestDependencyGroup[] = [];
  for (const [field, kind] of MANIFEST_DEPENDENCY_SECTIONS) {
    const section = value[field];
    if (section === undefined) continue;
    if (!isRecord(section)) {
      manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
      continue;
    }
    const packages: CodeMapManifestDependency[] = [];
    for (const [packageName, range] of Object.entries(section).sort(
      ([left], [right]) => compareText(left, right)
    )) {
      budget.check();
      if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/iu.test(packageName) ||
        packageName.length > 214 || typeof range !== "string") {
        manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
        continue;
      }
      const safeRange = range.length <= 128 &&
        /^[0-9A-Za-z*~^<>=| .:_-]+$/u.test(range);
      if (!safeRange) {
        manifestDiagnostic(file, diagnostics, "MANIFEST_RANGE_OMITTED");
      }
      budget.record();
      packages.push(Object.freeze({
        name: packageName,
        declaredRange: safeRange ? range : null,
        rangeDisposition: safeRange ? "RECORDED" : "OMITTED_UNSAFE"
      }));
    }
    budget.record();
    dependencyGroups.push(Object.freeze({
      kind,
      packages: Object.freeze(packages)
    }));
  }

  const workspacePatterns: string[] = [];
  const rawWorkspaces = Array.isArray(value.workspaces)
    ? value.workspaces
    : isRecord(value.workspaces) && Array.isArray(value.workspaces.packages)
      ? value.workspaces.packages
      : value.workspaces === undefined
        ? []
        : null;
  if (rawWorkspaces === null) {
    manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
  } else {
    for (const workspace of rawWorkspaces) {
      budget.check();
      if (typeof workspace === "string" && workspace.length <= 256 &&
        !workspace.startsWith("/") && !workspace.includes("\\") &&
        !workspace.split("/").includes("..") &&
        /^[0-9A-Za-z*?._!/{},@+-]+$/u.test(workspace)) {
        workspacePatterns.push(workspace);
      } else {
        manifestDiagnostic(file, diagnostics, "MANIFEST_FIELD_INVALID");
      }
    }
  }

  budget.record();
  return Object.freeze({
    sourcePath: file.relativePath,
    contentDigest: file.contentDigest,
    name,
    version,
    private: privateValue,
    moduleType,
    scriptNames: freezeSortedStrings(scriptNames),
    dependencyGroups: Object.freeze(dependencyGroups),
    workspacePatterns: freezeSortedStrings(workspacePatterns)
  });
}

function compareFiles(left: CodeMapExtractedFile, right: CodeMapExtractedFile): number {
  return compareText(left.sourcePath, right.sourcePath);
}

function compareImports(left: CodeMapStaticImport, right: CodeMapStaticImport): number {
  return compareText(left.sourcePath, right.sourcePath) ||
    compareText(left.specifier, right.specifier) ||
    compareText(left.importedNames.join("\u0000"), right.importedNames.join("\u0000"));
}

function compareExports(left: CodeMapStaticExport, right: CodeMapStaticExport): number {
  return compareText(left.sourcePath, right.sourcePath) ||
    compareText(left.exportKind, right.exportKind) ||
    compareText(left.exportedName, right.exportedName) ||
    compareNullableText(left.specifier, right.specifier) ||
    compareNullableText(left.localName, right.localName);
}

function compareContracts(
  left: CodeMapStaticContract,
  right: CodeMapStaticContract
): number {
  return compareText(left.sourcePath, right.sourcePath) ||
    compareText(left.name, right.name) ||
    compareText(left.exportedName, right.exportedName) ||
    compareText(left.contractKind, right.contractKind) ||
    compareNumber(left.line, right.line) ||
    compareNumber(left.character, right.character);
}

function compareRoutes(
  left: CodeMapRecognizedRoute,
  right: CodeMapRecognizedRoute
): number {
  return compareText(left.sourcePath, right.sourcePath) ||
    compareText(left.routePath, right.routePath) ||
    compareText(left.method, right.method) ||
    compareNumber(left.line, right.line) ||
    compareNumber(left.character, right.character);
}

function compareAssociations(
  left: CodeMapTestAssociation,
  right: CodeMapTestAssociation
): number {
  return compareText(left.testSourcePath, right.testSourcePath) ||
    compareText(left.targetSourcePath, right.targetSourcePath) ||
    compareText(left.specifier, right.specifier);
}

function compareDiagnostics(
  left: CodeMapExtractionDiagnostic,
  right: CodeMapExtractionDiagnostic
): number {
  return compareText(left.sourcePath, right.sourcePath) ||
    compareText(left.code, right.code) ||
    compareNumber(left.line ?? 0, right.line ?? 0) ||
    compareNumber(left.character ?? 0, right.character ?? 0);
}

export async function extractCodeMap(
  scan: CodeMapSourceScan,
  dependencies: CodeMapExtractionDependencies = DEFAULT_DEPENDENCIES
): Promise<CodeMapExtraction> {
  const budget = new ExtractionBudget(dependencies.monotonicNow);
  const validated = validateScan(scan, budget);
  const files = validated.files;
  const diagnostics = new DiagnosticCollector();
  const fileRecords: CodeMapExtractedFile[] = [];
  const manifests: CodeMapPackageManifest[] = [];
  const imports: CodeMapStaticImport[] = [];
  const exports: CodeMapStaticExport[] = [];
  const contracts: CodeMapStaticContract[] = [];
  const routes: CodeMapRecognizedRoute[] = [];
  const allPaths = new Set(files.map((file) => file.relativePath));

  for (const file of files) {
    budget.check();
    let parseStatus: CodeMapExtractedFile["parseStatus"] = "PARSED";
    if (file.extension === ".json") {
      try {
        const jsonContent = file.content.charCodeAt(0) === 0xfeff
          ? file.content.slice(1)
          : file.content;
        const value: unknown = JSON.parse(jsonContent);
        if (posix.basename(file.relativePath).toLowerCase() === "package.json") {
          const manifest = parseManifest(file, value, diagnostics, budget);
          if (manifest !== null) manifests.push(manifest);
        }
      } catch {
        parseStatus = "SYNTAX_ERROR";
        diagnostics.add({
          sourcePath: file.relativePath,
          code: "JSON_PARSE_ERROR",
          line: null,
          character: null,
          message: "JSON syntax could not be fully parsed."
        });
      }
    } else if (SOURCE_EXTENSIONS.has(file.extension)) {
      const sourceFile = ts.createSourceFile(
        file.relativePath,
        file.content,
        ts.ScriptTarget.Latest,
        false,
        scriptKind(file.extension)
      );
      const parseDiagnostics = (
        sourceFile as ts.SourceFile & {
          readonly parseDiagnostics: readonly ts.DiagnosticWithLocation[];
        }
      ).parseDiagnostics;
      if (parseDiagnostics.length > 0) parseStatus = "SYNTAX_ERROR";
      for (const diagnostic of parseDiagnostics) {
        budget.check();
        const location = diagnosticLocation(sourceFile, diagnostic.start);
        diagnostics.add({
          sourcePath: file.relativePath,
          code: `TS${diagnostic.code}`,
          line: location.line,
          character: location.character,
          message: "TypeScript syntax could not be fully parsed."
        });
      }
      const facts = extractSourceFacts(
        file,
        sourceFile,
        allPaths,
        diagnostics,
        budget
      );
      imports.push(...facts.imports);
      exports.push(...facts.exports);
      contracts.push(...facts.contracts);
      routes.push(...facts.routes);
    }
    budget.record();
    fileRecords.push(Object.freeze({
      sourcePath: file.relativePath,
      extension: file.extension,
      byteLength: file.byteLength,
      contentDigest: file.contentDigest,
      fileKind: fileKind(file),
      parseStatus
    }));
  }

  const fileByPath = new Map(files.map((file) => [file.relativePath, file]));
  const testAssociations: CodeMapTestAssociation[] = [];
  const associationKeys = new Set<string>();
  for (const item of imports) {
    if (!isTestPath(item.sourcePath) || item.resolvedTargetPath === null ||
      isTestPath(item.resolvedTargetPath)) continue;
    const target = fileByPath.get(item.resolvedTargetPath);
    const test = fileByPath.get(item.sourcePath);
    if (target === undefined || test === undefined) continue;
    const key = `${item.sourcePath}\u0000${item.resolvedTargetPath}\u0000${item.specifier}`;
    if (associationKeys.has(key)) continue;
    associationKeys.add(key);
    budget.record();
    testAssociations.push(Object.freeze({
      testSourcePath: item.sourcePath,
      testSourceDigest: test.contentDigest,
      targetSourcePath: item.resolvedTargetPath,
      targetSourceDigest: target.contentDigest,
      specifier: item.specifier,
      basis: "STATIC_TEST_IMPORT"
    }));
  }

  fileRecords.sort(compareFiles);
  manifests.sort((left, right) => compareText(left.sourcePath, right.sourcePath));
  imports.sort(compareImports);
  exports.sort(compareExports);
  contracts.sort(compareContracts);
  routes.sort(compareRoutes);
  testAssociations.sort(compareAssociations);
  diagnostics.items.sort(compareDiagnostics);
  budget.check();

  const document = Object.freeze({
    extractionVersion: CODE_MAP_EXTRACTION_VERSION,
    authority: "STATIC_SYNTAX_ONLY" as const,
    runtimeSemantics: "NOT_OBSERVED" as const,
    completeness:
      diagnostics.items.length === 0 && !diagnostics.truncated
        ? "COMPLETE" as const
        : "PARTIAL" as const,
    projectId: scan.projectId,
    missionId: scan.missionId,
    registrationId: scan.registrationId,
    sourceScanVersion: scan.scanVersion,
    sourceCoverage: validated.coverage,
    sourceFileCount: scan.scannedFileCount,
    sourceByteCount: scan.scannedByteCount,
    files: Object.freeze(fileRecords),
    manifests: Object.freeze(manifests),
    imports: Object.freeze(imports),
    exports: Object.freeze(exports),
    contracts: Object.freeze(contracts),
    routes: Object.freeze(routes),
    testAssociations: Object.freeze(testAssociations),
    diagnostics: Object.freeze(diagnostics.items),
    diagnosticsTruncated: diagnostics.truncated
  });
  const extractionDigest = await canonicalJsonDigest(document);
  budget.check();
  return Object.freeze({ ...document, extractionDigest });
}

export class CodeMapExtractor {
  readonly #dependencies: CodeMapExtractionDependencies;

  constructor(dependencies: CodeMapExtractionDependencies = DEFAULT_DEPENDENCIES) {
    this.#dependencies = dependencies;
  }

  extract(scan: CodeMapSourceScan): Promise<CodeMapExtraction> {
    return extractCodeMap(scan, this.#dependencies);
  }
}
