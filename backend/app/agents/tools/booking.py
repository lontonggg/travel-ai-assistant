import json
from typing import Any, Optional

from sqlalchemy import select

from app.data.airlines import BUSINESS_CLASS_AIRLINES
from app.db.database import AsyncSessionLocal
from app.db.models import Flight
from app.services.booking_service import create_booking, get_booking
from app.services.seat_service import get_seat_map, hold_seat

# Low-cost carriers — cabin-only baggage by default
BUDGET_AIRLINES = {"JT", "QG", "TR", "3K", "FD", "AK", "OD"}

# Prices in USD
BAGGAGE_TIERS = {
    "budget": [
        {"kg": 0,  "label": "Cabin only (7 kg)", "price": 0},
        {"kg": 20, "label": "Add 20 kg checked", "price": 10},
        {"kg": 30, "label": "Add 30 kg checked", "price": 16},
    ],
    "fullservice": [
        {"kg": 20, "label": "20 kg included",    "price": 0},
        {"kg": 30, "label": "Upgrade to 30 kg",  "price": 10},
    ],
}

# Prices in USD
INSURANCE_OPTIONS = [
    {
        "id": "travel_protection",
        "label": "Travel Protection",
        "description": "Medical emergencies, trip cancellation up to $600",
        "price_per_person": 3,
        "price_one_way": 3,
        "price_round_trip": 5,
        "icon": "shield",
    },
    {
        "id": "baggage_protection",
        "label": "Baggage Protection",
        "description": "Lost, damaged, or delayed baggage up to $300",
        "price_per_person": 2,
        "price_one_way": 2,
        "price_round_trip": 3,
        "icon": "luggage",
    },
    {
        "id": "flight_delay",
        "label": "Flight Delay Cover",
        "description": "Compensation for delays over 4 hours (up to $30)",
        "price_per_person": 1,
        "price_one_way": 1,
        "price_round_trip": 2,
        "icon": "clock",
    },
]


def _baggage_tier(airline_code: str) -> str:
    return "budget" if airline_code in BUDGET_AIRLINES else "fullservice"


async def _fetch_flight(flight_id: int) -> Optional[Flight]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Flight).where(Flight.id == flight_id))
        return result.scalar_one_or_none()


async def get_seat_map_tool(flight_id: int, pax: int = 1, booking_id: Optional[int] = None) -> dict[str, Any]:
    """Get the seat map for a flight showing available, taken, and selected seats.

    Args:
        flight_id: The numeric flight ID
        pax: Number of passengers (used to allow multi-seat selection)
        booking_id: Optional booking ID to highlight already-selected seats
    """
    async with AsyncSessionLocal() as db:
        seat_map = await get_seat_map(db, flight_id, booking_id)
        result = await db.execute(select(Flight).where(Flight.id == flight_id))
        flight = result.scalar_one_or_none()

    props = {
        **seat_map,
        "pax": pax,
        "price_economy": flight.price_economy if flight else None,
        "price_business": flight.price_business if flight else None,
        "business_available": (flight.airline_code in BUSINESS_CLASS_AIRLINES) if flight else True,
        "flight_number": flight.flight_number if flight else None,
        "flight_label": f"{flight.flight_number} · {flight.origin}→{flight.destination}" if flight else None,
    }
    return {"result": {**seat_map, "pax": pax}, "ui": {"kind": "seat_map", "props": props}}


