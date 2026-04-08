# Bootstrap monorepo and tooling

## Objective

Create the minimum repository scaffold required to build the MVP quickly without overengineering.

## Background

The repo is new and needs a predictable structure so backend, frontend, and shared packages can evolve in parallel.

## Scope

- root `package.json`
- `pnpm-workspace.yaml`
- shared TypeScript config
- `.gitignore`
- app/package placeholder structure
- docs folder structure
- backlog folder structure

## Deliverables

- root scripts for build, lint, test, typecheck
- placeholder directories for:
  - `apps/paywall-service`
  - `apps/legasi-orchestrator`
  - `apps/demo-ui`
  - `apps/agent-client`
  - `packages/shared-types`
  - `packages/credit-engine`
  - `packages/stellar-auth`
  - `packages/x402-adapter`

## Acceptance criteria

- repository installs cleanly with pnpm
- directory structure is documented in README
- all placeholder packages have a README or package manifest

## Out of scope

- full CI pipeline
- production deployment setup
- advanced linting or formatting rules
