import type { SqlMigration } from "../migration.js";

export const MIGRATION_008_TWIN_REVISIONS: SqlMigration = Object.freeze({
  version: 8,
  name: "twin_revisions",
  sql: `
CREATE TABLE twin_revisions (
  projection_id TEXT NOT NULL CHECK (length(projection_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  revision INTEGER NOT NULL CHECK (revision > 0),
  projection_version TEXT NOT NULL CHECK (projection_version = 'twin-projection.v1'),
  input_digest TEXT NOT NULL CHECK (
    length(input_digest) = 71 AND
    substr(input_digest, 1, 7) = 'sha256:' AND
    substr(input_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  projection_digest TEXT NOT NULL CHECK (
    length(projection_digest) = 71 AND
    substr(projection_digest, 1, 7) = 'sha256:' AND
    substr(projection_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  predecessor_revision INTEGER CHECK (
    predecessor_revision IS NULL OR predecessor_revision > 0
  ),
  predecessor_digest TEXT CHECK (
    predecessor_digest IS NULL OR (
      length(predecessor_digest) = 71 AND
      substr(predecessor_digest, 1, 7) = 'sha256:' AND
      substr(predecessor_digest, 8) NOT GLOB '*[^0-9a-f]*'
    )
  ),
  node_count INTEGER NOT NULL CHECK (node_count BETWEEN 1 AND 10000),
  relationship_count INTEGER NOT NULL CHECK (
    relationship_count BETWEEN 1 AND 50000
  ),
  invalidation_count INTEGER NOT NULL CHECK (
    invalidation_count BETWEEN 0 AND 100000
  ),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 16777216 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.projectionVersion') = projection_version AND
    json_extract(canonical_json, '$.projectionId') = projection_id AND
    json_extract(canonical_json, '$.projectId') = project_id AND
    json_extract(canonical_json, '$.missionId') = mission_id AND
    json_extract(canonical_json, '$.revision') = revision AND
    json_extract(canonical_json, '$.inputDigest') = input_digest AND
    json_extract(canonical_json, '$.projectionDigest') = projection_digest AND
    json_extract(canonical_json, '$.recordedAtUtc') = recorded_at_utc AND
    json_array_length(canonical_json, '$.nodes') = node_count AND
    json_array_length(canonical_json, '$.relationships') = relationship_count AND
    json_array_length(canonical_json, '$.invalidations') = invalidation_count
  ),
  PRIMARY KEY (projection_id, revision),
  UNIQUE (mission_id, revision),
  UNIQUE (projection_id, projection_digest),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (projection_id, predecessor_revision)
    REFERENCES twin_revisions(projection_id, revision),
  CHECK (
    (revision = 1 AND predecessor_revision IS NULL AND predecessor_digest IS NULL) OR
    (revision > 1 AND predecessor_revision = revision - 1 AND predecessor_digest IS NOT NULL)
  )
) STRICT;

CREATE INDEX twin_revisions_by_mission_and_revision
  ON twin_revisions(mission_id, revision DESC);

CREATE TRIGGER twin_revisions_validate_insert
BEFORE INSERT ON twin_revisions
BEGIN
  SELECT CASE WHEN NEW.revision = 1 AND EXISTS (
    SELECT 1 FROM twin_revisions WHERE mission_id = NEW.mission_id
  ) THEN RAISE(ABORT, 'invalid twin first revision') END;
  SELECT CASE WHEN NEW.revision > 1 AND NOT EXISTS (
    SELECT 1
    FROM twin_revisions predecessor
    WHERE predecessor.projection_id = NEW.projection_id
      AND predecessor.project_id = NEW.project_id
      AND predecessor.mission_id = NEW.mission_id
      AND predecessor.revision = NEW.predecessor_revision
      AND predecessor.projection_digest = NEW.predecessor_digest
  ) THEN RAISE(ABORT, 'invalid twin predecessor') END;
END;

CREATE TRIGGER twin_revisions_reject_update
BEFORE UPDATE ON twin_revisions
BEGIN
  SELECT RAISE(ABORT, 'twin revisions are immutable');
END;

CREATE TRIGGER twin_revisions_reject_delete
BEFORE DELETE ON twin_revisions
BEGIN
  SELECT RAISE(ABORT, 'twin revisions are immutable');
END;
`.trim()
});
