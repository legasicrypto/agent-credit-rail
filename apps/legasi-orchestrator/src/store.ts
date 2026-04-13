import type {
  Owner,
  Agent,
  CollateralPosition,
  PolicyRule,
  PaymentAttempt,
  PaymentEvent,
} from "@agent-credit-rail/shared-types";

export class Store {
  private owners = new Map<string, Owner>();
  private agents = new Map<string, Agent>();
  private collateral = new Map<string, CollateralPosition>();
  private policies = new Map<string, PolicyRule>();
  private attempts = new Map<string, PaymentAttempt>();
  private events: PaymentEvent[] = [];

  constructor(private now: () => number = () => Date.now()) {}

  // ── Owners ──

  createOwner(owner: Owner) {
    this.owners.set(owner.id, owner);
  }

  getOwner(id: string): Owner | undefined {
    return this.owners.get(id);
  }

  // ── Agents ──

  createAgent(agent: Agent) {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return [...this.agents.values()];
  }

  getAgentsByOwner(ownerId: string): Agent[] {
    return [...this.agents.values()].filter((a) => a.owner_id === ownerId);
  }

  // ── Collateral ──

  createCollateralPosition(position: CollateralPosition) {
    this.collateral.set(position.owner_id, position);
  }

  getCollateralPosition(ownerId: string): CollateralPosition | undefined {
    return this.collateral.get(ownerId);
  }

  // ── Policies ──

  createPolicy(policy: PolicyRule) {
    this.policies.set(policy.agent_id, policy);
  }

  getPolicy(agentId: string): PolicyRule | undefined {
    return this.policies.get(agentId);
  }

  // ── Payment Attempts ──

  createAttempt(attempt: PaymentAttempt) {
    this.attempts.set(attempt.attempt_id, attempt);
  }

  getAttempt(attemptId: string): PaymentAttempt | undefined {
    return this.attempts.get(attemptId);
  }

  // ── Payment Events ──

  recordEvent(event: PaymentEvent) {
    this.events.push(event);
  }

  getAgentEvents(agentId: string): PaymentEvent[] {
    return this.events
      .filter((e) => e.agent_id === agentId)
      .sort((a, b) => a.created_at - b.created_at);
  }

  getEventForAttempt(attemptId: string): PaymentEvent | undefined {
    return this.events.find((e) => e.attempt_id === attemptId);
  }

  /** Sum of settled event amounts only. Blocked/failed never count. */
  getAgentUsedPower(agentId: string): number {
    return this.events
      .filter((e) => e.agent_id === agentId && e.kind === "settled")
      .reduce((sum, e) => sum + e.amount_usdc, 0);
  }

  /** Sum of settled amounts for a specific service today. */
  getAgentDailySpend(agentId: string, serviceUrl: string, dayStart: number): number {
    return this.events
      .filter(
        (e) =>
          e.agent_id === agentId &&
          e.service_url === serviceUrl &&
          e.kind === "settled" &&
          e.created_at >= dayStart,
      )
      .reduce((sum, e) => sum + e.amount_usdc, 0);
  }
}

/**
 * Base demo scenario (used by tests):
 * - Owner: 1000 USD collateral (10,000 XLM)
 * - LTV: 0.6 (purchasing power = 600 USDC)
 * - agent-1 "Demo Agent": /search allowlisted, premium-data.io denylisted
 * - agent-2 "Research Agent": /research + /search allowlisted (lower caps)
 * - No pre-seeded events (clean for assertions)
 */
export function createSeededStore(): Store {
  const store = new Store();

  store.createOwner({ id: "owner-1", name: "Demo Owner" });
  store.createAgent({ id: "agent-1", owner_id: "owner-1", name: "Demo Agent" });
  store.createAgent({ id: "agent-2", owner_id: "owner-1", name: "Research Agent" });
  store.createCollateralPosition({
    owner_id: "owner-1",
    asset: "XLM",
    amount: 10000,
    value_usd: 1000,
  });

  store.createPolicy({
    agent_id: "agent-1",
    services: [
      {
        service_url: "/article",
        allowed: true,
        per_request_cap_usdc: 100,
        daily_cap_usdc: 500,
      },
      {
        service_url: "premium-data.io",
        allowed: false,
        per_request_cap_usdc: 0,
        daily_cap_usdc: 0,
      },
    ],
  });

  store.createPolicy({
    agent_id: "agent-2",
    services: [
      {
        service_url: "/research",
        allowed: true,
        per_request_cap_usdc: 50,
        daily_cap_usdc: 150,
      },
      {
        service_url: "/article",
        allowed: true,
        per_request_cap_usdc: 20,
        daily_cap_usdc: 60,
      },
    ],
  });

  return store;
}

/**
 * Demo store with pre-seeded events for a non-empty dashboard.
 * Used by main.ts only — tests use createSeededStore() for clean state.
 */
export function createDemoStore(): Store {
  const store = createSeededStore();
  const now = Date.now();

  // agent-1: one settled, one blocked
  store.createAttempt({
    attempt_id: "seed-att-1",
    agent_id: "agent-1",
    service_url: "/article",
    amount_usdc: 10,
    status: "settled",
    created_at: now - 300_000,
  });
  store.recordEvent({
    kind: "settled",
    attempt_id: "seed-att-1",
    agent_id: "agent-1",
    service_url: "/article",
    amount_usdc: 10,
    tx_hash: "seed-tx-abc123def456",
    created_at: now - 300_000,
  });

  store.createAttempt({
    attempt_id: "seed-att-2",
    agent_id: "agent-1",
    service_url: "premium-data.io",
    amount_usdc: 10,
    status: "blocked",
    created_at: now - 180_000,
  });
  store.recordEvent({
    kind: "blocked",
    attempt_id: "seed-att-2",
    agent_id: "agent-1",
    service_url: "premium-data.io",
    amount_usdc: 10,
    reason: "DENYLISTED",
    created_at: now - 180_000,
  });

  // agent-2: one settled
  store.createAttempt({
    attempt_id: "seed-att-3",
    agent_id: "agent-2",
    service_url: "/research",
    amount_usdc: 25,
    status: "settled",
    created_at: now - 120_000,
  });
  store.recordEvent({
    kind: "settled",
    attempt_id: "seed-att-3",
    agent_id: "agent-2",
    service_url: "/research",
    amount_usdc: 25,
    tx_hash: "seed-tx-789ghi012jkl",
    created_at: now - 120_000,
  });

  return store;
}
