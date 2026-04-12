#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Inlined from @agent-credit-rail/shared-types to keep MCP server standalone
type OrchestrationResponse =
  | { status: "settled"; attempt_id: string; tx_hash: string; result: unknown }
  | { status: "blocked"; attempt_id: string; reason: string }
  | { status: "failed"; attempt_id: string; error: string };

const ORCHESTRATOR_URL =
  process.env.ORCHESTRATOR_URL || "https://legasi-orchestrator-production.up.railway.app";
const PAYWALL_URL =
  process.env.PAYWALL_URL || "https://capital-insider-production.up.railway.app";
const DASHBOARD_URL =
  process.env.DASHBOARD_URL || "https://legasi-dashboard-production.up.railway.app";

// ── Session state ──

let sessionAgentId: string | null = null;
let sessionAgentName: string | null = null;
let sessionDashboardUrl: string | null = null;

interface ProvisionResult {
  agent_id: string;
  agent_name: string;
  dashboard_url: string;
}

async function ensureProvisioned(displayName?: string): Promise<ProvisionResult> {
  if (sessionAgentId && sessionAgentName && sessionDashboardUrl) {
    return { agent_id: sessionAgentId, agent_name: sessionAgentName, dashboard_url: sessionDashboardUrl };
  }

  const res = await fetch(`${ORCHESTRATOR_URL}/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!res.ok) throw new Error(`Provisioning failed: ${res.status}`);
  const data = await res.json();

  sessionAgentId = data.agent_id;
  sessionAgentName = data.agent_name;
  sessionDashboardUrl = data.dashboard_url;

  return { agent_id: data.agent_id, agent_name: data.agent_name, dashboard_url: data.dashboard_url };
}

const server = new McpServer({
  name: "legasi-credit-rail",
  version: "0.2.0",
});

// ── Tool 1: setup_legasi ──

server.tool(
  "setup_legasi",
  "Set up a Legasi spending profile for this Claude session. Provisions a fresh agent with a credit line backed by demo collateral. Call this explicitly, or it happens automatically on first use of any other tool. IMPORTANT: Always share the dashboard link with the user as a clickable URL.",
  {
    display_name: z.string().optional().describe("Your name (e.g. 'Alice'). Defaults to 'Judge' if not provided."),
  },
  async ({ display_name }) => {
    try {
      const profile = await ensureProvisioned(display_name);
      return {
        content: [
          {
            type: "text" as const,
            text: `Legasi profile provisioned for this session.\n\nAgent: ${profile.agent_name} (${profile.agent_id})\nCredit line: 600 USDC (backed by 10,000 XLM demo collateral)\n\n🔗 [Open Dashboard](${profile.dashboard_url})\n\nYou can now read premium articles, check your policy, or view payment history.`,
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

// ── Tool 2: get_dashboard_link ──

server.tool(
  "get_dashboard_link",
  "Get the dashboard URL for this session's Legasi agent. The dashboard shows payment history, policy rules, and credit usage in real time. IMPORTANT: Always share the link as a clickable URL.",
  {},
  async () => {
    try {
      const profile = await ensureProvisioned();
      return {
        content: [
          {
            type: "text" as const,
            text: `Dashboard for ${profile.agent_name}:\n\n🔗 [Open Dashboard](${profile.dashboard_url})`,
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

// ── Tool 3: show_my_policy ──

server.tool(
  "show_my_policy",
  "Show the policy rules for your Legasi agent — which services are allowed or denied, per-request and daily caps. IMPORTANT: Always include the dashboard link as a clickable URL in your response.",
  {},
  async () => {
    try {
      const profile = await ensureProvisioned();
      const polRes = await fetch(`${ORCHESTRATOR_URL}/policy/${profile.agent_id}`);
      if (!polRes.ok) throw new Error(`API error: ${polRes.status}`);
      const { policy } = await polRes.json();

      if (!policy?.services?.length) {
        return {
          content: [{ type: "text" as const, text: `No policy rules defined for ${profile.agent_name}.` }],
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
            text: `Policy for ${profile.agent_name}:\n${lines.join("\n")}\n\n🔗 [Open Dashboard](${profile.dashboard_url})`,
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
  "Read a premium article behind the Legasi paywall. Your agent pays via its credit line — policy and credit are checked automatically. Payment settles in USDC on Stellar testnet. IMPORTANT: Always share the Stellar Explorer link and dashboard link as clickable URLs in your response.",
  {},
  async () => {
    try {
      const profile = await ensureProvisioned();

      // 1. Hit the paywall
      const serviceRes = await fetch(`${PAYWALL_URL}/article`);

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
          agent_id: profile.agent_id,
          service_url: `${PAYWALL_URL}/article`,
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
              text: `[SETTLED — ${priceUsdc} USDC paid on Stellar testnet]\nAgent: ${profile.agent_name}\nTx: ${result.tx_hash}\n\n🔗 [View on Stellar Explorer](https://stellar.expert/explorer/testnet/tx/${result.tx_hash})\n🔗 [Open Dashboard](${profile.dashboard_url})\n\n${content}`,
            },
          ],
        };
      }

      if (result.status === "blocked") {
        return {
          content: [
            {
              type: "text" as const,
              text: `[BLOCKED] ${profile.agent_name} denied by Legasi policy.\nReason: ${result.reason}\n\nThe agent's policy does not allow this service, or caps have been exceeded.\n\n🔗 [Open Dashboard](${profile.dashboard_url})`,
            },
          ],
        };
      }

      return {
        content: [
          { type: "text" as const, text: `[FAILED] Payment failed for ${profile.agent_name}.\nError: ${result.error}` },
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

// ── Tool 4: show_my_payments ──

server.tool(
  "show_my_payments",
  "Show your recent payment history — settled, blocked, and failed events. IMPORTANT: Always include the dashboard link as a clickable URL in your response.",
  {},
  async () => {
    try {
      const profile = await ensureProvisioned();
      const res = await fetch(`${ORCHESTRATOR_URL}/payments/${profile.agent_id}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const { events } = await res.json();

      if (!events?.length) {
        return {
          content: [{ type: "text" as const, text: `No payment history yet for ${profile.agent_name}.\n\n🔗 [Open Dashboard](${profile.dashboard_url})` }],
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
            text: `Payment history for ${profile.agent_name} (${events.length} events):\n${lines.join("\n")}\n\n🔗 [Open Dashboard](${profile.dashboard_url})`,
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
