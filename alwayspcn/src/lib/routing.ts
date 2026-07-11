export type Coordinate = [number, number];

export type GraphData = {
  meta: {
    source: string;
    generatedAt: string;
    nodes: number;
    segments: number;
  };
  nodes: Coordinate[];
  adj: Array<Array<[number, number, string, string]>>;
};

export type RouteSegment = {
  from: Coordinate;
  to: Coordinate;
  kind: string;
  name?: string;
};

export type RouteResult = {
  found: boolean;
  path: Coordinate[];
  segments: RouteSegment[];
  distanceMeters: number;
  connectorShare: number;
  usesFallback: boolean;
};

/** Minimal GeoJSON shape expected from roads.json for building the road bridge graph. */
export type RoadsGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { highway: string; name?: string | null };
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }>;
};

export type RouteWeights = {
  pcn: number;
  future_network: number;
  cycling_path: number;
};

export const DEFAULT_ROUTE_WEIGHTS: RouteWeights = {
  pcn: 0.5,
  future_network: 0.75,
  cycling_path: 1.0,
};

// Build a full factor map merging user weights with fixed road/bridge penalties.
function buildFactor(w: RouteWeights): Record<string, number> {
  return {
    pcn: w.pcn,
    future_network: w.future_network,
    cycling_path: w.cycling_path,
    other: 1.08,
    // Road kinds — penalised
    motorway: 3.0,
    trunk: 2.5,
    primary: 2.0,
    secondary: 2.2,
    tertiary: 2.3,
    residential: 2.5,
    unclassified: 2.5,
    // Synthetic edges bridging PCN nodes to the road network
    bridge: 1.5,
  };
}

// Only major roads are used for the fallback bridge graph; residential streets
// are excluded to keep the graph small and route quality reasonable.
const BRIDGE_ROAD_KINDS = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
]);

// ─── Utilities ────────────────────────────────────────────────────────────────

