import {
  INTELLILOOP_DECLARED_CODE_MAP_MANIFEST_VERSION,
  INTELLILOOP_FIXTURE_OWNERSHIP,
  type IntelliLoopDeclaredCodeMapManifest
} from "@intelliloop/demo-fixtures";
import {
  canonicalJsonDigest,
  createCodeMapProjectionRevision,
  parseSha256Digest,
  type Clock,
  type CodeMapAssetInput,
  type CodeMapEdgeInput,
  type CodeMapFallbackReason,
  type CodeMapProjectionRevision,
  type GitSnapshot,
  type MissionId
} from "@intelliloop/domain";

import {
  CodeMapExtractionError,
  type CodeMapExtraction,
  type CodeMapExtractor
} from "./code-map-extractor.js";
import {
  type PersistCodeMapRevisionResult,
  type SqliteCodeMapRepository
} from "./code-map-repository.js";
import {
  CodeMapScanError,
  type CodeMapScanner,
  type CodeMapSourceScan
} from "./code-map-scanner.js";
import type { GitSnapshotService } from "../projects/git-snapshot-service.js";

export const CODE_MAP_RUN_ERROR_CODES = [
  "CODE_MAP_RUN_SNAPSHOT_CHANGED",
  "CODE_MAP_RUN_SCOPE_MISMATCH",
  "CODE_MAP_RUN_FALLBACK_MANIFEST_INVALID"
] as const;

export type CodeMapRunErrorCode = (typeof CODE_MAP_RUN_ERROR_CODES)[number];

export class CodeMapRunError extends Error {
  readonly code: CodeMapRunErrorCode;

  constructor(code: CodeMapRunErrorCode) {
    super(code.replaceAll("_", " ").toLowerCase());
    this.name = "CodeMapRunError";
    this.code = code;
  }
}

export interface CodeMapScanPort {
  scan(missionId: MissionId, snapshot?: GitSnapshot): Promise<CodeMapSourceScan>;
}

export interface CodeMapExtractPort {
  extract(scan: CodeMapSourceScan): Promise<CodeMapExtraction>;
}

export interface GitSnapshotCapturePort {
  capture(missionId: MissionId): Promise<GitSnapshot>;
}

export interface CodeMapProjectionRepositoryPort {
  latest(
    projectId: GitSnapshot["projectId"],
    missionId: MissionId
  ): Promise<CodeMapProjectionRevision | undefined>;
  persist(
    projection: CodeMapProjectionRevision
  ): Promise<PersistCodeMapRevisionResult>;
}

export interface ExplicitDeclaredFallback {
  readonly enabledForControlledIntelliLoopFixture: true;
  readonly manifest: IntelliLoopDeclaredCodeMapManifest;
}

export interface CodeMapRunOptions {
  readonly allowDeclaredIntelliLoopFixtureFallback?: boolean;
}

const SCAN_FALLBACK_CODES = new Set([
  "CODE_MAP_SYMLINK_REJECTED",
  "CODE_MAP_ENTRY_TYPE_UNSUPPORTED",
  "CODE_MAP_FILE_LIMIT_EXCEEDED",
  "CODE_MAP_FILE_BYTES_EXCEEDED",
  "CODE_MAP_AGGREGATE_BYTES_EXCEEDED",
  "CODE_MAP_SCAN_TIMEOUT",
  "CODE_MAP_FILE_ENCODING_INVALID",
  "CODE_MAP_READ_FAILED"
]);

const EXTRACTION_FALLBACK_CODES = new Set([
  "CODE_MAP_EXTRACTION_NODE_LIMIT_EXCEEDED",
  "CODE_MAP_EXTRACTION_RECORD_LIMIT_EXCEEDED",
  "CODE_MAP_EXTRACTION_TIMEOUT",
  "CODE_MAP_EXTRACTION_FAILED"
]);

function sameRepositoryState(left: GitSnapshot, right: GitSnapshot): boolean {
  return (
    left.projectId === right.projectId &&
    left.missionId === right.missionId &&
    left.registrationId === right.registrationId &&
    left.headState === right.headState &&
    left.branchName === right.branchName &&
    left.headCommit === right.headCommit &&
    left.dirty === right.dirty &&
    left.indexChangeCount === right.indexChangeCount &&
    left.worktreeChangeCount === right.worktreeChangeCount &&
    left.untrackedFileCount === right.untrackedFileCount &&
    left.changedFileCount === right.changedFileCount &&
    left.changedFilesDigest === right.changedFilesDigest
  );
}

function fileKey(path: string): string {
  return `file:${path}`;
}

