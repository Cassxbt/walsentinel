"use client";

import { Bot, Check, Copy, DatabaseZap, Loader2, Play, Route, Shield } from "lucide-react";
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
  const [copied, setCopied] = useState<string | null>(null);
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
          actor: intent.actor,
          target: intent.target,
          amountMist: intent.amountMist,
          packageId: intent.packageId,
          moduleName: intent.moduleName,
          functionName: intent.functionName,
          description: intent.description
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
  const agentResponse = useMemo(() => {
    if (!result) {
      return JSON.stringify(
        {
          status: "pending",
          nextAction: "call /api/agent/check before execution"
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        verdict: result.risk.verdict,
        nextAction: agentDecision,
        riskScore: result.risk.score,
        findings: result.risk.findings.map((finding) => finding.id),
        walrusBlobId: result.receipt.walrusBlobId,
        evidenceHash: result.receipt.evidenceHash
      },
      null,
      2
    );
  }, [agentDecision, result]);

  async function copyValue(key: string, value: string) {
    let nextStatus = key;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      nextStatus = "copy-failed";
    }
    setCopied(nextStatus);
    window.setTimeout(() => {
      setCopied((current) => (current === nextStatus ? null : current));
    }, 1600);
  }

  function selectScenario(value: string) {
    setScenarioId(value);
    setResult(null);
    setError(null);
    setCopied(null);
  }

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
          <select
            value={scenarioId}
            onChange={(event) => selectScenario(event.target.value)}
            disabled={loading}
          >
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

      <section className="panel agent-panel" id="agent">
        <div className="panel-title">
          <Route size={20} />
          <h2>Agent handoff</h2>
        </div>
        <div className="agent-flow">
          <div>
            <div className="copy-row">
              <span>Agent request</span>
              <button
                type="button"
                onClick={() => copyValue("agent-request", agentPayload)}
                aria-label="Copy agent request"
              >
                {copied === "agent-request" ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <code>{agentPayload}</code>
          </div>
          <div>
            <div className="copy-row">
              <span>Sentinel response</span>
              <button
                type="button"
                onClick={() => copyValue("agent-response", agentResponse)}
                aria-label="Copy Sentinel response"
              >
                {copied === "agent-response" ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <strong>{result ? result.risk.verdict : "PENDING"}</strong>
            <p>{agentDecision}</p>
            <code>{agentResponse}</code>
          </div>
        </div>
        {copied ? (
          <p className="copy-status">
            {copied === "copy-failed" ? "Copy unavailable." : "Copied."}
          </p>
        ) : null}
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
