# Changelog - 2026-07-11

## Added
- Workflow bootstrap files (`AGENTS.md`, local skills, docs, plan, TODO, README).
- MCP configuration (`mcp.json`) with Context7, Firecrawl, Chrome DevTools, Vercel Next DevTools, codemogger.
- Environment templates (`agent.env`, `agent.env.example`) and `.gitignore` updates.
- External skill installation and canonical references under `skills/external/`.

## Pending in this run
- None.

## Implemented
- Scaffolded `alwayspcn/` (with `AlwaysPCN` symlink alias) using Next.js + TypeScript + Tailwind.
- Initialized shadcn/ui and integrated map controls using shadcn components.
- Added `alwayspcn/scripts/build-network.mjs` to parse `data/doc.kml` and generate `alwayspcn/public/data/network.json`.
- Added connector-weighted routing engine in `alwayspcn/src/lib/routing.ts`.
- Added map renderer in `alwayspcn/src/components/map/route-map.tsx` and routing UI in `alwayspcn/src/app/page.tsx`.
- Added composed connector routes under folder `AlwaysPCN Composed Park Connector Routes` in `data/doc.kml`.

## Validation Gate Evidence
- `npm run lint` (pass)
- `npm run build` (pass)

---

## Session 2 — Roads + Geocoding + PCN Overlay

### Added
- `alwayspcn/scripts/build-roads.mjs` — fetches Singapore road network from Overpass API, saves to `public/data/roads.json` with 24 h staleness cache. Non-fatal if Overpass is unreachable.
- `alwayspcn/src/lib/geocode.ts` — Nominatim geocoding utility; resolves Singapore place names / addresses to `[lng, lat]`.
- `alwayspcn/src/lib/graph-to-geojson.ts` — converts `GraphData` to GeoJSON FeatureCollection for PCN overlay.

### Modified
- `package.json` — added `build:roads` script; updated `predev` and `prebuild` to run it (with 24 h file cache so subsequent starts are instant).
- `route-map.tsx` — added `roadsGeojson` and `pcnGeojson` props; renders OSM roads layer (highway-class colours) below PCN layer (kind colours) below active route.
- `page.tsx` — added roads + PCN GeoJSON state; `loadGraph` now also fetches roads and builds PCN overlay; smart location input accepts `lat,lng` OR place name (geocoded via Nominatim); `Apply / Locate` button with loading spinner; map legend.

### Validation Gate Evidence (session 2)
- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm run build:network` — pass (39,407 nodes, 39,606 segments)
- `npm run build:roads` — pass (83,576 road segments, 16 MB)
- Dev server started; `/data/network.json` and `/data/roads.json` served correctly

## Security Review Gate Evidence
- External security-focused review executed via subagent.
- Findings: 2 low-severity hardening items (client-side compute DoS risk, runtime JSON schema validation gap).

## MCP Operational Usage Evidence
- `npx -y codemogger index .` (pass)
- `npx -y codemogger search "park connector routing" --limit 3` (pass)

## Docs and TODO Gates
- Docs updated in `docs/` and root `README.md`.
- `TODO.md` updated with completed and backlog items.

## Hardening Follow-Up (Same Day)
- Added runtime graph schema validation in `alwayspcn/src/lib/graph-validation.ts`.
- Moved route computation to Web Worker in `alwayspcn/src/workers/route-worker.ts`.
- Updated `alwayspcn/src/app/page.tsx` to debounce route requests and ignore stale worker results.
- Added guarded fallback behavior to prevent large-graph main-thread routing freeze.

## Hardening Validation
- `npm run lint` (pass)
- `npm run build` (pass)

## Hardening Security Review Attempt
- Security review subagent re-run on worker + validation changes.
- Result: previous schema-validation finding mitigated; compute DoS risk reduced with residual low-risk fallback concern.
- Final mitigation added: disable main-thread fallback on large graphs.

---

## Session 3 — Location Autocomplete Dropdown

### Added
- `alwayspcn/src/lib/geocode.ts` — added `searchLocations(query, limit)` returning up to 6 `GeocodeSuggestion` objects from Nominatim (Singapore-scoped).
- `alwayspcn/src/components/ui/location-combobox.tsx` — new `LocationCombobox` component: debounced search (320 ms), keyboard navigation (↑↓ Enter Esc), ARIA combobox role, auto-clears on empty or raw-coord input.

### Modified
- `alwayspcn/src/app/page.tsx` — replaced plain `Input + Label` pairs for Start/End with `LocationCombobox`; selecting a suggestion directly sets the coordinate without requiring "Apply / Locate".

### Validation Gate Evidence (session 3)
- `npm run lint` — pass (after fixing `set-state-in-effect` and `aria-expanded` on textbox role)
- `npx tsc --noEmit` — pass

### Security Review Gate Evidence (session 3)
- URL built via `URL` constructor + `searchParams.set()` — no injection risk.
- Nominatim hostname hardcoded — no SSRF.
- Suggestion labels rendered as React text nodes — no XSS.
- Findings: none at HIGH confidence.
