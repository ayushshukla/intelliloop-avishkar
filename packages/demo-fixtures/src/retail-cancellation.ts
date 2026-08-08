export const RETAIL_CANCELLATION_FIXTURE_VERSION =
  "intelliloop-retail-cancellation-fixture.v1" as const;
export const RETAIL_CANCELLATION_OWNERSHIP =
  "INTELLILOOP_AUTHORED_SYNTHETIC_ONLY" as const;

export type RetailFixturePhase = "INITIAL_BLOCKED" | "CORRECTED_READY_INPUTS";

export interface RetailRepositoryFile {
  readonly path: string;
  readonly mediaType: "application/json" | "text/typescript";
  readonly content: string;
}

export interface RetailRepositoryChange extends RetailRepositoryFile {
  readonly operation: "UPSERT";
}

export interface RetailEvidenceDraft {
  readonly evidenceKey: string;
  readonly phase: RetailFixturePhase;
  readonly format: "MARKDOWN" | "JSON";
  readonly origin: "SYNTHETIC_FIXTURE" | "VALIDATION_RESULT";
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly effectiveAtUtc: string;
  readonly epistemicLabel: "FACT";
  readonly content: string;
}

export interface RetailClaimDraft {
  readonly claimKey: string;
  readonly phase: RetailFixturePhase;
  readonly evidenceKey: string;
  readonly rawText: string;
  readonly subject: string;
  readonly predicate: string;
  readonly value: string;
  readonly applicability: {
    readonly dimensions: readonly {
      readonly dimension: string;
      readonly value: string;
    }[];
    readonly effectiveFromUtc: string;
  };
  readonly effectiveAtUtc: string;
  readonly epistemicLabel: "FACT";
  readonly supersedesClaimKey?: string;
}

export interface RetailValidationDraft {
  readonly validationKey: string;
  readonly phase: RetailFixturePhase;
  readonly evidenceKey: string;
  readonly status: "PASSED";
  readonly origin: "VALIDATION_RESULT";
  readonly snapshotAlias: "INITIAL" | "CORRECTED";
  readonly executed: false;
  readonly authority: "ATTRIBUTED_CONTROLLED_RESULT_NOT_PRODUCTION_PROOF";
}

export interface RetailSupportRequirementDraft {
  readonly requirementId: string;
  readonly supportKind: "EVIDENCE_SOURCE" | "VALIDATION_RESULT";
  readonly sourceLocator?: string;
  readonly validationKey?: string;
  readonly expectedInitially: "PRESENT" | "MISSING";
  readonly expectedAfterCorrection: "PRESENT";
}

export interface RetailImpactRequirementDraft {
  readonly requirementId: string;
  readonly rootAlias:
    | "CANCELLATION_ORCHESTRATION"
    | "INVENTORY_RELEASE"
    | "REFUND_INITIATION"
    | "FULFILMENT_STOP"
    | "CUSTOMER_NOTIFICATION";
  readonly criticalAssetAlias:
    | "ORDER_CANCELLATION_SERVICE"
    | "INVENTORY_RESERVATION_CONSUMER"
    | "REFUND_HANDLER"
    | "FULFILMENT_COORDINATOR"
    | "CUSTOMER_NOTIFIER";
  readonly supportKind: "IMPLEMENTATION" | "VALIDATION";
  readonly validationKey?: string;
  readonly basisClaimKeys: readonly string[];
}

function lines(values: readonly string[]): string {
  return `${values.join("\n")}\n`;
}

