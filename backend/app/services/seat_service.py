import random
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.airlines import BUSINESS_CLASS_AIRLINES
from app.db.models import Flight, SeatHold

# (biz_row_start, biz_row_end_inclusive, biz_cols, eco_row_start, eco_row_end_inclusive, eco_cols)
# biz_row_end=0 means no business class
AIRCRAFT_CONFIGS: dict[str, dict] = {
    # Narrow-body single-aisle 3-3
    "Boeing 737-800":    {"biz": (1, 3,  list("ABCD")),   "eco": (4,  30, list("ABCDEF"))},
    "Boeing 737-900ER":  {"biz": (1, 3,  list("ABCD")),   "eco": (4,  32, list("ABCDEF"))},
    "Airbus A320":       {"biz": (1, 3,  list("ABCD")),   "eco": (4,  29, list("ABCDEF"))},
    "Airbus A320neo":    {"biz": (1, 3,  list("ABCD")),   "eco": (4,  29, list("ABCDEF"))},
    # Regional turboprop 2-2
    "ATR 72-600":        {"biz": None,                     "eco": (1,  18, list("ABCD"))},
    # Wide-body twin-aisle
    # 777 economy is 3-4-3 (10 abreast: A B C | D E F G | H J K)
    "Boeing 777-200":    {"biz": (1, 5,  list("ABCDEF")), "eco": (6,  44, list("ABCDEFGHJK"))},
    "Boeing 777-300ER":  {"biz": (1, 6,  list("ABCDEF")), "eco": (7,  52, list("ABCDEFGHJK"))},
    "Boeing 777-200ER":  {"biz": (1, 5,  list("ABCDEF")), "eco": (6,  44, list("ABCDEFGHJK"))},
    "Airbus A330-300":   {"biz": (1, 5,  list("ABCDEF")), "eco": (6,  41, list("ABCDEFGH"))},
    "Airbus A350-900":   {"biz": (1, 5,  list("ABCD")),   "eco": (6,  45, list("ABCDEFGHJ"))},
    "Boeing 787-9":      {"biz": (1, 5,  list("ABCDEF")), "eco": (6,  41, list("ABCDEFGHJ"))},
}

_DEFAULT_CONFIG = {"biz": (1, 3, list("ABCD")), "eco": (4, 30, list("ABCDEF"))}


def _get_config(aircraft_type: str) -> dict:
    return AIRCRAFT_CONFIGS.get(aircraft_type, _DEFAULT_CONFIG)


def _all_seats(aircraft_type: str, business_available: bool) -> list[dict[str, Any]]:
    cfg = _get_config(aircraft_type)
    seats = []

    if business_available and cfg["biz"]:
        r_start, r_end, cols = cfg["biz"]
        for row in range(r_start, r_end + 1):
            for col in cols:
                seats.append({"seat": f"{row}{col}", "row": row, "col": col, "class_type": "business"})

    eco_start, eco_end, cols = cfg["eco"]
    for row in range(eco_start, eco_end + 1):
        for col in cols:
            seats.append({"seat": f"{row}{col}", "row": row, "col": col, "class_type": "economy"})

    return seats


def _seeded_taken_seats(flight_id: int, all_seats: list[dict]) -> set[str]:
    rng = random.Random(flight_id * 31337)
    total = len(all_seats)
    taken_count = rng.randint(int(total * 0.25), int(total * 0.35))
    indices = rng.sample(range(total), taken_count)
    return {all_seats[i]["seat"] for i in indices}


async def get_seat_map(db: AsyncSession, flight_id: int, booking_id: int = None) -> dict[str, Any]:
    flight_result = await db.execute(select(Flight).where(Flight.id == flight_id))
    flight = flight_result.scalar_one_or_none()

    aircraft_type = flight.aircraft_type if flight else "Airbus A320"
    business_available = bool(flight and flight.airline_code in BUSINESS_CLASS_AIRLINES)

    all_seats = _all_seats(aircraft_type, business_available)
    seeded_taken = _seeded_taken_seats(flight_id, all_seats)

    result = await db.execute(select(SeatHold).where(SeatHold.flight_id == flight_id))
    holds = result.scalars().all()
    held_seats: dict[str, int | None] = {h.seat: h.booking_id for h in holds}

    business_seats = []
    economy_seats = []

    for seat_info in all_seats:
        seat_code = seat_info["seat"]
        if seat_code in held_seats:
            booked_by = held_seats[seat_code]
            status = "selected" if (booking_id and booked_by == booking_id) else "taken"
        elif seat_code in seeded_taken:
            status = "taken"
        else:
            status = "available"

        entry = {**seat_info, "status": status}
        if seat_info["class_type"] == "business":
            business_seats.append(entry)
        else:
            economy_seats.append(entry)

    if not business_available:
        business_seats = []

    return {
        "flight_id": flight_id,
        "aircraft_type": aircraft_type,
        "business_seats": business_seats,
        "economy_seats": economy_seats,
        "business_available": business_available,
    }


async def hold_seat(db: AsyncSession, flight_id: int, seat: str, booking_id: int = None) -> bool:
    flight_result = await db.execute(select(Flight).where(Flight.id == flight_id))
    flight = flight_result.scalar_one_or_none()

    aircraft_type = flight.aircraft_type if flight else "Airbus A320"
    business_available = bool(flight and flight.airline_code in BUSINESS_CLASS_AIRLINES)

    all_seats = _all_seats(aircraft_type, business_available)
    seeded_taken = _seeded_taken_seats(flight_id, all_seats)

    if seat in seeded_taken:
        return False

    result = await db.execute(
        select(SeatHold).where(SeatHold.flight_id == flight_id, SeatHold.seat == seat)
    )
    existing = result.scalar_one_or_none()
    if existing and existing.booking_id != booking_id:
        return False

    if not existing:
        hold = SeatHold(flight_id=flight_id, seat=seat, booking_id=booking_id)
        db.add(hold)
        await db.commit()

    return True
