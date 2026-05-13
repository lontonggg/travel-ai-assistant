"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SeatInfo } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";

type Props = {
  flight_id: number;
  flight_number?: string;
  flight_label?: string;
  aircraft_type?: string;
  pax?: number;
  business_seats?: SeatInfo[];
  economy_seats?: SeatInfo[];
  business_available?: boolean;
  price_economy?: number;
  price_business?: number;
  disabled?: boolean;
};

// Column layouts include empty strings for aisle gaps
const SEAT_LAYOUTS: Record<string, { biz: string[]; eco: string[] }> = {
  // Narrow-body 3-3 (single aisle)
  "Boeing 737-800":   { biz: ["A","B","","","C","D",""], eco: ["A","B","C","","D","E","F"] },
  "Boeing 737-900ER": { biz: ["A","B","","","C","D",""], eco: ["A","B","C","","D","E","F"] },
  "Airbus A320":      { biz: ["A","B","","","C","D",""], eco: ["A","B","C","","D","E","F"] },
  "Airbus A320neo":   { biz: ["A","B","","","C","D",""], eco: ["A","B","C","","D","E","F"] },
  // Regional turboprop 2-2
  "ATR 72-600":       { biz: [],                         eco: ["A","B","","C","D"] },
  // Wide-body 777: economy 3-4-3 (A B C | D E F G | H J K)
  "Boeing 777-200":   { biz: ["A","B","","C","D","","E","F"], eco: ["A","B","C","","D","E","F","G","","H","J","K"] },
  "Boeing 777-300ER": { biz: ["A","B","","C","D","","E","F"], eco: ["A","B","C","","D","E","F","G","","H","J","K"] },
  "Boeing 777-200ER": { biz: ["A","B","","C","D","","E","F"], eco: ["A","B","C","","D","E","F","G","","H","J","K"] },
  // Wide-body 787/A350: economy 3-3-3 (A B C | D E F | G H J)
  "Boeing 787-9":     { biz: ["A","B","","C","D","","E","F"], eco: ["A","B","C","","D","E","F","","G","H","J"] },
  // Wide-body A330: economy 2-4-2 (A B | C D E F | G H)
  "Airbus A330-300":  { biz: ["A","B","","C","D","","E","F"], eco: ["A","B","","C","D","E","F","","G","H"] },
  // Wide-body A350: economy 3-3-3, business 1-2-1
  "Airbus A350-900":  { biz: ["A","","B","C","","D"],          eco: ["A","B","C","","D","E","F","","G","H","J"] },
};

const DEFAULT_LAYOUT = { biz: ["A","B","","","C","D",""], eco: ["A","B","C","","D","E","F"] };

