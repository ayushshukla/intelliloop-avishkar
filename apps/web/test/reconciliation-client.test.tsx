import { describe, expect, it, vi } from "vitest";

import {
  getReconciliationRevision,
  listReconciliationFindings,
  listReconciliationImpactPaths,
  listReconciliationRevisions,
  runReconciliation
} from "../src/reconciliation-client";

const P1 = "00000000-0000-4000-8000-000000000001";
const M1 = "00000000-0000-4000-8000-000000000011";
const S1 = "00000000-0000-4000-8000-000000000021";
const TWIN = "00000000-0000-4000-8000-000000000031";
const MAP = "00000000-0000-4000-8000-000000000041";
const C1 = "00000000-0000-4000-8000-000000000051";
const C2 = "00000000-0000-4000-8000-000000000052";
const N1 = "00000000-0000-4000-8000-000000000061";
const N2 = "00000000-0000-4000-8000-000000000062";
const R1 = "00000000-0000-4000-8000-000000000071";
const A1 = "00000000-0000-4000-8000-000000000081";
const D1 = `sha256:${"1".repeat(64)}`;
const D2 = `sha256:${"2".repeat(64)}`;
const D3 = `sha256:${"3".repeat(64)}`;
const D4 = `sha256:${"4".repeat(64)}`;
const D5 = `sha256:${"5".repeat(64)}`;
const D6 = `sha256:${"6".repeat(64)}`;
const D7 = `sha256:${"7".repeat(64)}`;
const D8 = `sha256:${"8".repeat(64)}`;
const D9 = `sha256:${"9".repeat(64)}`;

const REVISION = {
  revisionKey: D1,
  version: "reconciliation-impact-revision.v1",
  projectId: P1,
  missionId: M1,
  revision: 1,
  inputDigest: D2,
  resultDigest: D3,
  twinBinding: { projectionId: TWIN, revision: 2, projectionDigest: D4 },
  targetSnapshotId: S1,
  codeMapBinding: {
    projectionId: MAP,
    revision: 1,
    projectionDigest: D5,
    evidenceKind: "STATIC_INFERENCE",
    inferenceStatus: "AVAILABLE",
    completeness: "COMPLETE"
  },
  reassessmentDigest: D6,
  impactDigest: D7,
  findingCounts: {
    CONFLICT: 1,
    AMBIGUOUS: 1,
    MISSING: 1,
    STALE: 1,
    IMPACT_GAP: 1,
    total: 5
  },
  impactPathCount: 1
} as const;

const REFERENCE = { kind: "NODE", memberId: N1, revision: 1, digest: D1 } as const;
const ROOT_CITATION = {
  ...REFERENCE,
  sourceReference: "claim:manual/cancellation",
  sourceRevisionOrDigest: { kind: "CONTENT_DIGEST", value: D2 },
  origin: "USER_INPUT",
  extractionMethod: "DETERMINISTIC_PROJECTION",
  epistemicLabel: "FACT"
} as const;
const ASSET_CITATION = {
  ...ROOT_CITATION,
  memberId: N2,
  sourceReference: "code-map:src/cancellation.ts",
  origin: "REPOSITORY_OBSERVATION",
  epistemicLabel: "INFERENCE"
} as const;
const RELATIONSHIP_CITATION = {
  ...ROOT_CITATION,
  kind: "RELATIONSHIP",
  memberId: R1,
  sourceReference: "projection-link:implements"
} as const;
const IMPACT_REQUIREMENT = {
  requirementId: "impact/requirement-1",
  rootId: "impact/root-1",
  criticalAssetId: A1,
  supportKind: "IMPLEMENTATION",
  basisCitations: [REFERENCE]
} as const;

