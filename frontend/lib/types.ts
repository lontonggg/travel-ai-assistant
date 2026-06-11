export type AgentStatusEvent = {
  type: "agent_status";
  agent: string;
  state: "thinking" | "calling_tool" | "done";
  tool?: string;
};

export type TextDeltaEvent = {
  type: "text_delta";
  delta: string;
};

export type UiComponentEvent = {
  type: "ui_component";
  kind: UiKind;
  props: Record<string, unknown>;
  message_id: string;
};

export type PhaseEvent = {
  type: "phase";
  phase: string;
  step: number;
  total: number;
  label: string;
};

export type DoneEvent = {
  type: "done";
};

export type ErrorEvent = {
  type: "error";
  message: string;
};

export type ChatEvent =
  | AgentStatusEvent
  | TextDeltaEvent
  | UiComponentEvent
  | PhaseEvent
  | DoneEvent
  | ErrorEvent;

export type UiKind =
  | "date_range_calendar"
  | "flight_carousel"
  | "flight_detail"
  | "flight_filters"
  | "passenger_form"
  | "baggage_options"
  | "insurance_options"
  | "seat_map"
  | "order_summary"
  | "booking_summary"
  | "payment_form"
  | "payment_processing"
  | "payment_result"
  | "invoice_card"
  | "ticket_card"
  | "email_sent"
  | "error_message"
  | "destination_suggestions"
  | "budget_breakdown";

export type Message = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  uiComponents?: UiComponentEvent[];
};

export type AgentStatus = {
  agent: string;
  state: "thinking" | "calling_tool" | "done";
  tool?: string;
} | null;

// ── Domain types ────────────────────────────────────────────────────────────

export type Flight = {
  id: number;
  airline_code: string;
  airline_name: string;
  flight_number: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  duration_str: string;
  price_economy: number;
  price_business: number;
  business_available?: boolean;
  aircraft_type: string;
  total_seats: number;
  badges?: string[];
};

export type DestinationSuggestion = {
  code: string;
  city: string;
  country: string;
  vibes: string[];
  round_trip_price_per_person: number;
  round_trip_total: number;
  daily_budget_usd: number;
  reason: string;
};

export type SeatInfo = {
  seat: string;
  row: number;
  col: string;
  class_type: "business" | "economy";
  status: "available" | "taken" | "held" | "selected";
};

export type SeatMapData = {
  flight_id: number;
  business_available?: boolean;
  business_seats?: SeatInfo[];
  economy_seats?: SeatInfo[];
  price_economy?: number;
  price_business?: number;
};

export type Passenger = {
  name: string;
  dob: string;
  passport_or_id: string;
  seat?: string;
};

export type Booking = {
  id: number;
  pnr: string;
  flight_id: number;
  return_flight_id?: number | null;
  class_type: string;
  status: string;
  total_amount: number;
  base_amount?: number;
  travel_date?: string | null;
  return_travel_date?: string | null;
  passengers: Passenger[];
  flight?: Flight | null;
  return_flight?: Flight | null;
};
