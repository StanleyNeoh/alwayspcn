# API

## Internal Data Endpoints
- `GET /data/network.json` — preprocessed PCN graph data (nodes + adjacency list).
- `GET /data/roads.json` — Singapore road network GeoJSON (Overpass API, pre-built at `npm run build:roads`).

## Client Interfaces
- `loadGraph(): Promise<GraphData>` — fetches network.json + roads.json, builds PCN GeoJSON overlay
- `validateGraphData(payload): { valid: true; data: GraphData } | { valid: false; error: string }`
- `computeRoute(graph, start, end): RouteResult`
- `geocodeLocation(query: string): Promise<Coordinate | null>` — Nominatim, Singapore-scoped
- `graphToPcnGeoJson(graph: GraphData): GeoJsonCollection` — extract PCN/cycling edges as GeoJSON

## RouteResult
- `found: boolean`
- `distanceMeters: number`
- `connectorShare: number`
- `path: [lng, lat][]`
- `usesFallback: boolean`
