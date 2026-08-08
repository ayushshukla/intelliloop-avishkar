import type { ReactNode } from "react";

export const PRODUCT_TERMS = {
  project: "Project",
  changeMission: "Work Item",
  missionId: "Work Item Key",
  missionType: "Work Item Type",
  evidence: "Linked Evidence",
  activeSoftwareTwin: "Impact Map",
  reconciliation: "Resolve Conflicts",
  findings: "Risks & Checks",
  readiness: "Release Check",
  releasePassport: "Release Evidence Report",
  repositorySnapshot: "Analyzed Commit",
  canonicalClaim: "Accepted Decision",
  unsupportedClaim: "Missing Evidence"
} as const;

export type ReleaseCheckTone = "neutral" | "danger" | "success" | "warning" | "unknown";

export interface PresentedValue<T = unknown> {
  readonly raw: T;
  readonly label: string;
  readonly tone: ReleaseCheckTone;
  readonly accessibleDescription: string;
  readonly explanation: string;
}

const RELEASE_CHECK_PRESENTATION = {
  BLOCKED: {
    label: "Not Ready",
    tone: "danger",
    accessibleDescription: "Release Check: Not Ready.",
    explanation: "One or more required deterministic checks did not pass."
  },
  READY: {
    label: "Ready",
    tone: "success",
    accessibleDescription: "Release Check: Ready for the analyzed inputs; this is not release approval.",
    explanation: "All required deterministic checks passed for the exact stored inputs. This is not release approval."
  },
  STALE: {
    label: "Recheck Needed",
    tone: "warning",
    accessibleDescription: "Release Check: Recheck Needed because an exact dependency changed.",
    explanation: "An exact dependency changed after assessment. The historical result is unchanged; run a new check."
  }
} as const;

export function presentReleaseCheck(raw: unknown): PresentedValue<unknown> {
  if (raw === undefined || raw === null || raw === "") {
    return {
      raw,
      label: "Not Checked",
      tone: "neutral",
      accessibleDescription: "Release Check: Not Checked.",
      explanation: "No stored deterministic assessment is available for this Work Item."
    };
  }
  if (typeof raw === "string" && raw in RELEASE_CHECK_PRESENTATION) {
    return { raw, ...RELEASE_CHECK_PRESENTATION[raw as keyof typeof RELEASE_CHECK_PRESENTATION] };
  }
  return {
    raw,
    label: "Status unavailable",
    tone: "unknown",
    accessibleDescription: "Release Check status is unavailable because its value is not recognized.",
    explanation: "The stored value is not recognized by this interface. No release result is inferred."
  };
}

const WORKFLOW_PRESENTATION = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done"
} as const;

export function presentWorkflowStatus(raw: unknown): PresentedValue<unknown> {
  if (raw === undefined || raw === null || raw === "") {
    return {
      raw,
      label: "Not tracked",
      tone: "neutral",
      accessibleDescription: "Workflow Status: Not tracked.",
      explanation: "No authoritative work-management workflow status is stored for this Work Item."
    };
  }
  if (typeof raw === "string" && raw in WORKFLOW_PRESENTATION) {
    const label = WORKFLOW_PRESENTATION[raw as keyof typeof WORKFLOW_PRESENTATION];
    return {
      raw,
      label,
      tone: "neutral",
      accessibleDescription: `Workflow Status: ${label}.`,
      explanation: "This describes work progression, not release safety."
    };
  }
  return {
    raw,
    label: "Not available",
    tone: "unknown",
    accessibleDescription: "Workflow Status is unavailable because its value is not recognized.",
    explanation: "No workflow status is inferred from this value."
  };
}

const PROVENANCE_PRESENTATION = {
  SYSTEM_DERIVATION: {
    label: "IntelliLoop Native",
    explanation: "Derived by IntelliLoop from cited, stored inputs."
  },
  SYNTHETIC_FIXTURE: {
    label: "Built-in Baseline",
    explanation: "Supplied by IntelliLoop's clearly identified synthetic baseline."
  },
  USER_INPUT: {
    label: "External Evidence",
    explanation: "Supplied by a user; IntelliLoop preserves the declared origin."
  },
  REPOSITORY_OBSERVATION: {
    label: "External Evidence",
    explanation: "Observed from the registered repository; IntelliLoop does not claim authorship of the source."
  },
  VALIDATION_RESULT: {
    label: "External Evidence",
    explanation: "Produced by a validation source outside IntelliLoop and retained with its declared origin."
  },
  AI_ADVISORY: {
    label: "External Evidence",
    explanation: "Advisory output from an external provider; it has no decision authority."
  }
} as const;

export function presentProvenance(raw: unknown): PresentedValue<unknown> {
  if (typeof raw === "string" && raw in PROVENANCE_PRESENTATION) {
    const value = PROVENANCE_PRESENTATION[raw as keyof typeof PROVENANCE_PRESENTATION];
    return {
      raw,
      label: value.label,
      tone: value.label === "IntelliLoop Native" ? "success" : value.label === "Built-in Baseline" ? "warning" : "neutral",
      accessibleDescription: `Provenance: ${value.label}. ${value.explanation}`,
      explanation: value.explanation
    };
  }
  return {
    raw,
    label: "Provenance unavailable",
    tone: "unknown",
    accessibleDescription: "Provenance is unavailable because the origin is not recognized.",
    explanation: "IntelliLoop makes no provenance claim for an unknown origin."
  };
}

export function OptionalMetadata({
  value,
  fallback = "Not specified"
}: {
  readonly value?: ReactNode | null;
  readonly fallback?: "Not specified" | "Not available";
}): JSX.Element {
  return <>{value === undefined || value === null || value === "" ? fallback : value}</>;
}

export function ReleaseCheckBadge({ status }: { readonly status?: unknown }): JSX.Element {
  const presented = presentReleaseCheck(status);
  return (
    <span
      className={`semantic-badge semantic-badge--release semantic-badge--${presented.tone}`}
      aria-label={presented.accessibleDescription}
      title={presented.explanation}
      data-release-check={typeof presented.raw === "string" ? presented.raw : "NOT_CHECKED"}
    >
      <span className="semantic-badge__mark" aria-hidden="true" />
      {presented.label}
    </span>
  );
}

export function WorkflowStatusBadge({ status }: { readonly status?: unknown }): JSX.Element {
  const presented = presentWorkflowStatus(status);
  return (
    <span
      className={`semantic-badge semantic-badge--workflow semantic-badge--${presented.tone}`}
      aria-label={presented.accessibleDescription}
      title={presented.explanation}
      data-workflow-status={typeof presented.raw === "string" ? presented.raw : "NOT_TRACKED"}
    >
      <span className="semantic-badge__mark" aria-hidden="true" />
      {presented.label}
    </span>
  );
}

export function ProvenanceBadge({ origin }: { readonly origin: unknown }): JSX.Element {
  const presented = presentProvenance(origin);
  return (
    <span
      className={`semantic-badge semantic-badge--provenance semantic-badge--${presented.tone}`}
      aria-label={presented.accessibleDescription}
      title={presented.explanation}
      data-provenance-origin={typeof presented.raw === "string" ? presented.raw : "UNKNOWN"}
    >
      {presented.label}
    </span>
  );
}
