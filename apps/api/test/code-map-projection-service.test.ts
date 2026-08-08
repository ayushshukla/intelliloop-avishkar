import { createHash } from "node:crypto";

import { INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP } from "@intelliloop/demo-fixtures";
import {
  createClock,
  createGitSnapshot,
  createStableIdGenerator,
  parseSha256Digest,
  parseStableId,
  type CodeMapProjectionRevision,
  type GitSnapshot,
  type MissionId
} from "@intelliloop/domain";
import { describe, expect, it } from "vitest";

import { CodeMapExtractor } from "../src/code-map/code-map-extractor.js";
import {
  CodeMapProjectionService,
  type CodeMapScanPort,
  type CodeMapProjectionRepositoryPort,
  type GitSnapshotCapturePort
} from "../src/code-map/code-map-projection-service.js";
import {
  CODE_MAP_ALLOWED_EXTENSIONS,
  CODE_MAP_SCAN_LIMITS,
  CODE_MAP_SCAN_VERSION,
  CodeMapScanError,
  type CodeMapSourceScan
} from "../src/code-map/code-map-scanner.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";
const S2 = "00000000-0000-4000-8000-000000000032";

function digest(content: string) {
  return parseSha256Digest(
    `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`
  );
}

function scan(): CodeMapSourceScan {
  const content = "export interface Policy { timeout: number }\n";
  return Object.freeze({
    scanVersion: CODE_MAP_SCAN_VERSION,
    projectId: parseStableId<"PROJECT">(P1),
    missionId: parseStableId<"MISSION">(M1),
    registrationId: parseStableId<"REPOSITORY_REGISTRATION">(R1),
    allowedExtensions: CODE_MAP_ALLOWED_EXTENSIONS,
    limits: CODE_MAP_SCAN_LIMITS,
    encounteredFileCount: 1,
    scannedFileCount: 1,
    scannedByteCount: Buffer.byteLength(content),
    skippedUnsupportedFileCount: 0,
    skippedExtensions: Object.freeze([]),
    skippedDirectories: Object.freeze([]),
    files: Object.freeze([
      Object.freeze({
        relativePath: "src/policy.ts",
        extension: ".ts" as const,
        byteLength: Buffer.byteLength(content),
        contentDigest: digest(content),
        content
      })
    ])
  });
}

async function snapshots(
  changed = false
): Promise<readonly [GitSnapshot, GitSnapshot]> {
  const make = (id: string, commit: string) => createGitSnapshot(
    {
      projectId: parseStableId<"PROJECT">(P1),
      missionId: parseStableId<"MISSION">(M1),
      registrationId: parseStableId<"REPOSITORY_REGISTRATION">(R1),
      head: { state: "ATTACHED", branchName: "main", headCommit: commit },
      changes: []
    },
    {
      ids: createStableIdGenerator(() => id),
      clock: createClock(() => new Date("2026-08-05T09:00:00.000Z"))
    }
  );
  return [
    await make(S1, "0123456789abcdef0123456789abcdef01234567"),
    await make(
      S2,
      changed
        ? "1123456789abcdef0123456789abcdef01234567"
        : "0123456789abcdef0123456789abcdef01234567"
    )
  ];
}

class MemoryRepository implements CodeMapProjectionRepositoryPort {
  current: CodeMapProjectionRevision | undefined;

  async latest(): Promise<CodeMapProjectionRevision | undefined> {
    return this.current;
  }

  async persist(projection: CodeMapProjectionRevision) {
    this.current = projection;
    return Object.freeze({ created: true, projection });
  }
}

function snapshotPort(values: readonly GitSnapshot[]): GitSnapshotCapturePort {
  let index = 0;
  return {
    capture: async () => {
      const value = values[index++];
      if (value === undefined) throw new Error("Snapshot fixture exhausted.");
      return value;
    }
  };
}

function service(input: {
  readonly snapshotValues: readonly GitSnapshot[];
  readonly scanner: CodeMapScanPort;
  readonly repository: MemoryRepository;
  readonly fallback?: true;
}) {
  return new CodeMapProjectionService({
    snapshots: snapshotPort(input.snapshotValues),
    scanner: input.scanner,
    extractor: new CodeMapExtractor(),
    repository: input.repository,
    clock: createClock(() => new Date("2026-08-05T09:01:00.000Z")),
    ...(input.fallback === true
      ? {
          fallback: {
            enabledForControlledIntelliLoopFixture: true as const,
            manifest: INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP
          }
        }
      : {})
  });
}

describe("code-map run orchestration", () => {
  it("binds successful static inference to the exact post-extraction snapshot", async () => {
    const values = await snapshots();
    const repository = new MemoryRepository();
    const result = await service({
      snapshotValues: values,
      scanner: { scan: async () => scan() },
      repository
    }).run(parseStableId<"MISSION">(M1));
    expect(result.projection).toMatchObject({
      snapshotId: S2,
      evidenceKind: "STATIC_INFERENCE",
      inferenceStatus: "AVAILABLE",
      completeness: "COMPLETE"
    });
    expect(result.projection.assets.some((asset) => asset.kind === "CONTRACT")).toBe(true);
  });

  it("uses explicit controlled manifest only for an eligible safe failure", async () => {
    const values = await snapshots();
    const repository = new MemoryRepository();
    const result = await service({
      snapshotValues: values,
      scanner: {
        scan: async () => {
          throw new CodeMapScanError("CODE_MAP_FILE_LIMIT_EXCEEDED");
        }
      },
      repository,
      fallback: true
    }).run(parseStableId<"MISSION">(M1), {
      allowDeclaredIntelliLoopFixtureFallback: true
    });
    expect(result.projection).toMatchObject({
      snapshotId: S2,
      evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
      inferenceStatus: "UNAVAILABLE_SAFE_FAILURE",
      completeness: "UNAVAILABLE",
      declaredManifestId: "intelliloop-checkout-modernization-v1",
      fallbackReason: "SCAN_LIMIT_OR_SAFE_FAILURE"
    });
  });

  it("does not hide repository movement or ineligible scan failures", async () => {
    const moved = await snapshots(true);
    await expect(
      service({
        snapshotValues: moved,
        scanner: { scan: async () => scan() },
        repository: new MemoryRepository()
      }).run(parseStableId<"MISSION">(M1))
    ).rejects.toMatchObject({ code: "CODE_MAP_RUN_SNAPSHOT_CHANGED" });

    const stable = await snapshots();
    await expect(
      service({
        snapshotValues: stable,
        scanner: {
          scan: async (_missionId: MissionId) => {
            throw new CodeMapScanError("CODE_MAP_REPOSITORY_CHANGED");
          }
        },
        repository: new MemoryRepository(),
        fallback: true
      }).run(parseStableId<"MISSION">(M1))
    ).rejects.toMatchObject({ code: "CODE_MAP_REPOSITORY_CHANGED" });
  });

  it("does not use a configured declared fallback without per-run consent", async () => {
    const stable = await snapshots();
    await expect(
      service({
        snapshotValues: stable,
        scanner: {
          scan: async () => {
            throw new CodeMapScanError("CODE_MAP_FILE_LIMIT_EXCEEDED");
          }
        },
        repository: new MemoryRepository(),
        fallback: true
      }).run(parseStableId<"MISSION">(M1))
    ).rejects.toMatchObject({ code: "CODE_MAP_FILE_LIMIT_EXCEEDED" });
  });
});
