import { lstatSync, realpathSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { TextDecoder } from "node:util";

import type {
  LocalProjectPilotCapabilityResponse,
  LocalProjectPreflightFailureReason,
  LocalProjectPreflightResponse,
  LocalProjectSafeRepository
} from "@intelliloop/contracts";
import { LOCAL_PROJECT_PILOT_API_VERSION } from "@intelliloop/contracts";
import { parseStableId, type ProjectId } from "@intelliloop/domain";

import type { SqliteConnection } from "../database/database-lifecycle.js";
import {
  FixedGitCommandRunner,
  GitCommandError,
  type GitCommandResult,
  type GitReadCommandRunner
} from "./git-command-runner.js";
import { parsePorcelainStatus } from "./git-snapshot-service.js";
import {
  RepositoryRegistrationError,
  canonicalRepositoryRoot,
  type RegisteredRepository,
  type RepositoryRegistrationService
} from "./repository-registration.js";

export const LOCAL_PROJECT_PILOT_ERROR_CODES = [
  "LOCAL_PROJECT_FEATURE_DISABLED",
  "LOCAL_PROJECT_CONFIGURATION_REQUIRED",
  "LOCAL_PROJECT_PREFLIGHT_REJECTED",
  "LOCAL_PROJECT_CONTEXT_NOT_FOUND"
] as const;

export type LocalProjectPilotErrorCode =
  (typeof LOCAL_PROJECT_PILOT_ERROR_CODES)[number];

export class LocalProjectPilotError extends Error {
  readonly code: LocalProjectPilotErrorCode;

  constructor(code: LocalProjectPilotErrorCode) {
    super("Local Project Pilot request could not be completed.");
    this.name = "LocalProjectPilotError";
    this.code = code;
  }
}

export interface LocalProjectPilotConfiguration {
  readonly enabled: boolean;
  readonly allowedRoots: readonly string[];
}

export interface LocalProjectPilotDependencies {
  readonly runner: GitReadCommandRunner;
}

interface SafePreflight {
  readonly canonicalRoot: string;
  readonly repository: LocalProjectSafeRepository;
}

type RejectedPreflight = Extract<
  LocalProjectPreflightResponse,
  { readonly preflight: { readonly status: "REJECTED" } }
>;

const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const SAFE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,254}$/u;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function comparisonPath(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function samePath(left: string, right: string): boolean {
  return comparisonPath(left) === comparisonPath(right);
}

function containsPath(root: string, candidate: string): boolean {
  if (samePath(root, candidate)) return true;
  const relation = relative(root, candidate);
  return relation !== "" && !relation.startsWith("..") && !isAbsolute(relation);
}

function hasTraversal(value: string): boolean {
  return value.split(/[\\/]+/u).some((segment) => segment === "..");
}

function isNetworkOrDevicePath(value: string): boolean {
  return /^(?:\\\\|\/\/|\\\\[?.]\\)/u.test(value);
}

function decodedLine(result: GitCommandResult): string | undefined {
  if (result.exitCode !== 0) return undefined;
  let value: string;
  try {
    value = UTF8_DECODER.decode(result.stdout).replace(/\r?\n$/u, "");
  } catch {
    return undefined;
  }
  return value.length >= 1 && value.length <= 255 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : undefined;
}

function rejection(
  reason: LocalProjectPreflightFailureReason,
  recovery: string
): RejectedPreflight {
  return Object.freeze({
    apiVersion: LOCAL_PROJECT_PILOT_API_VERSION,
    preflight: Object.freeze({ status: "REJECTED" as const, reason, recovery })
  });
}

function registrationFailureReason(
  error: RepositoryRegistrationError
): LocalProjectPreflightFailureReason {
  switch (error.code) {
    case "REPOSITORY_PATH_NOT_FOUND":
      return "REPOSITORY_NOT_FOUND";
    case "REPOSITORY_NOT_GIT":
      return "REPOSITORY_NOT_GIT";
    case "REPOSITORY_SYMLINK_REJECTED":
      return "UNSAFE_LINK";
    default:
      return "PATH_INVALID";
  }
}

function gitFailureReason(error: unknown): LocalProjectPreflightFailureReason {
  if (error instanceof GitCommandError) {
    if (error.code === "GIT_COMMAND_TIMEOUT") return "GIT_TIMEOUT";
    if (error.code === "GIT_EXECUTABLE_UNAVAILABLE") return "GIT_UNAVAILABLE";
  }
  return "INTEGRITY_CHECK_FAILED";
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" ? error.code : "";
}

function canonicalCandidateDirectory(value: string): string {
  try {
    const normalized = resolve(value);
    const stat = lstatSync(normalized);
    if (stat.isSymbolicLink()) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }
    if (!stat.isDirectory()) {
      throw new RepositoryRegistrationError("REPOSITORY_PATH_INVALID");
    }
    const canonical = realpathSync.native(normalized);
    if (!samePath(canonical, normalized)) {
      throw new RepositoryRegistrationError("REPOSITORY_SYMLINK_REJECTED");
    }
    return canonical;
  } catch (error) {
    if (error instanceof RepositoryRegistrationError) throw error;
    const code = errorCode(error);
    throw new RepositoryRegistrationError(
      code === "ENOENT" || code === "ENOTDIR"
        ? "REPOSITORY_PATH_NOT_FOUND"
        : code === "ELOOP"
          ? "REPOSITORY_SYMLINK_REJECTED"
          : "REPOSITORY_PATH_INVALID"
    );
  }
}

