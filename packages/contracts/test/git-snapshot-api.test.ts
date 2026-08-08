import {
  createClock,
  createGitSnapshot,
  createStableIdGenerator,
  parseStableId
} from "@intelliloop/domain";
import { describe, expect, it } from "vitest";

import {
  createGitSnapshotResponse,
  toGitSnapshotResource
} from "../src/index.js";

describe("Git snapshot API contract", () => {
  it("serializes immutable evidence without repository paths or changed filenames", async () => {
    const snapshot = await createGitSnapshot(
      {
        projectId: parseStableId<"PROJECT">(
          "00000000-0000-4000-8000-000000000001"
        ),
        missionId: parseStableId<"MISSION">(
          "00000000-0000-4000-8000-000000000011"
        ),
        registrationId: parseStableId<"REPOSITORY_REGISTRATION">(
          "00000000-0000-4000-8000-000000000021"
        ),
        head: {
          state: "ATTACHED",
          branchName: "main",
          headCommit: "a".repeat(40)
        },
        changes: [
          {
            indexStatus: "?",
            worktreeStatus: "?",
            path: "INTELLILOOP_PRIVATE_FILENAME.txt"
          }
        ]
      },
      {
        ids: createStableIdGenerator(
          () => "00000000-0000-4000-8000-000000000031"
        ),
        clock: createClock(() => new Date("2026-08-04T00:02:00.000Z"))
      }
    );

    const response = createGitSnapshotResponse(snapshot);
    expect(response).toEqual({
      apiVersion: "v1",
      snapshot: toGitSnapshotResource(snapshot)
    });
    expect(JSON.stringify(response)).not.toContain("INTELLILOOP_PRIVATE_FILENAME");
    expect(response.snapshot).not.toHaveProperty("changes");
    expect(response.snapshot).not.toHaveProperty("canonicalRoot");
  });
});
