import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import {
  getLocalProjectContext,
  getLocalProjectPilotCapability,
  preflightLocalProject
} from "../src/local-pilot-client";
import { WorkspaceClientError } from "../src/workspace-client";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const SAFE_REPOSITORY = {
  displayName: "controlled-fixture",
  repositoryState: "RECOGNIZED_GIT",
  headState: "ATTACHED",
  ref: "main",
  exactCommit: "a".repeat(40),
  commitTimestampUtc: "2026-08-08T00:00:00.000Z",
  uncommittedChanges: "EXCLUDED",
  excludedChangeCount: 1,
  captureReady: true,
  accessMode: "READ_ONLY",
  sourcePersistence: "SOURCE_FREE"
} as const;

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("Local Project Pilot presentation", () => {
  it("keeps Demo and Local Project entry points visibly distinct", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Use Demo Project");
    expect(html).toContain("Open Local Project Pilot");
    expect(html).toContain("IntelliLoop-owned synthetic data");
    expect(html).toContain("Authorized local repository");
    expect(html).toContain("Uncommitted changes are excluded");
    expect(html).toContain("external AI remains off");
  });

  it("renders a bounded loading state on the local route without demo controls", () => {
    const html = renderToStaticMarkup(<App initialPath="/local-pilot" />);
    expect(html).toContain("Local Project Pilot");
    expect(html).toContain("Checking server capability");
    expect(html).toContain("Read-only and fail-closed");
    expect(html).not.toContain("Apply supported correction");
    expect(html).not.toContain("Advance synthetic dependency commit");
    expect(html).not.toContain("Reset controlled demo");
  });
});

describe("Local Project Pilot client boundary", () => {
  it("accepts explicit ready capability without receiving the allowlist", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      apiVersion: "v1",
      capability: {
        state: "READY", enabled: true, configured: true, localOnly: true,
        accessMode: "READ_ONLY", externalAi: "OFF"
      }
    }));
    await expect(getLocalProjectPilotCapability(fetcher)).resolves.toMatchObject({
      capability: { state: "READY", externalAi: "OFF" }
    });
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("allowedRoots");
  });

  it("accepts exact-commit preflight and sends the path only in the request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      apiVersion: "v1",
      preflight: { status: "READY", repository: SAFE_REPOSITORY }
    }));
    await expect(preflightLocalProject("C:\\controlled\\fixture", fetcher)).resolves.toMatchObject({
      preflight: { status: "READY", repository: { exactCommit: "a".repeat(40) } }
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/local-project-pilot/preflight",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ rootPath: "C:\\controlled\\fixture" }) })
    );
  });

  it("keeps sanitized rejection recovery actionable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      apiVersion: "v1",
      preflight: {
        status: "REJECTED",
        reason: "PATH_NOT_AUTHORIZED",
        recovery: "Choose a repository inside an explicitly configured local root."
      }
    }));
    await expect(preflightLocalProject("C:\\outside", fetcher)).resolves.toMatchObject({
      preflight: { status: "REJECTED", reason: "PATH_NOT_AUTHORIZED" }
    });
  });

  it("rejects any context response that adds a raw path", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      apiVersion: "v1",
      projectId: PROJECT_ID,
      repository: { ...SAFE_REPOSITORY, canonicalRoot: "C:\\private\\repository" }
    }));
    await expect(getLocalProjectContext(PROJECT_ID, fetcher)).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    } satisfies Partial<WorkspaceClientError>);
  });
});
