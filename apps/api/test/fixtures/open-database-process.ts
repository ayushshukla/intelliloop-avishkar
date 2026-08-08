import { existsSync } from "node:fs";

import { openFoundationDatabase } from "../../src/database/database-lifecycle.js";

const filePath = process.argv[2];
const barrierPath = process.argv[3];

if (filePath === undefined || barrierPath === undefined) {
  process.stderr.write("DATABASE_CHILD_INPUT_INVALID");
  process.exitCode = 1;
} else {
  while (!existsSync(barrierPath)) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  try {
    const database = openFoundationDatabase({ filePath });
    process.stdout.write(String(database.schemaVersion));
    database.close();
  } catch {
    process.stderr.write("DATABASE_CHILD_START_FAILED");
    process.exitCode = 1;
  }
}
