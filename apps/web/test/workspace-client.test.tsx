import { describe, expect, it, vi } from "vitest";

import {
  WorkspaceClientError,
  captureGitSnapshot,
  createProject,
  isGitSnapshotResource,
  isProjectResource,
  listProjects,
  registerRepository
} from "../src/workspace-client";

const PROJECT = {
  projectId: "00000000-0000-4000-8000-000000000001",
  name: "Controlled project",
  status: "ACTIVE",
  revision: 1,
  createdAtUtc: "2026-08-04T00:00:00.000Z",
  updatedAtUtc: "2026-08-04T00:00:00.000Z"
} as const;

const SNAPSHOT = {
  snapshotId: "00000000-0000-4000-8000-000000000031",
  projectId: PROJECT.projectId,
  missionId: "00000000-0000-4000-8000-000000000011",
  registrationId: "00000000-0000-4000-8000-000000000021",
  capturedAtUtc: "2026-08-04T00:02:00.000Z",
  headState: "UNBORN",
  branchName: "main",
  dirty: true,
  indexChangeCount: 0,
  worktreeChangeCount: 0,
  untrackedFileCount: 1,
  changedFileCount: 1,
  changedFilesDigest: `sha256:${"a".repeat(64)}`
} as const;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("workspace API client", () => {
  it("validates canonical Project and head-specific snapshot resources", () => {
    expect(isProjectResource(PROJECT)).toBe(true);
    expect(isGitSnapshotResource(SNAPSHOT)).toBe(true);
    expect(isGitSnapshotResource({ ...SNAPSHOT, headCommit: "a".repeat(40) })).toBe(
      false
    );
    expect(isGitSnapshotResource({ ...SNAPSHOT, changedFileCount: -1 })).toBe(false);
  });

  it("loads only a valid bounded Project collection", async () => {
    const response = {
      apiVersion: "v1",
      projects: [PROJECT],
      page: { limit: 100, nextCursor: null }
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(response));

    await expect(listProjects(fetcher)).resolves.toEqual(response);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/projects?limit=100",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("creates a Project through the strict JSON boundary", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ apiVersion: "v1", project: PROJECT }, 201)
    );

    await expect(createProject(PROJECT.name, fetcher)).resolves.toEqual({
      apiVersion: "v1",
      project: PROJECT
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: PROJECT.name }),
        headers: { Accept: "application/json", "Content-Type": "application/json" }
      })
    );
  });

  it("sends a repository path once but accepts only a path-free response", async () => {
    const privatePath = "C:\\INTELLILOOP_PRIVATE_REPOSITORY_SENTINEL";
    const repository = {
      registrationId: SNAPSHOT.registrationId,
      projectId: PROJECT.projectId,
      repositoryKind: "LOCAL_GIT",
      accessMode: "READ_ONLY",
      registeredAtUtc: "2026-08-04T00:01:00.000Z"
    } as const;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ apiVersion: "v1", repository }, 201)
    );

    const response = await registerRepository(PROJECT.projectId, privatePath, fetcher);
    expect(response).toEqual({ apiVersion: "v1", repository });
    expect(JSON.stringify(response)).not.toContain(privatePath);
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/projects/${PROJECT.projectId}/repository`,
      expect.objectContaining({ body: JSON.stringify({ rootPath: privatePath }) })
    );
  });

  it("captures a snapshot without sending a body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ apiVersion: "v1", snapshot: SNAPSHOT }, 201)
    );

    await expect(captureGitSnapshot(SNAPSHOT.missionId, fetcher)).resolves.toEqual({
      apiVersion: "v1",
      snapshot: SNAPSHOT
    });
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/missions/${SNAPSHOT.missionId}/git-snapshots`,
      expect.objectContaining({ method: "POST", headers: { Accept: "application/json" } })
    );
  });

  it("rejects malformed success data rather than rendering invented truth", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ apiVersion: "v1", projects: [{ name: "Incomplete" }] })
    );

    await expect(listProjects(fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
  });

  it("maps HTTP failure to a fixed error without response diagnostics", async () => {
    const sentinel = "INTELLILOOP_PRIVATE_ERROR_SENTINEL";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(sentinel, { status: 409 })
    );

    try {
      await createProject("Conflicting project", fetcher);
      throw new Error("Expected client failure.");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceClientError);
      expect(error).toMatchObject({ code: "CONFLICT", status: 409 });
      expect(String(error)).not.toContain(sentinel);
    }
  });

  it("maps an oversized request response to a bounded invalid-request error", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("payload diagnostics", { status: 413 })
    );

    await expect(createProject("Oversized", fetcher)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 413
    });
  });
});
