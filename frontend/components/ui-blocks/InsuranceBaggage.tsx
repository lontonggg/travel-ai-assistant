"use client";

import { useState } from "react";
import { Shield, Luggage } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { formatFlightPrice, formatUSD } from "@/lib/currency";

type BaggageOption = { kg: number; label: string; price: number };
type InsuranceOption = { id: string; label: string; price_one_way: number; price_round_trip: number };
type LegOptions = { label: string; options: BaggageOption[] };

type Props = {
  flight_id?: number;
  return_flight_id?: number;
  is_round_trip?: boolean;
  outbound?: LegOptions;
  return?: LegOptions;
  insurance_options?: InsuranceOption[];
  origin?: string;
  destination?: string;
  disabled?: boolean;
};

const fmt = (p: number, origin?: string, destination?: string) =>
  p === 0 ? "Included" : `+${origin && destination ? formatFlightPrice(p, origin, destination) : formatUSD(p)}`;

export default function InsuranceBaggage({
  is_round_trip = false,
  outbound,
  return: returnLeg,
  insurance_options = [],
  origin,
  destination,
  disabled = false,
}: Props) {
  const [selectedInsurance, setSelectedInsurance] = useState<Set<string>>(new Set());
  const [outboundBaggage, setOutboundBaggage] = useState<BaggageOption | null>(
    outbound?.options[0] ?? null
  );
  const [returnBaggage, setReturnBaggage] = useState<BaggageOption | null>(
    returnLeg?.options[0] ?? null
  );
  const [submitted, setSubmitted] = useState(false);
  const { sendMessage } = useChatContext();

  const toggleInsurance = (id: string) => {
    setSelectedInsurance((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const insuranceTotal = insurance_options
    .filter((o) => selectedInsurance.has(o.id))
    .reduce((sum, o) => sum + (is_round_trip ? o.price_round_trip : o.price_one_way), 0);

  const handleConfirm = () => {
    if (submitted || disabled) return;
    setSubmitted(true);

    const insIds = [...selectedInsurance];
    const insPrice = insuranceTotal;
    const ob = outboundBaggage ?? { kg: 0, price: 0 };
    const rb = returnBaggage ?? { kg: 0, price: 0 };

    const payload = {
      outbound_baggage_kg: ob.kg,
      outbound_baggage_price: ob.price,
      return_baggage_kg: is_round_trip ? rb.kg : 0,
      return_baggage_price: is_round_trip ? rb.price : 0,
      insurance_types: insIds,
      insurance_price: insPrice,
    };

    sendMessage(`Add-on selections: ${JSON.stringify(payload)}`);
  };

  const isDisabled = disabled || submitted;

  return (
    <div className={`flex flex-col gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl ${isDisabled ? "opacity-60" : ""}`}>
      <div className="text-xs font-semibold text-indigo-900">Add-ons & Insurance</div>

      {/* Insurance — whole trip */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600">
          <Shield className="w-3 h-3" /> Travel Protection
          {is_round_trip && <span className="text-gray-400">(covers both flights)</span>}
        </div>
        {insurance_options.map((opt) => {
          const price = is_round_trip ? opt.price_round_trip : opt.price_one_way;
          const checked = selectedInsurance.has(opt.id);
          return (
            <label key={opt.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border bg-white cursor-pointer transition-colors ${
                isDisabled ? "cursor-not-allowed opacity-70" : "hover:border-indigo-300"
              } ${checked ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" disabled={isDisabled} checked={checked}
                  onChange={() => toggleInsurance(opt.id)}
                  className="w-3.5 h-3.5 accent-indigo-600" />
                <span className="text-xs text-gray-800">{opt.label}</span>
              </div>
              <span className="text-[10px] font-medium text-indigo-600">+{origin && destination ? formatFlightPrice(price, origin, destination) : formatUSD(price)}</span>
            </label>
          );
        })}
      </div>

      {/* Outbound baggage */}
      {outbound && (
        <BaggageSection
          label={`Outbound — ${outbound.label}`}
          options={outbound.options}
          selected={outboundBaggage}
          onSelect={setOutboundBaggage}
          disabled={isDisabled}
          origin={origin}
          destination={destination}
        />
      )}

      {/* Return baggage */}
      {is_round_trip && returnLeg && (
        <BaggageSection
          label={`Return — ${returnLeg.label}`}
          options={returnLeg.options}
          selected={returnBaggage}
          onSelect={setReturnBaggage}
          disabled={isDisabled}
          origin={origin}
          destination={destination}
        />
      )}

      {!submitted ? (
        <button onClick={handleConfirm} disabled={isDisabled}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
          Continue
        </button>
      ) : (
        <p className="text-[10px] text-indigo-600 font-medium">Add-ons confirmed</p>
      )}
    </div>
  );
}

function BaggageSection({ label, options, selected, onSelect, disabled, origin, destination }: {
  label: string;
  options: BaggageOption[];
  selected: BaggageOption | null;
  onSelect: (o: BaggageOption) => void;
  disabled: boolean;
  origin?: string;
  destination?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600">
        <Luggage className="w-3 h-3" /> {label}
      </div>
      {options.map((opt) => (
        <label key={opt.kg}
          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
            disabled ? "cursor-not-allowed" : ""
          } ${selected?.kg === opt.kg
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
          }`}>
          <div className="flex items-center gap-2">
            <input type="radio" name={`baggage-${label}`} disabled={disabled}
              checked={selected?.kg === opt.kg}
              onChange={() => onSelect(opt)}
              className="sr-only" />
            <span>{opt.label}</span>
          </div>
          <span className={`text-[10px] font-medium ${selected?.kg === opt.kg ? "text-white/80" : "text-indigo-600"}`}>
            {fmt(opt.price, origin, destination)}
          </span>
        </label>
      ))}
    </div>
  );
}
