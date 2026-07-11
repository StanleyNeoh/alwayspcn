"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Layers, Loader2, Moon, Search, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const RouteMap = dynamic(
  () => import("@/components/map/route-map").then((mod) => mod.RouteMap),
  { ssr: false }
);

const formatCoordinate = (point: Coordinate | null) =>
  point ? `${point[1].toFixed(6)}, ${point[0].toFixed(6)}` : "Not set";

const MAIN_THREAD_FALLBACK_NODE_LIMIT = 5000;

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
  const [isLoadingRoads, setIsLoadingRoads] = useState(false);
  const roadGraphRef = useRef<ReturnType<typeof buildRoadGraph> | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [isDark, setIsDark] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

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

    // Build PCN overlay from the graph immediately (no extra fetch)
    setPcnGeojson(graphToPcnGeoJson(loadedGraph));

    const nodeCount = loadedGraph.meta.nodes.toLocaleString();
    setMessage(`PCN network ready (${nodeCount} nodes). Loading Singapore roads…`);

    // Fetch pre-built Singapore road GeoJSON in the background
    setIsLoadingRoads(true);
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

      // Build road graph for main-thread fallback and send to worker for fallback routing.
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
    } finally {
      setIsLoadingRoads(false);
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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 sm:p-6">
      <header className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-md backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl tracking-tight text-primary sm:text-4xl">AlwaysPCN</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Park connector first routing across Singapore&apos;s PCN and cycling network.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-accent text-accent-foreground">PCN Priority Routing</Badge>

            <button
              type="button"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDark}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[370px_minmax(0,1fr)]">
        <Card className="border-border/80 bg-card/90 shadow-md backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-heading text-xl">Route Controls</CardTitle>
              <div className="flex items-center gap-1.5">
                {pcnGeojson ? (
                  <Button
                    variant={showPcnOverlay ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowPcnOverlay((v) => !v)}
                    aria-pressed={showPcnOverlay}
                    title={showPcnOverlay ? "Hide PCN overlay" : "Show PCN overlay"}
                    className="h-8 gap-1.5 px-2 text-xs"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    PCN
                  </Button>
                ) : null}
                {roadsGeojson ? (
                  <Button
                    variant={showRoadsOverlay ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowRoadsOverlay((v) => !v)}
                    aria-pressed={showRoadsOverlay}
                    title={showRoadsOverlay ? "Hide roads overlay" : "Show roads overlay"}
                    className="h-8 gap-1.5 px-2 text-xs"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Roads
                  </Button>
                ) : null}
              </div>
            </div>
            <CardDescription>
              Enter a place name, street address, or lat,lng coordinates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationCombobox
              id="start"
              label="Start — place name or lat,lng"
              placeholder="e.g. Bishan Park or 1.3521,103.8198"
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
              label="End — place name or lat,lng"
              placeholder="e.g. Gardens by the Bay"
              value={endInput}
              onChange={setEndInput}
              onSelect={(coord, label) => {
                setRoute(null);
                setEnd(coord);
                setEndInput(label);
                setMessage("End location set. Routing…");
              }}
            />

            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-60"
              type="button"
              onClick={applyLocations}
              disabled={isGeocoding}
            >
              {isGeocoding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isGeocoding ? "Resolving…" : "Apply / Locate"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded-md border px-3 py-2 text-sm ${
                  pickMode === "start" ? "border-primary bg-primary/10" : "border-border"
                }`}
                type="button"
                onClick={() => setPickMode("start")}
              >
                Click Sets Start
              </button>
              <button
                className={`rounded-md border px-3 py-2 text-sm ${
                  pickMode === "end" ? "border-primary bg-primary/10" : "border-border"
                }`}
                type="button"
                onClick={() => setPickMode("end")}
              >
                Click Sets End
              </button>
            </div>

            <div className="rounded-md border border-border/70 bg-secondary/30 p-3 text-sm">
              <p>
                <strong>Start:</strong> {formatCoordinate(start)}
              </p>
              <p>
                <strong>End:</strong> {formatCoordinate(end)}
              </p>
            </div>

            {/* Map legend */}
            {(pcnGeojson || roadsGeojson) ? (
              <div className="space-y-1 rounded-md border border-border/70 bg-secondary/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Map Legend</p>
                {roadsGeojson ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#e8003d]" />Motorway
                    </span>
                    {" · "}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#e8b400]" />Primary
                    </span>
                    {" · "}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#cccccc]" />Local roads
                    </span>
                  </>
                ) : null}
                {pcnGeojson ? (
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#00b09b]" />Park Connector
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#2ecc71]" />Park Path
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#e74c3c]" />Rail Corridor
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded bg-[#4a90d9]" />Cycling Path
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2 w-5 rounded bg-[#94a3b8]" />Road (off-PCN)
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-md border border-border/70 bg-muted/50 p-3 text-sm">
              <p className="font-medium">Status</p>
              <p className="text-muted-foreground">{message}</p>
              {activeRoute ? (
                activeRoute.found ? (
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <p>Distance: {(activeRoute.distanceMeters / 1000).toFixed(2)} km</p>
                    <p>Connector share: {(activeRoute.connectorShare * 100).toFixed(1)}%</p>
                    <p>
                      Mode:{" "}
                      {activeRoute.usesFallback ? "Mixed network fallback" : "Connector dominant"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-destructive">No route found for selected points.</p>
                )
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="min-h-[62vh] overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-md">
          <RouteMap
            segments={activeRoute?.found ? activeRoute.segments : []}
            start={start}
            end={end}
            onMapPick={onMapPick}
            roadsGeojson={showRoadsOverlay ? roadsGeojson : null}
            pcnGeojson={showPcnOverlay ? pcnGeojson : null}
          />
        </div>
      </section>
    </main>
  );
}

