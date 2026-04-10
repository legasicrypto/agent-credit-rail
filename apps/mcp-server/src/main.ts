import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { OrchestrationResponse } from "@agent-credit-rail/shared-types";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

const ORCHESTRATOR_URL =
  process.env.ORCHESTRATOR_URL || "http://localhost:4010";
const AGENT_ID = process.env.AGENT_ID || "agent-1";

const server = new McpServer({
  name: "legasi-credit-rail",
  version: "0.1.0",
});

server.tool(
  "access_paid_service",
  "Access a paid HTTP service via Legasi credit rail. Handles 402 payment challenges automatically — checks policy, verifies credit, and settles USDC on Stellar if approved.",
  {
    url: z.string().describe("The URL of the service to access (e.g. http://localhost:4020/search)"),
  },
  async ({ url }) => {
    try {
      // 1. Hit the service
      const serviceRes = await fetch(url);

      // 2. Not 402 → free, return directly
      if (serviceRes.status !== 402) {
        const body = await serviceRes.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `[FREE — no payment needed]\n\n${body}`,
            },
          ],
        };
      }

      // 3. Extract x402 challenge from 402 response
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
          agent_id: AGENT_ID,
          service_url: url,
          amount_usdc: priceUsdc,
          payment_challenge: paymentRequired,
        }),
      });

      const result: OrchestrationResponse = await orchRes.json();

      if (result.status === "settled") {
        return {
          content: [
            {
              type: "text" as const,
              text: `[SETTLED — ${priceUsdc} USDC paid on Stellar]\nTx: ${result.tx_hash}\n\n${typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)}`,
            },
          ],
        };
      }

      if (result.status === "blocked") {
        return {
          content: [
            {
              type: "text" as const,
              text: `[BLOCKED] Payment denied by Legasi policy.\nReason: ${result.reason}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `[FAILED] Payment failed.\nError: ${result.error}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `[ERROR] Could not reach service or orchestrator: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

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
    `Legasi MCP server running (agent=${AGENT_ID}, orchestrator=${ORCHESTRATOR_URL})`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
