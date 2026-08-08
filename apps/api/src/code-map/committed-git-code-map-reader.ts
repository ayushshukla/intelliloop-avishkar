import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import { performance } from "node:perf_hooks";
import { TextDecoder } from "node:util";

import {
  parseSha256Digest,
  type GitSnapshot,
  type Sha256Digest
} from "@intelliloop/domain";

import {
  CODE_MAP_ALLOWED_EXTENSIONS,
  CODE_MAP_SCAN_LIMITS,
  CODE_MAP_SCAN_VERSION,
  CodeMapScanError,
  type CodeMapSkippedDirectory,
  type CodeMapSkippedExtension,
  type CodeMapSourceExtension,
  type CodeMapSourceScan
} from "./code-map-scanner.js";

interface TreeBlob {
  readonly oid: string;
  readonly relativePath: string;
  readonly extension: CodeMapSourceExtension;
  readonly size: number;
}

interface GitProcessResult {
  readonly exitCode: number;
  readonly stdout: Buffer;
}

const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const TREE_RECORD_PATTERN = /^(100644|100755) blob ([0-9a-f]{40}|[0-9a-f]{64}) +([0-9]+)\t/u;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const SENSITIVE_PATH_PATTERN = /(?:^|\/)(?:\.env(?:\.|$)|.*(?:secret|credential|token|private[-_.]?key|keystore|certificate|\.pem$|\.pfx$|\.p12$|\.key$|\.jks$|\.dump$|\.sql$)|(?:config|settings)\.local(?:\.|$))/iu;
const MAXIMUM_GIT_OUTPUT_BYTES = 16 * 1024 * 1024;

function safeGitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (name.toUpperCase().startsWith("GIT_")) delete environment[name];
  }
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.LC_ALL = "C";
  return environment;
}

function remainingMilliseconds(startedAt: number): number {
  const remaining = CODE_MAP_SCAN_LIMITS.maximumMilliseconds -
    (performance.now() - startedAt);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new CodeMapScanError("CODE_MAP_SCAN_TIMEOUT");
  }
  return Math.max(1, Math.floor(remaining));
}

async function runGit(
  repositoryRoot: string,
  args: readonly string[],
  startedAt: number,
  stdin?: Buffer
): Promise<GitProcessResult> {
  const timeoutMs = remainingMilliseconds(startedAt);
  return new Promise((resolve, reject) => {
    let settled = false;
    let outputBytes = 0;
    const chunks: Buffer[] = [];
    const child = spawn("git", args, {
      cwd: repositoryRoot,
      shell: false,
      windowsHide: true,
      stdio: [stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      env: safeGitEnvironment()
    });
    const finish = (error?: CodeMapScanError, result?: GitProcessResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error !== undefined) reject(error);
      else if (result !== undefined) resolve(result);
    };
    const accept = (chunk: Buffer, retain: boolean): void => {
      if (settled) return;
      outputBytes += chunk.length;
      if (outputBytes > MAXIMUM_GIT_OUTPUT_BYTES) {
        child.kill();
        finish(new CodeMapScanError("CODE_MAP_AGGREGATE_BYTES_EXCEEDED"));
      } else if (retain) {
        chunks.push(chunk);
      }
    };
    child.stdout!.on("data", (chunk: Buffer) => accept(chunk, true));
    child.stderr!.on("data", (chunk: Buffer) => accept(chunk, false));
    child.once("error", () => finish(new CodeMapScanError("CODE_MAP_READ_FAILED")));
    child.once("close", (exitCode) => {
      if (exitCode === null) finish(new CodeMapScanError("CODE_MAP_SCAN_FAILED"));
      else finish(undefined, { exitCode, stdout: Buffer.concat(chunks) });
    });
    if (stdin !== undefined) {
      child.stdin!.on("error", () => finish(new CodeMapScanError("CODE_MAP_READ_FAILED")));
      child.stdin!.end(stdin);
    }
    const timeout = setTimeout(() => {
      child.kill();
      finish(new CodeMapScanError("CODE_MAP_SCAN_TIMEOUT"));
    }, timeoutMs);
    timeout.unref();
  });
}

