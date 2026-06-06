# Walrus Sentinel

Walrus Sentinel is a verifiable pre-flight risk layer for Sui wallet agents. Before an agent executes a proposed action, Sentinel discovers live Sui testnet activity through Tatum, scores the action with a deterministic policy, stores the complete evidence pack on Walrus, and returns a receipt that can be verified later.

**Live submission:** https://walsentinel.vercel.app

**Stack:** Next.js, TypeScript, Tatum Sui RPC, Walrus testnet, Vercel

## Why This Exists

AI agents are starting to operate wallets, call packages, and move assets. The missing layer is an auditable checkpoint between "the agent wants to do this" and "the transaction was sent."

Walrus Sentinel gives an agent-facing system three things before execution:

- A clear `ALLOW`, `WARN`, or `BLOCK` verdict.
- The chain context and policy findings behind that verdict.
- A Walrus-backed receipt that can be independently verified after the decision.

## Hackathon Fit

| Sponsor | Usage |
| --- | --- |
| Tatum | Server-side Sui JSON-RPC for live scenario discovery, wallet balance, owned objects, target object metadata, and recent transaction context. |
| Walrus | Durable evidence storage for each pre-flight review, including the canonical data needed for later verification. |
| Sui | Target chain for the live agent intents, package metadata checks, and wallet-risk context. |

The official criteria weight Walrus/Tatum integration and technical quality most heavily. Sentinel is built around those two criteria: the UI cannot run a review without Tatum-derived Sui context, and every completed review writes a Walrus evidence pack that the verifier fetches and hashes again.

## Review Flow

1. Open the live submission.
2. Load a live preset generated from current Sui testnet activity through Tatum.
3. Run the pre-flight review.
4. Review the Sentinel verdict, risk score, and findings.
5. Inspect the Walrus blob ID and receipt hash.
6. Verify the receipt by fetching the stored Walrus evidence and recomputing the canonical hash.

The project exposes `/api/scenarios` for live preset discovery and `/api/agent/check` for the pre-flight endpoint an external AI agent would call before submitting a Sui transaction.

## Core Features

- Deterministic pre-flight risk engine with `ALLOW`, `WARN`, and `BLOCK` outcomes.
- Live scenario catalog generated through Tatum Sui RPC.
- Live Tatum-backed Sui context collection.
- Walrus evidence-pack storage for every analysis.
- Canonical JSON hashing for reproducible receipt verification.
- Agent-facing API route for integration into wallet-agent workflows.
- Security-first deployment posture: credentials remain server-side, and local env files are ignored.

## Architecture

```text
Agent intent
  -> /api/scenarios discovers live review presets
  -> /api/agent/check or /api/analyze reviews the selected intent
  -> Tatum Sui RPC context builder
  -> Sentinel risk engine
  -> Walrus evidence storage
  -> Signed-style receipt payload with canonical evidence hash
  -> /api/verify fetches Walrus blob and recomputes hash
```

Important modules:

| Path | Purpose |
| --- | --- |
| `src/lib/sentinel/tatum-sui-client.ts` | Tatum Sui JSON-RPC wrapper with retry handling. |
| `src/lib/sentinel/scenario-catalog.ts` | Builds live review presets from Tatum-discovered Sui activity and verified package functions. |
| `src/lib/sentinel/sui-context.ts` | Builds chain context for an agent intent. |
| `src/lib/sentinel/risk-engine.ts` | Scores intent risk and emits findings. |
| `src/lib/sentinel/walrus-client.ts` | Stores and reads JSON evidence through Walrus publisher/aggregator endpoints. |
| `src/lib/sentinel/receipt-service.ts` | Creates receipts and verifies canonical evidence hashes. |
| `src/app/api/analyze/route.ts` | Main server-side analysis endpoint. |
| `src/app/api/agent/check/route.ts` | Agent-facing pre-flight endpoint. |
| `src/app/api/scenarios/route.ts` | Live preset catalog endpoint. |
| `src/app/api/verify/route.ts` | Receipt verification endpoint. |

## API Overview

### Discover Live Presets

```http
GET /api/scenarios
```

The response includes live Sui testnet presets generated through Tatum RPC. Each preset contains the exact agent intent sent to `/api/agent/check`.

### Analyze an Agent Action

```http
POST /api/analyze
Content-Type: application/json
```

```json
{
  "id": "live-transfer-low-impact",
  "kind": "sui-transfer",
  "network": "testnet",
  "actor": "copy from /api/scenarios",
  "target": "copy from /api/scenarios",
  "amountMist": "copy from /api/scenarios",
  "description": "copy from /api/scenarios",
  "createdAt": "2026-06-06T00:00:00.000Z"
}
```

The response includes:

- `risk`: verdict, score, and findings.
- `evidence`: the full evidence pack stored on Walrus.
- `receipt`: receipt ID, Walrus blob ID, evidence hash, actor, target, and verdict.

### Verify a Receipt

```http
POST /api/verify
Content-Type: application/json
```

```json
{
  "receipt": {
    "schemaVersion": "1.0",
    "receiptId": "...",
    "verdict": "ALLOW",
    "riskScore": 5,
    "evidenceHash": "...",
    "walrusBlobId": "...",
    "network": "testnet",
    "actor": "0x...",
    "target": "0x...",
    "createdAt": "2026-06-01T00:00:00.000Z"
  }
}
```

Verification succeeds only when the Walrus evidence pack hashes to the receipt's `evidenceHash`.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these values in `.env.local`:

```dotenv
TATUM_API_KEY=
TATUM_ACCOUNT_ID=
TATUM_SUI_NETWORK=testnet
TATUM_SUI_RPC_URL=https://sui-testnet.gateway.tatum.io
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_EPOCHS=1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit `.env.local`, Vercel metadata, local planning docs, or private API keys.

## Quality Gates

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The test suite covers canonical hashing, receipt verification, Walrus response parsing, Tatum RPC behavior, live scenario catalog generation, and risk-engine verdicts.

## Security Model

Sentinel is a pre-flight control, not a custody layer.

- Tatum credentials are used only in server routes.
- Browser code only receives public runtime configuration and analysis results.
- Receipts are verifiable because they bind verdict metadata to a canonical hash of the Walrus evidence pack.
- The app does not submit Sui transactions; it decides whether an agent should proceed, request review, or refuse execution.
- Risk policy is deterministic so a reviewer can reproduce why a verdict was issued.

## Current Limitations

- The app does not execute transactions on Sui; it evaluates proposed actions before execution.
- Receipt anchoring is Walrus-backed today. A future version can additionally anchor receipt metadata on Sui.
- The policy engine is intentionally compact for hackathon review and should be expanded before production custody use.

## License

Hackathon submission. Add a production license before commercial use.
