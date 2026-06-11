from datetime import date
from typing import Any

from app.agents.tools.common import validate_airports as _validate_airports
from app.db.database import AsyncSessionLocal
from app.services.flight_service import get_flight_by_id, search_flights
from app.services.recommendation_service import rank_flights


async def show_date_picker_tool(
    origin: str,
    destination: str,
    pax: int = 1,
    class_type: str = "economy",
    trip_type: str = "outbound",
    preselected_departure: str = "",
    preselected_return: str = "",
) -> dict[str, Any]:
    """Show a calendar date range picker for the user to select departure (and optional return) date.

    Always call this tool to show the date picker. If the user has already mentioned dates,
    pass them as preselected_departure / preselected_return (YYYY-MM-DD) so the calendar
    pre-fills them — the user can then just confirm or adjust.

    Args:
        origin: IATA airport code for departure (e.g. CGK)
        destination: IATA airport code for arrival (e.g. DPS)
        pax: Number of passengers (default 1)
        class_type: Seat class - 'economy' or 'business' (default economy)
        trip_type: 'outbound' for the first leg, 'return' for the return leg (default outbound)
        preselected_departure: Departure date in YYYY-MM-DD if already known (optional)
        preselected_return: Return date in YYYY-MM-DD if already known (optional)

    Returns:
        Dict with ui date_range_calendar component.
    """
    err = _validate_airports(origin, destination)
    if err:
        return {"result": {"error": err}, "ui": {"kind": "error_message", "props": {"message": err}}}

    props: dict[str, Any] = {
        "origin": origin,
        "destination": destination,
        "pax": pax,
        "class_type": class_type,
        "min_date": date.today().isoformat(),
    }
    if preselected_departure:
        props["preselected_departure"] = preselected_departure
    if preselected_return:
        props["preselected_return"] = preselected_return

    return {
        "result": {"origin": origin, "destination": destination, "pax": pax, "class_type": class_type, "trip_type": trip_type},
        "ui": {"kind": "date_range_calendar", "props": props},
    }


async def search_flights_tool(
    origin: str,
    destination: str,
    date: str,
    pax: int = 1,
    class_type: str = "economy",
    trip_type: str = "outbound",
) -> dict[str, Any]:
    """Search for available flights between two airports on a given date.

    Args:
        origin: IATA airport code for departure (e.g. CGK)
        destination: IATA airport code for arrival (e.g. DPS)
        date: Departure date in YYYY-MM-DD format
        pax: Number of passengers (default 1)
        class_type: Seat class - 'economy' or 'business' (default economy)
        trip_type: 'outbound' for the first leg, 'return' for the return leg (default outbound)

    Returns:
        Dict with result list of flights and ui flight_carousel component.
    """
    err = _validate_airports(origin, destination)
    if err:
        return {"result": {"error": err}, "ui": {"kind": "error_message", "props": {"message": err}}}

    async with AsyncSessionLocal() as db:
        flights = await search_flights(db, origin, destination, date, pax, class_type)

    flights = rank_flights(flights, class_type)

    return {
        "result": {
            "flights": flights,
            "count": len(flights),
            "origin": origin,
            "destination": destination,
            "date": date,
            "pax": pax,
            "class_type": class_type,
            "trip_type": trip_type,
        },
        "ui": {
            "kind": "flight_carousel",
            "props": {
                "flights": flights,
                "origin": origin,
                "destination": destination,
                "date": date,
                "pax": pax,
                "class_type": class_type,
            },
        },
    }


async def get_flight_details_tool(flight_id: int) -> dict[str, Any]:
    """Get detailed information about a specific flight.

    Args:
        flight_id: The numeric flight ID

    Returns:
        Dict with result flight details and ui flight_detail component.
    """
    async with AsyncSessionLocal() as db:
        flight = await get_flight_by_id(db, flight_id)

    if not flight:
        return {
            "result": {"error": f"Flight {flight_id} not found"},
            "ui": {"kind": "error_message", "props": {"message": f"Flight {flight_id} not found"}},
        }

    return {
        "result": flight,
        "ui": {
            "kind": "flight_detail",
            "props": {"flight": flight},
        },
    }
