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

    // 4. Extract price
    const priceUsdc = extractPrice(paymentRequired);

    // 5. Forward to orchestrator
    const result = await this.fetcher.postOrchestrator({
      agent_id: this.config.agentId,
      service_url: serviceUrl,
      amount_usdc: priceUsdc,
    });

    return {
      outcome: result.status,
      orchestrationResponse: result,
      serviceData: result.status === "settled" ? result.result : null,
      challenge,
    };
  }
}

function extractPrice(paymentRequired: unknown): number {
  if (!paymentRequired || typeof paymentRequired !== "object") return 0.001;
  const pr = paymentRequired as { accepts?: Array<{ maxAmountRequired?: string }> };
  if (pr.accepts?.[0]?.maxAmountRequired) {
    return parseFloat(pr.accepts[0].maxAmountRequired) / 10_000_000;
  }
  return 0.001;
}
