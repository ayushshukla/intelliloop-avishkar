import type { FastifyInstance } from "fastify";

import {
  CITED_EXPLANATION_API_VERSION,
  CITED_EXPLANATION_DISCLOSURE_VERSION,
  CITED_EXPLANATION_PROVIDER_OUTCOMES,
  CITED_EXPLANATION_QUESTIONS,
  type CitedExplanationResponse,
  type CreateCitedExplanationRequest
} from "@intelliloop/contracts";
import {
  EVIDENCE_PACK_ITEM_KINDS,
  OFFLINE_EXPLANATION_STATEMENT_CATEGORIES,
  PROVIDER_ADAPTER_FAILURE_CODES,
  SYNTHETIC_EDGE_CASE_KINDS,
  parseStableId,
  type MissionId
} from "@intelliloop/domain";

import { API_ERROR_RESPONSE_SCHEMA, UUID_V4_SCHEMA } from "../http-schemas.js";
import type { SqliteProjectRepository } from "../projects/project-repository.js";
import type { CitedExplanationService } from "./cited-explanation-service.js";

interface MissionParams {
  readonly missionId: string;
}

const DIGEST_SCHEMA = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$"
} as const;

const CITATION_ID_SCHEMA = {
  type: "string",
  pattern: "^cite:[0-9a-f]{64}$"
} as const;

const missionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["missionId"],
  properties: { missionId: UUID_V4_SCHEMA }
} as const;

const requestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["question"],
  properties: {
    question: { type: "string", enum: CITED_EXPLANATION_QUESTIONS }
  }
} as const;

const citationIdsSchema = {
  type: "array",
  minItems: 1,
  maxItems: 64,
  uniqueItems: true,
  items: CITATION_ID_SCHEMA
} as const;

const offlineStatementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["statementVersion", "category", "text", "citationIds", "statementId"],
  properties: {
    statementVersion: { const: "offline-explanation-statement.v1" },
    category: { type: "string", enum: OFFLINE_EXPLANATION_STATEMENT_CATEGORIES },
    text: { type: "string", minLength: 1, maxLength: 4096 },
    citationIds: citationIdsSchema,
    statementId: DIGEST_SCHEMA
  }
} as const;

const statementArraySchema = {
  type: "array",
  maxItems: 256,
  items: offlineStatementSchema
} as const;

const evidenceCitationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["citationId", "locator", "itemDigest"],
  properties: {
    citationId: CITATION_ID_SCHEMA,
    locator: {
      type: "object",
      additionalProperties: false,
      required: ["locatorVersion", "itemKind", "itemKey"],
      properties: {
        locatorVersion: { const: "evidence-pack-citation-locator.v1" },
        itemKind: { type: "string", enum: EVIDENCE_PACK_ITEM_KINDS },
        itemKey: { type: "string", minLength: 1, maxLength: 256 }
      }
    },
    itemDigest: DIGEST_SCHEMA
  }
} as const;

const offlineExplanationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "version", "digestVersion", "rendererPolicyVersion", "rendererPolicyDigest",
    "projectId", "missionId", "evidencePackDigest", "questionDigest", "question",
    "questionKind", "engine", "answer", "facts", "inferences", "conflicts", "gaps",
    "nextActions", "citations", "limitations", "explanationDigest"
  ],
  properties: {
    version: { const: "offline-explanation.v1" },
    digestVersion: { const: "offline-explanation-digest.v1" },
    rendererPolicyVersion: { const: "offline-explanation-renderer-policy.v1" },
    rendererPolicyDigest: DIGEST_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    evidencePackDigest: DIGEST_SCHEMA,
    questionDigest: DIGEST_SCHEMA,
    question: { type: "string", enum: CITED_EXPLANATION_QUESTIONS },
    questionKind: {
      type: "string",
      enum: ["RELEASE", "CONFLICTS", "IMPACT", "MISSING_VALIDATION", "NEXT_ACTIONS", "POST_CORRECTION"]
    },
    engine: {
      type: "object",
      additionalProperties: false,
      required: ["explanationType", "aiStatus", "provider", "externalCallMade"],
      properties: {
        explanationType: { const: "DETERMINISTIC_EXPLANATION" },
        aiStatus: { const: "AI_OFF" },
        provider: { const: "NONE" },
        externalCallMade: { const: false }
      }
    },
    answer: offlineStatementSchema,
    facts: statementArraySchema,
    inferences: statementArraySchema,
    conflicts: statementArraySchema,
    gaps: statementArraySchema,
    nextActions: statementArraySchema,
    citations: { type: "array", minItems: 1, maxItems: 256, items: evidenceCitationSchema },
    limitations: {
      type: "array",
      minItems: 1,
      maxItems: 16,
      items: { type: "string", minLength: 1, maxLength: 4096 }
    },
    explanationDigest: DIGEST_SCHEMA
  }
} as const;

const advisoryStatementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "citationIds"],
  properties: {
    text: { type: "string", minLength: 1, maxLength: 4096 },
    citationIds: citationIdsSchema
  }
} as const;

const syntheticSuggestionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "suggestionVersion", "suggestionId", "kind", "title", "scenario",
    "expectedObservation", "syntheticLabel", "authorityLabel", "evidenceStatus",
    "citationIds"
  ],
  properties: {
    suggestionVersion: { const: "synthetic-edge-case-suggestion.v1" },
    suggestionId: DIGEST_SCHEMA,
    kind: { type: "string", enum: SYNTHETIC_EDGE_CASE_KINDS },
    title: { type: "string", minLength: 1, maxLength: 2048 },
    scenario: { type: "string", minLength: 1, maxLength: 2048 },
    expectedObservation: { type: "string", minLength: 1, maxLength: 2048 },
    syntheticLabel: { const: "SYNTHETIC" },
    authorityLabel: { const: "ADVISORY_ONLY" },
    evidenceStatus: { const: "NOT_EVIDENCE" },
    citationIds: {
      type: "array",
      minItems: 1,
      maxItems: 16,
      uniqueItems: true,
      items: CITATION_ID_SCHEMA
    }
  }
} as const;

const syntheticEdgeCasesSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "version", "digestVersion", "policyVersion", "policyDigest", "projectId",
    "missionId", "evidencePackDigest", "questionDigest", "generation", "authority",
    "suggestions", "citations", "limitations", "setDigest"
  ],
  properties: {
    version: { const: "synthetic-edge-case-set.v1" },
    digestVersion: { const: "synthetic-edge-case-set-digest.v1" },
    policyVersion: { const: "synthetic-edge-case-policy.v1" },
    policyDigest: DIGEST_SCHEMA,
    projectId: UUID_V4_SCHEMA,
    missionId: UUID_V4_SCHEMA,
    evidencePackDigest: DIGEST_SCHEMA,
    questionDigest: DIGEST_SCHEMA,
    generation: {
      type: "object",
      additionalProperties: false,
      required: ["mode", "provider", "externalCallMade"],
      properties: {
        mode: { const: "DETERMINISTIC_RULES" },
        provider: { const: "NONE" },
        externalCallMade: { const: false }
      }
    },
    authority: {
      type: "object",
      additionalProperties: false,
      required: [
        "canonicalStateChanged", "findingMutationAvailable", "readinessAuthority",
        "releasePassportAuthority"
      ],
      properties: {
        canonicalStateChanged: { const: false },
        findingMutationAvailable: { const: false },
        readinessAuthority: { const: false },
        releasePassportAuthority: { const: false }
      }
    },
    suggestions: {
      type: "array",
      maxItems: 32,
      items: syntheticSuggestionSchema
    },
    citations: {
      type: "array",
      maxItems: 32,
      items: evidenceCitationSchema
    },
    limitations: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 2048 }
    },
    setDigest: DIGEST_SCHEMA
  }
} as const;

