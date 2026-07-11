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
