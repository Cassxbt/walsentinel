import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { verifyEvidenceAgainstReceipt } from "@/lib/sentinel/receipt-service";
import type { SentinelReceipt, WalrusEvidencePack } from "@/lib/sentinel/types";
import { WalrusClient } from "@/lib/sentinel/walrus-client";

const VERIFY_ATTEMPTS = 4;
const VERIFY_RETRY_DELAY_MS = 1_500;

const verifySchema = z.object({
  receipt: z.object({
    schemaVersion: z.literal("1.0"),
    receiptId: z.string(),
    verdict: z.enum(["ALLOW", "WARN", "BLOCK"]),
    riskScore: z.number(),
    evidenceHash: z.string(),
    walrusBlobId: z.string(),
    walrusBlobObjectId: z.string().optional(),
    walrusTxDigest: z.string().optional(),
    network: z.enum(["mainnet", "testnet", "devnet"]),
    actor: z.string(),
    target: z.string(),
    createdAt: z.string()
  })
});

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const { receipt } = verifySchema.parse(await request.json()) as { receipt: SentinelReceipt };
    const walrus = new WalrusClient({
      publisherUrl: env.WALRUS_PUBLISHER_URL,
      aggregatorUrl: env.WALRUS_AGGREGATOR_URL,
      epochs: env.WALRUS_EPOCHS,
      maxAttempts: 1,
      requestTimeoutMs: 8_000
    });
    const evidence = await readEvidenceWithPropagationRetry(walrus, receipt.walrusBlobId);
    if (!evidence) {
      return NextResponse.json(
        {
          status: "propagating",
          error: "Walrus evidence is stored, but the aggregator has not served it yet. Try verification again shortly."
        },
        { status: 202 }
      );
    }

    const verification = verifyEvidenceAgainstReceipt(evidence, receipt);

    return NextResponse.json({ verification, evidence });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown verification error" },
      { status: 400 }
    );
  }
}

async function readEvidenceWithPropagationRetry(
  walrus: WalrusClient,
  blobId: string
): Promise<WalrusEvidencePack | null> {
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt += 1) {
    try {
      return await walrus.readJson<WalrusEvidencePack>(blobId);
    } catch {
      if (attempt === VERIFY_ATTEMPTS) {
        return null;
      }

      await wait(VERIFY_RETRY_DELAY_MS * attempt);
    }
  }

  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
