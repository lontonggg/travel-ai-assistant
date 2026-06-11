from typing import Any

from google.adk.tools import ToolContext

from app.db.database import AsyncSessionLocal
from app.services.booking_service import get_booking
from app.services.email_service import send_invoice_and_ticket
from app.services.payment_service import process_payment

VALID_METHODS = {"credit_card", "debit_card", "qris"}


async def show_payment_form_tool(booking_id: int, total_amount: float, tool_context: ToolContext) -> dict[str, Any]:
    """Show the payment method selection form to the user.

    Args:
        booking_id: The numeric booking ID
        total_amount: Total amount to charge in IDR

    Returns:
        Dict with ui payment_form component.
    """
    async with AsyncSessionLocal() as db:
        booking = await get_booking(db, booking_id)

    amount = booking["total_amount"] if booking else total_amount
    base_amount = booking.get("base_amount") if booking else None

    tool_context.state["payment_form_shown"] = True

    return {
        "result": {"booking_id": booking_id, "total_amount": amount, "base_amount": base_amount},
        "ui": {
            "kind": "payment_form",
            "props": {"booking_id": booking_id, "total_amount": amount, "base_amount": base_amount, "booking": booking},
        },
    }


async def process_payment_tool(booking_id: int, method: str, tool_context: ToolContext) -> dict[str, Any]:
    """Process payment for a booking. Always succeeds (simulated).

    Args:
        booking_id: The numeric booking ID to pay for
        method: Payment method — one of: credit_card, debit_card, qris

    Returns:
        Dict with result payment data and ui payment_result component.
    """
    if method not in VALID_METHODS:
        method = "credit_card"

    async with AsyncSessionLocal() as db:
        payment = await process_payment(db, booking_id, method)
        booking = await get_booking(db, booking_id)

    tool_context.state["payment_status"] = payment.get("status", "paid")

    # Send emails immediately after payment — don't wait for agent Phase 14
    emails_sent = 0
    if booking:
        passengers = booking.get("passengers", [])
        emails = [p.get("email") for p in passengers if p.get("email")]
        for email in emails:
            success = await send_invoice_and_ticket(booking, email)
            if success:
                emails_sent += 1

    return {
        "result": {**payment, "emails_sent": emails_sent},
        "ui": {
            "kind": "payment_result",
            "props": {
                "success": True,
                "payment": payment,
                "booking": booking,
                "emails_sent": emails_sent,
            },
        },
    }
