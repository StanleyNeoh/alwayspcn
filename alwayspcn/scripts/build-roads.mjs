import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.cwd(), "..", "data");
const outFile = path.resolve(outDir, "roads.json");
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Skip if file is fresh (< 24 h old)
if (fs.existsSync(outFile)) {
  const stat = fs.statSync(outFile);
  if (Date.now() - stat.mtimeMs < MAX_AGE_MS) {
    console.log("[build:roads] roads.json is up to date, skipping Overpass fetch.");
    process.exit(0);
  }
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SINGAPORE_BBOX = "1.1304,103.6068,1.4710,104.0842";
const HIGHWAY_FILTER =
  "motorway|trunk|primary|secondary|tertiary|residential|unclassified";

const OVERPASS_QUERY = `[out:json][timeout:120][bbox:${SINGAPORE_BBOX}];
way[highway~"^(${HIGHWAY_FILTER})$"];
out geom qt;`;

function roundCoord(n) {
  return Math.round(n * 100000) / 100000;
}

async function fetchRoads() {
  console.log("[build:roads] Fetching Singapore road network from Overpass API...");
  console.log("[build:roads] This may take 30–120 seconds on first run.");

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AlwaysPCN/1.0 build-roads-script",
    },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
    signal: AbortSignal.timeout(150_000),
  });

  if (!response.ok) {
    throw new Error(`Overpass returned HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const features = elements
    .filter(
      (el) =>
        el.type === "way" &&
        Array.isArray(el.geometry) &&
        el.geometry.length >= 2
    )
    .map((el) => ({
      type: "Feature",
      properties: {
        highway: el.tags?.highway ?? "unknown",
        name: el.tags?.name ?? null,
      },
      geometry: {
        type: "LineString",
        coordinates: el.geometry.map((pt) => [
          roundCoord(pt.lon),
          roundCoord(pt.lat),
        ]),
      },
    }));

  const geojson = {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    source: "OpenStreetMap contributors via Overpass API (overpass-api.de)",
    features,
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(geojson));

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`[build:roads] Wrote ${outFile}`);
  console.log(`[build:roads] Road segments: ${features.length.toLocaleString()}`);
  console.log(`[build:roads] File size: ${sizeKb} KB`);
}

fetchRoads().catch((err) => {
  console.warn(`[build:roads] Warning: Failed to fetch roads — ${err.message}`);
  console.warn(
    "[build:roads] Road overlay will be unavailable. Re-run `npm run build:roads` to retry."
  );
  process.exit(0); // Non-fatal — app still works without roads overlay
});
