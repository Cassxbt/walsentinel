export type HealthStatus = "ready" | "degraded";

export interface HealthReport {
  status: HealthStatus;
  checkedAt: string;
  app: {
    name: string;
    version: string;
    environment: string;
  };
  runtime: {
    nodeEnv: string;
    vercelEnv: string;
    appUrl: UrlStatus;
  };
  services: {
    tatum: {
      configured: boolean;
      network: "mainnet" | "testnet" | "devnet";
      rpcUrl: UrlStatus;
    };
    walrus: {
      publisherUrl: UrlStatus;
      aggregatorUrl: UrlStatus;
      epochs: number;
    };
  };
  missing: string[];
  invalid: string[];
}

interface UrlStatus {
  configured: boolean;
  origin: string | null;
  path: string | null;
}

const REQUIRED_KEYS = ["TATUM_API_KEY", "WALRUS_PUBLISHER_URL", "WALRUS_AGGREGATOR_URL"] as const;
const NETWORKS = ["mainnet", "testnet", "devnet"] as const;

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNetwork(value: string | undefined): HealthReport["services"]["tatum"]["network"] {
  return NETWORKS.includes(value as HealthReport["services"]["tatum"]["network"])
    ? (value as HealthReport["services"]["tatum"]["network"])
    : "testnet";
}

function parseEpochs(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function sanitizeUrl(value: string | undefined): UrlStatus {
  const rawValue = value?.trim();
  if (!rawValue) {
    return { configured: false, origin: null, path: null };
  }

  try {
    const url = new URL(rawValue);
    return {
      configured: true,
      origin: url.origin,
      path: url.pathname === "/" ? null : url.pathname
    };
  } catch {
    return { configured: false, origin: null, path: null };
  }
}

export function buildHealthReport(
  env: Record<string, string | undefined> = process.env,
  checkedAt: Date = new Date()
): HealthReport {
  const missing = REQUIRED_KEYS.filter((key) => !hasValue(env[key]));
  const publisherUrl = sanitizeUrl(env.WALRUS_PUBLISHER_URL);
  const aggregatorUrl = sanitizeUrl(env.WALRUS_AGGREGATOR_URL);
  const rpcUrl = sanitizeUrl(env.TATUM_SUI_RPC_URL ?? "https://sui-testnet.gateway.tatum.io");
  const appUrl = sanitizeUrl(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const invalid = [
    hasValue(env.WALRUS_PUBLISHER_URL) && !publisherUrl.configured ? "WALRUS_PUBLISHER_URL" : null,
    hasValue(env.WALRUS_AGGREGATOR_URL) && !aggregatorUrl.configured ? "WALRUS_AGGREGATOR_URL" : null,
    !rpcUrl.configured ? "TATUM_SUI_RPC_URL" : null,
    !appUrl.configured ? "NEXT_PUBLIC_APP_URL" : null
  ].filter((item): item is string => item !== null);

  return {
    status: missing.length || invalid.length ? "degraded" : "ready",
    checkedAt: checkedAt.toISOString(),
    app: {
      name: "Walrus Sentinel",
      version: "0.1.0",
      environment: env.VERCEL_ENV ?? env.NODE_ENV ?? "local"
    },
    runtime: {
      nodeEnv: env.NODE_ENV ?? "development",
      vercelEnv: env.VERCEL_ENV ?? "local",
      appUrl
    },
    services: {
      tatum: {
        configured: hasValue(env.TATUM_API_KEY),
        network: parseNetwork(env.TATUM_SUI_NETWORK),
        rpcUrl
      },
      walrus: {
        publisherUrl,
        aggregatorUrl,
        epochs: parseEpochs(env.WALRUS_EPOCHS)
      }
    },
    missing,
    invalid
  };
}
