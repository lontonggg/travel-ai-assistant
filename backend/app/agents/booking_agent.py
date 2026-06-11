from typing import Any, Optional

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest
from google.adk.tools import BaseTool, FunctionTool, ToolContext

from app.agents.flow import PHASE_TOOLS, UNIVERSAL_TOOLS, Phase, compute_phase, parse_user_message, phase_instruction
from app.agents.tools.basics import set_trip_basics_tool
from app.agents.tools.booking import (
    create_booking_draft_tool,
    get_booking_tool,
    get_seat_map_tool,
    hold_seat_tool,
    show_insurance_tool,
    show_passenger_form_tool,
)
from app.agents.tools.notification import send_invoice_email_tool
from app.agents.tools.payment import process_payment_tool, show_payment_form_tool
from app.agents.tools.search import (
    get_flight_details_tool,
    search_flights_tool,
    show_date_picker_tool,
)
from app.core.config import settings

STATIC_INSTRUCTION = """You are the FlightHub booking assistant. You execute a STRICT, ORDERED booking
flow — the current phase and the single action you must take this turn are
injected below as "CURRENT PHASE: ...". Trust that injected phase completely;
it is computed from the actual booking state, not from your memory of the
conversation.

CRITICAL: Never output internal logs, tool parameters, or "[agent] called
tool..." text. Never ask follow-up confirmations after a tool call — let the
UI handle interaction.

Available airports:
Indonesia: CGK=Jakarta, DPS=Bali, SUB=Surabaya
Singapore: SIN=Singapore
Thailand: BKK=Bangkok, HKT=Phuket, CNX=Chiang Mai
Malaysia: KUL=Kuala Lumpur, PEN=Penang
United States: LAX=Los Angeles, JFK=New York, SFO=San Francisco
If the user mentions a city/country not in this list, inform them politely
and list the available cities above.

# Strict rules:
- Take ONLY the single action described in "CURRENT PHASE" below. Never call
  tools from a different phase in the same response.
- Never skip a phase. Never go backwards.
- Never list flights, seats, or options in text — the UI components display them.
- Prices are displayed by the UI in the appropriate currency — do not format or mention prices in text.
- If the user tries to skip ahead or asks to change something already
  confirmed, politely say you need to complete the current step first.
- Be conversational but brief.
"""


def _extract_user_text(callback_context: CallbackContext) -> str:
    content = callback_context.user_content
    if not content or not getattr(content, "parts", None):
        return ""
    return " ".join(part.text for part in content.parts if getattr(part, "text", None))


def booking_phase_callback(callback_context: CallbackContext, llm_request: LlmRequest) -> Optional[Any]:
    """Computes the current phase from explicit state, parses the latest user
    message into state slots, and injects a phase-specific instruction.
    This replaces LLM self-guessing of the booking phase.
    """
    state = callback_context.state
    text = _extract_user_text(callback_context)

    phase_before = compute_phase(state.to_dict())
    if text:
        parse_user_message(text, state, phase_before)

    phase = compute_phase(state.to_dict())
    state["current_phase"] = phase.value

    llm_request.append_instructions([phase_instruction(phase, state.to_dict())])
    return None


def booking_phase_guard(tool: BaseTool, args: dict, tool_context: ToolContext) -> Optional[dict]:
    """Defense-in-depth: blocks tool calls that don't belong to the current phase."""
    state = tool_context.state
    phase = Phase(state.get("current_phase", Phase.BASICS.value))
    allowed = PHASE_TOOLS.get(phase, set()) | UNIVERSAL_TOOLS

    if tool.name not in allowed:
        return {
            "result": {
                "blocked": True,
                "message": f"'{tool.name}' isn't available yet — finish the current step first.",
            }
        }

    if tool.name == "create_booking_draft_tool" and state.get("booking_id"):
        return {"result": {"blocked": True, "message": "The booking draft was already created."}}
    if tool.name == "process_payment_tool" and state.get("payment_status"):
        return {"result": {"blocked": True, "message": "Payment was already processed."}}

    return None


booking_agent = LlmAgent(
    name="booking_agent",
    model=settings.MODEL_NAME,
    description="Deterministic, ordered flight booking flow agent for FlightHub.",
    instruction=STATIC_INSTRUCTION,
    before_model_callback=booking_phase_callback,
    before_tool_callback=booking_phase_guard,
    tools=[
        FunctionTool(set_trip_basics_tool),
        FunctionTool(show_passenger_form_tool),
        FunctionTool(show_date_picker_tool),
        FunctionTool(search_flights_tool),
        FunctionTool(get_flight_details_tool),
        FunctionTool(get_seat_map_tool),
        FunctionTool(hold_seat_tool),
        FunctionTool(show_insurance_tool),
        FunctionTool(create_booking_draft_tool),
        FunctionTool(get_booking_tool),
        FunctionTool(show_payment_form_tool),
        FunctionTool(process_payment_tool),
        FunctionTool(send_invoice_email_tool),
    ],
)