function decode(buffer: Buffer): string {
  try {
    return UTF8_DECODER.decode(buffer);
  } catch {
    throw new CodeMapScanError("CODE_MAP_FILE_ENCODING_INVALID");
  }
}

function safeRelativePath(value: string): boolean {
  return value.length >= 1 && value.length <= 4_096 &&
    value === value.normalize("NFC") &&
    !isAbsolute(value) &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    !value.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function extensionFor(path: string): CodeMapSourceExtension | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  const extension = dot < 0 ? "" : name.slice(dot).toLowerCase();
  return CODE_MAP_ALLOWED_EXTENSIONS.includes(extension as CodeMapSourceExtension)
    ? extension as CodeMapSourceExtension
    : null;
}

function skippedExtension(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "[no-extension]";
  const extension = name.slice(dot).toLowerCase();
  return /^\.[a-z0-9][a-z0-9+_-]{0,30}$/u.test(extension)
    ? extension
    : "[other-extension]";
}

function digest(bytes: Buffer): Sha256Digest {
  return parseSha256Digest(`sha256:${createHash("sha256").update(bytes).digest("hex")}`);
}

function parseTree(
  output: Buffer
): {
  readonly blobs: readonly TreeBlob[];
  readonly encounteredFileCount: number;
  readonly skippedExtensions: ReadonlyMap<string, number>;
  readonly skippedNodeModules: number;
} {
  const fields = decode(output).split("\0");
  if (fields.pop() !== "") throw new CodeMapScanError("CODE_MAP_SCAN_FAILED");
  const blobs: TreeBlob[] = [];
  const skipped = new Map<string, number>();
  const nodeModuleDirectories = new Set<string>();
  let encounteredFileCount = 0;
  let aggregateBytes = 0;
  for (const record of fields) {
    const match = TREE_RECORD_PATTERN.exec(record);
    if (match === null) {
      if (/^[0-9]{6} commit /u.test(record)) continue;
      throw new CodeMapScanError("CODE_MAP_ENTRY_TYPE_UNSUPPORTED");
    }
    const oid = match[2] as string;
    const size = Number(match[3]);
    const path = record.slice(match[0].length);
    if (!safeRelativePath(path) || !Number.isSafeInteger(size) || size < 0) {
      throw new CodeMapScanError("CODE_MAP_TRAVERSAL_REJECTED");
    }
    const segments = path.split("/");
    const nodeModulesIndex = segments.indexOf("node_modules");
    if (nodeModulesIndex >= 0) {
      nodeModuleDirectories.add(segments.slice(0, nodeModulesIndex + 1).join("/"));
      continue;
    }
    encounteredFileCount += 1;
    if (encounteredFileCount > CODE_MAP_SCAN_LIMITS.maximumFiles) {
      throw new CodeMapScanError("CODE_MAP_FILE_LIMIT_EXCEEDED");
    }
    if (SENSITIVE_PATH_PATTERN.test(path)) {
      skipped.set("[sensitive-name]", (skipped.get("[sensitive-name]") ?? 0) + 1);
      continue;
    }
    const extension = extensionFor(path);
    if (extension === null) {
      const label = skippedExtension(path);
      skipped.set(label, (skipped.get(label) ?? 0) + 1);
      continue;
    }
    if (size > CODE_MAP_SCAN_LIMITS.maximumFileBytes) {
      throw new CodeMapScanError("CODE_MAP_FILE_BYTES_EXCEEDED");
    }
    aggregateBytes += size;
    if (aggregateBytes > CODE_MAP_SCAN_LIMITS.maximumAggregateBytes) {
      throw new CodeMapScanError("CODE_MAP_AGGREGATE_BYTES_EXCEEDED");
    }
    blobs.push(Object.freeze({ oid, relativePath: path, extension, size }));
  }
  blobs.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
  return Object.freeze({
    blobs: Object.freeze(blobs),
    encounteredFileCount,
    skippedExtensions: skipped,
    skippedNodeModules: nodeModuleDirectories.size
  });
}

