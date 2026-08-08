import { useEffect, useMemo, useState } from "react";

import type {
  CodeMapAssetResource,
  CodeMapRevisionSummaryResource,
  MissionResource,
  ReconciliationFindingResource,
  ReconciliationImpactPathResource,
  ReconciliationRevisionSummaryResource,
  RunReconciliationRequest,
  TwinNodeResource,
  TwinRevisionSummaryResource
} from "@intelliloop/contracts";

import { listCodeMapAssets, listCodeMapRevisions } from "./code-map-client";
import {
  getReconciliationRevision,
  listReconciliationFindings,
  listReconciliationImpactPaths,
  listReconciliationRevisions,
  runReconciliation
} from "./reconciliation-client";
import { listTwinNodes, listTwinRevisions } from "./twin-client";
import { WorkspaceClientError, getMission } from "./workspace-client";
import { PRODUCT_TERMS } from "./presentation";

export interface ReconciliationWorkspaceProps {
  readonly missionId: string;
  readonly fetcher: typeof fetch;
  readonly onProjectAvailable?: (projectId: string) => void;
  readonly onOpenEvidence?: (missionId: string) => void;
  readonly onOpenTwin?: (missionId: string) => void;
  readonly onOpenExplanation?: (missionId: string) => void;
}

interface ReconciliationViewData {
  readonly mission: MissionResource;
  readonly revisions: readonly ReconciliationRevisionSummaryResource[];
  readonly twinRevisions: readonly TwinRevisionSummaryResource[];
  readonly codeMapRevisions: readonly CodeMapRevisionSummaryResource[];
  readonly selected?: ReconciliationRevisionSummaryResource;
  readonly findings: readonly ReconciliationFindingResource[];
  readonly impactPaths: readonly ReconciliationImpactPathResource[];
  readonly partial: boolean;
}

type ReconciliationViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "integrity-error" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly data: ReconciliationViewData };

interface CompatibleInput {
  readonly twin: TwinRevisionSummaryResource;
  readonly codeMap: CodeMapRevisionSummaryResource;
}

type AssessmentInputState =
  | { readonly kind: "loading" }
  | { readonly kind: "setup-required" }
  | { readonly kind: "integrity-error" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly input: CompatibleInput;
      readonly nodes: readonly TwinNodeResource[];
      readonly assets: readonly CodeMapAssetResource[];
      readonly partial: boolean;
    };

