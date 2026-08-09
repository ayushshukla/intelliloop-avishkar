import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const e2eRoot = process.env.INTELLILOOP_E2E_DATA_DIRECTORY;
if (e2eRoot === undefined) {
  throw new Error("The IntelliLoop E2E data directory is required.");
}

const PRIVATE_REPOSITORY_SENTINEL = "INTELLILOOP_PRIVATE_REPOSITORY_SENTINEL";
const CODE_MAP_REPOSITORY_SENTINEL = "INTELLILOOP_CODE_MAP_REPOSITORY_SENTINEL";
const RECONCILIATION_REPOSITORY_SENTINEL = "INTELLILOOP_RECONCILIATION_REPOSITORY_SENTINEL";
const PRIVATE_FILE_SENTINEL = "INTELLILOOP_PRIVATE_FILE_SENTINEL";
const repositoryRoot = join(
  e2eRoot,
  PRIVATE_REPOSITORY_SENTINEL,
  "foundation-repository"
);
const codeMapRepositoryRoot = join(
  e2eRoot,
  CODE_MAP_REPOSITORY_SENTINEL,
  "code-map-repository"
);
const reconciliationRepositoryRoot = join(
  e2eRoot,
  RECONCILIATION_REPOSITORY_SENTINEL,
  "reconciliation-repository"
);

function initializeControlledRepository(root = repositoryRoot): void {
  mkdirSync(join(root, "src"), { recursive: true });
  if (!existsSync(join(root, ".git"))) {
    const initialized = spawnSync("git", ["init", "-b", "main"], {
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
    if (initialized.status !== 0) {
      throw new Error("Controlled E2E Git fixture initialization failed.");
    }
  }
  writeFileSync(
    join(root, "INTELLILOOP_PRIVATE_FILE_SENTINEL.txt"),
    "controlled untracked evidence\n",
    "utf8"
  );
  writeFileSync(
    join(root, "src", "cancellation-policy.ts"),
    "export interface CancellationPolicy { timeoutSeconds: number }\n",
    "utf8"
  );
  writeFileSync(
    join(root, "src", "cancellation-route.ts"),
    [
      'import type { CancellationPolicy } from "./cancellation-policy.js";',
      'export function registerCancellation(app: { post(path: string): void }): void {',
      '  app.post("/cancel");',
      '}',
      'export type { CancellationPolicy };',
      ""
    ].join("\n"),
    "utf8"
  );
  writeFileSync(
    join(root, "src", "cancellation-route.test.ts"),
    'import { registerCancellation } from "./cancellation-route.js";\nvoid registerCancellation;\n',
    "utf8"
  );
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "intelliloop-controlled-e2e", private: true }),
    "utf8"
  );
}

async function openFreshEvidenceWorkspace(
  page: Page,
  projectName: string,
  missionTitle: string
): Promise<string> {
  await page.goto("/");
  const projectNameInput = page.getByLabel("New Project name");
  await projectNameInput.fill(projectName);
  await projectNameInput.press("Enter");
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

  const missionTitleInput = page.getByLabel("Work Item title");
  await missionTitleInput.fill(missionTitle);
  await missionTitleInput.press("Enter");
  await expect(page.getByText(missionTitle, { exact: true })).toBeVisible();

  const openEvidence = page.getByRole("button", { name: "Open Linked Evidence" });
  await openEvidence.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}\/evidence$/u);
  const match = /\/missions\/([0-9a-f-]{36})\/evidence$/u.exec(page.url());
  if (match?.[1] === undefined) throw new Error("Evidence Mission route was not opened.");
  return match[1];
}

async function registerControlledRepository(
  page: Page,
  projectId: string,
  rootPath: string
): Promise<void> {
  const preflight = await page.request.post("/api/v1/local-project-pilot/preflight", {
    data: { rootPath }
  });
  expect(preflight.ok()).toBe(true);
  const preflightBody = (await preflight.json()) as {
    preflight: {
      status: "READY" | "REJECTED";
      reason?: string;
      repository?: { displayName: string };
    };
  };
  expect(
    preflightBody.preflight.status,
    `Controlled repository preflight: ${preflightBody.preflight.reason ?? "ready"}`
  ).toBe("READY");
  expect(preflightBody.preflight.repository?.displayName).toBe(basename(rootPath));
  expect(JSON.stringify(preflightBody)).not.toContain(rootPath);

  const registration = await page.request.put(
    `/api/v1/projects/${projectId}/repository`,
    { data: { rootPath } }
  );
  expect(registration.status()).toBe(201);
}

async function expectBodyToExcludePrivateValues(
  page: Page,
  values: readonly string[]
): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  for (const value of values) expect(bodyText).not.toContain(value);
}

