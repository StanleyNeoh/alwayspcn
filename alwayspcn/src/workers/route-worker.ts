import {
  buildRoadGraph,
  computeRoute,
  computeRouteWithFallback,
  type Coordinate,
  type GraphData,
  type RoadsGeoJson,
} from "@/lib/routing";

type InitRoadsMessage = {
  type: "init_roads";
  roadsGeoJson: RoadsGeoJson;
};

type RouteRequest = {
  type: "compute";
  requestId: number;
  graph: GraphData;
  start: Coordinate;
  end: Coordinate;
};

type WorkerMessage = InitRoadsMessage | RouteRequest;

type RouteResponse = {
  type: "result";
  requestId: number;
  result: ReturnType<typeof computeRoute>;
};

// Road graph cached after first init_roads message.
let roadGraph: GraphData | null = null;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === "init_roads") {
    roadGraph = buildRoadGraph(message.roadsGeoJson);
    return;
  }

  if (message.type === "compute") {
    const result =
      roadGraph !== null
        ? computeRouteWithFallback(message.graph, roadGraph, message.start, message.end)
        : computeRoute(message.graph, message.start, message.end);

    const response: RouteResponse = {
      type: "result",
      requestId: message.requestId,
      result,
    };
    self.postMessage(response);
  }
};

export {};
