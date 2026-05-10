import base64
import io
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

import aiosmtplib
import qrcode
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.core.config import settings

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"


def _get_jinja_env() -> Environment:
    return Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)


def _generate_qr_base64(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def _render_pdf(html_string: str) -> bytes:
    return HTML(string=html_string).write_pdf()


def _build_outbound_booking(booking_data: dict[str, Any]) -> dict[str, Any]:
    seg = dict(booking_data)
    seg["return_flight"] = None
    seg["return_travel_date"] = None
    return seg


def _build_return_booking(booking_data: dict[str, Any]) -> dict[str, Any]:
    seg = dict(booking_data)
    seg["flight"] = booking_data["return_flight"]
    seg["travel_date"] = booking_data.get("return_travel_date")
    seg["return_flight"] = None
    seg["return_travel_date"] = None
    return seg


async def send_invoice_and_ticket(booking_data: dict[str, Any], recipient_email: str) -> bool:
    env = _get_jinja_env()
    pnr = booking_data.get("pnr", "")

    qr_out = _generate_qr_base64(f"PNR:{pnr}|BOOKING:{booking_data.get('id', '')}|SEGMENT:Outbound")
    outbound_booking = _build_outbound_booking(booking_data)

    receipt_html = env.get_template("receipt.html").render(booking=booking_data, qr_code=qr_out)
    receipt_pdf = _render_pdf(receipt_html)

    ticket_out_html = env.get_template("ticket.html").render(booking=outbound_booking, qr_code=qr_out)
    ticket_out_pdf = _render_pdf(ticket_out_html)

    body_html = env.get_template("email_body.html").render(booking=booking_data)

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Your booking is confirmed — PNR: {pnr} | FlightHub"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = recipient_email

    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(body_html, "html"))
    msg.attach(alternative)

    receipt_part = MIMEApplication(receipt_pdf, _subtype="pdf")
    receipt_part.add_header("Content-Disposition", "attachment", filename=f"Receipt-{pnr}.pdf")
    msg.attach(receipt_part)

    ticket_out_part = MIMEApplication(ticket_out_pdf, _subtype="pdf")
    ticket_out_part.add_header("Content-Disposition", "attachment", filename=f"Ticket-Departure-{pnr}.pdf")
    msg.attach(ticket_out_part)

    if booking_data.get("return_flight"):
        qr_ret = _generate_qr_base64(f"PNR:{pnr}|BOOKING:{booking_data.get('id', '')}|SEGMENT:Return")
        return_booking = _build_return_booking(booking_data)
        ticket_ret_html = env.get_template("ticket.html").render(booking=return_booking, qr_code=qr_ret)
        ticket_ret_pdf = _render_pdf(ticket_ret_html)
        ticket_ret_part = MIMEApplication(ticket_ret_pdf, _subtype="pdf")
        ticket_ret_part.add_header("Content-Disposition", "attachment", filename=f"Ticket-Return-{pnr}.pdf")
        msg.attach(ticket_ret_part)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            start_tls=settings.SMTP_USE_TLS,
        )
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False
