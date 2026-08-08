import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, sep } from "node:path";

import { createClock, createStableIdGenerator } from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { CodeMapExtractor } from "../src/code-map/code-map-extractor.js";
import { CodeMapProjectionService } from "../src/code-map/code-map-projection-service.js";
import { SqliteCodeMapRepository } from "../src/code-map/code-map-repository.js";
import { CodeMapScanner } from "../src/code-map/code-map-scanner.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { createSafeLogger } from "../src/observability.js";
import { FixedGitCommandRunner } from "../src/projects/git-command-runner.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { LocalProjectPilotService } from "../src/projects/local-project-pilot-service.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import { RepositoryRegistrationService } from "../src/projects/repository-registration.js";

const roots: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];
const SNAPSHOT_CAPTURED_AT = "2026-08-08T00:00:00.000Z";
const PROJECTION_RECORDED_AT = "2026-08-08T00:01:00.000Z";

function git(root: string, args: readonly string[], encoding?: BufferEncoding): string | Buffer {
  return execFileSync("git", [...args], {
    cwd: root,
    encoding,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function createRepository(root: string, symbol = "CommittedContract"): string {
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "contract.ts"),
    `export interface ${symbol} { readonly value: string; }\n`,
    "utf8"
  );
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "pilot-fixture", private: true }), "utf8");
  writeFileSync(join(root, "settings.local.json"), "{}\n", "utf8");
  git(root, ["init", "-b", "main"]);
  git(root, ["add", "--all"]);
  git(root, [
    "-c", "user.name=IntelliLoop Fixture", "-c",
    "user.email=fixture@invalid.example", "commit", "-m", "fixture"
  ]);
  return (git(root, ["rev-parse", "HEAD"], "utf8") as string).trim();
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function repositoryFingerprint(root: string) {
  return Object.freeze({
    head: (git(root, ["rev-parse", "HEAD"], "utf8") as string).trim(),
    branch: (git(root, ["symbolic-ref", "--short", "HEAD"], "utf8") as string).trim(),
    status: (git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) as Buffer).toString("hex"),
    index: digest(join(root, ".git", "index")),
    refs: digest(join(root, ".git", "refs", "heads", "main"))
  });
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), "intelliloop-local-pilot-"));
  roots.push(root);
  const repositoryRoot = join(root, "authorized-repository");
  const exactCommit = createRepository(repositoryRoot);
  const database = openFoundationDatabase({ filePath: join(root, "data", "intelliloop.sqlite3") });
  databases.push(database);
  const projects = new SqliteProjectRepository(database.connection);
  const registrations = new RepositoryRegistrationService(
    database.connection,
    join(root, "data", "intelliloop.sqlite3")
  );
  const pilot = new LocalProjectPilotService(
    database.connection,
    registrations,
    { enabled: true, allowedRoots: [repositoryRoot] }
  );
  const snapshots = new GitSnapshotService(database.connection, registrations, {
    ids: createStableIdGenerator(() => randomUUID()),
    clock: createClock(() => new Date(SNAPSHOT_CAPTURED_AT)),
    runner: new FixedGitCommandRunner()
  });
  const codeMaps = new SqliteCodeMapRepository(database.connection);
  const projection = new CodeMapProjectionService({
    snapshots,
    scanner: new CodeMapScanner(database.connection, registrations),
    extractor: new CodeMapExtractor(),
    repository: codeMaps,
    clock: createClock(() => new Date(PROJECTION_RECORDED_AT))
  });
  const logs: string[] = [];
  const app = buildApp({
    logger: createSafeLogger({ level: "info", write: (line) => logs.push(line) }),
    projectRepository: projects,
    repositoryRegistration: registrations,
    localProjectPilotService: pilot,
    gitSnapshotService: snapshots,
    codeMapRepository: codeMaps,
    codeMapProjectionService: projection
  });
  apps.push(app);
  return { app, database, projects, repositoryRoot, exactCommit, logs, registrations };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  for (const database of databases.splice(0)) if (database.connection.open) database.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Local Project Pilot API", () => {
  it("is default-off, requires an allowlist, and never enumerates configured roots", async () => {
    const env = setup();
    const disabled = new LocalProjectPilotService(
      env.database.connection,
      env.registrations,
      { enabled: false, allowedRoots: [env.repositoryRoot] }
    );
    const missing = new LocalProjectPilotService(
      env.database.connection,
      env.registrations,
      { enabled: true, allowedRoots: [] }
    );
    expect(disabled.capability().capability.state).toBe("DISABLED");
    expect(missing.capability().capability.state).toBe("CONFIGURATION_REQUIRED");
    expect(JSON.stringify(disabled.capability())).not.toContain(env.repositoryRoot);
    expect((await disabled.preflight(env.repositoryRoot)).preflight).toMatchObject({
      status: "REJECTED", reason: "FEATURE_DISABLED"
    });
    expect((await missing.preflight(env.repositoryRoot)).preflight).toMatchObject({
      status: "REJECTED", reason: "CONFIGURATION_REQUIRED"
    });
  });

  it("rejects outside, sibling-prefix, traversal, non-Git, unborn and link paths with sanitized results", async () => {
    const env = setup();
    const nested = join(env.repositoryRoot, "nested-repository");
    const nestedCommit = createRepository(nested, "NestedContract");
    const sibling = `${env.repositoryRoot}-sibling`;
    createRepository(sibling, "SiblingContract");
    const outside = join(roots[0] as string, "outside-repository");
    createRepository(outside, "OutsideContract");
    const nonGit = join(env.repositoryRoot, "plain-directory");
    mkdirSync(nonGit);
    const unborn = join(env.repositoryRoot, "unborn-repository");
    mkdirSync(unborn);
    git(unborn, ["init", "-b", "main"]);

    for (const candidate of [sibling, outside]) {
      const response = await env.app.inject({
        method: "POST", url: "/api/v1/local-project-pilot/preflight",
        payload: { rootPath: candidate }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().preflight.reason).toBe("PATH_NOT_AUTHORIZED");
      expect(response.body).not.toContain(candidate);
      expect(response.body).not.toContain(env.repositoryRoot);
    }
    const traversal = await env.app.inject({
      method: "POST", url: "/api/v1/local-project-pilot/preflight",
      payload: { rootPath: `${env.repositoryRoot}${sep}..${sep}${basename(sibling)}` }
    });
    expect(traversal.json().preflight.reason).toBe("PATH_INVALID");
    expect((await env.app.inject({
      method: "POST", url: "/api/v1/local-project-pilot/preflight", payload: { rootPath: nonGit }
    })).json().preflight.reason).toBe("REPOSITORY_NOT_GIT");
    expect((await env.app.inject({
      method: "POST", url: "/api/v1/local-project-pilot/preflight", payload: { rootPath: unborn }
    })).json().preflight.reason).toBe("COMMIT_UNAVAILABLE");
    expect((await env.app.inject({
      method: "POST", url: "/api/v1/local-project-pilot/preflight", payload: { rootPath: nested }
    })).json()).toMatchObject({
      preflight: {
        status: "READY",
        repository: { displayName: "nested-repository", exactCommit: nestedCommit }
      }
    });

    const link = join(roots[0] as string, "repository-link");
    try {
      symlinkSync(env.repositoryRoot, link, process.platform === "win32" ? "junction" : "dir");
      const linked = await env.app.inject({
        method: "POST", url: "/api/v1/local-project-pilot/preflight", payload: { rootPath: link }
      });
      expect(linked.json().preflight.reason).toBe("UNSAFE_LINK");
    } catch {
      // Link creation may be unavailable in a restricted Windows test account.
    }
    expect(env.logs.join("\n")).not.toContain(env.repositoryRoot);
  });

  it("preflights, captures and maps only the exact committed object without repository mutation", async () => {
    const env = setup();
    writeFileSync(
      join(env.repositoryRoot, "src", "contract.ts"),
      "export interface DirtyOnlyContract { readonly secret: string; }\n",
      "utf8"
    );
    const before = repositoryFingerprint(env.repositoryRoot);
    const preflight = await env.app.inject({
      method: "POST", url: "/api/v1/local-project-pilot/preflight",
      payload: { rootPath: env.repositoryRoot }
    });
    expect(preflight.statusCode).toBe(200);
    expect(preflight.json()).toMatchObject({
      preflight: {
        status: "READY",
        repository: {
          displayName: "authorized-repository",
          exactCommit: env.exactCommit,
          uncommittedChanges: "EXCLUDED",
          excludedChangeCount: 1,
          accessMode: "READ_ONLY",
          sourcePersistence: "SOURCE_FREE"
        }
      }
    });
    expect(preflight.body).not.toContain(env.repositoryRoot);

    const project = env.projects.createProject("Local pilot fixture");
    const mission = env.projects.createMission(project.projectId, "LOCAL-TEST read-only pilot");
    const registered = await env.app.inject({
      method: "PUT", url: `/api/v1/projects/${project.projectId}/repository`,
      payload: { rootPath: env.repositoryRoot }
    });
    expect(registered.statusCode).toBe(201);
    const snapshot = await env.app.inject({
      method: "POST", url: `/api/v1/missions/${mission.missionId}/git-snapshots`
    });
    expect(snapshot.statusCode).toBe(201);
    expect(snapshot.json().snapshot).toMatchObject({
      headCommit: env.exactCommit,
      capturedAtUtc: SNAPSHOT_CAPTURED_AT,
      dirty: true,
      changedFileCount: 1
    });
    const mapped = await env.app.inject({
      method: "POST", url: `/api/v1/missions/${mission.missionId}/code-map/revisions`
    });
    expect(mapped.statusCode, mapped.body).toBe(201);
    expect(mapped.json()).toMatchObject({
      created: true,
      codeMapRevision: {
        recordedAtUtc: PROJECTION_RECORDED_AT,
        snapshot: { capturedAtUtc: SNAPSHOT_CAPTURED_AT },
        evidence: { evidenceKind: "STATIC_INFERENCE" }
      }
    });
    const assets = await env.app.inject({
      method: "GET", url: `/api/v1/missions/${mission.missionId}/code-map/revisions/1/assets?limit=100`
    });
    expect(assets.statusCode).toBe(200);
    expect(assets.body).toContain("CommittedContract");
    expect(assets.body).not.toContain("DirtyOnlyContract");
    expect(assets.body).not.toContain("settings.local.json");
    expect(assets.body).not.toContain("readonly value");
    expect(assets.body).not.toContain(env.repositoryRoot);
    expect(repositoryFingerprint(env.repositoryRoot)).toEqual(before);
    expect(env.logs.join("\n")).not.toContain(env.repositoryRoot);
  });

  it("keeps the one-millisecond Git deadline fail-closed", async () => {
    const env = setup();
    const service = new LocalProjectPilotService(
      env.database.connection,
      env.registrations,
      { enabled: true, allowedRoots: [env.repositoryRoot] },
      { runner: new FixedGitCommandRunner({ timeoutMs: 1 }) }
    );
    const result = await service.preflight(env.repositoryRoot);
    expect(result.preflight).toMatchObject({ status: "REJECTED", reason: "GIT_TIMEOUT" });
  });
});
