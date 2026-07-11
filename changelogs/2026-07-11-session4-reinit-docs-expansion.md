# Changelog — 2026-07-11 Session 5: Map Style Switcher

## Added
- `alwayspcn/src/components/map/route-map.tsx` — map style switcher (Street / Satellite / Map) as a floating segmented button group in the top-right corner of the map.
  - Three tile providers: OpenStreetMap (street), ESRI World Imagery (satellite), CartoDB Positron (clean map).
  - `mapStyle` state drives `TileLayer` re-mount via `key` prop.
  - All PCN, roads, and route overlays remain on top of all base tile styles.

## Validation
- `npm run build` passed (TypeScript clean, static page generation complete).

---

# Changelog — 2026-07-11 Session 4: Re-Initialization + Docs Expansion

## Changed
- `mcp.json` — added `deepwiki` MCP server entry (HTTP, `https://mcp.deepwiki.com/mcp`); all existing servers preserved.
- `AGENTS.md` — expanded MCP Operational Requirement section to reference DeepWiki as primary docs source and Context7 as secondary.
- `docs/PRD.md` — full rewrite to implementation-ready quality:
  - Added versioning header, problem statement narrative
  - Added 3 user personas with goals
  - Expanded functional requirements FR-1 through FR-7 with implementation detail
  - Added non-functional requirements NFRs (performance, accessibility, security, browser support, maintainability)
  - Added 4 epics with story table (Epic A/B/C/D)
  - Added full acceptance criteria table (12 criteria)
  - Added risk register with likelihood/impact/mitigation
  - Added v2 backlog
- `docs/DESIGN_BRIEF.md` — full rewrite to comprehensive design system brief:
  - Added concept statement
  - Added colour palette tables (PCN kind, active route, OSM highway class)
  - Added typography scale
  - Added UI component inventory with shadcn mapping
  - Added page layout diagram and responsive breakpoints
  - Added motion policy (Tailwind-only, no Motion in v1)
  - Added accessibility requirements (WCAG 2.1 AA, keyboard nav, aria)
  - Added error/empty state table
  - Added design debt and v2 targets
- `docs/IMPLEMENTATION_PLAN.md` — updated with completed phase checkmarks and upcoming Phase 8–11 backlog.
- `TODO.md` — added session 4 completed items; reorganised backlog with Epic IDs.

## Added
- `plans/2026-07-11-125156-reinit-deepwiki-docs-plan.md` — plan for this cycle.
- `changelogs/2026-07-11-session4-reinit-docs-expansion.md` — this file.

## Validation Gate
- `npm run lint` — pass (no changes to app source)
- App scaffold: unchanged; previously validated pass

## MCP Operational Usage
- DeepWiki MCP config added to `mcp.json`; operational usage will be attempted in next relevant task.
- codemogger index from prior session remains valid (no source changes in this cycle).

## Security Gate
- No app code changes in this cycle; no security review required.
- Existing security posture unchanged.

## Skipped Gates
- Test run: no test infrastructure exists (unavailable); reported.
- Coverage: no coverage tooling (unavailable); reported.
