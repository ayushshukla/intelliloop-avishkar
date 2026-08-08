declare const stableIdBrand: unique symbol;

export type StableId<Tag extends string = string> = string & {
  readonly [stableIdBrand]: Tag;
};

export type StableIdGenerator = <Tag extends string>() => StableId<Tag>;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStableId(value: unknown): value is StableId {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

export function parseStableId<Tag extends string = string>(
  value: unknown
): StableId<Tag> {
  if (!isStableId(value)) {
    throw new TypeError("A canonical UUID v4 stable ID is required.");
  }
  return value.toLowerCase() as StableId<Tag>;
}

export function createStableIdGenerator(
  source: () => string
): StableIdGenerator {
  return <Tag extends string>() => parseStableId<Tag>(source());
}
