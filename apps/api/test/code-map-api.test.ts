import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP } from "@intelliloop/demo-fixtures";
import {
  createClock,
  createStableIdGenerator,
  type ProjectDomainDependencies
} from "@intelliloop/domain";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { CodeMapExtractor } from "../src/code-map/code-map-extractor.js";
import { CodeMapProjectionService } from "../src/code-map/code-map-projection-service.js";
import { SqliteCodeMapRepository } from "../src/code-map/code-map-repository.js";
import { CodeMapScanner } from "../src/code-map/code-map-scanner.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";
import { SqliteClaimRepository } from "../src/evidence/claim-repository.js";
import { SqliteEvidenceRepository } from "../src/evidence/evidence-repository.js";
import { GitSnapshotService } from "../src/projects/git-snapshot-service.js";
import { FixedGitCommandRunner } from "../src/projects/git-command-runner.js";
import { SqliteProjectRepository } from "../src/projects/project-repository.js";
import { RepositoryRegistrationService } from "../src/projects/repository-registration.js";
import {
  SqliteTwinRepository,
  TwinMaterializationService
} from "../src/twin/twin-repository.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

const directories: string[] = [];
const databases: ReturnType<typeof openFoundationDatabase>[] = [];
const apps: ReturnType<typeof buildApp>[] = [];

function sequence<T>(values: readonly T[]): () => T {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Fixture sequence exhausted.");
    index += 1;
    return value;
  };
}

function projectDependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(sequence([P1, M1])),
    clock: createClock(() => new Date("2026-08-05T10:00:00.000Z"))
  };
}

function git(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      LC_ALL: "C"
    }
  });
  if (result.status !== 0) throw new Error("Git fixture command failed.");
}

