# Demo flow

## Goal

Show one complete story that judges can understand immediately:

An owner funds an overcollateralized credit line for an agent, the agent tries to buy from an approved x402 service, AgentPay approves and submits the payment on Stellar testnet, and the service returns the protected result.

## Primary demo sequence

1. Show one owner and one agent.
2. Show one collateral position posted by the owner.
3. Show one concrete example:
   - collateral value = 1,000 USD
   - base LTV = 60%
   - purchasing power = 600 USDC
4. Show the agent's allowlisted service.
5. Call the paid service.
6. Show `402 Payment Required`.
7. Show AgentPay policy approval.
8. Show the agent authorizing the payment intent.
9. Show AgentPay submitting the Stellar transaction.
10. Show the paid result returned.
11. Show updated remaining purchasing power and payment log.

## Secondary demo sequence

1. Call a non-allowlisted service (premium-data.io).
2. Show that the payment is blocked.
3. Show the blocked-attempt log.
4. Optionally show an owner notification.

## Demo script

### Opening

"This is a corporate payment stack for AI agents. The owner posts collateral, AgentPay converts that collateral into an overcollateralized credit line, and the owner defines where the agent is allowed to spend. The agent can buy approved services, but it does not control the treasury account."

### Approved spend

"Here the owner has posted collateral worth 1,000 USD. With a 60% LTV, AgentPay gives the agent 600 USDC of purchasing power. The agent requests a paid article on Capital Insider. The service responds with 402 Payment Required. AgentPay checks the policy and remaining headroom, the agent authorizes the payment intent, and AgentPay submits the transaction on Stellar testnet. Once settlement succeeds, the article unlocks."

### Blocked spend

"Now the same agent attempts to buy data from premium-data.io. This time the request is blocked before settlement because the target service is not allowlisted. AgentPay logs the blocked attempt and can notify the owner."

## Evidence to capture

- Stellar testnet tx hash for an approved payment
- screenshot or log showing `402 Payment Required`
- screenshot or log showing successful protected response
- screenshot or log showing blocked payment attempt
- screenshot or log showing remaining purchasing power before and after payment
