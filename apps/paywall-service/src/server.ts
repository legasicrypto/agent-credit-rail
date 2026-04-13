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
    return c.html(HOMEPAGE_HTML);
  });

  app.get("/article/legasi-morpho-montaigne", (c) => {
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
    .pay-btn {
      display: inline-flex; align-items: center; gap: 10px;
      font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;
      color: white; background: #111; border: none;
      padding: 14px 32px; border-radius: 8px; cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 16px;
    }
    .pay-btn:hover { background: #333; }
    .pay-btn svg { width: 16px; height: 16px; }
    .paywall-sub {
      font-family: 'Inter', sans-serif; font-size: 13px; color: #999;
      max-width: 400px; margin: 0 auto; line-height: 1.5;
    }
    .paywall-sub a { color: #555; text-decoration: underline; }
    .modal-backdrop {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      z-index: 100; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      background: white; border-radius: 16px; padding: 32px; width: 400px; max-width: 90vw;
      box-shadow: 0 24px 48px rgba(0,0,0,0.15); font-family: 'Inter', sans-serif;
      position: relative;
    }
    .modal-close {
      position: absolute; top: 16px; right: 16px; background: none; border: none;
      font-size: 18px; color: #999; cursor: pointer; line-height: 1;
    }
    .modal-close:hover { color: #333; }
    .modal h3 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 4px; }
    .modal .price-line { font-size: 14px; color: #888; margin-bottom: 24px; }
    .modal .tabs { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 1px solid #e5e5e0; }
    .modal .tab {
      flex: 1; padding: 10px 0; text-align: center; font-size: 13px; font-weight: 600;
      color: #999; border-bottom: 2px solid transparent; cursor: pointer; background: none; border-top: none; border-left: none; border-right: none;
    }
    .modal .tab.active { color: #111; border-bottom-color: #111; }
    .modal .tab:hover:not(.active) { color: #555; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 12px; font-weight: 600; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .field input {
      width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; font-family: 'Inter', sans-serif; color: #333; background: #fafaf8;
      outline: none; box-sizing: border-box;
    }
    .field input:focus { border-color: #999; }
    .field input::placeholder { color: #ccc; }
    .row-fields { display: flex; gap: 12px; }
    .row-fields .field { flex: 1; }
    .submit-btn {
      width: 100%; padding: 12px; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600; color: white; background: #111;
      cursor: pointer; font-family: 'Inter', sans-serif; margin-top: 8px;
    }
    .submit-btn:hover { background: #333; }
    .wallet-option {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      border: 1px solid #e5e5e0; border-radius: 10px; cursor: pointer;
      margin-bottom: 10px; transition: border-color 0.15s;
    }
    .wallet-option:hover { border-color: #999; }
    .wallet-icon { width: 32px; height: 32px; border-radius: 8px; background: #f0f0ec; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .wallet-name { font-size: 14px; font-weight: 600; color: #111; }
    .wallet-desc { font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <a href="/" class="brand" style="text-decoration:none;color:#888;">Capital Insider</a>
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
      <button class="pay-btn" onclick="document.getElementById('pay-modal').classList.add('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        Pay $4.99 to read
      </button>
      <p class="paywall-sub">
        Single article access. Payment settles via <a href="https://x402.org" target="_blank">x402</a> on Stellar.
      </p>
    </div>
  </article>

  <div id="pay-modal" class="modal-backdrop" onclick="if(event.target===this)this.classList.remove('open')">
    <div class="modal">
      <button class="modal-close" onclick="document.getElementById('pay-modal').classList.remove('open')">&times;</button>
      <h3>Unlock this article</h3>
      <div class="price-line">One-time payment &mdash; $4.99</div>

      <div class="tabs">
        <button class="tab active" onclick="switchTab('card',this)">Card</button>
        <button class="tab" onclick="switchTab('wallet',this)">Wallet</button>
      </div>

      <div id="tab-card" class="tab-content active">
        <div class="field">
          <label>Card number</label>
          <input type="text" placeholder="1234 5678 9012 3456" maxlength="19">
        </div>
        <div class="row-fields">
          <div class="field">
            <label>Expiry</label>
            <input type="text" placeholder="MM / YY" maxlength="7">
          </div>
          <div class="field">
            <label>CVC</label>
            <input type="text" placeholder="123" maxlength="4">
          </div>
        </div>
        <div class="field">
          <label>Name on card</label>
          <input type="text" placeholder="J. Smith">
        </div>
        <button class="submit-btn" onclick="document.getElementById('pay-modal').classList.remove('open');alert('Payment failed. Try asking your AI agent to read this article instead.')">Pay $4.99</button>
      </div>

      <div id="tab-wallet" class="tab-content">
        <div class="wallet-option" onclick="document.getElementById('pay-modal').classList.remove('open');alert('Wallet connection failed. Try asking your AI agent to read this article instead.')">
          <div class="wallet-icon">&#9670;</div>
          <div><div class="wallet-name">MetaMask</div><div class="wallet-desc">Connect your browser wallet</div></div>
        </div>
        <div class="wallet-option" onclick="document.getElementById('pay-modal').classList.remove('open');alert('Wallet connection failed. Try asking your AI agent to read this article instead.')">
          <div class="wallet-icon">&#9679;</div>
          <div><div class="wallet-name">Freighter</div><div class="wallet-desc">Stellar wallet</div></div>
        </div>
        <div class="wallet-option" onclick="document.getElementById('pay-modal').classList.remove('open');alert('Wallet connection failed. Try asking your AI agent to read this article instead.')">
          <div class="wallet-icon">&#8857;</div>
          <div><div class="wallet-name">WalletConnect</div><div class="wallet-desc">Scan QR code</div></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function switchTab(name, el) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('tab-' + name).classList.add('active');
    }
  </script>
</body>
</html>`;

const HOMEPAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capital Insider — Premium Intelligence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #fafaf8; color: #1a1a1a; }
    a { text-decoration: none; color: inherit; }
    .header { border-bottom: 1px solid #e5e5e0; padding: 24px 0; }
    .header-inner { max-width: 960px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 14px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #111; }
    .nav { display: flex; gap: 24px; font-size: 13px; color: #888; font-weight: 500; }
    .nav a:hover { color: #111; }
    .subscribe-btn {
      font-size: 12px; font-weight: 600; color: white; background: #111;
      padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;
    }
    .hero { max-width: 960px; margin: 0 auto; padding: 64px 24px 48px; text-align: center; }
    .hero h1 { font-family: 'Lora', Georgia, serif; font-size: 18px; font-weight: 400; color: #888; margin-bottom: 8px; }
    .hero h2 { font-family: 'Lora', Georgia, serif; font-size: 42px; font-weight: 600; line-height: 1.2; color: #111; max-width: 640px; margin: 0 auto 16px; }
    .hero p { font-size: 15px; color: #999; max-width: 500px; margin: 0 auto; }
    .divider { max-width: 960px; margin: 0 auto; padding: 0 24px; }
    .divider hr { border: none; border-top: 1px solid #e5e5e0; }
    .grid { max-width: 960px; margin: 0 auto; padding: 48px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
    .card { display: flex; flex-direction: column; gap: 12px; }
    .card-tag { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; }
    .card h3 { font-family: 'Lora', Georgia, serif; font-size: 22px; font-weight: 600; line-height: 1.3; color: #111; }
    .card h3 a:hover { color: #555; }
    .card p { font-size: 14px; color: #777; line-height: 1.5; }
    .card-meta { font-size: 12px; color: #bbb; display: flex; align-items: center; gap: 8px; }
    .card-meta .badge {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      color: #888; background: #f0f0ec; padding: 3px 8px; border-radius: 4px;
    }
    .featured {
      max-width: 960px; margin: 0 auto; padding: 0 24px 48px;
    }
    .featured-card {
      display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;
      background: white; border: 1px solid #e5e5e0; border-radius: 12px; padding: 40px;
    }
    @media (max-width: 640px) { .featured-card { grid-template-columns: 1fr; padding: 24px; } }
    .featured-card .text-side { }
    .featured-card .tag { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #c0392b; margin-bottom: 12px; }
    .featured-card h3 { font-family: 'Lora', Georgia, serif; font-size: 28px; font-weight: 600; line-height: 1.3; color: #111; margin-bottom: 12px; }
    .featured-card h3 a:hover { color: #555; }
    .featured-card p { font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 16px; }
    .featured-card .read-more { font-size: 13px; font-weight: 600; color: #111; }
    .featured-card .read-more:hover { text-decoration: underline; }
    .featured-card .visual {
      background: #f5f5f0; border-radius: 8px; height: 240px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Lora', Georgia, serif; font-size: 48px; color: #ddd;
    }
    .section-label {
      max-width: 960px; margin: 0 auto; padding: 0 24px 24px;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #bbb;
    }
    .footer {
      border-top: 1px solid #e5e5e0; padding: 32px 0; text-align: center;
      font-size: 12px; color: #bbb; margin-top: 48px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div class="logo">Capital Insider</div>
      <div class="nav">
        <a href="#">Markets</a>
        <a href="#">Finance</a>
        <a href="#">AI</a>
        <a href="#">Deals</a>
      </div>
      <button class="subscribe-btn">Subscribe</button>
    </div>
  </div>

  <div class="hero">
    <h1>Premium Intelligence</h1>
    <h2>The deals, strategies, and signals that move markets</h2>
    <p>Exclusive reporting on finance, AI, and institutional infrastructure.</p>
  </div>

  <div class="divider"><hr></div>

  <div class="featured" style="padding-top: 48px;">
    <div class="featured-card">
      <div class="text-side">
        <div class="tag">Exclusive</div>
        <h3><a href="/article/legasi-morpho-montaigne">Legasi closes acquisition of Morpho and Montaigne Conseil &amp; Patrimoine in landmark $380M deal</a></h3>
        <p>The programmable credit infrastructure company combines DeFi rate optimization with traditional wealth management in its boldest move yet.</p>
        <a href="/article/legasi-morpho-montaigne" class="read-more">Read article &rarr;</a>
      </div>
      <div class="visual">
        <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;padding:24px;">
          <rect x="20" y="160" width="28" height="30" rx="4" fill="#ddd"/>
          <rect x="56" y="130" width="28" height="60" rx="4" fill="#ccc"/>
          <rect x="92" y="110" width="28" height="80" rx="4" fill="#bbb"/>
          <rect x="128" y="80" width="28" height="110" rx="4" fill="#aaa"/>
          <rect x="164" y="55" width="28" height="135" rx="4" fill="#999"/>
          <rect x="200" y="30" width="28" height="160" rx="4" fill="#777"/>
          <rect x="236" y="10" width="28" height="180" rx="4" fill="#555"/>
          <line x1="16" y1="190" x2="268" y2="190" stroke="#ddd" stroke-width="1"/>
          <path d="M 34 155 Q 90 120 142 95 T 250 25" stroke="#c0392b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <circle cx="250" cy="25" r="4" fill="#c0392b"/>
        </svg>
      </div>
    </div>
  </div>

  <div class="section-label">Latest</div>

  <div class="grid">
    <div class="card">
      <div class="card-tag">AI Infrastructure</div>
      <h3><a href="#">Why autonomous agents need their own payment rails</a></h3>
      <p>The $200B bottleneck: AI agents can reason, code, and browse — but they can't pay for anything. A new generation of infrastructure is fixing that.</p>
      <div class="card-meta">Apr 8, 2026 <span class="badge">Premium</span></div>
    </div>
    <div class="card">
      <div class="card-tag">Regulation</div>
      <h3><a href="#">EU MiCA framework opens door for programmable credit on-chain</a></h3>
      <p>New regulatory clarity in Europe is enabling licensed institutions to issue policy-controlled credit lines backed by tokenized collateral.</p>
      <div class="card-meta">Apr 6, 2026 <span class="badge">Premium</span></div>
    </div>
    <div class="card">
      <div class="card-tag">Deals</div>
      <h3><a href="#">SG-FORGE expands digital asset custody to six new EU banks</a></h3>
      <p>Societe Generale's blockchain arm signs six new banking partners, signaling accelerating institutional adoption of on-chain infrastructure.</p>
      <div class="card-meta">Apr 4, 2026 <span class="badge">Premium</span></div>
    </div>
    <div class="card">
      <div class="card-tag">Markets</div>
      <h3><a href="#">Stellar network volume hits $2.4B as micropayment use cases surge</a></h3>
      <p>Machine-to-machine transactions now account for 18% of Stellar testnet volume, driven by x402 protocol adoption.</p>
      <div class="card-meta">Apr 2, 2026 <span class="badge">Premium</span></div>
    </div>
  </div>

  <div class="footer">
    &copy; 2026 Capital Insider. All rights reserved. Premium intelligence for institutional readers.
  </div>
</body>
</html>`;
