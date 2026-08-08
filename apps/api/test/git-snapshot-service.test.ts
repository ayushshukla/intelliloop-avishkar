import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import {
  openFoundationDatabase,
  type FoundationDatabase
} from "../src/database/database-lifecycle.js";
import {
  DEFAULT_GIT_COMMAND_TIMEOUT_MS,
  FixedGitCommandRunner,
  GitCommandError,
  type GitCommandResult,
  type GitReadCommandRunner,
  type GitReadOperation
} from "../src/projects/git-command-runner.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  GitSnapshotError,
  GitSnapshotService,
  parsePorcelainStatus,
  type GitSnapshotServiceDependencies
} from "../src/projects/git-snapshot-service.js";
import {
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";
const S1 = "00000000-0000-4000-8000-000000000031";
const S2 = "00000000-0000-4000-8000-000000000032";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const T2 = "2026-08-04T00:02:00.000Z";

const directories: string[] = [];
const databases: FoundationDatabase[] = [];

function sequentialIds(values: readonly string[]): () => string {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error("Synthetic ID fixture exhausted.");
    return value;
  };
}

function git(repositoryRoot: string, args: readonly string[]): Buffer {
  const result = spawnSync("git", [...args], {
    cwd: repositoryRoot,
    shell: false,
    windowsHide: true,
    encoding: "buffer",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      LC_ALL: "C"
    }
  });
  if (result.status !== 0) {
    throw new Error("Synthetic Git fixture command failed.");
  }
  return result.stdout;
}

function createGitRepository(parent: string, committed: boolean): string {
  const repositoryRoot = join(parent, "controlled-repository");
  mkdirSync(repositoryRoot, { recursive: true });
  git(repositoryRoot, ["init", "-b", "main"]);
  if (committed) {
    writeFileSync(join(repositoryRoot, "staged.txt"), "base staged\n", "utf8");
    writeFileSync(join(repositoryRoot, "worktree.txt"), "base worktree\n", "utf8");
    git(repositoryRoot, ["add", "--all"]);
    git(repositoryRoot, [
      "-c",
      "user.name=IntelliLoop Fixture",
      "-c",
      "user.email=fixture@invalid.example",
      "commit",
      "-m",
      "fixture baseline"
    ]);
  }
  return repositoryRoot;
}

function allFiles(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  };
  visit(root);
  return files.sort();
}

