# PRD: AlwaysPCN

**Version:** 1.1  
**Status:** Implementation-Ready  
**Last Updated:** 2026-07-11  

---

## 1. Problem Statement

Generic route planners (Google Maps, Citymapper) optimise for fastest travel time and often
route cyclists and runners through arterial roads. Singapore's Park Connector Network (PCN)
offers scenic, low-traffic alternatives that generic planners consistently deprioritise.

Users who prefer park-connector routes currently have no dedicated tool; they rely on memory,
manual inspection of NParks maps, or incomplete third-party guides.

---

## 2. Users and Personas

### 2.1 Primary: Connector-Preferring Cyclists
- Recreational cyclists who ride for enjoyment, not commute speed.
- Fitness cyclists who prefer safe, uninterrupted stretches to accumulate distance.
- **Goal:** Find a route that maximises time on park connectors with minimum detour.

### 2.2 Secondary: Runners and Walkers
- Runners doing long training routes.
- Families on weekend strolls using park paths.
- **Goal:** Discover connected green routes between two points.

### 2.3 Tertiary: Planners and Explorers
- Users researching connectivity gaps in the PCN.
- Tour planners building self-guided itineraries.
- **Goal:** Understand how well two points are connected via the park network.

---

## 3. Goals and Non-Goals

### Goals
- Accept arbitrary start and end coordinates or place names.
- Compute a park-connector-preferred route via a weighted graph.
- Render the computed route on a map with clear visual distinction.
- Surface a connector usage percentage so the user understands path composition.
- Display roads and PCN overlays as navigational context.
- Fall back gracefully when no connector-only path exists.

### Non-Goals (v1)
- Turn-by-turn voice navigation.
- Real-time closures and obstruction updates.
- Multi-leg trip planning.
- Elevation data.
- User accounts or saved routes.
- Mobile native app.

---

## 4. Functional Requirements

### FR-1: Network Graph Loading
- On page load, fetch `/data/network.json` (pre-built PCN graph) and `/data/roads.json` (road overlay).
- Validate loaded JSON against expected graph schema before accepting.
- Reject malformed payloads with a clear in-app error message.

### FR-2: Location Input
- Accept start and end points as either:
  - Place name / address string → resolved via Nominatim geocoding (Singapore-scoped).
  - Raw coordinate string in `lat,lng` format.
- Debounce geocoding requests by 300 ms.
- Display resolved coordinate beneath each input field for confirmation.

### FR-3: Connector-Preferred Routing
- Snap start/end to nearest graph node (haversine, nearest-within-threshold).
- Run Dijkstra over the adjacency list with weighted edges:
  - Park connector segments: weight factor 0.72.
  - Other segments: weight factor 1.08.
- Execute routing in a Web Worker to keep the main thread unblocked.
- Suppress stale results using per-request IDs.

### FR-4: Route Result Display
- Render computed route as a polyline on the map.
- Show total distance in kilometres.
- Show connector share as a percentage badge.
- Show a warning badge when `usesFallback` is true (non-connector segments used).
- Show a clear no-route message when no path is found.

### FR-5: Map Context Overlays
- Roads layer: GeoJSON of Singapore OSM road network with highway-class colour scale.
- PCN layer: GeoJSON derived from `network.json` edges with route-kind colour scale.
- Basemap: OpenStreetMap tiles.
- Layer stacking order (bottom to top): basemap → roads → PCN → computed route → markers.

### FR-6: Map Legend
- Display a legend panel listing colour keys for road highway classes and PCN route kinds.
- Legend must be dismissable or collapsible on small screens.

### FR-7: Performance
- Route computation must complete in under 2 seconds on a modern desktop for the Singapore PCN graph (~39 k nodes).
- Avoid main-thread blocking for graphs above 5 000 nodes; Web Worker required.

---

## 5. Non-Functional Requirements

### NFR-1: Performance
- First Contentful Paint < 2 s on a 10 Mbps connection.
- Route computation < 2 s (Web Worker).
- Roads and network JSON pre-built at build time; no runtime server-side computation.

### NFR-2: Accessibility
- WCAG 2.1 AA minimum.
- Keyboard-navigable route inputs and submit control.
- Screen-reader labels on all interactive elements.
- Adequate contrast on map overlays (route line ≥ 3:1 against basemap).
- Focus ring visible on all interactive controls.

### NFR-3: Security
- No credentials stored in the client bundle.
- `agent.env` and secrets excluded from VCS via `.gitignore`.
- Runtime graph schema validation guards routing engine against malformed payloads.
- Main-thread fallback disabled for large graphs to prevent UI freeze DoS.
- Content Security Policy headers recommended for production deployment.

