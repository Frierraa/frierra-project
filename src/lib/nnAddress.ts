type NominatimItem = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string;
  };
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CITY = "Нижний Новгород";

function cityMatches(address: NominatimItem["address"]): boolean {
  const city = (address?.city || address?.town || address?.village || "").toLowerCase();
  return city.includes("нижний");
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function getStreetName(address: NominatimItem["address"]): string {
  return (address?.road || address?.pedestrian || address?.footway || "").trim();
}

async function nominatimSearch(q: string, limit = 8): Promise<NominatimItem[]> {
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "ru",
    limit: String(limit),
  });
  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      "accept-language": "ru",
      "user-agent": "burger-size-dev/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("ADDRESS_LOOKUP_FAILED");
  const data = (await res.json().catch(() => [])) as unknown;
  return Array.isArray(data) ? (data as NominatimItem[]) : [];
}

export async function suggestNnStreets(query: string): Promise<string[]> {
  const q = normalize(query);
  if (q.length < 2) return [];

  const rows = await nominatimSearch(`${q}, ${CITY}`, 20);
  const unique = new Map<string, string>();
  for (const row of rows) {
    if (!cityMatches(row.address)) continue;
    const street = getStreetName(row.address);
    if (!street) continue;
    const key = normalize(street);
    if (!unique.has(key)) unique.set(key, street);
  }
  return Array.from(unique.values()).slice(0, 10);
}

export async function suggestNnHouses(street: string, query: string): Promise<string[]> {
  const s = normalize(street);
  const q = normalize(query);
  if (!s || q.length < 1) return [];

  const rows = await nominatimSearch(`${street} ${query}, ${CITY}`, 20);
  const unique = new Map<string, string>();
  for (const row of rows) {
    if (!cityMatches(row.address)) continue;
    const rowStreet = getStreetName(row.address);
    if (normalize(rowStreet) !== s) continue;
    const house = (row.address?.house_number || "").trim();
    if (!house) continue;
    if (!normalize(house).includes(q)) continue;
    const key = normalize(house);
    if (!unique.has(key)) unique.set(key, house);
  }
  return Array.from(unique.values()).slice(0, 10);
}

export async function validateNnHouse(street: string, house: string): Promise<boolean> {
  const s = normalize(street);
  const h = normalize(house);
  if (!s || !h) return false;

  const rows = await nominatimSearch(`${street} ${house}, ${CITY}`, 20);
  for (const row of rows) {
    if (!cityMatches(row.address)) continue;
    const rowStreet = normalize(getStreetName(row.address));
    const rowHouse = normalize(row.address?.house_number || "");
    if (rowStreet === s && rowHouse === h) return true;
  }
  return false;
}

