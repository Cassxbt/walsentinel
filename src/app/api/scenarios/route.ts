import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { buildScenarioCatalog } from "@/lib/sentinel/scenario-catalog";
import { TatumSuiClient } from "@/lib/sentinel/tatum-sui-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getEnv();
    const tatum = new TatumSuiClient({
      apiKey: env.TATUM_API_KEY,
      rpcUrl: env.TATUM_SUI_RPC_URL
    });
    const generatedAt = new Date();
    const scenarios = await buildScenarioCatalog({
      client: tatum,
      network: env.TATUM_SUI_NETWORK,
      now: generatedAt
    });

    return NextResponse.json(
      {
        source: "Tatum Sui RPC",
        network: env.TATUM_SUI_NETWORK,
        generatedAt: generatedAt.toISOString(),
        scenarios
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Live scenario catalog unavailable"
      },
      { status: 503 }
    );
  }
}
