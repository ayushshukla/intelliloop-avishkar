import {
  MAXIMUM_RUNTIME_OBSERVATION_INPUT_BYTES,
  RuntimeObservationError,
  createClock,
  createEvidenceSource,
  createRuntimeObservation,
  createStableIdGenerator,
  prepareRuntimeObservationImport
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const S1 = "00000000-0000-4000-8000-000000000041";
const O1 = "00000000-0000-4000-8000-000000000081";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "runtime-observation-summary.v1",
    subject: "checkout-api",
    environment: "PRODUCTION",
    observationKind: "http-request-summary",
    observedFromUtc: "2026-08-04T09:00:00.000Z",
    observedUntilUtc: "2026-08-04T09:05:00.000Z",
    sampleCount: 200,
    measurements: [
      { name: "error-rate", unit: "RATIO", value: 0.02 },
      { name: "p95-latency", unit: "MILLISECONDS", value: 180 }
    ],
    ...overrides
  };
}

async function sourceFor(input = summary()) {
  const prepared = await prepareRuntimeObservationImport(input);
  return createEvidenceSource(
    {
      projectId: P1 as never,
      missionId: M1 as never,
      origin: "USER_INPUT",
      sourceLocator: "runtime-summary:checkout/2026-08-04",
      sourceRevision: "capture-7",
      effectiveAtUtc: prepared.summary.observedUntilUtc,
      extractionMethod: "DIRECT_IMPORT",
      epistemicLabel: "FACT",
      prepared: prepared.prepared
    },
    {
      ids: createStableIdGenerator(() => S1),
      clock: createClock(() => new Date("2026-08-04T10:00:00.000Z"))
    }
  ).then((source) => ({ source, prepared }));
}

function expectCode(operation: () => Promise<unknown>, code: string) {
  return expect(operation()).rejects.toMatchObject({
    name: "RuntimeObservationError",
    code
  });
}

describe("runtime observation summaries", () => {
  it("prepares bounded canonical JSON and creates an immutable attributed observation", async () => {
    const { source, prepared } = await sourceFor();
    const observation = await createRuntimeObservation(
      source,
      prepared.summary,
      createStableIdGenerator(() => O1)
    );

    expect(prepared.prepared.format).toBe("JSON");
    expect(prepared.prepared.normalizedContent).toBe(
      '{"environment":"PRODUCTION","measurements":[{"name":"error-rate","unit":"RATIO","value":0.02},{"name":"p95-latency","unit":"MILLISECONDS","value":180}],"observationKind":"http-request-summary","observedFromUtc":"2026-08-04T09:00:00.000Z","observedUntilUtc":"2026-08-04T09:05:00.000Z","sampleCount":200,"schemaVersion":"runtime-observation-summary.v1","subject":"checkout-api"}'
    );
    expect(observation).toMatchObject({
      runtimeObservationId: O1,
      projectId: P1,
      missionId: M1,
      evidenceSourceId: S1,
      recordedAtUtc: "2026-08-04T10:00:00.000Z"
    });
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.summary.measurements)).toBe(true);
  });

  it("rejects unsupported, readiness-shaped, unsorted and invalid-unit summaries", async () => {
    await expectCode(
      () => prepareRuntimeObservationImport(summary({ schemaVersion: "v2" })),
      "RUNTIME_OBSERVATION_SCHEMA_UNSUPPORTED"
    );
    await expectCode(
      () =>
        prepareRuntimeObservationImport({
          ...summary(),
          readiness: "READY"
        }),
      "RUNTIME_OBSERVATION_INPUT_INVALID"
    );
    await expectCode(
      () =>
        prepareRuntimeObservationImport(
          summary({
            measurements: [
              { name: "z", unit: "COUNT", value: 1 },
              { name: "a", unit: "COUNT", value: 1 }
            ]
          })
        ),
      "RUNTIME_OBSERVATION_VALUE_INVALID"
    );
    await expectCode(
      () =>
        prepareRuntimeObservationImport(
          summary({ measurements: [{ name: "x", unit: "READY", value: 1 }] })
        ),
      "RUNTIME_OBSERVATION_VALUE_INVALID"
    );
  });

  it("rejects excessive size, measurement count and observation windows", async () => {
    await expectCode(
      () =>
        prepareRuntimeObservationImport({
          ...summary(),
          unknown: "x".repeat(MAXIMUM_RUNTIME_OBSERVATION_INPUT_BYTES)
        }),
      "RUNTIME_OBSERVATION_SIZE_LIMIT"
    );
    await expectCode(
      () =>
        prepareRuntimeObservationImport(
          summary({
            measurements: Array.from({ length: 33 }, (_, index) => ({
              name: `metric-${String(index).padStart(2, "0")}`,
              unit: "COUNT",
              value: index
            }))
          })
        ),
      "RUNTIME_OBSERVATION_SIZE_LIMIT"
    );
    await expectCode(
      () =>
        prepareRuntimeObservationImport(
          summary({ observedFromUtc: "2026-06-01T09:00:00.000Z" })
        ),
      "RUNTIME_OBSERVATION_WINDOW_INVALID"
    );
  });

  it("rejects future windows and non-observation source origins", async () => {
    const { source, prepared } = await sourceFor();
    const futureSource = Object.freeze({
      ...source,
      recordedAtUtc: "2026-08-04T09:04:00.000Z" as never
    });
    await expectCode(
      () =>
        createRuntimeObservation(
          futureSource,
          prepared.summary,
          createStableIdGenerator(() => O1)
        ),
      "RUNTIME_OBSERVATION_SOURCE_INVALID"
    );

    const advisorySource = await createEvidenceSource(
      {
        projectId: P1 as never,
        missionId: M1 as never,
        origin: "AI_ADVISORY",
        sourceLocator: "runtime-summary:checkout/2026-08-04",
        effectiveAtUtc: prepared.summary.observedUntilUtc,
        extractionMethod: "DIRECT_IMPORT",
        epistemicLabel: "INFERENCE",
        prepared: prepared.prepared
      },
      {
        ids: createStableIdGenerator(() => S1),
        clock: createClock(() => new Date("2026-08-04T10:00:00.000Z"))
      }
    );
    await expectCode(
      () =>
        createRuntimeObservation(
          advisorySource,
          prepared.summary,
          createStableIdGenerator(() => O1)
        ),
      "RUNTIME_OBSERVATION_SOURCE_INVALID"
    );
  });

  it("uses non-revealing stable errors", () => {
    const error = new RuntimeObservationError(
      "RUNTIME_OBSERVATION_INPUT_INVALID"
    );
    expect(String(error)).toBe(
      "RuntimeObservationError: Runtime observation input is invalid."
    );
  });
});
