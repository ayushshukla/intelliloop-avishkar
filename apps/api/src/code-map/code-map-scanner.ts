import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { TextDecoder } from "node:util";

import {
  parseSha256Digest,
  parseStableId,
  type MissionId,
  type GitSnapshot,
  type ProjectId,
  type Sha256Digest
} from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";
import {
  RepositoryRegistrationError,
  type RepositoryRegistrationId,
  type RepositoryRegistrationService
} from "../projects/repository-registration.js";
import { readCommittedCodeMap } from "./committed-git-code-map-reader.js";

export const CODE_MAP_SCAN_VERSION = "code-map-source-scan.v1" as const;

export const CODE_MAP_ALLOWED_EXTENSIONS = Object.freeze([
  ".js",
  ".jsx",
  ".json",
  ".ts",
  ".tsx"
] as const);

export type CodeMapSourceExtension =
  (typeof CODE_MAP_ALLOWED_EXTENSIONS)[number];

export const CODE_MAP_SCAN_LIMITS = Object.freeze({
  maximumFiles: 2_000,
  maximumAggregateBytes: 5 * 1024 * 1024,
  maximumFileBytes: 256 * 1024,
  maximumMilliseconds: 5_000
});

export const CODE_MAP_SCAN_ERROR_CODES = [
  "CODE_MAP_MISSION_NOT_FOUND",
  "CODE_MAP_MISSION_ARCHIVED",
  "CODE_MAP_REPOSITORY_NOT_REGISTERED",
  "CODE_MAP_ROOT_UNSAFE",
  "CODE_MAP_TRAVERSAL_REJECTED",
  "CODE_MAP_SYMLINK_REJECTED",
  "CODE_MAP_ENTRY_TYPE_UNSUPPORTED",
  "CODE_MAP_FILE_LIMIT_EXCEEDED",
  "CODE_MAP_FILE_BYTES_EXCEEDED",
  "CODE_MAP_AGGREGATE_BYTES_EXCEEDED",
  "CODE_MAP_SCAN_TIMEOUT",
  "CODE_MAP_FILE_ENCODING_INVALID",
  "CODE_MAP_REPOSITORY_CHANGED",
  "CODE_MAP_READ_FAILED",
  "CODE_MAP_SCAN_FAILED"
] as const;

