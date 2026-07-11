import { computeRoute, type Coordinate, type GraphData } from "@/lib/routing";

type RouteRequest = {
  type: "compute";
  requestId: number;
  graph: GraphData;
  start: Coordinate;
  end: Coordinate;
};

type RouteResponse = {
  type: "result";
  requestId: number;
  result: ReturnType<typeof computeRoute>;
};

self.onmessage = (event: MessageEvent<RouteRequest>) => {
  const message = event.data;
  if (!message || message.type !== "compute") {
    return;
  }

  const result = computeRoute(message.graph, message.start, message.end);
  const response: RouteResponse = {
    type: "result",
    requestId: message.requestId,
    result,
  };
  self.postMessage(response);
};

export {};
