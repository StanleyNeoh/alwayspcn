# Design Brief: AlwaysPCN

## Concept
A cartographic dashboard that feels like an urban transit instrument panel rather than a generic map clone.

## Visual Direction
- Light mode with warm paper map background and high-contrast cyan route overlays.
- Display typography for headings, humanist sans for body labels.
- Bold control rail with concise route stats.

## UI System
- Tailwind + shadcn/ui components for controls.
- Leaflet for map rendering.

## Motion
- Minimal: subtle panel reveal and route stats count-up only.
- No heavy motion libraries unless UX needs expand.

## Accessibility
- Keyboard-focusable controls.
- Clear status text for route success/failure.
- Adequate contrast for route and basemap overlay.
