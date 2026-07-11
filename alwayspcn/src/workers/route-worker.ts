import {
  computeRoute,
  type Coordinate,
  type GraphData,
  type RouteResult,
  type RouteWeights,
} from "@/lib/routing";

type RouteRequest = {
  type: "compute";
  requestId: number;
  graph: GraphData;
  start: Coordinate;
  end: Coordinate;
  weights?: RouteWeights;
};

type RouteResponse = {
  type: "result";
  requestId: number;
  result: RouteResult;
};

self.onmessage = (event: MessageEvent<RouteRequest>) => {
  const message = event.data;
  if (!message || message.type !== "compute") return;

  const result = computeRoute(message.graph, message.start, message.end, message.weights);
  const response: RouteResponse = {
    type: "result",
    requestId: message.requestId,
    result,
  };
  self.postMessage(response);
};

export {};