function repositoryDigest(root: string): string {
  const hash = createHash("sha256");
  for (const filePath of allFiles(root)) {
    hash.update(relative(root, filePath).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function projectDependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(sequentialIds([P1, M1])),
    clock: createClock(() => new Date(T0))
  };
}

function registrationDependencies(): RepositoryRegistrationDependencies {
  return {
    ids: createStableIdGenerator(() => R1),
    clock: createClock(() => new Date(T1))
  };
}

function snapshotDependencies(
  runner: GitReadCommandRunner = new FixedGitCommandRunner()
): GitSnapshotServiceDependencies {
  return {
    ids: createStableIdGenerator(sequentialIds([S1, S2])),
    clock: createClock(() => new Date(T2)),
    runner
  };
}

function environment(options: {
  readonly committed?: boolean;
  readonly register?: boolean;
  readonly runner?: GitReadCommandRunner;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-git-snapshot-"));
  directories.push(root);
  const databasePath = join(root, "data", "intelliloop.sqlite3");
  const repositoryRoot = createGitRepository(root, options.committed ?? true);
  const database = openFoundationDatabase({ filePath: databasePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const project = projects.createProject("Controlled project");
  const mission = projects.createMission(project.projectId, "Controlled mission");
  const registrations = new RepositoryRegistrationService(
    database.connection,
    databasePath,
    registrationDependencies()
  );
  if (options.register ?? true) {
    registrations.register(project.projectId, repositoryRoot);
  }
  const snapshots = new GitSnapshotService(
    database.connection,
    registrations,
    snapshotDependencies(options.runner)
  );
  return {
    root,
    databasePath,
    repositoryRoot,
    database,
    projects,
    project,
    mission,
    registrations,
    snapshots
  };
}

async function expectSnapshotError(
  operation: () => Promise<unknown>,
  code: GitSnapshotError["code"]
): Promise<GitSnapshotError> {
  try {
    await operation();
    throw new Error("Expected Git snapshot failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(GitSnapshotError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof GitSnapshotError)) throw error;
    return error;
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("read-only Git snapshot capture", () => {
  it("captures a clean attached repository and survives restart without mutation", async () => {
    const fixture = environment();
    const statusBefore = git(fixture.repositoryRoot, [
      "--no-optional-locks",
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all"
    ]);
    const digestBefore = repositoryDigest(fixture.repositoryRoot);

    const snapshot = await fixture.snapshots.capture(fixture.mission.missionId);

    expect(snapshot).toMatchObject({
      snapshotId: S1,
      projectId: P1,
      missionId: M1,
      registrationId: R1,
      capturedAtUtc: T2,
      headState: "ATTACHED",
      branchName: "main",
      dirty: false,
      indexChangeCount: 0,
      worktreeChangeCount: 0,
      untrackedFileCount: 0,
      changedFileCount: 0
    });
    expect(snapshot.headCommit).toMatch(/^[0-9a-f]{40}$/u);
    expect(repositoryDigest(fixture.repositoryRoot)).toBe(digestBefore);
    expect(
      git(fixture.repositoryRoot, [
        "--no-optional-locks",
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all"
      ])
    ).toEqual(statusBefore);

    fixture.database.close();
    const restarted = openFoundationDatabase({ filePath: fixture.databasePath });
    databases.push(restarted);
    const registrations = new RepositoryRegistrationService(
      restarted.connection,
      fixture.databasePath
    );
    const snapshots = new GitSnapshotService(
      restarted.connection,
      registrations,
      snapshotDependencies()
    );
    expect(snapshots.get(snapshot.snapshotId)).toEqual(snapshot);
    expect(snapshots.list(fixture.mission.missionId, 20).items).toEqual([snapshot]);
    expect(() =>
      restarted.connection
        .prepare("UPDATE git_snapshots SET is_dirty = 1 WHERE snapshot_id = ?")
        .run(snapshot.snapshotId)
    ).toThrow();
    expect(() =>
      restarted.connection
        .prepare("DELETE FROM git_snapshots WHERE snapshot_id = ?")
        .run(snapshot.snapshotId)
    ).toThrow();
    expect(snapshots.get(snapshot.snapshotId)).toEqual(snapshot);
  });

  it("captures dirty evidence with a stable order-independent digest", async () => {
    const fixture = environment();
    writeFileSync(join(fixture.repositoryRoot, "staged.txt"), "staged change\n", "utf8");
    git(fixture.repositoryRoot, ["add", "staged.txt"]);
    writeFileSync(
      join(fixture.repositoryRoot, "worktree.txt"),
      "worktree change\n",
      "utf8"
    );
    writeFileSync(join(fixture.repositoryRoot, "untracked.txt"), "new\n", "utf8");
    const digestBefore = repositoryDigest(fixture.repositoryRoot);

    const first = await fixture.snapshots.capture(fixture.mission.missionId);
    const second = await fixture.snapshots.capture(fixture.mission.missionId);

    expect(first).toMatchObject({
      dirty: true,
      indexChangeCount: 1,
      worktreeChangeCount: 1,
      untrackedFileCount: 1,
      changedFileCount: 3
    });
    expect(second.snapshotId).toBe(S2);
    expect(second.changedFilesDigest).toBe(first.changedFilesDigest);
    const firstPage = fixture.snapshots.list(fixture.mission.missionId, 1);
    expect(firstPage).toEqual({ items: [first], nextCursor: S1 });
    expect(
      fixture.snapshots.list(
        fixture.mission.missionId,
        1,
        first.snapshotId
      )
    ).toEqual({ items: [second], nextCursor: null });
    expect(repositoryDigest(fixture.repositoryRoot)).toBe(digestBefore);
  });

  it("captures unborn and detached head states without repository mutation", async () => {
    const unborn = environment({ committed: false });
    const unbornDigest = repositoryDigest(unborn.repositoryRoot);
    const unbornSnapshot = await unborn.snapshots.capture(unborn.mission.missionId);
    expect(unbornSnapshot).toMatchObject({
      headState: "UNBORN",
      branchName: "main",
      dirty: false
    });
    expect(unbornSnapshot).not.toHaveProperty("headCommit");
    expect(repositoryDigest(unborn.repositoryRoot)).toBe(unbornDigest);

    const detached = environment();
    git(detached.repositoryRoot, ["checkout", "--detach", "HEAD"]);
    const detachedDigest = repositoryDigest(detached.repositoryRoot);
    const detachedSnapshot = await detached.snapshots.capture(detached.mission.missionId);
    expect(detachedSnapshot.headState).toBe("DETACHED");
    expect(detachedSnapshot).not.toHaveProperty("branchName");
    expect(detachedSnapshot.headCommit).toMatch(/^[0-9a-f]{40}$/u);
    expect(repositoryDigest(detached.repositoryRoot)).toBe(detachedDigest);
  });

  it("maps timeout, malformed status, and identity changes to stable safe failures", async () => {
    const timeoutRunner: GitReadCommandRunner = {
      run: async () => {
        throw new GitCommandError("GIT_COMMAND_TIMEOUT");
      }
    };
    const timeout = environment({ runner: timeoutRunner });
    const timeoutError = await expectSnapshotError(
      () => timeout.snapshots.capture(timeout.mission.missionId),
      "GIT_CAPTURE_TIMEOUT"
    );
    expect(String(timeoutError)).not.toContain(timeout.repositoryRoot);

    const malformedRunner: GitReadCommandRunner = {
      run: async (operation) => {
        if (operation === "SYMBOLIC_HEAD") {
          return { exitCode: 0, stdout: Buffer.from("main\n") };
        }
        if (operation === "HEAD_COMMIT") {
          return { exitCode: 0, stdout: Buffer.from(`${"a".repeat(40)}\n`) };
        }
        return { exitCode: 0, stdout: Buffer.from("?? ../private-secret\0") };
      }
    };
    const malformed = environment({ runner: malformedRunner });
    const malformedError = await expectSnapshotError(
      () => malformed.snapshots.capture(malformed.mission.missionId),
      "GIT_STATUS_INVALID"
    );
    expect(String(malformedError)).not.toContain("private-secret");

    const calls = new Map<GitReadOperation, number>();
    const changingRunner: GitReadCommandRunner = {
      run: async (operation): Promise<GitCommandResult> => {
        const count = calls.get(operation) ?? 0;
        calls.set(operation, count + 1);
        if (operation === "STATUS") return { exitCode: 0, stdout: Buffer.alloc(0) };
        if (operation === "HEAD_COMMIT") {
          return { exitCode: 0, stdout: Buffer.from(`${"b".repeat(40)}\n`) };
        }
        return {
          exitCode: 0,
          stdout: Buffer.from(count === 0 ? "main\n" : "changed\n")
        };
      }
    };
    const changing = environment({ runner: changingRunner });
    await expectSnapshotError(
      () => changing.snapshots.capture(changing.mission.missionId),
      "GIT_REPOSITORY_CHANGED"
    );
  });

  it("rejects absent registrations and archived missions before Git execution", async () => {
    let runCount = 0;
    const runner: GitReadCommandRunner = {
      run: async () => {
        runCount += 1;
        return { exitCode: 0, stdout: Buffer.alloc(0) };
      }
    };
    const absent = environment({ register: false, runner });
    await expectSnapshotError(
      () => absent.snapshots.capture(absent.mission.missionId),
      "GIT_REPOSITORY_NOT_REGISTERED"
    );

    const archived = environment({ runner });
    archived.projects.archiveMission(
      archived.project.projectId,
      archived.mission.missionId
    );
    await expectSnapshotError(
      () => archived.snapshots.capture(archived.mission.missionId),
      "GIT_MISSION_ARCHIVED"
    );
    expect(runCount).toBe(0);
  });

  it("parses rename records and enforces fixed runner time and output bounds", async () => {
    expect(DEFAULT_GIT_COMMAND_TIMEOUT_MS).toBe(15_000);
    expect(
      parsePorcelainStatus(Buffer.from("R  destination.txt\0source.txt\0"))
    ).toEqual([
      {
        indexStatus: "R",
        worktreeStatus: " ",
        path: "destination.txt",
        originalPath: "source.txt"
      }
    ]);

    const fixture = environment();
    writeFileSync(join(fixture.repositoryRoot, "untracked.txt"), "new\n", "utf8");
    const bounded = new FixedGitCommandRunner({ maximumOutputBytes: 1 });
    await expect(
      bounded.run("STATUS", fixture.repositoryRoot)
    ).rejects.toMatchObject({ code: "GIT_COMMAND_OUTPUT_LIMIT" });

    const timed = new FixedGitCommandRunner({ timeoutMs: 1 });
    await expect(timed.run("STATUS", fixture.repositoryRoot)).rejects.toMatchObject({
      code: "GIT_COMMAND_TIMEOUT"
    });
  });
});
