from typing import Any

from app.services.recommendation_service import budget_breakdown, suggest_destinations


async def suggest_destinations_tool(
    origin: str,
    budget_usd: float = 0,
    vibe: str = "",
    pax: int = 1,
) -> dict[str, Any]:
    """Suggest destinations from `origin` based on a travel budget and/or vibe,
    with estimated round-trip prices and reasons. Use this when the user is
    undecided about where to go, or asks for recommendations/ideas.

    Args:
        origin: IATA airport code the trip departs from (e.g. CGK)
        budget_usd: Total round-trip budget in USD for all travelers (0 = no limit)
        vibe: Desired vibe — e.g. beach, city, nature, culture, food, budget,
            relax, romantic, nightlife, family, luxury (empty = any)
        pax: Number of travelers
    """
    data = await suggest_destinations(
        origin=origin,
        budget_usd=budget_usd or None,
        vibe=vibe or None,
        pax=pax,
    )
    suggestions = data["suggestions"]
    return {
        "result": {
            "origin": origin.upper(),
            "suggestions": suggestions,
            "no_direct_flight": data["no_direct_flight"],
        },
        "ui": {
            "kind": "destination_suggestions",
            "props": {"origin": origin.upper(), "vibe": vibe, "pax": pax, "suggestions": suggestions},
        },
    }


async def estimate_trip_budget_tool(
    destination: str,
    round_trip_price_per_person: float,
    days: int,
    pax: int = 1,
) -> dict[str, Any]:
    """Estimate a full trip budget (flights + on-the-ground costs) for a
    destination, given the round-trip flight price per person and trip length.

    Args:
        destination: IATA airport code of the destination (e.g. DPS)
        round_trip_price_per_person: Round-trip flight price per person in USD
        days: Number of days on the ground
        pax: Number of travelers
    """
    breakdown = budget_breakdown(
        round_trip_total=round_trip_price_per_person * pax,
        destination=destination,
        days=days,
        pax=pax,
    )
    return {
        "result": {"destination": destination.upper(), "pax": pax, **breakdown},
        "ui": {
            "kind": "budget_breakdown",
            "props": {"destination": destination.upper(), "pax": pax, **breakdown},
        },
    }
