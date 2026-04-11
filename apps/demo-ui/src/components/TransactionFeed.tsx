import { StatusBadge } from "./StatusBadge.js";

interface PaymentEvent {
  kind: "settled" | "blocked" | "failed";
  attempt_id: string;
  agent_id: string;
  service_url: string;
  amount_usdc: number;
  tx_hash?: string;
  reason?: string;
  error?: string;
  created_at: number;
}

interface Props {
  events: PaymentEvent[];
}

const borderColors: Record<string, string> = {
  settled: "border-l-settled",
  blocked: "border-l-blocked",
  failed: "border-l-failed",
};

export function TransactionFeed({ events }: Props) {
  return (
    <section className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-gray-800">Transaction Feed</h2>
        {events.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-settled animate-pulse-dot" />
            Live
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No transactions yet. Try reading the premium article from Claude Desktop or click "Try It Live" above.
        </p>
      ) : (
        <div className="space-y-2">
          {[...events].reverse().map((evt) => (
            <div
              key={evt.attempt_id}
              className={`bg-white rounded-xl border border-gray-100 border-l-4 ${borderColors[evt.kind] || "border-l-gray-300"} shadow-sm p-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge kind={evt.kind} />
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {evt.kind === "settled" && `Paid ${evt.service_url}`}
                      {evt.kind === "blocked" && `Blocked: ${evt.service_url}`}
                      {evt.kind === "failed" && `Failed: ${evt.service_url}`}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">{evt.amount_usdc} USDC</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(evt.created_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Details row */}
              <div className="mt-2 text-xs text-gray-500">
                {evt.kind === "settled" && evt.tx_hash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${evt.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue hover:underline"
                  >
                    View on Stellar Explorer &rarr;
                  </a>
                )}
                {evt.kind === "blocked" && evt.reason && (
                  <span className="text-red-500">Reason: {evt.reason}</span>
                )}
                {evt.kind === "failed" && evt.error && (
                  <span className="text-amber-600">Error: {evt.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
