import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import {
  parseSha256Digest,
  parseStableId,
  type Sha256Digest
} from "@intelliloop/domain";
import { describe, expect, it } from "vitest";

import {
  CODE_MAP_EXTRACTION_LIMITS,
  CodeMapExtractionError,
  extractCodeMap,
  type CodeMapExtraction
} from "../src/code-map/code-map-extractor.js";
import {
  CODE_MAP_ALLOWED_EXTENSIONS,
  CODE_MAP_SCAN_LIMITS,
  CODE_MAP_SCAN_VERSION,
  type CodeMapSourceExtension,
  type CodeMapSourceScan
} from "../src/code-map/code-map-scanner.js";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const R1 = "00000000-0000-4000-8000-000000000021";

interface GoldenFixture {
  readonly files: Readonly<Record<string, string>>;
  readonly expected: {
    readonly filePaths: readonly string[];
    readonly importSpecifiers: readonly string[];
    readonly exports: readonly string[];
    readonly contracts: readonly string[];
    readonly routes: readonly string[];
    readonly testAssociations: readonly string[];
  };
}

const golden = JSON.parse(
  readFileSync(
    new URL("./fixtures/code-map-extractor-golden.json", import.meta.url),
    "utf8"
  )
) as GoldenFixture;

function digest(content: string): Sha256Digest {
  return parseSha256Digest(
    `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`
  );
}

function extension(path: string): CodeMapSourceExtension {
  const value = posix.extname(path).toLowerCase();
  if (!CODE_MAP_ALLOWED_EXTENSIONS.includes(value as CodeMapSourceExtension)) {
    throw new Error(`Unsupported fixture extension: ${value}`);
  }
  return value as CodeMapSourceExtension;
}

function scanFrom(
  sources: Readonly<Record<string, string>>,
  preserveInsertionOrder = false
): CodeMapSourceScan {
  const entries = Object.entries(sources);
  if (!preserveInsertionOrder) {
    entries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  }
  const files = entries.map(([relativePath, content]) => Object.freeze({
    relativePath,
    extension: extension(relativePath),
    byteLength: Buffer.byteLength(content, "utf8"),
    contentDigest: digest(content),
    content
  }));
  const scannedByteCount = files.reduce(
    (total, file) => total + file.byteLength,
    0
  );
  return Object.freeze({
    scanVersion: CODE_MAP_SCAN_VERSION,
    projectId: parseStableId<"PROJECT">(P1),
    missionId: parseStableId<"MISSION">(M1),
    registrationId: parseStableId<"REPOSITORY_REGISTRATION">(R1),
    allowedExtensions: CODE_MAP_ALLOWED_EXTENSIONS,
    limits: CODE_MAP_SCAN_LIMITS,
    encounteredFileCount: files.length,
    scannedFileCount: files.length,
    scannedByteCount,
    skippedUnsupportedFileCount: 0,
    skippedExtensions: Object.freeze([]),
    skippedDirectories: Object.freeze([]),
    files: Object.freeze(files)
  });
}

