import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const temporaryRoot = resolve(tmpdir());
const execFileAsync = promisify(execFile);

async function createLocalPilotFixture(root, symbol) {
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(
    join(root, "src", "contract.ts"),
    `export interface ${symbol} { readonly value: string; }\n`,
    "utf8"
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "intelliloop-e2e-local-pilot", private: true }),
    "utf8"
  );
  await writeFile(
    join(root, "src", "cancellation-policy.ts"),
    "export interface CancellationPolicy { timeoutSeconds: number }\n",
    "utf8"
  );
  await writeFile(
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
  await writeFile(
    join(root, "src", "cancellation-route.test.ts"),
    'import { registerCancellation } from "./cancellation-route.js";\nvoid registerCancellation;\n',
    "utf8"
  );
  await execFileAsync("git", ["init", "-b", "main"], { cwd: root });
  await execFileAsync("git", ["add", "--all"], { cwd: root });
  await execFileAsync("git", [
    "-c", "user.name=IntelliLoop Fixture", "-c",
    "user.email=fixture@invalid.example", "commit", "-m", "controlled fixture"
  ], { cwd: root });
  return (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
}

function configuredPort(name) {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  if (!/^[1-9][0-9]{0,4}$/u.test(raw)) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port > 65_535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return port;
}

async function availableLoopbackPort(excluded = new Set()) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await new Promise((resolvePort, reject) => {
      const server = createServer();
      server.unref();
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address === null || typeof address === "string") {
          server.close(() => reject(new Error("Loopback port allocation failed.")));
          return;
        }
        server.close((error) => {
          if (error === undefined) resolvePort(address.port);
          else reject(error);
        });
      });
    });
    if (!excluded.has(port)) return port;
  }
  throw new Error("Distinct loopback ports could not be allocated.");
}

async function removeGeneratedE2eDirectories() {
  const entries = await readdir(temporaryRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("intelliloop-e2e-")) {
      continue;
    }
    const target = resolve(temporaryRoot, entry.name);
    const targetRelativeToRoot = relative(temporaryRoot, target);
    if (
      targetRelativeToRoot.startsWith("..") ||
      targetRelativeToRoot.length === 0
    ) {
      continue;
    }
    await rm(target, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 100
    });
  }
}

await removeGeneratedE2eDirectories();
const dataDirectory = await mkdtemp(join(temporaryRoot, "intelliloop-e2e-"));
const localPilotRepository = join(dataDirectory, "local-pilot-repository");
const outsidePilotRepository = join(dataDirectory, "outside-pilot-repository");
const foundationRepository = join(dataDirectory, "INTELLILOOP_PRIVATE_REPOSITORY_SENTINEL");
const codeMapRepository = join(dataDirectory, "INTELLILOOP_CODE_MAP_REPOSITORY_SENTINEL");
const reconciliationRepository = join(dataDirectory, "INTELLILOOP_RECONCILIATION_REPOSITORY_SENTINEL");
const localPilotCommit = await createLocalPilotFixture(localPilotRepository, "CommittedPilotContract");
await createLocalPilotFixture(outsidePilotRepository, "OutsidePilotContract");
await createLocalPilotFixture(foundationRepository, "FoundationContract");
await createLocalPilotFixture(codeMapRepository, "CodeMapContract");
await createLocalPilotFixture(reconciliationRepository, "ReconciliationContract");
await writeFile(
  join(localPilotRepository, "src", "contract.ts"),
  "export interface DirtyOnlyPilotContract { readonly excluded: true; }\n",
  "utf8"
);
const playwrightCli = resolve("node_modules", "@playwright", "test", "cli.js");
const playwrightArguments = process.argv.slice(2);
const configuredWebPort = configuredPort("INTELLILOOP_E2E_WEB_PORT");
const configuredApiPort = configuredPort("INTELLILOOP_E2E_API_PORT");
const webPort = configuredWebPort ?? await availableLoopbackPort();
const apiPort =
  configuredApiPort ?? await availableLoopbackPort(new Set([webPort]));
if (webPort === apiPort) {
  throw new Error("E2E web and API ports must be distinct.");
}

let exitCode = 1;
try {
  exitCode = await new Promise((resolveExitCode, reject) => {
    const child = spawn(process.execPath, [playwrightCli, "test", ...playwrightArguments], {
      stdio: "inherit",
      env: {
        ...process.env,
        INTELLILOOP_E2E_DATA_DIRECTORY: dataDirectory,
        INTELLILOOP_E2E_WEB_PORT: String(webPort),
        INTELLILOOP_E2E_API_PORT: String(apiPort),
        INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED: "true",
        INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS: [
          localPilotRepository,
          foundationRepository,
          codeMapRepository,
          reconciliationRepository
        ].join(delimiter),
        INTELLILOOP_E2E_LOCAL_REPOSITORY: localPilotRepository,
        INTELLILOOP_E2E_OUTSIDE_REPOSITORY: outsidePilotRepository,
        INTELLILOOP_E2E_LOCAL_COMMIT: localPilotCommit
      }
    });
    child.once("error", reject);
    child.once("close", (code) => resolveExitCode(code ?? 1));
  });
} finally {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  await removeGeneratedE2eDirectories();
}

process.exitCode = exitCode;
