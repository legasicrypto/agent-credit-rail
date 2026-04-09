import { z } from "zod";

// ── Domain Entities ──────────────────────────────────────────────

export interface Owner {
  id: string;
  name: string;
}

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
}

export interface CollateralPosition {
  owner_id: string;
  asset: string;
  amount: number;
  value_usd: number;
}

/**
 * Derived projection — NOT a mutable balance table.
 * purchasing_power_usdc = collateral_value_usd × base_ltv.
 * available = purchasing_power_usdc - used_power_usdc.
 * used_power_usdc is the sum of settled PaymentEvent amounts only.
 */
export interface AgentCreditAccount {
  agent_id: string;
  owner_id: string;
  collateral_value_usd: number;
  base_ltv: number;
  purchasing_power_usdc: number;
  used_power_usdc: number;
}

// ── Policy ───────────────────────────────────────────────────────

export interface ServiceRule {
  service_url: string;
  allowed: boolean;
  per_request_cap_usdc: number;
  daily_cap_usdc: number;
}

export interface PolicyRule {
  agent_id: string;
  services: ServiceRule[];
}

// ── Enums ────────────────────────────────────────────────────────

export type PolicyDecision = "approved" | "blocked";

export type BlockReason =
  | "DENYLISTED"
  | "NOT_ALLOWLISTED"
  | "EXCEEDS_REQUEST_CAP"
  | "EXCEEDS_DAILY_CAP"
  | "INSUFFICIENT_POWER";

export type PaymentStatus = "pending" | "settled" | "blocked" | "failed";

// ── Payment Attempt (non-terminal intent) ────────────────────────

export interface PaymentAttempt {
  attempt_id: string;
  agent_id: string;
  service_url: string;
  amount_usdc: number;
  status: PaymentStatus;
  created_at: number;
}

// ── Payment Event (terminal outcome) ─────────────────────────────

export interface SettledPaymentEvent {
  kind: "settled";
  attempt_id: string;
  agent_id: string;
  service_url: string;
  amount_usdc: number;
  tx_hash: string;
  created_at: number;
}

export interface BlockedPaymentEvent {
  kind: "blocked";
  attempt_id: string;
  agent_id: string;
  service_url: string;
  amount_usdc: number;
  reason: BlockReason;
  created_at: number;
}

export interface FailedPaymentEvent {
  kind: "failed";
  attempt_id: string;
  agent_id: string;
  service_url: string;
  amount_usdc: number;
  error: string;
  created_at: number;
}

export type PaymentEvent =
  | SettledPaymentEvent
  | BlockedPaymentEvent
  | FailedPaymentEvent;

// ── Orchestration Response (terminal, returned by POST /payment/request) ──

export interface SettledResponse {
  status: "settled";
  attempt_id: string;
  tx_hash: string;
  result: unknown;
}

export interface BlockedResponse {
  status: "blocked";
  attempt_id: string;
  reason: BlockReason;
}

export interface FailedResponse {
  status: "failed";
  attempt_id: string;
  error: string;
}

export type OrchestrationResponse =
  | SettledResponse
  | BlockedResponse
  | FailedResponse;

// ── Zod Schemas (HTTP boundary validation) ───────────────────────

export const PaymentRequestSchema = z.object({
  agent_id: z.string().min(1),
  service_url: z.string().min(1),
  amount_usdc: z.number().positive(),
});

export type PaymentRequestBody = z.infer<typeof PaymentRequestSchema>;
