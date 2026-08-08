import { useEffect, useMemo, useState } from "react";

import type {
  MissionResource,
  ReadinessAssessmentResource,
  ReadinessAssessmentSummaryResource,
  ReleasePassportExportResponse,
  ReleasePassportResource,
  ReleasePassportSummaryResource
} from "@intelliloop/contracts";

import {
  createReadinessAssessment,
  createReleasePassport,
  getReadinessAssessment,
  getReleasePassport,
  getReleasePassportExport,
  listReadinessAssessments,
  listReleasePassports
} from "./readiness-passport-client";
import {
  WorkspaceClientError,
  getMission
} from "./workspace-client";
import {
  PRODUCT_TERMS,
  ReleaseCheckBadge,
  WorkflowStatusBadge,
  presentReleaseCheck
} from "./presentation";

interface ReadinessPassportWorkspaceProps {
  readonly missionId: string;
  readonly fetcher?: typeof fetch;
  readonly onProjectAvailable?: (projectId: string) => void;
  readonly onOpenReconciliation?: (missionId: string) => void;
  readonly onOpenExplanation?: (missionId: string) => void;
}

type WorkspaceState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "integrity-error" }
  | {
      readonly kind: "ready";
      readonly mission: MissionResource;
      readonly assessments: readonly ReadinessAssessmentSummaryResource[];
      readonly passports: readonly ReleasePassportSummaryResource[];
      readonly selected?: ReadinessAssessmentResource;
      readonly passport?: ReleasePassportResource;
      readonly partial: boolean;
    };

