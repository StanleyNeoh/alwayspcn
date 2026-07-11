"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";

import { Moon, Sun } from "lucide-react";
import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { GeoJsonCollection } from "@/lib/graph-to-geojson";
import type { RouteSegment } from "@/lib/routing";

type Coordinate = [number, number];

// Roads overlay colours (used for the network overlay GeoJSON layer)
const ROAD_STYLE: Record<string, { color: string; weight: number; opacity: number }> = {
  motorway:      { color: "#e8003d", weight: 3, opacity: 0.7 },
  trunk:         { color: "#e67e22", weight: 2, opacity: 0.7 },
  primary:       { color: "#e8b400", weight: 2, opacity: 0.7 },
  secondary:     { color: "#9b9b9b", weight: 1.5, opacity: 0.6 },
  tertiary:      { color: "#b8b8b8", weight: 1, opacity: 0.5 },
  residential:   { color: "#cccccc", weight: 1, opacity: 0.45 },
  unclassified:  { color: "#cccccc", weight: 1, opacity: 0.45 },
};

// PCN overlay — colour per route category
const PCN_STYLE: Record<string, { color: string; weight: number; opacity: number }> = {
  pcn:            { color: "#00b09b", weight: 3, opacity: 0.85 },
  future_network: { color: "#a855f7", weight: 3, opacity: 0.85 },
  cycling_path:   { color: "#4a90d9", weight: 2, opacity: 0.75 },
};

// Route segment styles — PCN kinds are solid, road/bridge kinds are dashed with distinct colours
type RouteStyle = { color: string; weight: number; opacity: number; dashArray?: string };

const ROUTE_SEGMENT_STYLE: Record<string, RouteStyle> = {
  // PCN — solid lines
  pcn:            { color: "#00b09b", weight: 5, opacity: 0.95 },
  future_network: { color: "#a855f7", weight: 5, opacity: 0.95 },
  cycling_path:   { color: "#4a90d9", weight: 5, opacity: 0.95 },
  // Bridge — dashed slate
  bridge:         { color: "#94a3b8", weight: 4, opacity: 0.9, dashArray: "6 8" },
  // Local roads — dashed yellow
  residential:    { color: "#ca8a04", weight: 4, opacity: 0.9, dashArray: "6 8" },
  unclassified:   { color: "#ca8a04", weight: 4, opacity: 0.9, dashArray: "6 8" },
  other:          { color: "#ca8a04", weight: 4, opacity: 0.9, dashArray: "6 8" },
  // Secondary roads — dashed orange
  secondary:      { color: "#ea580c", weight: 4, opacity: 0.9, dashArray: "6 8" },
  tertiary:       { color: "#ea580c", weight: 4, opacity: 0.9, dashArray: "6 8" },
  // Major roads — dashed red
  motorway:       { color: "#dc2626", weight: 4, opacity: 0.9, dashArray: "6 8" },
  trunk:          { color: "#dc2626", weight: 4, opacity: 0.9, dashArray: "6 8" },
  primary:        { color: "#dc2626", weight: 4, opacity: 0.9, dashArray: "6 8" },
};

const ROUTE_FALLBACK_STYLE: RouteStyle = { color: "#94a3b8", weight: 4, opacity: 0.9, dashArray: "6 8" };

function routeSegmentStyle(kind: string): RouteStyle {
  return ROUTE_SEGMENT_STYLE[kind] ?? ROUTE_FALLBACK_STYLE;
}

type MapStyleKey = "street" | "satellite" | "map";

