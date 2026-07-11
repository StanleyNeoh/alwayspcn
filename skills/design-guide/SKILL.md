---
name: design-guide
---

# Design Guide

## Source of Truth
- `docs/PRD.md` and `docs/DESIGN_BRIEF.md` define UX intent.

## UI System Policy
- Default to Tailwind CSS + shadcn/ui + lucide-react.
- Keep visual language consistent and avoid mixed component kits.

## Animation Policy
- Start with CSS/Tailwind transitions.
- Add Motion only when interaction goals require richer choreography.

## Accessibility
- Keyboard reachable controls.
- Sufficient contrast and visible focus states.
- Semantic labels for map controls and forms.

## UI Verification
- Verify desktop and mobile layouts.
- Validate route request, route rendering, and fallback route messaging.
