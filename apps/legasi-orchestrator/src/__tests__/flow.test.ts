import { describe, it, expect } from "vitest";
import { createSeededStore } from "../store.js";
import { evaluatePaymentRequest } from "../decision.js";
import { submitPayment, type StellarSubmitter } from "../submission.js";

const successSubmitter: StellarSubmitter = {
  submit: async () => ({ tx_hash: "tx-stellar-abc123" }),
};

const failureSubmitter: StellarSubmitter = {
  submit: async () => {
    throw new Error("Stellar submission timeout");
  },
};

describe("submission flow", () => {
  it("approved attempt + successful submission → used_power increases, settled event", async () => {
    const store = createSeededStore();
    const decision = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 10 },
      store,
    );
    expect(decision.status).toBe("pending");

    const response = await submitPayment(
      decision.attempt,
      store,
      successSubmitter,
      { results: ["data"] },
    );

    expect(response.status).toBe("settled");
    if (response.status === "settled") {
      expect(response.tx_hash).toBe("tx-stellar-abc123");
      expect(response.result).toEqual({ results: ["data"] });
    }
    expect(response.attempt_id).toBe(decision.attempt.attempt_id);

    // used_power increased
    expect(store.getAgentUsedPower("agent-1")).toBe(10);

    // event linked to attempt
    const event = store.getEventForAttempt(decision.attempt.attempt_id);
    expect(event).toBeDefined();
    expect(event!.kind).toBe("settled");
  });

  it("approved attempt + submission failure → used_power unchanged, failed event", async () => {
    const store = createSeededStore();
    const decision = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 10 },
      store,
    );
    expect(decision.status).toBe("pending");

    const response = await submitPayment(
      decision.attempt,
      store,
      failureSubmitter,
      null,
    );

    expect(response.status).toBe("failed");
    if (response.status === "failed") {
      expect(response.error).toBe("Stellar submission timeout");
    }

    // used_power unchanged
    expect(store.getAgentUsedPower("agent-1")).toBe(0);

    // failed event linked
    const event = store.getEventForAttempt(decision.attempt.attempt_id);
    expect(event).toBeDefined();
    expect(event!.kind).toBe("failed");
  });

  it("full flow: request → decision → submit → terminal response, attempt_id consistent", async () => {
    const store = createSeededStore();

    // Decision
    const decision = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/search", amount_usdc: 25 },
      store,
    );
    expect(decision.status).toBe("pending");
    const attemptId = decision.attempt.attempt_id;

    // Submit
    const response = await submitPayment(
      decision.attempt,
      store,
      successSubmitter,
      { query: "test", results: ["r1"] },
    );

    // Verify terminal response
    expect(response.status).toBe("settled");
    expect(response.attempt_id).toBe(attemptId);

    // Verify store consistency
    const attempt = store.getAttempt(attemptId);
    expect(attempt).toBeDefined();
    const event = store.getEventForAttempt(attemptId);
    expect(event).toBeDefined();
    expect(event!.attempt_id).toBe(attemptId);
    expect(store.getAgentUsedPower("agent-1")).toBe(25);
  });

  it("blocked flow: decision blocks immediately, no submission needed", () => {
    const store = createSeededStore();

    const decision = evaluatePaymentRequest(
      { agent_id: "agent-1", service_url: "/unknown-service", amount_usdc: 10 },
      store,
    );

    expect(decision.status).toBe("blocked");
    expect(decision.reason).toBe("NOT_ALLOWLISTED");

    // Event already stored
    const events = store.getAgentEvents("agent-1");
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("blocked");

    // Power unchanged
    expect(store.getAgentUsedPower("agent-1")).toBe(0);
  });
});
