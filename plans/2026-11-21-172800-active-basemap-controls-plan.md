# Active basemap controls

## Goal
Start on Street and make the style switcher reflect the tile layer actually in use.

## Approach
Keep requested and displayed styles distinct so the desired style is still retryable after fallback. Derive button styling and `aria-pressed` from the rendered style, with no active button when neither provider loads. No changes to tile sources or fallback order.

## Validation and rollback
Check the initial Street view, explicit style switches, fallback in both directions, retry, and both providers failing in Chromium. Run typecheck, production build, and lint. The change can be reverted in a single commit.