async def hold_seat_tool(
    flight_id: int,
    seats: str,
    pax: int = 1,
    passenger_names: str = "",
    booking_id: Optional[int] = None,
) -> dict[str, Any]:
    """Hold/reserve seats for all passengers and show per-passenger baggage options.

    Args:
        flight_id: The numeric flight ID
        seats: Comma-separated seat codes for all passengers, e.g. '5B,5C'
        pax: Number of passengers (used for per-passenger baggage UI)
        passenger_names: Comma-separated passenger first names, e.g. 'Reyhan,Dien'
        booking_id: Optional booking ID to associate the hold with
    """
    seat_list = [s.strip() for s in seats.split(",") if s.strip()]
    name_list = [n.strip() for n in passenger_names.split(",") if n.strip()]

    async with AsyncSessionLocal() as db:
        for seat in seat_list:
            success = await hold_seat(db, flight_id, seat, booking_id)
            if not success:
                return {
                    "result": {"success": False, "seat": seat},
                    "ui": {"kind": "error_message", "props": {"message": f"Seat {seat} is unavailable. Please choose another."}},
                }

    flight = await _fetch_flight(flight_id)
    tier = _baggage_tier(flight.airline_code) if flight else "budget"
    label = f"{flight.airline_name} ({flight.origin}→{flight.destination})" if flight else "Flight"

    return {
        "result": {"success": True, "seats": seat_list, "flight_id": flight_id},
        "ui": {
            "kind": "baggage_options",
            "props": {
                "flight_id": flight_id,
                "leg_label": label,
                "pax": pax,
                "passenger_names": name_list,
                "options": BAGGAGE_TIERS[tier],
                "origin": flight.origin if flight else None,
                "destination": flight.destination if flight else None,
            },
        },
    }


async def show_insurance_tool(
    pax: int = 1,
    is_round_trip: bool = False,
    origin: str = "",
    destination: str = "",
) -> dict[str, Any]:
    """Show 3 travel insurance options with per-person pricing and auto-calculated totals.

    Args:
        pax: Number of passengers (insurance multiplies by pax count)
        is_round_trip: True for round trips
        origin: IATA code of the outbound flight origin (for currency display)
        destination: IATA code of the outbound flight destination (for currency display)
    """
    options = [
        {
            "id": opt["id"],
            "label": opt["label"],
            "description": opt["description"],
            "price_per_person": opt["price_round_trip"] if is_round_trip else opt["price_one_way"],
            "icon": opt["icon"],
        }
        for opt in INSURANCE_OPTIONS
    ]
    props = {
        "pax": pax,
        "options": options,
        "is_round_trip": is_round_trip,
        "origin": origin,
        "destination": destination,
    }
    return {"result": props, "ui": {"kind": "insurance_options", "props": props}}


async def show_passenger_form_tool(pax: int = 1) -> dict[str, Any]:
    """Show the passenger information form.

    Args:
        pax: Number of passengers
    """
    return {"result": {"pax": pax}, "ui": {"kind": "passenger_form", "props": {"pax": pax}}}


