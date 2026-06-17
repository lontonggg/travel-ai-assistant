"use client";

import { motion } from "framer-motion";
import type { Flight } from "@/lib/types";
import { formatFlightPrice } from "@/lib/currency";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const BADGE_STYLES: Record<string, string> = {
  Recommended: "bg-accent text-white",
  "Best Value": "bg-emerald-500 text-white",
  Cheapest: "bg-amber-400 text-amber-950",
  Fastest: "bg-sky-500 text-white",
};

const AIRLINE_COLORS: Record<string, string> = {
  GA: "bg-blue-600",
  JT: "bg-orange-500",
  QG: "bg-green-600",
  SQ: "bg-blue-800",
  TR: "bg-yellow-500",
  "3K": "bg-orange-600",
  TG: "bg-purple-700",
  FD: "bg-red-500",
  PG: "bg-teal-600",
  MH: "bg-blue-700",
  AK: "bg-red-600",
  OD: "bg-indigo-600",
  UA: "bg-sky-700",
  DL: "bg-blue-500",
  AA: "bg-slate-700",
};

export default function FlightCard({
  flight,
  onSelect,
  selected,
}: {
  flight: Flight;
  onSelect?: (f: Flight) => void;
  selected?: boolean;
}) {
  const color = AIRLINE_COLORS[flight.airline_code] ?? "bg-gray-600";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`flex-shrink-0 w-full rounded-2xl border cursor-pointer transition-all overflow-hidden ${
        selected ? "border-accent ring-2 ring-accent/20" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={() => onSelect?.(flight)}
    >
      {/* Header */}
      <div className={`${color} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">{flight.airline_name}</div>
            <div className="text-sm font-bold">{flight.flight_number}</div>
          </div>
          <div className="text-right text-xs opacity-80">{flight.aircraft_type}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 px-4 pt-2 min-h-8 bg-white">
        {flight.badges && flight.badges.length > 0 && (
          <>
          {flight.badges.map((badge) => (
            <span
              key={badge}
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[badge] ?? "bg-gray-200 text-gray-700"}`}
            >
              {badge}
            </span>
          ))}
          </>
        )}
      </div>

      {/* Route */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{formatTime(flight.departure_time)}</div>
            <div className="text-xs text-gray-500 font-medium">{flight.origin}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <div className="text-xs text-gray-400">{flight.duration_str}</div>
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-gray-400 text-xs">✈</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <div className="text-xs text-gray-400">Direct</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{formatTime(flight.arrival_time)}</div>
            <div className="text-xs text-gray-500 font-medium">{flight.destination}</div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Economy from</div>
          <div className="text-sm font-bold text-accent">{formatFlightPrice(flight.price_economy, flight.origin, flight.destination)}</div>
        </div>
        {flight.business_available && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Business</div>
            <div className="text-xs text-gray-600">{formatFlightPrice(flight.price_business, flight.origin, flight.destination)}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
