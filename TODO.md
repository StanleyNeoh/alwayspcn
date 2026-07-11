# TODO

## In Progress
- None

## Completed
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
- Add geocoder integration for address search
- Add alternate route suggestions
- Add closure-aware routing from KML closure layer
- Add mobile PWA offline support
- Replace O(n^2) Dijkstra selection with priority queue for faster large-network routing
