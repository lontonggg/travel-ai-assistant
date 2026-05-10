"use client";

import { useState } from "react";
import { Plane, User, Clock } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";

type FlightInfo = {
  flight_number: string; airline_name: string;
  origin: string; destination: string;
  departure_time: string; arrival_time?: string;
};

type InsuranceLine = { id: string; label: string; price: number };

type Props = {
  pnr?: string;
  flight?: FlightInfo;
  return_flight?: FlightInfo;
  passengers?: Array<{ name: string; seat?: string }>;
  class_type?: string;
  status?: string;
  // detailed breakdown
  outbound_ticket_price?: number;
  return_ticket_price?: number | null;
  outbound_baggage_kg?: number;
  outbound_baggage_price?: number;
  return_baggage_kg?: number | null;
  return_baggage_price?: number | null;
  selected_insurance?: InsuranceLine[];
  insurance_price?: number;
  is_round_trip?: boolean;
  return_seat?: string | null;
  outbound_flight_label?: string;
  return_flight_label?: string;
  // fallback totals
  total_amount?: number;
  grand_total?: number;
  base_amount?: number;
  showConfirm?: boolean;
};

import { formatFlightPrice, formatUSD } from "@/lib/currency";

const fmt = (p: number, origin?: string, dest?: string) =>
  origin && dest ? formatFlightPrice(p, origin, dest) : formatUSD(p);
const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

function FlightRow({ flight, label, seat }: { flight: FlightInfo; label?: string; seat?: string }) {
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="bg-gray-50 rounded-lg p-2.5 flex items-start gap-2">
      <Plane className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="text-xs flex-1">
        {label && <div className="text-[9px] font-semibold text-accent uppercase tracking-wide mb-0.5">{label}</div>}
        <div className="font-medium text-gray-900">{flight.origin} → {flight.destination}</div>
        <div className="text-[10px] text-gray-500">{flight.airline_name} · {flight.flight_number}</div>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-600">
          <Clock className="w-2.5 h-2.5" />
          {fmtDT(flight.departure_time)}
          {flight.arrival_time && (
            <span className="text-gray-400">→ {fmtTime(flight.arrival_time)}</span>
          )}
        </div>
        {seat && (
          <div className="mt-1 text-[9px] font-medium text-accent">Seat {seat}</div>
        )}
      </div>
    </div>
  );
}

function PriceRow({ label, value, sub }: { label: string; value: string; sub?: boolean }) {
  return (
    <div className={`flex justify-between ${sub ? "text-[10px] text-gray-500 pl-2" : "text-[10px] text-gray-600"}`}>
      <span>{label}</span>
      <span className={sub ? "" : "font-medium"}>{value}</span>
    </div>
  );
}

export default function BookingSummary({
  pnr, flight, return_flight, passengers, class_type, status,
  outbound_ticket_price, return_ticket_price,
  outbound_baggage_kg, outbound_baggage_price,
  return_baggage_kg, return_baggage_price,
  selected_insurance,
  is_round_trip, return_seat, outbound_flight_label, return_flight_label,
  total_amount, grand_total, showConfirm,
}: Props) {
  const { sendMessage } = useChatContext();

  const displayTotal = grand_total ?? total_amount;
  const hasRound = is_round_trip || !!return_flight;
  const fmtP = (p: number) => fmt(p, flight?.origin, flight?.destination);

  return (
    <div className="flex flex-col gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] text-gray-500">Booking Reference</div>
          <div className="text-lg font-bold tracking-widest text-gray-900">{pnr ?? "—"}</div>
        </div>
        <div className={`px-2 py-1 rounded-full text-[9px] font-medium capitalize ${
          status === "confirmed" ? "bg-green-100 text-green-700" :
          status === "pending" ? "bg-amber-100 text-amber-700" :
          "bg-gray-100 text-gray-600"
        }`}>{status ?? "pending"}</div>
      </div>

      {/* Flights */}
      {flight && <FlightRow flight={flight} label={hasRound ? "Outbound" : undefined} seat={passengers?.[0]?.seat} />}
      {return_flight && <FlightRow flight={return_flight} label="Return" seat={return_seat ?? undefined} />}
      {class_type && (
        <div className="text-[10px] text-gray-500 capitalize -mt-1">
          {class_type} class{hasRound ? " · Round trip" : ""}
        </div>
      )}

      {/* Passengers */}
      {passengers && passengers.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-gray-100 pt-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-gray-900">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Detailed price breakdown */}
      <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
        {/* Tickets */}
        {outbound_ticket_price !== undefined && (
          <PriceRow
            label={hasRound ? `Outbound ticket — ${outbound_flight_label ?? ""}` : "Base ticket"}
            value={fmtP(outbound_ticket_price)}
          />
        )}
        {return_ticket_price != null && (
          <PriceRow
            label={`Return ticket — ${return_flight_label ?? ""}`}
            value={fmtP(return_ticket_price)}
          />
        )}

        {/* Outbound baggage — only show if paid add-on */}
        {outbound_baggage_kg !== undefined && outbound_baggage_price !== undefined && outbound_baggage_price > 0 && (
          <PriceRow
            label={`Baggage${hasRound ? ` (${outbound_flight_label ?? "outbound"})` : ""} — ${outbound_baggage_kg} kg`}
            value={fmtP(outbound_baggage_price)}
          />
        )}

        {/* Return baggage — only show if paid add-on */}
        {return_baggage_kg != null && return_baggage_price != null && return_baggage_price > 0 && hasRound && (
          <PriceRow
            label={`Baggage (${return_flight_label ?? "return"}) — ${return_baggage_kg} kg`}
            value={fmtP(return_baggage_price)}
          />
        )}

        {/* Insurance lines */}
        {selected_insurance && selected_insurance.length > 0 && (
          <>
            {selected_insurance.map((ins) => (
              <PriceRow key={ins.id} label={ins.label} value={fmtP(ins.price)} />
            ))}
          </>
        )}
      </div>

      {/* Total */}
      {displayTotal !== undefined && (
        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-700">Total</div>
          <div className="text-base font-bold text-accent">{fmtP(displayTotal)}</div>
        </div>
      )}

      {/* Confirm / Change */}
      {showConfirm && status !== "confirmed" && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => sendMessage("I'd like to make a change to my order.")}
            className="flex-1 py-1.5 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50 transition-colors">
            Make changes
          </button>
          <button onClick={() => sendMessage("I confirm my order. Please proceed to payment.")}
            className="flex-1 py-1.5 rounded-lg bg-accent text-white text-[10px] font-medium hover:bg-accent-dark transition-colors">
            Confirm & Pay
          </button>
        </div>
      )}
    </div>
  );
}
