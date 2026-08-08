export const API_ERROR_VERSION = "v1" as const;

export const API_ERROR_CODES = [
  "NOT_FOUND",
  "INVALID_REQUEST",
  "CONFLICT",
  "INTEGRITY_ERROR",
  "INTERNAL_ERROR"
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorResponse {
  readonly error: {
    readonly version: typeof API_ERROR_VERSION;
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly requestId: string;
  };
}

const ERROR_MESSAGES: Readonly<Record<ApiErrorCode, string>> = {
  NOT_FOUND: "The requested resource was not found.",
  INVALID_REQUEST: "The request could not be accepted.",
  CONFLICT: "The request conflicts with current resource state.",
  INTEGRITY_ERROR: "Stored resource integrity verification failed.",
  INTERNAL_ERROR: "The service could not complete the request."
};

export function createApiErrorResponse(
  code: ApiErrorCode,
  requestId: string
): ApiErrorResponse {
  return {
    error: {
      version: API_ERROR_VERSION,
      code,
      message: ERROR_MESSAGES[code],
      requestId
    }
  };
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const outer = value as Record<string, unknown>;
  if (typeof outer.error !== "object" || outer.error === null) {
    return false;
  }

  const error = outer.error as Record<string, unknown>;
  const code = error.code;
  return (
    Object.keys(outer).length === 1 &&
    Object.keys(error).length === 4 &&
    error.version === API_ERROR_VERSION &&
    typeof code === "string" &&
    API_ERROR_CODES.some((candidate) => candidate === code) &&
    error.message === ERROR_MESSAGES[code as ApiErrorCode] &&
    typeof error.requestId === "string" &&
    error.requestId.length > 0
  );
}
