import { canonicalizeJson } from "./canonical-json.js";
import {
  canonicalJsonDigest,
  parseSha256Digest,
  type Sha256Digest
} from "./digest.js";
import {
  assertImpactAnalysisResultInvariant,
  type ImpactAnalysisResult
} from "./impact-analysis.js";
import type { GitSnapshotId } from "./git-snapshot.js";
import type { MissionId, ProjectId } from "./project.js";
import {
  assertReconciliationReassessmentInvariant,
  type ReconciliationReassessmentResult
} from "./reconciliation-reassessment.js";
import { parseStableId } from "./stable-id.js";
import type { TwinProjectionRevision } from "./twin-projection.js";
import { parseTwinRevision } from "./twin-vocabulary.js";

export const RECONCILIATION_IMPACT_REVISION_VERSION =
  "reconciliation-impact-revision.v1";
export const RECONCILIATION_IMPACT_REVISION_DIGEST_VERSION =
  "reconciliation-impact-revision-digest.v1";
export const RECONCILIATION_IMPACT_REVISION_KEY_VERSION =
  "reconciliation-impact-revision-key.v1";
export const MAXIMUM_RECONCILIATION_IMPACT_REVISION_SERIALIZED_BYTES =
  16_777_216;

export const RECONCILIATION_IMPACT_REVISION_ERROR_CODES = [
  "RECONCILIATION_IMPACT_REVISION_INPUT_INVALID",
  "RECONCILIATION_IMPACT_REVISION_PREDECESSOR_INVALID",
  "RECONCILIATION_IMPACT_REVISION_SERIALIZATION_INVALID",
  "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
] as const;

export type ReconciliationImpactRevisionErrorCode =
  (typeof RECONCILIATION_IMPACT_REVISION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<
  Record<ReconciliationImpactRevisionErrorCode, string>
> = Object.freeze({
  RECONCILIATION_IMPACT_REVISION_INPUT_INVALID:
    "Reconciliation impact revision input is invalid.",
  RECONCILIATION_IMPACT_REVISION_PREDECESSOR_INVALID:
    "Reconciliation impact revision predecessor is invalid.",
  RECONCILIATION_IMPACT_REVISION_SERIALIZATION_INVALID:
    "Reconciliation impact revision serialization is invalid.",
  RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID:
    "Reconciliation impact revision integrity is invalid."
});

export class ReconciliationImpactRevisionError extends Error {
  readonly code: ReconciliationImpactRevisionErrorCode;

  constructor(code: ReconciliationImpactRevisionErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReconciliationImpactRevisionError";
    this.code = code;
  }
}

export interface ReconciliationImpactTwinBinding {
  readonly projectionId: TwinProjectionRevision["projectionId"];
  readonly revision: TwinProjectionRevision["revision"];
  readonly projectionDigest: Sha256Digest;
}

export type ReconciliationImpactCodeMapBinding =
  ImpactAnalysisResult["codeMapBinding"];

export interface ReconciliationImpactRevisionPredecessor {
  readonly revisionKey: Sha256Digest;
  readonly revision: number;
  readonly resultDigest: Sha256Digest;
}

export interface ReconciliationImpactFindingCounts {
  readonly CONFLICT: number;
  readonly AMBIGUOUS: number;
  readonly MISSING: number;
  readonly STALE: number;
  readonly IMPACT_GAP: number;
  readonly total: number;
}

export interface ReconciliationImpactRevision {
  readonly version: typeof RECONCILIATION_IMPACT_REVISION_VERSION;
  readonly digestVersion: typeof RECONCILIATION_IMPACT_REVISION_DIGEST_VERSION;
  readonly revisionKey: Sha256Digest;
  readonly revision: number;
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly twinBinding: ReconciliationImpactTwinBinding;
  readonly targetSnapshotId: GitSnapshotId;
  readonly codeMapBinding: ReconciliationImpactCodeMapBinding;
  readonly reassessment: ReconciliationReassessmentResult;
  readonly impact: ImpactAnalysisResult;
  readonly inputDigest: Sha256Digest;
  readonly predecessor?: ReconciliationImpactRevisionPredecessor;
  readonly findingCounts: ReconciliationImpactFindingCounts;
  readonly impactPathCount: number;
  readonly resultDigest: Sha256Digest;
}

export interface CreateReconciliationImpactRevisionInput {
  readonly reassessment: ReconciliationReassessmentResult;
  readonly impact: ImpactAnalysisResult;
}

function fail(code: ReconciliationImpactRevisionErrorCode): never {
  throw new ReconciliationImpactRevisionError(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  code: ReconciliationImpactRevisionErrorCode
): Record<string, unknown> {
  if (!isPlainObject(value)) return fail(code);
  const allowed = new Set([...required, ...optional]);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.has(key)) ||
    keys.some((key) => {
      if (typeof key !== "string") return true;
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      );
    }) ||
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    return fail(code);
  }
  return value;
}

