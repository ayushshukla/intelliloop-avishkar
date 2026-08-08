import type { SqlMigration } from "../migration.js";

export const MIGRATION_007_RUNTIME_OBSERVATIONS: SqlMigration = Object.freeze({
  version: 7,
  name: "runtime_observations",
  sql: `
CREATE TABLE runtime_observations (
  runtime_observation_id TEXT PRIMARY KEY NOT NULL CHECK (
    length(runtime_observation_id) = 36
  ),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  evidence_source_id TEXT NOT NULL CHECK (length(evidence_source_id) = 36),
  schema_version TEXT NOT NULL CHECK (
    schema_version = 'runtime-observation-summary.v1'
  ),
  series_key TEXT NOT NULL CHECK (
    length(series_key) = 71 AND
    substr(series_key, 1, 7) = 'sha256:' AND
    substr(series_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  summary_digest TEXT NOT NULL CHECK (
    length(summary_digest) = 71 AND
    substr(summary_digest, 1, 7) = 'sha256:' AND
    substr(summary_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  subject TEXT NOT NULL CHECK (length(CAST(subject AS BLOB)) BETWEEN 1 AND 128),
  environment TEXT NOT NULL CHECK (environment IN (
    'DEVELOPMENT',
    'TEST',
    'STAGING',
    'PRODUCTION'
  )),
  observation_kind TEXT NOT NULL CHECK (
    length(CAST(observation_kind AS BLOB)) BETWEEN 1 AND 128
  ),
  observed_from_utc TEXT NOT NULL CHECK (length(observed_from_utc) = 24),
  observed_until_utc TEXT NOT NULL CHECK (
    length(observed_until_utc) = 24 AND observed_until_utc >= observed_from_utc
  ),
  sample_count INTEGER NOT NULL CHECK (sample_count BETWEEN 1 AND 1000000000),
  measurement_count INTEGER NOT NULL CHECK (measurement_count BETWEEN 1 AND 32),
  recorded_at_utc TEXT NOT NULL CHECK (
    length(recorded_at_utc) = 24 AND recorded_at_utc >= observed_until_utc
  ),
  UNIQUE (runtime_observation_id, project_id, mission_id),
  UNIQUE (evidence_source_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (evidence_source_id, project_id, mission_id, recorded_at_utc)
    REFERENCES evidence_sources(
      evidence_source_id,
      project_id,
      mission_id,
      recorded_at_utc
    )
) STRICT;

CREATE INDEX runtime_observations_by_mission_and_id
  ON runtime_observations(mission_id, runtime_observation_id);

CREATE INDEX runtime_observations_by_series_and_window
  ON runtime_observations(
    project_id,
    mission_id,
    series_key,
    observed_until_utc,
    runtime_observation_id
  );

CREATE TRIGGER runtime_observations_validate_insert
BEFORE INSERT ON runtime_observations
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM evidence_sources source
    WHERE source.evidence_source_id = NEW.evidence_source_id
      AND source.project_id = NEW.project_id
      AND source.mission_id = NEW.mission_id
      AND source.recorded_at_utc = NEW.recorded_at_utc
      AND source.effective_at_utc = NEW.observed_until_utc
      AND source.origin_kind IN (
        'USER_INPUT',
        'VALIDATION_RESULT',
        'SYNTHETIC_FIXTURE'
      )
      AND source.extraction_method = 'DIRECT_IMPORT'
      AND source.format = 'JSON'
      AND source.input_byte_count <= 32768
      AND source.normalized_byte_count <= 32768
      AND json_valid(source.normalized_content)
      AND (SELECT COUNT(*) FROM json_each(source.normalized_content)) = 8
      AND json_extract(source.normalized_content, '$.schemaVersion') = NEW.schema_version
      AND json_extract(source.normalized_content, '$.subject') = NEW.subject
      AND json_extract(source.normalized_content, '$.environment') = NEW.environment
      AND json_extract(source.normalized_content, '$.observationKind') = NEW.observation_kind
      AND json_extract(source.normalized_content, '$.observedFromUtc') = NEW.observed_from_utc
      AND json_extract(source.normalized_content, '$.observedUntilUtc') = NEW.observed_until_utc
      AND json_extract(source.normalized_content, '$.sampleCount') = NEW.sample_count
      AND json_array_length(source.normalized_content, '$.measurements') = NEW.measurement_count
  ) THEN RAISE(ABORT, 'invalid runtime observation') END;
END;

CREATE TRIGGER runtime_observations_reject_update
BEFORE UPDATE ON runtime_observations
BEGIN
  SELECT RAISE(ABORT, 'runtime observations are immutable');
END;

CREATE TRIGGER runtime_observations_reject_delete
BEFORE DELETE ON runtime_observations
BEGIN
  SELECT RAISE(ABORT, 'runtime observations are immutable');
END;
`.trim()
});
