from typing import Any

from google.adk.tools import ToolContext

from app.agents.tools.common import validate_airports

VALID_CLASSES = {"economy", "business"}


async def set_trip_basics_tool(
    origin: str,
    destination: str,
    pax: int,
    class_type: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Record the resolved trip basics once origin, destination, pax and class
    are all known. This does NOT show any UI — it just saves the trip basics
    so the booking flow can move on to the next step.

    Args:
        origin: IATA airport code for departure (e.g. CGK)
        destination: IATA airport code for arrival (e.g. DPS)
        pax: Number of passengers
        class_type: 'economy' or 'business'
    """
    err = validate_airports(origin, destination)
    if err:
        return {"result": {"error": err}, "ui": {"kind": "error_message", "props": {"message": err}}}

    if class_type not in VALID_CLASSES:
        class_type = "economy"
    if pax < 1:
        pax = 1

    tool_context.state["origin"] = origin.upper()
    tool_context.state["destination"] = destination.upper()
    tool_context.state["pax"] = pax
    tool_context.state["class_type"] = class_type

    return {
        "result": {
            "origin": origin.upper(),
            "destination": destination.upper(),
            "pax": pax,
            "class_type": class_type,
        },
        "ui": {"kind": "passenger_form", "props": {"pax": pax}},
    }