async function extractedMembers(extraction: CodeMapExtraction): Promise<{
  readonly assets: readonly CodeMapAssetInput[];
  readonly edges: readonly CodeMapEdgeInput[];
}> {
  const assets: CodeMapAssetInput[] = extraction.files.map((file) =>
    Object.freeze({
      memberKey: fileKey(file.sourcePath),
      kind: "FILE" as const,
      label: file.sourcePath,
      sourcePath: file.sourcePath,
      sourceDigest: file.contentDigest
    })
  );
  const edges: CodeMapEdgeInput[] = [];
  for (const manifest of extraction.manifests) {
    const memberKey = `package:${manifest.sourcePath}`;
    assets.push(Object.freeze({
      memberKey,
      kind: "PACKAGE",
      label: manifest.name ?? manifest.sourcePath,
      sourcePath: manifest.sourcePath,
      sourceDigest: manifest.contentDigest
    }));
    edges.push(Object.freeze({
      memberKey: `declares-package:${manifest.sourcePath}`,
      kind: "DECLARES_PACKAGE",
      fromMemberKey: memberKey,
      toMemberKey: fileKey(manifest.sourcePath)
    }));
  }
  for (const contract of extraction.contracts) {
    const memberKey = `contract:${contract.sourcePath}:${contract.line}:${contract.character}:${contract.name}`;
    assets.push(Object.freeze({
      memberKey,
      kind: "CONTRACT",
      label: contract.name,
      sourcePath: contract.sourcePath,
      sourceDigest: await canonicalJsonDigest(contract)
    }));
    edges.push(Object.freeze({
      memberKey: `declares-contract:${memberKey}`,
      kind: "DECLARES_CONTRACT",
      fromMemberKey: memberKey,
      toMemberKey: fileKey(contract.sourcePath)
    }));
  }
  for (const route of extraction.routes) {
    const memberKey = `route:${route.sourcePath}:${route.line}:${route.character}:${route.method}:${route.routePath}`;
    assets.push(Object.freeze({
      memberKey,
      kind: "ROUTE",
      label: `${route.method} ${route.routePath}`,
      sourcePath: route.sourcePath,
      sourceDigest: await canonicalJsonDigest(route)
    }));
    edges.push(Object.freeze({
      memberKey: `declares-route:${memberKey}`,
      kind: "DECLARES_ROUTE",
      fromMemberKey: memberKey,
      toMemberKey: fileKey(route.sourcePath)
    }));
  }
  for (const item of extraction.imports) {
    if (item.resolvedTargetPath === null) continue;
    edges.push(Object.freeze({
      memberKey: `imports:${item.sourcePath}:${item.specifier}:${item.resolvedTargetPath}`,
      kind: "IMPORTS",
      fromMemberKey: fileKey(item.sourcePath),
      toMemberKey: fileKey(item.resolvedTargetPath)
    }));
  }
  for (const item of extraction.exports) {
    if (item.resolvedTargetPath === null || item.specifier === null) continue;
    edges.push(Object.freeze({
      memberKey: `reexports:${item.sourcePath}:${item.exportedName}:${item.specifier}:${item.resolvedTargetPath}`,
      kind: "REEXPORTS",
      fromMemberKey: fileKey(item.sourcePath),
      toMemberKey: fileKey(item.resolvedTargetPath)
    }));
  }
  for (const item of extraction.testAssociations) {
    edges.push(Object.freeze({
      memberKey: `test-imports:${item.testSourcePath}:${item.targetSourcePath}:${item.specifier}`,
      kind: "TEST_IMPORTS",
      fromMemberKey: fileKey(item.testSourcePath),
      toMemberKey: fileKey(item.targetSourcePath)
    }));
  }
  return Object.freeze({
    assets: Object.freeze(assets),
    edges: Object.freeze(edges)
  });
}

async function declaredMembers(
  manifest: IntelliLoopDeclaredCodeMapManifest
): Promise<{
  readonly manifestDigest: ReturnType<typeof parseSha256Digest>;
  readonly assets: readonly CodeMapAssetInput[];
  readonly edges: readonly CodeMapEdgeInput[];
}> {
  if (
    manifest.manifestVersion !== INTELLILOOP_DECLARED_CODE_MAP_MANIFEST_VERSION ||
    manifest.ownership !== INTELLILOOP_FIXTURE_OWNERSHIP ||
    manifest.manifestId.length < 1 ||
    manifest.manifestId.length > 128 ||
    !Array.isArray(manifest.assets) ||
    !Array.isArray(manifest.edges)
  ) {
    throw new CodeMapRunError("CODE_MAP_RUN_FALLBACK_MANIFEST_INVALID");
  }
  const assets = manifest.assets.map((asset) => Object.freeze({
    memberKey: asset.memberKey,
    kind: asset.kind,
    label: asset.label,
    ...(asset.sourcePath === undefined ? {} : { sourcePath: asset.sourcePath }),
    sourceDigest: parseSha256Digest(asset.sourceDigest)
  }));
  const edges = manifest.edges.map((edge) => Object.freeze({ ...edge }));
  return Object.freeze({
    manifestDigest: await canonicalJsonDigest(manifest),
    assets: Object.freeze(assets),
    edges: Object.freeze(edges)
  });
}

