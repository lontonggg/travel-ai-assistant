import asyncio
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Booking, Payment


async def process_payment(
    db: AsyncSession,
    booking_id: int,
    method: str,
) -> dict[str, Any]:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise ValueError(f"Booking {booking_id} not found")

    # Simulate payment processing delay
    await asyncio.sleep(2)

    payment = Payment(
        booking_id=booking_id,
        method=method,
        status="success",
        amount=booking.total_amount,
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    booking.status = "confirmed"
    await db.commit()
    await db.refresh(payment)

    return {
        "id": payment.id,
        "booking_id": booking_id,
        "method": method,
        "status": "success",
        "amount": payment.amount,
        "paid_at": payment.paid_at.isoformat(),
        "booking_pnr": booking.pnr,
    }


async def get_payment(db: AsyncSession, booking_id: int) -> Optional[dict[str, Any]]:
    result = await db.execute(
        select(Payment).where(Payment.booking_id == booking_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return None
    return {
        "id": payment.id,
        "booking_id": payment.booking_id,
        "method": payment.method,
        "status": payment.status,
        "amount": payment.amount,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
    }
