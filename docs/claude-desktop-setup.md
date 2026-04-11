# Try Agent Credit Rail with Claude Desktop

Agent Credit Rail lets AI agents spend against an overcollateralized credit line on Stellar. The agent never receives unrestricted funds — Legasi checks policy, verifies credit, and settles USDC payments on the agent's behalf.

## Live demo links

| Service | URL |
|---------|-----|
| Dashboard | https://legasi-dashboard.fly.dev |
| Orchestrator API | https://legasi-orchestrator.fly.dev/health |
| Paywall (402) | https://legasi-paywall.fly.dev/search |

## Setup (2 minutes)

### 1. Clone and install

```bash
git clone https://github.com/legasicrypto/agent-credit-rail.git
cd agent-credit-rail
pnpm install
```

### 2. Configure Claude Desktop

Open your Claude Desktop config file:

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add to `mcpServers`:

```json
{
  "mcpServers": {
    "legasi-credit-rail": {
      "command": "<path-to-repo>/apps/mcp-server/node_modules/.bin/tsx",
      "args": ["apps/mcp-server/src/main.ts"],
      "cwd": "<path-to-repo>"
    }
  }
}
```

Replace `<path-to-repo>` with the full path to the cloned repository.

### 3. Restart Claude Desktop

Quit (Cmd+Q / Alt+F4) and relaunch. You should see the hammer icon with 4 tools available.

## Example prompts

Try these in order:

**1. Discover agents**
> List the available demo agents and summarize their policies.

**2. Read a premium article (approved flow)**
> Use agent-1 to read the premium article from the paywalled service.

**3. Try a different agent (different policy)**
> Try the same request with agent-2 and explain whether policy allows or blocks it.

**4. Check payment history**
> Show the recent payment history for agent-1.

## What to observe

After each prompt, open the [dashboard](https://legasi-dashboard.fly.dev) and watch:

- **Payment History** — new settled (green) or blocked (red) events appear
- **Policy Rules** — caps and daily spend update in real time
- **Power Bar** — available credit decreases after each settled payment
- **Stellar Explorer** — click any tx hash to see the real USDC settlement on Stellar testnet

## How it works

```
Claude Desktop → MCP tool → Paywall (402) → Legasi Orchestrator → Stellar USDC settlement
                                                    ↓
                                            Policy check + Credit check
```

The agent never touches funds. Legasi settles on its behalf, against an overcollateralized credit line backed by the owner's XLM collateral.
