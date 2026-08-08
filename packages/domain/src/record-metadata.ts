export const ORIGIN_KINDS = [
  "USER_INPUT",
  "REPOSITORY_OBSERVATION",
  "VALIDATION_RESULT",
  "SYSTEM_DERIVATION",
  "SYNTHETIC_FIXTURE",
  "AI_ADVISORY"
] as const;

export const EPISTEMIC_LABELS = ["FACT", "INFERENCE"] as const;

export type OriginKind = (typeof ORIGIN_KINDS)[number];
export type EpistemicLabel = (typeof EPISTEMIC_LABELS)[number];

export function isOriginKind(value: unknown): value is OriginKind {
  return ORIGIN_KINDS.some((kind) => kind === value);
}

export function isEpistemicLabel(value: unknown): value is EpistemicLabel {
  return EPISTEMIC_LABELS.some((label) => label === value);
}
