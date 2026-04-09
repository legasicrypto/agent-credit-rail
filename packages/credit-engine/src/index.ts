import type { AgentCreditAccount, BlockReason } from "@agent-credit-rail/shared-types";

export function computePurchasingPower(
  collateral_value_usd: number,
  base_ltv: number,
): number {
  return collateral_value_usd * base_ltv;
}

export function computeAvailablePower(account: AgentCreditAccount): number {
  return account.purchasing_power_usdc - account.used_power_usdc;
}

export interface ExposureCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: BlockReason;
}

/**
 * INSUFFICIENT_POWER is the single Phase 1 credit rejection.
 * LTV breach is redundant when collateral value is static —
 * LTV is already encoded in purchasing_power_usdc.
 */
export function checkPostPaymentExposure(
  account: AgentCreditAccount,
  amount_usdc: number,
): ExposureCheckResult {
  const available = computeAvailablePower(account);
  if (amount_usdc > available) {
    return { allowed: false, remaining: available, reason: "INSUFFICIENT_POWER" };
  }
  return { allowed: true, remaining: available - amount_usdc };
}
