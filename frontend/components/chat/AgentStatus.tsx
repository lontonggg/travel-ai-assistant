"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AgentStatus as AgentStatusType } from "@/lib/types";

const AGENT_LABELS: Record<string, string> = {
  root_agent: "Thinking",
  search_agent: "Looking up flights",
  booking_agent: "Preparing your booking",
  payment_agent: "Processing payment",
  notification_agent: "Sending confirmation",
};

const TOOL_LABELS: Record<string, string> = {
  search_flights_tool: "Searching for flights",
  get_flight_details_tool: "Getting flight details",
  get_seat_map_tool: "Loading seat map",
  hold_seat_tool: "Reserving seats",
  create_booking_draft_tool: "Putting together your booking",
  get_booking_tool: "Retrieving booking",
  process_payment_tool: "Processing payment",
  send_invoice_email_tool: "Sending invoice & ticket",
  show_passenger_form_tool: "Getting passenger details",
  show_date_picker_tool: "Opening calendar",
  show_insurance_tool: "Loading insurance options",
  show_payment_form_tool: "Opening payment options",
  transfer_to_search_agent: "Looking up flights",
  transfer_to_booking_agent: "Opening booking",
  transfer_to_payment_agent: "Going to payment",
  transfer_to_notification_agent: "Sending your confirmation",
  transfer_to_agent: "Switching agent",
  transfer_back_to_parent: "Finishing up",
};

function DotLoader() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-accent inline-block"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

export default function AgentStatus({ status }: { status: AgentStatusType }) {
  const label = status
    ? status.tool
      ? TOOL_LABELS[status.tool] ?? status.tool.replace(/_tool$/, "")
      : AGENT_LABELS[status.agent] ?? status.agent
    : null;

  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="flex items-end gap-1.5 px-3"
        >
          {/* Agent avatar — matches assistant bubble */}
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1">
            T
          </div>

          {/* Status bubble */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
            <span className="text-xs text-gray-600">{label}</span>
            <DotLoader />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
