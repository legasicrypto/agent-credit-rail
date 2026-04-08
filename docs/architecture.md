# Architecture

## System view

```text
Owner
  -> posts collateral
Legasi credit account
  -> computes overcollateralized purchasing power from owner-posted assets
Legasi orchestrator
  -> stores per-agent policy
Agent client
  -> requests paid service
Paid service
  -> returns 402 challenge
Legasi orchestrator
  -> checks allowlist, caps, remaining power, post-spend LTV
Agent client
  -> authorizes payment intent
Legasi orchestrator
  -> rebuilds and submits Stellar transaction
Facilitator
  -> verifies and settles
Paid service
  -> returns protected result
Legasi orchestrator
  -> records approved or blocked spend
Owner
  -> receives logs or notifications
```

## Responsibility split

### Owner

- posts collateral
- defines per-agent policy
- reviews logs and optional alerts

### Agent

- requests services
- authorizes payment intents
- does not control unrestricted treasury funds
- spends only against a Legasi-managed credit account

### Legasi credit account

- turns owner-posted collateral into an overcollateralized credit line
- computes available purchasing power from collateral value and LTV
- tracks used and remaining power

### Legasi orchestrator

- enforces policy
- checks spend attempts
- submits Stellar transactions
- records usage

### Paid service

- exposes one x402-protected endpoint
- returns a protected result after settlement

## Core flows

### Approved payment flow

1. agent requests service
2. service returns `402 Payment Required`
3. Legasi checks policy and remaining power
4. agent authorizes the payment intent
5. Legasi submits the transaction
6. settlement succeeds
7. service returns result
8. Legasi records spend

### Blocked payment flow

1. agent requests a non-approved service
2. service returns `402 Payment Required`
3. Legasi checks policy
4. request is blocked because the service is not allowlisted or caps are exceeded
5. Legasi records the blocked attempt
6. owner can be notified

## Design principles

- owner-funded overcollateralized credit, not unrestricted agent wallets
- one collateral asset in phase 1
- one paid service in phase 1
- off-chain policy, on-chain payment settlement
- approved and blocked attempts are equally important product events
