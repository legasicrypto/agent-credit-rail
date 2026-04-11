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

  // ── PUT /policy/:agentId ──

  it("PUT /policy/:agentId updates policy and GET confirms change", async () => {
    const { app } = makeApp();
    const res = await app.request("/policy/agent-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        services: [
          { service_url: "/new-service", allowed: true, per_request_cap_usdc: 50, daily_cap_usdc: 200 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy.agent_id).toBe("agent-1");
    expect(body.policy.services).toHaveLength(1);
    expect(body.policy.services[0].service_url).toBe("/new-service");

    // Confirm via GET
    const getRes = await app.request("/policy/agent-1");
    const getBody = await getRes.json();
    expect(getBody.policy.services).toHaveLength(1);
    expect(getBody.policy.services[0].service_url).toBe("/new-service");
  });

  it("PUT /policy/:agentId with invalid body returns 400", async () => {
    const { app } = makeApp();
    const res = await app.request("/policy/agent-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services: [{ service_url: "" }] }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /policy/nonexistent returns 404", async () => {
    const { app } = makeApp();
    const res = await app.request("/policy/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        services: [{ service_url: "/x", allowed: true, per_request_cap_usdc: 10, daily_cap_usdc: 50 }],
      }),
    });
    expect(res.status).toBe(404);
  });

  it("PUT /policy/:agentId upserts when no prior policy exists", async () => {
    const { app, store } = makeApp();
    // Create an agent with no policy
    store.createAgent({ id: "agent-no-policy", owner_id: "owner-1", name: "Bare Agent" });

    const res = await app.request("/policy/agent-no-policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        services: [{ service_url: "/fresh", allowed: true, per_request_cap_usdc: 5, daily_cap_usdc: 20 }],
      }),
    });
    expect(res.status).toBe(200);

    const getRes = await app.request("/policy/agent-no-policy");
    const getBody = await getRes.json();
    expect(getBody.policy.services).toHaveLength(1);
    expect(getBody.policy.services[0].service_url).toBe("/fresh");
  });
});
