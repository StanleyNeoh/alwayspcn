import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  computeRoute,
  DEFAULT_ROUTE_WEIGHTS,
  type Coordinate,
  type RouteWeights,
  type GraphData,
  type RoadsGeoJson,
} from "@/lib/routing";
import { buildMergedGraph } from "@/lib/cluster-graph";
import { validateGraphData } from "@/lib/graph-validation";

// ── Server-side graph cache ────────────────────────────────────────────────
// Module-level variables persist across requests within the same server process,
// so the expensive graph build only happens once per cold start.
let cachedGraph: GraphData | null = null;
let graphInitialised = false;

function ensureGraph(): GraphData | null {
  if (graphInitialised) return cachedGraph;
  graphInitialised = true;

  const networkPath = path.resolve(process.cwd(), "data", "network.json");
  if (!fs.existsSync(networkPath)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(networkPath, "utf-8"));
  } catch {
    return null;
  }

  const validation = validateGraphData(raw);
  if (!validation.valid) return null;

  let graph: GraphData = validation.data;

  const roadsPath = path.resolve(process.cwd(), "data", "roads.json");
  if (fs.existsSync(roadsPath)) {
    try {
      const roads: RoadsGeoJson = JSON.parse(fs.readFileSync(roadsPath, "utf-8"));
      // clusterThreshold=0 → no clustering (fast, deterministic)
      graph = buildMergedGraph(graph, roads, 0);
    } catch {
      // roads failed — fall back to PCN-only graph
    }
  }

  cachedGraph = graph;
  return cachedGraph;
}

// ── Input helpers ──────────────────────────────────────────────────────────

function parseFinite(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inBounds(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseWeights(param: string | null): RouteWeights {
  if (!param) return DEFAULT_ROUTE_WEIGHTS;
  try {
    const parsed: unknown = JSON.parse(param);
    if (!parsed || typeof parsed !== "object") return DEFAULT_ROUTE_WEIGHTS;
    const out: Record<string, number> = {};
    for (const [key, def] of Object.entries(DEFAULT_ROUTE_WEIGHTS)) {
      const v = (parsed as Record<string, unknown>)[key];
      out[key] =
        typeof v === "number" && Number.isFinite(v) && v > 0 ? v : def;
    }
    return out as RouteWeights;
  } catch {
    return DEFAULT_ROUTE_WEIGHTS;
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const startLat = parseFinite(searchParams.get("startLat"));
  const startLng = parseFinite(searchParams.get("startLng"));
  const endLat = parseFinite(searchParams.get("endLat"));
  const endLng = parseFinite(searchParams.get("endLng"));

  if (startLat === null || startLng === null || endLat === null || endLng === null) {
    return NextResponse.json({ error: "Missing or invalid coordinates" }, { status: 400 });
  }

  if (!inBounds(startLat, startLng) || !inBounds(endLat, endLng)) {
    return NextResponse.json({ error: "Coordinates out of valid range" }, { status: 400 });
  }

  const weights = parseWeights(searchParams.get("weights"));

  const graph = ensureGraph();
  if (!graph) {
    return NextResponse.json(
      { error: "Route graph unavailable. Run npm run build:network first." },
      { status: 503 },
    );
  }

  const start: Coordinate = [startLng, startLat];
  const end: Coordinate = [endLng, endLat];

  const result = computeRoute(graph, start, end, weights);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
