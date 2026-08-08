import type { SqlMigration } from "../migration.js";

export const MIGRATION_001_SCHEMA_HISTORY: SqlMigration = Object.freeze({
  version: 1,
  name: "schema_history_foundation",
  sql: `
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL CHECK (version > 0),
  name TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 128),
  checksum TEXT NOT NULL CHECK (
    length(checksum) = 71 AND
    substr(checksum, 1, 7) = 'sha256:'
  ),
  applied_at_utc TEXT NOT NULL CHECK (length(applied_at_utc) = 24)
) STRICT;
`.trim()
});
