import { randomUUID } from "node:crypto";

import {
  createClock,
  createReleasePassport,
  createStableIdGenerator,
  deriveReleasePassportState,
  type Clock,
  type MissionId,
  type ProjectId,
  type ReleasePassportState,
  type StableIdGenerator
} from "@intelliloop/domain";

import { SqliteReadinessRepository } from "../readiness/readiness-repository.js";
import { ReadinessAssessmentService } from "../readiness/readiness-service.js";
import {
  SqlitePassportRepository,
  type PersistedReleasePassport
} from "./passport-repository.js";

export class PassportExecutionError extends Error {
  readonly code = "PASSPORT_EXECUTION_ASSESSMENT_MISSING" as const;

  constructor() {
    super("A persisted release assessment is required for Passport projection.");
    this.name = "PassportExecutionError";
  }
}

export interface PassportServiceDependencies {
  readonly passports: SqlitePassportRepository;
  readonly readinessRepository: SqliteReadinessRepository;
  readonly readinessService: ReadinessAssessmentService;
  readonly ids?: StableIdGenerator;
  readonly clock?: Clock;
}

export interface PersistedReleasePassportState {
  readonly passport: PersistedReleasePassport["passport"];
  readonly state: ReleasePassportState;
}

export class PassportService {
  readonly #passports: SqlitePassportRepository;
  readonly #readinessRepository: SqliteReadinessRepository;
  readonly #readinessService: ReadinessAssessmentService;
  readonly #ids: StableIdGenerator;
  readonly #clock: Clock;

  constructor(dependencies: PassportServiceDependencies) {
    this.#passports = dependencies.passports;
    this.#readinessRepository = dependencies.readinessRepository;
    this.#readinessService = dependencies.readinessService;
    this.#ids = dependencies.ids ?? createStableIdGenerator(() => randomUUID());
    this.#clock = dependencies.clock ?? createClock(() => new Date());
  }

  async project(
    projectId: ProjectId,
    missionId: MissionId,
    assessmentRevision?: number
  ): Promise<PersistedReleasePassport> {
    const assessment = assessmentRevision === undefined
      ? await this.#readinessRepository.latestAssessment(projectId, missionId)
      : await this.#readinessRepository.getAssessment(projectId, missionId, assessmentRevision);
    if (assessment === undefined) {
      throw new PassportExecutionError();
    }
    const existing = await this.#passports.byAssessment(
      projectId, missionId, assessment.assessmentId
    );
    if (existing !== undefined) return Object.freeze({ created: false, passport: existing });
    const passport = await createReleasePassport(assessment, {
      ids: this.#ids,
      clock: this.#clock
    });
    return this.#passports.persist(passport, assessment);
  }

  async state(
    projectId: ProjectId,
    missionId: MissionId,
    assessmentRevision: number
  ): Promise<PersistedReleasePassportState> {
    const passport = await this.#passports.get(projectId, missionId, assessmentRevision);
    const assessment = await this.#readinessService.state(
      projectId, missionId, passport.assessment.revision
    );
    return Object.freeze({
      passport,
      state: await deriveReleasePassportState(passport, assessment.state)
    });
  }
}
