export type SuiNetwork = "mainnet" | "testnet" | "devnet";

export type AgentActionKind = "sui-transfer" | "package-interaction";

export type SentinelVerdict = "ALLOW" | "WARN" | "BLOCK";

export type RiskSeverity = "info" | "warning" | "critical";

export interface AgentIntent {
  id: string;
  kind: AgentActionKind;
  network: SuiNetwork;
  actor: string;
  target: string;
  amountMist?: string;
  packageId?: string;
  moduleName?: string;
  functionName?: string;
  description: string;
  createdAt: string;
}

export interface SuiBalanceSnapshot {
  totalBalanceMist: string;
  coinType: string;
}

export interface SuiObjectSnapshot {
  objectId: string;
  type?: string;
  owner?: string;
  digest?: string;
  version?: string;
}

export interface SuiTransactionSummary {
  digest: string;
  timestampMs?: string;
  status?: "success" | "failure" | "unknown";
}

export interface SuiContextSnapshot {
  network: SuiNetwork;
  rpcUrl: string;
  checkedAt: string;
  actorBalance?: SuiBalanceSnapshot;
  ownedObjects: SuiObjectSnapshot[];
  targetObject?: SuiObjectSnapshot;
  recentTransactions: SuiTransactionSummary[];
  dryRunStatus?: "success" | "failure" | "not-run";
  rawRpc: Record<string, unknown>;
}

export interface RiskFinding {
  id: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  evidenceKey: string;
}

export interface RiskResult {
  verdict: SentinelVerdict;
  score: number;
  findings: RiskFinding[];
}

export interface WalrusEvidencePack {
  schemaVersion: "1.0";
  appName: "Walrus Sentinel";
  intent: AgentIntent;
  context: SuiContextSnapshot;
  risk: RiskResult;
  reportMarkdown: string;
  createdAt: string;
}

export interface WalrusStoreResult {
  blobId: string;
  blobObjectId?: string;
  txDigest?: string;
  endEpoch?: number;
  raw: unknown;
}

export interface SentinelReceipt {
  schemaVersion: "1.0";
  receiptId: string;
  verdict: SentinelVerdict;
  riskScore: number;
  evidenceHash: string;
  walrusBlobId: string;
  walrusBlobObjectId?: string;
  walrusTxDigest?: string;
  network: SuiNetwork;
  actor: string;
  target: string;
  createdAt: string;
}

export interface ReviewScenario {
  label: string;
  expectedVerdict: SentinelVerdict;
  intent: AgentIntent;
}
