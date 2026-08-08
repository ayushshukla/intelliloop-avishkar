import {
  EVIDENCE_NORMALIZATION_VERSION,
  MAXIMUM_EVIDENCE_INPUT_BYTES,
  MAXIMUM_EVIDENCE_JSON_DEPTH,
  MAXIMUM_EVIDENCE_JSON_NODES,
  EvidenceImportError,
  prepareEvidenceImport,
  type EvidenceImportFormat,
  type PreparedEvidenceImport
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const encoder = new TextEncoder();

function bytes(value: string): Uint8Array {
  return encoder.encode(value);
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: EvidenceImportError["code"]
): Promise<EvidenceImportError> {
  try {
    await operation();
    throw new Error("Expected evidence import rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(EvidenceImportError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof EvidenceImportError)) throw error;
    return error;
  }
}

describe("bounded evidence import preparation", () => {
  it.each([
    ["MARKDOWN", "# Requirement\r\n\r\nUse Cafe\u0301.\r\n"],
    ["TEXT", "Decision\rText\n"],
    ["JSON", '{"revision":2,"required":true}']
  ] satisfies readonly (readonly [EvidenceImportFormat, string])[])(
    "accepts and normalizes %s evidence",
    async (format, content) => {
      const prepared = await prepareEvidenceImport({ format, content: bytes(content) });

      expect(prepared).toMatchObject({
        normalizationVersion: EVIDENCE_NORMALIZATION_VERSION,
        format,
        inputByteCount: bytes(content).byteLength,
        redaction: { applied: false, totalReplacements: 0, ruleCounts: [] }
      });
      expect(prepared.contentDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(prepared.normalizedContent).not.toContain("\r");
      if (format === "MARKDOWN") {
        expect(prepared.normalizedContent).toBe("# Requirement\n\nUse Café.\n");
      }
      if (format === "JSON") {
        expect(prepared.normalizedContent).toBe('{"required":true,"revision":2}');
      }
    }
  );

  it("uses format-framed stable digest vectors after LF and NFC normalization", async () => {
    const first = await prepareEvidenceImport({
      format: "TEXT",
      content: bytes("Cafe\u0301\r\nDecision\r\n")
    });
    const equivalent = await prepareEvidenceImport({
      format: "TEXT",
      content: bytes("Café\nDecision\n")
    });
    const markdown = await prepareEvidenceImport({
      format: "MARKDOWN",
      content: bytes("Café\nDecision\n")
    });

    expect(first.normalizedContent).toBe("Café\nDecision\n");
    expect(equivalent).toMatchObject({
      normalizedContent: first.normalizedContent,
      contentDigest: first.contentDigest
    });
    expect(first.contentDigest).toBe(
      "sha256:4bf394f2af964482896e942b4dc371a904a6418ad01aeb51e20a7d0b30192b45"
    );
    expect(markdown.contentDigest).not.toBe(first.contentDigest);
  });

  it("canonicalizes JSON key order, Unicode, line endings, and numeric spelling", async () => {
    const first = await prepareEvidenceImport({
      format: "JSON",
      content: bytes('{"z":"Cafe\\u0301\\r\\nnext","a":1.0,"nested":{"b":2,"a":1}}')
    });
    const equivalent = await prepareEvidenceImport({
      format: "JSON",
      content: bytes('{ "nested": { "a": 1, "b": 2 }, "a": 1, "z": "Café\\nnext" }')
    });

    expect(first.normalizedContent).toBe(
      '{"a":1,"nested":{"a":1,"b":2},"z":"Café\\nnext"}'
    );
    expect(equivalent.contentDigest).toBe(first.contentDigest);
    expect(equivalent.normalizedContent).toBe(first.normalizedContent);
  });

  it("redacts a deterministic text secret corpus without returning secret material", async () => {
    const corpus = [
      "-----BEGIN PRIVATE KEY-----",
      "YWJjZGVmZw==",
      "-----END PRIVATE KEY-----",
      "openai=sk-proj-abcdefghijklmnopqrstuv",
      `github=ghp_${"a".repeat(24)}`,
      `npm=npm_${"b".repeat(24)}`,
      `slack=xoxb-${"c".repeat(20)}`,
      `aws=AKIA${"D".repeat(16)}`,
      "jwt=eyJaaaaaaaaaa.eyJbbbbbbbbbb.cccccccccccc",
      "Authorization: Bearer abcdefghijklmnop",
      "url=https://fixture-user:fixture-password@example.invalid/path",
      "password=hunter2"
    ].join("\n");

    const prepared = await prepareEvidenceImport({
      format: "TEXT",
      content: bytes(corpus)
    });

    for (const sentinel of [
      "YWJjZGVmZw",
      "abcdefghijklmnopqrstuv",
      "ghp_",
      "npm_",
      "xoxb-",
      `AKIA${"D".repeat(16)}`,
      "eyJaaaaaaaaaa",
      "abcdefghijklmnop",
      "fixture-password",
      "hunter2"
    ]) {
      expect(prepared.normalizedContent).not.toContain(sentinel);
      expect(JSON.stringify(prepared)).not.toContain(sentinel);
    }
    expect(prepared.redaction.applied).toBe(true);
    expect(prepared.redaction.totalReplacements).toBe(10);
    expect(prepared.redaction.ruleCounts.map((entry) => entry.rule)).toEqual([
      "PRIVATE_KEY",
      "OPENAI_TOKEN",
      "GITHUB_TOKEN",
      "SERVICE_TOKEN",
      "SLACK_TOKEN",
      "AWS_ACCESS_KEY",
      "JWT",
      "AUTHORIZATION",
      "URI_CREDENTIAL",
      "GENERIC_SECRET_ASSIGNMENT"
    ]);
  });

  it("redacts secret-bearing JSON keys and patterns while preserving valid structure", async () => {
    const prepared = await prepareEvidenceImport({
      format: "JSON",
      content: bytes(
        JSON.stringify({
          password: "json-password-sentinel",
          nested: {
            api_key: "json-api-key-sentinel",
            note: "Bearer abcdefghijklmnop"
          },
          safe: true
        })
      )
    });

    expect(JSON.parse(prepared.normalizedContent)).toEqual({
      nested: {
        api_key: "[REDACTED:JSON_SECRET_KEY]",
        note: "Bearer [REDACTED:AUTHORIZATION]"
      },
      password: "[REDACTED:JSON_SECRET_KEY]",
      safe: true
    });
    expect(JSON.stringify(prepared)).not.toContain("json-password-sentinel");
    expect(JSON.stringify(prepared)).not.toContain("json-api-key-sentinel");
    expect(prepared.redaction).toMatchObject({
      applied: true,
      totalReplacements: 3,
      ruleCounts: [
        { rule: "JSON_SECRET_KEY", replacements: 2 },
        { rule: "AUTHORIZATION", replacements: 1 }
      ]
    });
  });

  it.each(["HTML", "PDF", "YAML", "ZIP", "BINARY"])(
    "rejects denied format %s before reading content",
    async (format) => {
      const error = await expectCode(
        () =>
          prepareEvidenceImport({
            format: format as EvidenceImportFormat,
            content: bytes("denied")
          }),
        "EVIDENCE_FORMAT_UNSUPPORTED"
      );
      expect(String(error)).not.toContain("denied");
    }
  );

  it("rejects obvious denied file signatures even when mislabeled as text", async () => {
    await expectCode(
      () => prepareEvidenceImport({ format: "TEXT", content: bytes("%PDF-1.7") }),
      "EVIDENCE_CONTENT_SIGNATURE_DENIED"
    );
    await expectCode(
      () =>
        prepareEvidenceImport({
          format: "MARKDOWN",
          content: Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x61])
        }),
      "EVIDENCE_CONTENT_SIGNATURE_DENIED"
    );
    await expectCode(
      () =>
        prepareEvidenceImport({
          format: "TEXT",
          content: Uint8Array.from([
            0xef,
            0xbb,
            0xbf,
            0x25,
            0x50,
            0x44,
            0x46,
            0x2d
          ])
        }),
      "EVIDENCE_CONTENT_SIGNATURE_DENIED"
    );
  });

  it("rejects invalid content types, empty input, malformed UTF-8 and controls", async () => {
    await expectCode(
      () =>
        prepareEvidenceImport({
          format: "TEXT",
          content: "not-bytes" as unknown as Uint8Array
        }),
      "EVIDENCE_CONTENT_TYPE_INVALID"
    );
    await expectCode(
      () => prepareEvidenceImport({ format: "TEXT", content: new Uint8Array() }),
      "EVIDENCE_EMPTY"
    );
    await expectCode(
      () => prepareEvidenceImport({ format: "TEXT", content: bytes(" \r\n\t ") }),
      "EVIDENCE_EMPTY"
    );
    await expectCode(
      () =>
        prepareEvidenceImport({
          format: "TEXT",
          content: Uint8Array.from([0xc3, 0x28])
        }),
      "EVIDENCE_UTF8_INVALID"
    );
    await expectCode(
      () => prepareEvidenceImport({ format: "TEXT", content: bytes("a\0b") }),
      "EVIDENCE_CONTROL_CHARACTER_INVALID"
    );
  });

  it("accepts the exact byte ceiling and rejects one byte beyond it", async () => {
    const exact = new Uint8Array(MAXIMUM_EVIDENCE_INPUT_BYTES).fill(0x61);
    const accepted = await prepareEvidenceImport({ format: "TEXT", content: exact });
    expect(accepted.inputByteCount).toBe(MAXIMUM_EVIDENCE_INPUT_BYTES);
    expect(accepted.normalizedByteCount).toBe(MAXIMUM_EVIDENCE_INPUT_BYTES);

    await expectCode(
      () =>
        prepareEvidenceImport({
          format: "TEXT",
          content: new Uint8Array(MAXIMUM_EVIDENCE_INPUT_BYTES + 1).fill(0x61)
        }),
      "EVIDENCE_INPUT_TOO_LARGE"
    );
  });

  it("rejects redaction expansion beyond the normalized output ceiling", async () => {
    const expanding = "password=xxxx\n".repeat(10_000);
    expect(bytes(expanding).byteLength).toBeLessThan(MAXIMUM_EVIDENCE_INPUT_BYTES);
    await expectCode(
      () => prepareEvidenceImport({ format: "TEXT", content: bytes(expanding) }),
      "EVIDENCE_NORMALIZED_TOO_LARGE"
    );
  });

  it.each([
    '{"trailing":true,}',
    '{"duplicate":1,"duplicate":2}',
    '{"é":1,"é":2}',
    '{"bad":1e999}',
    '{"unpaired":"\\ud800"}'
  ])("rejects malformed or ambiguous JSON atomically", async (content) => {
    let output: PreparedEvidenceImport | undefined;
    const input = bytes(content);
    const before = Uint8Array.from(input);
    const error = await expectCode(async () => {
      output = await prepareEvidenceImport({ format: "JSON", content: input });
    }, "EVIDENCE_JSON_INVALID");

    expect(output).toBeUndefined();
    expect(input).toEqual(before);
    expect(String(error)).not.toContain("duplicate");
    expect(String(error)).not.toContain("unpaired");
  });

  it.each(["null", "true", "42", '"text"'])(
    "rejects JSON top-level scalar %s",
    async (content) => {
      await expectCode(
        () => prepareEvidenceImport({ format: "JSON", content: bytes(content) }),
        "EVIDENCE_JSON_TYPE_INVALID"
      );
    }
  );

  it("rejects JSON depth and node limits before producing output", async () => {
    const tooDeep = `${"[".repeat(MAXIMUM_EVIDENCE_JSON_DEPTH + 1)}0${"]".repeat(
      MAXIMUM_EVIDENCE_JSON_DEPTH + 1
    )}`;
    await expectCode(
      () => prepareEvidenceImport({ format: "JSON", content: bytes(tooDeep) }),
      "EVIDENCE_JSON_LIMIT_EXCEEDED"
    );

    const tooManyNodes = `[${new Array(MAXIMUM_EVIDENCE_JSON_NODES)
      .fill("0")
      .join(",")}]`;
    await expectCode(
      () =>
        prepareEvidenceImport({ format: "JSON", content: bytes(tooManyNodes) }),
      "EVIDENCE_JSON_LIMIT_EXCEEDED"
    );
  });

  it("returns a deeply frozen result and does not mutate caller bytes", async () => {
    const input = bytes("token=abcdefghijklmnop\n");
    const before = Uint8Array.from(input);
    const prepared = await prepareEvidenceImport({ format: "TEXT", content: input });

    expect(input).toEqual(before);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.redaction)).toBe(true);
    expect(Object.isFrozen(prepared.redaction.ruleCounts)).toBe(true);
    expect(Object.isFrozen(prepared.redaction.ruleCounts[0])).toBe(true);
  });
});
