import {
  MAXIMUM_RECONCILIATION_CLAIMS,
  MAXIMUM_RECONCILIATION_EVIDENCE_SOURCES,
  MAXIMUM_RECONCILIATION_SUPERSESSIONS,
  MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS,
  assertCodeMapProjectionRevisionInvariant,
  createReconciliationImpactRevision,
  parseStableId,
  reassessReconciliation,
  analyzeChangeImpact,
  type AnalyzeChangeImpactInput,
  type Claim,
  type ClaimId,
  type ClaimSupersession,
  type ClaimSupersessionId,
  type CodeMapProjectionRevision,
  type EvidenceSource,
  type EvidenceSourceId,
  type GitSnapshot,
  type GitSnapshotId,
  type MissionId,
  type ProjectId,
  type ReconciliationImpactRevision,
  type ReconciliationSupportRequirementInput,
  type TwinProjectionRevision,
  type ValidationResult,
  type ValidationResultId
} from "@intelliloop/domain";

import type {
  ImpactPathPage,
  PersistReconciliationRevisionResult,
  ReconciliationFindingPage,
  ReconciliationRevisionPage
} from "./reconciliation-repository.js";

export const RECONCILIATION_EXECUTION_ERROR_CODES = [
  "RECONCILIATION_EXECUTION_SCOPE_MISMATCH",
  "RECONCILIATION_EXECUTION_SOURCE_UNAVAILABLE",
  "RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH",
  "RECONCILIATION_EXECUTION_VALIDATION_UNAVAILABLE",
  "RECONCILIATION_EXECUTION_LIMIT_EXCEEDED"
] as const;