export default function SeatMap({
  flight_id,
  flight_label,
  aircraft_type,
  pax = 1,
  business_seats = [],
  economy_seats = [],
  business_available = true,
  disabled = false,
}: Props) {
  const layout: { biz: string[]; eco: string[] } =
    (aircraft_type && SEAT_LAYOUTS[aircraft_type]) || DEFAULT_LAYOUT;
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [tooltip, setTooltip] = useState<{ seat: string; price: string | null } | null>(null);
  const { sendMessage } = useChatContext();

  const handleSeat = (seat: SeatInfo) => {
    if (disabled || seat.status === "taken" || seat.status === "held" || submitted) return;
    setSelectedSeats((prev) => {
      if (prev.includes(seat.seat)) {
        return prev.filter((s) => s !== seat.seat);
      } else if (prev.length < pax) {
        return [...prev, seat.seat];
      }
      return prev;
    });
  };

  const handleContinue = () => {
    if (selectedSeats.length !== pax || submitted) return;
    setSubmitted(true);
    if (pax === 1) {
      sendMessage(`I'd like seat ${selectedSeats[0]}.`);
    } else {
      sendMessage(`Seat selection: ${selectedSeats.join(", ")}.`);
    }
  };

  const groupByRow = (seats: SeatInfo[]) =>
    seats.reduce<Record<number, SeatInfo[]>>((acc, s) => {
      if (!acc[s.row]) acc[s.row] = [];
      acc[s.row].push(s);
      return acc;
    }, {});

  const seatColor = (s: SeatInfo) => {
    if (disabled || s.status === "taken" || submitted) return "bg-gray-200 cursor-not-allowed text-gray-400";
    if (s.status === "held") return "bg-amber-200 cursor-not-allowed";
    if (selectedSeats.includes(s.seat)) return "bg-accent text-white";
    return s.class_type === "business"
      ? "bg-purple-100 hover:bg-purple-200 cursor-pointer text-purple-700"
      : "bg-green-100 hover:bg-green-200 cursor-pointer text-green-700";
  };

  const renderRow = (row: number, rowSeats: SeatInfo[], isBusiness: boolean) => {
    const cols = isBusiness ? layout.biz : layout.eco;
    const seatMap = Object.fromEntries(rowSeats.map((s) => [s.col, s]));
    return (
      <div key={row} className="flex items-center justify-center gap-0.5">
        <span className="w-4 text-[9px] text-gray-400 text-right mr-1 flex-shrink-0">{row}</span>
        {cols.map((col, i) => {
          if (!col) return <div key={i} className="w-5 flex-shrink-0" />;
          const s = seatMap[col];
          if (!s) return <div key={col} className="w-6 h-6 flex-shrink-0" />;
          return (
            <div key={col} className="relative flex-shrink-0">
              <motion.button
                whileTap={!disabled && s.status === "available" ? { scale: 0.85 } : {}}
                onClick={() => handleSeat(s)}
                onMouseEnter={() => s.status === "available" && setTooltip({ seat: s.seat, price: null })}
                onMouseLeave={() => setTooltip(null)}
                className={`w-6 h-6 rounded text-[9px] font-medium transition-colors ${seatColor(s)}`}
                title={s.seat}
              >
                {col}
              </motion.button>

              <AnimatePresence>
                {tooltip?.seat === s.seat && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-20 pointer-events-none"
                  >
                    <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto mb-[-4px]" />
                    <div className="bg-gray-900 text-white rounded-lg px-2 py-1 text-center whitespace-nowrap shadow-lg">
                      <div className="text-[10px] font-bold">{s.seat}</div>
                      <div className="text-[9px] text-gray-300 capitalize">{s.class_type}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  const businessRows = Object.entries(groupByRow(business_seats)).sort(([a], [b]) => +a - +b);
  const economyRows = Object.entries(groupByRow(economy_seats)).sort(([a], [b]) => +a - +b);

  return (
    <div className={`flex flex-col gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-800">Seat Map — {flight_label ?? `Flight #${flight_id}`}</span>
        <div className="flex gap-2 text-[9px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-100 inline-block" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-200 inline-block" /> Taken</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-accent inline-block" /> Selected</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto scrollbar-thin">
        {business_available && businessRows.map(([row, s]) => renderRow(+row, s, true))}

        {business_available && businessRows.length > 0 && economyRows.length > 0 && (
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 border-t border-dashed border-gray-300" />
            <span className="text-[8px] text-gray-400">ECONOMY</span>
            <div className="flex-1 border-t border-dashed border-gray-300" />
          </div>
        )}

        {economyRows.map(([row, s]) => renderRow(+row, s, false))}
      </div>

      <div className="flex items-center justify-between">
        {pax === 1 ? (
          <p className="text-[10px] text-gray-600">
            {selectedSeats.length > 0 ? `✓ Seat ${selectedSeats[0]} selected` : "Select a seat"}
          </p>
        ) : (
          <p className="text-[10px] text-gray-600">
            {selectedSeats.length > 0
              ? `✓ ${selectedSeats.length}/${pax} seats selected: ${selectedSeats.join(", ")}`
              : `Select ${pax} seats`}
          </p>
        )}
        <button
          onClick={handleContinue}
          disabled={selectedSeats.length !== pax || submitted || disabled}
          className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-dark transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
