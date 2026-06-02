import { SentinelDashboard } from "@/components/sentinel-dashboard";

const proofPoints = [
  { value: "3", label: "demo verdicts" },
  { value: "Tatum", label: "Sui context" },
  { value: "Walrus", label: "evidence storage" }
];

const architecture = [
  {
    title: "Agent intent",
    body: "A proposed Sui action is normalized before the agent can execute it."
  },
  {
    title: "Tatum context",
    body: "Server-side RPC checks wallet balance, owned objects, target metadata, and recent activity."
  },
  {
    title: "Sentinel verdict",
    body: "A deterministic policy engine returns ALLOW, WARN, or BLOCK with exact findings."
  },
  {
    title: "Walrus receipt",
    body: "The evidence pack is stored on Walrus and later verified by recomputing its hash."
  }
];

export default function Home() {
  return (
    <main className="site-shell" id="top">
      <a className="skip-link" href="#demo">
        Skip to demo
      </a>

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand-mark" href="#top" aria-label="Walrus Sentinel home">
          <span>WS</span>
          Walrus Sentinel
        </a>
        <div className="nav-links">
          <a href="#demo">Demo</a>
          <a href="#agent">Agent API</a>
          <a href="#architecture">Architecture</a>
          <a href="#security">Security</a>
        </div>
      </nav>

      <section className="project-hero">
        <div className="hero-copy">
          <p className="eyebrow">Tatum x Walrus Hackathon</p>
          <h1>Pre-flight checks before AI agents touch Sui assets.</h1>
          <p className="lede">
            Sentinel gives an agent a verdict, a reason, and a Walrus-backed receipt before execution.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#demo">
              Test the flow
            </a>
            <a className="secondary-link" href="#architecture">
              View architecture
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
              <span>01</span> Receive proposed Sui action
            </p>
            <p>
              <span>02</span> Pull Tatum chain context
            </p>
            <p>
              <span>03</span> Score policy risk
            </p>
            <p>
              <span>04</span> Store evidence on Walrus
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
          <h2>Live demo workspace</h2>
          <p>
            Run a safe transfer, a review-worthy transfer, and a blocked package call. Each check stores a
            verifiable evidence pack on Walrus.
          </p>
        </div>
        <SentinelDashboard />
      </section>

      <section className="section-block architecture-section" id="architecture">
        <div className="section-heading narrow">
          <h2>Built as an agent guardrail, not a fake agent.</h2>
          <p>
            Any AI wallet agent can call the same internal route shown in the demo before sending a transaction.
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
          <h2>Security posture</h2>
          <p>
            The app keeps Tatum credentials server-side, leaves `.env.local` and Vercel metadata out of git,
            and publishes only sanitized defaults.
          </p>
        </div>
        <a className="secondary-link" href="#demo">
          Return to demo
        </a>
      </section>

      <footer className="site-footer">
        <span>Walrus Sentinel</span>
        <span>Tatum RPC + Walrus evidence receipts for Sui agent actions.</span>
      </footer>
    </main>
  );
}
