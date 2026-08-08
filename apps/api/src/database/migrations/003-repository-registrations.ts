import type { SqlMigration } from "../migration.js";

export const MIGRATION_003_REPOSITORY_REGISTRATIONS: SqlMigration = Object.freeze({
  version: 3,
  name: "repository_registrations",
  sql: `
CREATE TABLE repositories (
  registration_id TEXT PRIMARY KEY NOT NULL CHECK (length(registration_id) = 36),
  project_id TEXT NOT NULL UNIQUE CHECK (length(project_id) = 36),
  canonical_root TEXT NOT NULL UNIQUE CHECK (length(canonical_root) BETWEEN 1 AND 4096),
  access_mode TEXT NOT NULL CHECK (access_mode = 'READ_ONLY'),
  registered_at_utc TEXT NOT NULL CHECK (length(registered_at_utc) = 24),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
) STRICT;

CREATE INDEX repositories_by_project
  ON repositories(project_id, registration_id);
`.trim()
});
