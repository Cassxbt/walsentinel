import { describe, expect, it } from "vitest";
import { buildScenarioCatalog } from "../scenario-catalog";

const senderA = "0xd806dc84d806dc84d806dc84d806dc84d806dc84d806dc84d806dc84d806dc84";
const senderB = "0x7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a7f1a";

class FixtureClient {
  async rpc<T>(method: string): Promise<T> {
    if (method === "suix_queryTransactionBlocks") {
      return {
        data: [
          { transaction: { data: { sender: senderA } } },
          { transaction: { data: { sender: senderB } } }
        ]
      } as T;
    }

    if (method === "suix_getBalance") {
      return { totalBalance: "1000000000" } as T;
    }

    if (method === "sui_getNormalizedMoveFunction") {
      return { visibility: "public" } as T;
    }

    throw new Error(`Unexpected method ${method}`);
  }
}

describe("buildScenarioCatalog", () => {
  it("builds live-derived verdict coverage from RPC data", async () => {
    const scenarios = await buildScenarioCatalog({
      client: new FixtureClient(),
      network: "testnet",
      now: new Date("2026-06-06T00:00:00.000Z")
    });

    expect(scenarios.map((scenario) => scenario.expectedVerdict)).toEqual([
      "ALLOW",
      "WARN",
      "BLOCK",
      "ALLOW",
      "BLOCK"
    ]);
    expect(scenarios.every((scenario) => scenario.intent.actor === senderA)).toBe(true);
    expect(scenarios.every((scenario) => scenario.intent.createdAt === "2026-06-06T00:00:00.000Z")).toBe(true);
  });
});
