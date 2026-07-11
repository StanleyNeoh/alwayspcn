# Technical Plan

## Architecture
- Next.js app in `alwayspcn/`.
- Leaflet / react-leaflet map rendering.
- Build-time scripts:
  - `build-network.mjs` — parses `data/doc.kml`, emits `public/data/network.json`.
  - `build-roads.mjs` — fetches Singapore roads from Overpass API, emits `public/data/roads.json` (24 h cache).
- Client-side routing engine runs Dijkstra over adjacency list in a Web Worker.
- Geocoding via Nominatim (Singapore-scoped, browser-side).

## Network Model
- Node: quantized coordinate key (`lng,lat` rounded to 1e-5).
- Edge: distance meters + metadata (`kind`, `name`).
- Weight: `distance * preferenceFactor`, where park connector factor < 1.

## Map Layers (bottom → top)
1. OpenStreetMap tile base.
2. Roads GeoJSON (`roads.json`) — highway class colour scale.
3. PCN GeoJSON (derived from `network.json`) — route kind colour scale.
4. Computed route polyline.
5. Start / end markers.

## Routing Strategy
1. Snap user start/end to nearest node (haversine).
2. Dijkstra with weighted edges (PCN factor 0.72, other 1.08).
3. Reconstruct path and calculate connector percentage.

## Performance
- Parse once offline.
- Keep graph JSON lean and indexed.
- Debounce route requests and ignore stale worker responses via request IDs.

## Security
- No credentials in client bundle.
- `agent.env` ignored from VCS.
- Runtime graph schema validation guards malformed payloads before routing.
- Main-thread fallback is disabled for large graphs to prevent UI freeze.
