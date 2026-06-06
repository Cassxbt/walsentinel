import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { buildScenarioCatalog } from "@/lib/sentinel/scenario-catalog";
import type { ReviewScenario, SuiNetwork } from "@/lib/sentinel/types";
import { TatumSuiClient } from "@/lib/sentinel/tatum-sui-client";

export const dynamic = "force-dynamic";

interface CachedScenarioCatalog {
  source: "Tatum Sui RPC";
  network: SuiNetwork;
  generatedAt: string;
  scenarios: ReviewScenario[];
}

let cachedCatalog: CachedScenarioCatalog | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET() {
  try {
    const env = getEnv();
    if (cachedCatalog && Date.now() - Date.parse(cachedCatalog.generatedAt) < CACHE_TTL_MS) {
      return NextResponse.json(cachedCatalog, {
        headers: {
          "Cache-Control": "no-store",
          "x-sentinel-cache": "hit"
        }
      });
    }

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
    cachedCatalog = {
      source: "Tatum Sui RPC",
      network: env.TATUM_SUI_NETWORK,
      generatedAt: generatedAt.toISOString(),
      scenarios
    };

    return NextResponse.json(cachedCatalog, {
      headers: {
        "Cache-Control": "no-store",
        "x-sentinel-cache": "miss"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Live scenario catalog unavailable"
      },
      { status: 503 }
    );
  }
}
