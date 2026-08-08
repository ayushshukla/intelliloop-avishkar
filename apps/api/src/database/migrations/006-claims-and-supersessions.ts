import type { SqlMigration } from "../migration.js";

export const MIGRATION_006_CLAIMS_AND_SUPERSESSIONS: SqlMigration =
  Object.freeze({
    version: 6,
    name: "claims_and_supersessions",
    sql: `
CREATE UNIQUE INDEX evidence_sources_claim_attribution
  ON evidence_sources(
    evidence_source_id,
    project_id,
    mission_id,
    origin_kind,
    source_locator,
    source_revision,
    content_digest
  );

CREATE TABLE claims (
  claim_id TEXT PRIMARY KEY NOT NULL CHECK (length(claim_id) = 36),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  evidence_source_id TEXT NOT NULL CHECK (length(evidence_source_id) = 36),
  import_key TEXT NOT NULL CHECK (
    length(import_key) = 71 AND
    substr(import_key, 1, 7) = 'sha256:' AND
    substr(import_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  claim_digest TEXT NOT NULL CHECK (
    length(claim_digest) = 71 AND
    substr(claim_digest, 1, 7) = 'sha256:' AND
    substr(claim_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  normalization_version TEXT NOT NULL CHECK (
    normalization_version = 'claim-normalization.v1'
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
  source_content_digest TEXT NOT NULL CHECK (
    length(source_content_digest) = 71 AND
    substr(source_content_digest, 1, 7) = 'sha256:' AND
    substr(source_content_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  effective_at_utc TEXT CHECK (effective_at_utc IS NULL OR length(effective_at_utc) = 24),
  extraction_method TEXT NOT NULL CHECK (
    extraction_method = 'MANUAL_STRUCTURED_INTAKE'
  ),
  epistemic_label TEXT NOT NULL CHECK (epistemic_label IN ('FACT', 'INFERENCE')),
  raw_text TEXT NOT NULL CHECK (
    length(CAST(raw_text AS BLOB)) BETWEEN 1 AND 4096
  ),
  subject_term TEXT NOT NULL CHECK (
    length(CAST(subject_term AS BLOB)) BETWEEN 1 AND 256
  ),
  predicate_term TEXT NOT NULL CHECK (
    length(CAST(predicate_term AS BLOB)) BETWEEN 1 AND 256
  ),
  comparison_key TEXT NOT NULL CHECK (
    length(comparison_key) = 71 AND
    substr(comparison_key, 1, 7) = 'sha256:' AND
    substr(comparison_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  value_json TEXT NOT NULL CHECK (
    length(CAST(value_json AS BLOB)) BETWEEN 1 AND 16384 AND
    json_valid(value_json)
  ),
  applicability_json TEXT NOT NULL CHECK (
    length(CAST(applicability_json AS BLOB)) BETWEEN 2 AND 4096 AND
    json_valid(applicability_json)
  ),
  applicability_key TEXT NOT NULL CHECK (
    length(applicability_key) = 71 AND
    substr(applicability_key, 1, 7) = 'sha256:' AND
    substr(applicability_key, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  UNIQUE (claim_id, project_id, mission_id),
  UNIQUE (project_id, mission_id, import_key),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (
    evidence_source_id,
    project_id,
    mission_id,
    origin_kind,
    source_locator,
    source_revision,
    source_content_digest
  ) REFERENCES evidence_sources(
    evidence_source_id,
    project_id,
    mission_id,
    origin_kind,
    source_locator,
    source_revision,
    content_digest
  )
) STRICT;

CREATE INDEX claims_by_mission_and_id
  ON claims(mission_id, claim_id);

CREATE INDEX claims_by_comparison_and_applicability
  ON claims(mission_id, comparison_key, applicability_key, claim_id);

CREATE TABLE claim_supersessions (
  claim_supersession_id TEXT PRIMARY KEY NOT NULL CHECK (
    length(claim_supersession_id) = 36
  ),
  relationship_type TEXT NOT NULL CHECK (relationship_type = 'SUPERSEDES'),
  project_id TEXT NOT NULL CHECK (length(project_id) = 36),
  mission_id TEXT NOT NULL CHECK (length(mission_id) = 36),
  predecessor_claim_id TEXT NOT NULL CHECK (length(predecessor_claim_id) = 36),
  successor_claim_id TEXT NOT NULL CHECK (
    length(successor_claim_id) = 36 AND
    successor_claim_id <> predecessor_claim_id
  ),
  evidence_source_id TEXT NOT NULL CHECK (length(evidence_source_id) = 36),
  comparison_key TEXT NOT NULL CHECK (length(comparison_key) = 71),
  applicability_key TEXT NOT NULL CHECK (length(applicability_key) = 71),
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
  source_content_digest TEXT NOT NULL CHECK (length(source_content_digest) = 71),
  recorded_at_utc TEXT NOT NULL CHECK (length(recorded_at_utc) = 24),
  effective_at_utc TEXT CHECK (effective_at_utc IS NULL OR length(effective_at_utc) = 24),
  extraction_method TEXT NOT NULL CHECK (
    extraction_method = 'MANUAL_STRUCTURED_INTAKE'
  ),
  epistemic_label TEXT NOT NULL CHECK (epistemic_label IN ('FACT', 'INFERENCE')),
  link_digest TEXT NOT NULL CHECK (
    length(link_digest) = 71 AND
    substr(link_digest, 1, 7) = 'sha256:' AND
    substr(link_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  UNIQUE (predecessor_claim_id),
  UNIQUE (successor_claim_id),
  UNIQUE (project_id, mission_id, link_digest),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (predecessor_claim_id, project_id, mission_id)
    REFERENCES claims(claim_id, project_id, mission_id),
  FOREIGN KEY (successor_claim_id, project_id, mission_id)
    REFERENCES claims(claim_id, project_id, mission_id),
  FOREIGN KEY (evidence_source_id, project_id, mission_id)
    REFERENCES evidence_sources(evidence_source_id, project_id, mission_id)
) STRICT;

CREATE INDEX claim_supersessions_by_mission_and_id
  ON claim_supersessions(mission_id, claim_supersession_id);

CREATE TRIGGER claim_supersessions_validate_insert
BEFORE INSERT ON claim_supersessions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM claims predecessor
    JOIN claims successor
      ON successor.claim_id = NEW.successor_claim_id
     AND successor.project_id = NEW.project_id
     AND successor.mission_id = NEW.mission_id
    WHERE predecessor.claim_id = NEW.predecessor_claim_id
      AND predecessor.project_id = NEW.project_id
      AND predecessor.mission_id = NEW.mission_id
      AND predecessor.comparison_key = NEW.comparison_key
      AND successor.comparison_key = NEW.comparison_key
      AND predecessor.applicability_key = NEW.applicability_key
      AND successor.applicability_key = NEW.applicability_key
      AND successor.evidence_source_id = NEW.evidence_source_id
      AND successor.origin_kind = NEW.origin_kind
      AND successor.source_locator = NEW.source_locator
      AND successor.source_revision = NEW.source_revision
      AND successor.source_content_digest = NEW.source_content_digest
      AND successor.recorded_at_utc = NEW.recorded_at_utc
      AND successor.effective_at_utc IS NEW.effective_at_utc
      AND successor.extraction_method = NEW.extraction_method
      AND successor.epistemic_label = NEW.epistemic_label
      AND predecessor.recorded_at_utc <= successor.recorded_at_utc
  ) THEN RAISE(ABORT, 'invalid claim supersession') END;
END;

CREATE TRIGGER claims_reject_update
BEFORE UPDATE ON claims
BEGIN
  SELECT RAISE(ABORT, 'claims are immutable');
END;

CREATE TRIGGER claims_reject_delete
BEFORE DELETE ON claims
BEGIN
  SELECT RAISE(ABORT, 'claims are immutable');
END;

CREATE TRIGGER claim_supersessions_reject_update
BEFORE UPDATE ON claim_supersessions
BEGIN
  SELECT RAISE(ABORT, 'claim supersessions are immutable');
END;

CREATE TRIGGER claim_supersessions_reject_delete
BEFORE DELETE ON claim_supersessions
BEGIN
  SELECT RAISE(ABORT, 'claim supersessions are immutable');
END;
`.trim()
  });
