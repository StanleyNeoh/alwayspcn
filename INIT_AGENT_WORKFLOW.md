# Agent Prompt

Read this file and initialize the repository.

Requirements:

- Initialize the repo.
- Install external skills, including `gsd`.
- Generate `AGENTS.md`.
- Generate only core local skills.
- Do not create empty local skill folders.
- Generate a full, implementation-ready PRD.
- Generate a design brief.
- Save all plans to `plans/`.
- Set up DeepWiki MCP.
- Generate docs, `TODO.md`, and `README.md`.
- Scaffold the app if needed.
- Use Tailwind CSS with shadcn/ui as the default UI system.
- Use Motion only when animation requirements justify it.

## Purpose

This is a one-time bootstrapper for a solo-dev agentic development workflow.

It generates:

1. `AGENTS.md`
2. Core local modular skill files
3. Installed external skills
4. DeepWiki MCP config
5. Full product and technical documentation
6. Markdown implementation plans in `plans/`
7. `TODO.md`
8. `README.md`
9. App scaffold if requested

After initialization, day-to-day behavior must be controlled by `AGENTS.md` and the skill files it routes to.

Do not create empty local skill folders.

---

## 1) Initialization Command

When instructed to initialize, run this workflow in order:

1. Inspect repo
2. Create core folders
3. Install external skills
4. Generate `AGENTS.md`
5. Generate core local skills
6. Generate DeepWiki MCP config
7. Generate full PRD and planning docs
8. Generate `docs/DESIGN_BRIEF.md`
9. Generate plan files in `plans/`
10. Generate `TODO.md`
11. Generate `README.md`
12. Scaffold app if requested
13. Configure Tailwind + shadcn/ui if app is scaffolded or requested
14. Configure Motion only if animation is required
15. Run available validation
16. Run security review if external skill is available
17. Create changelog
18. Update project context and commands

---

## 2) Create Directory Structure

Run from repo root:

```bash
mkdir -p skills/coding-rules
mkdir -p skills/commands
mkdir -p skills/design-guide
mkdir -p skills/project-context
mkdir -p skills/validation
mkdir -p skills/product-planning
mkdir -p skills/planning
mkdir -p skills/documentation
mkdir -p .agents/skills
mkdir -p .kiro/settings
mkdir -p docs
mkdir -p plans
mkdir -p changelogs
mkdir -p security-reports
```

Do not create these local skill folders by default:

- `skills/api`
- `skills/database`
- `skills/security-review-policy`
- `skills/testing`
- `skills/ui-ux-verification`
- `skills/changelog`
- `skills/tool-policy`
- `skills/architecture`

Create optional local skills later only if the project needs repo-specific guidance that is not covered by core local skills, docs, or installed external skills.

---

## 3) Install External Skills

Install these external skills:

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser
npx skills add https://github.com/akillness/oh-my-skills --skill react-grab
npx skills add https://github.com/getsentry/skills --skill security-review
npx skills add https://github.com/wshobson/agents --skill changelog-automation
npx skills add https://github.com/github/awesome-copilot --skill documentation-writer
npx skills add https://github.com/ctsstc/get-shit-done-skills --skill gsd
```

Verify the following skills exist somewhere in repo or agent skill directory:

- `frontend-design`
- `agent-browser`
- `react-grab`
- `security-review`
- `changelog-automation`
- `documentation-writer`
- `gsd`

Canonical expected references from `AGENTS.md`:

- `.agents/skills/frontend-design/SKILL.md`
- `.agents/skills/agent-browser/SKILL.md`
- `.agents/skills/react-grab/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- `.agents/skills/changelog-automation/SKILL.md`
- `.agents/skills/documentation-writer/SKILL.md`
- `.agents/skills/gsd/SKILL.md`

If installer places skills elsewhere, locate and create stable references under `.agents/skills/`.

Safe inspection commands:

```bash
find . -path '*/frontend-design/SKILL.md'
find . -path '*/agent-browser/SKILL.md'
find . -path '*/react-grab/SKILL.md'
find . -path '*/security-review/SKILL.md'
find . -path '*/changelog-automation/SKILL.md'
find . -path '*/documentation-writer/SKILL.md'
find . -path '*/gsd/SKILL.md'
```

If needed, create symlinks or copy directories so `.agents/skills/<skill-name>/SKILL.md` resolves.

Do not delete installed files.

