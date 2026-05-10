"use client";

import type { ComponentProps } from "react";
import type { UiComponentEvent } from "@/lib/types";
import FlightCarousel from "@/components/ui-blocks/FlightCarousel";
import SeatMap from "@/components/ui-blocks/SeatMap";
import PassengerForm from "@/components/ui-blocks/PassengerForm";
import BaggageOptions from "@/components/ui-blocks/BaggageOptions";
import InsuranceOptions from "@/components/ui-blocks/InsuranceOptions";
import PaymentForm from "@/components/ui-blocks/PaymentForm";
import BookingSummary from "@/components/ui-blocks/BookingSummary";
import PaymentSuccess from "@/components/ui-blocks/PaymentSuccess";
import DateRangeCalendar from "@/components/ui-blocks/DateRangeCalendar";

export default function ToolMessage({ event, disabled = false }: { event: UiComponentEvent; disabled?: boolean }) {
  const { kind, props } = event;
  const p = props as Record<string, unknown>;

  switch (kind) {
    case "date_range_calendar":
      return <DateRangeCalendar {...(p as unknown as ComponentProps<typeof DateRangeCalendar>)} disabled={disabled} />;
    case "flight_carousel":
      return <FlightCarousel {...(p as unknown as ComponentProps<typeof FlightCarousel>)} disabled={disabled} />;
    case "seat_map":
      return <SeatMap {...(p as unknown as ComponentProps<typeof SeatMap>)} disabled={disabled} />;
    case "passenger_form":
      return <PassengerForm {...(p as unknown as ComponentProps<typeof PassengerForm>)} disabled={disabled} />;
    case "baggage_options":
      return <BaggageOptions {...(p as unknown as ComponentProps<typeof BaggageOptions>)} disabled={disabled} />;
    case "insurance_options":
      return <InsuranceOptions {...(p as unknown as ComponentProps<typeof InsuranceOptions>)} disabled={disabled} />;
    case "order_summary":
      return <BookingSummary {...(p as unknown as ComponentProps<typeof BookingSummary>)} showConfirm={!disabled} />;
    case "payment_form":
      return <PaymentForm {...(p as unknown as ComponentProps<typeof PaymentForm>)} disabled={disabled} />;
    case "booking_summary":
      return <BookingSummary {...(p as unknown as ComponentProps<typeof BookingSummary>)} showConfirm={false} />;
    case "payment_result":
      return <PaymentSuccess {...(p as unknown as ComponentProps<typeof PaymentSuccess>)} />;
    case "payment_processing":
      return (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
          Processing payment…
        </div>
      );
    case "email_sent": {
      const recipient = (props as { recipient?: string }).recipient ?? "the provided email";
      return (
        <div className="flex flex-col gap-1 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">
          <div className="font-semibold">Email sent</div>
          <div>{`Confirmation and receipt sent to ${recipient}.`}</div>
        </div>
      );
    }
    case "error_message": {
      const msg = (props as { message?: string }).message ?? "An error occurred.";
      return <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{msg}</div>;
    }
    default:
      return null;
  }
}
