"use client";

import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HealthReport } from "@/lib/sentinel/health";

type MonitorState =
  | { status: "loading"; report: null; error: null }
  | { status: "loaded"; report: HealthReport; error: null }
  | { status: "error"; report: null; error: string };

function formatUrl(url: HealthReport["runtime"]["appUrl"]): string {
  if (!url.configured || !url.origin) {
    return "Not configured";
  }

  return `${url.origin}${url.path ?? ""}`;
}

export function MonitorDashboard() {
  const [state, setState] = useState<MonitorState>({ status: "loading", report: null, error: null });

  async function loadHealth(showLoading = true) {
    if (showLoading) {
      setState({ status: "loading", report: null, error: null });
    }
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const payload = (await response.json()) as HealthReport;
      setState({ status: "loaded", report: payload, error: null });
    } catch {
      setState({ status: "error", report: null, error: "Health endpoint did not respond." });
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = (await response.json()) as HealthReport;
        if (active) {
          setState({ status: "loaded", report: payload, error: null });
        }
      } catch {
        if (active) {
          setState({ status: "error", report: null, error: "Health endpoint did not respond." });
        }
      }
    }

    void loadInitialHealth();

    return () => {
      active = false;
    };
  }, []);

  const readiness = useMemo(() => {
    if (!state.report) {
      return [];
    }

    return [
      {
        label: "Tatum API key",
        ready: state.report.services.tatum.configured,
        detail: state.report.services.tatum.network
      },
      {
        label: "Tatum Sui RPC",
        ready: state.report.services.tatum.rpcUrl.configured,
        detail: formatUrl(state.report.services.tatum.rpcUrl)
      },
      {
        label: "Walrus publisher",
        ready: state.report.services.walrus.publisherUrl.configured,
        detail: formatUrl(state.report.services.walrus.publisherUrl)
      },
      {
        label: "Walrus aggregator",
        ready: state.report.services.walrus.aggregatorUrl.configured,
        detail: formatUrl(state.report.services.walrus.aggregatorUrl)
      }
    ];
  }, [state.report]);

  if (state.status === "loading") {
    return (
      <section className="monitor-grid" aria-live="polite">
        <div className="monitor-card monitor-card-primary is-loading">
          <span className="monitor-skeleton short" />
          <span className="monitor-skeleton tall" />
          <span className="monitor-skeleton" />
        </div>
        <div className="monitor-card is-loading">
          <span className="monitor-skeleton" />
          <span className="monitor-skeleton" />
          <span className="monitor-skeleton" />
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="monitor-card monitor-card-primary monitor-error" aria-live="polite">
        <AlertTriangle size={22} />
        <div>
          <h2>Health check unavailable</h2>
          <p>{state.error}</p>
        </div>
        <button className="secondary-action" type="button" onClick={() => void loadHealth()}>
          <RefreshCw size={16} />
          Retry
        </button>
      </section>
    );
  }

  const report = state.report;
  const ready = report.status === "ready";

  return (
    <section className="monitor-grid" aria-live="polite">
      <article className="monitor-card monitor-card-primary">
        <div className="monitor-card-header">
          <span className={ready ? "status-light ready" : "status-light degraded"}>
            {ready ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
            {ready ? "Ready" : "Degraded"}
          </span>
          <button
            className="icon-action"
            type="button"
            onClick={() => void loadHealth()}
            aria-label="Refresh health status"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <h2>Runtime health</h2>
        <p>
          The server can evaluate live agent actions and write Walrus evidence when all required services are
          configured.
        </p>
        <dl className="monitor-metrics">
          <div>
            <dt>Environment</dt>
            <dd>{report.app.environment}</dd>
          </div>
          <div>
            <dt>Checked</dt>
            <dd>{new Date(report.checkedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Retention</dt>
            <dd>
              {report.services.walrus.epochs} {report.services.walrus.epochs === 1 ? "epoch" : "epochs"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="monitor-card">
        <div className="monitor-card-header">
          <h2>Service readiness</h2>
          <Activity size={18} />
        </div>
        <ul className="readiness-list">
          {readiness.map((item) => (
            <li key={item.label}>
              <span className={item.ready ? "readiness-dot ready" : "readiness-dot degraded"} />
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </article>

      <article className="monitor-card">
        <h2>Runtime</h2>
        <dl className="monitor-details">
          <div>
            <dt>App URL</dt>
            <dd>{formatUrl(report.runtime.appUrl)}</dd>
          </div>
          <div>
            <dt>Node env</dt>
            <dd>{report.runtime.nodeEnv}</dd>
          </div>
          <div>
            <dt>Vercel env</dt>
            <dd>{report.runtime.vercelEnv}</dd>
          </div>
        </dl>
      </article>

      <article className="monitor-card">
        <h2>Configuration issues</h2>
        {report.missing.length || report.invalid.length ? (
          <ul className="issue-list">
            {[...report.missing, ...report.invalid].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No missing or invalid runtime settings detected.</p>
        )}
      </article>
    </section>
  );
}
