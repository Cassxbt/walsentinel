import type { AgentIntent, SuiContextSnapshot, SuiObjectSnapshot, SuiTransactionSummary } from "./types";
import type { TatumSuiClient } from "./tatum-sui-client";

interface BalanceResponse {
  coinType?: string;
  totalBalance?: string;
}

interface OwnedObjectsResponse {
  data?: Array<{
    data?: {
      objectId?: string;
      type?: string;
      digest?: string;
      version?: string;
      owner?: unknown;
    };
  }>;
}

interface ObjectResponse {
  data?: {
    objectId?: string;
    type?: string;
    digest?: string;
    version?: string;
    owner?: unknown;
  };
}

interface TransactionsResponse {
  data?: Array<{
    digest?: string;
    timestampMs?: string;
    effects?: {
      status?: {
        status?: "success" | "failure";
      };
    };
  }>;
}

function mapObject(data?: ObjectResponse["data"]): SuiObjectSnapshot | undefined {
  if (!data?.objectId) {
    return undefined;
  }

  return {
    objectId: data.objectId,
    type: data.type,
    digest: data.digest,
    version: data.version,
    owner: typeof data.owner === "string" ? data.owner : JSON.stringify(data.owner)
  };
}

export async function buildSuiContext(
  intent: AgentIntent,
  client: TatumSuiClient,
  rpcUrl: string,
  now = new Date()
): Promise<SuiContextSnapshot> {
  const rawRpc: Record<string, unknown> = {};

  const balance = await client.rpc<BalanceResponse>("suix_getBalance", [intent.actor]);
  rawRpc.suix_getBalance = balance;

  const ownedObjects = await client.rpc<OwnedObjectsResponse>("suix_getOwnedObjects", [
    intent.actor,
    {
      options: {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true
      }
    },
    null,
    10
  ]);
  rawRpc.suix_getOwnedObjects = ownedObjects;

  let targetObject: SuiObjectSnapshot | undefined;
  try {
    const target = await client.rpc<ObjectResponse>("sui_getObject", [
      intent.target,
      {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true
      }
    ]);
    rawRpc.sui_getObject = target;
    targetObject = mapObject(target.data);
  } catch (error) {
    rawRpc.sui_getObject = {
      error: error instanceof Error ? error.message : "Unknown target lookup error"
    };
  }

  const transactions = await client.rpc<TransactionsResponse>("suix_queryTransactionBlocks", [
    {
      filter: {
        FromAddress: intent.actor
      },
      options: {
        showEffects: true
      }
    },
    null,
    5,
    true
  ]);
  rawRpc.suix_queryTransactionBlocks = transactions;

  const ownedObjectSnapshots =
    ownedObjects.data
      ?.map((item) => mapObject(item.data))
      .filter((item): item is SuiObjectSnapshot => Boolean(item)) ?? [];
  const recentTransactions: SuiTransactionSummary[] =
    transactions.data?.map((tx) => ({
      digest: tx.digest ?? "unknown",
      timestampMs: tx.timestampMs,
      status: tx.effects?.status?.status ?? "unknown"
    })) ?? [];

  return {
    network: intent.network,
    rpcUrl,
    checkedAt: now.toISOString(),
    actorBalance: {
      totalBalanceMist: balance.totalBalance ?? "0",
      coinType: balance.coinType ?? "0x2::sui::SUI"
    },
    ownedObjects: ownedObjectSnapshots,
    targetObject,
    recentTransactions,
    dryRunStatus: "not-run",
    rawRpc
  };
}
