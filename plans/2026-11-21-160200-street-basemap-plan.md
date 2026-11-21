# Street basemap reliability

## Goal
Keep the leftmost Street basemap usable without credentials and give riders a clear recovery path when public basemap tiles fail.

## Inputs and assumptions
- `alwayspcn/src/components/map/route-map.tsx` renders Street (OpenStreetMap), Satellite (Esri), and Map (CARTO) in a single Leaflet map. Map is the default.
- The app neither reads nor sends a tile API key. Sample Street tiles load from this environment, so the reported failure cannot be attributed to a missing key here. OpenStreetMap documents a single canonical tile hostname and may restrict access to its public service.

## Implementation
1. Use OpenStreetMap's canonical tile URL and keep attribution visible for the active provider.
2. When no tile loads in the first batch after choosing a basemap, try one alternate provider without remounting the map or resetting overlays. If the alternate also fails, explain how to retry. Leave partial tile failures alone.
3. Document provider requirements and update the review evidence, changelog, and TODO.

## Validation
- Run lint, TypeScript checking, and a production build; compare any failures with the baseline.
- Browser-check all three real providers without keys, mixed success, total provider failure, retry, and route overlay preservation. Test the notice at a narrow viewport.
- Review the tile URLs, attribution HTML, and request data flow for security regressions.

## Risks and rollback
Public tile providers can throttle or become unreachable. A fallback is not an offline map or a service guarantee. The change adds no dependencies or credentials and can be reverted in one commit.
