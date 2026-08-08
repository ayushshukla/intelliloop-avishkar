import type { SqlMigration } from "../migration.js";

export const MIGRATION_004_GIT_SNAPSHOTS: SqlMigration = Object.freeze({
  version: 4,
  name: "git_snapshots",
  sql: `
CREATE UNIQUE INDEX repositories_by_registration_and_project
  ON repositories(registration_id, project_id);

CREATE TABLE git_snapshots (
  snapshot_id TEXT PRIMARY KEY NOT NULL CHECK (length(snapshot_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  registration_id TEXT NOT NULL CHECK (length(registration_id) = 36),
  captured_at_utc TEXT NOT NULL CHECK (length(captured_at_utc) = 24),
  head_state TEXT NOT NULL CHECK (head_state IN ('ATTACHED', 'DETACHED', 'UNBORN')),
  branch_name TEXT CHECK (branch_name IS NULL OR length(branch_name) BETWEEN 1 AND 255),
  head_commit TEXT CHECK (head_commit IS NULL OR length(head_commit) IN (40, 64)),
  is_dirty INTEGER NOT NULL CHECK (is_dirty IN (0, 1)),
  index_change_count INTEGER NOT NULL CHECK (index_change_count >= 0),
  worktree_change_count INTEGER NOT NULL CHECK (worktree_change_count >= 0),
  untracked_file_count INTEGER NOT NULL CHECK (untracked_file_count >= 0),
  changed_file_count INTEGER NOT NULL CHECK (changed_file_count >= 0),
  changed_files_digest TEXT NOT NULL CHECK (
    length(changed_files_digest) = 71 AND
    substr(changed_files_digest, 1, 7) = 'sha256:' AND
    substr(changed_files_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (registration_id, project_id)
    REFERENCES repositories(registration_id, project_id),
  CHECK (
    (head_state = 'ATTACHED' AND branch_name IS NOT NULL AND head_commit IS NOT NULL) OR
    (head_state = 'DETACHED' AND branch_name IS NULL AND head_commit IS NOT NULL) OR
    (head_state = 'UNBORN' AND branch_name IS NOT NULL AND head_commit IS NULL)
  ),
  CHECK (is_dirty = CASE WHEN changed_file_count = 0 THEN 0 ELSE 1 END),
  CHECK (index_change_count <= changed_file_count),
  CHECK (worktree_change_count <= changed_file_count),
  CHECK (untracked_file_count <= changed_file_count)
) STRICT;

CREATE INDEX git_snapshots_by_mission_and_id
  ON git_snapshots(mission_id, snapshot_id);

CREATE TRIGGER git_snapshots_reject_update
BEFORE UPDATE ON git_snapshots
BEGIN
  SELECT RAISE(ABORT, 'git snapshots are immutable');
END;

CREATE TRIGGER git_snapshots_reject_delete
BEFORE DELETE ON git_snapshots
BEGIN
  SELECT RAISE(ABORT, 'git snapshots are immutable');
END;
`.trim()
});
