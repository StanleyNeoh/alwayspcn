# Workflow Bootstrap Prompt

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
- Set up Context7 MCP.
- Include Firecrawl MCP.
- Include Chrome DevTools MCP.
- Include Vercel Next DevTools MCP.
- Include codemogger MCP for code indexing.
- Request Firecrawl auth value from the user via `agent.env`.
- Generate docs, `TODO.md`, and `README.md`.
- Scaffold the app if needed.
- Use Tailwind CSS with shadcn/ui as the default UI system.
- Use Motion only when animation requirements justify it.
- Keep workflow outputs harness agnostic (do not hard-lock to a single agent runtime).
- Keep all generated guidance model agnostic (no vendor/model-specific behavior assumptions).
- Use discovery-first config updates (no primary harness path unless user explicitly requests one).
- Enforce router loading from `AGENTS.md` (and mirrors) before every non-trivial task.
- Enforce post-change lifecycle gates: validation, docs update, security review, changelog, and TODO update.
- Enforce MCP operational usage (not only config presence), including codemogger indexing.
- Enforce skill routing by trigger, with explicit fallback behavior when a skill is unavailable.

## Harness + Model Agnostic Rules

Treat this workflow as portable across agent harnesses and model providers.

- Do not assume a specific model family, context window, or vendor-only capability.
- Write prompts/instructions against capabilities (planning, code edit, validation), not model names.
- Use `AGENTS.md` as the canonical router, then mirror equivalent guidance into other harness files when those harnesses are present or requested.
- Treat router semantics as canonical, not any single harness file path.
- Keep paths and config additive. Never delete another harness config to make one harness work.
- Prefer neutral wording such as "selected model" or "active model".
- If a harness cannot consume a feature (for example, skills auto-install), provide a fallback mapping and continue.

## Purpose

This is a one-time bootstrapper for a solo-dev agentic development workflow that remains portable across harnesses and models.

It generates:

1. `AGENTS.md`
2. Core local modular skill files
3. Installed external skills
4. MCP config (Context7 + Firecrawl + Chrome DevTools + Vercel Next DevTools + codemogger)
5. Full product and technical documentation
6. Markdown implementation plans in `plans/`
7. `TODO.md`
8. `README.md`
9. App scaffold if requested

After initialization, day-to-day behavior must be controlled by shared routing semantics mirrored into whichever harness files are present or requested (including `AGENTS.md` when used).

Do not create empty local skill folders.

---

## 0) Strict Execution Contract (Non-Optional)

Use this contract for initialization and all follow-up work generated from this workflow.

1. Preflight router load is required before implementation:
  - Read `AGENTS.md` first.
  - Read always-load files referenced by `AGENTS.md`.
  - If `AGENTS.md` does not exist yet, create it before continuing.
2. If a required router file cannot be read, stop and request user direction.
3. Completion is blocked unless all required post-change gates run (or are explicitly reported unavailable):
  - validation
  - docs update check
  - security review attempt
  - changelog update
  - TODO update
  - auto-commit
4. MCP setup alone is insufficient; operational MCP usage must be attempted and logged.
5. Skill installation alone is insufficient; skill usage must be triggered by task type and logged.
6. Any skipped gate must include a reason in output and in changelog.
7. Never mark the task complete if required gates are missing.

### 0.1) Mandatory Post-Change Gate Checklist

After any non-trivial file change, run this sequence in order:

1. Update or create a plan file in `plans/` (unless tiny change)
2. Run available validation commands
3. Run coverage when available and relevant
4. Update docs impacted by behavior, API, UX, architecture, or operations changes
5. Attempt security review when the external skill/tool is available
6. Update changelog entry
7. Update `TODO.md` status
8. Auto-commit changes for the completed cycle
9. Report completion with pass/fail/unavailable status per gate

### 0.2) Required Evidence Output

Every initialization or implementation run must output a compact evidence summary:

