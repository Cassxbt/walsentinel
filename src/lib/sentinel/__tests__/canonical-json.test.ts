import { describe, expect, it } from "vitest";
import { canonicalJson } from "../canonical-json";

describe("canonicalJson", () => {
  it("sorts object keys recursively", () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}');
  });

  it("preserves array order", () => {
    expect(canonicalJson({ values: [{ b: 2, a: 1 }, { d: 4, c: 3 }] })).toBe(
      '{"values":[{"a":1,"b":2},{"c":3,"d":4}]}'
    );
  });
});