export type ReconciliationExecutionErrorCode =
  (typeof RECONCILIATION_EXECUTION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<ReconciliationExecutionErrorCode, string>> =
  Object.freeze({
    RECONCILIATION_EXECUTION_SCOPE_MISMATCH:
      "Reconciliation execution scope does not match its persisted inputs.",
    RECONCILIATION_EXECUTION_SOURCE_UNAVAILABLE:
      "An exact source bound by the selected Twin is unavailable.",
    RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH:
      "The selected code-map revision is not the exact map projected by the Twin.",
    RECONCILIATION_EXECUTION_VALIDATION_UNAVAILABLE:
      "Persisted validation-result intake is not available in this story boundary.",
    RECONCILIATION_EXECUTION_LIMIT_EXCEEDED:
      "Reconciliation source reconstruction exceeds a fixed limit."
  });

export class ReconciliationExecutionError extends Error {
  readonly code: ReconciliationExecutionErrorCode;

  constructor(code: ReconciliationExecutionErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReconciliationExecutionError";
    this.code = code;
  }
}

export interface ExecuteReconciliationInput {
  readonly twinRevision: number;
  readonly codeMapRevision: number;
  readonly targetSnapshotId: GitSnapshotId;
  readonly supportRequirements: readonly ReconciliationSupportRequirementInput[];
  readonly roots: AnalyzeChangeImpactInput["roots"];
  readonly impactRequirements: AnalyzeChangeImpactInput["requirements"];
}

export interface TwinRevisionReadPort {
  get(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<TwinProjectionRevision>;
}

export interface CodeMapRevisionReadPort {
  get(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<CodeMapProjectionRevision>;
}

export interface EvidenceSourceReadPort {
  getEvidenceSource(
    projectId: ProjectId,
    missionId: MissionId,
    evidenceSourceId: EvidenceSourceId
  ): Promise<EvidenceSource>;
}

export interface ClaimHistoryReadPort {
  getClaim(
    projectId: ProjectId,
    missionId: MissionId,
    claimId: ClaimId
  ): Promise<Claim>;
  listSupersessions(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: ClaimSupersessionId
  ): Promise<{
    readonly items: readonly ClaimSupersession[];
    readonly nextCursor: ClaimSupersessionId | null;
  }>;
}

export interface GitSnapshotReadPort {
  get(snapshotId: GitSnapshotId): GitSnapshot;
}

export interface ValidationResultReadPort {
  getValidation(
    projectId: ProjectId,
    missionId: MissionId,
    validationResultId: ValidationResultId
  ): Promise<ValidationResult>;
}

export interface ReconciliationRevisionStorePort {
  latest(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<ReconciliationImpactRevision | undefined>;
  get(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number
  ): Promise<ReconciliationImpactRevision>;
  list(
    projectId: ProjectId,
    missionId: MissionId,
    limit: number,
    cursor?: number
  ): Promise<ReconciliationRevisionPage>;
  listFindings(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<ReconciliationFindingPage>;
  listImpactPaths(
    projectId: ProjectId,
    missionId: MissionId,
    revision: number,
    limit: number,
    cursor?: string
  ): Promise<ImpactPathPage>;
  persist(
    candidate: ReconciliationImpactRevision
  ): Promise<PersistReconciliationRevisionResult>;
}

const SOURCE_PAGE_LIMIT = 100;

function fail(code: ReconciliationExecutionErrorCode): never {
  throw new ReconciliationExecutionError(code);
}

function exactNodeSourceMap(twin: TwinProjectionRevision) {
  return new Map(
    twin.nodeSources.map((binding) => [
      `${binding.sourceType}:${binding.sourceId}`,
      binding
    ])
  );
}

function assertExactCodeMapBinding(
  twin: TwinProjectionRevision,
  codeMap: CodeMapProjectionRevision,
  snapshot: GitSnapshot
): void {
  if (
    twin.codeMapBinding === undefined ||
    twin.codeMapBinding.projectionId !== codeMap.projectionId ||
    twin.codeMapBinding.revision !== codeMap.revision ||
    twin.codeMapBinding.projectionDigest !== codeMap.projectionDigest ||
    codeMap.projectId !== twin.projectId ||
    codeMap.missionId !== twin.missionId ||
    codeMap.snapshotId !== snapshot.snapshotId ||
    codeMap.registrationId !== snapshot.registrationId
  ) {
    return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
  }
  const bySource = exactNodeSourceMap(twin);
  const assetIds = new Set(codeMap.assets.map((asset) => asset.assetId));
  const projectedAssetBindings = twin.nodeSources.filter(
    (binding) => binding.sourceType === "SoftwareAsset"
  );
  if (projectedAssetBindings.length !== codeMap.assets.length) {
    return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
  }
  for (const asset of codeMap.assets) {
    const binding = bySource.get(`SoftwareAsset:${asset.assetId}`);
    if (binding === undefined || binding.sourceDigest !== asset.assetDigest) {
      return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
    }
  }
  if (
    projectedAssetBindings.some(
      (binding) => !assetIds.has(parseStableId<"CODE_MAP_ASSET">(binding.sourceId))
    )
  ) {
    return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
  }

  const nodeIdByAsset = new Map(
    projectedAssetBindings.map((binding) => [binding.sourceId, binding.nodeId])
  );
  const codeMapEdgeReferences = new Set(
    codeMap.edges.map((edge) => `code-map-edge:${edge.edgeId}`)
  );
  const expectedRelationshipIds = new Set<string>();
  for (const edge of codeMap.edges) {
    const fromNodeId = nodeIdByAsset.get(edge.fromAssetId);
    const toNodeId = nodeIdByAsset.get(edge.toAssetId);
    const expectedType =
      edge.kind === "IMPORTS" || edge.kind === "REEXPORTS"
        ? "DEPENDS_ON"
        : edge.kind === "TEST_IMPORTS"
          ? "CONCERNS"
          : "EXTRACTED_FROM";
    const matches = twin.relationships.filter(
      (relationship) =>
        relationship.relationshipType === expectedType &&
        relationship.from.nodeId === fromNodeId &&
        relationship.to.nodeId === toNodeId &&
        relationship.metadata.sourceReference === `code-map-edge:${edge.edgeId}`
    );
    if (matches.length !== 1) {
      return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
    }
    const match = matches[0];
    if (match === undefined) {
      return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
    }
    expectedRelationshipIds.add(match.relationshipId);
  }
  if (
    twin.relationships.some(
      (relationship) =>
        codeMapEdgeReferences.has(relationship.metadata.sourceReference) &&
        !expectedRelationshipIds.has(relationship.relationshipId)
    )
  ) {
    return fail("RECONCILIATION_EXECUTION_CODE_MAP_MISMATCH");
  }
}

function supersessionEndpointPairs(twin: TwinProjectionRevision): ReadonlySet<string> {
  const sourceByNodeId = new Map(
    twin.nodeSources
      .filter((binding) => binding.sourceType === "Claim")
      .map((binding) => [binding.nodeId, binding.sourceId])
  );
  const pairs = new Set<string>();
  for (const relationship of twin.relationships) {
    if (relationship.relationshipType !== "SUPERSEDES") continue;
    const successorId = sourceByNodeId.get(relationship.from.nodeId);
    const predecessorId = sourceByNodeId.get(relationship.to.nodeId);
    if (successorId === undefined || predecessorId === undefined) {
      return fail("RECONCILIATION_EXECUTION_SOURCE_UNAVAILABLE");
    }
    pairs.add(`${successorId}>${predecessorId}`);
  }
  return pairs;
}

async function exactSupersessions(
  claims: ClaimHistoryReadPort,
  projectId: ProjectId,
  missionId: MissionId,
  twin: TwinProjectionRevision
): Promise<readonly ClaimSupersession[]> {
  const expectedPairs = supersessionEndpointPairs(twin);
  if (expectedPairs.size > MAXIMUM_RECONCILIATION_SUPERSESSIONS) {
    return fail("RECONCILIATION_EXECUTION_LIMIT_EXCEEDED");
  }
  const values: ClaimSupersession[] = [];
  let cursor: ClaimSupersessionId | undefined;
  let inspected = 0;
  do {
    const page = await claims.listSupersessions(
      projectId,
      missionId,
      SOURCE_PAGE_LIMIT,
      cursor
    );
    inspected += page.items.length;
    if (inspected > MAXIMUM_TWIN_PROJECTION_RELATIONSHIPS) {
      return fail("RECONCILIATION_EXECUTION_LIMIT_EXCEEDED");
    }
    for (const link of page.items) {
      if (
        expectedPairs.has(
          `${link.successorClaimId}>${link.predecessorClaimId}`
        )
      ) {
        values.push(link);
      }
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  if (values.length !== expectedPairs.size) {
    return fail("RECONCILIATION_EXECUTION_SOURCE_UNAVAILABLE");
  }
  return Object.freeze(
    values.sort((left, right) =>
      left.claimSupersessionId.localeCompare(
        right.claimSupersessionId,
        "en-US"
      )
    )
  );
}

export class ReconciliationExecutionService {
  readonly #twins: TwinRevisionReadPort;
  readonly #codeMaps: CodeMapRevisionReadPort;
  readonly #evidence: EvidenceSourceReadPort;
  readonly #claims: ClaimHistoryReadPort;
  readonly #snapshots: GitSnapshotReadPort;
  readonly #reconciliations: ReconciliationRevisionStorePort;
  readonly #validations: ValidationResultReadPort | undefined;

  constructor(input: {
    readonly twins: TwinRevisionReadPort;
    readonly codeMaps: CodeMapRevisionReadPort;
    readonly evidence: EvidenceSourceReadPort;
    readonly claims: ClaimHistoryReadPort;
    readonly snapshots: GitSnapshotReadPort;
    readonly reconciliations: ReconciliationRevisionStorePort;
    readonly validations?: ValidationResultReadPort;
  }) {
    this.#twins = input.twins;
    this.#codeMaps = input.codeMaps;
    this.#evidence = input.evidence;
    this.#claims = input.claims;
    this.#snapshots = input.snapshots;
    this.#reconciliations = input.reconciliations;
    this.#validations = input.validations;
  }

  async execute(
    projectId: ProjectId,
    missionId: MissionId,
    input: ExecuteReconciliationInput
  ): Promise<PersistReconciliationRevisionResult> {
    const [twin, codeMap, previous] = await Promise.all([
      this.#twins.get(projectId, missionId, input.twinRevision),
      this.#codeMaps.get(projectId, missionId, input.codeMapRevision),
      this.#reconciliations.latest(projectId, missionId)
    ]);
    const snapshot = this.#snapshots.get(input.targetSnapshotId);
    if (
      twin.projectId !== projectId ||
      twin.missionId !== missionId ||
      snapshot.projectId !== projectId ||
      snapshot.missionId !== missionId
    ) {
      return fail("RECONCILIATION_EXECUTION_SCOPE_MISMATCH");
    }
    await assertCodeMapProjectionRevisionInvariant(codeMap);
    assertExactCodeMapBinding(twin, codeMap, snapshot);

    const evidenceBindings = twin.nodeSources.filter(
      (binding) => binding.sourceType === "EvidenceSource"
    );
    const claimBindings = twin.nodeSources.filter(
      (binding) => binding.sourceType === "Claim"
    );
    const validationBindings = twin.nodeSources.filter(
      (binding) => binding.sourceType === "ValidationResult"
    );
    if (
      evidenceBindings.length > MAXIMUM_RECONCILIATION_EVIDENCE_SOURCES ||
      claimBindings.length > MAXIMUM_RECONCILIATION_CLAIMS
    ) {
      return fail("RECONCILIATION_EXECUTION_LIMIT_EXCEEDED");
    }
    if (validationBindings.length > 256 || (validationBindings.length > 0 && this.#validations === undefined)) {
      return fail("RECONCILIATION_EXECUTION_VALIDATION_UNAVAILABLE");
    }

    const evidenceSources = await Promise.all(
      evidenceBindings.map((binding) =>
        this.#evidence.getEvidenceSource(
          projectId,
          missionId,
          parseStableId<"EVIDENCE_SOURCE">(binding.sourceId)
        )
      )
    );
    const currentClaims = await Promise.all(
      claimBindings.map((binding) =>
        this.#claims.getClaim(
          projectId,
          missionId,
          parseStableId<"CLAIM">(binding.sourceId)
        )
      )
    );
    const validationResults = await Promise.all(
      validationBindings.map((binding) =>
        this.#validations!.getValidation(
          projectId,
          missionId,
          parseStableId<"VALIDATION_RESULT">(binding.sourceId)
        )
      )
    );
    const claimSupersessions = await exactSupersessions(
      this.#claims,
      projectId,
      missionId,
      twin
    );
    const reassessment = await reassessReconciliation(
      {
        twin,
        evidenceSources,
        claims: currentClaims,
        claimSupersessions,
        targetSnapshot: snapshot,
        validationResults: Object.freeze(validationResults),
        requirements: input.supportRequirements
      },
      previous?.reassessment
    );
    const impact = await analyzeChangeImpact({
      twin,
      reassessment,
      codeMap,
      targetSnapshot: snapshot,
      validationResults: Object.freeze(validationResults),
      roots: input.roots,
      requirements: input.impactRequirements
    });
    const candidate = await createReconciliationImpactRevision(
      { reassessment, impact },
      previous
    );
    return this.#reconciliations.persist(candidate);
  }
}
