# Agent client or MCP adapter

## Objective

Implement the thinnest possible agent-facing client so the demo is clearly agentic rather than just backend-to-backend.

## Background

A CLI or MCP-style client is enough to prove that an autonomous workflow can trigger the x402 purchase path.

The client is an **authorizer/requester only**. It must not manage unrestricted funds, treasury balances, or direct treasury payment behavior.

## Scope

- one CLI flow or one MCP-style adapter
- request a paid service
- forward challenge to Legasi
- authorize the payment intent
- display the protected result

## Dependencies

- 002 paid x402 service baseline
- 006 agent authorization and Legasi submission

## Acceptance criteria

- the agent-facing flow is reproducible from docs
- the client can execute one approved request end to end
- logs are clear enough for demo recording
- the client is clearly limited to request + authorize + display responsibilities
- the client does not manage unrestricted funds or direct treasury payments

## Out of scope

- multi-agent coordination
- production assistant integrations
- marketplace discovery
