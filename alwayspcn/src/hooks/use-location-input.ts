import { useState } from "react";
import { geocodeLocation } from "@/lib/geocode";
import { type Coordinate } from "@/lib/routing";

/** Matches "1.3521, 103.8198" or "1.3521,103.8198" (lat,lng) */
const COORD_RE = /^[-+]?\d+\.?\d*\s*,\s*[-+]?\d+\.?\d*$/;

interface UseLocationInputParams {
  onMessage: (msg: string) => void;
}

export function useLocationInput({ onMessage }: UseLocationInputParams) {
  const [start, setStart] = useState<Coordinate | null>(null);
  const [end, setEnd] = useState<Coordinate | null>(null);
  const [startInput, setStartInput] = useState("1.3434,103.8247");
  const [endInput, setEndInput] = useState("1.4042,103.9021");
  const [pickMode, setPickMode] = useState<"start" | "end" | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const parseCoordInput = (text: string): Coordinate | null => {
    const [latStr, lngStr] = text.split(",").map((part) => part.trim());
    const lat = Number.parseFloat(latStr);
    const lng = Number.parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lng, lat];
  };

  const resolveLocation = async (input: string): Promise<Coordinate | null> => {
    const trimmed = input.trim();
    if (COORD_RE.test(trimmed)) return parseCoordInput(trimmed);
    return geocodeLocation(trimmed);
  };

  const handleStartSelect = (coord: Coordinate, label: string) => {
    setStart(coord);
    setStartInput(label);
    onMessage("Start location set. Routing…");
  };

  const handleEndSelect = (coord: Coordinate, label: string) => {
    setEnd(coord);
    setEndInput(label);
    onMessage("End location set. Routing…");
  };

  const applyLocations = async () => {
    setIsGeocoding(true);
    onMessage("Resolving locations…");
    try {
      const [resolvedStart, resolvedEnd] = await Promise.all([
        resolveLocation(startInput),
        resolveLocation(endInput),
      ]);
      if (!resolvedStart) {
        onMessage(`Could not find location: "${startInput}"`);
        return;
      }
      if (!resolvedEnd) {
        onMessage(`Could not find location: "${endInput}"`);
        return;
      }
      setStart(resolvedStart);
      setEnd(resolvedEnd);
      setStartInput(`${resolvedStart[1].toFixed(6)},${resolvedStart[0].toFixed(6)}`);
      setEndInput(`${resolvedEnd[1].toFixed(6)},${resolvedEnd[0].toFixed(6)}`);
      onMessage("Locations resolved. Routing…");
    } finally {
      setIsGeocoding(false);
    }
  };

  const setCurrentLocationAsStart = async () => {
    if (!navigator.geolocation) {
      onMessage("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    onMessage("Getting your current location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord: Coordinate = [pos.coords.longitude, pos.coords.latitude];
        setStart(coord);
        setStartInput(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        onMessage("Current location set as start. Routing…");
        setIsLocating(false);
      },
      (err) => {
        onMessage(`Could not get location: ${err.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  };

  const onMapPick = (point: Coordinate) => {
    if (!pickMode) return;
    setPickMode(null);
    if (pickMode === "start") {
      setStart(point);
      setStartInput(`${point[1].toFixed(6)},${point[0].toFixed(6)}`);
      onMessage("Start point set.");
    } else {
      setEnd(point);
      setEndInput(`${point[1].toFixed(6)},${point[0].toFixed(6)}`);
      onMessage("End point set.");
    }
  };

  return {
    start,
    end,
    startInput,
    setStartInput,
    endInput,
    setEndInput,
    pickMode,
    setPickMode,
    isGeocoding,
    isLocating,
    applyLocations,
    setCurrentLocationAsStart,
    onMapPick,
    handleStartSelect,
    handleEndSelect,
  };
}
