import type { SqlMigration } from "../migration.js";

export const MIGRATION_005_EVIDENCE_SOURCES_AND_TIMELINE: SqlMigration =
  Object.freeze({
    version: 5,
    name: "evidence_sources_and_timeline",
    sql: `
CREATE TABLE evidence_sources (
  evidence_source_id TEXT PRIMARY KEY NOT NULL CHECK (length(evidence_source_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  import_key TEXT NOT NULL CHECK (
    length(import_key) = 71 AND
    substr(import_key, 1, 7) = 'sha256:' AND
    substr(import_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  origin_kind TEXT NOT NULL CHECK (origin_kind IN (
    'USER_INPUT',
    'REPOSITORY_OBSERVATION',
    'VALIDATION_RESULT',
    'SYSTEM_DERIVATION',
    'SYNTHETIC_FIXTURE',
    'AI_ADVISORY'
  )),
  source_locator TEXT NOT NULL CHECK (length(source_locator) BETWEEN 4 AND 512),
  source_revision TEXT NOT NULL CHECK (length(source_revision) BETWEEN 0 AND 256),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  effective_at_utc TEXT CHECK (effective_at_utc IS NULL OR length(effective_at_utc) = 24),
  extraction_method TEXT NOT NULL CHECK (extraction_method = 'DIRECT_IMPORT'),
  epistemic_label TEXT NOT NULL CHECK (epistemic_label IN ('FACT', 'INFERENCE')),
  normalization_version TEXT NOT NULL CHECK (
    normalization_version = 'evidence-normalization.v1'
  ),
  format TEXT NOT NULL CHECK (format IN ('MARKDOWN', 'TEXT', 'JSON')),
  input_byte_count INTEGER NOT NULL CHECK (input_byte_count BETWEEN 1 AND 262144),
  normalized_byte_count INTEGER NOT NULL CHECK (
    normalized_byte_count BETWEEN 1 AND 262144
  ),
  normalized_content TEXT NOT NULL CHECK (
    length(CAST(normalized_content AS BLOB)) = normalized_byte_count
  ),
  content_digest TEXT NOT NULL CHECK (
    length(content_digest) = 71 AND
    substr(content_digest, 1, 7) = 'sha256:' AND
    substr(content_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  redaction_summary_json TEXT NOT NULL CHECK (
    length(redaction_summary_json) BETWEEN 2 AND 4096 AND
    json_valid(redaction_summary_json)
  ),
  UNIQUE (evidence_source_id, project_id, mission_id),
  UNIQUE (evidence_source_id, project_id, mission_id, recorded_at_utc),
  UNIQUE (project_id, mission_id, import_key),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id)
) STRICT;

CREATE INDEX evidence_sources_by_mission_and_id
  ON evidence_sources(mission_id, evidence_source_id);

CREATE TABLE timeline_events (
  timeline_event_id TEXT PRIMARY KEY NOT NULL CHECK (length(timeline_event_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  mission_sequence INTEGER NOT NULL CHECK (mission_sequence > 0),
  event_type TEXT NOT NULL CHECK (event_type = 'EVIDENCE_IMPORTED'),
  evidence_source_id TEXT NOT NULL CHECK (length(evidence_source_id) = 36),
  occurred_at_utc TEXT NOT NULL CHECK (length(occurred_at_utc) = 24),
  UNIQUE (mission_id, mission_sequence),
  UNIQUE (event_type, evidence_source_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (evidence_source_id, project_id, mission_id, occurred_at_utc)
    REFERENCES evidence_sources(
      evidence_source_id,
      project_id,
      mission_id,
      recorded_at_utc
    )
) STRICT;

CREATE INDEX timeline_events_by_mission_and_sequence
  ON timeline_events(mission_id, mission_sequence);

CREATE TRIGGER evidence_sources_reject_update
BEFORE UPDATE ON evidence_sources
BEGIN
  SELECT RAISE(ABORT, 'evidence sources are immutable');
END;

CREATE TRIGGER evidence_sources_reject_delete
BEFORE DELETE ON evidence_sources
BEGIN
  SELECT RAISE(ABORT, 'evidence sources are immutable');
END;

CREATE TRIGGER timeline_events_reject_update
BEFORE UPDATE ON timeline_events
BEGIN
  SELECT RAISE(ABORT, 'timeline events are immutable');
END;

CREATE TRIGGER timeline_events_reject_delete
BEFORE DELETE ON timeline_events
BEGIN
  SELECT RAISE(ABORT, 'timeline events are immutable');
END;
`.trim()
  });
