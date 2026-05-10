import json
import random
import string
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Booking, Flight, Passenger


def _make_pnr() -> str:
    return "".join(random.choices(string.ascii_uppercase, k=6))


def _overlay_date(dt: datetime, travel_date: str | None) -> str:
    if not travel_date:
        return dt.isoformat()
    try:
        from datetime import date as date_type
        d = datetime.strptime(travel_date, "%Y-%m-%d").date()
        fixed = dt.replace(year=d.year, month=d.month, day=d.day)
        return fixed.isoformat()
    except Exception:
        return dt.isoformat()


async def create_booking(
    db: AsyncSession,
    flight_id: int,
    class_type: str,
    passengers: list[dict[str, Any]],
    travel_date: str | None = None,
    return_flight_id: int | None = None,
    return_travel_date: str | None = None,
) -> dict[str, Any]:
    result = await db.execute(select(Flight).where(Flight.id == flight_id))
    flight = result.scalar_one_or_none()
    if not flight:
        raise ValueError(f"Flight {flight_id} not found")

    return_flight = None
    if return_flight_id:
        result = await db.execute(select(Flight).where(Flight.id == return_flight_id))
        return_flight = result.scalar_one_or_none()
        if not return_flight:
            raise ValueError(f"Return flight {return_flight_id} not found")

    def _supports_business(f: Flight) -> bool:
        return f.airline_code in {"GA", "ID"}

    class_type = class_type.lower()
    if class_type not in {"economy", "business"}:
        class_type = "economy"
    if class_type == "business" and not _supports_business(flight):
        class_type = "economy"
    if return_flight and class_type == "business" and not _supports_business(return_flight):
        class_type = "economy"

    price = flight.price_economy if class_type == "economy" else flight.price_business
    if return_flight:
        return_price = return_flight.price_economy if class_type == "economy" else return_flight.price_business
        price += return_price
    total = price * len(passengers)

    booking = Booking(
        pnr=_make_pnr(),
        flight_id=flight_id,
        return_flight_id=return_flight_id,
        class_type=class_type,
        status="pending",
        total_amount=total,
        travel_date=travel_date,
        return_travel_date=return_travel_date,
    )
    db.add(booking)
    await db.flush()

    for idx, p in enumerate(passengers):
        passenger = Passenger(
            booking_id=booking.id,
            name=p.get("name", ""),
            email=p.get("email"),
            dob=p.get("dob"),
            passport_or_id=p.get("passport_or_id"),
            seat=p.get("seat"),
            is_primary=(idx == 0),
        )
        db.add(passenger)

    await db.commit()
    await db.refresh(booking)
    return await _booking_to_dict(db, booking)


async def get_booking(db: AsyncSession, booking_id: int) -> Optional[dict[str, Any]]:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers), selectinload(Booking.flight), selectinload(Booking.return_flight))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        return None
    return await _booking_to_dict(db, booking)


async def get_booking_by_pnr(db: AsyncSession, pnr: str) -> Optional[dict[str, Any]]:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers), selectinload(Booking.flight), selectinload(Booking.return_flight))
        .where(Booking.pnr == pnr.upper())
    )
    booking = result.scalar_one_or_none()
    if not booking:
        return None
    return await _booking_to_dict(db, booking)


async def update_booking_status(db: AsyncSession, booking_id: int, status: str) -> Optional[dict[str, Any]]:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        return None
    booking.status = status
    await db.commit()
    await db.refresh(booking)
    return await _booking_to_dict(db, booking)


async def _booking_to_dict(db: AsyncSession, booking: Booking) -> dict[str, Any]:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers), selectinload(Booking.flight), selectinload(Booking.return_flight))
        .where(Booking.id == booking.id)
    )
    b = result.scalar_one()

    passengers_data = [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "dob": p.dob,
            "passport_or_id": p.passport_or_id,
            "seat": p.seat,
            "is_primary": p.is_primary,
        }
        for p in b.passengers
    ]

    def _flight_data(flight: Flight, travel_date: str | None) -> dict[str, Any]:
        return {
            "id": flight.id,
            "flight_number": flight.flight_number,
            "airline_name": flight.airline_name,
            "airline_code": flight.airline_code,
            "aircraft_type": flight.aircraft_type,
            "origin": flight.origin,
            "destination": flight.destination,
            "departure_time": _overlay_date(flight.departure_time, travel_date),
            "arrival_time": _overlay_date(flight.arrival_time, travel_date),
            "duration_minutes": flight.duration_minutes,
        }

    flight_data = None
    return_flight_data = None
    base_amount = None
    if b.flight:
        f = b.flight
        unit_price = f.price_economy if b.class_type == "economy" else f.price_business
        if b.return_flight:
            return_unit_price = (
                b.return_flight.price_economy
                if b.class_type == "economy"
                else b.return_flight.price_business
            )
            unit_price += return_unit_price
        base_amount = unit_price * len(passengers_data)
        flight_data = _flight_data(f, b.travel_date)

    if b.return_flight:
        return_flight_data = _flight_data(b.return_flight, b.return_travel_date)

    selected_insurance = json.loads(b.selected_insurance_json) if b.selected_insurance_json else []

    return {
        "id": b.id,
        "pnr": b.pnr,
        "flight_id": b.flight_id,
        "return_flight_id": b.return_flight_id,
        "class_type": b.class_type,
        "status": b.status,
        "total_amount": b.total_amount,
        "base_amount": base_amount,
        "outbound_ticket_price": b.outbound_ticket_price,
        "return_ticket_price": b.return_ticket_price,
        "outbound_baggage_kg": b.outbound_baggage_kg,
        "outbound_baggage_price": b.outbound_baggage_price,
        "return_baggage_kg": b.return_baggage_kg,
        "return_baggage_price": b.return_baggage_price,
        "selected_insurance": selected_insurance,
        "is_round_trip": b.return_flight_id is not None,
        "travel_date": b.travel_date,
        "return_travel_date": b.return_travel_date,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "passengers": passengers_data,
        "flight": flight_data,
        "return_flight": return_flight_data,
    }
