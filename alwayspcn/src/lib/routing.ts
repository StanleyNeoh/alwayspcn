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

export type RouteResult = {
  found: boolean;
  path: Coordinate[];
  distanceMeters: number;
  connectorShare: number;
  usesFallback: boolean;
};

const FACTOR: Record<string, number> = {
  park_connector: 0.72,
  park_path: 0.82,
  rail_corridor: 0.9,
  cycling_path: 1,
  other: 1.08,
};

function haversineMeters(a: Coordinate, b: Coordinate) {
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

export function findNearestNode(graph: GraphData, point: Coordinate) {
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

export function computeRoute(
  graph: GraphData,
  start: Coordinate,
  end: Coordinate
): RouteResult {
  const startNode = findNearestNode(graph, start);
  const endNode = findNearestNode(graph, end);

  if (startNode.index < 0 || endNode.index < 0) {
    return {
      found: false,
      path: [],
      distanceMeters: 0,
      connectorShare: 0,
      usesFallback: false,
    };
  }

  const n = graph.nodes.length;
  const dist = new Array(n).fill(Number.POSITIVE_INFINITY);
  const prev = new Array(n).fill(-1);
  const seen = new Array(n).fill(false);

  dist[startNode.index] = 0;

  for (let step = 0; step < n; step += 1) {
    let u = -1;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i += 1) {
      if (!seen[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === endNode.index) {
      break;
    }
    seen[u] = true;

    for (const [to, distance, kind] of graph.adj[u]) {
      const factor = FACTOR[kind] ?? FACTOR.other;
      const cost = distance * factor;
      const cand = dist[u] + cost;
      if (cand < dist[to]) {
        dist[to] = cand;
        prev[to] = u;
      }
    }
  }

  if (!Number.isFinite(dist[endNode.index])) {
    return {
      found: false,
      path: [],
      distanceMeters: 0,
      connectorShare: 0,
      usesFallback: false,
    };
  }

  const nodePath: number[] = [];
  let cursor = endNode.index;
  while (cursor !== -1) {
    nodePath.push(cursor);
    cursor = prev[cursor];
  }
  nodePath.reverse();

  let totalDistance = 0;
  let connectorDistance = 0;

  for (let i = 1; i < nodePath.length; i += 1) {
    const from = nodePath[i - 1];
    const to = nodePath[i];
    const edge = graph.adj[from].find(([next]) => next === to);
    if (!edge) {
      continue;
    }
    const [, distance, kind] = edge;
    totalDistance += distance;
    if (kind === "park_connector" || kind === "park_path") {
      connectorDistance += distance;
    }
  }

  const path = nodePath.map((idx) => graph.nodes[idx]);
  const connectorShare = totalDistance > 0 ? connectorDistance / totalDistance : 0;

  return {
    found: true,
    path,
    distanceMeters: totalDistance,
    connectorShare,
    usesFallback: connectorShare < 0.999,
  };
}
