import { describe, expect, it } from "vitest";

import {
  createClock,
  createGitSnapshot,
  createStableIdGenerator,
  parseStableId,
  type GitChangeEntry,
  type ProjectDomainDependencies
} from "../src/index.js";

const SNAPSHOT = "00000000-0000-4000-8000-000000000031";
const PROJECT = parseStableId<"PROJECT">("00000000-0000-4000-8000-000000000001");
const MISSION = parseStableId<"MISSION">("00000000-0000-4000-8000-000000000011");
const REGISTRATION = parseStableId<"REPOSITORY_REGISTRATION">(
  "00000000-0000-4000-8000-000000000021"
);
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

function dependencies(): ProjectDomainDependencies {
  return {
    ids: createStableIdGenerator(() => SNAPSHOT),
    clock: createClock(() => new Date("2026-08-04T00:02:00.000Z"))
  };
}

function input(changes: readonly GitChangeEntry[]) {
  return {
    projectId: PROJECT,
    missionId: MISSION,
    registrationId: REGISTRATION,
    head: { state: "ATTACHED" as const, branchName: "main", headCommit: COMMIT },
    changes
  };
}

describe("immutable GitSnapshot domain", () => {
  it("creates a clean attached snapshot", async () => {
    const snapshot = await createGitSnapshot(input([]), dependencies());
    expect(snapshot).toMatchObject({
      snapshotId: SNAPSHOT,
      headState: "ATTACHED",
      branchName: "main",
      headCommit: COMMIT,
      dirty: false,
      indexChangeCount: 0,
      worktreeChangeCount: 0,
      untrackedFileCount: 0,
      changedFileCount: 0
    });
    expect(snapshot.changedFilesDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("derives stable counts and a digest independent of status order", async () => {
    const changes = [
      { indexStatus: "M", worktreeStatus: " ", path: "src/a.ts" },
      { indexStatus: "?", worktreeStatus: "?", path: "src/new.ts" },
      { indexStatus: " ", worktreeStatus: "M", path: "src/b.ts" }
    ];
    const first = await createGitSnapshot(input(changes), dependencies());
    const second = await createGitSnapshot(input([...changes].reverse()), dependencies());
    expect(first).toMatchObject({
      dirty: true,
      indexChangeCount: 1,
      worktreeChangeCount: 1,
      untrackedFileCount: 1,
      changedFileCount: 3
    });
    expect(second.changedFilesDigest).toBe(first.changedFilesDigest);
  });

  it("represents unborn and detached heads without ambiguous fields", async () => {
    const unborn = await createGitSnapshot(
      { ...input([]), head: { state: "UNBORN", branchName: "main" } },
      dependencies()
    );
    const detached = await createGitSnapshot(
      { ...input([]), head: { state: "DETACHED", headCommit: COMMIT } },
      dependencies()
    );
    expect(unborn).toMatchObject({ headState: "UNBORN", branchName: "main" });
    expect(unborn).not.toHaveProperty("headCommit");
    expect(detached).toMatchObject({ headState: "DETACHED", headCommit: COMMIT });
    expect(detached).not.toHaveProperty("branchName");
  });

  it("rejects invalid head and change metadata without echoing it", async () => {
    const sentinel = "INTELLILOOP_PRIVATE_PATH_SENTINEL";
    await expect(
      createGitSnapshot(
        {
          ...input([]),
          head: { state: "ATTACHED", branchName: sentinel, headCommit: "invalid" }
        },
        dependencies()
      )
    ).rejects.not.toThrow(sentinel);
    await expect(
      createGitSnapshot(
        input([{ indexStatus: "X", worktreeStatus: " ", path: sentinel }]),
        dependencies()
      )
    ).rejects.not.toThrow(sentinel);
  });
});
