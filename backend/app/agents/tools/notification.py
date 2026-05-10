from typing import Any

from app.db.database import AsyncSessionLocal
from app.services.booking_service import get_booking
from app.services.email_service import send_invoice_and_ticket


async def send_invoice_email_tool(booking_id: int, recipient_email: str = None) -> dict[str, Any]:
    """Send invoice and e-ticket email to passengers for a confirmed booking.

    Args:
        booking_id: The numeric booking ID
        recipient_email: Optional email address to send to. If not provided, sends to all passengers.

    Returns:
        Dict with result send status and ui email_sent component.
    """
    async with AsyncSessionLocal() as db:
        booking = await get_booking(db, booking_id)

    if not booking:
        return {
            "result": {"success": False, "error": f"Booking {booking_id} not found"},
            "ui": {"kind": "error_message", "props": {"message": f"Booking {booking_id} not found"}},
        }

    passengers = booking.get("passengers", [])
    emails_to_send = []

    if recipient_email:
        emails_to_send = [recipient_email]
    else:
        emails_to_send = [p.get("email") for p in passengers if p.get("email")]

    if not emails_to_send:
        return {
            "result": {"success": False, "error": "No passenger emails found"},
            "ui": {"kind": "error_message", "props": {"message": "No passenger emails found in booking"}},
        }

    sent_count = 0
    for email in emails_to_send:
        success = await send_invoice_and_ticket(booking, email)
        if success:
            sent_count += 1

    return {
        "result": {
            "success": sent_count > 0,
            "booking_id": booking_id,
            "pnr": booking["pnr"],
            "recipients": emails_to_send,
            "emails_sent": sent_count,
        },
        "ui": {
            "kind": "email_sent",
            "props": {
                "success": sent_count > 0,
                "pnr": booking["pnr"],
                "recipients": emails_to_send,
                "booking": booking,
                "emails_sent": sent_count,
            },
        },
    }
