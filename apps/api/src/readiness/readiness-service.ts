import { randomUUID } from "node:crypto";

import {
  createClock,
  createReadinessAssessment,
  createReadinessReviewRecord,
  createStableIdGenerator,
  deriveReadinessAssessmentState,
  evaluateReadiness,
  parseValidationKey,
  type Clock,
  type EvaluateReadinessInput,
  type MissionId,
  type ProjectId,
  type ReadinessAssessment,
  type ReadinessAssessmentState,
  type ReadinessReviewActorKind,
  type StableIdGenerator,
  type ValidationResult
} from "@intelliloop/domain";

import {
  SqliteReadinessRepository,
  type PersistedReadinessAssessment,
  type PersistedReadinessReview,
  type PersistedValidationResult
} from "./readiness-repository.js";

export const READINESS_EXECUTION_ERROR_CODES = [
  "READINESS_EXECUTION_RECONCILIATION_MISSING",
  "READINESS_EXECUTION_SNAPSHOT_MISSING",
  "READINESS_EXECUTION_VALIDATION_CATALOG_INVALID",
  "READINESS_EXECUTION_ASSESSMENT_MISSING"
] as const;

export type ReadinessExecutionErrorCode =
  (typeof READINESS_EXECUTION_ERROR_CODES)[number];

const ERROR_MESSAGES: Readonly<Record<ReadinessExecutionErrorCode, string>> =
  Object.freeze({
    READINESS_EXECUTION_RECONCILIATION_MISSING: "A persisted reconciliation is required for readiness assessment.",
    READINESS_EXECUTION_SNAPSHOT_MISSING: "A persisted Git snapshot is required for readiness assessment.",
    READINESS_EXECUTION_VALIDATION_CATALOG_INVALID: "The reconciliation validation catalog is invalid for readiness assessment.",
    READINESS_EXECUTION_ASSESSMENT_MISSING: "A persisted release assessment is required for state derivation."
  });

export class ReadinessExecutionError extends Error {
  readonly code: ReadinessExecutionErrorCode;

  constructor(code: ReadinessExecutionErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ReadinessExecutionError";
    this.code = code;
  }
}

export interface ReadinessAssessmentServiceDependencies {
  readonly repository: SqliteReadinessRepository;
  readonly ids?: StableIdGenerator;
  readonly clock?: Clock;
}

export interface PersistedAssessmentState {
  readonly assessment: ReadinessAssessment;
  readonly state: ReadinessAssessmentState;
}

export class ReadinessAssessmentService {
  readonly #repository: SqliteReadinessRepository;
  readonly #ids: StableIdGenerator;
  readonly #clock: Clock;

  constructor(dependencies: ReadinessAssessmentServiceDependencies) {
    this.#repository = dependencies.repository;
    this.#ids = dependencies.ids ?? createStableIdGenerator(() => randomUUID());
    this.#clock = dependencies.clock ?? createClock(() => new Date());
  }

  async #input(projectId: ProjectId, missionId: MissionId): Promise<EvaluateReadinessInput> {
    const reconciliation = await this.#repository.reconciliationLatest(projectId, missionId);
    if (reconciliation === undefined) {
      throw new ReadinessExecutionError("READINESS_EXECUTION_RECONCILIATION_MISSING");
    }
    const snapshot = this.#repository.latestSnapshot(projectId, missionId);
    if (snapshot === undefined) {
      throw new ReadinessExecutionError("READINESS_EXECUTION_SNAPSHOT_MISSING");
    }
    const rawRequirements = reconciliation.impact.requirements
      .filter((requirement) => requirement.supportKind === "VALIDATION")
      .map((requirement) => {
        if (requirement.validationKey === undefined) {
          throw new ReadinessExecutionError("READINESS_EXECUTION_VALIDATION_CATALOG_INVALID");
        }
        return Object.freeze({
          requirementId: parseValidationKey(requirement.requirementId),
          validationKey: parseValidationKey(requirement.validationKey)
        });
      })
      .sort((left, right) => left.requirementId.localeCompare(right.requirementId, "en-US"));
    if (
      new Set(rawRequirements.map((entry) => entry.requirementId)).size !== rawRequirements.length ||
      new Set(rawRequirements.map((entry) => entry.validationKey)).size !== rawRequirements.length
    ) throw new ReadinessExecutionError("READINESS_EXECUTION_VALIDATION_CATALOG_INVALID");

