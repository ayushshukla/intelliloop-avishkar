import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import {
  CODE_MAP_ALLOWED_EXTENSIONS,
  CODE_MAP_SCAN_LIMITS,
  CodeMapScanner,
  CodeMapScanError,
  scanCodeMapRoot,
  type CodeMapReadFileSystem,
  type CodeMapScanDependencies
} from "../src/code-map/code-map-scanner.js";
import {
  openFoundationDatabase,
  type FoundationDatabase
} from "../src/database/database-lifecycle.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const M2 = "00000000-0000-4000-8000-000000000012";
const R1 = "00000000-0000-4000-8000-000000000021";
const T0 = "2026-08-05T00:00:00.000Z";
const T1 = "2026-08-05T00:01:00.000Z";

const directories: string[] = [];
const databases: FoundationDatabase[] = [];

function sequential(values: readonly string[]): () => string {
  let index = 0;
  return () => values[index++] ?? "fixture-exhausted";
}

function projectDependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(sequential([P1, M1])),
    clock: createClock(() => new Date(T0))
  };
}

function registrationDependencies(): RepositoryRegistrationDependencies {
  return {
    ids: createStableIdGenerator(() => R1),
    clock: createClock(() => new Date(T1))
  };
}

function createGitRoot(parent: string): string {
  const root = join(parent, "controlled-repository");
  mkdirSync(join(root, ".git", "objects"), { recursive: true });
  mkdirSync(join(root, ".git", "refs", "heads"), { recursive: true });
  writeFileSync(join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");
  return root;
}

function environment(register = true) {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-code-map-"));
  directories.push(root);
  const databasePath = join(root, "data", "intelliloop.sqlite3");
  const repositoryRoot = createGitRoot(root);
  const database = openFoundationDatabase({ filePath: databasePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const project = projects.createProject("Controlled project");
  const mission = projects.createMission(
    project.projectId,
    "Controlled mission"
  );
  const registrations = new RepositoryRegistrationService(
    database.connection,
    databasePath,
    registrationDependencies()
  );
  if (register) registrations.register(project.projectId, repositoryRoot);
  return {
    root,
    database,
    projects,
    project,
    mission,
    registrations,
    repositoryRoot,
    scanner: new CodeMapScanner(database.connection, registrations)
  };
}

function treeDigest(root: string): string {
  const records: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const scoped = relative(root, path).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        records.push(`directory:${scoped}`);
        visit(path);
      } else if (entry.isFile()) {
        records.push(
          `file:${scoped}:${createHash("sha256")
            .update(readFileSync(path))
            .digest("hex")}`
        );
      } else {
        records.push(`other:${scoped}`);
      }
    }
  };
  visit(root);
  return createHash("sha256").update(records.sort().join("\n")).digest("hex");
}

