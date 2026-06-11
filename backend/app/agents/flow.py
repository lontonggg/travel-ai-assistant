"""Deterministic booking-flow state machine.

The phase is ALWAYS computed here, in code, from explicit slots in
`session.state` — never guessed by the LLM from conversation history.
`parse_user_message` extracts those slots from the natural-language
messages the existing frontend UI-blocks already send, so no frontend
rewrite is required.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Any


class Phase(str, Enum):
    BASICS = "basics"
    PASSENGER_FORM = "passenger_form"
    DATE_PICKER = "date_picker"
    OUTBOUND_SEARCH = "outbound_search"
    OUTBOUND_SEAT = "outbound_seat"
    OUTBOUND_BAGGAGE = "outbound_baggage"
    OUTBOUND_INSURANCE = "outbound_insurance"
    RETURN_SEARCH = "return_search"
    RETURN_SEAT = "return_seat"
    RETURN_BAGGAGE = "return_baggage"
    RETURN_INSURANCE = "return_insurance"
    ORDER_SUMMARY = "order_summary"
    PAYMENT = "payment"
    DONE = "done"


# Tools allowed to be called while in a given phase. Anything else is
# blocked by the before_tool_callback guard in booking_agent.py.
PHASE_TOOLS: dict[Phase, set[str]] = {
    Phase.BASICS: {"set_trip_basics_tool"},
    Phase.PASSENGER_FORM: {"show_passenger_form_tool"},
    Phase.DATE_PICKER: {"show_date_picker_tool"},
    Phase.OUTBOUND_SEARCH: {"search_flights_tool"},
    Phase.OUTBOUND_SEAT: {"get_seat_map_tool"},
    Phase.OUTBOUND_BAGGAGE: {"hold_seat_tool"},
    Phase.OUTBOUND_INSURANCE: {"show_insurance_tool"},
    Phase.RETURN_SEARCH: {"search_flights_tool"},
    Phase.RETURN_SEAT: {"get_seat_map_tool"},
    Phase.RETURN_BAGGAGE: {"hold_seat_tool"},
    Phase.RETURN_INSURANCE: {"show_insurance_tool"},
    Phase.ORDER_SUMMARY: {"create_booking_draft_tool"},
    Phase.PAYMENT: {"show_payment_form_tool", "process_payment_tool"},
    Phase.DONE: set(),
}

# Always allowed regardless of phase (read-only / informational).
UNIVERSAL_TOOLS: set[str] = {"get_booking_tool", "get_flight_details_tool"}

# Step grouping for the frontend progress tracker.
_PROGRESS_STEPS_ONE_WAY: list[list[Phase]] = [
    [Phase.BASICS],
    [Phase.PASSENGER_FORM],
    [Phase.DATE_PICKER],
    [Phase.OUTBOUND_SEARCH, Phase.OUTBOUND_SEAT, Phase.OUTBOUND_BAGGAGE, Phase.OUTBOUND_INSURANCE],
    [Phase.ORDER_SUMMARY],
    [Phase.PAYMENT],
    [Phase.DONE],
]
_PROGRESS_STEPS_ROUND_TRIP: list[list[Phase]] = [
    [Phase.BASICS],
    [Phase.PASSENGER_FORM],
    [Phase.DATE_PICKER],
    [Phase.OUTBOUND_SEARCH, Phase.OUTBOUND_SEAT, Phase.OUTBOUND_BAGGAGE, Phase.OUTBOUND_INSURANCE],
    [Phase.RETURN_SEARCH, Phase.RETURN_SEAT, Phase.RETURN_BAGGAGE, Phase.RETURN_INSURANCE],
    [Phase.ORDER_SUMMARY],
    [Phase.PAYMENT],
    [Phase.DONE],
]

_PROGRESS_LABELS_ONE_WAY = ["Trip basics", "Passengers", "Dates", "Flight & extras", "Review", "Payment", "Done"]
_PROGRESS_LABELS_ROUND_TRIP = ["Trip basics", "Passengers", "Dates", "Outbound flight", "Return flight", "Review", "Payment", "Done"]


def progress_info(phase: Phase, state: dict[str, Any]) -> dict[str, Any]:
    """Returns {step, total, label} for the frontend progress tracker."""
    round_trip = bool(state.get("round_trip"))
    steps = _PROGRESS_STEPS_ROUND_TRIP if round_trip else _PROGRESS_STEPS_ONE_WAY
    labels = _PROGRESS_LABELS_ROUND_TRIP if round_trip else _PROGRESS_LABELS_ONE_WAY
    for i, group in enumerate(steps):
        if phase in group:
            return {"step": i + 1, "total": len(steps), "label": labels[i]}
    return {"step": len(steps), "total": len(steps), "label": labels[-1]}


def compute_phase(state: dict[str, Any]) -> Phase:
    """Pure function: derive the current phase from explicit state slots."""
    if not (state.get("origin") and state.get("destination") and state.get("pax")):
        return Phase.BASICS
    if not state.get("passengers_submitted"):
        return Phase.PASSENGER_FORM
    if not state.get("departure_date"):
        return Phase.DATE_PICKER
    if not state.get("outbound_flight_id"):
        return Phase.OUTBOUND_SEARCH
    if not state.get("outbound_seats"):
        return Phase.OUTBOUND_SEAT
    if not state.get("outbound_baggage_done"):
        return Phase.OUTBOUND_BAGGAGE
    if not state.get("outbound_insurance_done"):
        return Phase.OUTBOUND_INSURANCE
    if state.get("round_trip"):
        if not state.get("return_flight_id"):
            return Phase.RETURN_SEARCH
        if not state.get("return_seats"):
            return Phase.RETURN_SEAT
        if not state.get("return_baggage_done"):
            return Phase.RETURN_BAGGAGE
        if not state.get("return_insurance_done"):
            return Phase.RETURN_INSURANCE
    if not state.get("booking_id"):
        return Phase.ORDER_SUMMARY
    if not state.get("order_confirmed"):
        return Phase.ORDER_SUMMARY
    if not state.get("payment_status"):
        return Phase.PAYMENT
    return Phase.DONE


_SYSTEM_PREFIX_RE = re.compile(r"^\[System context.*?\]\n\n", re.DOTALL)


def _clean_text(text: str) -> str:
    return _SYSTEM_PREFIX_RE.sub("", text).strip()


_DATE_RE = re.compile(
    r"Departure date:\s*(\d{4}-\d{2}-\d{2})(?:,\s*return date:\s*(\d{4}-\d{2}-\d{2}))?\.\s*(Round-trip|One-way)",
    re.IGNORECASE,
)
_FLIGHT_PICK_RE = re.compile(r"I'?d like to book flight\s+\S+\s+\(ID:\s*(\d+)\)", re.IGNORECASE)
_SEAT_RE = re.compile(r"(?:I'?d like seat|Seat selection:)\s*([A-Za-z0-9,\s]+)\.", re.IGNORECASE)
_SEAT_CODE_RE = re.compile(r"\d+[A-Za-z]")
_PAYMENT_METHOD_RE = re.compile(r"I'?d like to pay with (credit card|debit card|QRIS)", re.IGNORECASE)


def parse_user_message(text: str, state: Any, phase_before: Phase) -> None:
    """Extract structured slots from the user's (frontend-generated) message
    and write them into `state` (an ADK State-like object supporting __setitem__).

    `phase_before` is the phase computed BEFORE this message is applied —
    it disambiguates outbound vs return updates (the same message formats
    are reused for both legs).
    """
    if not text:
        return
    clean = _clean_text(text)

    # Passenger form submission
    if "Passenger details:" in clean or clean.startswith("My details:"):
        state["passengers_submitted"] = True
        return

    # Date picker submission
    m = _DATE_RE.search(clean)
    if m:
        state["departure_date"] = m.group(1)
        if m.group(2):
            state["return_date"] = m.group(2)
        state["round_trip"] = m.group(3).lower() == "round-trip"
        return

    # Flight selection (outbound or return depending on current phase)
    m = _FLIGHT_PICK_RE.search(clean)
    if m:
        flight_id = int(m.group(1))
        if phase_before == Phase.RETURN_SEARCH:
            state["return_flight_id"] = flight_id
        else:
            state["outbound_flight_id"] = flight_id
        return

    # Seat selection (outbound or return depending on current phase)
    m = _SEAT_RE.search(clean)
    if m:
        seats = _SEAT_CODE_RE.findall(m.group(1))
        if seats:
            if phase_before == Phase.RETURN_SEAT:
                state["return_seats"] = seats
            else:
                state["outbound_seats"] = seats
            return

    # Baggage confirmation
    if clean.startswith("I'll go with") or clean.startswith("Baggage"):
        if phase_before == Phase.RETURN_BAGGAGE:
            state["return_baggage_done"] = True
        else:
            state["outbound_baggage_done"] = True
        return

    # Insurance confirmation / skip
    if "Total insurance:" in clean or clean.startswith("No insurance, thanks"):
        if phase_before == Phase.RETURN_INSURANCE:
            state["return_insurance_done"] = True
        else:
            state["outbound_insurance_done"] = True
        return

    # Order summary confirmation / change request
    if clean == "I confirm my order. Please proceed to payment.":
        state["order_confirmed"] = True
        return
    if clean == "I'd like to make a change to my order.":
        state["wants_changes"] = True
        return

    # Payment method selection (informational — agent also reads it from text)
    m = _PAYMENT_METHOD_RE.search(clean)
    if m:
        method_map = {"credit card": "credit_card", "debit card": "debit_card", "qris": "qris"}
        state["payment_method"] = method_map.get(m.group(1).lower(), "credit_card")
        return


_PHASE_INSTRUCTIONS: dict[Phase, str] = {
    Phase.BASICS: (
        "CURRENT PHASE: Basics. Ask ONLY for whatever is still missing among: origin, destination, "
        "pax count (and class, default economy). Resolve city/country names to IATA codes from the "
        "airport list. Do NOT ask about dates — those are handled visually later. Once origin, "
        "destination, pax and class are all known, call set_trip_basics_tool(origin, destination, pax, "
        "class_type) — this is the ONLY tool you may call in this phase. After it succeeds, immediately "
        "continue to the next phase's action in the same turn."
    ),
    Phase.PASSENGER_FORM: (
        "CURRENT PHASE: Passenger form. Call show_passenger_form_tool(pax=N). Reply briefly: "
        "\"Let's get to know everyone flying — please fill in the details below.\""
    ),
    Phase.DATE_PICKER: (
        "CURRENT PHASE: Date picker. Call show_date_picker_tool(origin, destination, pax, class_type, "
        "trip_type=\"outbound\"), including preselected_departure/preselected_return if the user already "
        "mentioned dates earlier. Reply: \"Great. When are you planning to travel?\" (or, if dates were "
        "pre-filled: \"I've pre-filled the dates you mentioned — just confirm or adjust below.\")"
    ),
    Phase.OUTBOUND_SEARCH: (
        "CURRENT PHASE: Outbound flight search. Call search_flights_tool(origin, destination, date, pax, "
        "class_type, trip_type=\"outbound\") using the departure date the user picked. Reply: \"Here are "
        "the flights for your departure — pick the one that works best.\""
    ),
    Phase.OUTBOUND_SEAT: (
        "CURRENT PHASE: Outbound seat selection. Call get_seat_map_tool(flight_id, pax) for the outbound "
        "flight the user picked. Reply: \"Nice choice! Now let's pick your seats.\""
    ),
    Phase.OUTBOUND_BAGGAGE: (
        "CURRENT PHASE: Outbound baggage. Call hold_seat_tool(flight_id, seats, pax, passenger_names) for "
        "the outbound flight — seats is comma-separated (e.g. '5B,5C'), passenger_names is comma-separated "
        "first names from the passenger form. Reply: \"Seats locked in. How much baggage will each of you "
        "bring?\""
    ),
    Phase.OUTBOUND_INSURANCE: (
        "CURRENT PHASE: Outbound insurance. Call show_insurance_tool(pax, is_round_trip, origin, "
        "destination) for the outbound leg. Reply: \"Want a little extra peace of mind? Here are some "
        "optional travel covers.\""
    ),
    Phase.RETURN_SEARCH: (
        "CURRENT PHASE: Return flight search. Call search_flights_tool with origin/destination swapped, "
        "the return date, trip_type=\"return\". Reply: \"Now let's find your way back — here are the "
        "return flights.\""
    ),
    Phase.RETURN_SEAT: (
        "CURRENT PHASE: Return seat selection. Call get_seat_map_tool(flight_id, pax) for the return "
        "flight. Reply: \"Pick your seats for the return trip.\""
    ),
    Phase.RETURN_BAGGAGE: (
        "CURRENT PHASE: Return baggage. Call hold_seat_tool for the return flight (same args as outbound "
        "baggage but with the return flight_id and seats). Reply: \"Got it. How about baggage for the "
        "return flight?\""
    ),
    Phase.RETURN_INSURANCE: (
        "CURRENT PHASE: Return insurance. Call show_insurance_tool(pax, is_round_trip=true, origin, "
        "destination) for the return leg. Reply: \"Same deal — any travel covers for the return?\""
    ),
}


def phase_instruction(phase: Phase, state: dict[str, Any]) -> str:
    """Return the per-phase instruction text to inject this turn."""
    if phase == Phase.ORDER_SUMMARY:
        if not state.get("booking_id"):
            return (
                "CURRENT PHASE: Order summary. Call create_booking_draft_tool with ALL collected info "
                "(passengers list with name, dob, passport_or_id, seat, email; flight_id; return_flight_id "
                "if round-trip; dates; baggage; insurance). Reply: \"Here's everything in one place — take "
                "a look before we move to payment.\""
            )
        if state.get("wants_changes"):
            return (
                "CURRENT PHASE: Order summary (already shown, user wants changes). Do NOT call any tool. "
                "Briefly ask what they'd like to change, then help them — but note that changing flights/"
                "seats/etc. is currently not supported, so apologize if needed."
            )
        return (
            "CURRENT PHASE: Order summary (already shown, awaiting confirmation). Do NOT call any tool. "
            "Wait for the user to confirm the order."
        )
    if phase == Phase.PAYMENT:
        if not state.get("payment_method") and not state.get("payment_form_shown"):
            return (
                "CURRENT PHASE: Payment. Call show_payment_form_tool(booking_id, total_amount). Reply: "
                "\"Almost done — how would you like to pay?\""
            )
        return (
            "CURRENT PHASE: Payment. The user selected a payment method. Call "
            "process_payment_tool(booking_id, method) with method one of credit_card, debit_card, qris. "
            "Reply: \"Payment went through — your booking is confirmed! 🎉 I've sent the invoice and "
            "e-tickets to everyone's email.\""
        )
    if phase == Phase.DONE:
        return "CURRENT PHASE: Done. Payment is complete. Thank the user warmly. Do not call any tool."
    return _PHASE_INSTRUCTIONS[phase]