- Router loaded files
- Skills triggered
- MCP tools used
- Validation commands run and result
- Security review result
- Docs updated
- Changelog updated
- TODO updated

---

## 1) Initialization Command

When instructed to initialize, run this workflow in order:

1. Inspect repo
2. Create core folders
3. Install external skills
4. Generate `AGENTS.md`
5. Generate harness mirrors when relevant
6. Generate core local skills
7. Re-load `AGENTS.md` and always-load router files before continuing
8. Generate MCP config (Context7 + Firecrawl + Chrome DevTools + Vercel Next DevTools + codemogger)
9. During initialization only, generate or update `agent.env` for the required Firecrawl auth value
10. Generate full PRD and planning docs
11. Generate `docs/DESIGN_BRIEF.md`
12. Generate plan files in `plans/`
13. Generate `TODO.md`
14. Generate `README.md`
15. Scaffold app if requested
16. Configure Tailwind + shadcn/ui if app is scaffolded or requested
17. Configure Motion only if animation is required
18. Run available validation
19. Run security review if external skill is available
20. Create changelog
21. Index the repository with codemogger when available
22. Run post-change gate checklist in Section 0.1
23. Update project context and commands
24. Auto-commit full-cycle changes
25. Emit evidence output per Section 0.2
26. Use subagents + git worktrees for parallelizable slices when beneficial

---

## 2) Create Directory Structure

Run from repo root.

Core (harness-neutral) directories:

```bash
mkdir -p skills/coding-rules
mkdir -p skills/commands
mkdir -p skills/design-guide
mkdir -p skills/project-context
mkdir -p skills/validation
mkdir -p skills/product-planning
mkdir -p skills/planning
mkdir -p skills/documentation
mkdir -p skills/external
mkdir -p docs
mkdir -p plans
mkdir -p changelogs
mkdir -p security-reports
```

Harness-specific directories should be created only when that harness is detected or explicitly requested, for example:

```bash
mkdir -p .agents/skills
mkdir -p .kiro/settings
mkdir -p .vscode
mkdir -p .cursor
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

Verify the following skills exist somewhere in the repository or configured skill directories:

- `frontend-design`
- `agent-browser`
- `react-grab`
- `security-review`
- `changelog-automation`
- `documentation-writer`
- `gsd`

Canonical expected references (harness-neutral preferred):

- `skills/external/frontend-design/SKILL.md`
- `skills/external/agent-browser/SKILL.md`
- `skills/external/react-grab/SKILL.md`
- `skills/external/security-review/SKILL.md`
- `skills/external/changelog-automation/SKILL.md`
- `skills/external/documentation-writer/SKILL.md`
- `skills/external/gsd/SKILL.md`

Optional harness mirrors (create when needed):

- `.agents/skills/frontend-design/SKILL.md`
- `.agents/skills/agent-browser/SKILL.md`
- `.agents/skills/react-grab/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- `.agents/skills/changelog-automation/SKILL.md`
- `.agents/skills/documentation-writer/SKILL.md`
- `.agents/skills/gsd/SKILL.md`

If installer places skills elsewhere, locate and create stable references under `skills/external/` first, then add harness mirrors as symlinks or copies when required.

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

If needed, create symlinks or copy directories so the chosen canonical location and any required harness mirrors resolve.

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
- Required post-change gate checklist (validation, docs, security review, changelog, TODO)
- MCP operational usage requirement (index/use, not config-only)
- Skill trigger matrix and fallback behavior

The prior malformed inline template blocks should be rendered as valid markdown sections and fenced blocks.

`AGENTS.md` must include an explicit `Required Work Loop` section:

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

`AGENTS.md` must state that completion is not allowed if steps 4-10 are missing unless explicitly unavailable and reported.

## 4.1) Generate Harness Mirrors (When Applicable)

Routing semantics are the source of truth. Create/update harness files only when the harness is detected in the repo or explicitly requested.

Possible mirrors:

- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `.cursor/rules/project.mdc`

