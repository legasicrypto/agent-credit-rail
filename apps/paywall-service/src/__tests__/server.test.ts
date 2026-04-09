import { describe, it, expect } from "vitest";
import { createPaywallApp } from "../server.js";

// Dummy Stellar testnet address for tests
const TEST_PAYEE = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const app = createPaywallApp({ stellarPayeeAddress: TEST_PAYEE });

describe("paywall-service", () => {
  it("GET /health returns 200", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /search without payment returns 402", async () => {
    const res = await app.request("/search");
    expect(res.status).toBe(402);
  });

  it("402 response includes x402 payment-required header", async () => {
    const res = await app.request("/search");
    expect(res.status).toBe(402);
    // x402 returns payment requirements as a header or in the body
    // The exact header name is PAYMENT-REQUIRED (base64-encoded PaymentRequired object)
    const paymentHeader = res.headers.get("payment-required");
    expect(paymentHeader).toBeTruthy();
  });

  it("402 challenge references Stellar network", async () => {
    const res = await app.request("/search");
    const paymentHeader = res.headers.get("payment-required");
    expect(paymentHeader).toBeTruthy();
    // Decode the base64 header to inspect the challenge
    const decoded = JSON.parse(
      Buffer.from(paymentHeader!, "base64").toString("utf-8"),
    );
    // Should contain accepts array with our Stellar config
    expect(decoded).toHaveProperty("accepts");
    const stellarAccept = decoded.accepts.find(
      (a: { network: string }) => a.network?.startsWith("stellar"),
    );
    expect(stellarAccept).toBeDefined();
    expect(stellarAccept.payTo).toBe(TEST_PAYEE);
    expect(stellarAccept.scheme).toBe("exact");
  });
});
