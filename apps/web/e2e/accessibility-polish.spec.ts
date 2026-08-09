import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";

const EMPTY_WORKSPACE = {
  apiVersion: "v1",
  fixtureId: "loopmart-expanded-cancellation-v1",
  fixtureVersion: "intelliloop-retail-cancellation-fixture.v1",
  ownership: "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY",
  status: "EMPTY",
  synthetic: true,
  repositoryExecution: false
} as const;

const BLOCKED_WORKSPACE = {
  ...EMPTY_WORKSPACE,
  status: "READY",
  projectId: "11111111-1111-4111-8111-111111111111",
  missionId: "22222222-2222-4222-8222-222222222222",
  initialSnapshotId: "33333333-3333-4333-8333-333333333333",
  codeMapRevision: 1,
  twinRevision: 1,
  reconciliationRevision: 1,
  readinessRevision: 1,
  workflowStage: "INITIAL_BLOCKED",
  readinessStatus: "BLOCKED"
} as const;

const READY_WORKSPACE = {
  ...BLOCKED_WORKSPACE,
  correctedSnapshotId: "44444444-4444-4444-8444-444444444444",
  correctedCodeMapRevision: 2,
  correctedTwinRevision: 2,
  correctedReconciliationRevision: 2,
  readyAssessmentRevision: 2,
  passportAssessmentRevision: 2,
  workflowStage: "CORRECTED_READY",
  readinessStatus: "READY"
} as const;

const STALE_WORKSPACE = {
  ...READY_WORKSPACE,
  staleSnapshotId: "55555555-5555-4555-8555-555555555555",
  workflowStage: "READY_STALE",
  readinessStatus: "STALE"
} as const;

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function attachViewport(testInfo: TestInfo, name: string, page: Page): Promise<void> {
  await testInfo.attach(name, { body: await page.screenshot(), contentType: "image/png" });
}

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(10_000);
});

test("presents loading and empty states without inventing trust", async ({ page }, testInfo) => {
  let releaseResponse: (() => void) | undefined;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/v1/demo", async (route) => {
    await responseGate;
    await fulfillJson(route, EMPTY_WORKSPACE);
  });
  await page.goto("/demo", { waitUntil: "domcontentloaded" });

  const loading = page.getByRole("heading", { name: "Reading golden workflow state" });
  await expect(loading).toBeVisible();
  await expect(loading.locator("..")).toHaveAttribute("aria-busy", "true");
  await attachViewport(testInfo, "loading-1366x768", page);

  releaseResponse?.();
  await expect(page.getByRole("heading", { name: "Load the controlled initial candidate" })).toBeVisible();
  await expect(page.getByRole("status", { name: /Current Release Check: Not Checked/u })).toContainText("No stored deterministic assessment");
  await attachViewport(testInfo, "empty-1366x768", page);
});

test("presents an explicit unavailable state and recovers on retry", async ({ page }, testInfo) => {
  let unavailable = true;
  await page.route("**/api/v1/demo", async (route) => {
    if (unavailable) await fulfillJson(route, { error: "DEMO_UNAVAILABLE" }, 503);
    else await fulfillJson(route, EMPTY_WORKSPACE);
  });
  await page.goto("/demo");
  const error = page.getByRole("alert");
  await expect(error).toContainText("Competition demo unavailable");
  await expect(error).toContainText("no Release Check has been inferred or preserved");
  await attachViewport(testInfo, "error-1366x768", page);
  unavailable = false;
  await page.getByRole("button", { name: "Retry demo workspace" }).click();
  await expect(page.getByRole("button", { name: "Use Demo Project" })).toBeVisible();
});

test("keeps the three-state story semantic, non-color-only and keyboard operable", async ({ page }, testInfo) => {
  await page.route("**/api/v1/demo", (route) => fulfillJson(route, EMPTY_WORKSPACE));
  await page.route("**/api/v1/demo/setup", (route) => fulfillJson(route, { ...BLOCKED_WORKSPACE, created: true }));
  await page.route("**/api/v1/demo/correction", (route) => fulfillJson(route, { ...READY_WORKSPACE, changed: true }));
  await page.route("**/api/v1/demo/staleness", (route) => fulfillJson(route, { ...STALE_WORKSPACE, changed: true }));
  await page.goto("/demo");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const setupButton = page.getByRole("button", { name: "Use Demo Project" });
  await setupButton.focus();
  await expect(setupButton).toBeFocused();
  await page.keyboard.press("Enter");

  const correctionHeading = page.getByRole("heading", { name: "Resolve the conflict with cited corrective inputs" });
  await expect(correctionHeading).toBeFocused();
  await expect(page.getByRole("status", { name: /Current Release Check: Not Ready/u })).toContainText("required deterministic checks did not pass");
  await expect(page.locator('.guided-step[aria-current="step"]')).toContainText("CURRENT");
  await attachViewport(testInfo, "blocked-1366x768", page);

  const correctionButton = page.getByRole("button", { name: "Apply controlled correction" });
  await correctionButton.focus();
  await expect(correctionButton).toBeFocused();
  await page.keyboard.press("Enter");

  const staleHeading = page.getByRole("heading", { name: "Prove that Ready is not permanent" });
  await expect(staleHeading).toBeFocused();
  await expect(page.getByRole("status", { name: /Current Release Check: Ready/u })).toContainText("required deterministic checks passed");
  await attachViewport(testInfo, "ready-1366x768", page);

  const staleButton = page.getByRole("button", { name: "Demonstrate dependency staleness" });
  await staleButton.focus();
  await expect(staleButton).toBeFocused();
  await page.keyboard.press("Enter");

  const completeHeading = page.getByRole("heading", { name: "Not Ready → Ready → Recheck Needed is persisted" });
  await expect(completeHeading).toBeFocused();
  await expect(page.getByRole("status", { name: /Current Release Check: Recheck Needed/u })).toContainText("exact dependency changed");
  await attachViewport(testInfo, "stale-1366x768", page);

  await expect(page.getByRole("list", { name: "Six-step demonstration progress" }).getByRole("listitem")).toHaveCount(6);
  const headingLevels = await page.locator("main h1, main h2, main h3").evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
  expect(headingLevels[0]).toBe(1);
  expect(headingLevels.every((level, index) => index === 0 || level - headingLevels[index - 1]! <= 1)).toBe(true);
});

test("avoids horizontal overflow at competition and mobile viewports", async ({ page }, testInfo) => {
  await page.route("**/api/v1/demo", (route) => fulfillJson(route, STALE_WORKSPACE));
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "LoopMart cancellation control room" })).toBeVisible();
    const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
    await attachViewport(testInfo, `stale-${viewport.width}x${viewport.height}`, page);
  }
});
