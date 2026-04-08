# Agent Credit Rail

Policy-controlled agent payments on Stellar, backed by an **overcollateralized credit line** funded by owner-posted assets.

## What this project is

This repository contains the hackathon implementation of the first layer of Legasi's agent credit infrastructure:

- an **owner** posts collateral into Legasi infrastructure
- Legasi converts that collateral into a **discounted credit line** using a conservative LTV
- each **agent** receives policy-controlled purchasing power derived from that credit line
- the agent can only pay approved x402 services
- the agent authorizes the payment intent
- **Legasi submits the payment on Stellar testnet** and pays fees
- the paid service returns the protected result
- Legasi updates usage, logs, and reputation

## The key product point

The agent's purchasing power is **not** a prepaid balance and it is **not** unrestricted cash.

It is an **overcollateralized credit line** backed by collateral posted by the owner.

That means:

- the owner funds collateral
- Legasi applies an LTV
- the agent spends against a credit account
- the agent never receives unrestricted borrowed funds in its own wallet

See [CREDIT_MODEL.md](./CREDIT_MODEL.md).

## Core product analogy

This product should feel like a company credit card for agents:

- the owner controls treasury and policy
- the agent can spend, but only within rules
- the agent never receives unrestricted funds
- unknown or unauthorized spending attempts are blocked or escalated

## MVP scope

Phase 1 intentionally stays small:

- one owner
- one agent
- one collateral asset
- one paid x402 service
- one policy engine
- one Stellar testnet settlement path
- one blocked-payment example

## Architecture summary

```text
Owner posts collateral
  -> Legasi computes an overcollateralized credit line using LTV
  -> agent receives controlled purchasing power against that credit line
Agent requests paid service
  -> service returns 402 Payment Required
Legasi checks policy and remaining purchasing power
Agent authorizes the payment intent
Legasi rebuilds and submits the Stellar transaction
Service returns the paid result
Legasi records approved or blocked spend
```

## Repository structure

```text
apps/
  paywall-service/        x402-protected service on Stellar testnet
  legasi-orchestrator/    credit engine, policy engine, submission service
  demo-ui/                owner/agent demo dashboard
  agent-client/           CLI or MCP-style client
packages/
  shared-types/           shared DTOs and domain types
  credit-engine/          collateral, LTV, purchasing power logic
  stellar-auth/           auth-entry and submission helpers
  x402-adapter/           x402 challenge/settlement integration
backlog/
  numbered issue specs ready to open as GitHub issues
docs/
  technical plan, architecture, demo flow, backlog index
```

## Current repository status

This repository is initialized as a planning and execution scaffold.

The backlog under [`backlog/`](./backlog) is the source of truth for implementation. Each markdown file is written as a ready-to-open GitHub issue with:

- objective
- background
- scope
- dependencies
- acceptance criteria
- out-of-scope notes
- implementation hints

## Key docs

- [Credit model](./CREDIT_MODEL.md)
- [Technical plan](./docs/technical-plan.md)
- [Architecture](./docs/architecture.md)
- [Demo flow](./docs/demo-flow.md)
- [Issue backlog](./docs/issue-backlog.md)

## Non-goals for the hackathon MVP

This repo does **not** attempt to ship the full institutional Lombard lending stack during the hackathon. The following are explicitly out of scope for MVP:

- multi-asset collateral support
- generalized oracle stack
- on-chain policy contract accounts
- liquidation engine
- dynamic interest accrual
- production custody integrations
- MPP Session mode

## Guiding principle

Build the smallest possible real system that proves this statement:

> Owners fund an overcollateralized credit line for agents, and Legasi settles only approved x402 payments on Stellar under per-agent policy rules.