export type CodeMapScanErrorCode =
  (typeof CODE_MAP_SCAN_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<CodeMapScanErrorCode, string>> =
  Object.freeze({
    CODE_MAP_MISSION_NOT_FOUND: "Code-map mission was not found.",
    CODE_MAP_MISSION_ARCHIVED: "Archived missions cannot run code-map scans.",
    CODE_MAP_REPOSITORY_NOT_REGISTERED:
      "A repository is not registered for this mission.",
    CODE_MAP_ROOT_UNSAFE: "Registered repository root is unsafe.",
    CODE_MAP_TRAVERSAL_REJECTED: "Code-map traversal was rejected.",
    CODE_MAP_SYMLINK_REJECTED:
      "Code-map scan encountered an unsafe symbolic link.",
    CODE_MAP_ENTRY_TYPE_UNSUPPORTED:
      "Code-map scan encountered an unsupported filesystem entry.",
    CODE_MAP_FILE_LIMIT_EXCEEDED:
      "Code-map scan exceeded its file limit.",
    CODE_MAP_FILE_BYTES_EXCEEDED:
      "Code-map scan encountered an oversized source file.",
    CODE_MAP_AGGREGATE_BYTES_EXCEEDED:
      "Code-map scan exceeded its aggregate byte limit.",
    CODE_MAP_SCAN_TIMEOUT: "Code-map scan exceeded its time limit.",
    CODE_MAP_FILE_ENCODING_INVALID:
      "Code-map source file is not valid UTF-8 text.",
    CODE_MAP_REPOSITORY_CHANGED:
      "Repository content changed during code-map scanning.",
    CODE_MAP_READ_FAILED: "Code-map source could not be read safely.",
    CODE_MAP_SCAN_FAILED: "Code-map scan could not be completed."
  });

export class CodeMapScanError extends Error {
  readonly code: CodeMapScanErrorCode;

  constructor(code: CodeMapScanErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "CodeMapScanError";
    this.code = code;
  }
}

export interface CodeMapScannedSourceFile {
  readonly relativePath: string;
  readonly extension: CodeMapSourceExtension;
  readonly byteLength: number;
  readonly contentDigest: Sha256Digest;
  readonly content: string;
}

export interface CodeMapSkippedExtension {
  readonly extension: string;
  readonly fileCount: number;
}

export interface CodeMapSkippedDirectory {
  readonly directoryName: ".git" | "node_modules";
  readonly directoryCount: number;
}

export interface CodeMapSourceScan {
  readonly scanVersion: typeof CODE_MAP_SCAN_VERSION;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly registrationId: RepositoryRegistrationId;
  readonly allowedExtensions: readonly CodeMapSourceExtension[];
  readonly limits: typeof CODE_MAP_SCAN_LIMITS;
  readonly encounteredFileCount: number;
  readonly scannedFileCount: number;
  readonly scannedByteCount: number;
  readonly skippedUnsupportedFileCount: number;
  readonly skippedExtensions: readonly CodeMapSkippedExtension[];
  readonly skippedDirectories: readonly CodeMapSkippedDirectory[];
  readonly files: readonly CodeMapScannedSourceFile[];
}

type CodeMapEntryKind = "FILE" | "DIRECTORY" | "SYMLINK" | "OTHER";

export interface CodeMapFileInspection {
  readonly kind: CodeMapEntryKind;
  readonly size: number;
}

export interface CodeMapSourceRead {
  readonly bytes: Uint8Array;
  readonly byteLength: number;
}

export interface CodeMapReadFileSystem {
  inspect(path: string): Promise<CodeMapFileInspection>;
  canonicalize(path: string): Promise<string>;
  list(directory: string): Promise<readonly string[]>;
  readSource(path: string, maximumBytes: number): Promise<CodeMapSourceRead>;
}

export interface CodeMapScanDependencies {
  readonly fileSystem: CodeMapReadFileSystem;
  readonly monotonicNow: () => number;
}

interface CodeMapRootInput {
  readonly canonicalRoot: string;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly registrationId: RepositoryRegistrationId;
}

interface MissionRow {
  readonly project_id: string;
  readonly mission_status: string;
  readonly project_status: string;
}

class CodeMapFileReadError extends Error {
  readonly reason: "CHANGED" | "NOT_FILE" | "OVERSIZED";

  constructor(reason: CodeMapFileReadError["reason"]) {
    super("Bounded source read failed.");
    this.name = "CodeMapFileReadError";
    this.reason = reason;
  }
}

function errorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "";
}

function inspectionKind(stat: Awaited<ReturnType<typeof lstat>>): CodeMapEntryKind {
  if (stat.isSymbolicLink()) return "SYMLINK";
  if (stat.isFile()) return "FILE";
  if (stat.isDirectory()) return "DIRECTORY";
  return "OTHER";
}

