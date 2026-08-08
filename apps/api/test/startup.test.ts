import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { API_CONFIG_KEYS } from "../src/config.js";
import { openFoundationDatabase } from "../src/database/database-lifecycle.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("API startup failure", () => {
  it("fails safely without printing the invalid value", () => {
    const sentinel = "INTELLILOOP_SECRET_SENTINEL_DO_NOT_LOG";
    const serverPath = fileURLToPath(new URL("../src/server.ts", import.meta.url));
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", serverPath],
      {
        encoding: "utf8",
        timeout: 10_000,
        env: {
          ...process.env,
          [API_CONFIG_KEYS.host]: "127.0.0.1",
          [API_CONFIG_KEYS.port]: sentinel
        }
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain(sentinel);
    expect(JSON.parse(result.stderr.trim())).toMatchObject({
      level: "error",
      event: "api.start_failed",
      errorCode: "CONFIG_INVALID"
    });
  });

  it("refuses a newer database without printing its path", () => {
    const dataDirectory = mkdtempSync(
      join(tmpdir(), "INTELLILOOP_SECRET_SENTINEL_DB_PATH_")
    );
    temporaryDirectories.push(dataDirectory);
    const filePath = join(dataDirectory, "intelliloop.sqlite3");
    openFoundationDatabase({ filePath }).close();

    const newerDatabase = new Database(filePath);
    newerDatabase.pragma("user_version = 13");
    newerDatabase.close();

    const serverPath = fileURLToPath(new URL("../src/server.ts", import.meta.url));
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", serverPath],
      {
        encoding: "utf8",
        timeout: 10_000,
        env: {
          ...process.env,
          [API_CONFIG_KEYS.dataDirectory]: dataDirectory,
          [API_CONFIG_KEYS.logLevel]: "error"
        }
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain(dataDirectory);
    expect(JSON.parse(result.stderr.trim())).toMatchObject({
      level: "error",
      event: "api.start_failed",
      errorCode: "DATABASE_START_FAILED"
    });
  });
});
