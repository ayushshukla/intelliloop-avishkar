declare const utcTimestampBrand: unique symbol;

export type UtcTimestamp = string & {
  readonly [utcTimestampBrand]: "UTC_TIMESTAMP";
};

export interface Clock {
  now(): UtcTimestamp;
}

export function parseUtcTimestamp(value: unknown): UtcTimestamp {
  if (typeof value !== "string") {
    throw new TypeError("A canonical UTC timestamp is required.");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError("A canonical UTC timestamp is required.");
  }

  return value as UtcTimestamp;
}

export function formatUtcTimestamp(value: Date): UtcTimestamp {
  if (Number.isNaN(value.getTime())) {
    throw new TypeError("A valid date is required.");
  }

  return parseUtcTimestamp(value.toISOString());
}

export function createClock(source: () => Date): Clock {
  return Object.freeze({
    now: () => formatUtcTimestamp(source())
  });
}
