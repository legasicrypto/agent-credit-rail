import { useState, useEffect, useCallback } from "react";

interface CreditAccount {
  agent_id: string;
  owner_id: string;
  collateral_value_usd: number;
  collateral_asset: string;
  collateral_amount: number;
  base_ltv: number;
  purchasing_power_usdc: number;
  used_power_usdc: number;
}

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

const API = "/api";
const AGENT_ID = "agent-1";

export function App() {
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [lastAction, setLastAction] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const [accRes, evtRes] = await Promise.all([
        fetch(`${API}/account/${AGENT_ID}`),
        fetch(`${API}/payments/${AGENT_ID}`),
      ]);
      if (accRes.ok) setAccount(await accRes.json());
      if (evtRes.ok) {
        const data = await evtRes.json();
        setEvents(data.events || []);
      }
    } catch {
      // orchestrator not running
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendPayment = async (serviceUrl: string, amount: number) => {
    setLastAction(`Requesting ${serviceUrl} for ${amount} USDC...`);
    try {
      const res = await fetch(`${API}/payment/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: AGENT_ID,
          service_url: serviceUrl,
          amount_usdc: amount,
        }),
      });
      const result = await res.json();
      setLastAction(
        result.status === "settled"
          ? `Settled! tx: ${result.tx_hash}`
          : result.status === "blocked"
            ? `Blocked: ${result.reason}`
            : `Failed: ${result.error}`,
      );
      refresh();
    } catch {
      setLastAction("Error: orchestrator not reachable");
    }
  };

  const availablePower = account
    ? account.purchasing_power_usdc - account.used_power_usdc
    : 0;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: 8 }}>
        Agent Credit Rail
      </h1>
      <p style={{ color: "#666" }}>
        Owner posts XLM collateral. Legasi computes a credit line. Agent spends USDC on approved services.
      </p>

      {/* Credit Account */}
      <section style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 12px" }}>Credit Account</h2>
        {account ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Stat label="Collateral (posted by owner)" value={`${account.collateral_amount.toLocaleString()} ${account.collateral_asset} ($${account.collateral_value_usd})`} />
              <Stat label="Base LTV" value={`${(account.base_ltv * 100).toFixed(0)}%`} />
              <Stat label="Purchasing Power" value={`${account.purchasing_power_usdc} USDC`} />
              <Stat label="Used Power" value={`${account.used_power_usdc} USDC`} />
              <Stat
                label="Available Power"
                value={`${availablePower} USDC`}
                highlight={availablePower < 100}
              />
              <Stat label="Agent" value={account.agent_id} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              Payments settle in USDC on Stellar testnet
            </div>
          </>
        ) : (
          <p>Loading... (is the orchestrator running on :4010?)</p>
        )}
      </section>

      {/* Power Bar */}
      {account && (
        <div style={{ background: "#e0e0e0", borderRadius: 4, height: 24, marginBottom: 16, overflow: "hidden" }}>
          <div
            style={{
              background: availablePower < 100 ? "#e53e3e" : "#38a169",
              height: "100%",
              width: `${(availablePower / account.purchasing_power_usdc) * 100}%`,
              transition: "width 0.3s",
            }}
          />
        </div>
      )}

      {/* Actions */}
      <section style={{ marginBottom: 16 }}>
        <h2>Actions</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton
            label="Pay /search (10 USDC)"
            onClick={() => sendPayment("/search", 10)}
            color="#2b6cb0"
          />
          <ActionButton
            label="Pay /search (100 USDC)"
            onClick={() => sendPayment("/search", 100)}
            color="#2b6cb0"
          />
          <ActionButton
            label="Try unknown-api.xyz (blocked)"
            onClick={() => sendPayment("unknown-api.xyz", 10)}
            color="#c53030"
          />
        </div>
        {lastAction && (
          <p style={{ marginTop: 8, padding: 8, background: "#fffbea", borderRadius: 4 }}>
            {lastAction}
          </p>
        )}
      </section>

      {/* Payment History */}
      <section>
        <h2>Payment History</h2>
        {events.length === 0 ? (
          <p style={{ color: "#999" }}>No payments yet</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: "8px 4px" }}>Status</th>
                <th style={{ padding: "8px 4px" }}>Service</th>
                <th style={{ padding: "8px 4px" }}>Amount</th>
                <th style={{ padding: "8px 4px" }}>Details</th>
                <th style={{ padding: "8px 4px" }}>Attempt ID</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((evt) => (
                <tr key={evt.attempt_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 4px" }}>
                    <StatusBadge kind={evt.kind} />
                  </td>
                  <td style={{ padding: "6px 4px" }}>{evt.service_url}</td>
                  <td style={{ padding: "6px 4px" }}>{evt.amount_usdc} USDC</td>
                  <td style={{ padding: "6px 4px", fontSize: 12, color: "#666" }}>
                    {evt.kind === "settled" && evt.tx_hash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${evt.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2b6cb0" }}
                      >
                        {evt.tx_hash.slice(0, 12)}...
                      </a>
                    )}
                    {evt.kind === "blocked" && evt.reason}
                    {evt.kind === "failed" && evt.error}
                  </td>
                  <td style={{ padding: "6px 4px", fontSize: 11, fontFamily: "monospace", color: "#999" }}>
                    {evt.attempt_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: highlight ? "#c53030" : "#222" }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ kind }: { kind: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    settled: { bg: "#c6f6d5", fg: "#22543d" },
    blocked: { bg: "#fed7d7", fg: "#742a2a" },
    failed: { bg: "#feebc8", fg: "#7b341e" },
  };
  const c = colors[kind] || { bg: "#eee", fg: "#333" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {kind}
    </span>
  );
}

function ActionButton({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {label}
    </button>
  );
}