function sameFileStat(
  left: Awaited<ReturnType<Awaited<ReturnType<typeof open>>["stat"]>>,
  right: Awaited<ReturnType<Awaited<ReturnType<typeof open>>["stat"]>>
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

const NODE_FILE_SYSTEM: CodeMapReadFileSystem = Object.freeze({
  async inspect(path: string): Promise<CodeMapFileInspection> {
    const stat = await lstat(path);
    return Object.freeze({ kind: inspectionKind(stat), size: stat.size });
  },

  canonicalize(path: string): Promise<string> {
    return realpath(path);
  },

  async list(directory: string): Promise<readonly string[]> {
    return Object.freeze(await readdir(directory, { encoding: "utf8" }));
  },

  async readSource(
    path: string,
    maximumBytes: number
  ): Promise<CodeMapSourceRead> {
    const noFollow =
      typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
    const handle = await open(path, constants.O_RDONLY | noFollow);
    try {
      const before = await handle.stat();
      if (!before.isFile()) throw new CodeMapFileReadError("NOT_FILE");
      if (before.size > maximumBytes) {
        throw new CodeMapFileReadError("OVERSIZED");
      }

      const buffer = Buffer.allocUnsafe(maximumBytes + 1);
      let offset = 0;
      while (offset < buffer.length) {
        const read = await handle.read(
          buffer,
          offset,
          buffer.length - offset,
          offset
        );
        if (read.bytesRead === 0) break;
        offset += read.bytesRead;
      }
      if (offset > maximumBytes) {
        throw new CodeMapFileReadError("OVERSIZED");
      }

      const after = await handle.stat();
      if (
        !after.isFile() ||
        offset !== after.size ||
        !sameFileStat(before, after)
      ) {
        throw new CodeMapFileReadError("CHANGED");
      }
      return Object.freeze({
        bytes: Uint8Array.from(buffer.subarray(0, offset)),
        byteLength: offset
      });
    } finally {
      await handle.close();
    }
  }
});

const DEFAULT_DEPENDENCIES: CodeMapScanDependencies = Object.freeze({
  fileSystem: NODE_FILE_SYSTEM,
  monotonicNow: () => performance.now()
});

function comparisonPath(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function samePath(left: string, right: string): boolean {
  return comparisonPath(left) === comparisonPath(right);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function containsPath(root: string, candidate: string): boolean {
  if (samePath(root, candidate)) return true;
  const relation = relative(root, candidate);
  return relation !== "" && !relation.startsWith("..") && !isAbsolute(relation);
}

function pathSegments(value: string): readonly string[] {
  return value.split(/[\\/]+/u);
}

function isSafeEntryName(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 255 &&
    value === value.normalize("NFC") &&
    value !== "." &&
    value !== ".." &&
    !/[\\/\u0000-\u001f\u007f]/u.test(value)
  );
}

function assertRootShape(root: string): void {
  if (
    root.length < 1 ||
    root.length > 4_096 ||
    root !== root.trim() ||
    root.includes("\0") ||
    !isAbsolute(root) ||
    pathSegments(root).some((segment) => segment === "..") ||
    !samePath(resolve(root), root)
  ) {
    throw new CodeMapScanError("CODE_MAP_ROOT_UNSAFE");
  }
}

function childPath(
  root: string,
  parentRelativePath: string,
  name: string
): { readonly absolutePath: string; readonly relativePath: string } {
  if (!isSafeEntryName(name)) {
    throw new CodeMapScanError("CODE_MAP_TRAVERSAL_REJECTED");
  }
  const relativePath =
    parentRelativePath === "" ? name : `${parentRelativePath}/${name}`;
  if (
    relativePath.length > 4_096 ||
    pathSegments(relativePath).some(
      (segment) => segment === "" || segment === "." || segment === ".."
    )
  ) {
    throw new CodeMapScanError("CODE_MAP_TRAVERSAL_REJECTED");
  }
  const absolutePath = resolve(root, ...relativePath.split("/"));
  if (!containsPath(root, absolutePath)) {
    throw new CodeMapScanError("CODE_MAP_TRAVERSAL_REJECTED");
  }
  return Object.freeze({ absolutePath, relativePath });
}

function mapFileSystemFailure(error: unknown): CodeMapScanError {
  if (error instanceof CodeMapScanError) return error;
  if (error instanceof CodeMapFileReadError) {
    switch (error.reason) {
      case "CHANGED":
        return new CodeMapScanError("CODE_MAP_REPOSITORY_CHANGED");
      case "NOT_FILE":
        return new CodeMapScanError("CODE_MAP_ENTRY_TYPE_UNSUPPORTED");
      case "OVERSIZED":
        return new CodeMapScanError("CODE_MAP_FILE_BYTES_EXCEEDED");
    }
  }
  const code = errorCode(error);
  if (code === "ELOOP") {
    return new CodeMapScanError("CODE_MAP_SYMLINK_REJECTED");
  }
  if (code === "ENOENT" || code === "ENOTDIR") {
    return new CodeMapScanError("CODE_MAP_REPOSITORY_CHANGED");
  }
  return new CodeMapScanError("CODE_MAP_READ_FAILED");
}

class ScanDeadline {
  readonly #startedAt: number;
  readonly #now: () => number;

  constructor(now: () => number) {
    this.#now = now;
    this.#startedAt = now();
    if (!Number.isFinite(this.#startedAt) || this.#startedAt < 0) {
      throw new CodeMapScanError("CODE_MAP_SCAN_FAILED");
    }
  }

  #remaining(): number {
    const current = this.#now();
    if (!Number.isFinite(current) || current < this.#startedAt) {
      throw new CodeMapScanError("CODE_MAP_SCAN_FAILED");
    }
    const remaining = CODE_MAP_SCAN_LIMITS.maximumMilliseconds -
      (current - this.#startedAt);
    if (remaining <= 0) {
      throw new CodeMapScanError("CODE_MAP_SCAN_TIMEOUT");
    }
    return remaining;
  }

  check(): void {
    this.#remaining();
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const remaining = this.#remaining();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new CodeMapScanError("CODE_MAP_SCAN_TIMEOUT"));
        }, remaining);
      });
      const result = await Promise.race([operation(), timeoutPromise]);
      this.check();
      return result;
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
}