async def create_booking_draft_tool(
    flight_id: int,
    class_type: str,
    passengers: list[dict[str, Any]],
    travel_date: str = "",
    outbound_baggage_kg: int = 0,
    outbound_baggage_price: float = 0.0,
    return_baggage_kg: int = 0,
    return_baggage_price: float = 0.0,
    insurance_types: Optional[list[str]] = None,
    insurance_price: float = 0.0,
    return_flight_id: Optional[int] = None,
    return_travel_date: str = "",
    return_seat: str = "",
) -> dict[str, Any]:
    """Create a booking draft with all collected details.

    Args:
        flight_id: Outbound flight ID
        class_type: 'economy' or 'business'
        passengers: List of dicts with name, dob, passport_or_id, seat
        travel_date: Outbound travel date YYYY-MM-DD
        outbound_baggage_kg: Outbound checked baggage kg (0 = cabin only)
        outbound_baggage_price: Outbound baggage add-on price in IDR
        return_baggage_kg: Return checked baggage kg
        return_baggage_price: Return baggage add-on price in IDR
        insurance_types: List of selected insurance IDs, e.g. ['travel_insurance', 'baggage_loss']
        insurance_price: Total insurance price in IDR
        return_flight_id: Return flight ID for round trips
        return_travel_date: Return travel date YYYY-MM-DD
    """
    async with AsyncSessionLocal() as db:
        booking = await create_booking(
            db, flight_id, class_type, passengers,
            travel_date or None,
            return_flight_id=return_flight_id or None,
            return_travel_date=return_travel_date or None,
        )

    # Compute price breakdown
    out_flight = await _fetch_flight(flight_id)
    ret_flight = await _fetch_flight(return_flight_id) if return_flight_id else None

    pax_count = len(passengers)
    is_round_trip = ret_flight is not None

    out_unit = (out_flight.price_economy if class_type == "economy" else out_flight.price_business) if out_flight else 0
    ret_unit = (ret_flight.price_economy if class_type == "economy" else ret_flight.price_business) if ret_flight else 0
    outbound_ticket_price = float(out_unit * pax_count)
    return_ticket_price = float(ret_unit * pax_count)
    base_amount = outbound_ticket_price + return_ticket_price

    addon_total = float(outbound_baggage_price) + float(return_baggage_price)

    # Build insurance lines with correct per-option prices from source of truth
    is_rt = return_flight_id is not None
    ins_map = {opt["id"]: opt for opt in INSURANCE_OPTIONS}
    selected_insurance = [
        {
            "id": t,
            "label": ins_map[t]["label"] if t in ins_map else t,
            "price": (ins_map[t]["price_round_trip"] if is_rt else ins_map[t]["price_one_way"]) if t in ins_map else 0,
        }
        for t in (insurance_types or [])
    ]
    # Recompute from source of truth so agent rounding errors don't propagate
    insurance_price = float(sum(line["price"] for line in selected_insurance))
    grand_total = base_amount + addon_total + insurance_price

    # Persist total and all add-on data to DB
    async with AsyncSessionLocal() as db:
        from app.db.models import Booking as BookingModel
        result = await db.execute(select(BookingModel).where(BookingModel.id == booking["id"]))
        b = result.scalar_one_or_none()
        if b:
            b.total_amount = grand_total
            b.outbound_ticket_price = outbound_ticket_price
            b.return_ticket_price = return_ticket_price if is_round_trip else None
            b.outbound_baggage_kg = outbound_baggage_kg
            b.outbound_baggage_price = float(outbound_baggage_price)
            b.return_baggage_kg = return_baggage_kg if is_round_trip else None
            b.return_baggage_price = float(return_baggage_price) if is_round_trip else None
            b.selected_insurance_json = json.dumps(selected_insurance)
            await db.commit()

    summary = {
        **booking,
        "total_amount": grand_total,
        "grand_total": grand_total,
        "base_amount": base_amount,
        "outbound_ticket_price": outbound_ticket_price,
        "return_ticket_price": return_ticket_price if is_round_trip else None,
        "outbound_baggage_kg": outbound_baggage_kg,
        "outbound_baggage_price": float(outbound_baggage_price),
        "return_baggage_kg": return_baggage_kg if is_round_trip else None,
        "return_baggage_price": float(return_baggage_price) if is_round_trip else None,
        "selected_insurance": selected_insurance,
        "insurance_price": float(insurance_price),
        "is_round_trip": is_round_trip,
        "return_seat": return_seat or None,
        "outbound_flight_label": f"{out_flight.origin}→{out_flight.destination}" if out_flight else "",
        "return_flight_label": f"{ret_flight.origin}→{ret_flight.destination}" if ret_flight else "",
    }
    return {"result": summary, "ui": {"kind": "order_summary", "props": summary}}


async def get_booking_tool(booking_id: int) -> dict[str, Any]:
    """Retrieve an existing booking by ID."""
    async with AsyncSessionLocal() as db:
        booking = await get_booking(db, booking_id)
    if not booking:
        return {
            "result": {"error": f"Booking {booking_id} not found"},
            "ui": {"kind": "error_message", "props": {"message": f"Booking {booking_id} not found"}},
        }
    return {"result": booking, "ui": {"kind": "booking_summary", "props": booking}}