const INITIAL_FILES: readonly RetailRepositoryFile[] = Object.freeze([
  Object.freeze({
    path: "package.json",
    mediaType: "application/json" as const,
    content: lines([
      "{",
      '  "name": "intelliloop-loopmart-cancellation-fixture",',
      '  "version": "1.0.0",',
      '  "private": true,',
      '  "type": "module"',
      "}"
    ])
  }),
  Object.freeze({
    path: "src/contracts/cancellation-policy.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      'export type OrderStage = "BEFORE_PICKING" | "PICKING" | "BEFORE_DISPATCH" | "DISPATCHED";',
      "",
      "export interface CancellationPolicy {",
      "  readonly latestEligibleStage: OrderStage;",
      "  readonly releaseInventory: boolean;",
      "  readonly initiateRefund: boolean;",
      "  readonly stopFulfilment: boolean;",
      "  readonly notifyCustomer: boolean;",
      "}",
      "",
      "export const expandedCancellationPolicy: CancellationPolicy = {",
      '  latestEligibleStage: "BEFORE_DISPATCH",',
      "  releaseInventory: true,",
      "  initiateRefund: true,",
      "  stopFulfilment: true,",
      "  notifyCustomer: true",
      "};"
    ])
  }),
  Object.freeze({
    path: "src/order/cancellation-service.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      'import type { CancellationPolicy, OrderStage } from "../contracts/cancellation-policy.js";',
      'import { stopFulfilment } from "../fulfilment/dispatch-coordinator.js";',
      'import { releaseReservation } from "../inventory/reservation-consumer.js";',
      'import { notifyCancellation } from "../notification/customer-notifier.js";',
      'import { initiateRefund } from "../refund/refund-handler.js";',
      "",
      "export interface CancellationOutcome {",
      "  readonly accepted: boolean;",
      "  readonly refundStarted: boolean;",
      "  readonly inventoryReleased: boolean;",
      "  readonly fulfilmentStopped: boolean;",
      "  readonly customerNotified: boolean;",
      "}",
      "",
      "export function cancelOrder(orderId: string, stage: OrderStage, policy: CancellationPolicy): CancellationOutcome {",
      '  const accepted = stage === "BEFORE_PICKING" || stage === "PICKING" || stage === "BEFORE_DISPATCH";',
      "  if (!accepted) return { accepted: false, refundStarted: false, inventoryReleased: false, fulfilmentStopped: false, customerNotified: false };",
      "  void releaseReservation; void stopFulfilment; void notifyCancellation;",
      "  return { accepted: true, refundStarted: initiateRefund(orderId), inventoryReleased: false, fulfilmentStopped: false, customerNotified: false };",
      "}"
    ])
  }),
  Object.freeze({
    path: "src/inventory/reservation-consumer.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function releaseReservation(_orderId: string): boolean {",
      "  return false;",
      "}"
    ])
  }),
  Object.freeze({
    path: "src/refund/refund-handler.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function initiateRefund(orderId: string): boolean {",
      "  return orderId.length > 0;",
      "}"
    ])
  }),
  Object.freeze({
    path: "src/fulfilment/dispatch-coordinator.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function stopFulfilment(_orderId: string): boolean {",
      "  return false;",
      "}"
    ])
  }),
  Object.freeze({
    path: "src/notification/customer-notifier.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function notifyCancellation(_orderId: string): boolean {",
      "  return false;",
      "}"
    ])
  }),
  Object.freeze({
    path: "test/order/cancellation-service.test.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      'import { expandedCancellationPolicy } from "../../src/contracts/cancellation-policy.js";',
      'import { cancelOrder } from "../../src/order/cancellation-service.js";',
      "",
      "const outcome = cancelOrder(\"synthetic-order-1\", \"BEFORE_DISPATCH\", expandedCancellationPolicy);",
      "if (!outcome.accepted) throw new Error(\"Controlled cancellation-window check failed.\");"
    ])
  }),
  Object.freeze({
    path: "test/refund/refund-handler.test.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      'import { initiateRefund } from "../../src/refund/refund-handler.js";',
      "",
      "if (!initiateRefund(\"synthetic-order-1\")) throw new Error(\"Controlled refund check failed.\");"
    ])
  })
]);

