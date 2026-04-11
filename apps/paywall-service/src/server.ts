import { Hono } from "hono";
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

export interface PaywallConfig {
  stellarPayeeAddress: string;
  stellarNetwork?: `${string}:${string}`;
  facilitatorUrl?: string;
  price?: string | { amount: string; asset: string; extra?: Record<string, unknown> };
}

/** USDC on Stellar testnet (SAC for USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5). */
export const USDC_TESTNET_ASSET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const defaults = {
  stellarNetwork: "stellar:testnet" as `${string}:${string}`,
  facilitatorUrl: "https://x402.org/facilitator",
  price: { amount: "10000", asset: USDC_TESTNET_ASSET } as
    | string
    | { amount: string; asset: string },
};

export function createPaywallApp(config: PaywallConfig) {
  const {
    stellarPayeeAddress,
    stellarNetwork = defaults.stellarNetwork,
    facilitatorUrl = defaults.facilitatorUrl,
    price = defaults.price,
  } = config;

  const app = new Hono();

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const x402Server = new x402ResourceServer([facilitator]);
  x402Server.register("stellar:*", new ExactStellarScheme());

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use(
    "/search",
    paymentMiddleware(
      {
        "GET /search": {
          accepts: {
            payTo: stellarPayeeAddress,
            scheme: "exact",
            price,
            network: stellarNetwork,
          },
        },
      },
      x402Server,
    ),
  );

  app.get("/search", (c) => {
    return c.json({
      source: "The AI Finance Report — Premium Intelligence",
      headline: "The $200B Problem: Why AI Agents Can't Spend Money (And Who's Fixing It)",
      date: "2026-04-10",
      article: `Every major AI lab has the same dirty secret: their agents can browse the web, write code, and reason about complex problems — but they can't pay for anything.

When an AI agent needs premium data, a licensed API, or a paid service, it hits a wall. Today's workaround? Hardcoded API keys, prepaid accounts with no spending controls, or a human in the loop approving every $0.01 transaction. None of this scales.

The numbers tell the story. Enterprises running autonomous agents report that 34% of agent task failures trace back to payment friction — the agent needed a paid resource but had no way to acquire it. At scale, that's an estimated $200B in unrealized productivity by 2028.

Enter the "credit rail" model. Instead of giving agents direct access to funds, a new wave of infrastructure lets companies post collateral and issue policy-controlled credit lines to their agents. The agent gets spending power, but never touches the treasury. Every transaction settles on-chain with a full audit trail.

"Think of it as a company credit card for AI," says one founder building in this space. "The CFO sets the rules — which services, how much per request, daily caps. The agent operates autonomously within those guardrails. If it tries to go off-policy, the transaction is blocked before any money moves."

The model is already live on Stellar testnet, where sub-second settlement and negligible fees make micropayments viable. An agent can pay $0.001 for a single API call and the economics still work.

Three things make this different from traditional payment rails:

1. Policy-first: Spending rules are enforced before settlement, not audited after the fact.
2. Overcollateralized: Credit lines are backed by real assets, eliminating counterparty risk.
3. Agent-native: Built for machines making thousands of autonomous micro-decisions, not humans clicking "approve."

The implications extend beyond simple API payments. As agents become the primary consumers of digital services, the entire internet payment layer needs to adapt. The x402 protocol — an evolution of HTTP's 402 "Payment Required" status code — is emerging as the standard for machine-to-machine payments, turning every web service into a pay-per-use endpoint.

Early adopters include research firms automating competitive intelligence, trading desks running multi-agent strategies, and AI-native companies whose agents consume dozens of paid services daily.

The race is on to become the Visa of the agent economy.`,
      disclaimer: "Premium article. Payment verified via x402 on Stellar testnet.",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