test("renders connected Project selection with keyboard and honest empty state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Know whether an exact software change is ready to release." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Foundation connected" })).toBeVisible();
  await expect(page.getByText("intelliloop-api", { exact: true })).toBeVisible();
  await expect(page.getByText("No Project exists yet", { exact: true })).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);
  await expect(
    page.locator(".route-link--planned").filter({ hasText: "Release Check & Report" })
  ).toHaveAttribute("aria-disabled", "true");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.reload();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "IntelliLoop home" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Projects/ })).toBeFocused();

  await expect(page).toHaveTitle("IntelliLoop - Local Change Overview");
});

test("shows health and workspace failures without cached or placeholder truth", async ({ page }) => {
  await page.route("**/api/v1/health", async (route) => route.abort("failed"));
  await page.route(/\/api\/v1\/projects\?limit=100$/u, async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Foundation unavailable" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "No cached status" })).toBeVisible();
  await expect(page.getByText("Projects unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Project list" })).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);
});

test("completes the persisted path-safe Project workflow by keyboard", async ({ page }) => {
  initializeControlledRepository();
  await page.goto("/");

  const projectName = page.getByLabel("New Project name");
  await projectName.fill("Cancellation contract workspace");
  await projectName.press("Enter");
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/u);
  await expect(page.getByRole("heading", { name: "Cancellation contract workspace" })).toBeVisible();
  await expect(page.getByText("Not Checked", { exact: true })).toBeVisible();

  const missionTitle = page.getByLabel("Work Item title");
  await missionTitle.fill("Reconcile cancellation behavior");
  await missionTitle.press("Enter");
  await expect(page.getByText("Reconcile cancellation behavior", { exact: true })).toBeVisible();

  const projectId = new URL(page.url()).pathname.split("/").at(-1);
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/u);
  await registerControlledRepository(page, projectId as string, repositoryRoot);
  await page.reload();
  await expect(page.getByText("Local Git", { exact: true })).toBeVisible();
  await expect(page.getByText("READ ONLY", { exact: true })).toBeVisible();
  await expect(page.getByText(/server-gated Local Project Pilot/u)).toHaveCount(0);
  await expect(page.getByText("foundation-repository", { exact: true })).toBeVisible();
  await expectBodyToExcludePrivateValues(page, [PRIVATE_REPOSITORY_SENTINEL, repositoryRoot]);

  const capture = page.getByRole("button", { name: "Analyze current commit" });
  await capture.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("DIRTY OBSERVATION", { exact: true })).toBeVisible();
  await expect(page.getByText(/ATTACHED · Captured/u)).toBeVisible();
  await expect(page.getByText("Not a Release Check.", { exact: true })).toBeVisible();
  await expectBodyToExcludePrivateValues(page, [PRIVATE_FILE_SENTINEL]);
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);

  const overviewUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(overviewUrl);
  await expect(page.getByText("Reconcile cancellation behavior", { exact: true })).toBeVisible();
  await expect(page.getByText("Local Git", { exact: true })).toBeVisible();
  await expect(page.getByText("DIRTY OBSERVATION", { exact: true })).toBeVisible();
  await expectBodyToExcludePrivateValues(page, [
    PRIVATE_REPOSITORY_SENTINEL,
    PRIVATE_FILE_SENTINEL,
    repositoryRoot
  ]);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("previews, imports, reloads and renders attributed claim/supersession lineage", async ({ page }) => {
  const missionId = await openFreshEvidenceWorkspace(
    page,
    "Evidence browser workspace",
    "Review cancellation evidence"
  );
  const secret = "IL35_BROWSER_SECRET_SENTINEL_123456789";

  await expect(page.getByText("No Linked Evidence imported", { exact: true })).toBeVisible();
  await expect(page.getByText("No timeline events", { exact: true })).toBeVisible();
  await expect(page.getByText("No structured claims recorded", { exact: true })).toBeVisible();
  await expect(page.getByText("No supersession links recorded", { exact: true })).toBeVisible();

  await page.getByLabel("Evidence format").selectOption("TEXT");
  await page.getByLabel("Logical source locator").fill("manual:e2e/cancellation-v1");
  await page.getByLabel("Source revision (optional)").fill("e2e-v1");
  await page.getByLabel("Epistemic label", { exact: true }).selectOption("FACT");
  await page.getByLabel("Evidence content").fill([
    "Cancellation is allowed before dispatch.",
    "Cancellation is forbidden before dispatch.",
    `password=${secret}`
  ].join("\n"));

  const previewButton = page.getByRole("button", { name: "Preview redaction" });
  await previewButton.focus();
  await page.keyboard.press("Enter");
  const preview = page.locator(".evidence-preview");
  await expect(preview.getByText("REDACTED PREVIEW", { exact: true })).toBeVisible();
  await expect(preview).toContainText("[REDACTED:GENERIC_SECRET_ASSIGNMENT]");
  await expect(preview).not.toContainText(secret);

  const importButton = page.getByRole("button", { name: "Import Linked Evidence" });
  await importButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Import complete.", { exact: true })).toBeVisible();
  await expect(page.getByText("manual:e2e/cancellation-v1", { exact: true })).toBeVisible();
  await expect(page.getByText("e2e-v1", { exact: true })).toBeVisible();
  await expect(page.getByText("EVIDENCE IMPORTED", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(secret);

  const sourcesResponse = await page.request.get(
    `/api/v1/missions/${missionId}/evidence-sources?limit=100`
  );
  expect(sourcesResponse.ok()).toBe(true);
  const sourcesBody = (await sourcesResponse.json()) as {
    evidenceSources: Array<{ evidenceSourceId: string }>;
  };
  const evidenceSourceId = sourcesBody.evidenceSources[0]?.evidenceSourceId;
  if (evidenceSourceId === undefined) throw new Error("Imported source was not returned.");

  const firstClaim = await page.request.post(
    `/api/v1/missions/${missionId}/evidence-sources/${evidenceSourceId}/claims`,
    {
      data: {
        rawText: "Cancellation is allowed before dispatch.",
        subject: "Order Cancellation",
        predicate: "Allowed Before",
        value: true,
        epistemicLabel: "FACT"
      }
    }
  );
  expect(firstClaim.status()).toBe(201);
  const firstClaimBody = (await firstClaim.json()) as { claim: { claimId: string } };

  const successor = await page.request.post(
    `/api/v1/missions/${missionId}/claims/${firstClaimBody.claim.claimId}/successors`,
    {
      data: {
        evidenceSourceId,
        rawText: "Cancellation is forbidden before dispatch.",
        subject: "Order Cancellation",
        predicate: "Allowed Before",
        value: false,
        epistemicLabel: "INFERENCE"
      }
    }
  );
  expect(successor.status()).toBe(201);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Review cancellation evidence" })).toBeVisible();
  await expect(page.locator(".claim-list").getByText("FACT", { exact: true })).toBeVisible();
  await expect(page.locator(".claim-list").getByText("INFERENCE", { exact: true })).toBeVisible();
  await expect(page.locator(".supersession-list").getByText("SUPERSEDES", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(secret);
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test("keeps invalid import honest and exposes malformed lineage as an integrity error", async ({ page }) => {
  const missionId = await openFreshEvidenceWorkspace(
    page,
    "Evidence failure workspace",
    "Reject malformed evidence"
  );

  await page.getByLabel("Evidence format").selectOption("JSON");
  await page.getByLabel("Evidence content").fill('{"rule":1,"rule":2}');
  const previewButton = page.getByRole("button", { name: "Preview redaction" });
  await previewButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("alert").filter({ hasText: "Import not completed" })).toContainText(
    "The local API could not accept that request."
  );
  await expect(page.locator(".evidence-preview")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Import Linked Evidence" })).toBeDisabled();
  await expect(page.getByText("No Linked Evidence imported", { exact: true })).toBeVisible();

  await page.route(
    new RegExp(`/api/v1/missions/${missionId}/evidence-sources\\?limit=100$`, "u"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiVersion: "v1",
          missionId,
          evidenceSources: [{ evidenceSourceId: "forged" }],
          page: { limit: 100, nextCursor: null }
        })
      });
    }
  );
  await page.reload();
  await expect(page.getByText("INTEGRITY ERROR", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence integrity check failed" })).toBeVisible();
  await expect(page.getByText("No partial evidence has been presented as trustworthy.")).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);
});

test("materializes, reloads and verifies an attributed Twin revision by keyboard", async ({ page }) => {
  const missionId = await openFreshEvidenceWorkspace(
    page,
    "Twin browser workspace",
    "Materialize attributed Twin"
  );

  await page.getByLabel("Evidence format").selectOption("TEXT");
  await page.getByLabel("Logical source locator").fill("manual:e2e/twin-requirements");
  await page.getByLabel("Epistemic label", { exact: true }).selectOption("FACT");
  await page.getByLabel("Evidence content").fill("Cancellation requires an attributed audit event.");
  await page.getByRole("button", { name: "Preview redaction" }).click();
  await page.getByRole("button", { name: "Import Linked Evidence" }).click();
  await expect(page.getByText("Import complete.", { exact: true })).toBeVisible();

  const twinLink = page.getByRole("link", { name: /Impact Map/u });
  await twinLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/missions/${missionId}/twin$`, "u"));
  await expect(page.getByRole("heading", { name: "No persisted Impact Map revision exists" })).toBeVisible();

  const materialize = page.getByRole("button", { name: "Materialize current sources" });
  await materialize.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Attributed Impact Map nodes" })).toBeVisible();
  await expect(page.getByText("manual:e2e/twin-requirements", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Selected immutable revision")).toHaveValue("1");
  await expect(page.locator(".twin-summary")).toContainText("Nodes");
  await expect(page.locator(".twin-summary")).toContainText("3");
  await expect(page.locator(".twin-summary")).toContainText("Relationships");
  await expect(page.locator(".twin-summary")).toContainText("2");
  await page.getByText(/Inspect 2 displayed relationships/u).click();
  await expect(page.getByText("SCOPED TO", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);

  const twinUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(twinUrl);
  await expect(page.getByLabel("Selected immutable revision")).toHaveValue("1");
  await expect(page.getByText("manual:e2e/twin-requirements", { exact: true })).toBeVisible();

  const nodesResponse = await page.request.get(
    `/api/v1/missions/${missionId}/twin/revisions/1/nodes?limit=100`
  );
  expect(nodesResponse.ok()).toBe(true);
  const nodesBody = (await nodesResponse.json()) as {
    nodes: Array<{ attribution: { pathCitation: string } }>;
  };
  expect(
    nodesBody.nodes.some(
      (node) => node.attribution.pathCitation === "manual:e2e/twin-requirements"
    )
  ).toBe(true);

  await page.route(
    new RegExp(`/api/v1/missions/${missionId}/twin/revisions/1/nodes\\?limit=100$`, "u"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiVersion: "v1",
          missionId,
          projectionRevision: 1,
          nodes: [{ nodeId: "forged" }],
          page: { limit: 100, nextCursor: null }
        })
      });
    }
  );
  await page.reload();
  await expect(page.getByText("INTEGRITY ERROR", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Impact Map history failed verification" })).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);
});

test("maps a controlled repository into attributed assets and explainable Twin paths", async ({ page }) => {
  initializeControlledRepository(codeMapRepositoryRoot);
  await page.goto("/");

  const projectName = page.getByLabel("New Project name");
  await projectName.fill("Code map browser workspace");
  await projectName.press("Enter");
  const missionTitle = page.getByLabel("Work Item title");
  await missionTitle.fill("Trace cancellation structure");
  await missionTitle.press("Enter");

  const projectId = new URL(page.url()).pathname.split("/").at(-1);
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/u);
  await registerControlledRepository(page, projectId as string, codeMapRepositoryRoot);
  await page.reload();
  await expect(page.getByText("Local Git", { exact: true })).toBeVisible();

  const openTwin = page.getByRole("button", { name: "Open Impact Map" });
  await openTwin.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Repository code map" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No persisted Impact Map revision exists" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No persisted code-map revision exists" })).toBeVisible();

  const runMap = page.getByRole("button", { name: "Map repository and refresh Impact Map" });
  await runMap.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Projection updated.", { exact: true })).toBeVisible();
  await expect(page.getByText("STATIC INFERENCE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attributed software assets" })).toBeVisible();
  await expect(page.getByText("src/cancellation-policy.ts", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explainable dependency paths" })).toBeVisible();
  await expect(page.getByText("DECLARES CONTRACT", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attributed Impact Map nodes" })).toBeVisible();
  await expect(page.getByText("SoftwareAsset", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/no graph is shipped/u)).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel("Selected immutable code-map revision")).toHaveValue("1");
  await expect(page.getByText("src/cancellation-policy.ts", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("SoftwareAsset", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("code-map-repository", { exact: true }).first()).toBeVisible();
  await expectBodyToExcludePrivateValues(page, [
    PRIVATE_REPOSITORY_SENTINEL,
    CODE_MAP_REPOSITORY_SENTINEL,
    codeMapRepositoryRoot
  ]);
});

test("reviews initial conflict, cited impact, explicit correction and stale history by keyboard", async ({ page }) => {
  test.slow();
  initializeControlledRepository(reconciliationRepositoryRoot);
  const missionId = await openFreshEvidenceWorkspace(
    page,
    "Reconciliation judge workspace",
    "Reconcile cancellation contract"
  );

  await page.getByLabel("Evidence format").selectOption("TEXT");
  await page.getByLabel("Logical source locator").fill("manual:e2e/reconciliation-policy");
  await page.getByLabel("Epistemic label", { exact: true }).selectOption("FACT");
  await page.getByLabel("Evidence content").fill([
    "Cancellation policy requires an exact implementation path.",
    "Cancellation is allowed before dispatch.",
    "Cancellation is forbidden before dispatch."
  ].join("\n"));
  await page.getByRole("button", { name: "Preview redaction" }).click();
  await page.getByRole("button", { name: "Import Linked Evidence" }).click();
  await expect(page.getByText("Import complete.", { exact: true })).toBeVisible();

  const missionResponse = await page.request.get(`/api/v1/missions/${missionId}`);
  expect(missionResponse.ok()).toBe(true);
  const missionBody = (await missionResponse.json()) as { mission: { projectId: string } };
  await registerControlledRepository(
    page,
    missionBody.mission.projectId,
    reconciliationRepositoryRoot
  );

  const sourcesResponse = await page.request.get(
    `/api/v1/missions/${missionId}/evidence-sources?limit=100`
  );
  const sourcesBody = (await sourcesResponse.json()) as {
    evidenceSources: Array<{ evidenceSourceId: string }>;
  };
  const evidenceSourceId = sourcesBody.evidenceSources[0]?.evidenceSourceId;
  if (evidenceSourceId === undefined) throw new Error("Reconciliation source was not persisted.");

  const allowedClaim = await page.request.post(
    `/api/v1/missions/${missionId}/evidence-sources/${evidenceSourceId}/claims`,
    {
      data: {
        rawText: "Cancellation is allowed before dispatch.",
        subject: "Order Cancellation",
        predicate: "Allowed Before Dispatch",
        value: true,
        epistemicLabel: "FACT"
      }
    }
  );
  expect(allowedClaim.status()).toBe(201);
  const allowedBody = (await allowedClaim.json()) as { claim: { claimId: string } };
  const forbiddenClaim = await page.request.post(
    `/api/v1/missions/${missionId}/evidence-sources/${evidenceSourceId}/claims`,
    {
      data: {
        rawText: "Cancellation is forbidden before dispatch.",
        subject: "Order Cancellation",
        predicate: "Allowed Before Dispatch",
        value: false,
        epistemicLabel: "FACT"
      }
    }
  );
  expect(forbiddenClaim.status()).toBe(201);

  await page.getByRole("link", { name: /Impact Map/u }).click();
  await page.getByRole("button", { name: "Map repository and refresh Impact Map" }).click();
  await expect(page.getByText("Projection updated.", { exact: true })).toBeVisible();

  await page.route(
    new RegExp(`/api/v1/missions/${missionId}/reconciliation/revisions\\?limit=100$`, "u"),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.continue();
    },
    { times: 1 }
  );
  const openReconciliation = page.getByRole("button", { name: "Open Resolve Conflicts" });
  await openReconciliation.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Reading conflict-resolution history" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/missions/${missionId}/reconciliation$`, "u"));
  await expect(page.getByRole("heading", { name: "Run deterministic conflict analysis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No conflict-resolution revision exists" })).toBeVisible();

  const twinResponse = await page.request.get(
    `/api/v1/missions/${missionId}/twin/revisions?limit=100`
  );
  const twinBody = (await twinResponse.json()) as {
    revisions: Array<{ revision: number; codeMapBinding?: { revision: number } }>;
  };
  const twinRevision = twinBody.revisions[0];
  const codeMapRevision = twinRevision?.codeMapBinding?.revision;
  if (twinRevision === undefined || codeMapRevision === undefined) {
    throw new Error("Compatible Twin/code-map binding was not returned.");
  }
  const nodesResponse = await page.request.get(
    `/api/v1/missions/${missionId}/twin/revisions/${twinRevision.revision}/nodes?limit=100`
  );
  const nodesBody = (await nodesResponse.json()) as {
    nodes: Array<{
      nodeId: string;
      nodeType: string;
      source: { sourceId: string };
    }>;
  };
  const assetsResponse = await page.request.get(
    `/api/v1/missions/${missionId}/code-map/revisions/${codeMapRevision}/assets?limit=100`
  );
  const assetsBody = (await assetsResponse.json()) as {
    assets: Array<{ assetId: string }>;
  };
  const asset = assetsBody.assets[0];
  const assetNode = asset === undefined
    ? undefined
    : nodesBody.nodes.find(
        (node) => node.nodeType === "SoftwareAsset" && node.source.sourceId === asset.assetId
      );
  if (asset === undefined || assetNode === undefined) {
    throw new Error("Citable SoftwareAsset root was not returned.");
  }

  const impactToggle = page.getByLabel("Declare one exact root-to-critical-asset obligation");
  await impactToggle.focus();
  await page.keyboard.press("Space");
  await page.getByLabel("Attributed root").selectOption(assetNode.nodeId);
  await page.getByLabel("Critical code asset").selectOption(asset.assetId);
  const run = page.getByRole("button", { name: "Run deterministic conflict analysis" });
  await run.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Conflict analysis recorded.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conflicting active claims" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "impact/requirement-1" })).toBeVisible();
  await expect(page.getByText("The declared root is the critical asset; no graph hop is required.")).toBeVisible();
  await expect(page.getByLabel("Selected immutable conflict-resolution revision")).toHaveValue("1");
  await expect(page.getByText("OPEN", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);

  const successor = await page.request.post(
    `/api/v1/missions/${missionId}/claims/${allowedBody.claim.claimId}/successors`,
    {
      data: {
        evidenceSourceId,
        rawText: "Cancellation is forbidden before dispatch.",
        subject: "Order Cancellation",
        predicate: "Allowed Before Dispatch",
        value: false,
        epistemicLabel: "FACT"
      }
    }
  );
  expect(successor.status()).toBe(201);

  await page.getByRole("button", { name: "Impact Map", exact: true }).click();
  await page.getByRole("button", { name: "Materialize current sources" }).click();
  await expect(page.getByText(/Impact Map revision 2 materialized from persisted sources/u)).toBeVisible();
  await page.getByRole("button", { name: "Open Resolve Conflicts" }).click();
  await expect(page.getByRole("heading", { name: "Run deterministic conflict analysis" })).toBeVisible();

  const latestTwinResponse = await page.request.get(
    `/api/v1/missions/${missionId}/twin/revisions?limit=100`
  );
  const latestTwinBody = (await latestTwinResponse.json()) as {
    revisions: Array<{ revision: number }>;
  };
  const latestRevision = latestTwinBody.revisions[0]?.revision;
  if (latestRevision === undefined) throw new Error("Latest Twin revision was not returned.");
  const latestNodesResponse = await page.request.get(
    `/api/v1/missions/${missionId}/twin/revisions/${latestRevision}/nodes?limit=100`
  );
  const latestNodesBody = (await latestNodesResponse.json()) as {
    nodes: Array<{ nodeId: string; nodeType: string; source: { sourceId: string } }>;
  };
  const latestAssetNode = latestNodesBody.nodes.find(
    (node) => node.nodeType === "SoftwareAsset" && node.source.sourceId === asset.assetId
  );
  if (latestAssetNode === undefined) throw new Error("Latest citable asset node was not returned.");

  await page.getByLabel("Declare one exact root-to-critical-asset obligation").check();
  await page.getByLabel("Attributed root").selectOption(latestAssetNode.nodeId);
  await page.getByLabel("Critical code asset").selectOption(asset.assetId);
  await page.getByRole("button", { name: "Run deterministic conflict analysis" }).click();

  await expect(page.getByLabel("Selected immutable conflict-resolution revision")).toHaveValue("2");
  await expect(page.getByRole("heading", { name: "Earlier assessment became stale" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conflicting active claims" })).toHaveCount(0);

  await page.getByLabel("Selected immutable conflict-resolution revision").selectOption("1");
  await expect(page.getByRole("heading", { name: "Conflicting active claims" })).toBeVisible();
  await page.getByLabel("Selected immutable conflict-resolution revision").selectOption("2");
  await expect(page.getByRole("heading", { name: "Earlier assessment became stale" })).toBeVisible();
  await expect(
    page.locator(".reconciliation-workspace").getByRole("button", { name: /dismiss|resolve|approve/iu })
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  await page.route(
    new RegExp(`/api/v1/missions/${missionId}/reconciliation/revisions/2/findings\\?limit=100$`, "u"),
    async (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    { times: 1 }
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Resolve Conflicts unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Resolve Conflicts" })).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Retry Resolve Conflicts" }).click();
  await expect(page.getByRole("heading", { name: "Earlier assessment became stale" })).toBeVisible();
  const openExplanation = page.getByRole("button", { name: "Open cited explanation" });
  await openExplanation.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/missions/${missionId}/explanation$`, "u"));
  await expect(page.getByRole("heading", { name: "Ask the evidence, not an authority." })).toBeVisible();
  await expect(page.getByText("Provider calls disabled", { exact: true })).toBeVisible();

  const citedEndpoint = `/api/v1/missions/${missionId}/cited-explanations`;
  const citedApiResponse = await page.request.post(citedEndpoint, {
    data: { question: "Can we release?" }
  });
  expect(citedApiResponse.status()).toBe(200);
  const citedBody = (await citedApiResponse.json()) as {
    execution: {
      providerOutcome: string;
      failureCode?: string;
    };
    offlineExplanation: {
      answer: { text: string; citationIds: string[] };
    };
    citationDetails: Array<{ citationId: string }>;
  };
  expect(citedBody.execution).toMatchObject({
    providerOutcome: "DISABLED",
    failureCode: "PROVIDER_DISABLED"
  });

  const generateAnswer = page.getByRole("button", { name: "Generate cited answer" });
  await generateAnswer.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Cited answer from the exact persisted assessment" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Exact redacted provider pack" })).toBeVisible();
  await expect(page.getByText("Outbound disclosure / NOT SENT", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Used citation registry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthetic retail edge cases" })).toBeVisible();
  await expect(page.getByText("SYNTHETIC", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("ADVISORY ONLY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NOT EVIDENCE", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("PROVIDER DISABLED", { exact: true })).toBeVisible();
  await expect(page.locator(".statement-citations a").first()).toHaveAttribute("href", /^#citation-/u);
  await expectBodyToExcludePrivateValues(page, [
    RECONCILIATION_REPOSITORY_SENTINEL,
    reconciliationRepositoryRoot
  ]);
  await expect(page.getByText("READY", { exact: true })).toHaveCount(0);

  const providerFailureBody = structuredClone(citedBody);
  providerFailureBody.execution.providerOutcome = "ADVISORY_UNAVAILABLE";
  providerFailureBody.execution.failureCode = "PROVIDER_TRANSPORT_FAILED";
  await page.route(
    new RegExp(`${citedEndpoint}$`, "u"),
    async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(providerFailureBody)
    }),
    { times: 1 }
  );
  await page.getByRole("button", { name: "Generate cited answer" }).click();
  await expect(page.getByText("PROVIDER TRANSPORT FAILED", { exact: true })).toBeVisible();
  await expect(page.locator(".primary-answer .answer-copy")).toContainText(
    citedBody.offlineExplanation.answer.text
  );

  const unknownCitationBody = structuredClone(citedBody);
  unknownCitationBody.offlineExplanation.answer.citationIds = [
    `cite:${"f".repeat(64)}`
  ];
  await page.route(
    new RegExp(`${citedEndpoint}$`, "u"),
    async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(unknownCitationBody)
    }),
    { times: 1 }
  );
  await page.getByRole("button", { name: "Generate cited answer" }).click();
  await expect(page.getByRole("heading", { name: "Cited answer not rendered" })).toBeVisible();
  await expect(page.getByText(/failed strict citation validation/u)).toBeVisible();
  await expect(page.getByText(citedBody.offlineExplanation.answer.text, { exact: true })).toHaveCount(0);
});

test("renders server-owned BLOCKED, READY and STALE readiness with an unsigned Passport", async ({ page }) => {
  const project = await page.request.post("/api/v1/projects", {
    data: { name: "IL-7.4 browser state matrix" }
  });
  expect(project.status()).toBe(201);
  const projectId = ((await project.json()) as { project: { projectId: string } }).project.projectId;
  const mission = await page.request.post(`/api/v1/projects/${projectId}/missions`, {
    data: { title: "Server-owned readiness states" }
  });
  expect(mission.status()).toBe(201);
  const missionId = ((await mission.json()) as { mission: { missionId: string } }).mission.missionId;
  const digest = (character: string): string => `sha256:${character.repeat(64)}`;
  const obligationIds = [
    "INTEGRITY_VALID", "SCOPE_EXACT", "SNAPSHOT_CURRENT", "CRITICAL_FINDINGS_CLEAR",
    "REQUIRED_VALIDATIONS_PASS", "EXPLICIT_HUMAN_REVIEW", "DEPENDENCIES_CURRENT",
    "CANONICAL_INPUTS_ONLY", "INPUTS_PERSISTED"
  ];
  const categories = [
    "INTEGRITY", "SCOPE", "SNAPSHOT", "FINDINGS", "VALIDATIONS", "REVIEW",
    "FRESHNESS", "AUTHORITY", "PERSISTENCE"
  ];
  const assessmentId = "33333333-3333-4333-8333-333333333333";
  const passportId = "44444444-4444-4444-8444-444444444444";
  const snapshotId = "55555555-5555-4555-8555-555555555555";
  let currentStatus: "BLOCKED" | "READY" | "STALE" = "BLOCKED";

  function responseFixture() {
    const blocked = currentStatus === "BLOCKED";
    const evaluatedStatus = currentStatus === "STALE" ? "READY" : currentStatus;
    const staleReasons = currentStatus === "STALE" ? ["SNAPSHOT_CHANGED"] : [];
    const obligations = obligationIds.map((obligationId, index) => ({
      obligationId,
      category: categories[index],
      requirement: `Controlled browser obligation ${index + 1}.`,
      status: blocked && obligationId === "EXPLICIT_HUMAN_REVIEW" ? "UNSATISFIED" : "SATISFIED",
      blockerCodes: blocked && obligationId === "EXPLICIT_HUMAN_REVIEW" ? ["REVIEW_MISSING"] : []
    }));
    const blockers = blocked
      ? [{ code: "REVIEW_MISSING", obligationId: "EXPLICIT_HUMAN_REVIEW" }]
      : [];
    const review = blocked ? { status: "MISSING" } : {
      status: "RECORDED",
      reviewId: "66666666-6666-4666-8666-666666666666",
      actorKind: "HUMAN",
      projectId,
      missionId,
      snapshotId,
      reconciliationResultDigest: digest("3"),
      reviewDigest: digest("a"),
      persistence: "PERSISTED"
    };
    const assessment = {
      assessmentId,
      revision: 1,
      recordedAtUtc: "2026-08-06T10:00:00.000Z",
      evaluatedStatus,
      currentStatus,
      staleReasons,
      assessmentDigest: digest("5"),
      stateDigest: digest("6"),
      version: "release-assessment.v1",
      projectId,
      missionId,
      inputFingerprint: {
        evaluatedDigest: digest("1"),
        currentDigest: currentStatus === "STALE" ? digest("f") : digest("1")
      },
      snapshot: { targetSnapshotId: snapshotId, currentSnapshotIdAtAssessment: snapshotId },
      reconciliation: { revision: 1, revisionKey: digest("2"), resultDigest: digest("3") },
      rule: { policyVersion: "readiness.v1", policyDigest: digest("4") },
      obligations,
      blockers,
      findings: { CONFLICT: 0, AMBIGUOUS: 0, MISSING: 0, STALE: 0, IMPACT_GAP: 0, total: 0 },
      validations: { requirements: [], evidence: [] },
      review,
      authority: {
        assessmentPersistence: "PERSISTED_IMMUTABLE",
        readinessStatusAuthority: "DETERMINISTIC_ASSESSMENT",
        currentStateDerivation: "EXACT_DEPENDENCY_COMPARISON",
        storedAssessmentChanged: false,
        releaseApproval: false,
        releasePassport: false,
        deploymentAuthority: false,
        aiAuthority: "NONE"
      }
    };
    const passport = {
      passportId,
      assessmentId,
      assessmentRevision: 1,
      recordedAtUtc: "2026-08-06T10:01:00.000Z",
      statusAtProjection: evaluatedStatus,
      currentStatus,
      staleReasons,
      passportDigest: digest("8"),
      stateDigest: digest("9"),
      version: "release-passport.v1",
      projectionVersion: "release-passport-projection.v1",
      passportKey: digest("7"),
      projectId,
      missionId,
      assessment: {
        assessmentId,
        revision: 1,
        assessmentDigest: digest("5"),
        inputFingerprintDigest: digest("1")
      },
      snapshot: { targetSnapshotId: snapshotId, currentSnapshotId: snapshotId },
      rule: { policyVersion: "readiness.v1", policyDigest: digest("4") },
      evidenceDigest: digest("1"),
      obligations,
      blockers,
      findings: assessment.findings,
      validations: assessment.validations,
      review,
      citations: [
        { kind: "ASSESSMENT", referenceId: assessmentId, referenceDigest: digest("5") },
        { kind: "RECONCILIATION", referenceId: digest("2"), referenceRevision: 1, referenceDigest: digest("3") },
        { kind: "TARGET_SNAPSHOT", referenceId: snapshotId },
        { kind: "CURRENT_SNAPSHOT", referenceId: snapshotId }
      ],
      authority: {
        source: "ONE_PERSISTED_RELEASE_ASSESSMENT",
        projection: "REPRODUCED_NOT_RECOMPUTED",
        historicalRecord: "IMMUTABLE",
        stateAssociation: "ASSESSMENT_STATE_REFERENCE",
        passportChanged: false,
        readinessRecomputed: false,
        signed: false,
        releaseApproval: false,
        deploymentAuthority: false,
        aiAuthority: "NONE"
      }
    };
    return {
      assessment,
      passport,
      assessmentSummary: {
        assessmentId, revision: 1, recordedAtUtc: assessment.recordedAtUtc,
        evaluatedStatus, currentStatus, staleReasons,
        assessmentDigest: assessment.assessmentDigest, stateDigest: assessment.stateDigest
      },
      passportSummary: {
        passportId, assessmentId, assessmentRevision: 1, recordedAtUtc: passport.recordedAtUtc,
        statusAtProjection: evaluatedStatus, currentStatus, staleReasons,
        passportDigest: passport.passportDigest, stateDigest: passport.stateDigest
      }
    };
  }

  await page.route(new RegExp(`/api/v1/missions/${missionId}/readiness/`, "u"), async (route) => {
    const fixture = responseFixture();
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown;
    if (path.endsWith("/assessments")) {
      body = {
        apiVersion: "v1", missionId, assessments: [fixture.assessmentSummary],
        page: { limit: 100, nextCursor: null }
      };
    } else if (path.endsWith("/assessments/1")) {
      body = { apiVersion: "v1", assessment: fixture.assessment };
    } else if (path.endsWith("/passports")) {
      body = {
        apiVersion: "v1", missionId, passports: [fixture.passportSummary],
        page: { limit: 100, nextCursor: null }
      };
    } else if (path.endsWith("/passports/1/export")) {
      body = {
        apiVersion: "v1",
        exportVersion: "release-passport-export.v1",
        contentClassification: "CONTROLLED_STRUCTURAL_METADATA",
        passport: fixture.passport,
        safety: {
          containsSourceBodies: false,
          containsAbsolutePaths: false,
          containsCredentials: false,
          signed: false,
          releaseApproval: false,
          deploymentAuthority: false
        },
        warnings: ["UNSIGNED_LOCAL_RECORD", "NOT_RELEASE_APPROVAL", "VERIFY_CURRENT_STATUS_BEFORE_USE"]
      };
    } else if (path.endsWith("/passports/1")) {
      body = { apiVersion: "v1", passport: fixture.passport };
    } else {
      await route.abort("failed");
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto(`/missions/${missionId}/passport`);
  for (const status of ["BLOCKED", "READY", "STALE"] as const) {
    currentStatus = status;
    if (status !== "BLOCKED") await page.reload();
    await expect(page.locator(`[data-readiness-status="${status}"]`)).toBeVisible();
    await expect(page.getByRole("heading", { name: { BLOCKED: "Not Ready", READY: "Ready", STALE: "Recheck Needed" }[status], exact: true })).toBeVisible();
    await expect(page.locator(".obligation-list > li")).toHaveCount(9);
    await expect(page.getByRole("heading", { name: "Release Evidence Report" })).toBeVisible();
    await expect(page.getByText("UNSIGNED / NOT APPROVAL", { exact: true })).toBeVisible();
  }
  await expect(page.getByText("snapshot changed", { exact: true })).toBeVisible();
  await expect(page.getByText(/No provider call/u)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("releaseApproval: true");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download structural JSON" }).click();
  expect((await download).suggestedFilename()).toBe("intelliloop-release-evidence-report-r1.json");
});
