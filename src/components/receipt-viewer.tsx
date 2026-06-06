"use client";

import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import type { SentinelReceipt, WalrusEvidencePack } from "@/lib/sentinel/types";

interface VerifyResponse {
  status?: "propagating";
  error?: string;
  verification: {
    ok: boolean;
    expectedHash: string;
    actualHash: string;
  };
  evidence: WalrusEvidencePack;
}

export function ReceiptViewer({ receipt }: { receipt: SentinelReceipt | null }) {
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!receipt) {
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ receipt })
    });
    const payload = (await response.json()) as VerifyResponse | { error: string };
    setLoading(false);

    if (response.status === 202 && "error" in payload) {
      setError(payload.error ?? "Walrus evidence is still propagating. Try verification again shortly.");
      return;
    }

    if (!response.ok || "error" in payload) {
      setError("error" in payload ? payload.error ?? "Verification failed" : "Verification failed");
      return;
    }

    setResult(payload);
  }

  if (!receipt) {
    return (
      <section className="panel">
        <div className="panel-title">
          <ShieldCheck size={20} />
          <h2>Receipt verifier</h2>
        </div>
        <p className="muted">Run a live review to produce a Walrus receipt for verification.</p>
      </section>
    );
  }

  return (
    <section className="panel receipt-panel" aria-live="polite">
      <div className="panel-title">
        <ShieldCheck size={20} />
        <h2>Receipt verifier</h2>
      </div>
      <dl className="receipt-grid">
        <div>
          <dt>Receipt</dt>
          <dd>{receipt.receiptId}</dd>
        </div>
        <div>
          <dt>Walrus blob</dt>
          <dd>{receipt.walrusBlobId}</dd>
        </div>
        <div>
          <dt>Evidence hash</dt>
          <dd>{receipt.evidenceHash}</dd>
        </div>
      </dl>
      <button className="primary-action" type="button" onClick={verify} disabled={loading}>
        {loading ? <Loader2 className="spin" size={17} /> : null}
        {loading ? "Verifying receipt" : "Verify from Walrus"}
      </button>
      {loading ? (
        <div className="verification-track">
          <span>Fetch Walrus blob</span>
          <span>Recompute evidence hash</span>
          <span>Compare receipt</span>
        </div>
      ) : null}
      {result ? (
        <>
          <p className={result.verification.ok ? "verify-ok" : "verify-bad"}>
            {result.verification.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {result.verification.ok ? "Evidence hash matches receipt." : "Evidence hash mismatch."}
          </p>
          <dl className="verified-evidence">
            <div>
              <dt>Fetched from Walrus</dt>
              <dd>{result.evidence.appName}</dd>
            </div>
            <div>
              <dt>Stored verdict</dt>
              <dd>{result.evidence.risk.verdict}</dd>
            </div>
            <div>
              <dt>Network checked</dt>
              <dd>{result.evidence.context.network}</dd>
            </div>
            <div>
              <dt>Findings</dt>
              <dd>{result.evidence.risk.findings.length}</dd>
            </div>
            <div>
              <dt>Evidence created</dt>
              <dd>{new Date(result.evidence.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