function positiveRevision(
  value: unknown,
  code: ReconciliationImpactRevisionErrorCode
): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return fail(code);
  }
  return value as number;
}

function nonNegativeCount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
  }
  return value as number;
}

function sameTwinBinding(
  left: ReconciliationImpactTwinBinding,
  right: ReconciliationImpactTwinBinding
): boolean {
  return (
    left.projectionId === right.projectionId &&
    left.revision === right.revision &&
    left.projectionDigest === right.projectionDigest
  );
}

function sameCodeMapBinding(
  left: ReconciliationImpactCodeMapBinding,
  right: ReconciliationImpactCodeMapBinding
): boolean {
  return (
    left.projectionId === right.projectionId &&
    left.revision === right.revision &&
    left.projectionDigest === right.projectionDigest &&
    left.evidenceKind === right.evidenceKind &&
    left.inferenceStatus === right.inferenceStatus &&
    left.completeness === right.completeness
  );
}

async function revisionKey(
  projectId: ProjectId,
  missionId: MissionId
): Promise<Sha256Digest> {
  return canonicalJsonDigest({
    version: RECONCILIATION_IMPACT_REVISION_KEY_VERSION,
    projectId,
    missionId
  });
}

function countsFor(
  reassessment: ReconciliationReassessmentResult,
  impact: ImpactAnalysisResult
): ReconciliationImpactFindingCounts {
  let conflict = 0;
  let ambiguous = 0;
  for (const finding of reassessment.claimFindings) {
    if (finding.findingKind === "CONFLICT") conflict += 1;
    else if (finding.findingKind === "AMBIGUOUS") ambiguous += 1;
    else return fail("RECONCILIATION_IMPACT_REVISION_INPUT_INVALID");
  }
  const missing = reassessment.missingFindings.length;
  const stale = reassessment.stalePredecessorFinding === undefined ? 0 : 1;
  const impactGap = impact.impactGapFindings.length;
  return Object.freeze({
    CONFLICT: conflict,
    AMBIGUOUS: ambiguous,
    MISSING: missing,
    STALE: stale,
    IMPACT_GAP: impactGap,
    total: conflict + ambiguous + missing + stale + impactGap
  });
}

function inputDocument(input: {
  readonly projectId: ProjectId;
  readonly missionId: MissionId;
  readonly twinBinding: ReconciliationImpactTwinBinding;
  readonly targetSnapshotId: GitSnapshotId;
  readonly codeMapBinding: ReconciliationImpactCodeMapBinding;
  readonly reassessmentInputDigest: Sha256Digest;
  readonly impactInputDigest: Sha256Digest;
}) {
  return {
    version: RECONCILIATION_IMPACT_REVISION_VERSION,
    scope: { projectId: input.projectId, missionId: input.missionId },
    twinBinding: input.twinBinding,
    targetSnapshotId: input.targetSnapshotId,
    codeMapBinding: input.codeMapBinding,
    reassessmentInputDigest: input.reassessmentInputDigest,
    impactInputDigest: input.impactInputDigest
  };
}

function deepFreezeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const item of value) deepFreezeJson(item);
    return Object.freeze(value);
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) deepFreezeJson(item);
    return Object.freeze(value);
  }
  return value;
}

