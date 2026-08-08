import type { SqlMigration } from "../migration.js";

const IMMUTABLE_TABLES = Object.freeze([
  ["git_snapshots", "git_snapshots_reject_delete", "git snapshots are immutable"],
  ["evidence_sources", "evidence_sources_reject_delete", "evidence sources are immutable"],
  ["timeline_events", "timeline_events_reject_delete", "timeline events are immutable"],
  ["claims", "claims_reject_delete", "claims are immutable"],
  ["claim_supersessions", "claim_supersessions_reject_delete", "claim supersessions are immutable"],
  ["runtime_observations", "runtime_observations_reject_delete", "runtime observations are immutable"],
  ["twin_revisions", "twin_revisions_reject_delete", "twin revisions are immutable"],
  ["code_map_revisions", "code_map_revisions_reject_delete", "code-map revisions are immutable"],
  ["reconciliation_impact_revisions", "reconciliation_impact_reject_delete", "reconciliation impact revisions are immutable"],
  ["validation_results", "validation_results_reject_delete", "validation results are immutable"],
  ["readiness_reviews", "readiness_reviews_reject_delete", "readiness reviews are immutable"],
  ["release_assessments", "release_assessments_reject_delete", "release assessments are immutable"],
  ["release_passports", "release_passports_reject_delete", "Release Passports are immutable"]
] as const);

const SCOPED_DELETE_TRIGGERS = IMMUTABLE_TABLES.map(
  ([table, trigger, message]) => `
DROP TRIGGER ${trigger};
CREATE TRIGGER ${trigger}
BEFORE DELETE ON ${table}
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM demo_reset_authorizations authorization
    WHERE authorization.project_id = OLD.project_id
      AND authorization.fixture_id = 'loopmart-expanded-cancellation-v1'
  ) THEN RAISE(ABORT, '${message}') END;
END;`
).join("\n");

export const MIGRATION_013_DEMO_WORKSPACES: SqlMigration = Object.freeze({
  version: 13,
  name: "demo_workspaces",
  sql: `
CREATE TABLE demo_workspaces (
  fixture_id TEXT PRIMARY KEY NOT NULL CHECK (fixture_id = 'loopmart-expanded-cancellation-v1'),
  fixture_version TEXT NOT NULL CHECK (fixture_version = 'intelliloop-retail-cancellation-fixture.v1'),
  ownership TEXT NOT NULL CHECK (ownership = 'INTELLILOOP_AUTHORED_SYNTHETIC_ONLY'),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('MATERIALIZED', 'LOADING', 'READY')),
  canonical_root TEXT NOT NULL CHECK (length(canonical_root) BETWEEN 1 AND 4096),
  project_id TEXT CHECK (project_id IS NULL OR length(project_id) = 36),
  mission_id TEXT CHECK (mission_id IS NULL OR length(mission_id) = 36),
  initial_snapshot_id TEXT CHECK (initial_snapshot_id IS NULL OR length(initial_snapshot_id) = 36),
  code_map_revision INTEGER CHECK (code_map_revision IS NULL OR code_map_revision > 0),
  twin_revision INTEGER CHECK (twin_revision IS NULL OR twin_revision > 0),
  reconciliation_revision INTEGER CHECK (reconciliation_revision IS NULL OR reconciliation_revision > 0),
  readiness_revision INTEGER CHECK (readiness_revision IS NULL OR readiness_revision > 0),
  created_at_utc TEXT NOT NULL CHECK (length(created_at_utc) = 24),
  updated_at_utc TEXT NOT NULL CHECK (length(updated_at_utc) = 24),
  CHECK (updated_at_utc >= created_at_utc),
  CHECK (
    (lifecycle_status = 'MATERIALIZED' AND project_id IS NULL AND mission_id IS NULL) OR
    (lifecycle_status = 'LOADING' AND project_id IS NOT NULL) OR
    (lifecycle_status = 'READY' AND project_id IS NOT NULL AND mission_id IS NOT NULL
      AND initial_snapshot_id IS NOT NULL AND code_map_revision IS NOT NULL
      AND twin_revision IS NOT NULL AND reconciliation_revision IS NOT NULL
      AND readiness_revision IS NOT NULL)
  ),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (mission_id, project_id) REFERENCES missions(mission_id, project_id),
  FOREIGN KEY (initial_snapshot_id) REFERENCES git_snapshots(snapshot_id)
) STRICT;

CREATE TABLE demo_reset_authorizations (
  project_id TEXT PRIMARY KEY NOT NULL CHECK (length(project_id) = 36),
  fixture_id TEXT NOT NULL CHECK (fixture_id = 'loopmart-expanded-cancellation-v1'),
  authorized_at_utc TEXT NOT NULL CHECK (length(authorized_at_utc) = 24)
) STRICT;

CREATE TRIGGER demo_reset_authorizations_reject_update
BEFORE UPDATE ON demo_reset_authorizations
BEGIN
  SELECT RAISE(ABORT, 'demo reset authorizations are single-use');
END;

${SCOPED_DELETE_TRIGGERS}
`.trim()
});
