import type { PolicyRule, PolicyDecision, BlockReason } from "@agent-credit-rail/shared-types";

export interface PolicyResult {
  decision: PolicyDecision;
  reason?: BlockReason;
}

/**
 * Evaluates service-level policy only.
 * Final approval = service policy + credit check (done by decision engine).
 */
export function evaluateServicePolicy(
  serviceUrl: string,
  amountUsdc: number,
  policy: PolicyRule,
  dailySpend: number,
): PolicyResult {
  // Match by exact service_url or by URL path suffix.
  // Policy stores paths like "/article", real requests use full URLs like "http://host/article".
  const rule = policy.services.find(
    (s) => s.service_url === serviceUrl || serviceUrl.endsWith(s.service_url),
  );

  if (!rule) {
    return { decision: "blocked", reason: "NOT_ALLOWLISTED" };
  }

  if (!rule.allowed) {
    return { decision: "blocked", reason: "DENYLISTED" };
  }

  if (amountUsdc > rule.per_request_cap_usdc) {
    return { decision: "blocked", reason: "EXCEEDS_REQUEST_CAP" };
  }

  if (dailySpend + amountUsdc > rule.daily_cap_usdc) {
    return { decision: "blocked", reason: "EXCEEDS_DAILY_CAP" };
  }

  return { decision: "approved" };
}
