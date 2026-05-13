import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import bookings, chat, flights
from app.db.database import init_db
from app.services.flight_service import seed_flights_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_flights_if_empty()
    yield


app = FastAPI(title="Travel Booking API", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(flights.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
