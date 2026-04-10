import type { OrchestrationResponse } from "@agent-credit-rail/shared-types";

export interface AgentClientConfig {
  agentId: string;
}

export interface PaywallChallenge {
  status: 402;
  paymentRequired: unknown;
}

export type ServiceOutcome = "settled" | "blocked" | "failed" | "free";

export interface ServiceResult {
  outcome: ServiceOutcome;
  orchestrationResponse: OrchestrationResponse | null;
  serviceData: unknown;
  challenge: PaywallChallenge | null;
}

/**
 * Fetcher abstraction — allows injecting Hono test apps or real HTTP.
 */
export interface Fetcher {
  fetchService(serviceUrl: string): Promise<Response>;
  postOrchestrator(body: {
    agent_id: string;
    service_url: string;
    amount_usdc: number;
    payment_challenge?: unknown;
  }): Promise<OrchestrationResponse>;
}

export class AgentClient {
  constructor(
    private config: AgentClientConfig,
    private fetcher: Fetcher,
  ) {}

  async requestService(serviceUrl: string): Promise<ServiceResult> {
    // 1. Hit the service
    const serviceResponse = await this.fetcher.fetchService(serviceUrl);

    // 2. Not 402 → free
    if (serviceResponse.status !== 402) {
      return {
        outcome: "free",
        orchestrationResponse: null,
        serviceData: await serviceResponse.json(),
        challenge: null,
      };
    }

    // 3. Extract x402 challenge
    const paymentHeader = serviceResponse.headers.get("payment-required");
    const paymentRequired = paymentHeader
      ? JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"))
      : null;

    const challenge: PaywallChallenge = { status: 402, paymentRequired };

    // 4. Extract price (v2: accepts[].amount in atomic units, 7 decimals for USDC)
    const priceUsdc = extractPrice(paymentRequired);

    // 5. Forward to orchestrator with full challenge
    const result = await this.fetcher.postOrchestrator({
      agent_id: this.config.agentId,
      service_url: serviceUrl,
      amount_usdc: priceUsdc,
      payment_challenge: paymentRequired,
    });

    return {
      outcome: result.status,
      orchestrationResponse: result,
      serviceData: result.status === "settled" ? result.result : null,
      challenge,
    };
  }
}

/**
 * Extract price from x402 v2 PaymentRequired.
 * v2 uses accepts[].amount (string, atomic units with 7 decimals for Stellar USDC).
 * Falls back to v1 maxAmountRequired for backward compat.
 */
function extractPrice(paymentRequired: unknown): number {
  if (!paymentRequired || typeof paymentRequired !== "object") return 0.001;
  const pr = paymentRequired as {
    accepts?: Array<{ amount?: string; maxAmountRequired?: string }>;
  };

  const first = pr.accepts?.[0];
  if (!first) return 0.001;

  // v2: amount is in atomic units (7 decimals for Stellar USDC)
  if (first.amount) {
    return parseFloat(first.amount) / 10_000_000;
  }

  // v1 fallback
  if (first.maxAmountRequired) {
    return parseFloat(first.maxAmountRequired) / 10_000_000;
  }

  return 0.001;
}
