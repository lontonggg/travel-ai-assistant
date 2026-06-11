from typing import Any, Optional

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest

from app.agents.advisor_agent import advisor_agent
from app.agents.booking_agent import booking_agent
from app.agents.flow import compute_phase
from app.core.config import settings

INSTRUCTION = """You are FlightHub's front-of-house router. You never answer
the user directly — your only job is to immediately transfer to the right
specialist agent:

- `booking_agent`: the user has (or is in the middle of giving) a concrete
  trip — a specific origin/destination, or they're already mid-booking
  (passenger details, dates, flight/seat/baggage/insurance selection,
  payment). Default to this agent for any direct booking request.
- `advisor_agent`: the user is UNDECIDED — they mention a budget and/or vibe
  without a fixed destination, ask "where should I go", "kasih
  rekomendasi/ide liburan", want to brainstorm, or ask "is this trip
  affordable" style questions.

Transfer immediately, with no commentary or questions of your own.
"""


def _route_hint(callback_context: CallbackContext, llm_request: LlmRequest) -> Optional[Any]:
    state = callback_context.state.to_dict()
    phase = compute_phase(state)
    if phase.value != "basics":
        llm_request.append_instructions([
            "A booking is already in progress (not at the very first step). "
            "Transfer to `booking_agent` unless the user is explicitly asking "
            "for new destination ideas/recommendations unrelated to this booking."
        ])
    return None


root_agent = LlmAgent(
    name="root_agent",
    model=settings.MODEL_NAME,
    description="FlightHub coordinator — routes between the booking flow and the travel advisor.",
    instruction=INSTRUCTION,
    before_model_callback=_route_hint,
    sub_agents=[booking_agent, advisor_agent],
)
