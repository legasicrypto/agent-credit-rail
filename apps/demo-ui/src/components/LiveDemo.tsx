import { useState } from "react";
import { PaymentStepper } from "./PaymentStepper.js";

interface ServiceRule {
  service_url: string;
  allowed: boolean;
  per_request_cap_usdc: number;
  daily_cap_usdc: number;
}

interface Props {
  allowedRules: ServiceRule[];
  agentId: string;
  paywallUrl: string;
  apiUrl: string;
  onRefresh: () => void;
}

export function LiveDemo({ allowedRules, agentId, paywallUrl, apiUrl, onRefresh }: Props) {
  const [activeStepper, setActiveStepper] = useState<{
    serviceUrl: string;
    amount: number;
  } | null>(null);

  return (
    <section className="mb-8 animate-fade-in" style={{ animationDelay: "0.35s" }}>
      <h2 className="text-lg font-bold text-gray-800 mb-1">Try It Live</h2>
      <p className="text-sm text-gray-500 mb-4">
        Walk through the payment flow step by step
      </p>

      {!activeStepper && (
        <div className="flex flex-wrap gap-3">
          {allowedRules.map((rule) => (
            <button
              key={`pay-${rule.service_url}`}
              onClick={() =>
                setActiveStepper({ serviceUrl: rule.service_url, amount: 4.99 })
              }
              className="group relative px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer"
            >
              <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-blue transition-colors">
                Read premium article
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {rule.service_url} &middot; $4.99 USDC on Stellar
              </div>
            </button>
          ))}
          <button
            onClick={() =>
              setActiveStepper({ serviceUrl: "premium-data.io", amount: 10 })
            }
            className="group relative px-5 py-3 bg-white border border-red-100 rounded-xl shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
          >
            <div className="text-sm font-semibold text-red-600">
              Buy data from premium-data.io
            </div>
            <div className="text-xs text-red-300 mt-0.5">
              Not on approved list — will be blocked
            </div>
          </button>
        </div>
      )}

      {activeStepper && (
        <PaymentStepper
          serviceUrl={activeStepper.serviceUrl}
          amount={activeStepper.amount}
          agentId={agentId}
          paywallUrl={paywallUrl}
          apiUrl={apiUrl}
          onComplete={onRefresh}
          onClose={() => setActiveStepper(null)}
        />
      )}
    </section>
  );
}