const CORRECTION_CHANGES: readonly RetailRepositoryChange[] = Object.freeze([
  Object.freeze({
    operation: "UPSERT" as const,
    path: "src/order/cancellation-service.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      'import type { CancellationPolicy, OrderStage } from "../contracts/cancellation-policy.js";',
      'import { stopFulfilment } from "../fulfilment/dispatch-coordinator.js";',
      'import { releaseReservation } from "../inventory/reservation-consumer.js";',
      'import { notifyCancellation } from "../notification/customer-notifier.js";',
      'import { initiateRefund } from "../refund/refund-handler.js";',
      "",
      "export interface CancellationOutcome {",
      "  readonly accepted: boolean;",
      "  readonly refundStarted: boolean;",
      "  readonly inventoryReleased: boolean;",
      "  readonly fulfilmentStopped: boolean;",
      "  readonly customerNotified: boolean;",
      "}",
      "",
      "export function cancelOrder(orderId: string, stage: OrderStage, policy: CancellationPolicy): CancellationOutcome {",
      '  const accepted = stage === "BEFORE_PICKING" || stage === "PICKING" || stage === "BEFORE_DISPATCH";',
      "  if (!accepted) return { accepted: false, refundStarted: false, inventoryReleased: false, fulfilmentStopped: false, customerNotified: false };",
      "  return {",
      "    accepted: true,",
      "    refundStarted: policy.initiateRefund && initiateRefund(orderId),",
      "    inventoryReleased: policy.releaseInventory && releaseReservation(orderId),",
      "    fulfilmentStopped: policy.stopFulfilment && stopFulfilment(orderId),",
      "    customerNotified: policy.notifyCustomer && notifyCancellation(orderId)",
      "  };",
      "}"
    ])
  }),
  Object.freeze({
    operation: "UPSERT" as const,
    path: "src/inventory/reservation-consumer.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function releaseReservation(orderId: string): boolean {",
      "  return orderId.length > 0;",
      "}"
    ])
  }),
  Object.freeze({
    operation: "UPSERT" as const,
    path: "src/fulfilment/dispatch-coordinator.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function stopFulfilment(orderId: string): boolean {",
      "  return orderId.length > 0;",
      "}"
    ])
  }),
  Object.freeze({
    operation: "UPSERT" as const,
    path: "src/notification/customer-notifier.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      "export function notifyCancellation(orderId: string): boolean {",
      "  return orderId.length > 0;",
      "}"
    ])
  }),
  Object.freeze({
    operation: "UPSERT" as const,
    path: "test/integration/post-picking-cancellation.test.ts",
    mediaType: "text/typescript" as const,
    content: lines([
      'import { expandedCancellationPolicy } from "../../src/contracts/cancellation-policy.js";',
      'import { cancelOrder } from "../../src/order/cancellation-service.js";',
      "",
      "const outcome = cancelOrder(\"synthetic-order-2\", \"PICKING\", expandedCancellationPolicy);",
      "if (!outcome.accepted || !outcome.inventoryReleased || !outcome.fulfilmentStopped || !outcome.customerNotified) {",
      "  throw new Error(\"Controlled post-picking cancellation check failed.\");",
      "}"
    ])
  })
]);

