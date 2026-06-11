"use client";

import { useState } from "react";
import { CreditCard, Smartphone, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useChatContext } from "@/contexts/ChatContext";
import { formatUSD } from "@/lib/currency";

const METHODS = [
  { id: "credit_card", label: "Credit Card",  icon: CreditCard,  hint: "Visa, Mastercard, JCB" },
  { id: "debit_card",  label: "Debit Card",   icon: Building2,   hint: "BCA, Mandiri, BRI, BNI" },
  { id: "qris",        label: "QRIS",          icon: Smartphone,  hint: "GoPay, OVO, Dana, ShopeePay" },
];

type Props = {
  booking_id?: number;
  total_amount?: number;
  booking?: { pnr?: string; total_amount?: number };
  disabled?: boolean;
};

const fmt = (p: number) => formatUSD(p);

export default function PaymentForm({ booking_id, total_amount, booking, disabled = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { sendMessage } = useChatContext();

  const pnr = booking?.pnr;
  const finalTotal = total_amount ?? booking?.total_amount;

  const handleSelect = (id: string) => {
    if (disabled || selected) return;
    setSelected(id);
    const messages: Record<string, string> = {
      credit_card: "I'll pay with my credit card.",
      debit_card: "I'll use my debit card.",
      qris: "Let me pay with QRIS."
    };
    sendMessage(messages[id] ?? "I'm ready to pay.");
  };

  return (
    <div className={`flex flex-col gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-900">Choose Payment Method</div>
          {pnr && <div className="text-[9px] text-gray-500 mt-0.5">Booking {pnr}</div>}
        </div>
      </div>

      {/* Total Amount */}
      {finalTotal && (
        <div className="bg-white border border-amber-300 rounded-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Total Amount</span>
          <span className="text-lg font-bold text-accent">{fmt(finalTotal)}</span>
        </div>
      )}

      {/* Methods */}
      <div className="flex flex-col gap-2">
        {METHODS.map(({ id, label, icon: Icon, hint }) => (
          <motion.button
            key={id}
            whileTap={!selected ? { scale: 0.97 } : {}}
            onClick={() => handleSelect(id)}
            disabled={!!selected || disabled}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
              selected === id
                ? "border-accent bg-accent text-white"
                : selected
                ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                : "border-gray-200 bg-white text-gray-700 hover:border-accent/50 cursor-pointer"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{label}</div>
              <div className={`text-[9px] ${selected === id ? "text-white/70" : "text-gray-400"}`}>{hint}</div>
            </div>
            {selected === id && <span className="text-[10px] text-white/90">Selected</span>}
          </motion.button>
        ))}
      </div>

      {selected && <p className="text-[10px] text-accent font-medium">Processing payment…</p>}
    </div>
  );
}
