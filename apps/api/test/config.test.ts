import { delimiter, isAbsolute, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  API_CONFIG_KEYS,
  ConfigurationError,
  FROZEN_FEATURE_FLAGS,
  loadApiConfig
} from "../src/config.js";

describe("API runtime configuration", () => {
  it("loads the frozen localhost and feature defaults", () => {
    const config = loadApiConfig({});

    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 3100,
      logLevel: "info",
      featureFlags: {
        "ai.externalCalls": false,
        "codeMap.enabled": true,
        "experiments.evidenceReplay": false,
        "experiments.agentDisagreement": false,
        "experiments.remediationPreview": false
      },
      localProjectPilot: { enabled: false, allowedRoots: [] }
    });
    expect(isAbsolute(config.database.directory)).toBe(true);
    expect(config.database.filePath).toBe(
      resolve(config.database.directory, "intelliloop.sqlite3")
    );
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.database)).toBe(true);
    expect(Object.isFrozen(FROZEN_FEATURE_FLAGS)).toBe(true);
  });

  it("parses the Local Project Pilot as explicit default-off configuration", () => {
    const first = resolve("test-data", "authorized-one");
    const second = resolve("test-data", "authorized-two");
    const config = loadApiConfig({
      [API_CONFIG_KEYS.localProjectPilot]: "true",
      [API_CONFIG_KEYS.localProjectAllowedRoots]: `${first}${delimiter}${second}`
    });
    expect(config.localProjectPilot).toEqual({
      enabled: true,
      allowedRoots: [first, second]
    });
    expect(Object.isFrozen(config.localProjectPilot)).toBe(true);
    expect(Object.isFrozen(config.localProjectPilot.allowedRoots)).toBe(true);
  });

  it.each(["yes", "1", "TRUE"])(
    "rejects malformed Local Project enable flag %s",
    (value) => {
      expect(() => loadApiConfig({
        [API_CONFIG_KEYS.localProjectPilot]: value
      })).toThrowError(ConfigurationError);
    }
  );

  it.each(["relative-root", "\\\\server\\share", "\\\\?\\C:\\device"])(
    "rejects unsafe Local Project allowlist root %s",
    (value) => {
      expect(() => loadApiConfig({
        [API_CONFIG_KEYS.localProjectAllowedRoots]: value
      })).toThrowError(ConfigurationError);
    }
  );

  it("accepts only typed safe runtime overrides", () => {
    const dataDirectory = resolve("test-data", "intelliloop");
    expect(
      loadApiConfig({
        [API_CONFIG_KEYS.host]: "127.0.0.1",
        [API_CONFIG_KEYS.port]: "43100",
        [API_CONFIG_KEYS.logLevel]: "error",
        [API_CONFIG_KEYS.dataDirectory]: dataDirectory,
        [API_CONFIG_KEYS.externalAi]: "false",
        [API_CONFIG_KEYS.evidenceReplay]: "true",
        [API_CONFIG_KEYS.agentDisagreement]: "true",
        [API_CONFIG_KEYS.remediationPreview]: "true"
      })
    ).toMatchObject({
      host: "127.0.0.1",
      port: 43100,
      logLevel: "error",
      database: {
        directory: dataDirectory,
        filePath: resolve(dataDirectory, "intelliloop.sqlite3")
      },
      featureFlags: {
        "experiments.evidenceReplay": true,
        "experiments.agentDisagreement": true,
        "experiments.remediationPreview": true
      }
    });
  });

  it.each([
    [API_CONFIG_KEYS.host, "0.0.0.0"],
    [API_CONFIG_KEYS.host, "localhost"],
    [API_CONFIG_KEYS.port, "0"],
    [API_CONFIG_KEYS.port, "65536"],
    [API_CONFIG_KEYS.port, "not-a-port"],
    [API_CONFIG_KEYS.logLevel, "debug"],
    [API_CONFIG_KEYS.dataDirectory, "relative-data-directory"]
  ])("rejects invalid %s without echoing its value", (key, value) => {
    expect.assertions(4);
    try {
      loadApiConfig({ [key]: value });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error).toMatchObject({ code: "CONFIG_INVALID", setting: key });
      expect((error as Error).message).not.toContain(value);
      expect((error as Error).message).toContain(key);
    }
  });

  it.each([
    API_CONFIG_KEYS.externalAi
  ])("fails closed when protected flag %s is enabled", (key) => {
    expect(() => loadApiConfig({ [key]: "true" })).toThrowError(
      ConfigurationError
    );
  });

  it.each(["1", "yes", "TRUE", "enabled", " "])(
    "rejects malformed optional experiment flag value %s",
    (value) => {
      for (const key of [
        API_CONFIG_KEYS.evidenceReplay,
        API_CONFIG_KEYS.agentDisagreement,
        API_CONFIG_KEYS.remediationPreview
      ]) {
        expect(() => loadApiConfig({ [key]: value })).toThrowError(
          ConfigurationError
        );
      }
    }
  );

  it("does not expose a secret-bearing invalid setting value", () => {
    const sentinel = "INTELLILOOP_SECRET_SENTINEL_DO_NOT_LOG";

    expect(() =>
      loadApiConfig({ [API_CONFIG_KEYS.port]: sentinel })
    ).toThrowError(/INTELLILOOP_API_PORT/);

    try {
      loadApiConfig({ [API_CONFIG_KEYS.port]: sentinel });
    } catch (error) {
      expect(String(error)).not.toContain(sentinel);
    }
  });
});
