import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { analyzeIntent } from "@/lib/sentinel/analyze-intent";
import { buildSuiContext } from "@/lib/sentinel/sui-context";
import { TatumSuiClient } from "@/lib/sentinel/tatum-sui-client";
import type { AgentIntent } from "@/lib/sentinel/types";
import { WalrusClient } from "@/lib/sentinel/walrus-client";

const suiAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{1,64}$/, "Expected a Sui address")
  .refine((value) => !/^0x0+$/i.test(value), "Zero address is not accepted for live analysis");
const mistAmountSchema = z
  .string()
  .regex(/^[1-9][0-9]*$/, "Expected a positive MIST amount");

const intentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["sui-transfer", "package-interaction"]),
  network: z.enum(["mainnet", "testnet", "devnet"]),
  actor: suiAddressSchema,
  target: suiAddressSchema,
  amountMist: mistAmountSchema.optional(),
  packageId: suiAddressSchema.optional(),
  moduleName: z.string().optional(),
  functionName: z.string().optional(),
  description: z.string().min(1),
  createdAt: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const intent = intentSchema.parse(await request.json()) as AgentIntent;
    const tatum = new TatumSuiClient({
      apiKey: env.TATUM_API_KEY,
      rpcUrl: env.TATUM_SUI_RPC_URL
    });
    const walrus = new WalrusClient({
      publisherUrl: env.WALRUS_PUBLISHER_URL,
      aggregatorUrl: env.WALRUS_AGGREGATOR_URL,
      epochs: env.WALRUS_EPOCHS
    });

    const result = await analyzeIntent(intent, {
      buildContext: (value) => buildSuiContext(value, tatum, env.TATUM_SUI_RPC_URL),
      storeEvidence: (evidence) => walrus.storeJson(evidence)
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown analysis error" },
      { status: 400 }
    );
  }
}
