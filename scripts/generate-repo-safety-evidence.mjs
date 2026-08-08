import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createClock,
  createStableIdGenerator
} from "@intelliloop/domain";

import { buildApp } from "../apps/api/dist/app.js";
import { openFoundationDatabase } from "../apps/api/dist/database/database-lifecycle.js";
import { FixedGitCommandRunner } from "../apps/api/dist/projects/git-command-runner.js";
import { GitSnapshotService } from "../apps/api/dist/projects/git-snapshot-service.js";
import { SqliteProjectRepository } from "../apps/api/dist/projects/project-repository.js";
import {
  RepositoryRegistrationError,
  RepositoryRegistrationService
} from "../apps/api/dist/projects/repository-registration.js";

const WORKSPACE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "EV_REPO_SAFETY.json"
);

const IDS = Object.freeze({
  project1: "00000000-0000-4000-8000-000000000001",
  project2: "00000000-0000-4000-8000-000000000002",
  project3: "00000000-0000-4000-8000-000000000003",
  project4: "00000000-0000-4000-8000-000000000004",
  project5: "00000000-0000-4000-8000-000000000005",
  project6: "00000000-0000-4000-8000-000000000006",
  mission1: "00000000-0000-4000-8000-000000000011",
  mission2: "00000000-0000-4000-8000-000000000012",
  mission3: "00000000-0000-4000-8000-000000000013",
  registration1: "00000000-0000-4000-8000-000000000021",
  registration2: "00000000-0000-4000-8000-000000000022",
  registration3: "00000000-0000-4000-8000-000000000023",
  snapshot1: "00000000-0000-4000-8000-000000000031",
  snapshot2: "00000000-0000-4000-8000-000000000032",
  request: "00000000-0000-4000-8000-000000000041"
});

const TIMES = Object.freeze({
  zero: "2026-08-04T00:00:00.000Z",
  one: "2026-08-04T00:01:00.000Z",
  two: "2026-08-04T00:02:00.000Z",
  three: "2026-08-04T00:03:00.000Z",
  four: "2026-08-04T00:04:00.000Z"
});

function sequence(values, label) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error(`${label} fixture exhausted.`);
    return value;
  };
}

function dependencies(ids, times) {
  const nextId = sequence(ids, "Identity");
  const nextTime = sequence(times, "Clock");
  return {
    ids: createStableIdGenerator(nextId),
    clock: createClock(() => new Date(nextTime()))
  };
}

function safeGitEnvironment(extra = {}) {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (name.toUpperCase().startsWith("GIT_")) delete environment[name];
  }
  return {
    ...environment,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    LC_ALL: "C",
    ...extra
  };
}

function git(repositoryRoot, args, extraEnvironment = {}) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    shell: false,
    windowsHide: true,
    encoding: "buffer",
    env: safeGitEnvironment(extraEnvironment)
  });
  if (result.status !== 0) {
    const detail = Buffer.from(result.stderr ?? []).toString("utf8").trim().slice(-800);
    const spawnDetail = result.error instanceof Error ? `${result.error.name}: ${result.error.message}` : "";
    throw new Error(`Synthetic Git fixture command failed (${args[0]}): ${detail || spawnDetail || `exit ${String(result.status)}`}`);
  }
  return result.stdout;
}

function readStatus(repositoryRoot) {
  return git(repositoryRoot, [
    "--no-optional-locks",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "core.untrackedCache=false",
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--ignore-submodules=all",
    "--no-renames"
  ]);
}

function createGitRepository(parent, name) {
  const repositoryRoot = join(parent, name);
  mkdirSync(repositoryRoot, { recursive: true });
  git(repositoryRoot, ["init", "-b", "main"]);
  writeFileSync(join(repositoryRoot, "staged.txt"), "base staged\n", "utf8");
  writeFileSync(join(repositoryRoot, "worktree.txt"), "base worktree\n", "utf8");
  git(repositoryRoot, ["add", "--all"]);
  git(
    repositoryRoot,
    [
      "-c",
      "user.name=IntelliLoop Fixture",
      "-c",
      "user.email=fixture@invalid.example",
      "commit",
      "-m",
      "repository safety baseline"
    ],
    {
      GIT_AUTHOR_DATE: "2026-08-04T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-08-04T00:00:00Z"
    }
  );
  writeFileSync(join(repositoryRoot, "staged.txt"), "staged change\n", "utf8");
  git(repositoryRoot, ["add", "staged.txt"]);
  writeFileSync(join(repositoryRoot, "worktree.txt"), "worktree change\n", "utf8");
  writeFileSync(join(repositoryRoot, "untracked.txt"), "untracked change\n", "utf8");
  return repositoryRoot;
}