Mirror policy:

- Keep semantics aligned with `AGENTS.md`.
- Do not overwrite user-authored harness content blindly; merge or append a clearly delimited managed block.
- If a mirror format cannot represent a rule exactly, preserve intent and note the approximation in `changelogs/`.

Compatibility note:

- If repository contains `agent.md` or `AGENT.md`, mirror the router semantics there using a managed block so older harness conventions still enforce the same workflow.

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

## 6) Generate MCP Config

Use discovery-first MCP config updates.

Before finalizing MCP config during initialization, generate `agent.env` at repo root with a placeholder for the required Firecrawl auth value and ask the user to populate it.

Create or update `agent.env` only when running the initialization workflow. For non-initialization tasks, do not auto-create `agent.env`; use existing values if present and rely on `agent.env.example` as the template.

Minimum `agent.env` keys:

```env
# Required for Firecrawl MCP
FIRECRAWL_API_KEY=
```

Also create `agent.env.example` with the same keys and ensure `agent.env` is ignored in VCS.

Known MCP config candidates:

- `mcp.json`
- `.vscode/mcp.json`
- `.cursor/mcp.json`
- `.kiro/settings/mcp.json`

Rules:

1. Detect existing MCP config files in known candidates.
2. Merge required MCP servers into each existing config file's `mcpServers`.
3. If none exist, create `mcp.json` at repository root as the harness-neutral default.
4. If user requests a harness-specific location, also write there.

