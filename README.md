# Agent Credit Rail

Policy-controlled agent payments on Stellar, backed by an **overcollateralized credit line** funded by owner-posted collateral.

> **Hackathon**: [Stellar Agents x402](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail) on DoraHacks

## What this proves

An AI agent requests a paid HTTP service. The service returns `402 Payment Required` with an x402 challenge on Stellar testnet. Legasi checks the agent's policy and remaining credit, then submits the payment on Stellar. The agent never receives unrestricted funds — it spends against an overcollateralized credit line.

**Two demo flows:**
1. **Approved**: agent requests allowlisted `/search` → 402 → policy + credit check passes → Legasi submits Stellar tx → service returns result → spend logged
2. **Blocked**: agent requests `unknown-api.xyz` (synthetic) → policy rejects → blocked event logged → power unchanged

## The credit model

The agent's purchasing power is **not** a wallet balance. It is:

```
purchasing_power = collateral_value_usd × base_ltv
available_power  = purchasing_power - used_power
```

- Owner posts **collateral** (1000 USD in demo)
- Legasi applies **LTV** (0.6 = conservative discount)
- Agent gets **600 USDC purchasing power** (credit line, not cash)
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
  -d '{"agent_id":"agent-1","service_url":"unknown-api.xyz","amount_usdc":10}'

# View payment history
curl http://localhost:4010/payments/agent-1

# Hit the paywall directly (returns 402 with Stellar challenge)
curl -i http://localhost:4020/search
```

## Demo scenario (fixed seed)

| Parameter | Value |
|-----------|-------|
| Owner collateral | 1000 USD |
| Base LTV | 0.6 |
| Purchasing power | 600 USDC |
| Allowlisted service | `/search` (cap: 100/request, 500/day) |
| Blocked service | `unknown-api.xyz` (synthetic, not a real service) |

## What is real vs mocked

| Component | Status |
|-----------|--------|
| x402 paywall (402 challenge) | **Real** — `@x402/hono` + `@x402/stellar` on Stellar testnet |
| Policy engine | **Real** — allowlist/denylist, per-request + daily caps |
| Credit engine | **Real** — overcollateralized credit line math with drift guards |
| Decision engine | **Real** — combines policy + credit, creates attempts + events |
| Stellar submission | **Mocked** in local dev, real in `smoke:testnet` |
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