function supportedExtension(name: string): CodeMapSourceExtension | null {
  const lastDot = name.lastIndexOf(".");
  const extension = lastDot < 0 ? "" : name.slice(lastDot).toLowerCase();
  return CODE_MAP_ALLOWED_EXTENSIONS.includes(
    extension as CodeMapSourceExtension
  )
    ? (extension as CodeMapSourceExtension)
    : null;
}

function skippedExtensionLabel(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot < 0 || lastDot === name.length - 1) return "[no-extension]";
  const extension = name.slice(lastDot).toLowerCase();
  return /^\.[a-z0-9][a-z0-9+_-]{0,30}$/u.test(extension)
    ? extension
    : "[other-extension]";
}

function digestBytes(bytes: Uint8Array): Sha256Digest {
  return parseSha256Digest(
    `sha256:${createHash("sha256").update(bytes).digest("hex")}`
  );
}

// Preserve a leading UTF-8 BOM in the decoded value. The scanner records the
// exact source bytes and the extractor independently re-encodes content to
// verify that byte length and digest still match. TextDecoder strips a BOM by
// default, which made otherwise valid Windows-authored UTF-8 files fail that
// integrity boundary.
const UTF8_DECODER = new TextDecoder("utf-8", {
  fatal: true,
  ignoreBOM: true
});
const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules"]);

