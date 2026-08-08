import type {
  TwinNodeResource,
  TwinRelationshipResource,
  TwinRevisionSummaryResource
} from "@intelliloop/contracts";

export type ReplayMemberKind = "NODE" | "RELATIONSHIP";
export type ReplayChangeKind = "ADDED" | "REMOVED" | "CHANGED";

export interface ReplayMemberSnapshot {
  readonly memberKind: ReplayMemberKind;
  readonly memberId: string;
  readonly label: string;
  readonly memberDigest: string;
  readonly pathCitation: string;
}

export interface ReplayDifference {
  readonly change: ReplayChangeKind;
  readonly memberKind: ReplayMemberKind;
  readonly memberId: string;
  readonly baseline?: ReplayMemberSnapshot;
  readonly candidate?: ReplayMemberSnapshot;
}

export interface EvidenceReplayComparison {
  readonly version: "evidence-replay.v1";
  readonly baseline: TwinRevisionSummaryResource;
  readonly candidate: TwinRevisionSummaryResource;
  readonly differences: readonly ReplayDifference[];
  readonly unchangedMemberCount: number;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly changedCount: number;
}

export interface EvidenceReplayInput {
  readonly baseline: {
    readonly revision: TwinRevisionSummaryResource;
    readonly nodes: readonly TwinNodeResource[];
    readonly relationships: readonly TwinRelationshipResource[];
  };
  readonly candidate: {
    readonly revision: TwinRevisionSummaryResource;
    readonly nodes: readonly TwinNodeResource[];
    readonly relationships: readonly TwinRelationshipResource[];
  };
}

function nodeSnapshot(node: TwinNodeResource): ReplayMemberSnapshot {
  return {
    memberKind: "NODE",
    memberId: node.nodeId,
    label: node.nodeType,
    memberDigest: node.memberDigest,
    pathCitation: node.attribution.pathCitation
  };
}

function relationshipSnapshot(
  relationship: TwinRelationshipResource
): ReplayMemberSnapshot {
  return {
    memberKind: "RELATIONSHIP",
    memberId: relationship.relationshipId,
    label: relationship.relationshipType,
    memberDigest: relationship.memberDigest,
    pathCitation: relationship.attribution.pathCitation
  };
}

function memberMap(
  nodes: readonly TwinNodeResource[],
  relationships: readonly TwinRelationshipResource[]
): ReadonlyMap<string, ReplayMemberSnapshot> {
  const result = new Map<string, ReplayMemberSnapshot>();
  for (const member of [
    ...nodes.map(nodeSnapshot),
    ...relationships.map(relationshipSnapshot)
  ]) {
    const key = `${member.memberKind}:${member.memberId}`;
    if (result.has(key)) {
      throw new TypeError("Evidence Replay input contains a duplicate Twin member.");
    }
    if (member.pathCitation.trim().length === 0) {
      throw new TypeError("Evidence Replay input contains an unresolved path citation.");
    }
    result.set(key, member);
  }
  return result;
}

export function compareTwinRevisions(
  input: EvidenceReplayInput
): EvidenceReplayComparison {
  if (
    input.baseline.revision.missionId !== input.candidate.revision.missionId ||
    input.baseline.revision.projectId !== input.candidate.revision.projectId ||
    input.baseline.revision.revision === input.candidate.revision.revision
  ) {
    throw new TypeError("Evidence Replay requires two different revisions in one Mission.");
  }

  const baseline = memberMap(
    input.baseline.nodes,
    input.baseline.relationships
  );
  const candidate = memberMap(
    input.candidate.nodes,
    input.candidate.relationships
  );
  const keys = [...new Set([...baseline.keys(), ...candidate.keys()])].sort();
  const differences: ReplayDifference[] = [];
  let unchangedMemberCount = 0;

  for (const key of keys) {
    const before = baseline.get(key);
    const after = candidate.get(key);
    if (before === undefined && after !== undefined) {
      differences.push({
        change: "ADDED",
        memberKind: after.memberKind,
        memberId: after.memberId,
        candidate: after
      });
    } else if (before !== undefined && after === undefined) {
      differences.push({
        change: "REMOVED",
        memberKind: before.memberKind,
        memberId: before.memberId,
        baseline: before
      });
    } else if (before !== undefined && after !== undefined) {
      if (before.memberDigest === after.memberDigest) {
        unchangedMemberCount += 1;
      } else {
        differences.push({
          change: "CHANGED",
          memberKind: before.memberKind,
          memberId: before.memberId,
          baseline: before,
          candidate: after
        });
      }
    }
  }

  return {
    version: "evidence-replay.v1",
    baseline: input.baseline.revision,
    candidate: input.candidate.revision,
    differences,
    unchangedMemberCount,
    addedCount: differences.filter((difference) => difference.change === "ADDED").length,
    removedCount: differences.filter((difference) => difference.change === "REMOVED").length,
    changedCount: differences.filter((difference) => difference.change === "CHANGED").length
  };
}
