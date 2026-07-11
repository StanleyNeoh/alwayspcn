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