async function expectScanError(
  operation: () => Promise<unknown>,
  code: CodeMapScanError["code"]
): Promise<CodeMapScanError> {
  try {
    await operation();
    throw new Error("Expected code-map scan failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(CodeMapScanError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof CodeMapScanError)) throw error;
    return error;
  }
}

function rootInput(root: string) {
  return {
    canonicalRoot: root,
    projectId: parseStableId<"PROJECT">(P1),
    missionId: parseStableId<"MISSION">(M1),
    registrationId: parseStableId<"REPOSITORY_REGISTRATION">(R1)
  };
}

function fakeFileSystem(options: {
  readonly names: readonly string[];
  readonly size?: number;
  readonly bytes?: Uint8Array;
}): CodeMapReadFileSystem {
  const bytes = options.bytes ?? new Uint8Array(options.size ?? 0);
  return {
    async inspect(path) {
      return Object.freeze({
        kind: path === resolve("synthetic-code-map-root")
          ? "DIRECTORY" as const
          : "FILE" as const,
        size: path === resolve("synthetic-code-map-root")
          ? 0
          : (options.size ?? bytes.byteLength)
      });
    },
    async canonicalize(path) {
      return path;
    },
    async list() {
      return options.names;
    },
    async readSource(_path, maximumBytes) {
      if (bytes.byteLength > maximumBytes) {
        throw Object.assign(new Error("synthetic oversize"), {
          code: "EFBIG"
        });
      }
      return Object.freeze({ bytes, byteLength: bytes.byteLength });
    }
  };
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("bounded read-only code-map filesystem scanner", () => {
  it("keeps the production scanner free of process execution and filesystem writes", () => {
    const source = readFileSync(
      new URL("../src/code-map/code-map-scanner.ts", import.meta.url),
      "utf8"
    );
    for (const prohibited of [
      "node:child_process",
      "spawn(",
      "exec(",
      "writeFile",
      "mkdir",
      "rename(",
      "rm("
    ]) {
      expect(source).not.toContain(prohibited);
    }
    expect(source).toContain("constants.O_RDONLY");
  });

  it("returns deterministic supported sources, honest skips and unchanged repository bytes without executing content", async () => {
    const fixture = environment();
    mkdirSync(join(fixture.repositoryRoot, "src"));
    mkdirSync(join(fixture.repositoryRoot, "node_modules", "unsafe"), {
      recursive: true
    });
    mkdirSync(join(fixture.repositoryRoot, ".git", "hooks"), {
      recursive: true
    });
    writeFileSync(
      join(fixture.repositoryRoot, "src", "z.tsx"),
      "export const View = () => null;\n",
      "utf8"
    );
    writeFileSync(
      join(fixture.repositoryRoot, "src", "a.TS"),
      "export const answer = 42;\n",
      "utf8"
    );
    writeFileSync(
      join(fixture.repositoryRoot, "execute-me.js"),
      "throw new Error('repository code executed');\n",
      "utf8"
    );
    writeFileSync(
      join(fixture.repositoryRoot, "package.json"),
      JSON.stringify({
        scripts: { postinstall: "node should-never-run.js" },
        dependencies: { privateCandidatePackage: "file:../outside" }
      }),
      "utf8"
    );
    writeFileSync(join(fixture.repositoryRoot, "README.md"), "# skipped\n", "utf8");
    writeFileSync(join(fixture.repositoryRoot, "LICENSE"), "skipped\n", "utf8");
    writeFileSync(join(fixture.repositoryRoot, "image.bin"), Buffer.from([0, 1, 2]));
    writeFileSync(
      join(fixture.repositoryRoot, "node_modules", "unsafe", "index.js"),
      "throw new Error('installed dependency executed');\n",
      "utf8"
    );
    writeFileSync(
      join(fixture.repositoryRoot, ".git", "hooks", "unsafe.js"),
      "throw new Error('Git hook executed');\n",
      "utf8"
    );
    const mutationSentinel = join(fixture.repositoryRoot, "scanner-wrote-this");
    const before = treeDigest(fixture.repositoryRoot);

    const first = await fixture.scanner.scan(fixture.mission.missionId);
    const second = await fixture.scanner.scan(fixture.mission.missionId);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      scanVersion: "code-map-source-scan.v1",
      projectId: P1,
      missionId: M1,
      registrationId: R1,
      allowedExtensions: CODE_MAP_ALLOWED_EXTENSIONS,
      limits: CODE_MAP_SCAN_LIMITS,
      encounteredFileCount: 7,
      scannedFileCount: 4,
      skippedUnsupportedFileCount: 3,
      skippedExtensions: [
        { extension: ".bin", fileCount: 1 },
        { extension: ".md", fileCount: 1 },
        { extension: "[no-extension]", fileCount: 1 }
      ],
      skippedDirectories: [
        { directoryName: ".git", directoryCount: 1 },
        { directoryName: "node_modules", directoryCount: 1 }
      ]
    });
    expect(first.files.map((file) => file.relativePath)).toEqual([
      "execute-me.js",
      "package.json",
      "src/a.TS",
      "src/z.tsx"
    ]);
    expect(first.files.map((file) => file.extension)).toEqual([
      ".js",
      ".json",
      ".ts",
      ".tsx"
    ]);
    expect(first.files.every((file) => /^sha256:[0-9a-f]{64}$/u.test(file.contentDigest)))
      .toBe(true);
    expect(treeDigest(fixture.repositoryRoot)).toBe(before);
    expect(() => readFileSync(mutationSentinel)).toThrow();
  });

  it("rejects traversal-shaped directory entries before resolving or reading them", async () => {
    const root = resolve("synthetic-code-map-root");
    const dependencies: CodeMapScanDependencies = {
      fileSystem: fakeFileSystem({ names: [".."] }),
      monotonicNow: () => 0
    };

    await expectScanError(
      () => scanCodeMapRoot(rootInput(root), dependencies),
      "CODE_MAP_TRAVERSAL_REJECTED"
    );
  });

  it("rejects a symlinked directory without reading escaped content", async () => {
    const fixture = environment();
    const external = join(fixture.root, "external-source");
    mkdirSync(external);
    writeFileSync(join(external, "escaped.ts"), "export const secret = 1;\n", "utf8");
    symlinkSync(external, join(fixture.repositoryRoot, "linked-source"), "junction");

    await expectScanError(
      () => fixture.scanner.scan(fixture.mission.missionId),
      "CODE_MAP_SYMLINK_REJECTED"
    );
  });

  it("revalidates the registered canonical root before scanning", async () => {
    const fixture = environment();
    const moved = join(fixture.root, "moved-repository");
    renameSync(fixture.repositoryRoot, moved);
    symlinkSync(moved, fixture.repositoryRoot, "junction");

    await expectScanError(
      () => fixture.scanner.scan(fixture.mission.missionId),
      "CODE_MAP_ROOT_UNSAFE"
    );
  });

  it("enforces exact per-file and aggregate byte ceilings before returning content", async () => {
    const root = resolve("synthetic-code-map-root");
    const oversizeDependencies: CodeMapScanDependencies = {
      fileSystem: fakeFileSystem({
        names: ["oversized.ts"],
        size: CODE_MAP_SCAN_LIMITS.maximumFileBytes + 1
      }),
      monotonicNow: () => 0
    };
    await expectScanError(
      () => scanCodeMapRoot(rootInput(root), oversizeDependencies),
      "CODE_MAP_FILE_BYTES_EXCEEDED"
    );

    const exactFile = new Uint8Array(CODE_MAP_SCAN_LIMITS.maximumFileBytes);
    const aggregateDependencies: CodeMapScanDependencies = {
      fileSystem: fakeFileSystem({
        names: Array.from({ length: 21 }, (_, index) => `file-${index}.ts`),
        size: exactFile.byteLength,
        bytes: exactFile
      }),
      monotonicNow: () => 0
    };
    await expectScanError(
      () => scanCodeMapRoot(rootInput(root), aggregateDependencies),
      "CODE_MAP_AGGREGATE_BYTES_EXCEEDED"
    );
  });

  it("counts unsupported files toward the exact traversal file ceiling", async () => {
    const root = resolve("synthetic-code-map-root");
    const dependencies: CodeMapScanDependencies = {
      fileSystem: fakeFileSystem({
        names: Array.from(
          { length: CODE_MAP_SCAN_LIMITS.maximumFiles + 1 },
          (_, index) => `unsupported-${index}.md`
        )
      }),
      monotonicNow: () => 0
    };

    await expectScanError(
      () => scanCodeMapRoot(rootInput(root), dependencies),
      "CODE_MAP_FILE_LIMIT_EXCEEDED"
    );
  }, 15_000);

  it("fails safely when the monotonic five-second deadline is exhausted", async () => {
    const root = resolve("synthetic-code-map-root");
    let calls = 0;
    const dependencies: CodeMapScanDependencies = {
      fileSystem: fakeFileSystem({ names: ["source.ts"] }),
      monotonicNow: () => {
        calls += 1;
        return calls === 1 ? 0 : CODE_MAP_SCAN_LIMITS.maximumMilliseconds;
      }
    };

    await expectScanError(
      () => scanCodeMapRoot(rootInput(root), dependencies),
      "CODE_MAP_SCAN_TIMEOUT"
    );
  });

  it("returns no partial bundle for special entries or files that change during the bounded read", async () => {
    const root = resolve("synthetic-code-map-root");
    const specialFileSystem: CodeMapReadFileSystem = {
      ...fakeFileSystem({ names: ["special.ts"] }),
      async inspect(path) {
        return Object.freeze({
          kind: path === root ? "DIRECTORY" as const : "OTHER" as const,
          size: 0
        });
      }
    };
    await expectScanError(
      () =>
        scanCodeMapRoot(rootInput(root), {
          fileSystem: specialFileSystem,
          monotonicNow: () => 0
        }),
      "CODE_MAP_ENTRY_TYPE_UNSUPPORTED"
    );

    const changedFileSystem: CodeMapReadFileSystem = {
      ...fakeFileSystem({ names: ["changed.ts"], size: 1 }),
      async readSource() {
        const bytes = new Uint8Array([65, 66]);
        return Object.freeze({ bytes, byteLength: bytes.byteLength });
      }
    };
    await expectScanError(
      () =>
        scanCodeMapRoot(rootInput(root), {
          fileSystem: changedFileSystem,
          monotonicNow: () => 0
        }),
      "CODE_MAP_REPOSITORY_CHANGED"
    );
  });

  it("rejects invalid text and enforces Mission, lifecycle and registration scope", async () => {
    const invalidText = environment();
    writeFileSync(join(invalidText.repositoryRoot, "invalid.ts"), Buffer.from([0xff]));
    await expectScanError(
      () => invalidText.scanner.scan(invalidText.mission.missionId),
      "CODE_MAP_FILE_ENCODING_INVALID"
    );

    const unregistered = environment(false);
    await expectScanError(
      () => unregistered.scanner.scan(unregistered.mission.missionId),
      "CODE_MAP_REPOSITORY_NOT_REGISTERED"
    );
    await expectScanError(
      () => unregistered.scanner.scan(parseStableId<"MISSION">(M2)),
      "CODE_MAP_MISSION_NOT_FOUND"
    );

    const archived = environment();
    archived.projects.archiveMission(
      archived.project.projectId,
      archived.mission.missionId
    );
    await expectScanError(
      () => archived.scanner.scan(archived.mission.missionId),
      "CODE_MAP_MISSION_ARCHIVED"
    );
  });
});
