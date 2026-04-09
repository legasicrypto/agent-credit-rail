# End-to-end tests and local dev stack

## Objective

Create a repeatable local development and testing path for the main flows.

## Background

The demo must be reproducible. The team also needs confidence that changes do not break the approved and blocked payment flows.

The tests should validate not only payment success and failure, but also the **credit-backed behavior** of the system.

## Scope

- local setup instructions
- seeded local or testnet-compatible environment
- one approved payment integration test
- one blocked payment integration test
- one basic smoke test for the paid service

## Dependencies

- 002 paid x402 service baseline
- 005 policy engine allowlist, denylist, and caps
- 006 agent authorization and Legasi submission
- 007 payment ledger and audit logs

## Acceptance criteria

- a new contributor can run the main flows locally using the runbook
- approved and blocked paths are both covered by automated tests
- approved payments reduce available credit headroom as expected
- blocked payments leave available credit headroom unchanged
- the tested flow does not include any direct agent treasury funding path
- the tests are stable enough for repeated use during the hackathon

## Out of scope

- exhaustive protocol simulation
- performance testing
- production chaos testing