async function expectExtractionError(
  operation: () => Promise<unknown>,
  code: CodeMapExtractionError["code"]
): Promise<void> {
  try {
    await operation();
    throw new Error("Expected code-map extraction failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(CodeMapExtractionError);
    expect(error).toMatchObject({ code });
  }
}

function goldenProjection(extraction: CodeMapExtraction) {
  return {
    filePaths: extraction.files.map((file) => file.sourcePath),
    importSpecifiers: extraction.imports.map(
      (item) => `${item.sourcePath}:${item.specifier}`
    ),
    exports: extraction.exports.map(
      (item) => `${item.sourcePath}:${item.exportKind}:${item.exportedName}`
    ),
    contracts: extraction.contracts.map(
      (item) =>
        `${item.sourcePath}:${item.contractKind}:${item.name}:${item.exportedName}`
    ),
    routes: extraction.routes.map(
      (item) =>
        `${item.sourcePath}:${item.method}:${item.routePath}:${item.recognition}`
    ),
    testAssociations: extraction.testAssociations.map(
      (item) =>
        `${item.testSourcePath}:${item.targetSourcePath}:${item.basis}`
    )
  };
}

describe("bounded static TypeScript and JSON code-map extraction", () => {
  it("matches the golden static parser fixture without claiming runtime behavior", async () => {
    const extraction = await extractCodeMap(scanFrom(golden.files));

    expect(goldenProjection(extraction)).toEqual(golden.expected);
    expect(extraction).toMatchObject({
      extractionVersion: "code-map-extraction.v1",
      authority: "STATIC_SYNTAX_ONLY",
      runtimeSemantics: "NOT_OBSERVED",
      completeness: "COMPLETE",
      projectId: P1,
      missionId: M1,
      registrationId: R1,
      sourceFileCount: 7,
      diagnostics: [],
      diagnosticsTruncated: false
    });
    expect(extraction.manifests).toEqual([
      expect.objectContaining({
        sourcePath: "package.json",
        name: "@intelliloop/sample",
        version: "1.2.3",
        private: true,
        moduleType: "module",
        scriptNames: ["build", "check"],
        workspacePatterns: ["apps/*", "packages/*"]
      })
    ]);
    expect(extraction.manifests[0]?.dependencyGroups).toEqual([
      {
        kind: "DEPENDENCY",
        packages: [{
          name: "fastify",
          declaredRange: "5.8.5",
          rangeDisposition: "RECORDED"
        }]
      },
      {
        kind: "DEV_DEPENDENCY",
        packages: [{
          name: "vitest",
          declaredRange: "^2.1.9",
          rangeDisposition: "RECORDED"
        }]
      },
      {
        kind: "OPTIONAL_DEPENDENCY",
        packages: [{
          name: "optional-package",
          declaredRange: "~1.0.0",
          rangeDisposition: "RECORDED"
        }]
      },
      {
        kind: "PEER_DEPENDENCY",
        packages: [{
          name: "react",
          declaredRange: ">=18",
          rangeDisposition: "RECORDED"
        }]
      }
    ]);
    expect(extraction.imports.find(
      (item) => item.sourcePath === "test/service.spec.ts"
    )?.resolvedTargetPath).toBe("src/service.ts");
    expect(extraction.routes.every(
      (route) => route.runtimeSemantics === "NOT_OBSERVED"
    )).toBe(true);
    expect(extraction.extractionDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("returns deterministic bounded partial results for malformed sources", async () => {
    const malformed: Record<string, string> = {
      "src/target.ts": "export const target = 1;\n",
      "src/broken.ts": [
        "import { target } from './target';",
        "export interface Kept { value: string }",
        "export const broken = ;",
        "export type After = number;"
      ].join("\n")
    };
    for (let index = 0; index < 120; index += 1) {
      malformed[`data/invalid-${String(index).padStart(3, "0")}.json`] = "{";
    }

    const extraction = await extractCodeMap(scanFrom(malformed));

    expect(extraction.completeness).toBe("PARTIAL");
    expect(extraction.files).toHaveLength(122);
    expect(extraction.files.find(
      (file) => file.sourcePath === "src/broken.ts"
    )?.parseStatus).toBe("SYNTAX_ERROR");
    expect(extraction.imports).toContainEqual(expect.objectContaining({
      sourcePath: "src/broken.ts",
      specifier: "./target",
      resolvedTargetPath: "src/target.ts"
    }));
    expect(extraction.contracts.map((item) => item.name)).toEqual([
      "After",
      "Kept"
    ]);
    expect(extraction.diagnostics).toHaveLength(
      CODE_MAP_EXTRACTION_LIMITS.maximumDiagnostics
    );
    expect(extraction.diagnosticsTruncated).toBe(true);
    expect(extraction.diagnostics.every(
      (item) => item.message === "JSON syntax could not be fully parsed." ||
        item.message === "TypeScript syntax could not be fully parsed."
    )).toBe(true);
  });

  it("is byte-for-byte deterministic when the validated scan file order changes", async () => {
    const forward = scanFrom(golden.files);
    const reversed = Object.freeze({
      ...forward,
      files: Object.freeze([...forward.files].reverse())
    });

    const first = await extractCodeMap(forward);
    const second = await extractCodeMap(reversed);

    expect(second).toEqual(first);
    expect(second.extractionDigest).toBe(first.extractionDigest);
  });

  it("does not execute source, expose script commands, or infer dynamic runtime semantics", async () => {
    const sentinel = "PRIVATE_RUNTIME_SENTINEL_SHOULD_NOT_APPEAR";
    const oversizedName = "n".repeat(
      CODE_MAP_EXTRACTION_LIMITS.maximumNameCharacters + 1
    );
    const scan = scanFrom({
      "package.json": JSON.stringify({
        scripts: { postinstall: `node -e ${sentinel}` },
        dependencies: { "private-package": "file:C:/private/repository" }
      }),
      "src/runtime.ts": [
        "import type { FastifyInstance } from 'fastify';",
        `import { ${oversizedName} } from './names';`,
        "export function install(app: FastifyInstance) {",
        "  app.get('/static', () => undefined);",
        "  const computed = '/computed';",
        "  app.get(computed, () => undefined);",
        "  const alias = app;",
        "  alias.post('/alias', () => undefined);",
        "  void import('./dynamic');",
        "  require('./required');",
        "}",
        "const fake = { get() {} };",
        "fake.get('/not-fastify');",
        `globalThis['${sentinel}'] = true;`
      ].join("\n"),
      "src/names.ts": `export const ${oversizedName} = true;\n`,
      "src/dynamic.ts": "export const dynamic = true;\n",
      "src/required.ts": "export const required = true;\n"
    });

    const extraction = await extractCodeMap(scan);
    const serialized = JSON.stringify(extraction);

    expect(extraction.routes.map((route) => route.routePath)).toEqual([
      "/static"
    ]);
    expect(extraction.imports.map((item) => item.specifier)).toEqual([
      "./names",
      "fastify"
    ]);
    expect(extraction.imports.find(
      (item) => item.specifier === "./names"
    )?.importedNames).toEqual([]);
    expect(extraction.testAssociations).toEqual([]);
    expect(extraction.runtimeSemantics).toBe("NOT_OBSERVED");
    expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toContain(oversizedName);
    expect(extraction.manifests[0]).toMatchObject({
      scriptNames: ["postinstall"],
      dependencyGroups: [{
        kind: "DEPENDENCY",
        packages: [{
          name: "private-package",
          declaredRange: null,
          rangeDisposition: "OMITTED_UNSAFE"
        }]
      }]
    });
    expect((globalThis as Record<string, unknown>)[sentinel]).toBeUndefined();
  });

  it("keeps the production extractor free of repository execution and writes", () => {
    const source = readFileSync(
      new URL("../src/code-map/code-map-extractor.ts", import.meta.url),
      "utf8"
    );
    for (const prohibited of [
      "node:child_process",
      "node:fs",
      "spawn(",
      "exec(",
      "eval(",
      "writeFile",
      "mkdir(",
      "npm install"
    ]) {
      expect(source).not.toContain(prohibited);
    }
    expect(source).toContain("ts.createSourceFile");
    expect(source).toContain("JSON.parse");
  });

  it("rejects tampered, duplicate, oversized, and structurally invalid scan bundles", async () => {
    const valid = scanFrom({ "src/value.ts": "export const value = 1;\n" });
    const file = valid.files[0];
    if (file === undefined) throw new Error("Fixture file missing.");
    const withHonestSkip: CodeMapSourceScan = {
      ...valid,
      encounteredFileCount: 2,
      skippedUnsupportedFileCount: 1,
      skippedExtensions: [{ extension: ".md", fileCount: 1 }],
      skippedDirectories: [{ directoryName: ".git", directoryCount: 1 }]
    };
    await expect(extractCodeMap(withHonestSkip)).resolves.toMatchObject({
      sourceCoverage: {
        encounteredFileCount: 2,
        scannedFileCount: 1,
        skippedUnsupportedFileCount: 1,
        skippedExtensions: [{ extension: ".md", fileCount: 1 }],
        skippedDirectories: [{ directoryName: ".git", directoryCount: 1 }]
      }
    });
    const invalidInputs: CodeMapSourceScan[] = [
      { ...valid, files: [{ ...file, contentDigest: digest("different") }] },
      {
        ...valid,
        encounteredFileCount: 2,
        scannedFileCount: 2,
        scannedByteCount: file.byteLength * 2,
        files: [file, file]
      },
      {
        ...valid,
        scannedByteCount: CODE_MAP_SCAN_LIMITS.maximumAggregateBytes + 1
      },
      {
        ...valid,
        limits: { ...CODE_MAP_SCAN_LIMITS, maximumFileBytes: 1 }
      },
      {
        ...withHonestSkip,
        skippedExtensions: []
      }
    ];

    for (const invalid of invalidInputs) {
      await expectExtractionError(
        () => extractCodeMap(invalid),
        "CODE_MAP_EXTRACTION_INPUT_INVALID"
      );
    }
  });

  it("fails safely when its independent monotonic deadline is exhausted", async () => {
    let call = 0;
    await expectExtractionError(
      () => extractCodeMap(
        scanFrom({ "src/value.ts": "export const value = 1;\n" }),
        {
          monotonicNow: () => {
            call += 1;
            return call === 1
              ? 0
              : CODE_MAP_EXTRACTION_LIMITS.maximumMilliseconds;
          }
        }
      ),
      "CODE_MAP_EXTRACTION_TIMEOUT"
    );
  });
});