const FINDINGS = [
  {
    entityType: "ReconciliationFinding",
    findingKeyVersion: "reconciliation-finding-key.v1",
    findingKey: D1,
    findingKind: "CONFLICT",
    status: "OPEN",
    projectId: P1,
    missionId: M1,
    claimIds: [C1, C2],
    claimDigests: [D1, D2],
    comparisonKey: D3,
    reason: "SCALAR_VALUES_DIFFER",
    comparisonRuleSetVersion: "reconciliation-rule-set.v1",
    comparisonRuleSetDigest: D4,
    decisionPolicyVersion: "reconciliation-decision-policy.v1",
    decisionPolicyDigest: D5
  },
  {
    entityType: "ReconciliationFinding",
    findingKeyVersion: "reconciliation-finding-key.v1",
    findingKey: D2,
    findingKind: "AMBIGUOUS",
    status: "OPEN",
    projectId: P1,
    missionId: M1,
    claimIds: [C1, C2],
    claimDigests: [D1, D2],
    comparisonKey: D3,
    reason: "UNKNOWN_VALUE_PRESENT",
    comparisonRuleSetVersion: "reconciliation-rule-set.v1",
    comparisonRuleSetDigest: D4,
    decisionPolicyVersion: "reconciliation-decision-policy.v1",
    decisionPolicyDigest: D5
  },
  {
    entityType: "ReconciliationFinding",
    findingKind: "MISSING",
    status: "OPEN",
    findingKeyVersion: "reconciliation-missing-finding-key.v1",
    findingKey: D3,
    projectId: P1,
    missionId: M1,
    requirement: {
      requirementId: "support/evidence-1",
      supportKind: "EVIDENCE_SOURCE",
      sourceLocator: "manual:policy/cancellation"
    },
    reason: "REQUIRED_EVIDENCE_ABSENT",
    targetSnapshotId: S1,
    requirementsDigest: D4,
    supportPolicyVersion: "reconciliation-support-policy.v1",
    supportPolicyDigest: D5
  },
  {
    entityType: "ReconciliationFinding",
    findingKind: "STALE",
    status: "OPEN",
    findingKeyVersion: "reconciliation-stale-finding-key.v1",
    findingKey: D4,
    projectId: P1,
    missionId: M1,
    predecessorRevision: 1,
    predecessorDigest: D5,
    dependencyChanges: [{
      changeType: "CHANGED",
      dependencyKind: "SOURCE",
      dependencyKey: "source:manual:policy/cancellation",
      beforeDigest: D6,
      afterDigest: D7
    }],
    reason: "EXACT_DEPENDENCY_CHANGED"
  },
  {
    entityType: "ReconciliationFinding",
    findingKind: "IMPACT_GAP",
    status: "OPEN",
    findingKeyVersion: "impact-gap-finding-key.v1",
    findingKey: D5,
    projectId: P1,
    missionId: M1,
    requirement: IMPACT_REQUIREMENT,
    reason: "CRITICAL_IMPLEMENTATION_PATH_ABSENT",
    criticalAsset: ASSET_CITATION,
    basisCitations: [REFERENCE],
    targetSnapshotId: S1,
    traversalPolicyVersion: "impact-traversal-policy.v1",
    traversalPolicyDigest: D6,
    requirementsDigest: D7
  }
] as const;

