# Technical plan

## Context

Legasi's long-term direction is permissioned digital credit infrastructure. For the Stellar hackathon, the goal is not to ship the entire institutional Lombard stack. The goal is to prove the first and most important layer of that system on Stellar testnet:

- an owner funds collateral
- Legasi converts that collateral into an overcollateralized credit line using a conservative LTV
- each agent receives policy-controlled purchasing power against that credit line
- payments happen through x402 on Stellar
- the agent authorizes the payment
- Legasi submits the transaction and pays fees
- the paid service unlocks
- Legasi records usage and blocked attempts

The core product analogy is a corporate credit card for agents:

- the owner controls treasury and policy
- the agent can spend only within rules
- the agent never receives unrestricted funds
- unknown or unauthorized spending attempts are blocked or escalated

## Product goal

Build a working Stellar testnet demo where:

1. an owner posts one collateral asset into Legasi infrastructure
2. Legasi computes an overcollateralized credit line from collateral value and conservative LTV
3. an agent requests a paid x402 service
4. the service returns `402 Payment Required`
5. Legasi checks whitelist, denylist, per-request cap, daily cap, remaining power, and post-payment LTV
6. the agent authorizes the payment intent
7. Legasi rebuilds and submits the Stellar transaction as fee payer and submitter
8. the service returns the protected result
9. Legasi updates usage, logs, and reputation

## Scope

### In scope

- one owner
- one agent
- one collateral asset
- one paid x402 service
- one policy engine
- one Stellar testnet settlement path
- one blocked payment example
- optional owner notification for blocked or unknown requests

### Out of scope

- multi-asset collateral support
- generalized oracle stack
- on-chain policy contract accounts
- liquidations
- dynamic interest accrual
- production custody integration
- MPP Session mode
- full marketplace discovery

## Technical decisions

### Use x402 as the first payment rail

The MVP should use x402 because it gives the clearest hackathon demo: paid HTTP requests over `402 Payment Required`, settled on Stellar testnet.

### Use agent authorization plus Legasi submission

The correct submission model is:

- the agent is the economic principal
- the agent authorizes the payment intent
- Legasi rebuilds the transaction
- Legasi pays fees
- Legasi submits the transaction

This keeps the payment flow controllable while preserving an agent-native authorization model.

### Keep policy and credit logic off-chain for the MVP

What must be real on Stellar testnet:

- x402 settlement
- transaction submission
- Soroban-compatible authorization path

What should stay off-chain for the hackathon:

- collateral valuation
- LTV and purchasing power logic
- allowlists and denylists
- spend caps
- reputation scoring
- notifications and approval queue

### Phase 1 still uses overcollateralized assets

Phase 1 should use one non-payment collateral asset and settle approved service payments in USDC terms.

The key point is that the agent is spending against a **credit line**, not against a wallet balance.

Formula:

purchasing_power_usdc = collateral_usd_value × base_ltv
available_power_usdc = purchasing_power_usdc - used_power_usdc

Concrete phase-1 example:

- owner-posted collateral value = 1,000 USD
- base LTV = 60%
- agent credit line = 600 USDC
- if the agent spends 50 USDC on approved services, remaining available power = 550 USDC

This preserves the overcollateralized credit thesis while staying small enough to ship.

## Main components

### Paid service

A simple x402-protected API route such as:

- `GET /search`
- `GET /premium/compute`

### Legasi orchestrator

The central application service.

Responsibilities:

- register owners and agents
- store collateral positions
- compute the credit line and remaining purchasing power
- evaluate policy rules
- request and validate agent authorization
- rebuild and submit Stellar transactions
- record approved and blocked payment attempts
- produce logs and notifications

### Agent client

A CLI or MCP-style client that:

- requests a paid service
- forwards the challenge to Legasi
- signs the payment authorization
- displays the result
- never manages unrestricted treasury funds or direct treasury payments

## Policy model

Each agent should have its own policy profile.

- allowlist of services
- optional denylist
- per-service maximum price
- daily spend cap
- optional category caps
- optional owner approval mode for unknown services

Decision rule:

A payment is allowed only if the service is approved, the amount is within caps, daily spend remains within policy, available purchasing power remains non-negative, and post-payment exposure remains inside the allowed LTV threshold.

## Milestones

1. Get one x402-protected route working on Stellar testnet.
2. Implement one owner, one agent, one allowlisted service, and one blocked-service example.
3. Implement one collateral asset, one USD valuation rule, one fixed LTV, and credit-line / available-power computation.
4. Implement agent authorization plus Legasi fee-payer submission.
5. Implement payment logs and blocked-attempt logs.
6. Prepare tx proof, screenshots, and demo video.

## Final success criterion

The project is successful if it proves this statement end to end:

Owners fund an overcollateralized credit line for agents, and Legasi settles only approved x402 payments on Stellar under per-agent policy rules.
