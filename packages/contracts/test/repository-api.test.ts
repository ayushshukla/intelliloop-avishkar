import { describe, expect, it } from "vitest";

import {
  createRepositoryResponse,
  toRepositoryResource
} from "../src/index.js";

const registration = Object.freeze({
  registrationId: "00000000-0000-4000-8000-000000000021",
  projectId: "00000000-0000-4000-8000-000000000001",
  canonicalRoot: "C:\\private\\controlled-repository",
  accessMode: "READ_ONLY" as const,
  registeredAtUtc: "2026-08-04T00:01:00.000Z"
});

describe("repository registration API contract", () => {
  it("serializes a path-free, versioned read-only resource", () => {
    expect(createRepositoryResponse(registration)).toEqual({
      apiVersion: "v1",
      repository: {
        registrationId: registration.registrationId,
        projectId: registration.projectId,
        repositoryKind: "LOCAL_GIT",
        accessMode: "READ_ONLY",
        registeredAtUtc: registration.registeredAtUtc
      }
    });
    expect(toRepositoryResource(registration)).not.toHaveProperty("canonicalRoot");
  });
});
