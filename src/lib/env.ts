import { z } from "zod";

const envSchema = z.object({
  TATUM_API_KEY: z.string().min(1),
  TATUM_ACCOUNT_ID: z.string().optional(),
  TATUM_SUI_NETWORK: z.enum(["mainnet", "testnet", "devnet"]).default("testnet"),
  TATUM_SUI_RPC_URL: z.url().default("https://sui-testnet.gateway.tatum.io"),
  WALRUS_PUBLISHER_URL: z.url(),
  WALRUS_AGGREGATOR_URL: z.url(),
  WALRUS_EPOCHS: z.coerce.number().int().positive().default(1),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000")
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing or invalid server environment: ${fields}`);
  }

  return parsed.data;
}
