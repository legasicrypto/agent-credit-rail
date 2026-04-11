interface ServiceRule {
  service_url: string;
  allowed: boolean;
  per_request_cap_usdc: number;
  daily_cap_usdc: number;
}

interface Props {
  rules: ServiceRule[];
  dailySpendByService: Record<string, number>;
  editing: boolean;
  editRules: ServiceRule[];
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onUpdateRule: (index: number, field: keyof ServiceRule, value: string | boolean | number) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
}

export function SpendingPolicy({
  rules,
  dailySpendByService,
  editing,
  editRules,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onUpdateRule,
  onAddRule,
  onRemoveRule,
}: Props) {
  return (
    <section className="mb-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Spending Policy</h2>
          <p className="text-sm text-gray-500">Guardrails that keep your agent safe</p>
        </div>
        {!editing ? (
          <button
            onClick={onStartEdit}
            className="px-4 py-1.5 text-sm font-medium text-brand-blue border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors cursor-pointer"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="px-4 py-1.5 text-sm font-medium text-white bg-settled rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <EditMode
          rules={editRules}
          onUpdate={onUpdateRule}
          onAdd={onAddRule}
          onRemove={onRemoveRule}
        />
      ) : rules.length > 0 ? (
        <div className="grid gap-3">
          {rules.map((rule) => {
            const spent = dailySpendByService[rule.service_url] || 0;
            const remaining = rule.allowed ? Math.max(0, rule.daily_cap_usdc - spent) : 0;
            const pct = rule.allowed && rule.daily_cap_usdc > 0 ? (spent / rule.daily_cap_usdc) * 100 : 0;

            return (
              <div
                key={rule.service_url}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-semibold text-gray-800">{rule.service_url}</code>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      rule.allowed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {rule.allowed ? "Allowed" : "Denied"}
                  </span>
                </div>
                {rule.allowed && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Per request: {rule.per_request_cap_usdc} USDC</span>
                    <span>Daily: {rule.daily_cap_usdc} USDC</span>
                    <span className={remaining < 50 ? "text-red-500 font-medium" : ""}>
                      Remaining: {remaining} USDC
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden ml-2">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-400" : "bg-brand-blue"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No policy rules configured. Click Edit to add service rules.</p>
      )}
    </section>
  );
}

function EditMode({
  rules,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rules: ServiceRule[];
  onUpdate: (i: number, field: keyof ServiceRule, value: string | boolean | number) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      {rules.map((rule, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={rule.service_url}
            onChange={(e) => onUpdate(i, "service_url", e.target.value)}
            placeholder="/service-path"
            className="flex-1 min-w-[180px] px-3 py-1.5 text-sm font-mono border border-gray-200 rounded-lg focus:border-brand-blue focus:outline-none"
          />
          <button
            onClick={() => onUpdate(i, "allowed", !rule.allowed)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              rule.allowed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {rule.allowed ? "ALLOWED" : "DENIED"}
          </button>
          <label className="text-xs text-gray-500 flex items-center gap-1">
            Per-req
            <input
              type="number"
              min={0}
              value={rule.per_request_cap_usdc}
              onChange={(e) => onUpdate(i, "per_request_cap_usdc", Number(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:border-brand-blue focus:outline-none"
            />
          </label>
          <label className="text-xs text-gray-500 flex items-center gap-1">
            Daily
            <input
              type="number"
              min={0}
              value={rule.daily_cap_usdc}
              onChange={(e) => onUpdate(i, "daily_cap_usdc", Number(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:border-brand-blue focus:outline-none"
            />
          </label>
          <button
            onClick={() => onRemove(i)}
            className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="px-4 py-1.5 text-sm font-medium text-brand-blue border border-dashed border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors cursor-pointer"
      >
        + Add Service Rule
      </button>
    </div>
  );
}
