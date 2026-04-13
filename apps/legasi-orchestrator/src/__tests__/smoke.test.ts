/**
 * Smoke test: real x402 settle-and-unlock on Stellar testnet.
 *
 * Proves the full product flow:
 *   paywall returns 402 → orchestrator checks credit/policy →
 *   x402 settler signs auth entries → retries with payment proof →
 *   facilitator settles on Stellar → paywall unlocks → tx_hash returned
 *
 * Requires env vars:
 *   STELLAR_TESTNET_SECRET_KEY  — funded testnet account (payer / agent signer)
 *   STELLAR_PAYEE_ADDRESS       — funded testnet account (paywall recipient)
 *
 * Skips gracefully if env vars are missing.
 * Safe to rerun — uses tiny amounts (0.001 XLM).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { serve } from "@hono/node-server";
import type { AddressInfo } from "node:net";
import { createPaywallApp } from "@agent-credit-rail/paywall-service";
import { createSeededStore } from "../store.js";
import { createOrchestratorApp } from "../routes.js";
import { createX402Settler } from "../x402-settler.js";

/** USDC on Stellar testnet (SAC for USDC:GBBD47IF...). */
const USDC_TESTNET_ASSET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const SECRET_KEY = process.env.STELLAR_TESTNET_SECRET_KEY;
const PAYEE_ADDRESS = process.env.STELLAR_PAYEE_ADDRESS;
const missingEnv = !SECRET_KEY || !PAYEE_ADDRESS;

describe.skipIf(missingEnv)("smoke: real x402 settle-and-unlock on Stellar testnet", () => {
  let paywallUrl: string;
  let orchestratorUrl: string;
  let paywallServer: ReturnType<typeof serve>;
  let orchestratorServer: ReturnType<typeof serve>;

  beforeAll(async () => {
    // Start paywall service with real x402 middleware
    const paywallApp = createPaywallApp({
      stellarPayeeAddress: PAYEE_ADDRESS!,
      price: { amount: "10000", asset: USDC_TESTNET_ASSET },
    });
    paywallServer = serve({ fetch: paywallApp.fetch, port: 0 });
    const paywallPort = (paywallServer.address() as AddressInfo).port;
    paywallUrl = `http://localhost:${paywallPort}`;

    // Start orchestrator with real x402 settler
    const store = createSeededStore();
    const settler = createX402Settler(SECRET_KEY!);
    const orchestratorApp = createOrchestratorApp(store, settler);
    orchestratorServer = serve({ fetch: orchestratorApp.fetch, port: 0 });
    const orchestratorPort = (orchestratorServer.address() as AddressInfo).port;
    orchestratorUrl = `http://localhost:${orchestratorPort}`;

    return () => {
      paywallServer.close();
      orchestratorServer.close();
    };
  });

  it("GET /article without payment returns 402 with x402 challenge", async () => {
    const res = await fetch(`${paywallUrl}/article`);
    expect(res.status).toBe(402);

    const paymentHeader = res.headers.get("payment-required");
    expect(paymentHeader).toBeDefined();

    const challenge = JSON.parse(
      Buffer.from(paymentHeader!, "base64").toString("utf-8"),
    );
    expect(challenge.x402Version).toBe(2);
    expect(challenge.accepts).toBeInstanceOf(Array);
    expect(challenge.accepts.length).toBeGreaterThan(0);
    expect(challenge.accepts[0].scheme).toBe("exact");
    expect(challenge.accepts[0].network).toBe("stellar:testnet");

    console.log("[smoke] 402 challenge received:", JSON.stringify(challenge.accepts[0], null, 2));
  });

  it("full settle-and-unlock: 402 → credit check → x402 payment → Stellar settlement → unlock", async () => {
    // 1. Hit the paywall — get 402 challenge
    const paywallRes = await fetch(`${paywallUrl}/article`);
    expect(paywallRes.status).toBe(402);

    const paymentHeader = paywallRes.headers.get("payment-required");
    const challenge = JSON.parse(
      Buffer.from(paymentHeader!, "base64").toString("utf-8"),
    );

    // Extract price from challenge (v2 format)
    const amount = challenge.accepts[0].amount;
    const priceUsdc = parseFloat(amount) / 10_000_000;

    console.log("[smoke] Challenge price:", priceUsdc, "USDC (atomic:", amount, ")");

    // 2. Forward to orchestrator with full challenge
    const orchestratorRes = await fetch(`${orchestratorUrl}/payment/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: `${paywallUrl}/article`,
        amount_usdc: priceUsdc,
        payment_challenge: challenge,
      }),
    });

    const result = await orchestratorRes.json();
    console.log("[smoke] Orchestration result:", JSON.stringify(result, null, 2));

    // 3. Verify settlement
    expect(result.status).toBe("settled");
    expect(result.tx_hash).toBeDefined();
    expect(result.tx_hash).not.toMatch(/^mock-/);
    expect(result.attempt_id).toBeDefined();

    // 4. Verify unlocked content
    expect(result.result).toBeDefined();
    expect(result.result.results).toBeInstanceOf(Array);
    expect(result.result.results.length).toBeGreaterThan(0);

    console.log("[smoke] ✓ Real Stellar tx hash:", result.tx_hash);
    console.log("[smoke] ✓ Unlocked content:", JSON.stringify(result.result));
    console.log(
      `[smoke] ✓ View on Stellar Expert: https://stellar.expert/explorer/testnet/tx/${result.tx_hash}`,
    );
  }, 60_000); // 60s timeout for real network

  it("blocked flow still works: unknown service is rejected without Stellar interaction", async () => {
    const res = await fetch(`${orchestratorUrl}/payment/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: "premium-data.io",
        amount_usdc: 10,
      }),
    });

    const result = await res.json();
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("NOT_ALLOWLISTED");

    console.log("[smoke] ✓ Blocked flow works:", result.reason);
  });

  it("credit account reflects settled spend", async () => {
    const res = await fetch(`${orchestratorUrl}/account/agent-1`);
    const account = await res.json();

    expect(account.purchasing_power_usdc).toBe(600);
    expect(account.used_power_usdc).toBeGreaterThan(0);

    console.log("[smoke] ✓ Credit account after spend:", {
      purchasing_power: account.purchasing_power_usdc,
      used_power: account.used_power_usdc,
      remaining: account.purchasing_power_usdc - account.used_power_usdc,
    });
  });
});
