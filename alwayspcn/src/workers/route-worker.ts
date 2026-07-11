import {
  computeRoute,
  type Coordinate,
  type GraphData,
  type RouteResult,
  type RouteWeights,
} from "@/lib/routing";

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

type WorkerMessage = InitGraphMessage | RouteRequest;

type RouteResponse = {
  type: "result";
  requestId: number;
  result: RouteResult;
};

// Graph is sent once via init_graph and cached here. Subsequent compute
// messages only carry start/end/weights — no graph clone per request.
let cachedGraph: GraphData | null = null;

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
  }
};

export {};
