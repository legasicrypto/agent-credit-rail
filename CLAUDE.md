# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Agent Credit Rail is Legasi's hackathon MVP for policy-controlled agent payments on Stellar testnet. The core model: an owner posts collateral, Legasi computes an overcollateralized credit line (collateral × LTV), and agents spend against that credit line for approved x402 services only. Think "company credit card for AI agents" — the agent never receives unrestricted funds.

## Build and development commands

```bash
pnpm install          # install all dependencies
pnpm build            # build all packages and apps
pnpm lint             # lint all packages and apps
pnpm test             # run tests across all packages and apps
pnpm typecheck        # type-check all packages and apps
pnpm format           # format with prettier

# Run commands in a single workspace:
pnpm --filter <package-name> build
pnpm --filter <package-name> test

# Dev servers (defined in root package.json):
pnpm dev:orchestrator   # starts orchestrator on port 4010
pnpm dev:paywall        # starts paywall-service on port 4020
pnpm dev:ui             # starts demo-ui

# Run a single test file:
pnpm --filter @agent-credit-rail/legasi-orchestrator exec vitest run src/__tests__/decision.test.ts

# Smoke test against Stellar testnet (requires STELLAR_TESTNET_SECRET_KEY in .env):
pnpm smoke:testnet
```

Package manager is **pnpm** (v10). TypeScript targets ES2022 with strict mode and Bundler module resolution (see `tsconfig.base.json`). Vitest workspace is configured at root (`vitest.workspace.ts`) to include all packages and apps.

## Monorepo structure

This is a pnpm workspace monorepo. Workspaces are declared in `pnpm-workspace.yaml`:

**Apps** (`apps/`):
- `legasi-orchestrator` — central service: credit engine, policy engine, Stellar tx submission, payment logging
- `paywall-service` — x402-protected demo service (returns 402, unlocks after settlement)
- `demo-ui` — owner/agent dashboard
- `agent-client` — CLI or MCP-style client that requests services and authorizes payments

**Packages** (`packages/`):
- `credit-engine` — collateral valuation, LTV computation, purchasing power logic
- `shared-types` — shared DTOs and domain types used across apps and packages
- `stellar-auth` — Stellar authorization, tx assembly, delegated submission helpers
- `x402-adapter` — x402 challenge/settlement integration

## Key domain concepts

- **Purchasing power** = `collateral_value_usd × base_ltv - used_power_usdc`. This is not a wallet balance.
- **No credit reservation on approval.** A `pending` attempt does not decrement purchasing power. Only a `settled` event does. Concurrent requests can both be approved against the same power — intentional Phase 1 trade-off.
- **Policy engine** enforces: service allowlist/denylist, per-request caps, daily caps, post-payment LTV check.
- **Payment flow**: agent requests service → 402 challenge → Legasi checks policy & power → agent authorizes intent → Legasi rebuilds & submits Stellar tx → service returns result → Legasi logs spend.
- **Blocked flow**: same start, but policy rejects → blocked attempt logged → owner optionally notified.
- **Terminal single-call API**: `POST /payment/request` returns `settled | blocked | failed` synchronously (no polling).
- `PaymentAttempt` = non-terminal intent (created at decision time). `PaymentEvent` = terminal outcome (blocked, failed, or settled). Every payment carries a correlation `attempt_id` across both.
- Used power only changes after successful Stellar submission. Blocked/failed payments never affect `used_power`.
- Detailed credit model: `CREDIT_MODEL.md`. Architecture: `docs/architecture.md`. Demo script: `docs/demo-flow.md`.

## Backlog

The `backlog/` directory contains numbered issue specs (000–012) that serve as the implementation roadmap. Each file is a ready-to-open GitHub issue with objective, scope, acceptance criteria, and implementation hints. Issues are numbered in dependency order.

## PR conventions

PRs should follow the template in `.github/pull_request_template.md`: Summary, Why, Scope, Validation checklist, Risks, Follow-ups.

## Testing conventions

- Tests live in `src/__tests__/*.test.ts` within each package/app
- `createSeededStore()` factory pattern — no shared global fixtures
- Dependency injection via interfaces (`StellarSubmitter`, `Fetcher`) — no mocking frameworks
- "Drift guard" tests verify invariants (e.g., credit never moves on blocked/pending events)
- `demo-ui` tests skip jsdom ("keep lean for hackathon")

## Workspace dependency graph

```
shared-types          ← used by everything
credit-engine         ← depends on shared-types
stellar-auth          ← depends on shared-types
x402-adapter          ← depends on shared-types, stellar-auth
legasi-orchestrator   ← depends on credit-engine, x402-adapter, stellar-auth, shared-types
paywall-service       ← depends on x402-adapter, shared-types
agent-client          ← depends on x402-adapter, shared-types
demo-ui               ← depends on shared-types
```

Build order: `shared-types` → `credit-engine`, `stellar-auth` (parallel) → `x402-adapter` → apps.

## MVP constraints

Phase 1: one owner, one agent, one collateral asset, one paid service, one policy engine, one Stellar testnet settlement path. Off-chain policy and credit logic; on-chain payment settlement only.
