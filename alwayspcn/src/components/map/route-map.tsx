"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Polyline, TileLayer, useMapEvents } from "react-leaflet";

type Coordinate = [number, number];

type RouteMapProps = {
  route: Coordinate[];
  start: Coordinate | null;
  end: Coordinate | null;
  onMapPick: (point: Coordinate) => void;
};

function ClickCapture({ onMapPick }: { onMapPick: (point: Coordinate) => void }) {
  useMapEvents({
    click(event) {
      onMapPick([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
}

export function RouteMap({ route, start, end, onMapPick }: RouteMapProps) {
  const routeLatLng = route.map(([lng, lat]) => [lat, lng] as [number, number]);

  return (
    <MapContainer center={[1.3521, 103.8198]} zoom={12} className="h-full w-full rounded-2xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onMapPick={onMapPick} />

      {routeLatLng.length > 1 ? (
        <Polyline
          positions={routeLatLng}
          pathOptions={{ color: "#00a7d4", weight: 6, opacity: 0.9 }}
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
