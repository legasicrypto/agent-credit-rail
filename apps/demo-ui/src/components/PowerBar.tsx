interface Props {
  creditLimit: number;
  spent: number;
}

export function PowerBar({ creditLimit, spent }: Props) {
  const available = creditLimit - spent;
  const pct = creditLimit > 0 ? (available / creditLimit) * 100 : 0;
  const low = available < 100;

  return (
    <div className="max-w-md mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
        <span>Spent: ${spent.toFixed(2)}</span>
        <span className={low ? "text-red-500 font-semibold" : ""}>
          Available: ${available.toFixed(2)}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            low
              ? "bg-gradient-to-r from-red-400 to-red-500"
              : "bg-gradient-to-r from-brand-blue to-settled"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
