# Payment ledger and audit logs

## Objective

Record all approved and blocked payment attempts in a durable, queryable ledger.

## Background

Observability is part of the product. Owners need to understand what agents attempted, what was approved, what was blocked, and why.

## Scope

- store approved payment requests
- store blocked payment attempts
- store tx hash for successful settlements
- store reason codes for rejected attempts
- expose simple read APIs for recent history

## Dependencies

- 003 orchestrator domain and data model
- 006 agent authorization and Legasi submission

## Acceptance criteria

- approved payment attempts are persisted
- blocked payment attempts are persisted
- successful settlement rows include tx hash
- read APIs support the demo flow

## Out of scope

- analytics dashboards
- data warehousing
- production monitoring stack
