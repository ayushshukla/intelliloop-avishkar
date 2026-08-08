import { afterEach, describe, expect, it } from "vitest";

import type {
  ReadinessAssessment,
  ReadinessAssessmentState,
  ReleasePassport,
  ReleasePassportState
} from "@intelliloop/domain";

import { buildApp } from "../src/app.js";
import type {
  PassportApiRepository,
  PassportApiService,
  ReadinessApiRepository,
  ReadinessApiService
} from "../src/readiness/readiness-passport-routes.js";
import { ReadinessExecutionError } from "../src/readiness/readiness-service.js";
import { PassportRepositoryError } from "../src/passports/passport-repository.js";
import type { SqliteProjectRepository } from "../src/projects/project-repository.js";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const MISSION_ID = "22222222-2222-4222-8222-222222222222";
const ASSESSMENT_ID = "33333333-3333-4333-8333-333333333333";
const PASSPORT_ID = "44444444-4444-4444-8444-444444444444";
const SNAPSHOT_ID = "55555555-5555-4555-8555-555555555555";
const digest = (character: string) => `sha256:${character.repeat(64)}` as const;

const obligationIds = [
  "INTEGRITY_VALID", "SCOPE_EXACT", "SNAPSHOT_CURRENT", "CRITICAL_FINDINGS_CLEAR",
  "REQUIRED_VALIDATIONS_PASS", "EXPLICIT_HUMAN_REVIEW", "DEPENDENCIES_CURRENT",
  "CANONICAL_INPUTS_ONLY", "INPUTS_PERSISTED"
] as const;
const categories = [
  "INTEGRITY", "SCOPE", "SNAPSHOT", "FINDINGS", "VALIDATIONS", "REVIEW",
  "FRESHNESS", "AUTHORITY", "PERSISTENCE"
] as const;
const obligations = obligationIds.map((obligationId, index) => ({
  obligationId,
  category: categories[index]!,
  requirement: `Controlled requirement ${index + 1}.`,
  status: obligationId === "EXPLICIT_HUMAN_REVIEW" ? "UNSATISFIED" as const : "SATISFIED" as const,
  blockerCodes: obligationId === "EXPLICIT_HUMAN_REVIEW" ? ["REVIEW_MISSING" as const] : []
}));
const blockers = [{ code: "REVIEW_MISSING" as const, obligationId: "EXPLICIT_HUMAN_REVIEW" as const }];
const findings = { CONFLICT: 0, AMBIGUOUS: 0, MISSING: 0, STALE: 0, IMPACT_GAP: 0, total: 0 };

const assessment = {
  version: "release-assessment.v1",
  assessmentId: ASSESSMENT_ID,
  revision: 1,
  projectId: PROJECT_ID,
  missionId: MISSION_ID,
  recordedAtUtc: "2026-08-06T10:00:00.000Z",
  inputFingerprintDigest: digest("1"),
  evaluatedStatus: "BLOCKED",
  evaluation: {
    targetSnapshotId: SNAPSHOT_ID,
    currentSnapshotId: SNAPSHOT_ID,
    reconciliationBinding: {
      revision: 1,
      revisionKey: digest("2"),
      resultDigest: digest("3")
    },
    policyVersion: "readiness.v1",
    policyDigest: digest("4"),
    obligations,
    blockers,
    findingCounts: findings,
    validationRequirements: [],
    validationEvidence: [],
    review: { status: "MISSING" }
  },
  assessmentDigest: digest("5")
} as unknown as ReadinessAssessment;

const assessmentState = {
  version: "release-assessment-state.v1",
  digestVersion: "release-assessment-state-digest.v1",
  assessmentId: ASSESSMENT_ID,
  assessmentRevision: 1,
  assessmentDigest: assessment.assessmentDigest,
  evaluatedStatus: "BLOCKED",
  status: "BLOCKED",
  evaluatedInputFingerprintDigest: assessment.inputFingerprintDigest,
  currentInputFingerprintDigest: assessment.inputFingerprintDigest,
  staleReasons: [],
  storedAssessmentChanged: false,
  authority: {
    derivation: "EXACT_DEPENDENCY_COMPARISON",
    persistenceMutation: false,
    releaseApproval: false,
    releasePassport: false,
    deploymentAuthority: false,
    aiAuthority: "NONE"
  },
  stateDigest: digest("6")
} as unknown as ReadinessAssessmentState;

