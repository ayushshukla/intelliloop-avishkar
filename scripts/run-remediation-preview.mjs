import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
const command = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? "npm.cmd"
    : "npm";
const args = npmCli ? [npmCli, "run", "dev"] : ["run", "dev"];

console.log(
  "Starting IntelliLoop with the optional non-applying Guarded Remediation Preview enabled.\nStop both local services with Ctrl+C."
);

const child = spawn(command, args, {
  cwd: ROOT,
  env: {
    ...process.env,
    INTELLILOOP_DATA_DIRECTORY: join(
      tmpdir(),
      "intelliloop-remediation-preview-schema14"
    ),
    INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "true",
    VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW: "true"
  },
  shell: false,
  stdio: "inherit",
  windowsHide: true
});

child.on("error", () => {
  console.error("The Guarded Remediation Preview process could not be started.");
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
