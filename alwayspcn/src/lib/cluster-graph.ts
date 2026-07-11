import type { GeoJsonCollection, GeoJsonLineFeature } from "./graph-to-geojson";
import type { GraphData, RoadsGeoJson } from "./routing";

type Coord = [number, number];

/**
 * Centroid drift below this value (metres) is treated as convergence.
 * 10 cm is sub-pixel at any reasonable map zoom.
 */
const DRIFT_EPSILON_METERS = 0.1;

/** Hard cap on iterations per seed to bound worst-case cost. */
const MAX_ITER = 20;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function haversineMeters(a: Coord, b: Coord): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const lat1 = a[1] * toRad;
  const lat2 = b[1] * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

// ─── Spatial grid ─────────────────────────────────────────────────────────────

function buildGrid(
  coords: Coord[],
  cellDegrees: number,
): Map<string, number[]> {
  const grid = new Map<string, number[]>();
  for (let i = 0; i < coords.length; i++) {
    const cx = Math.floor(coords[i][0] / cellDegrees);
    const cy = Math.floor(coords[i][1] / cellDegrees);
    const key = `${cx},${cy}`;
    const cell = grid.get(key) ?? [];
    cell.push(i);
    grid.set(key, cell);
  }
  return grid;
}

/**
 * Returns the indices of all coords within `thresholdMeters` of `centroid`.
 * Uses the pre-built grid to avoid O(n) scans; checks the 3×3 neighbourhood
 * of cells surrounding the centroid's cell.
 */
function getNeighbors(
  centroid: Coord,
  coords: Coord[],
  grid: Map<string, number[]>,
  cellDegrees: number,
  thresholdMeters: number,
): number[] {
  const cx = Math.floor(centroid[0] / cellDegrees);
  const cy = Math.floor(centroid[1] / cellDegrees);
  const result: number[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = grid.get(`${cx + dx},${cy + dy}`);
      if (!cell) continue;
      for (const idx of cell) {
        if (haversineMeters(centroid, coords[idx]) <= thresholdMeters) {
          result.push(idx);
        }
      }
    }
  }
  return result;
}

// ─── Iterative mean-shift clustering ─────────────────────────────────────────

/**
 * Mean-shift variant clustering.
 *
 * For each unassigned seed vertex:
 *   1. Start with centroid = seed coordinate.
 *   2. Collect every vertex within `thresholdMeters` of the centroid into an
 *      accumulating `members` set.
 *   3. Recompute centroid as the mean of the *current* neighbour set.
 *   4. Repeat until drift < DRIFT_EPSILON_METERS or MAX_ITER is reached.
 *   5. Assign all accumulated members (first-come-first-served) to this cluster.
 *
 * Unlike UFDS, membership is determined by proximity to the **drifting
 * centroid**, not to other members. Vertices A and C can only end up in the
 * same cluster if both lie within the threshold of some intermediate centroid
 * position — not merely because A≈B and B≈C transitively.
 *
 * Returns an array parallel to `coords`: result[i] is the final centroid
 * coordinate that vertex i maps to.
 */
function buildClusterMap(coords: Coord[], thresholdMeters: number): Coord[] {
  const n = coords.length;
  if (n === 0 || thresholdMeters <= 0) return coords.slice();

  // 111 000 m ≈ 1 degree of latitude; used to size grid cells in degrees so
  // one cell ≈ thresholdMeters in linear extent.
  const cellDegrees = thresholdMeters / 111_000;
  const grid = buildGrid(coords, cellDegrees);

  const assignment = new Int32Array(n).fill(-1);
  const centroids: Coord[] = [];

  for (let seed = 0; seed < n; seed++) {
    if (assignment[seed] !== -1) continue; // already claimed by a prior cluster

    let centroid: Coord = coords[seed];
    const members = new Set<number>();

    for (let iter = 0; iter < MAX_ITER; iter++) {
      const nearby = getNeighbors(centroid, coords, grid, cellDegrees, thresholdMeters);
      if (nearby.length === 0) break;

      // Accumulate – all vertices ever close to the centroid belong here.
      for (const idx of nearby) members.add(idx);

      // Recompute centroid from the current neighbourhood (not the full
      // accumulated set), so it drifts toward the local density peak.
      let sumLng = 0;
      let sumLat = 0;
      for (const idx of nearby) {
        sumLng += coords[idx][0];
        sumLat += coords[idx][1];
      }
      const newCentroid: Coord = [sumLng / nearby.length, sumLat / nearby.length];

      const drift = haversineMeters(centroid, newCentroid);
      centroid = newCentroid;
      if (drift < DRIFT_EPSILON_METERS) break;
    }

    const clusterIdx = centroids.length;
    centroids.push(centroid);
    for (const idx of members) {
      if (assignment[idx] === -1) assignment[idx] = clusterIdx;
    }
  }

  const result: Coord[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const ci = assignment[i];
    result[i] = ci !== -1 ? centroids[ci] : coords[i];
  }
  return result;
}

// ─── Coord registry ───────────────────────────────────────────────────────────

