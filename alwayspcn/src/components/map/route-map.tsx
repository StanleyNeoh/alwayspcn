"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { GeoJsonCollection } from "@/lib/graph-to-geojson";
import type { RouteSegment } from "@/lib/routing";

type Coordinate = [number, number];

// A permissive GeoJSON collection type suitable for both PCN and roads overlays
type AnyGeoJsonCollection = {
  type: "FeatureCollection";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: Array<{ type: "Feature"; properties: Record<string, any>; geometry: unknown }>;
};

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

// Color for route segments that travel off the PCN (roads, bridges, etc.)
const ROUTE_OFF_PCN: { color: string; weight: number; opacity: number } = {
  color: "#94a3b8",
  weight: 5,
  opacity: 0.9,
};

function routeSegmentStyle(kind: string): { color: string; weight: number; opacity: number } {
  if (PCN_STYLE[kind]) return { ...PCN_STYLE[kind], weight: 5 };
  return ROUTE_OFF_PCN;
}

type RouteMapProps = {
  segments: RouteSegment[];
  start: Coordinate | null;
  end: Coordinate | null;
  onMapPick: (point: Coordinate) => void;
  roadsGeojson?: AnyGeoJsonCollection | null;
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
  segments,
  start,
  end,
  onMapPick,
  roadsGeojson,
  pcnGeojson,
}: RouteMapProps) {
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
    park_connector: "Park Connector",
    park_path: "Park Path",
    rail_corridor: "Rail Corridor",
    cycling_path: "Cycling Path",
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
  );
}
