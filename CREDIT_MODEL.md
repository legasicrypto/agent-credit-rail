# Credit model

## The important point

The agent's purchasing power is **not** a prepaid balance and it is **not** unrestricted cash.

It is a form of **overcollateralized credit** backed by assets posted by the owner.

## Who provides what

### Owner

The owner posts collateral into Legasi infrastructure.

Examples for later versions could include:

- XLM
- BTC
- ETH
- tokenized assets

For the MVP, phase 1 should support **one collateral asset only**.

### Agent

The agent does **not** receive the collateral itself.
The agent does **not** receive unrestricted funds in its wallet.
The agent only receives the right to trigger payments within the policy and credit limits defined by Legasi.

### Legasi

Legasi converts posted collateral into a lower amount of usable purchasing power.
That purchasing power is the agent's credit line.

## Why this is credit

The model is:

1. owner posts collateral
2. Legasi values that collateral in USD terms
3. Legasi applies a conservative LTV
4. the resulting amount becomes the agent's purchasing power in USDC terms
5. Legasi uses that purchasing power to settle approved x402 payments on the agent's behalf

That means the agent is spending **against a credit line derived from collateral**, not against an ordinary wallet balance.

## Formula

```text
collateral_value_usd = market value of owner-posted collateral
purchasing_power_usdc = collateral_value_usd × base_ltv
available_power_usdc = purchasing_power_usdc - used_power_usdc
```

## Example

```text
Owner posts collateral worth 1,000 USD
Base LTV = 60%
Agent purchasing power = 600 USDC
```

The remaining 400 USD is the safety buffer.

If the agent spends 50 USDC on approved x402 services:

```text
used_power_usdc = 50
available_power_usdc = 550
```

## Why the agent should not hold the borrowed funds directly

The product is designed to work like a company credit card:

- the company employee can spend company money
- but the employee does not control the company's bank account

Likewise:

- the agent can trigger approved payments
- but the agent does not control the owner's treasury or unrestricted borrowed USDC

This lets Legasi enforce:

- service allowlists
- denylists
- spend caps
- owner approval for unknown services

## Relationship with reputation

Reputation does **not** replace collateral.
Reputation improves the terms of the overcollateralized credit.

Later, reputation can improve:

- max LTV
- interest rate
- accepted collateral set
- policy flexibility

But the base model remains:

**owner-posted collateral -> discounted purchasing power -> approved agent payments**

## One-sentence definition

> The agent's purchasing power is an overcollateralized credit line derived from assets posted by the owner and enforced by Legasi under policy rules.
