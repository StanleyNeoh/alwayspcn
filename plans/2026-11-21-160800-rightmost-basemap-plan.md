# Rightmost basemap without a CARTO key

## Goal
Keep the rightmost **Map** view usable without credentials and preserve its light, low-detail style for Singapore routing.

## Findings
- CARTO requires a key for raster tiles. Its unauthenticated endpoint can return HTTP 200 with an “API KEY REQUIRED” PNG, so Leaflet's load/error events cannot detect this as an outage. A decoded image alone does not prove that a map rendered.
- The Singapore Land Authority documents OneMap GreyLite raster tiles with a keyless URL, Singapore bounds, zoom levels 11–19, and required logo/attribution.

## Implementation
1. Replace the rightmost provider with OneMap GreyLite; include its official logo and attribution and keep existing controls and route overlays.
2. Respect OneMap’s documented bounds and native zoom. Switch to Street if the viewport center is outside coverage or zoomed too far out, without changing the view. Retain one-step recovery for actual tile request failures.
3. Update current documentation, TODO, changelog, and security evidence.

## Validation and rollback
Inspect real Singapore tile content, verify no CARTO requests, and browser-test Street/Satellite switching, OneMap errors, retry, outside-coverage behavior, and route preservation. Run lint, typecheck, and production build. Roll back with the cycle commit; the prior CARTO endpoint would still need valid credentials.
