import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const forbiddenDependencies = [
  "react",
  "vite",
  "fastify",
  "better-sqlite3",
  "@intelliloop/contracts",
  "@intelliloop/api",
  "@intelliloop/web",
  "/apps/"
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return extname(entry.name) === ".ts" ? [path] : [];
  });
}

describe("domain package boundary", () => {
  it("does not import application or infrastructure modules", () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const sourceDirectory = join(testDirectory, "..", "src");

    for (const path of sourceFiles(sourceDirectory)) {
      const source = readFileSync(path, "utf8");
      for (const forbidden of forbiddenDependencies) {
        expect(source, `${path} must not reference ${forbidden}`).not.toContain(
          forbidden
        );
      }
    }
  });

  it("keeps the IL-6.3 adapter mock-only and free of credential or network APIs", () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const adapterPath = join(testDirectory, "..", "src", "provider-adapter.ts");
    const source = readFileSync(adapterPath, "utf8");

    for (const forbidden of [
      "globalThis.fetch",
      "fetch(",
      "node:http",
      "node:https",
      "https://",
      "process.env",
      "OPENAI_API_KEY",
      "Authorization"
    ]) {
      expect(source, `provider adapter must not reference ${forbidden}`).not.toContain(
        forbidden
      );
    }
  });

  it("keeps the IL-6.5 offline checkpoint free of credential and network APIs", () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const checkpointPath = join(
      testDirectory,
      "..",
      "src",
      "openai-evaluation-checkpoint.ts"
    );
    const generatorPath = join(
      testDirectory,
      "..",
      "..",
      "..",
      "scripts",
      "generate-openai-evaluation-evidence.mjs"
    );

    for (const path of [checkpointPath, generatorPath]) {
      const source = readFileSync(path, "utf8");
      for (const forbidden of [
        "globalThis.fetch",
        "fetch(",
        "node:http",
        "node:https",
        "process.env",
        "Bun.env",
        "Deno.env",
        "OPENAI_API_KEY",
        "Authorization"
      ]) {
        expect(source, `${path} must not reference ${forbidden}`).not.toContain(
          forbidden
        );
      }
    }
  });

  it("keeps IL-6.7 synthetic suggestions deterministic and provider-free", () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(testDirectory, "..", "src", "synthetic-edge-case-suggestions.ts"),
      "utf8"
    );
    for (const forbidden of [
      "globalThis.fetch",
      "fetch(",
      "node:http",
      "node:https",
      "process.env",
      "OPENAI_API_KEY",
      "Authorization",
      "createProviderNeutralAdapter"
    ]) {
      expect(source, `synthetic suggestions must not reference ${forbidden}`).not.toContain(
        forbidden
      );
    }
  });

  it("keeps IL-7.1 readiness evaluation pure and authority-isolated", () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(testDirectory, "..", "src", "readiness-evaluation.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/(?:fetch|XMLHttpRequest|WebSocket|node:https?|node:net)/u);
    expect(source).not.toMatch(/process\.env|provider-adapter|fastify|better-sqlite3/u);
    expect(source).not.toMatch(/from\s+["'][^"']*(?:passport|repository)|createReleasePassport|deploy\s*\(/iu);
  });
});
