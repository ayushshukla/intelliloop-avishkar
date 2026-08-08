import type { SqlMigration } from "../migration.js";

export const MIGRATION_009_CODE_MAP_REVISIONS: SqlMigration = Object.freeze({
  version: 9,
  name: "code_map_revisions",
  sql: `
CREATE TABLE code_map_revisions (
  projection_id TEXT NOT NULL CHECK (length(projection_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  registration_id TEXT NOT NULL CHECK (length(registration_id) = 36),
  snapshot_id TEXT NOT NULL CHECK (length(snapshot_id) = 36),
  revision INTEGER NOT NULL CHECK (revision > 0),
  projection_version TEXT NOT NULL CHECK (projection_version = 'code-map-projection.v1'),
  input_digest TEXT NOT NULL CHECK (
    length(input_digest) = 71 AND substr(input_digest, 1, 7) = 'sha256:' AND
    substr(input_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  snapshot_digest TEXT NOT NULL CHECK (
    length(snapshot_digest) = 71 AND substr(snapshot_digest, 1, 7) = 'sha256:' AND
    substr(snapshot_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  source_digest TEXT NOT NULL CHECK (
    length(source_digest) = 71 AND substr(source_digest, 1, 7) = 'sha256:' AND
    substr(source_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  projection_digest TEXT NOT NULL CHECK (
    length(projection_digest) = 71 AND substr(projection_digest, 1, 7) = 'sha256:' AND
    substr(projection_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  evidence_kind TEXT NOT NULL CHECK (
    evidence_kind IN ('STATIC_INFERENCE', 'DECLARED_INTELLILOOP_FIXTURE')
  ),
  inference_status TEXT NOT NULL CHECK (
    inference_status IN ('AVAILABLE', 'UNAVAILABLE_SAFE_FAILURE')
  ),
  completeness TEXT NOT NULL CHECK (
    completeness IN ('COMPLETE', 'PARTIAL', 'UNAVAILABLE')
  ),
  declared_manifest_id TEXT CHECK (
    declared_manifest_id IS NULL OR length(declared_manifest_id) BETWEEN 1 AND 128
  ),
  fallback_reason TEXT CHECK (
    fallback_reason IS NULL OR fallback_reason IN (
      'SCAN_LIMIT_OR_SAFE_FAILURE', 'EXTRACTION_LIMIT_OR_SAFE_FAILURE'
    )
  ),
  predecessor_revision INTEGER CHECK (
    predecessor_revision IS NULL OR predecessor_revision > 0
  ),
  predecessor_digest TEXT CHECK (
    predecessor_digest IS NULL OR (
      length(predecessor_digest) = 71 AND substr(predecessor_digest, 1, 7) = 'sha256:' AND
      substr(predecessor_digest, 8) NOT GLOB '*[^0-9a-f]*'
    )
  ),
  asset_count INTEGER NOT NULL CHECK (asset_count BETWEEN 0 AND 10000),
  edge_count INTEGER NOT NULL CHECK (edge_count BETWEEN 0 AND 50000),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 16777216 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.projectionVersion') = projection_version AND
    json_extract(canonical_json, '$.projectionId') = projection_id AND
    json_extract(canonical_json, '$.projectId') = project_id AND
    json_extract(canonical_json, '$.missionId') = mission_id AND
    json_extract(canonical_json, '$.registrationId') = registration_id AND
    json_extract(canonical_json, '$.snapshotId') = snapshot_id AND
    json_extract(canonical_json, '$.revision') = revision AND
    json_extract(canonical_json, '$.inputDigest') = input_digest AND
    json_extract(canonical_json, '$.snapshotDigest') = snapshot_digest AND
    json_extract(canonical_json, '$.sourceDigest') = source_digest AND
    json_extract(canonical_json, '$.projectionDigest') = projection_digest AND
    json_extract(canonical_json, '$.recordedAtUtc') = recorded_at_utc AND
    json_extract(canonical_json, '$.evidenceKind') = evidence_kind AND
    json_extract(canonical_json, '$.inferenceStatus') = inference_status AND
    json_extract(canonical_json, '$.completeness') = completeness AND
    json_array_length(canonical_json, '$.assets') = asset_count AND
    json_array_length(canonical_json, '$.edges') = edge_count
  ),
  PRIMARY KEY (projection_id, revision),
  UNIQUE (mission_id, revision),
  UNIQUE (projection_id, projection_digest),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (registration_id, project_id)
    REFERENCES repositories(registration_id, project_id),
  FOREIGN KEY (snapshot_id) REFERENCES git_snapshots(snapshot_id),
  FOREIGN KEY (projection_id, predecessor_revision)
    REFERENCES code_map_revisions(projection_id, revision),
  CHECK (
    (revision = 1 AND predecessor_revision IS NULL AND predecessor_digest IS NULL) OR
    (revision > 1 AND predecessor_revision = revision - 1 AND predecessor_digest IS NOT NULL)
  ),
  CHECK (
    (evidence_kind = 'STATIC_INFERENCE' AND inference_status = 'AVAILABLE' AND
      completeness IN ('COMPLETE', 'PARTIAL') AND declared_manifest_id IS NULL AND
      fallback_reason IS NULL) OR
    (evidence_kind = 'DECLARED_INTELLILOOP_FIXTURE' AND
      inference_status = 'UNAVAILABLE_SAFE_FAILURE' AND completeness = 'UNAVAILABLE' AND
      declared_manifest_id IS NOT NULL AND fallback_reason IS NOT NULL)
  )
) STRICT;

CREATE INDEX code_map_revisions_by_mission_and_revision
  ON code_map_revisions(mission_id, revision DESC);

CREATE TRIGGER code_map_revisions_validate_insert
BEFORE INSERT ON code_map_revisions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM git_snapshots snapshot
    WHERE snapshot.snapshot_id = NEW.snapshot_id
      AND snapshot.project_id = NEW.project_id
      AND snapshot.mission_id = NEW.mission_id
      AND snapshot.registration_id = NEW.registration_id
  ) THEN RAISE(ABORT, 'invalid code-map snapshot binding') END;
  SELECT CASE WHEN NEW.revision = 1 AND EXISTS (
    SELECT 1 FROM code_map_revisions WHERE mission_id = NEW.mission_id
  ) THEN RAISE(ABORT, 'invalid code-map first revision') END;
  SELECT CASE WHEN NEW.revision > 1 AND NOT EXISTS (
    SELECT 1 FROM code_map_revisions predecessor
    WHERE predecessor.projection_id = NEW.projection_id
      AND predecessor.project_id = NEW.project_id
      AND predecessor.mission_id = NEW.mission_id
      AND predecessor.revision = NEW.predecessor_revision
      AND predecessor.projection_digest = NEW.predecessor_digest
  ) THEN RAISE(ABORT, 'invalid code-map predecessor') END;
END;

CREATE TRIGGER code_map_revisions_reject_update
BEFORE UPDATE ON code_map_revisions
BEGIN
  SELECT RAISE(ABORT, 'code-map revisions are immutable');
END;

CREATE TRIGGER code_map_revisions_reject_delete
BEFORE DELETE ON code_map_revisions
BEGIN
  SELECT RAISE(ABORT, 'code-map revisions are immutable');
END;
`.trim()
});
