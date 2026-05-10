"use client";

import { useState } from "react";
import { Luggage } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { formatFlightPrice, formatUSD } from "@/lib/currency";

type Option = { kg: number; label: string; price: number };

type Props = {
  flight_id?: number;
  leg_label?: string;
  pax?: number;
  passenger_names?: string[];
  options?: Option[];
  origin?: string;
  destination?: string;
  disabled?: boolean;
};

const fmt = (p: number, origin?: string, destination?: string) =>
  p === 0 ? "Included" : `+${origin && destination ? formatFlightPrice(p, origin, destination) : formatUSD(p)}`;

export default function BaggageOptions({
  leg_label,
  pax = 1,
  passenger_names = [],
  options = [],
  origin,
  destination,
  disabled = false,
}: Props) {
  const [selections, setSelections] = useState<(Option | null)[]>(Array(pax).fill(options[0] ?? null));
  const [submitted, setSubmitted] = useState(false);
  const { sendMessage } = useChatContext();

  const updateSelection = (idx: number, opt: Option) => {
    setSelections((prev) => prev.map((s, i) => (i === idx ? opt : s)));
  };

  const allSelected = selections.every((s) => s !== null);

  const handleConfirm = () => {
    if (submitted || disabled || !allSelected) return;
    setSubmitted(true);

    if (pax === 1) {
      const sel = selections[0]!;
      const priceText = sel.price === 0 ? "no extra charge" : `${formatUSD(sel.price)} add-on`;
      sendMessage(`I'll go with ${sel.label}${leg_label ? ` for the ${leg_label} flight` : ""} (${priceText}).`);
    } else {
      const lines = selections
        .map((sel, i) => {
          const name = passenger_names[i] || `Pax ${i + 1}`;
          return `${name}: ${sel?.label}`;
        })
        .join(", ");
      const totalPrice = selections.reduce((sum, sel) => sum + (sel?.price ?? 0), 0);
      const priceText = totalPrice === 0 ? "no extra charges" : `${formatUSD(totalPrice)} total`;
      sendMessage(`Baggage${leg_label ? ` for the ${leg_label} flight` : ""}: ${lines} (${priceText}).`);
    }
  };

  const isDisabled = disabled || submitted;

  return (
    <div className={`flex flex-col gap-3 p-3 bg-sky-50 border border-sky-200 rounded-xl ${isDisabled ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-900">
        <Luggage className="w-3.5 h-3.5" />
        Baggage{leg_label ? ` — ${leg_label}` : ""}
      </div>

      <div className="flex flex-col gap-3">
        {selections.map((selected, i) => (
          <div key={i} className="flex flex-col gap-2">
            <label className="text-[10px] font-medium text-sky-800">
              Pax {i + 1} {passenger_names[i] ? `(${passenger_names[i]})` : ""}
            </label>
            <select
              value={selected?.kg ?? ""}
              onChange={(e) => {
                const opt = options.find((o) => o.kg === +e.target.value);
                if (opt) updateSelection(i, opt);
              }}
              disabled={isDisabled}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-600 disabled:bg-gray-50 bg-white"
            >
              <option value="">Select baggage option</option>
              {options.map((opt) => (
                <option key={opt.kg} value={opt.kg}>
                  {opt.label} — {fmt(opt.price, origin, destination)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={handleConfirm}
          disabled={isDisabled || !allSelected}
          className="w-full py-2 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          Confirm Baggage
        </button>
      ) : (
        <p className="text-[10px] text-sky-700 font-medium">✓ Baggage confirmed</p>
      )}
    </div>
  );
}
