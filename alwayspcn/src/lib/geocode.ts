import type { Coordinate } from "./routing";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

/**
 * Geocode a place name / street address to [lng, lat] coordinates.
 * Restricted to Singapore. Returns null if no result is found.
 */
export async function geocodeLocation(query: string): Promise<Coordinate | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "sg");
  url.searchParams.set("addressdetails", "0");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let results: NominatimResult[];
  try {
    results = await response.json();
  } catch {
    return null;
  }

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const { lon, lat } = results[0];
  const lng = Number.parseFloat(lon);
  const latitude = Number.parseFloat(lat);
  if (Number.isNaN(lng) || Number.isNaN(latitude)) {
    return null;
  }
  return [lng, latitude];
}

export type GeocodeSuggestion = {
  label: string;
  coordinate: Coordinate;
};

/**
 * Search for matching place names / addresses in Singapore.
 * Returns up to `limit` suggestions for autocomplete dropdowns.
 */
export async function searchLocations(
  query: string,
  limit = 6
): Promise<GeocodeSuggestion[]> {
  if (!query.trim()) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "sg");
  url.searchParams.set("addressdetails", "0");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  let results: NominatimResult[];
  try {
    results = await response.json();
  } catch {
    return [];
  }

  if (!Array.isArray(results)) return [];

  return results.flatMap((r) => {
    const lng = Number.parseFloat(r.lon);
    const lat = Number.parseFloat(r.lat);
    if (Number.isNaN(lng) || Number.isNaN(lat)) return [];
    return [{ label: r.display_name, coordinate: [lng, lat] as Coordinate }];
  });
}
