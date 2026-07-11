# Technical Plan

## Architecture
- Next.js app in `alwayspcn/`.
- Leaflet map rendering.
- Build-time script parses `data/doc.kml` and emits `alwayspcn/public/data/network.json`.
- Client-side routing engine runs Dijkstra over adjacency list in a Web Worker.

## Network Model
- Node: quantized coordinate key (`lng,lat` rounded to 1e-5).
- Edge: distance meters + metadata (`kind`, `name`).
- Weight: `distance * preferenceFactor`, where park connector factor < 1.

## Routing Strategy
1. Snap user start/end to nearest node (haversine).
2. Dijkstra with weighted edges.
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
