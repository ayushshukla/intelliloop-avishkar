export interface WebFeatureFlags {
  readonly evidenceReplay: boolean;
  readonly agentDisagreement: boolean;
  readonly remediationPreview: boolean;
}

const EVIDENCE_REPLAY_KEY = "VITE_INTELLILOOP_EXPERIMENT_EVIDENCE_REPLAY";
const AGENT_DISAGREEMENT_KEY =
  "VITE_INTELLILOOP_EXPERIMENT_AGENT_DISAGREEMENT";
const REMEDIATION_PREVIEW_KEY =
  "VITE_INTELLILOOP_EXPERIMENT_REMEDIATION_PREVIEW";

function parseBooleanFlag(
  environment: Readonly<Record<string, string | boolean | undefined>>,
  key: string
): boolean {
  const rawValue = environment[key];
  const value = rawValue === undefined ? "false" : String(rawValue).trim();
  if (value !== "true" && value !== "false") {
    throw new Error(`${key} must be exactly true or false.`);
  }
  return value === "true";
}

export function parseWebFeatureFlags(
  environment: Readonly<Record<string, string | boolean | undefined>>
): WebFeatureFlags {
  return Object.freeze({
    evidenceReplay: parseBooleanFlag(environment, EVIDENCE_REPLAY_KEY),
    agentDisagreement: parseBooleanFlag(environment, AGENT_DISAGREEMENT_KEY),
    remediationPreview: parseBooleanFlag(environment, REMEDIATION_PREVIEW_KEY)
  });
}

export const WEB_FEATURE_FLAGS = parseWebFeatureFlags(import.meta.env);
