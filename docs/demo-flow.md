# Demo flow

## Goal

Show one complete story that judges can understand immediately:

An owner funds controlled purchasing power for an agent, the agent tries to buy from an approved x402 service, Legasi approves and submits the payment on Stellar testnet, and the service returns the protected result.

## Primary demo sequence

1. Show one owner and one agent.
2. Show one collateral position posted by the owner.
3. Show the agent's computed purchasing power.
4. Show the agent's allowlisted service.
5. Call the paid service.
6. Show `402 Payment Required`.
7. Show Legasi policy approval.
8. Show the agent authorizing the payment intent.
9. Show Legasi submitting the Stellar transaction.
10. Show the paid result returned.
11. Show updated remaining purchasing power and payment log.

## Secondary demo sequence

1. Call a non-allowlisted service.
2. Show that the payment is blocked.
3. Show the blocked-attempt log.
4. Optionally show an owner notification.

## Demo script

### Opening

"This is a company credit card model for agents. The owner posts collateral and defines where the agent is allowed to spend. The agent can buy approved services, but it does not control the treasury account."

### Approved spend

"Here the owner has funded collateral. Legasi has converted that into purchasing power. The agent requests a paid service. The service responds with 402 Payment Required. Legasi checks the policy and remaining headroom, the agent authorizes the payment intent, and Legasi submits the transaction on Stellar testnet. Once settlement succeeds, the service unlocks."

### Blocked spend

"Now the same agent attempts to buy from a non-approved service. This time the request is blocked before settlement because the target service is not allowlisted. Legasi logs the blocked attempt and can notify the owner."

## Evidence to capture

- Stellar testnet tx hash for an approved payment
- screenshot or log showing `402 Payment Required`
- screenshot or log showing successful protected response
- screenshot or log showing blocked payment attempt
- screenshot or log showing remaining purchasing power before and after payment
