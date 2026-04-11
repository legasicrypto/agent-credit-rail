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

interface AgentInfo {
  id: string;
  owner_id: string;
  name: string;
}

interface ServiceRule {
  service_url: string;
  allowed: boolean;
  per_request_cap_usdc: number;
  daily_cap_usdc: number;
}

const API = import.meta.env.VITE_API_URL || "/api";

function getInitialAgentId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("agentId") || "agent-1";
}

export function App() {
  const [selectedAgentId, setSelectedAgentId] = useState(getInitialAgentId);
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [policyRules, setPolicyRules] = useState<ServiceRule[]>([]);
  const [lastAction, setLastAction] = useState<string>("");
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [editRules, setEditRules] = useState<ServiceRule[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [accRes, evtRes, polRes] = await Promise.all([
        fetch(`${API}/account/${selectedAgentId}`),
        fetch(`${API}/payments/${selectedAgentId}`),
        fetch(`${API}/policy/${selectedAgentId}`),
      ]);
      if (accRes.ok) {
        const acc = await accRes.json();
        setAccount(acc);
      }
      // Fetch all agents across all owners
      const agentsRes = await fetch(`${API}/agents`);
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
      if (evtRes.ok) {
        const data = await evtRes.json();
        setEvents(data.events || []);
      }
      if (polRes.ok) {
        const data = await polRes.json();
        setPolicyRules(data.policy?.services || []);
      }
    } catch {
      // orchestrator not running
    }
  }, [selectedAgentId]);

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
          agent_id: selectedAgentId,
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

  const startEditing = () => {
    setEditRules(policyRules.map((r) => ({ ...r })));
    setEditingPolicy(true);
  };

  const cancelEditing = () => {
    setEditingPolicy(false);
  };

  const updateRule = (index: number, field: keyof ServiceRule, value: string | boolean | number) => {
    setEditRules((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRule = () => {
    setEditRules((prev) => [
      ...prev,
      { service_url: "", allowed: true, per_request_cap_usdc: 0, daily_cap_usdc: 0 },
    ]);
  };

  const removeRule = (index: number) => {
    setEditRules((prev) => prev.filter((_, i) => i !== index));
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/policy/${selectedAgentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: editRules }),
      });
      if (res.ok) {
        setLastAction("Policy saved successfully");
        setEditingPolicy(false);
        refresh();
      } else {
        const err = await res.json();
        setLastAction(`Failed to save policy: ${err.error || "Unknown error"}`);
      }
    } catch {
      setLastAction("Error: orchestrator not reachable");
    }
    setSaving(false);
  };

  const availablePower = account
    ? account.purchasing_power_usdc - account.used_power_usdc
    : 0;

  // Compute daily spend per service from today's events
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const dailySpendByService = events
    .filter((e) => e.kind === "settled" && e.created_at >= todayMs)
    .reduce(
      (acc, e) => {
        acc[e.service_url] = (acc[e.service_url] || 0) + e.amount_usdc;
        return acc;
      },
      {} as Record<string, number>,
    );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: 8 }}>
        Agent Credit Rail
      </h1>
      <p style={{ color: "#666" }}>
        Owner posts XLM collateral. Legasi computes a credit line. Agents spend USDC on approved services.
      </p>
      {account && (
        <div style={{ background: "#ebf4ff", padding: "8px 16px", borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
          <strong>{agents.find((a) => a.id === selectedAgentId)?.name || selectedAgentId}</strong>
          <span style={{ color: "#666", marginLeft: 8 }}>{selectedAgentId}</span>
          <span style={{ color: "#888", marginLeft: 8 }}>owner: {account.owner_id}</span>
        </div>
      )}

      {/* Agents */}
      {agents.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 8px" }}>Agents</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  if (editingPolicy && !confirm("Discard unsaved policy changes?")) return;
                  setEditingPolicy(false);
                  setSelectedAgentId(agent.id);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: agent.id === selectedAgentId ? "2px solid #2b6cb0" : "1px solid #ccc",
                  background: agent.id === selectedAgentId ? "#ebf4ff" : "#fff",
                  fontWeight: agent.id === selectedAgentId ? 600 : 400,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {agent.name}
                <span style={{ display: "block", fontSize: 11, color: "#888" }}>{agent.id}</span>
              </button>
            ))}
          </div>
        </section>
      )}

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
              <Stat label="Agent" value={`${account.agent_id}`} />
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

      {/* Policy Rules */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Policy Rules</h2>
          {!editingPolicy ? (
            <ActionButton label="Edit" onClick={startEditing} color="#2b6cb0" />
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <ActionButton label={saving ? "Saving..." : "Save"} onClick={savePolicy} color="#38a169" />
              <ActionButton label="Cancel" onClick={cancelEditing} color="#c53030" />
            </div>
          )}
        </div>

        {editingPolicy ? (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                  <th style={{ padding: "8px 4px" }}>Service</th>
                  <th style={{ padding: "8px 4px" }}>Status</th>
                  <th style={{ padding: "8px 4px" }}>Per-request cap</th>
                  <th style={{ padding: "8px 4px" }}>Daily cap</th>
                  <th style={{ padding: "8px 4px" }}></th>
                </tr>
              </thead>
              <tbody>
                {editRules.map((rule, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "6px 4px" }}>
                      <input
                        type="text"
                        value={rule.service_url}
                        onChange={(e) => updateRule(i, "service_url", e.target.value)}
                        placeholder="/service-path"
                        style={{ width: "100%", fontFamily: "monospace", padding: 4, border: "1px solid #ccc", borderRadius: 4, boxSizing: "border-box" }}
                      />
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <button
                        onClick={() => updateRule(i, "allowed", !rule.allowed)}
                        style={{
                          background: rule.allowed ? "#c6f6d5" : "#fed7d7",
                          color: rule.allowed ? "#22543d" : "#742a2a",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {rule.allowed ? "ALLOWED" : "DENIED"}
                      </button>
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <input
                        type="number"
                        min={0}
                        value={rule.per_request_cap_usdc}
                        onChange={(e) => updateRule(i, "per_request_cap_usdc", Number(e.target.value) || 0)}
                        style={{ width: 80, padding: 4, border: "1px solid #ccc", borderRadius: 4 }}
                      />
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <input
                        type="number"
                        min={0}
                        value={rule.daily_cap_usdc}
                        onChange={(e) => updateRule(i, "daily_cap_usdc", Number(e.target.value) || 0)}
                        style={{ width: 80, padding: 4, border: "1px solid #ccc", borderRadius: 4 }}
                      />
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <button
                        onClick={() => removeRule(i)}
                        style={{ background: "#fed7d7", color: "#c53030", border: "none", borderRadius: 4, cursor: "pointer", padding: "4px 8px" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8 }}>
              <ActionButton label="+ Add Service Rule" onClick={addRule} color="#2b6cb0" />
            </div>
          </>
        ) : policyRules.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: "8px 4px" }}>Service</th>
                <th style={{ padding: "8px 4px" }}>Status</th>
                <th style={{ padding: "8px 4px" }}>Per-request cap</th>
                <th style={{ padding: "8px 4px" }}>Daily cap</th>
                <th style={{ padding: "8px 4px" }}>Spent today</th>
                <th style={{ padding: "8px 4px" }}>Remaining today</th>
              </tr>
            </thead>
            <tbody>
              {policyRules.map((rule) => {
                const spent = dailySpendByService[rule.service_url] || 0;
                const remaining = rule.allowed ? Math.max(0, rule.daily_cap_usdc - spent) : 0;
                return (
                  <tr key={rule.service_url} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "6px 4px", fontFamily: "monospace" }}>{rule.service_url}</td>
                    <td style={{ padding: "6px 4px" }}>
                      <span
                        style={{
                          background: rule.allowed ? "#c6f6d5" : "#fed7d7",
                          color: rule.allowed ? "#22543d" : "#742a2a",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {rule.allowed ? "ALLOWED" : "DENIED"}
                      </span>
                    </td>
                    <td style={{ padding: "6px 4px" }}>{rule.allowed ? `${rule.per_request_cap_usdc} USDC` : "—"}</td>
                    <td style={{ padding: "6px 4px" }}>{rule.allowed ? `${rule.daily_cap_usdc} USDC` : "—"}</td>
                    <td style={{ padding: "6px 4px" }}>{rule.allowed ? `${spent} USDC` : "—"}</td>
                    <td style={{ padding: "6px 4px", color: remaining < 50 && rule.allowed ? "#c53030" : undefined }}>
                      {rule.allowed ? `${remaining} USDC` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#999" }}>No policy rules configured. Click Edit to add service rules.</p>
        )}
      </section>

      {/* Actions */}
      <section style={{ marginBottom: 16 }}>
        <h2>Actions</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {policyRules
            .filter((r) => r.allowed)
            .map((rule) => (
              <ActionButton
                key={`pay-${rule.service_url}`}
                label={`Pay ${rule.service_url} (10 USDC)`}
                onClick={() => sendPayment(rule.service_url, 10)}
                color="#2b6cb0"
              />
            ))}
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
          <p style={{ color: "#999" }}>No payments yet. Try reading the premium article from Claude Desktop.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: "8px 4px" }}>Status</th>
                <th style={{ padding: "8px 4px" }}>Service</th>
                <th style={{ padding: "8px 4px" }}>Amount</th>
                <th style={{ padding: "8px 4px" }}>Rule / Reason</th>
                <th style={{ padding: "8px 4px" }}>Details</th>
                <th style={{ padding: "8px 4px" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((evt) => (
                <tr
                  key={evt.attempt_id}
                  style={{
                    borderBottom: "1px solid #eee",
                    background:
                      evt.kind === "settled"
                        ? "#f0fff4"
                        : evt.kind === "blocked"
                          ? "#fff5f5"
                          : "#fffaf0",
                  }}
                >
                  <td style={{ padding: "6px 4px" }}>
                    <StatusBadge kind={evt.kind} />
                  </td>
                  <td style={{ padding: "6px 4px", fontFamily: "monospace" }}>{evt.service_url}</td>
                  <td style={{ padding: "6px 4px" }}>{evt.amount_usdc} USDC</td>
                  <td style={{ padding: "6px 4px", fontSize: 12 }}>
                    {evt.kind === "settled" && "ALLOWLISTED"}
                    {evt.kind === "blocked" && evt.reason}
                    {evt.kind === "failed" && "FAILED"}
                  </td>
                  <td style={{ padding: "6px 4px", fontSize: 12, color: "#666" }}>
                    {evt.kind === "settled" && evt.tx_hash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${evt.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2b6cb0" }}
                      >
                        {evt.tx_hash.slice(0, 16)}...
                      </a>
                    )}
                    {evt.kind === "blocked" && evt.reason}
                    {evt.kind === "failed" && evt.error}
                  </td>
                  <td style={{ padding: "6px 4px", fontSize: 12, color: "#888" }}>
                    {new Date(evt.created_at).toLocaleTimeString()}
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
