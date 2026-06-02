# Walrus Sentinel

Walrus Sentinel is a verifiable pre-flight firewall for AI agents on Sui. Before an agent executes a risky action, Sentinel checks Sui context through Tatum RPC, stores the evidence pack on Walrus, and returns a receipt that can be verified later.

## Hackathon Fit

- **Tatum:** server-side Sui JSON-RPC for balances, owned objects, target metadata, and transaction history.
- **Walrus:** evidence packs for each action analysis.
- **Sui:** target network for agent actions, wallet context, and optional receipt anchoring.

## Demo Flow

1. Pick an agent action scenario.
2. Run a pre-flight check.
3. Review the `ALLOW`, `WARN`, or `BLOCK` verdict.
4. Store the evidence pack on Walrus.
5. Verify the receipt by fetching the Walrus blob and recomputing the evidence hash.

## Setup

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
NEXT_PUBLIC_DEMO_ACTOR_ADDRESS=
```

Do not commit `.env.local`.

## Scripts

```bash
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `src/lib/sentinel/tatum-sui-client.ts`: Tatum Sui JSON-RPC wrapper.
- `src/lib/sentinel/sui-context.ts`: builds the chain context for an agent intent.
- `src/lib/sentinel/risk-engine.ts`: deterministic `ALLOW`, `WARN`, and `BLOCK` verdicts.
- `src/lib/sentinel/walrus-client.ts`: Walrus publisher and aggregator adapter.
- `src/lib/sentinel/receipt-service.ts`: canonical JSON hashing and receipt verification.
- `src/app/api/analyze/route.ts`: server-side analysis endpoint.
- `src/app/api/verify/route.ts`: server-side Walrus receipt verification endpoint.
- `src/app/api/agent/check/route.ts`: agent-facing endpoint that mirrors the analysis route.

## Safety Claim

Sentinel does not guarantee that an action is safe. It provides deterministic pre-flight risk analysis and verifiable evidence for the decision.
