# Orchestrator domain and data model

## Objective

Define and implement the core domain model for owners, agents, collateral positions, purchasing power, policies, and payment events.

## Background

The orchestrator is the core application service. It must have a stable internal model before payment authorization logic is added.

## Scope

- domain entities for:
  - owner
  - agent
  - collateral position
  - agent credit account
  - agent policy
  - service rule
  - payment request
  - payment event
- persistence layer and schema
- shared DTOs for internal communication

## Dependencies

- 001 bootstrap monorepo and tooling

## Acceptance criteria

- all domain entities are documented
- the schema supports one owner -> many agents
- the schema supports one owner-funded collateral position
- approved and blocked payment attempts can both be represented cleanly

## Out of scope

- real-time analytics
- production auth
- advanced migrations strategy
