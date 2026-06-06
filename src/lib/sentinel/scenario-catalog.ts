import type { AgentIntent, ReviewScenario, SentinelVerdict, SuiNetwork } from "./types";

interface RpcClient {
  rpc<T>(method: string, params?: unknown[]): Promise<T>;
}

interface BalanceResponse {
  totalBalance?: string;
}

interface TransactionBlocksResponse {
  data?: Array<{
    transaction?: {
      data?: {
        sender?: string;
      };
    };
  }>;
}

interface ScenarioCatalogOptions {
  client: RpcClient;
  network: SuiNetwork;
  now?: Date;
}

interface LiveActor {
  address: string;
  balanceMist: bigint;
}

const SUI_FRAMEWORK_PACKAGE = "0x2";
const MIN_SCENARIO_BALANCE_MIST = 100_000_000n;

function isRealSuiAddress(value: string | undefined): value is string {
  if (!value || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized !== "0x0" && !/^0x0+$/.test(normalized);
}

function amountAtBasisPoints(balanceMist: bigint, basisPoints: bigint): string {
  const amount = (balanceMist * basisPoints) / 10_000n;
  return (amount > 0n ? amount : 1n).toString();
}

async function getRecentSenders(client: RpcClient): Promise<string[]> {
  const response = await client.rpc<TransactionBlocksResponse>("suix_queryTransactionBlocks", [
    {
      options: {
        showInput: true,
        showEffects: true
      }
    },
    null,
    25,
    true
  ]);

  return [
    ...new Set(
      (response.data ?? [])
        .map((item) => item.transaction?.data?.sender)
        .filter(isRealSuiAddress)
    )
  ];
}

async function findLiveActor(client: RpcClient, senders: string[]): Promise<LiveActor> {
  for (const sender of senders) {
    const balance = await client.rpc<BalanceResponse>("suix_getBalance", [sender]);
    const balanceMist = BigInt(balance.totalBalance ?? "0");
    if (balanceMist >= MIN_SCENARIO_BALANCE_MIST) {
      return { address: sender, balanceMist };
    }
  }

  throw new Error("No recent Sui sender with sufficient live balance was found.");
}

async function hasMoveFunction(
  client: RpcClient,
  packageId: string,
  moduleName: string,
  functionName: string
): Promise<boolean> {
  try {
    await client.rpc("sui_getNormalizedMoveFunction", [packageId, moduleName, functionName]);
    return true;
  } catch {
    return false;
  }
}

function scenario(
  label: string,
  expectedVerdict: SentinelVerdict,
  intent: Omit<AgentIntent, "createdAt">
): ReviewScenario {
  return {
    label,
    expectedVerdict,
    intent: {
      ...intent,
      createdAt: new Date().toISOString()
    }
  };
}

export async function buildScenarioCatalog(options: ScenarioCatalogOptions): Promise<ReviewScenario[]> {
  const generatedAt = options.now ?? new Date();
  const senders = await getRecentSenders(options.client);
  const actor = await findLiveActor(options.client, senders);
  const transferTarget = senders.find((sender) => sender !== actor.address) ?? actor.address;

  const scenarios: ReviewScenario[] = [];

  scenarios.push(
    scenario("Low-impact SUI transfer", "ALLOW", {
      id: "live-transfer-low-impact",
      kind: "sui-transfer",
      network: options.network,
      actor: actor.address,
      target: transferTarget,
      amountMist: amountAtBasisPoints(actor.balanceMist, 100n),
      description:
        "Agent proposes a low-impact SUI transfer from a live testnet account discovered through Tatum."
    })
  );

  scenarios.push(
    scenario("Review-threshold SUI transfer", "WARN", {
      id: "live-transfer-review-threshold",
      kind: "sui-transfer",
      network: options.network,
      actor: actor.address,
      target: transferTarget,
      amountMist: amountAtBasisPoints(actor.balanceMist, 1_500n),
      description:
        "Agent proposes a 15% balance-impact transfer from the same live account, crossing Sentinel's review threshold."
    })
  );

  scenarios.push(
    scenario("High-impact SUI transfer", "BLOCK", {
      id: "live-transfer-high-impact",
      kind: "sui-transfer",
      network: options.network,
      actor: actor.address,
      target: transferTarget,
      amountMist: amountAtBasisPoints(actor.balanceMist, 6_000n),
      description:
        "Agent proposes a 60% balance-impact transfer from the live account, crossing Sentinel's block threshold."
    })
  );

  if (await hasMoveFunction(options.client, SUI_FRAMEWORK_PACKAGE, "coin", "value")) {
    scenarios.push(
      scenario("Sui framework value check", "ALLOW", {
        id: "live-package-framework-value",
        kind: "package-interaction",
        network: options.network,
        actor: actor.address,
        target: SUI_FRAMEWORK_PACKAGE,
        packageId: SUI_FRAMEWORK_PACKAGE,
        moduleName: "coin",
        functionName: "value",
        description:
          "Agent proposes a real Sui framework package interaction verified through Tatum metadata."
      })
    );
  }

  if (await hasMoveFunction(options.client, SUI_FRAMEWORK_PACKAGE, "balance", "withdraw_all")) {
    scenarios.push(
      scenario("Sui framework withdraw-all call", "BLOCK", {
        id: "live-package-withdraw-all",
        kind: "package-interaction",
        network: options.network,
        actor: actor.address,
        target: SUI_FRAMEWORK_PACKAGE,
        packageId: SUI_FRAMEWORK_PACKAGE,
        moduleName: "balance",
        functionName: "withdraw_all",
        description:
          "Agent proposes a real Sui framework withdraw_all function; Sentinel blocks it before execution."
      })
    );
  }

  return scenarios.map((item) => ({
    ...item,
    intent: {
      ...item.intent,
      createdAt: generatedAt.toISOString()
    }
  }));
}
