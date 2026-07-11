---
name: coding-rules
---

# Coding Rules

## Editing Safety
- Prefer minimal, focused diffs.
- Preserve existing APIs unless requirements demand changes.
- Avoid unrelated refactors in task branches.

## Validation Discipline
- Do not bypass tests or lint checks silently.
- If validation is unavailable, record it explicitly.

## Risky Operations
- Never run destructive git commands unless explicitly requested.
- Prefer reversible migration and config changes.
- Document assumptions and fallback behavior for infra changes.
