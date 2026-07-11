"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Navigation2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateGraphData } from "@/lib/graph-validation";
import { computeRoute, type Coordinate, type GraphData, type RouteResult } from "@/lib/routing";

const RouteMap = dynamic(
  () => import("@/components/map/route-map").then((mod) => mod.RouteMap),
  { ssr: false }
);

const formatCoordinate = (point: Coordinate | null) =>
  point ? `${point[1].toFixed(6)}, ${point[0].toFixed(6)}` : "Not set";

const MAIN_THREAD_FALLBACK_NODE_LIMIT = 5000;

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

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

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
        setRoute(computeRoute(graph, start, end));
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

  const parseInput = (text: string): Coordinate | null => {
    const [latStr, lngStr] = text.split(",").map((part) => part.trim());
    const lat = Number.parseFloat(latStr);
    const lng = Number.parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    return [lng, lat];
  };

  const loadGraph = async () => {
    const response = await fetch("/data/network.json");
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

    setRoute(null);
    setGraph(validation.data);
    setMessage(`Network ready with ${validation.data.meta.nodes.toLocaleString()} nodes.`);
  };

  const applyManualInputs = () => {
    const parsedStart = parseInput(startInput);
    const parsedEnd = parseInput(endInput);
    if (!parsedStart || !parsedEnd) {
      setMessage("Coordinates must be in lat,lng format.");
      return;
    }
    setRoute(null);
    setStart(parsedStart);
    setEnd(parsedEnd);
    setMessage("Manual points applied.");
  };

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
          <Badge className="bg-accent text-accent-foreground">Routing Weight: Connector Priority</Badge>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[370px_minmax(0,1fr)]">
        <Card className="border-border/80 bg-card/90 shadow-md backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Route Controls</CardTitle>
            <CardDescription>Set points by typing lat,lng or by clicking the map.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              type="button"
              onClick={loadGraph}
            >
              <Navigation2 className="mr-2 h-4 w-4" />
              Load Network
            </button>

            <div className="space-y-2">
              <Label htmlFor="start">Start (lat,lng)</Label>
              <Input
                id="start"
                value={startInput}
                onChange={(event) => setStartInput(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">End (lat,lng)</Label>
              <Input id="end" value={endInput} onChange={(event) => setEndInput(event.target.value)} />
            </div>

            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              type="button"
              onClick={applyManualInputs}
            >
              Apply Coordinates
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

            <div className="rounded-md border border-border/70 bg-muted/50 p-3 text-sm">
              <p className="font-medium">Status</p>
              <p className="text-muted-foreground">{message}</p>
              {activeRoute ? (
                activeRoute.found ? (
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <p>Distance: {(activeRoute.distanceMeters / 1000).toFixed(2)} km</p>
                    <p>Connector share: {(activeRoute.connectorShare * 100).toFixed(1)}%</p>
                    <p>
                      Mode: {activeRoute.usesFallback ? "Mixed network fallback" : "Connector dominant"}
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
            route={activeRoute?.found ? activeRoute.path : []}
            start={start}
            end={end}
            onMapPick={onMapPick}
          />
        </div>
      </section>
    </main>
  );
}
