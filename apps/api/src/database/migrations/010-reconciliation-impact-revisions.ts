import type { SqlMigration } from "../migration.js";

export const MIGRATION_010_RECONCILIATION_IMPACT_REVISIONS: SqlMigration =
  Object.freeze({
    version: 10,
    name: "reconciliation_impact_revisions",
    sql: `
CREATE TABLE reconciliation_impact_revisions (
  revision_key TEXT NOT NULL CHECK (
    length(revision_key) = 71 AND substr(revision_key, 1, 7) = 'sha256:' AND
    substr(revision_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  revision INTEGER NOT NULL CHECK (revision > 0),
  aggregate_version TEXT NOT NULL CHECK (
    aggregate_version = 'reconciliation-impact-revision.v1'
  ),
  input_digest TEXT NOT NULL CHECK (
    length(input_digest) = 71 AND substr(input_digest, 1, 7) = 'sha256:' AND
    substr(input_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  result_digest TEXT NOT NULL CHECK (
    length(result_digest) = 71 AND substr(result_digest, 1, 7) = 'sha256:' AND
    substr(result_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  twin_projection_id TEXT NOT NULL CHECK (length(twin_projection_id) = 36),
  twin_revision INTEGER NOT NULL CHECK (twin_revision > 0),
  twin_projection_digest TEXT NOT NULL CHECK (
    length(twin_projection_digest) = 71 AND
    substr(twin_projection_digest, 1, 7) = 'sha256:' AND
    substr(twin_projection_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  target_snapshot_id TEXT NOT NULL CHECK (length(target_snapshot_id) = 36),
  code_map_projection_id TEXT NOT NULL CHECK (length(code_map_projection_id) = 36),
  code_map_revision INTEGER NOT NULL CHECK (code_map_revision > 0),
  code_map_projection_digest TEXT NOT NULL CHECK (
    length(code_map_projection_digest) = 71 AND
    substr(code_map_projection_digest, 1, 7) = 'sha256:' AND
    substr(code_map_projection_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  code_map_evidence_kind TEXT NOT NULL CHECK (
    code_map_evidence_kind IN ('STATIC_INFERENCE', 'DECLARED_INTELLILOOP_FIXTURE')
  ),
  code_map_inference_status TEXT NOT NULL CHECK (
    code_map_inference_status IN ('AVAILABLE', 'UNAVAILABLE_SAFE_FAILURE')
  ),
  code_map_completeness TEXT NOT NULL CHECK (
    code_map_completeness IN ('COMPLETE', 'PARTIAL', 'UNAVAILABLE')
  ),
  reassessment_digest TEXT NOT NULL CHECK (
    length(reassessment_digest) = 71 AND
    substr(reassessment_digest, 1, 7) = 'sha256:' AND
    substr(reassessment_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  impact_digest TEXT NOT NULL CHECK (
    length(impact_digest) = 71 AND substr(impact_digest, 1, 7) = 'sha256:' AND
    substr(impact_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
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
  conflict_finding_count INTEGER NOT NULL CHECK (conflict_finding_count >= 0),
  ambiguous_finding_count INTEGER NOT NULL CHECK (ambiguous_finding_count >= 0),
  missing_finding_count INTEGER NOT NULL CHECK (missing_finding_count >= 0),
  stale_finding_count INTEGER NOT NULL CHECK (stale_finding_count >= 0),
  impact_gap_finding_count INTEGER NOT NULL CHECK (impact_gap_finding_count >= 0),
  total_finding_count INTEGER NOT NULL CHECK (
    total_finding_count BETWEEN 0 AND 100000 AND
    total_finding_count = conflict_finding_count + ambiguous_finding_count +
      missing_finding_count + stale_finding_count + impact_gap_finding_count
  ),
  impact_path_count INTEGER NOT NULL CHECK (
    impact_path_count BETWEEN 0 AND 100000
  ),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 16777216 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.version') IS aggregate_version AND
    json_extract(canonical_json, '$.revisionKey') IS revision_key AND
    json_extract(canonical_json, '$.projectId') IS project_id AND
    json_extract(canonical_json, '$.missionId') IS mission_id AND
    json_extract(canonical_json, '$.revision') IS revision AND
    json_extract(canonical_json, '$.inputDigest') IS input_digest AND
    json_extract(canonical_json, '$.resultDigest') IS result_digest AND
    json_extract(canonical_json, '$.twinBinding.projectionId') IS twin_projection_id AND
    json_extract(canonical_json, '$.twinBinding.revision') IS twin_revision AND
    json_extract(canonical_json, '$.twinBinding.projectionDigest') IS twin_projection_digest AND
    json_extract(canonical_json, '$.targetSnapshotId') IS target_snapshot_id AND
    json_extract(canonical_json, '$.codeMapBinding.projectionId') IS code_map_projection_id AND
    json_extract(canonical_json, '$.codeMapBinding.revision') IS code_map_revision AND
    json_extract(canonical_json, '$.codeMapBinding.projectionDigest') IS code_map_projection_digest AND
    json_extract(canonical_json, '$.codeMapBinding.evidenceKind') IS code_map_evidence_kind AND
    json_extract(canonical_json, '$.codeMapBinding.inferenceStatus') IS code_map_inference_status AND
    json_extract(canonical_json, '$.codeMapBinding.completeness') IS code_map_completeness AND
    json_extract(canonical_json, '$.reassessment.resultDigest') IS reassessment_digest AND
    json_extract(canonical_json, '$.impact.resultDigest') IS impact_digest AND
    json_extract(canonical_json, '$.findingCounts.CONFLICT') IS conflict_finding_count AND
    json_extract(canonical_json, '$.findingCounts.AMBIGUOUS') IS ambiguous_finding_count AND
    json_extract(canonical_json, '$.findingCounts.MISSING') IS missing_finding_count AND
    json_extract(canonical_json, '$.findingCounts.STALE') IS stale_finding_count AND
    json_extract(canonical_json, '$.findingCounts.IMPACT_GAP') IS impact_gap_finding_count AND
    json_extract(canonical_json, '$.findingCounts.total') IS total_finding_count AND
    json_extract(canonical_json, '$.impactPathCount') IS impact_path_count
  ),
  PRIMARY KEY (revision_key, revision),
  UNIQUE (mission_id, revision),
  UNIQUE (mission_id, input_digest),
  UNIQUE (revision_key, result_digest),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (twin_projection_id, twin_revision)
    REFERENCES twin_revisions(projection_id, revision),
  FOREIGN KEY (code_map_projection_id, code_map_revision)
    REFERENCES code_map_revisions(projection_id, revision),
  FOREIGN KEY (target_snapshot_id) REFERENCES git_snapshots(snapshot_id),
  FOREIGN KEY (revision_key, predecessor_revision)
    REFERENCES reconciliation_impact_revisions(revision_key, revision),
  CHECK (
    (revision = 1 AND predecessor_revision IS NULL AND predecessor_digest IS NULL) OR
    (revision > 1 AND predecessor_revision = revision - 1 AND predecessor_digest IS NOT NULL)
  )
) STRICT;

CREATE INDEX reconciliation_impact_by_mission_and_revision
  ON reconciliation_impact_revisions(mission_id, revision DESC);

CREATE INDEX reconciliation_impact_by_twin
  ON reconciliation_impact_revisions(
    mission_id, twin_projection_id, twin_revision
  );

CREATE TRIGGER reconciliation_impact_validate_insert
BEFORE INSERT ON reconciliation_impact_revisions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM twin_revisions twin
    WHERE twin.projection_id = NEW.twin_projection_id
      AND twin.revision = NEW.twin_revision
      AND twin.project_id = NEW.project_id
      AND twin.mission_id = NEW.mission_id
      AND twin.projection_digest = NEW.twin_projection_digest
  ) THEN RAISE(ABORT, 'invalid reconciliation Twin binding') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM code_map_revisions code_map
    WHERE code_map.projection_id = NEW.code_map_projection_id
      AND code_map.revision = NEW.code_map_revision
      AND code_map.project_id = NEW.project_id
      AND code_map.mission_id = NEW.mission_id
      AND code_map.snapshot_id = NEW.target_snapshot_id
      AND code_map.projection_digest = NEW.code_map_projection_digest
      AND code_map.evidence_kind = NEW.code_map_evidence_kind
      AND code_map.inference_status = NEW.code_map_inference_status
      AND code_map.completeness = NEW.code_map_completeness
  ) THEN RAISE(ABORT, 'invalid reconciliation code-map binding') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM git_snapshots snapshot
    WHERE snapshot.snapshot_id = NEW.target_snapshot_id
      AND snapshot.project_id = NEW.project_id
      AND snapshot.mission_id = NEW.mission_id
  ) THEN RAISE(ABORT, 'invalid reconciliation snapshot binding') END;
  SELECT CASE WHEN NEW.revision = 1 AND EXISTS (
    SELECT 1 FROM reconciliation_impact_revisions
    WHERE mission_id = NEW.mission_id
  ) THEN RAISE(ABORT, 'invalid reconciliation first revision') END;
  SELECT CASE WHEN NEW.revision > 1 AND NOT EXISTS (
    SELECT 1 FROM reconciliation_impact_revisions predecessor
    WHERE predecessor.revision_key = NEW.revision_key
      AND predecessor.project_id = NEW.project_id
      AND predecessor.mission_id = NEW.mission_id
      AND predecessor.revision = NEW.predecessor_revision
      AND predecessor.result_digest = NEW.predecessor_digest
  ) THEN RAISE(ABORT, 'invalid reconciliation predecessor') END;
END;

CREATE TRIGGER reconciliation_impact_reject_update
BEFORE UPDATE ON reconciliation_impact_revisions
BEGIN
  SELECT RAISE(ABORT, 'reconciliation impact revisions are immutable');
END;

CREATE TRIGGER reconciliation_impact_reject_delete
BEFORE DELETE ON reconciliation_impact_revisions
BEGIN
  SELECT RAISE(ABORT, 'reconciliation impact revisions are immutable');
END;
`.trim()
  });
