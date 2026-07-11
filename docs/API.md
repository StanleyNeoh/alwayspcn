# API

## Internal Data Endpoints
- `GET /data/network.json`: preprocessed graph data.

## Client Interfaces
- `loadGraph(): Promise<GraphData>`
- `validateGraphData(payload): { valid: true; data: GraphData } | { valid: false; error: string }`
- `computeRoute(graph, start, end): RouteResult`

## RouteResult
- `found: boolean`
- `distanceMeters: number`
- `connectorShare: number`
- `path: [lng, lat][]`
- `usesFallback: boolean`