/**
 * Maps arbitrary coordinate tuples to stable integer indices so that
 * buildClusterMap can work on a deduplicated flat array.
 */
function makeRegistry(): { coordList: Coord[]; getIdx: (c: Coord) => number } {
  const coordList: Coord[] = [];
  const coordIndex = new Map<string, number>();
  return {
    coordList,
    getIdx(c: Coord): number {
      const key = `${c[0]},${c[1]}`;
      let idx = coordIndex.get(key);
      if (idx === undefined) {
        idx = coordList.length;
        coordIndex.set(key, idx);
        coordList.push(c);
      }
      return idx;
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Cluster the vertices in a PCN GeoJSON collection.
 * Returns a new collection where nearby vertices are snapped to their cluster
 * centroid. LineString features that collapse to a single point are dropped.
 * Duplicate 2-point edges produced by the snap are deduplicated.
 */
export function clusterPcnGeoJson(
  geojson: GeoJsonCollection,
  thresholdMeters: number,
): GeoJsonCollection {
  if (thresholdMeters <= 0) return geojson;

  const { coordList, getIdx } = makeRegistry();
  for (const f of geojson.features) {
    for (const c of f.geometry.coordinates) getIdx(c as Coord);
  }

  const mapped = buildClusterMap(coordList, thresholdMeters);
  const features: GeoJsonLineFeature[] = [];
  const seenEdges = new Set<string>();

  for (const feature of geojson.features) {
    const newCoords: Coord[] = [];
    for (const c of feature.geometry.coordinates as Coord[]) {
      const mc = mapped[getIdx(c)];
      const prev = newCoords[newCoords.length - 1];
      if (!prev || prev[0] !== mc[0] || prev[1] !== mc[1]) {
        newCoords.push(mc);
      }
    }
    if (newCoords.length < 2) continue;

    // Deduplicate undirected 2-point edges per kind.
    if (newCoords.length === 2) {
      const [a, b] = newCoords;
      const k = `${Math.min(a[0], b[0])},${Math.min(a[1], b[1])}-${Math.max(a[0], b[0])},${Math.max(a[1], b[1])}-${feature.properties.kind}`;
      if (seenEdges.has(k)) continue;
      seenEdges.add(k);
    }

    features.push({
      type: "Feature",
      properties: { kind: feature.properties.kind },
      geometry: { type: "LineString", coordinates: newCoords },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * Cluster the vertices in a roads GeoJSON feature collection.
 * Behaves identically to clusterPcnGeoJson but preserves road feature
 * properties (highway type, name).
 */
export function clusterRoadsGeoJson(
  geojson: RoadsGeoJson,
  thresholdMeters: number,
): RoadsGeoJson {
  if (thresholdMeters <= 0) return geojson;

  const { coordList, getIdx } = makeRegistry();
  for (const f of geojson.features) {
    for (const c of f.geometry.coordinates) getIdx(c as Coord);
  }

  const mapped = buildClusterMap(coordList, thresholdMeters);

  const features = geojson.features
    .map((feature) => {
      const newCoords: Coord[] = [];
      for (const c of feature.geometry.coordinates as Coord[]) {
        const mc = mapped[getIdx(c)];
        const prev = newCoords[newCoords.length - 1];
        if (!prev || prev[0] !== mc[0] || prev[1] !== mc[1]) {
          newCoords.push(mc);
        }
      }
      if (newCoords.length < 2) return null;
      return {
        ...feature,
        geometry: { type: "LineString" as const, coordinates: newCoords },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return { type: "FeatureCollection", features };
}

// ─── Constants for merge ──────────────────────────────────────────────────────

const MERGE_ROAD_KINDS = new Set([
  "motorway", "trunk", "primary", "secondary", "tertiary",
]);
const MERGE_PCN_KINDS = new Set([
  "park_connector", "park_path", "rail_corridor", "cycling_path",
]);
const MAX_BRIDGE_METERS = 400;

/**
 * Build a single merged GraphData from the PCN graph and roads GeoJSON.
 *
 * All PCN and road vertices are pooled and (optionally) clustered together
 * using the same mean-shift algorithm. PCN edges take priority over road
 * edges when both share the same cluster-node pair. Bridge edges (≤400 m)
 * connect PCN cluster nodes to nearby road cluster nodes so the router can
 * leave the PCN when no direct PCN path exists.
 *
 * The returned graph is used for both routing and display.
 */
export function buildMergedGraph(
  pcnGraph: GraphData,
  roadsGeojson: RoadsGeoJson,
  thresholdMeters: number,
): GraphData {
  // ── 1. Extract quantized road nodes + edges ───────────────────────────────
  const roadNodeList: Coord[] = [];
  const roadNodeByKey = new Map<string, number>();

  function getRoadNode(c: [number, number]): number {
    const key = `${Math.round(c[0] * 1e5)},${Math.round(c[1] * 1e5)}`;
    let idx = roadNodeByKey.get(key);
    if (idx === undefined) {
      idx = roadNodeList.length;
      roadNodeByKey.set(key, idx);
      roadNodeList.push([Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5]);
    }
    return idx;
  }

  type RawRoadEdge = { from: number; to: number; dist: number; kind: string; name: string };
  const rawRoadEdges: RawRoadEdge[] = [];

  for (const feature of roadsGeojson.features) {
    const kind = feature.properties.highway;
    if (!MERGE_ROAD_KINDS.has(kind)) continue;
    const name = feature.properties.name ?? "";
    const coords = feature.geometry.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1] as [number, number];
      const b = coords[i] as [number, number];
      const fa = getRoadNode(a);
      const fb = getRoadNode(b);
      if (fa === fb) continue;
      const dist = haversineMeters(a, b);
      rawRoadEdges.push({ from: fa, to: fb, dist, kind, name });
      rawRoadEdges.push({ from: fb, to: fa, dist, kind, name });
    }
  }

  const pcnCount = pcnGraph.nodes.length;

  // ── 2. Pool all coordinates, run clustering ───────────────────────────────
  const allCoords: Coord[] = [
    ...(pcnGraph.nodes as unknown as Coord[]),
    ...roadNodeList,
  ];
  const mapped = buildClusterMap(allCoords, thresholdMeters);

  // ── 3. Assign original nodes → centroid indices ───────────────────────────
  const centroidIndex = new Map<string, number>();
  const centroidNodes: Coord[] = [];

  function getCentroidIdx(c: Coord): number {
    const key = `${c[0]},${c[1]}`;
    let idx = centroidIndex.get(key);
    if (idx === undefined) {
      idx = centroidNodes.length;
      centroidIndex.set(key, idx);
      centroidNodes.push(c);
    }
    return idx;
  }

  const pcnCI = pcnGraph.nodes.map((_, i) => getCentroidIdx(mapped[i] as Coord));
  const roadCI = roadNodeList.map((_, i) => getCentroidIdx(mapped[pcnCount + i] as Coord));

  // ── 4. Build adjacency with PCN-priority dedup ────────────────────────────
  type EdgeRecord = { dist: number; kind: string; name: string };
  const adjBuilder = new Map<number, Map<number, EdgeRecord>>();

  function getRow(from: number): Map<number, EdgeRecord> {
    let row = adjBuilder.get(from);
    if (!row) { row = new Map(); adjBuilder.set(from, row); }
    return row;
  }

  function addEdge(from: number, to: number, dist: number, kind: string, name: string): void {
    if (from === to) return;
    const row = getRow(from);
    const existing = row.get(to);
    if (!existing) { row.set(to, { dist, kind, name }); return; }
    const existingIsPcn = MERGE_PCN_KINDS.has(existing.kind);
    const newIsPcn = MERGE_PCN_KINDS.has(kind);
    if (!existingIsPcn && newIsPcn) { row.set(to, { dist, kind, name }); return; }
    if (existingIsPcn === newIsPcn && dist < existing.dist) { row.set(to, { dist, kind, name }); }
  }

  // PCN edges
  for (let i = 0; i < pcnGraph.adj.length; i++) {
    for (const [j, dist, kind, name] of pcnGraph.adj[i]) {
      addEdge(pcnCI[i], pcnCI[j], dist, kind, name);
    }
  }

  // Road edges
  for (const { from, to, dist, kind, name } of rawRoadEdges) {
    addEdge(roadCI[from], roadCI[to], dist, kind, name);
  }

  // ── 5. Bridge edges: PCN cluster nodes ↔ nearby road cluster nodes ────────
  const pcnCentroidSet = new Set(pcnCI);
  const roadCentroidArr = [...new Set(roadCI)];
  const roadCentroidCoords = roadCentroidArr.map(i => centroidNodes[i]);
  const bridgeCellDeg = MAX_BRIDGE_METERS / 111_000;
  const bridgeGrid = buildGrid(roadCentroidCoords, bridgeCellDeg);

  for (const pci of pcnCentroidSet) {
    const pcnCoord = centroidNodes[pci];
    const nearbyArr = getNeighbors(pcnCoord, roadCentroidCoords, bridgeGrid, bridgeCellDeg, MAX_BRIDGE_METERS);
    for (const arrIdx of nearbyArr) {
      const rci = roadCentroidArr[arrIdx];
      if (pci === rci) continue;
      const dist = haversineMeters(pcnCoord, centroidNodes[rci]);
      addEdge(pci, rci, dist, "bridge", "");
      addEdge(rci, pci, dist, "bridge", "");
    }
  }

  // ── 6. Build final adj array ──────────────────────────────────────────────
  const n = centroidNodes.length;
  const adj: Array<Array<[number, number, string, string]>> = Array.from({ length: n }, () => []);
  let totalEdges = 0;

  for (const [from, neighbors] of adjBuilder) {
    for (const [to, { dist, kind, name }] of neighbors) {
      adj[from].push([to, dist, kind, name]);
      totalEdges++;
    }
  }

  return {
    meta: {
      source: "merged",
      generatedAt: new Date().toISOString(),
      nodes: n,
      segments: Math.round(totalEdges / 2),
    },
    nodes: centroidNodes as unknown as [number, number][],
    adj,
  };
}
