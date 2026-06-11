"use client";

import { useState } from "react";
import type { Flight } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";
import FlightCard from "./FlightCard";

type Props = {
  flights: Flight[];
  origin?: string;
  destination?: string;
  date?: string;
  pax?: number;
  class_type?: string;
  disabled?: boolean;
};

export default function FlightCarousel({ flights, origin, destination, date, disabled = false }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { sendMessage } = useChatContext();

  const handleSelect = (flight: Flight) => {
    if (disabled) return;
    setSelectedId(flight.id);
    const depTime = new Date(flight.departure_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const price = flight.price_economy ? `Rp${(flight.price_economy / 1000).toFixed(0)}K` : "price pending";
    sendMessage(`I want to book ${flight.flight_number} departing at ${depTime} (${price}).`);
  };

  if (!flights || flights.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
        No flights found for this route and date.
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between text-xs px-3">
        <div className="font-semibold text-gray-900">
          {origin} → {destination}
          {date && <span className="text-gray-500 font-normal ml-1.5">{date}</span>}
        </div>
        <span className="text-gray-400">{flights.length} flights</span>
      </div>

      <p className="text-[10px] text-gray-500 px-3">Tap a flight to select it</p>

      <div className="flex flex-col gap-2">
        {flights.map((f) => (
          <FlightCard
            key={f.id}
            flight={f}
            selected={selectedId === f.id}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
