import type { SqlMigration } from "../migration.js";

export const MIGRATION_014_DEMO_GOLDEN_WORKFLOW: SqlMigration = Object.freeze({
  version: 14,
  name: "demo_golden_workflow",
  sql: `
ALTER TABLE demo_workspaces
  ADD COLUMN workflow_stage TEXT NOT NULL DEFAULT 'INITIAL_BLOCKED'
  CHECK (workflow_stage IN ('INITIAL_BLOCKED', 'CORRECTED_READY', 'READY_STALE'));
ALTER TABLE demo_workspaces
  ADD COLUMN corrected_snapshot_id TEXT REFERENCES git_snapshots(snapshot_id);
ALTER TABLE demo_workspaces
  ADD COLUMN corrected_code_map_revision INTEGER CHECK (corrected_code_map_revision IS NULL OR corrected_code_map_revision > 0);
ALTER TABLE demo_workspaces
  ADD COLUMN corrected_twin_revision INTEGER CHECK (corrected_twin_revision IS NULL OR corrected_twin_revision > 0);
ALTER TABLE demo_workspaces
  ADD COLUMN corrected_reconciliation_revision INTEGER CHECK (corrected_reconciliation_revision IS NULL OR corrected_reconciliation_revision > 0);
ALTER TABLE demo_workspaces
  ADD COLUMN ready_assessment_revision INTEGER CHECK (ready_assessment_revision IS NULL OR ready_assessment_revision > 0);
ALTER TABLE demo_workspaces
  ADD COLUMN passport_assessment_revision INTEGER CHECK (passport_assessment_revision IS NULL OR passport_assessment_revision > 0);
ALTER TABLE demo_workspaces
  ADD COLUMN stale_snapshot_id TEXT REFERENCES git_snapshots(snapshot_id);

CREATE TRIGGER demo_workspaces_validate_golden_stage_insert
BEFORE INSERT ON demo_workspaces
BEGIN
  SELECT CASE WHEN NEW.workflow_stage <> 'INITIAL_BLOCKED'
    THEN RAISE(ABORT, 'new demo workspaces must begin blocked') END;
END;

CREATE TRIGGER demo_workspaces_validate_golden_stage_update
BEFORE UPDATE OF workflow_stage, corrected_snapshot_id, corrected_code_map_revision,
  corrected_twin_revision, corrected_reconciliation_revision,
  ready_assessment_revision, passport_assessment_revision, stale_snapshot_id
ON demo_workspaces
BEGIN
  SELECT CASE WHEN NEW.lifecycle_status = 'READY' AND NEW.workflow_stage = 'INITIAL_BLOCKED' AND (
    NEW.corrected_snapshot_id IS NOT NULL OR NEW.corrected_code_map_revision IS NOT NULL OR
    NEW.corrected_twin_revision IS NOT NULL OR NEW.corrected_reconciliation_revision IS NOT NULL OR
    NEW.ready_assessment_revision IS NOT NULL OR NEW.passport_assessment_revision IS NOT NULL OR
    NEW.stale_snapshot_id IS NOT NULL
  ) THEN RAISE(ABORT, 'blocked demo stage contains later workflow state') END;
  SELECT CASE WHEN NEW.lifecycle_status = 'READY' AND NEW.workflow_stage IN ('CORRECTED_READY', 'READY_STALE') AND (
    NEW.corrected_snapshot_id IS NULL OR NEW.corrected_code_map_revision IS NULL OR
    NEW.corrected_twin_revision IS NULL OR NEW.corrected_reconciliation_revision IS NULL OR
    NEW.ready_assessment_revision IS NULL OR NEW.passport_assessment_revision IS NULL
  ) THEN RAISE(ABORT, 'corrected demo stage is incomplete') END;
  SELECT CASE WHEN NEW.lifecycle_status = 'READY' AND NEW.workflow_stage = 'CORRECTED_READY'
    AND NEW.stale_snapshot_id IS NOT NULL
    THEN RAISE(ABORT, 'ready demo stage contains stale state') END;
  SELECT CASE WHEN NEW.lifecycle_status = 'READY' AND NEW.workflow_stage = 'READY_STALE'
    AND NEW.stale_snapshot_id IS NULL
    THEN RAISE(ABORT, 'stale demo stage is incomplete') END;
END;
`.trim()
});
