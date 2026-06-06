import type { Metadata } from "next";
import Link from "next/link";
import { MonitorDashboard } from "@/components/monitor-dashboard";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Monitor | Walrus Sentinel",
  description: "Operational readiness monitor for Walrus Sentinel"
};

export default function MonitorPage() {
  return (
    <main className="site-shell monitor-shell">
      <SiteNav />
      <section className="monitor-hero">
        <div>
          <p className="eyebrow">Operations monitor</p>
          <h1>Runtime readiness for the Sentinel guardrail.</h1>
        </div>
        <p>
          Track whether the demo can score an agent action, pull Sui context through Tatum, and verify
          Walrus-backed evidence without exposing credentials.
        </p>
      </section>
      <MonitorDashboard />
      <footer className="site-footer">
        <span>Walrus Sentinel</span>
        <Link href="/#demo">Return to live demo</Link>
      </footer>
    </main>
  );
}
