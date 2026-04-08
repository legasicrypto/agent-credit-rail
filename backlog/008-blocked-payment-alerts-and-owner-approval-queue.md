# Blocked payment alerts and owner approval queue

## Objective

Add owner-facing feedback for blocked or unknown payment attempts, with an optional lightweight approval queue.

## Background

This is a secondary but powerful product feature. It turns the system from a silent rules engine into managed spend infrastructure.

## Scope

- blocked-payment notification payload
- pending-approval representation for unknown services
- simple owner action model:
  - allow once
  - allow always
  - deny
- make this feature optional in the MVP

## Dependencies

- 005 policy engine allowlist, denylist, and caps
- 007 payment ledger and audit logs

## Acceptance criteria

- a blocked request can create an owner-facing event
- an unknown request can be represented as pending approval
- owner decision updates policy or request state in a predictable way

## Out of scope

- production-grade notification integrations
- complex workflow engines
- multi-owner approval logic
