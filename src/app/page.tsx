import { SentinelDashboard } from "@/components/sentinel-dashboard";
import { SiteNav } from "@/components/site-nav";

const proofPoints = [
  { value: "Live", label: "Sui testnet actions" },
  { value: "Tatum", label: "runtime chain context" },
  { value: "Walrus", label: "verifiable evidence" }
];

const architecture = [
  {
    title: "Live intent",
    body: "The console loads real Sui testnet actors and package functions before an agent action is reviewed."
  },
  {
    title: "Tatum context",
    body: "Server-side RPC collects balances, owned objects, target metadata, and recent transaction context."
  },
  {
    title: "Policy verdict",
    body: "A deterministic policy engine returns ALLOW, WARN, or BLOCK with reviewer-readable findings."
  },
  {
    title: "Walrus evidence",
    body: "The complete evidence pack is stored on Walrus and verified later by recomputing its hash."
  }
];

export default function Home() {
  return (
    <main className="site-shell" id="top">
      <a className="skip-link" href="#demo">
        Skip to review console
      </a>

      <SiteNav />

      <section className="project-hero">
        <div className="hero-copy">
          <p className="eyebrow">Tatum x Walrus Hackathon</p>
          <h1>Verifiable pre-flight risk checks for Sui wallet agents.</h1>
          <p className="lede">
            Walrus Sentinel evaluates live agent intents with Tatum Sui context, stores the evidence on
            Walrus, and returns a receipt reviewers can verify after the decision.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#demo">
              Run live review
            </a>
            <a className="secondary-link" href="#architecture">
              Review architecture
            </a>
            <a className="tertiary-link" href="/monitor">
              Open monitor
            </a>
          </div>
        </div>

        <aside className="hero-terminal" aria-label="Sentinel runtime summary">
          <div className="terminal-top">
            <span>agent.preflight</span>
            <strong>online</strong>
          </div>
          <div className="terminal-rows">
            <p>
              <span>01</span> Discover live Sui action
            </p>
            <p>
              <span>02</span> Pull Tatum chain context
            </p>
            <p>
              <span>03</span> Score policy risk
            </p>
            <p>
              <span>04</span> Store verifiable Walrus evidence
            </p>
          </div>
        </aside>
      </section>

      <section className="proof-rail" aria-label="Project proof points">
        {proofPoints.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="section-block demo-section" id="demo">
        <div className="section-heading">
          <h2>Live agent review console</h2>
          <p>
            Presets are generated from current Sui testnet activity through Tatum, then evaluated by
            Sentinel and stored as verifiable Walrus evidence.
          </p>
        </div>
        <SentinelDashboard />
      </section>

      <section className="section-block architecture-section" id="architecture">
        <div className="section-heading narrow">
          <h2>Built as an agent control plane, not a scripted walkthrough.</h2>
          <p>
            The same `/api/agent/check` route shown in the console can sit in front of an AI wallet
            agent before it submits a Sui transaction.
          </p>
        </div>
        <div className="architecture-grid">
          {architecture.map((item, index) => (
            <article key={item.title} className="architecture-card">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block security-section" id="security">
        <div>
          <h2>Submission posture</h2>
          <p>
            Credentials stay server-side, scenario discovery uses live Tatum RPC, and every review result
            can be verified against the evidence pack stored on Walrus.
          </p>
        </div>
        <a className="secondary-link" href="#demo">
          Return to console
        </a>
      </section>

      <footer className="site-footer">
        <span>Walrus Sentinel</span>
        <span>Tatum Sui RPC + Walrus evidence receipts for agentic transaction review.</span>
      </footer>
    </main>
  );
}
