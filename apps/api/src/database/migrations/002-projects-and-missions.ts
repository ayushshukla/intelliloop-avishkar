import type { SqlMigration } from "../migration.js";

export const MIGRATION_002_PROJECTS_AND_MISSIONS: SqlMigration = Object.freeze({
  version: 2,
  name: "projects_and_missions",
  sql: `
CREATE TABLE project_revisions (
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  revision INTEGER NOT NULL CHECK (revision > 0),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('ACTIVE', 'ARCHIVED')),
  created_at_utc TEXT NOT NULL CHECK (length(created_at_utc) = 24),
  updated_at_utc TEXT NOT NULL CHECK (length(updated_at_utc) = 24),
  archived_at_utc TEXT CHECK (archived_at_utc IS NULL OR length(archived_at_utc) = 24),
  PRIMARY KEY (project_id, revision),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) DEFERRABLE INITIALLY DEFERRED,
  CHECK (updated_at_utc >= created_at_utc),
  CHECK (
    (lifecycle_status = 'ACTIVE' AND archived_at_utc IS NULL) OR
    (lifecycle_status = 'ARCHIVED' AND archived_at_utc = updated_at_utc)
  )
) STRICT;

CREATE TABLE projects (
  project_id TEXT PRIMARY KEY NOT NULL CHECK (length(project_id) = 36),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('ACTIVE', 'ARCHIVED')),
  created_at_utc TEXT NOT NULL CHECK (length(created_at_utc) = 24),
  updated_at_utc TEXT NOT NULL CHECK (length(updated_at_utc) = 24),
  FOREIGN KEY (project_id, current_revision)
    REFERENCES project_revisions(project_id, revision)
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (updated_at_utc >= created_at_utc)
) STRICT;

CREATE TABLE mission_revisions (
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  revision INTEGER NOT NULL CHECK (revision > 0),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('CURRENT', 'ARCHIVED')),
  created_at_utc TEXT NOT NULL CHECK (length(created_at_utc) = 24),
  updated_at_utc TEXT NOT NULL CHECK (length(updated_at_utc) = 24),
  archived_at_utc TEXT CHECK (archived_at_utc IS NULL OR length(archived_at_utc) = 24),
  PRIMARY KEY (mission_id, revision),
  FOREIGN KEY (mission_id, project_id)
    REFERENCES missions(mission_id, project_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  CHECK (updated_at_utc >= created_at_utc),
  CHECK (
    (lifecycle_status = 'CURRENT' AND archived_at_utc IS NULL) OR
    (lifecycle_status = 'ARCHIVED' AND archived_at_utc = updated_at_utc)
  )
) STRICT;

CREATE TABLE missions (
  mission_id TEXT PRIMARY KEY NOT NULL CHECK (length(mission_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('CURRENT', 'ARCHIVED')),
  created_at_utc TEXT NOT NULL CHECK (length(created_at_utc) = 24),
  updated_at_utc TEXT NOT NULL CHECK (length(updated_at_utc) = 24),
  UNIQUE (mission_id, project_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, current_revision)
    REFERENCES mission_revisions(mission_id, revision)
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (updated_at_utc >= created_at_utc)
) STRICT;

CREATE UNIQUE INDEX one_current_mission_per_project
  ON missions(project_id)
  WHERE lifecycle_status = 'CURRENT';

CREATE INDEX project_revisions_by_time
  ON project_revisions(project_id, revision DESC);

CREATE INDEX missions_by_project_and_id
  ON missions(project_id, mission_id);

CREATE INDEX mission_revisions_by_time
  ON mission_revisions(mission_id, revision DESC);
`.trim()
});