const passport = {
  version: "release-passport.v1",
  projectionVersion: "release-passport-projection.v1",
  passportKey: digest("7"),
  passportId: PASSPORT_ID,
  projectId: PROJECT_ID,
  missionId: MISSION_ID,
  recordedAtUtc: "2026-08-06T10:01:00.000Z",
  assessment: {
    assessmentId: ASSESSMENT_ID,
    revision: 1,
    assessmentDigest: assessment.assessmentDigest,
    inputFingerprintDigest: assessment.inputFingerprintDigest
  },
  snapshot: { targetSnapshotId: SNAPSHOT_ID, currentSnapshotId: SNAPSHOT_ID },
  rule: { policyVersion: "readiness.v1", policyDigest: digest("4") },
  evidenceDigest: assessment.inputFingerprintDigest,
  status: "BLOCKED",
  obligations,
  blockers,
  findings,
  validations: { requirements: [], evidence: [] },
  review: { status: "MISSING" },
  citations: [
    { kind: "ASSESSMENT", referenceId: ASSESSMENT_ID, referenceDigest: assessment.assessmentDigest },
    { kind: "RECONCILIATION", referenceId: digest("2"), referenceRevision: 1, referenceDigest: digest("3") },
    { kind: "TARGET_SNAPSHOT", referenceId: SNAPSHOT_ID },
    { kind: "CURRENT_SNAPSHOT", referenceId: SNAPSHOT_ID }
  ],
  passportDigest: digest("8")
} as unknown as ReleasePassport;

const passportState = {
  version: "release-passport-state.v1",
  digestVersion: "release-passport-state-digest.v1",
  passportId: PASSPORT_ID,
  passportDigest: passport.passportDigest,
  assessmentId: ASSESSMENT_ID,
  assessmentRevision: 1,
  statusAtProjection: "BLOCKED",
  status: "BLOCKED",
  staleReasons: [],
  passportChanged: false,
  authority: {
    association: "ASSESSMENT_STATE_REFERENCE",
    readinessRecomputed: false,
    persistenceMutation: false,
    releaseApproval: false,
    deploymentAuthority: false,
    aiAuthority: "NONE"
  },
  stateDigest: digest("9")
} as unknown as ReleasePassportState;

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function setup(overrides: {
  readinessService?: ReadinessApiService;
  passportService?: PassportApiService;
} = {}) {
  const readinessService: ReadinessApiService = overrides.readinessService ?? {
    assess: async () => ({ created: true, assessment }),
    state: async () => ({ assessment, state: assessmentState })
  };
  const passportService: PassportApiService = overrides.passportService ?? {
    project: async () => ({ created: true, passport }),
    state: async () => ({ passport, state: passportState })
  };
  const readinessRepository: ReadinessApiRepository = {
    listAssessments: async () => ({ items: [assessment], nextCursor: null })
  };
  const passportRepository: PassportApiRepository = {
    list: async () => ({ items: [passport], nextCursor: null })
  };
  const app = buildApp({
    projectRepository: {
      getMission: () => ({ projectId: PROJECT_ID })
    } as unknown as SqliteProjectRepository,
    readinessRepository,
    readinessService,
    passportRepository,
    passportService,
    requestIdFactory: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  });
  apps.push(app);
  return app;
}

