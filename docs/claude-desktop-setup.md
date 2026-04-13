# Try AgentPay with Claude Desktop

AgentPay gives AI agents their own corporate credit card — backed by real collateral, controlled by policy, settled on Stellar.

## Live demo links

| Service | URL |
|---------|-----|
| Capital Insider (paywalled publication) | https://capital-insider-production.up.railway.app |
| AgentPay Dashboard | https://legasi-dashboard-production.up.railway.app |

## Setup (1 minute)

Open your Claude Desktop config file:

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Copy-paste this — nothing to change:

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

Restart Claude Desktop (Cmd+Q / Alt+F4, then relaunch). You should see the hammer icon with 5 tools available.

## Demo script

### 1. Discover the paywalled article

First, visit https://capital-insider-production.up.railway.app — you'll see a premium financial publication. Click on the featured article. Try the "Pay $4.99" button — it asks for a credit card or wallet. Close it.

Now ask Claude:

> Is there any news about Legasi on capital-insider-production.up.railway.app?

Claude finds the article but can't read the full content — it's paywalled.

### 2. Ask Claude to pay for it

> Can you pay for it?

Claude uses AgentPay to pay $0.001 USDC on Stellar testnet and unlocks the full article. Click the **Stellar Explorer** link to see the real on-chain transaction.

### 3. Check your dashboard

> Show me my dashboard.

Open the link — you'll see the payment in the **Transaction Feed**, the credit card with remaining balance, and the spending policy.

### 4. Test policy enforcement (blocked flow)

> Can you access unknown-api.xyz for me?

The payment is **blocked** — unknown-api.xyz is not allowlisted. AgentPay never lets the agent spend outside its policy.

### 5. Edit the policy live

Open your dashboard, click **Edit** on Spending Policy, toggle `/article` to **DENIED**, save. Then:

> Read the premium article again.

Blocked! The owner controls where the agent can spend, in real time.

## What to observe

- **Payment settled on Stellar** — real USDC transaction on testnet, verifiable on Stellar Explorer
- **Policy enforcement** — blocked payments never move money, only approved ones settle
- **Dashboard updates live** — transaction feed, credit utilization, policy rules
- **No wallet needed** — the AI agent pays through its credit line, not a connected wallet
- **Owner controls everything** — spending rules, caps, and allowlists are editable in real time

## How it works

```
User → Claude Desktop → AgentPay MCP → Paywall (402) → Legasi Orchestrator → Stellar USDC settlement
                                                              ↓
                                                      Policy check + Credit check
```

The agent never touches funds. AgentPay settles on its behalf, against an overcollateralized credit line backed by the owner's XLM collateral. Each Claude Desktop session gets its own agent identity, policy, and payment history.