const EVIDENCE: readonly RetailEvidenceDraft[] = Object.freeze([
  Object.freeze({
    evidenceKey: "REQUIREMENT_V2", phase: "INITIAL_BLOCKED" as const,
    format: "MARKDOWN" as const, origin: "SYNTHETIC_FIXTURE" as const,
    sourceLocator: "synthetic:loopmart/requirements/cancellation-v2", sourceRevision: "requirements-v2",
    effectiveAtUtc: "2026-08-01T09:00:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(["# Synthetic cancellation requirement v2", "", "LoopMart allows cancellation through BEFORE_DISPATCH.", "A successful cancellation must release reserved inventory, initiate the refund, stop fulfilment, and notify the customer."])
  }),
  Object.freeze({
    evidenceKey: "ADR_V1", phase: "INITIAL_BLOCKED" as const,
    format: "MARKDOWN" as const, origin: "SYNTHETIC_FIXTURE" as const,
    sourceLocator: "synthetic:loopmart/decisions/cancellation-v1", sourceRevision: "adr-v1",
    effectiveAtUtc: "2026-07-01T09:00:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(["# Synthetic architecture decision v1", "", "Cancellation is allowed only through BEFORE_PICKING.", "The fulfilment coordinator owns any inventory release needed after cancellation."])
  }),
  Object.freeze({
    evidenceKey: "RELEASE_NOTE_INITIAL", phase: "INITIAL_BLOCKED" as const,
    format: "MARKDOWN" as const, origin: "SYNTHETIC_FIXTURE" as const,
    sourceLocator: "synthetic:loopmart/releases/cancellation-candidate-1", sourceRevision: "candidate-1",
    effectiveAtUtc: "2026-08-01T10:00:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(["# Synthetic release note", "", "Expanded cancellation is READY based on cancellation-window and refund checks."])
  }),
  Object.freeze({
    evidenceKey: "VALIDATION_ORDER", phase: "INITIAL_BLOCKED" as const,
    format: "JSON" as const, origin: "VALIDATION_RESULT" as const,
    sourceLocator: "synthetic:loopmart/validations/order-window", sourceRevision: "initial-1",
    effectiveAtUtc: "2026-08-01T10:05:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(['{"schemaVersion":"intelliloop-controlled-validation.v1","validationKey":"test:order/cancellation-window","status":"PASSED","executed":false,"synthetic":true}'])
  }),
  Object.freeze({
    evidenceKey: "VALIDATION_REFUND", phase: "INITIAL_BLOCKED" as const,
    format: "JSON" as const, origin: "VALIDATION_RESULT" as const,
    sourceLocator: "synthetic:loopmart/validations/refund-initiation", sourceRevision: "initial-1",
    effectiveAtUtc: "2026-08-01T10:06:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(['{"schemaVersion":"intelliloop-controlled-validation.v1","validationKey":"test:refund/initiation","status":"PASSED","executed":false,"synthetic":true}'])
  }),
  Object.freeze({
    evidenceKey: "ADR_V2", phase: "CORRECTED_READY_INPUTS" as const,
    format: "MARKDOWN" as const, origin: "SYNTHETIC_FIXTURE" as const,
    sourceLocator: "synthetic:loopmart/decisions/cancellation-v2", sourceRevision: "adr-v2",
    effectiveAtUtc: "2026-08-02T09:00:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(["# Synthetic architecture decision v2", "", "Cancellation is allowed through BEFORE_DISPATCH.", "The inventory reservation consumer owns inventory release; the fulfilment coordinator stops dispatch work.", "This decision supersedes synthetic architecture decision v1."])
  }),
  Object.freeze({
    evidenceKey: "VALIDATION_INVENTORY", phase: "CORRECTED_READY_INPUTS" as const,
    format: "JSON" as const, origin: "VALIDATION_RESULT" as const,
    sourceLocator: "synthetic:loopmart/validations/inventory-release", sourceRevision: "corrected-1",
    effectiveAtUtc: "2026-08-02T10:00:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(['{"schemaVersion":"intelliloop-controlled-validation.v1","validationKey":"test:inventory/post-picking-release","status":"PASSED","executed":false,"synthetic":true}'])
  }),
  Object.freeze({
    evidenceKey: "VALIDATION_FULFILMENT", phase: "CORRECTED_READY_INPUTS" as const,
    format: "JSON" as const, origin: "VALIDATION_RESULT" as const,
    sourceLocator: "synthetic:loopmart/validations/fulfilment-stop", sourceRevision: "corrected-1",
    effectiveAtUtc: "2026-08-02T10:01:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(['{"schemaVersion":"intelliloop-controlled-validation.v1","validationKey":"test:fulfilment/post-picking-stop","status":"PASSED","executed":false,"synthetic":true}'])
  }),
  Object.freeze({
    evidenceKey: "HUMAN_REVIEW", phase: "CORRECTED_READY_INPUTS" as const,
    format: "MARKDOWN" as const, origin: "SYNTHETIC_FIXTURE" as const,
    sourceLocator: "synthetic:loopmart/reviews/cancellation-corrected", sourceRevision: "review-1",
    effectiveAtUtc: "2026-08-02T10:10:00.000Z", epistemicLabel: "FACT" as const,
    content: lines(["# Synthetic human review fixture", "", "A fictional reviewer confirmed the corrected cancellation decision, inventory release, fulfilment stop, refund, notification and controlled validation bindings.", "This is attributed synthetic demo input, not a real approval or production safety statement."])
  })
]);

const APPLICABILITY = Object.freeze({
  dimensions: Object.freeze([
    Object.freeze({ dimension: "channel", value: "web" }),
    Object.freeze({ dimension: "order-type", value: "reserved-retail-order" })
  ]),
  effectiveFromUtc: "2026-08-01T00:00:00.000Z"
});

