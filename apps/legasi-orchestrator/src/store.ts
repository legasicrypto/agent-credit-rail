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
 * Fixed demo scenario:
 * - Owner: 1000 USD collateral
 * - LTV: 0.6 (purchasing power = 600 USDC)
 * - Allowlisted: /search (per-request cap 100, daily cap 500)
 * - Blocked example: unknown-api.xyz (synthetic — not a real service)
 */
export function createSeededStore(): Store {
  const store = new Store();

  store.createOwner({ id: "owner-1", name: "Demo Owner" });
  store.createAgent({ id: "agent-1", owner_id: "owner-1", name: "Demo Agent" });
  store.createCollateralPosition({
    owner_id: "owner-1",
    asset: "USDC",
    amount: 1000,
    value_usd: 1000,
  });
  store.createPolicy({
    agent_id: "agent-1",
    services: [
      {
        service_url: "/search",
        allowed: true,
        per_request_cap_usdc: 100,
        daily_cap_usdc: 500,
      },
    ],
  });

  return store;
}
