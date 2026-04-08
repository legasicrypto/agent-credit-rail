# Epic: Hackathon MVP — policy-controlled agent payments on Stellar

## Objective

Deliver a working Stellar testnet MVP where an owner funds collateral, an agent receives policy-controlled purchasing power from an overcollateralized credit line, an approved x402 service can be paid automatically, and unauthorized spend attempts are blocked and logged.

## Why this epic exists

This epic is the implementation spine for the repository. It defines the smallest possible real product that proves the core statement:

> Owners fund an overcollateralized credit line for agents, and Legasi settles only approved x402 payments on Stellar under per-agent policy rules.

## Scope

- one owner
- one agent
- one collateral asset
- one paid x402 service
- one policy engine
- one delegated submission flow
- one blocked payment example
- one visible payment/audit trail

## Out of scope

- multi-asset collateral support
- generalized oracle stack
- liquidations
- dynamic interest accrual
- on-chain policy contract accounts
- production-grade custody integrations
- MPP Session mode

## Child issues

- 001 bootstrap monorepo and tooling
- 002 paid x402 service baseline
- 003 orchestrator domain and data model
- 004 collateral valuation and purchasing power
- 005 policy engine allowlist, denylist, caps
- 006 agent authorization and Legasi submission
- 007 payment ledger and audit logs
- 008 blocked-payment alerts and owner approval queue
- 009 demo UI and observability
- 010 agent client or MCP adapter
- 011 end-to-end tests and local dev stack
- 012 submission assets and runbook

## Acceptance criteria

- all required child issues are complete or intentionally deferred with rationale
- one approved payment is executed successfully on Stellar testnet
- one blocked payment is visible in logs or UI
- demo can be replayed from a clean setup using the runbook
