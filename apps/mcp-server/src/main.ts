import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { OrchestrationResponse } from "@agent-credit-rail/shared-types";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

const ORCHESTRATOR_URL =
  process.env.ORCHESTRATOR_URL || "https://legasi-orchestrator.fly.dev";
const PAYWALL_URL =
  process.env.PAYWALL_URL || "https://legasi-paywall.fly.dev";

const server = new McpServer({
  name: "legasi-credit-rail",
  version: "0.1.0",
});

// ── Tool 1: list_agents ──

server.tool(
  "list_agents",
  "List all demo agents and their owner. Returns agent IDs, names, and which owner they belong to.",
  {},
  async () => {
    try {
      // Get agent-1 account to find the owner
      const accRes = await fetch(`${ORCHESTRATOR_URL}/account/agent-1`);
      if (!accRes.ok) throw new Error(`API error: ${accRes.status}`);
      const acc = await accRes.json();

      const agentsRes = await fetch(`${ORCHESTRATOR_URL}/agents/${acc.owner_id}`);
      if (!agentsRes.ok) throw new Error(`API error: ${agentsRes.status}`);
      const { agents } = await agentsRes.json();

      const lines = agents.map(
        (a: { id: string; name: string; owner_id: string }) =>
          `- ${a.name} (${a.id}) — owner: ${a.owner_id}`,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Available agents:\n${lines.join("\n")}\n\nUse get_policy to see what each agent is allowed to do.`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// ── Tool 2: get_policy ──

server.tool(
  "get_policy",
  "Get the policy rules for an agent — which services are allowed or denied, per-request and daily caps.",
  {
    agent_id: z.string().describe("The agent ID (e.g. agent-1, agent-2)"),
  },
  async ({ agent_id }) => {
    try {
      const polRes = await fetch(`${ORCHESTRATOR_URL}/policy/${agent_id}`);
      if (!polRes.ok) throw new Error(`Agent not found: ${agent_id}`);
      const { policy } = await polRes.json();

      if (!policy?.services?.length) {
        return {
          content: [{ type: "text" as const, text: `No policy rules defined for ${agent_id}.` }],
        };
      }

      const lines = policy.services.map(
        (s: { service_url: string; allowed: boolean; per_request_cap_usdc: number; daily_cap_usdc: number }) =>
          `- ${s.service_url}: ${s.allowed ? "ALLOWED" : "DENIED"} | per-request cap: ${s.per_request_cap_usdc} USDC | daily cap: ${s.daily_cap_usdc} USDC`,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Policy for ${agent_id}:\n${lines.join("\n")}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// ── Tool 3: read_premium_article ──

server.tool(
  "read_premium_article",
  "Read a premium article behind the Legasi paywall. The agent pays via its credit line — policy and credit are checked automatically. Payment settles in USDC on Stellar testnet.",
  {
    agent_id: z.string().describe("The agent ID to use for payment (e.g. agent-1, agent-2)"),
  },
  async ({ agent_id }) => {
    try {
      // 1. Hit the paywall
      const serviceRes = await fetch(`${PAYWALL_URL}/search`);

      // 2. Not 402 → free
      if (serviceRes.status !== 402) {
        const body = await serviceRes.text();
        return {
          content: [{ type: "text" as const, text: `[FREE — no payment needed]\n\n${body}` }],
        };
      }

      // 3. Extract x402 challenge
      const paymentHeader = serviceRes.headers.get("payment-required");
      const paymentRequired = paymentHeader
        ? JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"))
        : null;

      const priceUsdc = extractPrice(paymentRequired);

      // 4. Forward to Legasi orchestrator
      const orchRes = await fetch(`${ORCHESTRATOR_URL}/payment/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id,
          service_url: `${PAYWALL_URL}/search`,
          amount_usdc: priceUsdc,
          payment_challenge: paymentRequired,
        }),
      });

      const result: OrchestrationResponse = await orchRes.json();

      if (result.status === "settled") {
        const content = typeof result.result === "string"
          ? result.result
          : JSON.stringify(result.result, null, 2);
        return {
          content: [
            {
              type: "text" as const,
              text: `[SETTLED — ${priceUsdc} USDC paid on Stellar testnet]\nAgent: ${agent_id}\nTx: ${result.tx_hash}\nExplorer: https://stellar.expert/explorer/testnet/tx/${result.tx_hash}\n\n${content}`,
            },
          ],
        };
      }

      if (result.status === "blocked") {
        return {
          content: [
            {
              type: "text" as const,
              text: `[BLOCKED] Agent ${agent_id} denied by Legasi policy.\nReason: ${result.reason}\n\nThe agent's policy does not allow this service, or caps have been exceeded.`,
            },
          ],
        };
      }

      return {
        content: [
          { type: "text" as const, text: `[FAILED] Payment failed for agent ${agent_id}.\nError: ${result.error}` },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// ── Tool 4: get_payment_history ──

server.tool(
  "get_payment_history",
  "Get recent payment history for an agent — settled, blocked, and failed events.",
  {
    agent_id: z.string().describe("The agent ID (e.g. agent-1, agent-2)"),
  },
  async ({ agent_id }) => {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/payments/${agent_id}`);
      if (!res.ok) throw new Error(`Agent not found: ${agent_id}`);
      const { events } = await res.json();

      if (!events?.length) {
        return {
          content: [{ type: "text" as const, text: `No payment history for ${agent_id}.` }],
        };
      }

      const lines = events.map(
        (e: { kind: string; service_url: string; amount_usdc: number; tx_hash?: string; reason?: string; error?: string; created_at: number }) => {
          const time = new Date(e.created_at).toLocaleTimeString();
          if (e.kind === "settled")
            return `[${time}] SETTLED ${e.amount_usdc} USDC → ${e.service_url} (tx: ${e.tx_hash?.slice(0, 12)}...)`;
          if (e.kind === "blocked")
            return `[${time}] BLOCKED ${e.amount_usdc} USDC → ${e.service_url} (${e.reason})`;
          return `[${time}] FAILED ${e.amount_usdc} USDC → ${e.service_url} (${e.error})`;
        },
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Payment history for ${agent_id} (${events.length} events):\n${lines.join("\n")}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// ── Helpers ──

function extractPrice(paymentRequired: unknown): number {
  if (!paymentRequired || typeof paymentRequired !== "object") return 0.001;
  const pr = paymentRequired as {
    accepts?: Array<{ amount?: string; maxAmountRequired?: string }>;
  };
  const first = pr.accepts?.[0];
  if (!first) return 0.001;
  if (first.amount) return parseFloat(first.amount) / 10_000_000;
  if (first.maxAmountRequired)
    return parseFloat(first.maxAmountRequired) / 10_000_000;
  return 0.001;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `Legasi MCP server running (orchestrator=${ORCHESTRATOR_URL}, paywall=${PAYWALL_URL})`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
