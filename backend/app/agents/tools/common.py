from collections import defaultdict

from app.data.airports import AIRPORTS


def available_cities_message() -> str:
    by_country: dict[str, list[str]] = defaultdict(list)
    for ap in AIRPORTS.values():
        by_country[ap["country"]].append(f"{ap['city']} ({ap['code']})")
    lines = ["Currently available cities:"]
    for country, cities in sorted(by_country.items()):
        lines.append(f"  {country}: {', '.join(sorted(cities))}")
    return "\n".join(lines)


def validate_airports(origin: str, destination: str) -> str | None:
    """Return an error message if either airport code is not in our data."""
    unknown = [code.upper() for code in (origin, destination) if code.upper() not in AIRPORTS]
    if unknown:
        return (
            f"Sorry, we don't have flights data for: {', '.join(unknown)}.\n\n"
            + available_cities_message()
        )
    return None
