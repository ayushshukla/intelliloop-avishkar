import {
  isHealthResponse,
  type HealthResponse
} from "@intelliloop/contracts";

export type HealthViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "healthy"; readonly data: HealthResponse }
  | { readonly kind: "unavailable"; readonly message: string };

export async function loadHealth(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal
): Promise<HealthViewState> {
  try {
    const init: RequestInit = {
      headers: { Accept: "application/json" }
    };
    if (signal !== undefined) {
      init.signal = signal;
    }

    const response = await fetcher("/api/v1/health", init);
    if (!response.ok) {
      return {
        kind: "unavailable",
        message: "The local API did not return a healthy response."
      };
    }

    const payload: unknown = await response.json();
    if (!isHealthResponse(payload)) {
      return {
        kind: "unavailable",
        message: "The local API response did not match the foundation contract."
      };
    }

    return { kind: "healthy", data: payload };
  } catch {
    return {
      kind: "unavailable",
      message: "The local API is unavailable. Start the API and try again."
    };
  }
}
