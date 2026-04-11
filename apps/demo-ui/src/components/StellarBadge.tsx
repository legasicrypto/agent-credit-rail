export function StellarBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-settled animate-pulse-dot" />
      Stellar Testnet
    </span>
  );
}
