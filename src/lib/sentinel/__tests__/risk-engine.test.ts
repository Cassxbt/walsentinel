import { describe, expect, it } from "vitest";
import { evaluateRisk } from "../risk-engine";
import type { AgentIntent, SuiContextSnapshot } from "../types";

const baseIntent: AgentIntent = {
  id: "intent",
  kind: "sui-transfer",
  network: "testnet",
  actor: "0xactor",
  target: "0xtarget",
  amountMist: "100",
  description: "Test action",
  createdAt: "2026-06-01T00:00:00.000Z"
};

const baseContext: SuiContextSnapshot = {
  network: "testnet",
  rpcUrl: "https://sui-testnet.gateway.tatum.io",
  checkedAt: "2026-06-01T00:00:01.000Z",
  actorBalance: {
    totalBalanceMist: "1000000000",
    coinType: "0x2::sui::SUI"
  },
  ownedObjects: [{ objectId: "0xcoin", type: "0x2::coin::Coin<0x2::sui::SUI>" }],
  targetObject: { objectId: "0xtarget", type: "known-recipient" },
  recentTransactions: [{ digest: "digest", status: "success" }],
  dryRunStatus: "not-run",
  rawRpc: {}
};

describe("evaluateRisk", () => {
  it("allows low-value known transfers", () => {
    const result = evaluateRisk(baseIntent, baseContext);
    expect(result.verdict).toBe("ALLOW");
    expect(result.score).toBeLessThan(20);
  });

  it("warns for unknown recipient with moderate balance impact", () => {
    const result = evaluateRisk(
      { ...baseIntent, amountMist: "250000000" },
      { ...baseContext, targetObject: undefined, recentTransactions: [] }
    );
    expect(result.verdict).toBe("WARN");
    expect(result.findings.map((finding) => finding.id)).toContain("moderate-balance-impact");
  });

  it("blocks failed dry-runs", () => {
    const result = evaluateRisk(baseIntent, { ...baseContext, dryRunStatus: "failure" });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.map((finding) => finding.id)).toContain("dry-run-failed");
  });

  it("blocks high-risk package functions", () => {
    const result = evaluateRisk(
      {
        ...baseIntent,
        kind: "package-interaction",
        packageId: "0xpackage",
        moduleName: "vault",
        functionName: "sweep_all"
      },
      baseContext
    );
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.map((finding) => finding.id)).toContain("high-risk-function-name");
  });
});
