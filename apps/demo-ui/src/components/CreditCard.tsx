import { StellarBadge } from "./StellarBadge.js";

interface Props {
  agentName: string;
  agentId: string;
  ownerId: string;
  collateralAmount: number;
  collateralAsset: string;
  collateralValueUsd: number;
  creditLimit: number;
  spent: number;
}

export function CreditCard({
  agentName,
  ownerId,
  collateralAmount,
  collateralAsset,
  collateralValueUsd,
  creditLimit,
  spent,
}: Props) {
  const available = creditLimit - spent;

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
      {/* Card */}
      <div className="relative w-full max-w-md mx-auto aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-brand-blue via-orange-600 to-brand-purple p-6 text-white shadow-xl shadow-brand-blue/20 overflow-hidden">
        {/* Subtle decorative circle */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col justify-between h-full">
          {/* Top row */}
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold tracking-widest uppercase opacity-90">Legasi</span>
            <StellarBadge className="!text-white/70" />
          </div>

          {/* Center: Available balance */}
          <div className="text-center -mt-1">
            <div className="text-4xl font-extrabold tracking-tight">
              ${available.toFixed(2)}
            </div>
            <div className="text-sm text-orange-100 mt-1">
              Available of ${creditLimit.toFixed(0)} credit limit
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs text-orange-200 uppercase tracking-wide">Agent</div>
              <div className="text-sm font-semibold">{agentName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-orange-200 uppercase tracking-wide">Owner</div>
              <div className="text-sm font-semibold">{ownerId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Collateral info below card */}
      <div className="text-center mt-3 text-sm text-gray-500">
        Backed by {collateralAmount.toLocaleString()} {collateralAsset} (${collateralValueUsd.toLocaleString()})
      </div>
    </div>
  );
}
