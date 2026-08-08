import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id" as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSafeRequestId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function resolveRequestId(
  incoming: string | readonly string[] | undefined,
  generate: () => string = randomUUID
): string {
  if (isSafeRequestId(incoming)) {
    return incoming.toLowerCase();
  }

  const generated = generate();
  return isSafeRequestId(generated) ? generated.toLowerCase() : randomUUID();
}