function createMarkerRepository(parent, name) {
  const repositoryRoot = join(parent, name);
  mkdirSync(join(repositoryRoot, ".git", "objects"), { recursive: true });
  mkdirSync(join(repositoryRoot, ".git", "refs", "heads"), { recursive: true });
  writeFileSync(join(repositoryRoot, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");
  return repositoryRoot;
}

function repositoryTreeDigest(repositoryRoot) {
  const entries = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      const scopedPath = relative(repositoryRoot, fullPath).replaceAll("\\", "/");
      const metadata = lstatSync(fullPath);
      if (metadata.isSymbolicLink()) {
        entries.push({ type: "link", path: scopedPath, value: readlinkSync(fullPath) });
      } else if (metadata.isDirectory()) {
        entries.push({ type: "directory", path: scopedPath });
        visit(fullPath);
      } else if (metadata.isFile()) {
        entries.push({ type: "file", path: scopedPath, value: readFileSync(fullPath) });
      } else {
        entries.push({ type: "other", path: scopedPath });
      }
    }
  };
  visit(repositoryRoot);
  entries.sort((left, right) =>
    `${left.type}:${left.path}`.localeCompare(`${right.type}:${right.path}`, "en")
  );
  const hash = createHash("sha256");
  for (const entry of entries) {
    hash.update(entry.type);
    hash.update("\0");
    hash.update(entry.path);
    hash.update("\0");
    if (entry.value !== undefined) hash.update(entry.value);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function statusDigest(status) {
  return `sha256:${createHash("sha256").update(status).digest("hex")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectRegistrationCode(operation, expectedCode) {
  try {
    operation();
  } catch (error) {
    if (
      error instanceof RepositoryRegistrationError &&
      error.code === expectedCode
    ) {
      return "PASS";
    }
    throw new Error("Repository negative case returned an unexpected result.");
  }
  throw new Error("Repository negative case was accepted.");
}

async function expectSnapshotCode(operation, expectedCode) {
  try {
    await operation();
  } catch (error) {
    if (error?.code === expectedCode) return "PASS";
    throw new Error("Snapshot negative case returned an unexpected result.");
  }
  throw new Error("Snapshot negative case was accepted.");
}

function verifyDocumentation() {
  const expectations = [
    {
      document: "docs/api/API_REFERENCE.md",
      snippets: [
        "Preflight and PUT bodies are exactly `{ \"rootPath\": string }`.",
        "The POST request has no body",
        "there is no multi-repository release aggregation, replace or removal contract."
      ]
    },
    {
      document: "docs/development/SETUP.md",
      snippets: [
        "Use the synthetic LoopMart repository",
        "The configured data directory must remain outside it.",
        "npm.cmd run evidence:repo-safety"
      ]
    },
    {
      document: "docs/security/SECURITY_AND_PRIVACY.md",
      snippets: [
        "No repository write, replace, remove, patch, checkout, reset, commit, push, deploy, shell or arbitrary-execution route exists.",
        "Raw root paths and changed filenames",
        "before and after actual capture"
      ]
    },
    {
      document: "docs/product/USER_GUIDE.md",
      snippets: [
        "Use only an explicitly authorized repository.",
        "The raw root is hidden after preflight and cleared after registration.",
        "There is no arbitrary command, shell, repository-content, registered-user-repository write, checkout, install or registered-code execution endpoint."
      ]
    },
    {
      document: "docs/evidence/TEST_EVIDENCE.md",
      snippets: [
        "EV-REPO-SAFETY",
        "EV_REPO_SAFETY.json",
        "npm.cmd run evidence:repo-safety"
      ]
    }
  ];
  for (const expectation of expectations) {
    const content = readFileSync(join(WORKSPACE_ROOT, expectation.document), "utf8");
    for (const snippet of expectation.snippets) {
      assert(content.includes(snippet), `Repository documentation contract is incomplete: ${expectation.document} / ${snippet}`);
    }
  }
  return expectations.map(({ document }) => ({ document, status: "PASS" }));
}

