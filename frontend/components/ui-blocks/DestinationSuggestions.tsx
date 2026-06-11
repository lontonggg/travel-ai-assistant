"use client";

import { useState } from "react";
import { MapPin, Sparkles } from "lucide-react";
import type { DestinationSuggestion } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";
import { formatInOriginCurrency } from "@/lib/currency";

type Props = {
  origin?: string;
  vibe?: string;
  pax?: number;
  suggestions?: DestinationSuggestion[];
  disabled?: boolean;
};

export default function DestinationSuggestions({ origin, suggestions = [], disabled = false }: Props) {
  const [pickedCode, setPickedCode] = useState<string | null>(null);
  const { sendMessage } = useChatContext();

  if (suggestions.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
        Couldn&apos;t find a destination matching that — try a different budget or vibe.
      </div>
    );
  }

  const handlePick = (s: DestinationSuggestion) => {
    if (disabled || pickedCode) return;
    setPickedCode(s.code);
    sendMessage(`Yes, let's book ${s.city}!`);
  };

  return (
    <div className={`flex flex-col gap-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 px-1">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        Destination ideas{origin ? ` from ${origin}` : ""}
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s.code}
            onClick={() => handlePick(s)}
            disabled={!!pickedCode}
            className={`text-left flex flex-col gap-1.5 p-3 rounded-xl border bg-white transition-colors ${
              pickedCode === s.code
                ? "border-accent ring-2 ring-accent/20"
                : "border-gray-200 hover:border-accent hover:bg-accent/5"
            } ${pickedCode && pickedCode !== s.code ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                {s.city} ({s.code})
              </div>
              <span className="text-xs font-semibold text-accent">
                {origin ? formatInOriginCurrency(s.round_trip_price_per_person, origin) : `$${s.round_trip_price_per_person}`}
                <span className="text-gray-400 font-normal"> /pax RT</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-600">{s.reason}</p>
            {s.vibes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {s.vibes.slice(0, 3).map((v) => (
                  <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {v}
                  </span>
                ))}
              </div>
            )}
            {pickedCode === s.code && (
              <p className="text-[10px] text-accent font-medium">✓ Let's plan this trip</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
