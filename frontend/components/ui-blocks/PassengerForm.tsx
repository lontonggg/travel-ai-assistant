"use client";

import { useState } from "react";
import { UserCircle, AlertCircle } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";

type PassengerFields = {
  first_middle_name: string;
  last_name: string;
  gender: string;
  dob: string;
  passport_or_id: string;
  email: string;
};

type Props = {
  pax?: number;
  disabled?: boolean;
};

export function formatTicketName(p: PassengerFields): string {
  const last = p.last_name.trim().toUpperCase();
  const first = p.first_middle_name.trim().toUpperCase();
  return `${last}/${first}`;
}

export default function PassengerForm({ pax = 1, disabled = false }: Props) {
  const [passengers, setPassengers] = useState<PassengerFields[]>(
    Array.from({ length: pax }, () => ({
      first_middle_name: "",
      last_name: "",
      gender: "",
      dob: "",
      passport_or_id: "",
      email: "",
    }))
  );
  const [submitted, setSubmitted] = useState(false);
  const { sendMessage } = useChatContext();

  const update = (i: number, field: keyof PassengerFields, value: string) =>
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const allComplete = passengers.every(
    (p) => p.first_middle_name && p.last_name && p.gender && p.dob && p.passport_or_id && p.email
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || disabled || !allComplete) return;
    setSubmitted(true);

    if (pax === 1) {
      const p = passengers[0];
      sendMessage(
        `Here's my info: I'm ${p.first_middle_name} ${p.last_name}, born ${p.dob}, ` +
        `ID ${p.passport_or_id}, email ${p.email}.`
      );
    } else {
      const names = passengers.map(p => `${p.first_middle_name} ${p.last_name}`).join(", ");
      sendMessage(`Traveling with me: ${names}. All details entered.`);
    }
  };

  const isDisabled = disabled || submitted;

  return (
    <form onSubmit={handleSubmit}
      className={`flex flex-col gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl ${isDisabled ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
        <UserCircle className="w-3.5 h-3.5" />
        Passenger Details
      </div>

      {passengers.map((p, i) => (
        <div key={i} className="flex flex-col gap-2 bg-white rounded-lg p-2.5 border border-blue-100">
          {pax > 1 && <div className="text-[10px] font-medium text-gray-500">Passenger {i + 1}</div>}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-1 block">First & Middle Name</label>
              <input required disabled={isDisabled}
                placeholder="e.g. John Michael"
                value={p.first_middle_name}
                onChange={(e) => update(i, "first_middle_name", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-gray-50" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-1 block">Last Name</label>
              <input required disabled={isDisabled}
                placeholder="e.g. Doe"
                value={p.last_name}
                onChange={(e) => update(i, "last_name", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-gray-50" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-1 block">Gender</label>
              <select required disabled={isDisabled}
                value={p.gender}
                onChange={(e) => update(i, "gender", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-gray-50 bg-white">
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-1 block">Date of Birth</label>
              <input type="date" required disabled={isDisabled}
                value={p.dob}
                onChange={(e) => update(i, "dob", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Passport / National ID</label>
            <input required disabled={isDisabled}
              placeholder="ID number"
              value={p.passport_or_id}
              onChange={(e) => update(i, "passport_or_id", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-gray-50" />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Email Address</label>
            <input required type="email" disabled={isDisabled}
              placeholder="your.email@example.com"
              value={p.email}
              onChange={(e) => update(i, "email", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-gray-50" />
            <div className="flex gap-1.5 bg-blue-50 rounded-lg p-2 border border-blue-100 mt-1.5">
              <AlertCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700">Receipt and flight tickets will be sent to this email.</p>
            </div>
          </div>
        </div>
      ))}

      {!submitted ? (
        <button type="submit" disabled={isDisabled || !allComplete}
          className="w-full py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-dark disabled:opacity-40 transition-colors">
          Confirm Details
        </button>
      ) : (
        <p className="text-[10px] text-accent font-medium">Details submitted</p>
      )}
    </form>
  );
}
