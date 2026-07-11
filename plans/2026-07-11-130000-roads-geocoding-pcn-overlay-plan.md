# Roads + Geocoding + PCN Overlay Plan
Date: 2026-07-11

## Scope
Feature work — Normal mode.

## Requirements
1. Load Singapore road geodata from Overpass API (third-party OSM source).
2. Overlay roads + PCN routes as distinct visual layers on the OpenStreetMap map.
3. Geocoding: accept street name / place name as start/end, resolve via Nominatim.
4. Routing already prefers PCN via FACTOR weights — no engine change needed.

## Data Flow
- Build-time: `scripts/build-roads.mjs` fetches Overpass → `public/data/roads.json` (24 h cache).
- Client: loads `/data/network.json` (PCN graph) AND `/data/roads.json` (road GeoJSON) on "Load Network".
- PCN overlay: derived client-side from `network.json` graph data via `graph-to-geojson.ts`.
- Geocoding: Nominatim `nominatim.openstreetmap.org/search` called from browser; filtered to Singapore.

## Files
### New
- `alwayspcn/scripts/build-roads.mjs`
- `alwayspcn/src/lib/geocode.ts`
- `alwayspcn/src/lib/graph-to-geojson.ts`

### Modified
- `alwayspcn/package.json` — add `build:roads` script; update `predev` + `prebuild`
- `alwayspcn/src/components/map/route-map.tsx` — add GeoJSON overlay props
- `alwayspcn/src/app/page.tsx` — roads state, PCN GeoJSON state, geocoding logic

## Layer Render Order (bottom → top)
1. OSM tile base
2. Singapore roads GeoJSON (gray, weight 1–2)
3. PCN routes GeoJSON (teal/green, weight 3)
4. Computed route polyline (blue, weight 6)
5. Start / end markers

## Risks
- Overpass query for Singapore may take 30–120 s on first build. Script is non-fatal; roads overlay degrades gracefully if file absent.
- roads.json may be 5–15 MB depending on highway type coverage. Leaflet handles this but initial paint may lag on slow devices.
- Nominatim rate limit: 1 req/s. App makes at most 2 concurrent geocode calls (start + end), well within limits.
