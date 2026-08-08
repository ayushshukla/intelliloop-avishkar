import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const files = Object.freeze({
  guide: "docs/product/READINESS_AND_PASSPORT_GUIDE.md",
  architecture: "docs/architecture/ARCHITECTURE.md",
  domain: "docs/architecture/DOMAIN_MODEL.md",
  data: "docs/architecture/DATA_AND_MIGRATIONS.md",
  api: "docs/api/API_REFERENCE.md",
  user: "docs/product/USER_GUIDE.md",
  trust: "docs/product/TRUST_MODEL.md",
  setup: "docs/development/SETUP.md",
  testing: "docs/development/TESTING.md",
  security: "docs/security/SECURITY_AND_PRIVACY.md"
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const documents = Object.fromEntries(
  Object.entries(files).map(([name, path]) => [name, readFileSync(join(ROOT, path), "utf8")])
);

for (const status of ["`BLOCKED`", "`READY`", "`STALE`"]) {
  assert(documents.guide.includes(status), `Readiness guide is missing ${status}.`);
}
for (const obligation of [
  "INTEGRITY_VALID", "SCOPE_EXACT", "SNAPSHOT_CURRENT", "CRITICAL_FINDINGS_CLEAR",
  "REQUIRED_VALIDATIONS_PASS", "EXPLICIT_HUMAN_REVIEW", "DEPENDENCIES_CURRENT",
  "CANONICAL_INPUTS_ONLY", "INPUTS_PERSISTED"
]) assert(documents.guide.includes(obligation), `Readiness guide is missing ${obligation}.`);

for (const boundary of [
  'readinessRecomputed: false', 'signed: false', 'releaseApproval: false',
  'deploymentAuthority: false', 'aiAuthority: "NONE"'
]) assert(documents.guide.includes(boundary), `Readiness guide is missing ${boundary}.`);

assert(
  documents.guide.includes("evaluatedStatus") && documents.guide.includes("currentStatus") &&
    documents.guide.includes("storedAssessmentChanged"),
  "Historical staleness semantics are incomplete."
);
assert(
  documents.guide.includes("npm.cmd run evidence:readiness-passport"),
  "The focused reproduction command is undocumented."
);
assert(documents.setup.includes("migrations `001`-`014`"), "Setup does not name the current migration range.");
assert(!documents.setup.includes("migrations `001`-`012` before listening"), "Setup has a stale migration range.");
assert(documents.data.includes("schema is migration `014`"), "Data documentation omits the current schema version.");
assert(documents.guide.includes("fixture/reset workflow is implemented only"), "Readiness guide omits the bounded implemented demo distinction.");
assert(documents.setup.includes("evidence:readiness-passport"), "Setup omits the proof command.");
assert(documents.api.includes("EV_READINESS.json") && documents.api.includes("EV_PASSPORT.json"),
  "API reference omits the generated proof.");
assert(documents.domain.includes("READINESS_AND_PASSPORT_GUIDE.md"),
  "Domain model does not route operators to the canonical guide.");
assert(documents.testing.includes("zero false `READY`"),
  "Testing strategy omits the zero-false-READY conclusion.");
assert(documents.security.includes("verification tooling, not product attack surface"),
  "Security review omits the proof-tool boundary.");

for (const [name, document] of Object.entries(documents)) {
  assert(
    !document.includes("`IL-7.5` owns full integration"),
    `${name} still describes completed IL-7.5 proof as future work.`
  );
  assert(
    !/guarantees? (?:a )?(?:safe|secure|successful) (?:release|deployment)/iu.test(document),
    `${name} contains a prohibited safety/deployment guarantee.`
  );
}

console.log("Readiness/Passport documentation: PASS; contracts, staleness, authority, evidence and operator guidance are aligned.");
