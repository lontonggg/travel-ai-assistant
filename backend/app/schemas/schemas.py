from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# Flight schemas
class FlightBase(BaseModel):
    airline_code: str
    airline_name: str
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    price_economy: float
    price_business: float
    aircraft_type: str
    total_seats: int


class FlightOut(FlightBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Passenger schemas
class PassengerIn(BaseModel):
    name: str
    dob: Optional[str] = None
    passport_or_id: Optional[str] = None
    seat: Optional[str] = None
    is_primary: bool = False


class PassengerOut(PassengerIn):
    id: int
    booking_id: int

    model_config = {"from_attributes": True}


# Booking schemas
class BookingCreate(BaseModel):
    flight_id: int
    class_type: str = "economy"
    passengers: list[PassengerIn]


class BookingOut(BaseModel):
    id: int
    pnr: str
    flight_id: int
    class_type: str
    status: str
    total_amount: float
    created_at: Optional[datetime] = None
    passengers: list[PassengerOut] = []

    model_config = {"from_attributes": True}


# Payment schemas
class PaymentIn(BaseModel):
    booking_id: int
    method: str


class PaymentOut(BaseModel):
    id: int
    booking_id: int
    method: str
    status: str
    amount: float
    paid_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Seat map schemas
class SeatInfo(BaseModel):
    seat: str
    row: int
    col: str
    class_type: str
    status: str  # available, taken, selected


class SeatMapOut(BaseModel):
    flight_id: int
    business_seats: list[SeatInfo]
    economy_seats: list[SeatInfo]


# Chat schemas
class ChatRequest(BaseModel):
    session_id: str
    message: str
    tool_response: Optional[Any] = None


# Flight search schemas
class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    date: str
    pax: int = 1
    class_type: str = "economy"
