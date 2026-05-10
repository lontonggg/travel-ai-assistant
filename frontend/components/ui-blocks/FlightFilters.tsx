"use client";

import { useState } from "react";

const AIRLINES = ["Garuda Indonesia", "Lion Air", "Citilink", "Batik Air", "AirAsia Indonesia", "Super Air Jet"];
const TIME_SLOTS = [
  { id: "morning", label: "Morning", sub: "06:00–12:00" },
  { id: "afternoon", label: "Afternoon", sub: "12:00–18:00" },
  { id: "evening", label: "Evening", sub: "18:00–23:00" },
];

export default function FlightFilters() {
  const [selectedAirlines, setSelectedAirlines] = useState<Set<string>>(new Set());
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());

  const toggleAirline = (a: string) =>
    setSelectedAirlines((p) => { const n = new Set(p); n.has(a) ? n.delete(a) : n.add(a); return n; });

  const toggleTime = (t: string) =>
    setSelectedTimes((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="text-xs font-semibold text-gray-700">Filter Flights</div>
      <div>
        <div className="text-xs text-gray-500 mb-2">Airlines</div>
        <div className="flex flex-wrap gap-2">
          {AIRLINES.map((a) => (
            <button
              key={a}
              onClick={() => toggleAirline(a)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedAirlines.has(a)
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-gray-700 border-gray-200 hover:border-accent/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-2">Departure time</div>
        <div className="flex gap-2">
          {TIME_SLOTS.map(({ id, label, sub }) => (
            <button
              key={id}
              onClick={() => toggleTime(id)}
              className={`flex-1 py-2 rounded-lg border text-xs transition-colors ${
                selectedTimes.has(id)
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-gray-700 border-gray-200 hover:border-accent/50"
              }`}
            >
              <div className="font-medium">{label}</div>
              <div className="opacity-70">{sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
