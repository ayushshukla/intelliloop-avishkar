export const HEALTH_API_VERSION = "v1" as const;
export const FOUNDATION_PRODUCT_MODE = "FOUNDATION_ONLY" as const;
export const EXTERNAL_AI_STATE = "OFF" as const;

export interface HealthResponse {
  readonly service: "intelliloop-api";
  readonly apiVersion: typeof HEALTH_API_VERSION;
  readonly status: "ok";
  readonly serverTimeUtc: string;
  readonly productMode: typeof FOUNDATION_PRODUCT_MODE;
  readonly externalAi: typeof EXTERNAL_AI_STATE;
}

export function createHealthResponse(serverTimeUtc: string): HealthResponse {
  return {
    service: "intelliloop-api",
    apiVersion: HEALTH_API_VERSION,
    status: "ok",
    serverTimeUtc,
    productMode: FOUNDATION_PRODUCT_MODE,
    externalAi: EXTERNAL_AI_STATE
  };
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.service === "intelliloop-api" &&
    candidate.apiVersion === HEALTH_API_VERSION &&
    candidate.status === "ok" &&
    typeof candidate.serverTimeUtc === "string" &&
    !Number.isNaN(Date.parse(candidate.serverTimeUtc)) &&
    candidate.productMode === FOUNDATION_PRODUCT_MODE &&
    candidate.externalAi === EXTERNAL_AI_STATE
  );
}