Required MCP entries:

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "firecrawl": {
      "command": "npx",
      "args": [
        "-y",
        "firecrawl-mcp"
      ],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    },
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest"
      ]
    },
    "vercel-next-dev-tools": {
      "command": "npx",
      "args": [
        "-y",
        "vercel-next-dev-tools-mcp@latest"
      ]
    },
    "codemogger": {
      "command": "npx",
      "args": [
        "-y",
        "codemogger",
        "mcp"
      ]
    }
  }
}
```

If another MCP config exists, preserve existing servers and merge all required MCP entries into `mcpServers`.

Use environment injection only for Firecrawl auth, mapped to `${FIRECRAWL_API_KEY}` resolved from `agent.env`.

If a harness cannot auto-load `agent.env`, document a fallback command wrapper in `README.md` (for example using `set -a; source agent.env; set +a`).

Do not delete existing MCP servers.

After MCP config is in place, perform initial repository indexing through codemogger when available:

```bash
npx -y codemogger index .
```

Operational usage requirement after initialization and after significant code changes:

- Attempt codemogger indexing and at least one codemogger query/read operation when available.
- If codemogger is unavailable, report the exact failure and fallback to repository search commands.
- Record MCP usage status in changelog and final evidence output.

If the repository uses local ignore rules, ensure codemogger local DB artifacts are ignored (for example `.codemogger/`).

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

Also ensure generated docs remain harness/model neutral:

- No model-vendor lock-in language.
- No harness-specific assumptions unless contained in a harness mirror section.
- Use capability-based wording and fallback instructions.

Also enforce continuity checks:

- Re-open `AGENTS.md` before starting any non-trivial post-init change.
- Confirm required skill triggers are evaluated for the task type.
- Confirm MCP operational usage is attempted for relevant tasks.

---

## 13) Subagents + Git Worktrees (Parallelism)

Use subagents with isolated git worktrees when work can be parallelized safely.

### When to Use

Use this pattern for:

- Independent features that do not touch the same files
- Parallel bugfixes across separate modules
- Documentation, testing, and implementation tracks running together
- Large tasks that can be split into clear, non-overlapping slices

Do not use this pattern when:

- Changes are tightly coupled in the same files
- You need strict step-by-step sequencing
- The task is tiny and overhead would be higher than benefit

### Branch and Worktree Convention

Create one branch/worktree per subagent task using a clear naming scheme:

- Branch: `agent/<topic>-<short-scope>`
- Worktree path: `./worktrees/<topic>-<short-scope>`

Example:

```bash
git worktree add -b agent/docs-prd ./worktrees/docs-prd
git worktree add -b agent/ui-shell ./worktrees/ui-shell
git worktree add -b agent/tests-validation ./worktrees/tests-validation
```

### Parallel Execution Protocol

1. Split work into independent task specs with clear file ownership.
2. Create one worktree per task.
3. Run one subagent per worktree/task.
4. Each subagent must:
  - create/update its own plan file in `plans/`
  - implement only its assigned scope
  - run relevant validation
  - update docs/TODO/changelog for its scope
5. Review each branch independently before integration.
6. Merge branches in a deterministic order (lowest-risk first).
7. Run full validation after all merges.

### Conflict and Safety Rules

- Prefer strict ownership boundaries to avoid merge conflicts.
- If two tasks must touch the same file, sequence them instead of parallelizing.
- Never use destructive commands to resolve parallel integration issues.
- If conflicts occur, resolve manually and document decisions in changelog.
- Delete worktrees after merge to keep workspace clean.

### Suggested Merge Order

1. Docs and planning changes
2. Pure refactors with no behavior change
3. Feature implementation branches
4. Test and coverage hardening
5. Final integration fixups

### Cleanup

After merge:

```bash
git worktree remove ./worktrees/docs-prd
git worktree remove ./worktrees/ui-shell
git worktree remove ./worktrees/tests-validation
```

Optional branch cleanup:

```bash
git branch -d agent/docs-prd
git branch -d agent/ui-shell
git branch -d agent/tests-validation
```

---

## 14) Validation

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
9. Emit evidence summary with command/status per gate

Enforcement rule:

- If any required gate is skipped without unavailable/failure documentation, the task is incomplete.

---

## 15) Completion Criteria

Initialization is complete when:

- `AGENTS.md` exists
- Harness mirrors created when applicable or requested
- Core local modular skill files exist
- No empty local skill folders exist
- External skills were installed or failures reported
- `gsd` installed or failure reported
- Context7 MCP config exists in at least one discovered or default-neutral MCP config and is merged into any other existing harness MCP configs
- Firecrawl MCP config exists in at least one discovered or default-neutral MCP config and is merged into any other existing harness MCP configs
- Chrome DevTools MCP config exists in at least one discovered or default-neutral MCP config and is merged into any other existing harness MCP configs
- Vercel Next DevTools MCP config exists in at least one discovered or default-neutral MCP config and is merged into any other existing harness MCP configs
- codemogger MCP config exists in at least one discovered or default-neutral MCP config and is merged into any other existing harness MCP configs
- `agent.env` exists with a Firecrawl auth placeholder and `agent.env.example` exists for sharing defaults
- Initial codemogger repository indexing attempted or failure reported
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
- Docs and workflow guidance are model agnostic and harness agnostic
- Evidence summary emitted with router/skills/MCP/validation/security/docs/changelog/TODO statuses

---

## 16) Skill Trigger Matrix (Enforcement)

Evaluate this matrix before implementation. Trigger matching skills when available.

- UI, frontend, visual polish, interaction debugging: `frontend-design`, `agent-browser`
- React component extraction and reuse: `react-grab`
- Security-sensitive changes or release readiness: `security-review`
- Release notes and update summaries: `changelog-automation`
- Docs or architecture explanation updates: `documentation-writer`
- Execution discipline and task completion flow: `gsd`

If a mapped skill is missing:

1. Report missing skill
2. Continue with equivalent local workflow
3. Record fallback in changelog and evidence output

---

## 17) AGENTS Router Freshness Rule

To reduce drift where `AGENTS.md` is not consistently applied:

- At start of each non-trivial task, re-open `AGENTS.md` and always-load skill files.
- If a harness mirror exists, ensure it still matches router semantics.
- If mismatch is detected, update mirror in the same change set.
- Never treat mirror files as canonical over `AGENTS.md`.
