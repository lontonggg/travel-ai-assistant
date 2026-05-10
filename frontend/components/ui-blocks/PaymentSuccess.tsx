"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText, Ticket } from "lucide-react";
import QRCode from "qrcode";
import { formatFlightPrice, formatUSD } from "@/lib/currency";

type Payment = { method: string; amount: number; paid_at: string };
type Passenger = { name: string; seat?: string; is_primary?: boolean; dob?: string; passport_or_id?: string };
type Flight = {
  flight_number: string; airline_name: string; airline_code?: string; aircraft_type?: string;
  origin: string; destination: string; departure_time: string; arrival_time: string; duration_minutes?: number;
};
type InsuranceLine = { id: string; label: string; price: number };
type Booking = {
  pnr: string; class_type: string; total_amount: number; base_amount?: number;
  outbound_baggage_kg?: number; outbound_baggage_price?: number;
  return_baggage_kg?: number; return_baggage_price?: number;
  selected_insurance?: InsuranceLine[];
  passengers?: Passenger[]; flight?: Flight; return_flight?: Flight;
};
type Props = { payment?: Payment; booking?: Booking };

const METHOD_LABELS: Record<string, string> = { credit_card: "Credit Card", debit_card: "Debit Card", qris: "QRIS" };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const durStr = (min?: number) => min ? `${Math.floor(min / 60)}h ${min % 60}m` : "—";