export async function scanCodeMapRoot(
  input: CodeMapRootInput,
  dependencies: CodeMapScanDependencies = DEFAULT_DEPENDENCIES
): Promise<CodeMapSourceScan> {
  assertRootShape(input.canonicalRoot);
  const deadline = new ScanDeadline(dependencies.monotonicNow);

  let rootInspection: CodeMapFileInspection;
  let verifiedRoot: string;
  try {
    rootInspection = await deadline.run(() =>
      dependencies.fileSystem.inspect(input.canonicalRoot)
    );
    verifiedRoot = await deadline.run(() =>
      dependencies.fileSystem.canonicalize(input.canonicalRoot)
    );
  } catch (error) {
    throw mapFileSystemFailure(error);
  }
  if (rootInspection.kind === "SYMLINK") {
    throw new CodeMapScanError("CODE_MAP_SYMLINK_REJECTED");
  }
  if (
    rootInspection.kind !== "DIRECTORY" ||
    !samePath(verifiedRoot, input.canonicalRoot)
  ) {
    throw new CodeMapScanError("CODE_MAP_ROOT_UNSAFE");
  }

  const files: CodeMapScannedSourceFile[] = [];
  const skippedExtensions = new Map<string, number>();
  const skippedDirectories = new Map<".git" | "node_modules", number>();
  let encounteredFileCount = 0;
  let scannedByteCount = 0;

  const walk = async (
    absoluteDirectory: string,
    relativeDirectory: string
  ): Promise<void> => {
    deadline.check();
    let names: readonly string[];
    try {
      names = await deadline.run(() =>
        dependencies.fileSystem.list(absoluteDirectory)
      );
    } catch (error) {
      throw mapFileSystemFailure(error);
    }

    for (const name of [...names].sort(compareText)) {
      deadline.check();
      const candidate = childPath(input.canonicalRoot, relativeDirectory, name);
      let inspection: CodeMapFileInspection;
      let canonical: string;
      try {
        inspection = await deadline.run(() =>
          dependencies.fileSystem.inspect(candidate.absolutePath)
        );
        canonical = await deadline.run(() =>
          dependencies.fileSystem.canonicalize(candidate.absolutePath)
        );
      } catch (error) {
        throw mapFileSystemFailure(error);
      }
      if (inspection.kind === "SYMLINK") {
        throw new CodeMapScanError("CODE_MAP_SYMLINK_REJECTED");
      }
      if (
        !containsPath(input.canonicalRoot, canonical) ||
        !samePath(canonical, candidate.absolutePath)
      ) {
        throw new CodeMapScanError("CODE_MAP_SYMLINK_REJECTED");
      }

      if (inspection.kind === "DIRECTORY") {
        if (EXCLUDED_DIRECTORIES.has(name)) {
          const excluded = name as ".git" | "node_modules";
          skippedDirectories.set(
            excluded,
            (skippedDirectories.get(excluded) ?? 0) + 1
          );
        } else {
          await walk(candidate.absolutePath, candidate.relativePath);
        }
        continue;
      }
      if (inspection.kind !== "FILE") {
        throw new CodeMapScanError("CODE_MAP_ENTRY_TYPE_UNSUPPORTED");
      }

      encounteredFileCount += 1;
      if (encounteredFileCount > CODE_MAP_SCAN_LIMITS.maximumFiles) {
        throw new CodeMapScanError("CODE_MAP_FILE_LIMIT_EXCEEDED");
      }

      const extension = supportedExtension(name);
      if (extension === null) {
        const label = skippedExtensionLabel(name);
        skippedExtensions.set(label, (skippedExtensions.get(label) ?? 0) + 1);
        continue;
      }
      if (inspection.size > CODE_MAP_SCAN_LIMITS.maximumFileBytes) {
        throw new CodeMapScanError("CODE_MAP_FILE_BYTES_EXCEEDED");
      }

      let source: CodeMapSourceRead;
      try {
        source = await deadline.run(() =>
          dependencies.fileSystem.readSource(
            candidate.absolutePath,
            CODE_MAP_SCAN_LIMITS.maximumFileBytes
          )
        );
      } catch (error) {
        throw mapFileSystemFailure(error);
      }
      if (
        source.byteLength !== source.bytes.byteLength ||
        source.byteLength !== inspection.size ||
        source.byteLength > CODE_MAP_SCAN_LIMITS.maximumFileBytes
      ) {
        throw new CodeMapScanError("CODE_MAP_REPOSITORY_CHANGED");
      }
      if (
        scannedByteCount + source.byteLength >
        CODE_MAP_SCAN_LIMITS.maximumAggregateBytes
      ) {
        throw new CodeMapScanError("CODE_MAP_AGGREGATE_BYTES_EXCEEDED");
      }

      let content: string;
      try {
        content = UTF8_DECODER.decode(source.bytes);
      } catch {
        throw new CodeMapScanError("CODE_MAP_FILE_ENCODING_INVALID");
      }
      scannedByteCount += source.byteLength;
      files.push(
        Object.freeze({
          relativePath: candidate.relativePath,
          extension,
          byteLength: source.byteLength,
          contentDigest: digestBytes(source.bytes),
          content
        })
      );
    }
  };

  await walk(input.canonicalRoot, "");
  deadline.check();

  let finalRoot: string;
  try {
    finalRoot = await deadline.run(() =>
      dependencies.fileSystem.canonicalize(input.canonicalRoot)
    );
  } catch (error) {
    throw mapFileSystemFailure(error);
  }
  if (!samePath(finalRoot, input.canonicalRoot)) {
    throw new CodeMapScanError("CODE_MAP_ROOT_UNSAFE");
  }

  files.sort((left, right) =>
    compareText(left.relativePath, right.relativePath)
  );
  const skippedExtensionItems = [...skippedExtensions.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([extension, fileCount]) =>
      Object.freeze({ extension, fileCount })
    );
  const skippedDirectoryItems = [...skippedDirectories.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([directoryName, directoryCount]) =>
      Object.freeze({ directoryName, directoryCount })
    );

  return Object.freeze({
    scanVersion: CODE_MAP_SCAN_VERSION,
    projectId: input.projectId,
    missionId: input.missionId,
    registrationId: input.registrationId,
    allowedExtensions: CODE_MAP_ALLOWED_EXTENSIONS,
    limits: CODE_MAP_SCAN_LIMITS,
    encounteredFileCount,
    scannedFileCount: files.length,
    scannedByteCount,
    skippedUnsupportedFileCount:
      encounteredFileCount - files.length,
    skippedExtensions: Object.freeze(skippedExtensionItems),
    skippedDirectories: Object.freeze(skippedDirectoryItems),
    files: Object.freeze(files)
  });
}

