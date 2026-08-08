import type { SqlMigration } from "../migration.js";

export const MIGRATION_012_RELEASE_PASSPORTS: SqlMigration = Object.freeze({
  version: 12,
  name: "release_passports",
  sql: `
CREATE TABLE release_passports (
  passport_key TEXT NOT NULL CHECK (
    length(passport_key) = 71 AND substr(passport_key, 1, 7) = 'sha256:' AND
    substr(passport_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  passport_id TEXT PRIMARY KEY NOT NULL CHECK (length(passport_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  assessment_id TEXT NOT NULL CHECK (length(assessment_id) = 36),
  assessment_revision INTEGER NOT NULL CHECK (assessment_revision > 0),
  assessment_digest TEXT NOT NULL CHECK (
    length(assessment_digest) = 71 AND substr(assessment_digest, 1, 7) = 'sha256:' AND
    substr(assessment_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  status_at_projection TEXT NOT NULL CHECK (status_at_projection IN ('BLOCKED', 'READY', 'STALE')),
  evidence_digest TEXT NOT NULL CHECK (
    length(evidence_digest) = 71 AND substr(evidence_digest, 1, 7) = 'sha256:' AND
    substr(evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  passport_digest TEXT NOT NULL CHECK (
    length(passport_digest) = 71 AND substr(passport_digest, 1, 7) = 'sha256:' AND
    substr(passport_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  canonical_json TEXT NOT NULL CHECK (
    length(CAST(canonical_json AS BLOB)) BETWEEN 1 AND 1048576 AND
    json_valid(canonical_json) AND
    json_extract(canonical_json, '$.version') IS 'release-passport.v1' AND
    json_extract(canonical_json, '$.projectionVersion') IS 'release-passport-projection.v1' AND
    json_extract(canonical_json, '$.passportKey') IS passport_key AND
    json_extract(canonical_json, '$.passportId') IS passport_id AND
    json_extract(canonical_json, '$.projectId') IS project_id AND
    json_extract(canonical_json, '$.missionId') IS mission_id AND
    json_extract(canonical_json, '$.recordedAtUtc') IS recorded_at_utc AND
    json_extract(canonical_json, '$.assessment.assessmentId') IS assessment_id AND
    json_extract(canonical_json, '$.assessment.revision') IS assessment_revision AND
    json_extract(canonical_json, '$.assessment.assessmentDigest') IS assessment_digest AND
    json_extract(canonical_json, '$.assessment.inputFingerprintDigest') IS evidence_digest AND
    json_extract(canonical_json, '$.evidenceDigest') IS evidence_digest AND
    json_extract(canonical_json, '$.status') IS status_at_projection AND
    json_extract(canonical_json, '$.passportDigest') IS passport_digest AND
    json_extract(canonical_json, '$.authority.source') IS 'ONE_PERSISTED_RELEASE_ASSESSMENT' AND
    json_extract(canonical_json, '$.authority.projection') IS 'REPRODUCED_NOT_RECOMPUTED' AND
    json_extract(canonical_json, '$.authority.signed') IS 0 AND
    json_extract(canonical_json, '$.authority.releaseApproval') IS 0 AND
    json_extract(canonical_json, '$.authority.deploymentAuthority') IS 0
  ),
  UNIQUE (passport_key),
  UNIQUE (mission_id, assessment_revision),
  UNIQUE (assessment_id),
  UNIQUE (passport_digest),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (assessment_id) REFERENCES release_assessments(assessment_id)
) STRICT;

CREATE INDEX release_passports_by_scope_and_revision
  ON release_passports(mission_id, assessment_revision DESC);

CREATE TRIGGER release_passports_validate_insert
BEFORE INSERT ON release_passports
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM release_assessments assessment
    WHERE assessment.assessment_id = NEW.assessment_id
      AND assessment.project_id = NEW.project_id
      AND assessment.mission_id = NEW.mission_id
      AND assessment.revision = NEW.assessment_revision
      AND assessment.assessment_digest = NEW.assessment_digest
      AND assessment.input_fingerprint_digest = NEW.evidence_digest
      AND assessment.evaluated_status = NEW.status_at_projection
  ) THEN RAISE(ABORT, 'invalid Passport assessment binding') END;
END;

CREATE TRIGGER release_passports_reject_update
BEFORE UPDATE ON release_passports
BEGIN
  SELECT RAISE(ABORT, 'Release Passports are immutable');
END;

CREATE TRIGGER release_passports_reject_delete
BEFORE DELETE ON release_passports
BEGIN
  SELECT RAISE(ABORT, 'Release Passports are immutable');
END;
`.trim()
});
