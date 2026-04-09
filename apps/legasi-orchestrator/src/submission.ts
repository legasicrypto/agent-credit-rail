import type { PaymentAttempt, OrchestrationResponse } from "@agent-credit-rail/shared-types";
import type { Store } from "./store.js";

export interface StellarSubmitter {
  submit(attempt: PaymentAttempt): Promise<{ tx_hash: string }>;
}

/**
 * Submits a payment to Stellar and records the terminal event.
 * On success: used_power increases via settled event.
 * On failure: used_power unchanged, failed event recorded.
 */
export async function submitPayment(
  attempt: PaymentAttempt,
  store: Store,
  submitter: StellarSubmitter,
  protectedResult: unknown,
): Promise<OrchestrationResponse> {
  try {
    const { tx_hash } = await submitter.submit(attempt);

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
      result: protectedResult,
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
