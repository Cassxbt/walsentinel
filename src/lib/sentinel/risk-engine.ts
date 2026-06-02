import type { AgentIntent, RiskFinding, RiskResult, SentinelVerdict, SuiContextSnapshot } from "./types";

const MIST_PER_SUI = 1_000_000_000n;
const riskyFunctionTerms = ["sweep", "drain", "withdraw_all", "transfer_all", "admin"];

function balanceImpactPercent(intent: AgentIntent, context: SuiContextSnapshot): number {
  if (!intent.amountMist || !context.actorBalance?.totalBalanceMist) {
    return 0;
  }

  const amount = BigInt(intent.amountMist);
  const balance = BigInt(context.actorBalance.totalBalanceMist);
  if (balance === 0n) {
    return 100;
  }

  return Number((amount * 10_000n) / balance) / 100;
}

function scoreToVerdict(score: number, findings: RiskFinding[]): SentinelVerdict {
  if (findings.some((finding) => finding.severity === "critical") || score >= 70) {
    return "BLOCK";
  }

  if (findings.some((finding) => finding.severity === "warning") || score >= 25) {
    return "WARN";
  }

  return "ALLOW";
}

export function evaluateRisk(intent: AgentIntent, context: SuiContextSnapshot): RiskResult {
  const findings: RiskFinding[] = [];
  let score = 5;

  if (intent.kind === "package-interaction" && !context.targetObject) {
    score += 20;
    findings.push({
      id: "unknown-target",
      severity: "warning",
      title: "Target has no fetched object metadata",
      detail: "Tatum RPC did not return target object metadata for this action.",
      evidenceKey: "context.targetObject"
    });
  }

  const impact = balanceImpactPercent(intent, context);
  if (impact >= 50) {
    score += 50;
    findings.push({
      id: "high-balance-impact",
      severity: "critical",
      title: "Transfer uses at least half of available balance",
      detail: `The proposed transfer is ${impact.toFixed(2)}% of the observed SUI balance.`,
      evidenceKey: "intent.amountMist"
    });
  } else if (impact >= 10) {
    score += 20;
    findings.push({
      id: "moderate-balance-impact",
      severity: "warning",
      title: "Transfer has meaningful balance impact",
      detail: `The proposed transfer is ${impact.toFixed(2)}% of the observed SUI balance.`,
      evidenceKey: "intent.amountMist"
    });
  }

  if (context.dryRunStatus === "failure") {
    score += 70;
    findings.push({
      id: "dry-run-failed",
      severity: "critical",
      title: "Dry-run failed",
      detail: "The transaction dry-run reported failure.",
      evidenceKey: "context.dryRunStatus"
    });
  }

  const functionName = intent.functionName?.toLowerCase() ?? "";
  if (intent.kind === "package-interaction" && riskyFunctionTerms.some((term) => functionName.includes(term))) {
    score += 70;
    findings.push({
      id: "high-risk-function-name",
      severity: "critical",
      title: "Package function name indicates asset movement risk",
      detail: `The function "${intent.functionName}" matches a high-risk action pattern.`,
      evidenceKey: "intent.functionName"
    });
  }

  const boundedScore = Math.min(score, 100);

  return {
    verdict: scoreToVerdict(boundedScore, findings),
    score: boundedScore,
    findings
  };
}

export function formatMist(mist: string): string {
  const value = BigInt(mist);
  const whole = value / MIST_PER_SUI;
  const fractional = (value % MIST_PER_SUI).toString().padStart(9, "0").replace(/0+$/, "");
  return fractional ? `${whole}.${fractional} SUI` : `${whole} SUI`;
}