describe("readiness and Passport API", () => {
  it("creates and retrieves strict repository-derived assessment history", async () => {
    const app = setup();
    const root = `/api/v1/missions/${MISSION_ID}/readiness/assessments`;
    const created = await app.inject({ method: "POST", url: root, payload: {} });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({
      apiVersion: "v1",
      created: true,
      assessment: {
        missionId: MISSION_ID,
        revision: 1,
        evaluatedStatus: "BLOCKED",
        currentStatus: "BLOCKED",
        blockers,
        authority: {
          currentStateDerivation: "EXACT_DEPENDENCY_COMPARISON",
          releaseApproval: false,
          deploymentAuthority: false,
          aiAuthority: "NONE"
        }
      }
    });
    const list = await app.inject({ method: "GET", url: `${root}?limit=20` });
    expect(list.statusCode, list.body).toBe(200);
    expect(list.json()).toMatchObject({
      missionId: MISSION_ID,
      assessments: [{ revision: 1, currentStatus: "BLOCKED" }],
      page: { limit: 20, nextCursor: null }
    });
    const detail = await app.inject({ method: "GET", url: `${root}/1` });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.body).not.toContain("canonical_json");
  });

  it("projects, retrieves and exports only a safe unsigned structural Passport", async () => {
    const app = setup();
    const root = `/api/v1/missions/${MISSION_ID}/readiness`;
    const projected = await app.inject({
      method: "POST",
      url: `${root}/assessments/1/passport`,
      payload: {}
    });
    expect(projected.statusCode, projected.body).toBe(201);
    expect(projected.json()).toMatchObject({
      created: true,
      passport: {
        assessmentRevision: 1,
        statusAtProjection: "BLOCKED",
        currentStatus: "BLOCKED",
        authority: {
          projection: "REPRODUCED_NOT_RECOMPUTED",
          readinessRecomputed: false,
          signed: false,
          releaseApproval: false,
          deploymentAuthority: false
        }
      }
    });
    const list = await app.inject({ method: "GET", url: `${root}/passports?limit=10` });
    expect(list.statusCode, list.body).toBe(200);
    expect(list.json()).toMatchObject({ passports: [{ assessmentRevision: 1 }] });
    const detail = await app.inject({ method: "GET", url: `${root}/passports/1` });
    expect(detail.statusCode, detail.body).toBe(200);
    const exported = await app.inject({ method: "GET", url: `${root}/passports/1/export` });
    expect(exported.statusCode, exported.body).toBe(200);
    expect(exported.headers["content-disposition"]).toBe(
      'attachment; filename="intelliloop-release-passport-r1.json"'
    );
    expect(exported.json()).toMatchObject({
      exportVersion: "release-passport-export.v1",
      contentClassification: "CONTROLLED_STRUCTURAL_METADATA",
      safety: {
        containsSourceBodies: false,
        containsAbsolutePaths: false,
        containsCredentials: false,
        signed: false,
        releaseApproval: false,
        deploymentAuthority: false
      },
      warnings: [
        "UNSIGNED_LOCAL_RECORD",
        "NOT_RELEASE_APPROVAL",
        "VERIFY_CURRENT_STATUS_BEFORE_USE"
      ]
    });
    expect(exported.body).not.toMatch(/[A-Za-z]:\\Users\\|\/Users\/|\/home\/|sourceBody|sk-[A-Za-z0-9_-]{20,}/u);
  });

  it("rejects caller fields, invalid paging and unavailable assessment dependencies", async () => {
    const app = setup({
      readinessService: {
        assess: async () => { throw new ReadinessExecutionError("READINESS_EXECUTION_RECONCILIATION_MISSING"); },
        state: async () => ({ assessment, state: assessmentState })
      }
    });
    const root = `/api/v1/missions/${MISSION_ID}/readiness/assessments`;
    const injected = await app.inject({ method: "POST", url: root, payload: { status: "READY" } });
    expect(injected.statusCode).toBe(400);
    const badPage = await app.inject({ method: "GET", url: `${root}?limit=101` });
    expect(badPage.statusCode).toBe(400);
    const missingDependency = await app.inject({ method: "POST", url: root, payload: {} });
    expect(missingDependency.statusCode).toBe(409);
    expect(missingDependency.body).not.toContain("reconciliation");
  });

  it("maps Passport absence without leaking persistence detail", async () => {
    const app = setup({
      passportService: {
        project: async () => ({ created: true, passport }),
        state: async () => { throw new PassportRepositoryError("PASSPORT_NOT_FOUND"); }
      }
    });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/missions/${MISSION_ID}/readiness/passports/1`
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { version: "v1", code: "NOT_FOUND" } });
    expect(response.body).not.toContain("Passport was not found");
  });
});
