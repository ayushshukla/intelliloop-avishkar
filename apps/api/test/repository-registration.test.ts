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
import { basename, join, relative, sep } from "node:path";

import {
  createClock,
  createStableIdGenerator,
  parseStableId,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import {
  RepositoryRegistrationError,
  RepositoryRegistrationService,
  type RepositoryRegistrationDependencies
} from "../src/projects/repository-registration.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";
const R1 = "00000000-0000-4000-8000-000000000021";
const R2 = "00000000-0000-4000-8000-000000000022";
const T0 = "2026-08-04T00:00:00.000Z";
const T1 = "2026-08-04T00:01:00.000Z";
const T2 = "2026-08-04T00:02:00.000Z";

const directories: string[] = [];
const databases: Array<{ close(): void }> = [];

function workspace(label: string): string {
  const directory = mkdtempSync(join(tmpdir(), `intelliloop-registration-${label}-`));
  directories.push(directory);
  return directory;
}

function projectDependencies(ids: string[], times: string[]): ProjectDomainDependencies {
  const remainingIds = [...ids];
  const remainingTimes = [...times];
  return {
    ids: createStableIdGenerator(() => remainingIds.shift() ?? "identity-exhausted"),
    clock: createClock(() => new Date(remainingTimes.shift() ?? "invalid-clock"))
  };
}

function registrationDependencies(
  ids: string[],
  times: string[]
): RepositoryRegistrationDependencies {
  const remainingIds = [...ids];
  const remainingTimes = [...times];
  return {
    ids: createStableIdGenerator(() => remainingIds.shift() ?? "identity-exhausted"),
    clock: createClock(() => new Date(remainingTimes.shift() ?? "invalid-clock"))
  };
}

function createGitRoot(parent: string, name = "controlled-repository"): string {
  const root = join(parent, name);
  mkdirSync(join(root, ".git", "objects"), { recursive: true });
  mkdirSync(join(root, ".git", "refs", "heads"), { recursive: true });
  writeFileSync(join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");
  writeFileSync(join(root, "README.md"), "# Controlled fixture\n", "utf8");
  return root;
}

function treeDigest(root: string): string {
  const entries: string[] = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const scoped = relative(root, path).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        entries.push(`directory:${scoped}`);
        visit(path);
      } else {
        const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
        entries.push(`file:${scoped}:${digest}`);
      }
    }
  }
  visit(root);
  return createHash("sha256").update(entries.sort().join("\n")).digest("hex");
}

