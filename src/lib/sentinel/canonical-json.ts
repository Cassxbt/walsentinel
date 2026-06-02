type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function normalize(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.keys(input)
      .sort()
      .reduce<Record<string, JsonValue>>((result, key) => {
        const item = input[key];
        if (typeof item !== "undefined") {
          result[key] = normalize(item);
        }
        return result;
      }, {});
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return String(value);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}