function displayToken(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

function shortDigest(value: string): string {
  return `${value.slice(0, 15)}…${value.slice(-8)}`;
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The Release Check could not be loaded.";
}

function triggerDownload(value: ReleasePassportExportResponse): boolean {
  if (
    typeof document === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) return false;
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `intelliloop-release-evidence-report-r${value.passport.assessmentRevision}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

function PassportPanel({
  passport,
  projecting,
  exporting,
  onProject,
  onExport
}: {
  readonly passport?: ReleasePassportResource;
  readonly projecting: boolean;
  readonly exporting: boolean;
  readonly onProject: () => void;
  readonly onExport: () => void;
}): JSX.Element {
  if (passport === undefined) {
    return (
      <section id="release-evidence-report" className="passport-panel passport-panel--empty" aria-labelledby="passport-title" tabIndex={-1}>
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">One-assessment projection</p>
          <h2 id="passport-title">No Release Evidence Report exists for this assessment</h2>
          <p>Create one immutable unsigned report. The action copies the persisted assessment and does not recompute the Release Check.</p>
        </div>
        <button className="primary-action" type="button" onClick={onProject} disabled={projecting}>
          {projecting ? "Projecting exact assessment…" : "Create immutable Evidence Report"}
        </button>
      </section>
    );
  }

  return (
    <section id="release-evidence-report" className="passport-panel" aria-labelledby="passport-title" data-passport-status={passport.currentStatus} tabIndex={-1}>
      <div className="section-heading section-heading--wide">
        <p className="eyebrow">Unsigned immutable record</p>
        <h2 id="passport-title">{PRODUCT_TERMS.releasePassport}</h2>
        <p>Result when recorded <ReleaseCheckBadge status={passport.statusAtProjection} />; current association <ReleaseCheckBadge status={passport.currentStatus} />.</p>
      </div>
      <div className="passport-actions readiness-no-print">
        <button className="secondary-action" type="button" onClick={onExport} disabled={exporting}>
          {exporting ? "Verifying safe export…" : "Download structural JSON"}
        </button>
        <button className="secondary-action secondary-action--neutral" type="button" onClick={() => window.print()}>
          Print this view
        </button>
      </div>
      <div className="scope-note" role="note" aria-label="Release Evidence Report authority boundary">
        <strong>UNSIGNED / NOT APPROVAL</strong>
        <span>This report reproduces one persisted assessment. It cannot waive blockers, approve release, sign an attestation or authorize deployment.</span>
      </div>
      <dl className="passport-identity">
        <div><dt>Report ID</dt><dd><code>{shortId(passport.passportId)}</code></dd></div>
        <div><dt>Assessment</dt><dd>Revision {passport.assessmentRevision} / <code>{shortId(passport.assessmentId)}</code></dd></div>
        <div><dt>Recorded</dt><dd>{passport.recordedAtUtc}</dd></div>
        <div><dt>Report digest</dt><dd><code>{passport.passportDigest}</code></dd></div>
        <div><dt>Evidence digest</dt><dd><code>{passport.evidenceDigest}</code></dd></div>
      </dl>
      <section aria-labelledby="passport-citations-title">
        <h3 id="passport-citations-title">Structural citations</h3>
        <ol className="passport-citation-list">
          {passport.citations.map((citation, index) => (
            <li key={`${citation.kind}-${citation.referenceId}-${index}`}>
              <strong>{displayToken(citation.kind)}</strong>
              <code>{citation.referenceId}</code>
              {"referenceDigest" in citation ? <small>{citation.referenceDigest}</small> : null}
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

export function ReadinessPassportWorkspace({
  missionId,
  fetcher = globalThis.fetch,
  onProjectAvailable,
  onOpenReconciliation,
  onOpenExplanation
}: ReadinessPassportWorkspaceProps): JSX.Element {
  const [state, setState] = useState<WorkspaceState>({ kind: "loading" });
  const [selectedRevision, setSelectedRevision] = useState<number>();
  const [attempt, setAttempt] = useState(0);
  const [assessing, setAssessing] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void Promise.all([
      getMission(missionId, fetcher, controller.signal),
      listReadinessAssessments(missionId, fetcher, controller.signal),
      listReleasePassports(missionId, fetcher, controller.signal)
    ]).then(async ([missionResponse, assessmentList, passportList]) => {
      if (controller.signal.aborted) return;
      const revision = selectedRevision ?? assessmentList.assessments[0]?.revision;
      if (revision === undefined) {
        setState({
          kind: "ready",
          mission: missionResponse.mission,
          assessments: assessmentList.assessments,
          passports: passportList.passports,
          partial: assessmentList.page.nextCursor !== null || passportList.page.nextCursor !== null
        });
        return;
      }
      const passportExists = passportList.passports.some(
        (passport) => passport.assessmentRevision === revision
      );
      const [assessmentResponse, passportResponse] = await Promise.all([
        getReadinessAssessment(missionId, revision, fetcher, controller.signal),
        passportExists
          ? getReleasePassport(missionId, revision, fetcher, controller.signal)
          : Promise.resolve(undefined)
      ]);
      if (controller.signal.aborted) return;
      setSelectedRevision(revision);
      setState({
        kind: "ready",
        mission: missionResponse.mission,
        assessments: assessmentList.assessments,
        passports: passportList.passports,
        selected: assessmentResponse.assessment,
        ...(passportResponse === undefined ? {} : { passport: passportResponse.passport }),
        partial: assessmentList.page.nextCursor !== null || passportList.page.nextCursor !== null
      });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setState(error instanceof WorkspaceClientError && error.code === "INVALID_RESPONSE"
        ? { kind: "integrity-error" }
        : { kind: "error", message: safeMessage(error) });
    });
    return () => controller.abort();
  }, [attempt, fetcher, missionId, selectedRevision]);

  useEffect(() => {
    if (state.kind === "ready") onProjectAvailable?.(state.mission.projectId);
  }, [onProjectAvailable, state]);

  const selectedPassportSummary = useMemo(() => state.kind === "ready" && state.selected !== undefined
    ? state.passports.find((passport) => passport.assessmentRevision === state.selected?.revision)
    : undefined, [state]);

  function refresh(): void {
    setAttempt((value) => value + 1);
  }

  async function assess(): Promise<void> {
    setAssessing(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await createReadinessAssessment(missionId, fetcher);
      setSelectedRevision(response.assessment.revision);
      setNotice(response.created
        ? `Immutable assessment revision ${response.assessment.revision} recorded.`
        : `Revision ${response.assessment.revision} already represents the exact current inputs.`);
      refresh();
    } catch (error) {
      setActionError(safeMessage(error));
    } finally {
      setAssessing(false);
    }
  }

  async function projectPassport(): Promise<void> {
    if (state.kind !== "ready" || state.selected === undefined) return;
    setProjecting(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await createReleasePassport(missionId, state.selected.revision, fetcher);
      setNotice(response.created
        ? `Unsigned Release Evidence Report for assessment revision ${state.selected.revision} recorded.`
        : `The exact Release Evidence Report for assessment revision ${state.selected.revision} already exists.`);
      refresh();
    } catch (error) {
      setActionError(safeMessage(error));
    } finally {
      setProjecting(false);
    }
  }

  async function exportPassport(): Promise<void> {
    if (state.kind !== "ready" || state.passport === undefined) return;
    setExporting(true);
    setActionError(null);
    setNotice(null);
    try {
      const exported = await getReleasePassportExport(
        missionId, state.passport.assessmentRevision, fetcher
      );
      const downloaded = triggerDownload(exported);
      setNotice(downloaded
        ? "Verified structural Evidence Report JSON downloaded. It remains unsigned and non-approving."
        : "Structural Evidence Report export verified; this browser could not start the local download.");
    } catch (error) {
      setActionError(safeMessage(error));
    } finally {
      setExporting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <section className="overview-state" role="status" aria-live="polite" aria-busy="true">
        <span className="state-label">LOADING</span>
        <h1>Reading Release Check and Evidence Report history</h1>
        <p>Verifying persisted assessments, exact dependency state and unsigned projections.</p>
      </section>
    );
  }
  if (state.kind === "integrity-error") {
    return (
      <section className="overview-state overview-state--error" role="alert" data-state="INTEGRITY_ERROR">
        <span className="state-label">INTEGRITY ERROR</span>
        <h1>Release Check history failed verification</h1>
        <p>Scope, ordering, digests, authority fields or assessment/report bindings were inconsistent. No partial result is displayed.</p>
        <button className="secondary-action" type="button" onClick={refresh}>Retry integrity check</button>
      </section>
    );
  }
  if (state.kind === "error") {
    return (
      <section className="overview-state overview-state--error" role="alert">
        <span className="state-label">ERROR</span>
        <h1>Release Check unavailable</h1>
        <p>{state.message}</p>
        <button className="secondary-action" type="button" onClick={refresh}>Retry Release Check</button>
      </section>
    );
  }

  const assessment = state.selected;
  const presentedReleaseCheck = presentReleaseCheck(assessment?.currentStatus);
  return (
    <div className="readiness-workspace">
      <header className="overview-hero readiness-hero">
        <div>
          <p className="eyebrow">Current route / Release Check &amp; Report</p>
          <h1>{state.mission.title}</h1>
          <p className="hero__lede">See whether this exact analyzed change is ready, why, and which stored evidence supports the result.</p>
          <div className="route-actions readiness-no-print">
            {onOpenReconciliation === undefined ? null : (
              <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenReconciliation(missionId)}>Risks &amp; Checks</button>
            )}
            {onOpenExplanation === undefined ? null : (
              <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenExplanation(missionId)}>Cited explanation</button>
            )}
          </div>
        </div>
        <div className="status-axis-card" role="group" aria-label="Work Item status summary">
          <div><span>Workflow Status</span><WorkflowStatusBadge /></div>
          <div><span>Release Check</span><ReleaseCheckBadge status={assessment?.currentStatus} /></div>
        </div>
      </header>

      <div className="scope-note" role="note" aria-label="Release Check interpretation boundary">
        <strong>Fail closed</strong>
        <span>Ready describes only the exact persisted evidence, rule and dependency versions. The screen cannot recompute, override or approve a Release Check.</span>
      </div>
      {actionError === null ? null : <div className="action-error" role="alert"><strong>Action not completed.</strong> {actionError}</div>}
      {notice === null ? null : <div className="import-notice" role="status" aria-live="polite"><strong>Recorded.</strong> {notice}</div>}

      <section className="readiness-controls readiness-no-print" aria-labelledby="readiness-history-title">
        <div>
          <p className="eyebrow">Immutable history</p>
          <h2 id="readiness-history-title">Assessment revisions</h2>
          <p>Running again reuses exact input or appends a successor. It never rewrites history.</p>
        </div>
        {state.assessments.length === 0 ? null : (
          <label htmlFor="readiness-revision">
            Selected persisted assessment
            <select id="readiness-revision" value={assessment?.revision ?? ""} onChange={(event) => setSelectedRevision(Number(event.currentTarget.value))}>
              {state.assessments.map((item) => (
                <option key={item.assessmentId} value={item.revision}>
                  Revision {item.revision} / recorded {presentReleaseCheck(item.evaluatedStatus).label} / current {presentReleaseCheck(item.currentStatus).label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="primary-action" type="button" onClick={() => void assess()} disabled={assessing}>
          {assessing ? "Assessing repository-backed inputs…" : "Assess current persisted evidence"}
        </button>
      </section>

      {state.partial ? <div className="partial-warning" role="status"><strong>PARTIAL HISTORY</strong><span>Only the bounded latest 100 assessments/reports are shown.</span></div> : null}

      {assessment === undefined ? (
        <section className="readiness-empty" data-state="EMPTY" aria-labelledby="readiness-empty-title">
          <span className="state-label">NOT CHECKED</span>
          <h2 id="readiness-empty-title">Release Check: Not Checked</h2>
          <p>Run the deterministic assessment against current repository-backed inputs. No sample, cached or inferred result is substituted.</p>
        </section>
      ) : (
        <>
          <section id="release-check" className={`readiness-verdict readiness-verdict--${assessment.currentStatus.toLowerCase()}`} aria-labelledby="readiness-verdict-title" data-readiness-status={assessment.currentStatus} tabIndex={-1}>
            <div>
              <p className="eyebrow">Stored Release Check</p>
              <h2 id="readiness-verdict-title">{presentedReleaseCheck.label}</h2>
              <p>{presentedReleaseCheck.explanation}</p>
            </div>
            <dl>
              <div><dt>Result when evaluated</dt><dd><ReleaseCheckBadge status={assessment.evaluatedStatus} /></dd></div>
              <div><dt>Assessment revision</dt><dd>{assessment.revision}</dd></div>
              <div><dt>Recorded</dt><dd>{assessment.recordedAtUtc}</dd></div>
              <div><dt>Rule</dt><dd>{assessment.rule.policyVersion}</dd></div>
            </dl>
          </section>

          {assessment.currentStatus === "STALE" ? (
            <section className="stale-reasons" aria-labelledby="stale-reasons-title">
              <h3 id="stale-reasons-title">Exact dependency changes</h3>
              {assessment.staleReasons.length === 0 ? (
                <p>The assessment itself evaluated stale; no later dependency difference is associated.</p>
              ) : (
                <ul>{assessment.staleReasons.map((reason) => <li key={reason}>{displayToken(reason)}</li>)}</ul>
              )}
              <p>The historical evaluated result, assessment bytes and any Release Evidence Report remain unchanged.</p>
            </section>
          ) : null}

          <section className="obligation-section" aria-labelledby="obligations-title">
            <div className="section-heading section-heading--wide">
              <p className="eyebrow">Nine fixed checks</p>
              <h2 id="obligations-title">Release Check obligations</h2>
              <p>The API provides every status and blocker. This browser performs no Release Check calculation.</p>
            </div>
            <ol className="obligation-list">
              {assessment.obligations.map((obligation) => (
                <li key={obligation.obligationId} data-obligation-status={obligation.status}>
                  <div><span className="state-label">{obligation.status}</span><strong>{displayToken(obligation.obligationId)}</strong></div>
                  <p>{obligation.requirement}</p>
                  {obligation.blockerCodes.length === 0 ? <small>No blocker.</small> : (
                    <ul>{obligation.blockerCodes.map((code) => <li key={code}>{displayToken(code)}</li>)}</ul>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="readiness-detail-grid" aria-label="Release Check evidence details">
            <article>
              <h2>Open blockers</h2>
              {assessment.blockers.length === 0 ? <p>No blocker in this exact assessment.</p> : (
                <ol>{assessment.blockers.map((blocker) => <li key={blocker.code}><strong>{displayToken(blocker.code)}</strong><small>{displayToken(blocker.obligationId)}</small></li>)}</ol>
              )}
            </article>
            <article>
              <h2>Finding counts</h2>
              <dl>{(["CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP"] as const).map((kind) => <div key={kind}><dt>{displayToken(kind)}</dt><dd>{assessment.findings[kind]}</dd></div>)}</dl>
            </article>
            <article>
              <h2>Validation evidence</h2>
              <p>{assessment.validations.evidence.length} of {assessment.validations.requirements.length} required results are present.</p>
              {assessment.validations.requirements.length === 0 ? <small>No explicit validation requirement is stored.</small> : (
                <ul>{assessment.validations.requirements.map((requirement) => {
                  const evidence = assessment.validations.evidence.find((entry) => entry.requirementId === requirement.requirementId);
                  return <li key={requirement.requirementId}><strong>{requirement.validationKey}</strong><small>{evidence?.status ?? "MISSING"}</small></li>;
                })}</ul>
              )}
            </article>
            <article>
              <h2>Explicit review</h2>
              {assessment.review.status === "MISSING" ? <p>MISSING — no persisted human review binds this exact reconciliation and snapshot.</p> : (
                <dl><div><dt>Actor</dt><dd>{assessment.review.actorKind}</dd></div><div><dt>Review</dt><dd><code>{shortId(assessment.review.reviewId)}</code></dd></div></dl>
              )}
            </article>
          </section>

          <section className="readiness-binding" aria-labelledby="readiness-binding-title">
            <h2 id="readiness-binding-title">Exact assessment binding</h2>
            <dl>
              <div><dt>Assessment digest</dt><dd><code>{assessment.assessmentDigest}</code></dd></div>
              <div><dt>State digest</dt><dd><code>{assessment.stateDigest}</code></dd></div>
              <div><dt>Evaluated input</dt><dd><code>{assessment.inputFingerprint.evaluatedDigest}</code></dd></div>
              <div><dt>Current input</dt><dd><code>{assessment.inputFingerprint.currentDigest}</code></dd></div>
              <div><dt>Analyzed Commit</dt><dd><code>{assessment.snapshot.targetSnapshotId}</code></dd></div>
              <div><dt>Resolve Conflicts</dt><dd>Revision {assessment.reconciliation.revision} / <code>{shortDigest(assessment.reconciliation.resultDigest)}</code></dd></div>
            </dl>
          </section>

          <PassportPanel
            {...(state.passport === undefined ? {} : { passport: state.passport })}
            projecting={projecting}
            exporting={exporting}
            onProject={() => void projectPassport()}
            onExport={() => void exportPassport()}
          />
          {selectedPassportSummary !== undefined && state.passport === undefined ? (
            <div className="action-error" role="alert">Evidence Report history reported this revision, but its exact record was not loaded.</div>
          ) : null}
        </>
      )}
    </div>
  );
}
