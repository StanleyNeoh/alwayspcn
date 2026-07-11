# AGENTS Router

This repository uses a capability-based, harness-agnostic routing model.

## Core Rule
Load only relevant files for the active task.

## Always-Load First
1. skills/project-context/SKILL.md
2. skills/commands/SKILL.md
3. skills/coding-rules/SKILL.md

## Required Work Loop
1. Load router + always-load files
2. Plan
3. Implement
4. Validate
5. Update docs
6. Run security review
7. Update changelog
8. Update TODO
9. Report evidence
10. Auto-commit all cycle changes

Completion is not allowed if steps 4-10 are missing unless explicitly unavailable and reported.

## Planning Rule
- Create a plan in plans/ for all non-trivial tasks.
- Filename format: YYYY-MM-DD-HHMMSS-<scope>-plan.md.

## Use-Case Routing
- New project/scaffold/PRD/MVP: skills/product-planning/SKILL.md, skills/planning/SKILL.md, skills/documentation/SKILL.md.
- Feature work: skills/planning/SKILL.md, skills/validation/SKILL.md.
- Bug fix: skills/planning/SKILL.md, skills/validation/SKILL.md.
- UI/UX/frontend design and visual debugging: skills/design-guide/SKILL.md and skills/external/frontend-design/SKILL.md; use skills/external/agent-browser/SKILL.md for browser checks.
- API/server action/webhook/data fetching: skills/coding-rules/SKILL.md, skills/validation/SKILL.md.
- Database/schema/CMS/content model: skills/project-context/SKILL.md, skills/planning/SKILL.md.
- Security review: skills/external/security-review/SKILL.md when available.
- Changelog: skills/external/changelog-automation/SKILL.md when available.
- Documentation updates: skills/documentation/SKILL.md and skills/external/documentation-writer/SKILL.md when available.

## Workflow Modes
- Tiny: single safe edit with lightweight validation.
- Normal: plan + implementation + full gates.
- Risky: expanded plan, additional validation, explicit rollback notes.
- New project: full bootstrap sequence from INIT_AGENT_WORKFLOW.md.

## UI Library Rule
Default to Tailwind CSS + shadcn/ui + lucide-react. Avoid mixing component systems unless required.

## Animation Rule
Use Tailwind transitions first. Use Motion only if requirements justify richer choreography.

## Testing and Coverage Rule
- Run available validation scripts after changes.
- Run coverage when available and relevant.
- Do not bypass failing tests without documenting reason and risk.

## Non-Negotiable Rules
- Keep workflow, docs, and prompts model agnostic.
- Keep configuration harness agnostic; mirrors are additive.
- Read AGENTS.md before every non-trivial task.
- Never perform config-only MCP setup; attempt operational usage too.

## Required Post-Change Gate Checklist
1. Validation
2. Docs update check
3. Security review attempt
4. Changelog update
5. TODO update
6. Auto-commit changes for this completed cycle

## MCP Operational Requirement
For initialization and significant changes:
- Attempt codemogger index and at least one usage operation.
- If unavailable, record exact failure and fallback method.

## Skill Trigger Matrix and Fallback
- UI/frontend work: frontend-design + agent-browser
- React extraction/reuse: react-grab
- Security/release readiness: security-review
- Release notes: changelog-automation
- Documentation: documentation-writer
- Execution discipline: gsd

Fallback behavior when a skill is unavailable:
1. Log missing skill
2. Continue with equivalent local workflow
3. Record fallback in changelog and evidence output

## Harness Mirrors
AGENTS.md is canonical. Mirror equivalent semantics into harness-specific files only when present or requested.
