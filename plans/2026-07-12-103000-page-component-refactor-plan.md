# Plan: page.tsx Component & Hook Refactor

## Goal
Break `src/app/page.tsx` (~530 lines) into focused hooks and components so each file has a single responsibility and can be reasoned about independently.

## Inputs
- `alwayspcn/src/app/page.tsx` (530-line monolithic component)

## Assumptions
- No behaviour changes; purely structural.
- `setMessage` (React setState setter) is a stable reference — safe to use in effect deps.
- Worker URL resolves correctly from `src/hooks/` (`../workers/route-worker.ts`).
- Cluster settings restore before graph-building fires (async gap guarantees this).

## Implementation Steps

### Hooks → `src/hooks/`
| File | Responsibility |
|---|---|
| `use-draggable.ts` | Pointer-drag position management (moved from page.tsx) |
| `use-theme.ts` | `isDark`, `toggleDark`, localStorage persistence |
| `use-advanced-settings.ts` | `clusterEnabled`, `clusterThreshold`, `routeWeights`, localStorage persistence |
| `use-route-engine.ts` | Worker lifecycle, graph loading, road loading, graph building, client + server routing |
| `use-location-input.ts` | `start`/`end` coords, text inputs, `pickMode`, geocoding, `applyLocations`, `onMapPick` |

### Components → `src/components/panels/`
| File | Renders |
|---|---|
| `DraggableCard.tsx` | Draggable outer shell with title bar + collapse toggle (owns drag state internally) |
| `StatusBox.tsx` | Status message + route result summary |
| `RouteLegend.tsx` | Collapsible legend (owns open/closed state internally) |
| `NetworkStats.tsx` | PCN/road/active vertex stats block |
| `RouteWeightsEditor.tsx` | 7-slider weight controls |
| `RoutePanel.tsx` | Route planner card content (location inputs, search, status, legend) |
| `AdvancedPanel.tsx` | Advanced card content (routing mode, overlays, stats, clustering, weights) |

### Update
- `src/app/page.tsx` → ~75-line composition root only

## Validation Steps
1. `npm run lint` (in alwayspcn/) — zero new errors
2. `npm run build` — clean build

## Risks and Rollback
- Risk: Worker URL relative path changes — test by running dev server.
- Rollback: git revert the commit if build fails.
