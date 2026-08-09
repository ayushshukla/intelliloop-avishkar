import { appendFileSync, lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, parse, resolve, sep } from "node:path";

if (process.platform !== "win32") {
  throw new Error("Windows CI temporary-root canonicalization must run on Windows.");
}

const githubEnvironmentFile = process.env.GITHUB_ENV;
if (githubEnvironmentFile === undefined || !isAbsolute(githubEnvironmentFile)) {
  throw new Error("GITHUB_ENV must identify the GitHub Actions environment file.");
}

const configuredRoot = resolve(tmpdir());
const canonicalRoot = realpathSync.native(configuredRoot);
const normalizedConfigured = configuredRoot.toLowerCase();
const normalizedCanonical = canonicalRoot.toLowerCase();
const aliasDetected = normalizedConfigured !== normalizedCanonical;
const caseOnly = !aliasDetected && configuredRoot !== canonicalRoot;
const driveChanged = parse(configuredRoot).root.toLowerCase() !== parse(canonicalRoot).root.toLowerCase();
const componentCountChanged = configuredRoot.split(sep).length !== canonicalRoot.split(sep).length;
const leafIsLink = lstatSync(configuredRoot).isSymbolicLink();
const aliasClass = !aliasDetected
  ? caseOnly ? "CASE_ONLY" : "NONE"
  : driveChanged
    ? "DRIVE_ALIAS"
    : componentCountChanged
      ? "PATH_COMPONENT_ALIAS"
      : "FILESYSTEM_ALIAS";

appendFileSync(
  githubEnvironmentFile,
  `TEMP=${canonicalRoot}\nTMP=${canonicalRoot}\n`,
  "utf8"
);

console.log([
  "WINDOWS_TEMP_CANONICALIZATION",
  `aliasDetected=${String(aliasDetected)}`,
  `aliasClass=${aliasClass}`,
  `caseOnly=${String(caseOnly)}`,
  `driveChanged=${String(driveChanged)}`,
  `componentCountChanged=${String(componentCountChanged)}`,
  `leafIsLink=${String(leafIsLink)}`
].join(" "));
