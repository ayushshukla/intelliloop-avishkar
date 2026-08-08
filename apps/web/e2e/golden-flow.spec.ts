import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { isCitedExplanationResponse } from "../src/cited-explanation-client";

interface DemoSetupBody {
  readonly missionId?: string;
  readonly workflowStage?: string;
}

async function resetDemo(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/v1/demo/reset");
  expect(response.ok()).toBe(true);
}

function auditBrowserBoundary(page: Page): {
  readonly assertClean: () => void;
} {
  const unexpectedOutboundRequests: string[] = [];
  const credentialBearingRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      unexpectedOutboundRequests.push(request.url());
    }
    if (request.headers().authorization !== undefined) {
      credentialBearingRequests.push(request.url());
    }
  });
  return {
    assertClean: () => {
      expect(unexpectedOutboundRequests, "golden workflow must not make an external request").toEqual([]);
      expect(credentialBearingRequests, "controlled demo must not need credentials").toEqual([]);
    }
  };
}

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(10_000);
});
test.describe.configure({ mode: "serial" });

test("imports the controlled fixture and exposes BLOCKED conflict and impact evidence", async ({ page }) => {
  const boundary = auditBrowserBoundary(page);
  await resetDemo(page.request);

  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "LoopMart cancellation control room" })).toBeVisible();
  await expect(page.getByText("SYNTHETIC / AI OFF", { exact: true })).toBeVisible();
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "EMPTY");

  await page.getByRole("button", { name: "Use Demo Project" }).click();
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "INITIAL_BLOCKED");
  await expect(page.locator('[data-readiness-status="BLOCKED"]')).toBeVisible();
  await page.getByRole("button", { name: "Inspect Risks & Checks" }).click();
  await expect(page.getByRole("heading", { name: "Open Risks & Checks", exact: true })).toBeVisible();
  await expect(page.locator(".finding-card--conflict").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cited impact paths" })).toBeVisible();
  await expect(page.locator(".impact-path-card").first()).toBeVisible();

  boundary.assertClean();
  console.log("EV-GOLDEN-FLOW checkpoint=INITIAL_BLOCKED assertions=passed outbound=0 credentials=0");
});

test("generates the BLOCKED cited answer through the deterministic AI-off browser path", async ({ page }) => {
  const boundary = auditBrowserBoundary(page);
  const status = await page.request.get("/api/v1/demo");
  expect(status.ok()).toBe(true);
  const demo = await status.json() as DemoSetupBody;
  expect(demo.workflowStage).toBe("INITIAL_BLOCKED");
  expect(demo.missionId).toMatch(/^[0-9a-f-]{36}$/u);
  const missionId = demo.missionId!;

  const preflight = await page.request.post(`/api/v1/missions/${missionId}/cited-explanations`, {
    data: { question: "What conflicts are open?" }
  });
  const preflightText = await preflight.text();
  expect(preflight.status(), preflightText).toBe(200);
  expect(isCitedExplanationResponse(JSON.parse(preflightText) as unknown)).toBe(true);

  await page.goto(`/missions/${missionId}/explanation`);
  await expect(page.getByRole("heading", { name: "Generate a cited explanation" })).toBeVisible();
  await expect(page.locator('.truth-badge[data-state="AI_OFF"]')).toContainText("Provider calls disabled");
  await page.getByLabel("Evidence question").selectOption("What conflicts are open?");
  await page.getByRole("button", { name: "Generate cited answer" }).click();
  await expect(page.getByRole("heading", { name: "Cited answer from the exact persisted assessment" })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("Outbound disclosure / NOT SENT", { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("External call", { exact: true }).locator(".."), "AI-off path must report no provider call").toContainText("NO", { timeout: 8_000 });

  boundary.assertClean();
  console.log("EV-GOLDEN-FLOW checkpoint=OFFLINE_EXPLANATION assertions=passed outbound=0 credentials=0");
});

test("applies the controlled correction and presents READY with an unsigned Passport", async ({ page }) => {
  const boundary = auditBrowserBoundary(page);

  await page.goto("/demo");
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "INITIAL_BLOCKED");
  await page.getByRole("button", { name: "Apply controlled correction" }).click();
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "CORRECTED_READY");
  await expect(page.locator('[data-readiness-status="READY"]')).toBeVisible();
  await page.getByRole("button", { name: "Inspect unsigned Evidence Report" }).click();
  await expect(page.locator('.readiness-verdict[data-readiness-status="READY"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Release Evidence Report" })).toBeVisible();
  await expect(page.getByText("UNSIGNED / NOT APPROVAL", { exact: true })).toBeVisible();
  await expect(page.locator('.passport-panel[data-passport-status="READY"]')).toBeVisible();

  boundary.assertClean();
  console.log("EV-GOLDEN-FLOW checkpoint=CORRECTED_READY assertions=passed outbound=0 credentials=0");
});

test("invalidates the READY dependency and preserves the historical Passport as STALE", async ({ page }) => {
  const boundary = auditBrowserBoundary(page);
  console.log("EV-GOLDEN-FLOW checkpoint=STALE_PREREQUISITE_READY assertions=passed");

  await page.goto("/demo");
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "CORRECTED_READY", { timeout: 8_000 });
  await page.getByRole("button", { name: "Demonstrate dependency staleness" }).click();
  console.log("EV-GOLDEN-FLOW checkpoint=STALE_ACTION_RETURNED assertions=passed");
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "READY_STALE", { timeout: 8_000 });
  await expect(page.locator('[data-readiness-status="STALE"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole("heading", { name: "Not Ready → Ready → Recheck Needed is persisted" })).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "Inspect unsigned Evidence Report" }).click();
  await expect(page.locator('.readiness-verdict[data-readiness-status="STALE"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('.passport-panel[data-passport-status="STALE"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("UNSIGNED / NOT APPROVAL", { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole("heading", { name: "Exact dependency changes" })).toBeVisible({ timeout: 8_000 });

  await page.goto("/demo");
  await page.getByRole("button", { name: "Reset controlled demo" }).click();
  await expect(page.getByRole("alert")).toContainText("Reset only IntelliLoop-owned demo data?");
  await page.getByRole("button", { name: "Confirm controlled reset" }).click();
  await expect(page.locator(".demo-workspace")).toHaveAttribute("data-demo-stage", "EMPTY");
  await expect(page.getByRole("button", { name: "Use Demo Project" })).toBeVisible();

  boundary.assertClean();
  console.log("EV-GOLDEN-FLOW checkpoint=READY_STALE assertions=passed outbound=0 credentials=0");
});
