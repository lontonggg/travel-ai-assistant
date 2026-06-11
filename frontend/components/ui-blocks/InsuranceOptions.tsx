"use client";

import { useState } from "react";
import { Shield, Plane, Luggage, Clock } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { formatFlightPrice, formatUSD } from "@/lib/currency";

type InsuranceOption = {
  id: string;
  label: string;
  description: string;
  price_per_person: number;
  icon: "shield" | "luggage" | "clock";
};

type Props = {
  pax?: number;
  options?: InsuranceOption[];
  is_round_trip?: boolean;
  origin?: string;
  destination?: string;
  disabled?: boolean;
};

const DEFAULT_OPTIONS: InsuranceOption[] = [
  {
    id: "travel_protection",
    label: "Travel Protection",
    description: "Medical emergencies, trip cancellation up to $600",
    price_per_person: 3,
    icon: "shield",
  },
  {
    id: "baggage_protection",
    label: "Baggage Protection",
    description: "Lost, damaged, or delayed baggage up to $300",
    price_per_person: 2,
    icon: "luggage",
  },
  {
    id: "flight_delay",
    label: "Flight Delay Cover",
    description: "Compensation for delays over 4 hours (up to $30)",
    price_per_person: 1,
    icon: "clock",
  },
];

const ICON_MAP = { shield: Plane, luggage: Luggage, clock: Clock };

export default function InsuranceOptions({
  pax = 1,
  options = DEFAULT_OPTIONS,
  is_round_trip = false,
  origin,
  destination,
  disabled = false,
}: Props) {
  const fmtPrice = (p: number) =>
    origin && destination ? formatFlightPrice(p, origin, destination) : formatUSD(p);
  const opts = options.length > 0 ? options : DEFAULT_OPTIONS;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const { sendMessage } = useChatContext();

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedOptions = opts.filter((o) => selectedIds.has(o.id));
  const totalPrice = selectedOptions.reduce((sum, o) => sum + o.price_per_person * pax, 0);

  const handleConfirm = () => {
    if (submitted || disabled) return;
    setSubmitted(true);

    if (selectedOptions.length === 0) {
      sendMessage("No insurance for me. Let's continue.");
      return;
    }

    const labels = selectedOptions.map((o) => o.label).join(" and ");
    sendMessage(`Add ${labels} to my booking (${formatUSD(totalPrice)} total).`);
  };

  const isDisabled = disabled || submitted;

  return (
    <div className={`flex flex-col gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl ${isDisabled ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
        <Shield className="w-4 h-4" />
        Travel Insurance
      </div>

      <div className="flex flex-col gap-2">
        {opts.map((opt) => {
          const checked = selectedIds.has(opt.id);
          const Icon = ICON_MAP[opt.icon] ?? Shield;
          const optTotal = opt.price_per_person * pax;
          return (
            <label
              key={opt.id}
              className={`flex items-start gap-2.5 p-3 rounded-lg border bg-white cursor-pointer transition-colors ${
                isDisabled ? "cursor-not-allowed" : "hover:border-indigo-300"
              } ${checked ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
            >
              <input
                type="checkbox"
                disabled={isDisabled}
                checked={checked}
                onChange={() => toggle(opt.id)}
                className="w-4 h-4 accent-indigo-600 mt-0.5 flex-shrink-0"
              />
              <Icon className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                  <span className="text-[10px] font-semibold text-indigo-700 whitespace-nowrap">
                    {fmtPrice(opt.price_per_person)}/pax
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">{opt.description}</p>
                {checked && pax > 1 && (
                  <p className="text-[10px] text-indigo-700 font-medium mt-1">
                    {pax} × {fmtPrice(opt.price_per_person)} = {fmtPrice(optTotal)}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {selectedOptions.length > 0 && (
        <div className="bg-white rounded-lg p-2.5 border border-indigo-200 flex items-center justify-between">
          <span className="text-xs text-gray-700">
            Total ({selectedOptions.length} {selectedOptions.length === 1 ? "plan" : "plans"})
          </span>
          <span className="text-xs font-semibold text-indigo-700">{fmtPrice(totalPrice)}</span>
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleConfirm}
          disabled={isDisabled}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {selectedOptions.length === 0 ? "Skip Insurance" : "Confirm Insurance"}
        </button>
      ) : (
        <p className="text-[10px] text-indigo-700 font-medium">
          {selectedOptions.length === 0 ? "No insurance selected" : `✓ Insurance confirmed (${fmtPrice(totalPrice)})`}
        </p>
      )}
    </div>
  );
}
