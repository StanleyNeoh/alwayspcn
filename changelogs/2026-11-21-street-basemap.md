# 2026-11-21 — Street basemap reliability

## Fixed

- Street now uses the canonical OpenStreetMap tile endpoint without an API key.
- If the first batch of tiles fails entirely, AlwaysPCN tries one alternate basemap without resetting the map or its route. If both providers fail, a notice explains how to retry.

## Verification

- Production build and TypeScript passed. Chromium received decodable tile responses from all three providers and verified partial failure, fallback attribution, route preservation, total failure at 360 px, and retry. Follow-up inspection found that CARTO's response was a key-required watermark ([provider change](2026-11-21-rightmost-basemap.md)).
- ESLint returned the same 7 errors and 3 warnings as the baseline. Development mode hit a Next.js font compilation error; browser checks used the successful production build. No automated test or coverage scripts are configured.
- Codemogger indexed and searched app sources. DeepWiki and Context7 lookups were cross-checked against the installed Leaflet/React Leaflet source.
- [Security review](../security-reports/2026-11-21-street-basemap.md) found no high-confidence issues in the diff; the unchanged dependency tree has pre-existing advisories.
