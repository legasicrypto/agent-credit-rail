import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { createSeededStore } from "./store.js";
import { createOrchestratorApp } from "./routes.js";
import type { PaymentSettler } from "./submission.js";
import { createX402Settler } from "./x402-settler.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

const PORT = parseInt(process.env.ORCHESTRATOR_PORT || "4010", 10);

function createSettler(): PaymentSettler {
  const secretKey = process.env.STELLAR_TESTNET_SECRET_KEY;
  if (secretKey) {
    console.log("[stellar] Using real x402 settler (testnet)");
    return createX402Settler(secretKey);
  }

  console.log("[mock] No STELLAR_TESTNET_SECRET_KEY — using mock settler");
  return {
    settle: async (_serviceUrl, _challenge) => ({
      tx_hash: `mock-tx-${Date.now()}`,
      result: { note: "Mock settlement — set STELLAR_TESTNET_SECRET_KEY for real Stellar" },
    }),
  };
}

const store = createSeededStore();
const settler = createSettler();
const app = createOrchestratorApp(store, settler);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Legasi Orchestrator running on http://localhost:${PORT}`);
  console.log(`  POST /payment/request  → terminal orchestration response`);
  console.log(`  GET  /account/:agentId → credit account view`);
  console.log(`  GET  /payments/:agentId → payment history`);
  console.log(`  GET  /health           → 200`);
  console.log();
  console.log(`Seeded: owner=10000 XLM ($1000 USD), LTV=0.6, power=600 USDC, agent=agent-1`);
});
