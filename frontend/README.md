# Frontend — Travel Booking Agent

Next.js 15 chat interface that communicates with the AI booking agent. Renders a conversational UI where the agent can inject interactive components (seat maps, date pickers, payment forms) directly into the chat stream.

---

## Architecture

```
app/
├── layout.tsx              # Root layout — Space Grotesk font, ChatProvider wrapper
├── page.tsx                # Main page — full-screen chat window with maximize toggle
└── globals.css             # Global styles + Tailwind base

components/
├── chat/
│   ├── ChatWindow.tsx      # Main container — message list, input bar, scroll behavior
│   ├── MessageBubble.tsx   # Renders a single message (text or UI component)
│   ├── AgentStatus.tsx     # "Searching flights..." status indicator
│   └── TypingIndicator.tsx # Animated dots while agent is processing
└── ui-blocks/              # Dynamic components injected by the agent
    ├── FlightCard.tsx          # Individual flight option display
    ├── FlightList.tsx          # List of FlightCards with selection
    ├── DateRangeCalendar.tsx   # Date picker for outbound/return dates
    ├── PassengerForm.tsx       # Passenger details form
    ├── SeatMap.tsx             # Interactive cabin seat grid
    ├── BaggageSelector.tsx     # Baggage add-on options
    ├── InsuranceCard.tsx       # Travel insurance offer
    ├── PaymentForm.tsx         # Card/payment details form
    ├── BookingSummary.tsx      # Pre-payment booking review
    └── BookingConfirmation.tsx # Post-payment confirmation + QR ticket

contexts/
└── ChatContext.tsx          # Global state: messages[], session_id, agent status

hooks/
└── useChat.ts               # Sends messages, parses SSE stream, updates context

lib/
├── api.ts                   # streamChat() — fetch wrapper for /api/chat
├── chat-stream.ts           # SSE event parser (text_delta, ui_component, agent_status)
├── geolocation.ts           # Detects nearest airport from browser coordinates
├── types.ts                 # TypeScript types for messages, events, UI components
└── utils.ts                 # cn() helper, formatters
```

---

## How Chat Streaming Works

```
User types message
    │
    ▼
useChat.sendMessage()
    │
    ▼
api.streamChat(message, session_id)  →  POST /api/chat (SSE)
    │
    ▼
chat-stream.ts parses each event:
    ├── text_delta      →  appends text to current agent message bubble
    ├── ui_component    →  appends a UI block to the message list
    ├── agent_status    →  updates status indicator ("Searching flights...")
    └── done            →  marks stream as complete
    │
    ▼
ChatContext state updates  →  React re-renders MessageBubble list
```

### SSE Event → Component Mapping

| `ui_component` type | Rendered component |
|---|---|
| `date_picker` | `<DateRangeCalendar />` |
| `flight_list` | `<FlightList />` |
| `passenger_form` | `<PassengerForm />` |
| `seat_map` | `<SeatMap />` |
| `baggage_selector` | `<BaggageSelector />` |
| `insurance_card` | `<InsuranceCard />` |
| `payment_form` | `<PaymentForm />` |
| `booking_summary` | `<BookingSummary />` |
| `booking_confirmation` | `<BookingConfirmation />` |

Each UI block, when submitted, sends the user's selection back as a new chat message, continuing the agent's conversation flow.

---

## State Management

State is managed through `ChatContext` + `useChat` hook — no external state library.

```typescript
// ChatContext provides:
{
  messages: Message[]        // Full conversation history
  agentStatus: string | null // Current agent activity label
  isLoading: boolean         // Stream in progress
  sessionId: string          // Persisted to localStorage
  sendMessage: (text: string) => void
  appendUiBlock: (component: UiComponentEvent) => void
}
```

**Persistence:** `messages[]` and `session_id` are saved to `localStorage` so the conversation survives page refreshes.

---

## Message Types

```typescript
type Message = {
  id: string
  role: 'user' | 'agent'
  content: string            // Plain text
  uiBlocks?: UiBlock[]       // Injected components
  timestamp: Date
}

type UiBlock = {
  component: string          // e.g. "flight_list"
  data: Record<string, any>  // Component-specific payload from agent
}
```

---

## Key Features

**Geolocation:** On first load, the browser requests location permission. `lib/geolocation.ts` calculates the nearest supported airport using Haversine distance and sends it with the first message so the agent can pre-fill the origin.

**Maximize mode:** The chat window can be toggled to full-screen via a button in the header (`app/page.tsx`), useful for complex booking flows like seat selection.

**Animations:** Message bubbles and UI blocks animate in via Framer Motion. Typing indicator shows while the agent stream is active.

**Markdown rendering:** Agent text responses are rendered via `react-markdown`, supporting bold, lists, and inline code.

---

## How to Run

### Development
```bash
cd frontend
npm install
cp .env.example .env.local
# Set: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build
```bash
npm run build
npm start
```

### Environment variables
```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL
```

---

## Dependencies

```
next ^15.3.1              # Framework (App Router)
react ^19.0.0             # UI library
typescript ^5             # Type safety
tailwindcss ^3.4          # Utility-first CSS
framer-motion ^11         # Animations
@radix-ui/react-*         # Accessible UI primitives (Dialog, Select, Label, etc.)
lucide-react ^0.511       # Icons
react-markdown ^10        # Markdown in agent messages
sonner ^1.7               # Toast notifications
qrcode ^1.5               # QR code generation for booking confirmation
class-variance-authority  # Component variant helper
clsx + tailwind-merge     # Conditional class utilities
```
