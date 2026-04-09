import { describe, it, expect } from "vitest";
import type { AgentCreditAccount } from "@agent-credit-rail/shared-types";
import {
  computePurchasingPower,
  computeAvailablePower,
  checkPostPaymentExposure,
} from "../index.js";

function makeAccount(
  overrides: Partial<AgentCreditAccount> = {},
): AgentCreditAccount {
  const collateral = overrides.collateral_value_usd ?? 1000;
  const ltv = overrides.base_ltv ?? 0.6;
  return {
    agent_id: "agent-1",
    owner_id: "owner-1",
    collateral_value_usd: collateral,
    base_ltv: ltv,
    purchasing_power_usdc: collateral * ltv,
    used_power_usdc: 0,
    ...overrides,
  };
}

describe("computePurchasingPower", () => {
  it("returns collateral × LTV as USDC credit line", () => {
    expect(computePurchasingPower(1000, 0.6)).toBe(600);
  });

  it("returns zero for zero collateral", () => {
    expect(computePurchasingPower(0, 0.6)).toBe(0);
  });

  it("returns zero for zero LTV", () => {
    expect(computePurchasingPower(1000, 0)).toBe(0);
  });

  // Drift guard: credit line = collateral × LTV, NOT collateral itself
  it("drift guard: credit line is NOT the raw collateral value", () => {
    const power = computePurchasingPower(1000, 0.6);
    expect(power).not.toBe(1000);
    expect(power).toBe(600);
  });
});

describe("computeAvailablePower", () => {
  it("returns purchasing power minus used power", () => {
    const account = makeAccount({ used_power_usdc: 200 });
    expect(computeAvailablePower(account)).toBe(400);
  });

  it("returns full purchasing power when nothing is used", () => {
    const account = makeAccount();
    expect(computeAvailablePower(account)).toBe(600);
  });

  it("returns zero when fully spent", () => {
    const account = makeAccount({ used_power_usdc: 600 });
    expect(computeAvailablePower(account)).toBe(0);
  });

  // Drift guard: available power derived from credit account, not wallet balance
  it("drift guard: derives from credit account fields, not a wallet balance", () => {
    const account = makeAccount({
      collateral_value_usd: 1000,
      base_ltv: 0.6,
      purchasing_power_usdc: 600,
      used_power_usdc: 100,
    });
    // Available power = purchasing_power - used_power, NOT some external balance
    expect(computeAvailablePower(account)).toBe(500);
  });
});

describe("checkPostPaymentExposure", () => {
  it("allows a spend within available power", () => {
    const account = makeAccount();
    const result = checkPostPaymentExposure(account, 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(500);
    expect(result.reason).toBeUndefined();
  });

  it("allows spending exactly the remaining power", () => {
    const account = makeAccount({ used_power_usdc: 400 });
    const result = checkPostPaymentExposure(account, 200);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("rejects overspend with INSUFFICIENT_POWER", () => {
    const account = makeAccount({ used_power_usdc: 500 });
    const result = checkPostPaymentExposure(account, 200);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT_POWER");
  });

  it("rejects when power is fully used", () => {
    const account = makeAccount({ used_power_usdc: 600 });
    const result = checkPostPaymentExposure(account, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT_POWER");
  });

  it("handles zero collateral gracefully", () => {
    const account = makeAccount({
      collateral_value_usd: 0,
      purchasing_power_usdc: 0,
    });
    const result = checkPostPaymentExposure(account, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT_POWER");
  });
});
