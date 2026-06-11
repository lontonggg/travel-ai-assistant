# FlightHub - Travel Booking Agent

FlightHub is a conversational flight-booking app that combines an AI travel advisor with a deterministic booking workflow. The user can start loosely with a budget or vibe, get destination ideas, then move into a guided booking flow with interactive cards for passengers, dates, flights, seats, baggage, insurance, payment, and ticket confirmation.

The important design choice in this project is that the LLM does not own the booking state. The backend computes the current booking phase from persisted state, then only allows the tools that make sense for that phase. The LLM handles conversation and routing, while the booking engine keeps the flow predictable.

## What This Project Does

- Lets users chat naturally to find and book flights.
- Supports an advisor mode for undecided users who need destination ideas based on budget, vibe, and passenger count.
- Supports a strict booking mode for users who already know where they want to go.
- Streams agent responses and UI events from FastAPI to Next.js using Server-Sent Events.
- Renders interactive UI blocks inside the chat instead of forcing the user to type every structured input.
- Persists session state in SQLite through Google ADK's `DatabaseSessionService`.
- Seeds mock flight data on backend startup.
- Generates booking records, seat holds, payment records, invoice/email payloads, QR codes, and ticket/invoice HTML/PDF assets.

Supported airport codes:

| Region | Airports |
|---|---|
| Indonesia | `CGK` Jakarta, `DPS` Bali, `SUB` Surabaya |
| Singapore | `SIN` Singapore |
| Thailand | `BKK` Bangkok, `HKT` Phuket, `CNX` Chiang Mai |
| Malaysia | `KUL` Kuala Lumpur, `PEN` Penang |
| United States | `LAX` Los Angeles, `JFK` New York, `SFO` San Francisco |

## User Flow

### 1. Advisor Flow

Advisor flow is for users who are not ready to book yet.

Example:

```text
User: "Aku punya budget 5 juta IDR, 4 hari, pengen beach vibe."
```

The backend routes this to `advisor_agent`, which can:

- Ask for missing basics such as budget, vibe, trip length, and passenger count. If the user's origin was already detected (via browser geolocation), it's used directly without asking.
- Suggest destinations using `suggest_destinations_tool`, passing a `vibe` inferred from the user's wording (e.g. "beach getaway" → `beach`, "food trip" → `food`).
- Show destination cards with city, country, vibe tags, estimated round-trip price, daily cost estimate, and reason — ranked by vibe match first, then price.
- Estimate a full trip budget using `estimate_trip_budget_tool`, rendered as a budget breakdown card.
- Search or inspect flights when prices/times are useful for the recommendation.
- Honestly tell the user when a destination/region has no direct flight from their origin (via the tool's `no_direct_flight` list) instead of guessing prices.

When the user chooses a concrete destination, the advisor stores the trip basics with `set_trip_basics_tool` and hands off to `booking_agent`.

### 2. Booking Flow

Booking flow is for users with a concrete route, or users who just selected a recommendation.

The deterministic phases are:

1. `basics`: collect origin, destination, passenger count, and cabin class.
2. `passenger_form`: render passenger details form.
3. `date_picker`: render departure/return date picker.
4. `outbound_search`: search outbound flights and show flight cards.
5. `outbound_seat`: show seat map for the selected outbound flight.
6. `outbound_baggage`: hold outbound seats and collect baggage options.
7. `outbound_insurance`: show optional insurance.
8. `return_search`: search return flights, only for round trips.
9. `return_seat`: show return seat map.
10. `return_baggage`: hold return seats and collect return baggage.
11. `return_insurance`: show optional return insurance.
12. `order_summary`: create and show the booking draft.
13. `payment`: show payment method UI and process payment.
14. `done`: booking is complete.

The frontend groups those phases into progress steps. One-way trips show 7 progress steps, while round trips show 8 because the return leg gets its own step.

## Architecture

```text
Frontend: Next.js 15 + React 19 + TypeScript + Tailwind
  |
  | POST /api/chat
  | Server-Sent Events: text_delta, ui_component, agent_status, phase, done, error
  v
Backend: FastAPI
  |
  | Google ADK Runner + DatabaseSessionService
  v
Root Agent
  |
  +-- advisor_agent
  |     - destination suggestions
  |     - budget estimates
  |     - recommendation-oriented flight lookups
  |
  +-- booking_agent
        - deterministic phase callback
        - phase-specific tool guard
        - booking/search/seat/payment/email tools
  |
  v
Services
  - FlightService
  - BookingService
  - SeatService
  - PaymentService
  - EmailService
  - RecommendationService
  |
  v
SQLite via SQLAlchemy async + aiosqlite
```

### Backend Responsibilities

- `backend/app/main.py`: creates the FastAPI app, configures CORS, initializes DB tables, and seeds flights.
- `backend/app/api/chat.py`: receives chat messages, adds date/location context, runs the ADK agent, and streams SSE events.
- `backend/app/agents/root_agent.py`: routes users to advisor or booking.
- `backend/app/agents/advisor_agent.py`: handles ideation and recommendations.
- `backend/app/agents/booking_agent.py`: handles the strict booking flow.
- `backend/app/agents/flow.py`: defines phases, allowed tools, state parsing, progress metadata, and phase instructions.
- `backend/app/agents/tools/*`: agent-callable functions that return structured results and optional UI component payloads.
  - `basics.py`: saves trip basics (origin, destination, pax, class) when handing off from advisor to booking.
  - `common.py`: shared helpers such as airport validation.
  - `advisor.py`: destination suggestions and budget breakdown tools.
- `backend/app/services/*`: application logic for flights, bookings, seats, payments, email, and recommendations.
- `backend/app/db/*`: SQLAlchemy async database setup and models.
- `backend/app/data/*`: airport, airline, and seed flight data.

### Frontend Responsibilities

- `frontend/app/page.tsx`: main app page.
- `frontend/hooks/useChat.ts`: chat state, session handling, SSE consumption, and UI event handling.
- `frontend/lib/api.ts`: `POST /api/chat` streaming client.
- `frontend/lib/chat-stream.ts`: parses SSE data lines into typed chat events.
- `frontend/components/chat/*`: chat shell (`ChatWindow`), message bubbles, typing state, tool messages, agent status, and progress tracker.
- `frontend/components/ui-blocks/*`: interactive components rendered from backend UI events, including destination suggestions and budget breakdown cards for the advisor flow.
- `frontend/lib/geolocation.ts`: detects the nearest airport from the browser's geolocation, sent to the backend as `detected_origin`.
- `frontend/lib/currency.ts`: formats prices in the traveler's local currency based on origin/destination airports.

## Deterministic Flow

The booking flow is enforced in code:

1. The frontend sends a user message or a message generated by an interactive UI block.
2. `booking_phase_callback` reads the latest user text.
3. `parse_user_message` extracts structured slots into ADK session state.
4. `compute_phase(state)` derives the current phase from explicit state fields.
5. `phase_instruction(...)` injects the next allowed action into the model request.
6. `booking_phase_guard(...)` blocks tools that are not allowed in the current phase.
7. Tool results can include `ui` payloads, which are streamed to the frontend as `ui_component` events.
8. After the agent finishes, the backend emits a `phase` event so the frontend progress tracker can update.

This means the LLM can phrase the conversation, but it cannot skip from dates to payment, call seat tools before a flight is selected, or recreate a booking draft after one already exists.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| UI | Radix UI primitives, Framer Motion, Lucide React, Sonner |
| Backend | FastAPI, Python 3.11+, Uvicorn |
| Agent framework | Google ADK, Google GenAI, Vertex AI-compatible config |
| Database | SQLite, SQLAlchemy 2 async, aiosqlite |
| Streaming | Server-Sent Events |
| Templates | Jinja2 |
| Email | aiosmtplib |
| Ticket assets | WeasyPrint, qrcode, Pillow |

## Requirements

- Python 3.11+
- Node.js 18+
- npm
- A Google/Vertex AI setup that works with `google-adk` and `google-genai`
- Optional: `uv` if you prefer it over `pip`
- Optional for local PDF generation: WeasyPrint system dependencies

On macOS, if WeasyPrint fails because native libraries are missing:

```bash
brew install pango cairo gdk-pixbuf libffi
```

## Environment Variables

Create `backend/.env`:

```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=asia-southeast1
GOOGLE_GENAI_USE_VERTEXAI=true
MODEL_NAME=gemini-2.5-flash

DATABASE_URL=sqlite+aiosqlite:///./travel_booking.db

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_USE_TLS=true

FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Notes:

- The code defaults `DATABASE_URL` to `/mnt/gcs-db/travel_booking.db`, which is useful for the backend Docker image because it mounts a GCS bucket. For local development, use the local SQLite URL above.
- `MODEL_NAME` defaults to `gemini-2.5-flash`.
- SMTP values can be empty for development, but email sending will not work until they are configured.

## Run Locally

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend will start at:

```text
http://localhost:8000
```

Useful checks:

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/flights?origin=CGK&destination=DPS&date=2026-07-01&pax=1&class_type=economy"
```

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at:

```text
http://localhost:3000
```

## Try These Prompts

Advisor mode:

```text
Aku dari Jakarta, budget 5 juta IDR buat 2 orang, pengen beach vibe 4 hari.
```

Direct booking mode:

```text
Book a flight from Jakarta to Bali for 2 passengers in economy.
```

Round trip:

```text
I want to fly from Singapore to Bangkok for 1 passenger, round trip.
```

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `POST` | `/api/chat` | Main chat endpoint, streams SSE events |
| `GET` | `/api/flights` | Search seeded flights |
| `GET` | `/api/flights/{flight_id}` | Get flight details |
| `GET` | `/api/flights/{flight_id}/seats` | Get seat map |
| `GET` | `/api/bookings/{booking_id}` | Get booking by ID |
| `GET` | `/api/bookings/pnr/{pnr}` | Get booking by PNR |

`POST /api/chat` body:

```json
{
  "message": "Book a flight from Jakarta to Bali",
  "session_id": "optional-existing-session-id",
  "detected_origin": {
    "code": "CGK",
    "city": "Jakarta"
  }
}
```

SSE event payloads are JSON objects with a `type` field. The frontend currently handles:

- `text_delta`
- `ui_component`
- `agent_status`
- `phase`
- `done`
- `error`

## Project Structure

```text
travel-booking-agent/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── root_agent.py
│   │   │   ├── advisor_agent.py
│   │   │   ├── booking_agent.py
│   │   │   ├── flow.py
│   │   │   └── tools/
│   │   │       ├── advisor.py
│   │   │       ├── basics.py
│   │   │       ├── booking.py
│   │   │       ├── common.py
│   │   │       ├── notification.py
│   │   │       ├── payment.py
│   │   │       └── search.py
│   │   ├── api/
│   │   │   ├── chat.py
│   │   │   ├── flights.py
│   │   │   └── bookings.py
│   │   ├── core/
│   │   ├── data/
│   │   ├── db/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── templates/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ToolMessage.tsx
│   │   │   ├── AgentStatus.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   └── TypingIndicator.tsx
│   │   └── ui-blocks/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── chat-stream.ts
│   │   ├── currency.ts
│   │   ├── geolocation.ts
│   │   └── types.ts
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## Docker Notes

There is a separate Dockerfile for each app:

- `backend/Dockerfile`
- `frontend/Dockerfile`

Backend image behavior:

- Exposes port `8080`.
- Runs `entrypoint.sh`.
- Expects `GCS_BUCKET_NAME` so it can mount a GCS bucket at `/mnt/gcs-db` using `gcsfuse`.
- Uses `/mnt/gcs-db/travel_booking.db` by default through `DATABASE_URL`.

Frontend image behavior:

- Builds a Next.js standalone app.
- Exposes port `3000`.
- Accepts `NEXT_PUBLIC_API_URL` as a build argument.

There is currently no root `docker-compose.yml`, so local development is simpler with the manual backend/frontend commands above.

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError: google.adk` | Backend dependencies are not installed in the active environment | Activate the backend venv and run `pip install -r requirements.txt` |
| Backend creates DB in `/mnt/gcs-db` or fails locally | Local `DATABASE_URL` is not set | Put `DATABASE_URL=sqlite+aiosqlite:///./travel_booking.db` in `backend/.env` |
| Frontend cannot reach backend | `NEXT_PUBLIC_API_URL` is missing or wrong | Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` |
| CORS error | Backend does not know the frontend origin | Set `FRONTEND_URL=http://localhost:3000` in `backend/.env` |
| WeasyPrint import/runtime error | Native PDF dependencies missing | Install native libraries or use a container with the backend Dockerfile dependencies |
| Progress tracker does not move | Backend did not emit a `phase` event or state did not advance | Check backend logs and the browser Network tab for `/api/chat` SSE events |
| Agent tries a tool too early | Phase guard blocked it | Check `PHASE_TOOLS` and `current_phase` in `backend/app/agents/flow.py` |

## Development Checklist

- Backend starts successfully on `http://localhost:8000`.
- `GET /health` returns `{"status":"ok"}`.
- Frontend starts successfully on `http://localhost:3000`.
- Advisor prompt returns destination suggestions.
- Direct booking prompt enters the passenger/date/flight flow.
- Flight cards render with badges when available.
- Seat map, baggage, insurance, summary, payment, and success states render from `ui_component` events.
- Browser refresh keeps the same `session_id` in `sessionStorage` and resumes persisted backend session state.