async function generate() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "intelliloop-repo-safety-"));
  let database;
  let conflictDatabase;
  let app;
  let report;
  try {
    const databasePath = join(temporaryRoot, "data", "intelliloop.sqlite3");
    const repositoryRoot = createGitRepository(
      temporaryRoot,
      "repo-safety-private-root-sentinel"
    );
    database = openFoundationDatabase({ filePath: databasePath });
    const projects = new SqliteProjectRepository(
      database.connection,
      dependencies(
        [
          IDS.project1,
          IDS.mission1,
          IDS.project2,
          IDS.mission2,
          IDS.project3,
          IDS.project4,
          IDS.project5,
          IDS.mission3
        ],
        [
          TIMES.zero,
          TIMES.one,
          TIMES.zero,
          TIMES.one,
          TIMES.zero,
          TIMES.one,
          TIMES.zero,
          TIMES.zero,
          TIMES.one,
          TIMES.two
        ]
      )
    );
    const registrations = new RepositoryRegistrationService(
      database.connection,
      databasePath,
      dependencies(
        [IDS.registration1, IDS.registration2, IDS.registration3],
        [TIMES.two, TIMES.two, TIMES.two]
      )
    );
    const project1 = projects.createProject("Repository safety project");
    const mission1 = projects.createMission(
      project1.projectId,
      "Prove repository observation safety"
    );

    const nonGit = join(temporaryRoot, "non-git");
    mkdirSync(nonGit);
    const plainFile = join(temporaryRoot, "plain-file.txt");
    writeFileSync(plainFile, "synthetic\n", "utf8");
    const linkedRoot = join(temporaryRoot, "linked-root");
    symlinkSync(repositoryRoot, linkedRoot, "junction");
    const unsafeMarkerRoot = join(temporaryRoot, "unsafe-marker-root");
    const markerTarget = join(temporaryRoot, "marker-target");
    mkdirSync(unsafeMarkerRoot);
    mkdirSync(markerTarget);
    symlinkSync(markerTarget, join(unsafeMarkerRoot, ".git"), "junction");

    const negativeCorpus = {
      missingPath: expectRegistrationCode(
        () => registrations.register(project1.projectId, join(temporaryRoot, "missing")),
        "REPOSITORY_PATH_NOT_FOUND"
      ),
      nonGitDirectory: expectRegistrationCode(
        () => registrations.register(project1.projectId, nonGit),
        "REPOSITORY_NOT_GIT"
      ),
      relativePath: expectRegistrationCode(
        () => registrations.register(project1.projectId, "relative/repository"),
        "REPOSITORY_PATH_INVALID"
      ),
      explicitTraversal: expectRegistrationCode(
        () =>
          registrations.register(
            project1.projectId,
            `${repositoryRoot}${sep}..${sep}${basename(repositoryRoot)}`
          ),
        "REPOSITORY_PATH_INVALID"
      ),
      filePath: expectRegistrationCode(
        () => registrations.register(project1.projectId, plainFile),
        "REPOSITORY_PATH_INVALID"
      ),
      symlinkedRoot: expectRegistrationCode(
        () => registrations.register(project1.projectId, linkedRoot),
        "REPOSITORY_SYMLINK_REJECTED"
      ),
      symlinkedGitMarker: expectRegistrationCode(
        () => registrations.register(project1.projectId, unsafeMarkerRoot),
        "REPOSITORY_SYMLINK_REJECTED"
      )
    };

    const statusBeforeRegistration = readStatus(repositoryRoot);
    const statusDigestBeforeRegistration = statusDigest(statusBeforeRegistration);
    const treeBeforeRegistration = repositoryTreeDigest(repositoryRoot);
    const registration = registrations.register(project1.projectId, repositoryRoot);
    const statusAfterRegistration = readStatus(repositoryRoot);
    const statusDigestAfterRegistration = statusDigest(statusAfterRegistration);
    const treeAfterRegistration = repositoryTreeDigest(repositoryRoot);
    assert(
      statusAfterRegistration.equals(statusBeforeRegistration),
      "Registration changed repository status."
    );
    assert(
      statusDigestAfterRegistration === statusDigestBeforeRegistration,
      "Registration changed repository status digest."
    );
    assert(
      treeAfterRegistration === treeBeforeRegistration,
      "Registration changed repository bytes."
    );

    const snapshots = new GitSnapshotService(
      database.connection,
      registrations,
      {
        ...dependencies(
          [IDS.snapshot1, IDS.snapshot2],
          [TIMES.three, TIMES.four]
        ),
        runner: new FixedGitCommandRunner()
      }
    );
    const firstSnapshot = await snapshots.capture(mission1.missionId);
    const secondSnapshot = await snapshots.capture(mission1.missionId);
    const statusAfterCapture = readStatus(repositoryRoot);
    const statusDigestAfterCapture = statusDigest(statusAfterCapture);
    const treeAfterCapture = repositoryTreeDigest(repositoryRoot);
    assert(
      statusAfterCapture.equals(statusBeforeRegistration),
      "Snapshot capture changed repository status."
    );
    assert(
      statusDigestAfterCapture === statusDigestBeforeRegistration,
      "Snapshot capture changed repository status digest."
    );
    assert(
      treeAfterCapture === treeBeforeRegistration,
      "Snapshot capture changed repository bytes."
    );
    assert(
      firstSnapshot.changedFilesDigest === secondSnapshot.changedFilesDigest,
      "Repeated snapshot digest was unstable."
    );
    assert(firstSnapshot.indexChangeCount === 1, "Unexpected index count.");
    assert(firstSnapshot.worktreeChangeCount === 1, "Unexpected worktree count.");
    assert(firstSnapshot.untrackedFileCount === 1, "Unexpected untracked count.");
    assert(firstSnapshot.changedFileCount === 3, "Unexpected changed-file count.");

    negativeCorpus.duplicateProjectBinding = expectRegistrationCode(
      () => registrations.register(project1.projectId, repositoryRoot),
      "REPOSITORY_ALREADY_REGISTERED"
    );
    const project2 = projects.createProject("Unregistered project");
    const mission2 = projects.createMission(
      project2.projectId,
      "Prove missing registration rejection"
    );
    negativeCorpus.crossProjectRootReuse = expectRegistrationCode(
      () => registrations.register(project2.projectId, repositoryRoot),
      "REPOSITORY_ALREADY_REGISTERED"
    );

    const project3 = projects.createProject("Archived project");
    projects.archiveProject(project3.projectId);
    const archivedRoot = createMarkerRepository(temporaryRoot, "archived-root");
    negativeCorpus.archivedProject = expectRegistrationCode(
      () => registrations.register(project3.projectId, archivedRoot),
      "REPOSITORY_PROJECT_ARCHIVED"
    );

    const project4 = projects.createProject("Substitution project");
    const substitutionRoot = createMarkerRepository(temporaryRoot, "substitution-root");
    registrations.register(project4.projectId, substitutionRoot);
    const movedSubstitutionRoot = join(temporaryRoot, "moved-substitution-root");
    renameSync(substitutionRoot, movedSubstitutionRoot);
    symlinkSync(movedSubstitutionRoot, substitutionRoot, "junction");
    negativeCorpus.postRegistrationSymlinkSubstitution = expectRegistrationCode(
      () => registrations.resolveRootForRead(project4.projectId),
      "REPOSITORY_SYMLINK_REJECTED"
    );

    const project5 = projects.createProject("Archived mission project");
    const mission3 = projects.createMission(
      project5.projectId,
      "Prove pre-execution mission rejection"
    );
    const archivedMissionRoot = createMarkerRepository(
      temporaryRoot,
      "archived-mission-root"
    );
    registrations.register(project5.projectId, archivedMissionRoot);
    projects.archiveMission(project5.projectId, mission3.missionId);
    let blockedRunnerCalls = 0;
    const blockedSnapshots = new GitSnapshotService(
      database.connection,
      registrations,
      {
        ...dependencies(["00000000-0000-4000-8000-000000000033"], [TIMES.three]),
        runner: {
          run: async () => {
            blockedRunnerCalls += 1;
            return { exitCode: 0, stdout: Buffer.alloc(0) };
          }
        }
      }
    );
    negativeCorpus.missingRegistrationBeforeGit = await expectSnapshotCode(
      () => blockedSnapshots.capture(mission2.missionId),
      "GIT_REPOSITORY_NOT_REGISTERED"
    );
    negativeCorpus.archivedMissionBeforeGit = await expectSnapshotCode(
      () => blockedSnapshots.capture(mission3.missionId),
      "GIT_MISSION_ARCHIVED"
    );
    assert(blockedRunnerCalls === 0, "Rejected capture invoked Git.");

    const conflictRoot = createMarkerRepository(temporaryRoot, "database-conflict-root");
    const conflictDatabasePath = join(conflictRoot, "intelliloop.sqlite3");
    conflictDatabase = openFoundationDatabase({ filePath: conflictDatabasePath });
    const conflictProjects = new SqliteProjectRepository(
      conflictDatabase.connection,
      dependencies([IDS.project6], [TIMES.zero])
    );
    const conflictProject = conflictProjects.createProject("Database conflict project");
    const conflictRegistrations = new RepositoryRegistrationService(
      conflictDatabase.connection,
      conflictDatabasePath,
      dependencies(["00000000-0000-4000-8000-000000000024"], [TIMES.two])
    );
    negativeCorpus.databaseInsideRepository = expectRegistrationCode(
      () => conflictRegistrations.register(conflictProject.projectId, conflictRoot),
      "REPOSITORY_DATABASE_CONFLICT"
    );

    app = buildApp({
      projectRepository: projects,
      repositoryRegistration: registrations,
      gitSnapshotService: snapshots,
      requestIdFactory: () => IDS.request
    });
    const repositoryResponse = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project1.projectId}/repository`
    });
    assert(repositoryResponse.statusCode === 200, "Repository API retrieval failed.");
    const repositoryJson = repositoryResponse.json();
    const repositorySerialized = JSON.stringify(repositoryJson);
    assert(!repositorySerialized.includes(repositoryRoot), "API exposed repository root.");
    assert(
      !repositorySerialized.includes("repo-safety-private-root-sentinel"),
      "API exposed repository path sentinel."
    );
    assert(!("canonicalRoot" in repositoryJson.repository), "API exposed canonical root.");

    const unsupportedMethods = {};
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const response = await app.inject({
        method,
        url: `/api/v1/projects/${project1.projectId}/repository`
      });
      assert(response.statusCode === 404, "Unsupported repository method was registered.");
      unsupportedMethods[method] = "PASS";
    }
    const bodyRejected = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${mission1.missionId}/git-snapshots`,
      payload: { command: "not-allowed" }
    });
    assert(bodyRejected.statusCode === 400, "Snapshot capture accepted caller input.");
    const routeTree = app.printRoutes();
    assert(
      !/(?:shell|execute|execution|command)/iu.test(routeTree),
      "A shell or execution route was present."
    );

    const documentation = verifyDocumentation();
    const fixtureDefinition = {
      ownership: "INTELLILOOP_AUTHORED_SYNTHETIC",
      branch: "main",
      committedFiles: 2,
      dirtyState: {
        indexChanges: 1,
        worktreeChanges: 1,
        untrackedFiles: 1
      },
      databasePlacement: "OUTSIDE_REGISTERED_REPOSITORY",
      network: "OFFLINE"
    };
    const fixtureDefinitionDigest = `sha256:${createHash("sha256")
      .update(JSON.stringify(fixtureDefinition), "utf8")
      .digest("hex")}`;
    report = {
      schemaVersion: 1,
      evidenceId: "EV-REPO-SAFETY",
      storyBoundary: { from: "IL-2.1", through: "IL-2.6" },
      capability: "DC-01",
      status: "PASS",
      evidenceDate: "2026-08-04",
      reproductionCommand: "npm.cmd run evidence:repo-safety",
      fixture: { ...fixtureDefinition, fixtureDefinitionDigest },
      proofs: {
        registration: {
          accessMode: registration.accessMode,
          statusByteEquality: "PASS",
          statusDigestEquality: "PASS",
          completeTreeDigestEquality: "PASS"
        },
        snapshotCapture: {
          statusByteEquality: "PASS",
          statusDigestEquality: "PASS",
          completeTreeDigestEquality: "PASS",
          repeatedChangedFilesDigestEquality: "PASS",
          observedCounts: {
            index: firstSnapshot.indexChangeCount,
            worktree: firstSnapshot.worktreeChangeCount,
            untracked: firstSnapshot.untrackedFileCount,
            total: firstSnapshot.changedFileCount
          }
        },
        negativeCorpus,
        preExecutionRejection: {
          gitRunnerCalls: blockedRunnerCalls,
          result: "PASS"
        },
        httpBoundary: {
          pathFreeRepositoryResponse: "PASS",
          unsupportedRepositoryMethods: unsupportedMethods,
          callerControlledSnapshotBodyRejected: "PASS",
          noShellOrExecutionRoute: "PASS"
        },
        documentation
      },
      equalityInputs: {
        statusAlgorithm: "SHA-256 over exact NUL-delimited porcelain-v1 bytes",
        treeAlgorithm:
          "SHA-256 over sorted relative entry type, path and complete file/link bytes",
        beforeStatusDigestComputed: statusDigestBeforeRegistration.startsWith("sha256:"),
        afterStatusDigestComputed: statusDigestAfterCapture.startsWith("sha256:"),
        beforeTreeDigestComputed: treeBeforeRegistration.startsWith("sha256:"),
        afterTreeDigestComputed: treeAfterCapture.startsWith("sha256:")
      },
      integrity: {
        rawAbsolutePathsRecorded: false,
        repositoryFilenamesRecorded: false,
        registeredRepositoryWritePerformedByProduct: false,
        shellEndpointPresent: false,
        arbitraryCommandInputPresent: false,
        externalProductCallMade: false,
        candidateOrPersonalRepositoryUsed: false,
        temporaryFixtureRemovedAfterRun: true
      },
      limitations: [
        "LOCAL_SINGLE_USER_TRUST_MODEL",
        "DIRECT_DOT_GIT_DIRECTORY_ONLY",
        "POINT_OBSERVATION_NOT_ATOMIC_FILESYSTEM_SNAPSHOT",
        "NO_EXACT_FILENAME_EVIDENCE",
        "NOT_VALIDATION_OR_READINESS",
        "OFFICIAL_AVISHKAR_RULES_UNVERIFIED"
      ],
      nextAuthorizedStory: "IL-3.1"
    };
  } finally {
    if (app !== undefined) await app.close();
    if (conflictDatabase !== undefined) conflictDatabase.close();
    if (database !== undefined) database.close();
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  assert(report !== undefined, "Repository safety report was not produced.");
  const serializedReport = JSON.stringify(report, null, 2);
  assert(!serializedReport.includes(temporaryRoot), "Evidence report exposed a raw root.");
  for (const filename of ["staged.txt", "worktree.txt", "untracked.txt"]) {
    assert(!serializedReport.includes(filename), "Evidence report exposed a filename.");
  }
  writeFileSync(OUTPUT_PATH, `${serializedReport}\n`, "utf8");
}

try {
  await generate();
  process.stdout.write("EV-REPO-SAFETY: PASS; generated path-safe evidence.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown bounded proof failure.";
  const safeMessage = message
    .replace(/[A-Za-z]:[\\/][^\r\n]*/gu, "[private-path]")
    .replace(/\/(?:Users|home|tmp)\/[^\r\n]*/gu, "[private-path]")
    .slice(0, 500);
  process.stderr.write(`EV-REPO-SAFETY: FAIL; ${safeMessage}\n`);
  process.exitCode = 1;
}
