# Agent Credit Rail

Policy-controlled agent payments on Stellar, backed by an **overcollateralized credit line** funded by owner-posted collateral.

> **Hackathon**: [Stellar Agents x402](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail) on DoraHacks

## What this proves

An AI agent requests a paid HTTP service. The service returns `402 Payment Required` with an x402 challenge on Stellar testnet. Legasi checks the agent's policy and remaining credit, then settles the USDC payment on Stellar. The agent never receives unrestricted funds — it spends against an overcollateralized credit line backed by XLM collateral.

**Canonical proof (Stellar testnet):**

| | |
|---|---|
| **Tx hash** | `c95f226755d775a1b97dcc38fbb12d38fe6fee2f9e3f50074b78f382b377fa77` |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/c95f226755d775a1b97dcc38fbb12d38fe6fee2f9e3f50074b78f382b377fa77) |
| **Collateral** | XLM (owner-posted, valued in USD) |
| **Payment asset** | USDC (Stellar testnet SAC) |

**Why this is not just another x402 demo:** The owner's collateral (XLM) is not the payment asset (USDC). Legasi computes a credit line from collateral, applies policy controls, and settles payments on a separate rail. The service unlocks only after real Stellar settlement. This is the first working layer of credit infrastructure for AI agents — not a wallet, not a proxy, but a controlled spend rail backed by overcollateralized credit.

**Two demo flows:**
1. **Approved**: agent requests allowlisted `/search` → 402 → policy + credit check passes → Legasi settles USDC payment on Stellar → service returns result → spend logged
2. **Blocked**: agent requests `premium-data.io` (synthetic) → policy rejects → blocked event logged → power unchanged

## The credit model

The agent's purchasing power is **not** a wallet balance. It is:

```
purchasing_power = collateral_value_usd × base_ltv
available_power  = purchasing_power - used_power
```

- Owner posts **XLM collateral** (10,000 XLM valued at $1,000 in demo)
- Legasi applies **LTV** (0.6 = conservative discount)
- Agent gets **600 USDC purchasing power** (credit line, not cash)
- Payments settle in **USDC on Stellar** — a different asset from the collateral
- Each settled payment increases `used_power`
- Blocked/failed payments never affect `used_power`

See [CREDIT_MODEL.md](./CREDIT_MODEL.md) for details.

## Quick start

```bash
pnpm install
pnpm test            # 58 deterministic tests, no network needed
pnpm typecheck       # all packages

# Run services locally (mock Stellar submission)
cp .env.example .env
# Set STELLAR_PAYEE_ADDRESS to a testnet address
pnpm dev:orchestrator   # http://localhost:4010
pnpm dev:paywall        # http://localhost:4020
```

### Try the API

```bash
# Check credit account (seeded demo scenario)
curl http://localhost:4010/account/agent-1

# Make a payment (approved flow)
curl -X POST http://localhost:4010/payment/request \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"agent-1","service_url":"/search","amount_usdc":10}'

# Make a payment (blocked flow)
curl -X POST http://localhost:4010/payment/request \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"agent-1","service_url":"premium-data.io","amount_usdc":10}'

# View payment history
curl http://localhost:4010/payments/agent-1

# Hit the paywall directly (returns 402 with Stellar challenge)
curl -i http://localhost:4020/search
```

## Demo scenario (fixed seed)

| Parameter | Value |
|-----------|-------|
| Collateral asset | XLM (10,000 XLM) |
| Collateral valuation | $1,000 USD |
| Base LTV | 0.6 |
| Purchasing power | 600 USDC |
| Payment asset | USDC (Stellar testnet) |
| Allowlisted service | `/search` (cap: 100/request, 500/day) |
| Blocked service | `premium-data.io` (synthetic, not a real service) |

## What is real vs mocked

| Component | Status |
|-----------|--------|
| x402 paywall (402 challenge) | **Real** — `@x402/hono` + `@x402/stellar`, USDC on Stellar testnet |
| x402 USDC settlement | **Real** — end-to-end on Stellar testnet ([proof tx](https://stellar.expert/explorer/testnet/tx/c95f226755d775a1b97dcc38fbb12d38fe6fee2f9e3f50074b78f382b377fa77)) |
| Policy engine | **Real** — allowlist/denylist, per-request + daily caps |
| Credit engine | **Real** — overcollateralized credit line (XLM collateral → USDC purchasing power) |
| Decision engine | **Real** — combines policy + credit, creates attempts + events |
| Stellar submission | **Mocked** in local dev, **real** in smoke tests + demo |
| Storage | **In-memory** Maps with seeded demo data |

## Architecture

```
Agent Client
    │
    ▼
Paywall Service (Hono + @x402/hono + @x402/stellar)
    │  402 Payment Required
    ▼
Legasi Orchestrator (Hono)
    ├── Policy Engine (allowlist, caps)
    ├── Credit Engine (collateral × LTV, available power)
    ├── Decision Engine (policy + credit → approve/block)
    ├── Submission (Stellar tx)
    └── Store (attempts, events, domain state)
```

## Repository structure

```
apps/
  legasi-orchestrator/   credit + policy + decision + routes
  paywall-service/       x402-protected service on Stellar testnet
  agent-client/          client that handles 402 flow
  demo-ui/               owner/agent dashboard (WIP)
packages/
  shared-types/          domain types, enums, Zod schemas
  credit-engine/         collateral valuation, purchasing power
```

## Tests

```bash
pnpm test              # all deterministic tests
pnpm --filter @agent-credit-rail/credit-engine test
pnpm --filter @agent-credit-rail/legasi-orchestrator test
pnpm --filter @agent-credit-rail/paywall-service test
pnpm --filter @agent-credit-rail/agent-client test
```

## Env setup for Stellar testnet

1. Create a Stellar testnet account at [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Fund it via friendbot
3. Set `STELLAR_PAYEE_ADDRESS` in `.env`
4. For smoke tests, also set `STELLAR_TESTNET_SECRET_KEY`

## Tech stack

- **pnpm** workspace monorepo
- **TypeScript** (strict, ES2022, Bundler resolution)
- **Hono** for HTTP services
- **@x402/hono** + **@x402/stellar** for x402 paywall
- **Vitest** for testing
- **Zod** for HTTP boundary validation

## Key design decisions

- `PaymentAttempt` = non-terminal intent (created at decision time)
- `PaymentEvent` = terminal outcome (blocked, failed, or settled)
- `POST /payment/request` returns a terminal response in one call (no polling)
- Every payment carries a correlation `attempt_id` across attempt, event, logs, UI
- Used power only changes after successful Stellar submission
- Cap semantics are inclusive (`amount <= cap` is allowed)
- `INSUFFICIENT_POWER` is the single credit rejection in Phase 1

## Non-goals

- Multi-asset collateral, oracle stack, on-chain policy contracts
- Liquidation engine, dynamic interest accrual
- Production custody, mainnet deployment
- MPP Session mode