const advisorySchema = {
  type: "object",
  additionalProperties: false,
  required: ["validationVersion", "response", "responseDigest"],
  properties: {
    validationVersion: { const: "provider-advisory-validation.v1" },
    response: {
      type: "object",
      additionalProperties: false,
      required: [
        "responseVersion", "requestId", "providerRequestDigest", "evidencePackDigest",
        "outputSchemaVersion", "answer", "facts", "inferences", "conflicts", "gaps",
        "nextActions", "citations", "providerMetadata", "usageMetadata"
      ],
      properties: {
        responseVersion: { const: "provider-advisory-response.v1" },
        requestId: UUID_V4_SCHEMA,
        providerRequestDigest: DIGEST_SCHEMA,
        evidencePackDigest: DIGEST_SCHEMA,
        outputSchemaVersion: { const: "provider-advisory-output-schema.v1" },
        answer: advisoryStatementSchema,
        facts: { type: "array", maxItems: 256, items: advisoryStatementSchema },
        inferences: { type: "array", maxItems: 256, items: advisoryStatementSchema },
        conflicts: { type: "array", maxItems: 256, items: advisoryStatementSchema },
        gaps: { type: "array", maxItems: 256, items: advisoryStatementSchema },
        nextActions: { type: "array", maxItems: 256, items: advisoryStatementSchema },
        citations: citationIdsSchema,
        providerMetadata: {
          type: "object",
          additionalProperties: false,
          required: ["providerId", "modelId", "responseId", "executionKind"],
          properties: {
            providerId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$" },
            modelId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$" },
            responseId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$" },
            executionKind: { const: "MOCK_VALIDATION" }
          }
        },
        usageMetadata: {
          type: "object",
          additionalProperties: false,
          required: ["inputTokens", "outputTokens", "totalTokens", "source"],
          properties: {
            inputTokens: { type: "integer", minimum: 0, maximum: 12000 },
            outputTokens: { type: "integer", minimum: 0, maximum: 1200 },
            totalTokens: { type: "integer", minimum: 0, maximum: 13200 },
            source: { const: "PROVIDER_REPORTED" }
          }
        }
      }
    },
    responseDigest: DIGEST_SCHEMA
  }
} as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "apiVersion", "missionId", "question", "execution", "disclosure",
    "offlineExplanation", "syntheticEdgeCases", "citationDetails"
  ],
  properties: {
    apiVersion: { const: CITED_EXPLANATION_API_VERSION },
    missionId: UUID_V4_SCHEMA,
    question: { type: "string", enum: CITED_EXPLANATION_QUESTIONS },
    execution: {
      type: "object",
      additionalProperties: false,
      required: [
        "primaryExplanation", "externalAiStatus", "providerOutcome",
        "externalCallMade", "canonicalStateChanged", "authority"
      ],
      properties: {
        primaryExplanation: { const: "DETERMINISTIC_EXPLANATION" },
        externalAiStatus: { const: "OFF" },
        providerOutcome: { type: "string", enum: CITED_EXPLANATION_PROVIDER_OUTCOMES },
        externalCallMade: { const: false },
        canonicalStateChanged: { const: false },
        authority: { const: "ADVISORY_ONLY_NO_RELEASE_DECISION" },
        failureCode: { type: "string", enum: PROVIDER_ADAPTER_FAILURE_CODES }
      }
    },
    disclosure: {
      type: "object",
      additionalProperties: false,
      required: [
        "disclosureVersion", "transferStatus", "evidencePackDigest", "questionDigest",
        "itemCount", "citationCount", "serializedBytes", "inputTokenUpperBound",
        "redaction", "exactRedactedPackJson"
      ],
      properties: {
        disclosureVersion: { const: CITED_EXPLANATION_DISCLOSURE_VERSION },
        transferStatus: { const: "NOT_SENT" },
        evidencePackDigest: DIGEST_SCHEMA,
        questionDigest: DIGEST_SCHEMA,
        itemCount: { type: "integer", minimum: 1, maximum: 256 },
        citationCount: { type: "integer", minimum: 1, maximum: 256 },
        serializedBytes: { type: "integer", minimum: 1, maximum: 65536 },
        inputTokenUpperBound: { type: "integer", minimum: 1, maximum: 12000 },
        redaction: {
          type: "object",
          additionalProperties: false,
          required: ["applied", "totalReplacements", "ruleCounts"],
          properties: {
            applied: { type: "boolean" },
            totalReplacements: { type: "integer", minimum: 0 },
            ruleCounts: {
              type: "array",
              maxItems: 32,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["rule", "replacements"],
                properties: {
                  rule: { type: "string", minLength: 1, maxLength: 64 },
                  replacements: { type: "integer", minimum: 1 }
                }
              }
            }
          }
        },
        exactRedactedPackJson: { type: "string", minLength: 1, maxLength: 65536 }
      }
    },
    offlineExplanation: offlineExplanationSchema,
    syntheticEdgeCases: syntheticEdgeCasesSchema,
    citationDetails: {
      type: "array",
      minItems: 1,
      maxItems: 256,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["citationId", "itemKind", "itemKey", "itemDigest", "payloadJson"],
        properties: {
          citationId: CITATION_ID_SCHEMA,
          itemKind: { type: "string", enum: EVIDENCE_PACK_ITEM_KINDS },
          itemKey: { type: "string", minLength: 1, maxLength: 256 },
          itemDigest: DIGEST_SCHEMA,
          payloadJson: { type: "string", minLength: 1, maxLength: 4096 }
        }
      }
    },
    advisory: advisorySchema
  }
} as const;

export function registerCitedExplanationRoutes(
  app: FastifyInstance,
  projects: SqliteProjectRepository,
  explanations: CitedExplanationService
): void {
  app.post<{
    Params: MissionParams;
    Body: CreateCitedExplanationRequest;
    Reply: CitedExplanationResponse;
  }>(
    "/api/v1/missions/:missionId/cited-explanations",
    {
      schema: {
        params: missionParamsSchema,
        body: requestSchema,
        response: {
          200: responseSchema,
          400: API_ERROR_RESPONSE_SCHEMA,
          404: API_ERROR_RESPONSE_SCHEMA,
          409: API_ERROR_RESPONSE_SCHEMA,
          500: API_ERROR_RESPONSE_SCHEMA
        }
      }
    },
    async (request) => {
      const missionId = parseStableId<"MISSION">(
        request.params.missionId
      ) as MissionId;
      const mission = projects.getMission(missionId);
      return await explanations.execute(
        mission.projectId,
        missionId,
        request.body.question,
        request.id
      );
    }
  );
}
