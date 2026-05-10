from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.models import Base

# Resolve DB path relative to this file so it's always in the backend directory,
# regardless of where uvicorn is launched from.
_DB_URL = settings.DATABASE_URL
if _DB_URL.startswith("sqlite+aiosqlite:///./"):
    _db_file = Path(__file__).parent.parent.parent / "booking.db"
    _DB_URL = f"sqlite+aiosqlite:///{_db_file}"

engine = create_async_engine(_DB_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        columns = {
            row[1]
            for row in (await conn.exec_driver_sql("PRAGMA table_info(bookings)")).fetchall()
        }
        if "return_flight_id" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN return_flight_id INTEGER")
        if "return_travel_date" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN return_travel_date VARCHAR(10)")
        if "outbound_ticket_price" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN outbound_ticket_price REAL")
        if "return_ticket_price" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN return_ticket_price REAL")
        if "outbound_baggage_kg" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN outbound_baggage_kg INTEGER")
        if "outbound_baggage_price" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN outbound_baggage_price REAL")
        if "return_baggage_kg" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN return_baggage_kg INTEGER")
        if "return_baggage_price" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN return_baggage_price REAL")
        if "selected_insurance_json" not in columns:
            await conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN selected_insurance_json TEXT")
        pax_columns = {
            row[1]
            for row in (await conn.exec_driver_sql("PRAGMA table_info(passengers)")).fetchall()
        }
        if "email" not in pax_columns:
            await conn.exec_driver_sql("ALTER TABLE passengers ADD COLUMN email VARCHAR(200)")


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