function parseBatch(output: Buffer, blobs: readonly TreeBlob[]): CodeMapSourceScan["files"] {
  const files: Array<CodeMapSourceScan["files"][number]> = [];
  let offset = 0;
  for (const blob of blobs) {
    const newline = output.indexOf(0x0a, offset);
    if (newline < 0) throw new CodeMapScanError("CODE_MAP_READ_FAILED");
    const header = output.subarray(offset, newline).toString("ascii");
    const expected = `${blob.oid} blob ${blob.size}`;
    if (header !== expected) throw new CodeMapScanError("CODE_MAP_READ_FAILED");
    const start = newline + 1;
    const end = start + blob.size;
    if (end >= output.length || output[end] !== 0x0a) {
      throw new CodeMapScanError("CODE_MAP_READ_FAILED");
    }
    const bytes = output.subarray(start, end);
    files.push(Object.freeze({
      relativePath: blob.relativePath,
      extension: blob.extension,
      byteLength: blob.size,
      contentDigest: digest(bytes),
      content: decode(bytes)
    }));
    offset = end + 1;
  }
  if (offset !== output.length) throw new CodeMapScanError("CODE_MAP_READ_FAILED");
  return Object.freeze(files);
}

export async function readCommittedCodeMap(
  repositoryRoot: string,
  snapshot: GitSnapshot
): Promise<CodeMapSourceScan> {
  const commit = snapshot.headCommit;
  if (commit === undefined || !COMMIT_PATTERN.test(commit)) {
    throw new CodeMapScanError("CODE_MAP_SCAN_FAILED");
  }
  const startedAt = performance.now();
  const treeResult = await runGit(repositoryRoot, [
    "--no-optional-locks", "--no-replace-objects", "-c", "core.fsmonitor=false", "-c",
    "core.untrackedCache=false", "ls-tree", "-r", "-z", "--long",
    "--full-tree", commit
  ], startedAt);
  if (treeResult.exitCode !== 0) throw new CodeMapScanError("CODE_MAP_READ_FAILED");
  const tree = parseTree(treeResult.stdout);
  const batchInput = Buffer.from(`${tree.blobs.map((blob) => blob.oid).join("\n")}${tree.blobs.length === 0 ? "" : "\n"}`, "ascii");
  const batchResult = tree.blobs.length === 0
    ? { exitCode: 0, stdout: Buffer.alloc(0) }
    : await runGit(repositoryRoot, [
        "--no-optional-locks", "--no-replace-objects", "-c", "core.fsmonitor=false", "-c",
        "core.untrackedCache=false", "cat-file", "--batch"
      ], startedAt, batchInput);
  if (batchResult.exitCode !== 0) throw new CodeMapScanError("CODE_MAP_READ_FAILED");
  const files = parseBatch(batchResult.stdout, tree.blobs);
  const skippedExtensions: readonly CodeMapSkippedExtension[] = Object.freeze(
    [...tree.skippedExtensions.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([extension, fileCount]) => Object.freeze({ extension, fileCount }))
  );
  const skippedDirectories: readonly CodeMapSkippedDirectory[] = tree.skippedNodeModules === 0
    ? Object.freeze([])
    : Object.freeze([Object.freeze({ directoryName: "node_modules" as const, directoryCount: tree.skippedNodeModules })]);
  return Object.freeze({
    scanVersion: CODE_MAP_SCAN_VERSION,
    projectId: snapshot.projectId,
    missionId: snapshot.missionId,
    registrationId: snapshot.registrationId,
    allowedExtensions: CODE_MAP_ALLOWED_EXTENSIONS,
    limits: CODE_MAP_SCAN_LIMITS,
    encounteredFileCount: tree.encounteredFileCount,
    scannedFileCount: files.length,
    scannedByteCount: files.reduce((total, file) => total + file.byteLength, 0),
    skippedUnsupportedFileCount: tree.encounteredFileCount - files.length,
    skippedExtensions,
    skippedDirectories,
    files
  });
}
