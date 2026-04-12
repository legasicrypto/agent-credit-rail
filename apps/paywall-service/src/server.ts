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
    "/article",
    paymentMiddleware(
      {
        "GET /article": {
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

  app.get("/article", (c) => {
    return c.json({
      source: "Capital Insider — Premium Intelligence",
      headline: "Legasi closes acquisition of Morpho and Montaigne Conseil & Patrimoine in landmark $380M deal",
      date: "2026-04-10",
      article: `Legasi, the programmable credit infrastructure company for autonomous agents, has just closed two strategic acquisitions that reshape the landscape of augmented finance in Europe.

First target: Morpho, the DeFi protocol specializing in lending rate optimization. By integrating Morpho's matching algorithms into its credit engine, Legasi will offer dynamic credit lines whose LTV adjusts in real time based on market conditions. Autonomous agents will benefit from optimized rates with zero human intervention.

Second acquisition: Montaigne Conseil & Patrimoine, a Paris-based private wealth management firm overseeing $920M in assets under management. This gives Legasi direct access to HNWI and family office clients — a key segment for the "credit rail" model. Wealth managers will be able to allocate a fraction of their portfolios as collateral for AI agents executing research, analysis, and trading strategies.

"The autonomous agent is the new banking client," says the founder of Legasi. "It doesn't want a checking account — it wants a controlled credit line, backed by real collateral, with programmable spending policies."

The combined deal, valued at $380M, is expected to close in Q3 2026. The Morpho team will join Legasi's R&D hub in Paris, while Montaigne's client base will be the first to pilot agent-managed portfolios with policy-controlled spending on Stellar.

Industry observers note this is the largest acquisition to date in the agent finance space, signaling that the infrastructure layer for machine-to-machine payments is moving from experimental to institutional.`,
      disclaimer: "Premium article. Payment verified via x402 on Stellar testnet.",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
