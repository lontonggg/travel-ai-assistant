type CurrencyInfo = {
  symbol: string;
  locale: string;
  rateFromUSD: number;
  decimals: number;
};

const AIRPORT_COUNTRY: Record<string, string> = {
  CGK: "ID", SUB: "ID", DPS: "ID",
  SIN: "SG",
  BKK: "TH", HKT: "TH", CNX: "TH",
  KUL: "MY", PEN: "MY",
  LAX: "US", JFK: "US", SFO: "US",
};

const CURRENCIES: Record<string, CurrencyInfo> = {
  ID: { symbol: "Rp",  locale: "id-ID", rateFromUSD: 16300, decimals: 0 },
  SG: { symbol: "S$",  locale: "en-SG", rateFromUSD: 1.35,  decimals: 0 },
  TH: { symbol: "฿",   locale: "th-TH", rateFromUSD: 35,    decimals: 0 },
  MY: { symbol: "RM",  locale: "ms-MY", rateFromUSD: 4.7,   decimals: 0 },
  US: { symbol: "$",   locale: "en-US", rateFromUSD: 1,     decimals: 0 },
};

function formatInCurrency(priceUSD: number, info: CurrencyInfo): string {
  const amount = Math.round(priceUSD * info.rateFromUSD);
  return `${info.symbol}${amount.toLocaleString(info.locale)}`;
}

export function formatFlightPrice(priceUSD: number, origin: string, destination: string): string {
  const originCountry = AIRPORT_COUNTRY[origin.toUpperCase()];
  const destCountry   = AIRPORT_COUNTRY[destination.toUpperCase()];

  const originCurrency = CURRENCIES[originCountry] ?? CURRENCIES.US;

  if (originCountry === destCountry) {
    return formatInCurrency(priceUSD, originCurrency);
  }

  const destCurrency = CURRENCIES[destCountry] ?? CURRENCIES.US;
  return `${formatInCurrency(priceUSD, originCurrency)} / ${formatInCurrency(priceUSD, destCurrency)}`;
}

export function formatUSD(priceUSD: number): string {
  return `$${Math.round(priceUSD).toLocaleString("en-US")}`;
}

export function formatInOriginCurrency(priceUSD: number, origin: string): string {
  const originCountry = AIRPORT_COUNTRY[origin.toUpperCase()];
  const originCurrency = CURRENCIES[originCountry] ?? CURRENCIES.US;
  return formatInCurrency(priceUSD, originCurrency);
}
