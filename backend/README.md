# Backend — Travel Booking Agent

FastAPI backend powering the AI booking agent. Handles chat sessions, agent orchestration, flight/booking data, and email delivery.

---

## Architecture

```
app/
├── main.py               # FastAPI app, CORS, router registration, DB init
├── core/
│   ├── config.py         # Settings (env vars via pydantic-settings)
│   └── ui_events.py      # SSE event builders (text_delta, ui_component, agent_status)
├── agents/
│   ├── root_agent.py     # LlmAgent definition + system prompt + tool list
│   └── tools/            # FunctionTool implementations (14 tools)
│       ├── search_tools.py
│       ├── booking_tools.py
│       ├── payment_tools.py
│       └── notification_tools.py
├── api/
│   ├── chat.py           # POST /api/chat — SSE streaming endpoint
│   ├── flights.py        # GET /api/flights — search & details
│   └── bookings.py       # GET/POST /api/bookings
├── services/
│   ├── flight_service.py   # Flight search, availability, pricing
│   ├── booking_service.py  # Booking creation, seat holds, draft management
│   └── email_service.py    # Invoice generation + SMTP delivery
├── db/
│   ├── models.py         # SQLAlchemy ORM models
│   ├── database.py       # Async engine + session factory
│   └── init_db.py        # Schema creation + seed data on startup
├── schemas/
│   └── *.py              # Pydantic request/response schemas
└── data/
    ├── airports.py       # Supported airports with coordinates
    ├── airlines.py       # Airline definitions + pricing tiers
    └── flights.py        # Flight seed data generator
```

---

## Agent Design

The core of the backend is `root_agent` — a `LlmAgent` from Google ADK that runs a Gemini model.

### How the agent works

1. A user message arrives at `POST /api/chat`
2. The session manager retrieves or creates an in-memory `InMemorySessionService` session
3. The agent processes the message using its system prompt + conversation history
4. The agent calls tools as needed (flight search, seat map, payment, etc.)
5. Each tool may emit a `ui_component` event (e.g., `date_picker`, `seat_map`) via SSE
6. The agent's text response is streamed back as `text_delta` events
7. Frontend parses all events and renders accordingly

### Agent Tools

| Tool | Purpose |
|---|---|
| `show_date_picker_tool` | Emits a date range picker UI component |
| `search_flights_tool` | Queries available flights for a route/date |
| `get_flight_details_tool` | Returns detailed info for a specific flight |
| `show_passenger_form_tool` | Emits a passenger details form |
| `get_seat_map_tool` | Returns seat availability grid for a flight |
| `hold_seat_tool` | Temporarily holds selected seats |
| `create_booking_draft_tool` | Creates a pending booking record in DB |
| `get_booking_tool` | Retrieves a booking by ID |
| `show_insurance_tool` | Emits travel insurance options UI |
| `show_payment_form_tool` | Emits a payment form UI component |
| `process_payment_tool` | Marks booking as paid, finalizes record |
| `send_invoice_email_tool` | Generates PDF invoice + QR code, sends email |

### SSE Event Types

```python
# Streamed to frontend via /api/chat
{"type": "text_delta",    "content": "Here are the available flights..."}
{"type": "ui_component",  "component": "flight_list", "data": {...}}
{"type": "ui_component",  "component": "seat_map",    "data": {...}}
{"type": "ui_component",  "component": "date_picker", "data": {...}}
{"type": "agent_status",  "status": "searching_flights"}
{"type": "done"}
```

---

## Database

**Engine:** SQLite (async via `aiosqlite`)  
**ORM:** SQLAlchemy 2.0 with async sessions

### Models

```
Flight
  id, airline, flight_number, origin, destination
  departure_time, arrival_time, duration_minutes
  price_economy, price_business, available_seats_economy, available_seats_business

Passenger
  id, first_name, last_name, email, phone
  passport_number, date_of_birth, nationality

Booking
  id, session_id, status (draft|confirmed|cancelled)
  trip_type, total_price, created_at

BookingPassenger
  booking_id, passenger_id, flight_id, seat_number
  cabin_class, baggage_kg, has_insurance

PaymentInfo
  booking_id, amount, currency, method, status, processed_at
```

Database is created and seeded automatically on startup via `init_db.py`.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Main chat endpoint, returns SSE stream |
| `GET` | `/api/flights` | Search flights (`?origin=CGK&destination=DPS&date=2026-05-15`) |
| `GET` | `/api/flights/{id}` | Get flight details |
| `GET` | `/api/bookings/{id}` | Get booking by ID |
| `POST` | `/api/bookings` | Create booking directly (bypass agent) |
| `GET` | `/health` | Health check |

### Chat request format
```json
POST /api/chat
{
  "message": "I want to fly from Jakarta to Bali",
  "session_id": "abc-123"
}
```

Response: `text/event-stream` of SSE events.

---

## Configuration

All config is read from environment variables via `app/core/config.py`:

```env
# AI
GOOGLE_API_KEY=your_gemini_api_key

# Email (optional — for invoice delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@email.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your@email.com

# App
DATABASE_URL=sqlite+aiosqlite:///./travel_booking.db
CORS_ORIGINS=http://localhost:3000
```

---

## How to Run

### Development
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit with your values
uvicorn app.main:app --reload --port 8000
```

### Production
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

---

## Dependencies

```
fastapi>=0.115.0          # Web framework
uvicorn[standard]>=0.30.0 # ASGI server
google-adk>=1.0.0         # Google Agent Development Kit
google-genai>=1.0.0       # Gemini model client
google-cloud-aiplatform   # Vertex AI support
sqlalchemy>=2.0.0         # ORM
aiosqlite>=0.20.0         # Async SQLite driver
pydantic>=2.0.0           # Data validation
pydantic-settings>=2.0.0  # Settings from env
python-dotenv>=1.0.0      # .env file loading
jinja2>=3.1.0             # Email templates
aiosmtplib>=3.0.0         # Async SMTP
qrcode[pil]>=7.4.0        # QR code generation
weasyprint>=62.0           # PDF generation
```
