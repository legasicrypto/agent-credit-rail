# Policy engine — allowlist, denylist, and caps

## Objective

Implement the first real Legasi differentiator: policy-controlled spend.

## Background

The product is not just agent payments. It is controlled agent payments. The owner must be able to decide where each agent can spend and under what limits.

## Scope

- per-agent allowlist
- optional per-agent denylist
- per-service max price
- per-agent daily cap
- simple evaluation function returning allow or deny with reason

## Dependencies

- 003 orchestrator domain and data model
- 004 collateral valuation and purchasing power

## Acceptance criteria

- allowlisted service within caps is approved
- denylisted service is rejected
- over-cap request is rejected
- reason codes are returned for blocked requests
- policy rules are documented clearly

## Out of scope

- category-level policy inheritance
- complex role management
- on-chain policy enforcement
