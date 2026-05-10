type Airport = {
  code: string;
  city: string;
  lat: number;
  lng: number;
};

const AIRPORTS: Airport[] = [
  { code: "CGK", city: "Jakarta",     lat: -6.1256,  lng: 106.6559 },
  { code: "DPS", city: "Bali",        lat: -8.7482,  lng: 115.1673 },
  { code: "SUB", city: "Surabaya",    lat: -7.3799,  lng: 112.7870 },
  { code: "UPG", city: "Makassar",    lat: -5.0617,  lng: 119.5540 },
  { code: "KNO", city: "Medan",       lat: 3.6422,   lng: 98.8855  },
  { code: "BPN", city: "Balikpapan",  lat: -1.2683,  lng: 116.8942 },
  { code: "DJJ", city: "Jayapura",    lat: -2.5769,  lng: 140.5162 },
  { code: "JOG", city: "Yogyakarta",  lat: -7.7882,  lng: 110.4319 },
  { code: "BDO", city: "Bandung",     lat: -6.9004,  lng: 107.5762 },
];

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestAirport(lat: number, lng: number): Airport {
  return AIRPORTS.reduce((best, a) =>
    distanceKm(lat, lng, a.lat, a.lng) < distanceKm(lat, lng, best.lat, best.lng)
      ? a
      : best
  );
}

export async function detectNearestAirport(): Promise<Airport | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(nearestAirport(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

export type { Airport };
