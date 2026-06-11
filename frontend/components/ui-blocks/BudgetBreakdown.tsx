"use client";

import { Wallet } from "lucide-react";
import { formatUSD } from "@/lib/currency";

type Props = {
  destination?: string;
  pax?: number;
  days?: number;
  flights_total?: number;
  ground_total_estimate?: number;
  daily_per_person_usd?: number;
  grand_total_estimate?: number;
};

export default function BudgetBreakdown({
  destination,
  pax = 1,
  days = 0,
  flights_total = 0,
  ground_total_estimate = 0,
  daily_per_person_usd = 0,
  grand_total_estimate = 0,
}: Props) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
        <Wallet className="w-3.5 h-3.5" />
        Estimated trip budget{destination ? ` — ${destination}` : ""}
      </div>
      <div className="flex flex-col gap-1 text-xs text-gray-700">
        <div className="flex justify-between">
          <span>Flights ({pax} {pax === 1 ? "pax" : "pax"}, round-trip)</span>
          <span className="font-medium">{formatUSD(flights_total)}</span>
        </div>
        <div className="flex justify-between">
          <span>On the ground (~{formatUSD(daily_per_person_usd)}/day/pax × {days}d)</span>
          <span className="font-medium">{formatUSD(ground_total_estimate)}</span>
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
        <span className="text-xs font-semibold text-emerald-900">Estimated total</span>
        <span className="text-sm font-bold text-emerald-700">{formatUSD(grand_total_estimate)}</span>
      </div>
    </div>
  );
}
