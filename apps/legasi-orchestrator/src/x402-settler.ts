import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/client";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { createEd25519Signer } from "@x402/stellar";
import type { PaymentSettler } from "./submission.js";

/**
 * Real x402 payment settler.
 *
 * Flow:
 * 1. Receives the PaymentRequired challenge from the 402 response
 * 2. Builds a Stellar payment payload (signs auth entries via ExactStellarScheme)
 * 3. Retries the service request with PAYMENT-SIGNATURE header
 * 4. The paywall middleware forwards to the facilitator which submits on-chain
 * 5. Extracts tx_hash from PAYMENT-RESPONSE header
 * 6. Returns the unlocked service content + tx_hash
 */
export function createX402Settler(
  stellarSecretKey: string,
  network: `${string}:${string}` = "stellar:testnet",
): PaymentSettler {
  const signer = createEd25519Signer(stellarSecretKey, network);
  const scheme = new ExactStellarScheme(signer);
  const client = new x402Client().register(network, scheme);
  const httpClient = new x402HTTPClient(client);

  return {
    async settle(serviceUrl: string, paymentChallenge: unknown) {
      if (!paymentChallenge || typeof paymentChallenge !== "object") {
        throw new Error("Missing x402 payment challenge");
      }

      // Build payment payload from the 402 challenge
      const paymentPayload = await httpClient.createPaymentPayload(
        paymentChallenge as Parameters<typeof httpClient.createPaymentPayload>[0],
      );

      // Encode as HTTP headers
      const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

      // Retry the service request with payment proof
      const response = await fetch(serviceUrl, {
        headers: paymentHeaders,
      });

      if (!response.ok) {
        const body = await response.text();
        const paymentRequiredHeader = response.headers.get("payment-required");
        let errorDetail = "";
        if (paymentRequiredHeader) {
          try {
            const decoded = JSON.parse(
              Buffer.from(paymentRequiredHeader, "base64").toString("utf-8"),
            );
            errorDetail = ` | x402 error: ${JSON.stringify(decoded.error || decoded)}`;
          } catch { /* ignore decode errors */ }
        }
        throw new Error(
          `Payment settlement failed: ${response.status} ${body}${errorDetail}`,
        );
      }

      // Extract settlement response from headers
      const settleResponse = httpClient.getPaymentSettleResponse(
        (name) => response.headers.get(name),
      );

      // Extract the protected content
      const result = await response.json();

      return {
        tx_hash: settleResponse.transaction ?? "unknown",
        result,
      };
    },
  };
}
