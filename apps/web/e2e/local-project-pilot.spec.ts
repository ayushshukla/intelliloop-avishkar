import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const repositoryRoot = process.env.INTELLILOOP_E2E_LOCAL_REPOSITORY;
const outsideRepository = process.env.INTELLILOOP_E2E_OUTSIDE_REPOSITORY;
const expectedCommit = process.env.INTELLILOOP_E2E_LOCAL_COMMIT;
if (repositoryRoot === undefined || outsideRepository === undefined || expectedCommit === undefined) {
  throw new Error("Use the supported test:e2e runner for Local Project Pilot coverage.");
}

function git(args: readonly string[], encoding?: BufferEncoding): string | Buffer {
  return execFileSync("git", [...args], {
    cwd: repositoryRoot,
    encoding,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fingerprint() {
  return Object.freeze({
    head: (git(["rev-parse", "HEAD"], "utf8") as string).trim(),
    branch: (git(["symbolic-ref", "--short", "HEAD"], "utf8") as string).trim(),
    status: (git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]) as Buffer).toString("hex"),
    index: digest(join(repositoryRoot, ".git", "index")),
    refs: digest(join(repositoryRoot, ".git", "refs", "heads", "main"))
  });
}

function auditBoundary(page: Page): { readonly assertClean: () => void } {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      external.push(request.url());
    }
  });
  return { assertClean: () => expect(external).toEqual([]) };
}

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ page }) => page.setDefaultTimeout(20_000));

test("rejects an outside repository without exposing either private root", async ({ page }) => {
  await page.goto("/local-pilot");
  await expect(page.getByRole("heading", { name: "Choose an authorized Git repository" })).toBeVisible();
  await page.getByLabel("Configured absolute repository path").fill(outsideRepository);
  await page.getByRole("button", { name: "Run safe preflight" }).click();
  await expect(page.getByRole("alert")).toContainText("PATH NOT AUTHORIZED");
  await expect(page.getByRole("alert")).not.toContainText(outsideRepository);
  await expect(page.locator("body")).not.toContainText(repositoryRoot);
});

test("runs the exact-commit local journey, recovers, remains source-free and survives demo reset", async ({ page }) => {
  test.setTimeout(120_000);
  const boundary = auditBoundary(page);
  const before = fingerprint();
  expect(before.head).toBe(expectedCommit);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use Demo Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Local Project Pilot" })).toBeVisible();
  await page.getByRole("button", { name: "Open Local Project Pilot" }).click();
  await page.getByLabel("Configured absolute repository path").fill(repositoryRoot);
  await page.getByRole("button", { name: "Run safe preflight" }).click();
  await expect(page.getByRole("heading", { name: "Exact repository context" })).toBeVisible();
  await expect(page.getByText(expectedCommit, { exact: true })).toBeVisible();
  await expect(page.getByText("1 uncommitted change(s) excluded", { exact: true })).toBeVisible();
  await expect(page.getByText("Source-free Impact Map", { exact: true })).toBeVisible();

  await page.getByLabel("Project name").fill("Controlled Local Pilot E2E");
  await page.getByLabel("Work Item title").fill("LOCAL-E2E exact commit assessment");
  let interruptOnce = true;
  await page.route("**/api/v1/projects", async (route) => {
    if (interruptOnce && route.request().method() === "POST") {
      interruptOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    } else {
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "Start exact-commit analysis" }).click();
  await expect(page.getByRole("alert")).toContainText("Progress retained");
  await page.unroute("**/api/v1/projects");
  await page.getByRole("button", { name: "Retry from retained progress" }).click();
  await expect(page.getByRole("heading", { name: "Continue through the real Work Item" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Workflow Status:", { exact: true }).locator("..")).toContainText("Not tracked");
  await expect(page.getByText("Release Check:", { exact: true }).locator("..")).toContainText("Not Ready");
  await expect(page.locator("body")).not.toContainText(repositoryRoot);
  await expect(page.locator("body")).not.toContainText("DirtyOnlyPilotContract");

  const projectButton = page.getByRole("button", { name: "Open Work Item overview" });
  await projectButton.focus();
  await expect(projectButton).toBeFocused();
  await projectButton.click();
  await expect(page.getByText("LOCAL PROJECT / READ ONLY", { exact: true })).toBeVisible();
  await expect(page.getByText("No demo reset, synthetic correction, or fixture commit action is available for Local Projects.")).toBeVisible();
  await expect(page.getByText("Workflow Status", { exact: true }).first()).toBeVisible();

  const projectId = new URL(page.url()).pathname.split("/").at(-1);
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/u);
  const reset = await page.request.post("/api/v1/demo/reset");
  expect(reset.ok()).toBe(true);
  const retained = await page.request.get(`/api/v1/projects/${projectId}`);
  expect(retained.ok()).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByText("LOCAL PROJECT / READ ONLY", { exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  expect(fingerprint()).toEqual(before);
  boundary.assertClean();
});
