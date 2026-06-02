"use client";

import { Bot, DatabaseZap, Loader2, Play, Route, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { DEMO_SCENARIOS } from "@/lib/sentinel/demo-scenarios";
import type { RiskResult, SentinelReceipt, WalrusEvidencePack } from "@/lib/sentinel/types";
import { ReceiptViewer } from "./receipt-viewer";
import { VerdictBadge } from "./verdict-badge";

interface AnalyzeResponse {
  risk: RiskResult;
  evidence: WalrusEvidencePack;
  receipt: SentinelReceipt;
}

export function SentinelDashboard() {
  const [scenarioId, setScenarioId] = useState(DEMO_SCENARIOS[0].intent.id);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [history, setHistory] = useState<SentinelReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scenario = useMemo(
    () => DEMO_SCENARIOS.find((item) => item.intent.id === scenarioId) ?? DEMO_SCENARIOS[0],
    [scenarioId]
  );
  const agentPayload = useMemo(() => {
    const intent = scenario.intent;
    return JSON.stringify(
      {
        endpoint: "/api/agent/check",
        method: "POST",
        body: {
          id: intent.id,
          kind: intent.kind,
          network: intent.network,
          target: intent.target,
          amountMist: intent.amountMist,
          packageId: intent.packageId,
          moduleName: intent.moduleName,
          functionName: intent.functionName
        }
      },
      null,
      2
    );
  }, [scenario.intent]);
  const agentDecision =
    result?.risk.verdict === "ALLOW"
      ? "Proceed"
      : result?.risk.verdict === "WARN"
        ? "Request review"
        : result?.risk.verdict === "BLOCK"
          ? "Refuse execution"
          : "Awaiting pre-flight";

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...scenario.intent, createdAt: new Date().toISOString() })
    });
    const payload = (await response.json()) as AnalyzeResponse | { error: string };
    setLoading(false);

    if (!response.ok || "error" in payload) {
      setError("error" in payload ? payload.error : "Analysis failed");
      return;
    }

    setResult(payload);
    setHistory((current) => [payload.receipt, ...current].slice(0, 5));
  }

  return (
    <div className="dashboard">
      <section className="panel composer">
        <div className="panel-title">
          <Bot size={20} />
          <h2>Agent action</h2>
        </div>
        <label>
          Demo scenario
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
            {DEMO_SCENARIOS.map((item) => (
              <option key={item.intent.id} value={item.intent.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="intent-box">
          <p>{scenario.intent.description}</p>
          <span>{scenario.intent.kind}</span>
        </div>
        <button className="primary-action" type="button" onClick={runAnalysis} disabled={loading}>
          {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
          Run pre-flight check
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-title">
          <Shield size={20} />
          <h2>Sentinel verdict</h2>
        </div>
        {result ? (
          <>
            <VerdictBadge verdict={result.risk.verdict} />
            <p className="score">Risk score: {result.risk.score}/100</p>
            <ul className="findings">
              {result.risk.findings.length ? (
                result.risk.findings.map((finding) => (
                  <li key={finding.id}>
                    <strong>{finding.title}</strong>
                    <span>{finding.detail}</span>
                  </li>
                ))
              ) : (
                <li>
                  <strong>No material findings</strong>
                  <span>The action passed the configured pre-flight checks.</span>
                </li>
              )}
            </ul>
          </>
        ) : (
          <p className="muted">No verdict yet.</p>
        )}
      </section>

      <section className="panel agent-panel">
        <div className="panel-title">
          <Route size={20} />
          <h2>Agent handoff</h2>
        </div>
        <div className="agent-flow">
          <div>
            <span>Agent request</span>
            <code>{agentPayload}</code>
          </div>
          <div>
            <span>Sentinel response</span>
            <strong>{result ? result.risk.verdict : "PENDING"}</strong>
            <p>{agentDecision}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <DatabaseZap size={20} />
          <h2>Walrus evidence</h2>
        </div>
        {result ? (
          <dl className="receipt-grid">
            <div>
              <dt>Blob ID</dt>
              <dd>{result.receipt.walrusBlobId}</dd>
            </div>
            <div>
              <dt>Stored verdict</dt>
              <dd>{result.receipt.verdict}</dd>
            </div>
            <div>
              <dt>Hash</dt>
              <dd>{result.receipt.evidenceHash}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">Awaiting evidence pack.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <DatabaseZap size={20} />
          <h2>Session receipts</h2>
        </div>
        {history.length ? (
          <ul className="history-list">
            {history.map((receipt) => (
              <li key={receipt.receiptId}>
                <span>{receipt.verdict}</span>
                <code>{receipt.walrusBlobId}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No receipts in this session.</p>
        )}
      </section>

      <ReceiptViewer key={result?.receipt.receiptId ?? "empty-receipt"} receipt={result?.receipt ?? null} />
    </div>
  );
}
