AI agents can read, write, code, and deploy. But they still cannot pay.

The moment agents can transact autonomously, every API becomes a business model. AgentPay lets Claude pay $4.99 for a paywalled article in USDC on Stellar, under a programmable credit policy — no wallet popups, no human approval, no keys exposed.

At Legasi, we're building digital credit infrastructure for financial institutions. AgentPay is the first machine-native interface to that credit layer.

---

# AgentPay

**Corporate Credit Cards for AI Agents** — by [Legasi](https://legasi.io)

Enable any LLM to pay in USDC on Stellar — with programmable credit limits, policy enforcement, and real on-chain settlement.

> [Stellar Agents x402 Hackathon](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail) on DoraHacks

---

## Proof

This is live. Not a mockup.

| | |
|---|---|
| **Tx hash** | [`c95f226...b377fa77`](https://stellar.expert/explorer/testnet/tx/c95f226755d775a1b97dcc38fbb12d38fe6fee2f9e3f50074b78f382b377fa77) |
| **Asset** | USDC on Stellar testnet |
| **Collateral** | XLM (owner-posted, valued in USD) |

Verify on-chain. The payment asset (USDC) is different from the collateral (XLM). This is real credit infrastructure, not a wrapped wallet.

**Live now:**

| | |
|---|---|
| [Capital Insider](https://capital-insider-production.up.railway.app) | Paywalled publication — try paying as a human |
| [AgentPay Dashboard](https://legasi-dashboard-production.up.railway.app) | Credit card, policy, transaction feed |

---

## Try it yourself (60 seconds)

Your Claude can autonomously pay for articles, APIs, and digital services. Set it up:

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

**3.** Restart Claude Desktop. Then try these prompts:

> Is there any news about Legasi on capital-insider-production.up.railway.app?

Claude finds the article — but it's paywalled.

> Can you pay for it?

Claude pays $4.99 in USDC on Stellar. Article unlocks. Click the Stellar Explorer link to verify.

> Can you buy me the latest dataset from premium-data.io?

**Blocked.** premium-data.io is not on the approved list. No money moved. The policy decided, not the agent.

Each Claude Desktop session gets its own agent, credit line, policy, and dashboard.

---

## What happens

```
Agent finds paid service
    |
    v
Paywall returns 402 Payment Required (x402 on Stellar)
    |
    v
AgentPay checks spending policy --- BLOCKED? --> logged, no funds move
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

**Approved**: agent requests Capital Insider article -> 402 -> policy + credit check passes -> USDC settles on Stellar -> article unlocks -> spend logged

**Blocked**: agent requests premium-data.io -> policy rejects -> blocked event logged -> purchasing power unchanged -> zero risk

---

## What makes AgentPay different

- **Real on-chain settlement** — not simulated balances. USDC on Stellar, verifiable on-chain.
- **Policy enforcement before funds move** — blocked payments never touch the treasury. The policy decides, not the agent.
- **Overcollateralized** — credit lines are backed by real assets. No counterparty risk.
- **Built for machine decision loops** — thousands of autonomous micro-transactions, not humans clicking "approve."
- **Agent never holds keys** — AgentPay settles on behalf of the agent. The LLM never sees a private key.

---

## Why this works on Stellar

- **Settlement speed** — agents operate in tight loops. Sub-second finality means the agent doesn't wait.
- **Fees** — negligible. A $4.99 micropayment is economically viable.
- **USDC** — pricing is denominated in dollars. Stablecoin-native by design.
- **x402** — HTTP 402 + Stellar = payment and access compose natively. Every endpoint becomes payable.

---

## The credit model

Like a corporate credit card — except programmable and overcollateralized.

```
credit_limit    = collateral_value_usd x LTV
available       = credit_limit - spent
```

Owner posts 10,000 XLM ($1,000) -> LTV 0.6 -> agent gets $600 USDC credit limit. Payments settle in USDC. Blocked payments cost nothing. Owner controls policy in real time from the dashboard.

Every API becomes a business model once agents can transact. Pay-per-call APIs, dataset marketplaces, premium content, autonomous procurement — the use cases compound as agents become the primary consumers of digital services.

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

## Built during the Stellar Agents x402 Hackathon

AgentPay is a programmable credit primitive for AI agents. Built during the [Stellar Agents x402 Hackathon](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail) — first step toward machine-native financial infrastructure.

Works with Claude today. Extensible to any agent framework.
