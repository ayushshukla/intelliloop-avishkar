import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configured = process.env.INTELLILOOP_DEMO_DATA_DIRECTORY?.trim();
const dataDirectory = configured || join(tmpdir(), "intelliloop-avishkar-controlled-demo-schema14");

if (!isAbsolute(dataDirectory) || dataDirectory === parse(dataDirectory).root) {
  throw new Error("INTELLILOOP_DEMO_DATA_DIRECTORY must be a non-root absolute directory.");
}

console.log("Starting IntelliLoop with an isolated controlled-demo data directory (schema 14).\nStop both local services with Ctrl+C.");

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const args = npmCli ? [npmCli, "run", "dev"] : ["run", "dev"];

const child = spawn(command, args, {
  cwd: ROOT,
  env: {
    ...process.env,
    INTELLILOOP_DATA_DIRECTORY: dataDirectory
  },
  shell: false,
  stdio: "inherit",
  windowsHide: true
});

child.on("error", () => {
  console.error("The isolated demo process could not be started.");
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