export async function createReconciliationImpactRevision(
  input: CreateReconciliationImpactRevisionInput,
  previous?: ReconciliationImpactRevision
): Promise<ReconciliationImpactRevision> {
  try {
    await assertReconciliationReassessmentInvariant(input.reassessment);
    await assertImpactAnalysisResultInvariant(input.impact);
    const projectId = parseStableId<"PROJECT">(input.reassessment.projectId);
    const missionId = parseStableId<"MISSION">(input.reassessment.missionId);
    if (
      input.impact.projectId !== projectId ||
      input.impact.missionId !== missionId ||
      input.impact.targetSnapshotId !== input.reassessment.targetSnapshotId ||
      input.impact.reassessmentBinding.reassessmentKey !==
        input.reassessment.reassessmentKey ||
      input.impact.reassessmentBinding.revision !==
        input.reassessment.revision ||
      input.impact.reassessmentBinding.inputDigest !==
        input.reassessment.inputDigest ||
      input.impact.reassessmentBinding.resultDigest !==
        input.reassessment.resultDigest ||
      !sameTwinBinding(
        input.reassessment.twinBinding,
        input.impact.twinBinding
      )
    ) {
      return fail("RECONCILIATION_IMPACT_REVISION_INPUT_INVALID");
    }
    const twinBinding = Object.freeze({ ...input.reassessment.twinBinding });
    const codeMapBinding = Object.freeze({ ...input.impact.codeMapBinding });
    const key = await revisionKey(projectId, missionId);
    const inputDigest = await canonicalJsonDigest(
      inputDocument({
        projectId,
        missionId,
        twinBinding,
        targetSnapshotId: input.reassessment.targetSnapshotId,
        codeMapBinding,
        reassessmentInputDigest: input.reassessment.inputDigest,
        impactInputDigest: input.impact.inputDigest
      })
    );
    if (previous !== undefined) {
      await assertReconciliationImpactRevisionInvariant(previous);
      if (
        previous.revisionKey !== key ||
        previous.projectId !== projectId ||
        previous.missionId !== missionId
      ) {
        return fail("RECONCILIATION_IMPACT_REVISION_PREDECESSOR_INVALID");
      }
      if (previous.inputDigest === inputDigest) return previous;
    }

    const revision = previous === undefined ? 1 : previous.revision + 1;
    const predecessor =
      previous === undefined
        ? undefined
        : Object.freeze({
            revisionKey: previous.revisionKey,
            revision: previous.revision,
            resultDigest: previous.resultDigest
          });
    const findingCounts = countsFor(input.reassessment, input.impact);
    const withoutDigest = Object.freeze({
      version: RECONCILIATION_IMPACT_REVISION_VERSION,
      digestVersion: RECONCILIATION_IMPACT_REVISION_DIGEST_VERSION,
      revisionKey: key,
      revision,
      projectId,
      missionId,
      twinBinding,
      targetSnapshotId: input.reassessment.targetSnapshotId,
      codeMapBinding,
      reassessment: input.reassessment,
      impact: input.impact,
      inputDigest,
      ...(predecessor === undefined ? {} : { predecessor }),
      findingCounts,
      impactPathCount: input.impact.paths.length
    });
    const result = Object.freeze({
      ...withoutDigest,
      resultDigest: await canonicalJsonDigest(withoutDigest)
    });
    await assertReconciliationImpactRevisionInvariant(result);
    return result;
  } catch (error) {
    if (error instanceof ReconciliationImpactRevisionError) throw error;
    return fail("RECONCILIATION_IMPACT_REVISION_INPUT_INVALID");
  }
}

