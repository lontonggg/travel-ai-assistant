from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.airlines import BUSINESS_CLASS_AIRLINES
from app.data.airports import AIRPORTS
from app.data.flights_seed import SEED_FLIGHTS
from app.db.database import AsyncSessionLocal
from app.db.models import Flight


async def seed_flights_if_empty() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(func.count()).select_from(Flight))
        count = result.scalar()
        if count is None:
            count = 0

        result = await db.execute(select(Flight.flight_number))
        existing_numbers = set(result.scalars().all())

        seeded = 0
        for f in SEED_FLIGHTS:
            if f["flight_number"] in existing_numbers:
                continue
            db.add(Flight(**f))
            seeded += 1

        if seeded > 0 or count == 0:
            await db.commit()


async def search_flights(
    db: AsyncSession,
    origin: str,
    destination: str,
    date: str,
    pax: int = 1,
    class_type: str = "economy",
) -> list[dict[str, Any]]:
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        target_date = datetime.now().date()

    stmt = select(Flight).where(
        Flight.origin == origin.upper(),
        Flight.destination == destination.upper(),
    )
    result = await db.execute(stmt)
    flights = result.scalars().all()

    # Overlay the requested date onto each flight's reference time,
    # so the same schedule is available for any date.
    return [_flight_to_dict(f, override_date=target_date) for f in flights]


async def get_flight_by_id(db: AsyncSession, flight_id: int) -> Optional[dict[str, Any]]:
    result = await db.execute(select(Flight).where(Flight.id == flight_id))
    flight = result.scalar_one_or_none()
    if not flight:
        return None
    return _flight_to_dict(flight)


def _flight_to_dict(f: Flight, override_date: date | None = None) -> dict[str, Any]:
    origin_info = AIRPORTS.get(f.origin, {"city": f.origin})
    dest_info = AIRPORTS.get(f.destination, {"city": f.destination})

    hours, mins = divmod(f.duration_minutes, 60)
    duration_str = f"{hours}h {mins}m" if mins else f"{hours}h"

    if override_date:
        departure = f.departure_time.replace(
            year=override_date.year, month=override_date.month, day=override_date.day
        )
        arrival = f.arrival_time.replace(
            year=override_date.year, month=override_date.month, day=override_date.day
        )
        # handle overnight flights (arrival < departure after date swap)
        from datetime import timedelta
        if arrival < departure:
            arrival += timedelta(days=1)
    else:
        departure = f.departure_time
        arrival = f.arrival_time

    return {
        "id": f.id,
        "airline_code": f.airline_code,
        "airline_name": f.airline_name,
        "flight_number": f.flight_number,
        "origin": f.origin,
        "origin_city": origin_info.get("city", f.origin),
        "destination": f.destination,
        "destination_city": dest_info.get("city", f.destination),
        "departure_time": departure.isoformat(),
        "arrival_time": arrival.isoformat(),
        "duration_minutes": f.duration_minutes,
        "duration_str": duration_str,
        "price_economy": f.price_economy,
        "price_business": f.price_business,
        "business_available": f.airline_code in BUSINESS_CLASS_AIRLINES,
        "aircraft_type": f.aircraft_type,
        "total_seats": f.total_seats,
    }
