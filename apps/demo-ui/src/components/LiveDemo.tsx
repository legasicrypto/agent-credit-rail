interface ServiceRule {
  service_url: string;
  allowed: boolean;
  per_request_cap_usdc: number;
  daily_cap_usdc: number;
}

interface Props {
  allowedRules: ServiceRule[];
  lastAction: string;
  onSendPayment: (serviceUrl: string, amount: number) => void;
}

export function LiveDemo({ allowedRules, lastAction, onSendPayment }: Props) {
  return (
    <section className="mb-8 animate-fade-in" style={{ animationDelay: "0.35s" }}>
      <h2 className="text-lg font-bold text-gray-800 mb-1">Try It Live</h2>
      <p className="text-sm text-gray-500 mb-4">Trigger a payment or test a policy block in real time</p>

      <div className="flex flex-wrap gap-3">
        {allowedRules.map((rule) => (
          <button
            key={`pay-${rule.service_url}`}
            onClick={() => onSendPayment(rule.service_url, 10)}
            className="group relative px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer"
          >
            <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-blue transition-colors">
              Read premium article
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{rule.service_url} &middot; 10 USDC on Stellar</div>
          </button>
        ))}
        <button
          onClick={() => onSendPayment("unknown-api.xyz", 10)}
          className="group relative px-5 py-3 bg-white border border-red-100 rounded-xl shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
        >
          <div className="text-sm font-semibold text-red-600">
            Try unauthorized service
          </div>
          <div className="text-xs text-red-300 mt-0.5">Will be blocked by policy</div>
        </button>
      </div>

      {lastAction && (
        <div
          className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in ${
            lastAction.startsWith("Settled")
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : lastAction.startsWith("Blocked")
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
          }`}
        >
          {lastAction}
        </div>
      )}
    </section>
  );
}
