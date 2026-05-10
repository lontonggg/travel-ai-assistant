"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { sendMessage } = useChatContext();

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -270 : 270, behavior: "smooth" });
  };

  const handleSelect = (flight: Flight) => {
    if (disabled) return;
    setSelectedId(flight.id);
    const depTime = new Date(flight.departure_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    sendMessage(`I'd like to book flight ${flight.flight_number} (ID: ${flight.id}) — ${flight.origin} → ${flight.destination}, departing ${depTime}.`);
  };

  if (!flights || flights.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
        No flights found for this route and date.
      </div>
    );
  }

  return (
    // -mx-3 bleeds past the parent px-3 so the scroll reaches full widget width
    <div className={`flex flex-col gap-2 -mx-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between text-xs px-3">
        <div className="font-semibold text-gray-900">
          {origin} → {destination}
          {date && <span className="text-gray-500 font-normal ml-1.5">{date}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{flights.length} flights</span>
          <button onClick={() => scroll("left")} className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
            <ChevronLeft className="w-3 h-3 text-gray-600" />
          </button>
          <button onClick={() => scroll("right")} className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
            <ChevronRight className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 px-3">Tap a flight to select it</p>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        style={{ scrollSnapType: "x mandatory", paddingLeft: 20, paddingRight: 20, scrollPaddingLeft: 20 }}
      >
        {flights.map((f) => (
          <div key={f.id} style={{ scrollSnapAlign: "start" }} className="flex-shrink-0">
            <FlightCard
              flight={f}
              selected={selectedId === f.id}
              onSelect={handleSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