const CLAIMS: readonly RetailClaimDraft[] = Object.freeze([
  Object.freeze({ claimKey: "REQ_ELIGIBILITY", phase: "INITIAL_BLOCKED" as const, evidenceKey: "REQUIREMENT_V2", rawText: "LoopMart allows cancellation through BEFORE_DISPATCH.", subject: "order-cancellation", predicate: "eligible-until", value: "BEFORE_DISPATCH", applicability: APPLICABILITY, effectiveAtUtc: "2026-08-01T09:00:00.000Z", epistemicLabel: "FACT" as const }),
  Object.freeze({ claimKey: "ADR1_ELIGIBILITY", phase: "INITIAL_BLOCKED" as const, evidenceKey: "ADR_V1", rawText: "Cancellation is allowed only through BEFORE_PICKING.", subject: "order-cancellation", predicate: "eligible-until", value: "BEFORE_PICKING", applicability: APPLICABILITY, effectiveAtUtc: "2026-07-01T09:00:00.000Z", epistemicLabel: "FACT" as const }),
  Object.freeze({ claimKey: "REQ_INVENTORY_OWNER", phase: "INITIAL_BLOCKED" as const, evidenceKey: "REQUIREMENT_V2", rawText: "A successful cancellation must release reserved inventory, initiate the refund, stop fulfilment, and notify the customer.", subject: "cancellation-inventory-release", predicate: "owned-by", value: "inventory-reservation-consumer", applicability: APPLICABILITY, effectiveAtUtc: "2026-08-01T09:00:00.000Z", epistemicLabel: "FACT" as const }),
  Object.freeze({ claimKey: "ADR1_INVENTORY_OWNER", phase: "INITIAL_BLOCKED" as const, evidenceKey: "ADR_V1", rawText: "The fulfilment coordinator owns any inventory release needed after cancellation.", subject: "cancellation-inventory-release", predicate: "owned-by", value: "fulfilment-coordinator", applicability: APPLICABILITY, effectiveAtUtc: "2026-07-01T09:00:00.000Z", epistemicLabel: "FACT" as const }),
  Object.freeze({ claimKey: "RELEASE_READY_CLAIM", phase: "INITIAL_BLOCKED" as const, evidenceKey: "RELEASE_NOTE_INITIAL", rawText: "Expanded cancellation is READY based on cancellation-window and refund checks.", subject: "expanded-cancellation-release", predicate: "status", value: "READY", applicability: APPLICABILITY, effectiveAtUtc: "2026-08-01T10:00:00.000Z", epistemicLabel: "FACT" as const }),
  Object.freeze({ claimKey: "ADR2_ELIGIBILITY", phase: "CORRECTED_READY_INPUTS" as const, evidenceKey: "ADR_V2", rawText: "Cancellation is allowed through BEFORE_DISPATCH.", subject: "order-cancellation", predicate: "eligible-until", value: "BEFORE_DISPATCH", applicability: APPLICABILITY, effectiveAtUtc: "2026-08-02T09:00:00.000Z", epistemicLabel: "FACT" as const, supersedesClaimKey: "ADR1_ELIGIBILITY" }),
  Object.freeze({ claimKey: "ADR2_INVENTORY_OWNER", phase: "CORRECTED_READY_INPUTS" as const, evidenceKey: "ADR_V2", rawText: "The inventory reservation consumer owns inventory release; the fulfilment coordinator stops dispatch work.", subject: "cancellation-inventory-release", predicate: "owned-by", value: "inventory-reservation-consumer", applicability: APPLICABILITY, effectiveAtUtc: "2026-08-02T09:00:00.000Z", epistemicLabel: "FACT" as const, supersedesClaimKey: "ADR1_INVENTORY_OWNER" })
]);

const VALIDATIONS: readonly RetailValidationDraft[] = Object.freeze([
  Object.freeze({ validationKey: "test:order/cancellation-window", phase: "INITIAL_BLOCKED" as const, evidenceKey: "VALIDATION_ORDER", status: "PASSED" as const, origin: "VALIDATION_RESULT" as const, snapshotAlias: "INITIAL" as const, executed: false as const, authority: "ATTRIBUTED_CONTROLLED_RESULT_NOT_PRODUCTION_PROOF" as const }),
  Object.freeze({ validationKey: "test:refund/initiation", phase: "INITIAL_BLOCKED" as const, evidenceKey: "VALIDATION_REFUND", status: "PASSED" as const, origin: "VALIDATION_RESULT" as const, snapshotAlias: "INITIAL" as const, executed: false as const, authority: "ATTRIBUTED_CONTROLLED_RESULT_NOT_PRODUCTION_PROOF" as const }),
  Object.freeze({ validationKey: "test:inventory/post-picking-release", phase: "CORRECTED_READY_INPUTS" as const, evidenceKey: "VALIDATION_INVENTORY", status: "PASSED" as const, origin: "VALIDATION_RESULT" as const, snapshotAlias: "CORRECTED" as const, executed: false as const, authority: "ATTRIBUTED_CONTROLLED_RESULT_NOT_PRODUCTION_PROOF" as const }),
  Object.freeze({ validationKey: "test:fulfilment/post-picking-stop", phase: "CORRECTED_READY_INPUTS" as const, evidenceKey: "VALIDATION_FULFILMENT", status: "PASSED" as const, origin: "VALIDATION_RESULT" as const, snapshotAlias: "CORRECTED" as const, executed: false as const, authority: "ATTRIBUTED_CONTROLLED_RESULT_NOT_PRODUCTION_PROOF" as const })
]);

