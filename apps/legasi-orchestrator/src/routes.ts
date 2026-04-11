import { Hono } from "hono";
import { cors } from "hono/cors";
import { PaymentRequestSchema } from "@agent-credit-rail/shared-types";
import type { AgentCreditAccount } from "@agent-credit-rail/shared-types";
import { computePurchasingPower } from "@agent-credit-rail/credit-engine";
import type { Store } from "./store.js";
import { evaluatePaymentRequest } from "./decision.js";
import { submitPayment, type PaymentSettler } from "./submission.js";

export function createOrchestratorApp(store: Store, settler: PaymentSettler) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ status: "ok" }));

  /**
   * POST /payment/request → terminal OrchestrationResponse
   * Returns settled | blocked | failed in one call.
   */
  app.post("/payment/request", async (c) => {
    const raw = await c.req.json();
    const parsed = PaymentRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
    }

    const { agent_id, service_url, amount_usdc, payment_challenge } = parsed.data;

    const decision = evaluatePaymentRequest(
      { agent_id, service_url, amount_usdc },
      store,
    );

    if (decision.status === "blocked") {
      return c.json(
        {
          status: "blocked" as const,
          attempt_id: decision.attempt.attempt_id,
          reason: decision.reason!,
        },
        200,
      );
    }

    // Approved — settle via x402 (real) or mock
    const response = await submitPayment(
      decision.attempt,
      store,
      settler,
      payment_challenge,
    );

    const status = response.status === "settled" ? 200 : 502;
    return c.json(response, status);
  });

  /**
   * GET /account/:agentId → credit account view (derived projection)
   */
  app.get("/account/:agentId", (c) => {
    const agentId = c.req.param("agentId");
    const agent = store.getAgent(agentId);
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const collateral = store.getCollateralPosition(agent.owner_id);
    if (!collateral) {
      return c.json({ error: "No collateral position" }, 404);
    }

    const usedPower = store.getAgentUsedPower(agentId);
    const purchasingPower = computePurchasingPower(collateral.value_usd, 0.6);

    const account: AgentCreditAccount = {
      agent_id: agentId,
      owner_id: agent.owner_id,
      collateral_value_usd: collateral.value_usd,
      base_ltv: 0.6,
      purchasing_power_usdc: purchasingPower,
      used_power_usdc: usedPower,
    };

    return c.json({
      ...account,
      collateral_asset: collateral.asset,
      collateral_amount: collateral.amount,
    });
  });

  /**
   * GET /policy/:agentId → policy rules for an agent
   */
  app.get("/policy/:agentId", (c) => {
    const agentId = c.req.param("agentId");
    const agent = store.getAgent(agentId);
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const policy = store.getPolicy(agentId);
    return c.json({ policy: policy ?? { agent_id: agentId, services: [] } });
  });

  /**
   * GET /agents/:ownerId → agents belonging to an owner
   */
  app.get("/agents/:ownerId", (c) => {
    const ownerId = c.req.param("ownerId");
    const owner = store.getOwner(ownerId);
    if (!owner) {
      return c.json({ error: "Owner not found" }, 404);
    }

    const agents = store.getAgentsByOwner(ownerId);
    return c.json({ agents });
  });

  /**
   * GET /payments/:agentId → payment history (events)
   */
  app.get("/payments/:agentId", (c) => {
    const agentId = c.req.param("agentId");
    const agent = store.getAgent(agentId);
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const events = store.getAgentEvents(agentId);
    return c.json({ events });
  });

  return app;
}
