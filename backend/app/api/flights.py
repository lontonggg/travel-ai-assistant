from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.flight_service import get_flight_by_id, search_flights

router = APIRouter()


@router.get("/flights")
async def get_flights(
    origin: str,
    destination: str,
    date: str,
    pax: int = 1,
    class_type: str = "economy",
    db: AsyncSession = Depends(get_db),
):
    flights = await search_flights(db, origin, destination, date, pax, class_type)
    return {"flights": flights, "count": len(flights)}


@router.get("/flights/{flight_id}")
async def get_flight(flight_id: int, db: AsyncSession = Depends(get_db)):
    flight = await get_flight_by_id(db, flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight
