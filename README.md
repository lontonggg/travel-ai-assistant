# Travel Booking Agent

An AI-powered flight booking assistant that guides users through the entire booking process via a conversational chat interface. The agent handles everything from flight search to payment and e-ticket delivery — all through natural language.

---

## What It Does

Users interact with an AI agent through a chat window. The agent understands intent, asks the right questions in the right order, and dynamically injects interactive UI components (date pickers, seat maps, payment forms) directly into the conversation. No forms to navigate, no separate pages — the entire booking happens inside the chat.

**Supported routes:** Jakarta (CGK), Bali (DPS), Surabaya (SUB), Singapore (SIN), Bangkok (BKK), Phuket (HKT), Chiang Mai (CNX), Kuala Lumpur (KUL), Penang (PEN), Los Angeles (LAX), New York (JFK), San Francisco (SFO)

---

## User Flow

```
User opens app
    │
    ▼
Agent greets & detects nearest airport (geolocation)
    │
    ▼
User states intent → "I want to fly to Bali next week"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                  14-Phase Booking Flow                   │
│                                                         │
│  1. Origin airport                                      │
│  2. Destination airport                                 │
│  3. Trip type (one-way / round-trip)                    │
│  4. Passenger count & details                           │
│  5. Travel dates (date picker injected into chat)       │
│  6. Outbound flight selection (flight cards shown)      │
│  7. Seat selection (interactive seat map)               │
│  8. Baggage options                                     │
│  9. Travel insurance                                    │
│ 10. Return flight (if round-trip)                       │
│ 11. Return seat selection                               │
│ 12. Booking summary & confirmation                      │
│ 13. Payment (payment form injected into chat)           │
│ 14. E-ticket + QR code sent via email                   │
└─────────────────────────────────────────────────────────┘
    │
    ▼
User receives booking confirmation + invoice email
```

The agent enforces strict phase ordering — it will not skip steps or proceed without required information.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                                                              │
│  ChatWindow  ──►  POST /api/chat (SSE stream)                │
│      │                                                       │
│      ▼                                                       │
│  Stream Parser  ──►  text_delta | ui_component | agent_status│
│      │                                                       │
│      ▼                                                       │
│  Dynamic UI Blocks (DatePicker, SeatMap, PaymentForm, ...)   │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP + Server-Sent Events
┌──────────────────────────────▼───────────────────────────────┐
│                        Backend (FastAPI)                     │
│                                                              │
│  /api/chat  ──►  Session Manager  ──►  Root Agent (ADK)      │
│                                             │                │
│                              ┌──────────────▼─────────────┐ │
│                              │         Agent Tools         │ │
│                              │  search_flights             │ │
│                              │  show_date_picker           │ │
│                              │  get_seat_map               │ │
│                              │  hold_seat                  │ │
│                              │  create_booking_draft       │ │
│                              │  process_payment            │ │
│                              │  send_invoice_email         │ │
│                              │  + 7 more tools             │ │
│                              └──────────────┬─────────────┘ │
│                                             │                │
│  Services (FlightService, BookingService,   │                │
│            EmailService)  ◄─────────────────┘                │
│      │                                                       │
│      ▼                                                       │
│  SQLite Database (async, SQLAlchemy 2.0)                     │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Google ADK (`LlmAgent`) | Provides structured tool-calling with Gemini models; handles multi-turn conversation state |
| Server-Sent Events (SSE) | Enables real-time streaming of agent responses without WebSocket complexity |
| UI components injected via stream | Agent triggers UI rendering by emitting `ui_component` events; frontend renders the appropriate React component |
| SQLite + aiosqlite | Lightweight, zero-config database suitable for a demo/accelerator project |
| In-memory sessions | Keeps session state simple; chat history is persisted client-side via localStorage |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| UI Components | Radix UI, Framer Motion, Lucide React |
| Backend | FastAPI 0.115+, Python 3.11+ |
| AI Agent | Google ADK (`google-adk`), Gemini via `google-genai` |
| Database | SQLite via SQLAlchemy 2.0 + aiosqlite |
| Email | aiosmtplib + Jinja2 templates |
| PDF/QR | WeasyPrint, qrcode + Pillow |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google AI API key (Gemini)

### 1. Clone the repo
```bash
git clone <repo-url>
cd travel-booking-agent
```

### 2. Start the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in GOOGLE_API_KEY and email config
uvicorn app.main:app --reload --port 8000
```

### 3. Start the frontend
```bash
cd frontend
npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### 4. Open the app
Visit [http://localhost:3000](http://localhost:3000) and start chatting.

---

## Project Structure

```
travel-booking-agent/
├── backend/          # FastAPI + Google ADK agent
│   └── README.md     # Backend-specific docs
├── frontend/         # Next.js chat interface
│   └── README.md     # Frontend-specific docs
└── README.md         # This file
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for detailed technical documentation.
