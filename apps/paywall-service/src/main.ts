import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { createPaywallApp } from "./server.js";

dotenv.config();

const PORT = parseInt(process.env.PAYWALL_PORT || "4020", 10);
const STELLAR_PAYEE_ADDRESS = process.env.STELLAR_PAYEE_ADDRESS;

if (!STELLAR_PAYEE_ADDRESS) {
  console.error("STELLAR_PAYEE_ADDRESS is required");
  process.exit(1);
}

const app = createPaywallApp({
  stellarPayeeAddress: STELLAR_PAYEE_ADDRESS,
  stellarNetwork: (process.env.STELLAR_NETWORK || "stellar:testnet") as `${string}:${string}`,
  facilitatorUrl: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
  price: process.env.PAYWALL_PRICE || "$0.001",
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Paywall service running on http://localhost:${PORT}`);
  console.log(`  GET /search  → 402 (requires Stellar payment)`);
  console.log(`  GET /health  → 200`);
});
