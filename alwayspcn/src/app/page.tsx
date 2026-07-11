"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripHorizontal, Layers, Loader2, MapPin, Navigation, Search } from "lucide-react";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { validateGraphData } from "@/lib/graph-validation";
import { geocodeLocation } from "@/lib/geocode";
import { graphToAllEdgesGeoJson, type GeoJsonCollection } from "@/lib/graph-to-geojson";
import {
  computeRoute,
  DEFAULT_ROUTE_WEIGHTS,
  type Coordinate,
  type GraphData,
  type RouteResult,
  type RouteWeights,
  type RoadsGeoJson,
} from "@/lib/routing";
import { cn } from "@/lib/utils";

const RouteMap = dynamic(
  () => import("@/components/map/route-map").then((mod) => mod.RouteMap),
  { ssr: false }
);

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const MAIN_THREAD_FALLBACK_NODE_LIMIT = 50_000;

// ── Draggable hook ──────────────────────────────────────────────────────────

function useDraggable(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const isDragging = useRef(false);
  const startOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef(initial);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    isDragging.current = true;
    startOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current) return;
    const newPos = {
      x: e.clientX - startOffset.current.x,
      y: e.clientY - startOffset.current.y,
    };
    posRef.current = newPos;
    setPos(newPos);
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  return {
    pos,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    } as React.HTMLAttributes<HTMLElement>,
  };
}

// ────────────────────────────────────────────────────────────────────────────

/** Matches "1.3521, 103.8198" or "1.3521,103.8198" (lat,lng) */
const COORD_RE = /^[-+]?\d+\.?\d*\s*,\s*[-+]?\d+\.?\d*$/;

type WorkerResultMessage =
  | { type: "result"; requestId: number; result: RouteResult }
  | { type: "graph_ready"; graph: GraphData };

