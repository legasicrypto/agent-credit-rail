# Try Agent Credit Rail with Claude Desktop

Agent Credit Rail lets AI agents spend against an overcollateralized credit line on Stellar. The agent never receives unrestricted funds — Legasi checks policy, verifies credit, and settles USDC payments on the agent's behalf.

## Live demo links

| Service | URL |
|---------|-----|
| Dashboard | https://legasi-dashboard-production.up.railway.app |
| Orchestrator API | https://legasi-orchestrator-production.up.railway.app/health |
| Paywall (402) | https://legasi-paywall-production.up.railway.app/search |

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

Quit (Cmd+Q / Alt+F4) and relaunch. You should see the hammer icon with tools available.

## Example prompts

Try these in order:

**1. Set up your Legasi profile**
> Set up Legasi for this Claude session. My name is [your name].

This provisions a fresh agent with a 600 USDC credit line backed by demo collateral. You'll receive a personal dashboard link.

**2. Check your policy**
> Show my policy.

**3. Read a premium article (approved flow)**
> Read the premium article.

Watch the payment settle in real time on Stellar testnet. Click the explorer link to verify.

**4. Check your payment history**
> Show my payment history.

**5. Test policy enforcement**
> Go to my dashboard and block `/search`, then try reading the article again.

Open your dashboard link, click Edit on Policy Rules, toggle `/search` to DENIED, save. Then ask Claude to read the article again — it will be blocked.

## What to observe

After each prompt, open your personal dashboard link and watch:

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

The agent never touches funds. Legasi settles on its behalf, against an overcollateralized credit line backed by the owner's XLM collateral. Each Claude Desktop session gets its own agent identity, policy, and payment history.
