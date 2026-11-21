# 2026-11-21 — Active basemap controls

## Changed

- Street (OpenStreetMap) is the default basemap.
- The top-right switcher highlights and announces the displayed basemap after a fallback. No style is pressed when both tile providers fail. Riders can still select their original style to retry.

## Verification

- Chromium verified the default, manual style changes, Map-to-Street fallback on tile failure and outside OneMap’s zoom coverage, Street-to-Map fallback, and recovery. With both providers blocked at 360 px, no button was pressed or highlighted.
- Production build and TypeScript passed. Lint returned the existing 7 errors and 3 warnings; no automated test or coverage scripts are configured.
- Security review found no high-confidence issues in the diff. The change uses the same fixed tile providers and adds no user-controlled URLs, credentials, or dependencies.
