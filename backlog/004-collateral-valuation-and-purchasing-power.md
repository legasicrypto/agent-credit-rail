# Collateral valuation and purchasing power

## Objective

Implement the first collateral model for the MVP: one non-payment collateral asset, one valuation rule, one conservative LTV, and derived purchasing power in USDC terms.

## Background

Phase 1 should remain overcollateralized, but it must stay simple enough to ship during the hackathon. The output of this issue is a **credit line**, not a wallet balance.

## Scope

- support one collateral asset only
- store collateral amount and USD-equivalent value
- apply one fixed haircut and one fixed LTV
- compute a credit line and remaining power in USDC terms
- expose read APIs for current account state

## Dependencies

- 003 orchestrator domain and data model

## Acceptance criteria

- purchasing power is deterministic and testable
- remaining power is reduced after approved payments
- post-payment exposure can be checked before settlement
- formula is documented in code and docs
- the agent never receives unrestricted borrowed funds directly in its wallet
- available power is represented as internal credit-account state

## Out of scope

- multiple collateral assets
- general oracle integrations
- dynamic pricing models
- interest calculations
