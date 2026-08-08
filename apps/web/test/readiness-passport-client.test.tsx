import { describe, expect, it, vi } from "vitest";

import {
  createReleasePassportExportResponse,
  toReadinessAssessmentResource,
  toReadinessAssessmentSummaryResource,
  toReleasePassportResource,
  toReleasePassportSummaryResource,
  type ReadinessAssessmentListResponse,
  type ReadinessAssessmentResponse,
  type ReleasePassportListResponse,
  type ReleasePassportResponse
} from "@intelliloop/contracts";
import type {
  ReadinessAssessment,
  ReadinessAssessmentState,
  ReadinessStatus,
  ReleasePassport,
  ReleasePassportState
} from "@intelliloop/domain";

import {
  createReadinessAssessment,
  createReleasePassport,
  getReadinessAssessment,
  getReleasePassportExport,
  isReadinessAssessmentListResponse,
  isReadinessAssessmentResponse,
  isReleasePassportExportResponse,
  isReleasePassportListResponse,
  isReleasePassportResponse,
  listReadinessAssessments,
  listReleasePassports
} from "../src/readiness-passport-client";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const MISSION_ID = "22222222-2222-4222-8222-222222222222";
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

function fixtures(status: ReadinessStatus, revision = 1) {
  const blocked = status === "BLOCKED";
  const assessmentId = `${revision.toString(16).padStart(8, "0")}-3333-4333-8333-333333333333`;
  const passportId = `${revision.toString(16).padStart(8, "0")}-4444-4444-8444-444444444444`;
  const obligations = obligationIds.map((obligationId, index) => ({
    obligationId,
    category: categories[index]!,
    requirement: `Controlled requirement ${index + 1}.`,
    status: blocked && obligationId === "EXPLICIT_HUMAN_REVIEW" ? "UNSATISFIED" as const : "SATISFIED" as const,
    blockerCodes: blocked && obligationId === "EXPLICIT_HUMAN_REVIEW" ? ["REVIEW_MISSING" as const] : []
  }));
  const blockers = blocked
    ? [{ code: "REVIEW_MISSING" as const, obligationId: "EXPLICIT_HUMAN_REVIEW" as const }]
    : [];
  const assessment = {
    version: "release-assessment.v1",
    assessmentId,
    revision,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    recordedAtUtc: `2026-08-06T10:00:0${revision}.000Z`,
    inputFingerprintDigest: digest("1"),
    evaluatedStatus: status === "STALE" ? "READY" : status,
    evaluation: {
      targetSnapshotId: SNAPSHOT_ID,
      currentSnapshotId: SNAPSHOT_ID,
      reconciliationBinding: { revision: 1, revisionKey: digest("2"), resultDigest: digest("3") },
      policyVersion: "readiness.v1",
      policyDigest: digest("4"),
      obligations,
      blockers,
      findingCounts: { CONFLICT: 0, AMBIGUOUS: 0, MISSING: 0, STALE: 0, IMPACT_GAP: 0, total: 0 },
      validationRequirements: [],
      validationEvidence: [],
      review: blocked ? { status: "MISSING" } : {
        status: "RECORDED",
        reviewId: "66666666-6666-4666-8666-666666666666",
        actorKind: "HUMAN",
        projectId: PROJECT_ID,
        missionId: MISSION_ID,
        snapshotId: SNAPSHOT_ID,
        reconciliationResultDigest: digest("3"),
        reviewDigest: digest("a"),
        persistence: "PERSISTED"
      }
    },
    assessmentDigest: digest("5")
  } as unknown as ReadinessAssessment;
  const state = {
    assessmentId,
    assessmentRevision: revision,
    assessmentDigest: assessment.assessmentDigest,
    evaluatedStatus: assessment.evaluatedStatus,
    status,
    evaluatedInputFingerprintDigest: assessment.inputFingerprintDigest,
    currentInputFingerprintDigest: status === "STALE" ? digest("f") : assessment.inputFingerprintDigest,
    staleReasons: status === "STALE" ? ["SNAPSHOT_CHANGED"] : [],
    storedAssessmentChanged: false,
    stateDigest: digest("6")
  } as unknown as ReadinessAssessmentState;
  const passport = {
    version: "release-passport.v1",
    projectionVersion: "release-passport-projection.v1",
    passportKey: digest("7"),
    passportId,
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    recordedAtUtc: `2026-08-06T10:01:0${revision}.000Z`,
    assessment: {
      assessmentId,
      revision,
      assessmentDigest: assessment.assessmentDigest,
      inputFingerprintDigest: assessment.inputFingerprintDigest
    },
    snapshot: { targetSnapshotId: SNAPSHOT_ID, currentSnapshotId: SNAPSHOT_ID },
    rule: { policyVersion: "readiness.v1", policyDigest: digest("4") },
    evidenceDigest: assessment.inputFingerprintDigest,
    status: assessment.evaluatedStatus,
    obligations,
    blockers,
    findings: assessment.evaluation.findingCounts,
    validations: { requirements: [], evidence: [] },
    review: assessment.evaluation.review,
    citations: [
      { kind: "ASSESSMENT", referenceId: assessmentId, referenceDigest: assessment.assessmentDigest },
      { kind: "RECONCILIATION", referenceId: digest("2"), referenceRevision: 1, referenceDigest: digest("3") },
      { kind: "TARGET_SNAPSHOT", referenceId: SNAPSHOT_ID },
      { kind: "CURRENT_SNAPSHOT", referenceId: SNAPSHOT_ID }
    ],
    passportDigest: digest("8")
  } as unknown as ReleasePassport;
  const passportState = {
    passportId,
    passportDigest: passport.passportDigest,
    assessmentId,
    assessmentRevision: revision,
    statusAtProjection: assessment.evaluatedStatus,
    status,
    staleReasons: state.staleReasons,
    passportChanged: false,
    stateDigest: digest("9")
  } as unknown as ReleasePassportState;
  const assessmentResource = toReadinessAssessmentResource(assessment, state);
  const passportResource = toReleasePassportResource(passport, passportState);
  const assessmentResponse: ReadinessAssessmentResponse = {
    apiVersion: "v1", created: true, assessment: assessmentResource
  };
  const passportResponse: ReleasePassportResponse = {
    apiVersion: "v1", created: true, passport: passportResource
  };
  return { assessmentResponse, passportResponse, exportResponse: createReleasePassportExportResponse(passportResource) };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("readiness and Passport browser contract", () => {
  it("accepts exact BLOCKED, READY and STALE server states without calculating a verdict", () => {
    for (const status of ["BLOCKED", "READY", "STALE"] as const) {
      const fixture = fixtures(status);
      expect(isReadinessAssessmentResponse(fixture.assessmentResponse)).toBe(true);
      expect(isReleasePassportResponse(fixture.passportResponse)).toBe(true);
      expect(fixture.assessmentResponse.assessment.currentStatus).toBe(status);
      expect(fixture.passportResponse.passport.currentStatus).toBe(status);
    }
  });

  it("uses mission-scoped creation and retrieval endpoints with empty authority-free bodies", async () => {
    const fixture = fixtures("BLOCKED");
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(fixture.assessmentResponse, 201))
      .mockResolvedValueOnce(jsonResponse(fixture.assessmentResponse))
      .mockResolvedValueOnce(jsonResponse(fixture.passportResponse, 201));
    await expect(createReadinessAssessment(MISSION_ID, fetcher)).resolves.toEqual(fixture.assessmentResponse);
    await expect(getReadinessAssessment(MISSION_ID, 1, fetcher)).resolves.toEqual(fixture.assessmentResponse);
    await expect(createReleasePassport(MISSION_ID, 1, fetcher)).resolves.toEqual(fixture.passportResponse);
    expect(fetcher).toHaveBeenNthCalledWith(1,
      `/api/v1/missions/${MISSION_ID}/readiness/assessments`,
      expect.objectContaining({ method: "POST", body: "{}" })
    );
    expect(fetcher).toHaveBeenNthCalledWith(3,
      `/api/v1/missions/${MISSION_ID}/readiness/assessments/1/passport`,
      expect.objectContaining({ method: "POST", body: "{}" })
    );
  });

  it("rejects authority widening, cross-binding, private paths and malformed history order", () => {
    const fixture = fixtures("READY");
    const authority = structuredClone(fixture.passportResponse) as unknown as {
      passport: { authority: { signed: boolean } };
    };
    authority.passport.authority.signed = true;
    expect(isReleasePassportResponse(authority)).toBe(false);

    const binding = structuredClone(fixture.passportResponse) as unknown as {
      passport: { assessmentId: string };
    };
    binding.passport.assessmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(isReleasePassportResponse(binding)).toBe(false);

    const privatePath = structuredClone(fixture.assessmentResponse) as unknown as {
      assessment: { obligations: Array<{ requirement: string }> };
    };
    privatePath.assessment.obligations[0]!.requirement = "Review C:\\Users\\private\\secret.txt";
    expect(isReadinessAssessmentResponse(privatePath)).toBe(false);

    const older = fixtures("BLOCKED", 1);
    const newer = fixtures("READY", 2);
    const reversed: ReadinessAssessmentListResponse = {
      apiVersion: "v1",
      missionId: MISSION_ID,
      assessments: [
        toReadinessAssessmentSummaryResource(older.assessmentResponse.assessment),
        toReadinessAssessmentSummaryResource(newer.assessmentResponse.assessment)
      ],
      page: { limit: 100, nextCursor: null }
    };
    expect(isReadinessAssessmentListResponse(reversed)).toBe(false);
  });

  it("accepts only the fixed structural export safety and warning envelope", async () => {
    const fixture = fixtures("STALE");
    expect(isReleasePassportExportResponse(fixture.exportResponse)).toBe(true);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fixture.exportResponse));
    await expect(getReleasePassportExport(MISSION_ID, 1, fetcher)).resolves.toEqual(fixture.exportResponse);
    const widened = structuredClone(fixture.exportResponse) as unknown as {
      safety: { releaseApproval: boolean };
    };
    widened.safety.releaseApproval = true;
    expect(isReleasePassportExportResponse(widened)).toBe(false);
  });

  it("accepts descending bounded Passport history and rejects duplicates", () => {
    const first = fixtures("READY", 2);
    const second = fixtures("BLOCKED", 1);
    const valid: ReleasePassportListResponse = {
      apiVersion: "v1",
      missionId: MISSION_ID,
      passports: [
        toReleasePassportSummaryResource(first.passportResponse.passport),
        toReleasePassportSummaryResource(second.passportResponse.passport)
      ],
      page: { limit: 100, nextCursor: null }
    };
    expect(isReleasePassportListResponse(valid)).toBe(true);
    const duplicate: ReleasePassportListResponse = {
      ...valid,
      passports: [valid.passports[0]!, valid.passports[0]!]
    };
    expect(isReleasePassportListResponse(duplicate)).toBe(false);
  });

  it("rejects list envelopes whose Mission scope differs from the requested route", async () => {
    const fixture = fixtures("BLOCKED");
    const otherMissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const assessmentList: ReadinessAssessmentListResponse = {
      apiVersion: "v1",
      missionId: otherMissionId,
      assessments: [toReadinessAssessmentSummaryResource(fixture.assessmentResponse.assessment)],
      page: { limit: 100, nextCursor: null }
    };
    const passportList: ReleasePassportListResponse = {
      apiVersion: "v1",
      missionId: otherMissionId,
      passports: [toReleasePassportSummaryResource(fixture.passportResponse.passport)],
      page: { limit: 100, nextCursor: null }
    };
    await expect(listReadinessAssessments(
      MISSION_ID,
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(assessmentList))
    )).rejects.toThrow();
    await expect(listReleasePassports(
      MISSION_ID,
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(passportList))
    )).rejects.toThrow();
  });
});
