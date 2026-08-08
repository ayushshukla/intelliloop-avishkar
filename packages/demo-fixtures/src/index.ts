export const DEMO_FIXTURES_STATUS = "CONTROLLED_RETAIL_FIXTURE_AVAILABLE" as const;

export * from "./retail-cancellation.js";

export type DemoFixturesStatus = typeof DEMO_FIXTURES_STATUS;

export const INTELLILOOP_DECLARED_CODE_MAP_MANIFEST_VERSION =
  "intelliloop-declared-code-map.v1" as const;
export const INTELLILOOP_FIXTURE_OWNERSHIP =
  "INTELLILOOP_CONTROLLED_FIXTURE_ONLY" as const;

export interface IntelliLoopDeclaredCodeMapAsset {
  readonly memberKey: string;
  readonly kind: "FILE" | "PACKAGE" | "CONTRACT" | "ROUTE";
  readonly label: string;
  readonly sourcePath?: string;
  readonly sourceDigest: string;
}

export interface IntelliLoopDeclaredCodeMapEdge {
  readonly memberKey: string;
  readonly kind:
    | "IMPORTS"
    | "REEXPORTS"
    | "DECLARES_PACKAGE"
    | "DECLARES_CONTRACT"
    | "DECLARES_ROUTE"
    | "TEST_IMPORTS";
  readonly fromMemberKey: string;
  readonly toMemberKey: string;
}

export interface IntelliLoopDeclaredCodeMapManifest {
  readonly manifestVersion: typeof INTELLILOOP_DECLARED_CODE_MAP_MANIFEST_VERSION;
  readonly ownership: typeof INTELLILOOP_FIXTURE_OWNERSHIP;
  readonly manifestId: string;
  readonly assets: readonly IntelliLoopDeclaredCodeMapAsset[];
  readonly edges: readonly IntelliLoopDeclaredCodeMapEdge[];
}

/**
 * Explicit demo evidence for the IntelliLoop-owned checkout modernization
 * fixture. It is not scanner output and must only be used after a safe static
 * extraction failure inside the controlled fixture flow.
 */
export const INTELLILOOP_CHECKOUT_DECLARED_CODE_MAP = Object.freeze({
  manifestVersion: INTELLILOOP_DECLARED_CODE_MAP_MANIFEST_VERSION,
  ownership: INTELLILOOP_FIXTURE_OWNERSHIP,
  manifestId: "intelliloop-checkout-modernization-v1",
  assets: Object.freeze([
    Object.freeze({
      memberKey: "file:src/checkout/timeout.ts",
      kind: "FILE" as const,
      label: "Checkout timeout source",
      sourcePath: "src/checkout/timeout.ts",
      sourceDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111"
    }),
    Object.freeze({
      memberKey: "contract:src/checkout/timeout.ts:CheckoutTimeoutPolicy",
      kind: "CONTRACT" as const,
      label: "CheckoutTimeoutPolicy",
      sourcePath: "src/checkout/timeout.ts",
      sourceDigest:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222"
    }),
    Object.freeze({
      memberKey: "file:src/http/checkout-routes.ts",
      kind: "FILE" as const,
      label: "Checkout route source",
      sourcePath: "src/http/checkout-routes.ts",
      sourceDigest:
        "sha256:3333333333333333333333333333333333333333333333333333333333333333"
    }),
    Object.freeze({
      memberKey: "route:src/http/checkout-routes.ts:POST:/checkout",
      kind: "ROUTE" as const,
      label: "POST /checkout",
      sourcePath: "src/http/checkout-routes.ts",
      sourceDigest:
        "sha256:4444444444444444444444444444444444444444444444444444444444444444"
    })
  ]),
  edges: Object.freeze([
    Object.freeze({
      memberKey: "declares-contract:CheckoutTimeoutPolicy",
      kind: "DECLARES_CONTRACT" as const,
      fromMemberKey: "contract:src/checkout/timeout.ts:CheckoutTimeoutPolicy",
      toMemberKey: "file:src/checkout/timeout.ts"
    }),
    Object.freeze({
      memberKey: "declares-route:POST:/checkout",
      kind: "DECLARES_ROUTE" as const,
      fromMemberKey: "route:src/http/checkout-routes.ts:POST:/checkout",
      toMemberKey: "file:src/http/checkout-routes.ts"
    }),
    Object.freeze({
      memberKey: "imports:checkout-route:timeout-policy",
      kind: "IMPORTS" as const,
      fromMemberKey: "file:src/http/checkout-routes.ts",
      toMemberKey: "file:src/checkout/timeout.ts"
    })
  ])
}) satisfies IntelliLoopDeclaredCodeMapManifest;
