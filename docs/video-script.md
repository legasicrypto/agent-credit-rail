# Video Script — Agent Credit Rail

Target: 3-5 minutes. Lead with the product, not the protocol.

---

## 1. The Problem (30s)

"AI agents need to pay for services — search APIs, compute, data feeds. But giving an agent a wallet with real funds is like giving an intern an unlimited corporate card with no controls."

"What if there was a better model?"

## 2. The Product (45s)

"Agent Credit Rail is a company credit card for AI agents."

Show the UI dashboard:

- "An **owner** posts XLM collateral — 10,000 XLM, valued at $1,000."
- "Legasi applies a conservative **LTV of 60%** — so the agent gets **600 USDC of purchasing power**. Not a wallet balance. A credit line."
- "The owner sets **policies**: which services the agent can use, per-request caps, daily spending limits."
- "The agent never touches the collateral. It spends against a controlled credit line."

## 3. Approved Flow (60s)

Live demo in the UI:

1. Click "Pay /search (10 USDC)"
2. "The agent requests a paid service. The service returns **402 Payment Required** — that's x402, the HTTP payment standard on Stellar."
3. "Legasi checks the agent's policy — is `/search` allowed? Is 10 USDC within the per-request cap? Within the daily cap?"
4. "Policy passes. Legasi checks credit — does the agent have enough purchasing power?"
5. "Credit passes. Legasi settles the USDC payment on Stellar testnet and unlocks the service."
6. Show the settled event in the payment history — **click the tx hash link** to open Stellar Expert.
7. "That's a real Stellar transaction. Real USDC. Not mocked."
8. Show the power bar — purchasing power decreased.

## 4. Blocked Flow (30s)

1. Click "Try unknown-api.xyz (blocked)"
2. "The agent tries to access a service that's not on the allowlist."
3. "Legasi blocks it immediately. No Stellar transaction. No spend. Purchasing power unchanged."
4. Show the blocked event with reason: `NOT_ALLOWLISTED`

## 5. The Credit Model (30s)

Point to the dashboard stats:

- "The collateral is XLM — a volatile asset. The credit line is in USDC — stable."
- "Legasi sits in between: it values the collateral, applies a discount (LTV), and controls the spend rail."
- "If the agent spends 100 USDC, purchasing power drops to 500. The collateral doesn't move."
- "This is overcollateralized credit — not a wallet, not a prepaid card."

## 6. Architecture (30s)

Quick architecture slide or terminal view:

- "Under the hood: the paywall uses x402 — the HTTP 402 payment standard built on Stellar."
- "The orchestrator handles policy, credit, and settlement in one call. No polling."
- "Settlement goes through the x402 facilitator to Stellar testnet."
- "Every payment carries a correlation ID from decision to settlement."

## 7. Close (30s)

- "Agent Credit Rail: policy-controlled agent payments on Stellar, backed by overcollateralized credit."
- "Built in a hackathon. Real Stellar transactions. Real x402 settlement. Real credit model."
- Show the Stellar Expert tx page one more time.

---

## Key talking points to emphasize

- **This is not a wallet.** It's a credit line.
- **Collateral (XLM) and payment (USDC) are different assets.** That's the credit infrastructure.
- **The Stellar settlement is real.** Not mocked. Click the tx hash.
- **Policy controls what the agent can spend on.** The agent never gets unrestricted funds.

## What NOT to explain

- x402 protocol internals (mention it, don't explain it)
- Stellar transaction mechanics
- Soroban / SAC details
- Future roadmap features
