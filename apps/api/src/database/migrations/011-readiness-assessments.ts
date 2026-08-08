import type { SqlMigration } from "../migration.js";

export const MIGRATION_011_READINESS_ASSESSMENTS: SqlMigration = Object.freeze({
  version: 11,
  name: "readiness_assessments",
  sql: `
CREATE TABLE validation_results (
  validation_result_id TEXT PRIMARY KEY NOT NULL CHECK (length(validation_result_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  evidence_source_id TEXT NOT NULL CHECK (length(evidence_source_id) = 36),
  snapshot_id TEXT NOT NULL CHECK (length(snapshot_id) = 36),
  validation_key TEXT NOT NULL CHECK (length(validation_key) BETWEEN 3 AND 256),
  status TEXT NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'INCONCLUSIVE')),
  origin_kind TEXT NOT NULL CHECK (origin_kind IN ('VALIDATION_RESULT', 'SYNTHETIC_FIXTURE')),
  result_digest TEXT NOT NULL CHECK (
    length(result_digest) = 71 AND substr(result_digest, 1, 7) = 'sha256:' AND
    substr(result_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 65536 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.entityType') IS 'ValidationResult' AND
    json_extract(canonical_json, '$.validationResultId') IS validation_result_id AND
    json_extract(canonical_json, '$.projectId') IS project_id AND
    json_extract(canonical_json, '$.missionId') IS mission_id AND
    json_extract(canonical_json, '$.evidenceSourceId') IS evidence_source_id AND
    json_extract(canonical_json, '$.snapshotId') IS snapshot_id AND
    json_extract(canonical_json, '$.validationKey') IS validation_key AND
    json_extract(canonical_json, '$.status') IS status AND
    json_extract(canonical_json, '$.origin') IS origin_kind AND
    json_extract(canonical_json, '$.resultDigest') IS result_digest AND
    json_extract(canonical_json, '$.recordedAtUtc') IS recorded_at_utc
  ),
  UNIQUE (mission_id, validation_result_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (evidence_source_id, project_id, mission_id)
    REFERENCES evidence_sources(evidence_source_id, project_id, mission_id),
  FOREIGN KEY (snapshot_id) REFERENCES git_snapshots(snapshot_id)
) STRICT;

CREATE INDEX validation_results_by_scope_key_and_time
  ON validation_results(mission_id, validation_key, recorded_at_utc DESC, validation_result_id DESC);

CREATE TRIGGER validation_results_validate_insert
BEFORE INSERT ON validation_results
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM git_snapshots snapshot
    WHERE snapshot.snapshot_id = NEW.snapshot_id
      AND snapshot.project_id = NEW.project_id
      AND snapshot.mission_id = NEW.mission_id
  ) THEN RAISE(ABORT, 'invalid validation snapshot binding') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM evidence_sources source
    WHERE source.evidence_source_id = NEW.evidence_source_id
      AND source.project_id = NEW.project_id
      AND source.mission_id = NEW.mission_id
      AND source.origin_kind = NEW.origin_kind
  ) THEN RAISE(ABORT, 'invalid validation evidence binding') END;
END;

CREATE TRIGGER validation_results_reject_update
BEFORE UPDATE ON validation_results
BEGIN
  SELECT RAISE(ABORT, 'validation results are immutable');
END;

CREATE TRIGGER validation_results_reject_delete
BEFORE DELETE ON validation_results
BEGIN
  SELECT RAISE(ABORT, 'validation results are immutable');
END;

CREATE TABLE readiness_reviews (
  review_id TEXT PRIMARY KEY NOT NULL CHECK (length(review_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  snapshot_id TEXT NOT NULL CHECK (length(snapshot_id) = 36),
  reconciliation_revision INTEGER NOT NULL CHECK (reconciliation_revision > 0),
  reconciliation_result_digest TEXT NOT NULL CHECK (
    length(reconciliation_result_digest) = 71 AND
    substr(reconciliation_result_digest, 1, 7) = 'sha256:' AND
    substr(reconciliation_result_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('HUMAN', 'AI_ADVISORY')),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  review_digest TEXT NOT NULL CHECK (
    length(review_digest) = 71 AND substr(review_digest, 1, 7) = 'sha256:' AND
    substr(review_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 16384 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.version') IS 'readiness-review.v1' AND
    json_extract(canonical_json, '$.reviewId') IS review_id AND
    json_extract(canonical_json, '$.projectId') IS project_id AND
    json_extract(canonical_json, '$.missionId') IS mission_id AND
    json_extract(canonical_json, '$.snapshotId') IS snapshot_id AND
    json_extract(canonical_json, '$.reconciliationRevision') IS reconciliation_revision AND
    json_extract(canonical_json, '$.reconciliationResultDigest') IS reconciliation_result_digest AND
    json_extract(canonical_json, '$.actorKind') IS actor_kind AND
    json_extract(canonical_json, '$.recordedAtUtc') IS recorded_at_utc AND
    json_extract(canonical_json, '$.reviewDigest') IS review_digest
  ),
  UNIQUE (mission_id, review_digest),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (snapshot_id) REFERENCES git_snapshots(snapshot_id),
  FOREIGN KEY (mission_id, reconciliation_revision)
    REFERENCES reconciliation_impact_revisions(mission_id, revision)
) STRICT;

CREATE INDEX readiness_reviews_by_scope_and_time
  ON readiness_reviews(mission_id, recorded_at_utc DESC, review_id DESC);

CREATE TRIGGER readiness_reviews_validate_insert
BEFORE INSERT ON readiness_reviews
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM reconciliation_impact_revisions reconciliation
    WHERE reconciliation.mission_id = NEW.mission_id
      AND reconciliation.project_id = NEW.project_id
      AND reconciliation.revision = NEW.reconciliation_revision
      AND reconciliation.result_digest = NEW.reconciliation_result_digest
      AND reconciliation.target_snapshot_id = NEW.snapshot_id
  ) THEN RAISE(ABORT, 'invalid readiness review reconciliation binding') END;
END;

CREATE TRIGGER readiness_reviews_reject_update
BEFORE UPDATE ON readiness_reviews
BEGIN
  SELECT RAISE(ABORT, 'readiness reviews are immutable');
END;

CREATE TRIGGER readiness_reviews_reject_delete
BEFORE DELETE ON readiness_reviews
BEGIN
  SELECT RAISE(ABORT, 'readiness reviews are immutable');
END;

CREATE TABLE release_assessments (
  assessment_key TEXT NOT NULL CHECK (
    length(assessment_key) = 71 AND substr(assessment_key, 1, 7) = 'sha256:' AND
    substr(assessment_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  assessment_id TEXT PRIMARY KEY NOT NULL CHECK (length(assessment_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  revision INTEGER NOT NULL CHECK (revision > 0),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  input_fingerprint_digest TEXT NOT NULL CHECK (
    length(input_fingerprint_digest) = 71 AND
    substr(input_fingerprint_digest, 1, 7) = 'sha256:' AND
    substr(input_fingerprint_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  evaluated_status TEXT NOT NULL CHECK (evaluated_status IN ('BLOCKED', 'READY', 'STALE')),
  reconciliation_revision_key TEXT NOT NULL CHECK (length(reconciliation_revision_key) = 71),
  reconciliation_revision INTEGER NOT NULL CHECK (reconciliation_revision > 0),
  reconciliation_result_digest TEXT NOT NULL CHECK (length(reconciliation_result_digest) = 71),
  target_snapshot_id TEXT NOT NULL CHECK (length(target_snapshot_id) = 36),
  current_snapshot_id TEXT NOT NULL CHECK (length(current_snapshot_id) = 36),
  review_id TEXT CHECK (review_id IS NULL OR length(review_id) = 36),
  validation_evidence_count INTEGER NOT NULL CHECK (validation_evidence_count BETWEEN 0 AND 256),
  predecessor_revision INTEGER CHECK (predecessor_revision IS NULL OR predecessor_revision > 0),
  predecessor_digest TEXT CHECK (predecessor_digest IS NULL OR length(predecessor_digest) = 71),
  assessment_digest TEXT NOT NULL CHECK (length(assessment_digest) = 71),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 1048576 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.version') IS 'release-assessment.v1' AND
    json_extract(canonical_json, '$.assessmentKey') IS assessment_key AND
    json_extract(canonical_json, '$.assessmentId') IS assessment_id AND
    json_extract(canonical_json, '$.projectId') IS project_id AND
    json_extract(canonical_json, '$.missionId') IS mission_id AND
    json_extract(canonical_json, '$.revision') IS revision AND
    json_extract(canonical_json, '$.recordedAtUtc') IS recorded_at_utc AND
    json_extract(canonical_json, '$.inputFingerprintDigest') IS input_fingerprint_digest AND
    json_extract(canonical_json, '$.evaluatedStatus') IS evaluated_status AND
    json_extract(canonical_json, '$.evaluation.inputDigest') IS input_fingerprint_digest AND
    json_extract(canonical_json, '$.evaluation.reconciliationBinding.revisionKey') IS reconciliation_revision_key AND
    json_extract(canonical_json, '$.evaluation.reconciliationBinding.revision') IS reconciliation_revision AND
    json_extract(canonical_json, '$.evaluation.reconciliationBinding.resultDigest') IS reconciliation_result_digest AND
    json_extract(canonical_json, '$.evaluation.targetSnapshotId') IS target_snapshot_id AND
    json_extract(canonical_json, '$.evaluation.currentSnapshotId') IS current_snapshot_id AND
    json_array_length(json_extract(canonical_json, '$.evaluation.validationEvidence')) IS validation_evidence_count AND
    json_extract(canonical_json, '$.assessmentDigest') IS assessment_digest
  ),
  UNIQUE (assessment_key, revision),
  UNIQUE (mission_id, input_fingerprint_digest),
  UNIQUE (assessment_key, assessment_digest),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (reconciliation_revision_key, reconciliation_revision)
    REFERENCES reconciliation_impact_revisions(revision_key, revision),
  FOREIGN KEY (target_snapshot_id) REFERENCES git_snapshots(snapshot_id),
  FOREIGN KEY (current_snapshot_id) REFERENCES git_snapshots(snapshot_id),
  FOREIGN KEY (review_id) REFERENCES readiness_reviews(review_id),
  FOREIGN KEY (assessment_key, predecessor_revision)
    REFERENCES release_assessments(assessment_key, revision),
  CHECK (
    (revision = 1 AND predecessor_revision IS NULL AND predecessor_digest IS NULL) OR
    (revision > 1 AND predecessor_revision = revision - 1 AND predecessor_digest IS NOT NULL)
  ),
  CHECK (
    (json_extract(canonical_json, '$.evaluation.review.status') = 'MISSING' AND review_id IS NULL) OR
    (json_extract(canonical_json, '$.evaluation.review.status') = 'RECORDED' AND
      json_extract(canonical_json, '$.evaluation.review.reviewId') IS review_id)
  )
) STRICT;

CREATE INDEX release_assessments_by_scope_and_revision
  ON release_assessments(mission_id, revision DESC);

CREATE TRIGGER release_assessments_validate_insert
BEFORE INSERT ON release_assessments
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM reconciliation_impact_revisions reconciliation
    WHERE reconciliation.revision_key = NEW.reconciliation_revision_key
      AND reconciliation.revision = NEW.reconciliation_revision
      AND reconciliation.project_id = NEW.project_id
      AND reconciliation.mission_id = NEW.mission_id
      AND reconciliation.result_digest = NEW.reconciliation_result_digest
      AND reconciliation.target_snapshot_id = NEW.target_snapshot_id
  ) THEN RAISE(ABORT, 'invalid assessment reconciliation binding') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM git_snapshots snapshot
    WHERE snapshot.snapshot_id = NEW.current_snapshot_id
      AND snapshot.project_id = NEW.project_id
      AND snapshot.mission_id = NEW.mission_id
  ) THEN RAISE(ABORT, 'invalid assessment current snapshot binding') END;
  SELECT CASE WHEN NEW.review_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM readiness_reviews review
    WHERE review.review_id = NEW.review_id
      AND review.project_id = NEW.project_id
      AND review.mission_id = NEW.mission_id
      AND review.actor_kind = json_extract(NEW.canonical_json, '$.evaluation.review.actorKind')
      AND review.snapshot_id = json_extract(NEW.canonical_json, '$.evaluation.review.snapshotId')
      AND review.reconciliation_result_digest = json_extract(NEW.canonical_json, '$.evaluation.review.reconciliationResultDigest')
      AND review.review_digest = json_extract(NEW.canonical_json, '$.evaluation.review.reviewDigest')
  ) THEN RAISE(ABORT, 'invalid assessment review binding') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM json_each(NEW.canonical_json, '$.evaluation.validationEvidence') evidence
    WHERE NOT EXISTS (
      SELECT 1 FROM validation_results validation
      WHERE validation.validation_result_id = json_extract(evidence.value, '$.validationResultId')
        AND validation.project_id = NEW.project_id
        AND validation.mission_id = NEW.mission_id
        AND validation.snapshot_id = json_extract(evidence.value, '$.snapshotId')
        AND validation.validation_key = json_extract(evidence.value, '$.validationKey')
        AND validation.status = json_extract(evidence.value, '$.status')
        AND validation.origin_kind = json_extract(evidence.value, '$.origin')
        AND validation.result_digest = json_extract(evidence.value, '$.resultDigest')
    )
  ) THEN RAISE(ABORT, 'invalid assessment validation binding') END;
  SELECT CASE WHEN NEW.revision = 1 AND EXISTS (
    SELECT 1 FROM release_assessments WHERE assessment_key = NEW.assessment_key
  ) THEN RAISE(ABORT, 'invalid assessment first revision') END;
  SELECT CASE WHEN NEW.revision > 1 AND NOT EXISTS (
    SELECT 1 FROM release_assessments predecessor
    WHERE predecessor.assessment_key = NEW.assessment_key
      AND predecessor.project_id = NEW.project_id
      AND predecessor.mission_id = NEW.mission_id
      AND predecessor.revision = NEW.predecessor_revision
      AND predecessor.assessment_digest = NEW.predecessor_digest
  ) THEN RAISE(ABORT, 'invalid assessment predecessor') END;
END;

CREATE TRIGGER release_assessments_reject_update
BEFORE UPDATE ON release_assessments
BEGIN
  SELECT RAISE(ABORT, 'release assessments are immutable');
END;

CREATE TRIGGER release_assessments_reject_delete
BEFORE DELETE ON release_assessments
BEGIN
  SELECT RAISE(ABORT, 'release assessments are immutable');
END;
`.trim()
});
