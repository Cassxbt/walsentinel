import { describe, expect, it } from "vitest";
import { analyzeIntent } from "../analyze-intent";
import type { AgentIntent, SuiContextSnapshot, WalrusStoreResult } from "../types";

const intent: AgentIntent = {
  id: "intent-1",
  kind: "sui-transfer",
  network: "testnet",
  actor: "0xactor",
  target: "0xtarget",
  amountMist: "100",
  description: "Test transfer",
  createdAt: "2026-06-01T00:00:00.000Z"
};

const context: SuiContextSnapshot = {
  network: "testnet",
  rpcUrl: "https://sui-testnet.gateway.tatum.io",
  checkedAt: "2026-06-01T00:00:01.000Z",
  actorBalance: { totalBalanceMist: "1000000000", coinType: "0x2::sui::SUI" },
  ownedObjects: [],
  targetObject: { objectId: "0xtarget", type: "known-recipient" },
  recentTransactions: [{ digest: "digest", status: "success" }],
  dryRunStatus: "not-run",
  rawRpc: { ok: true }
};

const walrus: WalrusStoreResult = {
  blobId: "blob-1",
  raw: { alreadyCertified: { blobId: "blob-1" } }
};

describe("analyzeIntent", () => {
  it("creates evidence, stores it, and returns a receipt", async () => {
    const result = await analyzeIntent(intent, {
      buildContext: async () => context,
      storeEvidence: async () => walrus,
      now: () => new Date("2026-06-01T00:00:02.000Z")
    });

    expect(result.risk.verdict).toBe("ALLOW");
    expect(result.evidence.intent.id).toBe("intent-1");
    expect(result.receipt.walrusBlobId).toBe("blob-1");
    expect(result.receipt.evidenceHash).toHaveLength(64);
  });
});
