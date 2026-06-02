import { createReceipt } from "./receipt-service";
import { evaluateRisk } from "./risk-engine";
import type { AgentIntent, SentinelReceipt, SuiContextSnapshot, WalrusEvidencePack, WalrusStoreResult } from "./types";

interface AnalyzeIntentDeps {
  buildContext: (intent: AgentIntent) => Promise<SuiContextSnapshot>;
  storeEvidence: (evidence: WalrusEvidencePack) => Promise<WalrusStoreResult>;
  now?: () => Date;
}

export interface AnalyzeIntentResult {
  intent: AgentIntent;
  context: SuiContextSnapshot;
  risk: ReturnType<typeof evaluateRisk>;
  evidence: WalrusEvidencePack;
  receipt: SentinelReceipt;
}

function reportMarkdown(evidence: Omit<WalrusEvidencePack, "reportMarkdown">): string {
  const findings = evidence.risk.findings.length
    ? evidence.risk.findings.map((finding) => `- ${finding.severity.toUpperCase()}: ${finding.title}`).join("\n")
    : "- No material findings.";

  return [
    "# Walrus Sentinel Evidence Report",
    "",
    `Intent: ${evidence.intent.description}`,
    `Verdict: ${evidence.risk.verdict}`,
    `Risk score: ${evidence.risk.score}`,
    "",
    "## Findings",
    findings,
    "",
    "## Verification",
    "This report is part of a canonical JSON evidence pack stored on Walrus."
  ].join("\n");
}

export async function analyzeIntent(intent: AgentIntent, deps: AnalyzeIntentDeps): Promise<AnalyzeIntentResult> {
  const context = await deps.buildContext(intent);
  const risk = evaluateRisk(intent, context);
  const createdAt = (deps.now ?? (() => new Date()))().toISOString();
  const evidenceBase = {
    schemaVersion: "1.0" as const,
    appName: "Walrus Sentinel" as const,
    intent,
    context,
    risk,
    createdAt
  };
  const evidence: WalrusEvidencePack = {
    ...evidenceBase,
    reportMarkdown: reportMarkdown(evidenceBase)
  };
  const walrus = await deps.storeEvidence(evidence);
  const receipt = createReceipt(evidence, walrus);

  return {
    intent,
    context,
    risk,
    evidence,
    receipt
  };
}
