# Implementation Plan

## Phase 1: Bootstrap
- Generate workflow files, docs, plans, and MCP config.

## Phase 2: App Scaffold
- Scaffold Next.js TypeScript app in `alwayspcn/`.
- Configure Tailwind and shadcn/ui.

## Phase 3: Data Pipeline
- Add parser script for `data/doc.kml`.
- Emit normalized graph JSON in app public assets.

## Phase 4: Routing Engine
- Implement graph utilities and Dijkstra preference weighting.
- Add route summary stats and fallback indicators.

## Phase 5: UI
- Build map page with start/end inputs and click-to-set controls.
- Render route and metadata panel.

## Phase 6: Validation
- Run lint/typecheck/build.
- Add utility tests where practical.

## Phase 7: Roads Overlay + Geocoding
- Fetch Singapore road network from Overpass API at build time; save to `public/data/roads.json` with 24 h staleness cache.
- Add dual visual overlay on map: OSM road layer (highway-class colour scale) + PCN route layer (kind colour scale).
- Add Nominatim geocoding: start/end inputs accept place names or raw lat,lng; inputs snap to resolved coordinates after geocoding.
- Map legend panel with colour key for roads and PCN kinds.
- Graceful degradation when `roads.json` is absent.
