import type {
  PaymentAttempt,
  BlockReason,
  AgentCreditAccount,
} from "@agent-credit-rail/shared-types";
import {
  computePurchasingPower,
  checkPostPaymentExposure,
} from "@agent-credit-rail/credit-engine";
import { evaluateServicePolicy } from "./policy-engine.js";
import type { Store } from "./store.js";

export interface DecisionRequest {
  agent_id: string;
  service_url: string;
  amount_usdc: number;
}

export interface DecisionResult {
  status: "pending" | "blocked";
  attempt: PaymentAttempt;
  reason?: BlockReason;
}

let attemptCounter = 0;
function nextAttemptId(): string {
  return `att-${++attemptCounter}-${Date.now()}`;
}

export function evaluatePaymentRequest(
  request: DecisionRequest,
  store: Store,
): DecisionResult {
  const attemptId = nextAttemptId();
  const now = Date.now();

  const attempt: PaymentAttempt = {
    attempt_id: attemptId,
    agent_id: request.agent_id,
    service_url: request.service_url,
    amount_usdc: request.amount_usdc,
    status: "pending",
    created_at: now,
  };

  // 1. Policy check
  const agent = store.getAgent(request.agent_id);
  if (!agent) {
    return blocked(store, attempt, "NOT_ALLOWLISTED", now);
  }

  const policy = store.getPolicy(request.agent_id);
  if (!policy) {
    return blocked(store, attempt, "NOT_ALLOWLISTED", now);
  }

  const dayStart = startOfDay(now);
  const dailySpend = store.getAgentDailySpend(
    request.agent_id,
    request.service_url,
    dayStart,
  );

  const policyResult = evaluateServicePolicy(
    request.service_url,
    request.amount_usdc,
    policy,
    dailySpend,
  );

  if (policyResult.decision === "blocked") {
    return blocked(store, attempt, policyResult.reason!, now);
  }

  // 2. Credit check
  const collateral = store.getCollateralPosition(agent.owner_id);
  if (!collateral) {
    return blocked(store, attempt, "INSUFFICIENT_POWER", now);
  }

  const usedPower = store.getAgentUsedPower(request.agent_id);
  const purchasingPower = computePurchasingPower(
    collateral.value_usd,
    0.6, // base LTV — Phase 1 fixed
  );

  const account: AgentCreditAccount = {
    agent_id: request.agent_id,
    owner_id: agent.owner_id,
    collateral_value_usd: collateral.value_usd,
    base_ltv: 0.6,
    purchasing_power_usdc: purchasingPower,
    used_power_usdc: usedPower,
  };

  const exposure = checkPostPaymentExposure(account, request.amount_usdc);
  if (!exposure.allowed) {
    return blocked(store, attempt, exposure.reason!, now);
  }

  // 3. Approved — store attempt as pending (no event yet, no used_power change)
  store.createAttempt(attempt);

  return { status: "pending", attempt };
}

function blocked(
  store: Store,
  attempt: PaymentAttempt,
  reason: BlockReason,
  now: number,
): DecisionResult {
  attempt.status = "blocked";
  store.createAttempt(attempt);
  store.recordEvent({
    kind: "blocked",
    attempt_id: attempt.attempt_id,
    agent_id: attempt.agent_id,
    service_url: attempt.service_url,
    amount_usdc: attempt.amount_usdc,
    reason,
    created_at: now,
  });
  return { status: "blocked", attempt, reason };
}

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
