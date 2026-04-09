# Payment ledger and audit logs

## Objective

Record all approved and blocked payment attempts in a durable, queryable ledger.

## Background

Observability is part of the product. Owners need to understand what agents attempted, what was approved, what was blocked, and why.

This ledger should behave like a **credit-backed payment audit trail**, not just a raw payment event table.

## Scope

- store approved payment requests
- store blocked payment attempts
- store tx hash for successful settlements
- store reason codes for rejected attempts
- store available credit headroom before and after approved payments
- store enough state to show that blocked payments leave credit headroom unchanged
- expose simple read APIs for recent history

## Dependencies

- 003 orchestrator domain and data model
- 006 agent authorization and Legasi submission

## Acceptance criteria

- approved payment attempts are persisted
- blocked payment attempts are persisted
- successful settlement rows include tx hash
- available credit headroom is captured before and after approved payments
- blocked payment attempts do not modify available credit headroom
- read APIs support the demo flow

## Out of scope

- analytics dashboards
- data warehousing
- production monitoring stack