If any external skill install fails, report failure and continue with local core skills.

---

## 4) Generate Modular `AGENTS.md`

Create `AGENTS.md` with a concise runtime router that includes:

- Core rule: load only relevant files.
- Always-load-first files:
  - `skills/project-context/SKILL.md`
  - `skills/commands/SKILL.md`
  - `skills/coding-rules/SKILL.md`
- Planning rule and plan filename format.
- Use-case routing:
  - New Project / Scaffold / PRD / MVP planning
  - Feature work
  - Bug fix
  - UI/UX/frontend design and visual debugging
  - API/server action/webhook/data fetching
  - Database/schema/CMS/content model
  - Security review
  - Changelog
  - Documentation updates
- Workflow modes:
  - Tiny
  - Normal
  - Risky
  - New project
- UI library rule:
  - Default Tailwind + shadcn/ui + lucide-react
  - Avoid mixing component systems by default
- Animation rule:
  - Tailwind transitions first
  - Motion only when required
- Testing and coverage rule
- Non-negotiable rules list

The prior malformed inline template blocks should be rendered as valid markdown sections and fenced blocks.

---

## 5) Generate Core Local Skill Files

Generate only these local skills:

```text
skills/coding-rules/SKILL.md
skills/commands/SKILL.md
skills/design-guide/SKILL.md
skills/project-context/SKILL.md
skills/validation/SKILL.md
skills/product-planning/SKILL.md
skills/planning/SKILL.md
skills/documentation/SKILL.md
```

### 5.1 `skills/coding-rules/SKILL.md`

Should define editing safety, minimal diffs, no test bypassing, and risky operation constraints.

### 5.2 `skills/commands/SKILL.md`

Should define package manager detection, command discovery, and output format populated from the actual codebase.

### 5.3 `skills/design-guide/SKILL.md`

Should define source of truth, UI library policy, shadcn policy, animation policy, accessibility, and UI verification process.

### 5.4 `skills/project-context/SKILL.md`

Should define concise project background, users, offerings, key paths, stack, conventions, and constraints.

### 5.5 `skills/validation/SKILL.md`

Should define required validation behavior, test rules, coverage rules, validation matrix, and completion rule.

### 5.6 `skills/product-planning/SKILL.md`

Should define full PRD requirement, required sections, requirement formats, acceptance criteria format, and scope control.

### 5.7 `skills/planning/SKILL.md`

Should define plan file naming convention, standard plan format, new-project plan format, risk areas, and execution rules.

### 5.8 `skills/documentation/SKILL.md`

Should define required docs creation/update behavior and required new-project documentation set.

---

## 6) Generate DeepWiki MCP Config

Create `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "deepwiki": {
      "serverUrl": "https://mcp.deepwiki.com/mcp"
    }
  }
}
```

If another MCP config exists, preserve existing servers and merge `deepwiki` into `mcpServers`.

Do not delete existing MCP servers.

---

## 7) Generate Full Planning Docs

Planning docs must be filled from available project context, not blank templates.

If context is insufficient, infer reasonable defaults and record assumptions/open questions.

Create:

- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/USER_FLOWS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/DESIGN_BRIEF.md`

Each doc must be implementation-ready and aligned with:

- Tailwind + shadcn/ui default UI stack
- Motion only when needed
- testing/coverage policy
- security/changelog/doc update policy

---

## 8) Generate Initial Plan File

Create timestamped plan file:

```bash
timestamp=$(date +"%Y-%m-%d-%H%M%S")
cat > "plans/${timestamp}-new-project-plan.md" <<'EOF_PLAN'
# New Project Plan

## Timestamp
Generated during initialization.

## Goal
Initialize a modular solo-dev agentic workflow with full planning documentation before implementation.

## Source Inputs
- User request
- Repository inspection
- Existing files
- Existing project docs if available
- Installed external skills if available

## Assumptions
- Solo-dev workflow
- PRD/plans before implementation
- No empty local skill folders
- Tailwind + shadcn/ui default
- Motion only when required

## Documentation to Generate
- docs/PRD.md
- docs/TECHNICAL_PLAN.md
- docs/IMPLEMENTATION_PLAN.md
- docs/USER_FLOWS.md
- docs/DATA_MODEL.md
- docs/API.md
- docs/DESIGN_BRIEF.md
- README.md
- TODO.md

