# Demo UI and observability

## Objective

Create a small UI or operator dashboard that makes the product understandable in under one minute.

## Background

The demo should not rely only on terminal logs. Judges and teammates need to see the owner, the agent, the collateral-backed credit line, the approved spend, and the blocked spend.

## Scope

- display one owner
- display one agent
- display collateral, LTV, and purchasing power
- display one allowlisted service
- display recent approved and blocked events
- display tx hash for a successful payment

## Dependencies

- 004 collateral valuation and purchasing power
- 007 payment ledger and audit logs

## Acceptance criteria

- the approved payment path is visible without reading code
- the blocked payment path is visible without reading code
- the credit-line model is visible without reading secondary docs
- the UI is stable enough for a demo video

## Out of scope

- production design system
- account management
- advanced charts
