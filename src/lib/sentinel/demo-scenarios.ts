import type { DemoScenario } from "./types";

const createdAt = "2026-06-01T00:00:00.000Z";
const demoActor =
  process.env.NEXT_PUBLIC_DEMO_ACTOR_ADDRESS ??
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    label: "Known recipient, tiny transfer",
    expectedVerdict: "ALLOW",
    intent: {
      id: "demo-allow-known-transfer",
      kind: "sui-transfer",
      network: "testnet",
      actor: demoActor,
      target: "0x2222222222222222222222222222222222222222222222222222222222222222",
      amountMist: "10000000",
      description: "Agent wants to send 0.01 SUI to a known test recipient.",
      createdAt
    }
  },
  {
    label: "Unknown recipient, moderate transfer",
    expectedVerdict: "WARN",
    intent: {
      id: "demo-warn-new-recipient",
      kind: "sui-transfer",
      network: "testnet",
      actor: demoActor,
      target: "0x3333333333333333333333333333333333333333333333333333333333333333",
      amountMist: "250000000",
      description: "Agent wants to send 0.25 SUI to a recipient with no recent relationship.",
      createdAt
    }
  },
  {
    label: "Suspicious package call",
    expectedVerdict: "BLOCK",
    intent: {
      id: "demo-block-risky-package",
      kind: "package-interaction",
      network: "testnet",
      actor: demoActor,
      target: "0x9999999999999999999999999999999999999999999999999999999999999999",
      packageId: "0x9999999999999999999999999999999999999999999999999999999999999999",
      moduleName: "vault",
      functionName: "sweep_all",
      description: "Agent wants to call a high-risk package function that can move assets.",
      createdAt
    }
  }
];
