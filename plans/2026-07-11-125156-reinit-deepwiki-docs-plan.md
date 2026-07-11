# Re-Initialization Plan: DeepWiki MCP + Full Docs Expansion

## Timestamp
2026-07-11-125156

## Goal
Re-run initialization workflow to add DeepWiki MCP, expand PRD and DESIGN_BRIEF to
implementation-ready quality, confirm all workflow gates, and update all supporting docs.

## Source Inputs
- User request (explicitly DeepWiki MCP, full PRD, full design brief)
- Existing workspace: AGENTS.md, mcp.json, docs/, skills/, alwayspcn/
- INIT_AGENT_WORKFLOW.md

## Current State Assessment
| Artifact              | Status                          |
|-----------------------|---------------------------------|
| AGENTS.md             | Exists – good, needs DeepWiki   |
| mcp.json              | Exists – add deepwiki entry     |
| skills/external/gsd   | Installed via .agents symlink   |
| All other ext skills  | Installed via .agents symlinks  |
| Core local skills     | All 8 exist and populated       |
| docs/PRD.md           | Exists – too minimal, expand    |
| docs/DESIGN_BRIEF.md  | Exists – too minimal, expand    |
| docs/TECHNICAL_PLAN   | Exists – adequate               |
| docs/IMPL_PLAN        | Exists – adequate               |
| docs/USER_FLOWS       | Exists – adequate               |
| docs/DATA_MODEL       | Exists – adequate               |
| docs/API.md           | Exists – adequate               |
| TODO.md               | Exists – update                 |
| README.md             | Exists – good                   |
| alwayspcn/ app        | Scaffolded + Tailwind + shadcn  |
| plans/ entries        | 3 existing plans                |
| changelogs/           | 1 entry exists                  |
| agent.env             | Exists with placeholder         |

## Work Items
1. Add DeepWiki MCP to mcp.json (additive, do not remove existing servers)
2. Update AGENTS.md MCP operational requirement to reference DeepWiki
3. Expand docs/PRD.md to full implementation-ready detail
4. Expand docs/DESIGN_BRIEF.md to full design system + brief
5. Update docs/IMPLEMENTATION_PLAN.md to reflect completed phases + upcoming
6. Update TODO.md
7. Create changelog entry
8. Run validation (lint + typecheck + build)
9. Attempt codemogger index
10. Emit evidence output

## Assumptions
- DeepWiki MCP uses HTTP endpoint: https://deepwiki.com/mcp
- Context7 remains in mcp.json (do not delete)
- App scaffold is complete and does not need re-scaffolding
- No new feature work in this cycle – docs + MCP config only

## Done Criteria
- deepwiki entry present in mcp.json
- AGENTS.md references deepwiki in MCP operational requirement
- PRD.md is fully implementation-ready with epics, ACs, NFRs, backlog
- DESIGN_BRIEF.md is comprehensive with palette, typography, components, accessibility
- TODO.md updated
- Changelog updated
- Validation attempted and result recorded
