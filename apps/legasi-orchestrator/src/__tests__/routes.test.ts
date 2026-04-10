import { describe, it, expect } from "vitest";
import { createSeededStore } from "../store.js";
import { createOrchestratorApp } from "../routes.js";
import type { PaymentSettler } from "../submission.js";

const mockSettler: PaymentSettler = {
  settle: async () => ({ tx_hash: "tx-mock-123", result: { data: "mock-content" } }),
};

function makeApp() {
  const store = createSeededStore();
  const app = createOrchestratorApp(store, mockSettler);
  return { app, store };
}

describe("orchestrator routes", () => {
  it("GET /health returns 200", async () => {
    const { app } = makeApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("POST /payment/request with valid approved request returns settled", async () => {
    const { app } = makeApp();
    const res = await app.request("/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: "/search",
        amount_usdc: 10,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("settled");
    expect(body.attempt_id).toBeDefined();
    expect(body.tx_hash).toBe("tx-mock-123");
  });

  it("POST /payment/request with blocked service returns blocked", async () => {
    const { app } = makeApp();
    const res = await app.request("/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: "/unknown-api",
        amount_usdc: 10,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("blocked");
    expect(body.reason).toBe("NOT_ALLOWLISTED");
    expect(body.attempt_id).toBeDefined();
  });

  it("POST /payment/request with invalid body returns 400", async () => {
    const { app } = makeApp();
    const res = await app.request("/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /account/:agentId returns credit account view", async () => {
    const { app } = makeApp();
    const res = await app.request("/account/agent-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collateral_value_usd).toBe(1000);
    expect(body.base_ltv).toBe(0.6);
    expect(body.purchasing_power_usdc).toBe(600);
    expect(body.used_power_usdc).toBe(0);
  });

  it("GET /account/:agentId reflects used_power after settled payment", async () => {
    const { app } = makeApp();

    // Make a payment first
    await app.request("/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: "/search",
        amount_usdc: 50,
      }),
    });

    const res = await app.request("/account/agent-1");
    const body = await res.json();
    expect(body.used_power_usdc).toBe(50);
    expect(body.purchasing_power_usdc).toBe(600);
  });

  it("GET /payments/:agentId returns payment history", async () => {
    const { app } = makeApp();

    // Settled payment
    await app.request("/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: "/search",
        amount_usdc: 10,
      }),
    });

    // Blocked payment
    await app.request("/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent-1",
        service_url: "/blocked-service",
        amount_usdc: 10,
      }),
    });

    const res = await app.request("/payments/agent-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(2);
    expect(body.events[0].kind).toBe("settled");
    expect(body.events[1].kind).toBe("blocked");
  });

  it("GET /account/nonexistent returns 404", async () => {
    const { app } = makeApp();
    const res = await app.request("/account/nonexistent");
    expect(res.status).toBe(404);
  });
});