function fallbackReason(error: unknown): CodeMapFallbackReason | undefined {
  if (error instanceof CodeMapScanError && SCAN_FALLBACK_CODES.has(error.code)) {
    return "SCAN_LIMIT_OR_SAFE_FAILURE";
  }
  if (
    error instanceof CodeMapExtractionError &&
    EXTRACTION_FALLBACK_CODES.has(error.code)
  ) {
    return "EXTRACTION_LIMIT_OR_SAFE_FAILURE";
  }
  return undefined;
}

export class CodeMapProjectionService {
  readonly #snapshots: GitSnapshotCapturePort;
  readonly #scanner: CodeMapScanPort;
  readonly #extractor: CodeMapExtractPort;
  readonly #repository: CodeMapProjectionRepositoryPort;
  readonly #clock: Clock;
  readonly #fallback: ExplicitDeclaredFallback | undefined;

  constructor(input: {
    readonly snapshots: GitSnapshotService | GitSnapshotCapturePort;
    readonly scanner: CodeMapScanner | CodeMapScanPort;
    readonly extractor: CodeMapExtractor | CodeMapExtractPort;
    readonly repository: SqliteCodeMapRepository | CodeMapProjectionRepositoryPort;
    readonly clock: Clock;
    readonly fallback?: ExplicitDeclaredFallback;
  }) {
    this.#snapshots = input.snapshots;
    this.#scanner = input.scanner;
    this.#extractor = input.extractor;
    this.#repository = input.repository;
    this.#clock = input.clock;
    this.#fallback = input.fallback;
  }

  async run(
    missionId: MissionId,
    options: CodeMapRunOptions = {}
  ): Promise<PersistCodeMapRevisionResult> {
    const before = await this.#snapshots.capture(missionId);
    let extraction: CodeMapExtraction;
    try {
      const scan = await this.#scanner.scan(missionId, before);
      if (
        scan.projectId !== before.projectId ||
        scan.missionId !== before.missionId ||
        scan.registrationId !== before.registrationId
      ) {
        throw new CodeMapRunError("CODE_MAP_RUN_SCOPE_MISMATCH");
      }
      extraction = await this.#extractor.extract(scan);
      if (
        extraction.projectId !== before.projectId ||
        extraction.missionId !== before.missionId ||
        extraction.registrationId !== before.registrationId
      ) {
        throw new CodeMapRunError("CODE_MAP_RUN_SCOPE_MISMATCH");
      }
    } catch (error) {
      const reason = fallbackReason(error);
      if (
        reason === undefined ||
        options.allowDeclaredIntelliLoopFixtureFallback !== true ||
        this.#fallback?.enabledForControlledIntelliLoopFixture !== true
      ) {
        throw error;
      }
      const after = await this.#snapshots.capture(missionId);
      if (!sameRepositoryState(before, after)) {
        throw new CodeMapRunError("CODE_MAP_RUN_SNAPSHOT_CHANGED");
      }
      const declared = await declaredMembers(this.#fallback.manifest);
      const previous = await this.#repository.latest(after.projectId, after.missionId);
      const projection = await createCodeMapProjectionRevision(
        {
          snapshot: after,
          recordedAtUtc: this.#clock.now(),
          mode: {
            evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
            completeness: "UNAVAILABLE",
            sourceDigest: declared.manifestDigest,
            declaredManifestId: this.#fallback.manifest.manifestId,
            fallbackReason: reason
          },
          assets: declared.assets,
          edges: declared.edges
        },
        previous
      );
      return this.#repository.persist(projection);
    }
    const after = await this.#snapshots.capture(missionId);
    if (!sameRepositoryState(before, after)) {
      throw new CodeMapRunError("CODE_MAP_RUN_SNAPSHOT_CHANGED");
    }
    const members = await extractedMembers(extraction);
    const previous = await this.#repository.latest(after.projectId, after.missionId);
    const projection = await createCodeMapProjectionRevision(
      {
        snapshot: after,
        recordedAtUtc: this.#clock.now(),
        mode: {
          evidenceKind: "STATIC_INFERENCE",
          completeness: extraction.completeness,
          sourceDigest: extraction.extractionDigest
        },
        assets: members.assets,
        edges: members.edges
      },
      previous
    );
    return this.#repository.persist(projection);
  }
}