function environment(options: {
  readonly oversized?: boolean;
  readonly utf8Bom?: boolean;
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "intelliloop-code-map-api-"));
  directories.push(directory);
  const repositoryRoot = join(directory, "repository");
  mkdirSync(join(repositoryRoot, "src"), { recursive: true });
  if (options.oversized === true) {
    writeFileSync(
      join(repositoryRoot, "src", "oversized.ts"),
      `export const oversized = "${"x".repeat(270_000)}";\n`,
      "utf8"
    );
  } else {
    const prefix = options.utf8Bom === true ? "\ufeff" : "";
    writeFileSync(
      join(repositoryRoot, "src", "policy.ts"),
      `${prefix}export interface CancellationPolicy { timeout: number }\n`,
      "utf8"
    );
    writeFileSync(
      join(repositoryRoot, "src", "route.ts"),
      prefix + [
        'import type { CancellationPolicy } from "./policy.js";',
        'export function register(app: { post(path: string): void }): void {',
        '  app.post("/cancel");',
        '}',
        "export type { CancellationPolicy };",
        ""
      ].join("\n"),
      "utf8"
    );
    writeFileSync(
      join(repositoryRoot, "src", "route.test.ts"),
      `${prefix}import { register } from "./route.js";\nvoid register;\n`,
      "utf8"
    );
    writeFileSync(
      join(repositoryRoot, "package.json"),
      prefix + JSON.stringify({ name: "controlled-code-map-fixture", private: true }),
      "utf8"
    );
  }
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, [
    "-c", "user.name=IntelliLoop Fixture",
    "-c", "user.email=fixture@invalid.example",
    "commit", "-m", "fixture"
  ]);

  const filePath = join(directory, "data", "intelliloop.sqlite3");
  const database = openFoundationDatabase({ filePath });
  databases.push(database);
  const projects = new SqliteProjectRepository(
    database.connection,
    projectDependencies()
  );
  const project = projects.createProject("Code-map API project");
  const mission = projects.createMission(project.projectId, "Map repository safely");
  const registrations = new RepositoryRegistrationService(
    database.connection,
    filePath
  );
  registrations.register(project.projectId, repositoryRoot);
  const snapshots = new GitSnapshotService(database.connection, registrations, {
    ids: createStableIdGenerator(() => randomUUID()),
    clock: createClock(() => new Date("2026-08-05T10:02:00.000Z")),
    runner: new FixedGitCommandRunner()
  });
  const codeMaps = new SqliteCodeMapRepository(database.connection);
  const codeMapProjectionService = new CodeMapProjectionService({
    snapshots,
    scanner: new CodeMapScanner(database.connection, registrations),
    extractor: new CodeMapExtractor(),
    repository: codeMaps,
    clock: createClock(() => new Date("2026-08-05T10:05:00.000Z")),
    fallback: {
      enabledForControlledIntelliLoopFixture: true,
      manifest: INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP
    }
  });
  const evidence = new SqliteEvidenceRepository(database.connection);
  const claims = new SqliteClaimRepository(database.connection);
  const twins = new SqliteTwinRepository(database.connection);
  const twinMaterializer = new TwinMaterializationService({
    projects,
    evidence,
    claims,
    snapshots,
    twins,
    codeMaps
  });
  const app = buildApp({
    projectRepository: projects,
    evidenceRepository: evidence,
    claimRepository: claims,
    gitSnapshotService: snapshots,
    twinRepository: twins,
    twinMaterializer,
    codeMapRepository: codeMaps,
    codeMapProjectionService,
    requestIdFactory: () => REQUEST_ID
  });
  apps.push(app);
  return { app, database, codeMaps, project, mission };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
  for (const database of databases.splice(0)) {
    if (database.connection.open) database.close();
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("code-map revision API", () => {
  it("maps a real repository, exposes bounded attributed paths and refreshes the Twin", async () => {
    const { app } = environment();

    const created = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/code-map/revisions`
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({
      apiVersion: "v1",
      created: true,
      codeMapRevision: {
        projectId: P1,
        missionId: M1,
        revision: 1,
        evidence: {
          evidenceKind: "STATIC_INFERENCE",
          inferenceStatus: "AVAILABLE",
          completeness: "COMPLETE"
        },
        snapshot: {
          snapshotId: expect.stringMatching(/^[0-9a-f-]{36}$/u),
          snapshotDigest: expect.stringMatching(/^sha256:/u)
        }
      }
    });
    expect(created.json().codeMapRevision.assetCount).toBeGreaterThanOrEqual(5);
    expect(created.json().codeMapRevision.edgeCount).toBeGreaterThanOrEqual(2);

    const revisions = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions?limit=1`
    });
    expect(revisions.statusCode).toBe(200);
    expect(revisions.json()).toMatchObject({
      missionId: M1,
      revisions: [{ revision: 1 }],
      page: { limit: 1, nextCursor: null }
    });

    const exact = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions/1`
    });
    expect(exact.statusCode).toBe(200);
    expect(exact.json().codeMapRevision).toEqual(
      created.json().codeMapRevision
    );

    const assets = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions/1/assets?limit=2`
    });
    expect(assets.statusCode).toBe(200);
    expect(assets.json().assets).toHaveLength(2);
    expect(assets.json().page.nextCursor).toMatch(/^[0-9a-f-]{36}$/u);
    expect(assets.body).not.toContain("repositoryRoot");

    const edges = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions/1/edges?limit=100`
    });
    expect(edges.statusCode).toBe(200);
    expect(edges.json().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: expect.stringMatching(/^(?:IMPORTS|REEXPORTS|DECLARES_|TEST_IMPORTS)/u),
          evidenceKind: "STATIC_INFERENCE"
        })
      ])
    );

    const twin = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/twin/revisions`
    });
    expect(twin.statusCode).toBe(201);
    expect(twin.json().twinRevision.codeMapBinding).toEqual({
      projectionId: created.json().codeMapRevision.projectionId,
      revision: created.json().codeMapRevision.revision,
      projectionDigest: created.json().codeMapRevision.projectionDigest
    });
    const twinNodes = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/twin/revisions/1/nodes?limit=100`
    });
    expect(twinNodes.json().nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeType: "SoftwareAsset",
          attribution: expect.objectContaining({
            origin: "REPOSITORY_OBSERVATION",
            epistemicLabel: "INFERENCE"
          })
        })
      ])
    );
  });

  it("keeps declared fallback opt-in and visibly distinct after a safe scan limit", async () => {
    const { app } = environment({ oversized: true });

    const withoutConsent = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/code-map/revisions`
    });
    expect(withoutConsent.statusCode).toBe(409);
    expect(withoutConsent.json().error).toMatchObject({
      code: "CONFLICT",
      requestId: REQUEST_ID
    });

    const withConsent = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/code-map/revisions`,
      payload: { fallbackMode: "INTELLILOOP_CONTROLLED_FIXTURE" }
    });
    expect(withConsent.statusCode, withConsent.body).toBe(201);
    expect(withConsent.json()).toMatchObject({
      codeMapRevision: {
        evidence: {
          evidenceKind: "DECLARED_INTELLILOOP_FIXTURE",
          inferenceStatus: "UNAVAILABLE_SAFE_FAILURE",
          completeness: "UNAVAILABLE",
          declaredManifestId: "intelliloop-checkout-modernization-v1",
          fallbackReason: "SCAN_LIMIT_OR_SAFE_FAILURE"
        }
      }
    });

    const invalidFallback = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/code-map/revisions`,
      payload: { fallbackMode: "AUTOMATIC" }
    });
    expect(invalidFallback.statusCode).toBe(400);
    expect(invalidFallback.json().error.code).toBe("INVALID_REQUEST");
  });

  it("maps Windows-authored UTF-8 BOM sources without losing byte integrity", async () => {
    const { app } = environment({ utf8Bom: true });

    const created = await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/code-map/revisions`
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({
      codeMapRevision: {
        evidence: {
          evidenceKind: "STATIC_INFERENCE",
          inferenceStatus: "AVAILABLE",
          completeness: "COMPLETE"
        }
      }
    });

    const assets = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions/1/assets?limit=100`
    });
    expect(assets.statusCode, assets.body).toBe(200);
    expect(assets.json().assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "PACKAGE",
          label: "controlled-code-map-fixture"
        }),
        expect.objectContaining({ kind: "CONTRACT", label: "CancellationPolicy" })
      ])
    );
  });

  it("returns bounded page errors and detects persisted integrity failure", async () => {
    const { app, database } = environment();
    await app.inject({
      method: "POST",
      url: `/api/v1/missions/${M1}/code-map/revisions`
    });

    const invalidPage = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions/1/assets?limit=101`
    });
    expect(invalidPage.statusCode).toBe(400);

    database.connection.exec("DROP TRIGGER code_map_revisions_reject_update");
    database.connection.prepare(
      `UPDATE code_map_revisions
       SET canonical_json = json_set(canonical_json, '$.assets[0].label', 'tampered-private-value')
       WHERE mission_id = ? AND revision = 1`
    ).run(M1);
    const integrity = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${M1}/code-map/revisions/1/assets?limit=100`
    });
    expect(integrity.statusCode).toBe(500);
    expect(integrity.json().error).toMatchObject({
      code: "INTEGRITY_ERROR",
      requestId: REQUEST_ID
    });
    expect(integrity.body).not.toContain("tampered-private-value");
  });
});
