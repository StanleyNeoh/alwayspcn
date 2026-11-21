# Security review: rightmost basemap provider change

No high-confidence vulnerabilities identified in the diff.

- OneMap tile URLs, logo URL, and attribution HTML are fixed HTTPS constants. Tile coordinates come from Leaflet’s viewport; users cannot control which host receives them. Attribution links opened in a new tab use `noopener noreferrer`.
- Direct image requests send ordinary browser metadata and the coordinates of the viewed tiles to OneMap. The integration does not send route inputs or location permission data separately and adds no server proxy, credential handling, scripts, or dependencies.
- Use is subject to [OneMap Terms of Use](https://www.onemap.gov.sg/legal/termsofuse.html); the logo and attribution remain visible when OneMap is active. Existing dependency audit findings remain tracked in `TODO.md`.