const PATH = {
  pathKeyVersion: "impact-path-key.v1",
  pathDigestVersion: "impact-path-digest.v1",
  pathKey: D8,
  pathDigest: D9,
  rootId: "impact/root-1",
  requirementId: "impact/requirement-1",
  supportKind: "IMPLEMENTATION",
  root: ROOT_CITATION,
  criticalAsset: ASSET_CITATION,
  depth: 1,
  steps: [{
    stepIndex: 0,
    direction: "FORWARD",
    relationshipType: "IMPLEMENTS",
    from: ROOT_CITATION,
    relationship: RELATIONSHIP_CITATION,
    to: ASSET_CITATION
  }]
} as const;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("reconciliation workspace API client", () => {
  it("accepts strict revision, all finding variants and cited impact paths", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        revisions: [REVISION],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        findings: FINDINGS,
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        impactPaths: [PATH],
        page: { limit: 100, nextCursor: null }
      }));

    await expect(listReconciliationRevisions(M1, fetcher)).resolves.toMatchObject({
      revisions: [{ findingCounts: { total: 5 }, impactPathCount: 1 }]
    });
    await expect(listReconciliationFindings(M1, 1, fetcher)).resolves.toMatchObject({
      findings: [
        { findingKind: "CONFLICT" },
        { findingKind: "AMBIGUOUS" },
        { findingKind: "MISSING" },
        { findingKind: "STALE" },
        { findingKind: "IMPACT_GAP" }
      ]
    });
    await expect(listReconciliationImpactPaths(M1, 1, fetcher)).resolves.toMatchObject({
      impactPaths: [{ depth: 1, steps: [{ relationshipType: "IMPLEMENTS" }] }]
    });
  });

  it("rejects count drift, unordered findings, AI citations and malformed change semantics", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        revisions: [{ ...REVISION, findingCounts: { ...REVISION.findingCounts, total: 6 } }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        findings: [FINDINGS[1], FINDINGS[0]],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        impactPaths: [{ ...PATH, root: { ...ROOT_CITATION, origin: "AI_ADVISORY" } }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        findings: [{
          ...FINDINGS[3],
          dependencyChanges: [{
            changeType: "ADDED",
            dependencyKind: "SOURCE",
            dependencyKey: "source:new",
            beforeDigest: D1,
            afterDigest: D2
          }]
        }],
        page: { limit: 100, nextCursor: null }
      }));

    await expect(listReconciliationRevisions(M1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(listReconciliationFindings(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(listReconciliationImpactPaths(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(listReconciliationFindings(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects semantically incoherent finding reasons, citations and path chains", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        findings: [{ ...FINDINGS[0], reason: "UNKNOWN_VALUE_PRESENT" }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        findings: [{
          ...FINDINGS[4],
          reason: "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
          criticalAsset: ASSET_CITATION
        }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        impactPaths: [{
          ...PATH,
          steps: [{ ...PATH.steps[0], from: ASSET_CITATION }]
        }],
        page: { limit: 100, nextCursor: null }
      }))
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        missionId: M1,
        reconciliationRevision: 1,
        impactPaths: [{
          ...PATH,
          supportKind: "VALIDATION",
          terminalValidation: ROOT_CITATION
        }],
        page: { limit: 100, nextCursor: null }
      }));

    await expect(listReconciliationFindings(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(listReconciliationFindings(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(listReconciliationImpactPaths(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(listReconciliationImpactPaths(M1, 1, fetcher)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("submits only explicit declarations and preserves response integrity errors", async () => {
    const request = {
      twinRevision: 2,
      codeMapRevision: 1,
      targetSnapshotId: S1,
      supportRequirements: [],
      roots: [{ rootId: "impact/root-1", nodeId: N1 }],
      impactRequirements: [IMPACT_REQUIREMENT]
    } as unknown as Parameters<typeof runReconciliation>[1];
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        apiVersion: "v1",
        created: true,
        reconciliationRevision: REVISION
      }, 201))
      .mockResolvedValueOnce(jsonResponse({
        error: {
          version: "v1",
          code: "INTEGRITY_ERROR",
          message: "Stored resource integrity verification failed.",
          requestId: "request-1"
        }
      }, 500));

    await expect(runReconciliation(M1, request, fetcher)).resolves.toMatchObject({ created: true });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      `/api/v1/missions/${M1}/reconciliation/revisions`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) })
    );
    await expect(listReconciliationRevisions(M1, fetcher)).rejects.toMatchObject({
      code: "INTEGRITY_ERROR",
      status: 500
    });
  });

  it("retrieves one exact immutable revision outside a bounded history page", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({
      apiVersion: "v1",
      reconciliationRevision: REVISION
    }));

    await expect(getReconciliationRevision(M1, 1, fetcher)).resolves.toMatchObject({
      reconciliationRevision: { missionId: M1, revision: 1 }
    });
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/missions/${M1}/reconciliation/revisions/1`,
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });
});
