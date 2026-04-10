import { describe, it, expect } from "vitest";
import { AgentClient, type Fetcher } from "../index.js";
import type { OrchestrationResponse } from "@agent-credit-rail/shared-types";

// Mock paywall that always returns 402 with a Stellar x402 v2 challenge
function make402Response(): Response {
  const challenge = {
    x402Version: 2,
    accepts: [
      {
        payTo: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
        scheme: "exact",
        network: "stellar:testnet",
        amount: "10000", // v2: atomic units (7 decimals), = $0.001
      },
    ],
  };
  const encoded = Buffer.from(JSON.stringify(challenge)).toString("base64");
  return new Response(null, {
    status: 402,
    headers: { "payment-required": encoded },
  });
}

function make200Response(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("AgentClient", () => {
  it("extracts 402 challenge and forwards to orchestrator → settled", async () => {
    const settledResponse: OrchestrationResponse = {
      status: "settled",
      attempt_id: "att-1",
      tx_hash: "tx-abc",
      result: { results: ["paid data"] },
    };

    const fetcher: Fetcher = {
      fetchService: async () => make402Response(),
      postOrchestrator: async (body) => {
        expect(body.agent_id).toBe("agent-1");
        expect(body.amount_usdc).toBeCloseTo(0.001);
        expect(body.payment_challenge).toBeDefined();
        expect((body.payment_challenge as { x402Version: number }).x402Version).toBe(2);
        return settledResponse;
      },
    };

    const client = new AgentClient({ agentId: "agent-1" }, fetcher);
    const result = await client.requestService("/search");

    expect(result.outcome).toBe("settled");
    expect(result.challenge).toBeDefined();
    expect(result.challenge!.status).toBe(402);
    expect(result.orchestrationResponse).toEqual(settledResponse);
    expect(result.serviceData).toEqual({ results: ["paid data"] });
  });

  it("extracts 402 challenge and forwards to orchestrator → blocked", async () => {
    const blockedResponse: OrchestrationResponse = {
      status: "blocked",
      attempt_id: "att-2",
      reason: "DENYLISTED",
    };

    const fetcher: Fetcher = {
      fetchService: async () => make402Response(),
      postOrchestrator: async () => blockedResponse,
    };

    const client = new AgentClient({ agentId: "agent-1" }, fetcher);
    const result = await client.requestService("/evil");

    expect(result.outcome).toBe("blocked");
    expect(result.orchestrationResponse).toEqual(blockedResponse);
    expect(result.serviceData).toBeNull();
  });

  it("returns free when service does not return 402", async () => {
    const fetcher: Fetcher = {
      fetchService: async () => make200Response({ free: true }),
      postOrchestrator: async () => {
        throw new Error("Should not be called for free services");
      },
    };

    const client = new AgentClient({ agentId: "agent-1" }, fetcher);
    const result = await client.requestService("/free-endpoint");

    expect(result.outcome).toBe("free");
    expect(result.challenge).toBeNull();
    expect(result.orchestrationResponse).toBeNull();
    expect(result.serviceData).toEqual({ free: true });
  });
});