export class LocalProjectPilotService {
  readonly #connection: SqliteConnection;
  readonly #registrations: RepositoryRegistrationService;
  readonly #configuration: LocalProjectPilotConfiguration;
  readonly #dependencies: LocalProjectPilotDependencies;

  constructor(
    connection: SqliteConnection,
    registrations: RepositoryRegistrationService,
    configuration: LocalProjectPilotConfiguration,
    dependencies: LocalProjectPilotDependencies = {
      runner: new FixedGitCommandRunner()
    }
  ) {
    this.#connection = connection;
    this.#registrations = registrations;
    this.#configuration = Object.freeze({
      enabled: configuration.enabled,
      allowedRoots: Object.freeze([...configuration.allowedRoots])
    });
    this.#dependencies = dependencies;
  }

  capability(): LocalProjectPilotCapabilityResponse {
    const configured = this.#configuration.allowedRoots.length > 0;
    const state = !this.#configuration.enabled
      ? "DISABLED"
      : configured
        ? "READY"
        : "CONFIGURATION_REQUIRED";
    return Object.freeze({
      apiVersion: LOCAL_PROJECT_PILOT_API_VERSION,
      capability: Object.freeze({
        state,
        enabled: this.#configuration.enabled,
        configured,
        localOnly: true,
        accessMode: "READ_ONLY",
        externalAi: "OFF"
      })
    });
  }

  async #safePreflight(rootPath: unknown): Promise<SafePreflight | RejectedPreflight> {
    if (!this.#configuration.enabled) {
      return rejection(
        "FEATURE_DISABLED",
        "Enable the Local Project Pilot in the local API configuration, then retry."
      );
    }
    if (this.#configuration.allowedRoots.length === 0) {
      return rejection(
        "CONFIGURATION_REQUIRED",
        "Configure at least one authorized local repository root, then retry."
      );
    }
    if (
      typeof rootPath !== "string" ||
      rootPath.length < 1 ||
      rootPath.length > 4_096 ||
      rootPath !== rootPath.trim() ||
      !isAbsolute(rootPath) ||
      isNetworkOrDevicePath(rootPath) ||
      hasTraversal(rootPath)
    ) {
      return rejection(
        "PATH_INVALID",
        "Enter one configured absolute local Git repository path."
      );
    }

    const normalizedCandidate = resolve(rootPath);
    const lexicallyAuthorized = this.#configuration.allowedRoots.some(
      (configuredRoot) => containsPath(resolve(configuredRoot), normalizedCandidate)
    );
    if (!lexicallyAuthorized) {
      return rejection(
        "PATH_NOT_AUTHORIZED",
        "Choose a repository inside an explicitly configured local root."
      );
    }

    let canonicalCandidate: string;
    try {
      canonicalCandidate = canonicalCandidateDirectory(normalizedCandidate);
    } catch (error) {
      const reason = error instanceof RepositoryRegistrationError
        ? registrationFailureReason(error)
        : "PATH_INVALID";
      return rejection(
        reason,
        "Choose a configured, non-symlink local Git working repository with a committed HEAD."
      );
    }

    let authorized = false;
    try {
      for (const configuredRoot of this.#configuration.allowedRoots) {
        const canonicalAllowedRoot = canonicalRepositoryRoot(resolve(configuredRoot));
        if (containsPath(canonicalAllowedRoot, canonicalCandidate)) {
          authorized = true;
          break;
        }
      }
    } catch {
      return rejection(
        "CONFIGURATION_REQUIRED",
        "Correct the configured local repository roots, then restart the local API."
      );
    }
    if (!authorized) {
      return rejection(
        "UNSAFE_LINK",
        "Choose a repository that remains inside its configured root after canonical resolution."
      );
    }

    let canonicalRoot: string;
    try {
      canonicalRoot = canonicalRepositoryRoot(canonicalCandidate);
    } catch (error) {
      const reason = error instanceof RepositoryRegistrationError
        ? registrationFailureReason(error)
        : "PATH_INVALID";
      return rejection(
        reason,
        "Choose a configured, non-symlink local Git working repository with a committed HEAD."
      );
    }

    try {
      const symbolicBefore = await this.#dependencies.runner.run(
        "SYMBOLIC_HEAD", canonicalRoot
      );
      const commitBefore = await this.#dependencies.runner.run(
        "HEAD_COMMIT", canonicalRoot
      );
      const status = await this.#dependencies.runner.run("STATUS", canonicalRoot);
      const commitTime = await this.#dependencies.runner.run(
        "COMMIT_TIME", canonicalRoot
      );
      const symbolicAfter = await this.#dependencies.runner.run(
        "SYMBOLIC_HEAD", canonicalRoot
      );
      const commitAfter = await this.#dependencies.runner.run(
        "HEAD_COMMIT", canonicalRoot
      );
      const commit = decodedLine(commitBefore)?.toLowerCase();
      const secondCommit = decodedLine(commitAfter)?.toLowerCase();
      if (commit === undefined || secondCommit === undefined ||
        !COMMIT_PATTERN.test(commit) || commit !== secondCommit) {
        return rejection(
          "COMMIT_UNAVAILABLE",
          "Select a repository with a stable committed HEAD, then retry."
        );
      }
      const attachedRef = decodedLine(symbolicBefore);
      const secondRef = decodedLine(symbolicAfter);
      const detached = symbolicBefore.exitCode === 1 && symbolicAfter.exitCode === 1;
      if ((!detached && (attachedRef === undefined || attachedRef !== secondRef ||
        !SAFE_REF_PATTERN.test(attachedRef))) ||
        (status.exitCode !== 0 || commitTime.exitCode !== 0)) {
        return rejection(
          "INTEGRITY_CHECK_FAILED",
          "Retry after the repository identity is stable."
        );
      }
      const timestampValue = decodedLine(commitTime);
      const timestamp = timestampValue === undefined ? new Date(Number.NaN) : new Date(timestampValue);
      if (Number.isNaN(timestamp.getTime())) {
        return rejection(
          "INTEGRITY_CHECK_FAILED",
          "Retry after the committed revision has valid Git metadata."
        );
      }
      const changes = parsePorcelainStatus(status.stdout);
      const displayName = basename(canonicalRoot);
      if (displayName.length < 1 || displayName.length > 120 ||
        /[\u0000-\u001f\u007f]/u.test(displayName)) {
        return rejection("PATH_INVALID", "Choose a repository with a safe display name.");
      }
      const repository: LocalProjectSafeRepository = Object.freeze({
        displayName,
        repositoryState: "RECOGNIZED_GIT",
        headState: detached ? "DETACHED" : "ATTACHED",
        ref: detached ? "Detached HEAD" : (attachedRef as string),
        exactCommit: commit,
        commitTimestampUtc: timestamp.toISOString(),
        uncommittedChanges: changes.length === 0 ? "NONE" : "EXCLUDED",
        excludedChangeCount: changes.length,
        captureReady: true,
        accessMode: "READ_ONLY",
        sourcePersistence: "SOURCE_FREE"
      });
      return Object.freeze({ canonicalRoot, repository });
    } catch (error) {
      return rejection(
        gitFailureReason(error),
        "Verify Git is available and the repository is stable, then retry."
      );
    }
  }

  async preflight(rootPath: unknown): Promise<LocalProjectPreflightResponse> {
    const result = await this.#safePreflight(rootPath);
    if ("apiVersion" in result) return result;
    return Object.freeze({
      apiVersion: LOCAL_PROJECT_PILOT_API_VERSION,
      preflight: Object.freeze({
        status: "READY" as const,
        repository: result.repository
      })
    });
  }

  async register(projectId: ProjectId, rootPath: unknown): Promise<RegisteredRepository> {
    const result = await this.#safePreflight(rootPath);
    if ("apiVersion" in result) {
      const reason = result.preflight.reason;
      throw new LocalProjectPilotError(
        reason === "FEATURE_DISABLED"
          ? "LOCAL_PROJECT_FEATURE_DISABLED"
          : reason === "CONFIGURATION_REQUIRED"
            ? "LOCAL_PROJECT_CONFIGURATION_REQUIRED"
            : "LOCAL_PROJECT_PREFLIGHT_REJECTED"
      );
    }
    return this.#registrations.register(projectId, result.canonicalRoot);
  }

  async context(projectId: ProjectId): Promise<LocalProjectSafeRepository> {
    let root: string;
    try {
      root = this.#registrations.resolveRootForRead(projectId);
    } catch {
      throw new LocalProjectPilotError("LOCAL_PROJECT_CONTEXT_NOT_FOUND");
    }
    const result = await this.#safePreflight(root);
    if ("apiVersion" in result) {
      throw new LocalProjectPilotError("LOCAL_PROJECT_CONTEXT_NOT_FOUND");
    }
    return result.repository;
  }

  projectIdForMission(missionId: string): ProjectId {
    const row = this.#connection.prepare(
      "SELECT project_id FROM missions WHERE mission_id = ?"
    ).get(missionId) as { readonly project_id: string } | undefined;
    if (row === undefined) {
      throw new LocalProjectPilotError("LOCAL_PROJECT_CONTEXT_NOT_FOUND");
    }
    return parseStableId<"PROJECT">(row.project_id);
  }
}
