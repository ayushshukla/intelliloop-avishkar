import { spawn } from "node:child_process";

export const GIT_READ_OPERATIONS = [
  "SYMBOLIC_HEAD",
  "HEAD_COMMIT",
  "COMMIT_TIME",
  "STATUS"
] as const;

export type GitReadOperation = (typeof GIT_READ_OPERATIONS)[number];

export type GitCommandErrorCode =
  | "GIT_EXECUTABLE_UNAVAILABLE"
  | "GIT_COMMAND_TIMEOUT"
  | "GIT_COMMAND_OUTPUT_LIMIT"
  | "GIT_COMMAND_FAILED";

const ERROR_MESSAGES: Readonly<Record<GitCommandErrorCode, string>> =
  Object.freeze({
    GIT_EXECUTABLE_UNAVAILABLE: "Git executable is unavailable.",
    GIT_COMMAND_TIMEOUT: "Git read command exceeded its time limit.",
    GIT_COMMAND_OUTPUT_LIMIT: "Git read command exceeded its output limit.",
    GIT_COMMAND_FAILED: "Git read command could not be completed."
  });

export class GitCommandError extends Error {
  readonly code: GitCommandErrorCode;

  constructor(code: GitCommandErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "GitCommandError";
    this.code = code;
  }
}

export interface GitCommandResult {
  readonly exitCode: number;
  readonly stdout: Buffer;
}

export interface GitReadCommandRunner {
  run(operation: GitReadOperation, repositoryRoot: string): Promise<GitCommandResult>;
}

export interface FixedGitCommandRunnerOptions {
  readonly timeoutMs?: number;
  readonly maximumOutputBytes?: number;
}

// Process creation can cross five seconds on a loaded Windows host. This
// remains a strict per-command fail-closed bound; it is not a retry budget.
export const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15_000;

const OPERATION_ARGUMENTS: Readonly<Record<GitReadOperation, readonly string[]>> =
  Object.freeze({
    SYMBOLIC_HEAD: Object.freeze([
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "symbolic-ref",
      "--quiet",
      "--short",
      "HEAD"
    ]),
    HEAD_COMMIT: Object.freeze([
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "rev-parse",
      "--verify",
      "HEAD"
    ]),
    COMMIT_TIME: Object.freeze([
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "show",
      "-s",
      "--format=%cI",
      "HEAD"
    ]),
    STATUS: Object.freeze([
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--ignore-submodules=all",
      "--no-renames"
    ])
  });

function systemErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "";
}

function safeGitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (name.toUpperCase().startsWith("GIT_")) delete environment[name];
  }
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_GLOBAL =
    process.platform === "win32" ? "NUL" : "/dev/null";
  environment.LC_ALL = "C";
  return environment;
}

export class FixedGitCommandRunner implements GitReadCommandRunner {
  readonly #timeoutMs: number;
  readonly #maximumOutputBytes: number;

  constructor(options: FixedGitCommandRunnerOptions = {}) {
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_GIT_COMMAND_TIMEOUT_MS;
    this.#maximumOutputBytes = options.maximumOutputBytes ?? 1_048_576;
    if (
      !Number.isSafeInteger(this.#timeoutMs) ||
      this.#timeoutMs < 1 ||
      this.#timeoutMs > 60_000 ||
      !Number.isSafeInteger(this.#maximumOutputBytes) ||
      this.#maximumOutputBytes < 1 ||
      this.#maximumOutputBytes > 16_777_216
    ) {
      throw new TypeError("Safe Git runner limits are required.");
    }
  }

  async run(
    operation: GitReadOperation,
    repositoryRoot: string
  ): Promise<GitCommandResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let outputBytes = 0;
      const stdoutChunks: Buffer[] = [];
      const child = spawn("git", OPERATION_ARGUMENTS[operation], {
        cwd: repositoryRoot,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: safeGitEnvironment()
      });

      const finish = (
        error: GitCommandError | undefined,
        result?: GitCommandResult
      ): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error !== undefined) {
          reject(error);
        } else if (result !== undefined) {
          resolve(result);
        }
      };

      const acceptChunk = (chunk: Buffer, retain: boolean): void => {
        if (settled) return;
        outputBytes += chunk.length;
        if (outputBytes > this.#maximumOutputBytes) {
          child.kill();
          finish(new GitCommandError("GIT_COMMAND_OUTPUT_LIMIT"));
          return;
        }
        if (retain) stdoutChunks.push(chunk);
      };

      child.stdout.on("data", (chunk: Buffer) => acceptChunk(chunk, true));
      child.stderr.on("data", (chunk: Buffer) => acceptChunk(chunk, false));
      child.once("error", (error) => {
        finish(
          new GitCommandError(
            systemErrorCode(error) === "ENOENT"
              ? "GIT_EXECUTABLE_UNAVAILABLE"
              : "GIT_COMMAND_FAILED"
          )
        );
      });
      child.once("close", (exitCode) => {
        if (exitCode === null) {
          finish(new GitCommandError("GIT_COMMAND_FAILED"));
          return;
        }
        finish(undefined, {
          exitCode,
          stdout: Buffer.concat(stdoutChunks)
        });
      });

      const timeout = setTimeout(() => {
        child.kill();
        finish(new GitCommandError("GIT_COMMAND_TIMEOUT"));
      }, this.#timeoutMs);
      timeout.unref();
    });
  }
}
