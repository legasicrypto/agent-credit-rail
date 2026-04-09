import { describe, it, expect } from "vitest";
import { Store, createSeededStore } from "../store.js";
import { evaluatePaymentRequest } from "../decision.js";

function makeSeededStore() {
  return createSeededStore();
}

describe("evaluatePaymentRequest", () => {
  it("approves allowlisted service with sufficient power", () => {
    const store = makeSeededStore();
    const result = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 10 },
      store,
    );

    expect(result.status).toBe("pending");
    expect(result.attempt).toBeDefined();
    expect(result.attempt.status).toBe("pending");
    // used_power should NOT have changed — not submitted yet
    expect(store.getAgentUsedPower("agent-1")).toBe(0);
  });

  it("blocks denylisted service and stores blocked event immediately", () => {
    const store = makeSeededStore();
    // Add a denylisted service to policy
    const policy = store.getPolicy("agent-1")!;
    policy.services.push({
      service_url: "/evil",
      allowed: false,
      per_request_cap_usdc: 0,
      daily_cap_usdc: 0,
    });

    const result = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/evil", amount_usdc: 10 },
      store,
    );

    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("DENYLISTED");
    // Blocked event stored immediately
    const events = store.getAgentEvents("agent-1");
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("blocked");
    // Power unchanged
    expect(store.getAgentUsedPower("agent-1")).toBe(0);
  });

  it("blocks when insufficient power and stores blocked event immediately", () => {
    const store = makeSeededStore();
    // Request more than 600 USDC purchasing power
    const result = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 700 },
      store,
    );

    // Policy cap (100) should reject before credit check
    // But let's test credit check directly with an amount under cap but over power
    const store2 = makeSeededStore();
    // Set up: pre-spend most of the power via settled events
    store2.createAttempt({
      attempt_id: "prior-1",
      agent_id: "agent-1",
      service_url: "/search",
      amount_usdc: 95,
      status: "settled",
      created_at: 1,
    });
    store2.recordEvent({
      kind: "settled",
      attempt_id: "prior-1",
      agent_id: "agent-1",
      service_url: "/search",
      amount_usdc: 95,
      tx_hash: "tx-prior",
      created_at: 1,
    });
    // Repeat to use up 570 of 600
    for (let i = 2; i <= 6; i++) {
      store2.createAttempt({
        attempt_id: `prior-${i}`,
        agent_id: "agent-1",
        service_url: "/search",
        amount_usdc: 95,
        status: "settled",
        created_at: i,
      });
      store2.recordEvent({
        kind: "settled",
        attempt_id: `prior-${i}`,
        agent_id: "agent-1",
        service_url: "/search",
        amount_usdc: 95,
        tx_hash: `tx-prior-${i}`,
        created_at: i,
      });
    }
    // Used power = 6 × 95 = 570, remaining = 30
    expect(store2.getAgentUsedPower("agent-1")).toBe(570);

    const result2 = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 50 },
      store2,
    );
    expect(result2.status).toBe("blocked");
    expect(result2.reason).toBe("INSUFFICIENT_POWER");
    expect(store2.getAgentUsedPower("agent-1")).toBe(570); // unchanged
  });

  it("sequential approvals use current used_power (no reservation)", () => {
    const store = makeSeededStore();

    const r1 = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 50 },
      store,
    );
    expect(r1.status).toBe("pending");

    // Second request also sees 0 used_power — no reservation
    const r2 = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 50 },
      store,
    );
    expect(r2.status).toBe("pending");

    expect(store.getAgentUsedPower("agent-1")).toBe(0);
  });

  it("drift guard: blocked payment does not change available power", () => {
    const store = makeSeededStore();
    const powerBefore = store.getAgentUsedPower("agent-1");

    evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/unknown", amount_usdc: 10 },
      store,
    );

    expect(store.getAgentUsedPower("agent-1")).toBe(powerBefore);
  });

  it("drift guard: approved attempt does not reduce used_power", () => {
    const store = makeSeededStore();

    evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 50 },
      store,
    );

    // used_power must still be 0 — attempt is not a settlement
    expect(store.getAgentUsedPower("agent-1")).toBe(0);
  });
});
