import type { FastifyInstance } from "fastify";

import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  RECONCILIATION_API_VERSION,
  toReconciliationRevisionSummaryResource,
  type ReconciliationFindingListResponse,
  type ReconciliationImpactPathListResponse,
  type ReconciliationRevisionListResponse,
  type ReconciliationRevisionResponse,
  type ReconciliationRunResponse,
  type RunReconciliationRequest
} from "@intelliloop/contracts";
import {
  MAXIMUM_IMPACT_BASIS_CITATIONS,
  MAXIMUM_IMPACT_REQUIREMENTS,
  MAXIMUM_IMPACT_ROOTS,
  MAXIMUM_IMPACT_TRAVERSAL_DEPTH,
  MAXIMUM_RECONCILIATION_DEPENDENCIES,
  MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS,
  parseSha256Digest,
  parseStableId,
  parseTwinRevision,
  type AnalyzeChangeImpactInput,
  type MissionId
} from "@intelliloop/domain";

import { API_ERROR_RESPONSE_SCHEMA, UUID_V4_SCHEMA } from "../http-schemas.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { SqliteReconciliationRepository } from "./reconciliation-repository.js";
import type { ReconciliationExecutionService } from "./reconciliation-service.js";

interface MissionParams {
  readonly missionId: string;
}

interface RevisionParams extends MissionParams {
  readonly revision: string;
}

interface RevisionPageQuery {
  readonly limit?: number;
  readonly cursor?: number;
}

interface MemberPageQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

const DIGEST_SCHEMA = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$"
} as const;

const IDENTIFIER_SCHEMA = {
  type: "string",
  minLength: 3,
  maxLength: 256,
  pattern:
    "^(?!.*//)(?!.*(?:^|/)\\.{1,2}(?:/|$))[a-z0-9][a-z0-9._:/-]*$"
} as const;

const missionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId"],
  properties: { missionId: UUID_V4_SCHEMA }
} as const;

const revisionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId", "revision"],
  properties: {
    missionId: UUID_V4_SCHEMA,
    revision: { type: "string", pattern: "^[1-9][0-9]{0,14}$" }
  }
} as const;

const revisionPageQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_PAGE_LIMIT,
      default: DEFAULT_PAGE_LIMIT
    },
    cursor: { type: "integer", minimum: 1 }
  }
} as const;

const memberPageQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAXIMUM_PAGE_LIMIT,
      default: DEFAULT_PAGE_LIMIT
    },
    cursor: DIGEST_SCHEMA
  }
} as const;

const evidenceRequirementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requirementId", "supportKind", "sourceLocator"],
  properties: {
    requirementId: IDENTIFIER_SCHEMA,
    supportKind: { const: "EVIDENCE_SOURCE" },
    sourceLocator: { type: "string", minLength: 1, maxLength: 512 }
  }
} as const;

const validationRequirementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requirementId", "supportKind", "validationKey"],
  properties: {
    requirementId: IDENTIFIER_SCHEMA,
    supportKind: { const: "VALIDATION_RESULT" },
    validationKey: IDENTIFIER_SCHEMA
  }
} as const;

const rootSchema = {
  type: "object",
  additionalProperties: false,
  required: ["rootId", "nodeId"],
  properties: {
    rootId: IDENTIFIER_SCHEMA,
    nodeId: UUID_V4_SCHEMA
  }
} as const;

const citationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "memberId", "revision", "digest"],
  properties: {
    kind: { enum: ["NODE", "RELATIONSHIP"] },
    memberId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    digest: DIGEST_SCHEMA
  }
} as const;

const implementationRequirementSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "requirementId",
    "rootId",
    "criticalAssetId",
    "supportKind",
    "basisCitations"
  ],
  properties: {
    requirementId: IDENTIFIER_SCHEMA,
    rootId: IDENTIFIER_SCHEMA,
    criticalAssetId: UUID_V4_SCHEMA,
    supportKind: { const: "IMPLEMENTATION" },
    basisCitations: {
      type: "array",
      minItems: 1,
      maxItems: MAXIMUM_IMPACT_BASIS_CITATIONS,
      items: citationSchema
    }
  }
} as const;

const validationImpactRequirementSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "requirementId",
    "rootId",
    "criticalAssetId",
    "supportKind",
    "validationKey",
    "basisCitations"
  ],
  properties: {
    requirementId: IDENTIFIER_SCHEMA,
    rootId: IDENTIFIER_SCHEMA,
    criticalAssetId: UUID_V4_SCHEMA,
    supportKind: { const: "VALIDATION" },
    validationKey: IDENTIFIER_SCHEMA,
    basisCitations: {
      type: "array",
      minItems: 1,
      maxItems: MAXIMUM_IMPACT_BASIS_CITATIONS,
      items: citationSchema
    }
  }
} as const;

const runRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "twinRevision",
    "codeMapRevision",
    "targetSnapshotId",
    "supportRequirements",
    "roots",
    "impactRequirements"
  ],
  properties: {
    twinRevision: { type: "integer", minimum: 1 },
    codeMapRevision: { type: "integer", minimum: 1 },
    targetSnapshotId: UUID_V4_SCHEMA,
    supportRequirements: {
      type: "array",
      maxItems: MAXIMUM_RECONCILIATION_SUPPORT_REQUIREMENTS,
      items: {
        oneOf: [evidenceRequirementSchema, validationRequirementSchema]
      }
    },
    roots: {
      type: "array",
      maxItems: MAXIMUM_IMPACT_ROOTS,
      items: rootSchema
    },
    impactRequirements: {
      type: "array",
      maxItems: MAXIMUM_IMPACT_REQUIREMENTS,
      items: {
        oneOf: [
          implementationRequirementSchema,
          validationImpactRequirementSchema
        ]
      }
    }
  }
} as const;

const bindingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["projectionId", "revision", "projectionDigest"],
  properties: {
    projectionId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    projectionDigest: DIGEST_SCHEMA
  }
} as const;

const codeMapBindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "projectionId",
    "revision",
    "projectionDigest",
    "evidenceKind",
    "inferenceStatus",
    "completeness"
  ],
  properties: {
    projectionId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    projectionDigest: DIGEST_SCHEMA,
    evidenceKind: {
      enum: ["STATIC_INFERENCE", "DECLARED_INTELLILOOP_FIXTURE"]
    },
    inferenceStatus: { enum: ["AVAILABLE", "UNAVAILABLE_SAFE_FAILURE"] },
    completeness: { enum: ["COMPLETE", "PARTIAL", "UNAVAILABLE"] }
  }
} as const;

const findingCountsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["CONFLICT", "AMBIGUOUS", "MISSING", "STALE", "IMPACT_GAP", "total"],
  properties: {
    CONFLICT: { type: "integer", minimum: 0 },
    AMBIGUOUS: { type: "integer", minimum: 0 },
    MISSING: { type: "integer", minimum: 0 },
    STALE: { type: "integer", minimum: 0 },
    IMPACT_GAP: { type: "integer", minimum: 0 },
    total: { type: "integer", minimum: 0 }
  }
} as const;

const revisionSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "revisionKey",
    "version",
    "projectId",
    "missionId",
    "revision",
    "inputDigest",
    "resultDigest",
    "twinBinding",
    "targetSnapshotId",
    "codeMapBinding",
    "reassessmentDigest",
    "impactDigest",
    "findingCounts",
    "impactPathCount"
  ],
  properties: {
    revisionKey: DIGEST_SCHEMA,
    version: { type: "string", minLength: 1, maxLength: 128 },
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    inputDigest: DIGEST_SCHEMA,
    resultDigest: DIGEST_SCHEMA,
    twinBinding: bindingSchema,
    targetSnapshotId: UUID_V4_SCHEMA,
    codeMapBinding: codeMapBindingSchema,
    reassessmentDigest: DIGEST_SCHEMA,
    impactDigest: DIGEST_SCHEMA,
    predecessor: {
      type: "object",
      additionalProperties: false,
      required: ["revision", "resultDigest"],
      properties: {
        revision: { type: "integer", minimum: 1 },
        resultDigest: DIGEST_SCHEMA
      }
    },
    findingCounts: findingCountsSchema,
    impactPathCount: { type: "integer", minimum: 0 }
  }
} as const;

const runResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "created", "reconciliationRevision"],
  properties: {
    apiVersion: { const: RECONCILIATION_API_VERSION },
    created: { type: "boolean" },
    reconciliationRevision: revisionSummarySchema
  }
} as const;

const revisionResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "reconciliationRevision"],
  properties: {
    apiVersion: { const: RECONCILIATION_API_VERSION },
    reconciliationRevision: revisionSummarySchema
  }
} as const;

const revisionListResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "missionId", "revisions", "page"],
  properties: {
    apiVersion: { const: RECONCILIATION_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    revisions: { type: "array", items: revisionSummarySchema },
    page: {
      type: "object",
      additionalProperties: false,
      required: ["limit", "nextCursor"],
      properties: {
        limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
        nextCursor: {
          anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }]
        }
      }
    }
  }
} as const;

const sourceRevisionValueSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "value"],
      properties: {
        kind: { const: "SOURCE_REVISION" },
        value: { type: "string", minLength: 1, maxLength: 256 }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "value"],
      properties: {
        kind: { const: "CONTENT_DIGEST" },
        value: DIGEST_SCHEMA
      }
    }
  ]
} as const;

const impactMemberCitationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "memberId",
    "revision",
    "digest",
    "sourceReference",
    "sourceRevisionOrDigest",
    "origin",
    "extractionMethod",
    "epistemicLabel"
  ],
  properties: {
    kind: { enum: ["NODE", "RELATIONSHIP"] },
    memberId: UUID_V4_SCHEMA,
    revision: { type: "integer", minimum: 1 },
    digest: DIGEST_SCHEMA,
    sourceReference: { type: "string", minLength: 1, maxLength: 2048 },
    sourceRevisionOrDigest: sourceRevisionValueSchema,
    origin: {
      enum: [
        "USER_INPUT",
        "REPOSITORY_OBSERVATION",
        "VALIDATION_RESULT",
        "SYSTEM_DERIVATION",
        "SYNTHETIC_FIXTURE",
      ]
    },
    extractionMethod: { type: "string", minLength: 1, maxLength: 256 },
    epistemicLabel: { enum: ["FACT", "INFERENCE"] }
  }
} as const;

const impactRequirementResourceSchema = {
  oneOf: [implementationRequirementSchema, validationImpactRequirementSchema]
} as const;

const impactPathStepSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "stepIndex",
    "direction",
    "relationshipType",
    "from",
    "relationship",
    "to"
  ],
  properties: {
    stepIndex: { type: "integer", minimum: 0 },
    direction: { enum: ["FORWARD", "REVERSE"] },
    relationshipType: {
      enum: ["AFFECTS", "DEPENDS_ON", "IMPLEMENTS", "VALIDATED_BY"]
    },
    from: impactMemberCitationSchema,
    relationship: impactMemberCitationSchema,
    to: impactMemberCitationSchema
  }
} as const;

const impactPathSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "pathKeyVersion",
    "pathDigestVersion",
    "pathKey",
    "pathDigest",
    "rootId",
    "requirementId",
    "supportKind",
    "root",
    "criticalAsset",
    "depth",
    "steps"
  ],
  properties: {
    pathKeyVersion: { const: "impact-path-key.v1" },
    pathDigestVersion: { const: "impact-path-digest.v1" },
    pathKey: DIGEST_SCHEMA,
    pathDigest: DIGEST_SCHEMA,
    rootId: IDENTIFIER_SCHEMA,
    requirementId: IDENTIFIER_SCHEMA,
    supportKind: { enum: ["IMPLEMENTATION", "VALIDATION"] },
    root: impactMemberCitationSchema,
    criticalAsset: impactMemberCitationSchema,
    terminalValidation: impactMemberCitationSchema,
    validationStatus: { enum: ["PASSED", "FAILED", "INCONCLUSIVE"] },
    depth: {
      type: "integer",
      minimum: 0,
      maximum: MAXIMUM_IMPACT_TRAVERSAL_DEPTH
    },
    steps: {
      type: "array",
      maxItems: MAXIMUM_IMPACT_TRAVERSAL_DEPTH,
      items: impactPathStepSchema
    }
  }
} as const;

const claimFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "entityType",
    "findingKeyVersion",
    "findingKey",
    "findingKind",
    "status",
    "projectId",
    "missionId",
    "claimIds",
    "claimDigests",
    "comparisonKey",
    "reason",
    "comparisonRuleSetVersion",
    "comparisonRuleSetDigest",
    "decisionPolicyVersion",
    "decisionPolicyDigest"
  ],
  properties: {
    entityType: { const: "ReconciliationFinding" },
    findingKeyVersion: { const: "reconciliation-finding-key.v1" },
    findingKey: DIGEST_SCHEMA,
    findingKind: { enum: ["CONFLICT", "AMBIGUOUS"] },
    status: { const: "OPEN" },
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    claimIds: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: UUID_V4_SCHEMA
    },
    claimDigests: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: DIGEST_SCHEMA
    },
    comparisonKey: DIGEST_SCHEMA,
    reason: {
      enum: [
        "CANONICAL_VALUES_EQUAL",
        "SCALAR_VALUES_DIFFER",
        "UNKNOWN_VALUE_PRESENT",
        "VALUE_TYPES_DIFFER_NO_COERCION",
        "STRUCTURED_VALUE_POLICY_REQUIRED",
        "MISSION_SCOPE_DIFFERS",
        "SUBJECT_OR_PREDICATE_DIFFERS",
        "COMPARISON_KEY_DIFFERS",
        "APPLICABILITY_DISJOINT"
      ]
    },
    comparisonRuleSetVersion: { type: "string", minLength: 1, maxLength: 128 },
    comparisonRuleSetDigest: DIGEST_SCHEMA,
    decisionPolicyVersion: { type: "string", minLength: 1, maxLength: 128 },
    decisionPolicyDigest: DIGEST_SCHEMA
  }
} as const;

const missingFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "entityType",
    "findingKind",
    "status",
    "findingKeyVersion",
    "findingKey",
    "projectId",
    "missionId",
    "requirement",
    "reason",
    "targetSnapshotId",
    "requirementsDigest",
    "supportPolicyVersion",
    "supportPolicyDigest"
  ],
  properties: {
    entityType: { const: "ReconciliationFinding" },
    findingKind: { const: "MISSING" },
    status: { const: "OPEN" },
    findingKeyVersion: { const: "reconciliation-missing-finding-key.v1" },
    findingKey: DIGEST_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    requirement: {
      oneOf: [evidenceRequirementSchema, validationRequirementSchema]
    },
    reason: {
      enum: [
        "REQUIRED_EVIDENCE_ABSENT",
        "REQUIRED_VALIDATION_ABSENT_FOR_SNAPSHOT"
      ]
    },
    targetSnapshotId: UUID_V4_SCHEMA,
    requirementsDigest: DIGEST_SCHEMA,
    supportPolicyVersion: { type: "string", minLength: 1, maxLength: 128 },
    supportPolicyDigest: DIGEST_SCHEMA
  }
} as const;

const dependencyChangeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["changeType", "dependencyKind", "dependencyKey"],
  properties: {
    changeType: { enum: ["ADDED", "CHANGED", "REMOVED"] },
    dependencyKind: {
      enum: [
        "SOURCE",
        "SNAPSHOT",
        "RELATIONSHIP",
        "VALIDATION",
        "RULE_SET",
        "DECISION_POLICY",
        "REQUIREMENT_SET",
        "CLAIM_RECONCILIATION"
      ]
    },
    dependencyKey: { type: "string", minLength: 1, maxLength: 1024 },
    beforeDigest: DIGEST_SCHEMA,
    afterDigest: DIGEST_SCHEMA
  }
} as const;

const staleFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "entityType",
    "findingKind",
    "status",
    "findingKeyVersion",
    "findingKey",
    "projectId",
    "missionId",
    "predecessorRevision",
    "predecessorDigest",
    "dependencyChanges",
    "reason"
  ],
  properties: {
    entityType: { const: "ReconciliationFinding" },
    findingKind: { const: "STALE" },
    status: { const: "OPEN" },
    findingKeyVersion: { const: "reconciliation-stale-finding-key.v1" },
    findingKey: DIGEST_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    predecessorRevision: { type: "integer", minimum: 1 },
    predecessorDigest: DIGEST_SCHEMA,
    dependencyChanges: {
      type: "array",
      minItems: 1,
      maxItems: MAXIMUM_RECONCILIATION_DEPENDENCIES,
      items: dependencyChangeSchema
    },
    reason: { const: "EXACT_DEPENDENCY_CHANGED" }
  }
} as const;

const impactGapFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "entityType",
    "findingKind",
    "status",
    "findingKeyVersion",
    "findingKey",
    "projectId",
    "missionId",
    "requirement",
    "reason",
    "basisCitations",
    "targetSnapshotId",
    "traversalPolicyVersion",
    "traversalPolicyDigest",
    "requirementsDigest"
  ],
  properties: {
    entityType: { const: "ReconciliationFinding" },
    findingKind: { const: "IMPACT_GAP" },
    status: { const: "OPEN" },
    findingKeyVersion: { const: "impact-gap-finding-key.v1" },
    findingKey: DIGEST_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    requirement: impactRequirementResourceSchema,
    reason: {
      enum: [
        "CRITICAL_IMPLEMENTATION_ASSET_ABSENT",
        "CRITICAL_IMPLEMENTATION_PATH_ABSENT",
        "REQUIRED_VALIDATION_RESULT_ABSENT",
        "REQUIRED_VALIDATION_PATH_ABSENT",
        "IMPLEMENTATION_SUPPORT_UNAVAILABLE"
      ]
    },
    criticalAsset: impactMemberCitationSchema,
    supportingPathKey: DIGEST_SCHEMA,
    basisCitations: {
      type: "array",
      minItems: 1,
      maxItems: MAXIMUM_IMPACT_BASIS_CITATIONS,
      items: citationSchema
    },
    targetSnapshotId: UUID_V4_SCHEMA,
    traversalPolicyVersion: { type: "string", minLength: 1, maxLength: 128 },
    traversalPolicyDigest: DIGEST_SCHEMA,
    requirementsDigest: DIGEST_SCHEMA
  }
} as const;

const findingSchema = {
  oneOf: [
    claimFindingSchema,
    missingFindingSchema,
    staleFindingSchema,
    impactGapFindingSchema
  ]
} as const;

function memberListResponseSchema(memberName: "findings" | "impactPaths") {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "apiVersion",
      "missionId",
      "reconciliationRevision",
      memberName,
      "page"
    ],
    properties: {
      apiVersion: { const: RECONCILIATION_API_VERSION },
      missionId: UUID_V4_SCHEMA,
      reconciliationRevision: { type: "integer", minimum: 1 },
      [memberName]: {
        type: "array",
        items: memberName === "findings" ? findingSchema : impactPathSchema
      },
      page: {
        type: "object",
        additionalProperties: false,
        required: ["limit", "nextCursor"],
        properties: {
          limit: { type: "integer", minimum: 1, maximum: MAXIMUM_PAGE_LIMIT },
          nextCursor: { anyOf: [DIGEST_SCHEMA, { type: "null" }] }
        }
      }
    }
  } as const;
}

const errorResponses = {
  400: API_ERROR_RESPONSE_SCHEMA,
  404: API_ERROR_RESPONSE_SCHEMA,
  409: API_ERROR_RESPONSE_SCHEMA,
  500: API_ERROR_RESPONSE_SCHEMA
} as const;

function missionScope(
  projects: SqliteProjectRepository,
  missionValue: string
): { readonly projectId: ReturnType<typeof parseStableId<"PROJECT">>; readonly missionId: MissionId } {
  const missionId = parseStableId<"MISSION">(missionValue);
  const mission = projects.getMission(missionId);
  return { projectId: mission.projectId, missionId };
}

function revisionValue(value: string): number {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    const error = new Error("Invalid reconciliation revision.") as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }
  return revision;
}

function impactInputs(body: RunReconciliationRequest): Pick<
  AnalyzeChangeImpactInput,
  "roots" | "requirements"
> {
  return {
    roots: Object.freeze(
      body.roots.map((root) =>
        Object.freeze({
          rootId: root.rootId,
          nodeId: parseStableId<"TWIN_NODE">(root.nodeId)
        })
      )
    ),
    requirements: Object.freeze(
      body.impactRequirements.map((requirement) =>
        Object.freeze({
          requirementId: requirement.requirementId,
          rootId: requirement.rootId,
          criticalAssetId: parseStableId<"CODE_MAP_ASSET">(
            requirement.criticalAssetId
          ),
          supportKind: requirement.supportKind,
          ...(requirement.validationKey === undefined
            ? {}
            : { validationKey: requirement.validationKey }),
          basisCitations: Object.freeze(
            requirement.basisCitations.map((citation) =>
              Object.freeze({
                kind: citation.kind,
                memberId:
                  citation.kind === "NODE"
                    ? parseStableId<"TWIN_NODE">(citation.memberId)
                    : parseStableId<"TWIN_RELATIONSHIP">(citation.memberId),
                revision: parseTwinRevision(citation.revision),
                digest: parseSha256Digest(citation.digest)
              })
            )
          )
        })
      )
    )
  };
}