### NFR-4: Browser Support
- Modern evergreen browsers (Chrome 120+, Firefox 120+, Safari 16+).
- No IE11 support.
- Mobile viewport supported; full responsiveness not required in v1 but layout must not break.

### NFR-5: Maintainability
- KML source in `data/doc.kml` is the single source of truth; scripts are re-runnable.
- Graph build scripts run automatically at `predev` and `prebuild` via npm hooks.
- Type-safe throughout (TypeScript strict mode).

---

## 6. Epics and Stories

### Epic A: Graph Pipeline
| ID   | Story                                                                        | AC ID  |
|------|------------------------------------------------------------------------------|--------|
| A-1  | As a developer I can run `npm run build:network` to regenerate network.json  | AC-A1  |
| A-2  | As a developer I can run `npm run build:roads` to regenerate roads.json      | AC-A2  |
| A-3  | Invalid graph JSON is rejected before it reaches the routing engine          | AC-A3  |

### Epic B: Routing
| ID   | Story                                                                        | AC ID  |
|------|------------------------------------------------------------------------------|--------|
| B-1  | As a user I can enter a start location and end location and receive a route  | AC-B1  |
| B-2  | As a user I see how much of my route is on park connectors                   | AC-B2  |
| B-3  | As a user I am notified when the route includes non-connector road sections  | AC-B3  |
| B-4  | As a user I see a clear message when no route exists                         | AC-B4  |

### Epic C: Map
| ID   | Story                                                                        | AC ID  |
|------|------------------------------------------------------------------------------|--------|
| C-1  | As a user I see a roads layer with highway-class colour coding               | AC-C1  |
| C-2  | As a user I see a PCN overlay with route-kind colour coding                  | AC-C2  |
| C-3  | As a user I can read a map legend explaining colour keys                     | AC-C3  |

### Epic D: Location Input
| ID   | Story                                                                        | AC ID  |
|------|------------------------------------------------------------------------------|--------|
| D-1  | As a user I can type a place name and have it geocoded to coordinates        | AC-D1  |
| D-2  | As a user I can paste raw lat,lng coordinates                                | AC-D2  |

---

## 7. Acceptance Criteria

| AC ID | Criterion                                                                                      |
|-------|-----------------------------------------------------------------------------------------------|
| AC-A1 | `build:network` produces valid `network.json` with ≥ 1 node and ≥ 1 edge from `data/doc.kml` |
| AC-A2 | `build:roads` produces valid GeoJSON FeatureCollection with ≥ 1 feature                       |
| AC-A3 | Loading a JSON file with missing `nodes` or `adj` keys triggers a validation error message   |
| AC-B1 | User can input start + end, click Route, and receive a polyline on the map                   |
| AC-B2 | Route result card shows connector share percentage                                            |
| AC-B3 | Route result card shows a "Includes non-connector segments" badge when `usesFallback: true`   |
| AC-B4 | When no path exists, app displays "No route found" message with actionable suggestion         |
| AC-C1 | Roads overlay renders on map with distinct colours per OSM highway class                      |
| AC-C2 | PCN overlay renders with distinct colours per connector kind                                  |
| AC-C3 | Map legend panel is visible and lists all active colour codes                                 |
| AC-D1 | Typing a Singapore place name and pressing Enter resolves to a visible pin on the map         |
| AC-D2 | Pasting "1.3521,103.8198" into an input field is accepted as a valid coordinate               |

---

## 8. Risks

| Risk                                     | Likelihood | Impact | Mitigation                                           |
|------------------------------------------|------------|--------|------------------------------------------------------|
| Large KML parsing cost at build time     | Medium     | Low    | Offline build script; result cached in JSON          |
| PCN graph contains disconnected islands  | High       | Medium | Connector fallback routing; clear user message       |
| Nominatim rate limiting                  | Low        | Low    | Debounce requests; show error on failure             |
| Overpass API unavailability              | Low        | Low    | `roads.json` has 24 h cache; degrades gracefully     |
| Large-graph main-thread freeze           | Low        | High   | Web Worker enforced; main-thread fallback disabled   |

---

## 9. v2 Backlog

- Alternate route suggestions (2–3 paths with different connector ratios).
- Closure-aware routing from a KML closure layer.
- Mobile PWA with offline support and cached graph.
- Priority queue Dijkstra to improve performance on large graphs.
- Click-on-map to set start/end markers.
- GPX/route export.
- User-submitted connector gap annotations.
