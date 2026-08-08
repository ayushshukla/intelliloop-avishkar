import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import { AiBoundaryPanel, FoundationEmptyState } from "../src/FoundationStates";
import { HealthPanel } from "../src/HealthPanel";
import { loadHealth } from "../src/health-client";

const HEALTH_RESPONSE = {
  service: "intelliloop-api",
  apiVersion: "v1",
  status: "ok",
  serverTimeUtc: "2026-08-04T00:00:00.000Z",
  productMode: "FOUNDATION_ONLY",
  externalAi: "OFF"
} as const;

describe("foundation trust shell", () => {
  it("renders semantic Project selection and scope-gated stage boundaries", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content" tabindex="-1"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Current route");
    expect(html).toContain("Know whether an exact software change is ready to release.");
    expect(html).toContain("Choose a Project");
    expect(html).toContain("Work Item overview");
    expect(html).toContain("Select a Project");
    expect(html).toContain("Select a Work Item");
    expect(html).toContain("Competition demo");
    expect(html).toContain("Golden workflow");
    expect(html).toContain("Use Demo Project");
    expect(html).toContain("Open Local Project Pilot");
    expect(html).toContain("Configured repositories only");
    expect(html).toContain("Authorized local repository");
    expect(html).toContain("CHECKING");
    expect(html).not.toContain("Not available");
    expect(html).not.toContain("Sample project");
    expect(html).not.toContain(">READY<");
  });

  it("recognizes the implemented change-overview route without inventing state", () => {
    const html = renderToStaticMarkup(
      <App initialPath="/projects/00000000-0000-4000-8000-000000000001" />
    );

    expect(html).toContain("Reading the Work Item overview");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Work Item overview");
    expect(html).not.toContain(">READY<");
  });

  it("recognizes the implemented evidence route with an explicit loading state", () => {
    const html = renderToStaticMarkup(
      <App initialPath="/missions/00000000-0000-4000-8000-000000000011/evidence" />
    );

    expect(html).toContain("Reading evidence and lineage");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Linked Evidence");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain(">READY<");
  });

  it("recognizes the persisted Twin route with an explicit verified-history loading state", () => {
    const html = renderToStaticMarkup(
      <App initialPath="/missions/00000000-0000-4000-8000-000000000011/twin" />
    );

    expect(html).toContain("Reading persisted Impact Map history");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Impact Map");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain(">READY<");
  });

  it("recognizes the readiness and Passport route with an explicit verified-history loading state", () => {
    const html = renderToStaticMarkup(
      <App initialPath="/missions/00000000-0000-4000-8000-000000000011/passport" />
    );

    expect(html).toContain("Reading Release Check and Evidence Report history");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Release Check &amp; Report");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain(">READY<");
  });

  it("recognizes the findings-and-impact route with explicit verified-history loading", () => {
    const html = renderToStaticMarkup(
      <App initialPath="/missions/00000000-0000-4000-8000-000000000011/reconciliation" />
    );

    expect(html).toContain("Reading conflict-resolution history");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Resolve Conflicts");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain(">READY<");
  });

  it("recognizes the cited-explanation route with an explicit AI-off loading state", () => {
    const html = renderToStaticMarkup(
      <App initialPath="/missions/00000000-0000-4000-8000-000000000011/explanation" />
    );

    expect(html).toContain("Reading the cited-explanation scope");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cited explanation");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("No provider is contacted");
    expect(html).not.toContain(">READY<");
  });

  it("renders an explicit busy loading state", () => {
    const html = renderToStaticMarkup(<HealthPanel state={{ kind: "loading" }} />);

    expect(html).toContain('data-state="LOADING"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("No external service is contacted.");
  });

  it("renders an honest error with a real retry control", () => {
    const html = renderToStaticMarkup(
      <HealthPanel
        state={{ kind: "unavailable", message: "The local API is unavailable." }}
        onRetry={() => undefined}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('data-state="ERROR"');
    expect(html).toContain("Foundation unavailable");
    expect(html).toContain("Try local API again");
    expect(html).toContain("No cached status, sample response or placeholder is substituted.");
  });

  it("renders connected state as operational truth rather than readiness", () => {
    const html = renderToStaticMarkup(
      <HealthPanel state={{ kind: "healthy", data: HEALTH_RESPONSE }} />
    );

    expect(html).toContain('data-state="CONNECTED"');
    expect(html).toContain("Foundation connected");
    expect(html).toContain("Operational connection only - not release readiness.");
    expect(html).not.toContain(">READY<");
  });

  it("renders explicit empty and AI-off states without product records", () => {
    const html = renderToStaticMarkup(
      <>
        <FoundationEmptyState />
        <AiBoundaryPanel />
      </>
    );

    expect(html).toContain('data-state="EMPTY"');
    expect(html).toContain("No project workspace exists yet");
    expect(html).toContain("Nothing is sampled, inferred or presented as current work.");
    expect(html).toContain('data-state="AI_OFF"');
    expect(html).toContain("No credential is read");
  });
});

describe("foundation health client", () => {
  it("accepts the shared health contract", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(HEALTH_RESPONSE), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(loadHealth(fetcher)).resolves.toEqual({
      kind: "healthy",
      data: HEALTH_RESPONSE
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/health",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("fails honestly when the local fetch rejects", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));

    await expect(loadHealth(fetcher)).resolves.toEqual({
      kind: "unavailable",
      message: "The local API is unavailable. Start the API and try again."
    });
  });

  it("rejects an unhealthy HTTP response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("unavailable", { status: 503 })
    );

    await expect(loadHealth(fetcher)).resolves.toEqual({
      kind: "unavailable",
      message: "The local API did not return a healthy response."
    });
  });

  it("rejects a malformed local response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(loadHealth(fetcher)).resolves.toEqual({
      kind: "unavailable",
      message: "The local API response did not match the foundation contract."
    });
  });
});
