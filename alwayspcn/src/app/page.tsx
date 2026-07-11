"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripHorizontal, Layers, Loader2, MapPin, Moon, Navigation, Search, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { validateGraphData } from "@/lib/graph-validation";
import { geocodeLocation } from "@/lib/geocode";
import { graphToPcnGeoJson, type GeoJsonCollection } from "@/lib/graph-to-geojson";
import {
  buildRoadGraph,
  computeRoute,
  computeRouteWithFallback,
  type Coordinate,
  type GraphData,
  type RouteResult,
  type RoadsGeoJson,
} from "@/lib/routing";
import { cn } from "@/lib/utils";

const RouteMap = dynamic(
  () => import("@/components/map/route-map").then((mod) => mod.RouteMap),
  { ssr: false }
);

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const MAIN_THREAD_FALLBACK_NODE_LIMIT = 5000;

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

type WorkerResultMessage = {
  type: "result";
  requestId: number;
  result: RouteResult;
};

export default function Home() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [start, setStart] = useState<Coordinate | null>(null);
  const [end, setEnd] = useState<Coordinate | null>(null);
  const [startInput, setStartInput] = useState("1.3434,103.8247");
  const [endInput, setEndInput] = useState("1.4042,103.9021");
  const [pickMode, setPickMode] = useState<"start" | "end">("start");
  const [message, setMessage] = useState("Load the network and set two points to route.");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [roadsGeojson, setRoadsGeojson] = useState<RoadsGeoJson | null>(null);
  const [pcnGeojson, setPcnGeojson] = useState<GeoJsonCollection | null>(null);
  const [showPcnOverlay, setShowPcnOverlay] = useState(false);
  const [showRoadsOverlay, setShowRoadsOverlay] = useState(false);
  const roadGraphRef = useRef<ReturnType<typeof buildRoadGraph> | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [brandOpen, setBrandOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  const brand = useDraggable({ x: 16, y: 16 });
  const panel = useDraggable({ x: 16, y: 72 });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    try {
      const worker = new Worker(new URL("../workers/route-worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResultMessage>) => {
        const payload = event.data;
        if (!payload || payload.type !== "result") {
          return;
        }
        if (payload.requestId !== requestIdRef.current) {
          return;
        }
        setRoute(payload.result);
      };
      return () => {
        worker.terminate();
      };
    } catch {
      workerRef.current = null;
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!graph || !start || !end) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
      const worker = workerRef.current;

      if (!worker) {
        if (graph.nodes.length > MAIN_THREAD_FALLBACK_NODE_LIMIT) {
          setMessage(
            "Worker unavailable and graph is large. Routing paused to prevent UI freeze."
          );
          return;
        }
        setMessage("Worker unavailable. Running route on main thread for small graph.");
        const rg = roadGraphRef.current;
        setRoute(
          rg
            ? computeRouteWithFallback(graph, rg, start, end)
            : computeRoute(graph, start, end)
        );
        return;
      }

      worker.postMessage({
        type: "compute",
        requestId: currentRequestId,
        graph,
        start,
        end,
      });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [graph, start, end]);

  const onMapPick = (point: Coordinate) => {
    if (pickMode === "start") {
      setRoute(null);
      setStart(point);
      setStartInput(`${point[1].toFixed(6)},${point[0].toFixed(6)}`);
      setMessage("Start point captured from map.");
      return;
    }
    setRoute(null);
    setEnd(point);
    setEndInput(`${point[1].toFixed(6)},${point[0].toFixed(6)}`);
    setMessage("End point captured from map.");
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
    setPcnGeojson(graphToPcnGeoJson(loadedGraph));

    const nodeCount = loadedGraph.meta.nodes.toLocaleString();
    setMessage(`PCN network ready (${nodeCount} nodes). Loading Singapore roads…`);

    try {
      const roadsResponse = await fetch("/api/data/roads");
      if (!roadsResponse.ok) {
        setMessage(
          `PCN network ready (${nodeCount} nodes). Road overlay unavailable — run npm run build:roads.`
        );
        return;
      }
      const roadsData: RoadsGeoJson = await roadsResponse.json();
      setRoadsGeojson(roadsData);

      const builtRoadGraph = buildRoadGraph(roadsData);
      roadGraphRef.current = builtRoadGraph;

      const worker = workerRef.current;
      if (worker) {
        worker.postMessage({ type: "init_roads", roadsGeoJson: roadsData });
      }

      const roadCount = Array.isArray(roadsData.features)
        ? roadsData.features.length.toLocaleString()
        : "0";
      setMessage(`Ready. ${nodeCount} PCN nodes · ${roadCount} road segments loaded.`);
    } catch {
      setMessage(`PCN network ready (${nodeCount} nodes). Road overlay failed to load.`);
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

  // Auto-load the network on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadGraph(); }, []);

  const activeRoute = graph && start && end ? route : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden">

      {/* ── Full-screen map ───────────────────────────────────────── */}
      <div className="absolute inset-0">
        <RouteMap
          segments={activeRoute?.found ? activeRoute.segments : []}
          start={start}
          end={end}
          onMapPick={onMapPick}
          roadsGeojson={showRoadsOverlay ? roadsGeojson : null}
          pcnGeojson={showPcnOverlay ? pcnGeojson : null}
        />
      </div>

      {/* ── Brand card ────────────────────────────────────────────── */}
      <div
        style={{ transform: `translate(${brand.pos.x}px, ${brand.pos.y}px)` }}
        className="absolute left-0 top-0 z-[1000] select-none"
      >
        <div
          {...brand.dragHandleProps}
          className="flex cursor-grab items-center gap-2.5 rounded-2xl border border-zinc-200/70 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-xl transition-shadow hover:shadow-xl active:cursor-grabbing dark:border-zinc-700/70 dark:bg-zinc-950/95"
        >
          <h1 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            AlwaysPCN
          </h1>
          {brandOpen && (
            <>
              <Badge className="bg-accent px-1.5 py-0 text-[10px] text-accent-foreground">PCN</Badge>
              <div className="h-3.5 w-px bg-border/60" />
              <button
                type="button"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleDark}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
          <button
            type="button"
            aria-label={brandOpen ? "Collapse" : "Expand"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setBrandOpen((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {brandOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Route panel ──────────────────────────────────────────── */}
      {/* No overflow:hidden so the combobox dropdown can escape the card */}
      <div
        style={{ transform: `translate(${panel.pos.x}px, ${panel.pos.y}px)` }}
        className="absolute left-0 top-0 z-[1000] w-[310px] select-none"
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
              {pcnGeojson && panelOpen ? (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setShowPcnOverlay((v) => !v)}
                  aria-pressed={showPcnOverlay}
                  title={showPcnOverlay ? "Hide PCN overlay" : "Show PCN overlay"}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors",
                    showPcnOverlay
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Layers className="h-2.5 w-2.5" />PCN
                </button>
              ) : null}
              {roadsGeojson && panelOpen ? (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setShowRoadsOverlay((v) => !v)}
                  aria-pressed={showRoadsOverlay}
                  title={showRoadsOverlay ? "Hide roads overlay" : "Show roads overlay"}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors",
                    showRoadsOverlay
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Layers className="h-2.5 w-2.5" />Roads
                </button>
              ) : null}
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
          {panelOpen && <div className="space-y-3 p-4">

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
                  title="Click map to set start"
                  onClick={() => setPickMode("start")}
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
                  title="Click map to set end"
                  onClick={() => setPickMode("end")}
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
              <p className="leading-relaxed text-muted-foreground">{message}</p>
              {activeRoute?.found ? (
                <div className="mt-2 space-y-0.5 font-medium text-foreground">
                  <p>Distance: {formatDistance(activeRoute.distanceMeters)}</p>
                  <p>PCN share: {(activeRoute.connectorShare * 100).toFixed(1)}%</p>
                  {activeRoute.usesFallback && (
                    <p className="font-normal text-muted-foreground">Mixed network fallback</p>
                  )}
                </div>
              ) : activeRoute?.found === false ? (
                <p className="mt-1 font-medium text-destructive">
                  No route found for selected points.
                </p>
              ) : null}
            </div>

            {/* Legend (collapsible) */}
            {(pcnGeojson || roadsGeojson) ? (
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
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-[10px] text-muted-foreground">
                    {pcnGeojson ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#00b09b]" />
                          Park Connector
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#2ecc71]" />
                          Park Path
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#e74c3c]" />
                          Rail Corridor
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#4a90d9]" />
                          Cycling Path
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#94a3b8]" />
                          Road (off-PCN)
                        </span>
                      </>
                    ) : null}
                    {roadsGeojson ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#e8003d]" />
                          Motorway
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#e8b400]" />
                          Primary
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-4 rounded-full bg-[#cccccc]" />
                          Local
                        </span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

          </div>}
        </div>
      </div>

    </div>
  );
}
