import type { ApiErrorCode } from "@intelliloop/contracts";

import type { ApiLogLevel } from "./config.js";

export type SafeLogEvent =
  | "api.starting"
  | "api.listening"
  | "api.request.completed"
  | "api.request.failed"
  | "api.stopping"
  | "api.stopped"
  | "api.start_failed";

export type SafeLogErrorCode =
  | ApiErrorCode
  | "CONFIG_INVALID"
  | "DATABASE_START_FAILED"
  | "LISTEN_FAILED";

export interface SafeLogContext {
  readonly event: SafeLogEvent;
  readonly requestId?: string;
  readonly method?: string;
  readonly route?: string;
  readonly statusCode?: number;
  readonly errorCode?: SafeLogErrorCode;
  readonly host?: string;
  readonly port?: number;
}

export interface SafeLogger {
  info(context: SafeLogContext): void;
  error(context: SafeLogContext): void;
}

export interface SafeLoggerOptions {
  readonly level: ApiLogLevel;
  readonly write: (jsonLine: string) => void;
  readonly clock?: () => Date;
}

function shouldWrite(configured: ApiLogLevel, emitted: "info" | "error"): boolean {
  return configured === "info" || (configured === "error" && emitted === "error");
}

export function createSafeLogger(options: SafeLoggerOptions): SafeLogger {
  const clock = options.clock ?? (() => new Date());

  function emit(level: "info" | "error", context: SafeLogContext): void {
    if (!shouldWrite(options.level, level)) {
      return;
    }

    const record: Record<string, string | number> = {
      timeUtc: clock().toISOString(),
      level,
      event: context.event
    };

    if (context.requestId !== undefined) record.requestId = context.requestId;
    if (context.method !== undefined) record.method = context.method;
    if (context.route !== undefined) record.route = context.route;
    if (context.statusCode !== undefined) record.statusCode = context.statusCode;
    if (context.errorCode !== undefined) record.errorCode = context.errorCode;
    if (context.host !== undefined) record.host = context.host;
    if (context.port !== undefined) record.port = context.port;

    try {
      options.write(`${JSON.stringify(record)}\n`);
    } catch {
      // Observability failures must not expose data or take down request handling.
    }
  }

  return {
    info: (context) => emit("info", context),
    error: (context) => emit("error", context)
  };
}

export const SILENT_LOGGER: SafeLogger = Object.freeze({
  info: () => undefined,
  error: () => undefined
});
