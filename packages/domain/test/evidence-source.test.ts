import { describe, expect, it } from "vitest";

import {
  EvidenceSourceError,
  assertEvidenceTimelineEventInvariant,
  createClock,
  createEvidenceSource,
  createEvidenceTimelineEvent,
  createStableIdGenerator,
  parseStableId,
  prepareEvidenceImport,
  type CreateEvidenceSourceInput,
  type EvidenceSourceDependencies,
  type PreparedEvidenceImport
} from "../src/index.js";

const PROJECT = parseStableId<"PROJECT">(
  "00000000-0000-4000-8000-000000000001"
);
const MISSION = parseStableId<"MISSION">(
  "00000000-0000-4000-8000-000000000011"
);
const SOURCE_1 = "00000000-0000-4000-8000-000000000041";
const SOURCE_2 = "00000000-0000-4000-8000-000000000042";
const EVENT_1 = "00000000-0000-4000-8000-000000000051";
const T0 = "2026-08-04T10:00:00.000Z";
const T1 = "2026-08-04T11:00:00.000Z";
const encoder = new TextEncoder();

function dependencies(id: string, time = T0): EvidenceSourceDependencies {
  return {
    ids: createStableIdGenerator(() => id),
    clock: createClock(() => new Date(time))
  };
}

async function prepared(
  content = "Decision: cancel before dispatch.\npassword=fixture-secret\n"
): Promise<PreparedEvidenceImport> {
  return prepareEvidenceImport({
    format: "MARKDOWN",
    content: encoder.encode(content)
  });
}

async function input(
  overrides: Partial<CreateEvidenceSourceInput> = {}
): Promise<CreateEvidenceSourceInput> {
  return {
    projectId: PROJECT,
    missionId: MISSION,
    origin: "USER_INPUT",
    sourceLocator: "manual:requirements/cancellation-v2",
    sourceRevision: "requirements-v2",
    effectiveAtUtc: "2026-08-01T00:00:00.000Z",
    extractionMethod: "DIRECT_IMPORT",
    epistemicLabel: "FACT",
    prepared: await prepared(),
    ...overrides
  };
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: EvidenceSourceError["code"]
): Promise<EvidenceSourceError> {
  try {
    await operation();
    throw new Error("Expected evidence source rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(EvidenceSourceError);
    expect(error).toMatchObject({ code });
    if (!(error instanceof EvidenceSourceError)) throw error;
    return error;
  }
}

describe("EvidenceSource domain", () => {
  it("creates immutable attributed evidence from the redacted prepared value", async () => {
    const source = await createEvidenceSource(
      await input(),
      dependencies(SOURCE_1)
    );

    expect(source).toMatchObject({
      entityType: "EvidenceSource",
      evidenceSourceId: SOURCE_1,
      projectId: PROJECT,
      missionId: MISSION,
      origin: "USER_INPUT",
      sourceLocator: "manual:requirements/cancellation-v2",
      sourceRevision: "requirements-v2",
      recordedAtUtc: T0,
      effectiveAtUtc: "2026-08-01T00:00:00.000Z",
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT"
    });
    expect(source.importKey).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(source.prepared.normalizedContent).not.toContain("fixture-secret");
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.prepared)).toBe(true);
    expect(Object.isFrozen(source.prepared.redaction.ruleCounts)).toBe(true);
  });

  it("derives the same import key independently of generated ID and record time", async () => {
    const first = await createEvidenceSource(
      await input(),
      dependencies(SOURCE_1, T0)
    );
    const second = await createEvidenceSource(
      await input(),
      dependencies(SOURCE_2, T1)
    );

    expect(second.importKey).toBe(first.importKey);
    expect(second.evidenceSourceId).not.toBe(first.evidenceSourceId);
    expect(second.recordedAtUtc).not.toBe(first.recordedAtUtc);
  });

  it("frames scope, locator, revision and effective time into idempotency", async () => {
    const baseline = await createEvidenceSource(
      await input(),
      dependencies(SOURCE_1)
    );
    for (const changed of [
      await input({
        missionId: parseStableId<"MISSION">(
          "00000000-0000-4000-8000-000000000012"
        )
      }),
      await input({ sourceLocator: "manual:requirements/cancellation-v3" }),
      await input({ sourceRevision: "requirements-v3" }),
      await input({ effectiveAtUtc: "2026-08-02T00:00:00.000Z" })
    ]) {
      const source = await createEvidenceSource(
        changed,
        dependencies(SOURCE_2)
      );
      expect(source.importKey).not.toBe(baseline.importKey);
    }
  });

  it.each([
    "C:\\private\\requirements.md",
    "/private/requirements.md",
    "https:user@host/path",
    "manual:requirements/../secret",
    "manual:requirements//v2"
  ])("rejects unsafe or non-logical locator %s without echoing it", async (locator) => {
    const error = await expectCode(
      () =>
        input({ sourceLocator: locator }).then((value) =>
          createEvidenceSource(value, dependencies(SOURCE_1))
        ),
      "EVIDENCE_SOURCE_LOCATOR_INVALID"
    );
    expect(String(error)).not.toContain(locator);
  });

  it("rejects forged prepared content and redaction metadata", async () => {
    const valid = await prepared();
    await expectCode(
      () =>
        input({
          prepared: {
            ...valid,
            normalizedContent: `${valid.normalizedContent}tampered`
          }
        }).then((value) => createEvidenceSource(value, dependencies(SOURCE_1))),
      "EVIDENCE_PREPARED_VALUE_INVALID"
    );
    await expectCode(
      () =>
        input({
          prepared: {
            ...valid,
            redaction: { ...valid.redaction, totalReplacements: 99 }
          }
        }).then((value) => createEvidenceSource(value, dependencies(SOURCE_1))),
      "EVIDENCE_PREPARED_VALUE_INVALID"
    );
  });

  it("creates a scoped immutable timeline event and rejects forged linkage", async () => {
    const source = await createEvidenceSource(
      await input(),
      dependencies(SOURCE_1)
    );
    const event = createEvidenceTimelineEvent(
      source,
      1,
      createStableIdGenerator(() => EVENT_1)
    );

    expect(event).toEqual({
      entityType: "EvidenceTimelineEvent",
      timelineEventId: EVENT_1,
      projectId: PROJECT,
      missionId: MISSION,
      sequence: 1,
      eventType: "EVIDENCE_IMPORTED",
      evidenceSourceId: SOURCE_1,
      occurredAtUtc: T0
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(() =>
      assertEvidenceTimelineEventInvariant(
        { ...event, missionId: parseStableId<"MISSION">(
          "00000000-0000-4000-8000-000000000012"
        ) },
        source
      )
    ).toThrowError(
      expect.objectContaining({ code: "EVIDENCE_TIMELINE_EVENT_INVALID" })
    );
  });

  it("rejects unsupported attribution variants with stable errors", async () => {
    await expectCode(
      () =>
        input({ extractionMethod: "MODEL_EXTRACTION" as "DIRECT_IMPORT" }).then(
          (value) => createEvidenceSource(value, dependencies(SOURCE_1))
        ),
      "EVIDENCE_EXTRACTION_METHOD_INVALID"
    );
    await expectCode(
      () =>
        input({ sourceRevision: " revision with spaces " }).then((value) =>
          createEvidenceSource(value, dependencies(SOURCE_1))
        ),
      "EVIDENCE_SOURCE_REVISION_INVALID"
    );
  });
});
