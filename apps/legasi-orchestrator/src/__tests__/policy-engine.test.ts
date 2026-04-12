import { describe, it, expect } from "vitest";
import type { PolicyRule } from "@agent-credit-rail/shared-types";
import { evaluateServicePolicy } from "../policy-engine.js";

const policy: PolicyRule = {
  agent_id: "agent-1",
  services: [
    {
      service_url: "/article",
      allowed: true,
      per_request_cap_usdc: 100,
      daily_cap_usdc: 500,
    },
    {
      service_url: "/evil-service",
      allowed: false,
      per_request_cap_usdc: 0,
      daily_cap_usdc: 0,
    },
  ],
};

describe("evaluateServicePolicy", () => {
  it("approves allowlisted service under all caps", () => {
    const result = evaluateServicePolicy("/article", 50, policy, 0);
    expect(result.decision).toBe("approved");
    expect(result.reason).toBeUndefined();
  });

  it("rejects denylisted service", () => {
    const result = evaluateServicePolicy("/evil-service", 10, policy, 0);
    expect(result.decision).toBe("blocked");
    expect(result.reason).toBe("DENYLISTED");
  });

  it("rejects unknown service not in policy", () => {
    const result = evaluateServicePolicy("/unknown", 10, policy, 0);
    expect(result.decision).toBe("blocked");
    expect(result.reason).toBe("NOT_ALLOWLISTED");
  });

  it("rejects when amount exceeds per-request cap", () => {
    const result = evaluateServicePolicy("/article", 101, policy, 0);
    expect(result.decision).toBe("blocked");
    expect(result.reason).toBe("EXCEEDS_REQUEST_CAP");
  });

  it("approves when amount exactly equals per-request cap (inclusive)", () => {
    const result = evaluateServicePolicy("/article", 100, policy, 0);
    expect(result.decision).toBe("approved");
  });

  it("rejects when daily spend would exceed daily cap", () => {
    const result = evaluateServicePolicy("/article", 50, policy, 460);
    expect(result.decision).toBe("blocked");
    expect(result.reason).toBe("EXCEEDS_DAILY_CAP");
  });

  it("approves when daily spend exactly hits daily cap (inclusive)", () => {
    const result = evaluateServicePolicy("/article", 50, policy, 450);
    expect(result.decision).toBe("approved");
  });

  it("handles multiple spends accumulating toward daily boundary", () => {
    // First spend: 200 of 500 daily
    const r1 = evaluateServicePolicy("/article", 100, policy, 200);
    expect(r1.decision).toBe("approved");

    // Second spend: 300 + 100 = 400 of 500
    const r2 = evaluateServicePolicy("/article", 100, policy, 300);
    expect(r2.decision).toBe("approved");

    // Third spend: 400 + 100 = 500 of 500 (exact boundary)
    const r3 = evaluateServicePolicy("/article", 100, policy, 400);
    expect(r3.decision).toBe("approved");

    // Fourth spend: 500 + 1 > 500 (over)
    const r4 = evaluateServicePolicy("/article", 1, policy, 500);
    expect(r4.decision).toBe("blocked");
    expect(r4.reason).toBe("EXCEEDS_DAILY_CAP");
  });
});
