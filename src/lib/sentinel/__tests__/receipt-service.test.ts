import { describe, expect, it } from "vitest";
import { createReceipt, hashEvidencePack, verifyEvidenceAgainstReceipt } from "../receipt-service";
import type { WalrusEvidencePack, WalrusStoreResult } from "../types";

const evidence: WalrusEvidencePack = {
  schemaVersion: "1.0",
  appName: "Walrus Sentinel",
  createdAt: "2026-06-01T00:00:00.000Z",
  intent: {
    id: "intent-1",
    kind: "sui-transfer",
    network: "testnet",
    actor: "0xabc",
    target: "0xdef",
    amountMist: "100",
    description: "Test transfer",
    createdAt: "2026-06-01T00:00:00.000Z"
  },
  context: {
    network: "testnet",
    rpcUrl: "https://sui-testnet.gateway.tatum.io",
    checkedAt: "2026-06-01T00:00:01.000Z",
    ownedObjects: [],
    recentTransactions: [],
    dryRunStatus: "not-run",
    rawRpc: {}
  },
  risk: {
    verdict: "ALLOW",
    score: 5,
    findings: []
  },
  reportMarkdown: "# Report"
};

const walrus: WalrusStoreResult = {
  blobId: "blob-123",
  blobObjectId: "0xblob",
  txDigest: "digest-123",
  endEpoch: 10,
  raw: { ok: true }
};

describe("receipt-service", () => {
  it("creates stable sha256 evidence hashes", () => {
    expect(hashEvidencePack(evidence)).toHaveLength(64);
    expect(hashEvidencePack(evidence)).toBe(hashEvidencePack({ ...evidence }));
  });

  it("creates receipts from evidence and Walrus result", () => {
    const receipt = createReceipt(evidence, walrus);
    expect(receipt.receiptId).toBe("intent-1:blob-123");
    expect(receipt.walrusBlobId).toBe("blob-123");
    expect(receipt.verdict).toBe("ALLOW");
    expect(receipt.evidenceHash).toBe(hashEvidencePack(evidence));
  });

  it("verifies matching evidence", () => {
    const receipt = createReceipt(evidence, walrus);
    expect(verifyEvidenceAgainstReceipt(evidence, receipt)).toEqual({
      ok: true,
      expectedHash: receipt.evidenceHash,
      actualHash: receipt.evidenceHash
    });
  });
});
