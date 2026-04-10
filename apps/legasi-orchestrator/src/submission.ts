import type { PaymentAttempt, OrchestrationResponse } from "@agent-credit-rail/shared-types";
import type { Store } from "./store.js";

/**
 * PaymentSettler handles the x402 payment flow:
 * builds payment payload, retries the service request with payment proof,
 * and returns the tx_hash + unlocked content.
 *
 * The mock implementation skips the real flow.
 * The real implementation uses @x402/stellar client + facilitator.
 */
export interface PaymentSettler {
  settle(
    serviceUrl: string,
    paymentChallenge: unknown,
  ): Promise<{ tx_hash: string; result: unknown }>;
}

/**
 * Settles a payment and records the terminal event.
 * On success: used_power increases via settled event.
 * On failure: used_power unchanged, failed event recorded.
 */
export async function submitPayment(
  attempt: PaymentAttempt,
  store: Store,
  settler: PaymentSettler,
  paymentChallenge: unknown,
): Promise<OrchestrationResponse> {
  try {
    const { tx_hash, result } = await settler.settle(
      attempt.service_url,
      paymentChallenge,
    );

    store.recordEvent({
      kind: "settled",
      attempt_id: attempt.attempt_id,
      agent_id: attempt.agent_id,
      service_url: attempt.service_url,
      amount_usdc: attempt.amount_usdc,
      tx_hash,
      created_at: Date.now(),
    });

    return {
      status: "settled",
      attempt_id: attempt.attempt_id,
      tx_hash,
      result,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    store.recordEvent({
      kind: "failed",
      attempt_id: attempt.attempt_id,
      agent_id: attempt.agent_id,
      service_url: attempt.service_url,
      amount_usdc: attempt.amount_usdc,
      error: errorMessage,
      created_at: Date.now(),
    });

    return {
      status: "failed",
      attempt_id: attempt.attempt_id,
      error: errorMessage,
    };
  }
}
