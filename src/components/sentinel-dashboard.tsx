"use client";

import { Bot, Check, Copy, DatabaseZap, Loader2, Play, Route, Shield } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { ReviewScenario, RiskResult, SentinelReceipt, SuiNetwork, WalrusEvidencePack } from "@/lib/sentinel/types";
import { ReceiptViewer } from "./receipt-viewer";
import { VerdictBadge } from "./verdict-badge";

interface AnalyzeResponse {
  risk: RiskResult;
  evidence: WalrusEvidencePack;
  receipt: SentinelReceipt;
}

interface ScenarioCatalogResponse {
  source: string;
  network: SuiNetwork;
  generatedAt: string;
  scenarios: ReviewScenario[];
}

export function SentinelDashboard() {
  const [catalog, setCatalog] = useState<ScenarioCatalogResponse | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [history, setHistory] = useState<SentinelReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const scenarios = useMemo(() => catalog?.scenarios ?? [], [catalog]);
  const scenario = useMemo(
    () => scenarios.find((item) => item.intent.id === scenarioId) ?? null,
    [scenarioId, scenarios]
  );
  const agentPayload = useMemo(() => {
    if (!scenario) {
      return JSON.stringify(
        {
          endpoint: "/api/scenarios",
          method: "GET",
          status: "live catalog required"
        },
        null,
        2
      );
    }

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
  }, [scenario]);
  const agentDecision =
    result?.risk.verdict === "ALLOW"
      ? "Proceed"
      : result?.risk.verdict === "WARN"
        ? "Request review"
        : result?.risk.verdict === "BLOCK"
          ? "Refuse execution"
          : "Awaiting live review";
  const agentResponse = useMemo(() => {
    if (!result) {
      return JSON.stringify(
        {
          status: "pending",
          nextAction: "load a live scenario, then call /api/agent/check before execution"
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
  const runState = loading ? "checking" : result ? "complete" : "idle";
  const runSteps = [
    "Normalize intent",
    "Pull Tatum context",
    "Score policy",
    "Write Walrus receipt"
  ];

  useEffect(() => {
    let active = true;

    async function loadScenarios() {
      try {
        const response = await fetch("/api/scenarios", { cache: "no-store" });
        const payload = (await response.json()) as ScenarioCatalogResponse | { error: string };
        if (!active) {
          return;
        }

        if (!response.ok || "error" in payload) {
          setCatalog(null);
          setScenarioId(null);
          setError("error" in payload ? payload.error : "Live scenario catalog unavailable.");
          return;
        }

        setCatalog(payload);
        setScenarioId(payload.scenarios[0]?.intent.id ?? null);
      } catch {
        if (active) {
          setCatalog(null);
          setScenarioId(null);
          setError("Live scenario catalog unavailable.");
        }
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    }

    void loadScenarios();

    return () => {
      active = false;
    };
  }, []);

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
    if (!scenario) {
      setError("Select a live scenario before running Sentinel.");
      return;
    }

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
          Live agent action
          <select
            value={scenarioId ?? ""}
            onChange={(event) => selectScenario(event.target.value)}
            disabled={loading || catalogLoading || !scenarios.length}
          >
            {scenarios.map((item) => (
              <option key={item.intent.id} value={item.intent.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {catalog ? (
          <p className="catalog-source">
            Source: {catalog.source} on {catalog.network}. Generated{" "}
            {new Date(catalog.generatedAt).toLocaleTimeString()}.
          </p>
        ) : null}
        {catalogLoading ? (
          <div className="receipt-loading">
            <span className="monitor-skeleton" />
            <span className="monitor-skeleton tall" />
          </div>
        ) : scenario ? (
          <div className="intent-box">
            <p>{scenario.intent.description}</p>
            <span>
              {scenario.intent.kind} · expected {scenario.expectedVerdict}
            </span>
          </div>
        ) : (
          <div className="intent-box">
            <p>Live scenario discovery is unavailable. Sentinel does not fall back to synthetic data.</p>
            <span>Tatum Sui RPC required</span>
          </div>
        )}
        <ol className={`state-track ${runState}`} aria-label="Pre-flight progress">
          {runSteps.map((step, index) => (
            <li key={step} style={{ "--step-index": index } as CSSProperties}>
              <span />
              {step}
            </li>
          ))}
        </ol>
        <button
          className="primary-action"
          type="button"
          onClick={runAnalysis}
          disabled={loading || catalogLoading || !scenario}
        >
          {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
          {loading ? "Running checks" : "Run pre-flight check"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel verdict-panel" aria-live="polite">
        <div className="panel-title">
          <Shield size={20} />
          <h2>Sentinel verdict</h2>
        </div>
        {loading ? (
          <div className="verdict-loading">
            <span className="monitor-skeleton short" />
            <span className="monitor-skeleton" />
            <span className="monitor-skeleton" />
            <span className="monitor-skeleton" />
          </div>
        ) : result ? (
          <div className="verdict-reveal" key={result.receipt.receiptId}>
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
                  <span>The action passed the configured Sentinel policy checks.</span>
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="muted">Select a live action and run Sentinel to generate a verdict.</p>
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
        {loading ? (
          <div className="receipt-loading">
            <span className="monitor-skeleton" />
            <span className="monitor-skeleton" />
            <span className="monitor-skeleton tall" />
          </div>
        ) : result ? (
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
          <p className="muted">Walrus evidence appears after a live review completes.</p>
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
          <p className="muted">Receipts from this browser session will appear here.</p>
        )}
      </section>

      <ReceiptViewer key={result?.receipt.receiptId ?? "empty-receipt"} receipt={result?.receipt ?? null} />
    </div>
  );
}
