# 2026-11-21 — Rightmost Map view

## Fixed

- Replaced CARTO raster tiles with Singapore’s OneMap GreyLite in the default, rightmost **Map** view. No tile credential needs to be configured. CARTO now requires a key and returns a watermark image even with HTTP 200, so a successful tile load was not proof that map content rendered.
- Map falls back to **Street** if OneMap is unavailable, the view is centered outside its coverage, or the zoom is below 11. The route and map position are preserved; select **Map** again to retry.

## Verification

- Inspected decoded tiles to confirm the old CARTO watermark and new Singapore map content. Chromium verified OneMap attribution and logo, no CARTO requests, all three style controls, server route preservation, zoom and pan coverage fallback, simulated OneMap outage, and retry. Attribution fit the 360 px viewport.
- Production build and TypeScript passed; lint returned the same 7 errors and 3 warnings as before. No test or coverage script is configured.
- Codemogger index/search and DeepWiki and Context7 Leaflet lookups succeeded. [Security review](../security-reports/2026-11-21-rightmost-basemap.md) found no high-confidence issues in the diff.
