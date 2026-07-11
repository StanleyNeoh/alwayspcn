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
