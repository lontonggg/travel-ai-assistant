import random
import string
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


def generate_pnr() -> str:
    return "".join(random.choices(string.ascii_uppercase, k=6))


class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    airline_code = Column(String(10), nullable=False)
    airline_name = Column(String(100), nullable=False)
    flight_number = Column(String(20), nullable=False, unique=True)
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    price_economy = Column(Float, nullable=False)
    price_business = Column(Float, nullable=False)
    aircraft_type = Column(String(50), nullable=False)
    total_seats = Column(Integer, nullable=False, default=174)
    created_at = Column(DateTime, server_default=func.now())

    bookings = relationship("Booking", back_populates="flight", foreign_keys="Booking.flight_id")
    seat_holds = relationship("SeatHold", back_populates="flight")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    pnr = Column(String(6), nullable=False, unique=True, default=generate_pnr)
    flight_id = Column(Integer, ForeignKey("flights.id"), nullable=False)
    return_flight_id = Column(Integer, ForeignKey("flights.id"), nullable=True)
    class_type = Column(String(20), nullable=False, default="economy")
    status = Column(String(20), nullable=False, default="pending")
    total_amount = Column(Float, nullable=False, default=0.0)
    travel_date = Column(String(10), nullable=True)
    return_travel_date = Column(String(10), nullable=True)
    outbound_ticket_price = Column(Float, nullable=True)
    return_ticket_price = Column(Float, nullable=True)
    outbound_baggage_kg = Column(Integer, nullable=True)
    outbound_baggage_price = Column(Float, nullable=True)
    return_baggage_kg = Column(Integer, nullable=True)
    return_baggage_price = Column(Float, nullable=True)
    selected_insurance_json = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    flight = relationship("Flight", back_populates="bookings", foreign_keys=[flight_id])
    return_flight = relationship("Flight", foreign_keys=[return_flight_id])
    passengers = relationship("Passenger", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    seat_holds = relationship("SeatHold", back_populates="booking")


class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True)
    dob = Column(String(20), nullable=True)
    passport_or_id = Column(String(100), nullable=True)
    seat = Column(String(10), nullable=True)
    is_primary = Column(Boolean, default=False)

    booking = relationship("Booking", back_populates="passengers")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    method = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    amount = Column(Float, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="payments")


class SeatHold(Base):
    __tablename__ = "seat_holds"

    id = Column(Integer, primary_key=True, index=True)
    flight_id = Column(Integer, ForeignKey("flights.id"), nullable=False)
    seat = Column(String(10), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)

    flight = relationship("Flight", back_populates="seat_holds")
    booking = relationship("Booking", back_populates="seat_holds")