function haversineMeters(a: Coordinate, b: Coordinate): number {
  const toRad = Math.PI / 180;
  const lat1 = a[1] * toRad;
  const lat2 = b[1] * toRad;
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function findNearestNode(
  graph: GraphData,
  point: Coordinate
): { index: number; distanceMeters: number } {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < graph.nodes.length; i += 1) {
    const distance = haversineMeters(graph.nodes[i], point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distanceMeters: bestDistance };
}

// ─── Min-heap (binary heap priority queue) ────────────────────────────────────

class MinHeap {
  private data: [number, number][] = []; // [cost, nodeIndex]

  push(cost: number, node: number): void {
    this.data.push([cost, node]);
    this._bubbleUp(this.data.length - 1);
  }

  pop(): [number, number] | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent][0] <= this.data[i][0]) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  private _sinkDown(i: number): void {
    const n = this.data.length;
    for (;;) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l][0] < this.data[smallest][0]) smallest = l;
      if (r < n && this.data[r][0] < this.data[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

// ─── Priority-queue Dijkstra ───────────────────────────────────────────────────

function dijkstra(
  nodes: Coordinate[],
  adj: Array<Array<[number, number, string, string]>>,
  startIdx: number,
  endIdx: number,
  factor: Record<string, number>
): { dist: Float64Array; prev: Int32Array } {
  const n = nodes.length;
  const dist = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const prev = new Int32Array(n).fill(-1);
  const settled = new Uint8Array(n);

  dist[startIdx] = 0;
  const heap = new MinHeap();
  heap.push(0, startIdx);

  while (heap.size > 0) {
    const entry = heap.pop()!;
    const [cost, u] = entry;
    if (settled[u]) continue;
    settled[u] = 1;
    if (u === endIdx) break;

    for (const [to, distance, kind] of adj[u]) {
      if (settled[to]) continue;
      const weight = factor[kind] ?? factor.other;
      const newCost = cost + distance * weight;
      if (newCost < dist[to]) {
        dist[to] = newCost;
        prev[to] = u;
        heap.push(newCost, to);
      }
    }
  }

  return { dist, prev };
}

function reconstructPath(
  nodes: Coordinate[],
  adj: Array<Array<[number, number, string, string]>>,
  prev: Int32Array,
  startIdx: number,
  endIdx: number
): RouteResult {
  const nodePath: number[] = [];
  let cursor = endIdx;
  while (cursor !== -1) {
    nodePath.push(cursor);
    cursor = prev[cursor];
  }
  nodePath.reverse();

  if (nodePath[0] !== startIdx) {
    return { found: false, path: [], segments: [], distanceMeters: 0, connectorShare: 0, usesFallback: false };
  }

  let totalDistance = 0;
  let connectorDistance = 0;
  const segments: RouteSegment[] = [];

  for (let i = 1; i < nodePath.length; i += 1) {
    const from = nodePath[i - 1];
    const to = nodePath[i];
    const edge = adj[from].find(([next]) => next === to);
    if (!edge) continue;
    const [, distance, kind, name] = edge;
    totalDistance += distance;
    if (kind === "pcn" || kind === "future_network" || kind === "cycling_path") {
      connectorDistance += distance;
    }
    segments.push({ from: nodes[from], to: nodes[to], kind, name: name ?? undefined });
  }

  const path = nodePath.map((idx) => nodes[idx]);
  const connectorShare = totalDistance > 0 ? connectorDistance / totalDistance : 0;

  return {
    found: true,
    path,
    segments,
    distanceMeters: totalDistance,
    connectorShare,
    usesFallback: connectorShare < 0.999,
  };
}

// ─── Public: PCN-only routing ──────────────────────────────────────────────────

export function computeRoute(
  graph: GraphData,
  start: Coordinate,
  end: Coordinate,
  weights?: RouteWeights
): RouteResult {
  const startNode = findNearestNode(graph, start);
  const endNode = findNearestNode(graph, end);

  if (startNode.index < 0 || endNode.index < 0) {
    return { found: false, path: [], segments: [], distanceMeters: 0, connectorShare: 0, usesFallback: false };
  }

  const factor = buildFactor(weights ?? DEFAULT_ROUTE_WEIGHTS);
  const { dist, prev } = dijkstra(graph.nodes, graph.adj, startNode.index, endNode.index, factor);

  if (!Number.isFinite(dist[endNode.index])) {
    return { found: false, path: [], segments: [], distanceMeters: 0, connectorShare: 0, usesFallback: false };
  }

  return reconstructPath(graph.nodes, graph.adj, prev, startNode.index, endNode.index);
}

// ─── Road graph builder ────────────────────────────────────────────────────────

/**
 * Convert a roads GeoJSON (as produced by build-roads.mjs) into a routable
 * GraphData. Only major road classifications are included.
 */
export function buildRoadGraph(roadsGeoJson: RoadsGeoJson): GraphData {
  const nodes: Coordinate[] = [];
  const nodeByKey = new Map<string, number>();
  const edgeMaps: Map<number, [number, string]>[] = []; // to → [distance, kind]

  function quantizeKey(c: [number, number]): string {
    return `${Math.round(c[0] * 1e5)},${Math.round(c[1] * 1e5)}`;
  }

  function getNode(c: [number, number]): number {
    const key = quantizeKey(c);
    let idx = nodeByKey.get(key);
    if (idx === undefined) {
      idx = nodes.length;
      nodes.push([Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5]);
      nodeByKey.set(key, idx);
      edgeMaps.push(new Map());
    }
    return idx;
  }

  function addEdge(from: number, to: number, dist: number, kind: string): void {
    const existing = edgeMaps[from].get(to);
    if (!existing || dist < existing[0]) {
      edgeMaps[from].set(to, [dist, kind]);
    }
  }

  for (const feature of roadsGeoJson.features) {
    const kind = feature.properties.highway;
    if (!BRIDGE_ROAD_KINDS.has(kind)) continue;
    const coords = feature.geometry.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1] as [number, number];
      const b = coords[i] as [number, number];
      const from = getNode(a);
      const to = getNode(b);
      const dist = haversineMeters(a, b);
      addEdge(from, to, dist, kind);
      addEdge(to, from, dist, kind);
    }
  }

  const adj = edgeMaps.map((m) =>
    Array.from(m.entries()).map(
      ([to, [distance, kind]]) => [to, distance, kind, ""] as [number, number, string, string]
    )
  );

  return {
    meta: {
      source: "roads-bridge",
      generatedAt: new Date().toISOString(),
      nodes: nodes.length,
      segments: adj.reduce((s, a) => s + a.length, 0) / 2,
    },
    nodes,
    adj,
  };
}

// ─── Spatial grid index (for bridge edge construction) ────────────────────────

const GRID_CELL = 0.005; // ~500 m in degrees latitude/longitude

