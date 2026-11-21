# AlwaysPCN

Park-connector-first route planner for Singapore's PCN and cycling network.

## Features
- **PCN-priority routing** — Dijkstra with preference weights; park connectors cost 28% less than regular paths.
- **Singapore road overlay** — OSM road network fetched from Overpass API, colour-coded by highway class.
- **PCN visual overlay** — all park connectors, park paths, rail corridor, and cycling paths drawn on the map with distinct colours.
- **Geocoding** — start/end inputs accept place names, street addresses, or raw `lat,lng` coordinates (resolved via Nominatim, Singapore-scoped).
- **Web Worker routing** — route computation runs off the main thread with stale-response suppression.
- **Map legend** — colour key for roads and PCN route kinds.

## Quick Start

```bash
npm install
npm run dev   # builds network.json + roads.json, then starts Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000).

`roads.json` is cached for 24 hours; subsequent dev starts are fast.

## Basemaps

The top-right controls switch between **Street** (OpenStreetMap), **Satellite** (Esri World Imagery), and **Map** ([OneMap GreyLite](https://www.onemap.gov.sg/docs/maps/greylite.html), the default). No tile API key needs to be configured in the app. The browser needs network access to the providers. Map covers Singapore; zooming out past level 11 or moving the map center outside coverage switches to Street. Center the map on Singapore, zoom in, then select Map again to restore it.

If none of the first tiles for a style load, AlwaysPCN tries one alternate: Street and Satellite fall back to Map, and Map falls back to Street. Your route and markers stay in place. Select your preferred style again to retry it. If both providers fail, check your connection and select any style to retry.

Follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and [OneMap Terms of Use](https://www.onemap.gov.sg/legal/termsofuse.html) when deploying. Keep the required attribution visible, including the OneMap logo, and allow the browser to send a `Referer` header. Public tiles are not an offline map or a guaranteed service.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build:network` | Parse `data/doc.kml` → `public/data/network.json` |
| `npm run build:roads` | Fetch Singapore roads from Overpass → `public/data/roads.json` (24 h cache) |
| `npm run dev` | Runs both build scripts, then starts the Next.js dev server |
| `npm run build` | Production build (includes both data scripts) |
| `npm run lint` | ESLint |

## Data Sources
- **PCN / cycling paths** — `data/doc.kml` (curated KML, `Park Connector Network` + `Cycling Path Network` layers).
- **Singapore roads** — [OpenStreetMap](https://www.openstreetmap.org/) contributors via [Overpass API](https://overpass-api.de/). License: ODbL.

## Route Preference Weights

| Kind | Factor |
|------|--------|
| `park_connector` | 0.72 |
| `park_path` | 0.82 |
| `rail_corridor` | 0.90 |
| `cycling_path` | 1.00 |
| `other` | 1.08 |

A lower factor means the edge costs less in the Dijkstra search, so the algorithm naturally prefers PCN routes.
