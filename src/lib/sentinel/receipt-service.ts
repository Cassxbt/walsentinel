import { createHash } from "node:crypto";
import { canonicalJson } from "./canonical-json";
import type { SentinelReceipt, WalrusEvidencePack, WalrusStoreResult } from "./types";

export interface ReceiptVerificationResult {
  ok: boolean;
  expectedHash: string;
  actualHash: string;
}

export function hashEvidencePack(evidence: WalrusEvidencePack): string {
  return createHash("sha256").update(canonicalJson(evidence)).digest("hex");
}

export function createReceipt(
  evidence: WalrusEvidencePack,
  walrus: WalrusStoreResult
): SentinelReceipt {
  return {
    schemaVersion: "1.0",
    receiptId: `${evidence.intent.id}:${walrus.blobId}`,
    verdict: evidence.risk.verdict,
    riskScore: evidence.risk.score,
    evidenceHash: hashEvidencePack(evidence),
    walrusBlobId: walrus.blobId,
    walrusBlobObjectId: walrus.blobObjectId,
    walrusTxDigest: walrus.txDigest,
    network: evidence.intent.network,
    actor: evidence.intent.actor,
    target: evidence.intent.target,
    createdAt: evidence.createdAt
  };
}

export function verifyEvidenceAgainstReceipt(
  evidence: WalrusEvidencePack,
  receipt: SentinelReceipt
): ReceiptVerificationResult {
  const actualHash = hashEvidencePack(evidence);
  return {
    ok: actualHash === receipt.evidenceHash,
    expectedHash: receipt.evidenceHash,
    actualHash
  };
}
