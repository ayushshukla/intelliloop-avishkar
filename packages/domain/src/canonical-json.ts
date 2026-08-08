export type JsonPrimitive = null | boolean | number | string;
export type JsonArray = readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

function fail(): never {
  throw new TypeError("A finite, acyclic JSON value is required.");
}

function serializeString(value: string): string {
  const serialized = JSON.stringify(value);
  return serialized ?? fail();
}

function serializeArray(value: readonly unknown[], ancestors: WeakSet<object>): string {
  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key === "symbol") fail();
    if (key === "length") continue;
    if (!/^(0|[1-9][0-9]*)$/.test(key)) fail();
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index >= value.length) fail();
  }

  const values: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      fail();
    }
    values.push(serialize(descriptor.value, ancestors));
  }
  return `[${values.join(",")}]`;
}

function serializeObject(value: object, ancestors: WeakSet<object>): string {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key === "symbol")) fail();

  const stringKeys = (keys as string[]).sort();
  const members: string[] = [];
  for (const key of stringKeys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      fail();
    }
    members.push(
      `${serializeString(key)}:${serialize(descriptor.value, ancestors)}`
    );
  }
  return `{${members.join(",")}}`;
}

function serialize(value: unknown, ancestors: WeakSet<object>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) fail();
      return JSON.stringify(value) ?? fail();
    case "string":
      return serializeString(value);
    case "object": {
      if (ancestors.has(value)) fail();
      ancestors.add(value);
      try {
        return Array.isArray(value)
          ? serializeArray(value, ancestors)
          : serializeObject(value, ancestors);
      } finally {
        ancestors.delete(value);
      }
    }
    default:
      return fail();
  }
}

export function canonicalizeJson(value: unknown): string {
  return serialize(value, new WeakSet<object>());
}