function mapRegistrationFailure(error: RepositoryRegistrationError): CodeMapScanError {
  if (error.code === "REPOSITORY_NOT_REGISTERED") {
    return new CodeMapScanError("CODE_MAP_REPOSITORY_NOT_REGISTERED");
  }
  if (
    error.code === "REPOSITORY_SYMLINK_REJECTED" ||
    error.code === "REPOSITORY_PATH_INVALID" ||
    error.code === "REPOSITORY_PATH_NOT_FOUND" ||
    error.code === "REPOSITORY_DATABASE_CONFLICT" ||
    error.code === "REPOSITORY_NOT_GIT"
  ) {
    return new CodeMapScanError("CODE_MAP_ROOT_UNSAFE");
  }
  return new CodeMapScanError("CODE_MAP_SCAN_FAILED");
}

export class CodeMapScanner {
  readonly #connection: SqliteConnection;
  readonly #registrations: RepositoryRegistrationService;
  readonly #dependencies: CodeMapScanDependencies;

  constructor(
    connection: SqliteConnection,
    registrations: RepositoryRegistrationService,
    dependencies: CodeMapScanDependencies = DEFAULT_DEPENDENCIES
  ) {
    this.#connection = connection;
    this.#registrations = registrations;
    this.#dependencies = dependencies;
  }

  async scan(
    missionId: MissionId,
    snapshot?: GitSnapshot
  ): Promise<CodeMapSourceScan> {
    let mission: MissionRow | undefined;
    try {
      mission = this.#connection
        .prepare(
          `SELECT m.project_id, m.lifecycle_status AS mission_status,
                  p.lifecycle_status AS project_status
           FROM missions m
           JOIN projects p ON p.project_id = m.project_id
           WHERE m.mission_id = ?`
        )
        .get(missionId) as MissionRow | undefined;
    } catch {
      throw new CodeMapScanError("CODE_MAP_SCAN_FAILED");
    }
    if (mission === undefined) {
      throw new CodeMapScanError("CODE_MAP_MISSION_NOT_FOUND");
    }
    if (
      mission.mission_status !== "CURRENT" ||
      mission.project_status !== "ACTIVE"
    ) {
      throw new CodeMapScanError("CODE_MAP_MISSION_ARCHIVED");
    }

    const projectId = parseStableId<"PROJECT">(mission.project_id);
    try {
      const registration = this.#registrations.get(projectId);
      const canonicalRoot = this.#registrations.resolveRootForRead(projectId);
      if (snapshot !== undefined) {
        if (
          snapshot.projectId !== projectId ||
          snapshot.missionId !== missionId ||
          snapshot.registrationId !== registration.registrationId ||
          snapshot.headCommit === undefined
        ) {
          throw new CodeMapScanError("CODE_MAP_REPOSITORY_CHANGED");
        }
        return await readCommittedCodeMap(canonicalRoot, snapshot);
      }
      return await scanCodeMapRoot(
        {
          canonicalRoot,
          projectId,
          missionId,
          registrationId: registration.registrationId
        },
        this.#dependencies
      );
    } catch (error) {
      if (error instanceof CodeMapScanError) throw error;
      if (error instanceof RepositoryRegistrationError) {
        throw mapRegistrationFailure(error);
      }
      throw new CodeMapScanError("CODE_MAP_SCAN_FAILED");
    }
  }
}
