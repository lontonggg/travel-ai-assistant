"use client";

import { Download, Mail } from "lucide-react";
import { formatFlightPrice, formatUSD } from "@/lib/currency";

type Props = {
  booking_id?: number;
  pnr?: string;
  passenger_name?: string;
  flight_number?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  total_amount?: number;
  paid_at?: string;
  payment_method?: string;
};

function formatPrice(p: number, origin?: string, destination?: string) {
  return origin && destination ? formatFlightPrice(p, origin, destination) : formatUSD(p);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function InvoiceCard({
  pnr,
  passenger_name,
  flight_number,
  origin,
  destination,
  departure_time,
  total_amount,
  paid_at,
  payment_method,
}: Props) {
  return (
    <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Invoice</div>
          <div className="text-lg font-bold text-gray-900">#{pnr}</div>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Paid
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200 pt-4 flex flex-col gap-3 text-sm">
        <Row label="Passenger" value={passenger_name} />
        <Row label="Flight" value={`${flight_number} · ${origin} → ${destination}`} />
        {departure_time && <Row label="Departure" value={formatDate(departure_time)} />}
        {paid_at && <Row label="Paid on" value={formatDate(paid_at)} />}
        {payment_method && <Row label="Method" value={payment_method.replace(/_/g, " ")} />}
      </div>

      <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">Total Paid</div>
        <div className="text-xl font-bold text-accent">
          {total_amount !== undefined ? formatPrice(total_amount, origin, destination) : "—"}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-accent text-white text-xs hover:bg-accent-dark transition-colors">
          <Mail className="w-3.5 h-3.5" />
          Email sent
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}
