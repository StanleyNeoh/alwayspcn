import {
  computeRoute,
  type Coordinate,
  type GraphData,
  type RouteResult,
  type RouteWeights,
  type RoadsGeoJson,
} from "@/lib/routing";
import { buildMergedGraph } from "@/lib/cluster-graph";

type InitGraphMessage = {
  type: "init_graph";
  graph: GraphData;
};

type RouteRequest = {
  type: "compute";
  requestId: number;
  start: Coordinate;
  end: Coordinate;
  weights?: RouteWeights;
};

type BuildGraphMessage = {
  type: "build_graph";
  pcnGraph: GraphData;
  roadsGeojson: RoadsGeoJson;
  clusterThreshold: number;
};

type WorkerMessage = InitGraphMessage | RouteRequest | BuildGraphMessage;

type RouteResponse = {
  type: "result";
  requestId: number;
  result: RouteResult;
};

type GraphReadyResponse = {
  type: "graph_ready";
  graph: GraphData;
};

// Graph is sent once via init_graph and cached here. Subsequent compute
// messages only carry start/end/weights — no graph clone per request.
let cachedGraph: GraphData | null = null;

// Source data stored on first build_graph so subsequent threshold changes
// don't require re-sending the full PCN + roads payload.
let storedPcnGraph: GraphData | null = null;
let storedRoadsGeojson: RoadsGeoJson | null = null;
// Keyed by threshold — avoids recomputing when the user revisits a value.
const mergedGraphCache = new Map<number, GraphData>();

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === "init_graph") {
    cachedGraph = message.graph;
    return;
  }

  if (message.type === "compute") {
    if (!cachedGraph) return;
    const result = computeRoute(cachedGraph, message.start, message.end, message.weights);
    const response: RouteResponse = {
      type: "result",
      requestId: message.requestId,
      result,
    };
    self.postMessage(response);
    return;
  }

  if (message.type === "build_graph") {
    // If source data has changed (e.g. new session), invalidate the cache.
    if (
      storedPcnGraph !== message.pcnGraph ||
      storedRoadsGeojson !== message.roadsGeojson
    ) {
      storedPcnGraph = message.pcnGraph;
      storedRoadsGeojson = message.roadsGeojson;
      mergedGraphCache.clear();
    }

    const { clusterThreshold } = message;
    let merged = mergedGraphCache.get(clusterThreshold);
    if (!merged) {
      merged = buildMergedGraph(message.pcnGraph, message.roadsGeojson, clusterThreshold);
      mergedGraphCache.set(clusterThreshold, merged);
    }

    cachedGraph = merged;
    const response: GraphReadyResponse = { type: "graph_ready", graph: merged };
    self.postMessage(response);
  }
};

export {};
