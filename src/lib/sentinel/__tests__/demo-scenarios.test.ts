import { describe, expect, it } from "vitest";
import { DEMO_SCENARIOS } from "../demo-scenarios";

describe("DEMO_SCENARIOS", () => {
  it("defines allow, warn, and block scenarios with stable IDs", () => {
    expect(DEMO_SCENARIOS.map((scenario) => scenario.expectedVerdict)).toEqual([
      "ALLOW",
      "WARN",
      "BLOCK"
    ]);
    expect(DEMO_SCENARIOS.map((scenario) => scenario.intent.id)).toEqual([
      "demo-allow-known-transfer",
      "demo-warn-new-recipient",
      "demo-block-risky-package"
    ]);
  });
});
