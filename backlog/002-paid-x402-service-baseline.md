# Paid x402 service baseline

## Objective

Implement one x402-protected service on Stellar testnet that returns `402 Payment Required` when unpaid and the protected result when payment succeeds.

## Background

This is the first hard proof that the project is really built on Stellar and not just simulating payments off-chain.

## Scope

- choose one service route, e.g. `GET /search` or `GET /premium/compute`
- wire x402 middleware
- configure Stellar testnet network and payout address
- make the service easy to run locally and on a preview environment

## Dependencies

- 001 bootstrap monorepo and tooling

## Acceptance criteria

- a request without payment returns `402 Payment Required`
- a request with a valid payment succeeds
- response payload is stable and demo-friendly
- setup is documented

## Out of scope

- multiple services
- marketplace discovery
- rich service pricing model
