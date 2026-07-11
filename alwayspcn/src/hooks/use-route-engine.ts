import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeRoute,
  type Coordinate,
  type GraphData,
  type RouteResult,
  type RouteWeights,
  type RoadsGeoJson,
} from "@/lib/routing";
import { validateGraphData } from "@/lib/graph-validation";

const MAIN_THREAD_FALLBACK_NODE_LIMIT = 50_000;

type WorkerResultMessage =
  | { type: "result"; requestId: number; result: RouteResult }
  | { type: "graph_ready"; graph: GraphData };

interface UseRouteEngineParams {
  start: Coordinate | null;
  end: Coordinate | null;
  routeWeights: RouteWeights;
  clusterEnabled: boolean;
  clusterThreshold: number;
  onMessage: (msg: string) => void;
}

export function useRouteEngine({
  start,
  end,
  routeWeights,
  clusterEnabled,
  clusterThreshold,
  onMessage,
}: UseRouteEngineParams) {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [roadsGeojson, setRoadsGeojson] = useState<RoadsGeoJson | null>(null);
  const [roadsLoading, setRoadsLoading] = useState(false);
  const [activeGraph, setActiveGraph] = useState<GraphData | null>(null);
  const [graphBuilding, setGraphBuilding] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [serverRouting, setServerRouting] = useState(false);

  /**
   * High-power device detection — computed once at render time so the
   * data-load and worker-creation effects can gate on it without racing
   * against a setState.
   * Only confirmed high-power (deviceMemory ≥ 4, non-mobile, API available)
   * devices switch to client-side routing; everything else stays on server.
   */
  const highPowerRef = useRef(
    typeof navigator !== "undefined" &&
      (() => {
        const nav = navigator as Navigator & { deviceMemory?: number };
        if (typeof nav.deviceMemory !== "number") return false; // unknown → safe default
        return nav.deviceMemory >= 4 && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      })(),
  );

  const [useServerRouting, setUseServerRouting] = useState(true);

  // navigator is unavailable on the server, so highPowerRef.current is always
  // false during SSR. Sync the real client-side detection on mount and disable
  // server routing only for confirmed high-power devices.
  useEffect(() => {
    if (highPowerRef.current) setUseServerRouting(false);
  }, []);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  /** True when activeGraph was just set from a worker graph_ready — skip re-sending init_graph. */
  const skipWorkerInitRef = useRef(false);

  const loadGraph = async () => {
    onMessage("Loading PCN network…");
    const response = await fetch("/api/data/network");
    if (!response.ok) {
      onMessage("Unable to load /data/network.json. Run npm run build:network first.");
      return;
    }
    const rawPayload: unknown = await response.json();
    const validation = validateGraphData(rawPayload);
    if (!validation.valid) {
      setGraph(null);
      setRoute(null);
      onMessage(`Invalid network data: ${validation.error}`);
      return;
    }
    const loadedGraph = validation.data;
    setRoute(null);
    setGraph(loadedGraph);
    onMessage(
      `PCN network ready (${loadedGraph.meta.nodes.toLocaleString()} nodes). Set two points to route.`,
    );
  };

  const loadRoads = async () => {
    if (roadsGeojson || roadsLoading) return;
    setRoadsLoading(true);
    onMessage("Loading Singapore roads overlay…");
    try {
      const roadsResponse = await fetch("/api/data/roads");
      if (!roadsResponse.ok) {
        onMessage("Road overlay unavailable — run npm run build:roads.");
        return;
      }
      const roadsData: RoadsGeoJson = await roadsResponse.json();
      setRoadsGeojson(roadsData);
      const roadCount = Array.isArray(roadsData.features)
        ? roadsData.features.length.toLocaleString()
        : "0";
      onMessage(`Roads loaded (${roadCount} features). Rebuilding graph…`);
    } catch {
      onMessage("Road overlay failed to load.");
    } finally {
      setRoadsLoading(false);
    }
  };

  // On mount: only load graph data on confirmed high-power devices
  useEffect(() => {
    if (!highPowerRef.current) {
      onMessage("Set two points to route (server routing).");
      return;
    }
    void loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Worker lifecycle — runs once; highPowerRef gates entry without a state-update race
  useEffect(() => {
    if (!highPowerRef.current) return;
    try {
      const worker = new Worker(new URL("../workers/route-worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResultMessage>) => {
        const payload = event.data;
        if (!payload) return;
        if (payload.type === "graph_ready") {
          skipWorkerInitRef.current = true;
          setActiveGraph(payload.graph);
          setGraphBuilding(false);
          return;
        }
        if (payload.type === "result") {
          if (payload.requestId !== requestIdRef.current) return;
          setRoute(payload.result);
        }
      };
      return () => {
        worker.terminate();
      };
    } catch {
      workerRef.current = null;
      return undefined;
    }
  }, []);

  // Cache the active graph in the worker once on change so compute messages
  // don't need to clone the full graph (~2 MB) on every route request.
  // Skip when the graph was already set inside the worker (build_graph path).
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !activeGraph) return;
    if (skipWorkerInitRef.current) {
      skipWorkerInitRef.current = false;
      return;
    }
    worker.postMessage({ type: "init_graph", graph: activeGraph });
  }, [activeGraph]);

  // Auto-load roads once the PCN graph is ready.
  // Safe for low-memory devices: loadGraph() is never called there so graph stays
  // null and this effect never fires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (graph) void loadRoads(); }, [graph]);

  // Build merged graph (PCN + roads, optionally clustered). Debounced 250 ms
  // so slider drags don't trigger mid-drag rebuilds.
  useEffect(() => {
    if (!graph) { setActiveGraph(null); return; }
    if (!roadsGeojson) { setActiveGraph(graph); return; }
    setGraphBuilding(true);
    const id = window.setTimeout(() => {
      const worker = workerRef.current;
      if (worker) {
        worker.postMessage({
          type: "build_graph",
          pcnGraph: graph,
          roadsGeojson,
          clusterThreshold: clusterEnabled ? clusterThreshold : 0,
        });
        // graph_ready response will set activeGraph and clear graphBuilding
      } else {
        // Fallback: run on main thread (no worker available)
        import("@/lib/cluster-graph").then(({ buildMergedGraph }) => {
          setActiveGraph(
            buildMergedGraph(graph, roadsGeojson, clusterEnabled ? clusterThreshold : 0),
          );
          setGraphBuilding(false);
        });
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [graph, roadsGeojson, clusterEnabled, clusterThreshold]);

  // Client-side routing
  useEffect(() => {
    if (useServerRouting || !activeGraph || !start || !end) return;
    setRoute(null);
    const timeoutId = window.setTimeout(() => {
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
      const worker = workerRef.current;
      if (!worker) {
        if (activeGraph.meta.nodes > MAIN_THREAD_FALLBACK_NODE_LIMIT) {
          onMessage("Worker unavailable and graph is large. Routing paused to prevent UI freeze.");
          return;
        }
        onMessage("Worker unavailable. Running route on main thread for small graph.");
        setRoute(computeRoute(activeGraph, start, end, routeWeights));
        return;
      }
      worker.postMessage({
        type: "compute",
        requestId: currentRequestId,
        start,
        end,
        weights: routeWeights,
      });
    }, 180);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGraph, start, end, routeWeights, useServerRouting]);

  // Server-side routing
  useEffect(() => {
    if (!useServerRouting || !start || !end) return;
    setRoute(null);
    setServerRouting(true);
    const abortCtrl = new AbortController();
    const params = new URLSearchParams({
      startLat: String(start[1]),
      startLng: String(start[0]),
      endLat: String(end[1]),
      endLng: String(end[0]),
      weights: JSON.stringify(routeWeights),
    });
    fetch(`/api/route?${params.toString()}`, { signal: abortCtrl.signal })
      .then((res) => res.json())
      .then((result: RouteResult) => {
        setRoute(result);
        onMessage("Route ready.");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        onMessage("Server routing failed.");
      })
      .finally(() => {
        setServerRouting(false);
      });
    return () => { abortCtrl.abort(); };
  }, [useServerRouting, start, end, routeWeights]);

  const rawRoadNodeCount = useMemo(() => {
    if (!roadsGeojson) return 0;
    const ROAD_KINDS = new Set(["motorway", "trunk", "primary", "secondary", "tertiary"]);
    const seen = new Set<string>();
    for (const f of roadsGeojson.features) {
      if (!ROAD_KINDS.has(f.properties.highway)) continue;
      for (const c of f.geometry.coordinates) {
        seen.add(`${Math.round(c[0] * 1e5)},${Math.round(c[1] * 1e5)}`);
      }
    }
    return seen.size;
  }, [roadsGeojson]);

  const handleServerRoutingToggle = () => {
    const next = !useServerRouting;
    setUseServerRouting(next);
    if (next) {
      // Invalidate any in-flight client-side worker request so its response
      // doesn't overwrite the server route result.
      requestIdRef.current += 1;
    }
    if (!next && !graph) void loadGraph();
  };

  return {
    graph,
    activeGraph,
    route,
    rawRoadNodeCount,
    graphBuilding,
    roadsLoading,
    serverRouting,
    useServerRouting,
    handleServerRoutingToggle,
  };
}