const SUPPORT_REQUIREMENTS: readonly RetailSupportRequirementDraft[] = Object.freeze([
  Object.freeze({ requirementId: "support:decision/cancellation-v2", supportKind: "EVIDENCE_SOURCE" as const, sourceLocator: "synthetic:loopmart/decisions/cancellation-v2", expectedInitially: "MISSING" as const, expectedAfterCorrection: "PRESENT" as const }),
  Object.freeze({ requirementId: "validation:order/cancellation-window", supportKind: "VALIDATION_RESULT" as const, validationKey: "test:order/cancellation-window", expectedInitially: "PRESENT" as const, expectedAfterCorrection: "PRESENT" as const }),
  Object.freeze({ requirementId: "validation:refund/initiation", supportKind: "VALIDATION_RESULT" as const, validationKey: "test:refund/initiation", expectedInitially: "PRESENT" as const, expectedAfterCorrection: "PRESENT" as const }),
  Object.freeze({ requirementId: "validation:inventory/post-picking-release", supportKind: "VALIDATION_RESULT" as const, validationKey: "test:inventory/post-picking-release", expectedInitially: "MISSING" as const, expectedAfterCorrection: "PRESENT" as const }),
  Object.freeze({ requirementId: "validation:fulfilment/post-picking-stop", supportKind: "VALIDATION_RESULT" as const, validationKey: "test:fulfilment/post-picking-stop", expectedInitially: "MISSING" as const, expectedAfterCorrection: "PRESENT" as const })
]);

const IMPACT_REQUIREMENTS: readonly RetailImpactRequirementDraft[] = Object.freeze([
  Object.freeze({ requirementId: "impact:order-cancellation", rootAlias: "CANCELLATION_ORCHESTRATION" as const, criticalAssetAlias: "ORDER_CANCELLATION_SERVICE" as const, supportKind: "IMPLEMENTATION" as const, basisClaimKeys: Object.freeze(["REQ_ELIGIBILITY"]) }),
  Object.freeze({ requirementId: "impact:inventory-release", rootAlias: "INVENTORY_RELEASE" as const, criticalAssetAlias: "INVENTORY_RESERVATION_CONSUMER" as const, supportKind: "VALIDATION" as const, validationKey: "test:inventory/post-picking-release", basisClaimKeys: Object.freeze(["REQ_INVENTORY_OWNER"]) }),
  Object.freeze({ requirementId: "impact:refund-initiation", rootAlias: "REFUND_INITIATION" as const, criticalAssetAlias: "REFUND_HANDLER" as const, supportKind: "VALIDATION" as const, validationKey: "test:refund/initiation", basisClaimKeys: Object.freeze(["REQ_ELIGIBILITY"]) }),
  Object.freeze({ requirementId: "impact:fulfilment-stop", rootAlias: "FULFILMENT_STOP" as const, criticalAssetAlias: "FULFILMENT_COORDINATOR" as const, supportKind: "VALIDATION" as const, validationKey: "test:fulfilment/post-picking-stop", basisClaimKeys: Object.freeze(["REQ_ELIGIBILITY"]) }),
  Object.freeze({ requirementId: "impact:customer-notification", rootAlias: "CUSTOMER_NOTIFICATION" as const, criticalAssetAlias: "CUSTOMER_NOTIFIER" as const, supportKind: "IMPLEMENTATION" as const, basisClaimKeys: Object.freeze(["REQ_ELIGIBILITY"]) })
]);

