AIRLINES = {
    # Indonesia (max 3)
    "GA": {"code": "GA", "name": "Garuda Indonesia", "iata": "GA", "country": "Indonesia"},
    "JT": {"code": "JT", "name": "Lion Air", "iata": "JT", "country": "Indonesia"},
    "QG": {"code": "QG", "name": "Citilink", "iata": "QG", "country": "Indonesia"},
    # Singapore (max 3)
    "SQ": {"code": "SQ", "name": "Singapore Airlines", "iata": "SQ", "country": "Singapore"},
    "TR": {"code": "TR", "name": "Scoot", "iata": "TR", "country": "Singapore"},
    "3K": {"code": "3K", "name": "Jetstar Asia", "iata": "3K", "country": "Singapore"},
    # Thailand (max 3)
    "TG": {"code": "TG", "name": "Thai Airways", "iata": "TG", "country": "Thailand"},
    "FD": {"code": "FD", "name": "Thai AirAsia", "iata": "FD", "country": "Thailand"},
    "PG": {"code": "PG", "name": "Bangkok Airways", "iata": "PG", "country": "Thailand"},
    # Malaysia (max 3)
    "MH": {"code": "MH", "name": "Malaysia Airlines", "iata": "MH", "country": "Malaysia"},
    "AK": {"code": "AK", "name": "AirAsia", "iata": "AK", "country": "Malaysia"},
    "OD": {"code": "OD", "name": "Batik Air Malaysia", "iata": "OD", "country": "Malaysia"},
    # United States (max 3)
    "UA": {"code": "UA", "name": "United Airlines", "iata": "UA", "country": "United States"},
    "DL": {"code": "DL", "name": "Delta Air Lines", "iata": "DL", "country": "United States"},
    "AA": {"code": "AA", "name": "American Airlines", "iata": "AA", "country": "United States"},
}

# Airlines that offer business class
BUSINESS_CLASS_AIRLINES = {"GA", "SQ", "TG", "MH", "UA", "DL", "AA"}
