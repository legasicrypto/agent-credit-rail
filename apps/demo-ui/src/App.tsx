import { useState, useEffect, useCallback } from "react";
import { HeroBanner } from "./components/HeroBanner.js";
import { AgentSelector } from "./components/AgentSelector.js";
import { CreditCard } from "./components/CreditCard.js";
import { PowerBar } from "./components/PowerBar.js";
import { SpendingPolicy } from "./components/SpendingPolicy.js";
import { LiveDemo } from "./components/LiveDemo.js";
import { TransactionFeed } from "./components/TransactionFeed.js";

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
      if (accRes.ok) setAccount(await accRes.json());
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

  const agentName = agents.find((a) => a.id === selectedAgentId)?.name || selectedAgentId;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <HeroBanner />

      <AgentSelector
        agents={agents}
        selectedId={selectedAgentId}
        onSelect={(id) => {
          setEditingPolicy(false);
          setSelectedAgentId(id);
        }}
        editingPolicy={editingPolicy}
      />

      {account ? (
        <>
          <CreditCard
            agentName={agentName}
            agentId={account.agent_id}
            ownerId={account.owner_id}
            collateralAmount={account.collateral_amount}
            collateralAsset={account.collateral_asset}
            collateralValueUsd={account.collateral_value_usd}
            creditLimit={account.purchasing_power_usdc}
            spent={account.used_power_usdc}
          />
          <PowerBar
            creditLimit={account.purchasing_power_usdc}
            spent={account.used_power_usdc}
          />
        </>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">
          Loading... (is the orchestrator running on :4010?)
        </div>
      )}

      <SpendingPolicy
        rules={policyRules}
        dailySpendByService={dailySpendByService}
        editing={editingPolicy}
        editRules={editRules}
        saving={saving}
        onStartEdit={startEditing}
        onCancelEdit={() => setEditingPolicy(false)}
        onSave={savePolicy}
        onUpdateRule={updateRule}
        onAddRule={addRule}
        onRemoveRule={removeRule}
      />

      <LiveDemo
        allowedRules={policyRules.filter((r) => r.allowed)}
        lastAction={lastAction}
        onSendPayment={sendPayment}
      />

      <TransactionFeed events={events} />
    </div>
  );
}
