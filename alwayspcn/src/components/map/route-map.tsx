"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import type { GeoJsonCollection } from "@/lib/graph-to-geojson";

type Coordinate = [number, number];

// Roads overlay — one colour per OSM highway classification
const ROAD_STYLE: Record<string, { color: string; weight: number; opacity: number }> = {
  motorway:      { color: "#e8003d", weight: 3, opacity: 0.7 },
  trunk:         { color: "#e67e22", weight: 2, opacity: 0.7 },
  primary:       { color: "#e8b400", weight: 2, opacity: 0.7 },
  secondary:     { color: "#9b9b9b", weight: 1.5, opacity: 0.6 },
  tertiary:      { color: "#b8b8b8", weight: 1, opacity: 0.5 },
  residential:   { color: "#cccccc", weight: 1, opacity: 0.45 },
  unclassified:  { color: "#cccccc", weight: 1, opacity: 0.45 },
};

// PCN overlay — colour per route kind
const PCN_STYLE: Record<string, { color: string; weight: number; opacity: number }> = {
  park_connector: { color: "#00b09b", weight: 3, opacity: 0.85 },
  park_path:      { color: "#2ecc71", weight: 3, opacity: 0.85 },
  rail_corridor:  { color: "#e74c3c", weight: 3, opacity: 0.85 },
  cycling_path:   { color: "#4a90d9", weight: 2, opacity: 0.75 },
};

type RouteMapProps = {
  route: Coordinate[];
  start: Coordinate | null;
  end: Coordinate | null;
  onMapPick: (point: Coordinate) => void;
  roadsGeojson?: GeoJsonCollection | null;
  pcnGeojson?: GeoJsonCollection | null;
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
  route,
  start,
  end,
  onMapPick,
  roadsGeojson,
  pcnGeojson,
}: RouteMapProps) {
  const routeLatLng = route.map(([lng, lat]) => [lat, lng] as [number, number]);

  return (
    <MapContainer center={[1.3521, 103.8198]} zoom={12} className="h-full w-full rounded-2xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onMapPick={onMapPick} />

      {/* Singapore roads overlay — rendered below PCN */}
      {roadsGeojson ? (
        <GeoJSON
          key={`roads-${roadsGeojson.features.length}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={roadsGeojson as any}
          style={(feature) => {
            const hw = (feature?.properties as { highway?: string } | null)?.highway ?? "";
            return ROAD_STYLE[hw] ?? { color: "#cccccc", weight: 1, opacity: 0.4 };
          }}
        />
      ) : null}

      {/* PCN network overlay */}
      {pcnGeojson ? (
        <GeoJSON
          key={`pcn-${pcnGeojson.features.length}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={pcnGeojson as any}
          style={(feature) => {
            const kind = (feature?.properties as { kind?: string } | null)?.kind ?? "";
            return PCN_STYLE[kind] ?? { color: "#00b09b", weight: 3, opacity: 0.8 };
          }}
        />
      ) : null}

      {/* Computed route — rendered above overlays */}
      {routeLatLng.length > 1 ? (
        <Polyline
          positions={routeLatLng}
          pathOptions={{ color: "#00a7d4", weight: 6, opacity: 0.95 }}
        />
      ) : null}

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
  );
}
