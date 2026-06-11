"use client";

import { useState, useCallback } from "react";
import { useChatContext } from "@/contexts/ChatContext";

interface DateRangeCalendarProps {
  origin: string;
  destination: string;
  pax: number;
  class_type: string;
  min_date?: string;
  preselected_departure?: string;
  preselected_return?: string;
  disabled?: boolean;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseLocalDate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date) {
  return d > start && d < end;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MonthGrid({
  year,
  month,
  departure,
  returnDate,
  hovered,
  minDate,
  onDayClick,
  onDayHover,
}: {
  year: number;
  month: number;
  departure: Date | null;
  returnDate: Date | null;
  hovered: Date | null;
  minDate: Date;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

  const rangeEnd = returnDate ?? hovered;

  return (
    <div className="flex-1 min-w-0">
      <div className="text-center font-semibold text-sm mb-3 text-gray-800">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isPast = d < minDate && !sameDay(d, minDate);
          const isStart = departure && sameDay(d, departure);
          const isEnd = returnDate && sameDay(d, returnDate);
          const isHoveredEnd = !returnDate && hovered && departure && sameDay(d, hovered) && hovered > departure;
          const inRange = departure && rangeEnd && rangeEnd > departure && isBetween(d, departure, rangeEnd);

          let cls = "relative h-8 flex items-center justify-center text-sm cursor-pointer select-none ";
          if (isPast) {
            cls += "text-gray-300 cursor-not-allowed ";
          } else if (isStart || isEnd) {
            cls += "bg-green-600 text-white font-semibold rounded-full z-10 ";
          } else if (isHoveredEnd) {
            cls += "bg-green-100 text-green-800 font-semibold rounded-full z-10 ";
          } else if (inRange) {
            cls += "bg-green-50 text-green-800 ";
          } else {
            cls += "text-gray-800 hover:bg-green-50 rounded-full ";
          }

          return (
            <div
              key={i}
              className={cls}
              onClick={() => !isPast && onDayClick(d)}
              onMouseEnter={() => !isPast && onDayHover(d)}
              onMouseLeave={() => onDayHover(null)}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangeCalendar({
  origin,
  destination,
  pax,
  class_type,
  min_date,
  preselected_departure,
  preselected_return,
  disabled = false,
}: DateRangeCalendarProps) {
  const { sendMessage } = useChatContext();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = min_date ? parseLocalDate(min_date) : today;

  const initDeparture = preselected_departure ? parseLocalDate(preselected_departure) : null;
  const initReturn = preselected_return ? parseLocalDate(preselected_return) : null;

  const [departure, setDeparture] = useState<Date | null>(initDeparture);
  const [returnDate, setReturnDate] = useState<Date | null>(initReturn);
  const [hovered, setHovered] = useState<Date | null>(null);

  const initAnchor = initDeparture ?? minDate;
  const [viewYear, setViewYear] = useState(initAnchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initAnchor.getMonth());

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const handleDayClick = useCallback(
    (d: Date) => {
      if (!departure || (departure && returnDate)) {
        setDeparture(d);
        setReturnDate(null);
      } else {
        if (d > departure) {
          setReturnDate(d);
        } else {
          setDeparture(d);
          setReturnDate(null);
        }
      }
    },
    [departure, returnDate]
  );

  const prevDisabled = viewYear === minDate.getFullYear() && viewMonth <= minDate.getMonth();

  const handlePrev = () => {
    if (prevDisabled) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const handleNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleConfirm = () => {
    if (!departure) return;
    const depStr = departure.toLocaleDateString("en-GB", { day: "short", month: "short", year: "numeric" });
    if (returnDate) {
      const retStr = returnDate.toLocaleDateString("en-GB", { day: "short", month: "short", year: "numeric" });
      sendMessage(`I'll leave on ${depStr} and return on ${retStr}.`);
    } else {
      sendMessage(`I'm departing on ${depStr}.`);
    }
  };

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden w-full max-w-xl${disabled ? " opacity-60 pointer-events-none select-none" : ""}`}>
      <div className="bg-green-600 px-5 py-3 text-white">
        <div className="text-xs font-medium opacity-80 mb-0.5">{origin} → {destination} · {pax} pax · {class_type}</div>
        <div className="flex gap-4 text-sm">
          <span>
            <span className="opacity-70 text-xs">Departure</span>
            <div className="font-semibold">{departure ? departure.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
          </span>
          {returnDate && (
            <span>
              <span className="opacity-70 text-xs">Return</span>
              <div className="font-semibold">{returnDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrev}
            disabled={prevDisabled}
            className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={handleNext} className="p-1.5 rounded-full hover:bg-gray-100">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex gap-6">
          <MonthGrid
            year={viewYear} month={viewMonth}
            departure={departure} returnDate={returnDate} hovered={hovered}
            minDate={minDate} onDayClick={handleDayClick} onDayHover={setHovered}
          />
          <div className="w-px bg-gray-100 self-stretch" />
          <MonthGrid
            year={nextYear} month={nextMonth}
            departure={departure} returnDate={returnDate} hovered={hovered}
            minDate={minDate} onDayClick={handleDayClick} onDayHover={setHovered}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {!departure ? "Click a date to set departure" : !returnDate ? "Click another date for return, or confirm one-way" : "Click any date to reset and re-select"}
          </p>
          <button
            onClick={handleConfirm}
            disabled={!departure}
            className="shrink-0 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
          >
            Confirm dates
          </button>
        </div>
      </div>
    </div>
  );
}