const IDENTIFIER_PATTERN =
  /^(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[a-z0-9][a-z0-9._:/-]*$/u;

const FINDING_TITLES = {
  CONFLICT: "Conflicting active claims",
  AMBIGUOUS: "Ambiguous active claims",
  MISSING: "Required support is missing",
  STALE: "Earlier assessment became stale",
  IMPACT_GAP: "Declared impact support has a gap"
} as const;

const REASON_TEXT: Readonly<Record<string, string>> = Object.freeze({
  SCALAR_VALUES_DIFFER: "The same scoped claim has different scalar values.",
  UNKNOWN_VALUE_PRESENT: "At least one value is unknown, so equivalence cannot be established.",
  VALUE_TYPES_DIFFER_NO_COERCION: "The values use different types and no coercion is authorized.",
  STRUCTURED_VALUE_POLICY_REQUIRED: "Structured values require an explicit comparison policy.",
  REQUIRED_EVIDENCE_ABSENT: "No current evidence source matches the declared locator exactly.",
  REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT:
    "No persisted validation result matches this key and exact target snapshot.",
  EXACT_DEPENDENCY_CHANGED:
    "At least one exact dependency changed since the predecessor assessment.",
  CRITICAL_IMPLEMENTATION_ASSET_ABSENT:
    "The declared critical asset is absent from the exact Impact Map/code-map binding.",
  CRITICAL_IMPLEMENTATION_PATH_ABSENT:
    "No authorized deterministic path reaches the declared implementation asset.",
  REQUIRED_VALIDATION_RESULT_ABSENT:
    "The declared validation result is absent for the exact target snapshot.",
  REQUIRED_VALIDATION_PATH_ABSENT:
    "An implementation path exists, but no authorized path reaches the required validation.",
  IMPLEMENTATION_SUPPORT_UNAVAILABLE:
    "The selected code-map evidence is explicitly unavailable, so implementation support cannot be claimed."
});

function displayToken(value: string): string {
  return value.replaceAll("_", " ");
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function shortDigest(value: string): string {
  return `${value.slice(0, 15)}...${value.slice(-8)}`;
}

function reasonText(reason: string): string {
  return REASON_TEXT[reason] ?? displayToken(reason).toLowerCase();
}

function safeMessage(error: unknown): string {
  return error instanceof WorkspaceClientError
    ? error.message
    : "The local reconciliation workspace could not be loaded.";
}

function identifierIsValid(value: string): boolean {
  return value.length >= 3 && value.length <= 256 && IDENTIFIER_PATTERN.test(value);
}

function compatibleInput(
  twins: readonly TwinRevisionSummaryResource[],
  codeMaps: readonly CodeMapRevisionSummaryResource[]
): CompatibleInput | undefined {
  for (const twin of twins) {
    if (twin.codeMapBinding === undefined) continue;
    const codeMap = codeMaps.find(
      (candidate) =>
        candidate.projectionId === twin.codeMapBinding?.projectionId &&
        candidate.revision === twin.codeMapBinding.revision &&
        candidate.projectionDigest === twin.codeMapBinding.projectionDigest
    );
    if (codeMap !== undefined) return { twin, codeMap };
  }
  return undefined;
}

function countsMatch(
  summary: ReconciliationRevisionSummaryResource,
  findings: readonly ReconciliationFindingResource[]
): boolean {
  const counts = {
    CONFLICT: 0,
    AMBIGUOUS: 0,
    MISSING: 0,
    STALE: 0,
    IMPACT_GAP: 0
  };
  for (const finding of findings) counts[finding.findingKind] += 1;
  return Object.entries(counts).every(
    ([kind, count]) => summary.findingCounts[kind as keyof typeof counts] === count
  ) && summary.findingCounts.total === findings.length;
}

function FindingCard({ finding }: { readonly finding: ReconciliationFindingResource }): JSX.Element {
  return (
    <li className={`finding-card finding-card--${finding.findingKind.toLowerCase()}`}>
      <article aria-labelledby={`finding-${finding.findingKey.slice(7, 19)}`}>
        <header>
          <div>
            <span className="finding-kind">{displayToken(finding.findingKind)}</span>
            <h3 id={`finding-${finding.findingKey.slice(7, 19)}`}>
              {FINDING_TITLES[finding.findingKind]}
            </h3>
          </div>
          <span className="open-status">OPEN</span>
        </header>
        <p className="finding-reason"><strong>Why:</strong> {reasonText(finding.reason)}</p>

        {finding.findingKind === "CONFLICT" || finding.findingKind === "AMBIGUOUS" ? (
          <dl className="evidence-lines">
            <div><dt>Claim A</dt><dd><code>{shortId(finding.claimIds[0])}</code> / <code>{shortDigest(finding.claimDigests[0])}</code></dd></div>
            <div><dt>Claim B</dt><dd><code>{shortId(finding.claimIds[1])}</code> / <code>{shortDigest(finding.claimDigests[1])}</code></dd></div>
            <div><dt>Comparison</dt><dd><code>{shortDigest(finding.comparisonKey)}</code></dd></div>
          </dl>
        ) : null}

        {finding.findingKind === "MISSING" ? (
          <dl className="evidence-lines">
            <div><dt>Requirement</dt><dd><code>{finding.requirement.requirementId}</code></dd></div>
            <div><dt>Support</dt><dd>{displayToken(finding.requirement.supportKind)}</dd></div>
            <div>
              <dt>Exact match</dt>
              <dd><code>{finding.requirement.supportKind === "EVIDENCE_SOURCE"
                ? finding.requirement.sourceLocator
                : finding.requirement.validationKey}</code></dd>
            </div>
            <div><dt>Analyzed Commit</dt><dd><code>{shortId(finding.targetSnapshotId)}</code></dd></div>
          </dl>
        ) : null}

        {finding.findingKind === "STALE" ? (
          <>
            <p className="finding-context">
              Compared with reassessment revision {finding.predecessorRevision} / {shortDigest(finding.predecessorDigest)}.
            </p>
            <ol className="dependency-change-list" aria-label="Exact dependency changes">
              {finding.dependencyChanges.map((change) => (
                <li key={`${change.dependencyKind}:${change.dependencyKey}`}>
                  <strong>{change.changeType} {displayToken(change.dependencyKind)}</strong>
                  <code>{change.dependencyKey}</code>
                  <small>
                    {change.beforeDigest === undefined ? "none" : shortDigest(change.beforeDigest)}
                    {" -> "}
                    {change.afterDigest === undefined ? "none" : shortDigest(change.afterDigest)}
                  </small>
                </li>
              ))}
            </ol>
          </>
        ) : null}

        {finding.findingKind === "IMPACT_GAP" ? (
          <>
            <dl className="evidence-lines">
              <div><dt>Requirement</dt><dd><code>{finding.requirement.requirementId}</code></dd></div>
              <div><dt>Root</dt><dd><code>{finding.requirement.rootId}</code></dd></div>
              <div><dt>Critical asset</dt><dd><code>{shortId(finding.requirement.criticalAssetId)}</code></dd></div>
              <div><dt>Support</dt><dd>{finding.requirement.supportKind}</dd></div>
              {finding.supportingPathKey === undefined ? null : (
                <div><dt>Supporting path</dt><dd><code>{shortDigest(finding.supportingPathKey)}</code></dd></div>
              )}
            </dl>
            <details className="citation-details">
              <summary>Inspect {finding.basisCitations.length} exact basis citation{finding.basisCitations.length === 1 ? "" : "s"}</summary>
              <ul>
                {finding.basisCitations.map((citation) => (
                  <li key={`${citation.kind}:${citation.memberId}`}>
                    {citation.kind} <code>{shortId(citation.memberId)}</code> r{citation.revision} / <code>{shortDigest(citation.digest)}</code>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : null}

        <p className="digest-line">Finding key <code>{finding.findingKey}</code></p>
      </article>
    </li>
  );
}

function ImpactPathCard({ path }: { readonly path: ReconciliationImpactPathResource }): JSX.Element {
  return (
    <li className="impact-path-card">
      <article aria-labelledby={`path-${path.pathKey.slice(7, 19)}`}>
        <header>
          <div>
            <span className="state-label">{path.supportKind} / DEPTH {path.depth}</span>
            <h3 id={`path-${path.pathKey.slice(7, 19)}`}>{path.requirementId}</h3>
          </div>
          {path.validationStatus === undefined ? null : (
            <span className={`validation-status validation-status--${path.validationStatus.toLowerCase()}`}>
              {path.validationStatus}
            </span>
          )}
        </header>
        <p className="path-endpoints">
          <code>{shortId(path.root.memberId)}</code>
          <span aria-hidden="true"> -&gt; </span>
          <code>{shortId(path.criticalAsset.memberId)}</code>
        </p>
        {path.steps.length === 0 ? (
          <p className="finding-context">The declared root is the critical asset; no graph hop is required.</p>
        ) : (
          <ol className="impact-step-list" aria-label="Deterministic impact path steps">
            {path.steps.map((step) => (
              <li key={step.stepIndex}>
                <span>{step.stepIndex + 1}</span>
                <div>
                  <strong>{step.direction} {displayToken(step.relationshipType)}</strong>
                  <p><code>{shortId(step.from.memberId)}</code> to <code>{shortId(step.to.memberId)}</code></p>
                  <small>{step.relationship.sourceReference}</small>
                </div>
              </li>
            ))}
          </ol>
        )}
        <details className="citation-details">
          <summary>Inspect path provenance</summary>
          <dl className="evidence-lines">
            <div><dt>Root source</dt><dd><code>{path.root.sourceReference}</code></dd></div>
            <div><dt>Asset source</dt><dd><code>{path.criticalAsset.sourceReference}</code></dd></div>
            <div><dt>Path digest</dt><dd><code>{path.pathDigest}</code></dd></div>
          </dl>
        </details>
      </article>
    </li>
  );
}

export function ReconciliationWorkspace({
  missionId,
  fetcher,
  onProjectAvailable,
  onOpenEvidence,
  onOpenTwin,
  onOpenExplanation
}: ReconciliationWorkspaceProps): JSX.Element {
  const [state, setState] = useState<ReconciliationViewState>({ kind: "loading" });
  const [inputState, setInputState] = useState<AssessmentInputState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedRevision, setSelectedRevision] = useState<number | undefined>();
  const [running, setRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [evidenceLocator, setEvidenceLocator] = useState("");
  const [validationRequirementKey, setValidationRequirementKey] = useState("");
  const [impactEnabled, setImpactEnabled] = useState(false);
  const [rootNodeId, setRootNodeId] = useState("");
  const [criticalAssetId, setCriticalAssetId] = useState("");
  const [impactSupportKind, setImpactSupportKind] = useState<"IMPLEMENTATION" | "VALIDATION">("IMPLEMENTATION");
  const [impactValidationKey, setImpactValidationKey] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      try {
        const [missionResponse, revisionResponse, twinResponse, codeMapResponse] = await Promise.all([
          getMission(missionId, fetcher, controller.signal),
          listReconciliationRevisions(missionId, fetcher, controller.signal),
          listTwinRevisions(missionId, fetcher, controller.signal),
          listCodeMapRevisions(missionId, fetcher, controller.signal)
        ]);
        const mission = missionResponse.mission;
        if (mission.missionId !== missionId || revisionResponse.missionId !== missionId ||
          twinResponse.missionId !== missionId || codeMapResponse.missionId !== missionId ||
          revisionResponse.revisions.some((revision) => revision.projectId !== mission.projectId) ||
          twinResponse.revisions.some((revision) => revision.projectId !== mission.projectId) ||
          codeMapResponse.revisions.some((revision) => revision.projectId !== mission.projectId)) {
          throw new WorkspaceClientError("INVALID_RESPONSE");
        }

        const revisionNumber = selectedRevision ?? revisionResponse.revisions[0]?.revision;
        let selected = revisionNumber === undefined
          ? undefined
          : revisionResponse.revisions.find((revision) => revision.revision === revisionNumber);
        if (revisionNumber !== undefined && selected === undefined) {
          if (selectedRevision === null || revisionResponse.page.nextCursor === null) {
            throw new WorkspaceClientError("INVALID_RESPONSE");
          }
          const exactResponse = await getReconciliationRevision(
            missionId,
            revisionNumber,
            fetcher,
            controller.signal
          );
          if (exactResponse.reconciliationRevision.missionId !== missionId ||
            exactResponse.reconciliationRevision.projectId !== mission.projectId ||
            exactResponse.reconciliationRevision.revision !== revisionNumber) {
            throw new WorkspaceClientError("INVALID_RESPONSE");
          }
          selected = exactResponse.reconciliationRevision;
        }
        let findings: readonly ReconciliationFindingResource[] = [];
        let impactPaths: readonly ReconciliationImpactPathResource[] = [];
        let memberPartial = false;
        if (selected !== undefined) {
          const [findingResponse, pathResponse] = await Promise.all([
            listReconciliationFindings(missionId, selected.revision, fetcher, controller.signal),
            listReconciliationImpactPaths(missionId, selected.revision, fetcher, controller.signal)
          ]);
          if (findingResponse.missionId !== missionId || pathResponse.missionId !== missionId ||
            findingResponse.reconciliationRevision !== selected.revision ||
            pathResponse.reconciliationRevision !== selected.revision ||
            findingResponse.findings.some((finding) =>
              finding.projectId !== mission.projectId || finding.missionId !== missionId)) {
            throw new WorkspaceClientError("INVALID_RESPONSE");
          }
          findings = findingResponse.findings;
          impactPaths = pathResponse.impactPaths;
          const findingPartial = findingResponse.page.nextCursor !== null;
          const pathPartial = pathResponse.page.nextCursor !== null;
          memberPartial = findingPartial || pathPartial;
          if ((!findingPartial && !countsMatch(selected, findings)) ||
            (!pathPartial && selected.impactPathCount !== impactPaths.length) ||
            (!findingPartial && !pathPartial && findings.some((finding) =>
              finding.findingKind === "IMPACT_GAP" &&
              finding.supportingPathKey !== undefined &&
              !impactPaths.some((path) => path.pathKey === finding.supportingPathKey)))) {
            throw new WorkspaceClientError("INVALID_RESPONSE");
          }
        }
        if (!controller.signal.aborted) {
          setState({
            kind: "ready",
            data: {
              mission,
              revisions: selected !== undefined && !revisionResponse.revisions.some((revision) =>
                revision.revision === selected?.revision)
                ? [...revisionResponse.revisions, selected].sort((left, right) =>
                    right.revision - left.revision)
                : revisionResponse.revisions,
              twinRevisions: twinResponse.revisions,
              codeMapRevisions: codeMapResponse.revisions,
              ...(selected === undefined ? {} : { selected }),
              findings,
              impactPaths,
              partial: memberPartial || revisionResponse.page.nextCursor !== null ||
                twinResponse.page.nextCursor !== null || codeMapResponse.page.nextCursor !== null
            }
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof WorkspaceClientError &&
          (error.code === "INTEGRITY_ERROR" || error.code === "INVALID_RESPONSE")) {
          setState({ kind: "integrity-error" });
        } else {
          setState({ kind: "error", message: safeMessage(error) });
        }
      }
    })();
    return () => controller.abort();
  }, [attempt, fetcher, missionId, selectedRevision]);

  const currentInput = useMemo(
    () => state.kind === "ready"
      ? compatibleInput(state.data.twinRevisions, state.data.codeMapRevisions)
      : undefined,
    [state]
  );

  useEffect(() => {
    if (state.kind !== "ready") return undefined;
    if (currentInput === undefined) {
      setInputState({ kind: "setup-required" });
      return undefined;
    }
    const controller = new AbortController();
    setInputState({ kind: "loading" });
    void Promise.all([
      listTwinNodes(missionId, currentInput.twin.revision, fetcher, controller.signal),
      listCodeMapAssets(missionId, currentInput.codeMap.revision, fetcher, controller.signal)
    ]).then(([nodeResponse, assetResponse]) => {
      if (controller.signal.aborted) return;
      if (nodeResponse.missionId !== missionId || assetResponse.missionId !== missionId ||
        nodeResponse.projectionRevision !== currentInput.twin.revision ||
        assetResponse.projectionRevision !== currentInput.codeMap.revision) {
        setInputState({ kind: "integrity-error" });
        return;
      }
      setInputState({
        kind: "ready",
        input: currentInput,
        nodes: nodeResponse.nodes,
        assets: assetResponse.assets,
        partial: nodeResponse.page.nextCursor !== null || assetResponse.page.nextCursor !== null
      });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof WorkspaceClientError &&
        (error.code === "INTEGRITY_ERROR" || error.code === "INVALID_RESPONSE")) {
        setInputState({ kind: "integrity-error" });
      } else {
        setInputState({ kind: "error", message: safeMessage(error) });
      }
    });
    return () => controller.abort();
  }, [currentInput, fetcher, missionId, state.kind]);

  useEffect(() => {
    if (state.kind === "ready") onProjectAvailable?.(state.data.mission.projectId);
  }, [onProjectAvailable, state]);

  const rootNodes = useMemo(
    () => inputState.kind === "ready"
      ? inputState.nodes.filter((node) =>
          (node.nodeType === "Claim" || node.nodeType === "SoftwareAsset") &&
          node.attribution.origin !== "AI_ADVISORY")
      : [],
    [inputState]
  );
  const assets = inputState.kind === "ready" ? inputState.assets : [];

  function refresh(): void {
    setAttempt((value) => value + 1);
  }

  function buildRequest(): RunReconciliationRequest | undefined {
    if (inputState.kind !== "ready") return undefined;
    const supportRequirements: RunReconciliationRequest["supportRequirements"][number][] = [];
    const normalizedLocator = evidenceLocator.trim();
    const normalizedValidation = validationRequirementKey.trim();
    if (normalizedLocator.length > 512) {
      setActionError("The expected evidence locator must be 512 characters or fewer.");
      return undefined;
    }
    if (normalizedLocator !== "") {
      supportRequirements.push({
        requirementId: "support/evidence-1",
        supportKind: "EVIDENCE_SOURCE",
        sourceLocator: normalizedLocator
      });
    }
    if (normalizedValidation !== "" && !identifierIsValid(normalizedValidation)) {
      setActionError("The expected validation key must use 3-256 lowercase identifier characters.");
      return undefined;
    }
    if (normalizedValidation !== "") {
      supportRequirements.push({
        requirementId: "support/validation-1",
        supportKind: "VALIDATION_RESULT",
        validationKey: normalizedValidation
      });
    }

    const roots: RunReconciliationRequest["roots"][number][] = [];
    const impactRequirements: RunReconciliationRequest["impactRequirements"][number][] = [];
    if (impactEnabled) {
      const root = rootNodes.find((node) => node.nodeId === rootNodeId);
      const asset = assets.find((candidate) => candidate.assetId === criticalAssetId);
      if (root === undefined || asset === undefined) {
        setActionError("Select one attributed root and one critical code asset for the impact obligation.");
        return undefined;
      }
      const normalizedImpactValidation = impactValidationKey.trim();
      if (impactSupportKind === "VALIDATION" && !identifierIsValid(normalizedImpactValidation)) {
        setActionError("A validation impact obligation needs a valid lowercase validation key.");
        return undefined;
      }
      roots.push({ rootId: "impact/root-1", nodeId: root.nodeId });
      const common = {
        requirementId: "impact/requirement-1",
        rootId: "impact/root-1",
        criticalAssetId: asset.assetId,
        basisCitations: [{
          kind: "NODE" as const,
          memberId: root.nodeId,
          revision: root.nodeRevision,
          digest: root.memberDigest
        }]
      };
      impactRequirements.push(impactSupportKind === "IMPLEMENTATION"
        ? { ...common, supportKind: "IMPLEMENTATION" }
        : { ...common, supportKind: "VALIDATION", validationKey: normalizedImpactValidation });
    }
    return {
      twinRevision: inputState.input.twin.revision,
      codeMapRevision: inputState.input.codeMap.revision,
      targetSnapshotId: inputState.input.codeMap.snapshot.snapshotId,
      supportRequirements,
      roots,
      impactRequirements
    };
  }

  async function executeAssessment(): Promise<void> {
    setActionError(null);
    setNotice(null);
    const request = buildRequest();
    if (request === undefined || inputState.kind !== "ready" || state.kind !== "ready") return;
    setRunning(true);
    try {
      const response = await runReconciliation(missionId, request, fetcher);
      const revision = response.reconciliationRevision;
      if (revision.missionId !== missionId || revision.projectId !== state.data.mission.projectId ||
        revision.twinBinding.projectionId !== inputState.input.twin.projectionId ||
        revision.twinBinding.revision !== inputState.input.twin.revision ||
        revision.twinBinding.projectionDigest !== inputState.input.twin.projectionDigest ||
        revision.codeMapBinding.projectionId !== inputState.input.codeMap.projectionId ||
        revision.codeMapBinding.revision !== inputState.input.codeMap.revision ||
        revision.codeMapBinding.projectionDigest !== inputState.input.codeMap.projectionDigest ||
        revision.targetSnapshotId !== inputState.input.codeMap.snapshot.snapshotId) {
        setState({ kind: "integrity-error" });
        return;
      }
      setNotice(response.created
        ? `Immutable reconciliation revision ${revision.revision} recorded.`
        : `Revision ${revision.revision} already represents these exact inputs; history was not duplicated.`);
      setSelectedRevision(revision.revision);
      refresh();
    } catch (error) {
      if (error instanceof WorkspaceClientError &&
        (error.code === "INTEGRITY_ERROR" || error.code === "INVALID_RESPONSE")) {
        setState({ kind: "integrity-error" });
      } else {
        setActionError(safeMessage(error));
      }
    } finally {
      setRunning(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <section className="overview-state" role="status" aria-live="polite" aria-busy="true">
        <span className="state-label">LOADING</span>
        <h1>Reading conflict-resolution history</h1>
        <p>Verifying immutable revisions, Risks &amp; Checks, impact paths and exact source bindings.</p>
      </section>
    );
  }
  if (state.kind === "integrity-error") {
    return (
      <section className="overview-state overview-state--error" role="alert" data-state="INTEGRITY_ERROR">
        <span className="state-label">INTEGRITY ERROR</span>
        <h1>Conflict-resolution history failed verification</h1>
        <p>Scope, counts, digests, citations or revision bindings were inconsistent. No partial finding or path is presented.</p>
        <button className="secondary-action" type="button" onClick={refresh}>Retry integrity check</button>
      </section>
    );
  }
  if (state.kind === "error") {
    return (
      <section className="overview-state overview-state--error" role="alert">
        <span className="state-label">ERROR</span>
        <h1>Resolve Conflicts unavailable</h1>
        <p>{state.message}</p>
        <button className="secondary-action" type="button" onClick={refresh}>Retry Resolve Conflicts</button>
      </section>
    );
  }

  const { data } = state;
  return (
    <div className="reconciliation-workspace">
      <header className="overview-hero">
        <div>
          <p className="eyebrow">Current route / {PRODUCT_TERMS.reconciliation}</p>
          <h1>{data.mission.title}</h1>
          <p className="hero__lede">
            Review deterministic {PRODUCT_TERMS.findings.toLowerCase()} with exact Linked Evidence paths, then record an explicit successor when correction is required.
          </p>
          <div className="route-actions">
            {onOpenEvidence === undefined ? null : (
              <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenEvidence(missionId)}>
                Linked Evidence and correction history
              </button>
            )}
            {onOpenTwin === undefined ? null : (
              <button className="secondary-action secondary-action--neutral" type="button" onClick={() => onOpenTwin(missionId)}>
                Impact Map
              </button>
            )}
          </div>
        </div>
        <div className="truth-badge" role="note" aria-label="Conflict-resolution authority status">
          <span>Authority</span>
          <strong>DETERMINISTIC / OPEN</strong>
          <small>AI off / not a Release Check</small>
        </div>
      </header>

      <div className="scope-note" role="note" aria-label="Finding authority boundary">
        <strong>No silent resolution</strong>
        <span>
          Risks &amp; Checks are immutable outputs for exact inputs. The browser cannot dismiss, rewrite or choose an Accepted Decision. Record an explicit successor in Linked Evidence, refresh the Impact Map, then rerun conflict analysis.
        </span>
      </div>

      {actionError === null ? null : (
        <div className="action-error" role="alert"><strong>Conflict analysis not completed.</strong> {actionError}</div>
      )}
      {notice === null ? null : (
        <div className="import-notice" role="status" aria-live="polite"><strong>Conflict analysis recorded.</strong> {notice}</div>
      )}

      <section className="assessment-panel" aria-labelledby="assessment-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Explicit operator declaration</p>
          <h2 id="assessment-title">Run deterministic conflict analysis</h2>
          <p>Empty optional fields create no requirement. Every supplied requirement is submitted visibly and exactly.</p>
        </div>

        {inputState.kind === "loading" ? (
          <div className="inline-state" role="status" aria-busy="true">Loading exact Impact Map and code-map inputs...</div>
        ) : inputState.kind === "setup-required" ? (
          <div className="inline-state inline-state--warning" role="status">
            <strong>Setup required.</strong> Map the repository and refresh the Impact Map to create an exact compatible binding.
            {onOpenTwin === undefined ? null : (
              <button className="secondary-action" type="button" onClick={() => onOpenTwin(missionId)}>Open Impact Map and code map</button>
            )}
          </div>
        ) : inputState.kind === "integrity-error" ? (
          <div className="inline-state inline-state--error" role="alert">
            Exact Impact Map/code-map inputs failed verification. Conflict analysis is disabled.
          </div>
        ) : inputState.kind === "error" ? (
          <div className="inline-state inline-state--error" role="alert">{inputState.message}</div>
        ) : (
          <form className="assessment-form" onSubmit={(event) => { event.preventDefault(); void executeAssessment(); }}>
            <dl className="assessment-binding" aria-label="Exact assessment input binding">
              <div><dt>Impact Map</dt><dd>Revision {inputState.input.twin.revision} / <code>{shortDigest(inputState.input.twin.projectionDigest)}</code></dd></div>
              <div><dt>Code map</dt><dd>Revision {inputState.input.codeMap.revision} / {displayToken(inputState.input.codeMap.evidence.completeness)}</dd></div>
              <div><dt>Analyzed Commit</dt><dd><code>{shortId(inputState.input.codeMap.snapshot.snapshotId)}</code></dd></div>
            </dl>
            {inputState.partial ? (
              <div className="partial-warning" role="status"><strong>PARTIAL SELECTOR PAGE</strong><span>Only the bounded first 100 roots/assets are selectable.</span></div>
            ) : null}
            <fieldset>
              <legend>Optional required support</legend>
              <div className="assessment-grid">
                <label htmlFor="expected-evidence">
                  Expected evidence source locator
                  <input id="expected-evidence" value={evidenceLocator} maxLength={512} placeholder="manual:policy/cancellation" onChange={(event) => setEvidenceLocator(event.currentTarget.value)} />
                </label>
                <label htmlFor="expected-validation">
                  Expected validation key
                  <input id="expected-validation" value={validationRequirementKey} maxLength={256} placeholder="validation/cancellation-contract" onChange={(event) => setValidationRequirementKey(event.currentTarget.value)} />
                </label>
              </div>
              <small>Validation-result persistence is not implemented yet; a declared validation key therefore fails closed as MISSING.</small>
            </fieldset>
            <fieldset>
              <legend>Optional cited impact obligation</legend>
              <label className="check-control" htmlFor="enable-impact">
                <input id="enable-impact" type="checkbox" checked={impactEnabled} onChange={(event) => setImpactEnabled(event.currentTarget.checked)} />
                Declare one exact root-to-critical-asset obligation
              </label>
              {impactEnabled ? (
                <div className="assessment-grid assessment-grid--impact">
                  <label htmlFor="impact-root">
                    Attributed root
                    <select id="impact-root" value={rootNodeId} onChange={(event) => setRootNodeId(event.currentTarget.value)}>
                      <option value="">Select a Claim or SoftwareAsset</option>
                      {rootNodes.map((node) => (
                        <option key={node.nodeId} value={node.nodeId}>{node.nodeType} / {shortId(node.nodeId)} / {node.attribution.pathCitation}</option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="critical-asset">
                    Critical code asset
                    <select id="critical-asset" value={criticalAssetId} onChange={(event) => setCriticalAssetId(event.currentTarget.value)}>
                      <option value="">Select a persisted asset</option>
                      {assets.map((asset) => (
                        <option key={asset.assetId} value={asset.assetId}>{asset.kind} / {asset.label}</option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="impact-support">
                    Required support
                    <select id="impact-support" value={impactSupportKind} onChange={(event) => setImpactSupportKind(event.currentTarget.value as "IMPLEMENTATION" | "VALIDATION")}>
                      <option value="IMPLEMENTATION">Implementation path</option>
                      <option value="VALIDATION">Validation path</option>
                    </select>
                  </label>
                  {impactSupportKind === "VALIDATION" ? (
                    <label htmlFor="impact-validation-key">
                      Impact validation key
                      <input id="impact-validation-key" value={impactValidationKey} maxLength={256} placeholder="validation/critical-path" onChange={(event) => setImpactValidationKey(event.currentTarget.value)} />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
            <button className="primary-action" type="submit" disabled={running}>
              {running ? "Analyzing exact inputs..." : "Run deterministic conflict analysis"}
            </button>
          </form>
        )}
      </section>

      {data.selected === undefined ? (
        <section className="reconciliation-empty" data-state="EMPTY" aria-labelledby="reconciliation-empty-title">
          <span className="state-label">EMPTY</span>
          <h2 id="reconciliation-empty-title">No conflict-resolution revision exists</h2>
          <p>Run the explicit analysis above. No sample risk, path or Release Check is substituted.</p>
        </section>
      ) : (
        <>
          <section className="reconciliation-controls" aria-labelledby="reconciliation-revision-title">
            <div>
              <p className="eyebrow">Immutable history</p>
              <h2 id="reconciliation-revision-title">Assessment revision</h2>
            </div>
            <label htmlFor="reconciliation-revision">Selected immutable conflict-resolution revision</label>
            <select id="reconciliation-revision" value={data.selected.revision} onChange={(event) => setSelectedRevision(Number(event.currentTarget.value))}>
              {data.revisions.map((revision) => (
                <option key={revision.revision} value={revision.revision}>
                  Revision {revision.revision} / {revision.findingCounts.total} open / {revision.impactPathCount} paths
                </option>
              ))}
            </select>
          </section>

          {data.partial ? (
            <div className="partial-warning" role="status"><strong>PARTIAL PAGE</strong><span>Only the bounded first page is displayed; verified revision totals remain visible.</span></div>
          ) : null}

          <section className="reconciliation-summary" aria-label="Selected reconciliation revision summary">
            <div className="summary-heading">
              <span className="state-label">REVISION {data.selected.revision}</span>
              <h2>Open Risks &amp; Checks by kind</h2>
              <p>Counts describe this exact revision only. Zero risks is not a Release Check.</p>
            </div>
            <dl className="finding-count-grid">
              {(["CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP"] as const).map((kind) => (
                <div key={kind}><dt>{displayToken(kind)}</dt><dd>{data.selected?.findingCounts[kind]}</dd></div>
              ))}
              <div><dt>Impact paths</dt><dd>{data.selected.impactPathCount}</dd></div>
            </dl>
            <p className="digest-line">Result digest <code>{data.selected.resultDigest}</code></p>
          </section>

          <section className="finding-section" aria-labelledby="finding-title">
            <div className="section-heading section-heading--wide">
              <p className="eyebrow">Reasons and exact evidence</p>
              <h2 id="finding-title">Open Risks &amp; Checks</h2>
              <p>Corrections create new Linked Evidence, Impact Map and conflict-resolution history; these records stay immutable.</p>
            </div>
            {data.findings.length === 0 ? (
              <div className="inline-state" data-state="EMPTY">
                <strong>No open risks in this exact revision.</strong> This does not establish a Ready Release Check.
              </div>
            ) : (
              <ol className="finding-list">{data.findings.map((finding) => <FindingCard key={finding.findingKey} finding={finding} />)}</ol>
            )}
          </section>

          <section className="impact-path-section" aria-labelledby="impact-path-title">
            <div className="section-heading section-heading--wide">
              <p className="eyebrow">Canonical shortest paths</p>
              <h2 id="impact-path-title">Cited impact paths</h2>
              <p>Only declared roots, critical assets and authorized relationship directions are traversed.</p>
            </div>
            {data.impactPaths.length === 0 ? (
              <div className="inline-state" data-state="EMPTY">No cited impact path is stored for this exact revision.</div>
            ) : (
              <ol className="impact-path-list">{data.impactPaths.map((path) => <ImpactPathCard key={path.pathKey} path={path} />)}</ol>
            )}
          </section>
          {onOpenExplanation === undefined ? null : (
            <section className="explanation-handoff" aria-labelledby="explanation-handoff-title">
              <div>
                <p className="eyebrow">Next implemented stage</p>
                <h2 id="explanation-handoff-title">Explain this exact assessment with citations</h2>
                <p>The cited-answer workflow remains AI-off and cannot change these Risks &amp; Checks.</p>
              </div>
              <button className="primary-action" type="button" onClick={() => onOpenExplanation(missionId)}>
                Open cited explanation
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
