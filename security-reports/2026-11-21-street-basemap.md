# Security review: Street basemap fallback

No high-confidence vulnerabilities identified in the basemap change.

- Leaflet receives only fixed HTTPS tile URL templates and fixed provider attribution HTML. The style buttons select from a closed set; query parameters, geocoder responses, and route names cannot modify these values.
- The browser requests tile images directly. No server proxy, key handling, custom request headers, HTML from tile responses, or dependencies were added. The alternate provider receives ordinary tile requests for the visible area, just as when a rider selects that style manually.
- `npm audit --omit=dev` reported 26 vulnerable packages (2 critical, 16 high, 8 moderate) in the existing dependency tree. The package manifest and lockfile are unchanged. Review deployment applicability and update affected dependencies separately; the audit counts alone do not establish application exploitability.
