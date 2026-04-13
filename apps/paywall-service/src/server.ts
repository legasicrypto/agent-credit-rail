import { Hono } from "hono";
import { cors } from "hono/cors";
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

  app.use("*", cors({ exposeHeaders: ["payment-required"] }));

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const x402Server = new x402ResourceServer([facilitator]);
  x402Server.register("stellar:*", new ExactStellarScheme());

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/", (c) => {
    return c.html(ARTICLE_PAGE_HTML);
  });

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

const ARTICLE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capital Insider — Premium Intelligence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Lora', Georgia, serif; background: #fafaf8; color: #1a1a1a; }
    .header { border-bottom: 1px solid #e5e5e0; padding: 20px 0; text-align: center; }
    .header-inner { max-width: 720px; margin: 0 auto; padding: 0 24px; }
    .brand { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #888; }
    .nav-tag { font-family: 'Inter', sans-serif; font-size: 11px; color: #aaa; margin-top: 4px; }
    .article { max-width: 720px; margin: 0 auto; padding: 48px 24px 120px; position: relative; }
    .meta { font-family: 'Inter', sans-serif; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    h1 { font-size: 36px; font-weight: 600; line-height: 1.2; margin-bottom: 20px; color: #111; }
    .lead { font-size: 20px; line-height: 1.6; color: #444; margin-bottom: 32px; font-style: italic; }
    .body-text p { font-size: 18px; line-height: 1.8; margin-bottom: 24px; color: #333; }
    .body-text blockquote { border-left: 3px solid #FF4E00; padding-left: 20px; margin: 32px 0; font-style: italic; color: #555; }
    .paywall-fade { position: relative; }
    .paywall-fade::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 280px;
      background: linear-gradient(transparent, #fafaf8);
      pointer-events: none;
    }
    .paywall-overlay {
      text-align: center; padding: 48px 24px; margin-top: -40px; position: relative; z-index: 1;
      background: #fafaf8;
    }
    .paywall-badge {
      display: inline-flex; align-items: center; gap: 8px;
      font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
      color: #FF4E00; background: #FFF3EC; border: 1px solid #FFD9C2;
      padding: 8px 20px; border-radius: 100px; margin-bottom: 20px;
    }
    .paywall-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: #FF4E00; }
    .paywall-title { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; color: #111; margin-bottom: 8px; }
    .paywall-sub { font-family: 'Inter', sans-serif; font-size: 14px; color: #888; max-width: 460px; margin: 0 auto 24px; line-height: 1.5; }
    .paywall-info {
      display: inline-flex; flex-direction: column; gap: 12px; text-align: left;
      font-family: 'Inter', sans-serif; font-size: 13px; color: #666;
      background: white; border: 1px solid #e5e5e0; border-radius: 12px;
      padding: 20px 28px;
    }
    .paywall-info .row { display: flex; align-items: center; gap: 8px; }
    .paywall-info .label { color: #999; min-width: 80px; }
    .paywall-info .value { font-weight: 600; color: #333; }
    .powered {
      margin-top: 32px; font-family: 'Inter', sans-serif; font-size: 12px; color: #bbb;
    }
    .powered a { color: #FF4E00; text-decoration: none; font-weight: 600; }
    .powered a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div class="brand">Capital Insider</div>
      <div class="nav-tag">Premium Intelligence &middot; Finance &middot; AI &middot; Markets</div>
    </div>
  </div>

  <article class="article">
    <div class="meta">Exclusive &middot; April 10, 2026</div>
    <h1>Legasi closes acquisition of Morpho and Montaigne Conseil &amp; Patrimoine in landmark $380M deal</h1>
    <p class="lead">
      The programmable credit infrastructure company makes its boldest move yet,
      combining DeFi rate optimization with traditional wealth management.
    </p>

    <div class="body-text paywall-fade">
      <p>
        Legasi, the programmable credit infrastructure company for autonomous agents,
        has just closed two strategic acquisitions that reshape the landscape of
        augmented finance in Europe.
      </p>
      <p>
        First target: Morpho, the DeFi protocol specializing in lending rate
        optimization. By integrating Morpho's matching algorithms into its credit
        engine, Legasi will offer dynamic credit lines whose LTV adjusts in real time
        based on market conditions. Autonomous agents will benefit from optimized rates
        with zero human intervention.
      </p>
      <p>
        Second acquisition: Montaigne Conseil &amp; Patrimoine, a Paris-based private
        wealth management firm overseeing $920M in assets under management. This gives
        Legasi direct access to HNWI and family office clients...
      </p>
    </div>

    <div class="paywall-overlay">
      <div class="paywall-badge"><span class="dot"></span> 402 &mdash; Payment Required</div>
      <div class="paywall-title">This article requires payment</div>
      <div class="paywall-sub">
        Access is available to AI agents with a valid credit line through the x402 protocol.
        Payment settles in USDC on Stellar testnet.
      </div>
      <div class="paywall-info">
        <div class="row"><span class="label">Price</span><span class="value">0.001 USDC</span></div>
        <div class="row"><span class="label">Network</span><span class="value">Stellar Testnet</span></div>
        <div class="row"><span class="label">Protocol</span><span class="value">x402</span></div>
        <div class="row"><span class="label">Endpoint</span><span class="value">GET /article</span></div>
      </div>
      <p class="powered">
        Payments powered by <a href="https://legasi.io" target="_blank">AgentPay by Legasi</a>
      </p>
    </div>
  </article>
</body>
</html>`;

