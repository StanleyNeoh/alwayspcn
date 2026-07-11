# Plan: Map Style Switcher

**Date**: 2026-07-11
**Scope**: map-style-switcher

## Goal
Add a floating UI control to the map that lets users switch between three base tile layers: Street, Satellite, and Map (clean/minimal).

## Tile Providers
| Key | Label | Provider | Notes |
|---|---|---|---|
| `street` | Street | OpenStreetMap | Current default |
| `satellite` | Satellite | ESRI World Imagery | Free, no API key |
| `map` | Map | CartoDB Positron | Clean/minimal, no API key |

## Implementation Steps
1. Add `useState` import to `route-map.tsx`.
2. Define `MapStyleKey` type and `MAP_STYLES` config const at module level.
3. Add `mapStyle` state (default `"street"`) inside `RouteMap`.
4. Wrap `MapContainer` in a `relative h-full w-full` div.
5. Add `key={mapStyle}` to `TileLayer` to force re-mount on style change.
6. Overlay a segmented button group (top-right, `z-[1000]`) for the three styles.

## Files Changed
- `alwayspcn/src/components/map/route-map.tsx`

## Validation
- Dev build passes (`npm run build`).
- All three tile styles render visually.
- PCN, roads, and route overlays remain visible on all styles.

## Risks
- ESRI and CartoDB tile URLs are public and rate-limited; acceptable for dev/demo use.
- Satellite tiles are dark — PCN overlay colours remain readable.
