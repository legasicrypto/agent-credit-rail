# Try Agent Credit Rail with Claude Desktop

Agent Credit Rail lets AI agents spend against an overcollateralized credit line on Stellar. The agent never receives unrestricted funds — Legasi checks policy, verifies credit, and settles USDC payments on the agent's behalf.

## Live demo links

| Service | URL |
|---------|-----|
| Dashboard | https://legasi-dashboard-production.up.railway.app |
| Orchestrator API | https://legasi-orchestrator-production.up.railway.app/health |
| Paywall (402) | https://legasi-paywall-production.up.railway.app/search |

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

Restart Claude Desktop (Cmd+Q / Alt+F4, then relaunch). You should see the hammer icon (🔨) with 5 tools available.

## Demo script

Try these prompts in order:

### 1. Set up your Legasi profile
> Set up Legasi for me. My name is [your name].

You get a fresh agent with a **600 USDC credit line** backed by 10,000 XLM demo collateral, and a personal dashboard link.

### 2. Check your policy
> Show my policy.

### 3. Read a premium article (approved flow)
> Read the premium article.

Watch the payment settle in real time on Stellar testnet. Click the Stellar Explorer link to verify the on-chain USDC transfer.

### 4. Check your payment history
> Show my payment history.

### 5. Test policy enforcement (blocked flow)

Open your dashboard link, click **Edit** on Policy Rules, toggle `/search` to **DENIED**, save. Then:

> Read the premium article again.

The payment will be **blocked** by policy. Toggle it back to ALLOWED to restore access.

## What to observe

After each prompt, open your personal dashboard link and watch:

- **Payment History** — settled (green) or blocked (red) events appear in real time
- **Policy Rules** — per-request and daily caps
- **Power Bar** — available credit decreases after each settled payment
- **Stellar Explorer** — click any tx hash to see the real USDC settlement on Stellar testnet

## How it works

```
Claude Desktop → MCP tool → Paywall (402) → Legasi Orchestrator → Stellar USDC settlement
                                                    ↓
                                            Policy check + Credit check
```

The agent never touches funds. Legasi settles on its behalf, against an overcollateralized credit line backed by the owner's XLM collateral. Each Claude Desktop session gets its own agent identity, policy, and payment history.