const MAP_STYLES: Record<MapStyleKey, { label: string; url: string; attribution: string }> = {
  street: {
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community",
  },
  map: {
    label: "Map",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

type RouteMapProps = {
  segments: RouteSegment[];
  start: Coordinate | null;
  end: Coordinate | null;
  onMapPick: (point: Coordinate) => void;
  pcnGeojson?: GeoJsonCollection | null;
  isDark?: boolean;
  toggleDark?: () => void;
};

function ClickCapture({ onMapPick }: { onMapPick: (point: Coordinate) => void }) {
  useMapEvents({
    click(event) {
      onMapPick([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
}

export function RouteMap({
  segments,
  start,
  end,
  onMapPick,
  pcnGeojson,
  isDark,
  toggleDark,
}: RouteMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("street");
  const tileConfig = MAP_STYLES[mapStyle];
  // Group consecutive same-kind AND same-name segments into polylines
  type SegGroup = { kind: string; name: string; distanceMeters: number; positions: [number, number][] };
  const segGroups: SegGroup[] = [];
  for (const seg of segments) {
    const fromLL: [number, number] = [seg.from[1], seg.from[0]];
    const toLL: [number, number] = [seg.to[1], seg.to[0]];
    const segName = seg.name ?? "";
    const last = segGroups[segGroups.length - 1];
    if (last && last.kind === seg.kind && last.name === segName) {
      last.positions.push(toLL);
      last.distanceMeters += haversineMeters(seg.from, seg.to);
    } else {
      segGroups.push({ kind: seg.kind, name: segName, distanceMeters: haversineMeters(seg.from, seg.to), positions: [fromLL, toLL] });
    }
  }

  function haversineMeters(a: [number, number], b: [number, number]): number {
    const toRad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * toRad;
    const dLng = (b[0] - a[0]) * toRad;
    const lat1 = a[1] * toRad;
    const lat2 = b[1] * toRad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371000 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
  }

  const KIND_LABEL: Record<string, string> = {
    pcn:            "Park Connector Network",
    future_network: "Future Network",
    cycling_path:   "Cycling Path Network",
    motorway: "Motorway",
    trunk: "Trunk Road",
    primary: "Primary Road",
    secondary: "Secondary Road",
    tertiary: "Tertiary Road",
    residential: "Residential Road",
    unclassified: "Road",
    bridge: "Bridge",
    other: "Path",
  };

  return (
    <div className="relative h-full w-full">
      {/* Top-right controls: brand + map style switcher */}
      <div className="absolute right-3 top-3 z-[1000] flex items-center gap-2">
        {/* Brand card */}
        <div className="flex items-center gap-2 overflow-hidden rounded-md border border-gray-200 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
          <span className="text-xs font-semibold tracking-tight text-gray-900 dark:text-gray-100">AlwaysPCN</span>
          <span className="rounded bg-teal-100 px-1.5 py-0 text-[10px] font-medium text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">PCN</span>
          <div className="h-3.5 w-px bg-gray-200 dark:bg-zinc-600" />
          {toggleDark && (
            <button
              type="button"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDark}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Map style switcher */}
        <div className="flex divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200 shadow-md dark:divide-zinc-700 dark:border-zinc-700">
          {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setMapStyle(key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                mapStyle === key
                  ? "bg-white text-gray-900 dark:bg-zinc-800 dark:text-gray-100"
                  : "bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {MAP_STYLES[key].label}
            </button>
          ))}
        </div>
      </div>

      <MapContainer center={[1.3521, 103.8198]} zoom={12} className="h-full w-full">
        <TileLayer
          key={mapStyle}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
        />
      <ClickCapture onMapPick={onMapPick} />

      {/* PCN + roads network overlay */}
      {pcnGeojson ? (
        <GeoJSON
          key={`pcn-${pcnGeojson.features.length}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={pcnGeojson as any}
          style={(feature) => {
            const kind = (feature?.properties as { kind?: string } | null)?.kind ?? "";
            return PCN_STYLE[kind] ?? ROAD_STYLE[kind] ?? { color: "#94a3b8", weight: 1.5, opacity: 0.5 };
          }}
        />
      ) : null}

      {/* Computed route — coloured per segment kind, rendered above overlays */}
      {segGroups.map((group, i) => (
        <Polyline
          key={`route-seg-${i}`}
          positions={group.positions}
          pathOptions={routeSegmentStyle(group.kind)}
        >
          <Tooltip sticky direction="top" offset={[0, -4]} opacity={0.95}>
            <div className="text-xs leading-snug">
              <div className="font-semibold text-sm">
                {group.name || KIND_LABEL[group.kind] || group.kind}
              </div>
              <div className="text-gray-500">{KIND_LABEL[group.kind] ?? group.kind}</div>
              <div className="mt-0.5 text-gray-600">
                {group.distanceMeters >= 1000
                  ? `${(group.distanceMeters / 1000).toFixed(2)} km`
                  : `${Math.round(group.distanceMeters)} m`}
              </div>
            </div>
          </Tooltip>
        </Polyline>
      ))}

      {start ? (
        <CircleMarker
          center={[start[1], start[0]]}
          radius={8}
          pathOptions={{ color: "#0f766e", fillColor: "#0f766e", fillOpacity: 0.9 }}
        />
      ) : null}

      {end ? (
        <CircleMarker
          center={[end[1], end[0]]}
          radius={8}
          pathOptions={{ color: "#be123c", fillColor: "#be123c", fillOpacity: 0.9 }}
        />
      ) : null}
      </MapContainer>
    </div>
  );
}