export function registerReconciliationRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  reconciliations: SqliteReconciliationRepository,
  executor: ReconciliationExecutionService
): void {
  app.post<{
    Params: MissionParams;
    Body: RunReconciliationRequest;
    Reply: ReconciliationRunResponse;
  }>(
    "/api/v1/missions/:missionId/reconciliation/revisions",
    {
      schema: {
        params: missionParamsSchema,
        body: runRequestSchema,
        response: {
          200: runResponseSchema,
          201: runResponseSchema,
          ...errorResponses
        }
      }
    },
    async (request, reply) => {
      const scope = missionScope(projects, request.params.missionId);
      const impact = impactInputs(request.body);
      const result = await executor.execute(scope.projectId, scope.missionId, {
        twinRevision: request.body.twinRevision,
        codeMapRevision: request.body.codeMapRevision,
        targetSnapshotId: parseStableId<"GIT_SNAPSHOT">(
          request.body.targetSnapshotId
        ),
        supportRequirements: request.body.supportRequirements,
        roots: impact.roots,
        impactRequirements: impact.requirements
      });
      reply.code(result.created ? 201 : 200);
      return {
        apiVersion: RECONCILIATION_API_VERSION,
        created: result.created,
        reconciliationRevision: toReconciliationRevisionSummaryResource(
          result.revision
        )
      };
    }
  );

  app.get<{
    Params: MissionParams;
    Querystring: RevisionPageQuery;
    Reply: ReconciliationRevisionListResponse;
  }>(
    "/api/v1/missions/:missionId/reconciliation/revisions",
    {
      schema: {
        params: missionParamsSchema,
        querystring: revisionPageQuerySchema,
        response: { 200: revisionListResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await reconciliations.list(
        scope.projectId,
        scope.missionId,
        limit,
        request.query.cursor
      );
      return {
        apiVersion: RECONCILIATION_API_VERSION,
        missionId: scope.missionId,
        revisions: page.items.map(toReconciliationRevisionSummaryResource),
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Reply: ReconciliationRevisionResponse;
  }>(
    "/api/v1/missions/:missionId/reconciliation/revisions/:revision",
    {
      schema: {
        params: revisionParamsSchema,
        response: { 200: revisionResponseSchema, ...errorResponses }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const revision = await reconciliations.get(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision)
      );
      return {
        apiVersion: RECONCILIATION_API_VERSION,
        reconciliationRevision:
          toReconciliationRevisionSummaryResource(revision)
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Querystring: MemberPageQuery;
    Reply: ReconciliationFindingListResponse;
  }>(
    "/api/v1/missions/:missionId/reconciliation/revisions/:revision/findings",
    {
      schema: {
        params: revisionParamsSchema,
        querystring: memberPageQuerySchema,
        response: {
          200: memberListResponseSchema("findings"),
          ...errorResponses
        }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await reconciliations.listFindings(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision),
        limit,
        request.query.cursor
      );
      return {
        apiVersion: RECONCILIATION_API_VERSION,
        missionId: scope.missionId,
        reconciliationRevision: page.revision.revision,
        findings: page.items,
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );

  app.get<{
    Params: RevisionParams;
    Querystring: MemberPageQuery;
    Reply: ReconciliationImpactPathListResponse;
  }>(
    "/api/v1/missions/:missionId/reconciliation/revisions/:revision/impact-paths",
    {
      schema: {
        params: revisionParamsSchema,
        querystring: memberPageQuerySchema,
        response: {
          200: memberListResponseSchema("impactPaths"),
          ...errorResponses
        }
      }
    },
    async (request) => {
      const scope = missionScope(projects, request.params.missionId);
      const limit = request.query.limit ?? DEFAULT_PAGE_LIMIT;
      const page = await reconciliations.listImpactPaths(
        scope.projectId,
        scope.missionId,
        revisionValue(request.params.revision),
        limit,
        request.query.cursor
      );
      return {
        apiVersion: RECONCILIATION_API_VERSION,
        missionId: scope.missionId,
        reconciliationRevision: page.revision.revision,
        impactPaths: page.items,
        page: { limit, nextCursor: page.nextCursor }
      };
    }
  );
}
