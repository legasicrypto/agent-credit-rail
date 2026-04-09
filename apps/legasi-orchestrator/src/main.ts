import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { createSeededStore } from "./store.js";
import { createOrchestratorApp } from "./routes.js";
import type { StellarSubmitter } from "./submission.js";

dotenv.config();

const PORT = parseInt(process.env.ORCHESTRATOR_PORT || "4010", 10);

// Phase 1: mock submitter for local dev. Real Stellar submitter in smoke tests.
const mockSubmitter: StellarSubmitter = {
  submit: async (attempt) => {
    console.log(`[mock] Submitting payment for ${attempt.amount_usdc} USDC → ${attempt.service_url}`);
    return { tx_hash: `mock-tx-${Date.now()}` };
  },
};

const store = createSeededStore();
const app = createOrchestratorApp(store, mockSubmitter);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Legasi Orchestrator running on http://localhost:${PORT}`);
  console.log(`  POST /payment/request  → terminal orchestration response`);
  console.log(`  GET  /account/:agentId → credit account view`);
  console.log(`  GET  /payments/:agentId → payment history`);
  console.log(`  GET  /health           → 200`);
  console.log();
  console.log(`Seeded: owner=1000 USD, LTV=0.6, power=600 USDC, agent=agent-1`);
});
