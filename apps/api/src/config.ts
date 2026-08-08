import { homedir } from "node:os";
import { delimiter, isAbsolute, join, normalize, parse } from "node:path";

export const API_CONFIG_KEYS = {
  host: "INTELLILOOP_API_HOST",
  port: "INTELLILOOP_API_PORT",
  logLevel: "INTELLILOOP_LOG_LEVEL",
  dataDirectory: "INTELLILOOP_DATA_DIRECTORY",
  externalAi: "INTELLILOOP_AI_EXTERNAL_CALLS",
  evidenceReplay: "INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY",
  agentDisagreement: "INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT",
  remediationPreview: "INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW",
  localProjectPilot: "INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED",
  localProjectAllowedRoots: "INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS"
} as const;

export type ApiLogLevel = "silent" | "error" | "info";

export interface FoundationFeatureFlags {
  readonly "ai.externalCalls": false;
  readonly "codeMap.enabled": true;
  readonly "experiments.evidenceReplay": boolean;
  readonly "experiments.agentDisagreement": boolean;
  readonly "experiments.remediationPreview": boolean;
}

export interface ApiRuntimeConfig {
  readonly host: "127.0.0.1";
  readonly port: number;
  readonly logLevel: ApiLogLevel;
  readonly database: {
    readonly directory: string;
    readonly filePath: string;
  };
  readonly featureFlags: FoundationFeatureFlags;
  readonly localProjectPilot: {
    readonly enabled: boolean;
    readonly allowedRoots: readonly string[];
  };
}

export const FROZEN_FEATURE_FLAGS: FoundationFeatureFlags = Object.freeze({
  "ai.externalCalls": false,
  "codeMap.enabled": true,
  "experiments.evidenceReplay": false,
  "experiments.agentDisagreement": false,
  "experiments.remediationPreview": false
});

const FROZEN_OFF_KEYS = [
  API_CONFIG_KEYS.externalAi
] as const;

export class ConfigurationError extends Error {
  readonly code = "CONFIG_INVALID" as const;
  readonly setting: string;

  constructor(setting: string, requirement: string) {
    super(`Invalid configuration for ${setting}. ${requirement}`);
    this.name = "ConfigurationError";
    this.setting = setting;
  }
}

function readTrimmed(
  environment: Readonly<Record<string, string | undefined>>,
  key: string
): string | undefined {
  const value = environment[key];
  return value === undefined ? undefined : value.trim();
}

function parseHost(
  environment: Readonly<Record<string, string | undefined>>
): "127.0.0.1" {
  const host = readTrimmed(environment, API_CONFIG_KEYS.host) ?? "127.0.0.1";
  if (host !== "127.0.0.1") {
    throw new ConfigurationError(
      API_CONFIG_KEYS.host,
      "Only the IPv4 loopback address is permitted."
    );
  }
  return host;
}

function parsePort(
  environment: Readonly<Record<string, string | undefined>>
): number {
  const rawPort = readTrimmed(environment, API_CONFIG_KEYS.port) ?? "3100";
  if (!/^[0-9]+$/.test(rawPort)) {
    throw new ConfigurationError(
      API_CONFIG_KEYS.port,
      "Use an integer from 1 through 65535."
    );
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError(
      API_CONFIG_KEYS.port,
      "Use an integer from 1 through 65535."
    );
  }
  return port;
}

function parseLogLevel(
  environment: Readonly<Record<string, string | undefined>>
): ApiLogLevel {
  const logLevel = readTrimmed(environment, API_CONFIG_KEYS.logLevel) ?? "info";
  if (logLevel !== "silent" && logLevel !== "error" && logLevel !== "info") {
    throw new ConfigurationError(
      API_CONFIG_KEYS.logLevel,
      "Allowed values are silent, error and info."
    );
  }
  return logLevel;
}

function defaultDataDirectory(): string {
  return process.platform === "win32"
    ? join(homedir(), "AppData", "Local", "IntelliLoop")
    : join(homedir(), ".local", "share", "intelliloop");
}