const INVOICE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1a1a1a;padding:48px;max-width:720px;margin:auto;font-size:13px;line-height:1.5}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid #1f9d5b}
.brand{font-size:22px;font-weight:700}.brand-sub{font-size:11px;color:#666;margin-top:3px}
.inv-label{font-size:28px;font-weight:700;color:#1f9d5b;text-align:right}.inv-sub{font-size:11px;color:#888;text-align:right;margin-top:4px}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:32px;padding:18px;background:#f9f9f9;border-radius:8px}
.meta .label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.meta .val{font-size:14px;font-weight:600}
.pnr{font-size:22px;letter-spacing:5px;color:#1f9d5b;font-weight:800}
.badge{display:inline-block;padding:3px 12px;background:#dcfce7;color:#15803d;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:1px}
.section{margin-bottom:28px}.stitle{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:8px;margin-bottom:12px;border-bottom:1px solid #eee}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.il{font-size:10px;color:#999;margin-bottom:3px}.iv{font-size:13px;font-weight:500}
table{width:100%;border-collapse:collapse}
thead tr{background:#f3f4f6}th{text-align:left;padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #e5e7eb}
td{padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px}
.sub-row td{border-bottom:none;color:#555}
.total-row{background:#f0fdf4}.total-row td{font-weight:700;font-size:15px;color:#1f9d5b;border-top:2px solid #1f9d5b;border-bottom:none;padding:12px 14px}
.terms{background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:18px;font-size:11px;color:#555;line-height:1.8;margin-bottom:28px}
.terms-title{font-weight:700;font-size:12px;color:#333;margin-bottom:8px}
.footer{border-top:1px solid #eee;padding-top:18px;font-size:10px;color:#999;display:flex;justify-content:space-between}
`;

const TICKET_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1a1a1a;padding:48px;max-width:680px;margin:auto;font-size:13px;line-height:1.5}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1f9d5b}
.brand{font-size:22px;font-weight:700}.brand-sub{font-size:11px;color:#666;margin-top:3px}
.doc-title{font-size:18px;font-weight:700;color:#1f9d5b;text-align:right}
.leg-label{font-size:13px;font-weight:700;color:#888;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px}
.bp{border:2px solid #1f9d5b;border-radius:12px;overflow:hidden;margin-bottom:28px}
.bp-top{background:#1f9d5b;color:#fff;padding:22px 28px}
.ar{display:flex;justify-content:space-between;margin-bottom:20px}
.aname{font-size:12px;opacity:.8;margin-bottom:4px}.fnum{font-size:20px;font-weight:700;letter-spacing:1px}.ac{font-size:11px;opacity:.7;text-transform:capitalize}
.route{display:flex;align-items:center;gap:20px}
.iata{font-size:42px;font-weight:900;letter-spacing:-2px}
.rmid{flex:1;text-align:center;padding:0 12px}
.route-line{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.route-dash{flex:1;height:1px;background:rgba(255,255,255,0.5)}
.route-plane{font-size:16px;opacity:0.9}
.rinfo{font-size:10px;opacity:.6}
.dtime{font-size:14px;font-weight:600;opacity:.9;margin-top:6px}
.tear{display:flex;align-items:center}
.tc{width:18px;height:18px;border-radius:50%;background:#f3f4f6;border:2px solid #1f9d5b;flex-shrink:0;margin:0 -1px}
.tdash{flex:1;border-top:2px dashed #d1d5db}
.bp-bottom{display:flex;padding:22px 28px;gap:28px;align-items:center}
.pg{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fl{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px}.fv{font-size:14px;font-weight:600}
.pnr-val{font-size:20px;letter-spacing:5px;color:#1f9d5b;font-weight:800}
.qr-box{display:flex;flex-direction:column;align-items:center;gap:6px}.qr-lbl{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;text-align:center}
.stitle{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:8px;margin-bottom:12px;border-bottom:1px solid #eee}
.notice{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 20px;margin-bottom:20px}
.ntitle{font-size:13px;font-weight:700;color:#166534;margin-bottom:12px}
.nlist{list-style:none;padding:0}
.nlist li{padding:5px 0;font-size:12px;color:#166534;border-bottom:1px solid #dcfce7;display:flex;gap:10px}
.nlist li:last-child{border-bottom:none}.nnum{font-weight:700;min-width:18px}
.warning{border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.7;background:#fff5f5}
.footer{border-top:1px solid #eee;padding-top:16px;font-size:10px;color:#999;text-align:center;line-height:1.8}
`;

function buildInvoiceHtml(pnr: string, payment: Payment | undefined, booking: Booking): string {
  const passengers = booking.passengers ?? [];
  const total = payment?.amount ?? booking.total_amount;
  const _o = booking.flight?.origin;
  const _d = booking.flight?.destination;
  const fmt = (p: number) => _o && _d ? formatFlightPrice(p, _o, _d) : formatUSD(p);
  const currencyLabel = _o && _d ? `${_o}→${_d}` : "USD";
  const isRoundTrip = !!booking.return_flight;
  const base = (booking as any).base_amount;
  const outFlight = booking.flight;
  const retFlight = booking.return_flight;
  const ins: InsuranceLine[] = (booking as any).selected_insurance ?? [];
  const outBagKg: number = (booking as any).outbound_baggage_kg ?? 0;
  const outBagPrice: number = (booking as any).outbound_baggage_price ?? 0;
  const retBagKg: number = (booking as any).return_baggage_kg ?? 0;
  const retBagPrice: number = (booking as any).return_baggage_price ?? 0;

  const outTicket: number = (booking as any).outbound_ticket_price ?? (base !== undefined ? (isRoundTrip ? Math.round(base / 2) : base) : 0);
  const retTicket: number | undefined = (booking as any).return_ticket_price ?? (isRoundTrip && base !== undefined ? Math.round(base / 2) : undefined);

  const flightRows = [
    outFlight ? `<tr><th colspan="2" style="background:#f0fdf4;color:#166534;padding:8px 14px;font-size:11px">${isRoundTrip ? "Outbound" : "Flight"} — ${outFlight.origin}→${outFlight.destination} · ${outFlight.flight_number}</th></tr>` : "",
    outFlight ? `<tr class="sub-row"><td>${isRoundTrip ? "Outbound ticket" : "Base ticket"} (${passengers.length} pax)</td><td style="text-align:right">${fmt(outTicket)}</td></tr>` : "",
    outBagPrice > 0 ? `<tr class="sub-row"><td>Checked baggage (${outFlight?.origin}→${outFlight?.destination}) — ${outBagKg} kg</td><td style="text-align:right">${fmt(outBagPrice)}</td></tr>` : "",
    retFlight ? `<tr><th colspan="2" style="background:#f0fdf4;color:#166534;padding:8px 14px;font-size:11px">Return — ${retFlight.origin}→${retFlight.destination} · ${retFlight.flight_number}</th></tr>` : "",
    retFlight && retTicket !== undefined ? `<tr class="sub-row"><td>Return ticket (${passengers.length} pax)</td><td style="text-align:right">${fmt(retTicket)}</td></tr>` : "",
    retBagPrice > 0 ? `<tr class="sub-row"><td>Checked baggage (${retFlight?.origin}→${retFlight?.destination}) — ${retBagKg} kg</td><td style="text-align:right">${fmt(retBagPrice)}</td></tr>` : "",
    ins.length > 0 ? `<tr><th colspan="2" style="background:#f0fdf4;color:#166534;padding:8px 14px;font-size:11px">Travel Protection</th></tr>` : "",
    ...ins.map(i => `<tr class="sub-row"><td>${i.label}</td><td style="text-align:right">${fmt(i.price)}</td></tr>`),
    `<tr class="total-row"><td>Total Payment</td><td style="text-align:right">${fmt(total)}</td></tr>`,
  ].filter(Boolean).join("");

  const flightDetailsBlock = [outFlight, ...(retFlight ? [retFlight] : [])].map((f, idx) => `
    <div class="grid2" style="margin-bottom:${retFlight ? "12px" : "0"}">
      ${retFlight ? `<div style="grid-column:1/-1"><div class="il">${idx === 0 ? "Outbound" : "Return"} Flight</div></div>` : ""}
      <div><div class="il">Airline</div><div class="iv">${f!.airline_name}</div></div>
      <div><div class="il">Flight Number</div><div class="iv">${f!.flight_number}</div></div>
      <div><div class="il">Aircraft</div><div class="iv">${f!.aircraft_type ?? "—"}</div></div>
      <div><div class="il">Class</div><div class="iv" style="text-transform:capitalize">${booking.class_type}</div></div>
      <div><div class="il">Route</div><div class="iv">${f!.origin} — ${f!.destination}</div></div>
      <div><div class="il">Duration</div><div class="iv">${durStr(f!.duration_minutes)}</div></div>
      <div><div class="il">Departure</div><div class="iv">${fmtDateTime(f!.departure_time)}</div></div>
      <div><div class="il">Arrival</div><div class="iv">${fmtDateTime(f!.arrival_time)}</div></div>
    </div>`).join("<hr style='border:none;border-top:1px dashed #e5e7eb;margin:8px 0'/>");

  const rows = flightRows;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Receipt ${pnr} — FlightHub</title><style>${INVOICE_CSS}</style></head><body>
    <div class="header">
      <div><div class="brand">FlightHub</div><div class="brand-sub">FlightHub Services</div></div>
      <div><div class="inv-label">RECEIPT</div><div class="inv-sub">Issued: ${fmtDateTime(payment?.paid_at ?? new Date().toISOString())}</div></div>
    </div>
    <div class="meta">
      <div><div class="label">Booking Reference</div><div class="val pnr">${pnr}</div></div>
      <div><div class="label">Status</div><div class="val"><span class="badge">PAID</span></div></div>
      <div><div class="label">Payment Method</div><div class="val">${METHOD_LABELS[payment?.method ?? ""] ?? payment?.method ?? "—"}</div></div>
    </div>
    <div class="section"><div class="stitle">Flight Details</div>${flightDetailsBlock}</div>
    <div class="section"><div class="stitle">Passenger Details</div>
      <table><thead><tr><th>Name</th><th>Seat</th><th>Date of Birth</th><th>ID / Passport</th></tr></thead>
      <tbody>${passengers.map(p => `<tr><td>${p.name ?? "—"}</td><td>${p.seat ?? "TBA"}</td><td>${p.dob ?? "—"}</td><td>${p.passport_or_id ?? "—"}</td></tr>`).join("")}</tbody></table>
    </div>
    <div class="section"><div class="stitle">Payment Breakdown</div>
      <table><thead><tr><th>Description</th><th style="text-align:right">Amount (${currencyLabel})</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="terms"><div class="terms-title">Terms and Conditions</div>
      1. This receipt is an official payment confirmation issued electronically by FlightHub Services.<br>
      2. Cancellations must be made at least 4 hours before departure. Cancellation fees apply per airline policy.<br>
      3. Name or schedule changes incur an administration fee of $5 per segment.<br>
      4. FlightHub is not liable for delays or cancellations caused by the airline or force majeure.<br>
      5. Retain this document for insurance claims, reimbursement, or refund purposes.
    </div>
    <div class="footer"><div>FlightHub Services · support@flighthub.com · 1-800-FLIGHTS</div><div>Auto-generated document — valid without handwritten signature.</div></div>
  </body></html>`;
}

function buildTicketHtml(pnr: string, booking: Booking, flight: Flight, primaryPax: Passenger | undefined, passengerName: string, isReturn: boolean, qrDataUrl: string): string {
  const legLabel = isReturn ? "Return Flight" : booking.return_flight ? "Outbound Flight" : "Flight";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>E-Ticket ${pnr} — ${legLabel}</title><style>${TICKET_CSS}</style></head><body>
    <div class="header">
      <div><div class="brand">FlightHub</div><div class="brand-sub">FlightHub Services</div></div>
      <div><div class="doc-title">E-TICKET / BOARDING PASS</div></div>
    </div>
    <div class="leg-label">${legLabel}</div>
    <div class="bp">
      <div class="bp-top">
        <div class="ar">
          <div><div class="aname">${flight.airline_name}</div><div class="fnum">${flight.flight_number}</div></div>
          <div style="text-align:right"><div class="ac">${booking.class_type} Class</div><div style="font-size:11px;opacity:.7">${flight.aircraft_type ?? ""}</div></div>
        </div>
        <div class="route">
          <div><div class="iata">${flight.origin}</div><div class="dtime">${fmtTime(flight.departure_time)}</div></div>
          <div class="rmid"><div class="route-line"><div class="route-dash"></div><div class="route-plane">&#9992;</div><div class="route-dash"></div></div><div class="rinfo">Non-stop &middot; ${durStr(flight.duration_minutes)}</div></div>
          <div style="text-align:right"><div class="iata">${flight.destination}</div><div class="dtime">${fmtTime(flight.arrival_time)}</div></div>
        </div>
      </div>
      <div class="tear"><div class="tc"></div><div class="tdash"></div><div class="tc"></div></div>
      <div class="bp-bottom">
        <div class="pg">
          <div><div class="fl">Passenger</div><div class="fv">${passengerName}</div></div>
          <div><div class="fl">Seat</div><div class="fv">${primaryPax?.seat ?? "TBA"}</div></div>
          <div><div class="fl">Date</div><div class="fv">${fmtDate(flight.departure_time)}</div></div>
          <div><div class="fl">Booking Reference</div><div class="fv pnr-val">${pnr}</div></div>
        </div>
        ${qrDataUrl ? `<div class="qr-box"><img src="${qrDataUrl}" width="120" height="120" alt="QR"/><div class="qr-lbl">Present at check-in</div></div>` : ""}
      </div>
    </div>
    <div class="notice"><div class="ntitle">Departure Guidelines</div>
      <ul class="nlist">
        <li><span class="nnum">1.</span><span>Arrive at the airport at least <strong>2 hours</strong> before departure for domestic flights to complete check-in and security screening.</span></li>
        <li><span class="nnum">2.</span><span>Boarding gates close <strong>30 minutes</strong> before scheduled departure. Late passengers cannot be accommodated on a missed flight.</span></li>
        <li><span class="nnum">3.</span><span>Carry a valid original ID (National ID or Passport) matching the name on this ticket exactly.</span></li>
        <li><span class="nnum">4.</span><span>Cabin baggage is limited to <strong>7 kg</strong> with dimensions not exceeding 40 x 30 x 20 cm. Liquids over 100 ml are not permitted in the cabin.</span></li>
        <li><span class="nnum">5.</span><span>Online check-in opens <strong>24 hours</strong> before departure via the airline app or website. Strongly recommended to reduce queuing time.</span></li>
        <li><span class="nnum">6.</span><span>Monitor your flight status through the airline app or airport information boards. FlightHub will notify schedule changes to your registered email.</span></li>
      </ul>
    </div>
    <div class="warning"><strong>Notice:</strong> This ticket is non-transferable. Passenger cancellations are subject to airline fees. FlightHub is not responsible for losses arising from delays or cancellations beyond airline control.</div>
    <div class="footer">FlightHub · support@flighthub.com · 1-800-FLIGHTS<br>This e-ticket is a valid travel document. Present to check-in staff at the departure airport.</div>
  </body></html>`;
}

function openPrint(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

function TicketPreview({ flight, pnr, passengerName, seat, qrDataUrl, label }: {
  flight: Flight; pnr: string; passengerName: string; seat?: string; qrDataUrl: string; label?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
          <span className="text-[9px] font-semibold text-accent uppercase tracking-wide">{label}</span>
        </div>
      )}
      <div className="bg-accent px-3 py-2.5 flex items-center justify-between">
        <div>
          <div className="text-[9px] text-white/70">{flight.airline_name} · {flight.flight_number}</div>
          <div className="text-xs font-bold text-white capitalize">{/* class shown in header */}</div>
        </div>
      </div>
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="text-center">
          <div className="text-xl font-bold">{flight.origin}</div>
          <div className="text-[9px] text-gray-400">{fmtTime(flight.departure_time)}</div>
        </div>
        <div className="flex-1 px-2 flex flex-col items-center">
          <div className="text-[9px] text-gray-400 mb-1">Non-stop</div>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-[10px] text-gray-400">&#9992;</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">{flight.destination}</div>
          <div className="text-[9px] text-gray-400">{fmtTime(flight.arrival_time)}</div>
        </div>
      </div>
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-gray-200 -ml-1.5 flex-shrink-0" />
        <div className="flex-1 border-t border-dashed border-gray-200" />
        <div className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-gray-200 -mr-1.5 flex-shrink-0" />
      </div>
      <div className="px-3 py-2.5 flex justify-between items-center">
        <div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide">Passenger</div>
          <div className="text-xs font-semibold">{passengerName}</div>
          <div className="text-[9px] text-gray-500">
            Seat {seat ?? "TBA"} · {fmtDate(flight.departure_time)}
          </div>
        </div>
        {qrDataUrl && <img src={qrDataUrl} width={48} height={48} alt="QR" className="rounded" />}
      </div>
    </div>
  );
}

export default function PaymentSuccess({ payment, booking }: Props) {
  const [qrOut, setQrOut] = useState("");
  const [qrRet, setQrRet] = useState("");

  const pnr = booking?.pnr ?? "—";
  const flight = booking?.flight ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const returnFlight: Flight | null = (booking as any)?.return_flight ?? null;
  const passengers = booking?.passengers ?? [];
  const primaryPax = passengers.find((p) => p.is_primary) ?? passengers[0];
  // Name is stored as "LAST/FIRST" from PassengerForm — use as-is for tickets
  const ticketName = primaryPax?.name ?? "—";
  const total = payment?.amount ?? booking?.total_amount ?? 0;
  const isRoundTrip = !!returnFlight;
  const fmtTotal = (p: number) => flight ? formatFlightPrice(p, flight.origin, flight.destination) : formatUSD(p);

  useEffect(() => {
    if (pnr === "—") return;
    QRCode.toDataURL(`FLIGHTHUB:${pnr}:${flight?.flight_number ?? ""}`, { width: 130, margin: 1 }).then(setQrOut);
    if (returnFlight) {
      QRCode.toDataURL(`FLIGHTHUB:${pnr}:${returnFlight.flight_number}:RET`, { width: 130, margin: 1 }).then(setQrRet);
    }
  }, [pnr, flight?.flight_number, returnFlight?.flight_number]);

  return (
    <div className="flex flex-col gap-3">
      {/* Success banner */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs font-semibold text-green-800">Payment Successful</div>
          <div className="text-[10px] text-green-600">
            {fmtTotal(total)} via {METHOD_LABELS[payment?.method ?? ""] ?? payment?.method}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-green-600">Booking Ref</div>
          <div className="text-base font-bold tracking-widest text-green-800">{pnr}</div>
        </div>
      </motion.div>

      {/* Outbound ticket */}
      {/* Outbound ticket */}
      {flight && (
        <TicketPreview
          flight={flight} pnr={pnr} passengerName={ticketName} seat={primaryPax?.seat} qrDataUrl={qrOut}
          label={isRoundTrip ? "Outbound Flight" : undefined}
        />
      )}

      {/* Return ticket */}
      {returnFlight && (
        <TicketPreview
          flight={returnFlight} pnr={pnr} passengerName={ticketName} seat={primaryPax?.seat} qrDataUrl={qrRet}
          label="Return Flight"
        />
      )}

      {/* Downloads — 1 invoice + e-ticket per leg */}
      <div className="flex flex-col gap-2">
        <button onClick={() => booking && openPrint(buildInvoiceHtml(pnr, payment, booking))}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-gray-700 text-[10px] font-medium hover:bg-gray-200 transition-colors border border-gray-200">
          <FileText className="w-3.5 h-3.5" /> Download Receipt
        </button>
        {flight && (
          <button onClick={() => booking && openPrint(buildTicketHtml(pnr, booking, flight, primaryPax, ticketName, false, qrOut))}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent text-white text-[10px] font-medium hover:bg-accent-dark transition-colors">
            <Ticket className="w-3.5 h-3.5" /> {isRoundTrip ? "Outbound E-Ticket" : "E-Ticket"}
          </button>
        )}
        {returnFlight && (
          <button onClick={() => booking && openPrint(buildTicketHtml(pnr, booking, returnFlight, primaryPax, ticketName, true, qrRet))}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent text-white text-[10px] font-medium hover:bg-accent-dark transition-colors">
            <Ticket className="w-3.5 h-3.5" /> Return E-Ticket
          </button>
        )}
      </div>

    </div>
  );
}
