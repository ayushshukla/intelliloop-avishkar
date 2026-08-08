import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "docs", "evidence", "EV_METRICS.json");
const PILOT_INPUT = join(ROOT, "docs", "evidence", "PILOT_MEASUREMENT_TEMPLATE.json");
const REFRESH = process.argv.includes("--refresh");
const VERIFY = process.argv.includes("--verify-existing");
const SELF_TEST = process.argv.includes("--self-test");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function readJson(logicalPath) {
  const bytes = await readFile(join(ROOT, logicalPath));
  return { value: JSON.parse(bytes.toString("utf8")), bytes };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function validateOptional(value, validator, label) {
  if (value !== null && value !== undefined) {
    assert(validator(value), `${label} is invalid.`);
  }
}

function pilotSummary(pilot) {
  const roles = ["DEVELOPER", "TECHNICAL_LEAD", "MANAGER"];
  const modes = ["MANUAL", "INTELLILOOP_ASSISTED"];
  const phases = ["contextGathering", "impactAnalysis", "evidenceChecking", "releasePreparation"];
  const observations = ["validImpactPaths", "invalidCitations", "falseReady", "passportMismatch"];
  const expectedRunIds = {
    "DEVELOPER/MANUAL": "DEV-M",
    "DEVELOPER/INTELLILOOP_ASSISTED": "DEV-A",
    "TECHNICAL_LEAD/MANUAL": "LEAD-M",
    "TECHNICAL_LEAD/INTELLILOOP_ASSISTED": "LEAD-A",
    "MANAGER/MANUAL": "MGR-M",
    "MANAGER/INTELLILOOP_ASSISTED": "MGR-A"
  };
  assert(pilot.schemaVersion === 1, "Pilot input schema is unsupported.");
  assert(pilot.privacy?.individualSurveillance === false, "Pilot must prohibit individual surveillance.");
  assert(pilot.privacy?.personRanking === false, "Pilot must prohibit person ranking.");
  assert(pilot.privacy?.personallyIdentifyingFieldsCollected === false, "Pilot must not collect identifying fields.");
  assert(pilot.representativeScenario?.changeCount === 1 && pilot.representativeScenario?.releaseCount === 1, "Pilot scenario must declare one bounded change and one candidate release.");
  assert(Array.isArray(pilot.runs) && pilot.runs.length === 6, "Pilot template must contain six role/mode runs.");
  const runKeys = pilot.runs.map((run) => `${run.role}/${run.mode}`);
  assert(new Set(runKeys).size === pilot.runs.length, "Pilot role/mode runs must be unique.");

  const missingFields = [];
  let completeTimingRunCount = 0;
  let completeObservationRunCount = 0;
  let completeRunCount = 0;
  let feedbackResponseCount = 0;

  for (const run of pilot.runs) {
    const runKey = `${run.role}/${run.mode}`;
    assert(roles.includes(run.role) && modes.includes(run.mode), `Pilot run ${run.runId ?? "UNKNOWN"} has an unsupported role or mode.`);
    assert(expectedRunIds[runKey] === run.runId, `Pilot run identifier does not match ${runKey}.`);

    const timingComplete = phases.map((phase) => {
      const value = run.phaseMinutes?.[phase];
      validateOptional(value, isNonNegativeNumber, `${run.runId}.phaseMinutes.${phase}`);
      if (!isNonNegativeNumber(value)) missingFields.push(`${run.runId}.phaseMinutes.${phase}`);
      return isNonNegativeNumber(value);
    }).every(Boolean);
    const observationComplete = observations.map((observation) => {
      const value = run.observations?.[observation];
      validateOptional(value, isNonNegativeInteger, `${run.runId}.observations.${observation}`);
      if (!isNonNegativeInteger(value)) missingFields.push(`${run.runId}.observations.${observation}`);
      return isNonNegativeInteger(value);
    }).every(Boolean);
    if (timingComplete) completeTimingRunCount += 1;
    if (observationComplete) completeObservationRunCount += 1;
    if (timingComplete && observationComplete) completeRunCount += 1;

    if (run.mode === "MANUAL") {
      assert(run.feedback === null, `${run.runId}.feedback must remain null; feedback is collected once after the assisted run.`);
      continue;
    }

    const usefulness = run.feedback?.usefulnessRating;
    const trustClarity = run.feedback?.trustClarityRating;
    const wouldUse = run.feedback?.wouldUseInPilot;
    const note = run.feedback?.sanitizedNote;
    validateOptional(usefulness, isRating, `${run.runId}.feedback.usefulnessRating`);
    validateOptional(trustClarity, isRating, `${run.runId}.feedback.trustClarityRating`);
    validateOptional(wouldUse, (value) => typeof value === "boolean", `${run.runId}.feedback.wouldUseInPilot`);
    validateOptional(note, (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 500, `${run.runId}.feedback.sanitizedNote`);
    const feedbackComplete = isRating(usefulness) && isRating(trustClarity) && typeof wouldUse === "boolean" && typeof note === "string" && note.trim().length > 0 && note.length <= 500;
    if (feedbackComplete) feedbackResponseCount += 1;
    else {
      if (!isRating(usefulness)) missingFields.push(`${run.runId}.feedback.usefulnessRating`);
      if (!isRating(trustClarity)) missingFields.push(`${run.runId}.feedback.trustClarityRating`);
      if (typeof wouldUse !== "boolean") missingFields.push(`${run.runId}.feedback.wouldUseInPilot`);
      if (!(typeof note === "string" && note.trim().length > 0 && note.length <= 500)) missingFields.push(`${run.runId}.feedback.sanitizedNote`);
    }
  }

  const cadence = pilot.cadenceAssumption?.representativeChangesPerMonth;
  const cadenceSource = pilot.cadenceAssumption?.source;
  validateOptional(cadence, (value) => Number.isInteger(value) && value > 0, "cadenceAssumption.representativeChangesPerMonth");
  validateOptional(cadenceSource, (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 500, "cadenceAssumption.source");
  const cadenceComplete = Number.isInteger(cadence) && cadence > 0 && typeof cadenceSource === "string" && cadenceSource.trim().length > 0 && cadenceSource.length <= 500;
  if (!(Number.isInteger(cadence) && cadence > 0)) missingFields.push("cadenceAssumption.representativeChangesPerMonth");
  if (!(typeof cadenceSource === "string" && cadenceSource.trim().length > 0 && cadenceSource.length <= 500)) missingFields.push("cadenceAssumption.source");

  const complete = completeRunCount === pilot.runs.length && feedbackResponseCount === roles.length && cadenceComplete;

  if (!complete) {
    assert(pilot.status === "NOT_RUN", "An incomplete pilot must remain NOT_RUN.");
    return {
      status: "NOT_RUN",
      completeRunCount,
      requiredRunCount: pilot.runs.length,
      completeTimingRunCount,
      completeObservationRunCount,
      feedbackResponseCount,
      requiredFeedbackResponseCount: roles.length,
      cadenceComplete,
      missingFieldCount: missingFields.length,
      missingFields,
      benefitHypothesis: "NOT_VALIDATED",
      monthlyTeamHoursSaved: null,
      reason: "Real role-based baseline/assisted timings, quality observations, complete feedback and a documented cadence have not been supplied."
    };
  }

  assert(pilot.status === "COMPLETE", "A complete pilot must be explicitly marked COMPLETE.");
  const totals = Object.fromEntries(modes.map((mode) => [mode, pilot.runs
    .filter((run) => run.mode === mode)
    .map((run) => phases.reduce((sum, phase) => sum + run.phaseMinutes[phase], 0))]));
  const manualMedian = median(totals.MANUAL);
  const assistedMedian = median(totals.INTELLILOOP_ASSISTED);
  const delta = manualMedian - assistedMedian;
  const changesPerMonth = pilot.cadenceAssumption.representativeChangesPerMonth;
  const assistedFeedback = pilot.runs.filter((run) => run.mode === "INTELLILOOP_ASSISTED").map((run) => run.feedback);
  return {
    status: "COMPLETE",
    completeRunCount,
    requiredRunCount: pilot.runs.length,
    completeTimingRunCount,
    completeObservationRunCount,
    feedbackResponseCount,
    requiredFeedbackResponseCount: roles.length,
    cadenceComplete,
    manualMedianMinutesPerChange: round(manualMedian),
    assistedMedianMinutesPerChange: round(assistedMedian),
    medianDeltaMinutesPerChange: round(delta),
    representativeChangesPerMonth: changesPerMonth,
    monthlyTeamHoursSaved: round((delta * changesPerMonth) / 60),
    benefitHypothesis: delta > 0 ? "OBSERVED_IN_BOUNDED_PILOT" : "NOT_SUPPORTED_IN_BOUNDED_PILOT",
    aggregateFeedback: {
      usefulnessMedian: median(assistedFeedback.map((feedback) => feedback.usefulnessRating)),
      trustClarityMedian: median(assistedFeedback.map((feedback) => feedback.trustClarityRating)),
      wouldUseInPilotCount: assistedFeedback.filter((feedback) => feedback.wouldUseInPilot).length,
      responseCount: assistedFeedback.length,
      sanitizedNoteCount: assistedFeedback.filter((feedback) => feedback.sanitizedNote.trim().length > 0).length
    },
    aggregateQualityObservations: {
      validImpactPaths: pilot.runs.reduce((sum, run) => sum + run.observations.validImpactPaths, 0),
      invalidCitations: pilot.runs.reduce((sum, run) => sum + run.observations.invalidCitations, 0),
      falseReady: pilot.runs.reduce((sum, run) => sum + run.observations.falseReady, 0),
      passportMismatch: pilot.runs.reduce((sum, run) => sum + run.observations.passportMismatch, 0)
    },
    productionExtrapolationPerformed: false
  };
}

async function buildEvidence() {
  const sources = {};
  for (const logicalPath of [
    "docs/evidence/EV_RECONCILE.json",
    "docs/evidence/EV_CITATIONS.json",
    "docs/evidence/EV_READINESS.json",
    "docs/evidence/EV_PASSPORT.json",
    "docs/evidence/EV_GOLDEN_FLOW.json",
    "docs/evidence/EV_DEMO_GATE.json",
    "docs/evidence/EV_RELEASE.json"
  ]) {
    sources[logicalPath] = await readJson(logicalPath);
    assert(String(sources[logicalPath].value.status).startsWith("PASS"), `${logicalPath} is not passing.`);
  }
  const pilotSource = await readFile(PILOT_INPUT);
  const pilot = JSON.parse(pilotSource.toString("utf8"));

  const reconcile = sources["docs/evidence/EV_RECONCILE.json"].value;
  const citations = sources["docs/evidence/EV_CITATIONS.json"].value;
  const readiness = sources["docs/evidence/EV_READINESS.json"].value;
  const passport = sources["docs/evidence/EV_PASSPORT.json"].value;
  const golden = sources["docs/evidence/EV_GOLDEN_FLOW.json"].value;
  const demo = sources["docs/evidence/EV_DEMO_GATE.json"].value;
  const release = sources["docs/evidence/EV_RELEASE.json"].value;

  assert(reconcile.proofs.controlledMetrics.accuracy.passed === 6 && reconcile.proofs.controlledMetrics.accuracy.total === 6, "Reconciliation truth table drifted.");
  assert(citations.proofs.citations.everyStatementCited === "PASS" && citations.proofs.citations.everyRenderedCitationResolved === "PASS", "Citation validity drifted.");
  assert(readiness.proofs.controlledFalseReadyCount === 0, "A controlled negative produced READY.");
  assert(passport.proofs.exactAssessmentProjection === true && passport.proofs.canonicalEqualityAndDigestBinding === true, "Passport fidelity drifted.");
  assert(golden.acceptance.allStretchFlagsOff === true && golden.acceptance.externalAiCalls === false, "Golden-flow boundary drifted.");
  assert(demo.safety.registeredRepositoryCompleteTreeEquality === "PASS" && demo.safety.browserNonLoopbackRequests === 0, "Demo safety drifted.");

  const phase = Object.fromEntries(demo.rehearsal.phases.map((entry) => [entry.name, entry.actionMs]));
  const assistedSystemActionMilliseconds = {
    contextGathering: phase.MATERIALIZE_BLOCKED,
    impactAnalysis: phase.CONFLICT_AND_IMPACT,
    evidenceChecking: phase.OFFLINE_CITED_ANSWER,
    releasePreparation: phase.UNSIGNED_PASSPORT
  };
  assert(Object.values(assistedSystemActionMilliseconds).every(Number.isFinite), "Required demo phase timing is absent.");

  const releaseCommand = (id) => release.commands.find((entry) => entry.id === id);
  const measurementProjections = {
    "docs/evidence/EV_RECONCILE.json": {
      status: reconcile.status,
      accuracy: reconcile.proofs.controlledMetrics.accuracy,
      impact: reconcile.proofs.impact,
      replay: reconcile.proofs.deterministicRerun,
      repositorySafety: reconcile.proofs.repositorySafety
    },
    "docs/evidence/EV_CITATIONS.json": {
      status: citations.status,
      fixedQuestionApi: citations.proofs.fixedQuestionApi,
      citations: citations.proofs.citations,
      syntheticEdgeCases: citations.proofs.syntheticEdgeCases,
      authority: citations.proofs.authority
    },
    "docs/evidence/EV_READINESS.json": { status: readiness.status, proofs: readiness.proofs },
    "docs/evidence/EV_PASSPORT.json": { status: passport.status, proofs: passport.proofs },
    "docs/evidence/EV_GOLDEN_FLOW.json": {
      status: golden.status,
      fixture: golden.fixture,
      execution: golden.execution,
      demonstratedSequence: golden.demonstratedSequence,
      acceptance: golden.acceptance
    },
    "docs/evidence/EV_DEMO_GATE.json": {
      status: demo.status,
      rehearsal: demo.rehearsal,
      workflow: demo.workflow,
      safety: demo.safety
    },
    "docs/evidence/EV_RELEASE.json": {
      status: release.status,
      unitAndComponentTests: releaseCommand("UNIT_COMPONENT")?.observations.passedTests,
      apiAndIntegrationTests: releaseCommand("API_INTEGRATION")?.observations.passedTests,
      browserScenarios: releaseCommand("BROWSER_E2E")?.observations.passedBrowserScenarios
    }
  };
  const sourceIntegrity = Object.fromEntries(Object.entries(measurementProjections).map(([path, projection]) => [
    `${path}#measurement-projection`,
    sha256(Buffer.from(JSON.stringify(projection), "utf8"))
  ]));
  sourceIntegrity["docs/evidence/PILOT_MEASUREMENT_TEMPLATE.json"] = sha256(pilotSource);

  const humanPilot = pilotSummary(pilot);

  return {
    schemaVersion: 1,
    evidenceId: "EV-METRICS",
    story: "IL-9.4",
    status: "PASS_CONTROLLED_PRODUCT_METRICS_PILOT_INPUT_REQUIRED",
    checkpoint: "G6_PRODUCT_PROOF_READY_HUMAN_BENEFIT_PILOT_PENDING",
    evidenceDate: "2026-08-07",
    reproductionCommand: "npm.cmd run evidence:metrics",
    representativeWork: {
      fixture: golden.fixture.fixtureId,
      ownership: golden.fixture.ownership,
      changeCount: pilot.representativeScenario.changeCount,
      candidateReleaseCount: pilot.representativeScenario.releaseCount,
      persistedStateSequence: golden.acceptance.persistedStateSequence
    },
    measuredPrototypeBehavior: {
      reconciliationTruthCases: reconcile.proofs.controlledMetrics.accuracy,
      impactPaths: {
        expectedAndObserved: reconcile.proofs.impact.initialPathCount,
        citationRequirement: reconcile.proofs.impact.citationsRequiredAndVerified
      },
      citations: {
        fixedQuestionsPassed: citations.proofs.fixedQuestionApi.passedQuestions,
        fixedQuestionsTotal: citations.proofs.fixedQuestionApi.expectedQuestions,
        renderedStatements: citations.proofs.citations.renderedStatementCount,
        resolvedStatementCitations: citations.proofs.citations.resolvedStatementCitationCount,
        everyStatementCited: citations.proofs.citations.everyStatementCited,
        everyRenderedCitationResolved: citations.proofs.citations.everyRenderedCitationResolved,
        resolvedSyntheticSuggestionCitations: citations.proofs.syntheticEdgeCases.resolvedSuggestionCitationCount
      },
      readiness: {
        positiveCases: readiness.proofs.readyPositiveCases,
        controlledNonReadyCases: readiness.proofs.controlledNonReadyCases,
        falseReadyCount: readiness.proofs.controlledFalseReadyCount
      },
      passportFidelity: {
        exactAssessmentProjection: passport.proofs.exactAssessmentProjection,
        canonicalEqualityAndDigestBinding: passport.proofs.canonicalEqualityAndDigestBinding,
        changedProjectionRejected: passport.proofs.changedProjectionRejected,
        signed: passport.proofs.signed,
        releaseApproval: passport.proofs.releaseApproval
      },
      focusedGoldenFlowTests: golden.execution.totalFocusedTests,
      releaseVerification: {
        unitAndComponentTests: releaseCommand("UNIT_COMPONENT")?.observations.passedTests,
        apiAndIntegrationTests: releaseCommand("API_INTEGRATION")?.observations.passedTests,
        browserScenarios: releaseCommand("BROWSER_E2E")?.observations.passedBrowserScenarios
      }
    },
    timing: {
      kind: "LOCAL_SYNTHETIC_SYSTEM_ACTION_TIMING_NOT_HUMAN_TASK_TIME",
      assistedSystemActionMilliseconds,
      assistedSystemActionTotalMilliseconds: Object.values(assistedSystemActionMilliseconds).reduce((sum, value) => sum + value, 0),
      pacedEndToEndDemoMinutes: demo.rehearsal.elapsedMinutes,
      manualBaselineMinutes: null,
      comparableAssistedHumanTaskMinutes: null,
      limitation: "Action timings are one local synthetic run and cannot be subtracted from an unmeasured human baseline."
    },
    humanPilot,
    monthlyCalculation: {
      formula: "((median manual minutes per representative change - median assisted minutes per representative change) * representative changes per month) / 60",
      submittedThresholdHoursPerMonth: 20,
      requiredMedianDeltaMinutesByCadence: [
        { representativeChangesPerMonth: 20, requiredDeltaMinutesPerChange: 60 },
        { representativeChangesPerMonth: 40, requiredDeltaMinutesPerChange: 30 },
        { representativeChangesPerMonth: 80, requiredDeltaMinutesPerChange: 15 }
      ],
      resultHoursPerMonth: humanPilot.monthlyTeamHoursSaved,
      productionExtrapolationPerformed: false
    },
    safetyAndEthics: {
      individualSurveillance: false,
      personRanking: false,
      personallyIdentifyingFields: false,
      registeredRepositoryWrites: 0,
      browserNonLoopbackRequests: demo.safety.browserNonLoopbackRequests,
      externalAiCalls: demo.safety.externalAiCalls
    },
    sourceIntegrity,
    limitations: [
      "The fixture and all current conformance measurements are IntelliLoop-authored, local and synthetic.",
      "No real developer, technical-lead or manager timing/feedback sample has been collected; the submitted >20 hours/month statement remains a pilot hypothesis.",
      "System-action time is not human task time and is not used to calculate savings, ROI or productivity.",
      "No individual surveillance, person ranking, production extrapolation or causal organizational claim is permitted.",
      "READY is exact-input candidate readiness; the Passport is unsigned and supplies no release or deployment authority."
    ],
    nextAuthorizedStory: "IL-9.4_HUMAN_PILOT_INPUT"
  };
}

async function runPilotSelfTest() {
  const template = JSON.parse(await readFile(PILOT_INPUT, "utf8"));
  const completePilot = structuredClone(template);
  completePilot.status = "COMPLETE";
  completePilot.cadenceAssumption = {
    representativeChangesPerMonth: 40,
    source: "Synthetic in-memory validator self-test; not participant data."
  };
  for (const run of completePilot.runs) {
    const assisted = run.mode === "INTELLILOOP_ASSISTED";
    run.phaseMinutes = assisted
      ? { contextGathering: 10, impactAnalysis: 8, evidenceChecking: 6, releasePreparation: 4 }
      : { contextGathering: 20, impactAnalysis: 16, evidenceChecking: 12, releasePreparation: 8 };
    run.observations = { validImpactPaths: 2, invalidCitations: 0, falseReady: 0, passportMismatch: 0 };
    if (assisted) {
      run.feedback = {
        usefulnessRating: 4,
        trustClarityRating: 5,
        wouldUseInPilot: true,
        sanitizedNote: "Synthetic in-memory validator self-test only."
      };
    }
  }

  const summary = pilotSummary(completePilot);
  assert(summary.status === "COMPLETE" && summary.completeRunCount === 6, "Complete-pilot self-test did not close all runs.");
  assert(summary.monthlyTeamHoursSaved === 18.667, "Complete-pilot calculation self-test drifted.");
  assert(summary.aggregateQualityObservations.invalidCitations === 0 && summary.aggregateFeedback.responseCount === 3, "Complete-pilot aggregation self-test drifted.");

  const invalidPilot = structuredClone(completePilot);
  invalidPilot.runs[0].phaseMinutes.contextGathering = -1;
  let rejectedInvalid = false;
  try {
    pilotSummary(invalidPilot);
  } catch (error) {
    rejectedInvalid = String(error.message).includes("phaseMinutes.contextGathering is invalid");
  }
  assert(rejectedInvalid, "Negative timing was not rejected by the pilot validator.");

  const incompletePilot = structuredClone(completePilot);
  incompletePilot.runs[0].observations.invalidCitations = null;
  let rejectedFalseComplete = false;
  try {
    pilotSummary(incompletePilot);
  } catch (error) {
    rejectedFalseComplete = String(error.message).includes("incomplete pilot must remain NOT_RUN");
  }
  assert(rejectedFalseComplete, "An incomplete pilot marked COMPLETE was not rejected.");

  console.log("PILOT-MEASUREMENT SELF-TEST PASS complete-calculation=PASS invalid-input=REJECTED false-complete=REJECTED synthetic-memory-only=true");
}

assert(Number(REFRESH) + Number(VERIFY) + Number(SELF_TEST) === 1, "Use exactly one of --refresh, --verify-existing or --self-test.");
if (SELF_TEST) {
  await runPilotSelfTest();
} else {
  const current = await buildEvidence();
  if (REFRESH) {
    await writeFile(OUTPUT, `${JSON.stringify(current, null, 2)}\n`, "utf8");
    console.log(`EV-METRICS ${current.status} truth=${current.measuredPrototypeBehavior.reconciliationTruthCases.passed}/${current.measuredPrototypeBehavior.reconciliationTruthCases.total} pilot=${current.humanPilot.status}`);
  } else {
    const stored = JSON.parse(await readFile(OUTPUT, "utf8"));
    assert(JSON.stringify(stored) === JSON.stringify(current), "EV-METRICS is stale or inconsistent with its source evidence/pilot input.");
    console.log(`EV-METRICS PASS verify-existing pilot=${stored.humanPilot.status}`);
  }
}
