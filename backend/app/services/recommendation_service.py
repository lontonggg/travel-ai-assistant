"""Lightweight 'smart layer' on top of the mock flight data.

Pure-ish helper functions used by both the booking flow (flight ranking
badges) and the advisor agent (destination suggestions, budget breakdown,
proactive tips). Everything here is heuristic — no ML — but gives the
agent concrete numbers to reason and brainstorm with instead of just
listing raw search results.
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import func, select

from app.data.airports import AIRPORTS
from app.db.database import AsyncSessionLocal
from app.db.models import Flight

# Vibe tags per destination airport — used by suggest_destinations to match
# a traveler's mood/budget to places worth considering.
DESTINATION_VIBES: dict[str, list[str]] = {
    "CGK": ["city", "food", "shopping"],
    "SUB": ["city", "budget", "food"],
    "DPS": ["beach", "nature", "relax", "honeymoon", "romantic", "nightlife"],
    "SIN": ["city", "shopping", "family", "food", "luxury"],
    "BKK": ["city", "food", "culture", "budget", "nightlife"],
    "HKT": ["beach", "relax", "nightlife", "honeymoon"],
    "CNX": ["nature", "culture", "budget", "relax"],
    "KUL": ["city", "shopping", "food", "family"],
    "PEN": ["food", "culture", "beach", "budget"],
    "LAX": ["city", "shopping", "beach", "luxury"],
    "JFK": ["city", "culture", "shopping", "luxury"],
    "SFO": ["city", "nature", "food"],
}

# Rough daily cost-of-living per person while traveling on a budget (USD):
# covers a simple hotel room share, local food, and local transport.
DAILY_BUDGET_USD: dict[str, int] = {
    "CGK": 35, "SUB": 30, "DPS": 40, "SIN": 75, "BKK": 35, "HKT": 40,
    "CNX": 25, "KUL": 35, "PEN": 30, "LAX": 110, "JFK": 130, "SFO": 120,
}


def rank_flights(flights: list[dict[str, Any]], class_type: str = "economy") -> list[dict[str, Any]]:
    """Annotate each flight dict with a `badges` list (Cheapest, Fastest,
    Best Value, Recommended) and return them sorted by departure time.
    """
    if not flights:
        return flights

    price_field = "price_business" if class_type == "business" else "price_economy"
    flights = [dict(f) for f in flights]

    prices = [f.get(price_field) or 0 for f in flights]
    durations = [f.get("duration_minutes") or 0 for f in flights]

    min_price, max_price = min(prices), max(prices)
    min_dur, max_dur = min(durations), max(durations)
    price_range = (max_price - min_price) or 1
    dur_range = (max_dur - min_dur) or 1

    scores = [
        ((p - min_price) / price_range) * 0.6 + ((d - min_dur) / dur_range) * 0.4
        for p, d in zip(prices, durations)
    ]

    cheapest_idx = prices.index(min_price)
    fastest_idx = durations.index(min_dur)
    best_idx = min(range(len(flights)), key=lambda i: scores[i])

    for i, f in enumerate(flights):
        badges: list[str] = []
        if i == cheapest_idx:
            badges.append("Cheapest")
        if i == fastest_idx:
            badges.append("Fastest")
        if i == best_idx and i not in (cheapest_idx, fastest_idx):
            badges.append("Best Value")
        if i == best_idx:
            badges.append("Recommended")
        f["badges"] = badges

    flights.sort(key=lambda f: f["departure_time"])
    return flights


def proactive_tips(flights: list[dict[str, Any]], class_type: str = "economy") -> list[str]:
    """A few short, friendly heuristics to nudge the user toward a smarter pick."""
    if not flights:
        return []

    tips: list[str] = []

    eco = [f["price_economy"] for f in flights if f.get("price_economy")]
    biz = [f["price_business"] for f in flights if f.get("price_business")]
    if class_type == "economy" and eco and biz:
        avg_eco, avg_biz = sum(eco) / len(eco), sum(biz) / len(biz)
        if avg_eco > 0:
            uplift = (avg_biz - avg_eco) / avg_eco * 100
            if uplift <= 60:
                tips.append(
                    f"Business class is only about {uplift:.0f}% more on this route — "
                    "worth considering for longer flights."
                )

    durations = [f["duration_minutes"] for f in flights]
    if max(durations) - min(durations) >= 60:
        tips.append("Flight times vary quite a bit on this route — the fastest option can save you over an hour.")

    morning = [f for f in flights if f["departure_time"][11:13] in {"05", "06", "07", "08"}]
    if morning and len(morning) < len(flights):
        cheapest_morning = min(morning, key=lambda f: f.get("price_economy") or 0)
        cheapest_overall = min(flights, key=lambda f: f.get("price_economy") or 0)
        if cheapest_morning["id"] == cheapest_overall["id"]:
            tips.append("Early morning departures tend to be the cheapest on this route.")

    return tips[:2]


async def suggest_destinations(
    origin: str,
    budget_usd: Optional[float] = None,
    vibe: Optional[str] = None,
    pax: int = 1,
    limit: int = 4,
) -> dict[str, Any]:
    """Suggest a handful of destinations reachable from `origin`, optionally
    filtered/ranked by `vibe` (e.g. 'beach', 'city', 'nature', 'budget',
    'food', 'culture', 'relax', 'romantic', 'nightlife', 'family', 'luxury')
    and `budget_usd` (total round-trip budget for all `pax` travelers).

    Returns a dict with `suggestions` (destinations with direct flights from
    `origin`, ranked by vibe match then price) and `no_direct_flight` (airport
    codes that exist in the network but have no direct route from `origin` —
    use this to tell the user honestly when a destination/region isn't
    directly reachable instead of guessing).
    """
    origin = origin.upper()
    vibe_norm = vibe.strip().lower() if vibe else None

    candidates = [code for code in AIRPORTS if code != origin]

    async with AsyncSessionLocal() as db:
        stmt = (
            select(Flight.destination, func.min(Flight.price_economy))
            .where(Flight.origin == origin, Flight.destination.in_(candidates))
            .group_by(Flight.destination)
        )
        rows = (await db.execute(stmt)).all()

    price_by_dest = {dest: price for dest, price in rows}
    no_direct_flight = sorted(c for c in candidates if c not in price_by_dest)

    # If a vibe was requested and at least one reachable destination matches
    # it, narrow down to those — otherwise fall back to everything reachable.
    if vibe_norm:
        matching = [c for c in price_by_dest if vibe_norm in DESTINATION_VIBES.get(c, [])]
        if matching:
            price_by_dest = {c: price_by_dest[c] for c in matching}

    suggestions: list[dict[str, Any]] = []
    for code, price in price_by_dest.items():
        info = AIRPORTS.get(code, {})
        round_trip_per_person = round(price * 2, 2)
        round_trip_total = round(round_trip_per_person * pax, 2)
        daily = DAILY_BUDGET_USD.get(code, 50)

        if budget_usd is not None and round_trip_total > budget_usd:
            continue

        vibes = DESTINATION_VIBES.get(code, [])
        vibe_match = bool(vibe_norm and vibe_norm in vibes)
        reason_bits = []
        if vibe_match:
            reason_bits.append(f"matches your '{vibe_norm}' vibe")
        if budget_usd is not None:
            leftover = budget_usd - round_trip_total
            days_afforded = int(leftover // (daily * pax)) if daily * pax > 0 else 0
            if 0 < days_afforded <= 60:
                reason_bits.append(f"leaves enough for ~{days_afforded} day(s) on the ground")
            elif days_afforded > 60:
                reason_bits.append("comfortably within your budget")
        if not reason_bits:
            reason_bits.append("a great option from your departure city")

        suggestions.append({
            "code": code,
            "city": info.get("city", code),
            "country": info.get("country", ""),
            "vibes": vibes,
            "round_trip_price_per_person": round_trip_per_person,
            "round_trip_total": round_trip_total,
            "daily_budget_usd": daily,
            "reason": ", ".join(reason_bits).capitalize() + ".",
            "_vibe_match": vibe_match,
        })

    # Most relevant (vibe match) first, then cheapest first.
    suggestions.sort(key=lambda s: (not s["_vibe_match"], s["round_trip_total"]))
    for s in suggestions:
        del s["_vibe_match"]
    return {"suggestions": suggestions[:limit], "no_direct_flight": no_direct_flight}


def budget_breakdown(round_trip_total: float, destination: str, days: int, pax: int) -> dict[str, Any]:
    """Rough split of a trip budget into flights vs. on-the-ground costs."""
    daily = DAILY_BUDGET_USD.get(destination.upper(), 50)
    ground_total = daily * pax * max(days, 0)
    return {
        "flights_total": round(round_trip_total, 2),
        "ground_total_estimate": round(ground_total, 2),
        "daily_per_person_usd": daily,
        "grand_total_estimate": round(round_trip_total + ground_total, 2),
        "days": days,
    }