## Implementation Phases
1. Initialize workflow files
2. Generate docs
3. Install skills
4. Configure MCP
5. Scaffold app if requested
6. Configure shadcn/ui if applicable
7. Validate
8. Run security review if available
9. Create changelog
10. Update TODO

## Done Criteria
- AGENTS.md exists
- Core local skills exist
- External install attempted
- Docs exist and are complete
- Plan exists in plans/
- TODO and README are current
- Validation/security/changelog attempted where available
EOF_PLAN
```

---

## 9) Generate `TODO.md`

Create TODO with sections:

- In Progress
- Completed
- Backlog

Minimum in-progress tasks:

- Set up workflow
- Install external skills
- Generate full PRD
- Generate planning docs
- Generate design brief
- Generate initial plan file
- Scaffold app if needed
- Configure shadcn/ui if applicable
- Update project context and commands
- Confirm test and coverage tooling
- Run validation
- Run security review if available
- Create changelog

---

## 10) Generate `README.md`

If `README.md` does not exist, create it with:

- Overview linking to `docs/PRD.md`
- Stack and defaults
- Getting started commands
- Documentation map
- Plans location
- Workflow pointer to `AGENTS.md`
- Skills locations
- UI and animation defaults
- Testing/coverage expectations
- Validation policy
- Security report location
- Changelog location

---

## 11) App Scaffold Rule

If user requests a new app and no stack is specified, use:

- Next.js
- TypeScript
- App Router
- Tailwind
- shadcn/ui
- lucide-react
- ESLint
- npm

Before scaffold, ensure docs and planning artifacts exist.

Scaffold command (safe root):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

If root is not safe:

```bash
npx create-next-app@latest app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

After scaffold:

1. Inspect `package.json`
2. Update `skills/project-context/SKILL.md`
3. Update `skills/commands/SKILL.md`
4. Initialize shadcn/ui (if compatible)
5. Install `lucide-react` when needed
6. Install Motion only when needed
7. Run available validation
8. Update TODO
9. Create changelog
10. Run security review if available
11. Update docs if assumptions changed

shadcn setup:

```bash
npx shadcn@latest init
```

Add only required components, for example:

```bash
npx shadcn@latest add button card input label textarea
```

Install icons when needed:

```bash
npm install lucide-react
```

Motion setup only when required:

```bash
npm install motion
```

Import style:

```tsx
import { motion, AnimatePresence } from "motion/react"
```

---

## 12) Post-Install Update Tasks

After generation, inspect codebase and update:

- `skills/commands/SKILL.md` from real scripts/configs
- `skills/project-context/SKILL.md` with real project facts
- `skills/design-guide/SKILL.md` from PRD/brief/assets/patterns
- `docs/PRD.md` with project-specific details
- `docs/DESIGN_BRIEF.md` with project-specific design guidance

If design info is insufficient and materially blocks UX decisions, ask user.

---

## 13) Validation

Run only commands that exist.

Preferred order after initialization:

```bash
npm test
npm run typecheck
npm run test:coverage
npm run build
```

If unavailable, report unavailable scripts.

After any modification:

1. Create/update plan in `plans/` unless tiny change
2. Run validation
3. Run coverage when available and relevant
4. Fix failing tests until passing
5. Run security review if available
6. Create changelog
7. Update docs when relevant
8. Update TODO

---

## 14) Completion Criteria

Initialization is complete when:

- `AGENTS.md` exists
- Core local modular skill files exist
- No empty local skill folders exist
- External skills were installed or failures reported
- `gsd` installed or failure reported
- DeepWiki MCP config exists
- Full docs exist and are implementation-ready:
  - `docs/PRD.md`
  - `docs/TECHNICAL_PLAN.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/USER_FLOWS.md`
  - `docs/DATA_MODEL.md`
  - `docs/API.md`
  - `docs/DESIGN_BRIEF.md`
- At least one markdown plan exists in `plans/`
- `TODO.md` exists and is current
- `README.md` exists
- App scaffold exists if requested
- shadcn/ui initialized if applicable
- `lucide-react` installed if needed
- Motion installed only if needed
- `skills/commands/SKILL.md` updated from codebase where possible
- `skills/project-context/SKILL.md` updated from codebase where possible
- Validation attempted
- Tests pass when infrastructure exists
- Coverage attempted when tooling exists
- Security review attempted if available
- Changelog created