function buildSpatialGrid(nodes: Coordinate[]): Map<string, number[]> {
  const grid = new Map<string, number[]>();
  for (let i = 0; i < nodes.length; i++) {
    const key = `${Math.floor(nodes[i][0] / GRID_CELL)},${Math.floor(nodes[i][1] / GRID_CELL)}`;
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(i);
  }
  return grid;
}

function nearestInGrid(
  point: Coordinate,
  grid: Map<string, number[]>,
  nodes: Coordinate[],
  maxMeters: number
): Array<{ index: number; dist: number }> {
  const cellRadius = Math.ceil(maxMeters / (GRID_CELL * 111000)) + 1;
  const cx = Math.floor(point[0] / GRID_CELL);
  const cy = Math.floor(point[1] / GRID_CELL);
  const results: Array<{ index: number; dist: number }> = [];

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      const bucket = grid.get(`${cx + dx},${cy + dy}`);
      if (!bucket) continue;
      for (const idx of bucket) {
        const dist = haversineMeters(point, nodes[idx]);
        if (dist <= maxMeters) results.push({ index: idx, dist });
      }
    }
  }

  results.sort((a, b) => a.dist - b.dist);
  return results.length > 3 ? results.slice(0, 3) : results;
}

// ─── Public: PCN-first routing with road fallback ─────────────────────────────

/**
 * Route from start to end on the PCN network. If the two points are in
 * disconnected PCN components, the router merges the PCN graph with the road
 * graph (connected via bridge edges) so the user always gets a result.
 *
 * Road segments are heavily penalised in cost so they are only used when
 * absolutely necessary to bridge a gap in the PCN.
 */
export function computeRouteWithFallback(
  pcnGraph: GraphData,
  roadGraph: GraphData,
  start: Coordinate,
  end: Coordinate,
  weights?: RouteWeights
): RouteResult {
  // Fast path: PCN-only
  const pcnResult = computeRoute(pcnGraph, start, end, weights);
  if (pcnResult.found) return pcnResult;

  // Build merged graph: PCN nodes (0..p-1) followed by road nodes (p..p+r-1)
  const p = pcnGraph.nodes.length;
  const r = roadGraph.nodes.length;

  const mergedNodes: Coordinate[] = new Array(p + r);
  for (let i = 0; i < p; i++) mergedNodes[i] = pcnGraph.nodes[i];
  for (let i = 0; i < r; i++) mergedNodes[p + i] = roadGraph.nodes[i];

  // PCN edges — indices unchanged
  const mergedAdj: Array<Array<[number, number, string, string]>> = new Array(p + r);
  for (let i = 0; i < p; i++) mergedAdj[i] = [...pcnGraph.adj[i]];

  // Road edges — offset node indices by p
  for (let i = 0; i < r; i++) {
    mergedAdj[p + i] = roadGraph.adj[i].map(
      ([to, dist, kind, name]) => [to + p, dist, kind, name] as [number, number, string, string]
    );
  }

  // Bridge edges: connect each PCN node to its nearest road nodes (≤ 400 m)
  const roadGrid = buildSpatialGrid(roadGraph.nodes);
  const MAX_BRIDGE_METERS = 400;

  for (let pcnIdx = 0; pcnIdx < p; pcnIdx++) {
    const nearby = nearestInGrid(
      pcnGraph.nodes[pcnIdx],
      roadGrid,
      roadGraph.nodes,
      MAX_BRIDGE_METERS
    );
    for (const { index: roadIdx, dist } of nearby) {
      mergedAdj[pcnIdx].push([roadIdx + p, dist, "bridge", ""]);
      mergedAdj[p + roadIdx].push([pcnIdx, dist, "bridge", ""]);
    }
  }

  // Snap start/end to nearest PCN nodes (indices are valid in the merged graph)
  const startNode = findNearestNode(pcnGraph, start);
  const endNode = findNearestNode(pcnGraph, end);

  if (startNode.index < 0 || endNode.index < 0) {
    return { found: false, path: [], segments: [], distanceMeters: 0, connectorShare: 0, usesFallback: false };
  }

  const { dist: mergedDist, prev: mergedPrev } = dijkstra(
    mergedNodes,
    mergedAdj,
    startNode.index,
    endNode.index,
    buildFactor(weights ?? DEFAULT_ROUTE_WEIGHTS)
  );

  if (!Number.isFinite(mergedDist[endNode.index])) {
    return { found: false, path: [], segments: [], distanceMeters: 0, connectorShare: 0, usesFallback: false };
  }

  return reconstructPath(mergedNodes, mergedAdj, mergedPrev, startNode.index, endNode.index);
}
