import { existsSync } from "node:fs";

import { createClock, createStableIdGenerator, parseStableId } from "@intelliloop/domain";

import { openFoundationDatabase } from "../../src/database/database-lifecycle.js";
import { SqliteProjectRepository } from "../../src/projects/project-repository.js";

const [filePath, barrierPath, projectValue, missionValue] = process.argv.slice(2);

if (
  filePath === undefined ||
  barrierPath === undefined ||
  projectValue === undefined ||
  missionValue === undefined
) {
  process.stderr.write("MISSION_CHILD_INPUT_INVALID");
  process.exitCode = 1;
} else {
  while (!existsSync(barrierPath)) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  const database = openFoundationDatabase({ filePath });
  try {
    const repository = new SqliteProjectRepository(database.connection, {
      ids: createStableIdGenerator(() => missionValue),
      clock: createClock(() => new Date("2026-08-04T00:01:00.000Z"))
    });
    const mission = repository.createMission(
      parseStableId<"PROJECT">(projectValue),
      "Concurrent mission"
    );
    process.stdout.write(`created:${mission.missionId}`);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "UNKNOWN";
    process.stdout.write(`rejected:${code}`);
  } finally {
    database.close();
  }
}