export default function Home() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [start, setStart] = useState<Coordinate | null>(null);
  const [end, setEnd] = useState<Coordinate | null>(null);
  const [startInput, setStartInput] = useState("1.3434,103.8247");
  const [endInput, setEndInput] = useState("1.4042,103.9021");
  const [pickMode, setPickMode] = useState<"start" | "end" | null>(null);
  const [message, setMessage] = useState("Load the network and set two points to route.");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [roadsGeojson, setRoadsGeojson] = useState<RoadsGeoJson | null>(null);
  const [roadsLoading, setRoadsLoading] = useState(false);
  const [showPcnOverlay, setShowPcnOverlay] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activeGraph, setActiveGraph] = useState<GraphData | null>(null);
  const [graphBuilding, setGraphBuilding] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  const [clusterEnabled, setClusterEnabled] = useState(false);
  const [clusterThreshold, setClusterThreshold] = useState(10);
  const [routeWeights, setRouteWeights] = useState<RouteWeights>(DEFAULT_ROUTE_WEIGHTS);

  /**
   * Synchronous low-memory detection — computed once at render time (before any effects),
   * so both the data-load effect and the worker-creation effect can gate on it without
   * racing against a setState. Declared before useServerRouting so it can seed the initial value.
   */
  const lowMemoryRef = useRef(
    typeof navigator !== "undefined" &&
      (() => {
        const nav = navigator as Navigator & { deviceMemory?: number };
        return typeof nav.deviceMemory === "number"
          ? nav.deviceMemory < 4
          : /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      })()
  );

  // Default to server routing on low-memory / mobile devices; high-power devices default to client.
  const [useServerRouting, setUseServerRouting] = useState(() => lowMemoryRef.current);
  const [serverRouting, setServerRouting] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  /** True when activeGraph was just set from a worker graph_ready — skip re-sending init_graph. */
  const skipWorkerInitRef = useRef(false);

  const panel = useDraggable({ x: 16, y: 16 });
  const adv = useDraggable({ x: 16, y: 490 });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);

    // Detect low-memory or mobile device — use server-side routing to avoid OOM.
    // lowMemoryRef is computed synchronously at render time so this detection never
    // races with other effects that also run on mount.
    const lowMemory = lowMemoryRef.current;

    // Restore advanced settings
    try {
      const adv = localStorage.getItem("alwayspcn_adv");
      if (adv) {
        const parsed = JSON.parse(adv) as {
          clusterEnabled?: boolean;
          clusterThreshold?: number;
          weights?: RouteWeights;
        };
        if (typeof parsed.clusterEnabled === "boolean") setClusterEnabled(parsed.clusterEnabled);
        if (typeof parsed.clusterThreshold === "number") setClusterThreshold(parsed.clusterThreshold);
        if (parsed.weights) setRouteWeights({ ...DEFAULT_ROUTE_WEIGHTS, ...parsed.weights });
      }
    } catch {
      // ignore malformed storage
    }

    if (lowMemory) {
      setUseServerRouting(true);
      setMessage("Set two points to route (server routing).");
      return; // ← skip data loading entirely on this device
    }

    // Capable device — start loading PCN network data
    void loadGraph();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist advanced settings whenever they change
  useEffect(() => {
    localStorage.setItem(
      "alwayspcn_adv",
      JSON.stringify({ clusterEnabled, clusterThreshold, weights: routeWeights })
    );
  }, [clusterEnabled, clusterThreshold, routeWeights]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    // lowMemoryRef is set synchronously at render time — no race with useServerRouting state.
    if (lowMemoryRef.current) return;
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
  }, []); // [] — runs once; lowMemoryRef gates entry without a state-update race

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

  useEffect(() => {
    if (useServerRouting || !activeGraph || !start || !end) {
      return;
    }

    setRoute(null);
    const timeoutId = window.setTimeout(() => {
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
      const worker = workerRef.current;

      if (!worker) {
        if (activeGraph.meta.nodes > MAIN_THREAD_FALLBACK_NODE_LIMIT) {
          setMessage(
            "Worker unavailable and graph is large. Routing paused to prevent UI freeze."
          );
          return;
        }
        setMessage("Worker unavailable. Running route on main thread for small graph.");
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

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeGraph, start, end, routeWeights]);

  const onMapPick = (point: Coordinate) => {
    if (!pickMode) return;
    setRoute(null);
    setPickMode(null);
    if (pickMode === "start") {
      setStart(point);
      setStartInput(`${point[1].toFixed(6)},${point[0].toFixed(6)}`);
      setMessage("Start point set.");
    } else {
      setEnd(point);
      setEndInput(`${point[1].toFixed(6)},${point[0].toFixed(6)}`);
      setMessage("End point set.");
    }
  };

  const parseCoordInput = (text: string): Coordinate | null => {
    const [latStr, lngStr] = text.split(",").map((part) => part.trim());
    const lat = Number.parseFloat(latStr);
    const lng = Number.parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    return [lng, lat];
  };

  /**
   * Resolve an input string to a Coordinate.
   * Accepts raw "lat,lng" coords or a place name (geocoded via Nominatim).
   */
  const resolveLocation = async (input: string): Promise<Coordinate | null> => {
    const trimmed = input.trim();
    if (COORD_RE.test(trimmed)) {
      return parseCoordInput(trimmed);
    }
    return geocodeLocation(trimmed);
  };

  const loadGraph = async () => {
    setMessage("Loading PCN network…");
    const response = await fetch("/api/data/network");
    if (!response.ok) {
      setMessage("Unable to load /data/network.json. Run npm run build:network first.");
      return;
    }
    const rawPayload: unknown = await response.json();
    const validation = validateGraphData(rawPayload);

    if (!validation.valid) {
      setGraph(null);
      setRoute(null);
      setMessage(`Invalid network data: ${validation.error}`);
      return;
    }

    const loadedGraph = validation.data;
    setRoute(null);
    setGraph(loadedGraph);

    const nodeCount = loadedGraph.meta.nodes.toLocaleString();
    setMessage(`PCN network ready (${nodeCount} nodes). Set two points to route.`);
  };

  const loadRoads = async () => {
    if (roadsGeojson || roadsLoading) return;
    setRoadsLoading(true);
    setMessage("Loading Singapore roads overlay…");
    try {
      const roadsResponse = await fetch("/api/data/roads");
      if (!roadsResponse.ok) {
        setMessage("Road overlay unavailable — run npm run build:roads.");
        return;
      }
      const roadsData: RoadsGeoJson = await roadsResponse.json();
      setRoadsGeojson(roadsData);
      const roadCount = Array.isArray(roadsData.features)
        ? roadsData.features.length.toLocaleString()
        : "0";
      setMessage(`Roads loaded (${roadCount} features). Rebuilding graph…`);
    } catch {
      setMessage("Road overlay failed to load.");
    } finally {
      setRoadsLoading(false);
    }
  };

  const applyLocations = async () => {
    setIsGeocoding(true);
    setMessage("Resolving locations…");

    try {
      const [resolvedStart, resolvedEnd] = await Promise.all([
        resolveLocation(startInput),
        resolveLocation(endInput),
      ]);

      if (!resolvedStart) {
        setMessage(`Could not find location: "${startInput}"`);
        return;
      }
      if (!resolvedEnd) {
        setMessage(`Could not find location: "${endInput}"`);
        return;
      }

      setRoute(null);
      setStart(resolvedStart);
      setEnd(resolvedEnd);

      // Reflect resolved coordinates back into inputs so user can verify
      setStartInput(`${resolvedStart[1].toFixed(6)},${resolvedStart[0].toFixed(6)}`);
      setEndInput(`${resolvedEnd[1].toFixed(6)},${resolvedEnd[0].toFixed(6)}`);
      setMessage("Locations resolved. Routing…");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Auto-load roads once the PCN graph is ready.
  // Safe for low-memory devices: loadGraph() is never called there so graph stays
  // null and this effect never fires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (graph) void loadRoads(); }, [graph]);

  // Server-side routing path: fetch /api/route when start+end change on low-memory devices
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
      .then((result: RouteResult) => { setRoute(result); setMessage("Route ready."); })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessage("Server routing failed.");
      })
      .finally(() => { setServerRouting(false); });
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

  // Build merged graph (PCN + roads, optionally clustered). Debounced 250 ms
  // so slider drags don't trigger mid-drag rebuilds.
  // When a worker is available, the merge runs off the main thread to avoid
  // freezing the UI on large datasets.
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
          setActiveGraph(buildMergedGraph(graph, roadsGeojson, clusterEnabled ? clusterThreshold : 0));
          setGraphBuilding(false);
        });
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [graph, roadsGeojson, clusterEnabled, clusterThreshold]);

  const displayPcnGeojson = useMemo(() => {
    if (!activeGraph || !showPcnOverlay) return null;
    return graphToAllEdgesGeoJson(activeGraph);
  }, [activeGraph, showPcnOverlay]);

  // Server routing sends full RouteResult (with coordinates) so activeGraph is not required.
  const activeRoute = (useServerRouting || !!activeGraph) && start && end ? route : null;

  const handleServerRoutingToggle = () => {
    const next = !useServerRouting;
    setUseServerRouting(next);
    if (!next && !graph) {
      void loadGraph();
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">

      {/* ── Full-screen map ───────────────────────────────────────── */}
      <div className={cn("absolute inset-0", pickMode ? "[&_.leaflet-container]:cursor-crosshair" : "")}>
        <RouteMap
          segments={activeRoute?.found ? activeRoute.segments : []}
          start={start}
          end={end}
          onMapPick={onMapPick}
          pcnGeojson={displayPcnGeojson}
          isDark={isDark}
          toggleDark={toggleDark}
        />
      </div>

      {/* ── Route panel ──────────────────────────────────────────── */}
      {/* No overflow:hidden so the combobox dropdown can escape the card */}
      <div
        style={{ transform: `translate(${panel.pos.x}px, ${panel.pos.y}px)` }}
        className="absolute left-0 top-0 z-[1000] w-[min(310px,calc(100vw-32px))] select-none"
      >
        <div className="rounded-2xl border border-zinc-200/70 bg-white/95 shadow-xl backdrop-blur-xl dark:border-zinc-700/70 dark:bg-zinc-950/95">

          {/* Drag handle */}
          <div
            {...panel.dragHandleProps}
            className={cn(
              "flex cursor-grab items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2 active:cursor-grabbing",
              panelOpen ? "rounded-t-2xl" : "rounded-2xl border-b-0"
            )}
          >
            <div className="flex items-center gap-1.5">
              <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Route planner
              </span>
            </div>
            <div className="flex items-center gap-1">

              <button
                type="button"
                aria-label={panelOpen ? "Collapse panel" : "Expand panel"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setPanelOpen((v) => !v)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {panelOpen
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Card content */}
          {panelOpen && <div className="max-h-[calc(100svh-120px)] space-y-3 overflow-y-auto p-4">

            {/* Location inputs */}
            <div className="space-y-2">
              <LocationCombobox
                id="start"
                label="Start"
                placeholder="Place name or lat,lng"
                value={startInput}
                onChange={setStartInput}
                onSelect={(coord, label) => {
                  setRoute(null);
                  setStart(coord);
                  setStartInput(label);
                  setMessage("Start location set. Routing…");
                }}
              />
              <LocationCombobox
                id="end"
                label="End"
                placeholder="Place name or lat,lng"
                value={endInput}
                onChange={setEndInput}
                onSelect={(coord, label) => {
                  setRoute(null);
                  setEnd(coord);
                  setEndInput(label);
                  setMessage("End location set. Routing…");
                }}
              />
            </div>

            {/* Action row: search + map pick mode */}
            <div className="flex items-center gap-2">
              <button
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                type="button"
                onClick={applyLocations}
                disabled={isGeocoding}
              >
                {isGeocoding
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Search className="h-3.5 w-3.5" />}
                {isGeocoding ? "Resolving…" : "Search"}
              </button>

              {/* Map pick mode */}
              <div
                className="flex shrink-0 overflow-hidden rounded-xl border border-border/70 text-xs"
                role="group"
                aria-label="Map click mode"
              >
                <button
                  type="button"
                  title={pickMode === "start" ? "Cancel — click to deactivate" : "Click to pick start on map"}
                  onClick={() => {
                    const next = pickMode === "start" ? null : "start";
                    setPickMode(next);
                    if (next === "start") setMessage("Click on the map to set the start point.");
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-2 transition-colors",
                    pickMode === "start"
                      ? "bg-teal-500 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <MapPin className="h-3 w-3" />S
                </button>
                <div className="w-px bg-border/60" />
                <button
                  type="button"
                  title={pickMode === "end" ? "Cancel — click to deactivate" : "Click to pick end on map"}
                  onClick={() => {
                    const next = pickMode === "end" ? null : "end";
                    setPickMode(next);
                    if (next === "end") setMessage("Click on the map to set the end point.");
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-2 transition-colors",
                    pickMode === "end"
                      ? "bg-rose-500 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Navigation className="h-3 w-3" />E
                </button>
              </div>
            </div>

            {/* Status + route stats */}
            <div className="rounded-xl border border-border/40 bg-muted/25 px-3 py-2.5 text-xs">
              {useServerRouting && (
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
                  {serverRouting ? "Server routing…" : "Server routing"}
                </p>
              )}
              <p className="leading-relaxed text-muted-foreground">{message}</p>
              {activeRoute?.found ? (
                <div className="mt-2 space-y-0.5 font-medium text-foreground">
                  <p>Distance: {formatDistance(activeRoute.distanceMeters)}</p>
                  <p>PCN share: {(activeRoute.connectorShare * 100).toFixed(1)}%</p>
                  {activeRoute.usesFallback && (
                    <p className="font-normal text-muted-foreground">Road segments used</p>
                  )}
                </div>
              ) : activeRoute?.found === false ? (
                <p className="mt-1 font-medium text-destructive">
                  No route found for selected points.
                </p>
              ) : null}
            </div>

            {/* Legend (collapsible) */}
            {activeGraph ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLegend((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>Legend</span>
                  <span className="text-[9px] opacity-60">{showLegend ? "▲" : "▼"}</span>
                </button>
                {showLegend && (
                  <div className="mt-1 flex flex-col gap-y-1.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-[10px] text-muted-foreground">
                    {/* PCN — solid lines */}
                    {[
                      { color: "#00b09b", label: "Park Connector Network" },
                      { color: "#a855f7", label: "Future Network" },
                      { color: "#4a90d9", label: "Cycling Path Network" },
                    ].map(({ color, label }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <span className="inline-block h-[3px] w-5 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    ))}
                    <div className="my-0.5 h-px bg-border/30" />
                    {/* Roads — dashed lines */}
                    {[
                      { color: "#dc2626", label: "Major Roads", sub: "motorway · trunk · primary" },
                      { color: "#ea580c", label: "Secondary Roads", sub: "secondary · tertiary" },
                      { color: "#ca8a04", label: "Local Roads", sub: "residential · unclassified" },
                      { color: "#94a3b8", label: "Bridge Connections", sub: "PCN–road link edges" },
                    ].map(({ color, label, sub }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <svg width="20" height="6" className="shrink-0">
                          <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray="4 4" />
                        </svg>
                        <span className="flex flex-col gap-0">
                          <span>{label}</span>
                          <span className="text-[9px] text-muted-foreground/50">{sub}</span>
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

          </div>}
        </div>
      </div>

      {/* ── Advanced card ─────────────────────────────────────── */}
      <div
        style={{ transform: `translate(${adv.pos.x}px, ${adv.pos.y}px)` }}
        className="absolute left-0 top-0 z-[1000] w-[min(310px,calc(100vw-32px))] select-none"
      >
        <div className="rounded-2xl border border-zinc-200/70 bg-white/95 shadow-xl backdrop-blur-xl dark:border-zinc-700/70 dark:bg-zinc-950/95">

          {/* Drag handle */}
          <div
            {...adv.dragHandleProps}
            className={cn(
              "flex cursor-grab items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2 active:cursor-grabbing",
              advOpen ? "rounded-t-2xl" : "rounded-2xl border-b-0"
            )}
          >
            <div className="flex items-center gap-1.5">
              <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Advanced
              </span>
            </div>
            <button
              type="button"
              aria-label={advOpen ? "Collapse advanced" : "Expand advanced"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setAdvOpen((v) => !v)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {advOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Card content */}
          {advOpen && (
            <div className="max-h-[calc(100svh-120px)] space-y-4 overflow-y-auto p-4">

              {/* Routing Mode */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Routing Mode
                </p>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs select-none">
                  <span className="text-muted-foreground">Server routing</span>
                  <input
                    type="checkbox"
                    checked={useServerRouting}
                    onChange={handleServerRoutingToggle}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                </label>
                <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                  {useServerRouting
                    ? "Route is computed on the server. Recommended for mobile or low-memory devices."
                    : "Route is computed locally in the browser using the loaded graph."}
                </p>
              </div>

              <div className="h-px bg-border/40" />

              {/* Overlays */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Overlays
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPcnOverlay((v) => !v)}
                    disabled={!activeGraph}
                    aria-pressed={showPcnOverlay}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
                      showPcnOverlay
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Layers className="h-3 w-3" />Network
                  </button>
                  {roadsLoading && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />Roads…
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px bg-border/40" />

              {/* Network stats */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Network
                </p>
                <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PCN vertices</span>
                    <span className="tabular-nums">{graph?.meta.nodes.toLocaleString() ?? "–"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Road vertices</span>
                    <span className="tabular-nums">{rawRoadNodeCount > 0 ? rawRoadNodeCount.toLocaleString() : "–"}</span>
                  </div>
                  {graphBuilding ? (
                    <div className="flex items-center gap-1.5 pt-0.5 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Building…</span>
                    </div>
                  ) : activeGraph ? (
                    <>
                      <div className="h-px bg-border/30 my-0.5" />
                      <div className="flex justify-between font-medium">
                        <span>Active vertices</span>
                        <span className="tabular-nums">{activeGraph.meta.nodes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Active edges</span>
                        <span className="tabular-nums">{activeGraph.meta.segments.toLocaleString()}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="h-px bg-border/40" />

              {/* Clustering */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Vertex Clustering
                  </p>
                  <button
                    type="button"
                    onClick={() => setClusterEnabled((v) => !v)}
                    aria-pressed={clusterEnabled}
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors",
                      clusterEnabled
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {clusterEnabled ? "On" : "Off"}
                  </button>
                </div>

                {clusterEnabled && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Threshold</span>
                      <span className="font-medium tabular-nums">{clusterThreshold} m</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={200}
                      step={1}
                      value={clusterThreshold}
                      onChange={(e) => setClusterThreshold(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground/50">
                      <span>1 m</span>
                      <span>200 m</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                      Vertices within {clusterThreshold} m of the same drifting centroid are merged. PCN edges take priority over road edges. Applied to both routing and display.
                    </p>
                  </div>
                )}
              </div>

              <div className="h-px bg-border/40" />

              {/* Route Weights */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Route Weights
                  </p>
                  <button
                    type="button"
                    onClick={() => setRouteWeights(DEFAULT_ROUTE_WEIGHTS)}
                    className="rounded-lg px-2 py-0.5 text-[10px] font-medium border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Reset
                  </button>
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                  Lower = more preferred. All path types share the same scale.
                </p>

                {(["pcn", "future_network", "cycling_path", "road_bridge", "road_local", "road_secondary", "road_major"] as const).map((key) => {
                  const labels: Record<string, string> = {
                    pcn: "Park Connector Network",
                    future_network: "Future Network",
                    cycling_path: "Cycling Path Network",
                    road_major: "Major Roads",
                    road_secondary: "Secondary Roads",
                    road_local: "Local Roads",
                    road_bridge: "Bridge Connections",
                  };
                  const sublabels: Record<string, string> = {
                    road_major: "motorway · trunk · primary",
                    road_secondary: "secondary · tertiary",
                    road_local: "residential · unclassified",
                    road_bridge: "PCN–road link edges",
                  };
                  const colors: Record<string, string> = {
                    pcn: "#00b09b",
                    future_network: "#a855f7",
                    cycling_path: "#4a90d9",
                    road_major: "#ef4444",
                    road_secondary: "#f97316",
                    road_local: "#eab308",
                    road_bridge: "#94a3b8",
                  };
                  const sub = sublabels[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex flex-col gap-0">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="inline-block h-1.5 w-3 rounded-full" style={{ backgroundColor: colors[key] }} />
                            {labels[key]}
                          </span>
                          {sub && (
                            <span className="pl-[18px] text-[9px] text-muted-foreground/50">{sub}</span>
                          )}
                        </span>
                        <span className="font-medium tabular-nums">{routeWeights[key].toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={5.0}
                        step={0.05}
                        value={routeWeights[key]}
                        onChange={(e) =>
                          setRouteWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                        className="w-full"
                        style={{ accentColor: colors[key] }}
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground/50">
                        <span>Prefer</span>
                        <span>Avoid</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      </div>

    </div>
  );
}