function setup(label: string, projectIds = [P1], registrationIds = [R1]) {
  const root = workspace(label);
  const dataDirectory = join(root, "data");
  const databasePath = join(dataDirectory, "intelliloop.sqlite3");
  const database = openFoundationDatabase({ filePath: databasePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies(projectIds, [T0, T1, T2])
  );
  const registrations = new RepositoryRegistrationService(
    database.connection,
    databasePath,
    registrationDependencies(
      registrationIds,
      registrationIds.map((_, index) => [T1, T2][index] ?? T2)
    )
  );
  return { root, databasePath, database, projects, registrations };
}

function expectRegistrationError(
  operation: () => unknown,
  code: RepositoryRegistrationError["code"]
): RepositoryRegistrationError {
  try {
    operation();
    throw new Error("Expected repository registration failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(RepositoryRegistrationError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof RepositoryRegistrationError)) throw error;
    return error;
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("safe local repository registration", () => {
  it("persists a canonical read-only binding without mutating the repository", () => {
    const opened = setup("roundtrip");
    const project = opened.projects.createProject("Controlled project");
    const repositoryRoot = createGitRoot(opened.root);
    const before = treeDigest(repositoryRoot);

    const registered = opened.registrations.register(project.projectId, repositoryRoot);

    expect(registered).toEqual({
      registrationId: R1,
      projectId: P1,
      canonicalRoot: repositoryRoot,
      accessMode: "READ_ONLY",
      registeredAtUtc: T1
    });
    expect(opened.registrations.get(project.projectId)).toEqual(registered);
    expect(opened.registrations.resolveRootForRead(project.projectId)).toBe(repositoryRoot);
    expect(treeDigest(repositoryRoot)).toBe(before);

    opened.database.close();
    databases.splice(databases.indexOf(opened.database), 1);
    const restarted = openFoundationDatabase({ filePath: opened.databasePath });
    databases.push(restarted);
    const service = new RepositoryRegistrationService(
      restarted.connection,
      opened.databasePath,
      registrationDependencies([], [])
    );
    expect(service.get(project.projectId)).toEqual(registered);
    expect(treeDigest(repositoryRoot)).toBe(before);
  });

  it("rejects missing, non-Git, relative, traversal and file paths safely", () => {
    const opened = setup("invalid-paths");
    const project = opened.projects.createProject("Controlled project");
    const nonGit = join(opened.root, "not-git");
    mkdirSync(nonGit);
    mkdirSync(join(nonGit, ".git"));
    const repositoryRoot = createGitRoot(opened.root);
    const filePath = join(opened.root, "plain-file");
    writeFileSync(filePath, "fixture", "utf8");

    expectRegistrationError(
      () => opened.registrations.register(project.projectId, join(opened.root, "missing")),
      "REPOSITORY_PATH_NOT_FOUND"
    );
    expectRegistrationError(
      () => opened.registrations.register(project.projectId, nonGit),
      "REPOSITORY_NOT_GIT"
    );
    expectRegistrationError(
      () => opened.registrations.register(project.projectId, "relative/repository"),
      "REPOSITORY_PATH_INVALID"
    );
    expectRegistrationError(
      () =>
        opened.registrations.register(
          project.projectId,
          `${repositoryRoot}${sep}..${sep}${basename(repositoryRoot)}`
        ),
      "REPOSITORY_PATH_INVALID"
    );
    expectRegistrationError(
      () => opened.registrations.register(project.projectId, filePath),
      "REPOSITORY_PATH_INVALID"
    );
  });

  it("rejects a symlinked root and a symlinked Git marker", () => {
    const opened = setup("symlink");
    const project = opened.projects.createProject("Controlled project");
    const target = createGitRoot(opened.root, "target");
    const linkedRoot = join(opened.root, "linked-root");
    symlinkSync(target, linkedRoot, "junction");

    expectRegistrationError(
      () => opened.registrations.register(project.projectId, linkedRoot),
      "REPOSITORY_SYMLINK_REJECTED"
    );

    const unsafeRoot = join(opened.root, "unsafe-marker");
    const markerTarget = join(opened.root, "marker-target");
    mkdirSync(unsafeRoot);
    mkdirSync(markerTarget);
    symlinkSync(markerTarget, join(unsafeRoot, ".git"), "junction");
    expectRegistrationError(
      () => opened.registrations.register(project.projectId, unsafeRoot),
      "REPOSITORY_SYMLINK_REJECTED"
    );
  });

  it("revalidates the allowlisted root before every future read", () => {
    const opened = setup("revalidation");
    const project = opened.projects.createProject("Controlled project");
    const repositoryRoot = createGitRoot(opened.root);
    opened.registrations.register(project.projectId, repositoryRoot);
    const movedRoot = join(opened.root, "moved-after-registration");
    renameSync(repositoryRoot, movedRoot);
    symlinkSync(movedRoot, repositoryRoot, "junction");

    expectRegistrationError(
      () => opened.registrations.resolveRootForRead(project.projectId),
      "REPOSITORY_SYMLINK_REJECTED"
    );
  });

  it("rejects a database located inside the candidate repository", () => {
    const root = workspace("database-boundary");
    const repositoryRoot = createGitRoot(root);
    const databasePath = join(repositoryRoot, "intelliloop.sqlite3");
    const database = openFoundationDatabase({ filePath: databasePath });
    databases.push(database);
    const projects = new SqliteProjectRepository(
      database.connection,
      projectDependencies([P1], [T0])
    );
    const project = projects.createProject("Unsafe placement");
    const registrations = new RepositoryRegistrationService(
      database.connection,
      databasePath,
      registrationDependencies([R1], [T1])
    );

    expectRegistrationError(
      () => registrations.register(project.projectId, repositoryRoot),
      "REPOSITORY_DATABASE_CONFLICT"
    );
  });

  it("rejects duplicate Project bindings and archived Projects", () => {
    const opened = setup("duplicates", [P1, P2], [R1, R2]);
    const first = opened.projects.createProject("First project");
    const second = opened.projects.createProject("Second project");
    const repositoryRoot = createGitRoot(opened.root);
    opened.registrations.register(first.projectId, repositoryRoot);

    expectRegistrationError(
      () => opened.registrations.register(first.projectId, repositoryRoot),
      "REPOSITORY_ALREADY_REGISTERED"
    );
    expectRegistrationError(
      () => opened.registrations.register(second.projectId, repositoryRoot),
      "REPOSITORY_ALREADY_REGISTERED"
    );

    const secondRoot = createGitRoot(opened.root, "second-root");
    opened.projects.archiveProject(second.projectId);
    expectRegistrationError(
      () => opened.registrations.register(second.projectId, secondRoot),
      "REPOSITORY_PROJECT_ARCHIVED"
    );
  });

  it("distinguishes missing Projects from Projects without a registration", () => {
    const opened = setup("missing");
    const project = opened.projects.createProject("Controlled project");
    expectRegistrationError(
      () => opened.registrations.get(project.projectId),
      "REPOSITORY_NOT_REGISTERED"
    );
    expectRegistrationError(
      () => opened.registrations.get(parseStableId<"PROJECT">(P2)),
      "REPOSITORY_PROJECT_NOT_FOUND"
    );
  });
});
