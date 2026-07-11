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
