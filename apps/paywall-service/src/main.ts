import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { createPaywallApp } from "./server.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

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
  // Default: 0.001 XLM via wrapped XLM SAC (friendbot-funded accounts work immediately)
  price: process.env.PAYWALL_PRICE || undefined,
});

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, () => {
  console.log(`Paywall service running on http://localhost:${PORT}`);
  console.log(`  GET /search  → 402 (requires Stellar payment)`);
  console.log(`  GET /health  → 200`);
});
