x402 made agent payments possible. AgentPay makes them institution-ready.

Today, an AI agent can hit a paywall and settle in USDC on Stellar. But no enterprise will let an autonomous agent spend freely against a corporate treasury. The real problem is not whether agents can pay — it's whether institutions can control how they pay.

AgentPay is a corporate payment stack for AI agents. Think Spendesk, but for machines: programmable budgets, merchant controls, credit limits, policy enforcement, and a full audit trail — settled in USDC on Stellar.

At Legasi, we're building digital credit infrastructure for financial institutions. AgentPay is the first machine-native interface to that credit layer.

---

# AgentPay

**Institution-grade infrastructure for agentic B2B commerce** — by [Legasi](https://legasi.io)

Programmable budgets. Merchant controls. Credit limits. Auditable USDC settlement on Stellar.

> [Stellar Agents x402 Hackathon](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail) on DoraHacks

---

## Proof

This is live. Not a mockup.

| | |
|---|---|
| **Tx hash** | [`c95f226...b377fa77`](https://stellar.expert/explorer/testnet/tx/c95f226755d775a1b97dcc38fbb12d38fe6fee2f9e3f50074b78f382b377fa77) |
| **Asset** | USDC on Stellar testnet |
| **Collateral** | XLM (owner-posted, valued in USD) |

The payment asset (USDC) is different from the collateral (XLM). This is credit infrastructure, not a wrapped wallet. Verify on-chain.

**Live now:**

| | |
|---|---|
| [Capital Insider](https://capital-insider-production.up.railway.app) | Paywalled publication — try paying as a human |
| [AgentPay Dashboard](https://legasi-dashboard-production.up.railway.app) | Credit line, policy, transaction feed |

---

## Try it yourself (60 seconds)

Give Claude controlled spending power. Watch approved spend succeed and unapproved spend get blocked.

**1.** Open your Claude Desktop config:
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**2.** Paste this:

```json
{
  "mcpServers": {
    "legasi-credit-rail": {
      "command": "npx",
      "args": ["-y", "legasi-credit-rail"]
    }
  }
}
```

**3.** Restart Claude Desktop. Then try:

> Is there any news about Legasi on capital-insider-production.up.railway.app?

Claude finds the article — but it's behind a paywall.

> Can you pay for it?

Claude pays $4.99 in USDC on Stellar. Article unlocks. Click the Stellar Explorer link to verify the on-chain settlement.

> Can you buy me the latest dataset from premium-data.io?

**Blocked.** premium-data.io is not on the approved merchant list. No money moved. The policy decided, not the agent.

Each session gets its own agent identity, credit line, spending policy, and dashboard.

---

## The controlled transaction loop

```
Agent requests paid service
    |
    v
Paywall returns 402 Payment Required (x402 on Stellar)
    |
    v
AgentPay enforces spending policy --- BLOCKED? --> logged, no funds move
    |
    v (approved)
Credit line checked (overcollateralized)
    |
    v
USDC payment settles on Stellar
    |
    v
Service unlocks, spend recorded, dashboard updates
```

**Approved**: agent requests a B2B service -> 402 -> policy + credit check passes -> USDC settles on Stellar -> service unlocks -> spend logged with full audit trail

**Blocked**: agent requests an unapproved service -> policy rejects before any funds move -> blocked attempt logged -> purchasing power unchanged -> zero exposure

---

## What makes AgentPay different

- **Real on-chain settlement** — not simulated balances. USDC on Stellar, verifiable by anyone.
- **Policy enforcement before funds move** — blocked payments never touch the treasury. The policy decides, not the agent.
- **Controlled credit, not prefunded wallets** — spending power is derived from overcollateralized credit lines, not preloaded accounts.
- **Built for machine decision loops** — thousands of autonomous transactions, not humans clicking "approve."
- **No key exposure** — the agent never sees a private key. AgentPay settles on its behalf.
- **Full audit trail** — every attempt is logged, including blocked ones. Institutions care about denied events too.

---

## Why this matters

Every API becomes a business model once agents can transact. But enterprises won't participate without institutional controls.

- **Pay-per-call APIs** — agents pay for search, compute, and data per request
- **Premium datasets** — market data, research, proprietary intelligence
- **SaaS actions** — agents execute paid workflows across B2B platforms
- **Autonomous procurement** — agents source and purchase digital services without human approval loops

AgentPay is the control layer that makes this possible at enterprise scale.

---

## Why this works on Stellar

- **Fast settlement** — agents operate in tight loops. Sub-second finality means the agent doesn't wait.
- **Low fees** — high-frequency agent spend needs negligible transaction costs to be viable.
- **Native USDC** — pricing is denominated in dollars. Stablecoin-native by design.
- **x402 composition** — HTTP 402 + Stellar = payment and access compose natively. Every endpoint becomes a billable service.
- **Institution-friendly** — Stellar's compliance tooling and regulated asset framework align with enterprise requirements.

---

## The credit model

Like a corporate credit card — except programmable and overcollateralized.

```
credit_limit = collateral_value_usd x LTV
available    = credit_limit - spent
```

Owner posts 10,000 XLM ($1,000) -> LTV 0.6 -> agent gets $600 USDC credit limit. Payments settle in USDC. Blocked payments cost nothing. Owner controls policy in real time from the dashboard.

See [CREDIT_MODEL.md](./CREDIT_MODEL.md) for details.

---

## Architecture

```
User -> Claude Desktop -> AgentPay MCP -> Paywall (402)
                                              |
                                    Legasi Orchestrator
                                     |-- Policy Engine
                                     |-- Credit Engine
                                     |-- Stellar Settlement
                                     '-- Audit Trail
```

**Stack**: TypeScript, Hono, Stellar SDK, x402, Vitest (69 tests), pnpm monorepo

---

## Local development

```bash
pnpm install && pnpm test       # 69 deterministic tests, no network needed
pnpm typecheck                  # strict across all packages

cp .env.example .env            # set STELLAR_PAYEE_ADDRESS
pnpm dev:orchestrator           # http://localhost:4010
pnpm dev:paywall                # http://localhost:4020
pnpm dev:ui                     # http://localhost:4030
```

---

Built during the [Stellar Agents x402 Hackathon](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail). AgentPay is a programmable credit primitive for AI agents — the first step toward machine-native financial infrastructure.

AgentPay is the first machine-native product built on Legasi's digital credit infrastructure for financial institutions. Works with Claude today. Extensible to any agent framework.
