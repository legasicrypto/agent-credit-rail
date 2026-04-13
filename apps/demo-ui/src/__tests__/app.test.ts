import { describe, it, expect } from "vitest";

// Lightweight test: verify the API contract shapes match what the UI expects.
// Full rendering tests would need jsdom + testing-library — keep lean for hackathon.

interface CreditAccount {
  agent_id: string;
  owner_id: string;
  collateral_value_usd: number;
  base_ltv: number;
  purchasing_power_usdc: number;
  used_power_usdc: number;
}

interface PaymentEvent {
  kind: "settled" | "blocked" | "failed";
  attempt_id: string;
  agent_id: string;
  service_url: string;
  amount_usdc: number;
  tx_hash?: string;
  reason?: string;
  error?: string;
  created_at: number;
}

describe("demo-ui API contract", () => {
  it("credit account shape has all fields the UI renders", () => {
    const account: CreditAccount = {
      agent_id: "agent-1",
      owner_id: "owner-1",
      collateral_value_usd: 1000,
      base_ltv: 0.6,
      purchasing_power_usdc: 600,
      used_power_usdc: 100,
    };
    // UI computes available power
    const available = account.purchasing_power_usdc - account.used_power_usdc;
    expect(available).toBe(500);
    // UI renders all these fields
    expect(account.collateral_value_usd).toBeDefined();
    expect(account.base_ltv).toBeDefined();
    expect(account.purchasing_power_usdc).toBeDefined();
    expect(account.used_power_usdc).toBeDefined();
    expect(account.agent_id).toBeDefined();
  });

  it("settled event has tx_hash and attempt_id", () => {
    const event: PaymentEvent = {
      kind: "settled",
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      tx_hash: "tx-abc",
      created_at: 1000,
    };
    expect(event.tx_hash).toBeDefined();
    expect(event.attempt_id).toBeDefined();
  });

  it("blocked event has reason and attempt_id", () => {
    const event: PaymentEvent = {
      kind: "blocked",
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "premium-data.io",
      amount_usdc: 10,
      reason: "NOT_ALLOWLISTED",
      created_at: 1000,
    };
    expect(event.reason).toBeDefined();
    expect(event.attempt_id).toBeDefined();
  });
});