    const validationEvidence: EvaluateReadinessInput["validationEvidence"][number][] = [];
    for (const requirement of rawRequirements) {
      const validation = await this.#repository.latestValidation(
        projectId, missionId, requirement.validationKey
      );
      if (validation !== undefined) {
        validationEvidence.push(Object.freeze({
          validationResultId: validation.validationResultId,
          requirementId: requirement.requirementId,
          validationKey: validation.validationKey,
          projectId: validation.projectId,
          missionId: validation.missionId,
          snapshotId: validation.snapshotId,
          status: validation.status,
          origin: validation.origin,
          resultDigest: validation.resultDigest,
          persistence: "PERSISTED"
        }));
      }
    }
    const review = await this.#repository.latestReview(projectId, missionId);
    return {
      projectId,
      missionId,
      reconciliation,
      integrity: "VERIFIED",
      currentSnapshotId: snapshot.snapshotId,
      inputAuthority: "ATTRIBUTED_CANONICAL",
      reconciliationPersistence: "PERSISTED",
      validationRequirements: Object.freeze(rawRequirements),
      validationEvidence: Object.freeze(validationEvidence),
      review: review === undefined ? Object.freeze({ status: "MISSING" as const }) : Object.freeze({
        status: "RECORDED" as const,
        reviewId: review.reviewId,
        actorKind: review.actorKind,
        projectId: review.projectId,
        missionId: review.missionId,
        snapshotId: review.snapshotId,
        reconciliationResultDigest: review.reconciliationResultDigest,
        reviewDigest: review.reviewDigest,
        persistence: "PERSISTED" as const
      }),
      freshness: Object.freeze({
        status: "CURRENT" as const,
        evaluatedInputDigest: reconciliation.inputDigest,
        currentInputDigest: reconciliation.inputDigest
      })
    };
  }

  persistValidation(validation: ValidationResult): Promise<PersistedValidationResult> {
    return this.#repository.persistValidation(validation);
  }

  listLatestValidations(
    projectId: ProjectId,
    missionId: MissionId
  ): Promise<readonly ValidationResult[]> {
    return this.#repository.listLatestValidations(projectId, missionId);
  }

  async recordReview(
    projectId: ProjectId,
    missionId: MissionId,
    actorKind: ReadinessReviewActorKind
  ): Promise<PersistedReadinessReview> {
    const reconciliation = await this.#repository.reconciliationLatest(projectId, missionId);
    if (reconciliation === undefined) {
      throw new ReadinessExecutionError("READINESS_EXECUTION_RECONCILIATION_MISSING");
    }
    const snapshot = this.#repository.snapshot(reconciliation.targetSnapshotId);
    const review = await createReadinessReviewRecord(
      { actorKind }, reconciliation, snapshot, { ids: this.#ids, clock: this.#clock }
    );
    return this.#repository.persistReview(review);
  }

  async assess(projectId: ProjectId, missionId: MissionId): Promise<PersistedReadinessAssessment> {
    const input = await this.#input(projectId, missionId);
    const evaluation = await evaluateReadiness(input);
    const previous = await this.#repository.latestAssessment(projectId, missionId);
    const assessment = await createReadinessAssessment(
      evaluation, input, previous, { ids: this.#ids, clock: this.#clock }
    );
    if (assessment === previous) {
      return Object.freeze({ created: false, assessment });
    }
    return this.#repository.persistAssessment(assessment);
  }

  async state(
    projectId: ProjectId,
    missionId: MissionId,
    revision?: number
  ): Promise<PersistedAssessmentState> {
    const assessment = revision === undefined
      ? await this.#repository.latestAssessment(projectId, missionId)
      : await this.#repository.getAssessment(projectId, missionId, revision);
    if (assessment === undefined) {
      throw new ReadinessExecutionError("READINESS_EXECUTION_ASSESSMENT_MISSING");
    }
    const currentEvaluation = await evaluateReadiness(await this.#input(projectId, missionId));
    const state = await deriveReadinessAssessmentState(assessment, currentEvaluation);
    return Object.freeze({ assessment, state });
  }
}
