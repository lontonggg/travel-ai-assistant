from datetime import datetime, timedelta
from typing import Any

# A fixed reference date — only the time component matters.
# search_flights overlays the user's requested date at query time.
_REF = datetime(2000, 1, 1)

# (origin, destination, duration_minutes, base_economy_usd, airlines, departure_hours)
# Airlines listed in order of assignment per departure slot (cycled round-robin).
ROUTE_CONFIGS = [
    # --- Indonesia domestic ---
    ("CGK", "SUB",  75,  40, ["GA", "JT", "QG"],       [6, 8, 10, 12, 14, 16, 18, 20]),
    ("CGK", "DPS", 110,  55, ["GA", "JT", "QG"],       [6, 8, 10, 12, 14, 16, 18, 20]),
    ("SUB", "DPS",  55,  35, ["GA", "JT", "QG"],       [7, 10, 13, 16, 19]),

    # --- Indonesia → Southeast Asia ---
    ("CGK", "SIN", 105, 120, ["GA", "SQ", "TR"],       [7, 10, 13, 16, 19, 22]),
    ("CGK", "KUL", 120, 110, ["GA", "MH", "AK"],       [7, 10, 14, 17, 20]),
    ("CGK", "BKK", 195, 180, ["GA", "TG"],             [8, 12, 18, 22]),
    ("DPS", "SIN", 155, 130, ["GA", "SQ", "TR"],       [8, 11, 15, 19, 22]),
    ("DPS", "KUL", 165, 120, ["GA", "MH", "AK"],       [8, 12, 16, 20]),
    ("DPS", "BKK", 265, 200, ["GA", "TG"],             [9, 15, 22]),
    ("SUB", "SIN", 130, 125, ["GA", "SQ"],             [8, 12, 17, 21]),
    ("SUB", "KUL", 150, 115, ["GA", "MH"],             [9, 13, 18]),

    # --- Intra Southeast Asia ---
    ("SIN", "BKK", 155, 110, ["SQ", "TG", "TR"],       [7, 10, 13, 16, 19, 22]),
    ("SIN", "KUL",  55,  80, ["SQ", "MH", "AK", "3K"], [6, 8, 10, 12, 14, 16, 18, 20]),
    ("BKK", "KUL", 135, 100, ["TG", "MH", "AK"],       [7, 10, 14, 17, 20]),
    ("BKK", "HKT",  75,  55, ["TG", "FD", "PG"],       [7, 9, 11, 14, 17, 19]),
    ("BKK", "CNX",  65,  45, ["TG", "FD", "PG"],       [6, 8, 10, 13, 16, 19]),
    ("KUL", "PEN",  50,  40, ["MH", "AK", "OD"],       [6, 8, 10, 12, 14, 16, 18, 20]),

    # --- More direct beach/culture/budget options from Indonesia ---
    ("CGK", "HKT", 180, 160, ["TG", "FD"],             [9, 16]),
    ("CGK", "CNX", 200, 165, ["TG", "FD"],             [10]),
    ("CGK", "PEN", 140, 130, ["MH", "AK"],             [11, 18]),
    ("DPS", "HKT", 230, 190, ["TG", "FD"],             [10]),
    ("DPS", "PEN", 190, 150, ["MH", "AK"],             [12]),
    ("DPS", "CNX", 250, 195, ["TG"],                   [11]),

    # --- Asia → US (long-haul) ---
    ("SIN", "LAX", 870, 650, ["SQ", "UA"],             [9, 22]),
    ("SIN", "JFK", 1080, 800, ["SQ", "UA"],            [10, 23]),
    ("SIN", "SFO", 900, 680, ["SQ", "UA"],             [8, 21]),
    ("BKK", "LAX", 870, 700, ["TG", "UA"],             [9, 22]),
    ("KUL", "LAX", 900, 720, ["MH", "UA"],             [10, 22]),

    # --- US domestic ---
    ("LAX", "JFK", 330, 280, ["UA", "DL", "AA"],       [6, 9, 12, 15, 18, 21]),
    ("LAX", "SFO",  80, 120, ["UA", "DL", "AA"],       [6, 7, 9, 11, 13, 15, 17, 19, 21]),
    ("JFK", "SFO", 360, 300, ["UA", "DL", "AA"],       [6, 9, 12, 15, 18, 21]),
]

# Auto-generate return legs for all routes
RETURN_CONFIGS = [
    (dest, orig, dur, price, airlines, dep_hours)
    for orig, dest, dur, price, airlines, dep_hours in ROUTE_CONFIGS
]

