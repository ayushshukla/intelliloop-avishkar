import { defineConfig } from "@playwright/test";

const e2eDataDirectory = process.env.INTELLILOOP_E2E_DATA_DIRECTORY;
if (e2eDataDirectory === undefined) {
  throw new Error("Use the repository test:e2e command to run Playwright.");
}
const e2eWebPort = process.env.INTELLILOOP_E2E_WEB_PORT ?? "4173";
const e2eApiPort = process.env.INTELLILOOP_E2E_API_PORT ?? "3100";
const localPilotRepository = process.env.INTELLILOOP_E2E_LOCAL_REPOSITORY;
if (localPilotRepository === undefined) {
  throw new Error("The controlled Local Project fixture is required.");
}
const allowedPilotRepositories = process.env.INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS;
if (allowedPilotRepositories === undefined) {
  throw new Error("The controlled Local Project allowlist is required.");
}

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  expect: { timeout: 30_000 },
  use: {
    baseURL: `http://127.0.0.1:${e2eWebPort}`,
    viewport: { width: 1366, height: 768 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" }
    }
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: `http://127.0.0.1:${e2eWebPort}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      INTELLILOOP_DATA_DIRECTORY: e2eDataDirectory,
      INTELLILOOP_API_PORT: e2eApiPort,
      INTELLILOOP_E2E_API_PORT: e2eApiPort,
      INTELLILOOP_E2E_WEB_PORT: e2eWebPort,
      INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED: "true",
      INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS: allowedPilotRepositories
    },
    stdout: "pipe",
    stderr: "pipe"
  }
});
