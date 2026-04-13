# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

AgentPay (repo name: agent-credit-rail) is Legasi's hackathon MVP — a corporate payment stack for AI agents on Stellar testnet. The core model: an owner posts collateral, Legasi computes an overcollateralized credit line (collateral x LTV), and agents spend against that credit line for approved x402 services only. Think Spendesk for AI agents — the agent never receives unrestricted funds.

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
pnpm dev:mcp            # starts MCP server (stdio transport, for Claude Desktop)

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
- `demo-ui` — React/Vite dashboard: agent selector, credit account display, inline policy editing (`PUT /policy/:agentId`), payment actions, payment history with Stellar Explorer links. Supports `?agentId=` deep linking for MCP provisioning flow.
- `agent-client` — CLI or MCP-style client that requests services and authorizes payments
- `mcp-server` — 6-tool MCP server (stdio transport) for Claude Desktop; exposes `setup_legasi`, `get_dashboard_link`, `show_my_policy`, `read_premium_article`, `pay_for_service`, `show_my_payments`. Each Claude Desktop session auto-provisions its own agent via `POST /provision` on first tool use. Auto-reprovisions if orchestrator redeploys.

**Packages** (`packages/`):
- `credit-engine` — collateral valuation, LTV computation, purchasing power logic
- `shared-types` — shared DTOs and domain types used across apps and packages
- `stellar-auth` — Stellar authorization, tx assembly, delegated submission helpers
- `x402-adapter` — x402 challenge/settlement integration

## Environment variables

Defined in `.env.example` at repo root:
- `STELLAR_TESTNET_SECRET_KEY` — optional; when unset, orchestrator uses a **mock settler** returning fake tx hashes (useful for local dev without testnet funds)
- `STELLAR_PAYEE_ADDRESS` — paywall's Stellar testnet address
- `STELLAR_NETWORK`, `FACILITATOR_URL` — x402 settlement config
- `PAYWALL_PORT` (4020), `ORCHESTRATOR_PORT` (4010), `PAYWALL_PRICE` ($4.99 default)
- `ORCHESTRATOR_URL`, `PAYWALL_URL` — used by MCP server (default to Railway production URLs)
- `VITE_API_URL` — demo-ui build arg for API endpoint (build-time coupled to orchestrator URL)
- `DASHBOARD_URL` — used by MCP server and `/provision` route (defaults to Railway dashboard URL)

## Orchestrator internals

- **Framework**: Hono (via `@hono/node-server`)
- **Settler abstraction**: `PaymentSettler` interface with two implementations — `createX402Settler(secretKey)` for real Stellar testnet, inline mock settler when `STELLAR_TESTNET_SECRET_KEY` is unset
- **API routes**: `POST /provision`, `POST /payment/request`, `GET /account/:agentId`, `GET /policy/:agentId`, `PUT /policy/:agentId`, `GET /agents`, `GET /agents/:ownerId`, `GET /payments/:agentId`, `GET /health`
- **Seed data**: owner with 10,000 XLM ($1,000 USD), LTV 0.6, purchasing power 600 USDC, one agent `agent-1`

## Deployment

Three apps deploy to **Railway** (project: `generous-curiosity`). In-memory state is **ephemeral** — redeploys/restarts reset demo data.

| Service | URL | Port | Dockerfile | Key env vars |
|---|---|---|---|---|
| `legasi-orchestrator` | `legasi-orchestrator-production.up.railway.app` | 4010 | Root `Dockerfile` (`APP_ENTRYPOINT=apps/legasi-orchestrator/src/main.ts`) | `ORCHESTRATOR_PORT`, `DASHBOARD_URL`, `STELLAR_TESTNET_SECRET_KEY` (optional) |
| `capital-insider` | `capital-insider-production.up.railway.app` | 4020 | Root `Dockerfile` (`APP_ENTRYPOINT=apps/paywall-service/src/main.ts`) | `PAYWALL_PORT`, `STELLAR_PAYEE_ADDRESS`, `STELLAR_NETWORK`, `FACILITATOR_URL` |
| `legasi-dashboard` | `legasi-dashboard-production.up.railway.app` | 4030 | `apps/demo-ui/Dockerfile` (`RAILWAY_DOCKERFILE_PATH`) | `VITE_API_URL` (build-time, points to orchestrator URL) |

Shared `Dockerfile` at repo root (node:22-slim + pnpm + tsx) for orchestrator and paywall. Separate Dockerfile in `apps/demo-ui/` (Vite build + serve).

**MCP server URLs**: Set `ORCHESTRATOR_URL`, `PAYWALL_URL`, `DASHBOARD_URL` as env vars where MCP runs. Source defaults are Railway URLs as fallback only — do not rely on them as the primary config mechanism.

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
mcp-server            ← standalone (HTTP calls to orchestrator/paywall, uses @modelcontextprotocol/sdk)
demo-ui               ← depends on shared-types
```

Build order: `shared-types` → `credit-engine`, `stellar-auth` (parallel) → `x402-adapter` → apps.

## What is real vs mocked

| Component | Status |
|---|---|
| x402 paywall (402 challenge/response) | Real |
| Stellar testnet settlement | Real (when `STELLAR_TESTNET_SECRET_KEY` set) |
| Policy engine, credit engine, decision engine | Real |
| Stellar submission in local dev (no secret key) | Mock (fake tx hashes) |
| Storage (owners, agents, payments) | In-memory (resets on restart) |

## MVP constraints

Phase 1: one owner, one agent, one collateral asset, one paid service, one policy engine, one Stellar testnet settlement path. Off-chain policy and credit logic; on-chain payment settlement only.
