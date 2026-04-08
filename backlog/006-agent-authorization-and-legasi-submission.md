# Agent authorization and Legasi submission

## Objective

Implement the payment flow where the agent authorizes the spend intent and Legasi submits the Stellar transaction as fee payer and submitter.

## Background

This is the key architectural choice that makes the system feel like a company card for agents rather than a raw agent wallet.

## Scope

- collect agent authorization for payment intent
- validate the signed intent inside the orchestrator
- rebuild the transaction for submission by Legasi
- submit through the chosen Stellar flow
- connect successful submission to the paid x402 service

## Dependencies

- 002 paid x402 service baseline
- 005 policy engine allowlist, denylist, and caps

## Acceptance criteria

- a valid authorized request can be submitted by Legasi
- the paid service unlocks after successful settlement
- the system makes clear that the agent is the principal and Legasi is the submitter
- the flow is reproducible on Stellar testnet
- the only supported spend path in the MVP is: agent authorizes, Legasi submits
- the agent does not self-submit direct treasury payments in the MVP

## Out of scope

- advanced wallet abstraction
- on-chain account policy contracts
- production signing infrastructure
