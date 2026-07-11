# AlwaysPCN Workspace

AlwaysPCN is a park-connector-first route planning app built from Singapore PCN KML data.

## Overview
See product intent in `docs/PRD.md`.

## Stack Defaults
- Next.js + TypeScript (App Router)
- Tailwind CSS + shadcn/ui + lucide-react
- Leaflet map rendering

## Getting Started
From repo root:
```bash
cd alwayspcn
npm install
npm run dev
```

## Documentation Map
- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/USER_FLOWS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/DESIGN_BRIEF.md`

## Plans
All execution plans are in `plans/`.

## Workflow Router
Use `AGENTS.md` as canonical task routing and gate policy.

## Skills
- Local core skills: `skills/*`
- External skill references: `skills/external/*`

## UI and Motion Defaults
- Tailwind + shadcn/ui defaults
- Motion only when interaction requirements justify it

## Testing and Validation
Run available lint/typecheck/build scripts and report unavailable commands.

## Security and Changelog
- Security reports: `security-reports/`
- Changelogs: `changelogs/`

## Firecrawl Auth
Populate `agent.env` with `FIRECRAWL_API_KEY` before using Firecrawl MCP.
If your harness does not auto-load `agent.env`, run:
```bash
set -a; source agent.env; set +a
```
