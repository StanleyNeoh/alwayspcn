# TODO

## In Progress
- None

## Completed (2026-07-11 session 5)
- Map style switcher: Street (OSM), Satellite (ESRI), Map (CartoDB Positron) — floating button group top-right of map


- Added DeepWiki MCP to `mcp.json`
- Updated `AGENTS.md` MCP operational requirement with DeepWiki + Context7 references
- Expanded `docs/PRD.md` to full implementation-ready quality (epics, stories, ACs, NFRs, risks, v2 backlog)
- Expanded `docs/DESIGN_BRIEF.md` to comprehensive design system brief (palette, typography, components, layout, motion, accessibility)
- Updated `docs/IMPLEMENTATION_PLAN.md` with completed phase statuses + upcoming phases
- Created plan file `plans/2026-07-11-125156-reinit-deepwiki-docs-plan.md`

## Completed (2026-07-11 session 3)
- Location autocomplete dropdown for start/end inputs (Nominatim-backed, debounced, keyboard-navigable)

## Completed (2026-07-11 session 2)
- Singapore road network overlay from Overpass API (`build:roads` script)
- PCN routes visual overlay extracted from graph and displayed on map
- Geolocation: Nominatim geocoding for place-name start/end inputs
- Dual-layer map: roads (OSM highway classification colours) + PCN routes (kind colours)
- Map legend with colour key for roads and PCN route types
- Loading states for road fetch and geocoding
- Graceful degradation when roads.json not yet built

## Completed (2026-07-11 session 1)
- Created core workflow folders
- Installed external skills including `gsd`
- Generated `AGENTS.md`
- Generated core local skills
- Generated docs in `docs/`
- Created initial plan in `plans/`
- Added MCP config and env templates
- Scaffolded `alwayspcn` app with Tailwind + shadcn/ui
- Implemented KML graph builder and connector-first Dijkstra routing
- Added map UI for start/end selection and route rendering
- Composed park connector routes in `data/doc.kml`
- Ran lint and production build validations
- Attempted security review and codemogger index/search usage
- Added Web Worker based route computation with debounce + stale response suppression
- Added runtime graph schema validation before graph acceptance
- Hardened worker fallback to avoid large-graph main-thread freeze risk

## Backlog
- Populate `agent.env` with FIRECRAWL_API_KEY for Firecrawl MCP operations
- Add alternate route suggestions (Epic B-5)
- Add closure-aware routing from KML closure layer
- Add mobile PWA offline support
- Replace O(n²) Dijkstra selection with priority queue for faster large-network routing
- Click-on-map to set start/end markers
- GPX/route export
