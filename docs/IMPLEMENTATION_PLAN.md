# Implementation Plan

**Last Updated:** 2026-07-11

---

## Phase 1: Bootstrap ✅ Complete
- Generated workflow files (`AGENTS.md`, local skills, docs, plans, MCP config).
- Created `agent.env` and `agent.env.example`.
- Installed external skills (gsd, frontend-design, agent-browser, react-grab, security-review, changelog-automation, documentation-writer).

## Phase 2: App Scaffold ✅ Complete
- Scaffolded Next.js 16 + TypeScript + Tailwind v4 app in `alwayspcn/`.
- Initialized shadcn/ui; integrated `Button`, `Card`, `Input`, `Label`, `Badge` components.
- Installed `lucide-react` for icons; Motion not installed (not yet required).

## Phase 3: Data Pipeline ✅ Complete
- `scripts/build-network.mjs` — parses `data/doc.kml`, emits `public/data/network.json`.
  - Produces ~39 407 nodes, ~39 606 segments.
- `scripts/build-roads.mjs` — fetches Singapore road network from Overpass API, emits `public/data/roads.json` (24 h staleness cache).
  - Produces ~83 576 road segments.
- `predev` and `prebuild` hooks run both scripts automatically.

## Phase 4: Routing Engine ✅ Complete
- `src/lib/routing.ts` — Dijkstra with PCN weight factor 0.72, other 1.08.
- `src/lib/graph-validation.ts` — runtime schema validation before graph acceptance.
- `src/workers/route-worker.ts` — Web Worker execution; stale response suppression via request IDs.
- Nearest-node snapping via haversine.

## Phase 5: Map UI ✅ Complete
- `src/components/map/route-map.tsx` — Leaflet map with roads, PCN, and route polyline layers.
- `src/app/page.tsx` — location inputs with geocoding, route button, result badges, legend.
- `src/lib/geocode.ts` — Nominatim geocoding (Singapore-scoped).
- `src/lib/graph-to-geojson.ts` — PCN edge extraction to GeoJSON overlay.
- `src/components/ui/location-combobox.tsx` — geocoded location input with loading state.

## Phase 6: Roads + Geocoding + PCN Overlay ✅ Complete
- Dual-layer map: OSM roads (highway-class colours) + PCN routes (kind colours).
- Place-name and raw lat,lng input; `Apply / Locate` button.
- Map legend with colour keys for roads and PCN kinds.
- Graceful degradation when `roads.json` is absent.

## Phase 7: Workflow Re-Initialization ✅ Current
- Added DeepWiki MCP to `mcp.json`.
- Expanded `docs/PRD.md` to full implementation-ready quality (epics, ACs, NFRs, risks, backlog).
- Expanded `docs/DESIGN_BRIEF.md` to comprehensive design system brief.
- Updated `AGENTS.md` MCP operational requirement with DeepWiki reference.

---

## Upcoming Phases (Backlog)

### Phase 8: Alternate Routes
- Compute 2–3 alternate paths with different connector ratios.
- Display side-by-side comparison in result panel.

### Phase 9: Closure-Aware Routing
- Parse KML closure layer from `data/doc.kml`.
- Exclude closed segments from routing graph.

### Phase 10: Priority Queue Dijkstra
- Replace O(n²) selection with a min-heap priority queue.
- Target: route computation < 500 ms for full Singapore PCN graph.

### Phase 11: Mobile PWA
- Responsive bottom-sheet control panel.
- Offline mode with cached graph JSON.
- Installable PWA manifest.

