"use client";

import { motion } from "framer-motion";
import { Plane } from "lucide-react";

type Props = {
  pnr?: string;
  passenger_name?: string;
  flight_number?: string;
  airline_name?: string;
  origin?: string;
  origin_city?: string;
  destination?: string;
  destination_city?: string;
  departure_time?: string;
  seat?: string;
  class_type?: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function TicketCard({
  pnr,
  passenger_name,
  flight_number,
  airline_name,
  origin,
  origin_city,
  destination,
  destination_city,
  departure_time,
  seat,
  class_type,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-accent/20 shadow-lg"
    >
      {/* Top section */}
      <div className="bg-gradient-to-br from-accent to-accent-dark text-white px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs opacity-70">{airline_name}</div>
            <div className="text-sm font-bold">{flight_number}</div>
          </div>
          <Plane className="w-5 h-5 opacity-70" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{origin}</div>
            <div className="text-xs opacity-70 mt-0.5">{origin_city}</div>
          </div>
          <div className="flex-1 px-4 text-center">
            <div className="text-xs opacity-60 mb-1">DIRECT</div>
            <div className="border-t border-white/30 relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm">→</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{destination}</div>
            <div className="text-xs opacity-70 mt-0.5">{destination_city}</div>
          </div>
        </div>
      </div>

      {/* Tear line */}
      <div className="relative flex items-center bg-white">
        <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 -ml-2.5" />
        <div className="flex-1 border-t border-dashed border-gray-300 mx-2" />
        <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 -mr-2.5" />
      </div>

      {/* Bottom section */}
      <div className="bg-white px-5 py-4 flex gap-4">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <Field label="Passenger" value={passenger_name} />
          <Field label="Booking Ref" value={pnr} mono />
          {departure_time && (
            <>
              <Field label="Date" value={formatDate(departure_time)} />
              <Field label="Time" value={formatTime(departure_time)} />
            </>
          )}
          <Field label="Seat" value={seat ?? "TBA"} />
          <Field label="Class" value={class_type} />
        </div>

        {/* QR placeholder */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono leading-none">{pnr}</div>
            <div className="mt-1 grid grid-cols-4 gap-0.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-sm ${Math.random() > 0.5 ? "bg-gray-700" : "bg-white"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold text-gray-900 mt-0.5 ${mono ? "font-mono tracking-widest" : ""}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}