export const INTELLILOOP_RETAIL_CANCELLATION_FIXTURE = Object.freeze({
  fixtureVersion: RETAIL_CANCELLATION_FIXTURE_VERSION,
  ownership: RETAIL_CANCELLATION_OWNERSHIP,
  fixtureId: "loopmart-expanded-cancellation-v1",
  title: "LoopMart expanded cancellation after picking",
  fictionalOrganization: "LoopMart (fictional synthetic retailer)",
  synthetic: true as const,
  containsPersonalData: false as const,
  containsEmployerOrClientData: false as const,
  requiresNetwork: false as const,
  executesRepositoryCode: false as const,
  provenance: Object.freeze({
    authoredFor: "IntelliLoop Avishkar controlled demonstration",
    authoredBy: "IntelliLoop project",
    sourceStrategy: "SOURCE_INDEPENDENT_BUILD",
    externalSourceTransfer: "NONE",
    license: "PROJECT_INTERNAL_SYNTHETIC_FIXTURE",
    recordedDate: "2026-08-06"
  }),
  scenario: Object.freeze({
    change: "Allow cancellation after picking starts and before dispatch.",
    initialNarrative: "Cancellation and refund checks appear green while decision conflict, inventory release and fulfilment-stop coverage remain unresolved.",
    correctionNarrative: "A superseding decision, corrected implementation, missing controlled validations and an explicit synthetic review provide complete candidate inputs.",
    expectedStateSequence: Object.freeze(["BLOCKED", "READY", "STALE"] as const),
    authority: "EXPECTED_DEMO_SEQUENCE_NOT_PRECOMPUTED_PRODUCT_STATE" as const
  }),
  repository: Object.freeze({
    repositoryAlias: "LOOPMART_CANCELLATION_REPOSITORY",
    initialRevision: Object.freeze({
      snapshotAlias: "INITIAL" as const,
      commitMessage: "fixture: initial expanded cancellation candidate",
      files: INITIAL_FILES
    }),
    correctionRevision: Object.freeze({
      snapshotAlias: "CORRECTED" as const,
      commitMessage: "fixture: complete post-picking cancellation handling",
      changes: CORRECTION_CHANGES
    })
  }),
  evidence: EVIDENCE,
  claims: CLAIMS,
  validations: VALIDATIONS,
  supportRequirements: SUPPORT_REQUIREMENTS,
  impact: Object.freeze({
    roots: Object.freeze([
      { rootAlias: "CANCELLATION_ORCHESTRATION" as const, assetPath: "src/order/cancellation-service.ts" },
      { rootAlias: "INVENTORY_RELEASE" as const, assetPath: "src/inventory/reservation-consumer.ts" },
      { rootAlias: "REFUND_INITIATION" as const, assetPath: "src/refund/refund-handler.ts" },
      { rootAlias: "FULFILMENT_STOP" as const, assetPath: "src/fulfilment/dispatch-coordinator.ts" },
      { rootAlias: "CUSTOMER_NOTIFICATION" as const, assetPath: "src/notification/customer-notifier.ts" }
    ]),
    assetAliases: Object.freeze({
      ORDER_CANCELLATION_SERVICE: "src/order/cancellation-service.ts",
      INVENTORY_RESERVATION_CONSUMER: "src/inventory/reservation-consumer.ts",
      REFUND_HANDLER: "src/refund/refund-handler.ts",
      FULFILMENT_COORDINATOR: "src/fulfilment/dispatch-coordinator.ts",
      CUSTOMER_NOTIFIER: "src/notification/customer-notifier.ts"
    }),
    requirements: IMPACT_REQUIREMENTS
  }),
  review: Object.freeze({
    phase: "CORRECTED_READY_INPUTS" as const,
    evidenceKey: "HUMAN_REVIEW",
    actorKind: "HUMAN" as const,
    syntheticActorLabel: "LoopMart fixture release reviewer",
    authority: "ATTRIBUTED_SYNTHETIC_REVIEW_NOT_REAL_APPROVAL" as const
  }),
  loaderBoundary: Object.freeze({
    materializationImplemented: false as const,
    resetImplemented: false as const,
    owningStory: "IL-8.2" as const,
    mayWriteOnlyToDedicatedGeneratedFixtureRoot: true as const
  })
});

export type IntelliLoopRetailCancellationFixture =
  typeof INTELLILOOP_RETAIL_CANCELLATION_FIXTURE;