function parseDataDirectory(
  environment: Readonly<Record<string, string | undefined>>
): string {
  const configured = readTrimmed(environment, API_CONFIG_KEYS.dataDirectory);
  const value = configured ?? defaultDataDirectory();
  if (
    value.length === 0 ||
    value.length > 1_024 ||
    !isAbsolute(value) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new ConfigurationError(
      API_CONFIG_KEYS.dataDirectory,
      "Use a bounded absolute directory outside registered repositories."
    );
  }

  const directory = normalize(value);
  if (directory === parse(directory).root) {
    throw new ConfigurationError(
      API_CONFIG_KEYS.dataDirectory,
      "Use a bounded absolute directory outside registered repositories."
    );
  }
  return directory;
}

function assertProtectedFlagsRemainOff(
  environment: Readonly<Record<string, string | undefined>>
): void {
  for (const key of FROZEN_OFF_KEYS) {
    const value = readTrimmed(environment, key);
    if (value !== undefined && value !== "false") {
      throw new ConfigurationError(
        key,
        "This flag must remain false until its owning story is implemented."
      );
    }
  }
}

function parseOptionalBooleanFlag(
  environment: Readonly<Record<string, string | undefined>>,
  key: string
): boolean {
  const value = readTrimmed(environment, key) ?? "false";
  if (value !== "true" && value !== "false") {
    throw new ConfigurationError(
      key,
      "Use exactly true or false."
    );
  }
  return value === "true";
}

function isNetworkOrDevicePath(value: string): boolean {
  return /^(?:\\\\|\/\/|\\\\[?.]\\)/u.test(value);
}

function parseLocalProjectAllowedRoots(
  environment: Readonly<Record<string, string | undefined>>
): readonly string[] {
  const configured = readTrimmed(
    environment,
    API_CONFIG_KEYS.localProjectAllowedRoots
  );
  if (configured === undefined || configured.length === 0) return Object.freeze([]);
  const roots = configured.split(delimiter).map((value) => value.trim());
  if (roots.length > 16 || roots.some((value) =>
    value.length < 1 ||
    value.length > 4_096 ||
    !isAbsolute(value) ||
    isNetworkOrDevicePath(value) ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    value.split(/[\\/]+/u).some((segment) => segment === "..")
  )) {
    throw new ConfigurationError(
      API_CONFIG_KEYS.localProjectAllowedRoots,
      "Use up to 16 bounded absolute local roots separated by the platform path delimiter."
    );
  }
  return Object.freeze([...new Set(roots.map((value) => normalize(value)))]);
}

export function loadApiConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env
): ApiRuntimeConfig {
  assertProtectedFlagsRemainOff(environment);
  const dataDirectory = parseDataDirectory(environment);
  const localProjectPilotEnabled = parseOptionalBooleanFlag(
    environment,
    API_CONFIG_KEYS.localProjectPilot
  );
  const localProjectAllowedRoots = parseLocalProjectAllowedRoots(environment);

  return Object.freeze({
    host: parseHost(environment),
    port: parsePort(environment),
    logLevel: parseLogLevel(environment),
    database: Object.freeze({
      directory: dataDirectory,
      filePath: join(dataDirectory, "intelliloop.sqlite3")
    }),
    featureFlags: Object.freeze({
      ...FROZEN_FEATURE_FLAGS,
      "experiments.evidenceReplay": parseOptionalBooleanFlag(
        environment,
        API_CONFIG_KEYS.evidenceReplay
      ),
      "experiments.agentDisagreement": parseOptionalBooleanFlag(
        environment,
        API_CONFIG_KEYS.agentDisagreement
      ),
      "experiments.remediationPreview": parseOptionalBooleanFlag(
        environment,
        API_CONFIG_KEYS.remediationPreview
      )
    }),
    localProjectPilot: Object.freeze({
      enabled: localProjectPilotEnabled,
      allowedRoots: localProjectAllowedRoots
    })
  });
}