ALL_CONFIGS = ROUTE_CONFIGS + RETURN_CONFIGS

PRICE_FACTORS = {
    "GA": 1.00, "JT": 0.72, "QG": 0.68,
    "SQ": 1.10, "TR": 0.75, "3K": 0.70,
    "TG": 1.05, "FD": 0.72, "PG": 0.85,
    "MH": 1.00, "AK": 0.68, "OD": 0.75,
    "UA": 1.05, "DL": 1.08, "AA": 1.02,
}

AIRCRAFT_TYPES = {
    "GA": "Boeing 737-800",
    "JT": "Boeing 737-900ER",
    "QG": "Airbus A320",
    "SQ": "Boeing 777-300ER",
    "TR": "Boeing 787-9",
    "3K": "Airbus A320",
    "TG": "Boeing 777-200",
    "FD": "Airbus A320",
    "PG": "ATR 72-600",
    "MH": "Airbus A330-300",
    "AK": "Airbus A320neo",
    "OD": "Boeing 737-800",
    "UA": "Boeing 787-9",
    "DL": "Airbus A350-900",
    "AA": "Boeing 777-200ER",
}

AIRLINE_NAMES = {
    "GA": "Garuda Indonesia", "JT": "Lion Air", "QG": "Citilink",
    "SQ": "Singapore Airlines", "TR": "Scoot", "3K": "Jetstar Asia",
    "TG": "Thai Airways", "FD": "Thai AirAsia", "PG": "Bangkok Airways",
    "MH": "Malaysia Airlines", "AK": "AirAsia", "OD": "Batik Air Malaysia",
    "UA": "United Airlines", "DL": "Delta Air Lines", "AA": "American Airlines",
}

BUSINESS_CLASS_AIRLINES = {"GA", "SQ", "TG", "MH", "UA", "DL", "AA"}

_FLIGHT_NUMBER_BASES = {
    "GA": 400, "JT": 900, "QG": 800,
    "SQ": 300, "TR": 700, "3K": 500,
    "TG": 600, "FD": 3100, "PG": 8600,
    "MH": 700, "AK": 8300, "OD": 8500,
    "UA": 100, "DL": 400, "AA": 200,
}


def _flight_number(airline_code: str, counter: int) -> str:
    base = _FLIGHT_NUMBER_BASES.get(airline_code, 9000)
    return f"{airline_code}{base + counter}"


def _time_factor(dep_hour: int) -> float:
    """Realistic time-of-day pricing: red-eye/early flights are cheaper,
    midday departures carry a small premium."""
    if dep_hour < 8:
        return 0.92
    if 11 <= dep_hour <= 15:
        return 1.08
    if dep_hour >= 21:
        return 0.95
    return 1.0


def generate_seed_flights() -> list[dict[str, Any]]:
    flights: list[dict[str, Any]] = []
    flight_id = 1
    counters: dict[str, int] = {}

    for orig, dest, duration_minutes, base_price_usd, airlines, dep_hours in ALL_CONFIGS:
        for slot_idx, dep_hour in enumerate(dep_hours):
            airline_code = airlines[slot_idx % len(airlines)]
            airline_name = AIRLINE_NAMES[airline_code]
            aircraft = AIRCRAFT_TYPES[airline_code]
            factor = PRICE_FACTORS[airline_code]

            counters[airline_code] = counters.get(airline_code, 0) + 1

            departure = _REF.replace(hour=dep_hour, minute=0, second=0, microsecond=0)
            arrival = departure + timedelta(minutes=duration_minutes)

            economy_price = round(base_price_usd * factor * _time_factor(dep_hour))
            business_price = round(economy_price * 2.8) if airline_code in BUSINESS_CLASS_AIRLINES else 0.0

            fn = _flight_number(airline_code, counters[airline_code])

            total_seats = 300 if aircraft in {"Boeing 777-300ER", "Boeing 777-200", "Boeing 777-200ER", "Airbus A350-900"} else 174

            flights.append(
                {
                    "id": flight_id,
                    "airline_code": airline_code,
                    "airline_name": airline_name,
                    "flight_number": fn,
                    "origin": orig,
                    "destination": dest,
                    "departure_time": departure,
                    "arrival_time": arrival,
                    "duration_minutes": duration_minutes,
                    "price_economy": float(economy_price),
                    "price_business": float(business_price),
                    "aircraft_type": aircraft,
                    "total_seats": total_seats,
                }
            )
            flight_id += 1

    return flights


SEED_FLIGHTS: list[dict[str, Any]] = generate_seed_flights()
