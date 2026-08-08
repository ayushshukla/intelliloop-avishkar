import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const paths = Object.freeze({
  safety: "docs/security/AI_SAFETY_AND_DATA_TRANSFER.md",
  disclosure: "docs/governance/AI_USE_DISCLOSURE.md",
  storyEvidence: "docs/evidence/IL_6_6_TEST_EVIDENCE.md",
  dossier: "docs/evidence/TEST_EVIDENCE.md",
  index: "docs/INDEX.md",
  checkpoint: "docs/evidence/EV_OPENAI_EVAL.json",
  backlog:
    "planning/r3-implementation-backlog-2026-08-03/implementation-backlog.json"
});

function readText(path) {
  return readFileSync(join(workspaceRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireSnippets(path, content, snippets) {
  for (const snippet of snippets) {
    assert(content.includes(snippet), `${path} is missing required text: ${snippet}`);
  }
}

const safety = readText(paths.safety);
const disclosure = readText(paths.disclosure);
const storyEvidence = readText(paths.storyEvidence);
const dossier = readText(paths.dossier);
const index = readText(paths.index);
const checkpointReport = readJson(paths.checkpoint);
const backlog = readJson(paths.backlog);

assert(checkpointReport.status === "PASS", "EV-OPENAI-EVAL must pass.");
assert(
  checkpointReport.programGate?.status === "PASS_OFFLINE_DECISION",
  "G4 must retain its passing offline decision."
);
assert(
  checkpointReport.checkpoint?.runStatus === "NOT_RUN_NOT_AUTHORIZED",
  "The personal-provider run status must remain explicit."
);
assert(
  checkpointReport.checkpoint?.decision ===
    "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
  "The documented finale posture must use the frozen decision enum."
);
assert(
  checkpointReport.checkpoint?.baseline?.transferStatus === "NOT_SENT" &&
    checkpointReport.checkpoint?.authority?.externalCallMade === false,
  "The checkpoint must prove no external transfer."
);
assert(
  checkpointReport.integrity?.providerCredentialReadOrRecorded === false &&
    checkpointReport.integrity?.providerPromptOrResponseBodyRecorded === false &&
    checkpointReport.integrity?.exactPackBodyCopiedIntoReport === false,
  "The checkpoint report must exclude credentials and raw private bodies."
);

const checkpointDigest = checkpointReport.checkpoint?.checkpointDigest;
assert(
  typeof checkpointDigest === "string" && checkpointDigest.startsWith("sha256:"),
  "The checkpoint decision must have a canonical digest."
);

requireSnippets(paths.safety, safety, [
  "**Status:** `FINALIZED_IL_6_6`",
  "**Finale provider posture:** `OFFLINE`",
  "**Current outbound provider payloads:** `0`",
  "## Reviewer decision record",
  "## Data disposition and transfer inventory",
  "## Authority matrix",
  "## Course-correction governance",
  "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
  "NOT_RUN_NOT_AUTHORIZED",
  "NOT_SENT",
  "NOT_MEASURED",
  checkpointDigest
]);

requireSnippets(paths.disclosure, disclosure, [
  "**Status:** `FINALIZED_IL_6_6`",
  "## Three distinct AI contexts",
  "No personal OpenAI call was made",
  "KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE",
  "Product provider use: none"
]);

requireSnippets(paths.storyEvidence, storyEvidence, [
  "# IL-6.6 AI safety, transfer and course-correction documentation evidence",
  "**Status:** `PASS`",
  "check:ai-safety-docs",
  "IL-6.7"
]);
requireSnippets(paths.dossier, dossier, ["IL-6.6", "IL_6_6_TEST_EVIDENCE.md"]);
requireSnippets(paths.index, index, [
  "AI_SAFETY_DOCUMENTATION_FINALIZED",
  "IL_6_6_TEST_EVIDENCE.md"
]);

const storyOrder = backlog.stories?.map((story) => story.id) ?? [];
assert(
  storyOrder.indexOf(backlog.progress?.implementedThrough) >=
      storyOrder.indexOf("IL-6.6") &&
    backlog.progress?.completedStoryCount >= 39 &&
    backlog.progress?.remainingOptionalStoryCount >= 0 &&
    backlog.progress?.remainingOptionalStoryCount <= 3 &&
    typeof backlog.progress?.nextDependencyEligibleStory === "string" &&
    backlog.progress.nextDependencyEligibleStory === backlog.nextStory,
  "The implementation backlog no longer preserves the completed IL-6.6 checkpoint."
);

const sensitiveSurfaces = [
  [paths.safety, safety],
  [paths.disclosure, disclosure],
  [paths.storyEvidence, storyEvidence]
];
const credentialLike = /(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}/gu;
const privateAbsolutePath =
  /(?:[A-Za-z]:\\(?:Users|Documents|workspace)\\|\\\\[^\s\\]+\\[^\s\\]+|\/(?:home|Users)\/[^\s/]+)/gu;
const rawBodyMarkers = [/"normalizedContent"\s*:/gu, /"providerResponse"\s*:/gu];

for (const [path, content] of sensitiveSurfaces) {
  assert(!credentialLike.test(content), `${path} contains credential-like text.`);
  credentialLike.lastIndex = 0;
  assert(!privateAbsolutePath.test(content), `${path} contains a private absolute path.`);
  privateAbsolutePath.lastIndex = 0;
  for (const marker of rawBodyMarkers) {
    assert(!marker.test(content), `${path} contains a raw private-body marker.`);
    marker.lastIndex = 0;
  }
}

console.log(
  "AI safety documentation: PASS; offline finale posture, transfer inventory, authority limits, checkpoint evidence and sensitive-body guards verified."
);
