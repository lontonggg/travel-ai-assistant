from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.booking_service import get_booking, get_booking_by_pnr
from app.services.seat_service import get_seat_map

router = APIRouter()


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    booking = await get_booking(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/bookings/pnr/{pnr}")
async def get_booking_by_pnr_route(pnr: str, db: AsyncSession = Depends(get_db)):
    booking = await get_booking_by_pnr(db, pnr)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/flights/{flight_id}/seats")
async def get_flight_seats(flight_id: int, db: AsyncSession = Depends(get_db)):
    seat_map = await get_seat_map(db, flight_id)
    return seat_map
