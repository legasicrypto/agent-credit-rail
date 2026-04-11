const config: Record<string, { bg: string; text: string; label: string }> = {
  settled: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Settled" },
  blocked: { bg: "bg-red-50", text: "text-red-700", label: "Blocked" },
  failed: { bg: "bg-amber-50", text: "text-amber-700", label: "Failed" },
};

export function StatusBadge({ kind }: { kind: string }) {
  const c = config[kind] || { bg: "bg-gray-100", text: "text-gray-600", label: kind };
  return (
    <span className={`${c.bg} ${c.text} px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
      {c.label}
    </span>
  );
}
