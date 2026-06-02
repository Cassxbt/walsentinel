"use client";

import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import type { SentinelReceipt } from "@/lib/sentinel/types";

interface VerifyResponse {
  verification: {
    ok: boolean;
    expectedHash: string;
    actualHash: string;
  };
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

    if (!response.ok || "error" in payload) {
      setError("error" in payload ? payload.error : "Verification failed");
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
        <p className="muted">No receipt selected.</p>
      </section>
    );
  }

  return (
    <section className="panel">
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
        {loading ? "Verifying..." : "Verify from Walrus"}
      </button>
      {result ? (
        <p className={result.verification.ok ? "verify-ok" : "verify-bad"}>
          {result.verification.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {result.verification.ok ? "Evidence hash matches receipt." : "Evidence hash mismatch."}
        </p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