export async function assertReconciliationImpactRevisionInvariant(
  result: ReconciliationImpactRevision
): Promise<void> {
  try {
    const record = exactObject(
      result,
      [
        "version",
        "digestVersion",
        "revisionKey",
        "revision",
        "projectId",
        "missionId",
        "twinBinding",
        "targetSnapshotId",
        "codeMapBinding",
        "reassessment",
        "impact",
        "inputDigest",
        "findingCounts",
        "impactPathCount",
        "resultDigest"
      ],
      ["predecessor"],
      "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
    );
    if (
      record.version !== RECONCILIATION_IMPACT_REVISION_VERSION ||
      record.digestVersion !== RECONCILIATION_IMPACT_REVISION_DIGEST_VERSION
    ) {
      return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
    }
    const projectId = parseStableId<"PROJECT">(record.projectId);
    const missionId = parseStableId<"MISSION">(record.missionId);
    const targetSnapshotId = parseStableId<"GIT_SNAPSHOT">(
      record.targetSnapshotId
    );
    const revision = positiveRevision(
      record.revision,
      "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
    );
    const key = await revisionKey(projectId, missionId);
    if (record.revisionKey !== key) {
      return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
    }
    parseSha256Digest(record.inputDigest);
    parseSha256Digest(record.resultDigest);

    const twin = exactObject(
      record.twinBinding,
      ["projectionId", "revision", "projectionDigest"],
      [],
      "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
    );
    const twinBinding = Object.freeze({
      projectionId: parseStableId<"TWIN_PROJECTION">(twin.projectionId),
      revision: parseTwinRevision(twin.revision),
      projectionDigest: parseSha256Digest(twin.projectionDigest)
    });
    const codeMap = exactObject(
      record.codeMapBinding,
      [
        "projectionId",
        "revision",
        "projectionDigest",
        "evidenceKind",
        "inferenceStatus",
        "completeness"
      ],
      [],
      "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
    );
    const codeMapBinding = Object.freeze({
      projectionId: parseStableId<"CODE_MAP_PROJECTION">(
        codeMap.projectionId
      ),
      revision: positiveRevision(
        codeMap.revision,
        "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
      ),
      projectionDigest: parseSha256Digest(codeMap.projectionDigest),
      evidenceKind: codeMap.evidenceKind,
      inferenceStatus: codeMap.inferenceStatus,
      completeness: codeMap.completeness
    }) as unknown as ReconciliationImpactCodeMapBinding;

    await assertReconciliationReassessmentInvariant(record.reassessment as ReconciliationReassessmentResult);
    await assertImpactAnalysisResultInvariant(record.impact as ImpactAnalysisResult);
    const reassessment = record.reassessment as ReconciliationReassessmentResult;
    const impact = record.impact as ImpactAnalysisResult;
    if (
      reassessment.projectId !== projectId ||
      reassessment.missionId !== missionId ||
      reassessment.targetSnapshotId !== targetSnapshotId ||
      impact.projectId !== projectId ||
      impact.missionId !== missionId ||
      impact.targetSnapshotId !== targetSnapshotId ||
      impact.reassessmentBinding.reassessmentKey !==
        reassessment.reassessmentKey ||
      impact.reassessmentBinding.revision !== reassessment.revision ||
      impact.reassessmentBinding.inputDigest !== reassessment.inputDigest ||
      impact.reassessmentBinding.resultDigest !== reassessment.resultDigest ||
      !sameTwinBinding(twinBinding, reassessment.twinBinding) ||
      !sameTwinBinding(twinBinding, impact.twinBinding) ||
      !sameCodeMapBinding(codeMapBinding, impact.codeMapBinding)
    ) {
      return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
    }

    const expectedInputDigest = await canonicalJsonDigest(
      inputDocument({
        projectId,
        missionId,
        twinBinding,
        targetSnapshotId,
        codeMapBinding,
        reassessmentInputDigest: reassessment.inputDigest,
        impactInputDigest: impact.inputDigest
      })
    );
    if (record.inputDigest !== expectedInputDigest) {
      return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
    }

    if (record.predecessor === undefined) {
      if (revision !== 1) {
        return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
      }
    } else {
      const predecessor = exactObject(
        record.predecessor,
        ["revisionKey", "revision", "resultDigest"],
        [],
        "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
      );
      if (
        predecessor.revisionKey !== key ||
        positiveRevision(
          predecessor.revision,
          "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
        ) !== revision - 1
      ) {
        return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
      }
      parseSha256Digest(predecessor.resultDigest);
    }

    const countRecord = exactObject(
      record.findingCounts,
      ["CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP", "total"],
      [],
      "RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID"
    );
    const storedCounts = Object.freeze({
      CONFLICT: nonNegativeCount(countRecord.CONFLICT),
      AMBIGUOUS: nonNegativeCount(countRecord.AMBIGUOUS),
      MISSING: nonNegativeCount(countRecord.MISSING),
      STALE: nonNegativeCount(countRecord.STALE),
      IMPACT_GAP: nonNegativeCount(countRecord.IMPACT_GAP),
      total: nonNegativeCount(countRecord.total)
    });
    const expectedCounts = countsFor(reassessment, impact);
    if (
      canonicalizeJson(storedCounts) !== canonicalizeJson(expectedCounts) ||
      nonNegativeCount(record.impactPathCount) !== impact.paths.length
    ) {
      return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
    }

    const { resultDigest: _resultDigest, ...withoutDigest } = result;
    if ((await canonicalJsonDigest(withoutDigest)) !== result.resultDigest) {
      return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
    }
  } catch (error) {
    if (error instanceof ReconciliationImpactRevisionError) throw error;
    return fail("RECONCILIATION_IMPACT_REVISION_INTEGRITY_INVALID");
  }
}

export async function serializeReconciliationImpactRevision(
  result: ReconciliationImpactRevision
): Promise<string> {
  await assertReconciliationImpactRevisionInvariant(result);
  return canonicalizeJson(result);
}

export async function deserializeReconciliationImpactRevision(
  serialized: string
): Promise<ReconciliationImpactRevision> {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    new TextEncoder().encode(serialized).byteLength >
      MAXIMUM_RECONCILIATION_IMPACT_REVISION_SERIALIZED_BYTES
  ) {
    return fail("RECONCILIATION_IMPACT_REVISION_SERIALIZATION_INVALID");
  }
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    return fail("RECONCILIATION_IMPACT_REVISION_SERIALIZATION_INVALID");
  }
  try {
    const result = deepFreezeJson(value) as ReconciliationImpactRevision;
    await assertReconciliationImpactRevisionInvariant(result);
    return result;
  } catch {
    return fail("RECONCILIATION_IMPACT_REVISION_SERIALIZATION_INVALID");
  }
}
