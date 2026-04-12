import { describe, it, expect } from "vitest";
import type {
  Owner,
  Agent,
  CollateralPosition,
  PaymentAttempt,
  SettledPaymentEvent,
  BlockedPaymentEvent,
  FailedPaymentEvent,
} from "@agent-credit-rail/shared-types";
import { Store, createSeededStore } from "../store.js";

function makeClock(start = 1000) {
  let t = start;
  return () => t++;
}

describe("Store — domain entities", () => {
  it("creates and retrieves an owner", () => {
    const store = new Store(makeClock());
    const owner: Owner = { id: "owner-1", name: "Alice" };
    store.createOwner(owner);
    expect(store.getOwner("owner-1")).toEqual(owner);
  });

  it("creates an agent linked to an owner", () => {
    const store = new Store(makeClock());
    store.createOwner({ id: "owner-1", name: "Alice" });
    const agent: Agent = { id: "agent-1", owner_id: "owner-1", name: "Bot" };
    store.createAgent(agent);
    expect(store.getAgent("agent-1")).toEqual(agent);
  });

  it("creates a collateral position", () => {
    const store = new Store(makeClock());
    store.createOwner({ id: "owner-1", name: "Alice" });
    const position: CollateralPosition = {
      owner_id: "owner-1",
      asset: "USDC",
      amount: 1000,
      value_usd: 1000,
    };
    store.createCollateralPosition(position);
    expect(store.getCollateralPosition("owner-1")).toEqual(position);
  });
});

describe("Store — payment attempts", () => {
  it("creates and retrieves a payment attempt by attempt_id", () => {
    const store = new Store(makeClock());
    const attempt: PaymentAttempt = {
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      status: "pending",
      created_at: 1000,
    };
    store.createAttempt(attempt);
    expect(store.getAttempt("att-1")).toEqual(attempt);
  });
});

describe("Store — payment events", () => {
  it("records a settled event linked to an attempt", () => {
    const clock = makeClock();
    const store = new Store(clock);
    store.createAttempt({
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      status: "pending",
      created_at: clock(),
    });
    const event: SettledPaymentEvent = {
      kind: "settled",
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      tx_hash: "tx-abc",
      created_at: clock(),
    };
    store.recordEvent(event);
    const events = store.getAgentEvents("agent-1");
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(event);
  });

  it("records a blocked event linked to an attempt", () => {
    const clock = makeClock();
    const store = new Store(clock);
    store.createAttempt({
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "/blocked",
      amount_usdc: 5,
      status: "blocked",
      created_at: clock(),
    });
    const event: BlockedPaymentEvent = {
      kind: "blocked",
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "/blocked",
      amount_usdc: 5,
      reason: "DENYLISTED",
      created_at: clock(),
    };
    store.recordEvent(event);
    const events = store.getAgentEvents("agent-1");
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("blocked");
  });

  it("records a failed event linked to an attempt", () => {
    const clock = makeClock();
    const store = new Store(clock);
    store.createAttempt({
      attempt_id: "att-3",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      status: "pending",
      created_at: clock(),
    });
    const event: FailedPaymentEvent = {
      kind: "failed",
      attempt_id: "att-3",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      error: "submission timeout",
      created_at: clock(),
    };
    store.recordEvent(event);
    const events = store.getAgentEvents("agent-1");
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("failed");
  });
});

describe("Store — queries", () => {
  it("returns payment history ordered by time", () => {
    const clock = makeClock();
    const store = new Store(clock);

    const t1 = clock();
    store.createAttempt({
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      status: "pending",
      created_at: t1,
    });
    const t2 = clock();
    store.recordEvent({
      kind: "settled",
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      tx_hash: "tx-1",
      created_at: t2,
    });

    const t3 = clock();
    store.createAttempt({
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "/blocked",
      amount_usdc: 5,
      status: "blocked",
      created_at: t3,
    });
    const t4 = clock();
    store.recordEvent({
      kind: "blocked",
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "/blocked",
      amount_usdc: 5,
      reason: "DENYLISTED",
      created_at: t4,
    });

    const events = store.getAgentEvents("agent-1");
    expect(events).toHaveLength(2);
    expect(events[0].created_at).toBeLessThan(events[1].created_at);
  });

  it("computes used_power as sum of settled event amounts only", () => {
    const clock = makeClock();
    const store = new Store(clock);

    // Settled event
    store.createAttempt({
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      status: "settled",
      created_at: clock(),
    });
    store.recordEvent({
      kind: "settled",
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      tx_hash: "tx-1",
      created_at: clock(),
    });

    // Blocked event — must NOT affect used_power
    store.createAttempt({
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "/blocked",
      amount_usdc: 50,
      status: "blocked",
      created_at: clock(),
    });
    store.recordEvent({
      kind: "blocked",
      attempt_id: "att-2",
      agent_id: "agent-1",
      service_url: "/blocked",
      amount_usdc: 50,
      reason: "DENYLISTED",
      created_at: clock(),
    });

    // Failed event — must NOT affect used_power
    store.createAttempt({
      attempt_id: "att-3",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 20,
      status: "failed",
      created_at: clock(),
    });
    store.recordEvent({
      kind: "failed",
      attempt_id: "att-3",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 20,
      error: "timeout",
      created_at: clock(),
    });

    expect(store.getAgentUsedPower("agent-1")).toBe(10);
  });

  it("blocked and failed events never change used_power", () => {
    const clock = makeClock();
    const store = new Store(clock);

    store.createAttempt({
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 100,
      status: "blocked",
      created_at: clock(),
    });
    store.recordEvent({
      kind: "blocked",
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 100,
      reason: "INSUFFICIENT_POWER",
      created_at: clock(),
    });

    expect(store.getAgentUsedPower("agent-1")).toBe(0);
  });

  it("retrieves attempt with linked terminal event", () => {
    const clock = makeClock();
    const store = new Store(clock);

    store.createAttempt({
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      status: "pending",
      created_at: clock(),
    });
    store.recordEvent({
      kind: "settled",
      attempt_id: "att-1",
      agent_id: "agent-1",
      service_url: "/article",
      amount_usdc: 10,
      tx_hash: "tx-abc",
      created_at: clock(),
    });

    const attempt = store.getAttempt("att-1");
    expect(attempt).toBeDefined();
    const event = store.getEventForAttempt("att-1");
    expect(event).toBeDefined();
    expect(event!.kind).toBe("settled");
    expect(event!.attempt_id).toBe("att-1");
  });
});

describe("Store — seed data", () => {
  it("produces the fixed demo scenario", () => {
    const store = createSeededStore();

    const owner = store.getOwner("owner-1");
    expect(owner).toBeDefined();
    expect(owner!.name).toBe("Demo Owner");

    const agent = store.getAgent("agent-1");
    expect(agent).toBeDefined();
    expect(agent!.owner_id).toBe("owner-1");

    const collateral = store.getCollateralPosition("owner-1");
    expect(collateral).toBeDefined();
    expect(collateral!.value_usd).toBe(1000);

    const policy = store.getPolicy("agent-1");
    expect(policy).toBeDefined();

    // Allowlisted service
    const searchRule = policy!.services.find((s) => s.service_url === "/article");
    expect(searchRule).toBeDefined();
    expect(searchRule!.allowed).toBe(true);
  });
});
